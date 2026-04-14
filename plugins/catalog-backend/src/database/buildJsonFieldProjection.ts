/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Knex } from 'knex';

/**
 * A tree structure representing the requested field projection.
 * A null value is a leaf node (select that exact field).
 * An object value is an intermediate node (recurse into sub-keys).
 */
interface FieldTree {
  [key: string]: FieldTree | null;
}

/**
 * Converts a flat list of dot-separated field paths into a nested tree.
 *
 * Example:
 *   ['kind', 'metadata.name', 'spec.profile.email']
 *   → { kind: null, metadata: { name: null }, spec: { profile: { email: null } } }
 *
 * When a parent path and a child path are both present (e.g. both 'metadata'
 * and 'metadata.name'), the parent (leaf) dominates: the full parent object
 * will be selected and the more-specific child path is ignored. This mirrors
 * the behaviour of the JS-side parseEntityTransformParams transform.
 */
function buildFieldTree(fields: string[]): FieldTree {
  const tree: FieldTree = {};
  for (const field of fields) {
    const parts = field.split('.');
    let current: FieldTree = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // Leaf – only set if not already an intermediate node
        if (!(part in current)) {
          current[part] = null;
        }
      } else {
        const existing = current[part];
        if (existing === null) {
          // A parent leaf already covers this subtree – skip the deeper path.
          break;
        }
        if (existing === undefined) {
          current[part] = {};
        }
        current = current[part] as FieldTree;
      }
    }
  }
  return tree;
}

/**
 * Recursively builds a PostgreSQL jsonb_build_object(...) expression.
 *
 * @param tree         – the sub-tree to render
 * @param columnRef    – the JSONB column reference (already cast to jsonb)
 * @param ancestors    – path segments from the root to the current sub-tree
 * @param sqlParts     – accumulates SQL fragments (joined at call site)
 * @param bindings     – accumulates ? binding values
 */
function buildPgExpr(
  tree: FieldTree,
  columnRef: string,
  ancestors: string[],
  sqlParts: string[],
  bindings: string[],
): void {
  const entries = Object.entries(tree);
  sqlParts.push('jsonb_build_object(');
  for (let i = 0; i < entries.length; i++) {
    const [key, subtree] = entries[i];
    if (i > 0) sqlParts.push(',');
    // PostgreSQL cannot infer the type of a positional parameter when it is
    // used as a key in jsonb_build_object, so we must cast it explicitly.
    bindings.push(key);
    sqlParts.push('?::text,');
    if (subtree === null) {
      // Leaf: chain -> operators from the root column ref down to this key
      const fullPath = [...ancestors, key];
      // e.g. ("col"::jsonb) -> ? -> ?  with bindings ['metadata', 'name']
      sqlParts.push(`${columnRef}${fullPath.map(() => ' -> ?').join('')}`);
      bindings.push(...fullPath);
    } else {
      // Intermediate node: recurse into a nested jsonb_build_object
      buildPgExpr(subtree, columnRef, [...ancestors, key], sqlParts, bindings);
    }
  }
  sqlParts.push(')');
}

/**
 * Recursively builds a json_object(...) / JSON_OBJECT(...) expression
 * for SQLite and MySQL where leaf values are extracted via
 * json_extract / JSON_EXTRACT.
 *
 * @param tree        – the sub-tree to render
 * @param columnRef   – the column reference (plain text column)
 * @param pathPrefix  – JSON path prefix, e.g. '$' or '$.metadata'
 * @param sqlParts    – accumulates SQL fragments
 * @param bindings    – accumulates ? binding values
 * @param objectFn    – function name, e.g. 'json_object' or 'JSON_OBJECT'
 * @param extractFn   – function name, e.g. 'json_extract' or 'JSON_EXTRACT'
 */
function buildJsonObjectExpr(
  tree: FieldTree,
  columnRef: string,
  pathPrefix: string,
  sqlParts: string[],
  bindings: string[],
  objectFn: string,
  extractFn: string,
): void {
  const entries = Object.entries(tree);
  sqlParts.push(`${objectFn}(`);
  for (let i = 0; i < entries.length; i++) {
    const [key, subtree] = entries[i];
    if (i > 0) sqlParts.push(',');
    bindings.push(key);
    sqlParts.push('?,');
    const subPath = `${pathPrefix}.${key}`;
    if (subtree === null) {
      // Leaf: extract the value at this path
      bindings.push(subPath);
      sqlParts.push(`${extractFn}(${columnRef}, ?)`);
    } else {
      // Intermediate: recurse
      buildJsonObjectExpr(
        subtree,
        columnRef,
        subPath,
        sqlParts,
        bindings,
        objectFn,
        extractFn,
      );
    }
  }
  sqlParts.push(')');
}

/**
 * Builds a database-side JSON field projection expression as a `Knex.Raw`.
 *
 * When a request specifies a `fields` list, the catalog normally fetches full
 * entity JSON blobs from `final_entities.final_entity` and then filters fields
 * in JavaScript. For large result sets this causes significant overhead:
 * - The full JSON is transferred over the DB → Node.js connection
 * - Each blob is JSON.parse'd, filtered, and JSON.stringify'd in JS
 *
 * This function generates a SQL expression that projects only the requested
 * fields directly in the database, reducing data transfer and CPU cost.
 *
 * The returned expression is intended to be used as the value for the
 * `final_entity` column alias in a Knex SELECT, e.g.:
 *
 *   query.select({ final_entity: buildJsonFieldProjection(db, fields, 'final_entities', 'final_entity') })
 *
 * The result is always cast to TEXT so it matches the type that
 * `processRawEntitiesResult` expects.
 *
 * Returns `null` when:
 * - `fieldPaths` is empty (no projection needed)
 * - Any field path contains '/' (annotation-style keys whose dot-separated
 *   segments are not simple JSON object keys; e.g.
 *   `metadata.annotations.backstage.io/techdocs-ref`). These fall back to
 *   the JS-side transform which handles the dot-joining fallback logic.
 * - The DB client is not supported (caller falls back to JS-side projection)
 *
 * @param db         – Knex instance (used for client detection and raw())
 * @param fieldPaths – dot-separated field paths, e.g. ['kind', 'metadata.name']
 * @param table      – unquoted table name, e.g. 'final_entities'
 * @param column     – unquoted column name, e.g. 'final_entity'
 */
export function buildJsonFieldProjection(
  db: Knex,
  fieldPaths: string[],
  table: string,
  column: string,
): Knex.Raw | null {
  if (!fieldPaths.length) return null;

  // Paths containing '/' indicate annotation-like keys (e.g.
  // metadata.annotations.backstage.io/techdocs-ref) where individual key
  // segments themselves contain dots. The projection builder splits on every
  // dot and cannot safely represent these paths in SQL. Fall back to JS.
  if (fieldPaths.some(p => p.includes('/'))) return null;

  const tree = buildFieldTree(fieldPaths);
  if (!Object.keys(tree).length) return null;

  const client: string = db.client.config.client;
  const sqlParts: string[] = [];
  const bindings: string[] = [];

  if (client.includes('pg')) {
    // final_entity is a TEXT column; cast to jsonb for -> operators, then
    // cast the result back to text so the pg driver returns a plain string.
    // PostgreSQL uses double-quote identifiers.
    const pgColumnRef = `("${table}"."${column}"::jsonb)`;
    buildPgExpr(tree, pgColumnRef, [], sqlParts, bindings);
    return db.raw(`(${sqlParts.join(' ')})::text`, bindings);
  }

  if (client.includes('sqlite3') || client.includes('better-sqlite3')) {
    // SQLite uses double-quote identifiers.
    const colRef = `"${table}"."${column}"`;
    buildJsonObjectExpr(
      tree,
      colRef,
      '$',
      sqlParts,
      bindings,
      'json_object',
      'json_extract',
    );
    return db.raw(sqlParts.join(' '), bindings);
  }

  if (client.includes('mysql')) {
    // MySQL uses backtick identifiers.
    const colRef = `\`${table}\`.\`${column}\``;
    buildJsonObjectExpr(
      tree,
      colRef,
      '$',
      sqlParts,
      bindings,
      'JSON_OBJECT',
      'JSON_EXTRACT',
    );
    // Cast to CHAR so the MySQL driver returns a plain string
    return db.raw(`CAST(${sqlParts.join(' ')} AS CHAR)`, bindings);
  }

  // Unsupported DB client – caller should fall back to JS-side projection
  return null;
}

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

// @ts-check

/**
 * Replaces search_key_original_value_idx with a covering index that also
 * includes entity_id.
 *
 * The entity-facets query groups search rows by (key, original_value) and
 * computes COUNT(DISTINCT entity_id). With only (key, original_value) indexed
 * the database must revisit the heap for every matched row to fetch entity_id.
 * Adding entity_id as the third column makes the index covering: on PostgreSQL
 * the planner can satisfy the entire query with an index-only scan and
 * deduplicate entity_id directly from the already-sorted index pages, which
 * is far cheaper than random heap I/O on large catalogs.
 *
 * The old (key, original_value) index is a prefix of the new one, so it is
 * redundant and is dropped in the same migration.
 */

/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
  if (knex.client.config.client === 'pg') {
    // search_key_original_value_idx was created for PG only in
    // 20240130092632_search_index.js; replacing it with the covering index
    // makes it a redundant prefix so it can be dropped at the same time.
    await knex.raw(
      'DROP INDEX CONCURRENTLY IF EXISTS search_key_original_value_idx',
    );
    await knex.raw(
      'CREATE INDEX CONCURRENTLY search_key_original_value_entity_id_idx ON search(key, original_value, entity_id)',
    );
  } else {
    // On MySQL/SQLite the (key, original_value) index was never created, so
    // there is nothing to drop — just add the covering index.
    await knex.schema.alterTable('search', table => {
      table.index(
        ['key', 'original_value', 'entity_id'],
        'search_key_original_value_entity_id_idx',
      );
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
  if (knex.client.config.client === 'pg') {
    await knex.raw(
      'DROP INDEX CONCURRENTLY IF EXISTS search_key_original_value_entity_id_idx',
    );
    await knex.raw(
      'CREATE INDEX CONCURRENTLY search_key_original_value_idx ON search(key, original_value)',
    );
  } else {
    await knex.schema.alterTable('search', table => {
      table.dropIndex([], 'search_key_original_value_entity_id_idx');
    });
  }
};

exports.config = {
  transaction: false,
};

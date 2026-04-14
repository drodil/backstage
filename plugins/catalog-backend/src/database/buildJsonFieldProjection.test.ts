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
import { buildJsonFieldProjection } from './buildJsonFieldProjection';

/**
 * Minimal Knex mock: captures db.raw(sql, bindings) calls so tests can assert
 * on the generated SQL template and binding values without hitting a real DB.
 */
function mockDb(client: string): Knex {
  return {
    client: { config: { client } },
    raw: (sql: string, bindings: string[]) => ({ sql, bindings }),
  } as unknown as Knex;
}

/** Cast the opaque Knex.Raw back to something inspectable in tests. */
function asRaw(
  result: Knex.Raw | null,
): { sql: string; bindings: string[] } | null {
  return result as any;
}

describe('buildJsonFieldProjection', () => {
  describe('returns null (falls back to JS projection)', () => {
    it('returns null for an empty fieldPaths array', () => {
      expect(
        buildJsonFieldProjection(mockDb('sqlite3'), [], 't', 'c'),
      ).toBeNull();
    });

    it('returns null when any path contains "/" (annotation-style keys)', () => {
      // These keys contain slashes inside a segment, e.g. "backstage.io/entity-ref".
      // The builder cannot split them correctly so it falls back to JS.
      expect(
        buildJsonFieldProjection(
          mockDb('sqlite3'),
          ['metadata.annotations.backstage.io/techdocs-ref'],
          't',
          'c',
        ),
      ).toBeNull();
    });

    it('returns null when one path has "/" and others do not', () => {
      expect(
        buildJsonFieldProjection(
          mockDb('pg'),
          ['kind', 'metadata.annotations.github.com/project-slug'],
          't',
          'c',
        ),
      ).toBeNull();
    });

    it('returns null for an unsupported DB client', () => {
      expect(
        buildJsonFieldProjection(mockDb('mssql'), ['kind'], 't', 'c'),
      ).toBeNull();
    });
  });

  describe('SQLite / better-sqlite3', () => {
    it.each(['sqlite3', 'better-sqlite3'])('works with client %s', client => {
      const r = asRaw(
        buildJsonFieldProjection(mockDb(client), ['kind'], 't', 'c'),
      )!;
      expect(r.sql).toBe('json_object( ?, json_extract("t"."c", ?) )');
      expect(r.bindings).toEqual(['kind', '$.kind']);
    });

    it('single top-level field', () => {
      const r = asRaw(
        buildJsonFieldProjection(mockDb('sqlite3'), ['kind'], 't', 'c'),
      )!;
      expect(r.sql).toBe('json_object( ?, json_extract("t"."c", ?) )');
      expect(r.bindings).toEqual(['kind', '$.kind']);
    });

    it('single nested field', () => {
      const r = asRaw(
        buildJsonFieldProjection(
          mockDb('sqlite3'),
          ['metadata.name'],
          't',
          'c',
        ),
      )!;
      expect(r.sql).toBe(
        'json_object( ?, json_object( ?, json_extract("t"."c", ?) ) )',
      );
      expect(r.bindings).toEqual(['metadata', 'name', '$.metadata.name']);
    });

    it('deeply nested field', () => {
      const r = asRaw(
        buildJsonFieldProjection(
          mockDb('sqlite3'),
          ['spec.profile.email'],
          't',
          'c',
        ),
      )!;
      expect(r.sql).toBe(
        'json_object( ?, json_object( ?, json_object( ?, json_extract("t"."c", ?) ) ) )',
      );
      expect(r.bindings).toEqual([
        'spec',
        'profile',
        'email',
        '$.spec.profile.email',
      ]);
    });

    it('multiple top-level fields', () => {
      const r = asRaw(
        buildJsonFieldProjection(
          mockDb('sqlite3'),
          ['kind', 'apiVersion'],
          't',
          'c',
        ),
      )!;
      expect(r.sql).toBe(
        'json_object( ?, json_extract("t"."c", ?) , ?, json_extract("t"."c", ?) )',
      );
      expect(r.bindings).toEqual([
        'kind',
        '$.kind',
        'apiVersion',
        '$.apiVersion',
      ]);
    });

    it('mixed top-level and nested fields', () => {
      const r = asRaw(
        buildJsonFieldProjection(
          mockDb('sqlite3'),
          ['kind', 'metadata.name'],
          't',
          'c',
        ),
      )!;
      expect(r.sql).toBe(
        'json_object( ?, json_extract("t"."c", ?) , ?, json_object( ?, json_extract("t"."c", ?) ) )',
      );
      expect(r.bindings).toEqual([
        'kind',
        '$.kind',
        'metadata',
        'name',
        '$.metadata.name',
      ]);
    });

    it('sibling nested fields share the same intermediate node', () => {
      const r = asRaw(
        buildJsonFieldProjection(
          mockDb('sqlite3'),
          ['metadata.name', 'metadata.namespace'],
          't',
          'c',
        ),
      )!;
      // Both name and namespace live under a single json_object for metadata
      expect(r.sql).toBe(
        'json_object( ?, json_object( ?, json_extract("t"."c", ?) , ?, json_extract("t"."c", ?) ) )',
      );
      expect(r.bindings).toEqual([
        'metadata',
        'name',
        '$.metadata.name',
        'namespace',
        '$.metadata.namespace',
      ]);
    });

    it('respects the table and column names in the column reference', () => {
      const r = asRaw(
        buildJsonFieldProjection(
          mockDb('sqlite3'),
          ['kind'],
          'final_entities',
          'final_entity',
        ),
      )!;
      expect(r.sql).toBe(
        'json_object( ?, json_extract("final_entities"."final_entity", ?) )',
      );
    });

    describe('parent-dominates-child (leaf before subtree)', () => {
      it('when parent path comes first, the child path is ignored', () => {
        // 'metadata' is a leaf → metadata.name is skipped
        const withNested = asRaw(
          buildJsonFieldProjection(
            mockDb('sqlite3'),
            ['metadata', 'metadata.name'],
            't',
            'c',
          ),
        )!;
        const parentOnly = asRaw(
          buildJsonFieldProjection(mockDb('sqlite3'), ['metadata'], 't', 'c'),
        )!;
        // Should produce the same SQL as if only 'metadata' was requested
        expect(withNested.sql).toBe(parentOnly.sql);
        expect(withNested.bindings).toEqual(parentOnly.bindings);
      });

      it('when child path comes first, it is kept (existing intermediate node is not overwritten by later leaf)', () => {
        // 'metadata.name' creates an intermediate node for metadata; the
        // later parent path 'metadata' cannot overwrite it to a leaf.
        const r = asRaw(
          buildJsonFieldProjection(
            mockDb('sqlite3'),
            ['metadata.name', 'metadata'],
            't',
            'c',
          ),
        )!;
        const childOnly = asRaw(
          buildJsonFieldProjection(
            mockDb('sqlite3'),
            ['metadata.name'],
            't',
            'c',
          ),
        )!;
        expect(r.sql).toBe(childOnly.sql);
        expect(r.bindings).toEqual(childOnly.bindings);
      });
    });
  });

  describe('PostgreSQL', () => {
    it('single top-level field uses -> operator and ::text cast', () => {
      const r = asRaw(
        buildJsonFieldProjection(mockDb('pg'), ['kind'], 't', 'c'),
      )!;
      expect(r.sql).toBe(
        '(jsonb_build_object( ?::text, ("t"."c"::jsonb) -> ? ))::text',
      );
      expect(r.bindings).toEqual(['kind', 'kind']);
    });

    it('nested field uses chained -> operators', () => {
      const r = asRaw(
        buildJsonFieldProjection(mockDb('pg'), ['metadata.name'], 't', 'c'),
      )!;
      expect(r.sql).toBe(
        '(jsonb_build_object( ?::text, jsonb_build_object( ?::text, ("t"."c"::jsonb) -> ? -> ? ) ))::text',
      );
      expect(r.bindings).toEqual(['metadata', 'name', 'metadata', 'name']);
    });

    it('deeply nested field chains three -> operators', () => {
      const r = asRaw(
        buildJsonFieldProjection(
          mockDb('pg'),
          ['spec.profile.email'],
          't',
          'c',
        ),
      )!;
      expect(r.sql).toBe(
        '(jsonb_build_object( ?::text, jsonb_build_object( ?::text, jsonb_build_object( ?::text, ("t"."c"::jsonb) -> ? -> ? -> ? ) ) ))::text',
      );
      expect(r.bindings).toEqual([
        'spec',
        'profile',
        'email',
        'spec',
        'profile',
        'email',
      ]);
    });

    it('multiple fields in a single jsonb_build_object', () => {
      const r = asRaw(
        buildJsonFieldProjection(
          mockDb('pg'),
          ['kind', 'metadata.name'],
          't',
          'c',
        ),
      )!;
      expect(r.sql).toBe(
        '(jsonb_build_object( ?::text, ("t"."c"::jsonb) -> ? , ?::text, jsonb_build_object( ?::text, ("t"."c"::jsonb) -> ? -> ? ) ))::text',
      );
      expect(r.bindings).toEqual([
        'kind',
        'kind',
        'metadata',
        'name',
        'metadata',
        'name',
      ]);
    });

    it('uses double-quote identifiers for table and column', () => {
      const r = asRaw(
        buildJsonFieldProjection(
          mockDb('pg'),
          ['kind'],
          'final_entities',
          'final_entity',
        ),
      )!;
      expect(r.sql).toContain('"final_entities"."final_entity"');
    });

    it('also matches client strings like "pg-native" that contain "pg"', () => {
      // Knex uses client strings that contain the substring 'pg', such as
      // 'pg' or 'pg-native'. The plain string 'postgresql' does NOT match.
      const r = asRaw(
        buildJsonFieldProjection(mockDb('pg-native'), ['kind'], 't', 'c'),
      );
      expect(r).not.toBeNull();
      expect(r!.sql).toContain('jsonb_build_object');
    });

    describe('parent-dominates-child', () => {
      it('parent path first collapses child path to a single leaf', () => {
        const withNested = asRaw(
          buildJsonFieldProjection(
            mockDb('pg'),
            ['metadata', 'metadata.name'],
            't',
            'c',
          ),
        )!;
        const parentOnly = asRaw(
          buildJsonFieldProjection(mockDb('pg'), ['metadata'], 't', 'c'),
        )!;
        expect(withNested.sql).toBe(parentOnly.sql);
        expect(withNested.bindings).toEqual(parentOnly.bindings);
      });
    });
  });

  describe('MySQL', () => {
    it('single top-level field uses JSON_OBJECT / JSON_EXTRACT with CAST', () => {
      const r = asRaw(
        buildJsonFieldProjection(mockDb('mysql'), ['kind'], 't', 'c'),
      )!;
      expect(r.sql).toBe(
        'CAST(JSON_OBJECT( ?, JSON_EXTRACT(`t`.`c`, ?) ) AS CHAR)',
      );
      expect(r.bindings).toEqual(['kind', '$.kind']);
    });

    it('nested field builds nested JSON_OBJECT', () => {
      const r = asRaw(
        buildJsonFieldProjection(mockDb('mysql'), ['metadata.name'], 't', 'c'),
      )!;
      expect(r.sql).toBe(
        'CAST(JSON_OBJECT( ?, JSON_OBJECT( ?, JSON_EXTRACT(`t`.`c`, ?) ) ) AS CHAR)',
      );
      expect(r.bindings).toEqual(['metadata', 'name', '$.metadata.name']);
    });

    it('uses backtick identifiers for table and column', () => {
      const r = asRaw(
        buildJsonFieldProjection(
          mockDb('mysql'),
          ['kind'],
          'final_entities',
          'final_entity',
        ),
      )!;
      expect(r.sql).toContain('`final_entities`.`final_entity`');
    });

    it('also matches client strings like "mysql2"', () => {
      const r = asRaw(
        buildJsonFieldProjection(mockDb('mysql2'), ['kind'], 't', 'c'),
      );
      expect(r).not.toBeNull();
      expect(r!.sql).toContain('JSON_OBJECT');
    });

    describe('parent-dominates-child', () => {
      it('parent path first collapses child path to a single leaf', () => {
        const withNested = asRaw(
          buildJsonFieldProjection(
            mockDb('mysql'),
            ['metadata', 'metadata.name'],
            't',
            'c',
          ),
        )!;
        const parentOnly = asRaw(
          buildJsonFieldProjection(mockDb('mysql'), ['metadata'], 't', 'c'),
        )!;
        expect(withNested.sql).toBe(parentOnly.sql);
        expect(withNested.bindings).toEqual(parentOnly.bindings);
      });
    });
  });
});

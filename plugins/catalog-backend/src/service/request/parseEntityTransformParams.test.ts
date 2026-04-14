/*
 * Copyright 2021 The Backstage Authors
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

import { Entity } from '@backstage/catalog-model';
import {
  parseEntityFieldPaths,
  parseEntityTransformParams,
} from './parseEntityTransformParams';

describe('parseEntityTransformParams', () => {
  let entity: Entity;

  beforeEach(() => {
    entity = {
      apiVersion: 'av',
      kind: 'k',
      metadata: {
        name: 'n',
        tags: ['t1', 't2'],
        annotations: {
          'example.test/url-like-key': 'ul1',
          'example.com/other-url-like-key': 'ul2',
          'other-example.test/next-url-like-key': 'ul3',
        },
      },
      spec: {
        type: 't',
      },
    };
  });

  it('returns undefined when no fields given', () => {
    expect(parseEntityTransformParams({})).toBeUndefined();
    expect(parseEntityTransformParams({ fields: '' })).toBeUndefined();
    expect(parseEntityTransformParams({ fields: [] })).toBeUndefined();
    expect(parseEntityTransformParams({ fields: [''] })).toBeUndefined();
    expect(parseEntityTransformParams({ fields: [','] })).toBeUndefined();
  });

  it('rejects attempts at array filtering', () => {
    expect(() =>
      parseEntityTransformParams({ fields: 'metadata.tags[0]' })!(entity),
    ).toThrow(
      'Invalid field "metadata.tags[0]", array type fields are not supported',
    );
  });

  it('accepts both strings and arrays of strings as input', () => {
    expect(parseEntityTransformParams({ fields: 'kind' })!(entity)).toEqual({
      kind: 'k',
    });
    expect(parseEntityTransformParams({ fields: ['kind'] })!(entity)).toEqual({
      kind: 'k',
    });
    expect(
      parseEntityTransformParams({ fields: ['kind', 'apiVersion'] })!(entity),
    ).toEqual({ apiVersion: 'av', kind: 'k' });
  });

  it('supports sub-selection properly', () => {
    expect(
      parseEntityTransformParams({ fields: 'kind,metadata.name' })!(entity),
    ).toEqual({ kind: 'k', metadata: { name: 'n' } });
    expect(parseEntityTransformParams({ fields: 'metadata' })!(entity)).toEqual(
      {
        metadata: {
          name: 'n',
          tags: ['t1', 't2'],
          annotations: {
            'example.test/url-like-key': 'ul1',
            'example.com/other-url-like-key': 'ul2',
            'other-example.test/next-url-like-key': 'ul3',
          },
        },
      },
    );
  });

  it('supports dot notated fields properly', () => {
    expect(
      parseEntityTransformParams({
        fields: 'kind,metadata.annotations.example.com/other-url-like-key',
      })!(entity),
    ).toEqual({
      kind: 'k',
      metadata: { annotations: { 'example.com/other-url-like-key': 'ul2' } },
    });
  });

  it('supports nested dot notated fields properly', () => {
    entity.spec = {
      ...entity.spec,
      'field-with.dot': 'fd1',
      'other-field-with.dot-also': {
        subItem: 'fd2.sub',
        'subite.with/dot': 'fd2.sub.dot',
      },
      'third-field-with.dot-again': 'fd3',
    };

    expect(
      parseEntityTransformParams({
        fields: 'kind,spec.other-field-with.dot-also',
      })!(entity),
    ).toEqual({
      kind: 'k',
      spec: {
        'other-field-with.dot-also': {
          subItem: 'fd2.sub',
          'subite.with/dot': 'fd2.sub.dot',
        },
      },
    });
    expect(
      parseEntityTransformParams({
        fields: 'kind,spec.other-field-with.dot-also.subite.with/dot',
      })!(entity),
    ).toEqual({
      kind: 'k',
      spec: {
        'other-field-with.dot-also': {
          'subite.with/dot': 'fd2.sub.dot',
        },
      },
    });
  });

  it('does not return a sub key if an incorrect longer key is requested', () => {
    entity.spec = {
      ...entity.spec,
      strValue: 'st1',
      boolValue: true,
      numValue: 4,
      arrValue: [4, 5],
      nullValue: null,
      undefValue: undefined,
      'field-with.dot': 'fd1',
    };

    expect(
      parseEntityTransformParams({ fields: 'kind,spec.strValue.other' })!(
        entity,
      ),
    ).toEqual({ kind: 'k' });
    expect(
      parseEntityTransformParams({ fields: 'kind,spec.boolValue.other' })!(
        entity,
      ),
    ).toEqual({ kind: 'k' });
    expect(
      parseEntityTransformParams({ fields: 'kind,spec.numValue.other' })!(
        entity,
      ),
    ).toEqual({ kind: 'k' });
    expect(
      parseEntityTransformParams({ fields: 'kind,spec.arrValue.other' })!(
        entity,
      ),
    ).toEqual({ kind: 'k' });
    expect(
      parseEntityTransformParams({ fields: 'kind,spec.nullValue.other' })!(
        entity,
      ),
    ).toEqual({ kind: 'k' });
    expect(
      parseEntityTransformParams({ fields: 'kind,spec.undefValue.other' })!(
        entity,
      ),
    ).toEqual({ kind: 'k' });
    expect(
      parseEntityTransformParams({ fields: 'kind,spec.field-with.dot.other' })!(
        entity,
      ),
    ).toEqual({ kind: 'k' });
  });

  it('handles both query params and extras, dealing with overlaps', () => {
    expect(
      parseEntityTransformParams({ fields: 'kind' }, [
        'kind',
        'metadata.name',
      ])!(entity),
    ).toEqual({
      kind: 'k',
      metadata: {
        name: 'n',
      },
    });
  });
});

describe('parseEntityFieldPaths', () => {
  it('returns undefined when no fields given', () => {
    expect(parseEntityFieldPaths({})).toBeUndefined();
    expect(parseEntityFieldPaths({ fields: '' })).toBeUndefined();
    expect(parseEntityFieldPaths({ fields: [] })).toBeUndefined();
  });

  it('rejects array-style selectors with the same error as parseEntityTransformParams', () => {
    expect(() => parseEntityFieldPaths({ fields: 'metadata.tags[0]' })).toThrow(
      'Invalid field "metadata.tags[0]", array type fields are not supported',
    );
  });

  it('returns a deduplicated flat array of field paths', () => {
    expect(parseEntityFieldPaths({ fields: 'kind,metadata.name' })).toEqual([
      'kind',
      'metadata.name',
    ]);
    expect(
      parseEntityFieldPaths({ fields: ['kind', 'metadata.name', 'kind'] }),
    ).toEqual(['kind', 'metadata.name']);
  });

  it('merges extras with query params', () => {
    expect(
      parseEntityFieldPaths({ fields: 'kind' }, ['metadata.name']),
    ).toEqual(['metadata.name', 'kind']);
  });

  it('includes annotation-style paths containing /', () => {
    // These paths are returned as-is; buildJsonFieldProjection will detect '/'
    // and fall back to JS-side projection rather than SQL.
    const paths = parseEntityFieldPaths({
      fields: 'metadata.annotations.backstage.io/techdocs-ref',
    });
    expect(paths).toEqual(['metadata.annotations.backstage.io/techdocs-ref']);
  });

  it('trims whitespace around field names', () => {
    expect(parseEntityFieldPaths({ fields: ' kind , metadata.name ' })).toEqual(
      ['kind', 'metadata.name'],
    );
  });

  it('filters out empty strings in an array', () => {
    expect(
      parseEntityFieldPaths({ fields: ['kind', '', 'metadata.name'] }),
    ).toEqual(['kind', 'metadata.name']);
  });

  it('returns undefined when fields contains only empty or whitespace values', () => {
    expect(parseEntityFieldPaths({ fields: [','] })).toBeUndefined();
    expect(parseEntityFieldPaths({ fields: ['', ''] })).toBeUndefined();
    expect(parseEntityFieldPaths({ fields: '  ' })).toBeUndefined();
  });

  it('deduplicates across extras and query params', () => {
    expect(
      parseEntityFieldPaths({ fields: 'kind,metadata.name' }, ['kind']),
    ).toEqual(['kind', 'metadata.name']);
  });
});

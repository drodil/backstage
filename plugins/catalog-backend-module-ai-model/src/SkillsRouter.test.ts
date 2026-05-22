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

import express from 'express';
import request from 'supertest';
import { createSkillsRouter } from './SkillsRouter';
import { mockCredentials, mockServices } from '@backstage/backend-test-utils';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';

describe('createSkillsRouter', () => {
  const mockCatalog = catalogServiceMock.mock();

  const mockReader = mockServices.urlReader.mock();
  const mockCache = mockServices.cache.mock();
  const mockAuth = mockServices.auth.mock();
  const mockLogger = mockServices.logger.mock();

  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCache.get.mockResolvedValue(undefined);
    mockCache.set.mockResolvedValue(undefined);
    mockAuth.getOwnServiceCredentials.mockResolvedValue(
      mockCredentials.service(),
    );

    const router = createSkillsRouter({
      catalog: mockCatalog as any,
      auth: mockAuth,
      reader: mockReader,
      cache: mockCache,
      logger: mockLogger,
    });

    app = express();
    app.use('/.well-known/skills', router);
  });

  describe('GET /.well-known/skills/index.json', () => {
    it('returns an index of available skills', async () => {
      mockCatalog.getEntities.mockResolvedValue({
        items: [
          {
            apiVersion: 'backstage.io/v1alpha1',
            kind: 'AiResource',
            metadata: {
              name: 'frontend-design',
              namespace: 'default',
              description: 'A skill for frontend design',
              annotations: {
                'backstage.io/source-location':
                  'url:https://github.com/org/repo/blob/main/skills/frontend-design/SKILL.md',
              },
            },
            spec: { type: 'skill', lifecycle: 'production', owner: 'team-a' },
          },
          {
            apiVersion: 'backstage.io/v1alpha1',
            kind: 'AiResource',
            metadata: {
              name: 'testing-patterns',
              namespace: 'default',
              description: 'Skill for testing patterns',
              annotations: {
                'backstage.io/source-location':
                  'url:https://github.com/org/repo/blob/main/skills/testing/SKILL.md',
              },
            },
            spec: { type: 'skill', lifecycle: 'production', owner: 'team-b' },
          },
          {
            apiVersion: 'backstage.io/v1alpha1',
            kind: 'AiResource',
            metadata: {
              name: 'custom-skill',
              namespace: 'custom-ns',
              description: 'A skill in a custom namespace',
              annotations: {
                'backstage.io/source-location':
                  'url:https://github.com/org/repo/blob/main/skills/custom/SKILL.md',
              },
            },
            spec: { type: 'skill', lifecycle: 'production', owner: 'team-c' },
          },
        ],
      });

      const response = await request(app).get('/.well-known/skills/index.json');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        skills: [
          {
            name: 'frontend-design',
            description: 'A skill for frontend design',
            files: ['SKILL.md'],
          },
          {
            name: 'testing-patterns',
            description: 'Skill for testing patterns',
            files: ['SKILL.md'],
          },
          {
            name: 'custom-ns/custom-skill',
            description: 'A skill in a custom namespace',
            files: ['SKILL.md'],
          },
        ],
      });
    });

    it('returns cached index when available', async () => {
      const cachedIndex = {
        skills: [
          {
            name: 'cached-skill',
            description: 'From cache',
            files: ['SKILL.md'],
          },
        ],
      };
      mockCache.get.mockResolvedValue(cachedIndex);

      const response = await request(app).get('/.well-known/skills/index.json');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(cachedIndex);
      expect(mockCatalog.getEntities).not.toHaveBeenCalled();
    });

    it('skips skills without source-location annotation', async () => {
      mockCatalog.getEntities.mockResolvedValue({
        items: [
          {
            apiVersion: 'backstage.io/v1alpha1',
            kind: 'AiResource',
            metadata: {
              name: 'no-source',
              namespace: 'default',
              description: 'Missing source location',
              annotations: {},
            },
            spec: { type: 'skill', lifecycle: 'production', owner: 'team-a' },
          },
        ],
      });

      const response = await request(app).get('/.well-known/skills/index.json');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ skills: [] });
    });

    it('includes skills with valid url source location without fetching content', async () => {
      mockCatalog.getEntities.mockResolvedValue({
        items: [
          {
            apiVersion: 'backstage.io/v1alpha1',
            kind: 'AiResource',
            metadata: {
              name: 'unreachable-skill',
              namespace: 'default',
              description: 'Cannot fetch',
              annotations: {
                'backstage.io/source-location':
                  'url:https://github.com/org/repo/blob/main/skills/broken/SKILL.md',
              },
            },
            spec: { type: 'skill', lifecycle: 'production', owner: 'team-a' },
          },
        ],
      });

      const response = await request(app).get('/.well-known/skills/index.json');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        skills: [
          {
            name: 'unreachable-skill',
            description: 'Cannot fetch',
            files: ['SKILL.md'],
          },
        ],
      });
      expect(mockReader.readUrl).not.toHaveBeenCalled();
    });

    it('skips skills with non-url source location type', async () => {
      mockCatalog.getEntities.mockResolvedValue({
        items: [
          {
            apiVersion: 'backstage.io/v1alpha1',
            kind: 'AiResource',
            metadata: {
              name: 'file-based',
              namespace: 'default',
              description: 'File source',
              annotations: {
                'backstage.io/source-location': 'file:/local/path/SKILL.md',
              },
            },
            spec: { type: 'skill', lifecycle: 'production', owner: 'team-a' },
          },
        ],
      });

      const response = await request(app).get('/.well-known/skills/index.json');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ skills: [] });
    });
  });

  describe('GET /.well-known/skills/:skillName/SKILL.md', () => {
    it('returns skill content from cache', async () => {
      mockCache.get.mockResolvedValue('# Cached Skill Content');
      mockCatalog.getEntityByRef.mockResolvedValue({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'AiResource',
        metadata: {
          name: 'frontend-design',
          namespace: 'default',
          description: 'A skill for frontend design',
          annotations: {
            'backstage.io/source-location':
              'url:https://github.com/org/repo/blob/main/skills/frontend-design/SKILL.md',
          },
        },
        spec: { type: 'skill', lifecycle: 'production', owner: 'team-a' },
      });

      const response = await request(app).get(
        '/.well-known/skills/frontend-design/SKILL.md',
      );

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/markdown');
      expect(response.text).toBe('# Cached Skill Content');
    });

    it('fetches and caches skill content when not in cache', async () => {
      mockCache.get.mockResolvedValue(undefined);
      mockCatalog.getEntityByRef.mockResolvedValue({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'AiResource',
        metadata: {
          name: 'frontend-design',
          namespace: 'default',
          description: 'A skill for frontend design',
          annotations: {
            'backstage.io/source-location':
              'url:https://github.com/org/repo/blob/main/skills/frontend-design/SKILL.md',
          },
        },
        spec: { type: 'skill', lifecycle: 'production', owner: 'team-a' },
      });

      mockReader.readUrl.mockResolvedValue({
        buffer: async () => Buffer.from('# Fresh Skill Content'),
        etag: 'abc123',
      });

      const response = await request(app).get(
        '/.well-known/skills/frontend-design/SKILL.md',
      );

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/markdown');
      expect(response.text).toBe('# Fresh Skill Content');
      expect(mockCache.set).toHaveBeenCalledWith(
        'skills-content:airesource:default/frontend-design',
        '# Fresh Skill Content',
        { ttl: { minutes: 5 } },
      );
    });

    it('returns 404 when skill entity is not found', async () => {
      mockCache.get.mockResolvedValue(undefined);
      mockCatalog.getEntityByRef.mockResolvedValue(undefined);

      const response = await request(app).get(
        '/.well-known/skills/nonexistent/SKILL.md',
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Skill not found' });
    });

    it('returns 404 when entity is not a skill type', async () => {
      mockCache.get.mockResolvedValue(undefined);
      mockCatalog.getEntityByRef.mockResolvedValue({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'AiResource',
        metadata: {
          name: 'some-rule',
          namespace: 'default',
          description: 'A rule',
          annotations: {
            'backstage.io/source-location': 'url:https://example.com/rule.md',
          },
        },
        spec: { type: 'rule', lifecycle: 'production', owner: 'team-a' },
      });

      const response = await request(app).get(
        '/.well-known/skills/some-rule/SKILL.md',
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Skill not found' });
    });

    it('returns 404 when skill content cannot be fetched', async () => {
      mockCache.get.mockResolvedValue(undefined);
      mockCatalog.getEntityByRef.mockResolvedValue({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'AiResource',
        metadata: {
          name: 'broken-skill',
          namespace: 'default',
          description: 'Broken',
          annotations: {
            'backstage.io/source-location':
              'url:https://github.com/org/repo/blob/main/skills/broken/SKILL.md',
          },
        },
        spec: { type: 'skill', lifecycle: 'production', owner: 'team-a' },
      });

      mockReader.readUrl.mockRejectedValue(new Error('Not found'));

      const response = await request(app).get(
        '/.well-known/skills/broken-skill/SKILL.md',
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Skill content not available' });
    });

    it('resolves skills from non-default namespace', async () => {
      mockCache.get.mockResolvedValue(undefined);
      mockCatalog.getEntityByRef.mockResolvedValue({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'AiResource',
        metadata: {
          name: 'custom-skill',
          namespace: 'custom-ns',
          description: 'A custom namespace skill',
          annotations: {
            'backstage.io/source-location':
              'url:https://github.com/org/repo/blob/main/skills/custom/SKILL.md',
          },
        },
        spec: { type: 'skill', lifecycle: 'production', owner: 'team-c' },
      });

      mockReader.readUrl.mockResolvedValue({
        buffer: async () => Buffer.from('# Custom NS Skill'),
        etag: 'def456',
      });

      const response = await request(app).get(
        '/.well-known/skills/custom-ns/custom-skill/SKILL.md',
      );

      expect(response.status).toBe(200);
      expect(response.text).toBe('# Custom NS Skill');
      expect(mockCatalog.getEntityByRef).toHaveBeenCalledWith(
        'airesource:custom-ns/custom-skill',
        expect.anything(),
      );
    });
  });
});

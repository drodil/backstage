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

import { Response, Router } from 'express';
import {
  AuthService,
  CacheService,
  LoggerService,
  UrlReaderService,
} from '@backstage/backend-plugin-api';
import { CatalogService } from '@backstage/plugin-catalog-node';
import {
  ANNOTATION_SOURCE_LOCATION,
  Entity,
  getEntitySourceLocation,
  stringifyEntityRef,
} from '@backstage/catalog-model';

/** @internal */
export type SkillsRouterOptions = {
  catalog: CatalogService;
  auth: AuthService;
  reader: UrlReaderService;
  cache: CacheService;
  logger: LoggerService;
};

type SkillIndexEntry = {
  name: string;
  description: string;
  files: string[];
};

type CachedSkillIndex = {
  skills: SkillIndexEntry[];
};

const CACHE_KEY_INDEX = 'skills-index';
const CACHE_KEY_PREFIX_CONTENT = 'skills-content:';
const CACHE_TTL = { minutes: 5 };

/** @internal */
export function createSkillsRouter(options: SkillsRouterOptions): Router {
  const { catalog, auth, reader, cache, logger } = options;

  const router = Router();

  function skillDisplayName(entity: Entity): string {
    const ns = entity.metadata.namespace ?? 'default';
    if (ns === 'default') {
      return entity.metadata.name;
    }
    return `${ns}/${entity.metadata.name}`;
  }

  async function getSkillEntities(): Promise<Entity[]> {
    const response = await catalog.getEntities(
      {
        filter: { kind: 'AiResource', 'spec.type': 'skill' },
        fields: [
          'metadata.name',
          'metadata.description',
          'metadata.namespace',
          'metadata.annotations',
          'kind',
          'apiVersion',
          'spec.type',
        ],
      },
      { credentials: await auth.getOwnServiceCredentials() },
    );

    return response.items;
  }

  function hasValidSourceLocation(entity: Entity): boolean {
    const annotation =
      entity.metadata.annotations?.[ANNOTATION_SOURCE_LOCATION];
    if (!annotation) {
      return false;
    }
    try {
      const sourceLocation = getEntitySourceLocation(entity);
      return sourceLocation.type === 'url';
    } catch {
      return false;
    }
  }

  async function fetchSkillContent(
    entity: Entity,
  ): Promise<string | undefined> {
    const cacheKey = `${CACHE_KEY_PREFIX_CONTENT}${stringifyEntityRef(entity)}`;
    try {
      const cached = await cache.get<string | null>(cacheKey);
      if (cached !== undefined) {
        return cached ?? undefined;
      }

      const sourceLocation = getEntitySourceLocation(entity);
      if (sourceLocation.type !== 'url') {
        await cache.set(cacheKey, null, { ttl: CACHE_TTL });
        return undefined;
      }

      const response = await reader.readUrl(sourceLocation.target);
      const buffer = await response.buffer();
      const content = buffer.toString('utf-8');

      await cache.set(cacheKey, content, { ttl: CACHE_TTL });
      return content;
    } catch (error) {
      logger.debug(
        `Failed to fetch skill content for ${entity.metadata.name}: ${error}`,
      );
      await cache.set(cacheKey, null, { ttl: CACHE_TTL });
      return undefined;
    }
  }

  async function buildSkillIndex(): Promise<CachedSkillIndex> {
    const cached = await cache.get<CachedSkillIndex>(CACHE_KEY_INDEX);
    if (cached) {
      return cached;
    }

    const entities = await getSkillEntities();
    const skills: SkillIndexEntry[] = [];

    for (const entity of entities) {
      if (!hasValidSourceLocation(entity)) {
        continue;
      }

      skills.push({
        name: skillDisplayName(entity),
        description: entity.metadata.description ?? '',
        files: ['SKILL.md'],
      });
    }

    const index: CachedSkillIndex = { skills };
    await cache.set(CACHE_KEY_INDEX, index, { ttl: CACHE_TTL });
    return index;
  }

  router.get('/index.json', async (_req, res) => {
    try {
      const index = await buildSkillIndex();
      res.json(index);
    } catch (error) {
      logger.error(`Failed to build skills index: ${error}`);
      res.status(500).json({ error: 'Failed to build skills index' });
    }
  });

  async function handleSkillContent(
    namespace: string,
    name: string,
    res: Response,
  ) {
    try {
      const entity = await catalog.getEntityByRef(
        `airesource:${namespace}/${name}`,
        { credentials: await auth.getOwnServiceCredentials() },
      );

      if (!entity || entity.spec?.type !== 'skill') {
        res.status(404).json({ error: 'Skill not found' });
        return;
      }

      const content = await fetchSkillContent(entity);
      if (content === undefined) {
        res.status(404).json({ error: 'Skill content not available' });
        return;
      }

      res.type('text/markdown').send(content);
    } catch (error) {
      logger.error(
        `Failed to fetch skill content for ${namespace}/${name}: ${error}`,
      );
      res.status(500).json({ error: 'Failed to fetch skill content' });
    }
  }

  // Non-default namespace: /<namespace>/<name>/SKILL.md
  router.get('/:namespace/:skillName/SKILL.md', async (req, res) => {
    await handleSkillContent(req.params.namespace, req.params.skillName, res);
  });

  // Default namespace: /<name>/SKILL.md
  router.get('/:skillName/SKILL.md', async (req, res) => {
    await handleSkillContent('default', req.params.skillName, res);
  });

  return router;
}

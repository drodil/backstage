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
import { ActionsRegistryService } from '@backstage/backend-plugin-api/alpha';
import { NotFoundError } from '@backstage/errors';
import { PublisherBase } from '@backstage/plugin-techdocs-node';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { stringifyEntityRef } from '@backstage/catalog-model';

export const createGetTechDocsMetadataAction = ({
  publisher,
  catalog,
  actionsRegistry,
}: {
  publisher: PublisherBase;
  catalog: CatalogService;
  actionsRegistry: ActionsRegistryService;
}) => {
  actionsRegistry.register({
    name: 'get-techdocs-metadata',
    title: 'Get TechDocs Metadata',
    description: `
Retrieves build metadata for the TechDocs documentation site of a catalog entity.

Metadata includes the site name and description (from \`mkdocs.yml\`), an ETag identifying the build
(typically the latest commit SHA of the source repository), the UNIX build timestamp, and an optional
list of all published files.

## When to use

Use this action to check whether TechDocs have been built for an entity, and to inspect build freshness
(compare \`etag\` against the latest commit in the repo). Returns \`404\` if the entity exists but no
documentation has been built for it yet.
    `,
    attributes: {
      destructive: false,
      readOnly: true,
      idempotent: true,
    },
    schema: {
      input: z =>
        z.object({
          name: z.string().describe('The name of the catalog entity.'),
          kind: z
            .string()
            .optional()
            .describe(
              'The kind of the catalog entity, e.g. "Component". Defaults to "Component" if omitted.',
            ),
          namespace: z
            .string()
            .optional()
            .describe(
              'The namespace of the catalog entity. Defaults to "default" if omitted.',
            ),
        }),
      output: z =>
        z.object({
          siteName: z
            .string()
            .describe('The TechDocs site name from mkdocs.yml.'),
          siteDescription: z
            .string()
            .describe('The TechDocs site description from mkdocs.yml.'),
          etag: z
            .string()
            .describe(
              'ETag of the resource used to generate the site — typically the latest commit SHA of the source repository.',
            ),
          buildTimestamp: z
            .number()
            .describe(
              'UNIX timestamp of when the documentation was last built.',
            ),
          files: z
            .array(z.string())
            .optional()
            .describe('List of all published file paths, if available.'),
        }),
    },
    examples: [
      {
        title: 'Get TechDocs metadata for a component',
        input: { name: 'my-service' },
        output: {
          siteName: 'my-service',
          siteDescription: 'Documentation for my-service',
          etag: 'abc123def456',
          buildTimestamp: 1712000000,
          files: ['index.html', 'search/search_index.json'],
        },
      },
    ],
    action: async ({ input, credentials, logger }) => {
      const entityName = {
        kind: input.kind ?? 'Component',
        namespace: input.namespace ?? 'default',
        name: input.name,
      };
      const entityRef = stringifyEntityRef(entityName);

      logger.info(`Fetching TechDocs metadata for "${entityRef}"`);

      const entity = await catalog.getEntityByRef(entityName, { credentials });
      if (!entity) {
        throw new NotFoundError(
          `Entity "${entityRef}" not found in the catalog`,
        );
      }

      let metadata;
      try {
        metadata = await publisher.fetchTechDocsMetadata(entityName);
      } catch (err) {
        throw new NotFoundError(
          `No TechDocs found for "${entityRef}". The documentation may not have been built yet.`,
          err,
        );
      }

      return {
        output: {
          siteName: metadata.site_name,
          siteDescription: metadata.site_description,
          etag: metadata.etag,
          buildTimestamp: metadata.build_timestamp,
          files: metadata.files,
        },
      };
    },
  });
};

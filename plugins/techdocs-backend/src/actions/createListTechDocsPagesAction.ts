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
import { AuthService, DiscoveryService } from '@backstage/backend-plugin-api';
import { NotFoundError } from '@backstage/errors';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { stringifyEntityRef } from '@backstage/catalog-model';

export const createListTechDocsPagesAction = ({
  discovery,
  auth,
  catalog,
  actionsRegistry,
}: {
  discovery: DiscoveryService;
  auth: AuthService;
  catalog: CatalogService;
  actionsRegistry: ActionsRegistryService;
}) => {
  actionsRegistry.register({
    name: 'list-techdocs-pages',
    title: 'List TechDocs Pages',
    description: `
Lists all available documentation pages for a catalog entity, returning each page's title and path.

Pages are derived from the MkDocs \`search_index.json\` that is published alongside the built docs.
Each entry contains a human-readable \`title\` and a relative \`path\` (the URL segment within the docs
site, e.g. \`getting-started/\` or \`api/overview/\`).

## When to use

Use this action first to discover which pages exist before fetching content with \`get-techdocs-page\`.
Returns a \`404\` error if the entity has not had its documentation built yet.
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
          pages: z
            .array(
              z.object({
                title: z
                  .string()
                  .describe('The human-readable title of the page.'),
                path: z
                  .string()
                  .describe(
                    'The relative path of the page within the docs site, e.g. "getting-started/" or "api/overview/".',
                  ),
              }),
            )
            .describe('List of all available documentation pages.'),
        }),
    },
    examples: [
      {
        title: 'List all pages for a component',
        input: { name: 'my-service' },
        output: {
          pages: [
            { title: 'Home', path: '' },
            { title: 'Getting Started', path: 'getting-started/' },
            { title: 'API Overview', path: 'api/overview/' },
          ],
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

      logger.info(`Listing TechDocs pages for "${entityRef}"`);

      const entity = await catalog.getEntityByRef(entityName, { credentials });
      if (!entity) {
        throw new NotFoundError(
          `Entity "${entityRef}" not found in the catalog`,
        );
      }

      const baseUrl = await discovery.getBaseUrl('techdocs');
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials,
        targetPluginId: 'techdocs',
      });

      const indexUrl = `${baseUrl}/static/docs/${entityName.namespace}/${entityName.kind}/${entityName.name}/search/search_index.json`;
      const response = await fetch(indexUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError(
            `No TechDocs found for "${entityRef}". The documentation may not have been built yet.`,
          );
        }
        throw new Error(
          `Failed to fetch TechDocs pages for "${entityRef}": ${response.status} ${response.statusText}`,
        );
      }

      const searchIndex: {
        docs: Array<{ title: string; location: string; text: string }>;
      } = await response.json();

      return {
        output: {
          pages: searchIndex.docs.map(doc => ({
            title: doc.title,
            path: doc.location,
          })),
        },
      };
    },
  });
};

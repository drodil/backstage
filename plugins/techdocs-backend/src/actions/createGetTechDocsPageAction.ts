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

export const createGetTechDocsPageAction = ({
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
    name: 'get-techdocs-page',
    title: 'Get TechDocs Page',
    description: `
Retrieves the plain-text content of a specific documentation page for a catalog entity.

Content is sourced from the MkDocs \`search_index.json\` published alongside the built docs.
The \`text\` field contains the full page text with HTML stripped, ready for reading or analysis.

Use \`list-techdocs-pages\` first to discover the available \`path\` values for an entity.

## When to use

Use this action when you need to read or analyse the content of a specific documentation page — for
example to answer questions about a service's architecture, runbook procedures, or API usage. Returns a
\`404\` error if the entity has no docs or if the given \`path\` does not match any page.

## Path format

The \`path\` value is the \`location\` field from \`list-techdocs-pages\`, e.g.:
- \`""\` — home / root page
- \`"getting-started/"\` — a top-level page
- \`"api/overview/"\` — a nested page
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
          path: z
            .string()
            .describe(
              'The relative path of the page, as returned by list-techdocs-pages, e.g. "" for the home page or "getting-started/" for a sub-page.',
            ),
        }),
      output: z =>
        z.object({
          title: z.string().describe('The human-readable title of the page.'),
          text: z
            .string()
            .describe('The plain-text content of the page with HTML stripped.'),
          path: z
            .string()
            .describe('The relative path of the page within the docs site.'),
        }),
    },
    examples: [
      {
        title: 'Read the home page of a component',
        input: { name: 'my-service', path: '' },
        output: {
          title: 'my-service',
          text: 'Welcome to the documentation for my-service...',
          path: '',
        },
      },
      {
        title: 'Read a specific sub-page',
        input: { name: 'my-service', path: 'getting-started/' },
        output: {
          title: 'Getting Started',
          text: 'To get started with my-service, first install...',
          path: 'getting-started/',
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

      logger.info(`Fetching TechDocs page "${input.path}" for "${entityRef}"`);

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
          `Failed to fetch TechDocs content for "${entityRef}": ${response.status} ${response.statusText}`,
        );
      }

      const searchIndex: {
        docs: Array<{ title: string; location: string; text: string }>;
      } = await response.json();

      const page = searchIndex.docs.find(doc => doc.location === input.path);
      if (!page) {
        throw new NotFoundError(
          `Page "${input.path}" not found in TechDocs for "${entityRef}". Use list-techdocs-pages to see available pages.`,
        );
      }

      return {
        output: {
          title: page.title,
          text: page.text,
          path: page.location,
        },
      };
    },
  });
};

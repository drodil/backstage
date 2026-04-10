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
import { stringifyEntityRef } from '@backstage/catalog-model';

export const createSyncTechDocsAction = ({
  discovery,
  auth,
  actionsRegistry,
}: {
  discovery: DiscoveryService;
  auth: AuthService;
  actionsRegistry: ActionsRegistryService;
}) => {
  actionsRegistry.register({
    name: 'sync-techdocs',
    title: 'Sync TechDocs',
    description: `
Triggers a TechDocs documentation sync for a catalog entity.

If the Backstage instance is configured to build docs locally (\`techdocs.builder: local\`), this action
will rebuild the docs if they are out of date and wait until the build completes. If the instance uses
external builds (\`techdocs.builder: external\`), the action returns immediately with \`updated: false\`
since the build is managed by an external CI/CD process.

## When to use

Use this action in scaffolder templates or agent workflows after a documentation source file has been
updated, to ensure the TechDocs site reflects the latest content before it is read. The action blocks
until the sync completes, making it safe to sequence before \`list-techdocs-pages\` or \`get-techdocs-page\`.

## Output

- \`updated: true\` — the docs were rebuilt during this call
- \`updated: false\` — the docs were already up to date or external builds are in use
    `,
    attributes: {
      destructive: false,
      readOnly: false,
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
          updated: z
            .boolean()
            .describe(
              'Whether the documentation was rebuilt during this sync call.',
            ),
        }),
    },
    examples: [
      {
        title: 'Sync docs for a component',
        input: { name: 'my-service' },
        output: { updated: true },
      },
      {
        title: 'Sync docs for a specific kind and namespace',
        input: { name: 'my-worker', kind: 'Service', namespace: 'staging' },
        output: { updated: false },
      },
    ],
    action: async ({ input, credentials, logger }) => {
      const entityName = {
        kind: input.kind ?? 'Component',
        namespace: input.namespace ?? 'default',
        name: input.name,
      };
      const entityRef = stringifyEntityRef(entityName);

      logger.info(`Syncing TechDocs for "${entityRef}"`);

      const baseUrl = await discovery.getBaseUrl('techdocs');
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials,
        targetPluginId: 'techdocs',
      });

      const syncUrl = `${baseUrl}/sync/${entityName.namespace}/${entityName.kind}/${entityName.name}`;
      const response = await fetch(syncUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError(
            `Entity "${entityRef}" not found in the catalog`,
          );
        }
        throw new Error(
          `TechDocs sync request failed for "${entityRef}": ${response.status} ${response.statusText}`,
        );
      }

      // The sync endpoint responds with a Server-Sent Events (SSE) stream that
      // emits 'log', 'error', and 'finish' events, and closes after the last one.
      const body = await response.text();
      const blocks = body.split('\n\n').filter(Boolean);

      for (const block of blocks) {
        const lines = block.split('\n');
        const eventType = lines
          .find(l => l.startsWith('event:'))
          ?.slice(6)
          .trim();
        const dataLine = lines
          .find(l => l.startsWith('data:'))
          ?.slice(5)
          .trim();

        if (eventType === 'finish' && dataLine) {
          const result: { updated: boolean } = JSON.parse(dataLine);
          return { output: { updated: result.updated } };
        }

        if (eventType === 'error' && dataLine) {
          throw new Error(
            `TechDocs sync error for "${entityRef}": ${JSON.parse(dataLine)}`,
          );
        }
      }

      throw new Error(
        `TechDocs sync for "${entityRef}" ended without a finish event`,
      );
    },
  });
};

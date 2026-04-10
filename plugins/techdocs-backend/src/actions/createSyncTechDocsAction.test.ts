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
import { createSyncTechDocsAction } from './createSyncTechDocsAction';
import { actionsRegistryServiceMock } from '@backstage/backend-test-utils/alpha';
import { mockServices, mockCredentials } from '@backstage/backend-test-utils';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { registerMswTestHooks } from '@backstage/backend-test-utils';

const worker = setupServer();
registerMswTestHooks(worker);

const discovery = mockServices.discovery.mock({
  getBaseUrl: async () => 'http://techdocs-backend',
});
const auth = mockServices.auth();

/** Build a minimal SSE response body from a list of events. */
function sseBody(events: Array<{ event: string; data: unknown }>): string {
  return events
    .map(e => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}`)
    .join('\n\n');
}

describe('createSyncTechDocsAction', () => {
  it('waits for the finish event and returns updated: true', async () => {
    worker.use(
      http.get(
        'http://techdocs-backend/sync/default/Component/my-service',
        () =>
          new HttpResponse(
            sseBody([
              { event: 'log', data: 'Building docs...' },
              { event: 'finish', data: { updated: true } },
            ]),
            { headers: { 'Content-Type': 'text/event-stream' } },
          ),
      ),
    );

    const mockActionsRegistry = actionsRegistryServiceMock();
    createSyncTechDocsAction({
      discovery,
      auth,
      actionsRegistry: mockActionsRegistry,
    });

    const result = await mockActionsRegistry.invoke({
      id: 'test:sync-techdocs',
      input: { name: 'my-service' },
      credentials: mockCredentials.service(),
    });
    const output = result.output as { updated: boolean };

    expect(output.updated).toBe(true);
  });

  it('returns updated: false when docs were already up to date', async () => {
    worker.use(
      http.get(
        'http://techdocs-backend/sync/default/Component/my-service',
        () =>
          new HttpResponse(
            sseBody([{ event: 'finish', data: { updated: false } }]),
            { headers: { 'Content-Type': 'text/event-stream' } },
          ),
      ),
    );

    const mockActionsRegistry = actionsRegistryServiceMock();
    createSyncTechDocsAction({
      discovery,
      auth,
      actionsRegistry: mockActionsRegistry,
    });

    const result = await mockActionsRegistry.invoke({
      id: 'test:sync-techdocs',
      input: { name: 'my-service' },
      credentials: mockCredentials.service(),
    });
    const output = result.output as { updated: boolean };

    expect(output.updated).toBe(false);
  });

  it('throws when the SSE stream contains an error event', async () => {
    worker.use(
      http.get(
        'http://techdocs-backend/sync/default/Component/my-service',
        () =>
          new HttpResponse(
            sseBody([{ event: 'error', data: 'Build failed: mkdocs error' }]),
            { headers: { 'Content-Type': 'text/event-stream' } },
          ),
      ),
    );

    const mockActionsRegistry = actionsRegistryServiceMock();
    createSyncTechDocsAction({
      discovery,
      auth,
      actionsRegistry: mockActionsRegistry,
    });

    await expect(
      mockActionsRegistry.invoke({
        id: 'test:sync-techdocs',
        input: { name: 'my-service' },
        credentials: mockCredentials.service(),
      }),
    ).rejects.toThrow('TechDocs sync error for "component:default/my-service"');
  });

  it('throws NotFoundError when the sync endpoint returns 404', async () => {
    worker.use(
      http.get(
        'http://techdocs-backend/sync/default/Component/no-entity',
        () => new HttpResponse(null, { status: 404 }),
      ),
    );

    const mockActionsRegistry = actionsRegistryServiceMock();
    createSyncTechDocsAction({
      discovery,
      auth,
      actionsRegistry: mockActionsRegistry,
    });

    await expect(
      mockActionsRegistry.invoke({
        id: 'test:sync-techdocs',
        input: { name: 'no-entity' },
        credentials: mockCredentials.service(),
      }),
    ).rejects.toThrow(
      'Entity "component:default/no-entity" not found in the catalog',
    );
  });

  it('uses provided kind and namespace in the request URL', async () => {
    worker.use(
      http.get(
        'http://techdocs-backend/sync/staging/Service/my-worker',
        () =>
          new HttpResponse(
            sseBody([{ event: 'finish', data: { updated: false } }]),
            { headers: { 'Content-Type': 'text/event-stream' } },
          ),
      ),
    );

    const mockActionsRegistry = actionsRegistryServiceMock();
    createSyncTechDocsAction({
      discovery,
      auth,
      actionsRegistry: mockActionsRegistry,
    });

    const result = await mockActionsRegistry.invoke({
      id: 'test:sync-techdocs',
      input: {
        name: 'my-worker',
        kind: 'Service',
        namespace: 'staging',
      },
      credentials: mockCredentials.service(),
    });
    const output = result.output as { updated: boolean };
    expect(output.updated).toBe(false);
  });
});

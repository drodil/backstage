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
import { createListTechDocsPagesAction } from './createListTechDocsPagesAction';
import { actionsRegistryServiceMock } from '@backstage/backend-test-utils/alpha';
import { mockServices, mockCredentials } from '@backstage/backend-test-utils';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';
import { Entity } from '@backstage/catalog-model';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { registerMswTestHooks } from '@backstage/backend-test-utils';

const worker = setupServer();
registerMswTestHooks(worker);

const mockEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'my-service', namespace: 'default' },
  spec: { type: 'service', lifecycle: 'production', owner: 'team-a' },
};

const mockSearchIndex = {
  docs: [
    { title: 'Home', location: '', text: 'Welcome' },
    {
      title: 'Getting Started',
      location: 'getting-started/',
      text: 'How to start',
    },
    { title: 'API Overview', location: 'api/overview/', text: 'The API' },
  ],
};

const discovery = mockServices.discovery.mock({
  getBaseUrl: async () => 'http://techdocs-backend',
});
const auth = mockServices.auth();

describe('createListTechDocsPagesAction', () => {
  beforeEach(() => {
    worker.use(
      http.get(
        'http://techdocs-backend/static/docs/default/Component/my-service/search/search_index.json',
        () => HttpResponse.json(mockSearchIndex),
      ),
    );
  });

  it('returns a list of pages with title and path', async () => {
    const mockActionsRegistry = actionsRegistryServiceMock();
    const catalog = catalogServiceMock({ entities: [mockEntity] });

    createListTechDocsPagesAction({
      discovery,
      auth,
      catalog,
      actionsRegistry: mockActionsRegistry,
    });

    const result = await mockActionsRegistry.invoke({
      id: 'test:list-techdocs-pages',
      input: { name: 'my-service' },
      credentials: mockCredentials.service(),
    });
    const output = result.output as {
      pages: Array<{ title: string; path: string }>;
    };

    expect(output.pages).toHaveLength(3);
    expect(output.pages[0]).toEqual({ title: 'Home', path: '' });
    expect(output.pages[1]).toEqual({
      title: 'Getting Started',
      path: 'getting-started/',
    });
    expect(output.pages[2]).toEqual({
      title: 'API Overview',
      path: 'api/overview/',
    });
  });

  it('defaults kind to Component and namespace to default when omitted', async () => {
    const mockActionsRegistry = actionsRegistryServiceMock();
    const catalog = catalogServiceMock.mock();
    catalog.getEntityByRef.mockResolvedValue(mockEntity);

    createListTechDocsPagesAction({
      discovery,
      auth,
      catalog,
      actionsRegistry: mockActionsRegistry,
    });

    await mockActionsRegistry.invoke({
      id: 'test:list-techdocs-pages',
      input: { name: 'my-service' },
      credentials: mockCredentials.service(),
    });

    expect(catalog.getEntityByRef).toHaveBeenCalledWith(
      { kind: 'Component', namespace: 'default', name: 'my-service' },
      expect.any(Object),
    );
  });

  it('uses provided kind and namespace in the URL', async () => {
    worker.use(
      http.get(
        'http://techdocs-backend/static/docs/production/Service/my-worker/search/search_index.json',
        () => HttpResponse.json({ docs: [] }),
      ),
    );

    const serviceEntity: Entity = {
      ...mockEntity,
      kind: 'Service',
      metadata: {
        ...mockEntity.metadata,
        name: 'my-worker',
        namespace: 'production',
      },
    };
    const mockActionsRegistry = actionsRegistryServiceMock();
    const catalog = catalogServiceMock({ entities: [serviceEntity] });

    createListTechDocsPagesAction({
      discovery,
      auth,
      catalog,
      actionsRegistry: mockActionsRegistry,
    });

    const result = await mockActionsRegistry.invoke({
      id: 'test:list-techdocs-pages',
      input: { name: 'my-worker', kind: 'Service', namespace: 'production' },
      credentials: mockCredentials.service(),
    });
    const output = result.output as {
      pages: Array<{ title: string; path: string }>;
    };
    expect(output.pages).toHaveLength(0);
  });

  it('throws NotFoundError when entity does not exist in the catalog', async () => {
    const mockActionsRegistry = actionsRegistryServiceMock();
    const catalog = catalogServiceMock();

    createListTechDocsPagesAction({
      discovery,
      auth,
      catalog,
      actionsRegistry: mockActionsRegistry,
    });

    await expect(
      mockActionsRegistry.invoke({
        id: 'test:list-techdocs-pages',
        input: { name: 'does-not-exist' },
        credentials: mockCredentials.service(),
      }),
    ).rejects.toThrow(
      'Entity "component:default/does-not-exist" not found in the catalog',
    );
  });

  it('throws NotFoundError when the search index returns 404', async () => {
    worker.use(
      http.get(
        'http://techdocs-backend/static/docs/default/Component/no-docs/search/search_index.json',
        () => new HttpResponse(null, { status: 404 }),
      ),
    );

    const noDocsEntity: Entity = {
      ...mockEntity,
      metadata: { name: 'no-docs', namespace: 'default' },
    };
    const mockActionsRegistry = actionsRegistryServiceMock();
    const catalog = catalogServiceMock({ entities: [noDocsEntity] });

    createListTechDocsPagesAction({
      discovery,
      auth,
      catalog,
      actionsRegistry: mockActionsRegistry,
    });

    await expect(
      mockActionsRegistry.invoke({
        id: 'test:list-techdocs-pages',
        input: { name: 'no-docs' },
        credentials: mockCredentials.service(),
      }),
    ).rejects.toThrow(
      'No TechDocs found for "component:default/no-docs". The documentation may not have been built yet.',
    );
  });
});

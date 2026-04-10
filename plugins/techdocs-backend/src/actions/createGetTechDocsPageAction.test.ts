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
import { createGetTechDocsPageAction } from './createGetTechDocsPageAction';
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
    { title: 'Home', location: '', text: 'Welcome to my-service docs.' },
    {
      title: 'Getting Started',
      location: 'getting-started/',
      text: 'How to get started.',
    },
  ],
};

const discovery = mockServices.discovery.mock({
  getBaseUrl: async () => 'http://techdocs-backend',
});
const auth = mockServices.auth();

describe('createGetTechDocsPageAction', () => {
  beforeEach(() => {
    worker.use(
      http.get(
        'http://techdocs-backend/static/docs/default/Component/my-service/search/search_index.json',
        () => HttpResponse.json(mockSearchIndex),
      ),
    );
  });

  it('returns the content of the requested page', async () => {
    const mockActionsRegistry = actionsRegistryServiceMock();
    const catalog = catalogServiceMock({ entities: [mockEntity] });

    createGetTechDocsPageAction({
      discovery,
      auth,
      catalog,
      actionsRegistry: mockActionsRegistry,
    });

    const result = await mockActionsRegistry.invoke({
      id: 'test:get-techdocs-page',
      input: { name: 'my-service', path: 'getting-started/' },
      credentials: mockCredentials.service(),
    });
    const output = result.output as {
      title: string;
      text: string;
      path: string;
    };

    expect(output.title).toBe('Getting Started');
    expect(output.text).toBe('How to get started.');
    expect(output.path).toBe('getting-started/');
  });

  it('returns the home page when path is empty string', async () => {
    const mockActionsRegistry = actionsRegistryServiceMock();
    const catalog = catalogServiceMock({ entities: [mockEntity] });

    createGetTechDocsPageAction({
      discovery,
      auth,
      catalog,
      actionsRegistry: mockActionsRegistry,
    });

    const result = await mockActionsRegistry.invoke({
      id: 'test:get-techdocs-page',
      input: { name: 'my-service', path: '' },
      credentials: mockCredentials.service(),
    });
    const output = result.output as {
      title: string;
      text: string;
      path: string;
    };

    expect(output.title).toBe('Home');
    expect(output.text).toBe('Welcome to my-service docs.');
    expect(output.path).toBe('');
  });

  it('throws NotFoundError when entity does not exist in the catalog', async () => {
    const mockActionsRegistry = actionsRegistryServiceMock();
    const catalog = catalogServiceMock();

    createGetTechDocsPageAction({
      discovery,
      auth,
      catalog,
      actionsRegistry: mockActionsRegistry,
    });

    await expect(
      mockActionsRegistry.invoke({
        id: 'test:get-techdocs-page',
        input: { name: 'does-not-exist', path: '' },
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

    createGetTechDocsPageAction({
      discovery,
      auth,
      catalog,
      actionsRegistry: mockActionsRegistry,
    });

    await expect(
      mockActionsRegistry.invoke({
        id: 'test:get-techdocs-page',
        input: { name: 'no-docs', path: '' },
        credentials: mockCredentials.service(),
      }),
    ).rejects.toThrow(
      'No TechDocs found for "component:default/no-docs". The documentation may not have been built yet.',
    );
  });

  it('throws NotFoundError when the requested path does not exist in the index', async () => {
    const mockActionsRegistry = actionsRegistryServiceMock();
    const catalog = catalogServiceMock({ entities: [mockEntity] });

    createGetTechDocsPageAction({
      discovery,
      auth,
      catalog,
      actionsRegistry: mockActionsRegistry,
    });

    await expect(
      mockActionsRegistry.invoke({
        id: 'test:get-techdocs-page',
        input: { name: 'my-service', path: 'nonexistent-page/' },
        credentials: mockCredentials.service(),
      }),
    ).rejects.toThrow(
      'Page "nonexistent-page/" not found in TechDocs for "component:default/my-service".',
    );
  });
});

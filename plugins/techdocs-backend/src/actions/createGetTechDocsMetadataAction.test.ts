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
import { createGetTechDocsMetadataAction } from './createGetTechDocsMetadataAction';
import { actionsRegistryServiceMock } from '@backstage/backend-test-utils/alpha';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';
import {
  PublisherBase,
  TechDocsMetadata,
} from '@backstage/plugin-techdocs-node';
import { Entity } from '@backstage/catalog-model';

const mockEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'my-service', namespace: 'default' },
  spec: { type: 'service', lifecycle: 'production', owner: 'team-a' },
};

const mockMetadata: TechDocsMetadata = {
  site_name: 'my-service',
  site_description: 'Documentation for my-service',
  etag: 'abc123',
  build_timestamp: 1712000000,
  files: ['index.html', 'search/search_index.json'],
};

function createMockPublisher(
  metadata: TechDocsMetadata = mockMetadata,
): jest.Mocked<PublisherBase> {
  return {
    docsRouter: jest.fn(),
    fetchTechDocsMetadata: jest.fn().mockResolvedValue(metadata),
    getReadiness: jest.fn(),
    hasDocsBeenGenerated: jest.fn(),
    publish: jest.fn(),
  };
}

describe('createGetTechDocsMetadataAction', () => {
  it('returns techdocs metadata for an existing entity', async () => {
    const mockActionsRegistry = actionsRegistryServiceMock();
    const catalog = catalogServiceMock({ entities: [mockEntity] });
    const publisher = createMockPublisher();

    createGetTechDocsMetadataAction({
      publisher,
      catalog,
      actionsRegistry: mockActionsRegistry,
    });

    const result = await mockActionsRegistry.invoke({
      id: 'test:get-techdocs-metadata',
      input: { name: 'my-service' },
    });
    const output = result.output as {
      siteName: string;
      siteDescription: string;
      etag: string;
      buildTimestamp: number;
      files?: string[];
    };

    expect(output.siteName).toBe('my-service');
    expect(output.siteDescription).toBe('Documentation for my-service');
    expect(output.etag).toBe('abc123');
    expect(output.buildTimestamp).toBe(1712000000);
    expect(output.files).toEqual(['index.html', 'search/search_index.json']);
    expect(publisher.fetchTechDocsMetadata).toHaveBeenCalledWith({
      kind: 'Component',
      namespace: 'default',
      name: 'my-service',
    });
  });

  it('defaults kind to Component and namespace to default when omitted', async () => {
    const mockActionsRegistry = actionsRegistryServiceMock();
    const catalog = catalogServiceMock.mock();
    catalog.getEntityByRef.mockResolvedValue(mockEntity);
    const publisher = createMockPublisher();

    createGetTechDocsMetadataAction({
      publisher,
      catalog,
      actionsRegistry: mockActionsRegistry,
    });

    await mockActionsRegistry.invoke({
      id: 'test:get-techdocs-metadata',
      input: { name: 'my-service' },
    });

    expect(catalog.getEntityByRef).toHaveBeenCalledWith(
      { kind: 'Component', namespace: 'default', name: 'my-service' },
      expect.any(Object),
    );
  });

  it('uses provided kind and namespace', async () => {
    const mockActionsRegistry = actionsRegistryServiceMock();
    const catalog = catalogServiceMock.mock();
    catalog.getEntityByRef.mockResolvedValue(mockEntity);
    const publisher = createMockPublisher();

    createGetTechDocsMetadataAction({
      publisher,
      catalog,
      actionsRegistry: mockActionsRegistry,
    });

    await mockActionsRegistry.invoke({
      id: 'test:get-techdocs-metadata',
      input: { name: 'my-service', kind: 'Service', namespace: 'production' },
    });

    expect(catalog.getEntityByRef).toHaveBeenCalledWith(
      { kind: 'Service', namespace: 'production', name: 'my-service' },
      expect.any(Object),
    );
    expect(publisher.fetchTechDocsMetadata).toHaveBeenCalledWith({
      kind: 'Service',
      namespace: 'production',
      name: 'my-service',
    });
  });

  it('throws NotFoundError when entity does not exist in the catalog', async () => {
    const mockActionsRegistry = actionsRegistryServiceMock();
    const catalog = catalogServiceMock();
    const publisher = createMockPublisher();

    createGetTechDocsMetadataAction({
      publisher,
      catalog,
      actionsRegistry: mockActionsRegistry,
    });

    await expect(
      mockActionsRegistry.invoke({
        id: 'test:get-techdocs-metadata',
        input: { name: 'does-not-exist' },
      }),
    ).rejects.toThrow(
      'Entity "component:default/does-not-exist" not found in the catalog',
    );
    expect(publisher.fetchTechDocsMetadata).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when publisher has no docs for entity', async () => {
    const mockActionsRegistry = actionsRegistryServiceMock();
    const catalog = catalogServiceMock({ entities: [mockEntity] });
    const publisher = createMockPublisher();
    publisher.fetchTechDocsMetadata.mockRejectedValue(
      new Error('Docs not found'),
    );

    createGetTechDocsMetadataAction({
      publisher,
      catalog,
      actionsRegistry: mockActionsRegistry,
    });

    await expect(
      mockActionsRegistry.invoke({
        id: 'test:get-techdocs-metadata',
        input: { name: 'my-service' },
      }),
    ).rejects.toThrow(
      'No TechDocs found for "component:default/my-service". The documentation may not have been built yet.',
    );
  });
});

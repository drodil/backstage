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
import { PublisherBase } from '@backstage/plugin-techdocs-node';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { createGetTechDocsMetadataAction } from './createGetTechDocsMetadataAction';
import { createListTechDocsPagesAction } from './createListTechDocsPagesAction';
import { createGetTechDocsPageAction } from './createGetTechDocsPageAction';
import { createSyncTechDocsAction } from './createSyncTechDocsAction';

export const createTechDocsActions = (options: {
  actionsRegistry: ActionsRegistryService;
  publisher: PublisherBase;
  discovery: DiscoveryService;
  auth: AuthService;
  catalog: CatalogService;
}) => {
  createGetTechDocsMetadataAction(options);
  createListTechDocsPagesAction(options);
  createGetTechDocsPageAction(options);
  createSyncTechDocsAction(options);
};

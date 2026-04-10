/*
 * Copyright 2022 The Backstage Authors
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

import {
  catalogApiRef,
  useStarredEntities,
} from '@backstage/plugin-catalog-react';
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { Progress, ResponseErrorPanel } from '@backstage/core-components';
import { Text, Tabs, TabList, Tab, TabPanel } from '@backstage/ui';
import { ReactNode, useState } from 'react';
import useAsync from 'react-use/esm/useAsync';
import { StarredEntityListItem } from '../../components/StarredEntityListItem/StarredEntityListItem';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import { homeTranslationRef } from '../../translation';
import styles from './Content.module.css';

/**
 * Props for the StarredEntities component
 *
 * @public
 */
export type StarredEntitiesProps = {
  noStarredEntitiesMessage?: ReactNode | undefined;
  groupByKind?: boolean;
};

/**
 * A component to display a list of starred entities for the user.
 *
 * @public
 */
export const Content = ({
  noStarredEntitiesMessage,
  groupByKind,
}: StarredEntitiesProps) => {
  const catalogApi = useApi(catalogApiRef);
  const { starredEntities, toggleStarredEntity } = useStarredEntities();
  const [activeTab, setActiveTab] = useState('');
  const { t } = useTranslationRef(homeTranslationRef);

  // Grab starred entities from catalog to ensure they still exist and also retrieve display titles
  const entities = useAsync(async () => {
    if (!starredEntities.size) {
      return [];
    }

    return (
      await catalogApi.getEntitiesByRefs({
        entityRefs: [...starredEntities],
        fields: [
          'kind',
          'metadata.namespace',
          'metadata.name',
          'spec.type',
          'metadata.title',
          'spec.profile.displayName',
        ],
      })
    ).items.filter((e): e is Entity => !!e);
  }, [catalogApi, starredEntities]);

  if (starredEntities.size === 0)
    return (
      <Text as="p" variant="body-medium">
        {noStarredEntitiesMessage ||
          t('starredEntities.noStarredEntitiesMessage')}
      </Text>
    );

  if (entities.loading) {
    return <Progress />;
  }

  const groupedEntities: { [kind: string]: Entity[] } = {};
  entities.value?.forEach(entity => {
    const kind = entity.kind;
    if (!groupedEntities[kind]) {
      groupedEntities[kind] = [];
    }
    groupedEntities[kind].push(entity);
  });

  const groupByKindEntries = Object.entries(groupedEntities);
  const firstKind = groupByKindEntries[0]?.[0] ?? '';
  const selectedTab = activeTab || firstKind;

  return entities.error ? (
    <ResponseErrorPanel error={entities.error} />
  ) : (
    <div>
      {!groupByKind && (
        <ul className={styles.list}>
          {entities.value
            ?.sort((a, b) =>
              (a.metadata.title ?? a.metadata.name).localeCompare(
                b.metadata.title ?? b.metadata.name,
              ),
            )
            .map(entity => (
              <StarredEntityListItem
                key={stringifyEntityRef(entity)}
                entity={entity}
                onToggleStarredEntity={toggleStarredEntity}
                showKind
              />
            ))}
        </ul>
      )}

      {groupByKind && (
        <Tabs
          className={styles.tabs}
          selectedKey={selectedTab}
          onSelectionChange={key => setActiveTab(key as string)}
        >
          <TabList aria-label="entity-tabs">
            {groupByKindEntries.map(([kind]) => (
              <Tab key={kind} id={kind}>
                {kind}
              </Tab>
            ))}
          </TabList>
          {groupByKindEntries.map(([kind, entitiesByKind]) => (
            <TabPanel key={kind} id={kind}>
              <ul className={styles.list}>
                {entitiesByKind
                  ?.sort((a, b) =>
                    (a.metadata.title ?? a.metadata.name).localeCompare(
                      b.metadata.title ?? b.metadata.name,
                    ),
                  )
                  .map(entity => (
                    <StarredEntityListItem
                      key={stringifyEntityRef(entity)}
                      entity={entity}
                      onToggleStarredEntity={toggleStarredEntity}
                      showKind={false}
                    />
                  ))}
              </ul>
            </TabPanel>
          ))}
        </Tabs>
      )}
    </div>
  );
};

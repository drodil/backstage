/*
 * Copyright 2023 The Backstage Authors
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

import { TestApiProvider, wrapInTestApp } from '@backstage/test-utils';
import { ComponentType, PropsWithChildren } from 'react';
import { homePlugin } from '../../plugin';
import { Visit, visitsApiRef } from '../../api/VisitsApi';
import { createCardExtension } from '@backstage/plugin-home-react';
import { VisitedByTypeProps } from './Content';

const visits: Array<Visit> = [
  {
    id: 'tech-radar',
    name: 'Tech Radar',
    pathname: '/tech-radar',
    hits: 40,
    timestamp: Date.now() - 360_000,
  },
  {
    id: 'explore',
    name: 'Explore Backstage',
    pathname: '/explore',
    hits: 35,
    timestamp: Date.now() - 86400_000 * 1,
  },
  {
    id: 'user-1',
    name: 'Guest',
    pathname: '/catalog/default/user/guest',
    hits: 30,
    timestamp: Date.now() - 86400_000 * 2,
    entityRef: 'User:default/guest',
  },
  {
    id: 'audio-playback',
    name: 'Audio Playback',
    pathname: '/catalog/default/system/audio-playback',
    hits: 25,
    timestamp: Date.now() - 86400_000 * 3,
    entityRef: 'System:default/audio-playback',
  },
  {
    id: 'team-a',
    name: 'Team A',
    pathname: '/catalog/default/group/team-a',
    hits: 20,
    timestamp: Date.now() - 86400_000 * 4,
    entityRef: 'Group:default/team-a',
  },
  {
    id: 'playback-order',
    name: 'Playback Order',
    pathname: '/catalog/default/component/playback-order',
    hits: 15,
    timestamp: Date.now() - 86400_000 * 5,
    entityRef: 'Component:default/playback-order',
  },
  {
    id: 'playback',
    name: 'Playback',
    pathname: '/catalog/default/domain/playback',
    hits: 10,
    timestamp: Date.now() - 86400_000 * 6,
    entityRef: 'Domain:default/playback',
  },
  {
    id: 'hello-world',
    name: 'Hello World gRPC',
    pathname: '/catalog/default/api/hello-world',
    hits: 1,
    timestamp: Date.now() - 86400_000 * 7,
    entityRef: 'API:default/hello-world',
  },
];

const HomePageVisitedByType = homePlugin.provide(
  createCardExtension<VisitedByTypeProps>({
    name: 'HomePageTopVisited',
    components: () => import('./'),
  }),
);

const mockVisitsApi = {
  save: async () => visits[0],
  list: async () => visits,
};

export default {
  title: 'Plugins/Home/Components/VisitedByType',
  decorators: [
    (Story: ComponentType<PropsWithChildren<{}>>) =>
      wrapInTestApp(
        <TestApiProvider apis={[[visitsApiRef, mockVisitsApi]]}>
          <Story />
        </TestApiProvider>,
      ),
  ],
  tags: ['!manifest'],
};

export const RecentlyDefault = () => {
  return (
    <div style={{ maxWidth: '600px' }}>
      <HomePageVisitedByType kind="recent" />
    </div>
  );
};

export const RecentlyEmpty = () => {
  return (
    <div style={{ maxWidth: '600px' }}>
      <HomePageVisitedByType kind="recent" visits={[]} />
    </div>
  );
};

export const RecentlyFewItems = () => {
  return (
    <div style={{ maxWidth: '600px' }}>
      <HomePageVisitedByType kind="recent" visits={visits.slice(0, 1)} />
    </div>
  );
};

export const RecentlyMoreItems = () => {
  return (
    <div style={{ maxWidth: '600px' }}>
      <HomePageVisitedByType
        kind="recent"
        numVisitsOpen={5}
        numVisitsTotal={6}
      />
    </div>
  );
};

export const RecentlyLoading = () => {
  return (
    <div style={{ maxWidth: '600px' }}>
      <HomePageVisitedByType
        kind="recent"
        numVisitsOpen={5}
        numVisitsTotal={6}
        loading
      />
    </div>
  );
};

export const TopDefault = () => {
  return (
    <div style={{ maxWidth: '600px' }}>
      <HomePageVisitedByType kind="top" />
    </div>
  );
};

export const TopEmpty = () => {
  return (
    <div style={{ maxWidth: '600px' }}>
      <HomePageVisitedByType kind="top" visits={[]} />
    </div>
  );
};

export const TopFewItems = () => {
  return (
    <div style={{ maxWidth: '600px' }}>
      <HomePageVisitedByType kind="top" visits={visits.slice(0, 1)} />
    </div>
  );
};

export const TopMoreItems = () => {
  return (
    <div style={{ maxWidth: '600px' }}>
      <HomePageVisitedByType kind="top" numVisitsOpen={5} numVisitsTotal={6} />
    </div>
  );
};

export const TopLoading = () => {
  return (
    <div style={{ maxWidth: '600px' }}>
      <HomePageVisitedByType
        kind="top"
        numVisitsOpen={5}
        numVisitsTotal={6}
        loading
      />
    </div>
  );
};

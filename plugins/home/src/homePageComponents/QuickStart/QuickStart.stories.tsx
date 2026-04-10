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

import { QuickStartCard } from '../../plugin';
import { ComponentType, PropsWithChildren } from 'react';
import { wrapInTestApp } from '@backstage/test-utils';
import { Text } from '@backstage/ui';
import { RiExternalLinkLine } from '@remixicon/react';
import ContentImage from './static/backstageSystemModel.png';

export default {
  title: 'Plugins/Home/Components/QuickStartCard',
  decorators: [
    (Story: ComponentType<PropsWithChildren<{}>>) => wrapInTestApp(<Story />),
  ],
  tags: ['!manifest'],
};

export const Default = () => {
  return (
    <div style={{ maxWidth: '600px' }}>
      <QuickStartCard
        image={
          <img
            src={ContentImage}
            alt="quick start"
            width="100%"
            height="100%"
          />
        }
      />
    </div>
  );
};

export const Customized = () => {
  return (
    <div style={{ maxWidth: '600px' }}>
      <QuickStartCard
        title="Onboarding to the Catalog"
        modalTitle="Onboarding Quick Start"
        docsLinkTitle="Learn more with getting started docs"
        docsLink="https://backstage.io/docs/getting-started"
        image={
          <img
            src={ContentImage}
            alt="quick start"
            width="100%"
            height="100%"
          />
        }
        cardDescription="Backstage system model will help you create new entities"
        additionalContent={
          <Text as="p" variant="body-small">
            This is a custom description for the Quick Start card. It can be
            used to provide additional information or context about the Quick
            Start process.
          </Text>
        }
      />
    </div>
  );
};

export const CustomDocLink = () => {
  return (
    <div style={{ maxWidth: '600px' }}>
      <QuickStartCard
        title="Onboarding to the Catalog"
        modalTitle="Onboarding Quick Start"
        docsLinkTitle={
          <>
            <RiExternalLinkLine size={20} />
            Learn more with getting started docs
          </>
        }
        docsLink="https://backstage.io/docs/getting-started"
        image={
          <img
            src={ContentImage}
            alt="quick start"
            width="100%"
            height="100%"
          />
        }
        cardDescription="Backstage system model will help you create new entities"
      />
    </div>
  );
};

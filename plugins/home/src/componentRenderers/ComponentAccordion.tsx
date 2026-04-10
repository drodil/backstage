/*
 * Copyright 2021 The Backstage Authors
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

import { useState } from 'react';
import { SettingsModal } from '@backstage/plugin-home-react';
import {
  Accordion,
  AccordionTrigger,
  AccordionPanel,
  ButtonIcon,
} from '@backstage/ui';
import { RiSettingsLine } from '@remixicon/react';
import styles from './ComponentAccordion.module.css';

export const ComponentAccordion = (props: {
  title?: string;
  expanded?: boolean;
  Content: () => JSX.Element;
  Actions?: () => JSX.Element;
  Settings?: () => JSX.Element;
  ContextProvider?: (props: any) => JSX.Element;
}) => {
  const {
    title,
    expanded = false,
    Content,
    Actions,
    Settings,
    ContextProvider,
    ...childProps
  } = props;

  const [settingsIsExpanded, setSettingsIsExpanded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(expanded);

  const handleOpenSettings = (e: any) => {
    e.stopPropagation();
    setSettingsIsExpanded(prevState => !prevState);
  };

  const innerContent = (
    <>
      {Settings && (
        <SettingsModal
          open={settingsIsExpanded}
          close={() => setSettingsIsExpanded(false)}
          componentName={title}
        >
          <Settings />
        </SettingsModal>
      )}
      <div className={styles.wrapper}>
        {Settings && (
          <ButtonIcon
            aria-label="settings"
            variant="secondary"
            icon={<RiSettingsLine size={16} />}
            onPress={handleOpenSettings}
            className={styles.settingsButton}
          />
        )}
        <div className={styles.accordionOuter}>
          <Accordion
            isExpanded={isExpanded}
            onExpandedChange={(isExp: boolean) => setIsExpanded(isExp)}
          >
            <AccordionTrigger title={title} />
            <AccordionPanel>
              <div className={styles.contentContainer}>
                <Content />
                {Actions && <Actions />}
              </div>
            </AccordionPanel>
          </Accordion>
        </div>
      </div>
    </>
  );

  return ContextProvider ? (
    <ContextProvider {...childProps}>{innerContent}</ContextProvider>
  ) : (
    innerContent
  );
};

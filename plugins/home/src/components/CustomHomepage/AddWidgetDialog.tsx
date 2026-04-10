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

import { Widget } from './types';
import { DialogHeader, DialogBody, Text } from '@backstage/ui';
import { RiAddLine } from '@remixicon/react';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import { homeTranslationRef } from '../../translation';

interface AddWidgetDialogProps {
  widgets: Widget[];
  handleAdd: (widget: Widget) => void;
}

const getTitle = (widget: Widget) => {
  return widget.title || widget.name;
};

export const AddWidgetDialog = (props: AddWidgetDialogProps) => {
  const { widgets, handleAdd } = props;
  const { t } = useTranslationRef(homeTranslationRef);
  return (
    <>
      <DialogHeader>{t('addWidgetDialog.title')}</DialogHeader>
      <DialogBody>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {widgets.map(widget => {
            return (
              <li key={widget.name}>
                <button
                  type="button"
                  onClick={() => handleAdd(widget)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--bui-space-2)',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: 'var(--bui-space-2)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <RiAddLine size={20} />
                  <span>
                    <Text as="span" variant="body-medium">
                      {getTitle(widget)}
                    </Text>
                    {widget.description && (
                      <>
                        <br />
                        <Text as="span" variant="body-small" color="secondary">
                          {widget.description}
                        </Text>
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogBody>
    </>
  );
};

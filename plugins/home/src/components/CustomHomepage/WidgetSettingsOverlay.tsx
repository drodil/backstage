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

import {
  Button,
  ButtonIcon,
  Dialog,
  DialogTrigger,
  DialogBody,
  DialogFooter,
  TooltipTrigger,
  Tooltip,
} from '@backstage/ui';
import { RiDeleteBinLine, RiSettingsLine } from '@remixicon/react';
import { useState } from 'react';
import { Widget } from './types';
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import { homeTranslationRef } from '../../translation';
import styles from './WidgetSettingsOverlay.module.css';

interface WidgetSettingsOverlayProps {
  id: string;
  widget: Widget;
  handleRemove: (id: string) => void;
  handleSettingsSave: (id: string, settings: Record<string, any>) => void;
  settings?: Record<string, any>;
  deletable?: boolean;
}

export const WidgetSettingsOverlay = (props: WidgetSettingsOverlayProps) => {
  const { id, widget, settings, handleRemove, handleSettingsSave, deletable } =
    props;
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const onClose = () => setSettingsDialogOpen(false);
  const { t } = useTranslationRef(homeTranslationRef);

  return (
    <div className={styles.settingsOverlay}>
      {widget.settingsSchema && (
        <DialogTrigger
          isOpen={settingsDialogOpen}
          onOpenChange={setSettingsDialogOpen}
        >
          <Dialog isDismissable className="widgetSettingsDialog">
            <DialogBody>
              <Form
                validator={validator}
                showErrorList={false}
                schema={widget.settingsSchema}
                uiSchema={widget.uiSchema}
                noHtml5Validate
                formData={settings}
                formContext={{ settings }}
                onSubmit={({ formData, errors }) => {
                  if (errors.length === 0) {
                    handleSettingsSave(id, formData);
                    setSettingsDialogOpen(false);
                  }
                }}
                experimental_defaultFormStateBehavior={{
                  allOf: 'populateDefaults',
                }}
              >
                <DialogFooter>
                  <Button variant="primary" type="submit">
                    {t('widgetSettingsOverlay.submitButtonTitle')}
                  </Button>
                  <Button variant="secondary" slot="close" onPress={onClose}>
                    {t('widgetSettingsOverlay.cancelButtonTitle')}
                  </Button>
                </DialogFooter>
              </Form>
            </DialogBody>
          </Dialog>
        </DialogTrigger>
      )}
      <div className={styles.iconRow}>
        {widget.settingsSchema && (
          <TooltipTrigger>
            <ButtonIcon
              aria-label={t('widgetSettingsOverlay.editSettingsTooptip')}
              variant="primary"
              icon={<RiSettingsLine size={24} />}
              className="overlayGridItem"
              onPress={() => setSettingsDialogOpen(true)}
            />
            <Tooltip>{t('widgetSettingsOverlay.editSettingsTooptip')}</Tooltip>
          </TooltipTrigger>
        )}
        {deletable !== false && (
          <TooltipTrigger>
            <ButtonIcon
              aria-label={t('widgetSettingsOverlay.deleteWidgetTooltip')}
              variant="secondary"
              icon={<RiDeleteBinLine size={24} />}
              className="overlayGridItem"
              onPress={() => handleRemove(id)}
            />
            <Tooltip>{t('widgetSettingsOverlay.deleteWidgetTooltip')}</Tooltip>
          </TooltipTrigger>
        )}
      </div>
    </div>
  );
};

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
import { Button } from '@backstage/ui';
import {
  RiSave3Line,
  RiDeleteBinLine,
  RiAddLine,
  RiEditLine,
  RiCloseLine,
} from '@remixicon/react';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import { homeTranslationRef } from '../../translation';
import styles from './CustomHomepageButtons.module.css';

interface CustomHomepageButtonsProps {
  editMode: boolean;
  numWidgets: number;
  clearLayout: () => void;
  setAddWidgetDialogOpen: (open: boolean) => void;
  changeEditMode: (mode: boolean) => void;
  defaultConfigAvailable: boolean;
  restoreDefault: () => void;
  cancel: () => void;
}
export const CustomHomepageButtons = (props: CustomHomepageButtonsProps) => {
  const {
    editMode,
    numWidgets,
    clearLayout,
    setAddWidgetDialogOpen,
    changeEditMode,
    defaultConfigAvailable,
    restoreDefault,
    cancel,
  } = props;
  const { t } = useTranslationRef(homeTranslationRef);

  return (
    <>
      {!editMode && numWidgets > 0 ? (
        <Button
          variant="primary"
          size="small"
          iconStart={<RiEditLine size={16} />}
          onPress={() => changeEditMode(true)}
        >
          {t('customHomepageButtons.edit')}
        </Button>
      ) : (
        <>
          <Button variant="secondary" size="small" onPress={cancel}>
            {t('customHomepageButtons.cancel')}
          </Button>
          {defaultConfigAvailable && (
            <Button
              variant="secondary"
              size="small"
              className={styles.contentHeaderBtn}
              iconStart={<RiCloseLine size={16} />}
              onPress={restoreDefault}
            >
              {t('customHomepageButtons.restoreDefaults')}
            </Button>
          )}
          {numWidgets > 0 && (
            <Button
              variant="secondary"
              destructive
              size="small"
              className={styles.contentHeaderBtn}
              iconStart={<RiDeleteBinLine size={16} />}
              onPress={clearLayout}
            >
              {t('customHomepageButtons.clearAll')}
            </Button>
          )}
          <Button
            variant="secondary"
            size="small"
            className={styles.contentHeaderBtn}
            iconStart={<RiAddLine size={16} />}
            onPress={() => setAddWidgetDialogOpen(true)}
          >
            {t('customHomepageButtons.addWidget')}
          </Button>
          {numWidgets > 0 && (
            <Button
              variant="primary"
              size="small"
              className={styles.contentHeaderBtn}
              iconStart={<RiSave3Line size={16} />}
              onPress={() => changeEditMode(false)}
            >
              {t('customHomepageButtons.save')}
            </Button>
          )}
        </>
      )}
    </>
  );
};

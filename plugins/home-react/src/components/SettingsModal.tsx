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

import { useTranslationRef } from '@backstage/frontend-plugin-api';
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@backstage/ui';
import { homeReactTranslationRef } from '../translation';

/** @public */
export const SettingsModal = (props: {
  open: boolean;
  close: Function;
  componentName?: string;
  children: JSX.Element;
}) => {
  const { open, close, componentName, children } = props;
  const { t } = useTranslationRef(homeReactTranslationRef);
  return (
    <DialogTrigger isOpen={open} onOpenChange={v => !v && close()}>
      <Dialog isDismissable>
        <DialogHeader>
          {componentName
            ? `${t('settingsModal.title')} - ${componentName}`
            : t('settingsModal.title')}
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
        <DialogFooter>
          <Button variant="primary" onPress={() => close()}>
            {t('settingsModal.closeButtonTitle')}
          </Button>
        </DialogFooter>
      </Dialog>
    </DialogTrigger>
  );
};

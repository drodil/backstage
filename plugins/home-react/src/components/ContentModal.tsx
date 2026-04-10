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

import { JSX, useState } from 'react';
import { Button, Dialog, DialogTrigger, DialogBody } from '@backstage/ui';

/**
 * @public
 * @deprecated Class-key overrides are no longer supported after migration to \@backstage/ui.
 */
export type PluginHomeContentModalClassKey = 'contentModal' | 'linkText';

/**
 * Props customizing the <ContentModal/> component.
 *
 * @public
 */
export type ContentModalProps = {
  modalContent: JSX.Element;
  linkContent: string | JSX.Element;
};

/**
 * A component to expand given content into a full screen modal.
 *
 * @public
 */
export const ContentModal = (props: ContentModalProps) => {
  const { modalContent, linkContent } = props;
  const [open, setOpen] = useState(false);

  return (
    <div data-testid="content-modal-container">
      <DialogTrigger isOpen={open} onOpenChange={setOpen}>
        <Button variant="tertiary">{linkContent}</Button>
        <Dialog isDismissable aria-label="Content" data-testid="content-modal">
          <DialogBody data-testid="content-modal-open">
            {modalContent}
          </DialogBody>
        </Dialog>
      </DialogTrigger>
    </div>
  );
};

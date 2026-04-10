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

import { JSX } from 'react';
import { Link } from '@backstage/core-components';
import { Text } from '@backstage/ui';
import { ContentModal } from '@backstage/plugin-home-react';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import { homeTranslationRef } from '../../translation';
import styles from './QuickStart.module.css';

/**
 * Props customizing the <QuickStartCard/> component.
 *
 * @public
 */
export type QuickStartCardProps = {
  /** The modal link title */
  modalTitle?: string | JSX.Element;
  /** The link to docs title */
  docsLinkTitle?: string | JSX.Element;
  /** The link to docs */
  docsLink?: string;
  /** The video to play on the card
   * @deprecated This will be removed in the future, please use `additionalContent` instead
   */
  video?: JSX.Element;
  /** Additional card content */
  additionalContent?: JSX.Element;
  /** A quickstart image to display on the card */
  image: JSX.Element;
  /** The card description*/
  cardDescription?: string;
  /** A component used to download a quickStart image*/
  downloadImage?: JSX.Element;
};

/**
 * A component to display Quick Start info on the homepage.
 *
 * @public
 */
export const Content = (props: QuickStartCardProps): JSX.Element => {
  const { t } = useTranslationRef(homeTranslationRef);
  return (
    <>
      <ContentModal
        modalContent={props.image}
        linkContent={props.modalTitle || t('quickStart.title')}
      />
      <Text as="p" variant="body-medium">
        {props.cardDescription || t('quickStart.description')}
      </Text>
      <ContentModal modalContent={props.image} linkContent={props.image} />
      <div className={styles.contentActionContainer}>
        {props.downloadImage && <div>{props.downloadImage}</div>}
        <div>
          <Link
            to={props.docsLink || 'https://backstage.io/docs/getting-started/'}
            data-testid="quick-start-link-to-docs"
            underline="none"
            variant="h6"
            className={styles.link}
          >
            {props.docsLinkTitle || t('quickStart.learnMoreLinkTitle')}
          </Link>
        </div>
      </div>
      {(props.additionalContent && props.additionalContent) ||
        (props.video && props.video)}
    </>
  );
};

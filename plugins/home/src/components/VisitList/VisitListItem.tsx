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

import { Visit } from '../../api/VisitsApi';
import { ItemName } from './ItemName';
import { ItemDetail, ItemDetailType } from './ItemDetail';
import { ItemCategory } from './ItemCategory';
import styles from './VisitListItem.module.css';

export const VisitListItem = ({
  visit,
  detailType,
}: {
  visit: Visit;
  detailType: ItemDetailType;
}) => {
  return (
    <li className={styles.item}>
      <div className={styles.avatar}>
        <ItemCategory visit={visit} />
      </div>
      <div className={styles.content}>
        <ItemName visit={visit} />
        <ItemDetail visit={visit} type={detailType} />
      </div>
    </li>
  );
};

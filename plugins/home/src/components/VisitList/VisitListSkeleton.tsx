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

import { Skeleton } from '@backstage/ui';
import styles from './VisitListSkeleton.module.css';

const VisitListItemSkeleton = ({ hidden }: { hidden?: boolean }) => {
  return (
    <li
      className={styles.item}
      hidden={hidden || undefined}
      style={hidden ? { display: 'none' } : undefined}
    >
      <div className={styles.avatarSkeleton}>
        <Skeleton width={50} height={24} />
      </div>
      <div className={styles.textSkeleton}>
        <Skeleton width="100%" height={28} />
      </div>
    </li>
  );
};

export const VisitListSkeleton = ({
  numVisitsOpen,
  numVisitsTotal,
  collapsed,
}: {
  numVisitsOpen: number;
  numVisitsTotal: number;
  collapsed: boolean;
}) => (
  <>
    {Array(numVisitsOpen)
      .fill(null)
      .map((_e, index) => (
        <VisitListItemSkeleton key={index} />
      ))}
    {numVisitsTotal > numVisitsOpen &&
      Array(numVisitsTotal - numVisitsOpen)
        .fill(null)
        .map((_e, index) => (
          <VisitListItemSkeleton key={`extra-${index}`} hidden={collapsed} />
        ))}
  </>
);

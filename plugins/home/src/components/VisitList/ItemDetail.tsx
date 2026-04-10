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

import { Text } from '@backstage/ui';
import { Visit } from '../../api/VisitsApi';
import { DateTime } from 'luxon';

const ItemDetailHits = ({ visit }: { visit: Visit }) => (
  <Text as="span" variant="body-x-small" color="secondary">
    {visit.hits} time{visit.hits > 1 ? 's' : ''}
  </Text>
);

const ItemDetailTimeAgo = ({ visit }: { visit: Visit }) => {
  const visitDate = DateTime.fromMillis(visit.timestamp);

  return (
    <time
      style={{
        fontSize: 'var(--bui-font-size-1)',
        color: 'var(--bui-fg-secondary)',
        lineHeight: '140%',
      }}
      dateTime={visitDate.toISO() ?? undefined}
    >
      {visitDate.toRelative()}
    </time>
  );
};

/**
 * @internal
 */
export type ItemDetailType = 'time-ago' | 'hits';

export const ItemDetail = ({
  visit,
  type,
}: {
  visit: Visit;
  type: ItemDetailType;
}) =>
  type === 'time-ago' ? (
    <ItemDetailTimeAgo visit={visit} />
  ) : (
    <ItemDetailHits visit={visit} />
  );

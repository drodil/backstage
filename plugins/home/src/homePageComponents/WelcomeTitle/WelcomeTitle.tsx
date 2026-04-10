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
import {
  alertApiRef,
  identityApiRef,
  useApi,
  useApiHolder,
} from '@backstage/core-plugin-api';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { Tooltip, TooltipTrigger, Text } from '@backstage/ui';
import { useEffect, useMemo } from 'react';
import useAsync from 'react-use/esm/useAsync';
import { getTimeBasedGreeting } from './timeUtil';

/** @public */
export type WelcomeTitleLanguageProps = {
  language?: string[];
};

export const WelcomeTitle = ({ language }: WelcomeTitleLanguageProps) => {
  const identityApi = useApi(identityApiRef);
  const apiHolder = useApiHolder();
  const greeting = useMemo(() => getTimeBasedGreeting(language), [language]);

  const { value: profile, error } = useAsync(() =>
    identityApi.getProfileInfo(),
  );

  useEffect(() => {
    if (error) {
      const message = `Failed to load user identity: ${error}`;
      const toastApi = apiHolder.get(toastApiRef);
      if (toastApi) {
        toastApi.post({ title: message, status: 'danger' });
      } else {
        apiHolder.get(alertApiRef)?.post({ message, severity: 'error' });
      }
    }
  }, [error, apiHolder]);

  return (
    <TooltipTrigger>
      <Text as="span">{`${greeting.greeting}${
        profile?.displayName ? `, ${profile?.displayName}` : ''
      }!`}</Text>
      <Tooltip>{greeting.language}</Tooltip>
    </TooltipTrigger>
  );
};

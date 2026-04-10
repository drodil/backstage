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
import { RadioGroup, Radio } from '@backstage/ui';
import { useRandomJoke, JokeType } from './Context';
import upperFirst from 'lodash/upperFirst';

export const Settings = () => {
  const { type, handleChangeType } = useRandomJoke();
  const JOKE_TYPES: JokeType[] = ['any' as JokeType, 'programming' as JokeType];
  return (
    <RadioGroup label="Joke Type" value={type} onChange={handleChangeType}>
      {JOKE_TYPES.map(t => (
        <Radio key={t} value={t}>
          {upperFirst(t)}
        </Radio>
      ))}
    </RadioGroup>
  );
};

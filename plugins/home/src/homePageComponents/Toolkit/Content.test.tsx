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
  TestApiProvider,
  renderInTestApp,
  mockApis,
} from '@backstage/test-utils';
import { configApiRef } from '@backstage/core-plugin-api';
import { iconsApiRef, IconsApi } from '@backstage/frontend-plugin-api';
import { Content } from './Content';
import { ContextProvider } from './Context';

const mockIconsApi: IconsApi = {
  icon: jest.fn((key: string) =>
    key === 'test-icon' ? <span>test-icon-element</span> : null,
  ),
  getIcon: jest.fn(),
  listIconKeys: jest.fn(() => []),
};

const mockConfigApi = mockApis.config({});

const renderWithApis = (ui: JSX.Element) =>
  renderInTestApp(
    <TestApiProvider
      apis={[
        [configApiRef, mockConfigApi],
        [iconsApiRef, mockIconsApi],
      ]}
    >
      {ui}
    </TestApiProvider>,
  );

describe('<ToolkitContent>', () => {
  const tools = [
    { label: 'tool', url: '/url', icon: <div>icon</div> },
    { label: 'tool 2', url: '/url-2', icon: <div>icon 2</div> },
  ];

  test('should render list of tools', async () => {
    const { getByText } = await renderWithApis(<Content tools={tools} />);

    expect(getByText('tool')).toBeInTheDocument();
    expect(getByText('tool 2')).toBeInTheDocument();
    expect(getByText('tool').closest('a')).toHaveAttribute('href', '/url');
    expect(getByText('tool 2').closest('a')).toHaveAttribute('href', '/url-2');
  });

  test('should render list of tools using context', async () => {
    const { getByText } = await renderWithApis(
      <ContextProvider tools={tools}>
        <Content />
      </ContextProvider>,
    );

    expect(getByText('tool')).toBeInTheDocument();
    expect(getByText('tool 2')).toBeInTheDocument();
    expect(getByText('tool').closest('a')).toHaveAttribute('href', '/url');
    expect(getByText('tool 2').closest('a')).toHaveAttribute('href', '/url-2');
  });

  test('should render tools from config', async () => {
    const configWithTools = mockApis.config({
      data: {
        home: {
          toolkit: {
            tools: [
              { url: '/config-url', label: 'config tool', icon: 'test-icon' },
            ],
          },
        },
      },
    });

    const { getByText } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [configApiRef, configWithTools],
          [iconsApiRef, mockIconsApi],
        ]}
      >
        <Content />
      </TestApiProvider>,
    );

    expect(getByText('config tool')).toBeInTheDocument();
    expect(getByText('config tool').closest('a')).toHaveAttribute(
      'href',
      '/config-url',
    );
    expect(getByText('test-icon-element')).toBeInTheDocument();
  });

  test('should render ReactNode icons without iconsApiRef', async () => {
    const { getByText } = await renderInTestApp(
      <TestApiProvider apis={[[configApiRef, mockConfigApi]]}>
        <Content tools={tools} />
      </TestApiProvider>,
    );

    expect(getByText('tool')).toBeInTheDocument();
    expect(getByText('tool 2')).toBeInTheDocument();
  });

  test('should deduplicate tools with the same url', async () => {
    const configWithDuplicate = mockApis.config({
      data: {
        home: {
          toolkit: {
            tools: [{ url: '/url', label: 'config tool' }],
          },
        },
      },
    });

    const { getAllByText, queryByText } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [configApiRef, configWithDuplicate],
          [iconsApiRef, mockIconsApi],
        ]}
      >
        <Content tools={tools} />
      </TestApiProvider>,
    );

    expect(getAllByText('tool')).toHaveLength(1);
    expect(queryByText('config tool')).not.toBeInTheDocument();
  });
});

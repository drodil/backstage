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

import { Link } from '@backstage/core-components';
import { Text } from '@backstage/ui';
import { useToolkit, Tool } from './Context';
import styles from './Content.module.css';

/**
 * A component to display a list of tools for the user.
 *
 * @public
 */
export const Content = (props: ToolkitContentProps) => {
  const toolkit = useToolkit();
  const tools = toolkit?.tools ?? props.tools;

  return (
    <ul className={styles.toolkit}>
      {tools.map((tool: Tool) => (
        <li key={tool.url}>
          <Link to={tool.url} className={styles.tool}>
            <div className={styles.icon}>{tool.icon}</div>
            <Text as="span" className={styles.label}>
              {tool.label}
            </Text>
          </Link>
        </li>
      ))}
    </ul>
  );
};

/**
 * Props for Toolkit Content component.
 *
 * @public
 */
export type ToolkitContentProps = {
  tools: Tool[];
};

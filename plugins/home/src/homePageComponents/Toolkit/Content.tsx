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

import { ReactNode } from 'react';
import { Link } from '@backstage/core-components';
import { configApiRef, useApi, useApiHolder } from '@backstage/core-plugin-api';
import { iconsApiRef } from '@backstage/frontend-plugin-api';
import List from '@material-ui/core/List';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import { makeStyles } from '@material-ui/core/styles';
import { useToolkit, Tool } from './Context';

const useStyles = makeStyles(theme => ({
  toolkit: {
    display: 'flex',
    flexWrap: 'wrap',
    textAlign: 'center',
  },
  tool: {
    margin: theme.spacing(0.5, 1),
  },
  label: {
    marginTop: theme.spacing(1),
    width: '72px',
    fontSize: '0.9em',
    lineHeight: '1.25',
    overflowWrap: 'break-word',
    color: theme.palette.text.secondary,
  },
  icon: {
    width: '64px',
    height: '64px',
    borderRadius: '50px',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: theme.shadows[1],
    backgroundColor: theme.palette.background.default,
  },
}));

/**
 * A component to display a list of tools for the user.
 *
 * @public
 */
export const Content = (props: ToolkitContentProps) => {
  const classes = useStyles();
  const toolkit = useToolkit();
  const configApi = useApi(configApiRef);
  const iconsApi = useApiHolder().get(iconsApiRef);

  const configTools: Tool[] = (
    configApi.getOptionalConfigArray('home.toolkit.tools') ?? []
  ).map(toolConfig => ({
    url: toolConfig.getString('url'),
    label: toolConfig.getString('label'),
    icon: toolConfig.getOptionalString('icon'),
  }));

  const seenUrls = new Set<string>();
  const tools = [
    ...(toolkit?.tools ?? []),
    ...(props.tools ?? []),
    ...configTools,
  ].filter(tool => {
    if (seenUrls.has(tool.url)) {
      return false;
    }
    seenUrls.add(tool.url);
    return true;
  });

  const resolveIcon = (icon: ReactNode | string): ReactNode => {
    if (typeof icon === 'string') {
      return iconsApi?.icon(icon) ?? null;
    }
    return icon;
  };

  return (
    <List className={classes.toolkit}>
      {tools.map((tool: Tool) => (
        <Link key={tool.url} to={tool.url} className={classes.tool}>
          <ListItemIcon className={classes.icon}>
            {resolveIcon(tool.icon)}
          </ListItemIcon>
          <ListItemText
            secondaryTypographyProps={{ className: classes.label }}
            secondary={tool.label}
          />
        </Link>
      ))}
    </List>
  );
};

/**
 * Props for Toolkit Content component.
 *
 * @public
 */
export type ToolkitContentProps = {
  tools?: Tool[];
};

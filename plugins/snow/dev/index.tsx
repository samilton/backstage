import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { snowPlugin, SnowPage } from '../src/plugin';

createDevApp()
  .registerPlugin(snowPlugin)
  .addPage({
    element: <SnowPage />,
    title: 'Root Page',
    path: '/snow'
  })
  .render();

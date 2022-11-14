import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const snowPlugin = createPlugin({
  id: 'snow',
  routes: {
    root: rootRouteRef,
  },
});

export const SnowPage = snowPlugin.provide(
  createRoutableExtension({
    name: 'SnowPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);

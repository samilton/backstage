// packages/app/src/modules/layout/index.tsx

import { createFrontendModule, PageLayout } from '@backstage/frontend-plugin-api';
import { SwappableComponentBlueprint } from '@backstage/plugin-app-react';

const pageLayoutOverride = SwappableComponentBlueprint.make({
  name: 'page-layout',
  params: defineParams =>
    defineParams({
      component: PageLayout,
      loader: async () =>
        import('./CustomPageLayout').then(m => m.CustomPageLayout),
    }),
});

export const layoutModule = createFrontendModule({
  pluginId: 'app',
  extensions: [pageLayoutOverride],
});

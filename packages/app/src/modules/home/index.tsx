// packages/app/src/modules/home/index.tsx
// Home page — registered as a PageBlueprint at "/".

import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { PageBlueprint } from '@backstage/frontend-plugin-api';

const homePageExtension = PageBlueprint.make({
  name: 'home',
  params: {
    path: '/',
    // The hero in HomePage renders our own header — skip the default one.
    noHeader: true,
    loader: () => import('./HomePage').then(m => <m.HomePage />),
  },
});

export const homeModule = createFrontendModule({
  pluginId: 'app',
  extensions: [homePageExtension],
});

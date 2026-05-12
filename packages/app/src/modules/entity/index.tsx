// packages/app/src/modules/entity/index.tsx
// Custom entity page header.

import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityHeaderBlueprint } from '@backstage/plugin-catalog-react/alpha';

const entityHeaderExtension = EntityHeaderBlueprint.make({
  name: 'header',
  params: {
    loader: () =>
      import('./EntityPageHeader').then(m => <m.EntityPageHeader />),
  },
});

export const entityModule = createFrontendModule({
  pluginId: 'app',
  extensions: [entityHeaderExtension],
});

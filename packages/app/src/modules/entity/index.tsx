// packages/app/src/modules/entity/index.tsx
// Custom entity page header matching the Elliott design mock.

import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityHeaderBlueprint } from '@backstage/plugin-catalog-react/alpha';

const entityHeaderExtension = EntityHeaderBlueprint.make({
  name: 'header',
  params: {
    loader: () =>
      import('./EntityElliottHeader').then(m => <m.EntityElliottHeader />),
  },
});

export const entityModule = createFrontendModule({
  pluginId: 'app',
  extensions: [entityHeaderExtension],
});

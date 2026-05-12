// packages/app/src/modules/catalog/index.tsx

import {
  createFrontendModule,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import { CatalogPage } from './CatalogPage';

const catalogIndexPage = PageBlueprint.make({
  name: 'catalog',
  params: {
    path: '/catalog',
    title: 'Catalog',
    noHeader: true,
    loader: async () => <CatalogPage />,
  },
});

export const catalogModule = createFrontendModule({
  pluginId: 'app',
  extensions: [catalogIndexPage],
});

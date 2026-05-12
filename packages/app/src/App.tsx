// packages/app/src/App.tsx
// Registers all frontend modules including the custom theme.

import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { themeModule } from './modules/theme';
import { homeModule } from './modules/home';
import { k8sModule } from './modules/k8s';
import { catalogModule } from './modules/catalog';
import { entityModule } from './modules/entity';
import { scaffolderModule } from './modules/scaffolder';
import notificationsPlugin from '@backstage/plugin-notifications/alpha';
import { adminModule } from './modules/admin';
import { layoutModule } from './modules/layout';

export default createApp({
  features: [
    catalogPlugin,
    navModule,
    themeModule,
    homeModule,
    k8sModule,
    catalogModule,
    entityModule,
    scaffolderModule,
    notificationsPlugin,
    adminModule,
    layoutModule,
  ],
});

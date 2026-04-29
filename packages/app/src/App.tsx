// packages/app/src/App.tsx
// Updated to register the Elliott theme module.

import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { themeModule } from './modules/theme';
import { homeModule } from './modules/home';
import { k8sModule } from './modules/k8s';
import { entityModule } from './modules/entity';

export default createApp({
  features: [catalogPlugin, navModule, themeModule, homeModule, k8sModule, entityModule],
});

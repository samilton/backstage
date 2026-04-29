// packages/app/src/modules/k8s/index.tsx
// Two extensions live here:
//   1. Standalone /kubernetes page — the multi-cluster fleet overview.
//   2. Catalog entity tab — per-entity Kubernetes view.
// Both replace pieces of the default `@backstage/plugin-kubernetes` UI;
// see app-config.yaml for the corresponding `false` toggles.

import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { PageBlueprint } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';

const fleetPageExtension = PageBlueprint.make({
  name: 'cluster-fleet',
  params: {
    path: '/kubernetes',
    noHeader: true,
    loader: () => import('./ClusterFleetPage').then(m => <m.ClusterFleetPage />),
  },
});

const entityKubernetesExtension = EntityContentBlueprint.make({
  name: 'kubernetes',
  params: {
    path: '/kubernetes',
    title: 'Kubernetes',
    group: 'compute',
    // Only show the tab when the entity is wired to a kubernetes-id.
    filter: entity => Boolean(entity.metadata.annotations?.['backstage.io/kubernetes-id']),
    loader: () =>
      import('./entity/EntityKubernetesContent').then(m => <m.EntityKubernetesContent />),
  },
});

export const k8sModule = createFrontendModule({
  pluginId: 'app',
  extensions: [fleetPageExtension, entityKubernetesExtension],
});

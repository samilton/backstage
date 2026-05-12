// plugins/scaffolder-actions-ops/src/index.ts
//
// Scaffolder backend module that registers custom ops actions. Today
// just one: `ops:topic:create` (used by examples/templates/create-nsq-topic.yaml).

import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node';
import { createNamespaceAction } from './createNamespaceAction';
import { createNsqTopicAction } from './createNsqTopicAction';

export const scaffolderActionsOpsModule = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'actions-ops',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        discovery: coreServices.discovery,
        scaffolder: scaffolderActionsExtensionPoint,
      },
      async init({ logger, discovery, scaffolder }) {
        scaffolder.addActions(
          createNsqTopicAction({ discovery }),
          createNamespaceAction({ discovery }),
        );

        logger.info(
          'registered scaffolder actions ops:topic:create, ops:namespace:create via ops-request-bridge',
        );
      },
    });
  },
});

export default scaffolderActionsOpsModule;

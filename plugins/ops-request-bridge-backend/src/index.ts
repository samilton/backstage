// plugins/ops-request-bridge-backend/src/index.ts
//
// New backend system plugin. Wires:
//   POST /api/ops-request-bridge/topics/create
// to a tiny NSQ publisher that drops a CloudEvent on `ops.requests`.
//
// Config (app-config.yaml):
//
//   opsRequestBridge:
//     nsqdHttpAddress: http://localhost:4151
//     topic: ops.requests
//     responsesTopic: ops.responses
//
// Keys default to the values above when omitted.

import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { notificationService } from '@backstage/plugin-notifications-node';
import { NsqPublisher } from './publisher';
import { createRouter } from './router';

export const opsRequestBridgePlugin = createBackendPlugin({
  pluginId: 'ops-request-bridge',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        http: coreServices.httpRouter,
        notifications: notificationService,
      },
      async init({ logger, config, http, notifications }) {
        const root = config.getOptionalConfig('opsRequestBridge');
        const nsqdHttpAddress =
          root?.getOptionalString('nsqdHttpAddress') ??
          'http://localhost:4151';
        const topic = root?.getOptionalString('topic') ?? 'ops.requests';
        const responsesTopic =
          root?.getOptionalString('responsesTopic') ?? 'ops.responses';

        const publisher = new NsqPublisher(nsqdHttpAddress, logger);
        const router = createRouter({
          logger,
          publisher,
          notificationService: notifications,
          topic,
          responsesTopic,
        });

        // Demo plugin: leave unauthenticated so the form post just works.
        // Tighten before production (use http.addAuthPolicy or similar).
        http.addAuthPolicy({ path: '/', allow: 'unauthenticated' });
        http.use(router);

        logger.info(
          `ops-request-bridge listening (nsqd=${nsqdHttpAddress}, topic=${topic}, responsesTopic=${responsesTopic})`,
        );
      },
    });
  },
});

export default opsRequestBridgePlugin;

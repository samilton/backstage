/**
 * Backend module that polls the local catalog on a schedule, diffs against
 * the previous snapshot, and publishes added/changed/removed events to NSQ.
 *
 * Topic routing: by default everything goes to a single topic
 * (`catalog.events`). The Go consumer can fan out from there. We deliberately
 * keep this simple — moving to per-kind topics later is a one-line change
 * (see `topicFor`).
 *
 * Config (in app-config.yaml):
 *
 *   catalogEventBridge:
 *     enabled: true
 *     nsqdHttpAddress: http://localhost:4151
 *     topic: catalog.events
 *     pollSeconds: 15
 */
import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { CatalogSnapshot } from './diff';
import { NoopPublisher, NsqHttpPublisher, type Publisher } from './publisher';

const DEFAULT_TOPIC = 'catalog.events';
const DEFAULT_POLL_SECONDS = 15;

export const catalogEventBridgeModule = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'event-bridge',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        scheduler: coreServices.scheduler,
        auth: coreServices.auth,
        catalog: catalogServiceRef,
      },
      async init({ logger, config, scheduler, auth, catalog }) {
        const root = config.getOptionalConfig('catalogEventBridge');
        const enabled = root?.getOptionalBoolean('enabled') ?? true;
        if (!enabled) {
          logger.info('catalog-event-bridge disabled via config');
          return;
        }

        const nsqdHttpAddress =
          root?.getOptionalString('nsqdHttpAddress') ??
          'http://localhost:4151';
        const topic = root?.getOptionalString('topic') ?? DEFAULT_TOPIC;
        const pollSeconds =
          root?.getOptionalNumber('pollSeconds') ?? DEFAULT_POLL_SECONDS;

        const publisher: Publisher = nsqdHttpAddress
          ? new NsqHttpPublisher(nsqdHttpAddress, logger)
          : new NoopPublisher();

        const snapshot = new CatalogSnapshot();

        logger.info(
          `catalog-event-bridge started: nsq=${nsqdHttpAddress} topic=${topic} pollSeconds=${pollSeconds}`,
        );

        await scheduler.scheduleTask({
          id: 'catalog-event-bridge.poll',
          frequency: { seconds: pollSeconds },
          timeout: { seconds: Math.max(30, pollSeconds * 2) },
          // Run on every backend instance is fine — diff state is in-memory
          // and per-instance, but downstream consumers must already be
          // idempotent. If you scale the backend horizontally, switch this
          // to a singleton task and persist the snapshot.
          scope: 'global',
          fn: async () => {
            try {
              const credentials = await auth.getOwnServiceCredentials();
              const { items } = await catalog.getEntities(
                undefined,
                { credentials },
              );
              const events = snapshot.diff(items);
              if (events.length === 0) {
                logger.debug(
                  `catalog poll: no changes (entities=${snapshot.size()})`,
                );
                return;
              }
              logger.info(
                `catalog poll: ${events.length} event(s), entities=${snapshot.size()}`,
              );
              for (const ev of events) {
                try {
                  await publisher.publish(topic, ev);
                } catch (err) {
                  logger.error(
                    `failed to publish ${ev.ceType} ${ev.subject}: ${err}`,
                  );
                  // NB: we already updated the in-memory snapshot, so this
                  // event is effectively dropped. Acceptable for v1; for v2
                  // either persist the snapshot or roll back on failure.
                }
              }
            } catch (err) {
              logger.error(`catalog-event-bridge poll failed: ${err}`);
            }
          },
        });
      },
    });
  },
});

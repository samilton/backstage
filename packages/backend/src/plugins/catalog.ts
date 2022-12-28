import { CatalogBuilder } from '@backstage/plugin-catalog-backend';
import { ScaffolderEntitiesProcessor } from '@backstage/plugin-scaffolder-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

// customization

import { SnowProvider } from "../../snowProvider/snowProvider"
import { BitbucketServerEntityProvider } from '@backstage/plugin-catalog-backend-module-bitbucket-server';

export default async function createPlugin(
    env: PluginEnvironment,
): Promise<Router> {
    const builder = await CatalogBuilder.create(env);

    const snowProvider = new SnowProvider('production', env.reader);
    builder.addEntityProvider(snowProvider);

    builder.addEntityProvider(
        BitbucketServerEntityProvider.fromConfig(env.config, {
            logger: env.logger,
            schedule: env.scheduler.createScheduledTaskRunner({
                frequency: { minutes: 5 },
                timeout: { minutes: 3 },
            }),
        }),
    );

    builder.addProcessor(new ScaffolderEntitiesProcessor());
    const { processingEngine, router } = await builder.build();
    await processingEngine.start();

    /*
    await env.scheduler.scheduleTask({
        id: 'run_snows_refresh',
        fn: async () => { await snowProvider.run(); },
        frequency: { minutes: 1 },
        timeout: { minutes: 1 },
    });
    */

    return router;
}

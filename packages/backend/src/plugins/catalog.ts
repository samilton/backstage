import { CatalogBuilder } from '@backstage/plugin-catalog-backend';
import { ScaffolderEntitiesProcessor } from '@backstage/plugin-scaffolder-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

// customization

import { SnowProvider } from "../../snowProvider/snowProvider"

export default async function createPlugin(
    env: PluginEnvironment,
): Promise<Router> {
    const builder = await CatalogBuilder.create(env);

    const snowProvider = new SnowProvider('production', env.reader);
    builder.addEntityProvider(snowProvider);

    builder.addProcessor(new ScaffolderEntitiesProcessor());
    const { processingEngine, router } = await builder.build();
    await processingEngine.start();

    await env.scheduler.scheduleTask({
        id: 'run_snows_refresh',
        fn: async () => { await snowProvider.run(); },
        frequency: { minutes: 1 },
        timeout: { minutes: 1 },
    });

    return router;
}

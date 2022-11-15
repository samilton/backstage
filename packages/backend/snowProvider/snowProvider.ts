import { UrlReader } from '@backstage/backend-common';
import { Entity } from '@backstage/catalog-model';

import {
    EntityProvider,
    EntityProviderConnection,
} from '@backstage/plugin-catalog-node';

export class SnowProvider implements EntityProvider {
    private readonly env: string;
    private readonly reader: UrlReader;
    private connection?: EntityProviderConnection;

    constructor(env: string, reader: UrlReader) {
        this.env = env;
        this.reader = reader;
    }

    getProviderName(): string {
        return `snow-${this.env}`;
    }

    snowToEntities(data: Object): Entity[] {
        var entities: Entity[] = [];
        let i: int = 0;

        for (let snowApp of data) {

            console.log(snowApp.name);
            // santize the name according to https://github.com/backstage/backstage/blob/master/docs/architecture-decisions/adr002-default-catalog-file-format.md#name

            var name = snowApp.name.replace(/ /gi, "-").replace(/[\(\)\']/gi, "").replace(/\//gi, "").toLowerCase();

            console.log(name);
            var e: Entity = {
                kind: "Component",
                apiVersion: "backstage.io/v1alpha1",
                metadata: {
                    name: name,
                    description: snowApp.short_description,
                    annotations: {
                        "backstage.io/managed-by-location": "url:http://0.0.0.0:7070/",
                        "backstage.io/managed-by-origin-location": "url:http://0.0.0.0:7070/",
                        "ellittmgmt.com/install_type": snowApp.install_type,
                    },
                    "links": [
                        {
                            "url": "http://www.google.com",
                            "title": "Google",
                            "icon": "dashboard"

                        }
                    ]

                },
                spec: {
                    "type": "service",
                    "lifecycle": "experimental",
                    "owner": "guests",
                    "system": "examples",
                    "title": snowApp.name,
                    "labels": {
                        "elliotmgmt.com/application_type": snowApp.application_type,
                        "elliotmgmt.com/platform": snowApp.platform,
                        "elliotmgmt.com/aka": snowApp.name,
                    }
                }
            }

            entities[i++] = e;
        }

        return entities;
    }

    async connect(connection: EntityProviderConnection): Promise<void> {
        this.connection = connection;
    }

    async run(): Promise<void> {
        if (!this.connection) {
            throw new Error('Not initialized');
        }

        const raw = await this.reader.read(
            //`https://snow-proxy-${this.env}.kube-dev-cs-1.elliottmgmt.com:7070/`
            //`http://0.0.0.0:7070/sample.json`
            `https://artifactory.elliottmgmt.com/artifactory/file-store/backstage/sample.json`
            //`https://elliottmgmtdev.service-now.com/api/ealp/v1/cmdb_api/list`
        );

        console.log("Loading remote data");
        const data = JSON.parse(raw.toString());

        const entities: Entity[] = this.snowToEntities(data['result']);

        await this.connection.applyMutation({
            type: 'full',
            entities: entities.map(entity => ({
                entity,
                locationKey: `snow-provider:${this.env}`
            })),
        });
    }

}

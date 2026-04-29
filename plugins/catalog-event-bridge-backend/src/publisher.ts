/**
 * Wire format: CloudEvents 1.0, JSON structured-mode.
 *
 * The canonical schema lives in `schemas/` at the repo root:
 *   - envelope: CloudEvents 1.0 (https://github.com/cloudevents/spec)
 *   - data:     schemas/catalog-event-data.schema.json
 *
 * We assemble the envelope by hand (a few lines) instead of pulling in the
 * `cloudevents` npm package. The format is small and stable, and avoiding
 * the dep keeps the backend bundle slim. If we ever need binary-mode or
 * non-JSON encodings, switch to the SDK.
 */
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';
import type { LoggerService } from '@backstage/backend-plugin-api';

/** Reverse-DNS event names — used as the CloudEvent `type` and as a routing key. */
export type CatalogEventType =
  | 'io.backstage.catalog.entity.added'
  | 'io.backstage.catalog.entity.changed'
  | 'io.backstage.catalog.entity.removed';

/** Producer identity, used as the CloudEvent `source`. */
export const EVENT_SOURCE = '/backstage/catalog';

/** URI of the JSON Schema for the `data` field. Bumped on schema changes. */
export const DATA_SCHEMA_URI =
  'https://backstage.local/schemas/catalog-event-data/v1.json';

/** Shape of the `data` field. Mirrors `schemas/catalog-event-data.schema.json`. */
export interface CatalogEventData {
  kind: string;
  specType?: string;
  entity?: unknown;        // omitted on `removed`
  previousEntity?: unknown; // present on `changed` and `removed`
}

/**
 * Internal record produced by the diff layer. The publisher turns this into
 * a CloudEvent on the wire. Keeping the diff producer-agnostic of the
 * envelope means we can swap CloudEvents for something else later without
 * touching diff logic.
 */
export interface CatalogChange {
  /** Stable id for idempotency on the consumer side. */
  id: string;
  /** RFC3339 timestamp. */
  time: string;
  /** CloudEvent `type`. */
  ceType: CatalogEventType;
  /** CloudEvent `subject` — the entity ref, e.g. "component:default/foo". */
  subject: string;
  /** The payload body (serialized into the CloudEvent `data` field). */
  data: CatalogEventData;
}

/** Convenience for tests / scripts. */
export function newId(): string {
  return randomUUID();
}

/** Build the CloudEvent JSON document we put on the wire. */
export function toCloudEvent(change: CatalogChange): Record<string, unknown> {
  return {
    specversion: '1.0',
    id: change.id,
    source: EVENT_SOURCE,
    type: change.ceType,
    time: change.time,
    subject: change.subject,
    datacontenttype: 'application/json',
    dataschema: DATA_SCHEMA_URI,
    data: change.data,
  };
}

export interface Publisher {
  publish(topic: string, change: CatalogChange): Promise<void>;
}

/**
 * NSQ HTTP publisher. We post the structured-mode CloudEvent JSON to
 * nsqd's `/pub` endpoint. NSQ has no message headers, so binary-mode
 * CloudEvents are not applicable here.
 *
 * See https://nsq.io/components/nsqd.html#pub
 */
export class NsqHttpPublisher implements Publisher {
  constructor(
    private readonly nsqdHttpAddress: string, // e.g. http://localhost:4151
    private readonly logger: LoggerService,
  ) {}

  async publish(topic: string, change: CatalogChange): Promise<void> {
    const url = `${this.nsqdHttpAddress}/pub?topic=${encodeURIComponent(topic)}`;
    const body = JSON.stringify(toCloudEvent(change));
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/cloudevents+json' },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`nsq publish failed: ${res.status} ${text}`);
    }
    this.logger.debug(
      `published ${change.ceType} ${change.subject} -> ${topic} (${body.length}B)`,
    );
  }
}

/** Drops events on the floor. Useful when the bridge is disabled. */
export class NoopPublisher implements Publisher {
  async publish(): Promise<void> {
    /* no-op */
  }
}

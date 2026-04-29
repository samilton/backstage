/**
 * Snapshot + diff logic. We keep an in-memory map of entityRef -> hash and
 * compute added/changed/removed against the latest catalog read.
 *
 * Output is a list of `CatalogChange` records. The publisher is responsible
 * for turning those into CloudEvents on the wire (see publisher.ts).
 *
 * Tradeoffs:
 *   - In-memory only: on restart we re-emit "added" for everything we see.
 *     That's fine because consumers are required to be idempotent (keyed by
 *     entityRef), and each event carries a stable `id`.
 *   - Hashing the full entity (after stripping volatile fields) means we
 *     only emit on real shape changes, not on every refresh tick.
 */
import { createHash, randomUUID } from 'crypto';
import type { Entity } from '@backstage/catalog-model';
import { stringifyEntityRef } from '@backstage/catalog-model';
import type {
  CatalogChange,
  CatalogEventData,
  CatalogEventType,
} from './publisher';

/** Fields that change on every refresh and would cause noisy diffs. */
const VOLATILE_METADATA_KEYS = new Set(['uid', 'etag', 'generation']);

function stableEntityForHash(entity: Entity): unknown {
  const { metadata, ...rest } = entity;
  const cleanedMetadata: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata ?? {})) {
    if (!VOLATILE_METADATA_KEYS.has(k)) cleanedMetadata[k] = v;
  }
  return { ...rest, metadata: cleanedMetadata };
}

/** Deterministic JSON: keys sorted recursively. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map(k => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

function hashEntity(entity: Entity): string {
  return createHash('sha256')
    .update(stableStringify(stableEntityForHash(entity)))
    .digest('hex');
}

function specTypeOf(entity: Entity): string | undefined {
  return (entity.spec as { type?: string } | undefined)?.type;
}

export interface SnapshotEntry {
  hash: string;
  entity: Entity;
}

export class CatalogSnapshot {
  private entries = new Map<string, SnapshotEntry>();

  /**
   * Apply a fresh list of entities and return the changes that should be
   * emitted as a result.
   */
  diff(current: Entity[]): CatalogChange[] {
    const changes: CatalogChange[] = [];
    const now = new Date().toISOString();
    const seen = new Set<string>();

    for (const entity of current) {
      const ref = stringifyEntityRef(entity);
      seen.add(ref);
      const hash = hashEntity(entity);
      const previous = this.entries.get(ref);

      if (!previous) {
        changes.push(
          change('io.backstage.catalog.entity.added', entity, undefined, now),
        );
      } else if (previous.hash !== hash) {
        changes.push(
          change(
            'io.backstage.catalog.entity.changed',
            entity,
            previous.entity,
            now,
          ),
        );
      }
      this.entries.set(ref, { hash, entity });
    }

    for (const [ref, entry] of this.entries) {
      if (seen.has(ref)) continue;
      const data: CatalogEventData = {
        kind: entry.entity.kind,
        specType: specTypeOf(entry.entity),
        previousEntity: entry.entity,
      };
      changes.push({
        id: randomUUID(),
        time: now,
        ceType: 'io.backstage.catalog.entity.removed',
        subject: ref,
        data,
      });
      this.entries.delete(ref);
    }

    return changes;
  }

  size(): number {
    return this.entries.size;
  }
}

function change(
  ceType: CatalogEventType,
  entity: Entity,
  previous: Entity | undefined,
  time: string,
): CatalogChange {
  const data: CatalogEventData = {
    kind: entity.kind,
    specType: specTypeOf(entity),
    entity,
    previousEntity: previous,
  };
  return {
    id: randomUUID(),
    time,
    ceType,
    subject: stringifyEntityRef(entity),
    data,
  };
}

# @internal/plugin-catalog-event-bridge-backend

A Backstage backend module that polls the local catalog on a schedule, diffs
against the previous snapshot, and publishes `added` / `changed` / `removed`
events to NSQ (or any other bus that implements the `Publisher` interface).

## Why polling?

The Backstage catalog does not (yet) publish entity-lifecycle events on the
internal events bus — only `experimental.catalog.conflict` and
`experimental.catalog.errors`. A periodic diff is the simplest reliable
source of truth and it works for every entity provider out of the box.

## Event schema

```json
{
  "id": "uuid",
  "occurredAt": "2026-04-27T12:00:00.000Z",
  "type": "catalog.entity.changed",
  "entityRef": "component:default/foo",
  "kind": "Component",
  "specType": "service",
  "entity":         { "...": "current" },
  "previousEntity": { "...": "or null on add" }
}
```

Consumers MUST be idempotent on `entityRef`. The `id` is unique per event
and is suitable as an idempotency key for sinks that need it (e.g. Temporal
signals).

## Config

```yaml
catalogEventBridge:
  enabled: true
  nsqdHttpAddress: http://localhost:4151
  topic: catalog.events
  pollSeconds: 15
```

## Known limitations (v1)

- Snapshot is in-memory: on backend restart we re-emit `added` for every
  existing entity. Acceptable because consumers are idempotent.
- Single topic. Routing by `kind`/`specType` happens consumer-side.
- NSQ HTTP `/pub` is used (not the TCP protocol). One message per request,
  fine for catalog-update volume.

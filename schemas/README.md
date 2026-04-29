# catalog event schemas

Source of truth for the wire format used between the Backstage
`catalog-event-bridge-backend` plugin (producer) and downstream consumers
(today: `services/ops-controller`, plus a future Go controller).

## Wire format

We use the [CloudEvents 1.0](https://github.com/cloudevents/spec) **JSON
structured-mode** envelope. One NSQ message body == one CloudEvent JSON
document. NSQ has no message headers, so binary mode is not an option; that
is fine because structured mode keeps `nsq_tail` / `curl` debuggable.

### Envelope (defined by CloudEvents)

| attribute         | value / format                                                |
| ----------------- | ------------------------------------------------------------- |
| `specversion`     | `"1.0"`                                                       |
| `id`              | producer-generated UUID, unique per event (idempotency key)   |
| `source`          | `/backstage/catalog`                                          |
| `type`            | `io.backstage.catalog.entity.added` \| `.changed` \| `.removed` |
| `time`            | RFC3339 UTC timestamp                                         |
| `subject`         | the entity ref, e.g. `component:default/orders-service`       |
| `datacontenttype` | `application/json`                                            |
| `dataschema`      | URI of the JSON Schema below (optional but recommended)       |
| `data`            | object — see `catalog-event-data.schema.json`                 |

### Payload (`data`)

Defined by [`catalog-event-data.schema.json`](./catalog-event-data.schema.json).
At a glance:

```jsonc
{
  "kind": "Component",            // entity kind, mirrors subject
  "specType": "service",          // spec.type when present
  "entity": { /* full Entity */ },// omitted on `removed`
  "previousEntity": { /* ... */ } // only on `changed` and `removed`
}
```

`kind` and `specType` are duplicated out of `entity` so consumers can route
without parsing the full body.

### Example

See [`examples/added-namespace.json`](./examples/added-namespace.json).

## Codegen / decoding

- TypeScript: types live in `plugins/catalog-event-bridge-backend/src/publisher.ts`
  and the consumer side reuses them. (Future: a shared `packages/catalog-events-schema`.)
- Go: see [`go/`](./go/) for a runnable decoder using
  [`cloudevents/sdk-go`](https://github.com/cloudevents/sdk-go).
- Anything else: any CloudEvents-aware library plus an Ajv-equivalent that can
  consume `catalog-event-data.schema.json`.

## Versioning

- The CloudEvents `type` is the routing key. Breaking changes to `data` get a
  new `type` (e.g. `io.backstage.catalog.entity.added.v2`). Consumers ignore
  unknown types. Never repurpose an existing `type`.
- Additive changes to `data` (new optional fields) do not require a new type.
- Bump `dataschema` URI when the schema is republished.

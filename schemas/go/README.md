# Go decoder example

A minimal program that subscribes to `catalog.events` over NSQ, decodes the
CloudEvent envelope with [`cloudevents/sdk-go`](https://github.com/cloudevents/sdk-go),
and unmarshals `data` into a typed struct.

This is the shape the production ops-controller will use; the Node controller
in `services/ops-controller/` exists for fast local iteration only.

## Run

```bash
cd schemas/go
go mod tidy
go run ./cmd/decode-demo            # uses lookupd at localhost:4161
```

In another terminal:

```bash
just publish-test
```

You should see the CloudEvent printed and (for `Resource` / `namespace`)
the placeholder Temporal+Pulumi plan.

## Files

- `cmd/decode-demo/main.go` — runnable consumer.
- `pkg/catalogevents/types.go` — the `Data` struct + event-type constants.
  This is the file you'd lift into the real controller.

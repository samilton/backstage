# Service Status — design notes

Status: **draft, not implemented.** Captures the plan for replacing the
`syntheticHealth(name)` calls in
`packages/app/src/modules/home/widgets/YourServicesTable.tsx` and
`ServiceStatsRow.tsx` with real per-service health.

Owner: sam · drafted 2026-04-28.

## Context

Two places on the home page render service health today:

1. **`YourServicesTable.tsx`** — the `Status` column on each row
   (healthy / degraded / down).
2. **`ServiceStatsRow.tsx`** — the four stat cards at the top
   (Healthy / Degraded / Down counts, plus Deploys/24h which is
   covered by the deploys design doc).

Both consume the same per-service signal and currently derive it from
an FNV-1a hash of the entity name (`syntheticHealth`). Replacing it is
a single-source-of-truth change — both widgets read from the new API.

## Datadog vs Kubernetes — what each actually measures

This is the question worth answering carefully. They look like
alternatives but they measure different things:

| | Kubernetes API | Datadog (Monitors / SLOs) |
|---|---|---|
| Question it answers | "is the workload running and ready?" | "is the service meeting its SLOs?" |
| Layer | Infrastructure liveness | User-facing health |
| Coverage | Only k8s workloads | Everything you've instrumented (k8s, Lambda, EC2, RDS, third-party SaaS) |
| False negative example | Pod is `Running` and `Ready`, app returns 500s | No monitor configured → DD has no opinion |
| False positive example | Rolling deploy: half the pods are `Pending`, service is fine | Flaky monitor pages → service shown red |
| Per-service config | `backstage.io/kubernetes-id` label (already standard) | Tags + monitors (requires DD discipline) |
| Multi-cluster cost | Real — N clusters = N adapters | Free — DD already federates |
| Reuse with other widgets | New surface | Same backend plugin as on-call (`docs/design/oncall-widget.md`) |

**The home page widget is asking a user-facing question** ("which of my
services is having a bad time right now?"), not an infra-liveness
question. Datadog is the right answer for that.

The k8s plugin is already installed (`@backstage/plugin-kubernetes`)
and already shows pod-level state on the **entity overview page** —
that's the right place for liveness detail. We don't need to duplicate
it in the home page table.

That said, k8s is a useful **fallback** when a service has no DD
monitors (which is "unknown" to DD but visibly green/red in k8s).
Resolution chain in the plan below handles this.

## Status hierarchy

Per-service resolution, first non-`unknown` wins:

1. **Datadog SLO state** — if the service has an SLO annotation and
   the SLO is currently breaching error budget → `degraded` or `down`
   based on burn rate.
2. **Datadog monitor rollup** — if the service has tagged monitors,
   roll them up: any in `Alert` → `down`, any in `Warn` → `degraded`,
   all in `OK` → `healthy`. Monitors in `No Data` are ignored (don't
   poison healthy).
3. **Kubernetes readiness** (fallback, only if DD returned `unknown`)
   — pod readiness ratio per Deployment behind the
   `backstage.io/kubernetes-id`. <50% ready → `down`, <100% ready →
   `degraded`, all ready → `healthy`.
4. **`unknown`** — neither source had an opinion. Render as a grey dot,
   not a red one.

The widget renders four states (healthy / degraded / down / unknown),
even though the screenshot only shows three. Unknown is too common to
lie about.

## Annotation contract

Default path: most services have a Datadog `service` tag matching the
component name, and that's enough. Annotations are only needed when the
DD service tag differs from the catalog name, or when overriding the
SLO source.

```yaml
metadata:
  annotations:
    # Optional. Defaults to metadata.name when absent.
    elliott.io/datadog-service: orders-api

    # Optional. Specific SLO to consult; otherwise we roll up monitors.
    # Multiple SLOs can be listed comma-separated; worst state wins.
    elliott.io/datadog-slo-id: abc123def456

    # Optional. Comma-separated DD monitor tag selector — used when
    # `service:` tagging discipline is inconsistent and we need to
    # point at a specific group of monitors.
    # elliott.io/datadog-monitor-tags: team:platform,env:prod

    # Already-standard for k8s fallback (no change from today)
    backstage.io/kubernetes-id: orders-api

    # Hint, not a switch. Allowed: 'datadog' | 'kubernetes' | 'both'.
    # Defaults to 'both' (DD primary, k8s fallback).
    elliott.io/health-source: datadog
```

`elliott.io/health-source: kubernetes` is provided as an escape hatch
for services that intentionally aren't in DD (batch jobs, internal
tooling). It skips the DD lookup entirely.

## Data model

```ts
type ServiceHealth = {
  service: string;                                  // entity.metadata.name
  state: 'healthy' | 'degraded' | 'down' | 'unknown';
  source: 'datadog-slo' | 'datadog-monitor' | 'kubernetes' | 'none';
  reason?: string;     // human-readable: "SLO budget at 12%", "2/4 pods ready"
  url?: string;        // deep link to DD monitor page or k8s dashboard
  asOf: string;        // RFC3339, when the signal was last evaluated server-side
};
```

The widget renders `state` as the colored dot + label, hovers `reason`
as a tooltip.

## Status mapping

### Datadog monitors

| DD monitor state | Normalized contribution |
|---|---|
| `OK`             | healthy |
| `No Data`        | ignored (not poisonous) |
| `Warn`           | degraded |
| `Alert`          | down |
| `Skipped`        | ignored |
| `Ignored`        | ignored |

Rollup across N monitors for a service: worst non-ignored state wins.
All ignored → `unknown`.

### Datadog SLOs

| SLO state | Normalized |
|---|---|
| Healthy budget remaining | healthy |
| Burning fast (≥2x burn rate) | degraded |
| Budget exhausted | down |

Burn-rate thresholds are configurable in the backend plugin config so
ops can tune them without a code change.

### Kubernetes

```
ready_ratio = readyReplicas / replicas

ready_ratio == 1.0 → healthy
0 < ratio < 1.0    → degraded
ratio == 0         → down
no Deployment found → unknown
```

(Multi-Deployment per service: take the worst.)

## Phased plan

Same Phase 0 / 1 / 2 / 3 structure as the deploys + on-call docs,
because the architectural choices are the same. The differences from
those widgets:

- **Highest case for Phase 3.** A service going down is exactly the
  kind of signal you want surfaced live, not "next time someone
  refreshes". DD monitor webhooks → NSQ → signals → red dot updates in
  ~1s.
- **No fan-out at all** if we use DD's bulk endpoints. One call to
  `GET /api/v1/monitor?monitor_tags=service:*` covers the whole
  catalog. Phase 1 (proxy + browser fan-out) makes more sense here than
  in the deploys widget for that reason.

### Phase 0 — annotation contract + typed seam (~30 min)

- Annotation contract above (this doc) — done.
- Frontend `ServiceHealthApi` ApiRef:

  ```ts
  interface ServiceHealthApi {
    forServices(names: string[]): Promise<Map<string, ServiceHealth>>;
  }
  ```

  Bulk by name so the table can fetch all rows in one call.
- Mock impl that wraps `syntheticHealth` for now; same shape, same
  behaviour visually.
- `YourServicesTable.tsx` and `ServiceStatsRow.tsx` switch from calling
  `syntheticHealth(name)` directly to consuming the api. Both widgets
  read from the same Map so counts and rows agree.

### Phase 1 — frontend via Backstage proxy (~3–4 hours)

Genuinely viable here because we can use DD's bulk monitor query:

```
GET /api/v1/monitor?monitor_tags=service:orders-api,service:payments-api,...
```

One call returns state for all services. The proxy already exists from
the on-call work (`docs/design/oncall-widget.md`), so this is just
adding a fetch and a rollup. K8s fallback would need a separate
adapter — punt that to Phase 2.

Cache: 30 seconds in a module-level Map. Re-fetch on visibility change
(tab refocus).

### Phase 2 — backend aggregator (~1 day on top of deploys + on-call)

Folds in to the same `platform-feeds` backend plugin proposed in the
on-call doc:

```
packages/backend-plugins/platform-feeds/
├── src/
│   ├── plugin.ts
│   ├── routers/
│   │   ├── deploys.ts        # GET /api/feeds/deploys/recent
│   │   ├── oncall.ts         # GET /api/feeds/oncall/current
│   │   └── health.ts         # GET /api/feeds/health  ← this
│   ├── adapters/
│   │   ├── datadog/
│   │   │   ├── monitors.ts
│   │   │   └── slos.ts
│   │   ├── github.ts
│   │   ├── octopus.ts
│   │   └── kubernetes.ts     # uses @backstage/plugin-kubernetes-backend
│   ├── catalog.ts
│   └── cache.ts
```

The k8s adapter is the only meaningful new code beyond what the other
two widgets need — and it can lean on the existing
`@backstage/plugin-kubernetes-backend` instead of talking to clusters
directly. That keeps cluster credentials in one place.

Cost on top of Phase 2 of deploys + on-call: ~1 day. Most of it is the
DD monitor rollup logic and the k8s readiness check.

### Phase 3 — push (worth it here)

This is the widget where realtime actually matters:

```
Datadog monitor state change (Alert/Warn/OK/Recovery)
        │
        ├── webhook ──► ingester ──► CloudEvent on `health.events` topic
                                              │
                                              ▼
                              backend updates rolling per-service state
                                              │
                                              ▼
                              signals plugin ──► home page widget
                                              │
                                              └─► dot turns red instantly
```

Same wire format as the catalog event bridge (`schemas/`,
`schemas/catalog-event-data.schema.json`). New `data` shape:

```jsonc
{
  "specversion": "1.0",
  "type": "io.elliott.health.changed",
  "source": "/datadog/monitor/abc123",
  "subject": "component:default/orders-api",
  "data": {
    "service": "orders-api",
    "state": "down",
    "previousState": "healthy",
    "reason": "Error rate >5% for 3 minutes",
    "monitorId": "abc123",
    "url": "https://app.datadoghq.com/monitors/abc123"
  }
}
```

Cost: ~1–2 days, mostly setting up the Datadog webhook receiver
endpoint (publicly reachable URL is the operational hassle, same as
the deploys Phase 3).

When push lands, the polling cache TTL can stay long (5 min instead of
30s) — webhooks fill in the gaps. That's the real win: no longer
hammering the DD API every 30 seconds across every open Backstage tab
in the org.

## What lands when

Same staging as the other two widgets:

- **Step 1 (anywhere):** annotation contract + typed `ServiceHealthApi`
  seam + mock impl that wraps `syntheticHealth`. ~30 min.
- **Step 2 (at work):** Phase 1 (proxy + DD monitor rollup) **or**
  Phase 2 (`platform-feeds` backend plugin), depending on whether the
  on-call/deploys backend plugin is being built first. If yes, fold
  this in. If no, Phase 1 is a reasonable interim.
- **Step 3 (when you're ready for live):** DD webhooks → NSQ →
  signals.

## Open questions to resolve at work

1. **DD service-tag discipline.** Are all production services
   consistently tagged `service:<name>` in DD? If yes, we can rely on
   bulk monitor queries. If no, we need per-component
   `elliott.io/datadog-monitor-tags` annotations or a tag-cleanup pass.
2. **SLO coverage.** How many services have proper SLOs vs just ad-hoc
   monitors? If SLO coverage is low, skip the SLO step and go monitor-
   only for v1.
3. **K8s fallback worth it.** How many services run **only** on k8s
   without DD instrumentation? If the answer is "almost none", drop
   the k8s adapter entirely and let those services show as `unknown`
   until they're wired into DD. Saves a meaningful amount of code.
4. **Multi-region DD.** Same question as the on-call widget — confirm
   `datadoghq.com` vs `.eu` and parameterise.
5. **What does "down" mean to ops.** A noisy monitor flapping into
   `Alert` for 30s shouldn't paint the home page red for everyone. A
   debounce (must be in `Alert` for ≥N minutes) is probably needed.
   Confirm the threshold with whoever owns the rotations.

## Pointers

- Existing widgets:
  - `packages/app/src/modules/home/widgets/YourServicesTable.tsx`
  - `packages/app/src/modules/home/widgets/ServiceStatsRow.tsx`
  - `packages/app/src/modules/home/widgets/syntheticHealth.ts`
- Companion designs (same architectural pattern; ship together):
  - `docs/design/recent-deploys-widget.md`
  - `docs/design/oncall-widget.md`
- Already-installed plugin we'd lean on for the k8s fallback:
  `@backstage/plugin-kubernetes` (frontend) + `-backend` (server)
- Wire-format conventions for Phase 3:
  `schemas/README.md`,
  `schemas/catalog-event-data.schema.json`

# Kubernetes Cluster Fleet — design notes

Status: **draft, not implemented.** Captures the plan for the page that
the sidebar's `Kubernetes` item should route to — replacing whatever
`@backstage/plugin-kubernetes/alpha` puts there today with a custom
fleet overview matching the Elliott design mock.

Owner: sam · drafted 2026-04-28.

## Context

The mock is a **multi-cluster fleet overview**, not a per-entity view.
The existing `@backstage/plugin-kubernetes` is per-entity by design —
it queries by `backstage.io/kubernetes-id` label and renders pods,
deployments, etc. for a single Component. That plugin keeps its job;
this page sits next to it.

What's on the page:

1. **Hero banner** — kicker + "Cluster fleet" title + summary line
   (`5 clusters · 104 nodes · 2,758 pods running`) + `KUBECTL CONTEXT ▼`
   button on the right.
2. **4-up stat row** — Clusters / Nodes / Pods Running / Pods
   Pending+Failing.
3. **Clusters table** — cluster name, provider, k8s version, region,
   node count, pod stats (running/pending/failing), capacity bar,
   rollup status.
4. **Top namespaces** — per-cluster, by pod count, with a few service
   names per namespace.
5. **Fleet events** — recent events across all clusters
   (ScalingReplicaSet / SuccessfulCreate / Pulled / Started / Unhealthy
   / Killing / Pulling …) with timestamps and cluster.

## Can we build it?

Yes. None of the pieces are research-grade; it's mostly
"query, aggregate, cache, render". The hard parts are operational
(auth-at-scale, event volume) rather than design.

What makes this *easier* than the other three widgets:

- **All from one source type.** Just k8s. No GH+Octopus or DD+k8s
  merge logic.
- **Auth is already solved.** The `@backstage/plugin-kubernetes-backend`
  plugin already handles cluster credentials (service-account tokens,
  IAM, OIDC) per the `kubernetes.clusterLocatorMethods` config. Our
  backend reuses it and never deals with a kubeconfig directly.
- **Watch streams are native.** Unlike webhooks-on-a-poll-model for
  deploys/oncall, k8s already gives you `watch=true` for events. Phase
  3 (live event feed) is the natural shape, not a retrofit.

What makes it *harder*:

- **Volume.** 5 clusters × ~2,800 pods every 60s is real bandwidth.
  Manageable now; needs care at 50 clusters.
- **Multi-cluster correctness.** Five clusters means five
  failure modes. The page must degrade gracefully when one cluster's
  API is unreachable.
- **Capacity calculation.** Metrics-server isn't always installed,
  isn't always healthy, and isn't always reporting accurate numbers.
  Better to compute capacity from pod requests vs node allocatable
  (more reliable, doesn't require metrics-server).

## Architecture

Folds into the same `platform-feeds` backend plugin proposed in the
deploys / on-call / health docs:

```
packages/backend-plugins/platform-feeds/
├── src/
│   ├── routers/
│   │   ├── deploys.ts
│   │   ├── oncall.ts
│   │   ├── health.ts
│   │   └── clusters.ts        ← this
│   ├── adapters/
│   │   ├── datadog/
│   │   ├── github.ts
│   │   ├── octopus.ts
│   │   └── kubernetes/
│   │       ├── client.ts      # wraps plugin-kubernetes-backend's auth
│   │       ├── fleet.ts       # per-cluster summary
│   │       ├── namespaces.ts  # top-N by pod count
│   │       └── events.ts      # event stream / poll
│   └── cache.ts
```

Endpoints:

```
GET /api/feeds/clusters                       → fleet summary (cards + table)
GET /api/feeds/clusters/{name}/namespaces     → top namespaces in one cluster
GET /api/feeds/clusters/events?since=…        → recent fleet events
```

All cached server-side. The page does three HTTP calls on first
render, each cheap.

### Cluster auth — leaning on the existing plugin

`@backstage/plugin-kubernetes-backend` already exposes a
`KubernetesClustersSupplier` and an auth-strategy registry. Our
adapter:

1. Asks the supplier for the configured clusters.
2. For each, asks the auth strategy for a token.
3. Hands token + cluster URL to a thin `@kubernetes/client-node`
   wrapper.

That's the right seam — we don't duplicate auth config, but we don't
inherit the per-entity API either. We borrow the plumbing, not the
shape.

## Data model

Mirroring what the page renders:

```ts
type ClusterRow = {
  name: string;             // 'prod-eu-west-1'
  provider: string;         // 'EKS' | 'GKE' | 'AKS' | 'k3s' | …
  version: string;          // '1.30.4'
  region: string;           // 'eu-west-1' | 'global'
  nodes: number;
  pods: { running: number; pending: number; failing: number };
  capacityPercent: number;  // 0–100, requests / allocatable
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
};

type FleetSummary = {
  clusters: ClusterRow[];
  totals: {
    clusters: number;
    nodes: number;
    podsRunning: number;
    podsPending: number;
    podsFailing: number;
  };
  capacityPercentOverall: number;
  asOf: string;             // RFC3339
};

type NamespaceRow = {
  cluster: string;
  namespace: string;
  podCount: number;
  podCapacity: number;      // requested vs allocatable, optional
  topServices: string[];    // first 3 deployments by replica count
};

type FleetEvent = {
  id: string;               // {cluster}/{namespace}/{uid}
  cluster: string;
  namespace: string;
  reason: string;           // 'ScalingReplicaSet' | 'Pulled' | …
  type: 'Normal' | 'Warning';
  message: string;
  involvedKind: string;     // 'Deployment' | 'Pod' | …
  involvedName: string;
  occurredAt: string;       // RFC3339
};
```

### Cluster status rollup

Per-cluster:

| Condition | Status |
|---|---|
| API unreachable | `down` |
| Any node `NotReady` | `degraded` |
| `pods.failing > 0` for >5 min | `degraded` |
| `capacityPercent >= 90` | `degraded` |
| Otherwise | `healthy` |

The 90% capacity threshold matches the orange bar on `edge-fastly-pop`
in the mock. Make it config so ops can tune.

### Capacity calculation

Avoid metrics-server. Compute:

```
capacityPercent = sum(pod.spec.containers[].resources.requests.cpu) /
                  sum(node.status.allocatable.cpu)
```

(And same for memory; show the worse of the two.)

Pros: deterministic, doesn't depend on metrics-server, doesn't lie when
metrics-server is flaky. Cons: doesn't reflect *actual* utilisation;
only requested capacity. That's fine for a "is this cluster about to
run out of room" signal — which is the question the bar is answering.

## Annotation contract

Almost nothing new. The cluster list comes from
`app-config.yaml#kubernetes.clusterLocatorMethods`, not from catalog
entities, so cluster-side annotations would have to live in the config
itself.

Add to each cluster's config block:

```yaml
kubernetes:
  clusterLocatorMethods:
    - type: config
      clusters:
        - name: prod-eu-west-1
          url: https://...
          authProvider: aws
          # New, optional, used by the fleet page:
          elliott:
            provider: EKS         # display label; defaults to authProvider
            region: eu-west-1     # display label
            tier: production      # 'production' | 'staging' | 'dev' | 'edge'
```

The `elliott` block is read by `platform-feeds` and ignored by the
core kubernetes plugin (it accepts unknown keys today). Provider,
region, and tier could be inferred from `name` heuristics, but
explicit is better.

## Phased plan

### Phase 0 — typed seam + mock (~45 min)

- Frontend `ClusterFleetApi` ApiRef:

  ```ts
  interface ClusterFleetApi {
    summary(): Promise<FleetSummary>;
    namespaces(cluster: string): Promise<NamespaceRow[]>;
    events(opts?: { sinceMinutes?: number }): Promise<FleetEvent[]>;
  }
  ```

- Mock impl returning the data from the screenshot (the five clusters,
  the namespace breakdown, the event log).
- Page extension at `/kubernetes` (PageBlueprint with `noHeader: true`)
  composed from the widgets below. Sidebar's existing `Kubernetes`
  item routes here.

After Phase 0 the page renders pixel-for-mock with fake data, same as
the home page did before live data landed.

### Phase 1 — backend reads, polling (~3–4 days)

This is the meat of the work.

- New `clusters` adapter family in `platform-feeds/src/adapters/kubernetes/`.
- `KubernetesClustersSupplier` from `plugin-kubernetes-backend`
  provides the cluster list + auth.
- Per-cluster, in parallel (capped concurrency):
  - `GET /api/v1/nodes`
  - `GET /api/v1/pods` (`limit=500`, follow `continue` if you must, but
    we summarise to counts so we can stream-aggregate without holding
    full pods in memory)
  - `GET /api/v1/events?fieldSelector=type!=Normal` (events panel)
- Cache TTLs:
  - Summary: 30s
  - Namespaces: 60s
  - Events: 15s (events change fast, but they're cheap)
- Errors per cluster are isolated: a `down` cluster contributes a row
  with `status: 'down'` and zeros, doesn't fail the whole response.

Frontend impl swaps mock for real.

Effort breakdown:

- Cluster supplier integration + auth wrapper: 0.5 day
- Pod summary aggregation (running/pending/failing counts + namespace
  rollup): 1 day
- Capacity calculation from requests: 0.5 day
- Events polling + filter: 0.5 day
- Cache layer + per-cluster error isolation: 0.5 day
- Frontend wiring + the kubectl-context button: 0.5 day
- Polish (loading states, empty states, the `· prod-eu-west-1` selector
  on Top namespaces): 0.5 day

### Phase 2 — informers, not polling (~2–3 days)

The events panel especially benefits from a watch stream. Per cluster,
a long-lived informer:

```
client.watch('/api/v1/events', { resourceVersion: …, allowWatchBookmarks: true })
  → in-memory ring buffer (last 200 events per cluster, 1h TTL)
  → reconnect with bookmarks on disconnect
```

`/api/feeds/clusters/events` reads from the buffer, not from the live
cluster. Sub-second freshness, zero API load per render.

Same pattern can extend to pods (informer-backed counts) but is
overkill for that — pods don't change fast enough to matter for the
home stat cards.

This phase is **partially redundant** with Phase 3 (NSQ). If the trio
of deploys/oncall/health is already pushing toward Phase 3 by the time
this lands, skip Phase 2 and go straight to Phase 3 — the in-memory
ring buffer becomes the NSQ consumer.

### Phase 3 — informers → NSQ → signals (matches house style)

The natural endgame, and the one that fits the existing
catalog-event-bridge pattern best:

```
per-cluster k8s informer (events, pods)
        │
        ├── filter (type=Warning, or significant transitions)
        │
        ├── normalize → CloudEvent on `cluster.events` topic
        │
        ▼
backend consumer (in platform-feeds)
        │
        ├── updates rolling buffer
        ├── pushes to @backstage/plugin-signals
        ▼
frontend widget appends row, "LIVE" dot is real
```

CloudEvent shape, mirroring `schemas/catalog-event-data.schema.json`:

```jsonc
{
  "specversion": "1.0",
  "type": "io.elliott.cluster.event",
  "source": "/k8s/prod-eu-west-1",
  "subject": "Pod/payments-api/checkout-api-7d9f-gx88w",
  "time": "2026-04-28T22:15:03Z",
  "datacontenttype": "application/json",
  "dataschema": "https://elliott.local/schemas/cluster-event/v1.json",
  "data": {
    "cluster": "prod-eu-west-1",
    "namespace": "payments",
    "kind": "Pod",
    "name": "checkout-api-7d9f-gx88w",
    "reason": "Unhealthy",
    "type": "Warning",
    "message": "Readiness probe failed: HTTP 503 from /healthz",
    "occurredAt": "2026-04-28T22:15:03Z"
  }
}
```

The informer sits in `platform-feeds` and produces; another consumer
(or the same plugin in a different mode) materialises the buffer and
serves the API. Same trick the catalog-event-bridge / ops-controller
pair pulls.

Cost: ~2–3 days on top of Phase 1, mostly informer reconnect logic +
NSQ wiring. Well-trodden ground for this codebase.

## Specific UI choices to make

A few decisions in the mock that affect implementation:

1. **`KUBECTL CONTEXT ▼` button.** What does it do?
   - Option A: dropdown listing cluster names; clicking copies
     `kubectl config use-context <name>` to clipboard.
   - Option B: dropdown that downloads a kubeconfig snippet for the
     selected cluster (more useful but requires `plugin-kubernetes-backend`
     to expose a kubeconfig-export endpoint, which it doesn't today).
   - Option C: opens the cluster's web console (EKS console, GKE
     console, etc.) — boring but always-correct.

   Default to A. C as a secondary action ("open in console") on each
   table row.

2. **`Top namespaces · prod-eu-west-1` cluster selector.** Implicit in
   the mock — there's no visible dropdown, just the suffix. Options:
   - Click a row in the Clusters table → focuses Top Namespaces +
     scopes Fleet Events to that cluster.
   - Default to the cluster with the most pods.
   - Persist the selection in localStorage.

   Suggest all three: clickable rows + sensible default + persistence.

3. **Fleet events filter — "WARNINGS · 3" in the header.** The events
   shown are mostly `Normal` (`SuccessfulCreate`, `Pulled`, `Started`)
   despite the count claiming 3 warnings. Either:
   - The count refers to **all** clusters, while the listed events are
     a recent timeline including normals (more useful — shows context).
   - The count refers to filtered warnings only and the screenshot is
     inconsistent.

   Go with the first interpretation: show a chronological feed,
   surface the warning count separately. Toggle to filter to
   warnings-only.

4. **Drill-in.** Clicking a cluster row → cluster detail page (out of
   scope for this doc; just keep the route open at
   `/kubernetes/clusters/{name}`).

## Open questions

1. **Cluster count ceiling.** 5 clusters today, what's the realistic
   maximum at this org? The polling-based design comfortably handles
   ~30 clusters. Beyond that, push (Phase 3) becomes mandatory rather
   than nice-to-have.
2. **RBAC for the platform-feeds service account.** The aggregator
   needs `list pods` / `list events` / `list nodes` cluster-wide on
   every cluster. Confirm there's an SRE-blessed cluster role we can
   bind to, rather than minting a new one per cluster.
3. **Multi-tenant view.** Should non-admin users see all clusters, or
   only clusters that own components they own? Probably "all" for v1;
   re-evaluate if the org grows.
4. **Provider detection.** Is `EKS`/`GKE`/`AKS`/`k3s` derivable from
   `authProvider` in cluster config, or always explicit in the
   `elliott.provider` annotation? Probably explicit — avoids false
   labels.
5. **Where do node taints / cordoned nodes show up?** Not in the mock.
   Worth adding to the cluster status rollup (cordoned nodes ≥1 →
   `degraded`)? Likely yes, defer to a UI tweak after Phase 1 lands.

## What lands when

- **Step 1 (anywhere):** Phase 0. Page extension at `/kubernetes`,
  widgets composed, `ClusterFleetApi` mock returning the screenshot
  data. Sidebar already routes here. ~45 min.
- **Step 2 (at work, with cluster credentials):** Phase 1. ~3–4 days.
- **Step 3 (when there's appetite, or volume forces it):** Phase
  2/3 — informer-backed event stream, optionally federated through
  NSQ to match the wider house style.

## Pointers

- Existing per-entity k8s plugin (don't replace, sits alongside):
  `@backstage/plugin-kubernetes` (frontend) +
  `@backstage/plugin-kubernetes-backend`
- Companion designs sharing the `platform-feeds` backend plugin:
  - `docs/design/recent-deploys-widget.md`
  - `docs/design/oncall-widget.md`
  - `docs/design/service-status-widget.md`
- Wire-format conventions for Phase 3:
  `schemas/README.md`,
  `schemas/catalog-event-data.schema.json`,
  `plugins/catalog-event-bridge-backend/` (template)
- Existing demo k8s wiring you'd reuse for testing locally:
  `examples/podinfo-k8s.yaml`, `examples/podinfo.k8s.yaml`

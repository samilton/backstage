# Recent Deploys widget — design notes

Status: **draft, not implemented.** Captures the plan for replacing the
hardcoded list in `packages/app/src/modules/home/widgets/RecentDeploys.tsx`
with a real merged feed from GitHub Actions and Octopus Deploy.

Owner: sam · drafted 2026-04-28.

## Context

The home page has a "Recent deploys" card that today renders six static
rows. Real data needs to come from two sources we already operate:

- **GitHub Actions** (cloud) — workflow runs per repo, scoped per
  component via `github.com/project-slug`.
- **Octopus Deploy** (self-hosted) — deployments, scoped per component
  via space + project.

The widget is global (one feed across all components the viewer cares
about), not per-entity, which is why the existing community plugins
(`@backstage-community/plugin-github-actions`,
`@backstage-community/plugin-octopus-deploy`) don't fit — they're
designed for entity overview cards, not aggregation.

## Annotation contract

Pick the keys before any fetch code lands. Proposed:

```yaml
metadata:
  annotations:
    # Hint, not a hard switch — if both annotation sets below are present,
    # both sources are fetched. Comma-separated list. Allowed values:
    # "github-actions", "octopus".
    elliott.io/deploy-method: octopus,github-actions

    # Optional: only count deploys to this environment in the home feed.
    # If omitted, all environments are included and the env shown is
    # whatever the source reports.
    elliott.io/deploy-environment: production

    # GitHub side — already a Backstage standard, reuse it
    github.com/project-slug: my-org/orders-service

    # Octopus side — new, keys are ours
    octopus.com/space-id: Spaces-1
    octopus.com/project-slug: orders-service
    # Optional, only when we have multiple Octopus instances:
    # octopus.com/instance: octo-prod
```

Rules:

1. `deploy-method` is informational. The fetch logic branches on which
   `octopus.com/*` and `github.com/*` annotations are present, not on
   the hint. The hint exists so people grepping YAML can see at a glance
   which path is in play.
2. Components with no deploy annotations are skipped entirely (they
   never appear in the feed, no error).
3. `elliott.io/deploy-environment` is a filter applied after fetch. We
   don't try to push it down into the source query because GH Actions
   environments and Octopus environments don't always line up by name.

Open questions to resolve at work:

- **Octopus URL pattern.** One instance with multiple Spaces, or
  multiple instances? The current annotation set assumes the former. If
  it's the latter, add `octopus.com/instance` and let backend config
  map instance name → base URL + API key.
- **GH Actions filter semantics.** Three flavours, pick one:
  - (a) any successful workflow run on the default branch
  - (b) workflow runs whose name matches `deploy-*`
  - (c) workflow runs that wrote a GitHub `Deployment` to a named
    environment (cleanest, but assumes discipline)

  Default to (c) when an environment is set, fall back to (a) otherwise.

## Data model

Whatever path we pick, the frontend contract is the same. One row in the
"Recent deploys" widget:

```ts
type Deploy = {
  id: string;              // stable across sources, used as React key + dedup
  service: string;         // entity.metadata.name
  env: string;             // 'prod' | 'staging' | …  (free-form, source-reported)
  status: 'succeeded' | 'rolling-back' | 'failed' | 'in-progress';
  finishedAt: string;      // RFC3339
  source: 'github-actions' | 'octopus';
  url: string;             // deep link back to the source UI
};
```

The widget renders these in descending `finishedAt` order, max 6.
`ago` (`-4m`, `-11m`, …) is computed at render time from `finishedAt` so
it stays live without re-fetch.

## Status mapping

| Source         | Source value     | Normalized       |
|----------------|------------------|------------------|
| GitHub Actions | `success`        | `succeeded`      |
| GitHub Actions | `failure`        | `failed`         |
| GitHub Actions | `cancelled`      | `failed`         |
| GitHub Actions | `in_progress`    | `in-progress`    |
| Octopus        | `Success`        | `succeeded`      |
| Octopus        | `Failed`         | `failed`         |
| Octopus        | `Canceled`       | `failed`         |
| Octopus        | `TimedOut`       | `failed`         |
| Octopus        | `Executing`      | `in-progress`    |

`rolling-back` is reserved for an explicit Octopus rollback deployment
or a GH Actions revert run — TBD which signal we use, not in the first
cut.

## Phased plan

### Phase 0 — annotation contract + frontend seam (~30 min)

- Codify the annotations above in this doc (done).
- Add a `DeploysApi` ApiRef on the frontend with one method:

  ```ts
  interface DeploysApi {
    recent(opts?: { limit?: number }): Promise<Deploy[]>;
  }
  ```

- Register a **mock implementation** that returns the current static
  rows so the widget keeps working.
- Update `RecentDeploys.tsx` to call `useApi(deploysApiRef).recent({ limit: 6 })`
  instead of importing the static array.

This phase is the "do nothing real but make the seam typed" step. It
unblocks YAML changes (people can start adding annotations) and means
phase 2/3 swap implementations without touching the widget.

### Phase 1 — frontend-only via Backstage proxy (skipped)

Possible but **not recommended**. Reasoning:

- Octopus API key would sit in `app-config.yaml` proxy headers. Fine
  operationally, but it means every browser session fans out to Octopus
  with the same service-account credentials. No per-user scoping.
- N catalog entities × 2 sources = 2N outbound requests per home page
  render. Fine at 30 components, painful at 300.
- No server-side caching. Every reload hits Octopus.
- Every Phase 1 frontend in the wild ends up rewritten as Phase 2
  within a month.

If we ever do ship this, it's `proxy.endpoints./octopus` in
`app-config.yaml` plus a `DeploysApi` impl that fans out from the
browser. Rough effort: half a day. Listed here only because it'll come
up in review and we want a written reason for skipping it.

### Phase 2 — backend aggregator (~1–2 days)

New backend plugin. Sketch:

```
packages/backend-plugins/deploys/
├── src/
│   ├── plugin.ts        # createBackendPlugin → /api/deploys/*
│   ├── router.ts        # GET /recent?limit=20[&env=production]
│   ├── adapters/
│   │   ├── github.ts    # @octokit/rest, GitHub App or PAT
│   │   └── octopus.ts   # plain fetch + X-Octopus-ApiKey
│   ├── catalog.ts       # walk catalog server-side, read annotations
│   ├── cache.ts         # in-memory, TTL=60s, keyed by (limit, env)
│   └── types.ts         # Deploy (mirrors frontend type)
```

Behaviour:

1. On request, read cached list if fresh.
2. Otherwise: catalog-walk → group entities by source → parallel
   fan-out (capped concurrency, e.g. 10) → normalize → merge → sort →
   slice → cache → return.
3. Errors from one source are logged but don't fail the whole call;
   failed source contributes nothing to the result that round.
4. Frontend `DeploysApi` impl becomes one HTTP call, no fan-out logic.

Config:

```yaml
deploys:
  github:
    # Re-use the integration that's already configured for the catalog
    # location reader. No new auth.
  octopus:
    instances:
      default:
        baseUrl: https://octopus.internal.example.com
        apiKey: ${OCTOPUS_API_KEY}
    # Concurrency cap on outbound fan-out
    maxParallel: 10
    cacheTtlSeconds: 60
```

Cost: ~1–2 days of focused work. Most of it is the two adapters; the
plumbing is small.

**Permissions note.** Phase 2 returns the same merged feed regardless
of caller. Acceptable for an internal-only home page; not acceptable if
we ever expose this externally. When that day comes, filter the catalog
walk by `ownershipEntityRefs` of the calling user.

### Phase 3 — push, not pull (long-term target)

We already have NSQ in this stack and a working CloudEvents wire format
(`schemas/catalog-event-data.schema.json` plus the bridge plugin). The
deploys feed is the same shape of problem.

```
GitHub Actions ─┐                              ┌─ home page widget
                ├─ webhooks ──► ingester ──► NSQ ─► consumer ─► /api/deploys
Octopus Deploy ─┘                  │                   │
                                   │                   └─► signals ─► live updates
                                   └─► CloudEvent on `deploys.events` topic
```

Ingester normalizes webhook payloads into:

```jsonc
{
  "specversion": "1.0",
  "id": "<uuid>",
  "source": "/octopus/Spaces-1" | "/github/{owner}/{repo}",
  "type": "io.elliott.deploy.finished" | ".started" | ".rolled-back",
  "time": "2026-04-29T12:00:00Z",
  "subject": "component:default/orders-service",
  "datacontenttype": "application/json",
  "dataschema": "https://elliott.local/schemas/deploy-event/v1.json",
  "data": {
    "service": "orders-service",
    "env": "production",
    "status": "succeeded",
    "finishedAt": "2026-04-29T11:59:42Z",
    "url": "https://octopus.internal.example.com/app#/Spaces-1/projects/...",
    "source": "octopus"
  }
}
```

Backend consumer keeps a small rolling buffer (last 200 deploys, 24h
TTL) — in-memory is fine, no durability needed; on cold start it
rebuilds by replaying the last hour from each source's REST API. Same
endpoint as Phase 2 (`GET /api/deploys/recent`), just fed differently.

Live updates: the existing `@backstage/plugin-signals` (already in
`packages/app/package.json`) carries the new event to the open home
page, the widget prepends the row, the "LIVE" dot becomes real.

**Why we'd actually go here:**

- It's the natural evolution of the catalog-event-bridge pattern — same
  wire format, same topic shape, same NSQ infrastructure, same
  `ops-controller`-style consumer. Fits the house style.
- Webhook latency from a deploy finishing → row appearing in Backstage
  is ~1s instead of "next time someone refreshes".
- Polling-based fan-out goes away. Octopus and GitHub stop seeing N
  Backstage instances cold-calling them every minute.

**Why not yet:**

- Webhook receivers need a public endpoint (or a tunnel from the
  ingester to Octopus, which is on-prem). Solvable but it's the kind of
  thing that needs a real ops conversation.
- We don't have the volume to justify it from a load standpoint —
  Phase 2's 60s cache covers the home page traffic comfortably.
- Building it before Phase 2 means the home page has no real data for
  longer.

So: Phase 2 first, Phase 3 when there's an excuse.

## What lands when

This doc is the deliverable for the current session. Nothing is
implemented yet on this codebase.

The next time we work on this:

- **Step 1 (anywhere):** annotation reader + typed `DeploysApi` seam +
  mock impl. ~30 min, can land before any work credentials.
- **Step 2 (at work):** real Octopus + GitHub adapters as a backend
  plugin (Phase 2). ~1–2 days.
- **Step 3 (when it's worth it):** webhooks → NSQ → live (Phase 3).

## Pointers

- Existing widget: `packages/app/src/modules/home/widgets/RecentDeploys.tsx`
- Existing event bridge (template for Phase 3):
  `plugins/catalog-event-bridge-backend/`
- Wire-format conventions:
  `schemas/README.md`,
  `schemas/catalog-event-data.schema.json`
- Live updates plugin (already installed):
  `@backstage/plugin-signals` in `packages/app/package.json`

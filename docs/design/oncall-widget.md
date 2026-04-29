# On-Call Now widget — design notes

Status: **draft, not implemented.** Captures the plan for replacing the
hardcoded list in `packages/app/src/modules/home/widgets/OnCallNow.tsx`
with a live feed from Datadog On-Call.

Owner: sam · drafted 2026-04-28.

## Context

The home page has an "On-call now" card that today renders four static
shifts. Real data comes from **Datadog On-Call** (the product formerly
launched in 2024 as the successor to PagerDuty/Opsgenie integrations
inside Datadog).

Compared to the Recent Deploys widget this is a much smaller problem:

| | Recent Deploys | On-Call Now |
|---|---|---|
| Sources | 2 (GH Actions + Octopus) | 1 (Datadog) |
| Per-render fan-out | N components × 2 sources | M teams × 1 source |
| Update frequency | high (deploys mid-day) | low (shifts roll daily-ish) |
| History needed | last ~6 events globally | "right now" snapshot only |
| Live updates worth it | yes (Phase 3 target) | not really — daily polling fine |

So: simpler architecture, less reason to push toward webhook-driven
live updates.

## Datadog On-Call API — what's there

Datadog exposes an On-Call REST surface under `/api/v2/on-call/*`. The
endpoints we'd actually use:

- `GET /api/v2/on-call/schedules` — list all schedules in the org.
- `GET /api/v2/on-call/schedules/{schedule_id}` — schedule details
  including current rotation, layers, members.
- `GET /api/v2/on-call/schedules/{schedule_id}/on-call` — the user
  currently on-call for a schedule (and shift end time).
- `GET /api/v2/on-call/teams/{team_id}` — team metadata; sometimes more
  convenient than schedule-by-schedule lookup.

Auth: standard Datadog API key + application key, sent as
`DD-API-KEY` and `DD-APPLICATION-KEY` headers. **Browser-side calls are
blocked by CORS** and the keys can't sit in client code anyway, so any
implementation must go through Backstage's proxy or a backend plugin.

Caveat worth flagging at implementation time: Datadog On-Call is
relatively new and the API surface has been moving. Pin to whatever
version is GA at the time and re-read the docs before writing the
adapter — endpoint names and response shapes may drift from what's
documented here.

## Annotation contract

The data lives at the **Group** level (a team owns a rotation), with an
optional per-Component override for services with their own pager.

```yaml
# Most common — annotate the Group
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: platform-core
  annotations:
    elliott.io/oncall-source: datadog
    datadog.com/oncall-schedule-id: schedule-abc123
    # Optional, only when the team handle differs from the group name:
    # elliott.io/team-display-name: Platform Core
spec:
  type: team
```

```yaml
# Optional override on a Component when it has its own rotation
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: checkout-api
  annotations:
    datadog.com/oncall-schedule-id: schedule-checkout-prod
spec:
  owner: payments-team
```

Resolution rules:

1. If the Component has `datadog.com/oncall-schedule-id`, use it.
2. Otherwise, walk to `spec.owner` (Group), use that Group's annotation.
3. If neither is set, the team simply doesn't appear in the widget.

The widget is rendered as a **list of teams** (matching the screenshot),
not a list of services. So the home-page query is:

> "For each Group that has an oncall schedule annotation, who's on call
> right now and until when?"

That keeps fan-out at one Datadog call per team (typically 5–15 calls,
not 100+).

## Data model

```ts
type Shift = {
  team: string;            // group name, lowercased — 'platform-core'
  teamDisplayName?: string;// optional pretty form for the kicker
  person: string;          // 'Devi Patel'
  handle: string;          // '@dpatel' (Datadog handle, falls back to email local-part)
  until: string;           // RFC3339; widget renders as 'Tue 09:00'
  scheduleId: string;      // for "View in Datadog" link
  url: string;             // direct deep link to the schedule in DD
  source: 'datadog';
};
```

The widget renders these in stable order — alphabetical by team — so the
list doesn't reshuffle every poll.

## Phased plan

### Phase 0 — annotation contract + frontend seam (~30 min)

Mirror the Deploys widget plan:

- Annotation contract above (this doc) — done.
- Frontend `OnCallApi` ApiRef with one method:

  ```ts
  interface OnCallApi {
    current(): Promise<Shift[]>;
  }
  ```

- Mock implementation that returns the existing four hardcoded rows so
  the widget keeps rendering.
- `OnCallNow.tsx` calls `useApi(oncallApiRef).current()` instead of
  importing the static `SHIFTS` array.

This is the "do nothing real but make the seam typed" step. Lands
without any Datadog credentials.

### Phase 1 — frontend via Backstage proxy (~2–3 hours)

Genuinely viable here in a way it isn't for the Deploys widget. Reasons
this is OK:

- Single source, so no merge logic in the browser.
- Small fan-out (one call per team, ~10 teams).
- Low update frequency — a 5-minute browser-side cache is fine.
- The Datadog API key sitting in the proxy headers is a service-account
  read-only credential anyway; same trust model as the Deploys widget
  case but with much lower request volume.

Steps:

1. `app-config.yaml`:

   ```yaml
   proxy:
     endpoints:
       /datadog:
         target: https://api.datadoghq.com
         headers:
           DD-API-KEY: ${DATADOG_API_KEY}
           DD-APPLICATION-KEY: ${DATADOG_APPLICATION_KEY}
           Accept: application/json
   ```

2. Frontend `OnCallApi` impl:
   - `catalogApi.getEntities({ filter: { kind: 'Group' }, fields: ['metadata.name', 'metadata.annotations'] })`
   - For each annotated group, fetch
     `/api/proxy/datadog/api/v2/on-call/schedules/{id}/on-call`.
   - Normalize, sort, return.
   - Cache in a module-level Map keyed by schedule id, TTL 5 min.

3. Widget swaps mock for real impl.

This is a reasonable shipping target if Phase 2 isn't on the immediate
horizon.

### Phase 2 — backend aggregator (~1 day)

If/when we ship the Deploys backend plugin, the On-Call source folds in
naturally:

```
packages/backend-plugins/oncall/        # or merged into 'platform-feeds'
├── src/
│   ├── plugin.ts        # createBackendPlugin → /api/oncall/*
│   ├── router.ts        # GET /current
│   ├── adapters/
│   │   └── datadog.ts   # fetch + DD-API-KEY / DD-APPLICATION-KEY
│   ├── catalog.ts       # walk Groups, resolve schedule IDs
│   ├── cache.ts         # TTL=300s (5 min) — shifts don't move fast
│   └── types.ts
```

Frontend `OnCallApi` impl becomes one HTTP call. Same shape as Phase 1
but with credentials staying server-side and a shared cache across all
viewers.

Worth doing **at the same time** as the Deploys backend plugin — same
file layout, same catalog-walk pattern, same cache shape. If we end up
with a single `platform-feeds` backend plugin that exposes
`/api/feeds/deploys` and `/api/feeds/oncall`, that's probably the
right packaging.

Cost: ~1 day on top of the deploys plugin if shared, ~1.5 days
standalone.

### Phase 3 — push, not pull

**Probably skip.** Datadog On-Call has webhooks for *paging events*
(someone got paged, escalation triggered, incident resolved) but the
home widget doesn't show those — it shows the static "who's on call
right now" view. Shift transitions happen on a schedule and don't
benefit from sub-second freshness; a 5-minute backend cache is already
overkill.

The one case where push is worth it: if we expand the widget to show
"active page" (red banner: someone is currently being paged for X). At
that point the existing Datadog incident webhooks → NSQ → consumer →
signals path mirrors the Phase 3 deploys plan. That's a separate widget
though, not this one.

## What lands when

Same staging as the Deploys widget:

- **Step 1 (anywhere):** annotation contract + typed `OnCallApi` seam +
  mock impl. ~30 min, no Datadog creds needed.
- **Step 2a (at work):** Phase 1 via proxy if we want it live before
  the backend plugin lands. ~2–3 hours.
- **Step 2b (at work):** roll into the platform-feeds backend plugin
  alongside Deploys.

Step 2a is optional. If the Deploys backend plugin is going to land
within a week or two anyway, skip the proxy and go straight to the
backend implementation — saves having to delete the proxy config later.

## Open questions to resolve at work

1. **Schedule ID vs team ID.** Datadog On-Call lets you key off either.
   Schedule is more precise (a team can have multiple schedules —
   primary, secondary, business-hours). Confirm which one Backstage
   Groups should annotate, and whether we need both.
2. **Shift end time precision.** The widget shows "until Tue 09:00".
   The DD response gives an ISO timestamp; rendering in the viewer's
   timezone is the right default, but confirm with the on-call rotation
   maintainers — some teams prefer UTC for cross-timezone clarity.
3. **Handle vs name vs email.** Datadog stores users with name + email
   + handle. Pick one for the `@dpatel` slot. Handle is nicest when
   present; email local-part is the safe fallback.
4. **Multi-region Datadog.** If the org uses datadoghq.eu (or any
   non-US region), the proxy `target` URL has to vary. Make this a
   single config knob (`datadog.site: datadoghq.com`) rather than
   hardcoding.

## Pointers

- Existing widget: `packages/app/src/modules/home/widgets/OnCallNow.tsx`
- Companion design: `docs/design/recent-deploys-widget.md`
  (same architectural pattern; if both ship together, they share a
  backend plugin and a frontend api-pattern)
- Datadog On-Call docs: https://docs.datadoghq.com/service_management/on-call/
  (reference at implementation time — API has been moving)

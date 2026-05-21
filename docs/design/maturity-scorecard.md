# Maturity Scorecard — design notes

Status: **draft, not implemented.** Captures the plan for adding an
internal maturity scorecard to Backstage that reflects *our* model
(not an off-the-shelf checklist) and highlights services meeting the
bar.

Owner: sam · drafted 2026-05-18.

## Purpose

Surface, per catalog entity, whether the service is hitting our
internal maturity bar across a small set of opinionated dimensions —
including security responsiveness (GHAS) and paved-road adoption
(OIDC / SPIFFE / OPA / K8s). The product is **recognition**, not
policing: a service that hits Gold should look like it, and a service
that doesn't should get a single clear "next step" rather than a wall
of red checks.

### Non-goals

- **Not a generic Backstage scorecard plugin.** We are not shipping a
  reusable open-source thing; the rubric is internal and opinionated.
- **Not a replacement for DORA reporting.** DORA lives next to this,
  not inside it — see "DORA" below.
- **Not a compliance/audit tool.** Failing checks do not page anyone.
  Auditors do not read this. It's a developer-facing nudge surface.
- **Not a leaderboard.** No team-vs-team rankings in v1. We can revisit
  if there's appetite, but it changes the incentives badly.

## Context — what shaped the design

Three things narrowed the option space:

1. **"Highlight services meeting our maturity model"** — this is a
   recognition product, so tiers (Bronze/Silver/Gold) read better than
   raw percentages, and overall = worst-dimension reads better than a
   weighted average that lets you hide weaknesses.
2. **"Not anything cookie cutter"** — rules out using
   `json-rules-engine` for the scoring logic and rules out the default
   `EntityTechInsightsScorecardCard` renderer. We use the tech-insights
   plumbing but write our own engine + UI on top.
3. **"GHAS responsiveness, p50/p90 thresholds"** — the scoring math
   for that dimension is percentile-over-window, not a boolean check.
   Confirms (2) — the off-the-shelf engine doesn't express this
   naturally.

## Architecture

Use `@backstage-community/plugin-tech-insights-*` as the **retrieval
and storage substrate** (scheduled fact retrievers, fact storage,
HTTP API), but supply our own scoring engine and frontend.

```
                  ┌─────────────────────────────────────┐
                  │ catalog entities (Backstage)        │
                  └─────────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
     catalogHygiene         ghasFactRetriever    pavedRoadFactRetriever
     FactRetriever          (GitHub Advanced     (annotations +
     (entity-only)           Security API)        verifier callouts)
              │                   │                   │
              └────────────┬──────┴───────────────────┘
                           ▼
                 tech-insights fact store
                           │
                           ▼
               maturity engine  (our code; rubric-as-data)
                           │
                           ▼
              maturity score store (snapshot + history)
                           │
                           ▼
         frontend: <MaturityBadge /> + <MaturityTab />
```

Why this split:

- **Retrievers** are boring, scheduled, idempotent. Tech-insights is
  good at that; reuse it.
- **Engine** is where opinions live. Single TS module, reviewed like a
  policy doc, not buried in YAML.
- **History** is its own concern; we want trend ("Silver → Gold over
  60 days") and org reports, which tech-insights' fact history alone
  doesn't give us once the rubric changes.

### Why not just tech-insights + jsonfc

Tried that on paper:

| Need | jsonfc fit |
|---|---|
| Boolean check ("has owner") | good |
| Percentile ("Critical p50 ≤ 24h") | awkward — would have to pre-compute and feed in as a boolean fact, losing the actual value |
| Tiered output (Bronze/Silver/Gold per dimension) | poor — engine is pass/fail per rule |
| "One impactful next step" per entity | impossible — engine doesn't rank failures |
| Declared-vs-verified distinction | not modeled |

So we keep tech-insights for facts and skip jsonfc entirely.

## Dimensions

Confirmed:

1. **Catalog hygiene** — owner set, lifecycle set, techdocs annotation
   present, tags non-empty, links to runbook / dashboard.
2. **Security responsiveness** — GHAS p50/p90 time-to-remediate per
   severity, across Dependabot / CodeQL / secret scanning. See "GHAS"
   below.
3. **Paved-road adoption** — runs on K8s, OIDC for user auth, SPIFFE
   for service-to-service, OPA for authz. See "Declared vs verified"
   below.

Tentative (need confirmation when the internal rubric resurfaces):

4. **Operational readiness** — on-call schedule wired up, runbook
   linked, dashboard linked, alert routes configured.
5. **Documentation** — TechDocs builds clean, README present in repo,
   ADRs or design notes for non-trivial services.

Explicitly **not** a dimension:

- **DORA / delivery performance.** Shown alongside, not summed in.
  See "DORA" below.
- **"Has a catalog entry."** This is tautological at the entity level
  (we can only score entities that exist) and meaningful at the org
  level (inventory completeness). Carved out into a separate org-level
  metric, not a per-service dimension.

## Tiers

Per dimension and overall: **`None | Bronze | Silver | Gold`**.

- **None** — not enough signal, or actively failing the basic bar.
- **Bronze** — meets the minimum.
- **Silver** — meets the org's "good" bar.
- **Gold** — exceptional / paved-road-complete.

**Overall = worst dimension.** A service with Gold security but no
owner is not a mature service; an arithmetic mean would let it pretend
to be. This is opinionated and intentional. The UI shows the worst
dimension as the headline so it's obvious what to fix.

## GHAS scoring

GitHub Advanced Security gives three alert streams. They are scored
differently because they behave differently.

| Stream | Metric | Why |
|---|---|---|
| Dependabot | per-severity p50 / p90 time-to-remediate over a rolling 90-day window | volume is high enough for percentiles to be meaningful |
| CodeQL | same as Dependabot, separate thresholds | similar volume profile |
| Secret scanning | **zero open, full stop** | percentiles are wrong here — a leaked secret open for 30 days is not "Silver" |

Tentative thresholds (need product input — placeholders only):

| Severity | Bronze p50 | Silver p50 | Gold p50 | Gold p90 |
|---|---|---|---|---|
| Critical | ≤ 7d | ≤ 72h | ≤ 24h | ≤ 72h |
| High | ≤ 30d | ≤ 14d | ≤ 7d | ≤ 14d |
| Medium | ≤ 90d | ≤ 60d | ≤ 30d | ≤ 60d |
| Low | (untracked) | (untracked) | (untracked) | (untracked) |

Dimension level = worst severity tier. So one open Critical past 7d
caps the whole dimension at None until it's fixed.

Open: do we count *dismissed* alerts as "remediated", and if so do
dismiss-with-reason and dismiss-without-reason count the same? Default
**no** to ungrouped dismissal — only `fixed`, `auto_dismissed`, and
`dismissed` with reason `fix_started` / `no_bandwidth` / `tolerable_risk`
count, and "won't fix without reason" does not.

## Declared vs verified — the key design decision

Several internal signals can't be derived from `catalog-info.yaml`
alone. We support two levels of confidence:

| Signal | Declared (annotation) | Verified (verifier callout) |
|---|---|---|
| Runs on Kubernetes | `runtime: k8s` | Deployment/Service exists in cluster owned by entity |
| OIDC for user auth | `auth.user: oidc` | OIDC client registered in IdP, keyed by entity name |
| SPIFFE for s2s | `auth.s2s: spiffe` | SPIRE registration entry present |
| OPA for authz | `authz: opa` | OPA bundle registered / sidecar in manifest |

Rules:

- **Declared-only credit caps at Silver.** Self-attestation is worth
  something but not Gold.
- **Gold requires verification.** A verifier fact retriever has to
  observe the real system and agree with the annotation.
- **Verified-without-declaration is fine** and also Gold-eligible —
  some teams just don't fill in annotations.
- **Declared-but-contradicted-by-verifier is None and shows as a
  warning** ("annotation says SPIFFE, SPIRE has no registration").

If we ship v1 with declared-only because the verifiers aren't built
yet: the UI must label the dimension "Self-attested" so we don't lie
about it.

## DORA

Shown as a **peer view**, not a maturity dimension. Reasons:

- DORA measures the team/system; maturity measures the service. A
  team can be Elite while running an unowned, undocumented service.
- DORA is *outcomes of practices*; maturity is *practices*. Summing
  them double-counts.
- Per-service DORA is statistically weak for low-traffic services
  (one bad week dominates ~24 deploys/year).

UI: separate `<DoraCard />` on the entity page, clearly labeled with
its own Elite/High/Medium/Low tier. No arithmetic between DORA and
maturity. If we ever want a single composite badge, maturity is
primary and DORA is a context modifier ("Gold maturity · Elite
delivery").

For v1 we may use `C2L2C/backstage-plugin-dora-metrics` (client-side
from GitHub PRs, no backend) as the DORA panel and replace it later
with a proper retriever if we outgrow it.

## Rubric data model

The rubric lives in one TypeScript module so it can be reviewed like
a policy doc:

```ts
type Level = 'None' | 'Bronze' | 'Silver' | 'Gold';
type Source = 'declared' | 'verified' | 'computed';

type DimensionResult = {
  level: Level;
  evidence: string;          // human-readable: "Critical p50 = 18h (≤24h ✓)"
  nextStep?: string;         // single most impactful action
  source: Source;
};

type Dimension = {
  id: string;                // 'security-responsiveness'
  title: string;
  evaluate: (facts: FactBag) => DimensionResult;
};

const rubric: Dimension[] = [
  catalogHygiene,
  securityResponsiveness,
  pavedRoadAdoption,
  // operationalReadiness, documentation — pending rubric confirmation
];

const overall = (dims: DimensionResult[]): Level =>
  dims.reduce(worstLevel, 'Gold');
```

Each dimension returns one `nextStep`. The UI aggregates by picking
the next step from the worst dimension — one prompt per entity, not a
backlog.

## Storage

Two tables, owned by a small backend plugin (`maturity-scorecard-backend`):

```
maturity_score_current
  entity_ref         text primary key
  overall_level      text
  computed_at        timestamptz
  rubric_version     text
  payload_json       jsonb       -- DimensionResult[] for rendering

maturity_score_history
  entity_ref         text
  overall_level      text
  computed_at        timestamptz
  rubric_version     text
  payload_json       jsonb
  primary key (entity_ref, computed_at)
```

`rubric_version` is a hash of the rubric module, so changes to the
scoring logic produce a new row rather than overwriting history under
old rules.

Facts themselves live in tech-insights' tables; we don't duplicate.

## Refresh model

- **Scheduled (baseline):** tech-insights cron runs each retriever on
  its own cadence (catalog: 1h, GHAS: 6h, paved-road verifiers: 12h).
  After each retriever completes, recompute scores for affected
  entities.
- **Event-driven (nice-to-have, fits our stack):** subscribe to
  `catalog.events` on NSQ (we already produce these — see
  `backstage/plugins/catalog-event-bridge-backend/`) and recompute the
  hygiene dimension on every `entity.changed`. GHAS via GitHub webhook
  → NSQ → recompute, eventually. Scheduled retrievers remain as a
  backstop.

Event-driven recompute is **out of scope for v1**. Scheduled is good
enough to ship; we add events when latency matters.

## Frontend surfaces

| Surface | Purpose | Component |
|---|---|---|
| Entity overview | At-a-glance tier + worst-dim next step | `<MaturityBadge />` card |
| Entity tab | Per-dimension breakdown with evidence | `<MaturityTab />` route |
| Catalog table column | Sort/filter by tier | tier chip cell |
| Org-level page | Tier distribution, inventory completeness | `<MaturityOverviewPage />` (later) |

Explicitly **not** reusing `EntityTechInsightsScorecardCard` — its
boolean-check UX is wrong for tiered/qualitative results.

## Phased delivery

Each slice is independently shippable and visible to users.

- **Slice 1 — Wiring + catalog hygiene only.** Backend plugin + one
  retriever (catalog-only, no external calls) + engine with one
  dimension + `<MaturityBadge />` on entity overview. Proves the
  pipeline end-to-end. ~1–2 days.
- **Slice 2 — GHAS dimension.** Add `ghasFactRetriever`, the
  `securityResponsiveness` dimension, the per-severity threshold
  config. ~2–3 days incl. talking to GitHub Advanced Security API.
- **Slice 3 — Paved road, declared only.** Annotation-based retriever
  for OIDC/SPIFFE/OPA/K8s; dimension capped at Silver.
- **Slice 4 — Paved road verifiers.** SPIRE / IdP / cluster verifier
  callouts unlock Gold on the dimension. Likely the biggest slice;
  may itself be split per verifier.
- **Slice 5 — DORA panel.** Sibling card, not a dimension. Probably
  drop in `C2L2C/backstage-plugin-dora-metrics` first.
- **Slice 6 — History + trend UI + org overview.** Once enough
  snapshots accumulate to be interesting.

## Plugin layout (proposed)

Two new plugins in the existing workspace:

```
plugins/
  maturity-scorecard/                  # frontend
    src/
      components/
        MaturityBadge/                 # entity overview card
        MaturityTab/                   # entity tab content
      api/
        MaturityClient.ts              # talks to backend
      rubric/                          # types only on the frontend
  maturity-scorecard-backend/          # backend
    src/
      retrievers/
        catalogHygiene.ts
        ghas.ts
        pavedRoadDeclared.ts
        pavedRoadVerifiers/            # one file per verifier
      engine/
        rubric.ts                      # the policy module
        dimensions/
          catalogHygiene.ts
          securityResponsiveness.ts
          pavedRoadAdoption.ts
      storage/
        migrations/
        scores.ts
      router.ts
      plugin.ts
```

Both stay internal to this workspace; no separate repo.

## Open questions (to revisit)

1. **Internal rubric document.** Owner has it but it isn't in this
   workspace. Need to paste it in (or link it) and reconcile against
   the dimensions/tiers above. Most likely outcome: confirm three of
   ours, add 1–2 we missed, adjust thresholds.
2. **Confirmed GHAS thresholds per severity.** Table above is
   placeholder. Need security team sign-off.
3. **Dismissal semantics for GHAS.** Which dismissal reasons count as
   "remediated"? Tentative answer above; needs confirmation.
4. **Which entity kinds get scored?** Defaulting to `Component`
   (`spec.type=service|website`). Should `Resource` and `API` also
   get a (possibly different) rubric? Namespaces in our
   ops-controller flow are `Resource`s — they probably want their
   own narrow rubric.
5. **Operational-readiness and documentation dimensions.** Pending
   rubric confirmation.
6. **Overall = worst-dimension** — confirm this stays. Reasonable
   alternative: worst-dimension for headline tier, but allow a
   service to be "Gold-eligible" badge if all-but-one dimension is
   Gold, as an aspiration signal.
7. **Visibility of None services.** Do we hide the badge entirely for
   services with no signal, or show "Unranked" prominently? The
   recognition framing argues for hiding; the "drive adoption"
   framing argues for showing.
8. **Verifier ownership.** Who runs / maintains the OPA / SPIRE / IdP
   verifier integrations? Each one is a small but real ops
   commitment.

## Decisions made so far

Captured here so we don't relitigate when we pick this back up.

- **2026-05-18 — Use tech-insights as substrate, not as the whole
  solution.** Custom engine and UI on top; no jsonfc.
- **2026-05-18 — Tiered scoring (None/Bronze/Silver/Gold), not
  numeric.** Per dimension and overall.
- **2026-05-18 — Overall = worst dimension.** Not weighted average.
- **2026-05-18 — DORA is a peer view, not a maturity dimension.**
- **2026-05-18 — Recognition framing, not policing.** No paging, no
  leaderboards in v1.
- **2026-05-18 — Declared vs verified is a first-class distinction.**
  Declared caps at Silver; Gold requires a verifier. UI must label
  declared-only state explicitly.
- **2026-05-18 — "Has a catalog entry" is org-level, not per-entity.**
- **2026-05-18 — One `nextStep` per entity in the UI**, drawn from the
  worst dimension. No backlog of red checks.
- **2026-05-18 — Scheduled refresh in v1.** Event-driven recompute via
  the existing NSQ event bridge is a follow-up, not a launch blocker.
- **2026-05-18 — Internal-only plugins**, living alongside the others
  in `plugins/`. Not published.

## Pointers

- Event bridge (potential future event-driven recompute source):
  `plugins/catalog-event-bridge-backend/`. Wire format:
  `schemas/README.md`.
- Existing entity-page widgets (style reference for `<MaturityBadge />`):
  `packages/app/src/modules/home/widgets/`, plus the design notes for
  `oncall-widget.md`, `recent-deploys-widget.md`,
  `service-status-widget.md`.
- Tech-insights packages (substrate):
  - `@backstage-community/plugin-tech-insights-backend`
  - `@backstage-community/plugin-tech-insights-node` (extension points)
  - `@backstage-community/plugin-tech-insights-common` (shared types)
- Reference scorecard implementations consulted (not adopted, kept
  for shape ideas):
  - `@oriflame/backstage-plugin-score-card` — review-process model.
  - `@red-hat-developer-hub/backstage-plugin-scorecard-backend` —
    metric-provider model with thresholds.
  - `@cortexapps/backstage-plugin` — SaaS reference for the
    interaction patterns we want to match.

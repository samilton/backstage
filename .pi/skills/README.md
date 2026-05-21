# Backstage Skills

Skills are loaded on-demand by agents (especially `engineer`, `planner`, and
the reviewers). Each is a single `.md` file with a one-line frontmatter
description; pi's progressive disclosure means agents see the description
list first and pull the full body only when relevant.

## Stubs to fill in (in priority order)

- `backstage-plugin.md` — how to create a new plugin in this monorepo:
  scaffolding, package layout, frontend/backend split, extension points,
  routing conventions, what to register in `packages/app/src/App.tsx`.
- `backstage-catalog.md` — entity model, catalog processors,
  `catalog-info.yaml` conventions, internal entity kinds we've added,
  custom annotations.
- `backstage-scaffolder.md` — templates, custom actions, how we wire
  scaffolder actions to internal systems, signing/audit requirements.
- `permissions.md` — our use of the Backstage permission framework,
  Entra ID claim mapping, OPA bundle integration for fine-grained ABAC.
- `theming-and-components.md` — internal design system, when to use
  `@backstage/core-components` vs custom, accessibility checklist.
- `testing.md` — jest setup, testRenderer patterns, MSW for API mocks,
  what `yarn test` actually runs in CI.

## Format

```markdown
---
description: One line, ~15 words, tells agents when this skill applies
---

# Skill body
...
```

# Backstage Skills

Skills are how we give agents Backstage-specific knowledge without
burning context preloading it. Pi exposes only each skill's
`name` + `description` to the system prompt at startup; the agent
reads the full `SKILL.md` body via the `read` tool only when the
task matches. Cost is a few dozen tokens per skill until it's
actually needed.

## Structure

A skill is a **directory** with a `SKILL.md`, not a single file.
Everything else is optional and freeform:

```
.pi/skills/
└── backstage-plugin/
    ├── SKILL.md       # required: frontmatter + instructions
    ├── scripts/       # optional: helper scripts the agent can run
    ├── references/    # optional: long-form docs the SKILL.md links to
    └── assets/        # optional: templates, JSON schemas, snippets
```

The directory name is the skill name pi shows in the system prompt
and the slug for `/skill:backstage-plugin` invocations.

## SKILL.md format

```markdown
---
name: backstage-plugin
description: >-
  How to create a new plugin in this Backstage monorepo: package
  layout, frontend/backend split, extension points, app
  registration. Load when the task involves adding a new plugin
  or significantly extending one.
---

# Backstage Plugin Skill

## When to use this skill
...

## Conventions in this repo
...

## Step-by-step
1. ...

## Common pitfalls
...

## Templates
See `assets/plugin-skeleton/` for the starter we use.
```

The description is the most important line in the whole skill — it's
the only part the agent sees by default. Write it like the trigger
condition you'd want to fire on, with enough nouns and verbs that
matching is unambiguous. Vague descriptions ("about plugins") get
loaded when they shouldn't and ignored when they should.

## Authoring rules of thumb

- **One topic per skill.** If you're tempted to write
  `backstage-everything.md`, split it. Smaller skills load only
  when relevant; one big one is always-on dead weight or
  never-on dark matter.
- **Aim for ~200–400 lines in the body.** Longer than that, push
  detail into `references/*.md` and link from `SKILL.md`. The
  agent will read the references only if it needs them.
- **Anchor in real code.** Link to specific files in this repo
  (`packages/app/src/App.tsx`, `plugins/<example>/package.json`).
  An agent can `read` them; a description in the abstract is
  guesswork.
- **State the "done" check.** End each skill with what the agent
  should be able to verify (`yarn workspaces info`,
  `yarn tsc --noEmit`, a specific test passing) so it knows when
  to stop.

## Skills to build, in priority order

Each entry is a skill directory to create. The bullet points are
the contract — what an agent loading this skill should walk away
knowing.

### 1. `backstage-plugin/`
The single highest-leverage skill. Without it, the engineer
guesses at plugin structure every run.
- Monorepo layout: `plugins/*`, `packages/app`, `packages/backend`,
  who depends on whom.
- New-plugin scaffolding: which `backstage-cli new` template (or
  internal template) we use, what it generates, what to delete.
- Frontend plugin anatomy: `plugin.ts`, `routes.ts`, extensions,
  `index.ts` exports.
- Backend plugin anatomy: router factory, service registration,
  the new backend system specifically (not legacy).
- App registration: where to wire routes in `packages/app`,
  permission policy hooks, sidebar entries.
- Build/test commands the engineer should run before declaring
  done.

### 2. `backstage-catalog/`
- Entity model: `Component`, `API`, `Resource`, `System`,
  `Domain`, plus any internal kinds we've added.
- `catalog-info.yaml` conventions and required annotations
  (ownership, lifecycle, internal tags).
- Catalog processors and entity providers: when to write one,
  where they're registered, how to test.
- Relationships and how to model them without abusing tags.

### 3. `permissions/`
- The Backstage permissions framework, our specific use of it.
- Entra ID claim mapping into Backstage identity.
- OPA bundle integration for fine-grained ABAC (links to the
  existing OPA work).
- How to add a permission check to a new route, frontend and
  backend. Anti-patterns (frontend-only gating).

### 4. `backstage-scaffolder/`
- Template anatomy and the registry we maintain.
- Custom actions: how to write one, where they live, signing
  and audit requirements.
- Inputs/outputs, secrets handling, the approval flow if any.
- Testing actions locally before merging.

### 5. `theming-and-components/`
- `@backstage/core-components` — what's available and when to
  reach for it before custom.
- Internal design system additions, where they live.
- Material-UI v5 conventions, theme overrides, dark mode.
- Accessibility checklist (focus management, ARIA, color
  contrast, keyboard nav).

### 6. `testing/`
- Jest setup specific to Backstage workspaces.
- `TestApiProvider`, `renderInTestApp`, the helpers we use most.
- MSW for API mocking, where the handlers live.
- What `yarn test` actually runs in CI vs locally, and the
  smallest command that proves a single plugin is green.

## After the first skill exists

Once `backstage-plugin/` is real, update the `engineer` agent's
body to mention it explicitly so the agent knows to load it for
plugin work, not just hope the description matches. Same for each
subsequent skill — the orchestrator-side mention is what makes
loading reliable, not just the description.

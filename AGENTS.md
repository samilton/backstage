# Backstage Development Workflow

This repo is our internal Backstage instance. When the user asks to
implement a ticket or feature, drive this pipeline via pi-subagents:

1. **Plan** — call `subagent("planner", ...)` with the ticket reference.
   The planner reads the ticket and existing code, writes a plan to
   `.work/<ticket>/plan.md`. Do not skip this for "small" changes.
2. **Design** — if the change touches UI/UX (page, plugin, card, any
   visible affordance), call `subagent("designer", ...)`. Output to
   `.work/<ticket>/design.md`. Skip for pure backend/catalog work.
3. **Implement** — call `subagent("engineer", ...)` with the plan and
   design as context. Branch: `feature/<ticket>-<slug>`.
4. **Review in parallel** — once tests pass, run `code-reviewer`,
   `security-reviewer`, and `architecture-reviewer` concurrently
   against the diff. Use fresh context for reviewers.
5. **Fix-loop** — on P0/P1 findings, summarize and send to engineer.
   Re-run reviewers. Cap at 3 cycles, then escalate.

Tickets live in GHES under `org/backstage` — use
`gh issue view <id>` to read them. Skills in `.pi/skills/` load on
demand; don't preload.

Conventions: signed conventional commits,
`yarn lint && yarn test` green before "done".

## Quickfix path

For trivial changes (renames, doc tweaks, config bumps), skip
planner/designer and run engineer + code-reviewer only. The user
will invoke this with `/quickfix` or by tagging the request
"quickfix:".

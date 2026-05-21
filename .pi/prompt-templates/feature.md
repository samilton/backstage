---
description: Implement a feature from a GHES ticket end-to-end
---
Implement ticket {{args}} end-to-end:
planner → designer (if UI) → engineer → parallel(code-reviewer,
security-reviewer, architecture-reviewer) → fix loop.

Stop and ask me only if: (a) ticket is genuinely ambiguous after
the planner runs, (b) two reviewers disagree on a P0, or (c) the
fix loop hits 3 cycles.

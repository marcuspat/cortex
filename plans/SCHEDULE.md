/schedule

Read BRANCH_ANALYSIS.md and the current working tree. Produce PHASE_PLAN.md
that sequences every remaining phase needed to land a green, committed,
CI-verified main through the end of Phase 4 (Vitest + RTL + GitHub Actions).

Ground rules:
- Do NOT modify source, install packages, or run migrations during /schedule.
  Read-only except for writing PHASE_PLAN.md.
- Every phase must have: id, title, depends_on, est_minutes, acceptance
  (bulleted, objectively checkable), rollback_hint, status=TODO.
- Order phases by hard dependency, not convenience. If Phase B needs Phase A's
  output, say so explicitly in depends_on.
- Flag any phase that needs a human decision as status=NEEDS_INPUT with the
  exact question in a `question:` field. Do not guess past blockers.

Required phase coverage (expand/split as needed, don't collapse):

P0  Baseline audit        — confirm tree state, list the 12 staged files,
                            note Prisma version pinned vs required, identify
                            the .gitignore conflict precisely (which paths).
P1  Dependency install    — npm install clean; if lockfile drift, regenerate;
                            record any peer-dep warnings for later phases.
P2  Prisma 7 resolution   — either (a) downgrade to last-compatible minor and
                            document why, or (b) migrate schema + generated
                            client to P7 API. Pick ONE, justify in the phase
                            body, include rollback.
P3  .gitignore resolution — reconcile the conflict; verify no secrets / build
                            artifacts / .env* will be committed; `git status`
                            must be intentional before commit.
P4  Initial commit        — commit the 12 staged files in logical chunks
                            (infra, schema, routes, config) with conventional
                            commit messages. Not one mega-commit.
P5  Vitest + RTL setup    — install, vitest.config, test setup file, jsdom
                            env, coverage provider (v8), npm scripts.
P6  First API route test  — pick the highest-traffic route, write a real test
                            (happy path + one failure mode), not a smoke test.
                            Must fail meaningfully if the route breaks.
P7  GitHub Actions CI     — .github/workflows/ci.yml: install, typecheck,
                            lint, test, coverage artifact. Matrix Node LTS
                            only. Cache npm. Must pass on a pushed branch
                            before merging back.
P8  Final verification    — full green run locally + CI, coverage report
                            committed or artifacted, PHASE_PLAN.md all DONE.

Output: write PHASE_PLAN.md to repo root. Then print a one-screen summary:
total phases, total est_minutes, any NEEDS_INPUT blockers. Stop.
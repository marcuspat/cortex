/loop

Execute PHASE_PLAN.md autonomously until every phase is DONE or a phase flips
to NEEDS_INPUT. Follow the loop contract below exactly — no shortcuts, no
reordering, no batching across phase boundaries.

LOOP CONTRACT (repeat until exit condition):

  1. SELECT
     - Read PHASE_PLAN.md. Pick the first phase where status=TODO and all
       depends_on are DONE. If none exist, go to EXIT.
     - Announce: "▶ Starting P<id>: <title> (est <n>m)".

  2. PLAN
     - Restate the acceptance criteria for this phase in your own words.
     - List the concrete file/command changes you expect to make.
     - If the plan requires a decision not covered by acceptance criteria,
       flip this phase to NEEDS_INPUT, write the question into PHASE_PLAN.md,
       and go to EXIT. Do not guess.

  3. EXECUTE
     - Make the changes. Keep diffs scoped to this phase only.
     - Run whatever local check the phase implies (typecheck, build, test,
       `git status`, etc.). Capture output.

  4. VERIFY
     - Walk the acceptance bullets one by one. For each, state PASS or FAIL
       with the evidence (command output, file path, diff summary).
     - If any bullet is FAIL: attempt up to 2 targeted fixes within this
       phase. On the 3rd failure, flip status=BLOCKED, write the failure
       mode into PHASE_PLAN.md, and go to EXIT.

  5. COMMIT
     - Commit the phase's changes with a conventional-commit message
       referencing the phase id (e.g. `chore(p1): npm install clean`).
     - P4 is the exception — it produces multiple commits by design.

  6. UPDATE
     - Mark phase status=DONE in PHASE_PLAN.md with a timestamp and the
       commit SHA(s). Save the file.

  7. LOG
     - Print one line: "✓ P<id> done in <actual>m (est <n>m)".
     - Return to SELECT.

EXIT CONDITIONS (any one triggers stop):
  - All phases DONE → print final summary: total time, commits made, test
    count, coverage %, CI status URL if pushed. Then stop.
  - A phase is NEEDS_INPUT or BLOCKED → print the phase id, the question or
    failure mode, and what you tried. Then stop. Do NOT skip past it to
    later phases.

HARD RULES:
  - Never amend or force-push commits from earlier phases.
  - Never install packages outside the phase that owns the install.
  - Never mark a phase DONE if any acceptance bullet is FAIL or SKIPPED.
  - If you notice a problem outside the current phase's scope, write it
    into PHASE_PLAN.md as a new phase appended at the end with
    depends_on=[current], status=TODO. Do not fix it inline.
  - `git status` must be clean (no stray untracked files) at the end of
    every phase except P0.

Begin at SELECT.
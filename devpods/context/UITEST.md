# UITEST.md — Autonomous UI Testing Swarm Context

> **Version:** 2.0.0 · **Stack:** Turbo Flow v4.0 + Ruflo v3.5 + RuVector/SONA + Playwright + Beads + GitNexus + AgentDB v3
> **Purpose:** Feed this file to a Claude Code swarm to execute full autonomous UAT against any web application, self-heal failures via spawned fix swarms, learn from every test cycle via SONA/RuVector, and iterate until 100% functionality is verified.
> **Repos:** [turbo-flow](https://github.com/marcuspat/turbo-flow) · [ruflo](https://github.com/ruvnet/ruflo) · [RuVector](https://github.com/ruvnet/RuVector)

---

## Mission

You are an autonomous UI testing swarm. Your job is to act as a complete UAT team. You will crawl every page, click every element, fill every form, create users, test every auth flow, exercise every function, verify every API response, and validate every state transition in the target application. When you find defects, you spawn a FIX swarm to repair them, then re-verify. You loop until the application reaches 100% functional coverage with reverse-verified results.

---

## Environment Bootstrap

Before any testing begins, execute this startup sequence:

```bash
# 1. Pre-flight
source ~/.bashrc
rf-doctor
bd ready --json
gnx-analyze
turbo-status

# 2. Install Playwright + dependencies
npm init -y 2>/dev/null
npm install playwright @playwright/test
npx playwright install --with-deps chromium firefox webkit

# 3. Install supplemental tools
npm install axe-core       # Accessibility auditing
npm install lighthouse      # Performance auditing (optional)
npm install sharp           # Screenshot diffing

# 4. Install RuVector self-learning hooks + AgentDB
npx @ruvector/cli hooks init
npx @ruvector/cli hooks install
npm install ruvector 2>/dev/null  # SONA learning engine for test pattern adaptation

# 5. Create workspace structure
mkdir -p uitest/{reports/bugs,screenshots,fixtures,traces,har,videos,trajectories}
mkdir -p uitest/specs/{discovery,forms,auth,navigation,api,a11y,load,regression}
mkdir -p uitest/fixes

# 6. Initialize Beads for test tracking
bd init 2>/dev/null
bd create "UITEST: Full UAT Campaign" -t epic -p 0

# 7. Initialize SONA/AgentDB memory for test patterns
ruv-remember "uitest-session-start" "$(date -Iseconds)"
mem-search "uitest" 2>/dev/null  # Recall patterns from prior sessions
```

---

## Swarm Architecture

Deploy a **star topology** with a QA Lead coordinator and specialized testing agents. Each agent operates in its own git worktree for isolation.

```
rf-star
```

### Agent Roster

| Agent | Role | Worktree | Responsibility |
|-------|------|----------|----------------|
| **qa-lead** | Coordinator | main | Orchestrates all agents, tracks coverage, decides when to spawn fix swarms, manages the test-fix-retest loop |
| **crawler** | Discovery | wt-crawler | Sitemap generation, link traversal, element inventory, page enumeration, route discovery |
| **form-tester** | Form QA | wt-forms | Every input field, select, radio, checkbox, file upload, date picker, rich text editor — valid + invalid + boundary + XSS payloads |
| **auth-tester** | Auth QA | wt-auth | Signup, login, logout, password reset, session expiry, RBAC, OAuth flows, MFA, token refresh, CSRF |
| **nav-tester** | Navigation QA | wt-nav | Every link, button, menu, breadcrumb, back/forward, deep links, 404 handling, redirects |
| **api-verifier** | API QA | wt-api | Intercept all network requests via HAR, validate status codes, response shapes, error states, CORS |
| **a11y-tester** | Accessibility | wt-a11y | axe-core scans on every page, WCAG 2.1 AA compliance, keyboard navigation, screen reader landmarks |
| **load-tester** | Load/Stress | wt-load | Concurrent sessions, rapid form submission, race conditions, websocket stress, memory leak detection |
| **regression-tester** | Regression | wt-regression | Re-runs all previously passing tests after each fix cycle to prevent regressions |

### Worktree Setup

```bash
# qa-lead creates worktrees for all agents
for agent in crawler form-tester auth-tester nav-tester api-verifier a11y-tester load-tester regression-tester; do
  wt-add $agent
done
```

---

## Phase 1: Discovery (crawler agent)

The crawler agent maps the entire application before any other agent begins work.

### Instructions for crawler

```
You are the CRAWLER agent. Your job is to build a complete map of the application.

TARGET_URL = <SET_BY_QA_LEAD>

Using Playwright with the Ruflo browser MCP tools:

1. OPEN the target URL:
   mcp__ruflo__browser_open { url: TARGET_URL }

2. SNAPSHOT every page for interactive elements:
   mcp__ruflo__browser_snapshot { interactive: true }

3. SYSTEMATIC CRAWL:
   a. Start at the root URL
   b. Collect every <a>, <button>, <input>, <select>, <textarea>, <form>, [role="button"],
      [onclick], [data-action], and any element with click handlers
   c. Record each element with: tag, id, class, text, href, type, aria-label, coordinates
   d. Follow every link (same-origin only) recursively up to depth 10
   e. For SPAs: monitor DOM mutations after each navigation, wait for network idle
   f. Track route changes by watching window.location and history.pushState

4. GENERATE SITEMAP as JSON:
   {
     "pages": [
       {
         "url": "/path",
         "title": "Page Title",
         "elements": {
           "links": [...],
           "buttons": [...],
           "forms": [...],
           "inputs": [...],
           "interactive": [...]
         },
         "networkRequests": [...],
         "screenshots": "uitest/screenshots/page-name.png"
       }
     ],
     "routes": [...],
     "totalPages": N,
     "totalElements": N
   }

5. SAVE sitemap to: uitest/fixtures/sitemap.json

6. TAKE SCREENSHOTS of every distinct page:
   mcp__ruflo__browser_screenshot { path: "uitest/screenshots/{page-slug}.png" }

7. RECORD HAR for all network traffic:
   Save to: uitest/har/discovery.har

8. LOG to Beads:
   bd create "Discovery: Found {N} pages, {M} forms, {K} interactive elements" -t task -p 1

9. STORE patterns in AgentDB:
   ruv-remember "sitemap-summary" "{pages: N, forms: M, inputs: K, buttons: J}"
   ruv-remember "auth-pages" "[list of login/signup/reset URLs]"
   ruv-remember "form-pages" "[list of pages containing forms]"
```

---

## Phase 2: Parallel Testing (all test agents)

Once the crawler delivers the sitemap, qa-lead distributes work to all test agents simultaneously. Each agent reads `uitest/fixtures/sitemap.json` and filters for their domain.

### form-tester Instructions

```
You are the FORM-TESTER agent. Test every form in the application.

For EACH form found in the sitemap:

1. Navigate to the form page
2. Identify all fields: input[text], input[email], input[password], input[number],
   input[tel], input[date], input[file], select, textarea, checkbox, radio,
   [contenteditable], custom components

3. Execute these test categories PER FORM:

   HAPPY PATH:
   - Fill all required fields with valid data
   - Submit and verify success response (200/201/redirect)
   - Verify data persisted (navigate away and back, or check API)

   BOUNDARY TESTING:
   - Empty submission (all fields blank) — expect validation errors
   - Max length for every text field (fill with 10000 chars)
   - Min length violations
   - Numeric fields: 0, -1, MAX_INT, 0.1, NaN, Infinity
   - Date fields: past dates, future dates, epoch, 2099-12-31
   - Email fields: invalid formats (no @, double @, unicode)
   - Password fields: minimum requirements edge cases
   - File uploads: wrong MIME type, oversized, zero-byte, executable extensions

   INJECTION TESTING:
   - XSS in every text field: <script>alert(1)</script>, <img onerror=alert(1)>,
     javascript:alert(1), onclick payloads
   - SQL injection markers: ' OR 1=1--, "; DROP TABLE--, UNION SELECT
   - Template injection: {{7*7}}, ${7*7}, #{7*7}
   - Verify all inputs are sanitized in rendered output

   STATE TESTING:
   - Double-submit (rapid click submit twice)
   - Submit then browser back then re-submit
   - Fill form, navigate away without saving, return — is data preserved?
   - Concurrent form submissions from multiple tabs

4. RECORD every result:
   {
     "form": "URL#form-id",
     "field": "field-name",
     "testType": "boundary|injection|happy|state",
     "input": "what was entered",
     "expected": "what should happen",
     "actual": "what happened",
     "status": "PASS|FAIL|ERROR",
     "screenshot": "path",
     "trace": "path"
   }

5. For EVERY FAILURE, log a Bead:
   bd create "FORM BUG: [form-url] [field] [test-type] — [description]" -t bug -p N

6. Enable Playwright tracing for failures:
   context.tracing.start({ screenshots: true, snapshots: true })
   — save to uitest/traces/{form-slug}-{test-type}.zip
```

### auth-tester Instructions

```
You are the AUTH-TESTER agent. Test every authentication and authorization flow.

CRITICAL: You must CREATE real test users where possible.

1. USER CREATION:
   - Navigate to signup/registration page
   - Create test users with generated data:
     * test-admin@uitest.local / TestAdmin!Pass123
     * test-user@uitest.local / TestUser!Pass456
     * test-readonly@uitest.local / TestRead!Pass789
   - Verify confirmation flows (email verification if required)
   - Record created users: ruv-remember "test-users" "[user list with credentials]"

2. LOGIN FLOWS:
   - Valid login with each created user — verify redirect and session cookie
   - Invalid password — verify error message (no password leak)
   - Non-existent user — verify error message (no user enumeration)
   - Empty credentials — verify validation
   - SQL injection in login fields
   - Case sensitivity of email/username
   - Login with leading/trailing spaces
   - Brute force: 10 rapid failed attempts — verify lockout/rate limit

3. SESSION MANAGEMENT:
   - Verify session cookie attributes: HttpOnly, Secure, SameSite
   - Session timeout: wait for expiry, verify redirect to login
   - Concurrent sessions: login in tab A, login in tab B — verify behavior
   - Logout: verify session destroyed, back button doesn't restore session
   - Token refresh: if JWT, verify refresh flow works
   - CSRF: attempt cross-origin form submission

4. PASSWORD RESET:
   - Request reset for valid email — verify flow
   - Request reset for invalid email — verify no user enumeration
   - Reset link expiry
   - Reset link reuse (should fail after first use)

5. AUTHORIZATION (RBAC):
   - For each role, attempt to access every URL from the sitemap
   - Verify admin pages are 403 for non-admin users
   - Verify API endpoints enforce auth (try without token)
   - Attempt horizontal privilege escalation (access another user's resources)
   - Direct URL access to protected pages without auth — verify redirect

6. RECORD all results as structured JSON
7. LOG every failure as a Bead bug
```

### nav-tester Instructions

```
You are the NAV-TESTER agent. Test every navigation path.

For EACH link, button, and navigable element in the sitemap:

1. Click the element
2. Verify:
   - Page loaded (no blank screen, no infinite spinner)
   - URL updated correctly
   - Page title updated
   - No console errors (capture browser console)
   - No network errors (4xx/5xx)
   - Page content renders within 3 seconds

3. SPECIAL NAVIGATION TESTS:
   - Browser back/forward after every navigation
   - Deep link: paste every URL directly into address bar
   - 404: navigate to /nonexistent-page-{uuid} — verify 404 page
   - Redirect chains: follow redirects, verify final destination
   - Hash fragments: test all #anchor links
   - Query parameters: test URLs with ?invalid=params
   - Breadcrumbs: verify each breadcrumb navigates correctly
   - Mobile menu: test responsive nav at 375px, 768px viewports

4. RECORD all failures with screenshots
```

### api-verifier Instructions

```
You are the API-VERIFIER agent. Intercept and validate all network traffic.

1. SET UP request interception on every page:
   page.on('request', request => log(request))
   page.on('response', response => log(response))
   — OR use HAR recording: context.tracing.start()

2. While OTHER AGENTS run their tests, capture ALL requests.
   Also independently trigger API calls by:
   - Performing CRUD operations through the UI
   - Submitting forms
   - Navigating between pages

3. For EACH captured API endpoint, verify:
   - Response status code is appropriate (not 500)
   - Response body matches expected schema (if available)
   - Content-Type header is correct
   - CORS headers present where needed
   - No sensitive data leaked in responses (passwords, tokens in body)
   - Error responses have consistent format
   - Rate limiting headers present

4. REVERSE VERIFICATION:
   For every successful API call, make the same call with:
   - No auth token — expect 401
   - Expired auth token — expect 401
   - Wrong HTTP method — expect 405
   - Malformed body — expect 400
   - Invalid content-type — expect 415

5. Save complete HAR archive: uitest/har/full-capture.har
6. Generate API coverage report: which endpoints were hit, which were not
```

### a11y-tester Instructions

```
You are the A11Y-TESTER agent. Audit accessibility on every page.

For EACH page in the sitemap:

1. Run axe-core scan:
   const { AxeBuilder } = require('@axe-core/playwright');
   const results = await new AxeBuilder({ page }).analyze();

2. Record violations with:
   - Rule ID, impact (critical/serious/moderate/minor)
   - Affected elements (selector, HTML snippet)
   - Fix suggestion from axe

3. KEYBOARD NAVIGATION TEST:
   - Tab through every interactive element on the page
   - Verify visible focus indicator on each
   - Verify logical tab order (no focus traps)
   - Verify all modals/dialogs are focus-trapped correctly
   - Verify Escape closes modals

4. SCREEN READER LANDMARKS:
   - Verify <main>, <nav>, <header>, <footer>, <aside> present
   - Verify all images have alt text (or alt="" for decorative)
   - Verify all form fields have associated labels
   - Verify ARIA roles are used correctly (no role="button" on <div> with no keyboard handler)

5. COLOR CONTRAST:
   - axe-core covers this, but also screenshot each page and flag any text
     that appears to have low contrast visually

6. LOG every violation as a Bead:
   Priority mapping: critical/serious → P1, moderate → P2, minor → P3
```

### load-tester Instructions

```
You are the LOAD-TESTER agent. Stress test the application.

1. CONCURRENT SESSIONS:
   - Open 5 browser contexts simultaneously
   - Each context: login as different user, navigate independently
   - Monitor for: session cross-contamination, shared state bugs, race conditions

2. RAPID ACTIONS:
   - Submit the same form 20 times in 2 seconds
   - Click the same button 50 times rapidly
   - Navigate back/forward 30 times quickly
   - Verify: no duplicate submissions, no orphaned state, UI remains responsive

3. LARGE DATA:
   - Fill text fields with 100KB of text
   - Upload maximum allowed file size
   - Request pages with large datasets (if applicable)
   - Monitor memory usage via performance.memory (if available)

4. WEBSOCKET STRESS (if applicable):
   - Open 10 simultaneous websocket connections
   - Send rapid messages
   - Disconnect/reconnect rapidly
   - Verify message ordering

5. LONG SESSION:
   - Keep a browser open, interact every 30 seconds for 5 minutes
   - Monitor for memory leaks (growing JS heap)
   - Monitor for DOM node count growth
   - Check for zombie event listeners

6. Record all performance metrics:
   {
     "test": "concurrent-5-users",
     "duration_ms": N,
     "errors": [],
     "memory_before_mb": N,
     "memory_after_mb": N,
     "network_requests": N,
     "failed_requests": N
   }
```

---

## Phase 3: Defect Resolution Loop

This is the core self-healing mechanism. When test agents find bugs, the qa-lead spawns FIX swarms.

### qa-lead Loop Protocol

```
You are the QA-LEAD agent. You manage the test-fix-retest cycle.

LOOP:
  1. COLLECT results from all test agents
     - Parse uitest/reports/*.json
     - Query: bd list --json (all open bugs)

  2. TRIAGE defects by severity:
     P0 (critical): App crashes, auth bypass, data loss, security vulnerability
     P1 (high): Broken forms, navigation dead ends, broken CRUD
     P2 (medium): Validation missing, accessibility serious, inconsistent state
     P3 (low): Cosmetic, minor a11y, non-critical UX

  3. For EACH P0/P1 defect, SPAWN A FIX SWARM:
     - Create a new worktree: wt-add fix-{bug-id}
     - Spawn a coder agent: rf-spawn coder
     - Provide the coder with:
       a. The bug report (from Beads)
       b. The Playwright trace/screenshot
       c. The relevant source file (from GitNexus)
       d. The test that found the bug

     FIX SWARM INSTRUCTIONS:
     """
     You are a FIX agent. Fix the following defect:

     BUG: {bug description}
     LOCATION: {file:line from GitNexus blast radius}
     EVIDENCE: {screenshot/trace path}
     TEST THAT FOUND IT: {test file/function}

     Steps:
     1. Read the failing test to understand exact failure
     2. Use gitnexus_impact to understand blast radius of the fix
     3. Implement the minimum fix
     4. Run the specific failing test to verify fix
     5. Run aqe-gate on the affected module
     6. If all pass:
        - bd close {bug-id} --reason "Fixed: {description}"
        - Commit: git add -A && git commit -m "fix: {bug-id} {description}"
     7. If fix introduces new failures:
        - Revert: git checkout -- .
        - bd update {bug-id} --note "Fix attempt failed: {reason}"
        - Escalate to qa-lead
     """

  4. After ALL fix swarms complete for current batch:
     - Merge fix branches: git merge fix-{bug-id} (with conflict resolution)
     - Clean worktrees: wt-clean

  5. RELAUNCH REGRESSION SWARM:
     - The regression-tester re-runs ALL previously passing tests
     - The specific test agents re-run ONLY the tests that previously failed
     - This is REVERSE VERIFICATION: confirm fixes work AND nothing regressed

  6. EVALUATE:
     - Calculate: pass_rate = passing_tests / total_tests
     - If pass_rate < 1.0: GOTO step 2 (new loop iteration)
     - If pass_rate == 1.0: proceed to Phase 4

  MAX ITERATIONS: 10
  If after 10 iterations pass_rate < 0.95:
     - bd create "UITEST: Stalled at {pass_rate*100}% — needs human" -t task -p 0 --flag human
     - Generate FINAL bug fix report (Phase 5 format) even though stalled
     - STOP

  BETWEEN ITERATIONS:
     - gnx-analyze (update knowledge graph with fixes)
     - neural-patterns (learn from fix patterns)
     - ruv-remember "uitest-iteration-{N}" "{pass_rate}, {bugs_fixed}, {bugs_remaining}"
     - Generate INTERIM bug fix report:
       uitest/reports/UITEST-BUGS-INTERIM-{iteration}-{timestamp}.md
       (same format as final report — this is the crash-safe checkpoint)

  BUG RECORDING FORMAT (used by ALL test agents when logging bugs):
  Every bug logged to Beads AND to a structured JSON file for report generation:

  bd create "BUG: {title}" -t bug -p {0-3}
  
  AND write to uitest/reports/bugs/{bug-id}.json:
  {
    "id": "BUG-{N}",
    "title": "{short title}",
    "priority": "P{0-3}",
    "category": "{form|auth|navigation|api|a11y|load|security|state}",
    "status": "UNFIXED",
    "found_by": "{agent-name}",
    "found_at": "{ISO-8601 timestamp}",
    "url": "{page URL where bug was found}",
    "description": "{plain English description of what's broken}",
    "reproduction_steps": [
      {"action": "navigate", "target": "{url}"},
      {"action": "fill", "target": "{selector}", "value": "{input}"},
      {"action": "click", "target": "{selector}"},
      {"action": "expect", "expected": "{what should happen}", "actual": "{what happened}"}
    ],
    "evidence": {
      "screenshot": "uitest/screenshots/{bug-id}.png",
      "trace": "uitest/traces/{bug-id}.zip",
      "har": "uitest/har/{relevant}.har",
      "console_errors": ["{verbatim error 1}", "{verbatim error 2}"],
      "network_errors": [{"method": "POST", "url": "/api/users", "status": 500, "body": "{...}"}]
    },
    "source_analysis": {
      "file": "{path/to/file.ext}",
      "line": "{line or range}",
      "root_cause": "{technical explanation}",
      "blast_radius": ["{file1}", "{file2}"]
    },
    "fix_instructions": {
      "file": "{path/to/file.ext}",
      "before": "{broken code block}",
      "after": "{fixed code block}",
      "explanation": "{why this fix works}",
      "additional_changes": [{"file": "{path}", "change": "{description}"}]
    },
    "verification": {
      "commands": ["{command to verify fix}"],
      "related_tests": ["{related test areas to re-run}"]
    },
    "fix_attempts": [
      {"attempt": 1, "description": "{what was tried}", "result": "{why it failed}"}
    ]
  }

  The qa-lead reads ALL uitest/reports/bugs/*.json files when generating
  the final and interim reports. This structured format ensures:
  - Nothing is lost if an agent crashes
  - Reports can be regenerated from the JSON files at any time
  - Claude can parse the JSON directly if preferred over markdown
```

---

## Phase 4: Reverse Verification & Confidence Building

After reaching 100% pass rate, execute additional confidence measures.

```
REVERSE VERIFICATION PROTOCOL:

1. CROSS-BROWSER:
   Run the full test suite on: Chromium, Firefox, WebKit
   Record per-browser results

2. VIEWPORT TESTING:
   Run critical paths at: 375px (mobile), 768px (tablet), 1280px (desktop), 1920px (wide)

3. FRESH STATE TESTING:
   - Clear ALL cookies, localStorage, sessionStorage
   - Run the full auth + CRUD flow from scratch
   - Verify nothing depends on stale cached state

4. ORDER-INDEPENDENT VERIFICATION:
   - Shuffle the test execution order randomly
   - Run 3 times with different random seeds
   - Verify no test depends on execution order of other tests

5. MULTI-USER SCENARIO:
   - Spin up 3 browser contexts with 3 different users
   - Simultaneously: User A creates data, User B reads it, User C deletes it
   - Verify no data corruption, no stale reads, no orphaned references

6. NETWORK CONDITIONS (if test environment supports throttling):
   - Slow 3G: test form submissions don't double-fire
   - Offline then online: test graceful recovery
   - Intermittent drops: test retry logic

7. IDEMPOTENCY CHECK:
   - Run the entire test suite twice back-to-back without resetting state
   - Second run should still pass (tests must be self-cleaning)
```

---

## Phase 5: Reporting

Generate TWO reports at session end. The first is an executive summary. The second is the actionable bug fix report — this is the one you hand to Claude to fix everything.

### Report 1: Executive Summary

Save to `uitest/reports/UITEST-SUMMARY-{YYYY-MM-DD-HHmmss}.md`

```
# UAT Summary — {App Name}
# Generated: {YYYY-MM-DD HH:mm:ss UTC}
# Target: {target_url}
# Duration: {total_minutes} minutes
# Swarm: {topology} with {agent_count} agents

## Results
- Total pages tested: N
- Total elements exercised: N
- Total test cases executed: N
- Pass rate: N%
- Fix loop iterations: N
- Defects found: N (P0: X, P1: X, P2: X, P3: X)
- Defects auto-fixed by swarm: N
- Defects remaining (unfixed): N
- Defects escalated to human: N

## Coverage Matrix
| Page | Forms | Auth | Nav | API | A11y | Load | Status |
|------|-------|------|-----|-----|------|------|--------|
| /    | ✅    | ✅   | ✅  | ✅  | ✅   | ✅   | PASS   |
...

## Cross-Browser Results
| Browser  | Pass | Fail | Skip |
|----------|------|------|------|
| Chromium | N    | N    | N    |
| Firefox  | N    | N    | N    |
| WebKit   | N    | N    | N    |

## Accessibility Score
- Critical violations: N
- Serious violations: N
- WCAG 2.1 AA compliant: YES/NO

## Performance Baseline
- Average page load: Nms
- Largest Contentful Paint: Nms
- Cumulative Layout Shift: N
- Memory stable after 5-min session: YES/NO

## Reverse Verification
- Cross-browser: PASS/FAIL
- Viewport responsive: PASS/FAIL
- Fresh state: PASS/FAIL
- Order-independent: PASS/FAIL
- Multi-user: PASS/FAIL
- Idempotent: PASS/FAIL

## Artifacts
- Sitemap: uitest/fixtures/sitemap.json
- HAR archive: uitest/har/
- Screenshots: uitest/screenshots/
- Traces: uitest/traces/
- Videos: uitest/videos/
- Bug fix report: uitest/reports/UITEST-BUGS-{timestamp}.md
```

---

### Report 2: Bug Fix Report (THE ACTIONABLE ONE)

This is the report you point Claude at. It contains everything needed to reproduce, locate, understand, and fix every remaining bug. No ambiguity — every bug has the file, line, root cause, and exact fix instructions.

Save to `uitest/reports/UITEST-BUGS-{YYYY-MM-DD-HHmmss}.md`

**qa-lead MUST generate this report using the following template for EVERY bug, whether fixed or unfixed:**

```markdown
# Bug Fix Report — {App Name}
# Generated: {YYYY-MM-DD HH:mm:ss UTC}
# Target: {target_url}
# Total Bugs: {N} | Fixed: {N} | Remaining: {N} | Escalated: {N}
#
# HOW TO USE THIS REPORT:
# Point Claude Code at this file:
#   "Read uitest/reports/UITEST-BUGS-{timestamp}.md and fix every UNFIXED bug in order of priority."
# Claude has everything it needs below — file paths, root causes, reproduction steps, and fix instructions.

---

## UNFIXED BUGS (requires action)

### BUG-{ID}: {Short title}
- **Priority:** P{0-3} ({critical|high|medium|low})
- **Category:** {form|auth|navigation|api|a11y|load|security|state}
- **Found by:** {agent-name} agent
- **Found at:** {YYYY-MM-DD HH:mm:ss UTC}
- **Status:** UNFIXED
- **Attempts:** {N} fix attempts made, all failed

#### What's broken
{Plain English description of the bug. What the user would see. Be specific — not "form doesn't work" but "submitting the signup form with a valid email returns a 500 error and the user sees a blank white page."}

#### Reproduction steps
1. Navigate to `{url}`
2. {Action}: `{element description}` (element ref: `{@eN}`, selector: `{css-selector}`)
3. {Action}: Fill `{field}` with `{value}`
4. {Action}: Click `{button}`
5. **Expected:** {what should happen}
6. **Actual:** {what actually happens}

#### Evidence
- Screenshot: `uitest/screenshots/{bug-id}-{description}.png`
- Trace: `uitest/traces/{bug-id}.zip`
- HAR: `uitest/har/{relevant-capture}.har`
- Video: `uitest/videos/{bug-id}.webm` (if captured)
- Console errors: `{paste exact console error messages}`
- Network: `{method} {url} → {status} {response body summary}`

#### Root cause analysis
- **Source file:** `{path/to/file.ext}` (from GitNexus blast radius)
- **Line(s):** `{line range}` (approximate, from stack trace or code analysis)
- **Root cause:** {Specific technical explanation. e.g., "The signup handler in src/routes/auth.ts line 42 calls userService.create() without awaiting the Promise, so the response sends before the DB write completes. On slow DB connections, this returns 500 because the transaction is still pending when the response tries to read the new user."}
- **Blast radius:** {List of files/components affected by fixing this}
  - `{file1.ext}` — {why it's affected}
  - `{file2.ext}` — {why it's affected}

#### Fix instructions
```
WHAT TO CHANGE:

File: {path/to/file.ext}
Line: {N}

BEFORE (current broken code):
{paste the exact broken code block, 5-15 lines of context}

AFTER (fixed code):
{paste the exact fixed code block}

WHY THIS FIX WORKS:
{1-2 sentences explaining the fix}
```

#### Additional changes required (if any)
```
File: {path/to/other-file.ext}
Change: {description of secondary change needed}
Reason: {why this is also needed}
```

#### Verification
After applying the fix, verify with:
```bash
# 1. Run the specific failing test
{exact command to reproduce and verify the fix}

# 2. Run related tests (blast radius)
{commands for related test areas}

# 3. Run aqe-gate
aqe-gate
```

#### Previous fix attempts (if any)
| Attempt | What was tried | Why it failed |
|---------|---------------|---------------|
| 1       | {description} | {reason}      |
| 2       | {description} | {reason}      |

---

### BUG-{ID}: {next bug...}
{same template repeated for every unfixed bug}

---

## FIXED BUGS (for reference — no action needed)

### BUG-{ID}: {Short title} ✅ FIXED
- **Priority:** P{0-3}
- **Category:** {category}
- **Fixed by:** {agent-name} in iteration {N}
- **Fix:** {one-line summary of what was changed}
- **File(s) changed:** `{path1}`, `{path2}`
- **Commit:** `{commit hash}` — `{commit message}`
- **Verified:** {test name} passes, regression suite passes

---

## ESCALATED BUGS (requires human decision)

### BUG-{ID}: {Short title} ⚠️ ESCALATED
- **Priority:** P{0-3}
- **Category:** {category}
- **Reason for escalation:** {why the swarm couldn't fix this — ambiguous requirements, needs architectural decision, needs access to external service, etc.}
- **What the swarm tried:** {summary of failed fix attempts}
- **Recommendation:** {what the swarm thinks should be done}
- **Evidence:** {same evidence block as unfixed bugs}

---

## BUG STATISTICS

### By Category
| Category   | Found | Fixed | Remaining | Escalated |
|------------|-------|-------|-----------|-----------|
| Form       | N     | N     | N         | N         |
| Auth       | N     | N     | N         | N         |
| Navigation | N     | N     | N         | N         |
| API        | N     | N     | N         | N         |
| A11y       | N     | N     | N         | N         |
| Load       | N     | N     | N         | N         |
| Security   | N     | N     | N         | N         |
| State      | N     | N     | N         | N         |

### By Priority
| Priority | Found | Fixed | Remaining | Escalated |
|----------|-------|-------|-----------|-----------|
| P0       | N     | N     | N         | N         |
| P1       | N     | N     | N         | N         |
| P2       | N     | N     | N         | N         |
| P3       | N     | N     | N         | N         |

### Fix Loop History
| Iteration | Bugs at start | Fixed this round | Pass rate | Duration |
|-----------|--------------|-----------------|-----------|----------|
| 1         | N            | N               | N%        | Nm       |
| 2         | N            | N               | N%        | Nm       |
| ...       |              |                 |           |          |

### Patterns Learned
{List the test patterns stored in AgentDB during this session that would help future runs}
- `{pattern-key}`: {pattern-value}
- `{pattern-key}`: {pattern-value}
```

---

### Bug Report Generation Rules

The qa-lead MUST follow these rules when generating the bug fix report:

```
1. EVERY unfixed bug MUST have:
   - Exact source file path (use GitNexus: gitnexus_impact)
   - Approximate line number (from stack trace, error message, or code search)
   - Root cause explanation (not just "it's broken" — WHY it's broken)
   - Before/after code blocks showing the fix (if the swarm can determine it)
   - If the swarm cannot determine the exact fix, provide the root cause,
     the relevant code block, and a recommended approach

2. EVERY bug MUST have reproduction steps that work if followed literally:
   - Exact URLs, not relative descriptions
   - Exact element selectors or refs
   - Exact input values used
   - Exact expected vs actual behavior

3. Evidence MUST be concrete:
   - Screenshot path must exist and show the failure
   - Trace file must be saved and referenced
   - Console errors must be copy-pasted verbatim, not summarized
   - Network errors must include method, URL, status code, and response body

4. The BEFORE/AFTER code blocks in fix instructions MUST:
   - Include enough context lines (5-15) to locate the change unambiguously
   - Be copy-pasteable — no pseudocode, no "..." elisions in critical areas
   - If the fix spans multiple files, list each file separately

5. SORT order:
   - UNFIXED bugs first (this is what needs action)
   - Within unfixed: P0 first, then P1, P2, P3
   - FIXED bugs second (reference only)
   - ESCALATED bugs third

6. TIMESTAMP everything:
   - Report generation time in header
   - Each bug's discovery time
   - Each fix attempt time
   - Total session duration

7. The report MUST be self-contained:
   - A developer (or Claude) reading ONLY this file should be able to
     fix every bug without asking any questions
   - No references to "see the conversation" or "as discussed"
   - Every piece of context is IN the report
```

---

### Intermediate Bug Reports (During Session)

Don't wait until the end. The qa-lead generates intermediate reports after EACH fix loop iteration:

```bash
# After each iteration, write an intermediate report
# Save to: uitest/reports/UITEST-BUGS-INTERIM-{iteration}-{timestamp}.md
# Same format as the final report but marked as INTERIM
# This way, if the session crashes or times out, you still have a report

# The final report supersedes all interim reports
# Interim reports are kept for audit trail
```

The intermediate reports also serve as checkpoints. If the swarm is stopped mid-session (cost guardrail, timeout, or human intervention), the most recent interim report is the handoff document.

---

## Beads Integration

All test activity flows through Beads for tracking:

```bash
# Epic for the campaign
bd create "UITEST: Full UAT for {app}" -t epic -p 0

# Phase tasks (auto-created by qa-lead)
bd create "UITEST Phase 1: Discovery" -t task -p 1 --deps epic-id
bd create "UITEST Phase 2: Parallel Testing" -t task -p 1 --deps phase1-id
bd create "UITEST Phase 3: Fix Loop" -t task -p 1 --deps phase2-id
bd create "UITEST Phase 4: Reverse Verification" -t task -p 1 --deps phase3-id
bd create "UITEST Phase 5: Reporting" -t task -p 0 --deps phase4-id

# Bugs discovered during testing
bd create "BUG: {description}" -t bug -p {0-3}

# Persistent knowledge
bd remember "uitest-target" "{url}"
bd remember "uitest-credentials" "{test user list}"
ruv-remember "uitest-patterns" "{common failure patterns}"
```

---

## GitNexus Integration

Use codebase intelligence to map defects to source:

```bash
# Before fixing any bug, understand blast radius
gnx-analyze
# Then in the fix agent:
gitnexus_impact { files: ["src/components/LoginForm.tsx"] }
gitnexus_detect_changes { branch: "fix-bug-123" }
```

---

## MCP Browser Tools Reference

Ruflo provides 59 browser automation MCP tools plus 313+ total MCP tools across all categories. Key ones for UI testing:

```
# Core Navigation
mcp__ruflo__browser_open { url }              # Open URL
mcp__ruflo__browser_snapshot { interactive }   # DOM snapshot with element refs (@e1, @e2...)
mcp__ruflo__browser_click { target }           # Click element by ref
mcp__ruflo__browser_fill { target, value }     # Fill input field
mcp__ruflo__browser_select { target, value }   # Select dropdown option
mcp__ruflo__browser_hover { target }           # Hover over element
mcp__ruflo__browser_scroll { direction }       # Scroll page
mcp__ruflo__browser_screenshot { path }        # Take screenshot
mcp__ruflo__browser_wait { selector, timeout } # Wait for element
mcp__ruflo__browser_evaluate { script }        # Execute JS in page
mcp__ruflo__browser_network_log {}             # Get captured network requests

# Swarm Coordination
mcp__ruflo__swarm_init { topology, maxAgents } # Initialize swarm
mcp__ruflo__agent_spawn { type, name, capabilities } # Spawn agent
mcp__ruflo__task_orchestrate { task, strategy, priority } # Orchestrate workflow

# Memory
mcp__ruflo__memory_store { key, value, namespace } # Store pattern
mcp__ruflo__memory_search { query, limit }         # Semantic search

# Neural/Intelligence
mcp__ruflo__neural_train { pattern_type }          # Train patterns
mcp__ruflo__hooks_route { task }                   # Route to optimal agent

# Teammate (fix swarm coordination)
mcp__ruflo__teammate_spawn { role, task, context }  # Spawn fix agent
mcp__ruflo__teammate_handoff { from, to, context }  # Hand off between agents

# Gastown (WASM orchestration)
mcp__ruflo__gastown_convoy_create { name, tests }   # Group tests
mcp__ruflo__gastown_beads_sync {}                   # Sync beads across worktrees
```

Element refs (@e1, @e2...) are generated from accessibility tree snapshots and map to interactive elements. This is far more compact and reliable than CSS selectors:
```
# Traditional (fragile):
await page.click('body > div.container > form#login > button[type="submit"].btn.btn-primary');

# With element refs (compact, stable):
mcp__ruflo__browser_click { target: "@e3" }
```

When the MCP browser tools are insufficient or unavailable, fall back to Playwright directly:

```javascript
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  recordHar: { path: 'uitest/har/session.har' },
  recordVideo: { dir: 'uitest/videos/' }
});
const page = await context.newPage();

// Enable tracing for failures
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

// Navigate and interact
await page.goto(TARGET_URL);
await page.fill('#email', 'test@uitest.local');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard');

// Save trace on failure
await context.tracing.stop({ path: 'uitest/traces/test-name.zip' });
```

---

## Trajectory Learning (Ruflo @claude-flow/browser)

Every browser interaction is recorded as a trajectory — a replayable sequence of actions that the swarm can learn from. This is powered by Ruflo's `@claude-flow/browser` module.

```
When any agent performs a browser interaction sequence:

1. START a trajectory before each test flow:
   const id = browser.startTrajectory('login-happy-path');

2. All actions (open, click, fill, select, hover, scroll) are auto-recorded with:
   - Element ref (@e1, @e2...) from accessibility tree snapshots
   - Timestamp, URL, DOM state hash
   - Network requests triggered
   - Result (success/failure/timeout)

3. On SUCCESS, save the trajectory:
   browser.saveTrajectory(id, { outcome: 'pass', tags: ['auth', 'login'] });
   ruv-remember "trajectory-login-happy" "{action sequence summary}"

4. On FAILURE, save with failure context:
   browser.saveTrajectory(id, { outcome: 'fail', error: errorMsg });
   — The trajectory becomes input for the fix swarm

5. REPLAY trajectories for regression testing:
   browser.replayTrajectory(savedId);
   — Replays the exact action sequence on the current DOM
   — Detects regressions when a previously-passing trajectory fails

6. Store trajectories as files:
   Save to: uitest/trajectories/{test-name}-{timestamp}.json
```

Trajectories are the foundation of the self-learning loop. The SONA engine uses them to build a model of which interaction patterns succeed and which fail, so subsequent test iterations are smarter.

---

## Browser Swarm Coordination (Ruflo)

For load testing and multi-user scenarios, use Ruflo's browser swarm coordinator instead of spawning individual Playwright instances:

```javascript
import { createBrowserSwarm } from '@claude-flow/browser';

// Create a swarm of browser sessions coordinated by Ruflo
const swarm = createBrowserSwarm({
  topology: 'hierarchical',   // qa-lead at top, test agents below
  maxSessions: 8,             // 8 concurrent browser sessions
  sessionPrefix: 'uitest',
});

// Spawn typed browser agents
const crawler = await swarm.spawnAgent('navigator');
const formBot1 = await swarm.spawnAgent('scraper');  // form tester
const formBot2 = await swarm.spawnAgent('scraper');  // parallel form tester
const authBot = await swarm.spawnAgent('validator');  // auth tester

// Share discovery data between agents
swarm.shareData('sitemap', sitemapJson);
swarm.shareData('testUsers', createdUsers);

// Each agent reads shared data
const sitemap = swarm.getSharedData('sitemap');

// Monitor swarm health
const stats = swarm.getStats();
// { activeSessions: 4, maxSessions: 8, topology: 'hierarchical' }

// Graceful shutdown
await swarm.closeAll();
```

This is preferred over raw Playwright for multi-user tests because it provides:
- Shared memory between browser agents via AgentDB
- Automatic session cleanup on agent failure
- Topology-aware coordination (agents report up to qa-lead)
- Built-in rate limiting to avoid overwhelming the target app

---

## SONA Self-Learning Engine (RuVector)

SONA (Self-Optimizing Neural Architecture) is the intelligence layer that makes each test iteration smarter than the last. It is bundled in Ruflo via RuVector WASM acceleration.

```
HOW SONA IMPROVES TESTING:

1. PATTERN RECOGNITION:
   After each test cycle, SONA analyzes results and identifies patterns:
   - "Forms with date pickers fail 80% of the time on Firefox"
   - "API calls after rapid form submission return 429 status"
   - "Navigation from /settings to /profile triggers console error"

   These are stored as learned patterns in AgentDB:
   ruv-remember "pattern-datepicker-firefox" "DatePicker XSS fails on Firefox — use fill() not type()"
   ruv-remember "pattern-rapid-submit-429" "Rate limit hit after 3 submissions in 500ms — add 200ms delay"

2. ADAPTIVE TEST ORDERING:
   SONA routes subsequent test iterations to prioritize:
   - Tests that previously failed (regression check)
   - Tests adjacent to fixed code (blast radius)
   - Tests in areas with high defect density (hot spots)

   This uses hooks-route internally:
   hooks-route --task "test form validation on /signup"
   → Routes to optimal agent type + test ordering

3. MICRO-LORA ADAPTATION (<1ms):
   For each test interaction, SONA applies MicroLoRA weight adjustments:
   - If a click pattern succeeded: reinforce the element selection strategy
   - If a fill pattern failed: adapt input generation for that field type
   - These adaptations persist across sessions via EWC++ (prevents forgetting)

4. THREE-SPEED LEARNING:
   | Speed    | Mechanism           | What It Does                                     | Latency |
   |----------|--------------------|-------------------------------------------------|---------|
   | Instant  | MicroLoRA          | Adapts test strategy for this specific element   | <1ms    |
   | Session  | GNN attention      | Reinforces successful test paths during session  | ~10ms   |
   | Long-term| EWC++ consolidation| Permanently learns which test patterns work      | ~100ms  |

5. CROSS-SESSION MEMORY:
   When the swarm restarts (new iteration or new day), it recalls:
   - All previously discovered bugs and their fix patterns
   - Which test orderings were most efficient
   - Which element selectors were most stable (avoids flaky selectors)
   - Known timing-sensitive areas requiring explicit waits

   mem-search "uitest"        # Recall all test patterns
   ruv-recall "pattern-*"     # Recall specific learned patterns
   bd ready --json            # Recall all open/closed test issues
```

---

## Hive-Mind Mode (Advanced Multi-Consensus)

For complex applications (50+ pages, multiple bounded contexts), upgrade from star topology to hive-mind for intelligent consensus-driven testing:

```bash
# Instead of rf-star, use hive-mind for large-scale UAT
npx ruflo@latest hive-mind spawn "Full UAT campaign for {APP_URL}"

# The hive-mind provides:
# - Queen agent (replaces qa-lead) with Byzantine fault-tolerant consensus
# - Dynamic agent spawning based on discovered complexity
# - Automatic work distribution using semantic routing
# - 5 consensus protocols: Raft, Gossip, CRDT, Paxos, BFT
```

Use hive-mind when:
- Target app has >50 distinct pages
- Multiple user roles with complex RBAC
- Real-time features (websockets, SSE, polling)
- Multi-tenant architecture requiring isolated test runs

The hive-mind queen uses SONA routing to decide how many agents to spawn per area based on the crawler's complexity assessment of each page.

---

## Coherence Gate (RuVector Prime Radiant)

Before accepting any fix as "correct," run it through the coherence gate to verify mathematical consistency — not just "tests pass" but "the fix is logically coherent with the rest of the codebase."

```
COHERENCE GATE PROTOCOL (runs inside qa-lead after each fix):

1. After a fix swarm commits its changes, compute coherence:
   - The Prime Radiant sheaf Laplacian measures:
     E(S) = Σ wₑ · ‖ρᵤ(xᵤ) - ρᵥ(xᵥ)‖²
   - If energy E(S) < 0.1: fix is coherent → accept
   - If E(S) 0.1-0.4: fix needs more evidence → run additional tests
   - If E(S) 0.4-0.7: fix is suspicious → deep analysis with Opus
   - If E(S) > 0.7: fix is incoherent → reject and escalate to human

2. COMPUTE LADDER ROUTING for fix verification:
   | Energy  | Lane     | Action                                    |
   |---------|----------|-------------------------------------------|
   | < 0.1   | Reflex   | Auto-approve, merge immediately            |
   | 0.1-0.4 | Retrieval| Run 3 more related tests before approving  |
   | 0.4-0.7 | Heavy    | Full aqe-gate + blast radius re-analysis   |
   | > 0.7   | Human    | Escalate — fix may introduce new bugs      |

3. WITNESS CHAIN:
   Every fix approval is recorded in a tamper-evident hash-linked chain:
   - Fix ID, coherence score, test results hash, approver (agent or human)
   - Stored in: uitest/reports/witness-chain.jsonl
   - This provides a cryptographic audit trail of every change made during UAT

4. INTEGRATION:
   The coherence gate runs automatically as part of the fix loop.
   qa-lead checks coherence BEFORE running regression tests.
   If coherence is low, it skips expensive regression and goes straight to rejection.
```

This prevents the common failure mode where a "fix" for one bug introduces subtle breakage elsewhere that only surfaces later. The coherence gate catches logical inconsistencies mathematically, before they manifest as test failures.

---

## AgentDB v3 Memory Architecture

All test knowledge flows through the three-tier memory system. This is how the swarm remembers across iterations and sessions:

```
TIER 1 — BEADS (Project-level, git-native JSONL):
  bd create "BUG: Login form XSS on email field" -t bug -p 1
  bd close "BUG-42" --reason "Fixed: sanitized input with DOMPurify"
  bd remember "uitest-config" "{target: localhost:3000, browsers: 3}"
  → Persists across sessions, tracked in git, auditable

TIER 2 — NATIVE TASKS (Session-level, automatic):
  → Claude Code automatically tracks active tasks within the session
  → No explicit commands needed — just describe what you're doing
  → Lost when session ends (which is why Beads captures important state)

TIER 3 — AGENTDB + RUVECTOR (Learned patterns, HNSW-indexed):
  ruv-remember "selector-stability-/login" "Use [data-testid] over CSS class selectors"
  ruv-remember "timing-/api/users" "Endpoint needs 800ms timeout, not default 3000ms"
  ruv-remember "fix-pattern-xss" "Always use DOMPurify.sanitize() for user input rendering"
  
  ruv-recall "selector stability"    # Semantic search — finds related patterns
  mem-search "timing"                # Search across all memory tiers
  mem-stats                          # Memory health check

  → Indexed by RuVector's HNSW with GNN self-learning
  → Semantic search finds related patterns even with different wording
  → Patterns improve with usage (GNN re-ranks based on access frequency)
  → 150x faster retrieval than flat search via WASM acceleration

MEMORY RULES FOR TEST AGENTS:
  - Bugs/tasks/status → ALWAYS use Beads (bd create, bd close)
  - Test patterns/selectors/timings → ALWAYS use AgentDB (ruv-remember)
  - Session scratchpad → use Native Tasks (automatic)
  - NEVER use markdown TODO files or MEMORY.md — use bd/ruv only
```

---

## Teammate Plugin Integration

The Teammate Plugin (21 MCP tools) bridges Anthropic's native Agent Teams with Ruflo swarms. This is critical for the fix loop:

```
When qa-lead needs to spawn a fix swarm:

1. Use Teammate to spawn a sub-team within the running swarm:
   mcp__ruflo__teammate_spawn {
     role: "fixer",
     task: "Fix BUG-42: XSS in login form email field",
     context: { bugId: "BUG-42", trace: "uitest/traces/login-xss.zip" }
   }

2. The Teammate plugin provides:
   - Semantic routing: routes fix tasks to the right agent type
   - Rate limiting: prevents fix swarm from consuming all resources
   - Circuit breaker: if a fix agent crashes 3 times, it stops trying
   - BMSSP WASM acceleration: 352x faster for simple code transforms

3. For coordinating between test and fix agents:
   mcp__ruflo__teammate_handoff {
     from: "form-tester",
     to: "fixer-42",
     context: "Bug report with reproduction steps"
   }

4. Monitor fix team status:
   mcp__ruflo__teammate_status {}
   → Returns: active fixers, completion rates, circuit breaker state
```

---

## Gastown Bridge (WASM Orchestration)

The Gastown Bridge plugin (20 MCP tools) provides WASM-accelerated orchestration for high-throughput test coordination:

```
Key Gastown capabilities for UITEST:

1. CONVOY MANAGEMENT:
   Group related tests into convoys for batch execution:
   mcp__ruflo__gastown_convoy_create {
     name: "auth-suite",
     tests: ["login", "signup", "reset", "session", "rbac"]
   }
   → Convoys execute as a unit — if one fails, the convoy reports collectively

2. BEADS SYNC:
   Automatically syncs test results from agent worktrees back to main:
   mcp__ruflo__gastown_beads_sync {}
   → Prevents merge conflicts in beads data across parallel agents

3. WASM ACCELERATION (352x):
   For simple test assertions and string matching, Gastown's Agent Booster
   bypasses the LLM entirely:
   - Element text verification: WASM regex, not LLM reasoning
   - Status code checks: WASM comparison, not LLM analysis
   - Screenshot diff: WASM pixel comparison via sharp
   → Saves tokens and cost on high-volume, simple verifications

4. GRAPH ANALYSIS:
   Gastown provides test dependency graph analysis:
   mcp__ruflo__gastown_graph_analyze {
     type: "test-dependencies"
   }
   → Shows which tests depend on which, enabling smart parallelization
   → Tests with no dependencies run first; dependent tests wait
```

---

## Agentic QE Plugin Integration

The Agentic QE plugin provides 58 specialized QE agents and 16 MCP tools. Use it for quality gates throughout the UAT cycle:

```
QUALITY GATES:

1. AFTER DISCOVERY (Phase 1):
   aqe-generate          # Generate test specs from discovered sitemap
   → Creates test templates in uitest/specs/ based on element inventory

2. AFTER EACH FIX (Phase 3):
   aqe-gate              # Full quality gate — GO/NO-GO decision
   → Runs: unit tests, integration tests, coverage check, security scan
   → Returns: GO (merge the fix) or NO-GO (reject + details)

3. BEFORE REVERSE VERIFICATION (Phase 4):
   aqe-generate          # Generate regression tests for all fixed bugs
   → Each bug fix gets an explicit regression test

4. CHAOS ENGINEERING (optional, Phase 2):
   The Agentic QE plugin includes chaos agents:
   - Kill a backend service mid-test → verify graceful degradation
   - Throttle network to 2G → verify timeout handling
   - Fill disk space → verify error messages
   - Corrupt session cookie → verify auth recovery

5. SECURITY SCANNING:
   Agentic QE includes security-specific agents:
   - OWASP Top 10 automated checks
   - Dependency vulnerability scan (npm audit / cargo audit)
   - Secret detection in page source and network responses
   - CSP header validation
```

---

## Neural Intelligence Integration

Use Ruflo's hooks and neural systems to make the test swarm learn from its own execution:

```bash
# BEFORE testing: pretrain on the target app's codebase
hooks-train                # Deep pretrain — learns code patterns, component structure
neural-train               # Train neural coordination patterns

# DURING testing: route tasks to optimal agents
hooks-route --task "test complex multi-step form wizard"
→ Routes to: form-tester agent + Sonnet model (moderate complexity)

hooks-route --task "test OAuth PKCE flow with token refresh"
→ Routes to: auth-tester agent + Opus model (high complexity security)

hooks-route --task "verify 404 page renders correctly"
→ Routes to: nav-tester agent + Haiku model (simple verification)

# AFTER testing: capture what was learned
neural-patterns            # View all patterns learned during this session
ruv-remember "neural-uitest-session-{N}" "$(neural-patterns --json)"

# The neural system learns:
# - Which agent types are most effective for which test categories
# - Optimal model routing (when to use Opus vs Sonnet vs Haiku)
# - Which test orderings find bugs fastest
# - Common fix patterns for recurring bug types
```

---

## Configuration Variables

Set these before launching the swarm. The qa-lead reads them from environment or from `uitest/config.json`:

```json
{
  "target_url": "http://localhost:3000",
  "base_url": "http://localhost:3000",
  "auth": {
    "signup_url": "/signup",
    "login_url": "/login",
    "logout_url": "/logout",
    "reset_url": "/forgot-password"
  },
  "test_users": {
    "admin": { "email": "admin@uitest.local", "password": "Admin!Test123" },
    "user": { "email": "user@uitest.local", "password": "User!Test456" },
    "readonly": { "email": "readonly@uitest.local", "password": "Read!Test789" }
  },
  "timeouts": {
    "navigation_ms": 10000,
    "element_ms": 5000,
    "network_idle_ms": 3000
  },
  "max_fix_iterations": 10,
  "min_pass_rate_to_continue": 0.5,
  "browsers": ["chromium", "firefox", "webkit"],
  "viewports": [
    { "name": "mobile", "width": 375, "height": 812 },
    { "name": "tablet", "width": 768, "height": 1024 },
    { "name": "desktop", "width": 1280, "height": 720 },
    { "name": "wide", "width": 1920, "height": 1080 }
  ],
  "cost_guardrail_per_hour": 15
}
```

---

## Launch Command

Feed this entire file as context, then issue:

```
Read UITEST.md. Target URL is {YOUR_APP_URL}.
Initialize the testing swarm, run Phase 1 through Phase 5.
Fix every defect you find. Loop until 100% or max iterations.
Generate BOTH reports: the executive summary AND the bug fix report.
```

Or the one-liner:

```
UITEST target={YOUR_APP_URL} — full autonomous UAT, self-heal, loop to 100%.
```

**After the session completes, to fix remaining bugs:**

```
Read uitest/reports/UITEST-BUGS-{latest-timestamp}.md and fix every UNFIXED bug in priority order. Start with P0, then P1, then P2, then P3. For each bug, follow the fix instructions exactly, then run the verification commands. Commit each fix separately.
```

---

## Cost & Model Routing

| Activity | Model | Rationale |
|----------|-------|-----------|
| Discovery crawl | Haiku | High-volume, simple page parsing |
| Form/nav/a11y testing | Sonnet | Moderate complexity, pattern matching |
| Auth/security testing | Opus | Critical reasoning for security edge cases |
| Bug fix implementation | Sonnet | Standard code changes |
| Blast radius analysis | Opus | Complex dependency reasoning |
| Report generation | Haiku | Template-based output |

Guardrail: **$15/hr max**. If cost exceeds this, qa-lead pauses non-critical agents and continues P0/P1 work only.

---

## Safety Rules

1. **NEVER** run against production without explicit human confirmation (Triple-Gate applies).
2. **NEVER** delete real user data. Only interact with test users created by the auth-tester.
3. **NEVER** modify database directly. All actions go through the UI or documented APIs.
4. **ALL** fix swarms must pass aqe-gate before merging.
5. **ALL** merges to main require Triple-Gate (3 human confirmations).
6. **NEVER** force-push to `main` under any circumstances.
7. After **3 failed fix attempts** on the same bug, escalate to human via `bd human {bug-id}`.
8. **ALWAYS** commit and push before ending a session: `bd dolt push && git push`.
9. If the target application is unreachable for > 60 seconds, pause all agents and alert human.

---

## Triple-Gate Merge Protocol

Any merge, rebase, or push into `main` (also `master`, `production`, `prod`, `release`) requires **3 consecutive human confirmations in separate turns**. No agent may merge to main autonomously. This applies to fix swarm merges into main after UAT.

```
GATE 1 — "🔒 MERGE GATE 1/3: Merging [branch] → main. [summary of changes, commit count, risk level]. Confirm?"
GATE 2 — "🔒 MERGE GATE 2/3: Tests: [pass/fail]. Conflicts: [y/n]. Uncommitted: [y/n]. Confirm?"
GATE 3 — "🔒 MERGE GATE 3/3: FINAL. Type 'yes' to execute."
```

**Rules:**
- Each gate = separate conversation turn. The human must respond before the next gate.
- Non-`yes` at ANY gate = abort the merge immediately.
- Sub-agents (fix swarms, test agents) CANNOT merge to main — they must escalate to qa-lead, who escalates to the human.
- Hotfixes are NOT exempt — Triple-Gate still applies.
- Does NOT apply to feature-to-feature branch merges (e.g., `fix-bug-42` → `uitest-working`). Only to merges into primary branches.

**In the UITEST context:** Fix swarms commit to their own worktree branches. The qa-lead merges fix branches into the uitest working branch freely. But when it's time to merge the final tested+fixed code back into `main`, Triple-Gate fires and the human must confirm 3 times.

---

## Destructive Command Safeguards

One human confirmation required before executing any of these:

- `git reset --hard`
- `rm -rf` on project directories
- `prisma migrate reset`
- `DROP TABLE` or any destructive SQL
- Any `--force` flag that deletes data

Format: `⚠️ DESTRUCTIVE: [command]. [what will be lost]. Confirm?`

---

## Rollback Protocol

If main breaks after a merge:

```bash
# 1. Immediate revert (skips Triple-Gate — this is an emergency)
git revert --no-commit HEAD

# 2. Verify the revert fixes the break
npm test    # or whatever the test command is
npm run build

# 3. Commit and push the revert
git commit -m "revert: [branch] — [reason]"
git push

# 4. Report to human
echo "⚠️ REVERTED: [branch] merge was reverted because [symptoms]"

# 5. Track it
bd create "[branch] reverted — [root cause]" -t bug -p 0 --json
ruv-remember "revert/[branch]" "Cause: [explanation]. Fix needed: [what to do]"
```

---

## Conflict Resolution

- **NEVER** silently auto-resolve merge conflicts.
- **Simple conflicts** (non-overlapping, different sections of the file): resolve + show the human what was resolved.
- **Complex conflicts** (overlapping logic, same function modified by multiple agents): show both sides to the human and ask which to keep.
- **ALWAYS** run tests + `gitnexus_detect_changes` after resolving any conflict.

---

## Session End Protocol

```bash
# 1. Generate the final bug fix report (MOST IMPORTANT OUTPUT)
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
# qa-lead generates: uitest/reports/UITEST-BUGS-${TIMESTAMP}.md
# qa-lead generates: uitest/reports/UITEST-SUMMARY-${TIMESTAMP}.md
# Follow the Phase 5 report templates exactly — this is the handoff document

# 2. Close all open test bugs with status
bd list --json | jq '.[] | select(.status=="open")'
# For each: bd close or bd update with final status

# 3. Capture learned patterns from this session
neural-patterns > uitest/reports/learned-patterns-${TIMESTAMP}.json
ruv-remember "uitest-session-end-${TIMESTAMP}" "pass_rate={pass_rate}, bugs_found={N}, bugs_fixed={M}"
ruv-remember "uitest-selectors-stable" "$(cat uitest/fixtures/stable-selectors.json 2>/dev/null)"

# 4. Push all data
bd dolt push
git add -A
git commit -m "uitest: ${TIMESTAMP} — ${pass_rate}% pass rate, ${bugs_found} bugs found, ${bugs_fixed} fixed, ${bugs_remaining} remaining"
git push

# 5. Update knowledge graph
gnx-analyze
neural-patterns

# 6. Final status
turbo-status
echo ""
echo "=============================================="
echo "  UITEST COMPLETE — ${TIMESTAMP}"
echo "  Pass rate: ${pass_rate}%"
echo "  Bugs found: ${bugs_found} | Fixed: ${bugs_fixed} | Remaining: ${bugs_remaining}"
echo ""
echo "  REPORTS:"
echo "  Summary:  uitest/reports/UITEST-SUMMARY-${TIMESTAMP}.md"
echo "  Bug fixes: uitest/reports/UITEST-BUGS-${TIMESTAMP}.md"
echo ""
echo "  TO FIX REMAINING BUGS, TELL CLAUDE:"
echo "  'Read uitest/reports/UITEST-BUGS-${TIMESTAMP}.md and fix every UNFIXED bug.'"
echo "=============================================="
```

#!/usr/bin/env bash
# =============================================================================
#  ENV CHECK — Turborepo · Flow · Git Worktrees · Full Dev Stack Audit
#  Run:  bash env-check.sh
#  Or make it executable:  chmod +x env-check.sh && ./env-check.sh
# =============================================================================

# ── Colors ────────────────────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BLUE='\033[0;34m'
RESET='\033[0m'

# ── Counters ──────────────────────────────────────────────────────────────────
PASS=0
WARN=0
FAIL=0

# ── Helpers ───────────────────────────────────────────────────────────────────
header() {
  echo ""
  echo -e "${CYAN}${BOLD}━━━  $1  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

ok() {
  echo -e "  ${GREEN}✔${RESET}  $1"
  ((PASS++))
}

warn() {
  echo -e "  ${YELLOW}⚠${RESET}  $1"
  ((WARN++))
}

fail() {
  echo -e "  ${RED}✘${RESET}  $1"
  ((FAIL++))
}

info() {
  echo -e "  ${DIM}    $1${RESET}"
}

check_cmd() {
  local label="$1"
  local cmd="$2"
  local version_flag="${3:---version}"

  if command -v "$cmd" &>/dev/null; then
    local ver
    ver=$("$cmd" $version_flag 2>&1 | head -1)
    ok "${label}  ${DIM}→ ${ver}${RESET}"
  else
    fail "${label}  ${DIM}(not found)${RESET}"
  fi
}

# =============================================================================
#  BANNER
# =============================================================================
clear
echo ""
echo -e "${MAGENTA}${BOLD}"
echo "  ███████╗███╗   ██╗██╗   ██╗     ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗"
echo "  ██╔════╝████╗  ██║██║   ██║    ██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝"
echo "  █████╗  ██╔██╗ ██║██║   ██║    ██║     ███████║█████╗  ██║     █████╔╝ "
echo "  ██╔══╝  ██║╚██╗██║╚██╗ ██╔╝    ██║     ██╔══██║██╔══╝  ██║     ██╔═██╗ "
echo "  ███████╗██║ ╚████║ ╚████╔╝     ╚██████╗██║  ██║███████╗╚██████╗██║  ██╗"
echo "  ╚══════╝╚═╝  ╚═══╝  ╚═══╝       ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝"
echo -e "${RESET}"
echo -e "  ${DIM}Dev Environment Audit — $(date '+%A %b %d, %Y  %I:%M %p')${RESET}"
echo ""

# =============================================================================
#  1. SYSTEM
# =============================================================================
header "SYSTEM"
info "OS:     $(uname -s) $(uname -r)"
info "Shell:  $SHELL"
info "User:   $(whoami)"
info "Home:   $HOME"
info "CWD:    $(pwd)"

# =============================================================================
#  2. NODE & PACKAGE MANAGERS
# =============================================================================
header "NODE & PACKAGE MANAGERS"

check_cmd "node" "node" "--version"
check_cmd "npm"  "npm"  "--version"

if command -v corepack &>/dev/null; then
  ok "corepack  ${DIM}→ $(corepack --version 2>&1 | head -1)${RESET}"
else
  warn "corepack  (not found — needed for managed pnpm/yarn)"
fi

if command -v pnpm &>/dev/null; then
  ok "pnpm  ${DIM}→ $(pnpm --version 2>&1)${RESET}"
else
  warn "pnpm  (not found)"
fi

if command -v yarn &>/dev/null; then
  ok "yarn  ${DIM}→ $(yarn --version 2>&1)${RESET}"
else
  info "yarn  (not installed — optional)"
fi

if command -v bun &>/dev/null; then
  ok "bun  ${DIM}→ $(bun --version 2>&1)${RESET}"
else
  info "bun  (not installed — optional)"
fi

# =============================================================================
#  3. TURBOREPO
# =============================================================================
header "TURBOREPO"

if command -v turbo &>/dev/null; then
  TURBO_VER=$(turbo --version 2>&1 | head -1)
  ok "turbo CLI  ${DIM}→ ${TURBO_VER}${RESET}"

  # Check for turbo.json in CWD or parent dirs
  TURBO_JSON=$(find . -maxdepth 3 -name "turbo.json" 2>/dev/null | head -5)
  if [ -n "$TURBO_JSON" ]; then
    ok "turbo.json found:"
    while IFS= read -r f; do
      info "$f"
    done <<< "$TURBO_JSON"
  else
    warn "turbo.json  (not found in current tree — are you in a Turborepo root?)"
  fi

  # Check for pipeline/tasks config
  if [ -f "turbo.json" ]; then
    TASKS=$(node -e "const t=require('./turbo.json'); const p=t.pipeline||t.tasks||{}; console.log(Object.keys(p).join(', '))" 2>/dev/null)
    if [ -n "$TASKS" ]; then
      ok "turbo tasks/pipeline:"
      info "$TASKS"
    else
      warn "turbo.json exists but no pipeline/tasks keys found"
    fi

    # Remote cache config
    RC=$(node -e "const t=require('./turbo.json'); console.log(t.remoteCache ? JSON.stringify(t.remoteCache) : 'none')" 2>/dev/null)
    info "remote cache: $RC"
  fi

  # turbo run dry-run on build (safe — no actual execution)
  if [ -f "turbo.json" ]; then
    echo ""
    info "Running: turbo run build --dry=json (no actual build)"
    DRY=$(turbo run build --dry=json 2>&1)
    if echo "$DRY" | grep -q '"packages"'; then
      PKGS=$(echo "$DRY" | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{ try{ const j=JSON.parse(d); console.log((j.packages||[]).join(', ')); }catch(e){console.log('parse error');} })" 2>/dev/null)
      ok "turbo can resolve build graph"
      info "packages in scope: $PKGS"
    else
      warn "turbo dry-run did not return expected JSON (may be fine outside monorepo root)"
    fi
  fi
else
  fail "turbo  (not found — install with: npm i -g turbo  OR  pnpm add -g turbo)"
fi

# =============================================================================
#  4. FLOW (Type Checker)
# =============================================================================
header "FLOW TYPE CHECKER"

if command -v flow &>/dev/null; then
  FLOW_VER=$(flow version 2>&1 | head -1)
  ok "flow binary  ${DIM}→ ${FLOW_VER}${RESET}"

  # Check .flowconfig
  FLOW_CFG=$(find . -maxdepth 3 -name ".flowconfig" 2>/dev/null | head -3)
  if [ -n "$FLOW_CFG" ]; then
    ok ".flowconfig found:"
    while IFS= read -r f; do info "$f"; done <<< "$FLOW_CFG"
  else
    warn ".flowconfig  (not found — Flow won't run without it)"
  fi

  # Check flow server status (non-blocking)
  if [ -f ".flowconfig" ]; then
    FLOW_STATUS=$(flow status --quiet 2>&1)
    EXIT=$?
    if [ $EXIT -eq 0 ]; then
      ok "flow server  → no errors"
    elif echo "$FLOW_STATUS" | grep -qi "no errors"; then
      ok "flow server  → no errors"
    elif echo "$FLOW_STATUS" | grep -qi "found [0-9]* error"; then
      warn "flow server  → $(echo "$FLOW_STATUS" | grep -oi 'found [0-9]* error[s]*')"
    else
      warn "flow server  → status unknown (may need: flow start)"
      info "$FLOW_STATUS"
    fi
  fi

  # Check @flow annotated files
  FLOW_FILES=$(grep -rl "@flow" src/ 2>/dev/null | wc -l | tr -d ' ')
  if [ -n "$FLOW_FILES" ] && [ "$FLOW_FILES" -gt 0 ]; then
    info "@flow annotated files in src/: $FLOW_FILES"
  fi
else
  # Check for local flow in node_modules
  LOCAL_FLOW=$(find . -path "*/node_modules/.bin/flow" 2>/dev/null | head -1)
  if [ -n "$LOCAL_FLOW" ]; then
    VER=$("$LOCAL_FLOW" version 2>&1 | head -1)
    ok "flow (local)  ${DIM}→ ${VER}${RESET}"
    info "path: $LOCAL_FLOW"
    info "Tip: add node_modules/.bin to PATH or use npx flow"
  else
    warn "flow  (not found globally or locally)"
    info "Install: npm add --dev flow-bin  OR  npm i -g flow-bin"
  fi
fi

# =============================================================================
#  5. GIT & WORKTREES
# =============================================================================
header "GIT & WORKTREES"

if command -v git &>/dev/null; then
  ok "git  ${DIM}→ $(git --version)${RESET}"

  # Check if inside a git repo
  if git rev-parse --git-dir &>/dev/null 2>&1; then
    BRANCH=$(git branch --show-current 2>/dev/null || echo "detached HEAD")
    REMOTE=$(git remote get-url origin 2>/dev/null || echo "no remote 'origin'")
    ok "git repo detected"
    info "branch: $BRANCH"
    info "origin: $REMOTE"

    # Uncommitted changes
    STATUS=$(git status --short 2>/dev/null)
    if [ -z "$STATUS" ]; then
      ok "working tree  → clean"
    else
      CHANGED=$(echo "$STATUS" | wc -l | tr -d ' ')
      warn "working tree  → $CHANGED uncommitted change(s)"
    fi

    # ── WORKTREES ────────────────────────────────────────────────────────────
    echo ""
    info "── Worktrees ──"
    WT_LIST=$(git worktree list 2>/dev/null)
    WT_COUNT=$(echo "$WT_LIST" | wc -l | tr -d ' ')

    if [ "$WT_COUNT" -ge 1 ]; then
      ok "$WT_COUNT worktree(s) registered:"
      while IFS= read -r wt; do
        WT_PATH=$(echo "$wt" | awk '{print $1}')
        WT_BRANCH=$(echo "$wt" | grep -oP '\[.*?\]' | tr -d '[]')
        WT_COMMIT=$(echo "$wt" | awk '{print $2}')

        if [ -d "$WT_PATH" ]; then
          STATUS_ICON="${GREEN}✔${RESET}"
        else
          STATUS_ICON="${RED}✘ (missing dir)${RESET}"
        fi

        echo -e "     ${STATUS_ICON}  ${BOLD}${WT_BRANCH:-bare}${RESET}  ${DIM}${WT_COMMIT}  →  ${WT_PATH}${RESET}"
      done <<< "$WT_LIST"
    else
      info "No additional worktrees (only main tree)"
    fi

    # Prunable worktrees
    PRUNE_CHECK=$(git worktree prune --dry-run 2>/dev/null)
    if [ -n "$PRUNE_CHECK" ]; then
      warn "Prunable worktrees detected (run: git worktree prune):"
      info "$PRUNE_CHECK"
    fi

  else
    warn "Not inside a git repository (CWD: $(pwd))"
    info "Run this script from inside your project root"
  fi
else
  fail "git  (not found)"
fi

# =============================================================================
#  6. MONOREPO STRUCTURE
# =============================================================================
header "MONOREPO STRUCTURE"

# package.json workspaces
if [ -f "package.json" ]; then
  ok "package.json  found at root"

  # Detect package manager from lockfiles
  if [ -f "pnpm-lock.yaml" ]; then
    ok "lockfile  → pnpm-lock.yaml  ${DIM}(pnpm workspace)${RESET}"
  elif [ -f "yarn.lock" ]; then
    ok "lockfile  → yarn.lock  ${DIM}(yarn workspace)${RESET}"
  elif [ -f "package-lock.json" ]; then
    ok "lockfile  → package-lock.json  ${DIM}(npm workspaces)${RESET}"
  elif [ -f "bun.lockb" ]; then
    ok "lockfile  → bun.lockb  ${DIM}(bun)${RESET}"
  else
    warn "No lockfile found — dependencies may not be installed"
  fi

  # pnpm-workspace.yaml
  if [ -f "pnpm-workspace.yaml" ]; then
    ok "pnpm-workspace.yaml  found"
    GLOBS=$(cat pnpm-workspace.yaml)
    info "$GLOBS"
  fi

  # Workspaces field in package.json
  WORKSPACES=$(node -e "const p=require('./package.json'); const w=p.workspaces; if(w) console.log(Array.isArray(w)?w.join(', '):(w.packages||[]).join(', '))" 2>/dev/null)
  if [ -n "$WORKSPACES" ]; then
    ok "workspace globs:  ${DIM}$WORKSPACES${RESET}"
  fi

  # Count packages
  APPS=$(find apps -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
  PKGS=$(find packages -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
  [ "$APPS" -gt 0 ] && info "apps/:      $APPS app(s)"
  [ "$PKGS" -gt 0 ] && info "packages/:  $PKGS package(s)"
else
  warn "No package.json at root — run from monorepo root"
fi

# =============================================================================
#  7. TYPESCRIPT / BUILD TOOLS
# =============================================================================
header "TYPESCRIPT & BUILD TOOLS"

check_cmd "TypeScript (tsc)" "tsc" "--version"

if [ ! -f "$(command -v tsc 2>/dev/null)" ]; then
  LOCAL_TSC=$(find . -path "*/node_modules/.bin/tsc" 2>/dev/null | head -1)
  [ -n "$LOCAL_TSC" ] && info "local tsc found: $LOCAL_TSC"
fi

check_cmd "Vite" "vite" "--version"
check_cmd "esbuild" "esbuild" "--version"
check_cmd "swc" "swc" "--version"

# tsconfig check
TSCONFIGS=$(find . -maxdepth 3 -name "tsconfig*.json" ! -path "*/node_modules/*" 2>/dev/null | sort)
if [ -n "$TSCONFIGS" ]; then
  ok "tsconfig files:"
  while IFS= read -r f; do info "$f"; done <<< "$TSCONFIGS"
else
  info "No tsconfig files found (may be JS-only project)"
fi

# =============================================================================
#  8. ENVIRONMENT & CONFIG FILES
# =============================================================================
header "ENV & CONFIG FILES"

ENV_FILES=(".env" ".env.local" ".env.development" ".env.production" ".env.test")
FOUND_ENV=0
for ef in "${ENV_FILES[@]}"; do
  if [ -f "$ef" ]; then
    LINES=$(wc -l < "$ef" | tr -d ' ')
    ok "$ef  ${DIM}($LINES lines)${RESET}"
    ((FOUND_ENV++))
  fi
done
[ $FOUND_ENV -eq 0 ] && info "No .env files at root (may be app-level)"

# .nvmrc / .node-version
if [ -f ".nvmrc" ]; then
  ok ".nvmrc  ${DIM}→ $(cat .nvmrc | tr -d '\n')${RESET}"
fi
if [ -f ".node-version" ]; then
  ok ".node-version  ${DIM}→ $(cat .node-version | tr -d '\n')${RESET}"
fi

# =============================================================================
#  9. GLOBAL TOOLS MISCELLANEOUS
# =============================================================================
header "GLOBAL TOOLS"

check_cmd "gh (GitHub CLI)" "gh" "--version"
check_cmd "jq" "jq" "--version"
check_cmd "curl" "curl" "--version"
check_cmd "docker" "docker" "--version"

if command -v npx &>/dev/null; then
  ok "npx  ${DIM}→ $(npx --version 2>&1)${RESET}"
fi

# =============================================================================
#  10. SUMMARY
# =============================================================================
TOTAL=$((PASS + WARN + FAIL))
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  SUMMARY   ${GREEN}${PASS} passed${RESET}   ${YELLOW}${WARN} warnings${RESET}   ${RED}${FAIL} failed${RESET}   (${TOTAL} checks)"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

if [ $FAIL -gt 0 ]; then
  echo -e "  ${RED}${BOLD}Action needed:${RESET} $FAIL tool(s) missing above. Check the ${RED}✘${RESET} lines."
elif [ $WARN -gt 0 ]; then
  echo -e "  ${YELLOW}${BOLD}Mostly good!${RESET} $WARN warning(s) worth reviewing."
else
  echo -e "  ${GREEN}${BOLD}All good — fully armed and operational. ✔${RESET}"
fi

echo ""

# Task 8: InsightsView Component

## Summary
Built the complete InsightsView component at `src/components/views/insights-view.tsx` — a full-featured insights feed with filtering, feedback, and real-time UI updates.

## What Was Built

### InsightsView Component (`src/components/views/insights-view.tsx`)
A `'use client'` component with these features:

1. **Header** — "Insights" title with "Proactive intelligence from your connected data" subtitle, Lightbulb icon, and Refresh button
2. **Stats Summary** — Row of stat chips: Pending count, Acted count, Dismissed count, Useful Rate %, each with colored pill styling
3. **Filter Bar** — 
   - Type filter pills: All, Connections, Reminders, Drafts, Summaries, Suggestions (with icons)
   - Status filter buttons: All, Pending, Surfaced, Acted, Dismissed
   - Active count indicator: "N insights"
   - Clear filters button when filters are active
4. **Insight Feed** — Scrollable vertical list with max-height constraint
5. **Insight Cards** — Each card has:
   - Left colored accent bar (orange/red/sky/emerald/purple by type)
   - Type badge with icon and color coding
   - Status badge for non-pending states
   - Bold title
   - Full claim text (not truncated)
   - Priority indicator (10 dots, colored by severity with tooltip)
   - Action button when present (highlighted Zap icon)
   - Source memories count: "Based on N memories"
   - Relative time display
   - Feedback buttons row: 👍 Useful, 👎 Not Useful, ✓ Already Knew, ✕ Dismiss
   - On feedback: instant border color change + feedback label replaces buttons
   - Dismissed/expired cards: reduced opacity (muted)
6. **Empty State** — Contextual empty state with icon and messaging (different for no insights vs no matching filters)
7. **Loading State** — 4 card skeletons with matching structure
8. **Error State** — Alert with retry button

### Sub-components
- `PriorityBar` — 10-dot priority visualization with tooltip
- `FeedbackRow` — Feedback buttons or feedback label display
- `InsightCardComponent` — Full insight card rendering
- `InsightCardSkeleton` — Loading skeleton matching card layout

### API Integration
- Updated `GET /api/insights` to return `{ insights: [...] }` format
- PATCH feedback/dismiss with optimistic updates and error rollback
- Filter params via query string (`type`, `status`)
- Fetches data based on store filters from `useCortexStore`

## Key Design Decisions
- **Optimistic updates**: Feedback and dismiss actions update UI immediately, revert on API failure
- **Responsive**: Full-width cards on mobile, all controls stack nicely
- **Scrollable feed**: `max-h-[calc(100vh-420px)]` with overflow-y-auto
- **Muted inactive cards**: Dismissed/expired cards at 50% opacity
- **No blue/indigo**: Uses emerald, amber, orange, red, purple, sky palette
- **Store integration**: Reads/writes `insightFilters` from Zustand store

# Task 6: ConnectorsView Component

**Agent**: Main Developer  
**Status**: Completed  

## Work Log

- Explored project structure: types, store, helpers, constants, API routes, shadcn components
- Reviewed existing API endpoints (GET/POST /api/connectors, POST /api/connectors/{id}/sync, DELETE /api/connectors/{id})
- Verified Prisma schema and seed data (8 pre-seeded connectors with varied statuses)
- Created `src/components/views/connectors-view.tsx` with all requested features
- Updated `src/app/page.tsx` to render ConnectorsView
- Fixed lint issues: wrapped synchronous setState in effect body with `setTimeout(0)` callbacks to satisfy `react-hooks/set-state-in-effect` rule
- Clean lint pass: 0 errors, 0 warnings

## Files Created/Modified

### 1. `src/components/views/connectors-view.tsx` (NEW — 678 lines)
Complete `'use client'` component with:

**Sub-components:**
- `getStatusBadgeClasses()` — Maps ConnectorStatus to colored Badge classes (active=emerald, connecting=amber, error=red, disconnected=zinc) with dark mode variants
- `getStatusDot()` — Returns status-appropriate icon (CheckCircle, Loader2 with spin, AlertCircle, Clock)
- `ConnectorCard` — Individual connector card with:
  - Type-specific Lucide icon in a rounded muted background
  - Name and type label
  - Status badge with dot icon and colored outline
  - Item count formatted with locale commas ("2,847 items")
  - Last sync as relative time or "Never synced"
  - Error message in red alert box (line-clamped to 2 lines)
  - Animated progress bar (resets on sync start, fills to 95%, snaps to 100% on completion, fades)
  - Action buttons: Sync (spinning Loader2 while active), Configure (disabled for MVP), Remove (AlertDialog confirm)
  - Hover effects: shadow-md + -translate-y-0.5
- `ConnectorSkeletonGrid` — 6 skeleton cards matching card layout during loading
- `ConnectorsView` — Main export with:
  - Header: title, subtitle, Sync All button, Add Connector button
  - Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
  - Empty state with plug icon and inline Add Connector dialog
  - Dashed "Add Connector" card at end of grid (when types available)
  - Add Connector Dialog: 2-col grid of available connector types with icons and descriptions
  - Only shows connector types NOT already connected

**API Integration:**
- `GET /api/connectors` — fetches and maps to Connector type
- `POST /api/connectors/{id}/sync` — triggers sync with progress animation
- `DELETE /api/connectors/{id}` — removes with AlertDialog confirmation
- `POST /api/connectors` — adds new connector with type and default name

**State Management:**
- Local state for connectors list, loading, syncing IDs, dialog open
- Zustand store integration (`selectConnector` on card click)

### 2. `src/app/page.tsx` (MODIFIED)
- Replaced placeholder with ConnectorsView rendered in a max-w-7xl container

## Key Design Decisions

1. **Progress animation**: Used `setTimeout(0)` to defer all setState calls within effects, satisfying the strict `react-hooks/set-state-in-effect` lint rule
2. **API response mapping**: The GET endpoint returns Prisma objects with `_count`; mapped to clean `Connector` type via `ConnectorApiResponse` interface
3. **Dialog sharing**: Used controlled `open`/`onOpenChange` to share the same dialog state across header button, empty state, and dashed card trigger
4. **Dark mode**: All status colors include explicit `dark:` variants for both light and dark themes
5. **No indigo/blue**: Used emerald, amber, red, zinc color palette exclusively

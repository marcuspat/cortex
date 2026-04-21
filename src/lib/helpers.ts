// ─── Time Formatting ────────────────────────────────────────────────────────

/**
 * Convert an ISO date string to a human-readable relative time.
 * Examples: "just now", "2 minutes ago", "3 hours ago", "yesterday", "5 days ago"
 */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

// ─── Duration Formatting ────────────────────────────────────────────────────

/**
 * Format milliseconds into a human-readable duration.
 * Examples: "45ms", "1.2s", "2m 30s"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;

  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (minutes < 60) return `${minutes}m ${seconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

// ─── JSON Parsing ───────────────────────────────────────────────────────────

/**
 * Safely parse a JSON string, returning a fallback value on failure.
 */
export function parseJson<T>(str: string, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

// ─── String Utilities ───────────────────────────────────────────────────────

/**
 * Truncate a string to the given length, appending "…" if truncated.
 */
export function truncate(str: string, length: number): string {
  if (!str || str.length <= length) return str;
  return str.slice(0, length).trimEnd() + '…';
}

// ─── Status Color Mapping ───────────────────────────────────────────────────

const statusColorMap: Record<string, string> = {
  // Connector & general statuses
  active: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  connecting: 'text-amber-600 bg-amber-50 border-amber-200',
  disconnected: 'text-zinc-500 bg-zinc-50 border-zinc-200',
  error: 'text-red-600 bg-red-50 border-red-200',
  idle: 'text-zinc-500 bg-zinc-50 border-zinc-200',
  running: 'text-sky-600 bg-sky-50 border-sky-200',

  // Insight statuses
  pending: 'text-amber-600 bg-amber-50 border-amber-200',
  surfaced: 'text-violet-600 bg-violet-50 border-violet-200',
  acted: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  dismissed: 'text-zinc-400 bg-zinc-50 border-zinc-200',
  expired: 'text-zinc-400 bg-zinc-50 border-zinc-200',
  completed: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  failed: 'text-red-600 bg-red-50 border-red-200',
};

/**
 * Get tailwind color classes for a given status string.
 * Returns neutral styling for unknown statuses.
 */
export function getStatusColor(status: string): string {
  return statusColorMap[status] ?? 'text-zinc-500 bg-zinc-50 border-zinc-200';
}

// ─── Source Type Icon Mapping ───────────────────────────────────────────────

const sourceTypeIconMap: Record<string, string> = {
  email: 'Mail',
  code: 'Code',
  note: 'StickyNote',
  document: 'FileText',
  chat: 'MessageSquare',
  calendar: 'Calendar',
  bookmark: 'Bookmark',
};

/**
 * Get the lucide icon name for a source type.
 * Returns 'File' as fallback for unknown types.
 */
export function getSourceTypeIcon(type: string): string {
  return sourceTypeIconMap[type] ?? 'File';
}

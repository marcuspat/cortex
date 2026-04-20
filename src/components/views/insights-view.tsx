'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useCortexStore } from '@/lib/store';
import type {
  InsightCard,
  InsightType,
  InsightStatus,
  InsightFeedback,
} from '@/lib/types';
import { formatRelativeTime, parseJson } from '@/lib/helpers';
import { INSIGHT_TYPE_INFO } from '@/lib/constants';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Lightbulb,
  Link,
  Bell,
  FileEdit,
  BarChart3,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  Clock,
  AlertTriangle,
  Zap,
  Eye,
  Archive,
  ChevronRight,
  RefreshCw,
  Filter,
  Layers,
  BrainCircuit,
} from 'lucide-react';

// ─── Type Config ─────────────────────────────────────────────────────────────

const TYPE_FILTERS: Array<{ value: InsightType | 'all'; label: string; icon: React.ElementType }> = [
  { value: 'all', label: 'All', icon: Layers },
  { value: 'connection', label: 'Connections', icon: Link },
  { value: 'reminder', label: 'Reminders', icon: Bell },
  { value: 'draft', label: 'Drafts', icon: FileEdit },
  { value: 'summary', label: 'Summaries', icon: BarChart3 },
  { value: 'suggestion', label: 'Suggestions', icon: Sparkles },
];

const STATUS_FILTERS: Array<{ value: InsightStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'surfaced', label: 'Surfaced' },
  { value: 'acted', label: 'Acted' },
  { value: 'dismissed', label: 'Dismissed' },
];

// ─── Accent Colors ───────────────────────────────────────────────────────────

const TYPE_ACCENT: Record<InsightType, string> = {
  connection: 'border-l-orange-500',
  reminder: 'border-l-red-500',
  draft: 'border-l-sky-500',
  summary: 'border-l-emerald-500',
  suggestion: 'border-l-purple-500',
};

const TYPE_ACCENT_BG: Record<InsightType, string> = 'bg-orange-500';
const TYPE_BADGE_CLASSES: Record<InsightType, string> = {
  connection:
    'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  reminder:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  draft:
    'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  summary:
    'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  suggestion:
    'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
};

const FEEDBACK_BORDER: Record<string, string> = {
  useful: 'border-l-emerald-400',
  not_useful: 'border-l-zinc-300',
  already_knew: 'border-l-sky-400',
};

const FEEDBACK_LABEL: Record<string, string> = {
  useful: 'Marked as useful',
  not_useful: 'Marked as not useful',
  already_knew: 'Already knew this',
};

const TYPE_ICON: Record<InsightType, React.ElementType> = {
  connection: Link,
  reminder: Bell,
  draft: FileEdit,
  summary: BarChart3,
  suggestion: Sparkles,
};

// ─── Priority Bar ────────────────────────────────────────────────────────────

function PriorityBar({ priority }: { priority: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i < priority
                  ? priority >= 8
                    ? 'bg-red-500'
                    : priority >= 5
                      ? 'bg-amber-500'
                      : 'bg-zinc-400'
                  : 'bg-zinc-200 dark:bg-zinc-700'
              }`}
            />
          ))}
          <span className="ml-1 text-[10px] text-muted-foreground font-medium">
            {priority}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Priority: {priority}/10</p>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Feedback Buttons ────────────────────────────────────────────────────────

function FeedbackRow({
  insight,
  onFeedback,
  onDismiss,
}: {
  insight: InsightCard;
  onFeedback: (id: string, feedback: InsightFeedback) => void;
  onDismiss: (id: string) => void;
}) {
  if (insight.feedback) {
    return (
      <div className="flex items-center gap-1.5 pt-3 border-t border-border/50">
        {insight.feedback === 'useful' && (
          <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />
        )}
        {insight.feedback === 'not_useful' && (
          <ThumbsDown className="h-3.5 w-3.5 text-zinc-400" />
        )}
        {insight.feedback === 'already_knew' && (
          <Check className="h-3.5 w-3.5 text-sky-500" />
        )}
        <span className="text-xs text-muted-foreground">
          {FEEDBACK_LABEL[insight.feedback]}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 pt-3 border-t border-border/50">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-muted-foreground hover:text-emerald-600"
            onClick={() => onFeedback(insight.id, 'useful')}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">Useful</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Mark as useful</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-muted-foreground hover:text-red-500"
            onClick={() => onFeedback(insight.id, 'not_useful')}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">Not Useful</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Mark as not useful</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-muted-foreground hover:text-sky-600"
            onClick={() => onFeedback(insight.id, 'already_knew')}
          >
            <Check className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">Already Knew</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>I already knew this</TooltipContent>
      </Tooltip>
      <div className="flex-1" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-muted-foreground hover:text-zinc-500"
            onClick={() => onDismiss(insight.id)}
          >
            <X className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">Dismiss</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Dismiss this insight</TooltipContent>
      </Tooltip>
    </div>
  );
}

// ─── Insight Card ────────────────────────────────────────────────────────────

function InsightCardComponent({
  insight,
  onFeedback,
  onDismiss,
}: {
  insight: InsightCard;
  onFeedback: (id: string, feedback: InsightFeedback) => void;
  onDismiss: (id: string) => void;
}) {
  const isDismissed = insight.status === 'dismissed';
  const isActed = insight.status === 'acted';
  const isExpired = insight.status === 'expired';
  const isInactive = isDismissed || isExpired;

  const memoryIds = parseJson<string[]>(insight.memoryIds, []);
  const memoryCount = memoryIds.length;

  const accentClass = insight.feedback
    ? FEEDBACK_BORDER[insight.feedback] ?? TYPE_ACCENT[insight.type]
    : TYPE_ACCENT[insight.type];

  const TypeIcon = TYPE_ICON[insight.type];

  return (
    <Card
      className={`border-l-4 ${accentClass} transition-all duration-200 ${
        isInactive
          ? 'opacity-50 border border-l-4'
          : isActed
            ? 'border-border/60 border-l-4'
            : 'border-border hover:shadow-sm'
      }`}
    >
      <CardContent className="p-4 sm:p-5">
        {/* Top row: badge + time */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold uppercase tracking-wider gap-1 ${TYPE_BADGE_CLASSES[insight.type]}`}
          >
            <TypeIcon className="h-3 w-3" />
            {insight.type}
          </Badge>
          <div className="flex items-center gap-2 shrink-0">
            {insight.status !== 'pending' && insight.status !== 'surfaced' && (
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  isActed
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : isDismissed
                      ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                {insight.status}
              </span>
            )}
            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(insight.createdAt)}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold leading-snug mb-1.5">{insight.title}</h3>

        {/* Claim */}
        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap mb-3">
          {insight.claim}
        </p>

        {/* Priority */}
        <div className="mb-3">
          <PriorityBar priority={insight.priority} />
        </div>

        {/* Action button */}
        {insight.action && !isInactive && (
          <div className="mb-3">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors w-full sm:w-auto"
            >
              <Zap className="h-3.5 w-3.5" />
              {insight.action}
              <ChevronRight className="h-3.5 w-3.5 ml-auto" />
            </button>
          </div>
        )}

        {/* Source memories */}
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs mb-1">
          <BrainCircuit className="h-3.5 w-3.5" />
          Based on {memoryCount} {memoryCount === 1 ? 'memory' : 'memories'}
        </div>

        {/* Feedback */}
        {!isInactive && (
          <FeedbackRow
            insight={insight}
            onFeedback={onFeedback}
            onDismiss={onDismiss}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Card Skeleton ───────────────────────────────────────────────────────────

function InsightCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-zinc-300 dark:border-l-zinc-600">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-1.5 w-1.5 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-1 pt-3 border-t border-border/50">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-20" />
          <div className="flex-1" />
          <Skeleton className="h-7 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function InsightsView() {
  const { insightFilters, setInsightFilters } = useCortexStore();

  // ── Data state ──
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch insights ──
  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (insightFilters.type) params.set('type', insightFilters.type);
      if (insightFilters.status) params.set('status', insightFilters.status);

      const res = await fetch(`/api/insights?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch insights');
      const data = await res.json();
      setInsights(Array.isArray(data) ? data : data.insights ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [insightFilters.type, insightFilters.status]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // ── Feedback handler ──
  const handleFeedback = useCallback(
    async (id: string, feedback: InsightFeedback) => {
      // Optimistic update
      setInsights((prev) =>
        prev.map((i) => (i.id === id ? { ...i, feedback, updatedAt: new Date().toISOString() } : i))
      );
      try {
        await fetch(`/api/insights/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback }),
        });
      } catch {
        // Revert on failure
        await fetchInsights();
      }
    },
    [fetchInsights]
  );

  // ── Dismiss handler ──
  const handleDismiss = useCallback(
    async (id: string) => {
      // Optimistic update
      setInsights((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, status: 'dismissed' as InsightStatus, updatedAt: new Date().toISOString() } : i
        )
      );
      try {
        await fetch(`/api/insights/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'dismissed' }),
        });
      } catch {
        // Revert on failure
        await fetchInsights();
      }
    },
    [fetchInsights]
  );

  // ── Computed stats ──
  const stats = useMemo(() => {
    const pending = insights.filter((i) => i.status === 'pending' || i.status === 'surfaced').length;
    const acted = insights.filter((i) => i.status === 'acted').length;
    const dismissed = insights.filter((i) => i.status === 'dismissed').length;
    const withFeedback = insights.filter((i) => i.feedback);
    const useful = insights.filter((i) => i.feedback === 'useful').length;
    const usefulRate =
      withFeedback.length > 0
        ? Math.round((useful / withFeedback.length) * 100)
        : 0;

    return { pending, acted, dismissed, usefulRate, total: insights.length };
  }, [insights]);

  // ── Filter handlers ──
  const handleTypeFilter = (value: InsightType | 'all') => {
    setInsightFilters({ type: value === 'all' ? null : value });
  };

  const handleStatusFilter = (value: InsightStatus | 'all') => {
    setInsightFilters({ status: value === 'all' ? null : value });
  };

  const hasActiveFilters = insightFilters.type !== null || insightFilters.status !== null;

  // ── Error state ──
  if (error && insights.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button variant="outline" onClick={fetchInsights}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
            <p className="text-muted-foreground text-sm">
              Proactive intelligence from your connected data
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground mt-2 sm:mt-0"
          onClick={fetchInsights}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Stats Summary ─────────────────────────────────────────────────── */}
      {!loading && insights.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Eye className="h-3 w-3" />
            {stats.pending} Pending
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <Check className="h-3 w-3" />
            {stats.acted} Acted
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            <Archive className="h-3 w-3" />
            {stats.dismissed} Dismissed
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300">
            <BrainCircuit className="h-3 w-3" />
            {stats.usefulRate}% Useful Rate
          </div>
        </div>
      )}

      {/* ── Filter Bar ────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Type pills */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-muted-foreground mr-1 text-xs font-medium hidden sm:inline">
              <Filter className="inline h-3 w-3 mr-1" />
              Type:
            </span>
            {TYPE_FILTERS.map((filter) => {
              const Icon = filter.icon;
              const isActive =
                filter.value === 'all'
                  ? insightFilters.type === null
                  : insightFilters.type === filter.value;

              return (
                <Button
                  key={filter.value}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 gap-1.5 text-xs px-2.5"
                  onClick={() => handleTypeFilter(filter.value)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {filter.label}
                </Button>
              );
            })}
          </div>

          {/* Status filter + count */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map((filter) => {
                const isActive =
                  filter.value === 'all'
                    ? insightFilters.status === null
                    : insightFilters.status === filter.value;

                return (
                  <Button
                    key={filter.value}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className={`h-7 text-xs px-2.5 ${isActive ? '' : 'text-muted-foreground'}`}
                    onClick={() => handleStatusFilter(filter.value)}
                  >
                    {filter.label}
                  </Button>
                );
              })}
            </div>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            {!loading && (
              <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                {insights.length} insight{insights.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground gap-1"
            onClick={() => {
              setInsightFilters({ type: null, status: null });
            }}
          >
            <X className="h-3 w-3" />
            Clear filters
          </Button>
        )}
      </div>

      <Separator />

      {/* ── Insight Feed ──────────────────────────────────────────────────── */}
      <div className="space-y-3 max-h-[calc(100vh-420px)] overflow-y-auto pr-1">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <InsightCardSkeleton key={i} />
            ))}
          </>
        ) : insights.length > 0 ? (
          insights.map((insight) => (
            <InsightCardComponent
              key={insight.id}
              insight={insight}
              onFeedback={handleFeedback}
              onDismiss={handleDismiss}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-2xl">
              <Lightbulb className="text-muted-foreground h-7 w-7" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">
                {hasActiveFilters
                  ? 'No insights match your filters'
                  : 'No insights yet'}
              </p>
              <p className="text-muted-foreground text-xs">
                {hasActiveFilters
                  ? 'Try adjusting your type or status filters'
                  : 'Connect some data sources and let your agents discover patterns'}
              </p>
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setInsightFilters({ type: null, status: null });
                }}
              >
                <Filter className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

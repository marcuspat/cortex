'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Bot,
  Search,
  Zap,
  Link,
  FileEdit,
  ListChecks,
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Activity,
  Play,
  AlertTriangle,
  Code,
  Database,
  Loader2,
  RefreshCw,
  ArrowUpDown,
} from 'lucide-react';
import type { AgentStatus, AgentTrace, AgentType } from '@/lib/types';
import { formatRelativeTime, formatDuration, parseJson, truncate } from '@/lib/helpers';
import { AGENT_INFO } from '@/lib/constants';

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const LUCIDE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Database,
  Search,
  Plug: Link,
  PenTool: FileEdit,
  CalendarClock: ListChecks,
  Workflow: Zap,
  Bot,
  Brain,
};

function AgentIcon({ name, className }: { name: string; className?: string }) {
  const Icon = LUCIDE_ICONS[name] ?? Bot;
  return <Icon className={className} />;
}

// ─── Agent Color Map ──────────────────────────────────────────────────────────

const AGENT_COLORS: Record<AgentType, string> = {
  indexer: 'bg-emerald-500',
  researcher: 'bg-violet-500',
  connector: 'bg-sky-500',
  drafter: 'bg-amber-500',
  planner: 'bg-rose-500',
  orchestrator: 'bg-zinc-500',
};

const AGENT_BADGE_CLASSES: Record<AgentType, string> = {
  indexer: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  researcher: 'border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
  connector: 'border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  drafter: 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  planner: 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
  orchestrator: 'border-zinc-300 bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
};

// ─── Status Helpers ───────────────────────────────────────────────────────────

function getStatusDotColor(status: AgentStatus['status']): string {
  switch (status) {
    case 'running':
      return 'bg-sky-500';
    case 'error':
      return 'bg-red-500';
    case 'idle':
    default:
      return 'bg-emerald-500';
  }
}

function getStatusLabel(status: AgentStatus['status']): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'error':
      return 'Error';
    case 'idle':
    default:
      return 'Idle';
  }
}

function getTraceStatusBadge(status: AgentTrace['status']): {
  label: string;
  classes: string;
  Icon: React.ComponentType<{ className?: string }>;
} {
  switch (status) {
    case 'completed':
      return {
        label: 'Completed',
        classes: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
        Icon: CheckCircle,
      };
    case 'failed':
      return {
        label: 'Failed',
        classes: 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
        Icon: XCircle,
      };
    case 'running':
      return {
        label: 'Running',
        classes: 'border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
        Icon: Loader2,
      };
  }
}

// ─── API Response Shape ───────────────────────────────────────────────────────

interface TracesResponse {
  data: AgentTrace[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// ─── Agent Status Card Skeleton ───────────────────────────────────────────────

function AgentCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
        </div>
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

// ─── Agent Status Card ────────────────────────────────────────────────────────

function AgentStatusCard({ agent }: { agent: AgentStatus }) {
  const successRate =
    agent.runCount > 0
      ? Math.round((agent.successCount / agent.runCount) * 100)
      : 0;

  return (
    <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-4 space-y-3">
        {/* Header: icon, name, status */}
        <div className="flex items-center gap-3">
          <div className="bg-muted flex size-9 items-center justify-center rounded-lg">
            <AgentIcon name={agent.icon} className="text-muted-foreground size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{agent.label}</p>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {agent.description}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
            <span
              className={`size-1.5 rounded-full ${getStatusDotColor(agent.status)} ${
                agent.status === 'running' ? 'animate-pulse' : ''
              }`}
            />
            {getStatusLabel(agent.status)}
          </span>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
            <p className="text-xs font-semibold">{agent.runCount}</p>
            <p className="text-[10px] text-muted-foreground">Runs</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
            <p className="text-xs font-semibold">{successRate}%</p>
            <p className="text-[10px] text-muted-foreground">Success</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
            <p className="text-xs font-semibold">{formatDuration(agent.avgDurationMs)}</p>
            <p className="text-[10px] text-muted-foreground">Avg time</p>
          </div>
        </div>

        {/* Last run */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="size-3" />
          <span>Last run: {agent.lastRun ? formatRelativeTime(agent.lastRun) : 'Never'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Trace Item ───────────────────────────────────────────────────────────────

function TraceItem({ trace }: { trace: AgentTrace }) {
  const [open, setOpen] = useState(false);

  const statusBadge = getTraceStatusBadge(trace.status);
  const StatusIcon = statusBadge.Icon;

  // Parse input JSON for query summary
  const inputObj = parseJson<Record<string, unknown>>(trace.input, {});
  const inputQuery =
    typeof inputObj.query === 'string'
      ? inputObj.query
      : typeof inputObj.prompt === 'string'
        ? inputObj.prompt
        : typeof inputObj.task === 'string'
          ? inputObj.task
          : null;

  // Parse steps
  const steps = parseJson<Array<{ name?: string; status?: string; durationMs?: number }>>(
    trace.steps,
    []
  );

  // Parse memory IDs
  const memoryIds = parseJson<string[]>(trace.memoryIds, []);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="transition-colors hover:bg-muted/30">
        <CollapsibleTrigger className="w-full text-left">
          <CardContent className="p-4 space-y-2">
            {/* Top row: badges, duration, time */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${AGENT_BADGE_CLASSES[trace.agentType] ?? ''}`}
              >
                {trace.agentType}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${statusBadge.classes}`}
              >
                <StatusIcon className={`size-3 ${trace.status === 'running' ? 'animate-spin' : ''}`} />
                {statusBadge.label}
              </Badge>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Activity className="size-3" />
                {formatDuration(trace.durationMs)}
              </span>
              <span className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" />
                {formatRelativeTime(trace.createdAt)}
              </span>
            </div>

            {/* Input summary */}
            {inputQuery && (
              <p className="text-sm text-foreground/80 line-clamp-1">
                {truncate(inputQuery, 120)}
              </p>
            )}

            {/* Error message */}
            {trace.error && !open && (
              <div className="flex items-start gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <AlertTriangle className="size-3 mt-0.5 shrink-0" />
                <span className="line-clamp-1">{trace.error}</span>
              </div>
            )}

            {/* Expand indicator */}
            <div className="flex items-center justify-end">
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                {open ? 'Hide details' : 'Show details'}
                {open ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
              </span>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            <Separator />

            {/* Error message (expanded) */}
            {trace.error && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="size-3" />
                  Error
                </p>
                <pre className="rounded-md bg-red-50 dark:bg-red-950/50 p-3 text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap break-words">
                  {trace.error}
                </pre>
              </div>
            )}

            {/* Full input */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ArrowUpDown className="size-3" />
                Input
              </p>
              <pre className="rounded-md bg-muted p-3 text-xs text-foreground/80 whitespace-pre-wrap break-words max-h-40 overflow-y-auto font-mono">
                {JSON.stringify(inputObj, null, 2)}
              </pre>
            </div>

            {/* Full output */}
            {trace.output && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Code className="size-3" />
                  Output
                </p>
                <pre className="rounded-md bg-muted p-3 text-xs text-foreground/80 whitespace-pre-wrap break-words max-h-40 overflow-y-auto font-mono">
                  {JSON.stringify(parseJson<unknown>(trace.output, {}), null, 2)}
                </pre>
              </div>
            )}

            {/* Steps list */}
            {steps.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <ListChecks className="size-3" />
                  Steps ({steps.length})
                </p>
                <div className="space-y-1">
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-xs"
                    >
                      <span className="text-muted-foreground font-mono w-5 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="flex-1 truncate">{step.name ?? `Step ${idx + 1}`}</span>
                      {step.durationMs != null && (
                        <span className="text-muted-foreground shrink-0">
                          {formatDuration(step.durationMs)}
                        </span>
                      )}
                      {step.status && (
                        <span
                          className={`shrink-0 size-1.5 rounded-full ${
                            step.status === 'completed'
                              ? 'bg-emerald-500'
                              : step.status === 'failed'
                                ? 'bg-red-500'
                                : 'bg-sky-500'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Memory IDs */}
            {memoryIds.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Database className="size-3" />
                  Memory References ({memoryIds.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {memoryIds.map((id) => (
                    <Badge key={id} variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                      {truncate(id, 12)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ─── Trace Skeleton ───────────────────────────────────────────────────────────

function TraceSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-20 ml-auto" />
        </div>
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

// ─── Execution Timeline ───────────────────────────────────────────────────────

function ExecutionTimeline({ traces }: { traces: AgentTrace[] }) {
  const recentTraces = traces.slice(0, 15);

  if (recentTraces.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="text-muted-foreground h-4 w-4" />
          <CardTitle className="text-base">Execution Timeline</CardTitle>
        </div>
        <CardDescription>
          Recent agent runs displayed chronologically
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-64">
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />

            <div className="space-y-3">
              {recentTraces.map((trace, idx) => (
                <div key={trace.id} className="relative flex items-start gap-3">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-4 top-1.5 size-3 rounded-full ring-2 ring-background ${
                      AGENT_COLORS[trace.agentType] ?? 'bg-zinc-500'
                    } ${
                      trace.status === 'running' ? 'animate-pulse' : ''
                    }`}
                    title={`${trace.agentType} — ${trace.status}`}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${AGENT_BADGE_CLASSES[trace.agentType] ?? ''}`}
                      >
                        {trace.agentType}
                      </Badge>
                      <span
                        className={`size-1.5 rounded-full ${
                          trace.status === 'completed'
                            ? 'bg-emerald-500'
                            : trace.status === 'failed'
                              ? 'bg-red-500'
                              : 'bg-sky-500 animate-pulse'
                        }`}
                      />
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        {formatRelativeTime(trace.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDuration(trace.durationMs)}
                      {idx < recentTraces.length - 1 && (
                        <span className="ml-2 text-muted-foreground/50">
                          — {formatRelativeTime(recentTraces[idx + 1]?.createdAt ?? '')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ─── Main AgentsView ──────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function AgentsView() {
  // ── Data state ──
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[] | null>(null);
  const [traces, setTraces] = useState<AgentTrace[]>([]);
  const [totalTraces, setTotalTraces] = useState(0);
  const [loadingStatuses, setLoadingStatuses] = useState(true);
  const [loadingTraces, setLoadingTraces] = useState(true);

  // ── Filter state ──
  const [agentTypeFilter, setAgentTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [offset, setOffset] = useState(0);

  // ── Fetch agent statuses ──
  const fetchStatuses = useCallback(async () => {
    try {
      setLoadingStatuses(true);
      const res = await fetch('/api/agents/status');
      if (!res.ok) throw new Error('Failed to fetch agent statuses');
      const data: AgentStatus[] = await res.json();
      setAgentStatuses(data);
    } catch (err) {
      console.error('Failed to load agent statuses:', err);
    } finally {
      setLoadingStatuses(false);
    }
  }, []);

  // ── Fetch traces ──
  const fetchTraces = useCallback(async () => {
    try {
      setLoadingTraces(true);
      const params = new URLSearchParams();
      if (agentTypeFilter && agentTypeFilter !== 'all') params.set('agentType', agentTypeFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));

      const res = await fetch(`/api/agents/traces?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch traces');
      const data: TracesResponse = await res.json();

      setTraces((prev) => (offset === 0 ? data.data : [...prev, ...data.data]));
      setTotalTraces(data.pagination.total);
    } catch (err) {
      console.error('Failed to load traces:', err);
    } finally {
      setLoadingTraces(false);
    }
  }, [agentTypeFilter, statusFilter, offset]);

  // ── Initial load ──
  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  useEffect(() => {
    fetchTraces();
  }, [fetchTraces]);

  // ── Reset offset when filters change ──
  useEffect(() => {
    setOffset(0);
  }, [agentTypeFilter, statusFilter]);

  // ── Load more ──
  const hasMore = traces.length < totalTraces;

  const handleLoadMore = () => {
    setOffset((prev) => prev + PAGE_SIZE);
  };

  const handleRefresh = () => {
    setOffset(0);
    fetchStatuses();
  };

  // ── Render ──
  return (
    <section className="space-y-8" aria-label="Agent Monitor">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground">
            Monitor agent activity and execution traces
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={handleRefresh}
          disabled={loadingStatuses || loadingTraces}
        >
          <RefreshCw
            className={`h-4 w-4 ${loadingStatuses || loadingTraces ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* ── Agent Status Overview ─────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Bot className="h-4 w-4" />
          Agent Status
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {loadingStatuses
            ? Array.from({ length: 6 }).map((_, i) => <AgentCardSkeleton key={i} />)
            : agentStatuses?.map((agent) => (
                <AgentStatusCard key={agent.type} agent={agent} />
              ))}
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ── Trace Browser (3 cols) ──────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Trace Browser
                  </CardTitle>
                  <CardDescription>
                    Browse and inspect agent execution traces
                  </CardDescription>
                </div>
                {!loadingTraces && (
                  <span className="text-xs text-muted-foreground">
                    {totalTraces} trace{totalTraces !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-3">
                <Select value={agentTypeFilter} onValueChange={setAgentTypeFilter}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue placeholder="Agent Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {AGENT_INFO.map((agent) => (
                      <SelectItem key={agent.type} value={agent.type}>
                        {agent.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                  </SelectContent>
                </Select>

                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <ArrowUpDown className="size-3" />
                  Newest first
                </span>
              </div>

              <Separator />

              {/* Trace list */}
              <ScrollArea className="max-h-[480px]">
                <div className="space-y-2 pr-2">
                  {loadingTraces && traces.length === 0 ? (
                    Array.from({ length: 5 }).map((_, i) => <TraceSkeleton key={i} />)
                  ) : traces.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-3">
                        <Search className="size-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">No traces found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Agent execution traces will appear here once agents start running.
                      </p>
                    </div>
                  ) : (
                    <>
                      {traces.map((trace) => (
                        <TraceItem key={trace.id} trace={trace} />
                      ))}

                      {/* Load More */}
                      {hasMore && (
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs"
                            onClick={handleLoadMore}
                            disabled={loadingTraces}
                          >
                            {loadingTraces ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Loading…
                              </>
                            ) : (
                              <>
                                <ChevronDown className="size-3.5" />
                                Load More ({totalTraces - traces.length} remaining)
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* ── Execution Timeline (2 cols) ─────────────────────────────────── */}
        <div className="lg:col-span-2">
          {loadingTraces && traces.length === 0 ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-60" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-3 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <ExecutionTimeline traces={traces} />
          )}
        </div>
      </div>
    </section>
  );
}

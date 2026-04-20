'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Mail,
  Code,
  FileText,
  Calendar,
  MessageCircle,
  Bookmark,
  Clock,
  Eye,
  TrendingUp,
  X,
  Trash2,
  Filter,
  Database,
  StickyNote,
  MessageSquare,
  ChevronDown,
  Loader2,
  Inbox,
  AlertCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useCortexStore } from '@/lib/store';
import type { Memory, SourceType } from '@/lib/types';
import {
  formatRelativeTime,
  parseJson,
  truncate,
  getSourceTypeIcon,
} from '@/lib/helpers';

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_TYPES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'email', label: 'Email' },
  { value: 'code', label: 'Code' },
  { value: 'note', label: 'Note' },
  { value: 'document', label: 'Document' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'chat', label: 'Chat' },
  { value: 'bookmark', label: 'Bookmark' },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'createdAt', label: 'Date Added' },
  { value: 'sourceTimestamp', label: 'Source Date' },
  { value: 'accessCount', label: 'Access Count' },
];

const PAGE_SIZE = 20;

// ─── Source Type Styles ───────────────────────────────────────────────────────

const SOURCE_TYPE_COLORS: Record<string, { badge: string; icon: string; bg: string }> = {
  email: {
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  code: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  note: {
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  document: {
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
    icon: 'text-sky-600',
    bg: 'bg-sky-50',
  },
  calendar: {
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  chat: {
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    icon: 'text-cyan-600',
    bg: 'bg-cyan-50',
  },
  bookmark: {
    badge: 'bg-pink-100 text-pink-800 border-pink-200',
    icon: 'text-pink-600',
    bg: 'bg-pink-50',
  },
};

// ─── Icon Component ───────────────────────────────────────────────────────────

function SourceIcon({ type, className }: { type: string; className?: string }) {
  const colors = SOURCE_TYPE_COLORS[type] ?? SOURCE_TYPE_COLORS.document;
  const props = { className: `${colors.icon} ${className ?? ''}` };

  switch (type) {
    case 'email':
      return <Mail {...props} />;
    case 'code':
      return <Code {...props} />;
    case 'note':
      return <StickyNote {...props} />;
    case 'document':
      return <FileText {...props} />;
    case 'calendar':
      return <Calendar {...props} />;
    case 'chat':
      return <MessageCircle {...props} />;
    case 'bookmark':
      return <Bookmark {...props} />;
    default:
      return <FileText {...props} />;
  }
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function MemoryListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-full max-w-md" />
                <Skeleton className="h-4 w-3/4 max-w-sm" />
                <div className="flex items-center gap-2 pt-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-1.5 flex-1 max-w-20 rounded-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        {hasSearch ? (
          <Search className="h-8 w-8 text-muted-foreground" />
        ) : (
          <Database className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {hasSearch ? 'No memories found' : 'No memories yet'}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {hasSearch
          ? 'Try adjusting your search query or filters to find what you\'re looking for.'
          : 'Connect a data source to start indexing your knowledge base.'}
      </p>
    </div>
  );
}

// ─── Memory Card ──────────────────────────────────────────────────────────────

function MemoryCard({
  memory,
  onClick,
}: {
  memory: Memory & { connector?: { id: string; name: string; type: string } | null };
  onClick: () => void;
}) {
  const tags = parseJson<string[]>(memory.tags, []);
  const colors = SOURCE_TYPE_COLORS[memory.sourceType] ?? SOURCE_TYPE_COLORS.document;
  const visibleTags = tags.slice(0, 3);
  const remainingTags = tags.length - 3;

  return (
    <Card
      className="border-border/50 hover:border-border hover:shadow-sm transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Source type icon */}
          <div className={`rounded-lg p-1.5 shrink-0 ${colors.bg}`}>
            <SourceIcon type={memory.sourceType} className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm text-foreground truncate">
                {memory.title || 'Untitled Memory'}
              </h3>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 shrink-0 ${colors.badge}`}
              >
                {memory.sourceType}
              </Badge>
            </div>

            {/* Content preview */}
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-2">
              {memory.content}
            </p>

            {/* Tags */}
            {visibleTags.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {visibleTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 font-normal"
                  >
                    {tag}
                  </Badge>
                ))}
                {remainingTags > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{remainingTags} more
                  </span>
                )}
              </div>
            )}

            {/* Bottom row */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(memory.sourceTimestamp)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {memory.accessCount}
              </span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <TrendingUp className="h-3 w-3 shrink-0" />
                <Progress
                  value={Math.min(memory.relevanceScore * 100, 100)}
                  className="h-1.5 flex-1 max-w-24"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Memory Detail Panel ──────────────────────────────────────────────────────

function MemoryDetailPanel({
  memory,
  open,
  onClose,
  onDelete,
  deleting,
}: {
  memory: (Memory & { connector?: { id: string; name: string; type: string } | null }) | null;
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!memory) return null;

  const tags = parseJson<string[]>(memory.tags, []);
  const metadata = parseJson<Record<string, unknown>>(memory.metadata, {});
  const colors = SOURCE_TYPE_COLORS[memory.sourceType] ?? SOURCE_TYPE_COLORS.document;

  const handleDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  const metadataEntries = Object.entries(metadata).filter(
    ([key]) => !['__internal', '_chunk'].includes(key)
  );

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="sm:max-w-lg w-full overflow-y-auto p-0"
        >
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b">
            <div className="flex items-center gap-2 mb-1">
              <div className={`rounded-lg p-1.5 ${colors.bg}`}>
                <SourceIcon type={memory.sourceType} className="h-4 w-4" />
              </div>
              <Badge
                variant="outline"
                className={`text-xs ${colors.badge}`}
              >
                {memory.sourceType}
              </Badge>
            </div>
            <SheetTitle className="text-lg leading-snug pr-6">
              {memory.title || 'Untitled Memory'}
            </SheetTitle>
            <SheetDescription>
              {memory.connector
                ? `From ${memory.connector.name}`
                : 'No connector associated'}
            </SheetDescription>
          </SheetHeader>

          {/* Content */}
          <div className="p-6">
            <div className="prose prose-sm max-w-none">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Content
              </h4>
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {memory.content}
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Metadata
              </h4>
              <Card className="bg-muted/30 border-border/50">
                <CardContent className="p-4 space-y-3">
                  {/* Source Type */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Source Type</span>
                    <div className="flex items-center gap-1.5">
                      <SourceIcon type={memory.sourceType} className="h-3.5 w-3.5" />
                      <span className="capitalize font-medium">
                        {memory.sourceType}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Connector */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Connector</span>
                    <span className="font-medium">
                      {memory.connector?.name ?? '—'}
                    </span>
                  </div>

                  <Separator />

                  {/* Source Timestamp */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Source Date</span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatRelativeTime(memory.sourceTimestamp)}
                    </span>
                  </div>

                  <Separator />

                  {/* Date Added */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Date Added</span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatRelativeTime(memory.createdAt)}
                    </span>
                  </div>

                  <Separator />

                  {/* Access Count */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Access Count</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      {memory.accessCount}
                    </span>
                  </div>

                  <Separator />

                  {/* Relevance Score */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Relevance Score</span>
                    <div className="flex items-center gap-2 min-w-24">
                      <Progress
                        value={Math.min(memory.relevanceScore * 100, 100)}
                        className="h-2 flex-1"
                      />
                      <span className="text-xs font-medium w-8 text-right">
                        {Math.round(memory.relevanceScore * 100)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Source Metadata */}
            {metadataEntries.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Source Metadata
                </h4>
                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {metadataEntries.map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground font-mono text-xs shrink-0 pt-0.5">
                            {key}:
                          </span>
                          <span className="text-foreground break-all">
                            {typeof value === 'object'
                              ? JSON.stringify(value, null, 2)
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Delete Button */}
            <div className="mt-8 pt-4 border-t">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {deleting ? 'Deleting...' : 'Delete Memory'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this memory?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This memory will be permanently removed
              from your knowledge base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Main MemoryView Component ────────────────────────────────────────────────

export default function MemoryView() {
  // Store
  const {
    memorySearchQuery,
    memoryFilters,
    selectedMemoryId,
    setMemorySearch,
    setMemoryFilters,
    selectMemory,
  } = useCortexStore();

  // Local state
  const [memories, setMemories] = useState<
    (Memory & { connector?: { id: string; name: string; type: string } | null })[]
  >([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail panel
  const [detailMemory, setDetailMemory] = useState<
    (Memory & { connector?: { id: string; name: string; type: string } | null }) | null
  >(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(memorySearchQuery);

  // Offset for pagination
  const [offset, setOffset] = useState(0);

  // ─── Debounce search query ───────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(memorySearchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [memorySearchQuery]);

  // ─── Build query params ──────────────────────────────────────────────────
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('search', debouncedQuery);
    if (memoryFilters.sourceType) params.set('sourceType', memoryFilters.sourceType);
    if (memoryFilters.connectorId) params.set('connectorId', memoryFilters.connectorId);
    params.set('sortBy', memoryFilters.sortBy);
    params.set('sortOrder', memoryFilters.sortOrder);
    params.set('limit', String(PAGE_SIZE));
    return params;
  }, [debouncedQuery, memoryFilters]);

  // ─── Fetch memories ──────────────────────────────────────────────────────
  const fetchMemories = useCallback(
    async (currentOffset: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams(queryParams);
        params.set('offset', String(currentOffset));

        const res = await fetch(`/api/memories?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch memories');

        const json = await res.json();
        const data = (json.data ?? []) as (Memory & {
          connector?: { id: string; name: string; type: string } | null;
        })[];
        const pagination = json.pagination ?? { total: 0 };

        if (append) {
          setMemories((prev) => [...prev, ...data]);
        } else {
          setMemories(data);
        }
        setTotal(pagination.total);
        setOffset(currentOffset);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [queryParams]
  );

  // Reset offset when filters change
  useEffect(() => {
    fetchMemories(0, false);
  }, [fetchMemories, queryParams]);

  // ─── Open detail panel ───────────────────────────────────────────────────
  const handleOpenDetail = useCallback(async (memoryId: string) => {
    selectMemory(memoryId);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/memories/${memoryId}`);
      if (!res.ok) throw new Error('Failed to fetch memory');
      const json = await res.json();
      setDetailMemory(json);
    } catch {
      setDetailMemory(null);
    } finally {
      setDetailLoading(false);
    }
  }, [selectMemory]);

  // ─── Close detail panel ──────────────────────────────────────────────────
  const handleCloseDetail = useCallback(() => {
    selectMemory(null);
    setDetailMemory(null);
  }, [selectMemory]);

  // ─── Delete memory ───────────────────────────────────────────────────────
  const handleDeleteMemory = useCallback(async () => {
    if (!detailMemory) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/memories/${detailMemory.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete memory');
      handleCloseDetail();
      // Refresh list
      fetchMemories(0, false);
    } catch {
      // Keep panel open on error
    } finally {
      setDeleting(false);
    }
  }, [detailMemory, handleCloseDetail, fetchMemories]);

  // ─── Load more ───────────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    fetchMemories(offset + PAGE_SIZE, true);
  }, [fetchMemories, offset]);

  const hasMore = offset + PAGE_SIZE < total;
  const showDetail = selectedMemoryId !== null || detailMemory !== null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Memory
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse your indexed knowledge base
        </p>
      </div>

      {/* Search Bar */}
      <div className="shrink-0 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={memorySearchQuery}
            onChange={(e) => setMemorySearch(e.target.value)}
            className="pl-10 h-10 bg-background"
          />
          {memorySearchQuery && (
            <button
              onClick={() => setMemorySearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="shrink-0 mb-4 flex flex-wrap items-center gap-3">
        {/* Source Type Dropdown */}
        <Select
          value={memoryFilters.sourceType ?? 'all'}
          onValueChange={(val) =>
            setMemoryFilters({
              sourceType: val === 'all' ? null : (val as SourceType),
            })
          }
        >
          <SelectTrigger size="sm" className="w-[160px]">
            <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_TYPES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort By Dropdown */}
        <Select
          value={memoryFilters.sortBy}
          onValueChange={(val) => setMemoryFilters({ sortBy: val })}
        >
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Order */}
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() =>
            setMemoryFilters({
              sortOrder: memoryFilters.sortOrder === 'desc' ? 'asc' : 'desc',
            })
          }
        >
          <ChevronDown
            className={`h-3.5 w-3.5 mr-1 transition-transform ${
              memoryFilters.sortOrder === 'asc' ? 'rotate-180' : ''
            }`}
          />
          {memoryFilters.sortOrder === 'desc' ? 'Descending' : 'Ascending'}
        </Button>

        {/* Result Count */}
        <div className="ml-auto text-sm text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading...
            </span>
          ) : (
            <span>
              <span className="font-medium text-foreground">{total}</span>{' '}
              {total === 1 ? 'memory' : 'memories'} found
            </span>
          )}
        </div>
      </div>

      {/* Memory List */}
      <div className="flex-1 min-h-0">
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <MemoryListSkeleton count={6} />
        ) : memories.length === 0 ? (
          <EmptyState hasSearch={!!debouncedQuery} />
        ) : (
          <div
            className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-3 pr-1 scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--color-border) transparent',
            }}
          >
            {memories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onClick={() => handleOpenDetail(memory.id)}
              />
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-4 pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="min-w-32"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {showDetail && (
        <MemoryDetailPanel
          memory={detailMemory}
          open={true}
          onClose={handleCloseDetail}
          onDelete={handleDeleteMemory}
          deleting={deleting}
        />
      )}
    </div>
  );
}

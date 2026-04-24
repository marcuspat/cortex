'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Mail,
  Github,
  FileText,
  Layout,
  Calendar,
  FolderOpen,
  Hash,
  HardDrive,
  RefreshCw,
  Settings,
  Trash2,
  Plus,
  Plug,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react'
import { useCortexStore } from '@/lib/store'
import type { Connector, ConnectorType, ConnectorStatus } from '@/lib/types'
import { formatRelativeTime } from '@/lib/helpers'
import { CONNECTOR_DESCRIPTIONS } from '@/lib/constants'

// ─── Icon Map ────────────────────────────────────────────────────────────────

const connectorIconMap: Record<ConnectorType, React.ElementType> = {
  gmail: Mail,
  github: Github,
  obsidian: FileText,
  notion: Layout,
  calendar: Calendar,
  drive: FolderOpen,
  slack: Hash,
  filesystem: HardDrive,
}

const connectorLabelMap: Record<ConnectorType, string> = {
  gmail: 'Gmail',
  github: 'GitHub',
  obsidian: 'Obsidian',
  notion: 'Notion',
  calendar: 'Google Calendar',
  drive: 'Google Drive',
  slack: 'Slack',
  filesystem: 'Local Files',
}

// ─── Status Helpers ──────────────────────────────────────────────────────────

function getStatusBadgeClasses(status: ConnectorStatus): string {
  switch (status) {
    case 'active':
      return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
    case 'connecting':
      return 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
    case 'error':
      return 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
    case 'disconnected':
    default:
      return 'border-zinc-300 bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700'
  }
}

function getStatusDot(status: ConnectorStatus): React.ReactNode {
  switch (status) {
    case 'active':
      return <CheckCircle className="size-3 text-emerald-500" />
    case 'connecting':
      return <Loader2 className="size-3 text-amber-500 animate-spin" />
    case 'error':
      return <AlertCircle className="size-3 text-red-500" />
    case 'disconnected':
    default:
      return <Clock className="size-3 text-zinc-400" />
  }
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function formatItemCount(count: number): string {
  return count.toLocaleString('en-US') + ' items'
}

// ─── API Response Shape ──────────────────────────────────────────────────────

interface ConnectorApiResponse extends Connector {
  _count?: { memories: number }
}

// ─── Connector Card ──────────────────────────────────────────────────────────

function ConnectorCard({
  connector,
  syncingIds,
  onSync,
  onRemove,
}: {
  connector: Connector
  syncingIds: Set<string>
  onSync: (id: string) => void
  onRemove: (id: string) => void
}) {
  const Icon = connectorIconMap[connector.type]
  const isSyncing = syncingIds.has(connector.id)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (isSyncing) {
      // Defer reset to avoid synchronous setState in effect body
      const resetTimer = setTimeout(() => setProgress(0), 0)
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval)
            return 95
          }
          return prev + Math.random() * 15 + 5
        })
      }, 300)
      return () => {
        clearTimeout(resetTimer)
        clearInterval(interval)
      }
    } else if (progress > 0) {
      // Sync just completed — show 100% then fade out
      const timer = setTimeout(() => {
        setProgress(100)
        setTimeout(() => setProgress(0), 800)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isSyncing])

  return (
    <Card className="group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 py-0 gap-0">
      <CardHeader className="pb-0 pt-5 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm truncate">{connector.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                {connector.type}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={getStatusBadgeClasses(connector.status)}
          >
            <span className="flex items-center gap-1">
              {getStatusDot(connector.status)}
              {connector.status}
            </span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-4 space-y-3">
        {/* Item count + last sync */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Plug className="size-3.5" />
            {formatItemCount(connector.itemCount)}
          </span>
          {connector.lastSync ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              {formatRelativeTime(connector.lastSync)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              Never synced
            </span>
          )}
        </div>

        {/* Error message */}
        {connector.error && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
            <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{connector.error}</span>
          </div>
        )}

        {/* Sync progress bar */}
        {progress > 0 && (
          <Progress
            value={Math.min(progress, 100)}
            className="h-1.5"
          />
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={isSyncing || connector.status === 'disconnected'}
            onClick={() => onSync(connector.id)}
          >
            {isSyncing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            {isSyncing ? 'Syncing…' : 'Sync'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled
          >
            <Settings className="size-3.5" />
            Configure
          </Button>

          <div className="flex-1" />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-red-600"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Connector</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove <strong>{connector.name}</strong>?
                  This will disconnect the integration and remove all synced data
                  associated with this connector. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => onRemove(connector.id)}
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Loading Skeleton Grid ───────────────────────────────────────────────────

function ConnectorSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main ConnectorsView ─────────────────────────────────────────────────────

export default function ConnectorsView() {
  const { selectConnector } = useCortexStore()

  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(true)
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // Fetch connectors
  const fetchConnectors = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/connectors')
      if (!res.ok) throw new Error('Failed to fetch connectors')
      const data: ConnectorApiResponse[] = await res.json()
      // Map API response to our Connector type (strip _count, ensure string dates)
      const mapped: Connector[] = data.map((c) => ({
        id: c.id,
        type: c.type as ConnectorType,
        name: c.name,
        status: c.status as ConnectorStatus,
        config: c.config,
        lastSync: c.lastSync ?? null,
        itemCount: c.itemCount,
        error: c.error,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }))
      setConnectors(mapped)
    } catch (err) {
      console.error('Failed to load connectors:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Track authentication state
  const { data: session, status: authStatus } = useSession()

  useEffect(() => {
    // Fetch connectors on mount and when authentication state changes
    if (authStatus === 'authenticated' || authStatus === 'unauthenticated') {
      fetchConnectors()
    }
  }, [fetchConnectors, authStatus, session?.user?.id])

  // Sync a single connector
  const handleSync = useCallback(async (id: string) => {
    setSyncingIds((prev) => new Set(prev).add(id))
    try {
      await fetch(`/api/connectors/${id}/sync`, { method: 'POST' })
      await fetchConnectors()
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      // Small delay so the progress bar can complete visually
      setTimeout(() => {
        setSyncingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 1500)
    }
  }, [fetchConnectors])

  // Sync all active connectors
  const handleSyncAll = useCallback(async () => {
    const activeConnectors = connectors.filter((c) => c.status === 'active')
    if (activeConnectors.length === 0) return

    setSyncingIds((prev) => {
      const next = new Set(prev)
      activeConnectors.forEach((c) => next.add(c.id))
      return next
    })

    try {
      await Promise.allSettled(
        activeConnectors.map((c) =>
          fetch(`/api/connectors/${c.id}/sync`, { method: 'POST' })
        )
      )
      await fetchConnectors()
    } catch (err) {
      console.error('Sync all failed:', err)
    } finally {
      setTimeout(() => {
        setSyncingIds(new Set())
      }, 1500)
    }
  }, [connectors, fetchConnectors])

  // Remove a connector
  const handleRemove = useCallback(async (id: string) => {
    try {
      await fetch(`/api/connectors/${id}`, { method: 'DELETE' })
      setConnectors((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      console.error('Remove failed:', err)
    }
  }, [])

  // Add a new connector
  const handleAddConnector = useCallback(async (type: ConnectorType) => {
    try {
      const res = await fetch('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name: connectorLabelMap[type],
        }),
      })
      if (!res.ok) throw new Error('Failed to add connector')
      const newConnector: ConnectorApiResponse = await res.json()
      setConnectors((prev) => [
        {
          id: newConnector.id,
          type: newConnector.type as ConnectorType,
          name: newConnector.name,
          status: newConnector.status as ConnectorStatus,
          config: newConnector.config,
          lastSync: newConnector.lastSync ?? null,
          itemCount: newConnector.itemCount,
          error: newConnector.error,
          createdAt: newConnector.createdAt,
          updatedAt: newConnector.updatedAt,
        },
        ...prev,
      ])
      setAddDialogOpen(false)
    } catch (err) {
      console.error('Add connector failed:', err)
    }
  }, [])

  // Available connector types not yet added
  const existingTypes = new Set(connectors.map((c) => c.type))
  const allTypes = Object.keys(connectorIconMap) as ConnectorType[]
  const availableTypes = allTypes.filter((t) => !existingTypes.has(t))

  const activeCount = connectors.filter((c) => c.status === 'active').length

  return (
    <section className="flex flex-col gap-6" aria-label="Connectors Management">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connectors</h1>
          <p className="text-sm text-muted-foreground">
            Manage your data source integrations
          </p>
        </div>
        <div className="flex items-center gap-3 mt-3 sm:mt-0">
          {connectors.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={syncingIds.size > 0 || activeCount === 0}
              onClick={handleSyncAll}
            >
              {syncingIds.size > 0 ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Sync All
            </Button>
          )}

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={availableTypes.length === 0}>
                <Plus className="size-4" />
                Add Connector
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Connector</DialogTitle>
                <DialogDescription>
                  Choose a data source to connect to your workspace.
                  {availableTypes.length === 0
                    ? ' All available connectors have been added.'
                    : ''}
                </DialogDescription>
              </DialogHeader>

              {availableTypes.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {availableTypes.map((type) => {
                    const Icon = connectorIconMap[type]
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleAddConnector(type)}
                        className="flex flex-col items-center gap-3 rounded-lg border p-4 text-center transition-all hover:bg-accent hover:border-primary/30 hover:shadow-sm cursor-pointer"
                      >
                        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {connectorLabelMap[type]}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {CONNECTOR_DESCRIPTIONS[type]}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="size-10 text-emerald-500 mb-3" />
                  <p className="text-sm font-medium">All connectors added</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You&apos;ve connected all available data sources.
                  </p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Connector Grid */}
      {loading ? (
        <ConnectorSkeletonGrid />
      ) : connectors.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted mb-4">
              <Plug className="size-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No connectors yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Get started by adding your first data source. Connect Gmail, GitHub,
              Notion, and more to build your personal knowledge graph.
            </p>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="mt-4" size="sm">
                  <Plus className="size-4" />
                  Add Connector
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Connector</DialogTitle>
                  <DialogDescription>
                    Choose a data source to connect to your workspace.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {allTypes.map((type) => {
                    const Icon = connectorIconMap[type]
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleAddConnector(type)}
                        className="flex flex-col items-center gap-3 rounded-lg border p-4 text-center transition-all hover:bg-accent hover:border-primary/30 hover:shadow-sm cursor-pointer"
                      >
                        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {connectorLabelMap[type]}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {CONNECTOR_DESCRIPTIONS[type]}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectors.map((connector) => (
            <div key={connector.id} onClick={() => selectConnector(connector.id)}>
              <ConnectorCard
                connector={connector}
                syncingIds={syncingIds}
                onSync={handleSync}
                onRemove={handleRemove}
              />
            </div>
          ))}

          {/* Add Connector Card */}
          {availableTypes.length > 0 && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Card className="border-dashed border-2 transition-all duration-200 hover:shadow-md hover:border-primary/30 py-0 gap-0 cursor-pointer group/add min-h-[200px]">
                  <CardContent className="flex flex-col items-center justify-center text-center py-10 gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 group-hover/add:border-primary/40 transition-colors">
                      <Plus className="size-6 text-muted-foreground/60 group-hover/add:text-primary transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground group-hover/add:text-foreground transition-colors">
                        Add Connector
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {availableTypes.length} source{availableTypes.length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Connector</DialogTitle>
                  <DialogDescription>
                    Choose a data source to connect to your workspace.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {availableTypes.map((type) => {
                    const Icon = connectorIconMap[type]
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleAddConnector(type)}
                        className="flex flex-col items-center gap-3 rounded-lg border p-4 text-center transition-all hover:bg-accent hover:border-primary/30 hover:shadow-sm cursor-pointer"
                      >
                        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {connectorLabelMap[type]}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {CONNECTOR_DESCRIPTIONS[type]}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </section>
  )
}

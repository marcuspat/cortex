'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/alert-dialog';
import {
  Brain,
  Shield,
  Zap,
  Plug,
  Info,
  Save,
  RotateCcw,
  AlertTriangle,
  Key,
  Clock,
  Eye,
  Loader2,
  ExternalLink,
} from 'lucide-react';

// ─── Settings Shape ──────────────────────────────────────────────────────────

interface SettingsState {
  // Inference
  inferenceProvider: string;
  inferenceModel: string;
  useLocalInference: boolean;

  // Privacy & Security
  memoryRetentionDays: string;
  autoDecay: boolean;
  auditLogRetention: string;

  // Proactive Intelligence
  quietHoursStart: string;
  quietHoursEnd: string;
  insightRateLimit: string;
  enableProactiveInsights: boolean;

  // Connectors
  syncInterval: string;
  autoSyncOnStartup: boolean;
}

const DEFAULT_SETTINGS: SettingsState = {
  inferenceProvider: 'claude',
  inferenceModel: 'claude-sonnet-4-20250514',
  useLocalInference: false,

  memoryRetentionDays: '90',
  autoDecay: true,
  auditLogRetention: '30',

  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  insightRateLimit: '10',
  enableProactiveInsights: true,

  syncInterval: '15',
  autoSyncOnStartup: true,
};

// ─── Inference Providers ─────────────────────────────────────────────────────

const PROVIDER_OPTIONS = [
  { value: 'claude', label: 'Claude', description: 'Anthropic Claude API for high-quality reasoning' },
  { value: 'openai-compatible', label: 'OpenAI Compatible', description: 'Connect to any OpenAI-compatible API endpoint' },
  { value: 'local', label: 'Local (Ollama)', description: 'Run models locally using Ollama for full privacy' },
];

const SYNC_INTERVAL_OPTIONS = [
  { value: '5', label: 'Every 5 min' },
  { value: '15', label: 'Every 15 min' },
  { value: '30', label: 'Every 30 min' },
  { value: '60', label: 'Every 1 hour' },
  { value: '0', label: 'Manual' },
];

// ─── Section Wrapper ─────────────────────────────────────────────────────────

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="bg-muted flex size-8 items-center justify-center rounded-lg">
            <Icon className="text-muted-foreground size-4" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

// ─── Setting Row ─────────────────────────────────────────────────────────────

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Main SettingsView ───────────────────────────────────────────────────────

export default function SettingsView() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);

  // ── Fetch settings ──
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data: Record<string, string> = await res.json();

      const loaded: SettingsState = {
        inferenceProvider: data.inferenceProvider ?? DEFAULT_SETTINGS.inferenceProvider,
        inferenceModel: data.inferenceModel ?? DEFAULT_SETTINGS.inferenceModel,
        useLocalInference: data.useLocalInference === 'true',

        memoryRetentionDays: data.memoryRetentionDays ?? DEFAULT_SETTINGS.memoryRetentionDays,
        autoDecay: data.autoDecay !== 'false',
        auditLogRetention: data.auditLogRetention ?? DEFAULT_SETTINGS.auditLogRetention,

        quietHoursStart: data.quietHoursStart ?? DEFAULT_SETTINGS.quietHoursStart,
        quietHoursEnd: data.quietHoursEnd ?? DEFAULT_SETTINGS.quietHoursEnd,
        insightRateLimit: data.insightRateLimit ?? DEFAULT_SETTINGS.insightRateLimit,
        enableProactiveInsights: data.enableProactiveInsights !== 'false',

        syncInterval: data.syncInterval ?? DEFAULT_SETTINGS.syncInterval,
        autoSyncOnStartup: data.autoSyncOnStartup !== 'false',
      };

      setSettings(loaded);
      setOriginalSettings(loaded);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ── Update a setting ──
  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // ── Check if settings have changed ──
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  // ── Save settings ──
  const handleSave = async () => {
    try {
      setSaving(true);

      // Convert booleans to strings for API
      const payload: Record<string, string> = {
        inferenceProvider: settings.inferenceProvider,
        inferenceModel: settings.inferenceModel,
        useLocalInference: String(settings.useLocalInference),

        memoryRetentionDays: settings.memoryRetentionDays,
        autoDecay: String(settings.autoDecay),
        auditLogRetention: settings.auditLogRetention,

        quietHoursStart: settings.quietHoursStart,
        quietHoursEnd: settings.quietHoursEnd,
        insightRateLimit: settings.insightRateLimit,
        enableProactiveInsights: String(settings.enableProactiveInsights),

        syncInterval: settings.syncInterval,
        autoSyncOnStartup: String(settings.autoSyncOnStartup),
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save settings');

      setOriginalSettings(settings);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Reset to defaults ──
  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  // ── Purge all data ──
  const handlePurge = async () => {
    try {
      setPurging(true);
      // Simulate purge — in production this would call a dedicated endpoint
      await new Promise((r) => setTimeout(r, 2000));
    } finally {
      setPurging(false);
    }
  };

  // ── Render ──

  if (loading) {
    return (
      <section className="space-y-8" aria-label="Settings">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your Cortex instance
          </p>
        </div>
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="bg-muted flex size-8 items-center justify-center rounded-lg">
                    <Skeleton className="size-4 rounded" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-60" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-md" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8" aria-label="Settings">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your Cortex instance
          </p>
        </div>
        {hasChanges && (
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
          >
            Unsaved changes
          </Badge>
        )}
      </div>

      {/* ── Settings Sections ────────────────────────────────────────────── */}
      <div className="space-y-6 max-w-3xl">

        {/* ── Inference Configuration ─────────────────────────────────────── */}
        <SettingsSection
          icon={Brain}
          title="Inference Configuration"
          description="Configure the AI model and provider for agent reasoning"
        >
          <SettingRow
            label="Provider"
            description="Select the AI provider for inference tasks"
          >
            <Select
              value={settings.inferenceProvider}
              onValueChange={(v) => updateSetting('inferenceProvider', v)}
            >
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <Separator />

          <SettingRow
            label="Model"
            description="The specific model identifier to use"
          >
            <Input
              type="text"
              value={settings.inferenceModel}
              onChange={(e) => updateSetting('inferenceModel', e.target.value)}
              placeholder="claude-sonnet-4-20250514"
              className="w-[240px] h-9 text-sm"
            />
          </SettingRow>

          <Separator />

          <SettingRow
            label="Use local inference"
            description="Route all inference through a local Ollama instance for complete privacy"
          >
            <Switch
              checked={settings.useLocalInference}
              onCheckedChange={(v) => updateSetting('useLocalInference', v)}
            />
          </SettingRow>

          {settings.useLocalInference && (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
              <Info className="size-3.5 mt-0.5 shrink-0" />
              <span>
                Local inference requires Ollama to be installed and running. Only
                compatible models will be available.
              </span>
            </div>
          )}
        </SettingsSection>

        {/* ── Privacy & Security ──────────────────────────────────────────── */}
        <SettingsSection
          icon={Shield}
          title="Privacy & Security"
          description="Manage data retention, privacy controls, and audit policies"
        >
          <SettingRow
            label="Memory retention days"
            description="How long to keep memory entries before automatic cleanup"
          >
            <Input
              type="number"
              min={1}
              max={365}
              value={settings.memoryRetentionDays}
              onChange={(e) => updateSetting('memoryRetentionDays', e.target.value)}
              className="w-[100px] h-9 text-sm text-center"
            />
          </SettingRow>

          <Separator />

          <SettingRow
            label="Auto-decay"
            description="Gradually reduce relevance scores of old, unused memories"
          >
            <Switch
              checked={settings.autoDecay}
              onCheckedChange={(v) => updateSetting('autoDecay', v)}
            />
          </SettingRow>

          <Separator />

          <SettingRow
            label="Audit log retention"
            description="Number of days to retain detailed audit logs"
          >
            <Input
              type="number"
              min={1}
              max={365}
              value={settings.auditLogRetention}
              onChange={(e) => updateSetting('auditLogRetention', e.target.value)}
              className="w-[100px] h-9 text-sm text-center"
            />
          </SettingRow>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-red-600 dark:text-red-400">
                Purge All Data
              </Label>
              <p className="text-xs text-muted-foreground">
                Permanently delete all memories, traces, and insights. This cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={purging}
                >
                  {purging ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <AlertTriangle className="size-3.5" />
                  )}
                  Purge All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently delete all data from your Cortex instance,
                    including all memories, execution traces, insights, chat history, and
                    connector configurations. This action <strong>cannot be undone</strong>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={handlePurge}
                  >
                    {purging ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="size-3.5 animate-spin" />
                        Purging…
                      </span>
                    ) : (
                      'Yes, purge everything'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SettingsSection>

        {/* ── Proactive Intelligence ──────────────────────────────────────── */}
        <SettingsSection
          icon={Zap}
          title="Proactive Intelligence"
          description="Control how Cortex proactively generates insights and suggestions"
        >
          <SettingRow
            label="Enable proactive insights"
            description="Allow agents to surface unsolicited insights based on memory patterns"
          >
            <Switch
              checked={settings.enableProactiveInsights}
              onCheckedChange={(v) => updateSetting('enableProactiveInsights', v)}
            />
          </SettingRow>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" />
                Quiet hours start
              </Label>
              <p className="text-xs text-muted-foreground">
                Suppress proactive insights after this time
              </p>
              <Input
                type="time"
                value={settings.quietHoursStart}
                onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" />
                Quiet hours end
              </Label>
              <p className="text-xs text-muted-foreground">
                Resume proactive insights after this time
              </p>
              <Input
                type="time"
                value={settings.quietHoursEnd}
                onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <Separator />

          <SettingRow
            label="Insight rate limit per day"
            description="Maximum number of proactive insights surfaced per day"
          >
            <Input
              type="number"
              min={0}
              max={100}
              value={settings.insightRateLimit}
              onChange={(e) => updateSetting('insightRateLimit', e.target.value)}
              className="w-[100px] h-9 text-sm text-center"
            />
          </SettingRow>
        </SettingsSection>

        {/* ── Connectors ──────────────────────────────────────────────────── */}
        <SettingsSection
          icon={Plug}
          title="Connectors"
          description="Configure default behavior for data source connectors"
        >
          <SettingRow
            label="Default sync interval"
            description="How often connectors automatically sync data"
          >
            <Select
              value={settings.syncInterval}
              onValueChange={(v) => updateSetting('syncInterval', v)}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYNC_INTERVAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <Separator />

          <SettingRow
            label="Auto-sync on startup"
            description="Automatically sync all active connectors when Cortex starts"
          >
            <Switch
              checked={settings.autoSyncOnStartup}
              onCheckedChange={(v) => updateSetting('autoSyncOnStartup', v)}
            />
          </SettingRow>
        </SettingsSection>

        {/* ── About ───────────────────────────────────────────────────────── */}
        <SettingsSection
          icon={Info}
          title="About"
          description="Information about your Cortex instance"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Version</Label>
              <p className="text-xs text-muted-foreground">Current Cortex build version</p>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              MVP v0.1.0
            </Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-xs text-muted-foreground">About this software</p>
            </div>
            <span className="text-xs text-muted-foreground max-w-[240px] text-right">
              A personal, always-learning intelligence layer
            </span>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Documentation</Label>
              <p className="text-xs text-muted-foreground">Official documentation and guides</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled>
              <ExternalLink className="size-3.5" />
              Coming Soon
            </Button>
          </div>
        </SettingsSection>

        {/* ── Save / Reset Actions ────────────────────────────────────────── */}
        <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-xl border bg-card p-4 shadow-lg backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-9 text-xs"
            onClick={handleReset}
            disabled={!hasChanges || saving}
          >
            <RotateCcw className="size-3.5" />
            Reset to Defaults
          </Button>
          <Button
            size="sm"
            className="h-9 text-xs"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save Settings
          </Button>
        </div>
      </div>
    </section>
  );
}

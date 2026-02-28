"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  RefreshCw,
  Cloud,
  CloudOff,
  Check,
  AlertCircle,
  AlertTriangle,
  History,
  Settings2,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Image,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  SyncConfig,
  SyncResult,
  SyncLogEntry,
  SyncConflict,
  ConflictResolution,
  DeviceType,
} from "@/types/sync-tags-import";
import {
  getSyncConfig,
  saveSyncConfig,
  performFullSync,
  getSyncHistory,
  getPendingChangeCount,
  getConflicts,
  resolveConflict,
  startAutoSync,
  stopAutoSync,
  isAutoSyncRunning,
  syncMedia,
} from "@/lib/sync";

// ── Sync Status Badge (compact, for toolbar) ──────────────────────────────

interface SyncStatusBadgeProps {
  userId: string;
  onClick?: () => void;
}

export function SyncStatusBadge({ userId, onClick }: SyncStatusBadgeProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const count = await getPendingChangeCount(userId);
      setPendingCount(count);

      const history = await getSyncHistory(userId, 1);
      if (history.length > 0 && history[0].sync_finished_at) {
        setLastSync(history[0].sync_finished_at);
      }
    } catch {
      // Silently fail
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [refresh]);

  const handleQuickSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncing(true);
    try {
      await performFullSync(userId);
      await refresh();
    } catch {
      // Show error via parent
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick ?? handleQuickSync}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition",
        "border",
        syncing
          ? "border-teal-400/30 bg-teal-500/10 text-teal-300"
          : pendingCount > 0
            ? "border-amber-400/20 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10"
            : "border-white/10 bg-white/5 text-white/50 hover:text-white/70 hover:bg-white/10",
      )}
    >
      {syncing ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      ) : pendingCount > 0 ? (
        <Cloud className="h-3.5 w-3.5" />
      ) : (
        <Check className="h-3.5 w-3.5" />
      )}

      {syncing
        ? "Syncing..."
        : pendingCount > 0
          ? `${pendingCount} pending`
          : "Synced"}

      {lastSync && !syncing && (
        <span className="text-xs text-white/30 ml-1">
          {formatTimeAgo(lastSync)}
        </span>
      )}
    </button>
  );
}

// ── Full Sync Panel (modal) ───────────────────────────────────────────────

interface SyncPanelProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export function SyncPanel({ open, onClose, userId }: SyncPanelProps) {
  const [tab, setTab] = useState<"sync" | "history" | "settings" | "conflicts">(
    "sync",
  );
  const [config, setConfig] = useState<SyncConfig>(getSyncConfig());
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncLogEntry[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [mediaSyncing, setMediaSyncing] = useState(false);
  const [mediaResult, setMediaResult] = useState<{
    synced: number;
    errors: string[];
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [history, pending] = await Promise.all([
        getSyncHistory(userId),
        getPendingChangeCount(userId),
      ]);
      setSyncHistory(history);
      setPendingCount(pending);
    } catch {
      // Silently fail
    }
  }, [userId]);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await performFullSync(userId, config);
      setSyncResult(result);
      await loadData();
    } catch (err) {
      setSyncResult({
        success: false,
        pushed: 0,
        pulled: 0,
        conflicts: [],
        errors: [err instanceof Error ? err.message : "Sync failed"],
        duration: 0,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleMediaSync = async () => {
    setMediaSyncing(true);
    setMediaResult(null);
    try {
      const result = await syncMedia(userId);
      setMediaResult(result);
    } catch (err) {
      setMediaResult({
        synced: 0,
        errors: [err instanceof Error ? err.message : "Media sync failed"],
      });
    } finally {
      setMediaSyncing(false);
    }
  };

  const handleResolveConflict = async (
    conflict: SyncConflict,
    resolution: "local" | "remote",
  ) => {
    try {
      await resolveConflict(
        userId,
        conflict.entityType,
        conflict.entityId,
        resolution,
      );
      setConflicts((prev) =>
        prev.filter((c) => c.entityId !== conflict.entityId),
      );
    } catch {
      // Show error
    }
  };

  const updateConfig = (updates: Partial<SyncConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    saveSyncConfig(newConfig);

    if (updates.autoSync !== undefined || updates.syncInterval !== undefined) {
      if (newConfig.autoSync && newConfig.syncInterval > 0) {
        startAutoSync(userId, newConfig, (result) => {
          setSyncResult(result);
          loadData();
        });
      } else {
        stopAutoSync();
      }
    }
  };

  if (!open) return null;

  const tabs = [
    {
      id: "sync" as const,
      label: "Sync",
      icon: <Cloud className="h-3.5 w-3.5" />,
    },
    {
      id: "conflicts" as const,
      label: `Conflicts${conflicts.length > 0 ? ` (${conflicts.length})` : ""}`,
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    },
    {
      id: "history" as const,
      label: "History",
      icon: <History className="h-3.5 w-3.5" />,
    },
    {
      id: "settings" as const,
      label: "Settings",
      icon: <Settings2 className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={cn(
          "relative z-10 w-full max-w-2xl rounded-2xl border border-white/10",
          "bg-[#0d2137] shadow-2xl flex flex-col max-h-[85vh]",
          "animate-in slide-in-from-bottom-4 fade-in duration-300",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10">
              <Cloud className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Sync & Cloud</h2>
              <p className="text-xs text-white/40">
                {pendingCount > 0
                  ? `${pendingCount} changes pending sync`
                  : "All changes synced"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-white/5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg transition -mb-px border-b-2",
                tab === t.id
                  ? "border-teal-400 text-teal-300 bg-teal-500/5"
                  : "border-transparent text-white/40 hover:text-white/60",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Sync tab */}
          {tab === "sync" && (
            <div className="space-y-5">
              {/* Quick sync button */}
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className={cn(
                  "w-full py-4 rounded-xl border transition flex flex-col items-center gap-2",
                  syncing
                    ? "border-teal-400/30 bg-teal-500/10 cursor-wait"
                    : "border-white/10 bg-white/5 hover:border-teal-400/30 hover:bg-teal-500/5",
                )}
              >
                {syncing ? (
                  <RefreshCw className="h-8 w-8 text-teal-400 animate-spin" />
                ) : (
                  <Cloud className="h-8 w-8 text-teal-400/60" />
                )}
                <span className="text-sm font-medium text-white">
                  {syncing ? "Syncing..." : "Sync Now"}
                </span>
                <span className="text-xs text-white/30">
                  Full bidirectional sync with cloud
                </span>
              </button>

              {/* Sync result */}
              {syncResult && (
                <div
                  className={cn(
                    "rounded-xl border p-4 space-y-2",
                    syncResult.success
                      ? "border-teal-400/20 bg-teal-500/5"
                      : "border-rose-400/20 bg-rose-500/5",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {syncResult.success ? (
                      <Check className="h-4 w-4 text-teal-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-400" />
                    )}
                    <span className="text-sm font-medium text-white">
                      {syncResult.success ? "Sync Complete" : "Sync Failed"}
                    </span>
                    <span className="text-xs text-white/30 ml-auto">
                      {(syncResult.duration / 1000).toFixed(1)}s
                    </span>
                  </div>

                  <div className="flex gap-4 text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <ArrowUpCircle className="h-3 w-3 text-teal-400/60" />
                      {syncResult.pushed} pushed
                    </span>
                    <span className="flex items-center gap-1">
                      <ArrowDownCircle className="h-3 w-3 text-blue-400/60" />
                      {syncResult.pulled} pulled
                    </span>
                    {syncResult.conflicts.length > 0 && (
                      <span className="flex items-center gap-1 text-amber-300">
                        <AlertTriangle className="h-3 w-3" />
                        {syncResult.conflicts.length} conflicts
                      </span>
                    )}
                  </div>

                  {syncResult.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {syncResult.errors.slice(0, 3).map((err, i) => (
                        <p key={i} className="text-xs text-rose-300/70">
                          {err}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Media sync */}
              <div className="rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-white/40" />
                    <span className="text-sm text-white/70">Media Sync</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleMediaSync}
                    disabled={mediaSyncing}
                    className="px-3 py-1 text-xs bg-white/5 text-white/50 rounded-lg hover:bg-white/10 hover:text-white/70 disabled:cursor-wait transition"
                  >
                    {mediaSyncing ? "Syncing..." : "Sync Media"}
                  </button>
                </div>

                <p className="text-xs text-white/30">
                  Upload images and audio to cloud storage for access across all
                  devices.
                </p>

                {mediaResult && (
                  <div className="mt-2 text-xs">
                    <span className="text-teal-300">
                      {mediaResult.synced} files synced
                    </span>
                    {mediaResult.errors.length > 0 && (
                      <span className="text-rose-300 ml-2">
                        {mediaResult.errors.length} errors
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Device info */}
              <div className="rounded-xl border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="h-4 w-4 text-white/40" />
                  <span className="text-sm text-white/70">This Device</span>
                </div>
                <div className="text-xs text-white/30 space-y-1">
                  <p>Name: {config.deviceName || "Unknown"}</p>
                  <p>Type: {config.deviceType}</p>
                  <p>
                    Auto-sync:{" "}
                    {config.autoSync
                      ? `Every ${config.syncInterval / 1000}s`
                      : "Disabled"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Conflicts tab */}
          {tab === "conflicts" && (
            <div className="space-y-3">
              {conflicts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/30">
                  <Check className="h-8 w-8 mb-2" />
                  <p className="text-sm">No conflicts</p>
                </div>
              ) : (
                conflicts.map((conflict) => (
                  <div
                    key={conflict.entityId}
                    className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <span className="text-sm text-amber-300 font-medium">
                        {conflict.entityType} conflict
                      </span>
                      <span className="text-xs text-white/30 ml-auto">
                        {conflict.entityId.slice(0, 8)}...
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="rounded-lg border border-white/10 p-2">
                        <div className="text-xs text-white/40 mb-1">
                          Local (this device)
                        </div>
                        <div className="text-xs text-white/60 font-mono truncate">
                          Modified: {formatTimeAgo(conflict.localModified)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/10 p-2">
                        <div className="text-xs text-white/40 mb-1">
                          Remote (server)
                        </div>
                        <div className="text-xs text-white/60 font-mono truncate">
                          Modified: {formatTimeAgo(conflict.remoteModified)}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleResolveConflict(conflict, "local")}
                        className="flex-1 py-1.5 text-xs bg-white/5 text-white/50 rounded-lg hover:bg-white/10 transition"
                      >
                        Keep Local
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleResolveConflict(conflict, "remote")
                        }
                        className="flex-1 py-1.5 text-xs bg-teal-500/10 text-teal-300 rounded-lg hover:bg-teal-500/20 transition"
                      >
                        Use Remote
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* History tab */}
          {tab === "history" && (
            <div className="space-y-2">
              {syncHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/30">
                  <History className="h-8 w-8 mb-2" />
                  <p className="text-sm">No sync history yet</p>
                </div>
              ) : (
                syncHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-white/10 p-3 flex items-center gap-3"
                  >
                    {/* Status icon */}
                    {entry.status === "completed" ? (
                      <Check className="h-4 w-4 text-teal-400 flex-shrink-0" />
                    ) : entry.status === "failed" ? (
                      <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                    ) : entry.status === "partial" ? (
                      <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-white/30 flex-shrink-0 animate-spin" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/70">
                          {entry.direction === "push"
                            ? "Push"
                            : entry.direction === "pull"
                              ? "Pull"
                              : "Full Sync"}
                        </span>
                        {entry.device_type && (
                          <span className="text-xs text-white/30">
                            {entry.device_type}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs text-white/40 mt-0.5">
                        <span>{entry.entities_pushed} ↑</span>
                        <span>{entry.entities_pulled} ↓</span>
                        {entry.conflicts > 0 && (
                          <span className="text-amber-300/70">
                            {entry.conflicts} conflicts
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-white/30 text-right flex-shrink-0">
                      {formatTimeAgo(entry.sync_started_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Settings tab */}
          {tab === "settings" && (
            <div className="space-y-5">
              {/* Auto-sync */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={config.autoSync}
                    onChange={(e) =>
                      updateConfig({ autoSync: e.target.checked })
                    }
                    className="rounded border-white/20 text-teal-400 bg-white/5"
                  />
                  <div>
                    <div className="text-sm text-white">Auto-sync</div>
                    <div className="text-xs text-white/40">
                      Automatically sync changes at regular intervals
                    </div>
                  </div>
                </label>

                {config.autoSync && (
                  <div className="ml-7">
                    <label className="block text-xs text-white/50 mb-1">
                      Sync interval
                    </label>
                    <select
                      value={config.syncInterval}
                      onChange={(e) =>
                        updateConfig({ syncInterval: Number(e.target.value) })
                      }
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white appearance-none focus:outline-none"
                    >
                      <option value={30000}>Every 30 seconds</option>
                      <option value={60000}>Every minute</option>
                      <option value={300000}>Every 5 minutes</option>
                      <option value={600000}>Every 10 minutes</option>
                      <option value={1800000}>Every 30 minutes</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Media sync */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.syncMedia}
                  onChange={(e) =>
                    updateConfig({ syncMedia: e.target.checked })
                  }
                  className="rounded border-white/20 text-teal-400 bg-white/5"
                />
                <div>
                  <div className="text-sm text-white">Sync media files</div>
                  <div className="text-xs text-white/40">
                    Upload images and audio to cloud storage
                  </div>
                </div>
              </label>

              {/* Conflict resolution */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Default conflict resolution
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      value: "remote" as ConflictResolution,
                      label: "Server wins",
                      desc: "Use server version",
                    },
                    {
                      value: "local" as ConflictResolution,
                      label: "Device wins",
                      desc: "Keep this device",
                    },
                    {
                      value: "manual" as ConflictResolution,
                      label: "Ask me",
                      desc: "Review each conflict",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        updateConfig({ conflictResolution: opt.value })
                      }
                      className={cn(
                        "rounded-xl border p-3 text-left transition",
                        config.conflictResolution === opt.value
                          ? "border-teal-400/30 bg-teal-500/10"
                          : "border-white/10 hover:border-white/20",
                      )}
                    >
                      <div className="text-sm font-medium text-white">
                        {opt.label}
                      </div>
                      <div className="text-xs text-white/40">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Device info */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Device name
                </label>
                <input
                  type="text"
                  value={config.deviceName}
                  onChange={(e) => updateConfig({ deviceName: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-400/50"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Device type
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      {
                        type: "web" as DeviceType,
                        icon: <Globe className="h-4 w-4" />,
                        label: "Web",
                      },
                      {
                        type: "desktop" as DeviceType,
                        icon: <Monitor className="h-4 w-4" />,
                        label: "Desktop",
                      },
                      {
                        type: "ios" as DeviceType,
                        icon: <Smartphone className="h-4 w-4" />,
                        label: "iOS",
                      },
                      {
                        type: "android" as DeviceType,
                        icon: <Tablet className="h-4 w-4" />,
                        label: "Android",
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => updateConfig({ deviceType: opt.type })}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition",
                        config.deviceType === opt.type
                          ? "border-teal-400/30 bg-teal-500/10 text-teal-300"
                          : "border-white/10 text-white/40 hover:text-white/60",
                      )}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTimeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = now - then;

  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

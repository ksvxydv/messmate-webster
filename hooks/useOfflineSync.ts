"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getOfflineScans,
  clearOfflineScans,
  removeOfflineScans,
  getPendingScanCount,
} from "@/lib/offline-db";
import { useAuth } from "@/lib/auth";

export function useOfflineSync(
  onSyncNotify?: (title: string, subtitle?: string | null, status?: "SUCCESS" | "ERROR") => void
) {
  const { getAuthHeaders } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [forceOfflineMode, setForceOfflineMode] = useState<boolean>(false);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncCompleteTime, setSyncCompleteTime] = useState<string | null>(null);

  const refreshPendingCount = useCallback(async () => {
    try {
      setPendingQueueCount(await getPendingScanCount());
    } catch {}
  }, []);

  const syncPendingScans = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const scans = await getOfflineScans();
      if (scans.length === 0) {
        onSyncNotify?.("Offline Sync", "No pending scans in offline queue.");
        setIsSyncing(false);
        return;
      }

      const res = await fetch("/api/qr/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ scans }),
      });

      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.reconciledIds) && data.reconciledIds.length > 0) {
          await removeOfflineScans(data.reconciledIds);
        } else {
          await clearOfflineScans();
        }
        await refreshPendingCount();

        const subtitle =
          data.summary.conflicts > 0
            ? `${data.summary.conflicts} duplicate(s) or conflict(s) resolved.`
            : "All offline scans reconciled with central database.";

        onSyncNotify?.(
          `Sync Complete: ${data.summary.synced} passes reconciled`,
          subtitle,
          "SUCCESS"
        );

        setSyncCompleteTime(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        );
        setTimeout(() => setSyncCompleteTime(null), 6000);
      } else {
        onSyncNotify?.("Sync warning", data.error, "ERROR");
      }
    } catch (err: any) {
      onSyncNotify?.("Sync failed", err.message, "ERROR");
    } finally {
      setIsSyncing(false);
    }
  }, [getAuthHeaders, isSyncing, onSyncNotify, refreshPendingCount]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshPendingCount();

    const onOnline = () => {
      setIsOnline(true);
      if (!forceOfflineMode) syncPendingScans();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [forceOfflineMode, syncPendingScans, refreshPendingCount]);

  const effectiveOffline = !isOnline || forceOfflineMode;
  const currentNetworkState: "SYNCING" | "SYNC_COMPLETE" | "OFFLINE_QUEUED" | "ONLINE" = isSyncing
    ? "SYNCING"
    : syncCompleteTime
    ? "SYNC_COMPLETE"
    : effectiveOffline
    ? "OFFLINE_QUEUED"
    : "ONLINE";

  const toggleForceOffline = useCallback(() => {
    setForceOfflineMode((prev) => !prev);
  }, []);

  return {
    isOnline,
    forceOfflineMode,
    setForceOfflineMode,
    effectiveOffline,
    currentNetworkState,
    toggleForceOffline,
    pendingQueueCount,
    isSyncing,
    syncCompleteTime,
    refreshPendingCount,
    syncPendingScans,
  };
}

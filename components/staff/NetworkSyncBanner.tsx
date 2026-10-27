"use client";

import React from "react";
import { Wifi, WifiOff, RefreshCw, CloudUpload } from "lucide-react";
import { THEME } from "@/lib/theme";

interface NetworkSyncBannerProps {
  currentNetworkState: "SYNCING" | "SYNC_COMPLETE" | "OFFLINE_QUEUED" | "ONLINE";
  pendingQueueCount: number;
  syncCompleteTime: string | null;
  forceOfflineMode: boolean;
  onToggleForceOffline: () => void;
  onSyncPendingScans: () => void;
  isSyncing: boolean;
  effectiveOffline: boolean;
}

export function NetworkHeaderActions({
  currentNetworkState,
  pendingQueueCount,
  syncCompleteTime,
  forceOfflineMode,
  onToggleForceOffline,
}: Pick<
  NetworkSyncBannerProps,
  | "currentNetworkState"
  | "pendingQueueCount"
  | "syncCompleteTime"
  | "forceOfflineMode"
  | "onToggleForceOffline"
>) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {currentNetworkState === "SYNCING" && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#D99A51]/15 text-[#9E651E] border border-[#D99A51]/40 shadow-2xs">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D99A51]" />
          <span>Syncing with master ledger...</span>
        </span>
      )}

      {currentNetworkState === "SYNC_COMPLETE" && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
          <CloudUpload className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sync Complete ({syncCompleteTime})</span>
        </span>
      )}

      {currentNetworkState === "OFFLINE_QUEUED" && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
          <WifiOff className="w-3.5 h-3.5 text-amber-600" />
          <span>
            Offline Mode {pendingQueueCount > 0 && `(${pendingQueueCount} queued)`}
          </span>
        </span>
      )}

      {currentNetworkState === "ONLINE" && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
          <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          <span>Online</span>
        </span>
      )}

      <button
        type="button"
        onClick={onToggleForceOffline}
        className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
          forceOfflineMode
            ? "bg-[#244C3B] text-white border-[#244C3B] shadow-2xs"
            : "bg-white text-[#252820] border-[#E5E1D8] hover:bg-[#FAF7F0]"
        }`}
      >
        {forceOfflineMode ? "Wi-Fi Drop: Simulated" : "Simulate Wi-Fi Drop"}
      </button>
    </div>
  );
}

export default function NetworkSyncBanner({
  pendingQueueCount,
  effectiveOffline,
  isSyncing,
  onSyncPendingScans,
}: Pick<
  NetworkSyncBannerProps,
  "pendingQueueCount" | "effectiveOffline" | "isSyncing" | "onSyncPendingScans"
>) {
  if (pendingQueueCount <= 0) return null;

  return (
    <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-sm shadow-xs">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
        <span className="text-[#92400E] font-semibold">
          Offline Scans Queued:{" "}
          <strong className="font-mono text-base font-black ml-1">
            {pendingQueueCount}
          </strong>
        </span>
      </div>
      {!effectiveOffline && (
        <button
          type="button"
          onClick={onSyncPendingScans}
          disabled={isSyncing}
          className={THEME.btnPrimary}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
        </button>
      )}
    </div>
  );
}

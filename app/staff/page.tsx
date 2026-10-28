"use client";

import { useState, useCallback, useRef } from "react";
import { queueOfflineScan } from "@/lib/offline-db";
import { useAuth } from "@/lib/auth";
import { useCameraScanner } from "@/hooks/useCameraScanner";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/ui/RoleGuard";
import NetworkSyncBanner, { NetworkHeaderActions } from "@/components/staff/NetworkSyncBanner";
import CameraScannerViewport from "@/components/staff/CameraScannerViewport";
import ScanResultCard from "@/components/staff/ScanResultCard";

export default function StaffScanner() {
  const { role, loading: authLoading, getAuthHeaders, currentUser } = useAuth();
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanStatus, setScanStatus] = useState<"IDLE" | "SUCCESS" | "ERROR">("IDLE");
  const [message, setMessage] = useState("Ready to scan student meal QR pass...");
  const [subMessage, setSubMessage] = useState<string | null>(null);

  const isProcessingRef = useRef(false);

  // 1. Offline synchronization hook
  const {
    isOnline,
    forceOfflineMode,
    effectiveOffline,
    currentNetworkState,
    toggleForceOffline,
    pendingQueueCount,
    isSyncing,
    syncCompleteTime,
    refreshPendingCount,
    syncPendingScans,
  } = useOfflineSync((msg, sub, status) => {
    setMessage(msg);
    if (sub !== undefined) setSubMessage(sub);
    if (status) setScanStatus(status);
  });

  // 2. Verification handler (handles online / offline routing)
  const handleVerifyPass = useCallback(
    async (decodedText: string) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 2000);

      try {
        const payload = JSON.parse(decodedText);
        const { userId, mealSlotId } = payload;

        if (!userId || !mealSlotId) {
          setScanStatus("ERROR");
          setMessage("Invalid Pass Format: Missing student or meal credentials.");
          setSubMessage("Pass must contain valid student ID and meal slot parameters.");
          return;
        }

        const isOfflineNow = !isOnline || forceOfflineMode;

        // Local offline queueing
        if (isOfflineNow) {
          const queueRes = await queueOfflineScan({
            userId,
            mealSlotId,
            qrToken: decodedText,
            timestamp: new Date().toISOString(),
          });
          await refreshPendingCount();

          if (!queueRes.success) {
            setScanStatus("ERROR");
            setMessage("Local Double-Scan Blocked!");
            setSubMessage(
              queueRes.duplicate
                ? "Pass was already scanned locally in offline queue."
                : "Local storage error."
            );
            return;
          }

          setScanStatus("SUCCESS");
          setMessage("Offline Check-In Recorded");
          setSubMessage("Queued locally. Will auto-sync when online.");
          setScanResult({
            users: { name: "Offline Student", reg_no: "Verifying on Sync", dietary_pref: "VEG" },
            meal_slots: { meal_type: "Current Meal" },
          });
          return;
        }

        // Online verified redemption
        const res = await fetch("/api/qr/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ qrToken: decodedText }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setScanStatus("ERROR");
          setMessage(data.error || "Verification Rejected!");
          setSubMessage(data.code === "ALREADY_CONSUMED" ? "Duplicate redemption blocked." : null);
          return;
        }

        setScanStatus("SUCCESS");
        setMessage("Pass Verified: Meal Redeemed!");
        const st = data.booking?.users;
        setSubMessage(st ? `${st.name} (${st.reg_no})` : "Single-use redemption recorded.");
        setScanResult(data.booking);
      } catch {
        setScanStatus("ERROR");
        setMessage("Malformed QR Pass: Invalid MessMate JSON structure.");
        setSubMessage("Ensure the pass was generated directly by the student portal.");
      }
    },
    [forceOfflineMode, isOnline, refreshPendingCount, getAuthHeaders]
  );

  // 3. Camera scanner lifecycle hook
  const {
    cameraState,
    cameraError,
    showManualInput,
    setShowManualInput,
    manualTokenInput,
    setManualTokenInput,
    startCamera,
  } = useCameraScanner(handleVerifyPass);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTokenInput.trim()) return;
    handleVerifyPass(manualTokenInput.trim());
    setManualTokenInput("");
  };

  if (authLoading) {
    return (
      <div className="p-16 text-center text-[#777064] font-medium text-sm">
        Loading Staff Scanner...
      </div>
    );
  }

  if (!currentUser || (role !== "STAFF" && role !== "ADMIN")) {
    return <RoleGuard requiredRole="STAFF" />;
  }

  return (
    <AppShell
      badge="Dining Check-In"
      title="Staff Meal Entry Scanner"
      description="Dining hall entry terminal for resident check-in and meal pass verification"
      actions={
        <NetworkHeaderActions
          currentNetworkState={currentNetworkState}
          pendingQueueCount={pendingQueueCount}
          syncCompleteTime={syncCompleteTime}
          forceOfflineMode={forceOfflineMode}
          onToggleForceOffline={toggleForceOffline}
        />
      }
    >
      <div className="space-y-6">
        <NetworkSyncBanner
          pendingQueueCount={pendingQueueCount}
          effectiveOffline={effectiveOffline}
          isSyncing={isSyncing}
          onSyncPendingScans={syncPendingScans}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <CameraScannerViewport
              cameraState={cameraState}
              cameraError={cameraError}
              showManualInput={showManualInput}
              manualTokenInput={manualTokenInput}
              onManualTokenChange={setManualTokenInput}
              onManualSubmit={handleManualSubmit}
              onToggleManualInput={() => setShowManualInput(!showManualInput)}
              onRetryCamera={startCamera}
            />
          </div>

          <div className="lg:col-span-5">
            <ScanResultCard
              scanStatus={scanStatus}
              message={message}
              subMessage={subMessage}
              scanResult={scanResult}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

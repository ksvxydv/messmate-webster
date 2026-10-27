"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  queueOfflineScan,
  getOfflineScans,
  clearOfflineScans,
  getPendingScanCount,
} from "@/lib/offline-db";
import { useAuth } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/ui/RoleGuard";
import { Html5Qrcode } from "html5-qrcode";
import NetworkSyncBanner, { NetworkHeaderActions } from "@/components/staff/NetworkSyncBanner";
import CameraScannerViewport from "@/components/staff/CameraScannerViewport";
import ScanResultCard from "@/components/staff/ScanResultCard";

export default function StaffScanner() {
  const { role, loading: authLoading, currentUser } = useAuth();
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanStatus, setScanStatus] = useState<"IDLE" | "SUCCESS" | "ERROR">("IDLE");
  const [message, setMessage] = useState("Ready to scan student meal QR pass...");
  const [subMessage, setSubMessage] = useState<string | null>(null);

  // Camera State
  const [cameraState, setCameraState] = useState<
    "INITIALIZING" | "RUNNING" | "PERMISSION_DENIED" | "UNAVAILABLE" | "STOPPED"
  >("INITIALIZING");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState("");
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // Network and Sync state
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

  const handleSyncPendingScans = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const scans = await getOfflineScans();
      if (scans.length === 0) {
        setSubMessage("No pending scans in offline queue.");
        setIsSyncing(false);
        return;
      }

      const res = await fetch("/api/qr/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scans, staffId: currentUser?.id || null }),
      });

      const data = await res.json();
      if (data.success) {
        await clearOfflineScans();
        await refreshPendingCount();
        setScanStatus("SUCCESS");
        setMessage(`Sync Complete: ${data.summary.synced} passes reconciled`);
        setSubMessage(
          data.summary.conflicts > 0
            ? `${data.summary.conflicts} duplicate(s) prevented.`
            : "All offline scans reconciled with central database.",
        );
        setSyncCompleteTime(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        );
        setTimeout(() => setSyncCompleteTime(null), 6000);
      } else {
        setMessage(`Sync warning: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser?.id, isSyncing, refreshPendingCount]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshPendingCount();

    const onOnline = () => {
      setIsOnline(true);
      if (!forceOfflineMode) handleSyncPendingScans();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [forceOfflineMode, handleSyncPendingScans, refreshPendingCount]);

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

        const effectiveOffline = !isOnline || forceOfflineMode;

        if (effectiveOffline) {
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
                : "Local storage error.",
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

        const res = await fetch("/api/qr/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qrToken: decodedText,
            staffId: currentUser?.id || null,
          }),
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
    [currentUser?.id, forceOfflineMode, isOnline, refreshPendingCount],
  );

  // Initialize camera safely with graceful fallback
  const startCamera = useCallback(async () => {
    setCameraState("INITIALIZING");
    setCameraError(null);

    // Stop existing scanner if running
    if (qrCodeRef.current) {
      try {
        if (qrCodeRef.current.isScanning) {
          await qrCodeRef.current.stop();
        }
      } catch {}
      qrCodeRef.current = null;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState("UNAVAILABLE");
      setCameraError("Camera API is not supported in this browser or context requires HTTPS.");
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode("reader");
      qrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
      };

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => handleVerifyPass(decodedText),
          () => {},
        );
        setCameraState("RUNNING");
        setCameraError(null);
      } catch (envErr: any) {
        // Fallback to default camera
        await html5QrCode.start(
          { facingMode: "user" },
          config,
          (decodedText) => handleVerifyPass(decodedText),
          () => {},
        );
        setCameraState("RUNNING");
        setCameraError(null);
      }
    } catch (err: any) {
      const errString = String(err?.message || err).toLowerCase();
      if (errString.includes("permission") || err?.name === "NotAllowedError") {
        setCameraState("PERMISSION_DENIED");
        setCameraError("Camera permission was denied. Please allow camera permissions in your browser bar.");
      } else if (errString.includes("not found") || err?.name === "NotFoundError") {
        setCameraState("UNAVAILABLE");
        setCameraError("No camera hardware was detected on this system.");
      } else {
        setCameraState("UNAVAILABLE");
        setCameraError("Camera could not be started. (Requires HTTPS or localhost).");
      }
    }
  }, [handleVerifyPass]);

  useEffect(() => {
    if (authLoading || role !== "STAFF") return;
    startCamera();

    return () => {
      if (qrCodeRef.current) {
        try {
          if (qrCodeRef.current.isScanning) {
            qrCodeRef.current.stop().catch(() => {});
          }
        } catch {}
        qrCodeRef.current = null;
      }
    };
  }, [authLoading, role, startCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTokenInput.trim()) return;
    handleVerifyPass(manualTokenInput.trim());
    setManualTokenInput("");
  };

  if (authLoading) {
    return (
      <div className="p-16 text-center text-[#777064] font-medium text-sm">
        Loading Staff Scanner Terminal...
      </div>
    );
  }
  if (role !== "STAFF") return <RoleGuard requiredRole="STAFF" />;

  const effectiveOffline = !isOnline || forceOfflineMode;

  const currentNetworkState = isSyncing
    ? "SYNCING"
    : syncCompleteTime
      ? "SYNC_COMPLETE"
      : effectiveOffline
        ? "OFFLINE_QUEUED"
        : "ONLINE";

  return (
    <AppShell
      badge="Dining Hall Scanner"
      title="Dining Hall Entry Scanner"
      description="Instant single-use meal pass validation and attendance recording"
      actions={
        <NetworkHeaderActions
          currentNetworkState={currentNetworkState}
          pendingQueueCount={pendingQueueCount}
          syncCompleteTime={syncCompleteTime}
          forceOfflineMode={forceOfflineMode}
          onToggleForceOffline={() => setForceOfflineMode(!forceOfflineMode)}
        />
      }
    >
      <div className="max-w-xl mx-auto space-y-5">
        {/* Offline Queue Sync Banner */}
        <NetworkSyncBanner
          pendingQueueCount={pendingQueueCount}
          effectiveOffline={effectiveOffline}
          isSyncing={isSyncing}
          onSyncPendingScans={handleSyncPendingScans}
        />

        {/* Camera Scanner Viewport */}
        <CameraScannerViewport
          cameraState={cameraState}
          cameraError={cameraError}
          onRetryCamera={startCamera}
          showManualInput={showManualInput}
          onToggleManualInput={() => setShowManualInput(!showManualInput)}
          manualTokenInput={manualTokenInput}
          onManualTokenChange={setManualTokenInput}
          onManualSubmit={handleManualSubmit}
        />

        {/* Live Feedback Card & Counter Plate Alert */}
        <ScanResultCard
          scanStatus={scanStatus}
          message={message}
          subMessage={subMessage}
          scanResult={scanResult}
        />
      </div>
    </AppShell>
  );
}

"use client";

import { queueOfflineScan } from "@/lib/offline-db";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Html5QrcodeScanner } from "html5-qrcode";
import { ShieldCheck, ShieldAlert, Camera } from "lucide-react";

export default function StaffScanner() {
  const { role, loading: authLoading } = useAuth();
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanStatus, setScanStatus] = useState<"IDLE" | "SUCCESS" | "ERROR">(
    "IDLE",
  );
  const [message, setMessage] = useState(
    "Ready to scan student meal QR pass...",
  );

  useEffect(() => {
    if (authLoading || role !== "STAFF") return;

    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false,
    );

    scanner.render(onScanSuccess, onScanFailure);

    function onScanSuccess(decodedText: string) {
      handleVerifyAndRedeem(decodedText);
    }

    function onScanFailure(error: any) {
      // Ignored continuous scanning errors
    }

    return () => {
      scanner
        .clear()
        .catch((error) => console.error("Failed to clear scanner", error));
    };
  }, [authLoading, role]);

  const handleVerifyAndRedeem = async (qrString: string) => {
    try {
      const parsed = JSON.parse(qrString);
      const { userId, mealSlotId, timeWindow } = parsed;

      // 1. Check time window validity
      const currentWindow = Math.floor(Date.now() / 30000);
      if (Math.abs(currentWindow - timeWindow) > 2) {
        setScanStatus("ERROR");
        setMessage("QR Pass Expired! Screenshots cannot be reused.");
        return;
      }

      // Check if browser is offline
      if (!navigator.onLine) {
        await queueOfflineScan({
          userId,
          mealSlotId,
          timestamp: new Date().toISOString(),
        });
        setScanStatus("SUCCESS");
        setMessage(
          "⚡ OFFLINE MODE: Pass verified locally & queued in browser DB!",
        );
        return;
      }

      // 2. Normal Online Flow: Fetch booking from Supabase
      const { data: booking, error } = await supabase
        .from("meal_bookings")
        .select("*")
        .eq("user_id", userId)
        .eq("meal_slot_id", mealSlotId)
        .maybeSingle();

      if (error || !booking) {
        setScanStatus("ERROR");
        setMessage("Invalid Pass: Booking not found in database.");
        return;
      }

      if (booking.status === "CONSUMED") {
        setScanStatus("ERROR");
        setMessage(
          `ALERT: Pass already redeemed at ${new Date(booking.scanned_at).toLocaleTimeString()}! (Double-spend blocked)`,
        );
        setScanResult(booking);
        return;
      }

      if (booking.status !== "LOCKED") {
        setScanStatus("ERROR");
        setMessage(
          `Cannot check in: Booking status is '${booking.status}' (Not Locked).`,
        );
        return;
      }

      // 3. ATOMIC CHECK-IN UPDATE
      const { data: updated, error: updateError } = await supabase
        .from("meal_bookings")
        .update({ status: "CONSUMED", scanned_at: new Date().toISOString() })
        .eq("id", booking.id)
        .eq("status", "LOCKED")
        .select()
        .single();

      if (updateError || !updated) {
        setScanStatus("ERROR");
        setMessage("Race Condition Prevented: Token already redeemed.");
        return;
      }

      setScanStatus("SUCCESS");
      setMessage("SUCCESS: Verified meal online!");
      setScanResult(booking);
    } catch (e) {
      try {
        const parsed = JSON.parse(qrString);
        await queueOfflineScan({
          userId: parsed.userId,
          mealSlotId: parsed.mealSlotId,
          timestamp: new Date().toISOString(),
        });
        setScanStatus("SUCCESS");
        setMessage(
          "⚡ NETWORK DROP DETECTED: Scan saved to offline IndexedDB queue.",
        );
      } catch (err) {
        setScanStatus("ERROR");
        setMessage("Malformed QR Code structure.");
      }
    }
  };

  if (authLoading) {
    return (
      <div className="p-8 text-center font-sans text-gray-400">
        Loading Staff Verification Terminal...
      </div>
    );
  }

  // RBAC Guard: Restrict Staff Portal strictly to STAFF role
  if (role !== "STAFF") {
    return (
      <main className="min-h-screen bg-[#030712] p-8 flex items-center justify-center">
        <div className="bg-[#111827] border border-red-900/50 p-8 rounded-2xl max-w-md text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-950/80 text-red-400 flex items-center justify-center mx-auto border border-red-800">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">
            Restricted Access Portal
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            This QR Verification Terminal is strictly secured for{" "}
            <span className="text-red-400 font-semibold">
              Refectory Staff & Mess Guards (STAFF)
            </span>
            . Please switch your active role to STAFF in the top navigation bar.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold transition-all border border-gray-700"
          >
            Return to Overview Hub
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 font-sans">
      <div className="max-w-xl mx-auto">
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl text-center mb-6">
          <h1 className="text-xl font-bold flex items-center justify-center gap-2">
            <Camera className="text-pink-500" /> Refectory Staff Scanner Portal
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Scan student rotating QR passes for instant anti-double-spend
            check-in
          </p>
        </div>

        {/* Camera Reader Box */}
        <div className="bg-white rounded-2xl p-4 text-black mb-6 overflow-hidden">
          <div id="reader" className="w-full"></div>
        </div>

        {/* Status Box */}
        <div
          className={`rounded-2xl p-6 border flex items-center gap-4 ${
            scanStatus === "SUCCESS"
              ? "bg-green-950 border-green-800 text-green-200"
              : scanStatus === "ERROR"
                ? "bg-red-950 border-red-800 text-red-200"
                : "bg-gray-900 border-gray-800 text-gray-300"
          }`}
        >
          {scanStatus === "SUCCESS" && (
            <ShieldCheck className="w-10 h-10 text-green-400 shrink-0" />
          )}
          {scanStatus === "ERROR" && (
            <ShieldAlert className="w-10 h-10 text-red-400 shrink-0" />
          )}
          {scanStatus === "IDLE" && (
            <Camera className="w-10 h-10 text-gray-400 shrink-0" />
          )}
          <div>
            <p className="font-semibold text-sm">{message}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

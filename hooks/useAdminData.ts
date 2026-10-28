"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { DEMO_USERS } from "@/config/constants";

export function useAdminData() {
  const { getAuthHeaders } = useAuth();
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Concurrency Stress Test State
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [testSummary, setTestSummary] = useState<{ success: number; conflicts: number } | null>(null);

  // Meal Seeding State
  const [seedStatus, setSeedStatus] = useState<{
    seeded: boolean;
    date: string;
    slots: number;
    bookings: number;
  } | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const mRes = await fetch("/api/meals").then((r) => r.json()).catch(() => ({ slots: [] }));
      if (mRes.slots) setSlots(mRes.slots);

      let bData: any[] = [];
      try {
        const { data } = await supabase.from("meal_bookings").select("*");
        if (data && data.length > 0) bData = data;
      } catch {}
      setBookings(bData);

      let uData: any[] = [];
      try {
        const uRes = await fetch("/api/auth/session?all=true").then((r) => r.json()).catch(() => null);
        if (uRes && Array.isArray(uRes.users)) {
          uData = uRes.users.filter((u: any) => u.role === "STUDENT");
        }
      } catch {}

      if (uData.length === 0) {
        try {
          const { data } = await supabase.from("users").select("*").eq("role", "STUDENT");
          if (data && data.length > 0) uData = data;
        } catch {}
      }

      setUsers(uData.length > 0 ? uData : DEMO_USERS.filter((u) => u.role === "STUDENT"));
    } catch (e) {
      console.error("Admin data fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
    const onTimeChange = () => fetchAdminData();
    window.addEventListener("messmate:time-changed", onTimeChange);
    return () => window.removeEventListener("messmate:time-changed", onTimeChange);
  }, [fetchAdminData]);

  const todayBookings = useMemo(
    () => bookings.filter((b) => slots.some((s) => s.id === b.meal_slot_id)),
    [bookings, slots]
  );

  const analytics = useMemo(() => {
    return slots.map((slot) => {
      const slotBookings = todayBookings.filter((b) => b.meal_slot_id === slot.id);
      const consumed = slotBookings.filter((b) => b.status === "CONSUMED").length;
      const optedOut = slotBookings.filter((b) => b.status === "OPTED_OUT").length;
      const projected = slotBookings.length - optedOut;
      return {
        ...slot,
        Projected: Math.max(0, projected),
        Consumed: consumed,
        OptedOut: optedOut,
      };
    });
  }, [slots, todayBookings]);

  const totalProjected = useMemo(
    () => analytics.reduce((acc, curr) => acc + curr.Projected, 0),
    [analytics]
  );
  const totalConsumed = useMemo(
    () => analytics.reduce((acc, curr) => acc + curr.Consumed, 0),
    [analytics]
  );
  const totalOptedOut = useMemo(
    () => analytics.reduce((acc, curr) => acc + curr.OptedOut, 0),
    [analytics]
  );
  const totalSurplus = useMemo(
    () => Math.max(0, totalProjected - totalConsumed),
    [totalProjected, totalConsumed]
  );

  // Export Audit Ledger to CSV
  const handleExportCSV = useCallback(() => {
    const headers = ["Student Name", "Registration No", "Dietary", "Meal Type", "Status", "Scanned Timestamp"];
    const rows = todayBookings.map((b) => {
      const student = users.find((u) => u.id === b.user_id);
      const slot = slots.find((s) => s.id === b.meal_slot_id);
      return [
        student?.name || "Student",
        student?.reg_no || "-",
        student?.dietary_pref || "VEG",
        slot?.meal_type || "-",
        b.status,
        b.scanned_at ? new Date(b.scanned_at).toLocaleString() : "Not Scanned",
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `MessMate_Ledger_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  }, [todayBookings, users, slots]);

  // Run in-browser Live Concurrency Stress Test against /api/qr/verify
  const handleRunConcurrencyTest = useCallback(async () => {
    setTestRunning(true);
    setTestResults(null);
    setTestSummary(null);

    const targetBooking =
      todayBookings.find((b) => b.status === "LOCKED") ||
      todayBookings[0] ||
      bookings.find((b) => b.status === "LOCKED") ||
      bookings[0];

    if (!targetBooking) {
      alert("No meal booking found to test.");
      setTestRunning(false);
      return;
    }

    // 1. Prime target booking to 'LOCKED' state so it is eligible for atomic check-in
    await supabase
      .from("meal_bookings")
      .update({ status: "LOCKED", scanned_at: null, scanned_by: null })
      .eq("id", targetBooking.id);

    // 2. Fire 10 simultaneous cashier terminal scan requests at the exact same millisecond
    const requests = Array.from({ length: 10 }, async (_, idx) => {
      const startTime = performance.now();
      try {
        const res = await fetch("/api/qr/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ bookingId: targetBooking.id }),
        });
        const duration = (performance.now() - startTime).toFixed(1);
        const data = await res.json();
        return {
          terminal: idx + 1,
          status: res.status,
          success: res.ok && data.success,
          duration,
          data,
        };
      } catch (err: any) {
        return {
          terminal: idx + 1,
          status: 500,
          success: false,
          duration: "N/A",
          error: err.message,
        };
      }
    });

    const results = await Promise.all(requests);
    const successCount = results.filter((r) => r.success).length;
    const conflictCount = results.filter((r) => r.status === 409 || !r.success).length;

    setTestResults(results);
    setTestSummary({ success: successCount, conflicts: conflictCount });
    setTestRunning(false);
    fetchAdminData();
  }, [todayBookings, bookings, getAuthHeaders, fetchAdminData]);

  // Run Daily Meal Seeder
  const handleSeedToday = useCallback(async () => {
    setSeeding(true);
    setSeedStatus(null);
    try {
      const res = await fetch("/api/dev/seed", {
        method: "POST",
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSeedStatus({ seeded: true, date: data.date, slots: data.slots, bookings: data.bookings });
        fetchAdminData();
        window.dispatchEvent(new Event("messmate:time-changed"));
      } else {
        setSeedStatus({ seeded: false, date: "", slots: 0, bookings: 0 });
      }
    } catch {
      setSeedStatus({ seeded: false, date: "", slots: 0, bookings: 0 });
    } finally {
      setSeeding(false);
    }
  }, [getAuthHeaders, fetchAdminData]);

  return {
    slots,
    bookings,
    users,
    todayBookings,
    analytics,
    totalProjected,
    totalConsumed,
    totalOptedOut,
    totalSurplus,
    loading,
    testRunning,
    testResults,
    testSummary,
    seedStatus,
    seeding,
    fetchAdminData,
    handleExportCSV,
    handleRunConcurrencyTest,
    handleSeedToday,
  };
}

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
      const [mRes, bRes, uRes] = await Promise.all([
        fetch("/api/meals").then((r) => r.json()),
        supabase.from("meal_bookings").select("*"),
        supabase.from("users").select("*").eq("role", "STUDENT"),
      ]);

      if (mRes.slots) setSlots(mRes.slots);
      if (bRes.data && bRes.data.length > 0) setBookings(bRes.data);
      if (uRes.data && uRes.data.length > 0) {
        setUsers(uRes.data);
      } else {
        setUsers(DEMO_USERS.filter((u) => u.role === "STUDENT"));
      }
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

"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { THEME } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/ui/RoleGuard";
import WasteChart from "@/components/charts/WasteChart";
import KitchenMetricCards from "@/components/admin/KitchenMetricCards";
import SurplusDispatchBanner from "@/components/admin/SurplusDispatchBanner";
import MealForecastList from "@/components/admin/MealForecastList";
import AttendanceLedgerTable from "@/components/admin/AttendanceLedgerTable";
import DevTestingSuite from "@/components/admin/DevTestingSuite";
import { RefreshCw, Download } from "lucide-react";

export default function AdminDashboard() {
  const { role, loading: authLoading } = useAuth();
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Concurrency Stress Test State
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [testSummary, setTestSummary] = useState<{ success: number; conflicts: number } | null>(null);

  // Meal Seeding State
  const [seedStatus, setSeedStatus] = useState<{ seeded: boolean; date: string; slots: number; bookings: number } | null>(null);
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
      if (bRes.data) setBookings(bRes.data);
      if (uRes.data) setUsers(uRes.data);
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

  // Filter bookings belonging to today's active meal slots
  const todayBookings = bookings.filter((b) => slots.some((s) => s.id === b.meal_slot_id));

  // Export Audit Ledger to CSV
  const handleExportCSV = () => {
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
  };

  // Run in-browser Live Concurrency Stress Test against /api/qr/verify
  const handleRunConcurrencyTest = async () => {
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
          headers: { "Content-Type": "application/json" },
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
  };

  // Run Daily Meal Seeder
  const handleSeedToday = async () => {
    setSeeding(true);
    setSeedStatus(null);
    try {
      const res = await fetch("/api/dev/seed", { method: "POST" });
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
  };

  if (authLoading || (loading && slots.length === 0)) {
    return (
      <div className="p-16 text-center text-[#777064] font-medium text-sm">
        Loading Mess Admin Analytics...
      </div>
    );
  }
  if (role !== "ADMIN") return <RoleGuard requiredRole="ADMIN" />;

  // Aggregated analytics calculation
  const mealAnalytics = slots.map((s) => {
    const slotBookings = bookings.filter((b) => b.meal_slot_id === s.id);
    const optedIn = slotBookings.filter((b) => b.status === "OPTED_IN" || b.status === "LOCKED").length;
    const consumed = slotBookings.filter((b) => b.status === "CONSUMED").length;
    const optedOut = slotBookings.filter((b) => b.status === "OPTED_OUT").length;
    const projected = optedIn + consumed;
    const surplus = Math.max(0, projected - consumed);

    return {
      ...s,
      name: s.meal_type,
      Projected: projected,
      Consumed: consumed,
      OptedOut: optedOut,
      Surplus: surplus,
    };
  });

  const totalProjected = mealAnalytics.reduce((sum, m) => sum + m.Projected, 0);
  const totalConsumed = mealAnalytics.reduce((sum, m) => sum + m.Consumed, 0);
  const totalOptedOut = mealAnalytics.reduce((sum, m) => sum + m.OptedOut, 0);
  const totalSurplus = mealAnalytics.reduce((sum, m) => sum + m.Surplus, 0);

  return (
    <AppShell
      badge="Administration"
      title="Mess Management &amp; Kitchen Analytics"
      description="Kitchen portion forecasting, daily consumption ledger, and surplus food redistribution"
      actions={
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className={THEME.btnSecondary}>
            <Download className="w-4 h-4 text-[#244C3B]" />
            <span>Export CSV</span>
          </button>
          <button onClick={fetchAdminData} className={THEME.btnPrimary}>
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      }
    >
      {/* 4 Summary KPI Metric Cards */}
      <KitchenMetricCards
        totalProjected={totalProjected}
        totalConsumed={totalConsumed}
        totalOptedOut={totalOptedOut}
        totalSurplus={totalSurplus}
      />

      {/* Surplus Redistribution Alert & NGO Manifest Dispatch */}
      <SurplusDispatchBanner totalSurplus={totalSurplus} />

      {/* Forecast & Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MealForecastList analytics={mealAnalytics} />
        <WasteChart data={mealAnalytics} />
      </div>

      {/* Live Audit & Attendance Ledger Table */}
      <AttendanceLedgerTable
        bookings={todayBookings.length > 0 ? todayBookings : bookings}
        users={users}
        slots={slots}
      />

      {/* DISTINCT SECTION: Warden Verification & Engineering Stress-Testing Suite */}
      <DevTestingSuite
        onSeedToday={handleSeedToday}
        seeding={seeding}
        seedStatus={seedStatus}
        onRunConcurrencyTest={handleRunConcurrencyTest}
        testRunning={testRunning}
        testSummary={testSummary}
        testResults={testResults}
      />
    </AppShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import WasteChart from "@/components/charts/WasteChart";
import {
  Utensils,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  RefreshCw,
  Download,
  ShieldAlert,
} from "lucide-react";

export default function AdminDashboard() {
  const { role, loading: authLoading } = useAuth();
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);

    const { data: slotsData } = await supabase
      .from("meal_slots")
      .select("*")
      .order("cutoff_time", { ascending: true });

    const { data: bookingsData } = await supabase
      .from("meal_bookings")
      .select("*");

    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .eq("role", "STUDENT");

    if (slotsData) setSlots(slotsData);
    if (bookingsData) setBookings(bookingsData);
    if (usersData) setUsers(usersData);

    setLoading(false);
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Export Audit Ledger to CSV
  const handleExportCSV = () => {
    const headers = [
      "Student Name",
      "Registration No",
      "Dietary Preference",
      "Meal Type",
      "Booking Status",
      "Scanned Timestamp",
    ];

    const rows = bookings.map((b) => {
      const student = users.find((u) => u.id === b.user_id);
      const slot = slots.find((s) => s.id === b.meal_slot_id);

      let humanStatus = "Attending";
      if (b.status === "CONSUMED") humanStatus = "Checked In";
      else if (b.status === "LOCKED") humanStatus = "Prep Locked";
      else if (b.status === "OPTED_OUT") humanStatus = "Skipping";

      return [
        student?.name || "Student",
        student?.reg_no || "-",
        student?.dietary_pref || "VEG",
        slot?.meal_type || "-",
        humanStatus,
        b.scanned_at ? new Date(b.scanned_at).toLocaleString() : "Not Scanned",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `MessMate_Audit_Ledger_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading || loading) {
    return (
      <div className="p-8 text-center font-sans text-gray-400">
        Loading MessMate Admin Analytics...
      </div>
    );
  }

  // RBAC Guard: Restrict Admin Portal strictly to ADMIN role
  if (role !== "ADMIN") {
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
            This Refectory Control Center is secured for{" "}
            <span className="text-red-400 font-semibold">
              Mess Managers and Chief Wardens (ADMIN)
            </span>{" "}
            only. Your current session role does not have authorization.
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

  const mealAnalytics = slots.map((slot) => {
    const slotBookings = bookings.filter((b) => b.meal_slot_id === slot.id);

    const projectedCount = slotBookings.filter(
      (b) =>
        b.status === "OPTED_IN" ||
        b.status === "LOCKED" ||
        b.status === "CONSUMED",
    ).length;

    const consumedCount = slotBookings.filter(
      (b) => b.status === "CONSUMED",
    ).length;

    const optedOutCount = slotBookings.filter(
      (b) => b.status === "OPTED_OUT",
    ).length;

    const surplusPlates = Math.max(0, projectedCount - consumedCount);

    return {
      ...slot,
      name: slot.meal_type,
      Projected: projectedCount,
      Consumed: consumedCount,
      OptedOut: optedOutCount,
      Surplus: surplusPlates,
    };
  });

  const totalProjected = mealAnalytics.reduce((acc, m) => acc + m.Projected, 0);
  const totalConsumed = mealAnalytics.reduce((acc, m) => acc + m.Consumed, 0);
  const totalOptedOut = mealAnalytics.reduce((acc, m) => acc + m.OptedOut, 0);
  const totalSurplus = mealAnalytics.reduce((acc, m) => acc + m.Surplus, 0);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 font-sans transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="px-3 py-1 bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 font-bold text-xs rounded-full uppercase tracking-wide border border-pink-100 dark:border-pink-900">
              Refectory Control Center
            </span>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
              Mess Manager & Kitchen Forecasting Portal
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Real-time head-count predictions, consumption ledger & food waste
              analytics
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4 text-pink-600 dark:text-pink-400" />{" "}
              Export Audit CSV
            </button>
            <button
              onClick={fetchAdminData}
              className="px-4 py-2.5 bg-gray-900 dark:bg-gray-800 text-white rounded-xl text-xs font-semibold hover:bg-gray-800 flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Live Telemetry
            </button>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Projected Plates
              </span>
              <Utensils className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
              {totalProjected}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Locked head-count for kitchen prep
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Verified Checked In
              </span>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
              {totalConsumed}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Single-use QR scans redeemed
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Skipping (Saved)
              </span>
              <TrendingDown className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">
              {totalOptedOut}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Cancelled prior to cutoff lock
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Unclaimed Surplus
              </span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
              {totalSurplus}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Booked but not yet checked in
            </p>
          </div>
        </div>

        {/* Surplus Redistribution Alert Banner */}
        {totalSurplus > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                  Surplus Redistribution Alert Active ({totalSurplus} Unclaimed
                  Meals)
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Projected head-count exceeds current QR check-ins. Consider
                  notifying campus NGO / food redistribution volunteers after
                  dining hours close.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-amber-200/70 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-xs font-bold rounded-full shrink-0">
              Action Recommended
            </span>
          </div>
        )}

        {/* Middle Section: Headcount Cards + Modular WasteChart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-base font-bold text-gray-800 dark:text-white mb-4">
              Daily Kitchen Head-Count Forecast
            </h2>
            <div className="space-y-4">
              {mealAnalytics.map((meal) => (
                <div
                  key={meal.id}
                  className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 flex justify-between items-center"
                >
                  <div>
                    <span className="px-2.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-[11px] rounded-full uppercase">
                      {meal.meal_type}
                    </span>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white mt-1.5">
                      {meal.menu_items}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">
                      Cutoff:{" "}
                      {new Date(meal.cutoff_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Cook For:{" "}
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {meal.Projected}
                      </span>
                    </p>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Checked In:{" "}
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {meal.Consumed}
                      </span>
                    </p>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Skipping:{" "}
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {meal.OptedOut}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <WasteChart data={mealAnalytics} />
        </div>

        {/* Audit & Consumption Ledger Table */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h2 className="text-base font-bold text-gray-800 dark:text-white mb-4">
            Live Audit & Consumption Ledger
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-xs text-gray-400 uppercase">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Reg No.</th>
                  <th className="py-3 px-4">Dietary</th>
                  <th className="py-3 px-4">Meal Slot</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Scanned Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {bookings.map((b) => {
                  const student = users.find((u) => u.id === b.user_id);
                  const slot = slots.find((s) => s.id === b.meal_slot_id);

                  let badgeStyle =
                    "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900";
                  let statusText = "Attending";

                  if (b.status === "CONSUMED") {
                    badgeStyle =
                      "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
                    statusText = "Checked In";
                  } else if (b.status === "LOCKED") {
                    badgeStyle =
                      "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900";
                    statusText = "Prep Locked";
                  } else if (b.status === "OPTED_OUT") {
                    badgeStyle =
                      "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900";
                    statusText = "Skipping";
                  }

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-gray-800 dark:text-white">
                        {student?.name || "Student"}
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                        {student?.reg_no || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                          {student?.dietary_pref || "VEG"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                        {slot?.meal_type || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeStyle}`}
                        >
                          {statusText}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                        {b.scanned_at
                          ? new Date(b.scanned_at).toLocaleTimeString()
                          : "Not scanned yet"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

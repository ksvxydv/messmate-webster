"use client";

import { useAuth } from "@/lib/auth";
import { useAdminData } from "@/hooks/useAdminData";
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
  const { role, loading: authLoading, currentUser } = useAuth();

  const {
    slots,
    todayBookings,
    users,
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
  } = useAdminData();

  if (authLoading || (loading && slots.length === 0)) {
    return (
      <div className="p-16 text-center text-[#777064] font-medium text-sm">
        Loading Chief Warden Operations Console...
      </div>
    );
  }

  if (!currentUser || role !== "ADMIN") {
    return <RoleGuard requiredRole="ADMIN" />;
  }

  return (
    <AppShell
      badge="Administrative Operations"
      title="Chief Warden &amp; Kitchen Analytics"
      description="Headcount forecasting, dietary quotas, surplus management &amp; attendance audit ledger"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminData}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-[#E5E1D8] text-[#777064] hover:text-[#252820] hover:bg-[#FAF7F0] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh Live Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-xl bg-[#244C3B] hover:bg-[#1B382B] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs hover:shadow cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Ledger CSV
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <SurplusDispatchBanner totalSurplus={totalSurplus} />

        <KitchenMetricCards
          totalProjected={totalProjected}
          totalConsumed={totalConsumed}
          totalOptedOut={totalOptedOut}
          totalSurplus={totalSurplus}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8">
            <MealForecastList analytics={analytics} />
          </div>

          <div className="lg:col-span-4">
            <WasteChart data={analytics} />
          </div>
        </div>

        <AttendanceLedgerTable
          bookings={todayBookings}
          users={users}
          slots={slots}
        />

        <DevTestingSuite
          onSeedToday={handleSeedToday}
          seeding={seeding}
          seedStatus={seedStatus}
          onRunConcurrencyTest={handleRunConcurrencyTest}
          testRunning={testRunning}
          testSummary={testSummary}
          testResults={testResults}
        />
      </div>
    </AppShell>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { THEME } from "@/lib/theme";
import { getMealTimingDetails } from "@/lib/meal-times";
import { calculateRebates, DEFAULT_BASE_MONTHLY_FEE } from "@/lib/rebates";
import { useStudentMeals } from "@/hooks/useStudentMeals";
import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/ui/RoleGuard";
import RebateCard from "@/components/ui/RebateCard";
import QRPassModal from "@/components/ui/QRPassModal";
import StudentHeader from "@/components/student/StudentHeader";
import MealCard from "@/components/student/MealCard";
import { UtensilsCrossed, AlertCircle, RefreshCw, ChefHat } from "lucide-react";
import { UserProfile, DietaryPref } from "@/types";

export default function StudentDashboard() {
  const { role, loading: authLoading, currentUser } = useAuth();
  const [student, setStudent] = useState<UserProfile | null>(null);

  // Keep active student strictly aligned with verified authenticated user
  useEffect(() => {
    if (currentUser?.role === "STUDENT") {
      setStudent(currentUser);
    } else {
      setStudent(null);
    }
  }, [currentUser]);

  const {
    meals,
    loading,
    now,
    errorMessage,
    setErrorMessage,
    activeQRMeal,
    setActiveQRMeal,
    qrTokenString,
    qrCountdown,
    loadMeals,
    handleToggle,
    handleDietaryChange,
  } = useStudentMeals(student);

  if (authLoading || (loading && !student)) {
    return (
      <div className="p-16 text-center text-[#777064] font-medium text-sm">
        Loading Hostel Dining Portal...
      </div>
    );
  }

  if (role !== "STUDENT" || !currentUser) {
    return <RoleGuard requiredRole="STUDENT" />;
  }

  const optedOutMeals = meals.filter((m) => m.bookingStatus === "OPTED_OUT");
  const rebateCalc = calculateRebates(
    DEFAULT_BASE_MONTHLY_FEE,
    optedOutMeals.map((m) => ({ unitCost: m.unit_cost }))
  );

  const currentServingMeal = meals.find((m) => {
    const t = getMealTimingDetails(m.meal_type, m.meal_date, now);
    return t.isServingNow;
  });

  return (
    <AppShell
      badge="Hostel Dining"
      title="Hostel Mess Dining Portal"
      description="Daily meal schedule, attendance management, pre-cutoff rebates & dining entry passes"
      actions={
        <StudentHeader
          student={student}
          onDietaryChange={(pref) => handleDietaryChange(pref, setStudent)}
        />
      }
    >
      {/* Live Mess Service Status Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E1D8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#244C3B]/10 border border-[#244C3B]/20 text-[#244C3B] flex items-center justify-center shrink-0">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-[#252820]">
                MNNIT Central Dining Hall
              </span>
              {currentServingMeal ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  {currentServingMeal.meal_type} Serving Now
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FAF7F0] text-[#777064] border border-[#E5E1D8]">
                  Kitchen Prep in Progress
                </span>
              )}
            </div>
            <p className="text-xs text-[#777064] mt-0.5">
              Hostel Mess 1 (SVBH / Tilak Hall) • Hot nutritious meals prepared daily.
            </p>
          </div>
        </div>

        <div className="text-right text-xs sm:text-sm text-[#777064] hidden md:block">
          <div>Verified Opt-Out Rebates: <strong className="text-[#15803D] font-black">₹{rebateCalc.totalRebateCredit}</strong></div>
          <div className="text-xs text-[#777064]">Credited to monthly fee statement</div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-800 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 font-bold hover:text-rose-950 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Daily Mess Menu & Meal Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-[#252820] flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-[#244C3B]" /> Today&apos;s Mess Schedule &amp; Menu
          </h2>
          <button
            onClick={loadMeals}
            className="text-xs sm:text-sm text-[#777064] hover:text-[#252820] flex items-center gap-1.5 transition-colors cursor-pointer font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Schedule
          </button>
        </div>

        <div className="grid gap-4">
          {meals.length === 0 && !loading && (
            <div className={`${THEME.card} p-8 text-center space-y-3`}>
              <ChefHat className="w-8 h-8 text-[#777064] mx-auto" />
              <p className="text-sm font-semibold text-[#252820]">No meal schedule loaded for today.</p>
              <button onClick={loadMeals} className={THEME.btnPrimary + " mx-auto"}>
                <RefreshCw className="w-3.5 h-3.5" /> Load Today&apos;s Menu
              </button>
            </div>
          )}

          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              dietaryPref={student?.dietary_pref || "VEG"}
              now={now}
              onShowQR={(m) => setActiveQRMeal(m)}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </div>

      {/* Itemized Rebate Card */}
      <RebateCard
        baseMonthlyFee={DEFAULT_BASE_MONTHLY_FEE}
        optedOutCount={rebateCalc.optedOutCount}
        totalRebate={rebateCalc.totalRebateCredit}
        rebateItems={optedOutMeals.map((m) => ({
          id: m.id,
          mealType: m.meal_type,
          mealDate: m.meal_date || "Today",
          unitCost: Number(m.unit_cost || 50),
        }))}
      />

      <QRPassModal
        meal={activeQRMeal}
        student={student}
        qrTokenString={qrTokenString}
        qrCountdown={qrCountdown}
        onClose={() => setActiveQRMeal(null)}
      />
    </AppShell>
  );
}

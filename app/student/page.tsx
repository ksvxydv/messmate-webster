"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { THEME } from "@/lib/theme";
import { getMealTimingDetails } from "@/lib/meal-times";
import { calculateRebates, DEFAULT_BASE_MONTHLY_FEE } from "@/lib/rebates";
import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/ui/RoleGuard";
import RebateCard from "@/components/ui/RebateCard";
import QRPassModal from "@/components/ui/QRPassModal";
import StudentHeader from "@/components/student/StudentHeader";
import StudentPersonaSwitcher from "@/components/student/StudentPersonaSwitcher";
import MealCard from "@/components/student/MealCard";
import {
  UtensilsCrossed,
  AlertCircle,
  RefreshCw,
  ChefHat,
  Sparkles,
} from "lucide-react";
import { UserProfile, StudentMealView, DietaryPref } from "@/types";

export default function StudentDashboard() {
  const { role, loading: authLoading, currentUser, setCurrentUser, availableUsers } = useAuth();
  const [student, setStudent] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<StudentMealView[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [now, setNow] = useState<Date>(new Date());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // QR Modal state
  const [activeQRMeal, setActiveQRMeal] = useState<StudentMealView | null>(null);
  const [qrTokenString, setQrTokenString] = useState("");
  const [qrCountdown, setQrCountdown] = useState(30);

  // Server-synced ticker for cutoffs and 30s QR rotation
  useEffect(() => {
    const timer = setInterval(() => {
      const adjusted = new Date(Date.now() + serverTimeOffset);
      setNow(adjusted);
      setQrCountdown(30 - (Math.floor(adjusted.getTime() / 1000) % 30));
    }, 1000);
    return () => clearInterval(timer);
  }, [serverTimeOffset]);

  // Keep student aligned with currentUser
  useEffect(() => {
    if (currentUser?.role === "STUDENT") {
      setStudent(currentUser);
    } else {
      const firstStudent = availableUsers.find((u) => u.role === "STUDENT");
      if (firstStudent) setStudent(firstStudent);
    }
  }, [currentUser, availableUsers]);

  // Load daily meal schedule & server timestamp
  const loadMealsForStudent = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    try {
      const res = await fetch("/api/meals");
      const data = await res.json();
      if (data.serverTime) {
        setServerTimeOffset(new Date(data.serverTime).getTime() - Date.now());
      }

      const { data: bookings } = await supabase
        .from("meal_bookings")
        .select("*")
        .eq("user_id", student.id);

      const formatted: StudentMealView[] = (data.slots || []).map((slot: any) => {
        const booking =
          (bookings || []).find((b: any) => b.meal_slot_id === slot.id) ||
          (slot.meal_bookings || []).find((b: any) => b.user_id === student.id);
        return {
          ...slot,
          bookingStatus: booking ? booking.status : "OPTED_IN",
          bookingId: booking ? booking.id : null,
          scannedAt: booking ? booking.scanned_at : null,
        };
      });
      setMeals(formatted);
    } catch (e: any) {
      console.error("Meals load error:", e);
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => {
    loadMealsForStudent();
    const onTimeChange = () => loadMealsForStudent();
    window.addEventListener("messmate:time-changed", onTimeChange);
    return () => window.removeEventListener("messmate:time-changed", onTimeChange);
  }, [loadMealsForStudent]);

  // Regenerate rotating QR token on 30s bucket boundary via server-only cryptographic endpoint
  const currentWindowBucket = Math.floor(now.getTime() / 30000);
  useEffect(() => {
    let cancelled = false;
    if (activeQRMeal && student) {
      fetch(
        `/api/qr/token?userId=${encodeURIComponent(student.id)}&mealSlotId=${encodeURIComponent(activeQRMeal.id)}`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && data.qrToken) {
            setQrTokenString(data.qrToken);
          }
        })
        .catch((err) => console.error("QR token retrieval error:", err));
    }
    return () => {
      cancelled = true;
    };
  }, [activeQRMeal, student, currentWindowBucket]);

  // Toggle meal preference via server-authoritative API
  const handleToggle = async (mealSlotId: string, currentStatus: string) => {
    if (!student) return;
    const requestedStatus = currentStatus === "OPTED_IN" ? "OPTED_OUT" : "OPTED_IN";
    setErrorMessage(null);
    setMeals((prev) =>
      prev.map((m) => (m.id === mealSlotId ? { ...m, bookingStatus: requestedStatus } : m)),
    );

    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: student.id, mealSlotId, requestedStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        setErrorMessage(err.error || "Preparation deadline has elapsed. Attendance is locked.");
        loadMealsForStudent();
      }
    } catch {
      setErrorMessage("Network issue. Reverting status.");
      loadMealsForStudent();
    }
  };

  // Track in-flight dietary preference request to prevent race conditions
  const lastPrefRequestIdRef = useRef<number>(0);

  const handleDietaryChange = async (newPref: DietaryPref) => {
    if (!student) return;
    const requestId = ++lastPrefRequestIdRef.current;
    const prevStudent = student;
    const updated = { ...student, dietary_pref: newPref };

    // 1. Immediate optimistic UI update
    setStudent(updated);
    setCurrentUser(updated);
    setErrorMessage(null);

    // 2. Persist to per-student localStorage for demo resilience
    if (typeof window !== "undefined") {
      localStorage.setItem(`messmate_pref_${student.id}`, newPref);
    }

    // 3. Persist to Supabase with error handling and race-condition guard
    try {
      const { error } = await supabase
        .from("users")
        .update({ dietary_pref: newPref })
        .eq("id", student.id);

      if (error && requestId === lastPrefRequestIdRef.current) {
        console.error("Failed to update dietary preference:", error.message);
        setErrorMessage(`Preference update failed (${error.message}). Reverting.`);
        setStudent(prevStudent);
        setCurrentUser(prevStudent);
      }
    } catch (err: any) {
      if (requestId === lastPrefRequestIdRef.current) {
        console.error("Network error while updating dietary preference:", err);
        setErrorMessage("Network error while updating preference. Reverting.");
        setStudent(prevStudent);
        setCurrentUser(prevStudent);
      }
    }
  };

  const studentProfiles = useMemo(
    () => availableUsers.filter((u) => u.role === "STUDENT"),
    [availableUsers],
  );

  if (authLoading || (loading && !student)) {
    return (
      <div className="p-16 text-center text-[#777064] font-medium text-sm">
        Loading Hostel Dining Portal...
      </div>
    );
  }

  if (role !== "STUDENT") {
    return <RoleGuard requiredRole="STUDENT" />;
  }

  const optedOutMeals = meals.filter((m) => m.bookingStatus === "OPTED_OUT");
  const rebateCalc = calculateRebates(
    DEFAULT_BASE_MONTHLY_FEE,
    optedOutMeals.map((m) => ({ unitCost: m.unit_cost }))
  );

  // Identify currently serving meal
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
          onDietaryChange={handleDietaryChange}
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

      {/* Student Profile Switcher (Demo Only) */}
      <StudentPersonaSwitcher
        studentProfiles={studentProfiles}
        activeStudentId={student?.id}
        onSelectStudent={(s) => {
          // Isolate each student's preference without cross-contaminating
          const savedPref = typeof window !== "undefined"
            ? (localStorage.getItem(`messmate_pref_${s.id}`) as DietaryPref | null)
            : null;
          const targetStudent = savedPref ? { ...s, dietary_pref: savedPref } : s;
          setStudent(targetStudent);
          setCurrentUser(targetStudent);
          setErrorMessage(null);
        }}
      />

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
            onClick={loadMealsForStudent}
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
              <button onClick={loadMealsForStudent} className={THEME.btnPrimary + " mx-auto"}>
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

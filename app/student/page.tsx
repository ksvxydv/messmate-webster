"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { generateQRToken } from "@/lib/crypto";
import RebateCard from "@/components/ui/RebateCard";
import QRPassModal from "@/components/ui/QRPassModal";
import {
  Utensils,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  QrCode,
  Users,
  Lock,
  ShieldAlert,
} from "lucide-react";

export default function StudentDashboard() {
  const { role, loading: authLoading } = useAuth();
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(new Date(0));

  // QR Modal state
  const [activeQRMeal, setActiveQRMeal] = useState<any>(null);
  const [qrTokenString, setQrTokenString] = useState("");
  const [qrCountdown, setQrCountdown] = useState(30);

  // Live 1-second ticker for cutoff countdowns and 30s QR rotation
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => {
      const current = new Date();
      setNow(current);
      const secondsInWindow = 30 - (Math.floor(current.getTime() / 1000) % 30);
      setQrCountdown(secondsInWindow);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function initStudents() {
      const { data: studentsList } = await supabase
        .from("users")
        .select("*")
        .eq("role", "STUDENT")
        .order("reg_no", { ascending: true });

      if (studentsList && studentsList.length > 0) {
        setAllStudents(studentsList);
        setStudent(studentsList[0]);
      } else {
        setLoading(false);
      }
    }
    initStudents();
  }, []);

  useEffect(() => {
    async function loadMealsForStudent() {
      if (!student) return;
      setLoading(true);

      const { data: slots } = await supabase
        .from("meal_slots")
        .select("*")
        .order("cutoff_time", { ascending: true });

      const { data: bookings } = await supabase
        .from("meal_bookings")
        .select("*")
        .eq("user_id", student.id);

      if (slots) {
        const formatted = slots.map((slot: any) => {
          const booking = (bookings || []).find(
            (b: any) => b.meal_slot_id === slot.id,
          );
          return {
            ...slot,
            bookingStatus: booking ? booking.status : "OPTED_IN",
            bookingId: booking ? booking.id : null,
            scannedAt: booking ? booking.scanned_at : null,
          };
        });
        setMeals(formatted);
      }
      setLoading(false);
    }
    loadMealsForStudent();
  }, [student?.id]);

  useEffect(() => {
    async function updateQR() {
      if (activeQRMeal && student) {
        const token = await generateQRToken(student.id, activeQRMeal.id);
        setQrTokenString(token);
      }
    }
    if (activeQRMeal) {
      updateQR();
    }
  }, [activeQRMeal, student, Math.floor(now.getTime() / 30000)]);

  const handleToggle = async (mealSlotId: string, currentStatus: string) => {
    const newStatus = currentStatus === "OPTED_IN" ? "OPTED_OUT" : "OPTED_IN";
    setMeals(
      meals.map((m) =>
        m.id === mealSlotId ? { ...m, bookingStatus: newStatus } : m,
      ),
    );

    await supabase
      .from("meal_bookings")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("user_id", student.id)
      .eq("meal_slot_id", mealSlotId);
  };

  const handleSimulateLockToggle = async (meal: any) => {
    const nextStatus = meal.bookingStatus === "LOCKED" ? "OPTED_IN" : "LOCKED";
    setMeals(
      meals.map((m) =>
        m.id === meal.id ? { ...m, bookingStatus: nextStatus } : m,
      ),
    );
    await supabase
      .from("meal_bookings")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("user_id", student.id)
      .eq("meal_slot_id", meal.id);
  };

  const handleDietaryChange = async (pref: string) => {
    if (!student) return;
    const updatedStudent = { ...student, dietary_pref: pref };
    setStudent(updatedStudent);
    setAllStudents(
      allStudents.map((s) => (s.id === student.id ? updatedStudent : s)),
    );
    await supabase
      .from("users")
      .update({ dietary_pref: pref })
      .eq("id", student.id);
  };

  const getCountdownText = (cutoffTime: string) => {
    if (now.getTime() === 0) return "Syncing clock...";
    const diff = new Date(cutoffTime).getTime() - now.getTime();
    if (diff <= 0) return "Cutoff Passed";
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hrs}h ${mins}m ${secs}s left`;
  };

  if (authLoading || (loading && !student))
    return (
      <div className="p-8 text-center font-sans text-gray-400">
        Loading MessMate Student Portal...
      </div>
    );

  // RBAC Guard: Restrict Student Portal strictly to STUDENT role
  if (role !== "STUDENT") {
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
            This Dining Sanctum Portal is strictly secured for{" "}
            <span className="text-red-400 font-semibold">
              Hostel Residents (STUDENT)
            </span>
            . Please switch your active role to STUDENT in the top navigation
            bar.
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

  const optedOutMeals = meals.filter((m) => m.bookingStatus === "OPTED_OUT");
  const totalRebate = optedOutMeals.reduce(
    (sum, m) => sum + Number(m.unit_cost || 50),
    0,
  );

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 font-sans relative transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Student Switcher */}
        {allStudents.length > 1 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-3.5 px-5 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4 text-pink-600 dark:text-pink-400" />
              <span>Switch Active Student Profile (Demo):</span>
            </div>
            <div className="flex items-center gap-2">
              {allStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStudent(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    student?.id === s.id
                      ? "bg-pink-600 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {s.name} ({s.reg_no})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
          <div>
            <span className="px-3 py-1 bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 font-bold text-xs rounded-full uppercase tracking-wide border border-pink-100 dark:border-pink-900">
              Student Dining Dashboard
            </span>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
              MessMate Student Portal
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Manage your daily hostel meal schedules, QR passes & monthly
              rebates
            </p>
          </div>

          {student && (
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3 bg-pink-50 dark:bg-pink-950/50 px-4 py-2 rounded-xl border border-pink-100 dark:border-pink-900">
                <User className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {student.name}
                  </p>
                  <p className="text-xs text-pink-600 dark:text-pink-400 font-medium">
                    Reg: {student.reg_no} | {student.dietary_pref}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                {["VEG", "NON_VEG", "JAIN"].map((pref) => (
                  <button
                    key={pref}
                    onClick={() => handleDietaryChange(pref)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      student.dietary_pref === pref
                        ? "bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                    }`}
                  >
                    {pref}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Today's Meals Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-pink-600 dark:text-pink-400" />{" "}
            Today&apos;s Meal Schedule & Cutoff Timers
          </h2>

          <div className="grid gap-4">
            {meals.map((meal) => {
              const isConsumed = meal.bookingStatus === "CONSUMED";
              const isLocked = meal.bookingStatus === "LOCKED" || isConsumed;

              let statusLabel = "Attending";
              let badgeStyle =
                "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900";

              if (meal.bookingStatus === "OPTED_OUT") {
                statusLabel = "Skipping";
                badgeStyle =
                  "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900";
              } else if (meal.bookingStatus === "LOCKED") {
                statusLabel = "Prep Locked";
                badgeStyle =
                  "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900";
              } else if (meal.bookingStatus === "CONSUMED") {
                statusLabel = "Checked In";
                badgeStyle =
                  "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
              }

              return (
                <div
                  key={meal.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold text-xs rounded-full uppercase tracking-wide">
                        {meal.meal_type}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                        <Clock className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                        {getCountdownText(meal.cutoff_time)}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white mt-2">
                      {meal.menu_items}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Rebate Value: ₹{meal.unit_cost} per skipped meal
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                    {meal.bookingStatus === "LOCKED" && (
                      <button
                        onClick={() => setActiveQRMeal(meal)}
                        className="px-4 py-2 bg-pink-600 text-white rounded-xl text-xs font-semibold hover:bg-pink-700 shadow-sm flex items-center gap-1.5"
                      >
                        <QrCode className="w-4 h-4" /> Show QR Pass
                      </button>
                    )}

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeStyle}`}
                    >
                      {statusLabel === "Attending" && (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      {statusLabel === "Skipping" && (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {statusLabel === "Prep Locked" && (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                      {statusLabel}
                    </span>

                    {!isConsumed && (
                      <button
                        disabled={isLocked}
                        onClick={() =>
                          handleToggle(meal.id, meal.bookingStatus)
                        }
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isLocked
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                            : meal.bookingStatus === "OPTED_IN"
                              ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-900"
                              : "bg-green-600 text-white hover:bg-green-700 shadow-sm"
                        }`}
                      >
                        {isLocked
                          ? "Locked"
                          : meal.bookingStatus === "OPTED_IN"
                            ? "Mark as Skipping"
                            : "Mark as Attending"}
                      </button>
                    )}

                    {!isConsumed && (
                      <button
                        onClick={() => handleSimulateLockToggle(meal)}
                        title="Toggle Cutoff Lock for Live Viva Demo"
                        className="px-2.5 py-2 rounded-xl text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        {meal.bookingStatus === "LOCKED"
                          ? "Unlock (Demo)"
                          : "Lock (Demo)"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modular Rebate Card */}
        <RebateCard
          baseMonthlyFee={4500}
          optedOutCount={optedOutMeals.length}
          totalRebate={totalRebate}
        />
      </div>

      {/* Modular QR Modal */}
      <QRPassModal
        meal={activeQRMeal}
        student={student}
        qrTokenString={qrTokenString}
        qrCountdown={qrCountdown}
        onClose={() => setActiveQRMeal(null)}
      />
    </main>
  );
}

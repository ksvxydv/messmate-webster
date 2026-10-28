"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { UserProfile, StudentMealView, DietaryPref } from "@/types";

export function useStudentMeals(student: UserProfile | null) {
  const { getAuthHeaders, setCurrentUser } = useAuth();
  const [meals, setMeals] = useState<StudentMealView[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [now, setNow] = useState<Date>(new Date());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active QR Modal state
  const [activeQRMeal, setActiveQRMeal] = useState<StudentMealView | null>(null);
  const [qrTokenString, setQrTokenString] = useState("");
  const [qrCountdown, setQrCountdown] = useState(30);

  // Ref to guard against racing dietary preference updates
  const lastPrefRequestIdRef = useRef<number>(0);

  // Server-synced ticker for cutoffs and 30s QR rotation
  useEffect(() => {
    const timer = setInterval(() => {
      const adjusted = new Date(Date.now() + serverTimeOffset);
      setNow(adjusted);
      setQrCountdown(30 - (Math.floor(adjusted.getTime() / 1000) % 30));
    }, 1000);
    return () => clearInterval(timer);
  }, [serverTimeOffset]);

  // Load daily meal schedule & server timestamp
  const loadMeals = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    try {
      const res = await fetch("/api/meals");
      const data = await res.json();
      if (data.serverTime) {
        setServerTimeOffset(new Date(data.serverTime).getTime() - Date.now());
      }

      let bookings: any[] = [];
      try {
        const { data: dbBookings } = await supabase
          .from("meal_bookings")
          .select("*")
          .eq("user_id", student.id);
        if (dbBookings) bookings = dbBookings;
      } catch {}

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
    loadMeals();
    const onTimeChange = () => loadMeals();
    window.addEventListener("messmate:time-changed", onTimeChange);
    return () => window.removeEventListener("messmate:time-changed", onTimeChange);
  }, [loadMeals]);

  // Regenerate rotating QR token on 30s bucket boundary
  const currentWindowBucket = Math.floor(now.getTime() / 30000);
  useEffect(() => {
    let cancelled = false;
    if (activeQRMeal && student) {
      fetch(
        `/api/qr/token?userId=${encodeURIComponent(student.id)}&mealSlotId=${encodeURIComponent(activeQRMeal.id)}`,
        { headers: { ...getAuthHeaders() } }
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
  }, [activeQRMeal, student, currentWindowBucket, getAuthHeaders]);

  // Toggle meal preference (Opt-In / Opt-Out)
  const handleToggle = useCallback(
    async (mealSlotId: string, currentStatus: string) => {
      if (!student) return;
      const requestedStatus = currentStatus === "OPTED_IN" ? "OPTED_OUT" : "OPTED_IN";
      setErrorMessage(null);

      // Optimistic update
      setMeals((prev) =>
        prev.map((m) => (m.id === mealSlotId ? { ...m, bookingStatus: requestedStatus } : m))
      );

      try {
        const res = await fetch("/api/meals", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ userId: student.id, mealSlotId, requestedStatus }),
        });
        if (!res.ok) {
          const err = await res.json();
          setErrorMessage(err.error || "Preparation deadline has elapsed. Attendance is locked.");
          loadMeals();
        }
      } catch {
        setErrorMessage("Network issue. Reverting status.");
        loadMeals();
      }
    },
    [student, getAuthHeaders, loadMeals]
  );

  // Update dietary preference with race-condition guard
  const handleDietaryChange = useCallback(
    async (newPref: DietaryPref, onStudentUpdated?: (updated: UserProfile) => void) => {
      if (!student) return;
      const requestId = ++lastPrefRequestIdRef.current;
      const prevStudent = student;
      const updated = { ...student, dietary_pref: newPref };

      onStudentUpdated?.(updated);
      setCurrentUser(updated);
      setErrorMessage(null);

      if (typeof window !== "undefined") {
        localStorage.setItem(`messmate_pref_${student.id}`, newPref);
      }

      try {
        const res = await fetch("/api/student/preference", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ userId: student.id, dietaryPref: newPref }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to persist dietary preference.");
        }
      } catch (err: any) {
        if (requestId === lastPrefRequestIdRef.current) {
          console.warn("[preference] Dietary update notice:", err);
          // Keep optimistic preference in UI and localStorage without interrupting student workflow
        }
      }
    },
    [student, setCurrentUser, getAuthHeaders]
  );

  return {
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
  };
}

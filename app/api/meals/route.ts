import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerNow } from "@/lib/server-clock";
import { ensureTodayMealSlots, getTodayDateString, getISTDayOfWeek } from "@/lib/seed-service";
import { WEEKLY_DIETARY_MENUS } from "@/lib/menus";
import { MealType } from "@/types";
import { requireAuthenticatedUser } from "@/lib/server-auth";

// GET /api/meals - Fetch TODAY's meal slots, auto-refresh every 24h, trigger auto-lock for expired cutoffs
export async function GET() {
  const serverNow = getServerNow();
  const today = getTodayDateString(serverNow);

  // 1. Ensure slots and bookings exist for today (auto-refreshes every 24 hours / date change)
  await ensureTodayMealSlots(serverNow);

  // 2. Fetch today's slots with attached bookings
  const { data: slots, error } = await supabase
    .from("meal_slots")
    .select("*, meal_bookings(id, status, user_id, scanned_at)")
    .eq("meal_date", today)
    .order("cutoff_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3. Identify slots whose cutoff has elapsed and auto-lock un-opted-out bookings
  const expiredSlotIds = (slots || [])
    .filter((slot) => new Date(slot.cutoff_time) <= serverNow)
    .map((slot) => slot.id);

  if (expiredSlotIds.length > 0) {
    await supabase
      .from("meal_bookings")
      .update({ status: "LOCKED", updated_at: serverNow.toISOString() })
      .in("meal_slot_id", expiredSlotIds)
      .eq("status", "OPTED_IN");

    // Keep memory in sync for returned response
    for (const slot of slots || []) {
      if (expiredSlotIds.includes(slot.id) && slot.meal_bookings) {
        for (const b of slot.meal_bookings) {
          if (b.status === "OPTED_IN") {
            b.status = "LOCKED";
          }
        }
      }
    }
  }

  // 4. Enrich slots with structured dietary variants (VEG, NON_VEG, JAIN)
  const dow = getISTDayOfWeek(serverNow);
  const daySchedule = WEEKLY_DIETARY_MENUS[dow] || WEEKLY_DIETARY_MENUS[1];

  const enrichedSlots = (slots || []).map((slot: any) => {
    const mealType = slot.meal_type as MealType;
    const scheduleForMeal = daySchedule[mealType] || daySchedule.LUNCH;

    let variants = {
      VEG: scheduleForMeal.VEG,
      NON_VEG: scheduleForMeal.NON_VEG,
      JAIN: scheduleForMeal.JAIN,
    };

    if (slot.menu_items && typeof slot.menu_items === "string" && slot.menu_items.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(slot.menu_items);
        if (parsed && parsed.VEG && parsed.NON_VEG && parsed.JAIN) {
          variants = parsed;
        }
      } catch {}
    }

    return {
      ...slot,
      dietary_variants: variants,
    };
  });

  return NextResponse.json({
    serverTime: serverNow.toISOString(),
    date: today,
    slots: enrichedSlots,
  });
}

// POST /api/meals - Server-Authoritative Atomic Cutoff Opt-In/Opt-Out Toggle
export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const { userId, mealSlotId, requestedStatus } = await request.json();

    if (!["OPTED_IN", "OPTED_OUT"].includes(requestedStatus)) {
      return NextResponse.json(
        { error: "Invalid status transition requested." },
        { status: 400 },
      );
    }

    // Role check: Student can only alter their own booking
    if (auth.user.role === "STUDENT" && auth.user.id !== userId) {
      return NextResponse.json(
        { error: "Forbidden: Students cannot alter other students' bookings." },
        { status: 403 }
      );
    }

    // 1. Fetch meal slot cutoff time from database
    const { data: slot, error: slotError } = await supabase
      .from("meal_slots")
      .select("cutoff_time, meal_type")
      .eq("id", mealSlotId)
      .single();

    if (slotError || !slot) {
      return NextResponse.json(
        { error: "Meal slot not found." },
        { status: 404 },
      );
    }

    // 2. Prevent tampering if meal is already consumed
    const { data: currentBooking } = await supabase
      .from("meal_bookings")
      .select("id, status")
      .eq("user_id", userId)
      .eq("meal_slot_id", mealSlotId)
      .maybeSingle();

    if (currentBooking?.status === "CONSUMED") {
      return NextResponse.json(
        { error: "Cannot change preference: Meal has already been consumed." },
        { status: 400 }
      );
    }

    // 3. Enforce Server-Authoritative Cutoff Lock
    const serverNow = getServerNow();
    const cutoffDate = new Date(slot.cutoff_time);

    if (serverNow >= cutoffDate) {
      // Automatically transition to LOCKED if cutoff has passed
      await supabase
        .from("meal_bookings")
        .update({ status: "LOCKED", updated_at: serverNow.toISOString() })
        .eq("user_id", userId)
        .eq("meal_slot_id", mealSlotId)
        .eq("status", "OPTED_IN");

      return NextResponse.json(
        {
          error: `Cutoff passed for ${slot.meal_type}! Cancellations are locked for kitchen preparation.`,
          locked: true,
        },
        { status: 403 },
      );
    }

    // 4. Cutoff has not passed -> allow Opt-In / Opt-Out update
    const { data: updated, error: updateError } = await supabase
      .from("meal_bookings")
      .update({
        status: requestedStatus,
        updated_at: serverNow.toISOString(),
      })
      .eq("user_id", userId)
      .eq("meal_slot_id", mealSlotId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated preference to ${requestedStatus}`,
      booking: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Invalid request payload" },
      { status: 400 },
    );
  }
}

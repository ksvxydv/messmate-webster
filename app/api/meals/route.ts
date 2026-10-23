import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/meals - Fetch daily meal slots and head-count forecast
export async function GET() {
  const { data: slots, error } = await supabase
    .from("meal_slots")
    .select("*, meal_bookings(id, status, user_id)")
    .order("cutoff_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    serverTime: new Date().toISOString(),
    slots,
  });
}

// POST /api/meals - Server-Authoritative Atomic Cutoff Opt-In/Opt-Out Toggle
export async function POST(request: Request) {
  try {
    const { userId, mealSlotId, requestedStatus } = await request.json();

    if (!["OPTED_IN", "OPTED_OUT"].includes(requestedStatus)) {
      return NextResponse.json(
        { error: "Invalid status transition requested." },
        { status: 400 },
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

    // 2. Enforce Server-Authoritative Cutoff Lock (Immune to client clock tampering)
    const serverNow = new Date();
    const cutoffDate = new Date(slot.cutoff_time);

    if (serverNow >= cutoffDate) {
      // Automatically transition to LOCKED if cutoff has passed
      await supabase
        .from("meal_bookings")
        .update({ status: "LOCKED", updated_at: serverNow.toISOString() })
        .eq("user_id", userId)
        .eq("meal_slot_id", mealSlotId)
        .in("status", ["OPTED_IN"]);

      return NextResponse.json(
        {
          error: `Cutoff passed for ${slot.meal_type}! Cancellations are locked for kitchen preparation.`,
          locked: true,
        },
        { status: 403 },
      );
    }

    // 3. Cutoff has not passed -> allow Opt-In / Opt-Out update
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
      message: `Successfully updated preference to ${requestedStatus}`,
      booking: updated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 },
    );
  }
}

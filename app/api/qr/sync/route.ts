import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { scans, staffId } = await request.json();

    if (!Array.isArray(scans) || scans.length === 0) {
      return NextResponse.json(
        { success: false, error: "No scans provided for synchronization." },
        { status: 400 },
      );
    }

    const results = {
      total: scans.length,
      synced: 0,
      conflicts: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const scan of scans) {
      const { userId, mealSlotId, timestamp } = scan;

      // Atomic Compare-And-Swap check-in
      const { data: updated, error: updateError } = await supabase
        .from("meal_bookings")
        .update({
          status: "CONSUMED",
          scanned_at: timestamp || new Date().toISOString(),
          scanned_by: staffId || null,
        })
        .eq("user_id", userId)
        .eq("meal_slot_id", mealSlotId)
        .in("status", ["LOCKED", "OPTED_IN"])
        .select("id, user_id, meal_slot_id, status, scanned_at")
        .maybeSingle();

      if (updateError) {
        results.failed++;
        results.details.push({
          userId,
          mealSlotId,
          status: "ERROR",
          reason: updateError.message,
        });
        continue;
      }

      if (updated) {
        results.synced++;
        results.details.push({
          userId,
          mealSlotId,
          status: "SYNCED",
          bookingId: updated.id,
        });
      } else {
        // Find existing state to report why it wasn't locked
        const { data: existing } = await supabase
          .from("meal_bookings")
          .select("status, scanned_at")
          .eq("user_id", userId)
          .eq("meal_slot_id", mealSlotId)
          .maybeSingle();

        results.conflicts++;
        results.details.push({
          userId,
          mealSlotId,
          status: "CONFLICT_PREVENTED",
          currentStatus: existing?.status || "NOT_FOUND",
          reason:
            existing?.status === "CONSUMED"
              ? "Already consumed (online double-spend prevented)"
              : `Booking is in '${existing?.status || "UNKNOWN"}' state`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Batch sync complete: ${results.synced} redeemed, ${results.conflicts} conflicts prevented.`,
      summary: results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process batch sync." },
      { status: 500 },
    );
  }
}

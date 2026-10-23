import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { bookingId, staffId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "bookingId is required" },
        { status: 400 },
      );
    }

    // ATOMIC CHECK-IN UPDATE (Compare-and-Swap locking the row)
    const { data: updated, error: updateError } = await supabase
      .from("meal_bookings")
      .update({
        status: "CONSUMED",
        scanned_at: new Date().toISOString(),
        scanned_by: staffId || null,
      })
      .eq("id", bookingId)
      .eq("status", "LOCKED") // Ensures zero double-dipping race conditions
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        {
          error:
            "Race condition prevented: Token already redeemed or invalid status.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pass successfully redeemed!",
      booking: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyQRToken } from "@/lib/crypto";
import { getServerNow } from "@/lib/server-clock";
import { requireRole } from "@/lib/server-auth";
import { localStore } from "@/lib/local-store";
import { getTodayDateString } from "@/lib/seed-service";

export async function POST(request: Request) {
  try {
    // 1. Enforce staff/admin authentication
    const auth = await requireRole(request, ["STAFF", "ADMIN"]);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const body = await request.json();
    const { qrToken, bookingId } = body;

    let targetUserId: string | null = null;
    let targetMealSlotId: string | null = null;

    // 2. In-memory Cryptographic Validation
    if (qrToken) {
      const verification = await verifyQRToken(qrToken);
      if (!verification.valid || !verification.payload) {
        return NextResponse.json(
          {
            success: false,
            error: verification.reason || "Cryptographic verification failed.",
            code: "TOKEN_INVALID",
          },
          { status: 400 },
        );
      }
      targetUserId = verification.payload.userId;
      targetMealSlotId = verification.payload.mealSlotId;
    } else if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          error: "Either qrToken or bookingId is required.",
          code: "MISSING_PAYLOAD",
        },
        { status: 400 },
      );
    }

    const scanTimestamp = getServerNow().toISOString();
    const staffId = auth.user.id;

    // 3. Atomic Compare-And-Swap (CAS) Database Update
    // Eligible states for redemption: LOCKED (cutoff elapsed) or OPTED_IN (attending)
    let query = supabase
      .from("meal_bookings")
      .update({
        status: "CONSUMED",
        scanned_at: scanTimestamp,
        scanned_by: staffId,
      })
      .in("status", ["LOCKED", "OPTED_IN"]);

    if (targetUserId && targetMealSlotId) {
      query = query
        .eq("user_id", targetUserId)
        .eq("meal_slot_id", targetMealSlotId);
    } else if (bookingId) {
      query = query.eq("id", bookingId);
    }

    let updated: any = null;
    try {
      const { data, error: updateError } = await query
        .select(
          "id, status, scanned_at, user_id, meal_slot_id, users:users!meal_bookings_user_id_fkey(name, reg_no, dietary_pref), meal_slots(meal_type, menu_items)",
        )
        .maybeSingle();

      if (!updateError && data) {
        updated = data;
      }
    } catch {}

    // Fallback: If Supabase query failed or 0 rows updated, check Local Store
    if (!updated && targetUserId && targetMealSlotId) {
      const localResult = localStore.atomicConsume(targetUserId, targetMealSlotId, staffId);
      if (localResult.success && localResult.booking) {
        const student = localStore.findUserById(targetUserId) || {
          name: "Student",
          reg_no: "20251001",
          dietary_pref: "VEG",
        };
        return NextResponse.json({
          success: true,
          status: "CONSUMED",
          student: {
            id: targetUserId,
            name: student.name,
            registrationNo: student.reg_no,
            dietaryPreference: student.dietary_pref,
          },
          mealSlot: {
            mealType: "BREAKFAST",
            date: getTodayDateString(new Date()),
          },
          scannedAt: localResult.booking.scanned_at,
        });
      } else if (localResult.error && localResult.error.includes("Double Scan")) {
        return NextResponse.json(
          {
            success: false,
            error: localResult.error,
            code: "ALREADY_CONSUMED",
          },
          { status: 409 }
        );
      }
    }

    // 4. If 0 rows updated, inspect state to return informative conflict response
    if (!updated) {
      let checkQuery = supabase.from("meal_bookings").select("id, status, scanned_at");
      if (targetUserId && targetMealSlotId) {
        checkQuery = checkQuery
          .eq("user_id", targetUserId)
          .eq("meal_slot_id", targetMealSlotId);
      } else if (bookingId) {
        checkQuery = checkQuery.eq("id", bookingId);
      }

      const { data: existing } = await checkQuery.maybeSingle();

      if (!existing) {
        return NextResponse.json(
          {
            success: false,
            error: "Pass not found: No booking record exists for this meal slot.",
            code: "BOOKING_NOT_FOUND",
          },
          { status: 404 },
        );
      }

      if (existing.status === "CONSUMED") {
        return NextResponse.json(
          {
            success: false,
            error: `ALERT: Pass already redeemed at ${new Date(existing.scanned_at).toLocaleTimeString()}! Double-scan rejected.`,
            code: "ALREADY_CONSUMED",
            booking: existing,
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            existing.status === "OPTED_OUT"
              ? "Check-in blocked: Student opted out of this meal pre-cutoff."
              : `Check-in blocked: Booking status is '${existing.status}'.`,
          code: "INVALID_STATE",
          booking: existing,
        },
        { status: 409 },
      );
    }

    // 5. Success Response
    return NextResponse.json({
      success: true,
      message: "Pass verified & single-use redemption recorded!",
      booking: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}

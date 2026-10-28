import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyQRToken } from "@/lib/crypto";
import { requireRole } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ["STAFF", "ADMIN"]);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const { scans } = await request.json();

    if (!Array.isArray(scans) || scans.length === 0) {
      return NextResponse.json(
        { success: false, error: "No scans provided for synchronization." },
        { status: 400 },
      );
    }

    const staffId = auth.user.id;
    const reconciledIds: Array<string | number> = [];
    const results = {
      total: scans.length,
      synced: 0,
      conflicts: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const scan of scans) {
      const { queueId, id: numericId, qrToken, userId, mealSlotId, timestamp } = scan;
      const scanKey = queueId || numericId || `${userId}_${mealSlotId}`;
      const scanTime = timestamp || new Date().toISOString();
      const scanTimeMs = new Date(scanTime).getTime();

      let validatedUserId = userId;
      let validatedMealSlotId = mealSlotId;

      // 1. If QR token provided, verify cryptographic authenticity against scan timestamp
      if (qrToken) {
        const verification = await verifyQRToken(qrToken, scanTimeMs);
        if (!verification.valid || !verification.payload) {
          results.failed++;
          results.details.push({
            queueId: scanKey,
            userId,
            mealSlotId,
            status: "REJECTED",
            reason: verification.reason || "Cryptographic pass signature mismatch.",
          });
          continue;
        }
        validatedUserId = verification.payload.userId;
        validatedMealSlotId = verification.payload.mealSlotId;
      }

      if (!validatedUserId || !validatedMealSlotId) {
        results.failed++;
        results.details.push({
          queueId: scanKey,
          status: "REJECTED",
          reason: "Missing student ID or meal slot ID.",
        });
        continue;
      }

      // 2. Atomic Compare-And-Swap check-in
      const { data: updated, error: updateError } = await supabase
        .from("meal_bookings")
        .update({
          status: "CONSUMED",
          scanned_at: scanTime,
          scanned_by: staffId,
        })
        .eq("user_id", validatedUserId)
        .eq("meal_slot_id", validatedMealSlotId)
        .in("status", ["LOCKED", "OPTED_IN"])
        .select("id, user_id, meal_slot_id, status, scanned_at")
        .maybeSingle();

      if (updateError) {
        results.failed++;
        results.details.push({
          queueId: scanKey,
          userId: validatedUserId,
          mealSlotId: validatedMealSlotId,
          status: "ERROR",
          reason: updateError.message,
        });
        continue;
      }

      if (updated) {
        results.synced++;
        reconciledIds.push(scanKey);
        results.details.push({
          queueId: scanKey,
          userId: validatedUserId,
          mealSlotId: validatedMealSlotId,
          status: "ACCEPTED",
          bookingId: updated.id,
        });
      } else {
        // Find existing state to report why it wasn't updated
        const { data: existing } = await supabase
          .from("meal_bookings")
          .select("id, status, scanned_at")
          .eq("user_id", validatedUserId)
          .eq("meal_slot_id", validatedMealSlotId)
          .maybeSingle();

        results.conflicts++;
        const currentStatus = existing?.status || "NOT_FOUND";

        // If it was already consumed, it has already been redeemed centrally
        if (currentStatus === "CONSUMED") {
          reconciledIds.push(scanKey); // Can be safely pruned as resolved duplicate
          results.details.push({
            queueId: scanKey,
            userId: validatedUserId,
            mealSlotId: validatedMealSlotId,
            status: "ALREADY_PROCESSED",
            reason: "Already consumed in central database (double-scan prevented).",
          });
        } else {
          // Conflict (e.g. OPTED_OUT or NOT_FOUND)
          reconciledIds.push(scanKey);
          results.details.push({
            queueId: scanKey,
            userId: validatedUserId,
            mealSlotId: validatedMealSlotId,
            status: "CONFLICT",
            currentStatus,
            reason:
              currentStatus === "OPTED_OUT"
                ? "Student opted out pre-cutoff."
                : `Booking is in '${currentStatus}' state.`,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Batch sync complete: ${results.synced} redeemed, ${results.conflicts} resolved.`,
      summary: results,
      reconciledIds,
      details: results.details,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process batch sync." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { generateQRToken } from "@/lib/crypto";
import { requireRole } from "@/lib/server-auth";
import { supabase } from "@/lib/supabase";

async function processQRTokenRequest(
  request: Request,
  requestedUserId: string | null,
  mealSlotId: string | null,
) {
  const auth = await requireRole(request, ["STUDENT", "ADMIN"]);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  if (!mealSlotId) {
    return NextResponse.json(
      { success: false, error: "mealSlotId is required." },
      { status: 400 },
    );
  }

  // Role boundary: Students can only generate tokens for themselves
  let targetUserId = auth.user.id;
  if (auth.user.role === "ADMIN" && requestedUserId) {
    targetUserId = requestedUserId;
  } else if (requestedUserId && requestedUserId !== auth.user.id) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Cannot generate pass for another student." },
      { status: 403 },
    );
  }

  // Check booking eligibility in DB
  const { data: booking, error: bookingErr } = await supabase
    .from("meal_bookings")
    .select("id, status")
    .eq("user_id", targetUserId)
    .eq("meal_slot_id", mealSlotId)
    .maybeSingle();

  if (bookingErr) {
    return NextResponse.json(
      { success: false, error: bookingErr.message },
      { status: 500 },
    );
  }

  if (!booking) {
    return NextResponse.json(
      { success: false, error: "No booking record found for this meal slot." },
      { status: 404 },
    );
  }

  if (booking.status === "CONSUMED") {
    return NextResponse.json(
      { success: false, error: "Meal pass has already been consumed.", code: "ALREADY_CONSUMED" },
      { status: 409 },
    );
  }

  if (booking.status === "OPTED_OUT") {
    return NextResponse.json(
      { success: false, error: "Cannot generate pass for an opted-out meal.", code: "OPTED_OUT" },
      { status: 403 },
    );
  }

  const qrToken = await generateQRToken(targetUserId, mealSlotId);
  return NextResponse.json({ success: true, qrToken, bookingId: booking.id });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const mealSlotId = searchParams.get("mealSlotId");
    return await processQRTokenRequest(request, userId, mealSlotId);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to generate QR token." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return await processQRTokenRequest(request, body.userId || null, body.mealSlotId || null);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to generate QR token." },
      { status: 500 },
    );
  }
}

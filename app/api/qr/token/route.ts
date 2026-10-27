import { NextResponse } from "next/server";
import { generateQRToken } from "@/lib/crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const mealSlotId = searchParams.get("mealSlotId");

    if (!userId || !mealSlotId) {
      return NextResponse.json(
        { success: false, error: "userId and mealSlotId are required." },
        { status: 400 },
      );
    }

    const qrToken = await generateQRToken(userId, mealSlotId);
    return NextResponse.json({ success: true, qrToken });
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
    const { userId, mealSlotId } = body;

    if (!userId || !mealSlotId) {
      return NextResponse.json(
        { success: false, error: "userId and mealSlotId are required." },
        { status: 400 },
      );
    }

    const qrToken = await generateQRToken(userId, mealSlotId);
    return NextResponse.json({ success: true, qrToken });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to generate QR token." },
      { status: 500 },
    );
  }
}

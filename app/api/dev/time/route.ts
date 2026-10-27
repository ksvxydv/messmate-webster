import { NextResponse } from "next/server";
import {
  getServerNow,
  getServerOffsetMs,
  setSimulatedServerTime,
  resetServerTime,
  setServerOffsetMs,
} from "@/lib/server-clock";

export async function GET() {
  const now = getServerNow();
  const offsetMs = getServerOffsetMs();
  return NextResponse.json({
    serverTime: now.toISOString(),
    offsetMs,
    isSimulated: offsetMs !== 0,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scenario, targetTime, reset, offsetMinutes } = body;

    if (reset) {
      const res = resetServerTime();
      return NextResponse.json({
        success: true,
        message: "Server clock reset to actual live system time.",
        serverTime: res.simulatedNow.toISOString(),
        isSimulated: false,
      });
    }

    if (typeof offsetMinutes === "number") {
      setServerOffsetMs(offsetMinutes * 60 * 1000);
      return NextResponse.json({
        success: true,
        message: `Fast-forwarded server clock by ${offsetMinutes} minutes.`,
        serverTime: getServerNow().toISOString(),
        isSimulated: true,
      });
    }

    let targetDate: Date;
    const today = new Date();

    if (scenario === "PRE_CUTOFF") {
      // 11:30 AM today - before Lunch Cutoff (allows testing opt-in/opt-out)
      targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30, 0);
    } else if (scenario === "LUNCH_RUSH") {
      // 01:15 PM today - Lunch dining rush (cutoff passed -> LOCKED -> QR Pass active)
      targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 15, 0);
    } else if (scenario === "DINNER_RUSH") {
      // 08:30 PM today - Dinner dining rush
      targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 20, 30, 0);
    } else if (scenario === "SURPLUS_ALERT") {
      // 03:30 PM today - Post-lunch, triggers surplus alert
      targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30, 0);
    } else if (targetTime) {
      targetDate = new Date(targetTime);
    } else {
      return NextResponse.json(
        { error: "Provide a scenario, targetTime, offsetMinutes, or reset: true" },
        { status: 400 },
      );
    }

    const { simulatedNow, offsetMs } = setSimulatedServerTime(targetDate.toISOString());

    return NextResponse.json({
      success: true,
      message: `Simulated server clock set to ${simulatedNow.toLocaleTimeString()} (${scenario || "CUSTOM"})`,
      serverTime: simulatedNow.toISOString(),
      offsetMs,
      isSimulated: true,
      scenario,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update simulated server clock" },
      { status: 500 },
    );
  }
}

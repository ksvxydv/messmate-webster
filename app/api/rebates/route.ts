import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { calculateRebates, computeBillingPeriod, DEFAULT_BASE_MONTHLY_FEE } from "@/lib/rebates";
import { getServerNow } from "@/lib/server-clock";
import { requireAuthenticatedUser } from "@/lib/server-auth";

// GET /api/rebates?userId=...&month=YYYY-MM - Compute automated monthly rebate ledger
export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");
    const monthParam = searchParams.get("month");

    let targetUserId = auth.user.id;
    if (auth.user.role === "ADMIN" && requestedUserId) {
      targetUserId = requestedUserId;
    } else if (requestedUserId && requestedUserId !== auth.user.id) {
      return NextResponse.json(
        { error: "Forbidden: Students can only view their own rebate ledger." },
        { status: 403 }
      );
    }

    // Dynamic billing period calculation in Asia/Kolkata timezone
    const serverNow = getServerNow();
    const { billingMonth, startDate, endDate } = computeBillingPeriod(serverNow, monthParam);

    // Fetch bookings for this student
    const { data: bookings, error } = await supabase
      .from("meal_bookings")
      .select("id, status, updated_at, meal_slots!inner(meal_type, meal_date, unit_cost)")
      .eq("user_id", targetUserId)
      .gte("meal_slots.meal_date", startDate)
      .lte("meal_slots.meal_date", endDate);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter verified OPTED_OUT and CONSUMED meals within the billing period
    const optedOutMeals = (bookings || []).filter((b: any) => b.status === "OPTED_OUT");
    const consumedMeals = (bookings || []).filter((b: any) => b.status === "CONSUMED");

    const rebateCalc = calculateRebates(
      DEFAULT_BASE_MONTHLY_FEE,
      optedOutMeals.map((b: any) => ({ unitCost: b.meal_slots?.unit_cost }))
    );

    return NextResponse.json({
      billingMonth,
      billingPeriod: { start: startDate, end: endDate },
      baseMonthlyFee: DEFAULT_BASE_MONTHLY_FEE,
      optedOutCount: rebateCalc.optedOutCount,
      consumedCount: consumedMeals.length,
      totalRebateCredit: rebateCalc.totalRebateCredit,
      netPayableBill: rebateCalc.netPayable,
      rebateLedger: optedOutMeals.map((b: any) => ({
        bookingId: b.id,
        mealType: b.meal_slots?.meal_type,
        mealDate: b.meal_slots?.meal_date,
        creditAmount: Number(b.meal_slots?.unit_cost || 50),
        recordedAt: b.updated_at,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to compute rebates" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { calculateRebates, DEFAULT_BASE_MONTHLY_FEE } from "@/lib/rebates";

// GET /api/rebates?userId=... - Compute automated monthly rebate ledger
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Fetch all bookings for this student along with meal slot costs
  const { data: bookings, error } = await supabase
    .from("meal_bookings")
    .select(
      "id, status, updated_at, meal_slots(meal_type, meal_date, unit_cost)",
    )
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter verified OPTED_OUT meals
  const optedOutMeals = (bookings || []).filter(
    (b) => b.status === "OPTED_OUT",
  );
  const consumedMeals = (bookings || []).filter((b) => b.status === "CONSUMED");

  const rebateCalc = calculateRebates(
    DEFAULT_BASE_MONTHLY_FEE,
    optedOutMeals.map((b: any) => ({ unitCost: b.meal_slots?.unit_cost }))
  );

  return NextResponse.json({
    billingMonth: "October 2026",
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
}

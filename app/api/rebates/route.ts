import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

  const baseMonthlyFee = 4500; // Standard hostel monthly mess advance (INR)

  // Filter verified OPTED_OUT meals
  const optedOutMeals = (bookings || []).filter(
    (b) => b.status === "OPTED_OUT",
  );
  const consumedMeals = (bookings || []).filter((b) => b.status === "CONSUMED");

  const totalRebateCredit = optedOutMeals.reduce((sum, b: any) => {
    const cost = Number(b.meal_slots?.unit_cost || 50);
    return sum + cost;
  }, 0);

  const netPayableBill = Math.max(0, baseMonthlyFee - totalRebateCredit);

  return NextResponse.json({
    billingMonth: "October 2026",
    baseMonthlyFee,
    optedOutCount: optedOutMeals.length,
    consumedCount: consumedMeals.length,
    totalRebateCredit,
    netPayableBill,
    rebateLedger: optedOutMeals.map((b: any) => ({
      bookingId: b.id,
      mealType: b.meal_slots?.meal_type,
      mealDate: b.meal_slots?.meal_date,
      creditAmount: Number(b.meal_slots?.unit_cost || 50),
      recordedAt: b.updated_at,
    })),
  });
}

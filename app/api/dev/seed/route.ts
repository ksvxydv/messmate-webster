import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerNow } from "@/lib/server-clock";
import { ensureTodayMealSlots, getTodayDateString } from "@/lib/seed-service";
import { requireRole } from "@/lib/server-auth";

// POST /api/dev/seed  — idempotent: safe to call multiple times
// Creates today's 3 meal slots + OPTED_IN bookings for every STUDENT
export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      const auth = await requireRole(request, ["ADMIN"]);
      if ("errorResponse" in auth) {
        return NextResponse.json(
          { error: "Seeding is restricted to ADMIN in production." },
          { status: 403 }
        );
      }
    }

    const serverNow = getServerNow();
    const result = await ensureTodayMealSlots(serverNow);

    const { count } = await supabase
      .from("meal_bookings")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      success: true,
      date: result.today,
      slots: result.slots.length,
      bookings: count || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/dev/seed — returns whether today already has slots seeded
export async function GET() {
  const serverNow = getServerNow();
  const today = getTodayDateString(serverNow);

  const { data, error } = await supabase
    .from("meal_slots")
    .select("id, meal_type, cutoff_time")
    .eq("meal_date", today);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ date: today, seeded: (data?.length ?? 0) > 0, slots: data });
}

import { supabase } from "@/lib/supabase";
import { buildDietarySlotMenuString } from "@/lib/menus";

export const DAILY_MENUS: Record<number, { breakfast: string; lunch: string; dinner: string }> = {
  0: { breakfast: "Poha, Jalebi & Masala Chai",         lunch: "Chole Chawal, Raita & Roti",             dinner: "Paneer Butter Masala, Dal Tadka & Rice" },
  1: { breakfast: "Aloo Paratha, Curd & Sprouts",        lunch: "Rajma Chawal, Jeera Aloo & Roti",        dinner: "Malai Kofta, Jeera Rice & Shahi Tukda" },
  2: { breakfast: "Idli Sambar & Coconut Chutney",       lunch: "Mix Veg, Dal Fry, Rice & Phulka",        dinner: "Mushroom Masala, Pulao & Gulab Jamun" },
  3: { breakfast: "Upma, Vada & Filter Coffee",          lunch: "Kadhi Pakora, Steamed Rice & Salad",     dinner: "Shahi Paneer, Lachha Paratha & Kheer" },
  4: { breakfast: "Puri Bhaji & Lassi",                  lunch: "Dal Makhani, Jeera Rice & Mixed Raita",  dinner: "Palak Paneer, Tandoori Roti & Jalebi" },
  5: { breakfast: "Masala Dosa & Sambhar",               lunch: "Chana Masala, Pulao & Boondi Raita",     dinner: "Aloo Matar, Dal Tadka, Rice & Gajar Halwa" },
  6: { breakfast: "Bread Toast, Butter, Jam & Omelette", lunch: "Veg Biryani, Raita & Papad",             dinner: "Paneer Tikka, Naan & Phirni" },
};

export const SLOT_CONFIGS = [
  { meal_type: "BREAKFAST", hour: 8,  minute: 30, unit_cost: 40 },
  { meal_type: "LUNCH",     hour: 12, minute: 0,  unit_cost: 80 },
  { meal_type: "DINNER",    hour: 19, minute: 0,  unit_cost: 60 },
] as const;

export function getTodayDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Ensures meal slots and default OPTED_IN bookings exist for the given server date.
 * Idempotent: safe to call repeatedly on every request or 24-hour rollover.
 */
export async function ensureTodayMealSlots(serverNow: Date) {
  const today = getTodayDateString(serverNow);
  const dow = serverNow.getDay();
  const menu = DAILY_MENUS[dow] || DAILY_MENUS[1];

  const menuItems: Record<string, string> = {
    BREAKFAST: menu.breakfast,
    LUNCH: menu.lunch,
    DINNER: menu.dinner,
  };

  // 1. Check if today's slots already exist
  const { data: existingSlots } = await supabase
    .from("meal_slots")
    .select("id, meal_type, cutoff_time, menu_items, unit_cost")
    .eq("meal_date", today)
    .order("cutoff_time", { ascending: true });

  let activeSlots = existingSlots || [];

  // 2. If slots don't exist for today, upsert them
  if (activeSlots.length === 0) {
    const slotsToInsert = SLOT_CONFIGS.map(({ meal_type, hour, minute, unit_cost }) => {
      const cutoff = new Date(
        serverNow.getFullYear(),
        serverNow.getMonth(),
        serverNow.getDate(),
        hour,
        minute,
        0
      );
      return {
        meal_date: today,
        meal_type,
        menu_items: buildDietarySlotMenuString(dow, meal_type as any),
        cutoff_time: cutoff.toISOString(),
        unit_cost,
      };
    });

    const { data: upsertedSlots, error: slotErr } = await supabase
      .from("meal_slots")
      .upsert(slotsToInsert, { onConflict: "meal_date,meal_type" })
      .select();

    if (slotErr) {
      console.error("[seed-service] Slot upsert error:", slotErr);
    } else if (upsertedSlots) {
      activeSlots = upsertedSlots;
    }
  }

  // 3. Ensure all students have bookings for today's slots
  if (activeSlots.length > 0) {
    const { data: students } = await supabase
      .from("users")
      .select("id")
      .eq("role", "STUDENT");

    if (students && students.length > 0) {
      const bookingsToInsert = activeSlots.flatMap((slot) =>
        students.map((student) => ({
          user_id: student.id,
          meal_slot_id: slot.id,
          status: "OPTED_IN",
          updated_at: serverNow.toISOString(),
        }))
      );

      const { error: bookingErr } = await supabase
        .from("meal_bookings")
        .upsert(bookingsToInsert, { onConflict: "user_id,meal_slot_id", ignoreDuplicates: true });

      if (bookingErr) {
        console.error("[seed-service] Booking upsert error:", bookingErr);
      }
    }
  }

  return { today, slots: activeSlots };
}

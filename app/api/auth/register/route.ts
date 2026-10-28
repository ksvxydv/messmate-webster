import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerNow } from "@/lib/server-clock";
import { ensureTodayMealSlots, getTodayDateString } from "@/lib/seed-service";
import { createSessionToken } from "@/lib/server-auth";
import { MNNIT_EMAIL_REGEX } from "@/config/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, regNo, email, dietaryPref } = body;

    // 1. Validate required fields
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid full name." },
        { status: 400 }
      );
    }

    if (!regNo || typeof regNo !== "string" || regNo.trim().length < 4) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid student registration number." },
        { status: 400 }
      );
    }

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !MNNIT_EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: "Registration restricted: Only official MNNIT email addresses (@mnnit.ac.in) are permitted.",
        },
        { status: 400 }
      );
    }

    const validPref = ["VEG", "NON_VEG", "JAIN"].includes(dietaryPref) ? dietaryPref : "VEG";

    // 2. Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email, reg_no")
      .or(`email.ilike.${cleanEmail},reg_no.eq.${regNo.trim()}`)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this MNNIT email or registration number already exists. Please sign in instead.",
        },
        { status: 409 }
      );
    }

    // 3. Insert student record into users table
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        name: name.trim(),
        reg_no: regNo.trim().toUpperCase(),
        email: cleanEmail,
        role: "STUDENT",
        dietary_pref: validPref,
      })
      .select()
      .single();

    if (insertError || !newUser) {
      return NextResponse.json(
        { success: false, error: insertError?.message || "Failed to create user account." },
        { status: 500 }
      );
    }

    // 4. Seed today's bookings for the newly enrolled student
    const serverNow = getServerNow();
    const today = getTodayDateString(serverNow);

    // Make sure today's slots exist
    await ensureTodayMealSlots(serverNow);

    const { data: todaySlots } = await supabase
      .from("meal_slots")
      .select("id")
      .eq("meal_date", today);

    if (todaySlots && todaySlots.length > 0) {
      const studentBookings = todaySlots.map((slot) => ({
        user_id: newUser.id,
        meal_slot_id: slot.id,
        status: "OPTED_IN",
        updated_at: serverNow.toISOString(),
      }));

      await supabase
        .from("meal_bookings")
        .upsert(studentBookings, { onConflict: "user_id,meal_slot_id", ignoreDuplicates: true });
    }

    const token = await createSessionToken({
      id: newUser.id,
      role: newUser.role,
      email: newUser.email,
      name: newUser.name,
    });

    const response = NextResponse.json({
      success: true,
      message: "Registration successful. Welcome to MessMate!",
      user: newUser,
      token,
    });

    response.cookies.set({
      name: "messmate_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}

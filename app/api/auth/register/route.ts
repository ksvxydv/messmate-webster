import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerNow } from "@/lib/server-clock";
import { ensureTodayMealSlots, getTodayDateString } from "@/lib/seed-service";
import { createSessionToken, hashPassword, sanitizeUserProfile } from "@/lib/server-auth";
import { MNNIT_EMAIL_REGEX } from "@/config/constants";
import { localStore } from "@/lib/local-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, regNo, email, dietaryPref, password } = body;

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

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const validPref = ["VEG", "NON_VEG", "JAIN"].includes(dietaryPref) ? dietaryPref : "VEG";

    // 2. Check if user already exists in local store or Supabase
    const existingLocal = localStore.findUserByEmailOrRegNo(cleanEmail, regNo, false);
    if (existingLocal) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this MNNIT email or registration number already exists. Please sign in instead.",
        },
        { status: 409 }
      );
    }

    // 3. Cryptographically hash password using PBKDF2 with HMAC-SHA256
    const { hash: passwordHash, salt: passwordSalt } = await hashPassword(password);

    let newUser: any = null;

    // 4. Attempt insertion into Supabase if reachable
    try {
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

      const { data: createdDbUser, error: insertError } = await supabase
        .from("users")
        .insert({
          name: name.trim(),
          reg_no: regNo.trim().toUpperCase(),
          email: cleanEmail,
          role: "STUDENT",
          dietary_pref: validPref,
          password_hash: passwordHash,
          password_salt: passwordSalt,
        })
        .select()
        .single();

      if (!insertError && createdDbUser) {
        newUser = createdDbUser;
      }
    } catch (e) {
      // Supabase is offline or unreachable - fallback gracefully to local store
      console.warn("[register] Supabase unreachable, persisting to local store:", e);
    }

    // 5. Fallback: If Supabase wasn't available, persist to local store
    if (!newUser) {
      newUser = localStore.registerUser({
        name: name.trim(),
        regNo: regNo.trim().toUpperCase(),
        email: cleanEmail,
        dietaryPref: validPref as any,
        role: "STUDENT",
        passwordHash,
        passwordSalt,
      });
    } else {
      // Also sync to local store for fast offline lookups
      localStore.registerUser({
        name: newUser.name,
        regNo: newUser.reg_no,
        email: newUser.email,
        dietaryPref: newUser.dietary_pref,
        role: newUser.role,
        passwordHash,
        passwordSalt,
      });
    }

    // 6. Seed today's bookings for the newly enrolled student
    const serverNow = getServerNow();
    const today = getTodayDateString(serverNow);

    try {
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
    } catch {}

    const token = await createSessionToken({
      id: newUser.id,
      role: newUser.role,
      email: newUser.email,
      name: newUser.name,
    });

    const sanitizedUser = sanitizeUserProfile(newUser);

    const response = NextResponse.json({
      success: true,
      message: "Registration successful. Welcome to MessMate!",
      user: sanitizedUser,
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

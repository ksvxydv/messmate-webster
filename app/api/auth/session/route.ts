import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  createSessionToken,
  getAuthenticatedUser,
} from "@/lib/server-auth";
import { UserProfile } from "@/types";
import { localStore } from "@/lib/local-store";

// GET /api/auth/session - Verify existing session and return current user, or return all users
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("all") === "true") {
    // Return all users from local store and Supabase
    try {
      const { data: dbUsers } = await supabase.from("users").select("*");
      if (dbUsers && dbUsers.length > 0) {
        return NextResponse.json({ success: true, users: dbUsers });
      }
    } catch {}
    return NextResponse.json({ success: true, users: localStore.getUsers() });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "No active or valid session." },
      { status: 401 }
    );
  }
  return NextResponse.json({ success: true, user });
}

// POST /api/auth/session - Issue a signed server session token for an authenticated user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email } = body;

    let user: UserProfile | null = null;

    if (userId) {
      try {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (data) user = data as UserProfile;
      } catch {}

      if (!user) {
        user = (localStore.findUserById(userId) as UserProfile) || null;
      }
    } else if (email) {
      try {
        const { data } = await supabase
          .from("users")
          .select("*")
          .ilike("email", email.trim().toLowerCase())
          .maybeSingle();

        if (data) user = data as UserProfile;
      } catch {}

      if (!user) {
        user = (localStore.findUserByEmailOrRegNo(email) as UserProfile) || null;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );
    }

    const token = await createSessionToken({
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      token,
      user,
    });

    // Set HTTP cookie for seamless server-side verification
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
      { success: false, error: err.message || "Failed to create session." },
      { status: 500 }
    );
  }
}

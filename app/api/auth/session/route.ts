import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  createSessionToken,
  getAuthenticatedUser,
} from "@/lib/server-auth";
import { UserProfile } from "@/types";

// GET /api/auth/session - Verify existing session and return current user
export async function GET(request: Request) {
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
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (data) user = data as UserProfile;
    } else if (email) {
      const { data } = await supabase
        .from("users")
        .select("*")
        .ilike("email", email.trim().toLowerCase())
        .maybeSingle();

      if (data) user = data as UserProfile;
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

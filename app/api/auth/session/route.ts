import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  createSessionToken,
  getAuthenticatedUser,
  requireRole,
  verifyPassword,
  sanitizeUserProfile,
} from "@/lib/server-auth";
import { UserProfile } from "@/types";
import { localStore } from "@/lib/local-store";

// GET /api/auth/session - Verify existing session and return current user, or list users for admins
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Listing all users is an administrative privilege
  if (searchParams.get("all") === "true") {
    const auth = await requireRole(request, ["ADMIN", "STAFF"]);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    let allUsers: UserProfile[] = [];
    try {
      const { data: dbUsers } = await supabase.from("users").select("id, reg_no, name, email, role, dietary_pref, created_at");
      if (dbUsers && dbUsers.length > 0) {
        allUsers = dbUsers as UserProfile[];
      }
    } catch {}

    if (allUsers.length === 0) {
      allUsers = localStore.getUsers(true);
    }

    return NextResponse.json({
      success: true,
      users: allUsers.map((u) => sanitizeUserProfile(u)),
    });
  }

  // Self identity inspection
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "No active or valid session." },
      { status: 401 }
    );
  }
  return NextResponse.json({ success: true, user: sanitizeUserProfile(user) });
}

// POST /api/auth/session - Authenticate credentials and issue signed server session token
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, userId, demoRole } = body;

    // 1. Handle development demo impersonation ONLY when explicitly enabled in non-production
    if (demoRole) {
      const demoEnabled =
        process.env.NEXT_PUBLIC_ENABLE_DEMO_CONTROLS === "true" &&
        process.env.NODE_ENV !== "production";

      if (!demoEnabled) {
        return NextResponse.json(
          { success: false, error: "Demonstration bypass is disabled in production." },
          { status: 403 }
        );
      }

      const allDemoUsers = localStore.getUsers(false);
      const targetUser = allDemoUsers.find((u) => u.role === demoRole) || allDemoUsers[0];
      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: `No user found for role '${demoRole}'.` },
          { status: 404 }
        );
      }

      const token = await createSessionToken({
        id: targetUser.id,
        role: targetUser.role,
        email: targetUser.email,
        name: targetUser.name,
      });

      const response = NextResponse.json({
        success: true,
        token,
        user: sanitizeUserProfile(targetUser),
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
    }

    // 2. Token refresh / verification for already authenticated user
    if (!password) {
      const activeUser = await getAuthenticatedUser(request);
      if (activeUser && (activeUser.id === userId || activeUser.email.toLowerCase() === (email || "").toLowerCase())) {
        const token = await createSessionToken({
          id: activeUser.id,
          role: activeUser.role,
          email: activeUser.email,
          name: activeUser.name,
        });

        const response = NextResponse.json({
          success: true,
          token,
          user: sanitizeUserProfile(activeUser),
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
      }

      return NextResponse.json(
        { success: false, error: "Please enter your password to sign in." },
        { status: 400 }
      );
    }

    // 3. Credential-based authentication (Email + Password)
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: "Please enter your college email address." },
        { status: 400 }
      );
    }

    let userWithCredentials: UserProfile | null = null;

    // Check Supabase if reachable
    try {
      const { data } = await supabase
        .from("users")
        .select("*")
        .ilike("email", cleanEmail)
        .maybeSingle();

      if (data) {
        userWithCredentials = data as UserProfile;
      }
    } catch {}

    // Fallback to local store
    if (!userWithCredentials) {
      userWithCredentials = localStore.findUserByEmailOrRegNo(cleanEmail, undefined, false) || null;
    }

    if (!userWithCredentials) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password. Please verify your credentials." },
        { status: 401 }
      );
    }

    // Verify password hash
    const hash = userWithCredentials.password_hash;
    const salt = userWithCredentials.password_salt;

    if (!hash || !salt) {
      return NextResponse.json(
        { success: false, error: "Account credentials uninitialized. Please contact hostel administration." },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, hash, salt);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password. Please verify your credentials." },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      id: userWithCredentials.id,
      role: userWithCredentials.role,
      email: userWithCredentials.email,
      name: userWithCredentials.name,
    });

    const safeUser = sanitizeUserProfile(userWithCredentials);

    const response = NextResponse.json({
      success: true,
      token,
      user: safeUser,
    });

    // Set secure HTTP cookie for server-side verification
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
      { success: false, error: err.message || "Failed to authenticate session." },
      { status: 500 }
    );
  }
}

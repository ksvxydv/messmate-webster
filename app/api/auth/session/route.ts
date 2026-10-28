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
import { localStore, FIXED_ACCOUNT_MAP } from "@/lib/local-store";

// In-memory sliding-window rate limiter for brute-force mitigation
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const FIXED_CREDENTIALS: Record<
  string,
  {
    id: string;
    reg_no: string;
    name: string;
    email: string;
    role: "ADMIN" | "STAFF";
    dietary_pref: "VEG";
    password_hash: string;
    password_salt: string;
  }
> = {
  warden: {
    id: "1a794de0-0b8e-4d8a-b8a3-0bc1c4b05809",
    reg_no: "WARDEN01",
    name: "Prof. R. K. Singh (Chief Warden)",
    email: "warden@mnnit.ac.in",
    role: "ADMIN",
    dietary_pref: "VEG",
    password_hash: "d9fd2f86542b8dee7bec9ea413c9a81d8afa0294b67d65053a30e92fc2692f82",
    password_salt: "d39bbdd07231194687df664fcb25bb67",
  },
  admin: {
    id: "1a794de0-0b8e-4d8a-b8a3-0bc1c4b05809",
    reg_no: "WARDEN01",
    name: "Prof. R. K. Singh (Chief Warden)",
    email: "warden@mnnit.ac.in",
    role: "ADMIN",
    dietary_pref: "VEG",
    password_hash: "d9fd2f86542b8dee7bec9ea413c9a81d8afa0294b67d65053a30e92fc2692f82",
    password_salt: "d39bbdd07231194687df664fcb25bb67",
  },
  "warden@mnnit.ac.in": {
    id: "1a794de0-0b8e-4d8a-b8a3-0bc1c4b05809",
    reg_no: "WARDEN01",
    name: "Prof. R. K. Singh (Chief Warden)",
    email: "warden@mnnit.ac.in",
    role: "ADMIN",
    dietary_pref: "VEG",
    password_hash: "d9fd2f86542b8dee7bec9ea413c9a81d8afa0294b67d65053a30e92fc2692f82",
    password_salt: "d39bbdd07231194687df664fcb25bb67",
  },
  staff1: {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227c",
    reg_no: "STAFF01",
    name: "Staff 01 (Cashier Counter 1)",
    email: "staff01@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "23e29fe7459514ae83d0ed6c8fadb1084c2fca0a4c680bd3d0fdc2224b20bc3a",
    password_salt: "fa68e5315280edd08f22227bd8064c07",
  },
  "staff01@mnnit.ac.in": {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227c",
    reg_no: "STAFF01",
    name: "Staff 01 (Cashier Counter 1)",
    email: "staff01@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "23e29fe7459514ae83d0ed6c8fadb1084c2fca0a4c680bd3d0fdc2224b20bc3a",
    password_salt: "fa68e5315280edd08f22227bd8064c07",
  },
  staff: {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227c",
    reg_no: "STAFF01",
    name: "Staff 01 (Cashier Counter 1)",
    email: "staff01@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "23e29fe7459514ae83d0ed6c8fadb1084c2fca0a4c680bd3d0fdc2224b20bc3a",
    password_salt: "fa68e5315280edd08f22227bd8064c07",
  },
  staff2: {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227d",
    reg_no: "STAFF02",
    name: "Staff 02 (Cashier Counter 2)",
    email: "staff02@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "5090085b658d53e78d8809dc3259b5b2fb92f2cb3eed2737b41d5c86f45245fd",
    password_salt: "5916d7ed24c049e8c7c2628a5284ef7c",
  },
  "staff02@mnnit.ac.in": {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227d",
    reg_no: "STAFF02",
    name: "Staff 02 (Cashier Counter 2)",
    email: "staff02@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "5090085b658d53e78d8809dc3259b5b2fb92f2cb3eed2737b41d5c86f45245fd",
    password_salt: "5916d7ed24c049e8c7c2628a5284ef7c",
  },
  staff3: {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227e",
    reg_no: "STAFF03",
    name: "Staff 03 (Cashier Counter 3)",
    email: "staff03@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "6eb17d5b51e028d9870623d29f6677995f0331c0d4c21cbcf75af9b777b5ce33",
    password_salt: "0357d0e3bf4f96c2ed26faa0be4654a5",
  },
  "staff03@mnnit.ac.in": {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227e",
    reg_no: "STAFF03",
    name: "Staff 03 (Cashier Counter 3)",
    email: "staff03@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "6eb17d5b51e028d9870623d29f6677995f0331c0d4c21cbcf75af9b777b5ce33",
    password_salt: "0357d0e3bf4f96c2ed26faa0be4654a5",
  },
  staff4: {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227f",
    reg_no: "STAFF04",
    name: "Staff 04 (Dinner Gatekeeper)",
    email: "staff04@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "dbcba9773d54823c9d34d8add51daa7221eb58e5ac4d54f9ae885ff28ccda99b",
    password_salt: "a46676b13d24001e81a4ee419631180e",
  },
  "staff04@mnnit.ac.in": {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227f",
    reg_no: "STAFF04",
    name: "Staff 04 (Dinner Gatekeeper)",
    email: "staff04@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "dbcba9773d54823c9d34d8add51daa7221eb58e5ac4d54f9ae885ff28ccda99b",
    password_salt: "a46676b13d24001e81a4ee419631180e",
  },
  staff5: {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb2280",
    reg_no: "STAFF05",
    name: "Staff 05 (Meal Check Scanner)",
    email: "staff05@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "5874ed5897b8aa687dd5f62b6d9dc788d3b82399d274b47f00f86d47d94e232a",
    password_salt: "753adb0c50f7e5fab86bfd75767dc39c",
  },
  "staff05@mnnit.ac.in": {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb2280",
    reg_no: "STAFF05",
    name: "Staff 05 (Meal Check Scanner)",
    email: "staff05@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "5874ed5897b8aa687dd5f62b6d9dc788d3b82399d274b47f00f86d47d94e232a",
    password_salt: "753adb0c50f7e5fab86bfd75767dc39c",
  },
};

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(identifier);
  if (!record || now > record.resetAt) {
    return false;
  }
  return record.count >= 5;
}

function recordFailedAttempt(identifier: string) {
  const now = Date.now();
  const record = loginAttempts.get(identifier);
  if (!record || now > record.resetAt) {
    loginAttempts.set(identifier, { count: 1, resetAt: now + 60_000 });
  } else {
    record.count += 1;
  }
}

function resetAttempts(identifier: string) {
  loginAttempts.delete(identifier);
}

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
    const { email, loginId, password, userId, demoRole } = body;

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

    // 3. Credential-based authentication (Login ID / College Email + Password)
    const rawIdentifier = (loginId || email || "").trim().toLowerCase();
    if (!rawIdentifier) {
      return NextResponse.json(
        { success: false, error: "Please enter your Login ID or college email address." },
        { status: 400 }
      );
    }

    // Rate limiting check
    if (isRateLimited(rawIdentifier)) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many login attempts. Please wait 60 seconds before trying again.",
        },
        { status: 429 }
      );
    }

    // Server-side mapping for easy fixed IDs (warden, staff1..staff5)
    const mapped = FIXED_ACCOUNT_MAP[rawIdentifier];
    const targetEmail = mapped ? mapped.email.toLowerCase() : rawIdentifier;
    const targetRegNo = mapped ? mapped.regNo.toUpperCase() : rawIdentifier.toUpperCase();

    let userWithCredentials: UserProfile | null = null;
    let foundInSupabaseWithoutCreds = false;

    // 1. For fixed system accounts (warden, staff1..staff5), resolve directly from authoritative FIXED_CREDENTIALS
    if (FIXED_CREDENTIALS[rawIdentifier]) {
      userWithCredentials = { ...FIXED_CREDENTIALS[rawIdentifier] } as unknown as UserProfile;
    }

    // 2. Otherwise check Supabase if reachable
    if (!userWithCredentials) {
      try {
        const { data } = await supabase
          .from("users")
          .select("*")
          .or(`email.ilike.${targetEmail},reg_no.ilike.${targetRegNo}`)
          .maybeSingle();

        if (data) {
          if (data.password_hash && data.password_salt) {
            userWithCredentials = data as UserProfile;
          } else {
            foundInSupabaseWithoutCreds = true;
          }
        }
      } catch {}
    }

    // 3. Fallback to authoritative local store if not found in Supabase OR if Supabase has uninitialized credentials
    if (!userWithCredentials) {
      userWithCredentials =
        localStore.findUserByEmailOrRegNo(rawIdentifier, undefined, false) || null;
    }

    if (!userWithCredentials) {
      recordFailedAttempt(rawIdentifier);
      return NextResponse.json(
        { success: false, error: "Invalid Login ID or password. Please verify your credentials." },
        { status: 401 }
      );
    }

    // Verify password hash
    const hash = userWithCredentials.password_hash;
    const salt = userWithCredentials.password_salt;

    if (!hash || !salt) {
      recordFailedAttempt(rawIdentifier);
      return NextResponse.json(
        { success: false, error: "Account credentials uninitialized. Please contact hostel administration." },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, hash, salt);
    if (!isValidPassword) {
      recordFailedAttempt(rawIdentifier);
      return NextResponse.json(
        { success: false, error: "Invalid Login ID or password. Please verify your credentials." },
        { status: 401 }
      );
    }

    // Self-healing credential sync to Supabase if Supabase lacked credentials
    if (foundInSupabaseWithoutCreds && hash && salt) {
      try {
        await supabase
          .from("users")
          .update({ password_hash: hash, password_salt: salt })
          .eq("id", userWithCredentials.id);
      } catch {}
    }

    // Reset failed attempts on success
    resetAttempts(rawIdentifier);

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

// DELETE /api/auth/session - Invalidate server session & clear cookie
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully.",
  });

  response.cookies.set({
    name: "messmate_token",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}

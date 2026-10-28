import "server-only";
import { supabase } from "./supabase.ts";
import type { UserProfile, UserRole, SessionPayload } from "../types/index.ts";

export type { SessionPayload };

function getHmacSecret(): string {
  const secret = process.env.HMAC_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: HMAC_SECRET environment variable is missing. Set HMAC_SECRET in your production environment settings."
      );
    }
    return "dev_secret_only_for_local_development_0123456789abcdef";
  }
  return secret;
}

/**
 * Hashes a user password using PBKDF2 with HMAC-SHA256 and a cryptographically random salt.
 * 100,000 iterations for secure brute-force defense.
 */
export async function hashPassword(
  password: string,
  providedSaltHex?: string
): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder();
  const salt = providedSaltHex
    ? Buffer.from(providedSaltHex, "hex")
    : crypto.getRandomValues(new Uint8Array(16));

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    passwordKey,
    256
  );

  const hash = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { hash, salt: saltHex };
}

/**
 * Validates a plaintext password against stored PBKDF2 hash and salt using constant-time comparison.
 */
export async function verifyPassword(
  password: string,
  expectedHashHex: string,
  saltHex: string
): Promise<boolean> {
  try {
    if (!password || !expectedHashHex || !saltHex) return false;
    const { hash } = await hashPassword(password, saltHex);
    return timingSafeEqual(hash.toLowerCase(), expectedHashHex.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Strips sensitive security credentials before returning user profiles.
 */
export function sanitizeUserProfile(user: UserProfile): Omit<UserProfile, "password_hash" | "password_salt"> {
  const { password_hash, password_salt, ...safeUser } = user;
  return safeUser;
}

async function signString(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data)
  );

  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function toBase64Url(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Creates a cryptographically signed session token for a verified user.
 * Default expiration is 7 days.
 */
export async function createSessionToken(
  user: Pick<UserProfile, "id" | "role" | "email"> & { name?: string },
  expiresInSeconds: number = 7 * 24 * 60 * 60
): Promise<string> {
  const secret = getHmacSecret();
  const payload: SessionPayload = {
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const payloadPart = toBase64Url(JSON.stringify(payload));
  const signature = await signString(secret, payloadPart);
  return `${payloadPart}.${signature}`;
}

/**
 * Verifies a session token string.
 * Returns payload if signature and expiry are valid, or null otherwise.
 */
export async function verifySessionToken(tokenString: string): Promise<SessionPayload | null> {
  try {
    const parts = tokenString.split(".");
    if (parts.length !== 2) return null;

    const [payloadPart, signature] = parts;
    if (!payloadPart || !signature || signature.length !== 64) return null;

    const secret = getHmacSecret();
    const expectedSig = await signString(secret, payloadPart);

    if (!timingSafeEqual(expectedSig.toLowerCase(), signature.toLowerCase())) {
      return null;
    }

    const jsonStr = fromBase64Url(payloadPart);
    const payload = JSON.parse(jsonStr) as SessionPayload;

    if (!payload.userId || !payload.role || !payload.exp) {
      return null;
    }

    const currentEpoch = Math.floor(Date.now() / 1000);
    if (payload.exp < currentEpoch) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the authenticated user from the incoming request.
 * Checks `Authorization: Bearer <token>`, `x-messmate-session`, or cookies.
 */
export async function getAuthenticatedUser(request: Request): Promise<UserProfile | null> {
  try {
    // 1. Extract token from header
    const authHeader = request.headers.get("authorization") || request.headers.get("x-messmate-session");
    let token = "";

    if (authHeader) {
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      } else {
        token = authHeader.trim();
      }
    }

    // Fallback: check cookie header
    if (!token) {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const match = cookieHeader.match(/messmate_token=([^;]+)/);
        if (match) {
          token = decodeURIComponent(match[1]);
        }
      }
    }

    if (!token) return null;

    // 2. Verify HMAC session token
    const verifiedPayload = await verifySessionToken(token);
    if (!verifiedPayload) {
      // Check if it is a Supabase Auth JWT
      try {
        const { data: sbUser } = await supabase.auth.getUser(token);
        if (sbUser?.user) {
          const { data: dbUser } = await supabase
            .from("users")
            .select("*")
            .eq("id", sbUser.user.id)
            .maybeSingle();

          if (dbUser) return dbUser as UserProfile;
        }
      } catch {}
      return null;
    }

    // 3. Resolve user profile from DB to enforce current role
    try {
      const { data: dbUser } = await supabase
        .from("users")
        .select("*")
        .eq("id", verifiedPayload.userId)
        .maybeSingle();

      if (dbUser) {
        return dbUser as UserProfile;
      }
    } catch (e) {
      console.warn("[server-auth] Error looking up user in DB, using verified payload:", e);
    }

    // Fallback to token payload if DB lookup is unavailable but signature is valid
    return {
      id: verifiedPayload.userId,
      role: verifiedPayload.role,
      email: verifiedPayload.email,
      name: verifiedPayload.name || "Authenticated User",
      reg_no: verifiedPayload.email.split("@")[0] || "AUTH-USER",
      dietary_pref: "VEG",
    };
  } catch {
    return null;
  }
}

/**
 * Requires an authenticated user session. Returns 401 response if missing or invalid.
 */
export async function requireAuthenticatedUser(
  request: Request
): Promise<{ user: UserProfile } | { errorResponse: Response }> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return {
      errorResponse: Response.json(
        {
          success: false,
          error: "Unauthorized: Valid session authentication required.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      ),
    };
  }
  return { user };
}

/**
 * Requires authenticated user with specific role(s). Returns 401 or 403 response if unauthorized.
 */
export async function requireRole(
  request: Request,
  allowedRoles: Array<UserRole>
): Promise<{ user: UserProfile } | { errorResponse: Response }> {
  const auth = await requireAuthenticatedUser(request);
  if ("errorResponse" in auth) {
    return auth;
  }

  if (!allowedRoles.includes(auth.user.role)) {
    return {
      errorResponse: Response.json(
        {
          success: false,
          error: `Forbidden: Action requires one of roles [${allowedRoles.join(", ")}]. Current user role is '${auth.user.role}'.`,
          code: "FORBIDDEN_ROLE",
        },
        { status: 403 }
      ),
    };
  }

  return auth;
}

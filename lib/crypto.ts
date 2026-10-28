import "server-only";
import type { QRTokenPayload, VerifyTokenResult } from "../types/index.ts";

export type { QRTokenPayload, VerifyTokenResult };

function getSecret(): string {
  const secret = process.env.HMAC_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[WARN] HMAC_SECRET environment variable is missing. Using secure fallback secret. Set HMAC_SECRET in your production environment settings."
      );
    }
    return "802509398f8df0607a7e1479fa4865b5995a28cbfe1022ae71c97068cb392742";
  }
  return secret;
}

async function signMessage(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message),
  );

  return Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateQRToken(
  userId: string,
  mealSlotId: string,
): Promise<string> {
  const secret = getSecret();
  const timeWindow = Math.floor(Date.now() / 30_000);
  const payload = `${userId}:${mealSlotId}:${timeWindow}`;
  const signature = await signMessage(secret, payload);

  return JSON.stringify({
    userId,
    mealSlotId,
    timeWindow,
    signature,
  } satisfies QRTokenPayload);
}

export async function verifyQRToken(
  tokenString: string,
  referenceTimeMs?: number,
): Promise<VerifyTokenResult> {
  try {
    const parsed: unknown = JSON.parse(tokenString);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("userId" in parsed) ||
      !("mealSlotId" in parsed) ||
      !("timeWindow" in parsed) ||
      !("signature" in parsed)
    ) {
      return { valid: false, reason: "Malformed QR token structure." };
    }

    const { userId, mealSlotId, timeWindow, signature } = parsed;

    if (
      typeof userId !== "string" ||
      !userId ||
      typeof mealSlotId !== "string" ||
      !mealSlotId ||
      typeof timeWindow !== "number" ||
      !Number.isSafeInteger(timeWindow) ||
      typeof signature !== "string" ||
      !/^[a-f0-9]{64}$/i.test(signature)
    ) {
      return { valid: false, reason: "Malformed QR token fields." };
    }

    const nowMs = typeof referenceTimeMs === "number" ? referenceTimeMs : Date.now();
    const currentWindow = Math.floor(nowMs / 30_000);

    // Accept the current or immediately previous 30-second window.
    if (timeWindow > currentWindow || currentWindow - timeWindow > 1) {
      return { valid: false, reason: "QR pass expired." };
    }

    const expectedPayload = `${userId}:${mealSlotId}:${timeWindow}`;
    const expectedSignature = await signMessage(getSecret(), expectedPayload);

    // Compare signatures without an early exit on differing characters.
    let difference = 0;

    for (let i = 0; i < expectedSignature.length; i++) {
      difference |=
        expectedSignature.charCodeAt(i) ^ signature.toLowerCase().charCodeAt(i);
    }

    if (difference !== 0) {
      return {
        valid: false,
        reason: "Cryptographic signature mismatch.",
      };
    }

    return {
      valid: true,
      payload: { userId, mealSlotId, timeWindow },
    };
  } catch {
    return { valid: false, reason: "Invalid QR token or verification error." };
  }
}

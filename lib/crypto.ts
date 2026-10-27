import "server-only";

export interface QRTokenPayload {
  userId: string;
  mealSlotId: string;
  timeWindow: number;
  signature: string;
}

export interface VerifyTokenResult {
  valid: boolean;
  reason?: string;
  payload?: {
    userId: string;
    mealSlotId: string;
    timeWindow: number;
  };
}

function getSecret(): string {
  const secret = process.env.HMAC_SECRET;

  if (!secret) {
    throw new Error("HMAC_SECRET is not configured.");
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

    const currentWindow = Math.floor(Date.now() / 30_000);

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

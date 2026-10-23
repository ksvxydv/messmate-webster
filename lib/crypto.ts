// Simple HMAC-SHA256 token generator for hackathon demo
export async function generateQRToken(
  userId: string,
  mealSlotId: string,
): Promise<string> {
  const secret =
    process.env.NEXT_PUBLIC_HMAC_SECRET || "mnnit_webster_secret_2026";
  // 30-second rotating time window bucket
  const timeWindow = Math.floor(Date.now() / 30000);
  const payload = `${userId}:${mealSlotId}:${timeWindow}`;

  // Use browser SubtleCrypto to generate HMAC-SHA256 signature
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await window.crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(payload),
  );

  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const signature = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Return compact JSON payload encoded in base64 or plain string
  return JSON.stringify({ userId, mealSlotId, timeWindow, signature });
}

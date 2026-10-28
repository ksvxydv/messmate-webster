# MessMate — QR Cryptographic Security & Offline Synchronization System

> **Document Focus:** Deep mathematical, cryptographic, transactional, and offline architecture of MessMate's dining pass verification engine.

---

## 1. QR Cryptographic Token Architecture

A standard static QR code (e.g. encoding a student registration number) is insecure because a student can easily screenshot and message it to friends. MessMate solves this by implementing an ephemeral, time-rotating cryptographic token.

### 1.1 Token Structure
The QR token rendered on the student's screen is a JSON string conforming to `QRTokenPayload`:

```json
{
  "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "mealSlotId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "timeWindow": 59714882,
  "signature": "3a8b29c01f44a86b51079d86a64f70ecbc92d192f1437190b4d45d315f6085a2"
}
```

- **`userId`:** The unique UUID of the enrolled student.
- **`mealSlotId`:** The specific meal period being redeemed (e.g. today's Lunch).
- **`timeWindow`:** A Unix epoch bucket counter computed as:
  $$\text{timeWindow} = \left\lfloor \frac{\text{Current Epoch Milliseconds}}{30,000} \right\rfloor$$
  *Each window lasts exactly 30 seconds.*
- **`signature`:** A 64-character hexadecimal HMAC-SHA256 signature calculated over the concatenated string:
  $$\text{Message} = \text{userId} : \text{mealSlotId} : \text{timeWindow}$$

---

### 1.2 Cryptographic Signing (HMAC-SHA256)
Implemented in [`lib/crypto.ts`](file:///Users/ksvxydv/messmate-webster/lib/crypto.ts) using the native Web Crypto API (`crypto.subtle`):

```typescript
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
```

### 1.3 Why Secret Management is Server-Only
- The `HMAC_SECRET` is stored as an environment variable on the server.
- The file [`lib/crypto.ts`](file:///Users/ksvxydv/messmate-webster/lib/crypto.ts) has the top-level declaration `import "server-only";`.
- If an engineer accidentally imports `lib/crypto.ts` into a client React component, the Next.js compiler halts the build with an error. This guarantees that `HMAC_SECRET` is never leaked into client JavaScript bundles.

---

## 2. Verification, Expiration & Clock Drift Handling

When the cashier terminal scans the pass, [`verifyQRToken`](file:///Users/ksvxydv/messmate-webster/lib/crypto.ts#L72) executes:

### 2.1 Expiration Check & Window Tolerance
Because network latency or clock skew can cause a student's phone and the server clock to differ by a few seconds, MessMate implements an immediate neighbor window tolerance:

```typescript
const currentWindow = Math.floor(nowMs / 30_000);

// Accept the current window OR the immediately preceding 30s window
if (timeWindow > currentWindow || currentWindow - timeWindow > 1) {
  return { valid: false, reason: "QR pass expired." };
}
```

- **Maximum pass validity:** Between 30 and 60 seconds depending on when within the bucket it was generated.
- **Future timestamps:** Any token with `timeWindow > currentWindow` is rejected to prevent pre-generated passes.

### 2.2 Constant-Time Signature Comparison (Anti-Timing Attacks)
Standard string equality (`a === b`) exits early on the first non-matching character, allowing attackers to measure execution time down to nanoseconds to guess bytes. MessMate uses bitwise constant-time verification:

```typescript
let difference = 0;
for (let i = 0; i < expectedSignature.length; i++) {
  difference |= expectedSignature.charCodeAt(i) ^ signature.toLowerCase().charCodeAt(i);
}

if (difference !== 0) {
  return { valid: false, reason: "Cryptographic signature mismatch." };
}
```

---

## 3. Server Verification & Atomic Compare-And-Swap (CAS)

A valid signature proves that the pass was issued by MessMate for that student and meal slot within the last 60 seconds. However, **cryptographic validity alone does not prove the pass has not already been redeemed.**

To enforce single-use redemption, [`app/api/qr/verify/route.ts`](file:///Users/ksvxydv/messmate-webster/app/api/qr/verify/route.ts) executes an atomic SQL Compare-And-Swap (CAS) operation:

```sql
UPDATE meal_bookings
SET 
  status = 'CONSUMED',
  scanned_at = NOW(),
  scanned_by = :staffId
WHERE 
  user_id = :targetUserId 
  AND meal_slot_id = :targetMealSlotId
  AND status IN ('LOCKED', 'OPTED_IN')
RETURNING id, status, scanned_at;
```

```
               TWO CONCURRENT SCAN REQUESTS (SAME MILLISECOND)
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
       [Terminal 1 Worker]                             [Terminal 2 Worker]
              │                                               │
   UPDATE meal_bookings...                         UPDATE meal_bookings...
   WHERE status IN ('LOCKED','OPTED_IN')           WHERE status IN ('LOCKED','OPTED_IN')
              │                                               │
     Row Lock Acquired                               Waits for Row Lock
              │                                               │
   Status becomes 'CONSUMED'                                  │
   Row Lock Released                                 Row Lock Acquired
              │                                               │
     1 Row Affected                                  0 Rows Affected (status is now CONSUMED)
              │                                               │
        HTTP 200 OK                                   HTTP 409 Conflict
   "Pass Verified: Redeemed!"                     "ALERT: Already redeemed! Blocked."
```

---

## 4. Offline Scanning & Synchronization Model

During hostel dining rushes, campus Wi-Fi drops must not halt the dinner line. MessMate implements an offline-first architecture via browser IndexedDB.

### 4.1 Client-Side Queue Storage (`lib/offline-db.ts`)
When offline, passes cannot reach the central database. Instead, [`queueOfflineScan`](file:///Users/ksvxydv/messmate-webster/lib/offline-db.ts#L62) executes:
1. **Local Anti-Double-Dipping:** Queries IndexedDB compound index `user_slot` on `[userId, mealSlotId]`. If the student was already scanned on this terminal while offline, it immediately blocks redemption with `"Local Double-Scan Blocked!"`.
2. **Queue Record Creation:**
   ```typescript
   export interface OfflineScanRecord {
     id?: number;              // Auto-increment primary key
     queueId: string;          // crypto.randomUUID()
     userId: string;
     mealSlotId: string;
     qrToken: string;          // Full signed token string
     timestamp: string;        // ISO 8601 recorded offline scan time
     synced: boolean;
     createdAt: string;
   }
   ```

### 4.2 Historical Window Verification (`app/api/qr/sync/route.ts`)
If a student was scanned offline at 1:15 PM and the terminal re-establishes internet at 1:25 PM (10 minutes later), standard live verification would reject the token as expired.

In [`lib/crypto.ts`](file:///Users/ksvxydv/messmate-webster/lib/crypto.ts#L69), `verifyQRToken` supports a `referenceTimeMs` parameter:
```typescript
export async function verifyQRToken(
  tokenString: string,
  referenceTimeMs?: number,
): Promise<VerifyTokenResult>
```
During batch sync, the server verifies that the token **was cryptographically valid at the recorded scan timestamp**:
```typescript
const scanTimeMs = new Date(scan.timestamp).getTime();
const verification = await verifyQRToken(scan.qrToken, scanTimeMs);
```

### 4.3 Item-Level Reconciliation vs. Partial Failure Safety
Traditional batch queues clear the entire queue on HTTP 200:
`await clearOfflineScans();` // DANGEROUS! If 10 items succeeded and 2 failed, the 2 failures are permanently lost.

MessMate implements **item-level reconciliation**:
1. Server returns `reconciledIds`: an array of specific `queueId` values that were successfully consumed or confirmed as resolved duplicates.
2. Client calls `removeOfflineScans(data.reconciledIds)`, deleting **only** those specific items from IndexedDB.
3. Any scan that encountered a network timeout or unexpected error remains safely in IndexedDB for the next synchronization attempt.

---

## 5. Security Guarantees & Honest Limitations

| Threat | System Protection | Technical Limitation / Residual Risk |
| :--- | :--- | :--- |
| **Pass Forgery** | HMAC-SHA256 signature requires server secret. | If `HMAC_SECRET` leaks, forged tokens become indistinguishable from authentic ones. |
| **Screenshot Sharing** | Pass window increments every 30 seconds. | If a student screenshots and sends within <30s and a friend enters immediately, redemption succeeds. |
| **Parallel Cashier Double-Scan (Online)** | Atomic SQL Compare-And-Swap locks row. | Zero vulnerability. Exactly 1 scan succeeds, 9 fail with 409. |
| **Multi-Terminal Offline Partition** | Local IndexedDB blocks double-scans on the *same* terminal. | **Fundamental Distributed Systems Limitation:** If Terminal A and Terminal B are both offline, the same student could scan on Terminal A and Terminal B. When both terminals reconnect, the first synced item updates to `CONSUMED`; the second is flagged as a `CONFLICT_PREVENTED`. The dining hall staff must inspect the audit ledger for repeated multi-terminal abuse. |

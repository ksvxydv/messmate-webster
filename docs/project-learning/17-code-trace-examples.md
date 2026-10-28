# 17 — Concrete Code Traces: 12 Step-by-Step Execution Pathways

This document traces 12 core user workflows line-by-line through the codebase, following the execution path from browser UI components through custom React hooks, HTTP route handlers, domain logic, and Supabase PostgreSQL queries.

---

## Trace 1: Student Views Today's Meal Schedule
1. **Trigger:** Student navigates to `http://localhost:3000/student`.
2. **Component Mount:** `app/student/page.tsx` mounts.
3. **Hook Invocation:** `useStudentMeals(user?.id)` in `hooks/useStudentMeals.ts` triggers a fetch request:
   `GET /api/meals?userId=student-1&date=2026-10-28`
4. **Route Handler (`app/api/meals/route.ts`):**
   - Parses `userId` and `date` query parameters.
   - Queries `meal_slots` joined with `meal_bookings` where `date = '2026-10-28'`.
   - Maps each slot through `getMealTimingDetails()` in `lib/meal-times.ts` to compute `isCutoffPassed` and `isServing`.
   - Resolves dietary items using `resolveDietaryDishes()` in `lib/menus.ts`.
5. **Response:** HTTP 200 OK with array of formatted meal slots.
6. **UI Render:** `useStudentMeals` updates `slots` state; `app/student/page.tsx` maps slots into interactive `MealCard` components.

---

## Trace 2: Student Toggles Meal Opt-Out (Before Cutoff)
1. **Trigger:** Student clicks "Opt Out" switch on tomorrow's Breakfast card.
2. **Hook Execution:** `toggleMealOpt(slotId, false)` in `hooks/useStudentMeals.ts`.
3. **Optimistic Update:** Hook immediately updates local React state to reflect `OPTED_OUT`, providing instantaneous visual feedback.
4. **HTTP Mutation:** Sends `POST /api/meals` with payload:
   ```json
   { "slotId": "slot-breakfast-id", "optedIn": false, "dietaryPreference": "VEG" }
   ```
5. **Route Handler (`app/api/meals/route.ts`):**
   - Authenticates user session via `validateAuthSession(req)`.
   - Evaluates cutoff timestamp: `currentServerTime < slot.cutoff_time`. Cutoff is valid!
   - Executes upsert query on `meal_bookings`:
     ```sql
     INSERT INTO meal_bookings (user_id, meal_slot_id, status, dietary_pref)
     VALUES ($userId, $slotId, 'OPTED_OUT', 'VEG')
     ON CONFLICT (user_id, meal_slot_id)
     DO UPDATE SET status = 'OPTED_OUT', updated_at = NOW();
     ```
6. **Response:** HTTP 200 OK with updated booking object.
7. **UI Confirmation:** Toast confirms: *"Successfully opted out of Breakfast. ₹50 credited to your rebate ledger."*

---

## Trace 3: Student Attempts to Opt Out (After Cutoff Passed)
1. **Trigger:** Malicious user bypasses client disabled switch and sends raw POST request after cutoff.
2. **HTTP Mutation:** Sends `POST /api/meals` for a locked slot.
3. **Route Handler (`app/api/meals/route.ts`):**
   - Fetches slot timing: `slot.cutoff_time = '08:30:00'`.
   - Evaluates `getServerNow() > slot.cutoff_time`.
   - Cutoff has passed!
4. **Response:** Halts immediately and returns:
   ```json
   { "success": false, "error": "Cutoff time has passed for this meal. Status is locked." }
   ```
   with **HTTP 400 Bad Request**.
5. **Database Protection:** Zero rows in PostgreSQL are updated.

---

## Trace 4: Student Requests 30-Second Rotating QR Pass
1. **Trigger:** Student clicks "View Meal Pass" modal for an active serving slot.
2. **Modal Mount:** Pass modal invokes `fetchPassToken(slotId)`.
3. **HTTP Request:** `GET /api/qr/token?slotId=slot-breakfast-id` with student Bearer token.
4. **Route Handler (`app/api/qr/token/route.ts`):**
   - Validates student authentication and confirms student booking status is `OPTED_IN` or `LOCKED`.
   - Invokes `generateQRToken(studentId, slotId)` in `lib/crypto.ts`.
5. **Cryptographic Signing (`lib/crypto.ts`):**
   - Computes current epoch seconds: `t = Math.floor(Date.now() / 1000)`.
   - Creates message: `${studentId}:${slotId}:${t}`.
   - Signs using `HMAC_SECRET` via `crypto.subtle.sign("HMAC", ...)` returning 64-char hex signature.
   - Formats complete payload: `${studentId}:${slotId}:${t}:${signature}`.
6. **Response:** HTTP 200 OK with `qrPayload` and `expiresInSeconds: 30`.
7. **UI Render:** `QRCodeSVG` renders the matrix; countdown ring animates from 30 down to 0.

---

## Trace 5: Staff Scans Valid QR Pass at Counter (Online)
1. **Trigger:** Student presents phone to counter webcam.
2. **Scanner Callback:** `html5-qrcode` decodes string in `hooks/useCameraScanner.ts`.
3. **Debounce Check:** Hook checks cooldown; fires `onScan(decodedText)`.
4. **HTTP Mutation:** Sends `POST /api/qr/verify` with body: `{ "qrToken": "..." }`.
5. **Signature Verification (`lib/crypto.ts`):**
   - Splits token into 4 parts: `userId`, `slotId`, `timestamp`, `signature`.
   - Validates timestamp freshness: $|t_{\text{now}} - t| \le 30\text{s}$. Fresh!
   - Recomputes HMAC signature and performs constant-time string comparison. Signature matches!
6. **Atomic Database Redemption (`app/api/qr/verify/route.ts`):**
   ```sql
   UPDATE meal_bookings
   SET status = 'CONSUMED', scanned_at = NOW(), scanned_by = $staffId
   WHERE user_id = $userId
     AND meal_slot_id = $slotId
     AND status IN ('LOCKED', 'OPTED_IN')
   RETURNING id, dietary_pref;
   ```
7. **Response:** 1 row updated! Returns HTTP 200 OK with student name and dietary badge.
8. **UI Update:** Staff screen flashes vibrant green; audio chime plays: *"Access Confirmed: Veg Breakfast"*.

---

## Trace 6: Staff Scans Expired QR Pass (> 30s Old)
1. **Trigger:** Student displays a screenshot taken 2 minutes ago.
2. **Verification Route (`app/api/qr/verify/route.ts`):**
   - Splits token; reads timestamp $t_{\text{token}} = 1793200000$.
   - Reads current time $t_{\text{now}} = 1793200120$ ($\Delta t = 120\text{s}$).
   - Condition `delta > 30` triggers.
3. **Response:** HTTP 400 Bad Request:
   ```json
   { "success": false, "error": "QR pass expired. Tokens rotate every 30 seconds." }
   ```
4. **UI Alert:** Staff screen flashes red; audio warning plays: *"Invalid / Expired Pass"*.

---

## Trace 7: Concurrent Double-Scan Race Condition
1. **Trigger:** Attacker presents the same valid token to Scanner Line 1 and Scanner Line 2 at the exact same millisecond.
2. **Parallel Route Execution:** Two worker threads execute `POST /api/qr/verify` simultaneously.
3. **Database Concurrency Serialization:**
   - Thread 1 acquires exclusive row write lock on the target booking row.
   - Thread 1 checks `status IN ('LOCKED', 'OPTED_IN')` $\to$ TRUE. Updates status to `CONSUMED` and commits.
   - Thread 2 acquires lock next. Checks `status IN ('LOCKED', 'OPTED_IN')` $\to$ FALSE (status is now `CONSUMED`). Zero rows updated!
4. **Results:**
   - **Thread 1:** Returns HTTP 200 OK (Redeemed).
   - **Thread 2:** Returns HTTP 409 Conflict: *"Double Scan Detected: Meal already consumed."*

---

## Trace 8: Staff Counter Scans QR Pass While Offline
1. **Trigger:** Mess Wi-Fi disconnects; staff scans student pass.
2. **Network Detection:** `fetch()` fails with `TypeError: Failed to fetch`.
3. **Catch Block in `hooks/useOfflineSync.ts`:**
   - Identifies offline network state (`!navigator.onLine`).
   - Generates unique client UUID: `queueId = "off-" + Date.now()`.
   - Packages record: `{ queueId, qrToken, timestamp: Date.now() }`.
4. **IndexedDB Write (`lib/offline-db.ts`):**
   - Opens `messmate-offline-db` store `offline-scans`.
   - Executes `db.add('offline-scans', record)`.
5. **UI Update:** Staff screen displays amber badge: *"1 Scan Buffered Locally"*. Line continues moving without interruption.

---

## Trace 9: Staff Terminal Reconnects & Auto-Syncs
1. **Trigger:** Wi-Fi connection is restored; browser emits `window.online` event.
2. **Sync Trigger:** `useOfflineSync` hook triggers `syncPendingScans()`.
3. **Queue Extraction:** Reads all records from IndexedDB: `getPendingOfflineScans()`.
4. **HTTP Batch Sync:** Sends `POST /api/qr/sync` with array of buffered records.
5. **Route Processing (`app/api/qr/sync/route.ts`):**
   - Iterates through scans; validates signatures against historical scan timestamps.
   - Executes atomic status updates in PostgreSQL.
   - Compiles list of successfully processed IDs: `reconciledIds = ["off-1", "off-2"]`.
6. **Response:** HTTP 200 OK with `reconciledIds`.
7. **Client Cleanup:** Hook invokes `removeOfflineScans(reconciledIds)` in IndexedDB; queue count resets to 0.

---

## Trace 10: Student Inspects Dynamic Monthly Rebate Ledger
1. **Trigger:** Student clicks the "Rebates & Billing" navigation tab.
2. **HTTP Fetch:** `GET /api/rebates?month=2026-10` with student auth header.
3. **Calculation Engine (`lib/rebates.ts`):**
   - `computeBillingPeriod()` defines boundaries: `2026-10-01` to `2026-10-31`.
   - Queries all `OPTED_OUT` bookings for this student within October. Found: 10 meals.
   - `calculateRebates(4500, optedOutItems)` computes:
     - `totalRebateCredit = 10 * 50 = ₹500`
     - `netPayable = max(0, 4500 - 500) = ₹4,000`
4. **Response:** HTTP 200 OK with complete financial ledger and itemized date breakdown.
5. **UI Render:** Student dashboard renders visual savings pill, net fee card, and daily audit table.

---

## Trace 11: Kitchen Manager Reviews Attendance Forecast & Waste Alerts
1. **Trigger:** Admin logs into `/admin`.
2. **Hook Execution:** `useAdminData()` in `hooks/useAdminData.ts` fetches upcoming slots and aggregate bookings.
3. **Aggregation Logic:**
   - Tallies total enrolled students ($N_{\text{total}} = 800$).
   - Counts opted-out students ($N_{\text{out}} = 180$).
   - Computes committed kitchen headcount: $N_{\text{committed}} = 620$.
   - Segregates dietary preferences: Veg (450), Non-Veg (140), Jain (30).
4. **Surplus Evaluation:** Opt-out rate exceeds 20%; `SurplusDispatchBanner` activates with campus charity routing.
5. **UI Render:** Admin dashboard displays `KitchenMetricCards`, `MealForecastList`, and Recharts visual waste distribution.

---

## Trace 12: Evaluator Manipulates Virtual Server Clock
1. **Trigger:** Evaluator opens Dev Testing Drawer and sets simulated time to `08:35 AM` (past breakfast cutoff).
2. **HTTP Mutation:** Sends `POST /api/dev/time` with `{ "offsetMinutes": 65 }`.
3. **Server Clock Mutation (`lib/server-clock.ts`):**
   - In-memory offset is updated: `virtualTimeOffsetMs = 65 * 60 * 1000`.
4. **Subsequent API Calls:** All subsequent calls to `getServerNow()` evaluate with the simulated offset.
5. **UI Verification:** Refreshing the Student page reveals tomorrow's Breakfast switch is now locked, and countdown says *"Cutoff Passed"*, proving cutoff behavior instantly without waiting for real-world morning hours.

# MessMate — Feature-by-Feature Working

> **Document Focus:** Step-by-step technical execution traces for every implemented feature across the Student, Staff, and Administrator portals.

---

## 1. Student Portal Features

### Feature 1.1: Institutional Student Registration
1. **User Action:** Student visits `/login`, clicks "New Student Registration", fills full name, registration number, `@mnnit.ac.in` email, and dietary preference.
2. **UI Component:** [`app/login/page.tsx`](file:///Users/ksvxydv/messmate-webster/app/login/page.tsx)
3. **React State:** Form states `name`, `regNo`, `email`, `dietaryPref`.
4. **HTTP Request:** `POST /api/auth/register` with JSON body.
5. **API Handler:** [`app/api/auth/register/route.ts`](file:///Users/ksvxydv/messmate-webster/app/api/auth/register/route.ts).
6. **Validation & Auth:** Enforces `MNNIT_EMAIL_REGEX` (rejects non-MNNIT emails with 400). Checks `users` table for duplicate email or registration number (returns 409 if exists).
7. **Database Operation:** Inserts into `users` (`role: 'STUDENT'`). Calls `ensureTodayMealSlots(now)` to provision today's slots, and inserts 3 default `OPTED_IN` rows into `meal_bookings`.
8. **Response:** 200 OK `{ success: true, user, token }` and sets HTTP cookie `messmate_token`.
9. **UI Update:** Client stores token in `localStorage`, updates `currentUser`, and navigates to `/student`.
10. **Failure Handling:** Invalid email or duplicate registration displays clear error alert.
11. **Security:** Cannot register as `ADMIN` or `STAFF` via public API; `role` is hardcoded to `'STUDENT'`.
12. **Tests:** Verified by Test Suite 2 in `tests/full-lifecycle.test.mjs`.

---

### Feature 1.2: Dietary Preference Switching (Veg, Non-Veg, Jain)
1. **User Action:** Student selects "Jain" from the dietary selector in `<StudentHeader>`.
2. **UI Component:** [`components/student/StudentHeader.tsx`](file:///Users/ksvxydv/messmate-webster/components/student/StudentHeader.tsx).
3. **React State/Hook:** `handleDietaryChange(newPref)` in [`hooks/useStudentMeals.ts`](file:///Users/ksvxydv/messmate-webster/hooks/useStudentMeals.ts).
4. **Optimistic UI:** Immediately updates `student.dietary_pref` state and saves to `localStorage.setItem('messmate_pref_<id>', newPref)`.
5. **Database Operation:** Asynchronously runs `supabase.from("users").update({ dietary_pref: newPref }).eq("id", student.id)`.
6. **Race-Condition Protection:** Utilizes `lastPrefRequestIdRef`. If a student rapidly clicks Veg -> Non-Veg -> Jain, responses from earlier in-flight network requests are discarded if their request ID does not match the latest.
7. **UI Update:** `<MealCard>` immediately re-renders dishes specific to the chosen preference:
   - *Veg:* Paneer Butter Masala, Dal Tadka, Rice.
   - *Non-Veg:* Chicken Korma, Jeera Rice, Phulka.
   - *Jain:* Jain Paneer Makhani, Yellow Dal (No onion/garlic/root veg).
8. **Tests:** Verified by Test Suite 6 (17 assertions) in `tests/full-lifecycle.test.mjs`.

---

### Feature 1.3: Meal Opt-In / Opt-Out & Cutoff Lock
1. **User Action:** Student clicks "Opt Out of Lunch" to skip the meal and claim rebate.
2. **UI Component:** [`components/student/MealCard.tsx`](file:///Users/ksvxydv/messmate-webster/components/student/MealCard.tsx).
3. **Hook:** `handleToggle(mealSlotId, currentStatus)` in `useStudentMeals.ts`.
4. **Optimistic UI:** Flips booking status from `OPTED_IN` to `OPTED_OUT`.
5. **HTTP Request:** `POST /api/meals` with `{ userId, mealSlotId, requestedStatus: 'OPTED_OUT' }` and Bearer token.
6. **API Handler:** [`app/api/meals/route.ts`](file:///Users/ksvxydv/messmate-webster/app/api/meals/route.ts).
7. **Cutoff Enforcement:**
   - Server checks `slot.cutoff_time` against `getServerNow()`.
   - If `serverNow >= cutoffDate`, server rejects with HTTP 403: `"Cutoff passed! Cancellations are locked for kitchen prep."` and sets status to `LOCKED`.
   - If pre-cutoff, updates `meal_bookings` status to `OPTED_OUT`.
8. **UI Update:** Re-renders status badge to "Opted Out (Rebate Credited)". If cutoff elapsed, reverts card to locked state and shows error banner.
9. **Tests:** Verified by Test Suites 3, 5, and 11 in `tests/full-lifecycle.test.mjs`.

---

### Feature 1.4: 30-Second Rotating QR Dining Pass
1. **User Action:** Student taps "Show Dining Pass" on an active or locked meal card.
2. **UI Component:** `<QRPassModal>` in [`components/ui/QRPassModal.tsx`](file:///Users/ksvxydv/messmate-webster/components/ui/QRPassModal.tsx).
3. **Hook:** `useEffect` in `useStudentMeals.ts` triggers whenever `activeQRMeal` is non-null and every 30 seconds (`Math.floor(Date.now() / 30000)`).
4. **HTTP Request:** `GET /api/qr/token?userId=<id>&mealSlotId=<id>` with Bearer auth token.
5. **API Handler:** [`app/api/qr/token/route.ts`](file:///Users/ksvxydv/messmate-webster/app/api/qr/token/route.ts).
6. **Eligibility Check:** Server checks that booking exists and status is `OPTED_IN` or `LOCKED`. If `CONSUMED` or `OPTED_OUT`, returns HTTP 409 or 403.
7. **Cryptography:** Signs `${userId}:${mealSlotId}:${timeWindow}` with `HMAC_SECRET`.
8. **UI Update:** Renders crisp SVG QR code via `qrcode.react`, showing student photo placeholder, roll number, meal type, and a live 30-second circular SVG countdown timer.
9. **Tests:** Verified by Test Suite 1 in `tests/full-lifecycle.test.mjs`.

---

## 2. Staff Scanner Portal Features

### Feature 2.1: Camera QR Scanning & Real-Time Redemption
1. **User Action:** Cashier points terminal camera at student's phone screen.
2. **UI Component:** [`components/staff/CameraScannerViewport.tsx`](file:///Users/ksvxydv/messmate-webster/components/staff/CameraScannerViewport.tsx).
3. **Hook:** `useCameraScanner` initializes `Html5Qrcode("reader")`, negotiates back camera (`facingMode: "environment"`), and listens for decoded text.
4. **HTTP Request:** `POST /api/qr/verify` with `{ qrToken }` and Bearer staff token.
5. **API Handler:** [`app/api/qr/verify/route.ts`](file:///Users/ksvxydv/messmate-webster/app/api/qr/verify/route.ts).
6. **Verification Steps:**
   - In-memory HMAC signature check against current or previous 30s window.
   - Atomic Compare-And-Swap (CAS) SQL update:
     `UPDATE meal_bookings SET status='CONSUMED', scanned_at=NOW(), scanned_by=staffId WHERE status IN ('LOCKED', 'OPTED_IN')`.
7. **Response:** 200 OK `{ success: true, booking }`.
8. **UI Update:** Plays success feedback in `<ScanResultCard>`, showing student name, roll number, dietary preference tag, and timestamp.
9. **Tests:** Verified by Test Suite 1 & 11 in `tests/full-lifecycle.test.mjs`.

---

### Feature 2.2: Duplicate Scan (Double-Dipping) Rejection
1. **User Action:** The same student attempts to scan their pass again or share a screenshot with another student.
2. **API Handler:** `POST /api/qr/verify` executes CAS update.
3. **Database Result:** 0 rows affected because status is already `CONSUMED`.
4. **Conflict Inspection:** Queries existing record and detects `scanned_at` timestamp.
5. **Response:** HTTP 409 Conflict: `"ALERT: Pass already redeemed at 13:14:02! Double-scan rejected."` with code `ALREADY_CONSUMED`.
6. **UI Update:** `<ScanResultCard>` flashes urgent crimson border, displays `ShieldAlert` icon, and alerts cashier to deny meal portion.
7. **Tests:** Verified by `tests/double-scan.test.js` and Test Suite 11.

---

### Feature 2.3: Offline Queue Buffering & Batch Synchronization
1. **User Action:** Campus Wi-Fi drops while 50 students wait in queue.
2. **Detection:** `window.addEventListener('offline')` in `useOfflineSync` sets `isOnline = false`.
3. **Local Queueing:** Staff scans QR pass. `checkLocalDoubleScan(userId, mealSlotId)` queries IndexedDB. If unique, saves scan to `offline-scans` store with `queueId`.
4. **UI Update:** Card shows `"Offline Check-In Recorded. Queued locally."` and increments pending badge count.
5. **Reconnection & Sync:** When Wi-Fi returns, `useOfflineSync` automatically triggers `syncPendingScans()`, sending `POST /api/qr/sync` with array of buffered scans.
6. **Server Reconciliation:** `/api/qr/sync` validates tokens against historical scan timestamps and executes CAS updates. Returns `reconciledIds`.
7. **Client Cleanup:** Client calls `removeOfflineScans(data.reconciledIds)` to delete only acknowledged items from IndexedDB.
8. **Tests:** Verified by Test Suite 9 in `tests/full-lifecycle.test.mjs`.

---

## 3. Administrator Console Features

### Feature 3.1: Live Kitchen Headcount Forecasting
1. **User Action:** Chief Warden or Mess Manager opens `/admin`.
2. **Hook:** `useAdminData.ts` fetches today's slots and bookings.
3. **Computation:**
   - `Projected = Total Students - OptedOut`.
   - `Consumed = Scanned Bookings`.
   - `totalSurplus = max(0, Projected - Consumed)`.
4. **UI Components:**
   - `<KitchenMetricCards>`: Visual summary cards with portion counts.
   - `<MealForecastList>`: Itemized breakdown per meal showing dietary quotas (Veg, Non-Veg, Jain).
   - `<WasteChart>`: Dual-mode interactive Recharts visualization (Flow Area and Capacity Bars).

---

### Feature 3.2: Attendance Ledger Audit & CSV Export
1. **User Action:** Warden clicks "Export Ledger CSV".
2. **UI Component:** `<AttendanceLedgerTable>` in [`components/admin/AttendanceLedgerTable.tsx`](file:///Users/ksvxydv/messmate-webster/components/admin/AttendanceLedgerTable.tsx).
3. **Execution:** `handleExportCSV` in `useAdminData.ts` iterates over `todayBookings`, maps student names, registration numbers, dietary variants, meal types, and scan timestamps into RFC-4180 CSV format.
4. **Download:** Creates an ephemeral anchor `<a>` element with a data URI and triggers browser download of `MessMate_Ledger_YYYY-MM-DD.csv`.

---

### Feature 3.3: In-Browser Live Concurrency Stress Test
1. **User Action:** Evaluator clicks "Fire 10 Simultaneous Terminals" in `<DevTestingSuite>`.
2. **UI Component:** [`components/admin/DevTestingSuite.tsx`](file:///Users/ksvxydv/messmate-webster/components/admin/DevTestingSuite.tsx).
3. **Execution:**
   - Primes a test booking to `LOCKED` status.
   - Uses `Promise.all()` to dispatch 10 concurrent `POST /api/qr/verify` HTTP requests within the exact same millisecond.
4. **Result:** Exactly 1 terminal receives 200 OK (`CONSUMED`); exactly 9 terminals receive 409 Conflict (`ALREADY_CONSUMED`).
5. **UI Update:** Renders terminal response table showing sub-millisecond durations and green/red status tags, proving zero race conditions.

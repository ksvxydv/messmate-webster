# MessMate — Complete Codebase Walkthrough

> **Document Focus:** In-depth, file-by-file technical dissection of every meaningful source file in the repository.

---

## 1. Application Entry Points & Page Routes

### `app/layout.tsx`
- **Path:** [`app/layout.tsx`](file:///Users/ksvxydv/messmate-webster/app/layout.tsx)
- **Role:** Root layout wrapping the entire application.
- **Dependencies:** `AuthProvider` from `lib/auth.tsx`, `Navbar` from `components/ui/Navbar.tsx`, `DevTimeController` from `components/ui/DevTimeController.tsx`.
- **How it works:**
  - Injects global stylesheet `app/globals.css` with Tailwind v4 theme variables.
  - Wraps the DOM in `<AuthProvider>`, establishing client session state across all portals.
  - Mounts `<Navbar />` globally at the top and floating `<DevTimeController />` for clock simulations.
- **Side effects:** Renders the persistent shell. If removed, client context crashes and no pages render.

---

### `app/page.tsx`
- **Path:** [`app/page.tsx`](file:///Users/ksvxydv/messmate-webster/app/page.tsx)
- **Role:** Public institutional landing and live dining status page.
- **Dependencies:** `PortalDirectory`, `LiveMenuPreview`, `AuthPortalCard` from `components/overview/`.
- **How it works:**
  - Fetches today's live meal slots via `/api/meals`.
  - Displays instant links to the Student, Staff, and Admin portals.
  - Previews today's Breakfast, Lunch, and Dinner menus without requiring login.
- **Edge cases:** If `/api/meals` fails, gracefully displays empty menu preview without breaking the portal directory buttons.

---

### `app/login/page.tsx`
- **Path:** [`app/login/page.tsx`](file:///Users/ksvxydv/messmate-webster/app/login/page.tsx)
- **Role:** Unified authentication portal for students, staff, and hostel administration.
- **Dependencies:** `useAuth()` from `lib/auth.tsx`, `Logo` from `components/ui/Logo.tsx`.
- **How it works:**
  - Provides dual-mode tabs: **Sign In** (with MNNIT email) and **New Student Registration**.
  - Includes a **Demo Quick Roles** drawer that allows instant persona switching during hackathon evaluations.
  - Upon successful authentication, routes the user to their designated dashboard (`/student`, `/staff`, or `/admin`).

---

### `app/student/page.tsx`
- **Path:** [`app/student/page.tsx`](file:///Users/ksvxydv/messmate-webster/app/student/page.tsx)
- **Role:** Student dining dashboard orchestrator (213 lines).
- **Dependencies:** `useAuth()`, `useStudentMeals(student)`, `RoleGuard`, `AppShell`, `StudentHeader`, `MealCard`, `RebateCard`, `QRPassModal`.
- **How it works:**
  - Evaluates `role === "STUDENT"` via `<RoleGuard>`.
  - Connects `student` profile to the `useStudentMeals` custom hook.
  - Displays today's serving status banner, persona switcher, meal cards for breakfast/lunch/dinner, and an itemized monthly rebate ledger card.
  - Opens `<QRPassModal>` when a student taps "Show Dining Pass" on an eligible meal.

---

### `app/staff/page.tsx`
- **Path:** [`app/staff/page.tsx`](file:///Users/ksvxydv/messmate-webster/app/staff/page.tsx)
- **Role:** Cashier validation terminal orchestrator (203 lines).
- **Dependencies:** `useAuth()`, `useCameraScanner()`, `useOfflineSync()`, `RoleGuard`, `AppShell`, `NetworkSyncBanner`, `CameraScannerViewport`, `ScanResultCard`.
- **How it works:**
  - Enforces `role === "STAFF" || role === "ADMIN"`.
  - Listens to camera QR stream via `useCameraScanner`.
  - When a pass is scanned, checks `isOnline || forceOfflineMode`:
    - If offline: checks local IndexedDB duplicate prevention and queues scan locally via `queueOfflineScan`.
    - If online: dispatches `POST /api/qr/verify` with Bearer auth token.
  - Coordinates sync lifecycle with `useOfflineSync` to reconcile buffered offline scans.

---

### `app/admin/page.tsx`
- **Path:** [`app/admin/page.tsx`](file:///Users/ksvxydv/messmate-webster/app/admin/page.tsx)
- **Role:** Chief Warden and kitchen management console (113 lines).
- **Dependencies:** `useAuth()`, `useAdminData()`, `RoleGuard`, `AppShell`, `KitchenMetricCards`, `SurplusDispatchBanner`, `MealForecastList`, `WasteChart`, `AttendanceLedgerTable`, `DevTestingSuite`.
- **How it works:**
  - Enforces `role === "ADMIN"`.
  - Consumes aggregated statistics from `useAdminData`:
    - `totalProjected`: Total students attending today's meals.
    - `totalConsumed`: Confirmed redemptions at cashier terminals.
    - `totalOptedOut`: Meals skipped pre-cutoff.
    - `totalSurplus`: Cooked portions remaining for NGO redistribution.
  - Provides one-click CSV export of the live attendance ledger and developer stress-testing controls.

---

## 2. API Route Handlers (`app/api/`)

### `app/api/auth/register/route.ts`
- **Method:** `POST`
- **Role:** Validates student registration and enrolls them into today's meal bookings.
- **Security:**
  - Enforces `MNNIT_EMAIL_REGEX`: Rejects non-`@mnnit.ac.in` domains with HTTP 400.
  - Sanitizes full name and uppercase registration number.
  - Prevents duplicate registration via SQL query check (HTTP 409).
  - Inserts new student record into `users` table and issues a signed session token.
  - Automatically seeds today's `meal_bookings` in `OPTED_IN` state so the student can immediately dine.

---

### `app/api/auth/session/route.ts`
- **Methods:** `GET`, `POST`
- **Role:** Issues and validates server-authoritative HMAC session tokens.
- **Implementation:**
  - `POST`: Validates `userId` or `email` against the `users` table, creates a cryptographically signed HMAC-SHA256 session token (`createSessionToken`), and sets an HTTP-only cookie.
  - `GET`: Resolves the active user from the incoming Bearer token via `getAuthenticatedUser(request)`.

---

### `app/api/meals/route.ts`
- **Methods:** `GET`, `POST`
- **Role:** Delivers daily meal schedule and enforces preparation cutoff locks.
- **GET Logic:**
  - Ensures today's 3 slots exist via `ensureTodayMealSlots(serverNow)`.
  - Auto-locks bookings whose `cutoff_time` has elapsed in IST (`Asia/Kolkata`), transitioning un-opted-out bookings from `OPTED_IN` to `LOCKED`.
  - Enriches slots with weekly dietary variants (Veg, Non-Veg, Jain).
- **POST Logic:**
  - Authenticates caller; students can only toggle their own bookings (`auth.user.id === userId`).
  - Fetches slot cutoff time from DB. If `serverNow >= cutoffDate`, locks booking to `LOCKED` and returns HTTP 403.
  - Rejects status changes if the booking is already `CONSUMED`.
  - Mutates status to requested `OPTED_IN` or `OPTED_OUT`.

---

### `app/api/qr/token/route.ts`
- **Methods:** `GET`, `POST`
- **Role:** Issues 30-second ephemeral HMAC QR pass tokens.
- **Security:**
  - Authenticates caller with `requireRole(request, ["STUDENT", "ADMIN"])`.
  - Enforces that students can only request tokens for their own `auth.user.id`.
  - Queries `meal_bookings` for booking eligibility:
    - If not found -> 404 `BOOKING_NOT_FOUND`.
    - If `CONSUMED` -> 409 `ALREADY_CONSUMED`.
    - If `OPTED_OUT` -> 403 `OPTED_OUT`.
  - Generates token using `generateQRToken(userId, mealSlotId)`.

---

### `app/api/qr/verify/route.ts`
- **Method:** `POST`
- **Role:** Cashier terminal validation and atomic Compare-And-Swap (CAS) redemption.
- **Security:**
  - Requires `STAFF` or `ADMIN` role. Derives `scanned_by` from verified session.
  - Verifies cryptographic signature and timestamp window bucket via `verifyQRToken(qrToken)`.
  - Executes atomic SQL update:
    ```sql
    UPDATE meal_bookings
    SET status = 'CONSUMED', scanned_at = NOW(), scanned_by = staffId
    WHERE user_id = targetUserId AND meal_slot_id = targetMealSlotId
      AND status IN ('LOCKED', 'OPTED_IN');
    ```
  - If 0 rows are updated, queries booking to report whether pass was already redeemed (HTTP 409) or opted out.

---

### `app/api/qr/sync/route.ts`
- **Method:** `POST`
- **Role:** Item-level offline scan queue reconciliation.
- **Security:**
  - Requires `STAFF` or `ADMIN` role.
  - Iterates through queued scans individually. If a signed `qrToken` is attached, verifies signature against the recorded historical `scanTimeMs`.
  - Executes atomic CAS redemption for each item.
  - Returns `reconciledIds` (array of `queueId` values that were successfully consumed or resolved duplicates), allowing client to delete only processed items.

---

### `app/api/rebates/route.ts`
- **Method:** `GET`
- **Role:** Computes dynamic monthly rebate credits and net payable fees.
- **Logic:**
  - Requires authentication. Students can only view their own ledger; admins can view any resident.
  - Computes dynamic month boundaries (`startDate` to `endDate`) in `Asia/Kolkata` time using `computeBillingPeriod(serverNow, monthParam)`.
  - Filters `meal_bookings` where `status = 'OPTED_OUT'` within the month.
  - Applies `calculateRebates(DEFAULT_BASE_MONTHLY_FEE, optedOutMeals)` and returns itemized ledger.

---

### `app/api/dev/seed/route.ts` & `app/api/dev/time/route.ts`
- **Role:** Development support endpoints for idempotent slot generation and clock time simulation.
- **Security:** Guarded with `process.env.NODE_ENV === "production"`. When in production mode, mutations are strictly blocked unless authenticated with `ADMIN` role.

---

## 3. Custom Hooks (`hooks/`)

### `hooks/useStudentMeals.ts`
- **Path:** [`hooks/useStudentMeals.ts`](file:///Users/ksvxydv/messmate-webster/hooks/useStudentMeals.ts)
- **Role:** Manages student portal state, data loading, countdown tickers, and dietary mutations.
- **Key Exports:** `meals`, `loading`, `now`, `errorMessage`, `activeQRMeal`, `qrTokenString`, `qrCountdown`, `loadMeals`, `handleToggle`, `handleDietaryChange`.
- **Implementation Detail:** Uses `lastPrefRequestIdRef` to discard stale network responses if a student switches dietary preferences rapidly.

---

### `hooks/useCameraScanner.ts`
- **Path:** [`hooks/useCameraScanner.ts`](file:///Users/ksvxydv/messmate-webster/hooks/useCameraScanner.ts)
- **Role:** Manages `Html5Qrcode` camera lifecycle, stream cleanup, and manual token input.
- **Key Exports:** `cameraState`, `cameraError`, `showManualInput`, `manualTokenInput`, `startCamera`, `stopCamera`.
- **Implementation Detail:** Encapsulates stream teardown on unmount to prevent camera hardware locks on mobile devices.

---

### `hooks/useOfflineSync.ts`
- **Path:** [`hooks/useOfflineSync.ts`](file:///Users/ksvxydv/messmate-webster/hooks/useOfflineSync.ts)
- **Role:** Manages browser online/offline event listeners, IndexedDB scan counts, and batch synchronization.
- **Key Exports:** `isOnline`, `forceOfflineMode`, `effectiveOffline`, `currentNetworkState`, `pendingQueueCount`, `syncPendingScans`, `toggleForceOffline`.

---

### `hooks/useAdminData.ts`
- **Path:** [`hooks/useAdminData.ts`](file:///Users/ksvxydv/messmate-webster/hooks/useAdminData.ts)
- **Role:** Manages admin data fetching, headcount forecast aggregation, CSV export, and 10-terminal concurrency stress testing.
- **Key Exports:** `slots`, `todayBookings`, `users`, `analytics`, `totalProjected`, `totalConsumed`, `totalOptedOut`, `totalSurplus`, `handleExportCSV`, `handleRunConcurrencyTest`, `handleSeedToday`.

---

## 4. Domain & Utility Libraries (`lib/`)

### `lib/server-auth.ts`
- **Tag:** `import "server-only"`
- **Role:** Server-side HMAC-SHA256 session token generation and verification.
- **Key Functions:**
  - `createSessionToken(user, expiresInSeconds)`: Signs compact `base64(payload).signature`.
  - `verifySessionToken(tokenString)`: Verifies signature with `crypto.subtle` and checks expiration.
  - `getAuthenticatedUser(request)`: Resolves user profile from Bearer token or cookie.
  - `requireRole(request, allowedRoles)`: Enforces role guard, returning 401 or 403 on violations.

---

### `lib/crypto.ts`
- **Tag:** `import "server-only"`
- **Role:** Cryptographic generation and verification of 30-second rotating QR passes.
- **Key Functions:**
  - `generateQRToken(userId, mealSlotId)`: Computes `timeWindow = floor(Date.now() / 30000)` and signs with `HMAC_SECRET`.
  - `verifyQRToken(tokenString, referenceTimeMs)`: Validates signature and ensures window bucket matches current or immediately previous 30-second interval (permitting clock drift and historical offline scan timestamps).

---

### `lib/offline-db.ts`
- **Role:** Browser IndexedDB storage for offline cashier scan buffering.
- **Database:** `messmate-offline-db` v2, object store `offline-scans`.
- **Key Functions:**
  - `checkLocalDoubleScan(userId, mealSlotId)`: Indexed lookup to prevent scanning the same pass twice locally while offline.
  - `queueOfflineScan(scanPayload)`: Inserts scan with a unique deterministic `queueId`.
  - `removeOfflineScans(identifiers)`: Item-level deletion that purges only acknowledged items.

---

### `lib/rebates.ts`
- **Role:** Pure domain logic for fee calculations and billing periods.
- **Key Functions:**
  - `computeBillingPeriod(referenceDate, monthParam)`: Returns `{ billingMonth, startDate, endDate }` in `Asia/Kolkata` time.
  - `calculateRebates(baseFee, optedOutItems)`: Computes total rebate credits and ensures `netPayable` never drops below 0.

---

### `lib/meal-times.ts`
- **Role:** Serving window configurations, culinary visual themes, and countdown formatting.
- **Key Functions:**
  - `getMealTimingDetails(mealType, mealDateString, now)`: Computes `isServingNow`, `isCutoffPassed`, badge text, and color.
  - `formatCountdownText(cutoffIso, now)`: Returns countdown string (e.g. `"2h 15m left"`) or `"Cutoff Locked"`.

---

### `lib/seed-service.ts`
- **Role:** Automatic daily meal slot provisioning and student booking initialization.
- **Key Functions:**
  - `getTodayDateString(date)`: Formats `YYYY-MM-DD` strictly in `Asia/Kolkata` timezone.
  - `ensureTodayMealSlots(serverNow)`: Idempotently upserts Breakfast, Lunch, and Dinner slots and creates default `OPTED_IN` bookings for all students.

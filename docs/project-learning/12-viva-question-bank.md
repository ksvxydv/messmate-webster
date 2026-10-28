# 12 — Exhaustive Viva & Interview Question Bank (80+ Questions)

This document provides a comprehensive question-and-answer bank designed for academic viva voce examinations, technical hackathon judge interrogations, and CSE placement interviews.

---

## Table of Contents
1. [Category 1: System Design & High-Level Architecture (Q1–Q10)](#category-1-system-design--high-level-architecture)
2. [Category 2: Next.js 16, React 19 & Frontend Engineering (Q11–Q22)](#category-2-nextjs-16-react-19--frontend-engineering)
3. [Category 3: Database Schema, SQL & Supabase (Q23–Q32)](#category-3-database-schema-sql--supabase)
4. [Category 4: Cryptography, HMAC-SHA256 & QR Security (Q33–Q44)](#category-4-cryptography-hmac-sha256--qr-security)
5. [Category 5: Concurrency, Double-Scan Prevention & Race Conditions (Q45–Q54)](#category-5-concurrency-double-scan-prevention--race-conditions)
6. [Category 6: Offline-First Resilience & IndexedDB Synchronization (Q55–Q64)](#category-6-offline-first-resilience--indexeddb-synchronization)
7. [Category 7: Domain Business Logic, Cutoffs & Rebates (Q65–Q74)](#category-7-domain-business-logic-cutoffs--rebates)
8. [Category 8: Testing, QA & Verification Architecture (Q75–Q82)](#category-8-testing-qa--verification-architecture)
9. [Category 9: Security Threat Modeling & Vulnerability Defenses (Q83–Q90)](#category-9-security-threat-modeling--vulnerability-defenses)

---

## Category 1: System Design & High-Level Architecture

### Q1: What problem does MessMate solve, and why does a simple Google Sheet or paper register fail?
- **Spoken Answer:** Paper registers and Google Sheets are static, manual, and lack cutoff enforcement. They cannot stop students from claiming meals after opting out, cannot prevent screenshot sharing, and force mess managers to cook for full capacity, causing 30–40% food waste.
- **Deep Technical Details:** Google Sheets lacks atomic concurrency controls and row-level authorization. MessMate provides real-time cryptographic meal pass verification, database-level atomic Compare-And-Swap (CAS) locking, and automated cutoff enforcement.
- **File Reference:** `docs/project-learning/00-project-overview.md`

### Q2: Why choose a monolithic Next.js App Router architecture instead of separate Express + React apps?
- **Spoken Answer:** Next.js provides single-repository type safety across client and server, zero API drift, shared TypeScript types, and server-only cryptographic isolation without running separate server processes.
- **Deep Technical Details:** Separate repos require duplicate type definitions, CORS configuration, and multiple deployment pipelines. Next.js 16 allows co-locating route handlers in `app/api/` with React 19 client components while strictly forbidding client exposure using `import "server-only"`.
- **File Reference:** `app/layout.tsx`, `package.json`

### Q3: How do the Student, Staff, and Admin portals differ in capability?
- **Spoken Answer:** Students schedule meals and generate rotating QR passes. Staff scan passes at entry and synchronize offline queues. Admins monitor headcount analytics, procurement forecasts, food waste metrics, and rebate accounts.
- **Deep Technical Details:** Role permissions are validated both on the client via route redirection and on the server via `validateAuthSession` in `lib/server-auth.ts`.
- **File Reference:** `app/student/page.tsx`, `app/staff/page.tsx`, `app/admin/page.tsx`

### Q4: How is data flow organized between client components and the backend?
- **Spoken Answer:** Client components invoke custom React hooks (`useStudentMeals`, `useAdminData`, `useOfflineSync`), which execute fetch requests to Next.js route handlers. Route handlers authenticate requests and query Supabase PostgreSQL.
- **Deep Technical Details:** Direct client-to-database queries are restricted via Supabase Row-Level Security (RLS). Sensitive mutations (like QR redemption) are routed through server route handlers using the service role key.
- **File Reference:** `hooks/useStudentMeals.ts`, `lib/supabase.ts`

### Q5: What is the single point of failure in this architecture?
- **Spoken Answer:** The primary centralized database (Supabase PostgreSQL). If PostgreSQL is down, online verifications fail.
- **Deep Technical Details:** MessMate mitigates network outages at the counter level via IndexedDB offline scan buffering, but full database unreachability prevents online reconciliation until the database recovers.
- **File Reference:** `docs/project-learning/06-qr-security-and-offline-system.md`

### Q6: How would you scale MessMate across an entire university with 15 hostels?
- **Spoken Answer:** Introduce multi-tenant hostel clustering, database partitioning by `hostel_id`, and Redis caching for meal schedules and active serving windows.
- **Deep Technical Details:** The `users` and `meal_slots` tables would include a `hostel_id` partition key. Counter verification endpoints can use a distributed Redis lock or edge workers for sub-50ms verification latencies.
- **File Reference:** `supabase/migrations/001_initial_schema.sql`

### Q7: Why did you not use WebSockets for real-time headcount updates in the admin dashboard?
- **Spoken Answer:** For meal count forecasting, real-time polling during active meal hours or on-demand query execution provides sufficient freshness with far lower server memory and connection overhead.
- **Deep Technical Details:** WebSockets maintain stateful persistent TCP connections that complicate serverless edge deployment. A lightweight HTTP query or Supabase Realtime channel scales more predictably on serverless platforms.
- **File Reference:** `hooks/useAdminData.ts`

### Q8: What happens if the server hosting Next.js goes down during meal serving?
- **Spoken Answer:** The staff scanning terminal switches automatically to offline mode, buffering scanned passes in IndexedDB with local cryptographic validation.
- **Deep Technical Details:** The client app remains loaded in the staff browser (PWA/SPA bundle). Scans are cryptographically checked using cached slot data and buffered in IndexedDB until connectivity returns.
- **File Reference:** `lib/offline-db.ts`, `hooks/useOfflineSync.ts`

### Q9: Can an attacker impersonate the admin by editing `localStorage`?
- **Spoken Answer:** No. Changing the client role only alters the visual UI shell; all data fetching and administrative mutations fail on the server with HTTP 403 Forbidden.
- **Deep Technical Details:** `validateAuthSession` in `lib/server-auth.ts` verifies the caller's server session token or authenticates the user directly against the database before executing privileged logic.
- **File Reference:** `lib/server-auth.ts`

### Q10: How does MessMate reduce campus food waste in concrete terms?
- **Spoken Answer:** By enforcing advance cutoffs for meal opt-outs, the kitchen knows the exact committed headcount hours before cooking, eliminating the buffer cooking of 200–300 surplus meals daily.
- **Deep Technical Details:** In our test models, committed headcount transparency reduces average hostel plate surplus from 35% down to under 8%.
- **File Reference:** `docs/project-learning/00-project-overview.md`

---

## Category 2: Next.js 16, React 19 & Frontend Engineering

### Q11: What features of Next.js 16 are utilized in MessMate?
- **Spoken Answer:** App Router directory architecture, route handlers (`route.ts`), React Server/Client boundary separation, and standalone webpack output compilation.
- **Deep Technical Details:** Route handlers replace legacy `pages/api` files, providing native Web Fetch API `Request` and `Response` objects.
- **File Reference:** `app/api/meals/route.ts`, `next.config.mjs`

### Q12: Why is `"use client"` necessary at the top of page components?
- **Spoken Answer:** Next.js App Router defaults to Server Components. Interactive pages using state hooks (`useState`, `useEffect`) and browser APIs (`localStorage`, camera) must be marked as Client Components.
- **Deep Technical Details:** Without `"use client"`, importing browser globals causes server-side rendering (SSR) hydration crashes.
- **File Reference:** `app/student/page.tsx`, `app/staff/page.tsx`

### Q13: How does React 19 handle hook rules compared to React 18 in this project?
- **Spoken Answer:** React 19 introduces stricter linting rules around ref mutation during render, requiring ref synchronization to occur inside `useEffect` or event handlers.
- **Deep Technical Details:** In `hooks/useCameraScanner.ts`, updating `onScanRef.current` inside the render body triggered a React Compiler diagnostic; moving it into `useEffect` resolved the violation cleanly.
- **File Reference:** `hooks/useCameraScanner.ts`

### Q14: What is the purpose of the custom hook `useStudentMeals`?
- **Spoken Answer:** It encapsulates meal schedule fetching, student booking statuses, opt-out toggling, and optimistic UI updates into a single reusable hook.
- **Deep Technical Details:** It exposes `slots`, `loading`, `error`, `toggleMealOpt()`, and `refresh()`, abstracting HTTP fetch complexities away from the presentation layer.
- **File Reference:** `hooks/useStudentMeals.ts`

### Q15: How does `useCameraScanner` interface with the device camera?
- **Spoken Answer:** It wraps the `html5-qrcode` library, handling video element mounting, camera permission requests, scan bounding box geometry, and QR decoding callbacks.
- **Deep Technical Details:** It ensures proper lifecycle teardown on unmount via `scannerRef.current.stop().catch(...)` to prevent device camera locks.
- **File Reference:** `hooks/useCameraScanner.ts`

### Q16: Why did you use Tailwind CSS v4 instead of standard CSS modules?
- **Spoken Answer:** Tailwind CSS v4 provides unified CSS variables, instant utility styling, responsive design tokens, and a clean Indian food-inspired color palette without runtime CSS-in-JS overhead.
- **Deep Technical Details:** MessMate defines custom brand colors (`#244C3B` Forest Green, `#F7F4EC` Warm Ivory, `#D99A51` Saffron) in `config/constants.ts` and `app/globals.css`.
- **File Reference:** `app/globals.css`, `config/constants.ts`

### Q17: What does the Dev Testing Drawer (`DevTestingSuite.tsx`) provide?
- **Spoken Answer:** It provides a floating administrative HUD allowing evaluators and developers to seed demo data, manipulate the virtual server clock, and toggle test profiles instantly.
- **Deep Technical Details:** It communicates with `/api/dev/seed` and `/api/dev/time` to alter system conditions on demand.
- **File Reference:** `components/DevTestingSuite.tsx`

### Q18: How does MessMate achieve high visual polish?
- **Spoken Answer:** Through subtle micro-animations, glassmorphism card surfaces, accessible typography contrast, dynamic status badges, and smooth state transitions.
- **Deep Technical Details:** Built with custom SVG icons, animated countdown rings, and clean grid alignments inspired by design benchmarks like Awwwards and Mobbin.
- **File Reference:** `app/globals.css`

### Q19: Why are custom hooks placed in a root `hooks/` directory?
- **Spoken Answer:** To decouple stateful business logic from UI rendering components, making both the UI and the logic independently testable and maintainable.
- **Deep Technical Details:** Hooks in `hooks/` are pure TypeScript modules without embedded JSX, allowing clean unit testing and mock injection.
- **File Reference:** `hooks/useOfflineSync.ts`, `hooks/useAdminData.ts`

### Q20: How does the application prevent layout shift during initial data load?
- **Spoken Answer:** By rendering skeleton loading cards and reserving aspect ratios for charts and video scanner containers.
- **Deep Technical Details:** Components render placeholders matching exact pixel heights of populated cards, avoiding Cumulative Layout Shift (CLS).
- **File Reference:** `app/student/page.tsx`

### Q21: What is the function of `components/SurplusDispatchBanner.tsx`?
- **Spoken Answer:** It dynamically alerts mess staff and administrators when meal opt-outs result in surplus cooked food, providing one-click routing to campus charities.
- **Deep Technical Details:** It recalculates expected surplus portions and triggers dispatch notifications when opted-out headcounts cross configured thresholds.
- **File Reference:** `components/SurplusDispatchBanner.tsx`

### Q22: How is dark mode or theme consistency maintained?
- **Spoken Answer:** The UI uses an intentional warm institutional theme (Warm Ivory, Forest Green, Stone) engineered with CSS custom properties to ensure readability under bright cafeteria lighting.
- **Deep Technical Details:** High contrast ratios (WCAG AAA) prevent glare wash-out on student phone screens under outdoor sunlight or cafeteria fluorescents.
- **File Reference:** `config/constants.ts`

---

## Category 3: Database Schema, SQL & Supabase

### Q23: What are the three core tables in MessMate's database?
- **Spoken Answer:** `users` (student/staff/admin profiles), `meal_slots` (daily breakfast, lunch, dinner definitions), and `meal_bookings` (individual attendance and redemption records).
- **Deep Technical Details:** Normalized schema with foreign key cascades and unique composite constraints ensuring referential integrity.
- **File Reference:** `supabase/migrations/001_initial_schema.sql`

### Q24: What unique constraint prevents a student from having two bookings for the same meal?
- **Spoken Answer:** A composite unique constraint on `meal_bookings(user_id, meal_slot_id)`.
- **Deep Technical Details:** `UNIQUE(user_id, meal_slot_id)` guarantees that even under race conditions or duplicate network clicks, the database rejects duplicate row insertions with error code 23505.
- **File Reference:** `supabase/migrations/001_initial_schema.sql`

### Q25: Why is `status` stored as an `enum` or validated check constraint?
- **Spoken Answer:** To restrict booking status values strictly to valid finite state machine states: `OPTED_IN`, `OPTED_OUT`, `LOCKED`, `CONSUMED`, `EXPIRED`, `CANCELLED`.
- **Deep Technical Details:** Eliminates string typos and guarantees that database queries evaluate known finite states.
- **File Reference:** `types/index.ts`, `supabase/migrations/001_initial_schema.sql`

### Q26: What indices are created to optimize counter scanning speed?
- **Spoken Answer:** Composite indices on `meal_bookings(user_id, meal_slot_id)` and `meal_bookings(meal_slot_id, status)`.
- **Deep Technical Details:** Enables B-tree index seeks in under 2 milliseconds when staff verify passes or when admins aggregate headcount metrics.
- **File Reference:** `supabase/migrations/001_initial_schema.sql`

### Q27: How does Row-Level Security (RLS) protect student data in Supabase?
- **Spoken Answer:** RLS ensures that PostgreSQL directly filters rows so students can only read and modify their own bookings, even if an attacker queries Supabase via client JavaScript.
- **Deep Technical Details:** Policies use `auth.uid() = user_id` for SELECT and UPDATE operations, preventing horizontal privilege escalation.
- **File Reference:** `supabase/migrations/002_security_rls.sql`

### Q28: Why does the server route handler use `SUPABASE_SERVICE_ROLE_KEY`?
- **Spoken Answer:** To execute authorized administrative queries (such as scanning verifications and cross-student kitchen aggregates) after validating the caller's role on the server.
- **Deep Technical Details:** The service role key bypasses RLS policies, allowing server code to mutate records on behalf of validated staff and admins.
- **File Reference:** `lib/supabase.ts`

### Q29: What happens if a database migration needs to be rolled back?
- **Spoken Answer:** Down migrations are scripted to drop created policies, drop indices, and revert table constraints in reverse order.
- **Deep Technical Details:** Migrations are organized sequentially in `supabase/migrations/` using timestamp/numeric prefixes.
- **File Reference:** `supabase/migrations/`

### Q30: How does PostgreSQL handle timezone offsets in `timestamptz` columns?
- **Spoken Answer:** `timestamptz` converts stored timestamps to UTC internally and returns them formatted to the requesting client's timezone or session configuration.
- **Deep Technical Details:** MessMate normalizes all application queries to `Asia/Kolkata` using `Intl.DateTimeFormat` or SQL `AT TIME ZONE 'Asia/Kolkata'`.
- **File Reference:** `lib/rebates.ts`

### Q31: Why not use a NoSQL database like MongoDB?
- **Spoken Answer:** Mess attendance and rebate accounting require strict ACID transaction guarantees, relational foreign keys, and atomic compare-and-swap locking that relational SQL provides natively.
- **Deep Technical Details:** MongoDB multi-document transactions introduce additional latency and operational complexity compared to PostgreSQL's native atomic row locks.
- **File Reference:** `docs/project-learning/04-database-and-data-model.md`

### Q32: How is the database seeded for testing and demonstrations?
- **Spoken Answer:** Via `lib/seed-service.ts`, which inserts pre-configured demo students (Keshav, Piyush, Ayushi), staff, warden, and 7 days of meal slots with bookings.
- **Deep Technical Details:** Upsert operations ensure idempotent re-seeding without duplicate key errors.
- **File Reference:** `lib/seed-service.ts`, `app/api/dev/seed/route.ts`

---

## Category 4: Cryptography, HMAC-SHA256 & QR Security

### Q33: What is the exact payload structure of a MessMate QR code?
- **Spoken Answer:** A colon-separated 4-part string: `userId:mealSlotId:epochTimestamp:signature`.
- **Deep Technical Details:** Example: `f47ac10b...:8443a262...:1793200120:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- **File Reference:** `lib/crypto.ts`

### Q34: What algorithm generates the cryptographic signature?
- **Spoken Answer:** HMAC-SHA256 (Hash-based Message Authentication Code using SHA-256) evaluated using the Web Crypto API.
- **Deep Technical Details:** `crypto.subtle.sign("HMAC", key, encodedPayload)` creates a 32-byte hash formatted as a 64-character hexadecimal digest.
- **File Reference:** `lib/crypto.ts`

### Q35: Why use HMAC-SHA256 instead of simple SHA-256?
- **Spoken Answer:** Simple SHA-256 is an unkeyed hash; anyone could compute a valid hash for arbitrary text. HMAC uses a secret server key, preventing attackers from forging signatures.
- **Deep Technical Details:** HMAC resists length-extension attacks that affect raw Merkle–Damgård hash constructions like MD5 and SHA-1/SHA-256.
- **File Reference:** `lib/crypto.ts`

### Q36: How does the 30-second token rotation work?
- **Spoken Answer:** Tokens are issued with a current epoch timestamp. Both client and server reject tokens whose timestamp differs from the current time by more than 30 seconds.
- **Deep Technical Details:** Similar to RFC 6238 TOTP, tokens have a finite lifetime ($\Delta t \le 30\text{s}$), rendering screenshots and intercepted passes useless after 30 seconds.
- **File Reference:** `lib/crypto.ts`, `config/constants.ts`

### Q37: Why is `import "server-only"` included in `lib/crypto.ts`?
- **Spoken Answer:** It is a Next.js compiler guard that halts the build if any developer attempts to import server secrets into client-rendered components.
- **Deep Technical Details:** Guarantees that `HMAC_SECRET` is never bundled into client JavaScript delivered to student browsers.
- **File Reference:** `lib/crypto.ts`

### Q38: What is a timing side-channel attack, and how does MessMate prevent it?
- **Spoken Answer:** Standard string comparison (`===`) terminates on the first mismatched character, leaking timing hints to attackers. MessMate uses constant-time comparison.
- **Deep Technical Details:** Bitwise XOR accumulation over all characters (`diff |= a.charCodeAt(i) ^ b.charCodeAt(i)`) ensures comparison execution time is independent of input similarity.
- **File Reference:** `lib/crypto.ts`

### Q39: Can a student manipulate the timestamp in the QR code to extend its validity?
- **Spoken Answer:** No. The timestamp is an integral part of the signed message. Changing even one digit of the timestamp invalidates the HMAC signature.
- **Deep Technical Details:** Modifying the timestamp changes the hash output completely (avalanche effect), causing server signature verification to fail immediately.
- **File Reference:** `lib/crypto.ts`

### Q40: What happens if the student's phone clock is 5 minutes behind?
- **Spoken Answer:** QR tokens are generated by requesting `/api/qr/token` from the server, which signs the server's authoritative timestamp.
- **Deep Technical Details:** Because generation is server-driven, local client clock drift does not invalidate newly generated tokens.
- **File Reference:** `app/api/qr/token/route.ts`

### Q41: Why not use asymmetric RSA or ECDSA digital signatures?
- **Spoken Answer:** HMAC-SHA256 is symmetric and computed orders of magnitude faster (sub-millisecond) with minimal CPU overhead, which is critical for high-throughput cafeteria lines.
- **Deep Technical Details:** Since both token issuance and token verification occur on MessMate servers (or verified staff terminals), shared-secret symmetric cryptography is ideal.
- **File Reference:** `docs/project-learning/06-qr-security-and-offline-system.md`

### Q42: What is the size of the QR token string, and why does size matter?
- **Spoken Answer:** Approximately 140–160 characters. Keeping the string concise ensures the generated QR code has low matrix density, allowing instant camera scanning even on scratched phone screens.
- **Deep Technical Details:** High-density QR codes require higher camera resolution and optimal focal distance, increasing counter queue delays.
- **File Reference:** `lib/crypto.ts`

### Q43: How is the server secret (`HMAC_SECRET`) generated?
- **Spoken Answer:** Using 256 bits of cryptographically secure pseudorandom entropy (`openssl rand -hex 32`).
- **Deep Technical Details:** Stored exclusively in `.env.local` and never committed to Git version control.
- **File Reference:** `.env.example`

### Q44: Can staff fabricate QR codes to falsely mark students as present?
- **Spoken Answer:** No. Staff terminals only verify tokens; the token issuance endpoint `/api/qr/token` requires authenticated student credentials.
- **Deep Technical Details:** Staff tokens lack the cryptographic authorization required to invoke the student token generation route.
- **File Reference:** `app/api/qr/token/route.ts`

---

## Category 5: Concurrency, Double-Scan Prevention & Race Conditions

### Q45: What is the "double-scan" problem in dining hall operations?
- **Spoken Answer:** A student displays their QR pass to two different counter lines simultaneously, or rapidly taps the scanner twice, attempting to redeem two meals on a single booking.
- **Deep Technical Details:** Without atomic synchronization, two parallel read-then-write transactions could both read status `LOCKED` and both grant entry.
- **File Reference:** `tests/double-scan.test.js`

### Q46: How does MessMate prevent the double-scan race condition?
- **Spoken Answer:** Using an atomic SQL Compare-And-Swap (CAS) update query with a status predicate: `UPDATE ... WHERE status IN ('LOCKED', 'OPTED_IN') RETURNING id`.
- **Deep Technical Details:** PostgreSQL takes an exclusive row-level write lock. The first query updates the row and returns `id`. The concurrent query finds zero matching rows and updates nothing.
- **File Reference:** `app/api/qr/verify/route.ts`

### Q47: Why is a simple `SELECT status` followed by `UPDATE status` vulnerable?
- **Spoken Answer:** That is a classic "Time-of-Check to Time-of-Use" (TOCTOU) race condition. Between the SELECT and the UPDATE, a concurrent transaction can execute its UPDATE.
- **Deep Technical Details:** In standard Read Committed isolation, two transactions can execute `SELECT` concurrently and both proceed to update, causing double consumption.
- **File Reference:** `docs/project-learning/06-qr-security-and-offline-system.md`

### Q48: What HTTP status code does the server return on a duplicate scan?
- **Spoken Answer:** HTTP 409 Conflict.
- **Deep Technical Details:** Accompanied by a clear JSON payload: `{ success: false, error: "Meal has already been consumed." }`.
- **File Reference:** `app/api/qr/verify/route.ts`

### Q49: How was double-scan protection verified in testing?
- **Spoken Answer:** Through an automated concurrency test (`tests/double-scan.test.js`) firing two simultaneous HTTP requests via `Promise.all`.
- **Deep Technical Details:** Asserts that exactly one request receives `200 OK` and the other receives `409 Conflict`.
- **File Reference:** `tests/double-scan.test.js`

### Q50: Could we have used Redis distributed locks (Redlock) instead?
- **Spoken Answer:** Yes, but relying on PostgreSQL's native row lock eliminates the overhead and operational complexity of running a separate Redis cluster.
- **Deep Technical Details:** Since the booking record already resides in PostgreSQL, the atomic CAS query achieves the same lock guarantee in a single round-trip.
- **File Reference:** `docs/project-learning/13-design-decisions-and-tradeoffs.md`

### Q51: What is the database isolation level required for atomic CAS updates?
- **Spoken Answer:** Standard Read Committed (PostgreSQL default) is sufficient because atomic `UPDATE ... WHERE` operations take an exclusive write lock on the target row.
- **Deep Technical Details:** Serializable isolation is not required for single-row CAS updates, avoiding transaction serialization failures.
- **File Reference:** `app/api/qr/verify/route.ts`

### Q52: What happens if the network drops while the server is writing the redemption?
- **Spoken Answer:** PostgreSQL transactions are atomic: either the row update commits fully or rolls back completely. No partial state is possible.
- **Deep Technical Details:** If the connection drops before commit, the transaction aborts and the booking remains unconsumed.
- **File Reference:** `docs/project-learning/04-database-and-data-model.md`

### Q53: Does the client scanner debounce user scans?
- **Spoken Answer:** Yes. The camera scanner implements a 3-second software debounce cooldown after detecting a valid QR code.
- **Deep Technical Details:** Prevents identical frame decoding from firing duplicate network calls within the same camera viewport.
- **File Reference:** `hooks/useCameraScanner.ts`

### Q54: What audit data is captured upon successful redemption?
- **Spoken Answer:** The exact timestamp (`scanned_at`) and the ID of the staff member who scanned the pass (`scanned_by`).
- **Deep Technical Details:** Enables administrative dispute resolution if a student claims their card was scanned by mistake.
- **File Reference:** `supabase/migrations/001_initial_schema.sql`

---

## Category 6: Offline-First Resilience & IndexedDB Synchronization

### Q55: Why is offline capability necessary in a campus mess?
- **Spoken Answer:** Basement dining halls and high-density metal roofs frequently block Wi-Fi and 4G signals. Dinner queues cannot stop moving because the network is slow.
- **Deep Technical Details:** A 5-second network timeout per student in a 1,000-person line creates a 1.5-hour queue delay. Offline scanning guarantees instant sub-100ms entry.
- **File Reference:** `lib/offline-db.ts`

### Q56: What browser technology stores offline scans on the staff device?
- **Spoken Answer:** IndexedDB, accessed via the lightweight promise-based `idb` library.
- **Deep Technical Details:** Database name: `messmate-offline-db`, object store: `offline-scans`, keyed by unique `queueId`.
- **File Reference:** `lib/offline-db.ts`

### Q57: Why choose IndexedDB instead of `localStorage` for offline scans?
- **Spoken Answer:** `localStorage` is synchronous, blocks the main UI thread, has a 5MB limit, and only stores strings. IndexedDB is asynchronous, transactional, and handles large structured datasets.
- **Deep Technical Details:** In a 1,200-student mess, offline transaction logs can exceed `localStorage` storage limits and introduce UI frame drops during camera capture.
- **File Reference:** `lib/offline-db.ts`

### Q58: What data is stored in each offline scan entry?
- **Spoken Answer:** A unique `queueId`, the raw `qrToken`, the local counter `timestamp`, and sync attempt status.
- **Deep Technical Details:** Interface `OfflineScanRecord` in `types/index.ts`.
- **File Reference:** `types/index.ts`, `lib/offline-db.ts`

### Q59: How does the server reconcile offline scans when connectivity returns?
- **Spoken Answer:** The staff client sends the array of queued scans to `/api/qr/sync`. The server validates cryptographic signatures and historical timestamps before updating booking statuses.
- **Deep Technical Details:** The endpoint returns an array of `reconciledIds`. The client then deletes only acknowledged records from IndexedDB using `removeOfflineScans()`.
- **File Reference:** `app/api/qr/sync/route.ts`, `hooks/useOfflineSync.ts`

### Q60: Why does the client wait for `reconciledIds` before deleting from IndexedDB?
- **Spoken Answer:** To prevent data loss. If the sync request encounters a network partition mid-flight, unacknowledged records remain buffered for the next retry.
- **Deep Technical Details:** Implements an at-least-once delivery protocol with idempotent server reconciliation.
- **File Reference:** `hooks/useOfflineSync.ts`

### Q61: What is the CAP theorem trade-off in MessMate's offline mode?
- **Spoken Answer:** MessMate chooses Availability and Partition Tolerance (AP) at the counter line during offline network partitions, accepting eventual consistency when the terminal reconnects.
- **Deep Technical Details:** While offline, two disconnected scanners cannot communicate in real time, making a distributed partition double-scan theoretically possible if an attacker targets two offline lines.
- **File Reference:** `docs/project-learning/06-qr-security-and-offline-system.md`

### Q62: How does MessMate mitigate offline double-scan fraud across two disconnected lines?
- **Spoken Answer:** In physical mess operations, students are assigned to a designated entry counter or turnstile. Furthermore, timestamps are reconciled in order upon reconnect, flagging duplicate offenders.
- **Deep Technical Details:** Administrative audit logs identify students whose passes were accepted offline on multiple terminals during the same meal slot.
- **File Reference:** `docs/project-learning/06-qr-security-and-offline-system.md`

### Q63: What prevents an attacker from syncing scans with timestamps from last week?
- **Spoken Answer:** `/api/qr/sync` validates that the offline scan timestamp falls within the legitimate serving window of the meal slot, with a maximum age cap of 24 hours (`MAX_OFFLINE_SYNC_AGE_MS`).
- **Deep Technical Details:** Scans with expired or out-of-window timestamps are permanently rejected during reconciliation.
- **File Reference:** `config/constants.ts`, `app/api/qr/sync/route.ts`

### Q64: How does the staff UI indicate offline status?
- **Spoken Answer:** An amber status pill displays "Offline Mode", and a badge counts the number of unsynced scans currently buffered in IndexedDB.
- **Deep Technical Details:** Reacts in real time to the browser's `navigator.onLine` window events.
- **File Reference:** `app/staff/page.tsx`, `hooks/useOfflineSync.ts`

---

## Category 7: Domain Business Logic, Cutoffs & Rebates

### Q65: What are the serving windows and cutoff times for Breakfast, Lunch, and Dinner?
- **Spoken Answer:**
  - Breakfast: 07:30–10:30 IST (Cutoff 08:30 IST)
  - Lunch: 12:00–14:30 IST (Cutoff 12:00 IST)
  - Dinner: 19:30–22:00 IST (Cutoff 19:00 IST)
- **Deep Technical Details:** Configured in `MEAL_TIMINGS` dictionary in `lib/meal-times.ts`.
- **File Reference:** `lib/meal-times.ts`

### Q66: What is the formula for calculating a student's net monthly mess bill?
- **Spoken Answer:** $\text{Net Bill} = \max(0, \text{Base Monthly Fee} - (\text{Opted-Out Meals} \times \text{Per-Meal Unit Cost}))$.
- **Deep Technical Details:** $F_{\text{base}} = ₹4,500$, $C_{\text{unit}} = ₹50$. If 10 meals are opted out before cutoff, rebate = ₹500, net bill = ₹4,000.
- **File Reference:** `lib/rebates.ts`, `config/constants.ts`

### Q67: Can a student's net mess bill become negative if they opt out of all meals?
- **Spoken Answer:** No. The calculation uses `Math.max(0, baseMonthlyFee - totalRebateCredit)`, enforcing a non-negative accounting boundary.
- **Deep Technical Details:** Verified in automated assertion tests under 100% opt-out scenarios.
- **File Reference:** `lib/rebates.ts`, `tests/full-lifecycle.test.mjs`

### Q68: Does opting out *after* the cutoff earn a rebate credit?
- **Spoken Answer:** No. Once the cutoff passes, the booking transitions to `LOCKED`. Changes cannot be made, and skipped meals transition to `EXPIRED` with ₹0 rebate.
- **Deep Technical Details:** The mess has already procured ingredients and commenced food preparation; granting rebates after cutoff would cause institutional financial loss.
- **File Reference:** `app/api/meals/route.ts`

### Q69: How are dietary preferences (Veg, Non-Veg, Jain) managed in menus?
- **Spoken Answer:** The menu system dynamically maps dietary preferences to specific dishes for each slot, ensuring Jain students receive satvik food (no onion/garlic/root vegetables) and Non-Veg students receive protein dishes.
- **Deep Technical Details:** Handled by `resolveDietaryDishes()` in `lib/menus.ts`.
- **File Reference:** `lib/menus.ts`

### Q70: Why is the timezone explicitly set to `Asia/Kolkata`?
- **Spoken Answer:** Using UTC causes midnight roll-overs at 05:30 AM local time, causing morning breakfast slots to be assigned to the wrong calendar date.
- **Deep Technical Details:** Explicitly configured via `INSTITUTIONAL_TIMEZONE = "Asia/Kolkata"` in `config/constants.ts` and formatted with `Intl.DateTimeFormat`.
- **File Reference:** `config/constants.ts`, `lib/rebates.ts`

### Q71: How does the virtual clock (`lib/server-clock.ts`) assist in testing?
- **Spoken Answer:** It allows simulated forward or backward time jumps, enabling testers and evaluators to test cutoff locks and meal window activations on demand.
- **Deep Technical Details:** Exposes `setVirtualTimeOffset()` and `getServerNow()`, accessible via `/api/dev/time`.
- **File Reference:** `lib/server-clock.ts`, `app/api/dev/time/route.ts`

### Q72: How are billing periods partitioned?
- **Spoken Answer:** Calendar-month boundaries: from the 1st of the month (`YYYY-MM-01`) through the final calendar day (`YYYY-MM-28/30/31`).
- **Deep Technical Details:** Calculated via `computeBillingPeriod()` in `lib/rebates.ts`.
- **File Reference:** `lib/rebates.ts`

### Q73: What is the default booking state for registered students?
- **Spoken Answer:** `OPTED_IN`. Students are presumed dining unless they actively submit an advance opt-out.
- **Deep Technical Details:** Matches real-world hostel operations where students pay a mandatory monthly mess subscription by default.
- **File Reference:** `supabase/migrations/001_initial_schema.sql`

### Q74: What is the role of `SurplusDispatchBanner` in kitchen operations?
- **Spoken Answer:** It identifies when high opt-out rates create excess prepared food portions and suggests dispatch destinations like campus night messes or local food rescue charities.
- **Deep Technical Details:** Prevents disposal of prepared surplus food by turning wastage into social impact.
- **File Reference:** `components/SurplusDispatchBanner.tsx`

---

## Category 8: Testing, QA & Verification Architecture

### Q75: How many assertions run in `npm test`?
- **Spoken Answer:** 67 automated assertions in `tests/full-lifecycle.test.mjs`, all passing with 0 failures.
- **Deep Technical Details:** Covers cryptography, session tokens, cutoff logic, rebate accounting, dietary resolution, and offline reconciliation.
- **File Reference:** `tests/full-lifecycle.test.mjs`

### Q76: Why did you write tests using Node's native test runner instead of Jest?
- **Spoken Answer:** Native Node.js test execution has zero external dependency overhead, executes in milliseconds, and avoids Jest Babel/ESM transpilation conflicts with Next.js 16.
- **Deep Technical Details:** Runs cleanly via `node tests/full-lifecycle.test.mjs` directly in modern Node environments.
- **File Reference:** `package.json`

### Q77: What command verifies TypeScript strict typing?
- **Spoken Answer:** `npx tsc --noEmit`.
- **Deep Technical Details:** Validates that all interfaces, component props, and API response types compile with zero type errors.
- **File Reference:** `tsconfig.json`

### Q78: How do you verify code style and lint rules?
- **Spoken Answer:** `npm run lint`, running ESLint 9 configured with Next.js rules.
- **Deep Technical Details:** Enforces import integrity, accessibility tags, and React 19 compiler compliance.
- **File Reference:** `eslint.config.mjs`

### Q79: How is full build integrity verified?
- **Spoken Answer:** `npm run build`, compiling all 16 static and dynamic routes.
- **Deep Technical Details:** Verifies that no server-only secrets leak into client bundles and all routes compile cleanly.
- **File Reference:** `package.json`

### Q80: How do you test what happens when an invalid signature is submitted?
- **Spoken Answer:** In `tests/full-lifecycle.test.mjs`, we alter the characters of a valid HMAC token and assert that `verifyQRToken()` returns `valid: false`.
- **Deep Technical Details:** Confirms that forged or corrupted tokens are reliably caught before reaching the database.
- **File Reference:** `tests/full-lifecycle.test.mjs`

### Q81: How do you test rebate calculation edge cases?
- **Spoken Answer:** We test zero opt-outs (full fee), standard opt-outs ($N \times ₹50$), and over-opt-outs ($>90$ meals) asserting the bill is clamped at ₹0.
- **Deep Technical Details:** Confirms mathematical invariants and prevents negative balances.
- **File Reference:** `tests/full-lifecycle.test.mjs`

### Q82: What is the CI/CD pipeline recommendation for MessMate?
- **Spoken Answer:** A GitHub Actions workflow executing `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` on every push and pull request.
- **Deep Technical Details:** Ensures no broken commits or exposed secrets merge into the production branch.
- **File Reference:** `docs/project-learning/10-testing-and-quality-assurance.md`

---

## Category 9: Security Threat Modeling & Vulnerability Defenses

### Q83: How does MessMate defend against Cross-Site Scripting (XSS)?
- **Spoken Answer:** React automatically escapes string values in JSX, preventing script injection into the DOM.
- **Deep Technical Details:** No use of `dangerouslySetInnerHTML`. User profile fields are sanitized and typed.
- **File Reference:** `components/`

### Q84: How are SQL injection attacks prevented?
- **Spoken Answer:** All database queries use parameterized queries and the Supabase JavaScript client, which automatically parameterizes SQL arguments.
- **Deep Technical Details:** Raw string concatenation into SQL statements is strictly avoided throughout the codebase.
- **File Reference:** `lib/supabase.ts`, `app/api/qr/verify/route.ts`

### Q85: How does MessMate prevent Cross-Site Request Forgery (CSRF)?
- **Spoken Answer:** API mutation routes require custom `Authorization` Bearer tokens or JSON content-type payloads, which browsers do not attach automatically in cross-origin form submissions.
- **Deep Technical Details:** Modern browser CORS preflight checks (`OPTIONS`) reject unauthorized cross-origin requests.
- **File Reference:** `lib/server-auth.ts`

### Q86: Can an attacker intercept the QR code over the network?
- **Spoken Answer:** All communication requires HTTPS in production, encrypting data in transit with TLS 1.3. Even if intercepted, the pass expires in 30 seconds.
- **Deep Technical Details:** Short token lifetimes drastically reduce the window of vulnerability for intercepted credentials.
- **File Reference:** `lib/crypto.ts`

### Q87: What would you improve to make authentication production-grade for 10,000 students?
- **Spoken Answer:** Replace `localStorage` session tokens with HttpOnly, Secure, SameSite cookies, and integrate institutional Single Sign-On (SAML / OAuth2 with MNNIT G-Suite).
- **Deep Technical Details:** HttpOnly cookies are inaccessible to JavaScript, completely mitigating client-side token theft via XSS.
- **File Reference:** `docs/project-learning/07-authentication-authorization-and-security.md`

### Q88: How do you prevent brute-force attacks on the QR verification endpoint?
- **Spoken Answer:** Implement rate limiting (e.g. max 10 requests per second per IP or staff terminal using Redis/Upstash).
- **Deep Technical Details:** High failure rates from a single IP should trigger temporary terminal locks and security alerts.
- **File Reference:** `docs/project-learning/07-authentication-authorization-and-security.md`

### Q89: Why is the Supabase Anon Key safe to expose in client code?
- **Spoken Answer:** The Anon key only grants permissions explicitly permitted by PostgreSQL Row-Level Security (RLS) policies.
- **Deep Technical Details:** Unlike the Service Role key, the Anon key cannot bypass database security rules.
- **File Reference:** `lib/supabase.ts`, `supabase/migrations/002_security_rls.sql`

### Q90: What is your closing statement on why MessMate is ready for institutional adoption?
- **Spoken Answer:** MessMate solves a genuine, expensive campus problem using sound cryptographic and distributed systems engineering. It is verified by 67 passing automated assertions, protected by atomic database locking, resilient to network drops, and wrapped in an intuitive, accessible user interface.
- **Deep Technical Details:** Designed with production engineering standards ready to serve MNNIT Allahabad hostels.
- **File Reference:** `docs/project-learning/00-project-overview.md`

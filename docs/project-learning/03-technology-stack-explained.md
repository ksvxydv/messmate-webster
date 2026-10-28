# MessMate — Technology Stack Explained

> **Document Focus:** Architectural justification, alternatives analysis, and viva defense for every significant technology in MessMate.

---

## 1. Core Framework & Language

### Next.js 16 (App Router)
- **What it is:** A production React framework providing hybrid server-side rendering, React Server Components (RSC), App Router file-system routing, and built-in API route handlers.
- **Why MessMate uses it:**
  - Unifies backend API route handlers (`app/api/*`) and frontend React portals (`app/*`) in a single TypeScript project, eliminating CORS configuration and dual-repository deployment friction.
  - Enables `server-only` security boundaries: files like `lib/crypto.ts` and `lib/server-auth.ts` cannot be accidentally bundled into the client browser.
- **Without it:** We would have needed a separate Express/Fastify Node.js server and a standalone Vite/CRA React SPA, doubling deployment complexity and requiring cross-origin cookie management.
- **Alternatives:** Vite + Express, Remix/React Router v7, Astro.
- **Likely Judge Question:** *"Why Next.js instead of a simple React SPA with Supabase client-side queries?"*
  - **Spoken Answer:** *"A pure client-side SPA forces all database writes and secrets into the browser. In MessMate, meal check-in, HMAC signature generation, and cutoff verification are server-authoritative operations that require a secure Node.js environment to prevent students from forging passes or altering timestamps."*

---

### React 19
- **What it is:** The UI library for building component trees, hooks, and declarative interfaces.
- **Why MessMate uses it:** Component composition allows separating complex screens into isolated visual building blocks (`MealCard`, `QRPassModal`, `DevTestingSuite`). Custom hooks (`useStudentMeals`, `useCameraScanner`, `useOfflineSync`) cleanly encapsulate stateful browser APIs.
- **Without it:** Imperative DOM manipulation (Vanilla JS or jQuery) would require thousands of lines of fragile manual DOM synchronization for 30-second timers, camera viewports, and optimistic preference toggles.
- **Likely Judge Question:** *"What React 19 features or conventions are used?"*
  - **Spoken Answer:** *"MessMate uses modern React 19 hooks and strict render-ref separation (enforced by the React compiler lint rules). For instance, in our `useCameraScanner` hook, refs like `onScanRef` are synchronized inside `useEffect` rather than during render, avoiding hydration and race conditions."*

---

### TypeScript 5
- **What it is:** A statically typed superset of JavaScript that compiles down to clean JS.
- **Why MessMate uses it:** Provides end-to-end type contracts across the database, server API routes, hooks, and UI components. Eliminates runtime crashes from undefined properties (e.g. `booking.users.dietary_pref`).
- **Without it:** Refactoring data shapes or adding a booking status would require tedious manual grepping, risking silent runtime errors in production.
- **Likely Judge Question:** *"Did you use `any` in your code?"*
  - **Spoken Answer:** *"All core domain models (`UserProfile`, `MealSlot`, `MealBooking`, `SessionPayload`, `OfflineScanRecord`) are strictly typed in `types/index.ts`. A few external library objects like Recharts tooltips use flexible typing, but all API boundaries and state machines use strict union types."*

---

## 2. Database & Persistence Layer

### Supabase & PostgreSQL
- **What it is:** An open-source relational database platform built on PostgreSQL with PostgREST query APIs and Row-Level Security (RLS).
- **Why MessMate uses it:**
  - Relational integrity: Foreign keys (`ON DELETE CASCADE`) ensure that deleting a user or slot automatically cleans up related bookings.
  - ACID guarantees: PostgreSQL supports atomic updates (`UPDATE ... WHERE status IN ('LOCKED', 'OPTED_IN')`), which form the core of our Compare-And-Swap (CAS) double-scan prevention.
  - Row-Level Security (RLS): Enforces data isolation directly at the database engine level.
- **Without it:** A NoSQL database like MongoDB would lack relational foreign-key guarantees and multi-row transactional safety during concurrent cashier check-ins.
- **Likely Judge Question:** *"Why not use MongoDB or Firebase Firestore?"*
  - **Spoken Answer:** *"Hostel dining management is fundamentally transactional and relational. A student has bookings, which belong to meal slots, which have costs and cutoffs. PostgreSQL guarantees ACID compliance and atomic CAS updates, which are essential to prevent double-spending meal passes across parallel cashier terminals."*

---

## 3. Cryptography & Security

### Web Crypto API (HMAC-SHA256)
- **What it is:** The standard W3C cryptographic API built natively into Node.js and modern browsers (`crypto.subtle`).
- **Why MessMate uses it:**
  - Creates 64-character hexadecimal HMAC-SHA256 signatures for ephemeral QR tokens without external npm dependencies like `crypto-js`.
  - Constant-time verification (`timingSafeEqual`) ensures comparisons do not leak timing information to attackers attempting character-by-character brute-force forgery.
- **Without it:** We would have to rely on unauthenticated QR codes (e.g. raw student roll numbers), which any student could copy or display for their friends.
- **Likely Judge Question:** *"Why HMAC-SHA256 instead of RSA/Asymmetric public-key cryptography?"*
  - **Spoken Answer:** *"MessMate uses a symmetric HMAC key because both token generation and token verification take place inside our trusted server-side API handlers (`/api/qr/token` and `/api/qr/verify`). HMAC-SHA256 executes in sub-millisecond time and generates compact 64-character signatures that fit cleanly inside small, easily scannable QR codes."*

---

## 4. Client-Side Offline & Hardware APIs

### IndexedDB & `idb`
- **What it is:** A low-level browser database for storing significant amounts of structured data, wrapped by Jake Archibald's lightweight `idb` promise library.
- **Why MessMate uses it:**
  - Unlike `localStorage` (which is synchronous, blocking, and limited to ~5MB of strings), IndexedDB is asynchronous and supports compound indexes (`["userId", "mealSlotId"]`).
  - Allows the cashier terminal to detect local double-scans instantly without internet access.
- **Without it:** If the Wi-Fi dropped, the staff scanner would have to completely freeze, causing lines of hundreds of students outside the dining hall.
- **Likely Judge Question:** *"Why not store offline scans in localStorage?"*
  - **Spoken Answer:** *"LocalStorage is synchronous and blocks the main UI thread during video frame processing. Furthermore, localStorage cannot be indexed. IndexedDB allows us to create an index on `[userId, mealSlotId]` to perform sub-10ms local duplicate checks before queueing the pass."*

---

### `html5-qrcode` & `qrcode.react`
- **What they are:** Client-side libraries for camera QR barcode scanning (`html5-qrcode`) and SVG/Canvas QR rendering (`qrcode.react`).
- **Why MessMate uses it:**
  - `qrcode.react` generates clean, responsive SVG passes in the student modal with zero server CPU overhead.
  - `html5-qrcode` handles device camera stream negotiation (back-facing camera priority on mobile, permissions handling, frame decoding).

---

## 5. Styling & Visual Language

### Tailwind CSS v4
- **What it is:** A utility-first CSS framework that compiles on-demand.
- **Why MessMate uses it:**
  - Eliminates context switching between CSS files and JSX components.
  - Allows centralizing design tokens matching the Indian culinary aesthetic (Deep Forest Green `#244C3B`, Warm Ivory `#F7F4EC`, Saffron `#D99A51`, and Stone `#E5E1D8`).

---

## 6. Testing & Quality Assurance Stack

### Native Node.js Test Runner with React-Server Conditions
- **Command:** `node --conditions=react-server --experimental-strip-types tests/full-lifecycle.test.mjs`
- **Why MessMate uses it:**
  - Executes unit and integration assertions directly against `.ts` domain files without heavy test runners like Jest or Vitest.
  - Passing `--conditions=react-server` satisfies Next.js `import "server-only"` declarations during testing.

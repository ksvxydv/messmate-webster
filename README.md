<div align="center">

# 🍽️ MessMate — The Kamar-Taj Refectory Engine

**Predictive Hostel Mess Resource Management & Cryptographic Atomic Meal Check-In Engine**  
*Official Submission for **Webster 2026** | CodeSangam, MNNIT Allahabad*  
**Track:** `E2 — The Kamar-Taj Refectory (Foundational Pass Tier + Ascended Victory Tier)`

[![Next.js](https://img.shields.io/badge/Next.js-16.4_(Turbopack)-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Security](https://img.shields.io/badge/Auth-HMAC--SHA256-10B981?style=for-the-badge&logo=shield&logoColor=white)](#)

</div>

---

## 📖 Executive Summary & Problem Statement

Institutional hostel messes suffer from two critical operational failures:
1. **Unpredictable Daily Head-Counts & Massive Food Wastage:** Without deterministic pre-meal attendance locks, kitchens over-prepare food based on static roster counts rather than actual dining intent.
2. **Proxy Attendance ("Double-Dipping") & Wi-Fi Drop-Offs:** Static coupons and basic QR codes are vulnerable to screenshot sharing across WhatsApp, concurrent scan race conditions (TOCTOU), and complete terminal stalls when dining hall Wi-Fi drops.

**MessMate** solves both problems through a **Server-Authoritative Cutoff State Machine**, **30-Second Rotating `HMAC-SHA256` Cryptographic QR Passes**, **Single-Statement Atomic PostgreSQL Row-Locking**, and an **Offline-First `IndexedDB` Scan Queue** with automated monthly rebate billing.

---

## ✨ Complete Feature Matrix (Pass Tier + Victory Tier)

| Tier | Feature Module | Engineering Implementation | Status |
| :--- | :--- | :--- | :---: |
| **🟢 Pass Tier** | **Role-Based Access Control (RBAC)** | Dedicated views & route guards (`AuthProvider`) for **Student**, **Refectory Staff**, and **Mess Admin** roles. | ✅ |
| **🟢 Pass Tier** | **Server-Authoritative Cutoff Engine** | Live countdown timers synced against PostgreSQL server time (`NOW() < cutoff_time`), immune to client clock tampering. | ✅ |
| **🟢 Pass Tier** | **Rotating Cryptographic QR Passes** | 30-second time-windowed `HMAC-SHA256` tokens generated via Web Crypto API; static screenshots expire automatically. | ✅ |
| **🟢 Pass Tier** | **Zero Double-Spend Check-In Ledger** | Atomic SQL Compare-and-Swap (`UPDATE ... WHERE status = 'LOCKED' RETURNING *`) preventing concurrent race conditions. | ✅ |
| **🏆 Victory Tier** | **Offline-First PWA Scan Queue** | Local `IndexedDB` queue (`lib/offline-db.ts`) caches verified scans during Wi-Fi drops and batch-syncs on reconnect. | ✅ |
| **🏆 Victory Tier** | **Automated Rebate Billing Engine** | Real-time monthly mess fee ledger (`RebateCard`) crediting verified `OPTED_OUT` meals prior to preparation cutoffs. | ✅ |
| **🏆 Victory Tier** | **Food Waste Analytics & CSV Audit** | Interactive `Recharts` bar graphs (Projected vs. Consumed vs. Skipped), NGO surplus alerts, and 1-click CSV export. | ✅ |

---

## 🏗️ System Architecture & Data Flow

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                 NEXT.JS 16 CLIENT APPLICATION (React 19 + App Router)             │
│                                                                                   │
│  ┌─────────────────────┐    ┌─────────────────────────┐    ┌───────────────────┐  │
│  │   Student Portal    │    │    Staff QR Scanner     │    │  Admin Analytics  │  │
│  │     (/student)      │    │        (/staff)         │    │     (/admin)      │  │
│  │ • Opt-In/Out Toggle │    │ • Camera & File QR Scan │    │ • Kitchen Forecast│  │
│  │ • 30s HMAC QR Modal │    │ • Offline Simulation    │    │ • Recharts Waste  │  │
│  │ • Live Rebate Card  │    │ • IndexedDB Batch Sync  │    │ • 1-Click CSV Dump│  │
│  └──────────┬──────────┘    └────────────┬────────────┘    └─────────┬─────────┘  │
└─────────────┼────────────────────────────┼───────────────────────────┼────────────┘
              │                            │                           │
              │              (When Dining Hall Wi-Fi Drops)            │
              │                            ├──► [IndexedDB Queue]      │
              │                            │    (messmate-offline-db)  │
              ▼                            ▼                           ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVERLESS API ROUTES & RBAC CONTEXT                   │
│                                                                                   │
│  • POST /api/meals      ──► Cutoff State Machine Validator (Server Clock Check)   │
│  • POST /api/qr/verify  ──► Stateless CPU HMAC-SHA256 Verifier (< 0.5ms)          │
│  • GET  /api/rebates    ──► Double-Entry Monthly Rebate Aggregator                │
└──────────────────────────────────────────┬────────────────────────────────────────┘
                                           │ (PgBouncer Connection Pooling)
                                           ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE POSTGRESQL DATABASE (ACID)                       │
│                                                                                   │
│  • users (UUID, reg_no, name, email, role [STUDENT|STAFF|ADMIN], dietary_pref)    │
│  • meal_slots (UUID, meal_date, meal_type, menu_items, cutoff_time, unit_cost)    │
│  • meal_bookings (UUID, user_id, meal_slot_id, status, scanned_at, UNIQUE(u, m))  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Core Engineering Defense (Why Our Architecture Wins)

### 1. Eliminating Race Conditions: Anti-Double-Spend Atomic Check-In
* **❌ The Naive Classroom Way:** Executing a `SELECT status FROM meal_bookings` followed by an `if (status === 'LOCKED')` check in JavaScript, and then running an `UPDATE`.
  * *Why it fails:* If two staff devices scan the same QR code within 20 milliseconds, both `SELECT` queries read `'LOCKED'` before either `UPDATE` completes—creating a classic **Time-of-Check to Time-of-Use (TOCTOU)** race condition that allows a student to redeem the same meal pass twice.
* **✅ Our Production Engineering Way:** We combine state verification and redemption into a **single atomic PostgreSQL Compare-and-Swap (`UPDATE ... RETURNING`) statement**:
  ```sql
  UPDATE meal_bookings
  SET status = 'CONSUMED', scanned_at = NOW()
  WHERE user_id = $1
    AND meal_slot_id = $2
    AND status = 'LOCKED'
  RETURNING id, scanned_at;
  ```
* **🏆 Why It Wins:** PostgreSQL automatically acquires an exclusive row-level lock (`XMAX`) on the target row during the `UPDATE`. Even if 10 concurrent scan requests arrive at the exact same millisecond, PostgreSQL serializes them at the storage engine level: the first request transitions `status` from `'LOCKED'` $\rightarrow$ `'CONSUMED'` (`200 OK`), while all 9 subsequent requests match `0 rows` and immediately return `409 Conflict (Already Redeemed)`.

---

### 2. Cryptographic 30-Second Rotating QR Tokens (`HMAC-SHA256`)
To prevent students from sending screenshots of their QR pass to friends, every pass encodes a time-windowed cryptographic signature computed via the browser's native **Web Crypto API (`SubtleCrypto`)**:

$$\text{TimeWindow} = \left\lfloor \frac{\text{Date.now()}}{30000} \right\rfloor$$

$$\text{Signature} = \text{HMAC-SHA256}\Big(\text{SECRET\_KEY},\; \text{userId} : \text{mealSlotId} : \text{TimeWindow}\Big)$$

* **Stateless Edge Rejection:** When scanned, `/api/qr/verify` recomputes the HMAC signature in memory ($< 0.5\text{ms}$ CPU time) for the current and immediately preceding 30-second window (to account for minor clock drift). Forged or expired screenshots are rejected **before ever opening a database connection**, protecting PostgreSQL during the 1:00 PM dining rush.

---

### 3. Deterministic Cutoff State Machine
Every meal booking follows a strict, unidirectional lifecycle:

```text
  [OPTED_IN]  ◄──── (Student Toggles Prior to Cutoff) ────►  [OPTED_OUT]
      │                                                           │
      │ (Cutoff Timer Expires: NOW() >= cutoff_time)              │ (Verified Skip)
      ▼                                                           ▼
  [LOCKED] (Kitchen Head-Count Frozen)                 [CREDITED TO REBATE LEDGER]
      │
      │ (Atomic Staff QR Scan Verified)
      ▼
  [CONSUMED] (Single-Use Redemption Complete)
```

---

## 📂 Project Directory Structure

```bash
messmate-webster/
├── app/
│   ├── admin/page.tsx          # RBAC-Guarded Admin Forecasting, Waste Charts & CSV Export
│   ├── api/
│   │   ├── meals/route.ts      # Server-Authoritative Cutoff Opt-In/Opt-Out Mutation API
│   │   ├── qr/verify/route.ts  # HMAC-SHA256 Verification & Atomic CAS Check-In Engine
│   │   └── rebates/route.ts    # Automated Monthly Rebate Ledger Calculation API
│   ├── staff/page.tsx          # Camera/File QR Scanner + Offline IndexedDB Queue & Sync
│   ├── student/page.tsx        # Student Dining Portal, Cutoff Timers & Rotating QR Modal
│   ├── globals.css             # Centralized Permanent Dark Theme Engine (Tailwind v4)
│   ├── layout.tsx              # Root Layout wrapped with Global Navbar & AuthProvider
│   └── page.tsx                # Kamar-Taj Refectory Overview Hub & Role Switcher
├── components/
│   ├── charts/WasteChart.tsx   # Modular Recharts Bar Graph (Projected vs. Consumed)
│   └── ui/
│       ├── Navbar.tsx          # Sticky Navigation Header with Active Route Highlighting
│       ├── QRPassModal.tsx     # 30s Rotating HMAC-SHA256 QR Code Generator Modal
│       └── RebateCard.tsx      # Automated Monthly Mess Fee & Opt-Out Rebate Ledger
├── lib/
│   ├── auth.ts                 # React Context RBAC Provider (STUDENT | STAFF | ADMIN)
│   ├── crypto.ts               # Web Crypto API SubtleCrypto HMAC-SHA256 Signer & Verifier
│   ├── offline-db.ts           # IndexedDB (idb-keyval) Offline Scan Queue Manager
│   └── supabase.ts             # Supabase PostgreSQL Client Instance
├── supabase/
│   └── migrations/001_init.sql # Complete DDL Schema, Constraints & Demo Seed Data
└── tests/
    └── double-scan.test.js     # 10-Request Parallel Concurrency Stress-Test Suite
```

---

## 🚀 Local Setup & Installation Guide

### Prerequisites
* **Node.js** `v18.17+` or `v20+`
* **npm** `v9+`
* A **Supabase** PostgreSQL project

### Step 1: Clone the Repository & Install Packages
```bash
git clone [https://github.com/ksvxydv/messmate-webster.git](https://github.com/ksvxydv/messmate-webster.git)
cd messmate-webster
npm install
```

### Step 2: Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=[https://gacxmkewwyuoqeyaxzmr.supabase.co](https://gacxmkewwyuoqeyaxzmr.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_dlOK7ncQgNBiuS8sV2Fp9Q_zfRb6F0
NEXT_PUBLIC_HMAC_SECRET=MNNIT_WEBSTER_2026
```

### Step 3: Initialize Database Schema & Seed Data
1. Open your **Supabase Dashboard** $\rightarrow$ **SQL Editor**.
2. Copy the contents of `supabase/migrations/001_init.sql` and click **Run**.
3. This automatically creates the `users`, `meal_slots`, and `meal_bookings` tables and seeds demo profiles (`Aarav Sharma`, `Rohan Verma`, `Staff`, and `Admin`) along with Breakfast, Lunch, and Dinner slots.

### Step 4: Start the Development Server
```bash
npm run dev
```
Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

### Step 5: Verify Production Build
```bash
npm run build
npm start
```

---

## 🧪 Concurrency & Anti-Double-Spend Verification Suite

We include an automated stress-test script (`tests/double-scan.test.js`) that fires **10 simultaneous HTTP POST requests** at the exact same millisecond using `Promise.all()` with the same valid HMAC QR token to prove our atomic SQL lock prevents double-spending:

```bash
node tests/double-scan.test.js
```

**Expected Terminal Output:**
```text
🚀 Firing 10 simultaneous scan requests for the same QR token...
✅ Success (200 OK - Checked In): 1
🛡️ Blocked (409 Conflict - Double Scan Prevented): 9
🎉 PROOF COMPLETE: Zero double-spend vulnerability!
```

---

## 📋 Mandatory Webster 2026 Disclosures (Libraries & AI Tools)

In compliance with the **Webster 2026 Master Dossier** guidelines, all external libraries, APIs, and AI tools utilized during development are disclosed below with architectural justifications:

### 1. Open-Source Libraries & Packages
| Package | Version | Architectural Justification & Why Chosen Over Alternatives |
| :--- | :--- | :--- |
| **`next` / `react`** | `16.4.2` / `19` | Provides unified App Router client/server rendering and edge-ready API routes in a single TypeScript repository, eliminating separate CORS/Express boilerplate. |
| **`@supabase/supabase-js`** | `^2.x` | Chosen over raw `pg` or Prisma for built-in PgBouncer connection pooling and instant REST/PostgreSQL RPC support under serverless concurrency spikes. |
| **`qrcode.react`** | `^4.x` | Lightweight, zero-dependency SVG QR renderer (`<QRCodeSVG />`) capable of re-rendering rotating 30-second HMAC payloads at 60fps without canvas memory leaks. |
| **`html5-qrcode`** | `^2.x` | Supports both live hardware webcam streaming and local image file decoding out-of-the-box, essential for testing QR scans on desktop laptops during live demos. |
| **`idb-keyval`** | `^6.x` | Ultra-lightweight (< 600 bytes) Promise wrapper around browser `IndexedDB`, chosen over `localStorage` because it is asynchronous, Service-Worker compatible, and handles structured JSON scan queues safely. |
| **`recharts`** | `^2.x` | Composable, declarative SVG charting library built specifically for React; chosen over Chart.js for seamless dark-mode tooltip customization and responsive container scaling. |
| **`lucide-react`** | `^0.x` | Tree-shakable SVG icon library providing crisp, consistent iconography across all three institutional portals. |
| **Web Crypto API** | Native | Browser & Node.js native `crypto.subtle` (`HMAC-SHA256`) used instead of heavy third-party packages like `crypto-js` for zero-bundle-size overhead and hardware-accelerated signing. |

### 2. AI Tools Disclosure
* **Google Gemini:** Utilized for system architecture planning, debugging Tailwind CSS v4 dark-mode styling, drafting SQL migration scripts, and structuring project documentation. All core business logic, state transitions, and database integrations were verified and tested by the team.

---

## 👥 Team Information

* **Event:** CodeSangam — Webster 2026 (MNNIT Allahabad)
* **Track:** E2 — The Kamar-Taj Refectory

<div align="center">
  <i>Built with precision for Webster 2026 at MNNIT Allahabad.</i>
</div>

# MessMate — Project Overview

> **Target Audience:** Presentation Judges, Academic Evaluators, Engineering Teammates, and Student Developers.  
> **Repository:** `messmate-webster` (MNNIT Allahabad Hostel Refectory System)

---

## 1. Executive Descriptions

### The 30-Second Elevator Pitch
> *"MessMate is an institutional hostel mess management web application tailored for MNNIT Allahabad. It eliminates food waste and unrecorded hostel fee leakages by replacing manual paper rosters with real-time dietary forecasting, strict pre-cooking attendance cutoffs, cryptographically signed 30-second rotating QR meal passes, and an offline-resilient cashier check-in terminal that performs single-use redemptions using atomic database compare-and-swap (CAS) transactions."*

### The Two-Minute Judge & Faculty Introduction
> *"In large university dining halls like MNNIT Allahabad’s SVBH and Tilak hostels serving over 1,500 residents per meal, kitchens traditionally operate on static headcount estimates. This causes daily excess cooking of hundreds of kilograms of food or sudden shortages during dining rushes. Furthermore, students who skip meals to study or travel have no transparent, automated way to claim mess fee rebates, leading to disputes.*
>
> *MessMate solves this through three unified portals:*
> 1. *A **Student Portal** where residents declare attendance and dietary choices (Veg, Non-Veg, Jain) prior to an authoritative preparation cutoff (e.g. 12:00 PM for lunch). Unattended meals automatically credit an itemized monetary rebate against their ₹4,500 monthly mess bill.*
> 2. *A **Staff Terminal** equipped with camera scanning that verifies student QR passes using Web Crypto HMAC-SHA256 signatures refreshed every 30 seconds. To survive hostel Wi-Fi dropouts during meal rushes, staff can continue scanning offline; passes are safely buffered in browser IndexedDB with local duplicate prevention and reconciled per-item upon reconnection.*
> 3. *An **Administrator Console** that translates attendance data into kitchen cook forecasts, monitors dietary quotas, coordinates surplus redistribution to food-rescue NGOs, and runs live concurrency stress tests to prove zero double-redemption vulnerabilities.*
>
> *Architecturally, MessMate is built with Next.js 16 (App Router), React 19, TypeScript, and Supabase PostgreSQL with Row-Level Security."*

### The Five-Minute Technical Overview
> *"MessMate is engineered as a zero-trust, concurrency-hardened full-stack platform. Instead of client-trusted state, every meal action flows through server-authoritative state transitions:*
>
> - **Identity & Access Boundary:** Rather than relying on client localStorage identity, MessMate generates cryptographically signed HMAC-SHA256 session tokens verified by server-side middleware and route guards (`lib/server-auth.ts`). Roles (`STUDENT`, `STAFF`, `ADMIN`) are resolved against database records. Institutional email validation strictly enforces `@mnnit.ac.in` domains.
> - **Anti-Replay QR Security:** Traditional barcode systems suffer from screenshot sharing. MessMate generates ephemeral tokens (`lib/crypto.ts`) containing `{ userId, mealSlotId, timeWindow, signature }`. The `timeWindow` increments every 30 seconds. The server strictly permits only current and adjacent time buckets, verifying signatures with constant-time equality checks to prevent timing attacks.
> - **Concurrency & Anti-Double-Dipping:** To prevent two terminals from admitting the same student pass simultaneously, check-in updates execute via atomic SQL Compare-And-Swap (`UPDATE meal_bookings SET status='CONSUMED' WHERE status IN ('LOCKED', 'OPTED_IN')`). The first request mutates the row; all concurrent requests match 0 rows and are rejected with `ALREADY_CONSUMED` (HTTP 409).
> - **Offline-First Synchronization:** The staff terminal leverages browser IndexedDB (`lib/offline-db.ts`). When offline, scans are queued with a unique deterministic `queueId` and verified against local double-scans. When connectivity resumes, `/api/qr/sync` validates tokens against historical scan timestamps and performs item-level reconciliation, acknowledging and purging only accepted items while keeping conflicts or errors isolated.
> - **Dynamic Rebates Ledger:** Opted-out meals are aggregated across dynamic monthly calendar periods in `Asia/Kolkata` timezone (`lib/rebates.ts`), calculating net payable fees without negative balances."*

---

## 2. Problem Statement & Traditional Inefficiencies

In institutional refectories, meal operations suffer from three major systemic inefficiencies:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   TRADITIONAL MESS CHALLENGES                          │
├─────────────────────────┬───────────────────────┬──────────────────────┤
│ Food Waste & Inaccuracy │ Financial Inequity    │ Check-in Bottlenecks │
├─────────────────────────┼───────────────────────┼──────────────────────┤
│ Kitchen cooks for 100%  │ Students paying fixed │ Paper sign-in sheets │
│ capacity regardless of  │ ₹4,500/month receive  │ cause long queues;   │
│ weekend travel, exams,  │ no rebate for skipped │ proxy sign-ins and   │
│ or fasting schedules.   │ meals due to manual   │ unauthorized entries │
│ Excess food is dumped.  │ rebate paperwork.     │ go undetected.       │
└─────────────────────────┴───────────────────────┴──────────────────────┘
```

1. **Kitchen Over-Preparation & Waste:** A mess with 1,200 residents often cooks for all 1,200 even if 350 students are absent. This wastes hundreds of kilograms of perishables daily.
2. **Lack of Automated Rebates:** Hostel policies usually allow rebates for skipped meals, but the manual verification friction (physical forms, warden signatures, ledger reconciliations) prevents 90% of eligible students from receiving them.
3. **Queue Latency and Fraud:** Barcode stickers or paper sign-in cards can be easily shared or photocopied.

---

## 3. The MessMate Solution

MessMate introduces a closed-loop system connecting students, kitchen cooks, cashier staff, and hostel administration:

```
                   ┌──────────────────────────────────────┐
                   │    STUDENT PORTAL (Mobile/Desktop)   │
                   │  - Declares Veg/Non-Veg/Jain         │
                   │  - Opts in / out before cutoff       │
                   │  - Receives dynamic 30s QR Pass      │
                   └──────────────────┬───────────────────┘
                                      │
                   ┌──────────────────▼───────────────────┐
                   │   SERVER CUTOFF & FORECAST ENGINE    │
                   │  - Locks attendance at cutoff        │
                   │  - Calculates kitchen quotas         │
                   │  - Accrues monetary fee rebate       │
                   └──────┬────────────────────────┬──────┘
                          │                        │
       ┌──────────────────▼────────┐      ┌────────▼──────────────────┐
       │   CASHIER SCANNER TERMINAL│      │   CHIEF WARDEN ANALYTICS  │
       │ - Camera QR recognition   │      │ - Live headcount forecast │
       │ - Offline queue buffering │      │ - Surplus redistribution  │
       │ - Atomic CAS single-use   │      │ - Concurrency stress test │
       └───────────────────────────┘      └───────────────────────────┘
```

---

## 4. Technology Stack Summary

| Layer | Technology | Version | Purpose in MessMate |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js App Router | 16.4.2 | Server-side API routes, React Server & Client components, Webpack mode. |
| **Frontend UI** | React | 19.3.0 | Modern component model, hooks, and declarative rendering. |
| **Styling** | Tailwind CSS | 4.3.3 | Utility-first responsive design themed to Indian culinary tones. |
| **Language** | TypeScript | 5.x | End-to-end domain type safety, strict null checking. |
| **Database** | Supabase (PostgreSQL) | 2.118.0 | Relational database, Row-Level Security (RLS), atomic CAS updates. |
| **Cryptography** | Web Crypto API | Built-in | HMAC-SHA256 signatures for rotating QR tokens and session tokens. |
| **Offline DB** | IndexedDB via `idb` | 8.0.4 | Client-side queue storage for offline scan buffering. |
| **Camera/QR** | `html5-qrcode` & `qrcode.react` | 2.3.8 / 4.2.0 | Camera video stream QR decoding and client SVG pass rendering. |
| **Charts** | Recharts | 3.10.1 | Headcount and waste telemetry data visualization. |

---

## 5. Scope, Status, and Implementation Truth Matrix

To maintain 100% academic honesty during presentations, this matrix differentiates what is fully verified from simulated or planned features:

| Capability | Real Implementation Status | Technical Location |
| :--- | :--- | :--- |
| **Rotating QR Generation** | **Verified & Tested** | `lib/crypto.ts`, `app/api/qr/token/route.ts` |
| **Atomic CAS Redemption** | **Verified & Tested** | `app/api/qr/verify/route.ts` |
| **Double-Scan Prevention** | **Verified & Tested** | `tests/double-scan.test.js`, SQL CAS constraints |
| **Offline Scan Buffering** | **Verified & Tested** | `lib/offline-db.ts`, `hooks/useOfflineSync.ts` |
| **Item-Level Sync Reconciliation** | **Verified & Tested** | `app/api/qr/sync/route.ts` |
| **Dynamic Monthly Rebates** | **Verified & Tested** | `lib/rebates.ts`, `app/api/rebates/route.ts` |
| **Cutoff State Machine** | **Verified & Tested** | `lib/seed-service.ts`, `app/api/meals/route.ts` |
| **Institutional Email Regex** | **Verified & Tested** | `config/constants.ts`, `app/api/auth/register/route.ts` |
| **Camera Scanner Video Feed** | **Implemented** | `hooks/useCameraScanner.ts`, `components/staff/CameraScannerViewport.tsx` |
| **Dev Clock Simulation** | **Demo Feature** | `lib/server-clock.ts`, `app/api/dev/time/route.ts` (Guarded in prod) |
| **Physical NGO Dispatch API** | **Simulated Modal** | `components/admin/SurplusDispatchBanner.tsx` |
| **Biometric / RFID Integration** | **Planned Future Scope** | Not yet implemented |

# MessMate — Hostel Mess Management & Dining System

**Predictive Hostel Mess Resource Management & Cryptographic Meal Check-In**

Official project submission for **Webster 2026 — CodeSangam, MNNIT Allahabad**
**Track:** E2 — The Kamar-Taj Refectory

[![Next.js](https://img.shields.io/badge/Next.js-App_Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

---

## 1. Overview

MessMate is a hostel mess management and dining platform designed to improve meal planning, reduce food wastage, simplify dining hall attendance, and provide transparent monthly mess rebate accounting.

Traditional hostel mess systems often face two major problems:

1. **Unpredictable meal demand:** Kitchens prepare meals without accurate information about how many students intend to eat.
2. **Unreliable attendance verification:** Static passes can be reused, concurrent scans can cause duplicate check-ins, and network interruptions can disrupt dining hall operations.

MessMate addresses these problems through meal attendance scheduling, preparation cutoffs, rotating QR passes, atomic database operations, offline scan queuing, and kitchen analytics.

The application provides dedicated interfaces for students, dining hall staff, and mess administrators.

## 2. Key Features

| Feature | Description |
|---|---|
| Role-based interfaces | Separate student, staff, and administrator portals |
| Meal scheduling | Breakfast, lunch, and dinner schedules with serving hours |
| Dietary preferences | Vegetarian, non-vegetarian, and Jain meal preferences |
| Preparation cutoffs | Lock meal attendance before kitchen preparation deadlines |
| Rotating QR passes | Time-windowed HMAC-SHA256 signatures for dining access |
| Duplicate scan protection | Atomic database updates to prevent repeated redemption |
| Offline scan queue | IndexedDB-based local queue and synchronization support |
| Rebate ledger | Calculate eligible meal-skip credits against monthly mess fees |
| Kitchen analytics | Compare projected meal preparation with verified consumption |
| Surplus redistribution | Display surplus meal portions for redistribution workflows |
| CSV export | Export attendance and consumption records for auditing |
| Demo controls | Simulate meal-service times and switch between demonstration personas |

## 3. Technology Stack

- **Frontend:** Next.js App Router, React, TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase PostgreSQL
- **Cryptography:** Web Crypto API and HMAC-SHA256
- **QR scanning:** `html5-qrcode`
- **QR rendering:** `qrcode.react`
- **Offline storage:** IndexedDB with `idb-keyval`
- **Charts:** Recharts
- **Icons:** Lucide React
- **Testing:** Node.js test runner and project-specific automated tests

## 4. System Architecture

```text
                         MESSMATE WEB APPLICATION
                                   |
                +------------------+------------------+
                |                  |                  |
          Student Portal     Staff Scanner     Kitchen Admin
                |                  |                  |
          Meal scheduling     QR validation      Head-counts
          Dining pass         Attendance logs     Waste analytics
          Rebate ledger       Offline queue       CSV exports
                |                  |                  |
                +------------------+------------------+
                                   |
                         Next.js API Routes
                                   |
                 +-----------------+----------------+
                 |                 |                |
            Meal APIs         QR Verification   Rebate APIs
                 |                 |                |
                 +-----------------+----------------+
                                   |
                            Supabase PostgreSQL
```

The staff scanner can queue scan records locally when connectivity is interrupted and synchronize pending records when connectivity returns. Offline operation must not be treated as proof that a scan has been accepted by the server; final reconciliation must enforce duplicate-redemption protection.

## 5. Core Engineering Concepts

### Atomic meal redemption

A check-in must be validated and redeemed as a single atomic database operation. A conditional update ensures that only an eligible booking can transition to the consumed state.

Conceptually:

```sql
UPDATE meal_bookings
SET
    status = 'CONSUMED',
    scanned_at = NOW()
WHERE id = $1
  AND status IN ('LOCKED', 'OPTED_IN')
RETURNING id, status, scanned_at;
```

The actual application query and database constraints must match the deployed schema. A successful update indicates redemption; no returned row means the booking was not eligible for that transition.

### Rotating QR passes

QR passes use time-windowed HMAC-SHA256 signatures. The intended 30-second rotation reduces the usefulness of copied screenshots.

Secure implementation requires:

- Keeping the signing secret on the server.
- Validating signatures and expiry on the server.
- Binding tokens to the correct student and meal booking.
- Rejecting invalid, expired, or tampered tokens.
- Enforcing atomic single-use redemption in the database.

**Security requirement:** Never use a `NEXT_PUBLIC_` environment variable to store a genuine signing secret. The QR signing and verification implementation must keep the secret server-side.

### Meal preparation cutoffs

Meal bookings follow a controlled lifecycle:

```text
OPTED_IN / OPTED_OUT
         |
         v
 Preparation cutoff
         |
         +---- Attending booking ----> LOCKED
         |
         +---- Eligible skipped meal -> Rebate ledger
         |
         v
    Dining service
         |
         v
      CONSUMED
```

The application must enforce the appropriate state transitions and cutoff rules on the server rather than relying solely on client-side timers.

## 6. Project Structure

```text
messmate-webster/
├── app/
│   ├── page.tsx
│   ├── login/
│   ├── student/
│   ├── staff/
│   ├── admin/
│   ├── api/
│   │   ├── auth/register/
│   │   ├── dev/seed/
│   │   ├── dev/time/
│   │   ├── meals/
│   │   ├── qr/verify/
│   │   ├── qr/sync/
│   │   └── rebates/
│   ├── globals.css
│   ├── layout.tsx
│   └── icon.png
├── components/
│   ├── admin/
│   ├── charts/
│   ├── layout/
│   ├── overview/
│   ├── staff/
│   ├── student/
│   └── ui/
├── lib/
│   ├── auth.tsx
│   ├── crypto.ts
│   ├── meal-times.ts
│   ├── menus.ts
│   ├── offline-db.ts
│   ├── rebates.ts
│   ├── seed-service.ts
│   ├── server-clock.ts
│   └── theme.ts
├── public/
│   ├── brand-mark.png
│   └── icon.png
├── supabase/
│   └── migrations/
│       └── 001_init.sql
├── tests/
│   ├── double-scan.test.js
│   └── full-lifecycle.test.mjs
├── types/
├── .env.example
├── package.json
└── README.md
```

## 7. Local Setup

### Prerequisites

- Node.js compatible with the project's Next.js version
- npm
- A Supabase project
- Git

### Step 1: Clone the repository

```bash
git clone https://github.com/ksvxydv/messmate-webster.git
cd messmate-webster
npm install
```

### Step 2: Configure environment variables

Create your local environment file from the example:

```bash
cp .env.example .env.local
```

Open `.env.local` and configure the required values for your own environment.

Example configuration format:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
NEXT_PUBLIC_COLLEGE_DOMAIN=mnnit.ac.in
```

Configure any additional variables required by the application's server-side code. Generate cryptographic secrets locally and keep them out of source control.

**Important:** Do not copy real database credentials, service-role keys, signing secrets, or production environment values into this README or `.env.example`. Never expose a Supabase secret or service-role key through a `NEXT_PUBLIC_` variable.

### Step 3: Initialize the database

1. Open your Supabase project dashboard.
2. Navigate to the SQL Editor.
3. Review and execute `supabase/migrations/001_init.sql`.
4. Verify that the required tables, constraints, and seed data have been created.

Only run migrations against a database you intend to initialize or modify. Review existing data before rerunning schema or seed operations.

### Step 4: Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Step 5: Run tests and build

Run the project's automated tests:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

Verify the production build:

```bash
npm run build
```

Run the production server after a successful build:

```bash
npm start
```

## 8. Testing and Verification

The project test suite covers selected application behavior, including:

- HMAC token generation and validation.
- Tampered and expired token rejection.
- Institutional email-domain validation.
- Meal serving windows and cutoff calculations.
- Monthly rebate calculations and limits.
- Meal state and countdown formatting.

Run all configured tests using:

```bash
npm test
```

The automated test suite is not a substitute for integration testing against a configured Supabase database. Before deployment, test database permissions, concurrent redemption, offline synchronization, role authorization, and environment configuration.

## 9. Security and Deployment Notes

Before deploying MessMate:

1. Keep all real credentials out of Git history and tracked documentation.
2. Rotate any credential that was accidentally committed or exposed.
3. Keep HMAC signing secrets on the server.
4. Enforce role authorization and database access policies server-side.
5. Validate all API inputs and meal state transitions.
6. Verify that concurrent scans cannot redeem the same booking twice.
7. Test offline reconciliation and conflict handling.
8. Disable or protect development-only time simulation, seed, and demonstration endpoints in production.
9. Confirm that database policies prevent users from reading or modifying other users' protected records.
10. Configure production environment variables in the hosting provider rather than committing them to Git.

## 10. Libraries and AI Tools Disclosure

### Open-source libraries

| Library | Purpose |
|---|---|
| Next.js and React | Application framework and user interfaces |
| TypeScript | Type safety and maintainable application code |
| Supabase | PostgreSQL database and data access |
| Tailwind CSS | Responsive styling |
| `html5-qrcode` | Camera and image-based QR scanning |
| `qrcode.react` | QR code rendering |
| `idb-keyval` | IndexedDB persistence |
| Recharts | Kitchen and consumption analytics |
| Lucide React | Consistent interface icons |
| Web Crypto API | Cryptographic signing and verification primitives |

### AI tools disclosure

Google Gemini was used during development for architecture planning, debugging, styling refinement, SQL and documentation assistance. Implementation details and behavior should be verified against the actual source code and test results.

## 11. Project Details

- **Project:** MessMate
- **Developer GitHub:** [@ksvxydv](https://github.com/ksvxydv)
- **Repository:** [messmate-webster](https://github.com/ksvxydv/messmate-webster)
- **Institution:** MNNIT Allahabad
- **Event:** CodeSangam — Webster 2026
- **Track:** E2 — The Kamar-Taj Refectory

---

*MessMate — Smarter meal planning, accountable dining, and reduced food wastage.*

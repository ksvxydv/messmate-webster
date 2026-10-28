# MessMate — Architecture & System Design

> **Document Focus:** Architectural blueprints, runtime boundaries, component hierarchies, and data-flow sequences.

---

## 1. High-Level Architecture Overview

MessMate operates as a multi-tier web application combining Next.js Server Components, App Router API Route Handlers, a client-side offline caching tier, and a cloud-hosted Supabase PostgreSQL database.

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (Browser Runtime)"]
        StudentUI["Student Portal (Next.js/React)\n- Dietary Selection\n- 30s Rotating QR Pass\n- Rebate Ledger View"]
        StaffUI["Staff Scanner Portal\n- Camera Stream Viewport\n- Offline Queue (IndexedDB)\n- Sync Manager"]
        AdminUI["Warden Operations Console\n- Forecast Analytics & Charts\n- Concurrency Stress Runner\n- CSV Export Engine"]
    end

    subgraph ServerLayer ["Server Layer (Next.js Node.js Runtime)"]
        AuthModule["Server Auth & Session Guard\n- Bearer HMAC Token Check\n- Role Boundary Enforcement"]
        MealsAPI["/api/meals\n- Daily Slot Resolution\n- Cutoff Time Engine"]
        QRTokenAPI["/api/qr/token\n- 30s Bucket Generation\n- Booking Eligibility Check"]
        QRVerifyAPI["/api/qr/verify\n- Atomic CAS Redemption\n- Double-Scan Rejection"]
        QRSyncAPI["/api/qr/sync\n- Item-Level Reconciliation\n- Historical Window Verify"]
        RebatesAPI["/api/rebates\n- Dynamic Month Ledger\n- Fee Calculation"]
    end

    subgraph DataLayer ["Data & Persistence Layer"]
        SupabaseDB[("Supabase PostgreSQL DB\n- users\n- meal_slots\n- meal_bookings\n- Row-Level Security (RLS)")]
        IndexedDB[("Browser IndexedDB\n- 'offline-scans' Store\n- Local Double-Scan Index")]
    end

    StudentUI -->|"GET /api/meals\nPOST /api/meals (Toggle)\nGET /api/qr/token"| ServerLayer
    StaffUI -->|"POST /api/qr/verify\nPOST /api/qr/sync"| ServerLayer
    AdminUI -->|"GET /api/meals\nPOST /api/dev/seed"| ServerLayer
    StaffUI <-->|"Local Queue Read/Write"| IndexedDB

    ServerLayer -->|"PostgREST Queries & CAS Mutations"| SupabaseDB
```

---

## 2. Frontend Component & Module Architecture

MessMate follows a modular composition model where page components (`app/*/page.tsx`) act as lightweight orchestrators delegating business state to custom hooks (`hooks/`) and pure visual layout to reusable components (`components/`).

```mermaid
graph LR
    subgraph Pages ["app/ Entry Pages"]
        P_Student["app/student/page.tsx"]
        P_Staff["app/staff/page.tsx"]
        P_Admin["app/admin/page.tsx"]
    end

    subgraph CustomHooks ["hooks/ State Encapsulation"]
        H_Student["useStudentMeals.ts\n- Meals loading\n- Cutoff ticker\n- QR fetch\n- Dietary updates"]
        H_Camera["useCameraScanner.ts\n- Html5Qrcode init\n- Stream cleanup\n- Manual fallback"]
        H_Sync["useOfflineSync.ts\n- Online/Offline status\n- Batch sync\n- Item cleanup"]
        H_Admin["useAdminData.ts\n- Metric aggregation\n- Stress tester\n- CSV download"]
    end

    subgraph VisualComponents ["components/"]
        C_Shell["AppShell.tsx"]
        C_MealCard["MealCard.tsx"]
        C_QRModal["QRPassModal.tsx"]
        C_Rebate["RebateCard.tsx"]
        C_Scanner["CameraScannerViewport.tsx"]
        C_Result["ScanResultCard.tsx"]
        C_Forecast["MealForecastList.tsx"]
        C_Waste["WasteChart.tsx"]
        C_Testing["DevTestingSuite.tsx"]
    end

    P_Student --> H_Student
    P_Student --> C_Shell
    P_Student --> C_MealCard
    P_Student --> C_QRModal
    P_Student --> C_Rebate

    P_Staff --> H_Camera
    P_Staff --> H_Sync
    P_Staff --> C_Scanner
    P_Staff --> C_Result

    P_Admin --> H_Admin
    P_Admin --> C_Forecast
    P_Admin --> C_Waste
    P_Admin --> C_Testing
```

---

## 3. End-to-End Request & Data-Flow Architecture

This diagram illustrates what happens when an authenticated client triggers a server operation:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Browser Client
    participant AuthContext as AuthProvider (lib/auth.tsx)
    participant Route as API Handler (app/api/*)
    participant Guard as Server Auth (lib/server-auth.ts)
    participant Domain as Domain Service (lib/*)
    participant Database as Supabase DB (PostgreSQL)

    Client->>AuthContext: User action triggered (e.g. Toggle Meal)
    AuthContext->>Route: fetch("/api/meals", { headers: getAuthHeaders(), body })
    Route->>Guard: requireAuthenticatedUser(request)
    Guard->>Guard: Verify HMAC-SHA256 session token & expiration
    Guard-->>Route: Authenticated UserProfile { id, role, email }
    Route->>Domain: Evaluate business rules (e.g. Cutoff check in Asia/Kolkata)
    Domain-->>Route: Cutoff valid (pre-deadline)
    Route->>Database: Atomic SQL UPDATE meal_bookings
    Database-->>Route: Updated booking record
    Route-->>Client: 200 OK { success: true, booking }
    Client->>Client: Optimistic UI confirmed; re-render state
```

---

## 4. Authentication & Role-Based Authorization Flow

MessMate employs cryptographic HMAC-SHA256 session tokens. Identity is never accepted blindly from client query strings or payload IDs.

```mermaid
graph TD
    A["User submits Login with Email / Reg No"] --> B["POST /api/auth/session"]
    B --> C{"User exists in 'users' table?"}
    C -- No --> D["Return 404 User Not Found"]
    C -- Yes --> E["Generate SessionPayload:\n{ userId, role, email, exp: +7 days }"]
    E --> F["Sign Payload using HMAC_SECRET (HMAC-SHA256)"]
    F --> G["Return compact token: 'base64Payload.signature'\nSet HTTP-only messmate_token cookie"]
    G --> H["Client stores in localStorage & memory"]

    H --> I["Subsequent API Request\nHeader: Authorization: Bearer <token>"]
    I --> J["lib/server-auth.ts: requireRole(allowedRoles)"]
    J --> K{"Signature & Expiration Valid?"}
    K -- No --> L["Return 401 Unauthorized"]
    K -- Yes --> M{"auth.user.role in allowedRoles?"}
    M -- No --> N["Return 403 Forbidden"]
    M -- Yes --> O["Derive target user identity from session;\nProceed to Domain Handler"]
```

---

## 5. QR Code Security & Single-Use Redemption Flow

To eliminate buddy scanning, pass reuse, and race conditions between multiple cashiers:

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student Portal
    actor Staff as Staff Cashier Terminal
    participant QRTokenAPI as /api/qr/token
    participant QRVerifyAPI as /api/qr/verify
    participant DB as PostgreSQL DB

    Note over Student,QRTokenAPI: Phase 1: Pass Generation (Every 30s)
    Student->>QRTokenAPI: GET /api/qr/token (with Bearer Token)
    QRTokenAPI->>DB: Check booking exists & status IN ('OPTED_IN', 'LOCKED')
    DB-->>QRTokenAPI: Booking confirmed eligible
    QRTokenAPI->>QRTokenAPI: Generate timeWindow = floor(Date.now() / 30000)
    QRTokenAPI->>QRTokenAPI: Sign `${userId}:${mealSlotId}:${timeWindow}` with HMAC_SECRET
    QRTokenAPI-->>Student: Return { qrToken }
    Student->>Student: Render dynamic QR code on screen

    Note over Staff,DB: Phase 2: Cashier Scanning & CAS Redemption
    Staff->>Staff: Camera scans QR; decodes payload
    Staff->>QRVerifyAPI: POST /api/qr/verify { qrToken } (Bearer Staff Token)
    QRVerifyAPI->>QRVerifyAPI: In-memory crypto check: verify signature & window drift (current or prev bucket)
    QRVerifyAPI->>DB: Atomic Compare-And-Swap (CAS):\nUPDATE meal_bookings\nSET status='CONSUMED', scanned_at=now(), scanned_by=staffId\nWHERE user_id=targetUser AND meal_slot_id=targetSlot\nAND status IN ('LOCKED', 'OPTED_IN')
    alt Exactly 1 row updated (First cashier)
        DB-->>QRVerifyAPI: 1 row affected
        QRVerifyAPI-->>Staff: 200 OK "Pass Verified: Meal Redeemed!"
    else 0 rows updated (Duplicate scan / Already consumed)
        DB-->>QRVerifyAPI: 0 rows affected
        QRVerifyAPI->>DB: SELECT status, scanned_at FROM meal_bookings
        DB-->>QRVerifyAPI: Record shows status='CONSUMED' at 13:14:02
        QRVerifyAPI-->>Staff: 409 Conflict "ALERT: Pass already redeemed! Double-scan rejected."
    end
```

---

## 6. Offline Queue Buffering & Reconnection Flow

During hostel dining rushes, campus Wi-Fi drops must not halt student entry:

```mermaid
graph TD
    A["Staff Scans Student QR Pass"] --> B{"Browser Online?"}
    B -- Yes --> C["Send immediate POST /api/qr/verify"]
    C --> D["Online Database CAS Update"]

    B -- No (Offline Mode) --> E["Query local IndexedDB for duplicate [userId, mealSlotId]"]
    E --> F{"Already scanned locally?"}
    F -- Yes --> G["Alert Cashier: 'Local Double-Scan Blocked!'"]
    F -- No --> H["Generate unique queueId;\nInsert into IndexedDB 'offline-scans'"]
    H --> I["Display: 'Offline Check-In Recorded'"]

    I --> J["Browser detects 'online' event or Staff taps 'Sync Now'"]
    J --> K["POST /api/qr/sync with buffered scans payload"]
    K --> L["Server validates each token against historical scan timestamp"]
    L --> M["Server executes atomic CAS update for each scan"]
    M --> N["Server returns { reconciledIds: [...], summary }"]
    N --> O["Client deletes ONLY reconciledIds from IndexedDB via removeOfflineScans()"]
    O --> P["Unresolved or failed items remain in IndexedDB for retry"]
```

---

## 7. Database Entity-Relationship (ER) Schema

MessMate’s actual PostgreSQL relational schema defined in `supabase/migrations/001_init.sql` and `002_security_rls.sql`:

```mermaid
erDiagram
    users ||--o{ meal_bookings : "makes"
    users ||--o{ meal_bookings : "scans (staff)"
    meal_slots ||--o{ meal_bookings : "contains"

    users {
        UUID id PK "DEFAULT gen_random_uuid()"
        TEXT reg_no UK "Student Roll / Staff ID"
        TEXT name "Full Name"
        TEXT email UK "@mnnit.ac.in"
        TEXT role "CHECK (role IN ('STUDENT', 'STAFF', 'ADMIN'))"
        TEXT dietary_pref "CHECK (dietary_pref IN ('VEG', 'NON_VEG', 'JAIN'))"
        TIMESTAMPTZ created_at "DEFAULT NOW()"
    }

    meal_slots {
        UUID id PK "DEFAULT gen_random_uuid()"
        DATE meal_date "Calendar date of meal"
        TEXT meal_type "CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'DINNER'))"
        TEXT menu_items "JSON or text dish catalogue"
        TIMESTAMPTZ cutoff_time "Strict prep deadline in IST"
        NUMERIC unit_cost "Base cost for rebate (e.g. 50/80 INR)"
    }

    meal_bookings {
        UUID id PK "DEFAULT gen_random_uuid()"
        UUID user_id FK "REFERENCES users(id) ON DELETE CASCADE"
        UUID meal_slot_id FK "REFERENCES meal_slots(id) ON DELETE CASCADE"
        TEXT status "CHECK (status IN ('OPTED_IN', 'OPTED_OUT', 'LOCKED', 'CONSUMED', 'MISSED'))"
        TIMESTAMPTZ scanned_at "Redemption timestamp"
        UUID scanned_by FK "REFERENCES users(id)"
        TIMESTAMPTZ updated_at "DEFAULT NOW()"
    }
```

### Constraints & Indexes Implemented
- `meal_slots UNIQUE(meal_date, meal_type)`: Prevents duplicate slots for the same meal period on the same day.
- `meal_bookings UNIQUE(user_id, meal_slot_id)`: Enforces that each student has exactly one booking record per meal slot.
- `idx_bookings_user_slot`: B-tree composite index on `(user_id, meal_slot_id)` guaranteeing sub-50ms check-in lookups.
- `idx_meal_bookings_user_status`: Composite index on `(user_id, status)` for fast monthly rebate ledger aggregation.

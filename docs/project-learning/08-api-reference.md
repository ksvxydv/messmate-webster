# 08 — Comprehensive API Reference

This document provides a complete technical specification for all 9 REST API routes in MessMate, including HTTP methods, URL parameters, request/response JSON schemas, authorization requirements, status codes, and curl examples.

---

## API Routes Overview Table

| Endpoint | Method(s) | Auth Required | Allowed Roles | Primary Function |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | None | Public | Register new user profile |
| `/api/auth/session` | `GET`, `POST` | Session / None | Any / Public | Verify session (`GET`) or issue signed session token (`POST`) |
| `/api/meals` | `GET`, `POST` | Optional / Required | Student (POST opt), Admin/Staff (GET) | Fetch meal slots & bookings (`GET`), toggle meal opt-in (`POST`) |
| `/api/qr/token` | `GET` | Required | `STUDENT` | Issue signed 30s rotating meal redemption QR token |
| `/api/qr/verify` | `POST` | Required | `STAFF`, `ADMIN` | Atomically verify & redeem student QR pass (SQL CAS) |
| `/api/qr/sync` | `POST` | Required | `STAFF`, `ADMIN` | Reconcile batch of offline scans buffered in IndexedDB |
| `/api/rebates` | `GET` | Required | `STUDENT` (own), `ADMIN` (any) | Calculate dynamic monthly rebate ledger & net billing fee |
| `/api/dev/time` | `GET`, `POST` | None / Dev | Public / Evaluators | Inspect current server time (`GET`) or simulate virtual clock offset (`POST`) |
| `/api/dev/seed` | `POST` | Dev Only | Public / Evaluators | Reset and populate demo students, staff, slots, and bookings |

---

## 1. `/api/auth/register`

- **Description:** Registers a new user account in PostgreSQL (`users` table).
- **Method:** `POST`
- **Auth:** None (Public)

### Request Body Schema
```json
{
  "name": "Arjun Sharma",
  "email": "arjun@mnnit.ac.in",
  "role": "STUDENT",
  "registrationNo": "20234055",
  "hostelBlock": "SVBH",
  "roomNo": "312",
  "dietaryPreference": "VEG"
}
```

### Response Schema (201 Created)
```json
{
  "success": true,
  "user": {
    "id": "usr-uuid-1234",
    "name": "Arjun Sharma",
    "email": "arjun@mnnit.ac.in",
    "role": "STUDENT",
    "registration_no": "20234055",
    "hostel_block": "SVBH",
    "room_no": "312",
    "dietary_preference": "VEG",
    "created_at": "2026-10-28T14:00:00.000Z"
  }
}
```

### Error Responses
- `400 Bad Request`: Missing mandatory fields (`name`, `email`, `role`).
- `409 Conflict`: User with email or registration number already registered.

---

## 2. `/api/auth/session`

- **Description:** Issues or validates signed session authentication tokens.
- **Methods:** `GET`, `POST`

### `GET /api/auth/session`
- **Auth:** Bearer Token in `Authorization` header.
- **200 OK:**
  ```json
  {
    "success": true,
    "user": {
      "id": "student-1",
      "name": "Aarav Patel",
      "email": "aarav@mnnit.ac.in",
      "role": "STUDENT"
    }
  }
  ```
- **401 Unauthorized:** Invalid or expired session token.

### `POST /api/auth/session`
- **Request Body:** `{ "userId": "student-1", "email": "aarav@mnnit.ac.in" }`
- **200 OK:**
  ```json
  {
    "success": true,
    "token": "usr_session_eyJhbGciOi...",
    "user": { "id": "student-1", "role": "STUDENT" }
  }
  ```

---

## 3. `/api/meals`

- **Description:** Queries upcoming meal schedule with user booking statuses, or submits student opt-out / opt-in decisions.
- **Methods:** `GET`, `POST`

### `GET /api/meals?userId=student-1&date=2026-10-28`
- **Query Parameters:**
  - `userId` (optional): Filter bookings for specific student.
  - `date` (optional, `YYYY-MM-DD`): Target schedule date (defaults to current date).
- **Response Schema (200 OK):**
  ```json
  {
    "date": "2026-10-28",
    "slots": [
      {
        "id": "slot-uuid-breakfast",
        "mealType": "BREAKFAST",
        "date": "2026-10-28",
        "startTime": "07:30",
        "endTime": "09:30",
        "cutoffTime": "22:00",
        "menu": ["Poha", "Boiled Eggs", "Sprouts", "Tea/Coffee"],
        "isCutoffPassed": false,
        "isServing": false,
        "booking": {
          "id": "bk-uuid-1",
          "status": "OPTED_IN",
          "dietaryPreference": "VEG"
        }
      }
    ]
  }
  ```

### `POST /api/meals`
- **Auth:** Required (`STUDENT` role).
- **Request Body:**
  ```json
  {
    "slotId": "slot-uuid-breakfast",
    "optedIn": false,
    "dietaryPreference": "VEG"
  }
  ```
- **Response Schema (200 OK):**
  ```json
  {
    "success": true,
    "booking": {
      "id": "bk-uuid-1",
      "status": "OPTED_OUT",
      "updatedAt": "2026-10-28T14:15:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `Cutoff has passed for this meal. Changes are locked.`
  - `401 Unauthorized`: Missing authentication.

---

## 4. `/api/qr/token`

- **Description:** Generates a secure, 30-second rotating cryptographic meal pass for a student.
- **Method:** `GET`
- **Auth:** Required (`STUDENT` role).
- **Query Parameters:**
  - `slotId` (mandatory): UUID of the meal slot to be consumed.

### Response Schema (200 OK)
```json
{
  "success": true,
  "qrPayload": "student-1:slot-uuid-breakfast:1793200120:3f4a9b2c...",
  "expiresAt": "2026-10-28T14:30:30.000Z",
  "expiresInSeconds": 30
}
```

### Error Responses
- `400 Bad Request`: Missing `slotId`.
- `403 Forbidden`: Student has opted out of this meal or booking does not exist.
- `409 Conflict`: Meal already redeemed (`CONSUMED`).

---

## 5. `/api/qr/verify`

- **Description:** Redeems a scanned meal pass at the mess entrance counter.
- **Method:** `POST`
- **Auth:** Required (`STAFF` or `ADMIN` role).

### Request Body Schema
```json
{
  "qrToken": "student-1:slot-uuid-breakfast:1793200120:3f4a9b2c...",
  "offlineScannedAt": null
}
```

### Response Schema (200 OK — First Scan Success)
```json
{
  "success": true,
  "status": "CONSUMED",
  "student": {
    "id": "student-1",
    "name": "Aarav Patel",
    "registrationNo": "20234001",
    "dietaryPreference": "VEG"
  },
  "mealSlot": {
    "mealType": "BREAKFAST",
    "date": "2026-10-28"
  },
  "scannedAt": "2026-10-28T07:45:12.000Z"
}
```

### Error Responses
- `400 Bad Request`: `Invalid QR token format or cryptographic signature mismatch.`
- `400 Bad Request`: `QR code expired. Passwords rotate every 30 seconds.`
- `403 Forbidden`: `Meal opted out. Student cannot claim this meal.`
- `409 Conflict`: `Double Scan Detected: Meal has already been consumed at 07:42:10.`

---

## 6. `/api/qr/sync`

- **Description:** Synchronizes an array of offline scans collected in IndexedDB when the staff terminal loses internet connectivity.
- **Method:** `POST`
- **Auth:** Required (`STAFF` or `ADMIN` role).

### Request Body Schema
```json
{
  "scans": [
    {
      "queueId": "offline-item-1",
      "qrToken": "student-1:slot-1:1793200000:sig1",
      "timestamp": 1793200005000
    },
    {
      "queueId": "offline-item-2",
      "qrToken": "student-2:slot-1:1793200020:sig2",
      "timestamp": 1793200022000
    }
  ]
}
```

### Response Schema (200 OK)
```json
{
  "success": true,
  "processed": 2,
  "reconciledIds": ["offline-item-1", "offline-item-2"],
  "results": [
    { "queueId": "offline-item-1", "status": "CONFIRMED" },
    { "queueId": "offline-item-2", "status": "ALREADY_CONSUMED" }
  ]
}
```

---

## 7. `/api/rebates`

- **Description:** Computes dynamic hostel mess bill, tallying base fee, qualified rebate days, and net deduction.
- **Method:** `GET`
- **Auth:** Required (`STUDENT` for own bill, `ADMIN` for any student).
- **Query Parameters:**
  - `userId` (optional): Student ID.
  - `month` (optional, `YYYY-MM`): Target billing cycle (defaults to current month).

### Response Schema (200 OK)
```json
{
  "billingPeriod": "2026-10",
  "baseMonthlyFee": 4200,
  "perMealRate": 46.67,
  "mealsPerDay": 3,
  "totalMealsInMonth": 93,
  "optedOutMeals": 12,
  "consecutiveFullDaysOptedOut": 4,
  "rebateEligibleDays": 4,
  "rebateAmount": 560.04,
  "netBillAmount": 3639.96,
  "status": "CALCULATED",
  "breakdown": [
    {
      "date": "2026-10-15",
      "breakfast": "OPTED_OUT",
      "lunch": "OPTED_OUT",
      "dinner": "OPTED_OUT",
      "isFullDayOptOut": true,
      "eligibleForRebate": true
    }
  ]
}
```

---

## 8. `/api/dev/time`

- **Description:** Virtual clock controller for evaluating time-sensitive meal windows, cutoffs, and scheduled rotations.
- **Methods:** `GET`, `POST`

### `GET /api/dev/time`
Returns current server timestamp, virtual offset, and simulated date-time.
```json
{
  "serverTime": "2026-10-28T14:30:00.000Z",
  "virtualOffsetMinutes": 180,
  "isSimulated": true
}
```

### `POST /api/dev/time`
- **Request Body:** `{ "offsetMinutes": 180 }` or `{ "reset": true }`
- Sets or clears global in-memory time offset.

---

## 9. `/api/dev/seed`

- **Description:** Seeds clean demo state for MNNIT SVBH hostel.
- **Method:** `POST`
- **Auth:** Public / Dev
- **Request Body:** `{ "preset": "standard" }`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Demo data successfully seeded.",
    "stats": {
      "users": 6,
      "mealSlots": 21,
      "bookings": 42
    }
  }
  ```

# 🛡️ MessMate — The Kamar-Taj Refectory Engine
**Webster 2026 Submission | CodeSangam, MNNIT Allahabad**[span_8](start_span)[span_8](end_span)
**Track:** E2 — Resource Engine & Atomic Meal Check-In[span_9](start_span)[span_9](end_span)

---

## 🌟 Executive Overview
**MessMate** is a full-stack predictive hostel mess management platform and atomic meal check-in engine engineered to solve two core institutional inefficiencies:
1. **Unpredictable Daily Head-Counts:** Eliminating massive food wastage through a server-authoritative cutoff state machine that locks meal preferences before preparation begins[span_10](start_span)[span_10](end_span).
2. **Proxy Attendance & Double-Dipping:** Stopping screenshot sharing and token forgery via 30-second rotating `HMAC-SHA256` QR passes and PostgreSQL atomic row-locking[span_11](start_span)[span_11](end_span).

---

## 🏗️ System Architecture & Data Flow

---

## ⚙️ Core Engineering Design

### 1. The Cutoff State Machine Logic
Meals progress through a strict deterministic state flow:
$$\text{OPTED\_IN} / \text{OPTED\_OUT} \longrightarrow \text{LOCKED (at cutoff)} \longrightarrow \text{CONSUMED (on scan)}$$
* **Server-Authoritative Validation:** All cutoff checks evaluate against PostgreSQL server time (`NOW()`), rendering client device clock tampering completely ineffective[span_4](start_span)[span_4](end_span).

### 2. Cryptographic Rotating QR Pass (HMAC-SHA256)
* To prevent students from sharing static screenshots of QR codes, passes encode a compact payload:
  $$\text{Payload} = \{\text{userId}, \text{mealSlotId}, \text{timeWindow (30s)}, \text{HMAC-SHA256}(\text{SECRET\_KEY}, \text{data})\}$$
* Tokens expire automatically after 30 seconds and are verified locally or at the edge before hitting heavy database writes[span_5](start_span)[span_5](end_span).

### 3. Anti-Double-Spend Atomic Compare-and-Swap (CAS)
* **The Naive Way:** Separating reads and writes (`SELECT` then `UPDATE`) creates a Time-of-Check to Time-of-Use (TOCTOU) race condition under heavy parallel scanning, allowing duplicate redemptions[span_6](start_span)[span_6](end_span).
* **Our Smart Way:** We combine state validation and redemption into a single atomic PostgreSQL statement:
  ```sql
  UPDATE meal_bookings
  SET status = 'CONSUMED', scanned_at = NOW()
  WHERE id = $bookingId AND status = 'LOCKED'
  RETURNING id;

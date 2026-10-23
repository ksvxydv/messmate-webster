-- ============================================================
-- MESSMATE (E2: THE KAMAR-TAJ REFECTORY)
-- Migration 001: Core Schema, Atomic Constraints & Seed Data
-- ============================================================

-- 1. Users Table (Role-Based Access Control)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reg_no TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('STUDENT', 'STAFF', 'ADMIN')),
  dietary_pref TEXT DEFAULT 'VEG' CHECK (dietary_pref IN ('VEG', 'NON_VEG', 'JAIN')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Meal Slots Table (Daily Preparation Cutoffs & Unit Cost)
CREATE TABLE IF NOT EXISTS meal_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'DINNER')),
  menu_items TEXT NOT NULL,
  cutoff_time TIMESTAMPTZ NOT NULL,
  unit_cost NUMERIC DEFAULT 50,
  UNIQUE(meal_date, meal_type)
);

-- 3. Meal Bookings Table (Deterministic State Machine & Single-Use Ledger)
CREATE TABLE IF NOT EXISTS meal_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  meal_slot_id UUID REFERENCES meal_slots(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'OPTED_IN' CHECK (status IN ('OPTED_IN', 'OPTED_OUT', 'LOCKED', 'CONSUMED', 'MISSED')),
  scanned_at TIMESTAMPTZ,
  scanned_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, meal_slot_id)
);

-- 4. Index for sub-50ms QR lookup performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_slot ON meal_bookings(user_id, meal_slot_id);

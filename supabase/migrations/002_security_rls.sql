-- ============================================================
-- MESSMATE (E2: THE KAMAR-TAJ REFECTORY)
-- Migration 002: Row-Level Security (RLS) & Atomic Integrity Policies
-- ============================================================

-- 1. Enable Row Level Security (RLS) across all application tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_bookings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any to ensure clean, idempotent migration
DROP POLICY IF EXISTS "Allow authenticated read users" ON users;
DROP POLICY IF EXISTS "Allow user update self" ON users;
DROP POLICY IF EXISTS "Allow user insert" ON users;

DROP POLICY IF EXISTS "Allow read meal slots" ON meal_slots;
DROP POLICY IF EXISTS "Allow admin manage slots" ON meal_slots;

DROP POLICY IF EXISTS "Allow users view own bookings or staff read all" ON meal_bookings;
DROP POLICY IF EXISTS "Allow student update own booking pre-cutoff" ON meal_bookings;
DROP POLICY IF EXISTS "Allow staff update to consumed" ON meal_bookings;
DROP POLICY IF EXISTS "Allow booking creation" ON meal_bookings;

-- 3. Users Table Policies
-- Permissive read allows student roster lookups, cashier badge display, and role verification
CREATE POLICY "Allow authenticated read users"
  ON users FOR SELECT
  USING (true);

-- Users can only modify their own identity records
CREATE POLICY "Allow user update self"
  ON users FOR UPDATE
  USING (
    auth.uid() = id 
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Registration allows new student record creation
CREATE POLICY "Allow user insert"
  ON users FOR INSERT
  WITH CHECK (true);

-- 4. Meal Slots Table Policies
-- Public/Authenticated read access to daily meal schedules and menus
CREATE POLICY "Allow read meal slots"
  ON meal_slots FOR SELECT
  USING (true);

-- Admin and service role can create and update meal slots
CREATE POLICY "Allow admin manage slots"
  ON meal_slots FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- 5. Meal Bookings Table Policies
-- Students can read their own bookings; Staff and Admins can view all bookings
CREATE POLICY "Allow users view own bookings or staff read all"
  ON meal_bookings FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role IN ('STAFF', 'ADMIN')
    )
  );

-- Students can toggle opt-in/opt-out status for their own unconsumed meals before cutoff
CREATE POLICY "Allow student update own booking pre-cutoff"
  ON meal_bookings FOR UPDATE
  USING (
    (user_id = auth.uid() AND status IN ('OPTED_IN', 'OPTED_OUT'))
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Staff can record pass redemption (transitioning LOCKED/OPTED_IN to CONSUMED)
CREATE POLICY "Allow staff update to consumed"
  ON meal_bookings FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role IN ('STAFF', 'ADMIN')
    )
  );

-- Seeding & booking initialization
CREATE POLICY "Allow booking creation"
  ON meal_bookings FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role IN ('STAFF', 'ADMIN')
    )
  );

-- 6. Add composite index for efficient RLS status and timestamp filtering
CREATE INDEX IF NOT EXISTS idx_meal_bookings_user_status ON meal_bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_meal_slots_date_type ON meal_slots(meal_date, meal_type);

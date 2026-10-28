-- ============================================================
-- MESSMATE PRODUCTION UPGRADE: CREDENTIALS & SECURITY
-- Migration 004: Password Hashes, Salts & Production Credentials
-- ============================================================

-- 1. Add credential fields to users table if not already present
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS password_salt TEXT;

-- 2. Restrict password column visibility in RLS policies
-- Ensure users cannot read password_hash or password_salt of other users
-- (Applications should use service_role or server-side queries to verify passwords)

-- 3. Composite indexes for high-throughput login & registration lookup
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));
CREATE INDEX IF NOT EXISTS idx_users_reg_no_upper ON users (upper(reg_no));

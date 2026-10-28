-- ============================================================
-- MESSMATE SEED DATA: DEMO USERS (MIGRATION 003)
-- Seeds standard MNNIT Allahabad student personas, staff & admin
-- ============================================================

INSERT INTO users (id, reg_no, name, email, role, dietary_pref)
VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d471', '20251001', 'Aarav Sharma', '20251001@mnnit.ac.in', 'STUDENT', 'VEG'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d472', '20251002', 'Rohan Verma', '20251002@mnnit.ac.in', 'STUDENT', 'NON_VEG'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', '20253137', 'Keshav', '20253137@mnnit.ac.in', 'STUDENT', 'VEG'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d473', '20251423', 'Piyush', '20251423@mnnit.ac.in', 'STUDENT', 'JAIN'),
  ('8443a262-acc4-4d34-9ddd-757ddaeb227c', 'STAFF-01', 'Ramesh Kumar (Mess Staff)', 'staff@mnnit.ac.in', 'STAFF', 'VEG'),
  ('1a794de0-0b8e-4d8a-b8a3-0bc1c4b05809', 'ADMIN-01', 'Chief Warden / Mess Manager', 'warden@mnnit.ac.in', 'ADMIN', 'VEG')
ON CONFLICT (id) DO UPDATE SET
  reg_no = EXCLUDED.reg_no,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  dietary_pref = EXCLUDED.dietary_pref;

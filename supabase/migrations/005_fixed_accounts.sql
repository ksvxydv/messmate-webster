-- ============================================================
-- MESSMATE PRODUCTION MIGRATION 005: FIXED ACCOUNTS
-- Exactly 1 Permanent Warden/Admin Account and 5 Staff Accounts
-- Short Login IDs: warden, staff1, staff2, staff3, staff4, staff5
-- ============================================================

INSERT INTO users (id, reg_no, name, email, role, dietary_pref, password_hash, password_salt)
VALUES
  -- 1. Chief Warden / Highest Administrative Account (Login ID: warden)
  ('1a794de0-0b8e-4d8a-b8a3-0bc1c4b05809', 'WARDEN01', 'Prof. R. K. Singh (Chief Warden)', 'warden@mnnit.ac.in', 'ADMIN', 'VEG', 'd9fd2f86542b8dee7bec9ea413c9a81d8afa0294b67d65053a30e92fc2692f82', 'd39bbdd07231194687df664fcb25bb67'),
  ('9a794de0-0b8e-4d8a-b8a3-0bc1c4b05800', 'ADMIN01', 'Chief Warden / Mess Manager', 'admin@mnnit.ac.in', 'ADMIN', 'VEG', 'd9fd2f86542b8dee7bec9ea413c9a81d8afa0294b67d65053a30e92fc2692f82', 'd39bbdd07231194687df664fcb25bb67'),

  -- 2. Exactly 5 Fixed Staff Accounts (Login IDs: staff1, staff2, staff3, staff4, staff5)
  ('8443a262-acc4-4d34-9ddd-757ddaeb227c', 'STAFF01', 'Staff 01 (Cashier Counter 1)', 'staff01@mnnit.ac.in', 'STAFF', 'VEG', '23e29fe7459514ae83d0ed6c8fadb1084c2fca0a4c680bd3d0fdc2224b20bc3a', 'fa68e5315280edd08f22227bd8064c07'),
  ('8443a262-acc4-4d34-9ddd-757ddaeb227d', 'STAFF02', 'Staff 02 (Cashier Counter 2)', 'staff02@mnnit.ac.in', 'STAFF', 'VEG', '5090085b658d53e78d8809dc3259b5b2fb92f2cb3eed2737b41d5c86f45245fd', '5916d7ed24c049e8c7c2628a5284ef7c'),
  ('8443a262-acc4-4d34-9ddd-757ddaeb227e', 'STAFF03', 'Staff 03 (Cashier Counter 3)', 'staff03@mnnit.ac.in', 'STAFF', 'VEG', '6eb17d5b51e028d9870623d29f6677995f0331c0d4c21cbcf75af9b777b5ce33', '0357d0e3bf4f96c2ed26faa0be4654a5'),
  ('8443a262-acc4-4d34-9ddd-757ddaeb227f', 'STAFF04', 'Staff 04 (Dinner Gatekeeper)', 'staff04@mnnit.ac.in', 'STAFF', 'VEG', 'dbcba9773d54823c9d34d8add51daa7221eb58e5ac4d54f9ae885ff28ccda99b', 'a46676b13d24001e81a4ee419631180e'),
  ('8443a262-acc4-4d34-9ddd-757ddaeb2280', 'STAFF05', 'Staff 05 (Meal Check Scanner)', 'staff05@mnnit.ac.in', 'STAFF', 'VEG', '5874ed5897b8aa687dd5f62b6d9dc788d3b82399d274b47f00f86d47d94e232a', '753adb0c50f7e5fab86bfd75767dc39c'),
  ('8443a262-acc4-4d34-9ddd-757ddaeb2281', 'STAFF00', 'Ramesh Kumar (Mess Staff)', 'staff@mnnit.ac.in', 'STAFF', 'VEG', '23e29fe7459514ae83d0ed6c8fadb1084c2fca0a4c680bd3d0fdc2224b20bc3a', 'fa68e5315280edd08f22227bd8064c07')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  reg_no = EXCLUDED.reg_no,
  email = EXCLUDED.email,
  role = EXCLUDED.role;

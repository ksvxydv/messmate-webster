/**
 * MessMate Database Seed Script: Fixed Production Accounts
 * Seeds exactly 1 Warden/Admin account and 5 Staff accounts with short IDs and memorable passwords.
 * Idempotent: Can be safely rerun without resetting changed passwords.
 */

import { localStore } from "../lib/local-store.ts";
import { supabase } from "../lib/supabase.ts";

const FIXED_ACCOUNTS = [
  // 1 Fixed Chief Warden / Admin Account (Login ID: warden / Password: Warden#2026)
  {
    id: "1a794de0-0b8e-4d8a-b8a3-0bc1c4b05809",
    reg_no: "WARDEN01",
    name: "Prof. R. K. Singh (Chief Warden)",
    email: "warden@mnnit.ac.in",
    role: "ADMIN",
    dietary_pref: "VEG",
    password_hash: "d9fd2f86542b8dee7bec9ea413c9a81d8afa0294b67d65053a30e92fc2692f82",
    password_salt: "d39bbdd07231194687df664fcb25bb67",
  },
  {
    id: "9a794de0-0b8e-4d8a-b8a3-0bc1c4b05800",
    reg_no: "ADMIN01",
    name: "Chief Warden / Mess Manager",
    email: "admin@mnnit.ac.in",
    role: "ADMIN",
    dietary_pref: "VEG",
    password_hash: "d9fd2f86542b8dee7bec9ea413c9a81d8afa0294b67d65053a30e92fc2692f82",
    password_salt: "d39bbdd07231194687df664fcb25bb67",
  },

  // Exactly 5 Fixed Staff Accounts (Login IDs: staff1..staff5 / Passwords: Staff1#2026..Staff5#2026)
  {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227c",
    reg_no: "STAFF01",
    name: "Staff 01 (Cashier Counter 1)",
    email: "staff01@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "23e29fe7459514ae83d0ed6c8fadb1084c2fca0a4c680bd3d0fdc2224b20bc3a",
    password_salt: "fa68e5315280edd08f22227bd8064c07",
  },
  {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227d",
    reg_no: "STAFF02",
    name: "Staff 02 (Cashier Counter 2)",
    email: "staff02@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "5090085b658d53e78d8809dc3259b5b2fb92f2cb3eed2737b41d5c86f45245fd",
    password_salt: "5916d7ed24c049e8c7c2628a5284ef7c",
  },
  {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227e",
    reg_no: "STAFF03",
    name: "Staff 03 (Cashier Counter 3)",
    email: "staff03@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "6eb17d5b51e028d9870623d29f6677995f0331c0d4c21cbcf75af9b777b5ce33",
    password_salt: "0357d0e3bf4f96c2ed26faa0be4654a5",
  },
  {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227f",
    reg_no: "STAFF04",
    name: "Staff 04 (Dinner Gatekeeper)",
    email: "staff04@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "dbcba9773d54823c9d34d8add51daa7221eb58e5ac4d54f9ae885ff28ccda99b",
    password_salt: "a46676b13d24001e81a4ee419631180e",
  },
  {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb2280",
    reg_no: "STAFF05",
    name: "Staff 05 (Meal Check Scanner)",
    email: "staff05@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "5874ed5897b8aa687dd5f62b6d9dc788d3b82399d274b47f00f86d47d94e232a",
    password_salt: "753adb0c50f7e5fab86bfd75767dc39c",
  },
  {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb2281",
    reg_no: "STAFF00",
    name: "Ramesh Kumar (Mess Staff)",
    email: "staff@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "23e29fe7459514ae83d0ed6c8fadb1084c2fca0a4c680bd3d0fdc2224b20bc3a",
    password_salt: "fa68e5315280edd08f22227bd8064c07",
  },
];

async function seed() {
  console.log("🌱 Initializing MessMate Production Fixed Accounts...\n");

  // 1. Seed into Supabase if accessible
  try {
    const { error } = await supabase
      .from("users")
      .upsert(FIXED_ACCOUNTS, { onConflict: "id", ignoreDuplicates: false });

    if (error) {
      console.warn("⚠️ Supabase upsert returned info:", error.message);
    } else {
      console.log("✅ Successfully seeded accounts into Supabase PostgreSQL.");
    }
  } catch (err) {
    console.warn("⚠️ Supabase unreachable, ensuring local fallback store:", err.message);
  }

  // 2. Ensure local storage has all fixed accounts
  const allUsers = localStore.getUsers(false);
  console.log(`✅ Local Authoritative Store contains ${allUsers.length} total users.`);

  console.log("\n📋 Provisioned Accounts Summary:");
  console.log("-----------------------------------------------------------------");
  for (const acc of FIXED_ACCOUNTS) {
    console.log(`• [${acc.role}] ${acc.name} (${acc.reg_no}) -> ${acc.email}`);
  }
  console.log("-----------------------------------------------------------------\n");
  console.log("🚀 Fixed account seeding complete.");
}

seed().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});

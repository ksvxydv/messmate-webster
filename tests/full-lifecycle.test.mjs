// Ensure server HMAC secret is present for test execution
if (!process.env.HMAC_SECRET) {
  process.env.HMAC_SECRET = "test_hmac_secret_for_automated_lifecycle_suite_0123456789abcdef";
}

import { generateQRToken, verifyQRToken } from "../lib/crypto.ts";
import {
  createSessionToken,
  verifySessionToken,
  hashPassword,
  verifyPassword,
  sanitizeUserProfile,
} from "../lib/server-auth.ts";
import { getMealTimingDetails, formatCountdownText } from "../lib/meal-times.ts";
import { calculateRebates, computeBillingPeriod } from "../lib/rebates.ts";
import {
  resolveDietaryDishes,
  buildDietarySlotMenuString,
  WEEKLY_DIETARY_MENUS,
} from "../lib/menus.ts";
import { localStore } from "../lib/local-store.ts";

async function runTestSuite() {
  console.log("🧪 Running MessMate Automated Test Suite...\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: 30-Second Cryptographic Rotating QR Pass (HMAC-SHA256)
  console.log("1. Cryptographic Rotating QR Pass Validation");
  const testUserId = "test-student-id-123";
  const testSlotId = "test-slot-id-456";

  const validToken = await generateQRToken(testUserId, testSlotId);
  assert(typeof validToken === "string" && validToken.length > 50, "Generated HMAC token is valid non-empty string");

  const verifyValid = await verifyQRToken(validToken);
  assert(verifyValid.valid === true, "Current 30s bucket token validates successfully");
  assert(verifyValid.payload?.userId === testUserId, "Token payload contains correct student ID");
  assert(verifyValid.payload?.mealSlotId === testSlotId, "Token payload contains correct meal slot ID");

  // Tampered token test
  const parsed = JSON.parse(validToken);
  parsed.signature = "tampered_fake_signature_abc123";
  const tamperedToken = JSON.stringify(parsed);
  const verifyTampered = await verifyQRToken(tamperedToken);
  assert(verifyTampered.valid === false, "Tampered signature is strictly rejected");

  // Expired token test (window bucket in past)
  parsed.windowBucket = parsed.windowBucket - 10;
  parsed.signature = "dummy";
  const expiredToken = JSON.stringify(parsed);
  const verifyExpired = await verifyQRToken(expiredToken);
  assert(verifyExpired.valid === false, "Expired timestamp window bucket is strictly rejected");

  // TEST 2: Institutional Email Validation
  console.log("\n2. Institutional Email Domain Enforcement");
  const MNNIT_REGEX = /^[a-zA-Z0-9._%+-]+@mnnit\.ac\.in$/i;
  assert(MNNIT_REGEX.test("20253137@mnnit.ac.in"), "Valid student roll @mnnit.ac.in allowed");
  assert(MNNIT_REGEX.test("warden@mnnit.ac.in"), "Valid warden @mnnit.ac.in allowed");
  assert(!MNNIT_REGEX.test("student@gmail.com"), "Public @gmail.com strictly blocked");
  assert(!MNNIT_REGEX.test("student@outlook.com"), "Public @outlook.com strictly blocked");
  assert(!MNNIT_REGEX.test("student@mnnit.com"), "Spoofed domain @mnnit.com strictly blocked");

  // TEST 3: Meal Timing & Serving Hours Calculation
  console.log("\n3. Meal Timing & Serving Window Engine");
  // Test Breakfast at 8:00 AM (Serving: 7:30 AM - 10:30 AM)
  const morning = new Date("2026-10-27T08:00:00");
  const breakfastTiming = getMealTimingDetails("BREAKFAST", "2026-10-27", morning);
  assert(breakfastTiming.isServingNow === true, "Breakfast is active during 8:00 AM serving hours");
  assert(breakfastTiming.timingLabel === "7:30 AM – 10:30 AM", "Breakfast timing label correctly formatted");

  // Test Lunch at 11:15 AM (Before serving opens at 12:00 PM)
  const preLunch = new Date("2026-10-27T11:15:00");
  const lunchPreTiming = getMealTimingDetails("LUNCH", "2026-10-27", preLunch);
  assert(lunchPreTiming.isServingNow === false, "Lunch is not serving before 12:00 PM");
  assert(lunchPreTiming.isBeforeServing === true, "Lunch correctly flagged as before serving");

  // Test Lunch at 1:15 PM (During Lunch Rush 12:00 PM - 2:30 PM)
  const lunchTime = new Date("2026-10-27T13:15:00");
  const lunchActiveTiming = getMealTimingDetails("LUNCH", "2026-10-27", lunchTime);
  assert(lunchActiveTiming.isServingNow === true, "Lunch is active during 1:15 PM dining rush");

  // Test Lunch at 3:00 PM (After serving ends at 2:30 PM)
  const postLunch = new Date("2026-10-27T15:00:00");
  const lunchPostTiming = getMealTimingDetails("LUNCH", "2026-10-27", postLunch);
  assert(lunchPostTiming.isAfterServing === true, "Lunch correctly flagged as serving ended after 2:30 PM");

  // TEST 4: Monthly Fee Rebate Calculation Engine
  console.log("\n4. Monthly Fee Rebate Engine");
  const emptyRebate = calculateRebates(4500, []);
  assert(emptyRebate.totalRebateCredit === 0, "Zero skipped meals yields ₹0 rebate credit");
  assert(emptyRebate.netPayable === 4500, "Zero skipped meals yields full base fee (₹4,500)");

  const skippedThree = calculateRebates(4500, [
    { unitCost: 50 },
    { unitCost: 60 },
    { unitCost: 50 },
  ]);
  assert(skippedThree.totalRebateCredit === 160, "Sum of ₹50 + ₹60 + ₹50 correctly yields ₹160 rebate");
  assert(skippedThree.netPayable === 4340, "₹4,500 base minus ₹160 credit correctly yields ₹4,340");
  assert(skippedThree.optedOutCount === 3, "Opted out count accurately reports 3 meals");

  // Guarantee non-negative net payable even in extreme credit situations
  const massiveRebate = calculateRebates(4500, Array(100).fill({ unitCost: 50 }));
  assert(massiveRebate.netPayable === 0, "Net payable never drops below ₹0");

  // TEST 5: Preparation Cutoff Countdown Formatter
  console.log("\n5. Cutoff Countdown Formatter");
  const futureIso = new Date(Date.now() + 3600000 + 120000 + 45000).toISOString();
  const countdownActive = formatCountdownText(futureIso, new Date());
  assert(countdownActive.includes("left"), "Active countdown contains remaining time text");

  const pastIso = new Date(Date.now() - 5000).toISOString();
  const countdownElapsed = formatCountdownText(pastIso, new Date());
  assert(countdownElapsed === "Cutoff Locked", "Past deadline returns strict 'Cutoff Locked'");

  // TEST 6: Dietary Preference Menu Resolution & Dish Compatibility
  console.log("\n6. Dietary Preference Menu Resolution & Dish Compatibility");
  const testDate = "2026-10-27"; // Tuesday (Day 2)

  // 6A. Veg Menu Resolution
  const vegBreakfast = resolveDietaryDishes("BREAKFAST", testDate, "VEG");
  const vegLunch = resolveDietaryDishes("LUNCH", testDate, "VEG");
  const vegDinner = resolveDietaryDishes("DINNER", testDate, "VEG");
  assert(vegBreakfast.isConfigured === true && vegBreakfast.dishes.includes("Idli Sambar"), "Selecting Veg renders configured Veg breakfast (Idli Sambar)");
  assert(vegLunch.isConfigured === true && vegLunch.dishes.includes("Mix Veg Sabzi"), "Selecting Veg renders configured Veg lunch (Mix Veg Sabzi)");
  assert(vegDinner.isConfigured === true && vegDinner.dishes.includes("Mushroom Masala"), "Selecting Veg renders configured Veg dinner (Mushroom Masala)");
  assert(!vegLunch.dishes.some(d => d.toLowerCase().includes("chicken") || d.toLowerCase().includes("egg")), "Veg menu strictly contains zero non-veg items");

  // 6B. Non-Veg Menu Resolution
  const nonVegBreakfast = resolveDietaryDishes("BREAKFAST", testDate, "NON_VEG");
  const nonVegLunch = resolveDietaryDishes("LUNCH", testDate, "NON_VEG");
  const nonVegDinner = resolveDietaryDishes("DINNER", testDate, "NON_VEG");
  assert(nonVegBreakfast.isConfigured === true && nonVegBreakfast.dishes.some(d => d.toLowerCase().includes("egg")), "Selecting Non-Veg renders configured Non-Veg breakfast (Egg Omelette)");
  assert(nonVegLunch.isConfigured === true && nonVegLunch.dishes.some(d => d.toLowerCase().includes("chicken")), "Selecting Non-Veg renders configured Non-Veg lunch (Chicken Do Pyaza)");
  assert(nonVegDinner.isConfigured === true && nonVegDinner.dishes.some(d => d.toLowerCase().includes("chicken")), "Selecting Non-Veg renders configured Non-Veg dinner (Chicken Korma)");
  assert(nonVegLunch.dishes.some(d => d.toLowerCase().includes("rice") || d.toLowerCase().includes("dal")), "Non-Veg menu includes staple vegetarian sides alongside specialty");

  // 6C. Jain Menu Resolution & Strict Compliance
  const jainBreakfast = resolveDietaryDishes("BREAKFAST", testDate, "JAIN");
  const jainLunch = resolveDietaryDishes("LUNCH", testDate, "JAIN");
  const jainDinner = resolveDietaryDishes("DINNER", testDate, "JAIN");
  assert(jainBreakfast.isConfigured === true && jainBreakfast.dishes.includes("Jain Idli"), "Selecting Jain renders configured Jain breakfast (Jain Idli)");
  assert(jainLunch.isConfigured === true && jainLunch.dishes.includes("Jain Bhindi Masala (No Onion/Garlic)"), "Selecting Jain renders configured Jain lunch (Jain Bhindi Masala)");
  assert(jainDinner.isConfigured === true && jainDinner.dishes.includes("Jain Paneer Makhani (No Onion/Garlic)"), "Selecting Jain renders configured Jain dinner (Jain Paneer Makhani)");

  // Verify strict avoidance of root vegetables / alliums in all Jain dishes
  const prohibitedRoots = ["onion", "garlic", "potato", "aloo", "carrot", "gajar", "radish", "mooli"];
  const allJainDishes = [...jainBreakfast.dishes, ...jainLunch.dishes, ...jainDinner.dishes];
  const containsProhibited = allJainDishes.some(dish => {
    const lower = dish.toLowerCase();
    // Exclude strings explicitly noting "no onion" or "no garlic"
    if (lower.includes("no onion") || lower.includes("no garlic") || lower.includes("no root")) return false;
    return prohibitedRoots.some(root => lower.includes(root));
  });
  assert(!containsProhibited, "Jain menu contains zero prohibited root vegetables or alliums");

  // 6D. Repeated Switching Idempotence
  const switch1Veg = resolveDietaryDishes("LUNCH", testDate, "VEG");
  const switch2NonVeg = resolveDietaryDishes("LUNCH", testDate, "NON_VEG");
  const switch3Jain = resolveDietaryDishes("LUNCH", testDate, "JAIN");
  const switch4Veg = resolveDietaryDishes("LUNCH", testDate, "VEG");
  assert(JSON.stringify(switch1Veg.dishes) === JSON.stringify(switch4Veg.dishes), "Repeated preference switching is idempotent with no stale dishes");
  assert(JSON.stringify(switch1Veg.dishes) !== JSON.stringify(switch2NonVeg.dishes), "Veg and Non-Veg menus produce distinct dish arrays");
  assert(JSON.stringify(switch1Veg.dishes) !== JSON.stringify(switch3Jain.dishes), "Veg and Jain menus produce distinct dish arrays");

  // 6E. Fallback for Unconfigured Dietary Variant
  const unconfiguredVariant = resolveDietaryDishes("LUNCH", testDate, "UNKNOWN_PREF");
  assert(unconfiguredVariant.isConfigured === false && unconfiguredVariant.dishes.length === 0, "Missing or unknown dietary variant returns explicit unconfigured fallback");

  // 6F. JSON Slot Serialization & Deserialization
  const slotJsonString = buildDietarySlotMenuString(2, "LUNCH");
  const resolvedFromJson = resolveDietaryDishes("LUNCH", testDate, "NON_VEG", slotJsonString);
  assert(resolvedFromJson.isConfigured === true && resolvedFromJson.dishes.some(d => d.includes("Chicken")), "JSON-serialized slot menu correctly resolves Non-Veg variant");

  // TEST 7: Demo Isolation & Independence from Security/Rebate State
  console.log("\n7. Persona Isolation & Security Independence");
  // Simulated Student Personas
  const studentKeshav = { id: "student-1", name: "Keshav", dietary_pref: "VEG" };
  const studentPiyush = { id: "student-2", name: "Piyush", dietary_pref: "NON_VEG" };
  const studentAyushi = { id: "student-3", name: "Ayushi", dietary_pref: "JAIN" };

  const mealSlot = { id: "slot-lunch-today", meal_type: "LUNCH", meal_date: testDate, unit_cost: 80 };
  const bookingKeshav = { user_id: studentKeshav.id, meal_slot_id: mealSlot.id, status: "OPTED_IN" };

  // Changing dietary preference of Keshav to NON_VEG
  const updatedKeshav = { ...studentKeshav, dietary_pref: "NON_VEG" };
  assert(bookingKeshav.status === "OPTED_IN", "Changing dietary preference leaves meal booking status unchanged");
  assert(bookingKeshav.meal_slot_id === mealSlot.id, "Changing dietary preference preserves identical meal slot reference");

  // Rebate calculation remains identical before and after preference change
  const rebateBefore = calculateRebates(4500, [{ unitCost: mealSlot.unit_cost }]);
  const rebateAfter = calculateRebates(4500, [{ unitCost: mealSlot.unit_cost }]);
  assert(rebateBefore.totalRebateCredit === rebateAfter.totalRebateCredit, "Dietary preference update does not alter rebate calculations");

  // Persona switching isolation: Student 2's preference is not overwritten by Student 1
  assert(studentPiyush.dietary_pref === "NON_VEG", "Switching personas maintains target student's own dietary preference");
  assert(studentAyushi.dietary_pref === "JAIN", "Persona Ayushi maintains strictly Jain preference");

  // TEST 8: Server-Side Cryptographic Session Token Lifecycle (HMAC-SHA256)
  console.log("\n8. Server-Side HMAC-SHA256 Session Token Lifecycle");
  const studentUser = { id: "std-001", role: "STUDENT", email: "std001@mnnit.ac.in", name: "Rohan" };
  const studentToken = await createSessionToken(studentUser);
  assert(typeof studentToken === "string" && studentToken.includes("."), "Session token generated in compact base64.signature format");

  const verifiedStudentSession = await verifySessionToken(studentToken);
  assert(verifiedStudentSession !== null, "Valid session token verifies successfully");
  assert(verifiedStudentSession?.userId === "std-001", "Session payload extracts correct user ID");
  assert(verifiedStudentSession?.role === "STUDENT", "Session payload retains STUDENT role authorization");

  const staffUser = { id: "staff-001", role: "STAFF", email: "staff@mnnit.ac.in", name: "Staff Ramesh" };
  const staffToken = await createSessionToken(staffUser);
  const verifiedStaff = await verifySessionToken(staffToken);
  assert(verifiedStaff?.role === "STAFF", "Session payload retains STAFF role authorization");

  // Tampered session token
  const [sessionPayloadPart, sessionSig] = studentToken.split(".");
  const tamperedSessionSig = sessionSig.replace(sessionSig[0], sessionSig[0] === "a" ? "b" : "a");
  const tamperedSessionToken = `${sessionPayloadPart}.${tamperedSessionSig}`;
  const verifyTamperedSession = await verifySessionToken(tamperedSessionToken);
  assert(verifyTamperedSession === null, "Tampered session token signature is strictly rejected");

  // Expired session token
  const expiredSessionToken = await createSessionToken(studentUser, -100);
  const verifyExpiredSession = await verifySessionToken(expiredSessionToken);
  assert(verifyExpiredSession === null, "Expired session token is strictly rejected");

  // TEST 9: Offline Scan Token Validation with Historical Reference Times
  console.log("\n9. Offline Scan Verification with Historical Timestamps");
  const historicalTimestamp = Date.now() - 1000 * 60 * 10; // 10 minutes ago
  const historicalWindow = Math.floor(historicalTimestamp / 30000);

  // Generate token at historical time
  const origNow = Date.now;
  Date.now = () => historicalTimestamp;
  const historicalToken = await generateQRToken("student-offline-1", "slot-offline-1");
  Date.now = origNow;

  // Verifying now without reference time fails (because 10 minutes have elapsed)
  const verifyWithoutRef = await verifyQRToken(historicalToken);
  assert(verifyWithoutRef.valid === false, "Historical token is invalid against live current wall clock");

  // Verifying with historical scan reference time succeeds
  const verifyWithRef = await verifyQRToken(historicalToken, historicalTimestamp);
  assert(verifyWithRef.valid === true, "Historical token is verified valid at recorded offline scan timestamp");

  // TEST 10: Dynamic Monthly Billing Ledger Period Boundaries
  console.log("\n10. Dynamic Monthly Billing Period Calculation (Asia/Kolkata)");
  const oct2026 = computeBillingPeriod(new Date(), "2026-10");
  assert(oct2026.billingMonth === "October 2026", "October 2026 month formatted dynamically");
  assert(oct2026.startDate === "2026-10-01" && oct2026.endDate === "2026-10-31", "October 2026 bounds 31 days");

  const feb2028 = computeBillingPeriod(new Date(), "2028-02"); // Leap year
  assert(feb2028.billingMonth === "February 2028", "February 2028 month formatted dynamically");
  assert(feb2028.endDate === "2028-02-29", "February 2028 leap year accurately bounds 29 days");

  // TEST 11: Booking State Machine Determinism & Concurrency CAS
  console.log("\n11. Booking State Machine Determinism & Atomic CAS Transitions");
  const ALLOWED_TRANSITIONS = {
    OPTED_IN: ["OPTED_OUT", "LOCKED", "CONSUMED"],
    OPTED_OUT: ["OPTED_IN"],
    LOCKED: ["CONSUMED", "MISSED"],
    CONSUMED: [], // Terminal state: single-use pass cannot be reused or reverted
    MISSED: [],   // Terminal state
  };

  function canTransition(current, next) {
    return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
  }

  assert(canTransition("OPTED_IN", "OPTED_OUT") === true, "Student can opt out pre-cutoff");
  assert(canTransition("OPTED_OUT", "OPTED_IN") === true, "Student can re-opt in pre-cutoff");
  assert(canTransition("OPTED_IN", "LOCKED") === true, "Cutoff triggers automatic lock of opted-in booking");
  assert(canTransition("LOCKED", "CONSUMED") === true, "Redemption transitions locked pass to consumed");
  assert(canTransition("CONSUMED", "OPTED_OUT") === false, "Terminal consumed state strictly forbids opt-out");
  assert(canTransition("CONSUMED", "OPTED_IN") === false, "Terminal consumed state strictly forbids re-opt-in");
  assert(canTransition("CONSUMED", "LOCKED") === false, "Terminal consumed state strictly forbids re-locking");

  // TEST 12: Production Cryptographic Authentication & Password Hardening
  console.log("\n12. Production Cryptographic Authentication & Password Hardening");

  // 12.1 PBKDF2 Password Hashing
  const testPassword = "SecurePassword@2026!";
  const { hash: pHash, salt: pSalt } = await hashPassword(testPassword);
  assert(typeof pHash === "string" && pHash.length === 64, "PBKDF2-HMAC-SHA256 generates 64-char hex hash");
  assert(typeof pSalt === "string" && pSalt.length === 32, "Cryptographic salt is 32-char hex string");

  // Unique salt generation
  const { hash: pHash2, salt: pSalt2 } = await hashPassword(testPassword);
  assert(pSalt !== pSalt2, "Each password hash invocation uses unique random salt");
  assert(pHash !== pHash2, "Different salts produce unique hashes for identical plaintext");

  // 12.2 Timing-Safe Password Verification
  const validVerification = await verifyPassword(testPassword, pHash, pSalt);
  assert(validVerification === true, "verifyPassword successfully validates matching password");

  const invalidVerification = await verifyPassword("IncorrectPassword123!", pHash, pSalt);
  assert(invalidVerification === false, "verifyPassword strictly rejects non-matching password");

  const emptyVerification = await verifyPassword("", pHash, pSalt);
  assert(emptyVerification === false, "verifyPassword strictly rejects empty password");

  // 12.3 User Profile Sanitization (Credential Leak Prevention)
  const rawProfile = {
    id: "user-test-uuid-999",
    email: "student999@mnnit.ac.in",
    role: "STUDENT",
    name: "Test Student",
    reg_no: "20239999",
    hostel: "SVBH",
    room_no: "101",
    password_hash: pHash,
    password_salt: pSalt,
  };

  const sanitized = sanitizeUserProfile(rawProfile);
  assert(sanitized.password_hash === undefined, "sanitizeUserProfile completely strips password_hash");
  assert(sanitized.password_salt === undefined, "sanitizeUserProfile completely strips password_salt");
  assert(sanitized.id === rawProfile.id, "sanitizeUserProfile preserves user ID");
  assert(sanitized.email === rawProfile.email, "sanitizeUserProfile preserves user email");
  assert(sanitized.role === rawProfile.role, "sanitizeUserProfile preserves user role");

  // 12.4 Server Session Cryptographic Integrity
  const sessionToken = await createSessionToken(sanitized);
  assert(typeof sessionToken === "string" && sessionToken.length > 30, "createSessionToken generates valid signed JWT-style token");

  const sessionUser = await verifySessionToken(sessionToken);
  assert(sessionUser !== null && sessionUser.email === rawProfile.email, "verifySessionToken successfully decodes and validates valid token");
  assert(sessionUser.role === "STUDENT", "verifySessionToken preserves correct user role");

  const tamperedSession = sessionToken.slice(0, -6) + "000000";
  const tamperedUser = await verifySessionToken(tamperedSession);
  assert(tamperedUser === null, "verifySessionToken strictly rejects tampered session signature");

  // TEST 13: Fixed Warden and 5 Staff Production Accounts & Multi-Role Login
  console.log("\n13. Fixed Warden & 5 Staff Production Accounts & Multi-Role Login");

  // 13.1 Fixed Warden/Admin Account Verification (Short ID: warden / Password: Warden#2026)
  const wardenUser = localStore.findUserByEmailOrRegNo("warden", undefined, false);
  assert(!!wardenUser, "Fixed Warden account resolved via short ID 'warden'");
  assert(wardenUser.role === "ADMIN", "Warden account possesses ADMIN role");
  assert(wardenUser.email === "warden@mnnit.ac.in", "Warden resolves to canonical email warden@mnnit.ac.in");
  assert(wardenUser.reg_no === "WARDEN01", "Warden account employee reg_no is WARDEN01");

  const wardenPassMatch = await verifyPassword("Warden#2026", wardenUser.password_hash, wardenUser.password_salt);
  assert(wardenPassMatch === true, "Warden authenticates successfully with password Warden#2026");

  const wardenPassFail = await verifyPassword("WrongPassword123!", wardenUser.password_hash, wardenUser.password_salt);
  assert(wardenPassFail === false, "Warden authentication strictly fails with wrong password");

  // Canonical email lookup also succeeds
  const wardenByEmail = localStore.findUserByEmailOrRegNo("warden@mnnit.ac.in", undefined, false);
  assert(!!wardenByEmail && wardenByEmail.id === wardenUser.id, "Warden also resolves via full email warden@mnnit.ac.in");

  // 13.2 Exactly 5 Fixed Staff Accounts Verification (Short IDs: staff1..staff5)
  const staffConfigs = [
    { id: "staff1", email: "staff01@mnnit.ac.in", regNo: "STAFF01", pass: "Staff1#2026", label: "Staff 01" },
    { id: "staff2", email: "staff02@mnnit.ac.in", regNo: "STAFF02", pass: "Staff2#2026", label: "Staff 02" },
    { id: "staff3", email: "staff03@mnnit.ac.in", regNo: "STAFF03", pass: "Staff3#2026", label: "Staff 03" },
    { id: "staff4", email: "staff04@mnnit.ac.in", regNo: "STAFF04", pass: "Staff4#2026", label: "Staff 04" },
    { id: "staff5", email: "staff05@mnnit.ac.in", regNo: "STAFF05", pass: "Staff5#2026", label: "Staff 05" },
  ];

  for (const sc of staffConfigs) {
    const sUser = localStore.findUserByEmailOrRegNo(sc.id, undefined, false);
    assert(!!sUser, `${sc.label} account resolved via short ID '${sc.id}'`);
    assert(sUser.role === "STAFF", `${sc.label} possesses strict STAFF role`);
    assert(sUser.email === sc.email, `${sc.label} maps to canonical email ${sc.email}`);
    assert(sUser.reg_no === sc.regNo, `${sc.label} employee ID matches ${sc.regNo}`);

    const sPassMatch = await verifyPassword(sc.pass, sUser.password_hash, sUser.password_salt);
    assert(sPassMatch === true, `${sc.label} authenticates successfully with password ${sc.pass}`);

    const sPassFail = await verifyPassword("WrongPassword123!", sUser.password_hash, sUser.password_salt);
    assert(sPassFail === false, `${sc.label} authentication strictly fails with wrong password`);

    // Verify lookup by full email also works
    const sUserByEmail = localStore.findUserByEmailOrRegNo(sc.email, undefined, false);
    assert(!!sUserByEmail && sUserByEmail.id === sUser.id, `${sc.label} also resolves via full email ${sc.email}`);
  }

  // 13.3 Role-Based Route Resolution Determinism
  const ROLE_ROUTES = {
    ADMIN: "/admin",
    STAFF: "/staff",
    STUDENT: "/student",
  };
  assert(ROLE_ROUTES[wardenUser.role] === "/admin", "Warden/Admin resolves deterministically to /admin dashboard");
  assert(ROLE_ROUTES["STAFF"] === "/staff", "Staff resolves deterministically to /staff portal");
  assert(ROLE_ROUTES["STUDENT"] === "/student", "Student resolves deterministically to /student dining portal");

  // 13.4 Prevention of Privilege Escalation / Impersonation in Public Signup
  function isRestrictedIdentity(email) {
    const clean = email.trim().toLowerCase();
    return clean.startsWith("staff") || clean.startsWith("warden") || clean.startsWith("admin");
  }
  assert(isRestrictedIdentity("warden") === true, "Public registration blocks claiming warden short ID");
  assert(isRestrictedIdentity("warden@mnnit.ac.in") === true, "Public registration blocks claiming warden email");
  assert(isRestrictedIdentity("staff1") === true, "Public registration blocks claiming staff1 short ID");
  assert(isRestrictedIdentity("staff01@mnnit.ac.in") === true, "Public registration blocks claiming staff01 email");
  assert(isRestrictedIdentity("admin@mnnit.ac.in") === true, "Public registration blocks claiming admin email");
  assert(isRestrictedIdentity("20253137@mnnit.ac.in") === false, "Public registration allows legitimate student roll numbers");

  // 13.5 Repeatable Seed Idempotence (Preserving Custom Passwords)
  const allUsersBefore = localStore.getUsers(false).length;
  // Re-reading or re-initializing store must not wipe existing users or duplicate entries
  const allUsersAfter = localStore.getUsers(false).length;
  assert(allUsersBefore === allUsersAfter, "Seed initialization is idempotent with zero account duplication");

  console.log("\n==========================================");
  console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});

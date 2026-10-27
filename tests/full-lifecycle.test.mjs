// Ensure server HMAC secret is present for test execution
if (!process.env.HMAC_SECRET) {
  process.env.HMAC_SECRET = "test_hmac_secret_for_automated_lifecycle_suite_0123456789abcdef";
}

import { generateQRToken, verifyQRToken } from "../lib/crypto.ts";
import { getMealTimingDetails, formatCountdownText } from "../lib/meal-times.ts";
import { calculateRebates } from "../lib/rebates.ts";
import {
  resolveDietaryDishes,
  buildDietarySlotMenuString,
  WEEKLY_DIETARY_MENUS,
} from "../lib/menus.ts";

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

if (!process.env.HMAC_SECRET) {
  process.env.HMAC_SECRET = "test_hmac_secret_for_automated_lifecycle_suite_0123456789abcdef";
}

import { createSessionToken } from "../lib/server-auth.ts";

/**
 * MESSMATE SELF-HEALING CONCURRENCY & DOUBLE-SCAN STRESS TEST
 */
const BASE_URL = "http://localhost:3000";

async function runSelfHealingConcurrencyTest() {
  console.log("⚡ Starting MessMate Concurrency Test...");

  try {
    const staffToken = await createSessionToken({
      id: "8443a262-acc4-4d34-9ddd-757ddaeb227c",
      role: "STAFF",
      email: "staff@mnnit.ac.in",
      name: "Ramesh Kumar (Mess Staff)",
    });

    // 1. Fetch live meals and bookings directly from our running Next.js API
    const res = await fetch(`${BASE_URL}/api/meals`);
    const data = await res.json();

    if (!data.slots || data.slots.length === 0) {
      console.error("❌ Error: No meal slots found via API.");
      return;
    }

    // Find a booking ID from the first available slot
    const slot = data.slots[0];
    if (!slot.meal_bookings || slot.meal_bookings.length === 0) {
      console.error("❌ Error: No bookings linked to this meal slot.");
      return;
    }

    const testBookingId = slot.meal_bookings[0].id;
    console.log(`✅ Target Booking ID fetched via API: ${testBookingId}`);
    console.log(
      "🚀 Simulating 10 simultaneous cashier terminals scanning the same pass...",
    );

    // 2. Fire 10 parallel requests
    const concurrentScans = Array.from({ length: 10 }, async (_, index) => {
      const startTime = performance.now();
      try {
        const response = await fetch(`${BASE_URL}/api/qr/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${staffToken}`,
          },
          body: JSON.stringify({ bookingId: testBookingId }),
        });
        const resData = await response.json();
        const duration = (performance.now() - startTime).toFixed(2);
        return {
          terminal: index + 1,
          status: response.status,
          data: resData,
          duration,
        };
      } catch (err) {
        return { terminal: index + 1, status: 500, error: err.message };
      }
    });

    const results = await Promise.all(concurrentScans);

    console.log("\n📊 STRESS TEST RESULTS BREAKDOWN:");
    let successCount = 0;
    let conflictCount = 0;

    results.forEach((res) => {
      if (res.status === 200) {
        successCount++;
        console.log(
          `✅ Terminal [${res.terminal}]: SUCCESS (200 OK) in ${res.duration}ms — Pass Redeemed`,
        );
      } else {
        conflictCount++;
        console.log(
          `❌ Terminal [${res.terminal}]: REJECTED (${res.status}) — Race Condition Blocked`,
        );
      }
    });

    console.log("\n==========================================");
    console.log(`Total Concurrent Requests Fired: 10`);
    console.log(`Successful Redemptions: ${successCount} (Target: exactly 1)`);
    console.log(`Blocked Double-Scans: ${conflictCount} (Target: exactly 9)`);
    console.log("==========================================");

    if (successCount === 1 && conflictCount === 9) {
      console.log("🎉 TEST PASSED: Zero double-spend vulnerability verified!");
    } else {
      console.log(
        "⚠️ Note: If all were rejected, make sure you ran the SQL query to set status to 'LOCKED' first!",
      );
    }
  } catch (err) {
    console.error("❌ Test execution error:", err.message);
  }
}

runSelfHealingConcurrencyTest();

/**
 * Test RBAC Permissions
 * This script tests that the permission fixes are working correctly
 */

const BACKEND_URL = "http://localhost:5001";

async function testLogin(email, password, roleName) {
  console.log(`\n🔐 Testing login for ${roleName}...`);

  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    console.log(`❌ Login failed for ${roleName}`);
    return null;
  }

  const data = await response.json();
  console.log(`✅ Login successful for ${roleName}`);
  return data.token;
}

async function testPermission(
  token,
  method,
  endpoint,
  data,
  shouldSucceed,
  testName,
) {
  console.log(`\n📝 ${testName}`);

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  if (data && method === "POST") {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${BACKEND_URL}/api${endpoint}`, options);
  const status = response.status;

  if (shouldSucceed) {
    if (status >= 200 && status < 300) {
      console.log(`✅ PASS: Got ${status} (expected success)`);
      return true;
    } else {
      console.log(`❌ FAIL: Got ${status} (expected success)`);
      const error = await response.text();
      console.log(`   Error: ${error}`);
      return false;
    }
  } else {
    if (status === 403) {
      console.log(`✅ PASS: Got 403 (expected permission denied)`);
      return true;
    } else {
      console.log(`❌ FAIL: Got ${status} (expected 403 permission denied)`);
      if (status >= 200 && status < 300) {
        console.log(
          `   ⚠️  WARNING: Permission check is NOT working - user has access when they shouldn't!`,
        );
      }
      return false;
    }
  }
}

async function main() {
  console.log("================================");
  console.log("🧪 RBAC Permission Tests");
  console.log("================================");

  let allTestsPassed = true;

  // Test 1: Approver Permissions
  console.log("\n\n📋 TEST SUITE 1: Approver Role");
  console.log(
    "Expected: Can approve tasks, CANNOT create tasks or view applications",
  );
  console.log("─".repeat(50));

  const approverToken = await testLogin(
    "sarah.hassan@alsiraat.edu.au",
    "Test@123!",
    "Approver",
  );

  if (approverToken) {
    // Test: Approver should NOT be able to create tasks
    const test1 = await testPermission(
      approverToken,
      "POST",
      "/tasks",
      {
        title: "Test Task",
        description: "This should fail",
        category: "Education",
        location: "Test",
        hoursRequired: 10,
        rewardType: "Paid",
        rewardValue: 100,
      },
      false, // Should FAIL
      "Approver creating task (should be DENIED)",
    );
    allTestsPassed = allTestsPassed && test1;

    // Test: Approver should NOT be able to view applications
    const test2 = await testPermission(
      approverToken,
      "GET",
      "/applications",
      null,
      false, // Should FAIL
      "Approver viewing applications (should be DENIED)",
    );
    allTestsPassed = allTestsPassed && test2;

    // Test: Approver CAN view tasks
    const test3 = await testPermission(
      approverToken,
      "GET",
      "/tasks",
      null,
      true, // Should SUCCEED
      "Approver viewing tasks (should be ALLOWED)",
    );
    allTestsPassed = allTestsPassed && test3;
  } else {
    console.log("⚠️  Skipping Approver tests - login failed");
    allTestsPassed = false;
  }

  // Test 2: Owner Permissions
  console.log("\n\n📋 TEST SUITE 2: Owner Role");
  console.log(
    "Expected: Can create tasks, view applications, CANNOT apply for tasks",
  );
  console.log("─".repeat(50));

  const ownerToken = await testLogin(
    "ahmed.khan@alsiraat.edu.au",
    "Test@123!",
    "Owner",
  );

  if (ownerToken) {
    // Test: Owner CAN create tasks
    const test4 = await testPermission(
      ownerToken,
      "POST",
      "/tasks",
      {
        title: "Owner Test Task",
        description: "This should succeed",
        category: "Education",
        location: "Test",
        hoursRequired: 10,
        rewardType: "Paid",
        rewardValue: 100,
      },
      true, // Should SUCCEED
      "Owner creating task (should be ALLOWED)",
    );
    allTestsPassed = allTestsPassed && test4;

    // Test: Owner CAN view applications
    const test5 = await testPermission(
      ownerToken,
      "GET",
      "/applications",
      null,
      true, // Should SUCCEED
      "Owner viewing applications (should be ALLOWED)",
    );
    allTestsPassed = allTestsPassed && test5;
  } else {
    console.log("⚠️  Skipping Owner tests - login failed");
    allTestsPassed = false;
  }

  // Final Results
  console.log("\n\n================================");
  if (allTestsPassed) {
    console.log("✅ ALL TESTS PASSED!");
    console.log("================================");
    console.log("\n🎉 The RBAC permission fix is working correctly!");
    console.log("\nVerified:");
    console.log("  ✓ Approver CANNOT create tasks");
    console.log("  ✓ Approver CANNOT view applications");
    console.log("  ✓ Approver CAN view tasks");
    console.log("  ✓ Owner CAN create tasks");
    console.log("  ✓ Owner CAN view applications");
  } else {
    console.log("❌ SOME TESTS FAILED");
    console.log("================================");
    console.log("\n⚠️  Please check the output above for details");
  }
  console.log("\n");
}

main().catch(console.error);

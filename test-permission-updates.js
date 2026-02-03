/**
 * Test Permission Updates from Admin Panel
 * Verifies that permission changes via admin API are immediately reflected
 */

const BACKEND_URL = "http://localhost:5001";

async function login(email, password) {
  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  return data.token;
}

async function getRole(token, roleCode) {
  const response = await fetch(`${BACKEND_URL}/api/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const roles = await response.json();
  return roles.find((r) => r.code === roleCode);
}

async function updateRole(token, roleId, permissions) {
  const response = await fetch(`${BACKEND_URL}/api/roles/${roleId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ permissions }),
  });

  return response.json();
}

async function testPermission(token, endpoint, method = "GET") {
  const response = await fetch(`${BACKEND_URL}/api${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body:
      method === "POST"
        ? JSON.stringify({
            title: "Test Task",
            description: "Test",
            category: "Testing",
            location: "Test",
            hoursRequired: 1,
            rewardType: "Volunteer",
          })
        : undefined,
  });

  return {
    status: response.status,
    ok: response.ok,
  };
}

async function main() {
  console.log("\n" + "═".repeat(60));
  console.log("🧪 PERMISSION UPDATE TEST");
  console.log("═".repeat(60));

  // Login as admin
  console.log("\n🔐 Logging in as Admin...");
  const adminToken = await login("admin@alsiraat.edu.au", "Test@123!");
  console.log("✅ Admin logged in");

  // Get Approver role
  console.log("\n📋 Fetching Approver role...");
  let approverRole = await getRole(adminToken, "approver");
  console.log(`✅ Found Approver role: ${approverRole.name}`);
  console.log(`   Current permissions: ${approverRole.permissions.join(", ")}`);

  // Save original permissions
  const originalPermissions = [...approverRole.permissions];

  // Add task:create permission temporarily
  console.log("\n📝 Adding task:create permission to Approver role...");
  const newPermissions = [...approverRole.permissions, "task:create"];
  await updateRole(adminToken, approverRole._id, newPermissions);
  console.log("✅ Permission updated in database");

  // Login as approver
  console.log("\n🔐 Logging in as Approver...");
  const approverToken = await login(
    "sarah.hassan@alsiraat.edu.au",
    "Test@123!",
  );
  console.log("✅ Approver logged in");

  // Test if approver can now create tasks
  console.log("\n🧪 Testing if permission change is reflected...");
  const result = await testPermission(approverToken, "/tasks", "POST");

  if (result.ok) {
    console.log(
      "✅ PASS: Approver can now create tasks (permission update worked!)",
    );
  } else if (result.status === 403) {
    console.log(
      "❌ FAIL: Approver still denied (permission update NOT reflected)",
    );
    console.log("   This indicates a caching issue!");
  } else {
    console.log(`⚠️  Got status ${result.status}`);
  }

  // Restore original permissions
  console.log("\n🔄 Restoring original Approver permissions...");
  await updateRole(adminToken, approverRole._id, originalPermissions);
  console.log("✅ Permissions restored");

  // Verify restoration worked
  console.log("\n🧪 Verifying permission removal...");
  const result2 = await testPermission(approverToken, "/tasks", "POST");

  if (result2.status === 403) {
    console.log(
      "✅ PASS: Approver correctly denied again after permission removal",
    );
  } else if (result2.ok) {
    console.log(
      "❌ FAIL: Approver can still create tasks (cache not cleared!)",
    );
  }

  console.log("\n" + "═".repeat(60));
  console.log("📊 TEST COMPLETE");
  console.log("═".repeat(60) + "\n");
}

main().catch(console.error);

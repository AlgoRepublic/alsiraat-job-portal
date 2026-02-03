/**
 * Automatic Permission Seeder
 *
 * This script automatically:
 * 1. Logs in as admin
 * 2. Seeds the correct permissions
 * 3. Verifies the changes
 */

const BACKEND_URL = "http://localhost:5001";
const ADMIN_EMAIL = "admin@alsiraat.edu.au";
const ADMIN_PASSWORD = "Test@123!";

async function login() {
  console.log("🔐 Logging in as admin...");

  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log("✅ Login successful");
  return data.token;
}

async function seedPermissions(token) {
  console.log("\n🌱 Seeding permissions...");

  const response = await fetch(`${BACKEND_URL}/api/roles/seed`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Seed failed: ${response.status} ${response.statusText}\n${error}`,
    );
  }

  const data = await response.json();
  console.log("✅ Permissions seeded successfully");
  console.log(`   - ${data.permissions} permissions created`);
  console.log(`   - ${data.roles} roles created`);
  return data;
}

async function verifyApproverRole(token) {
  console.log("\n🔍 Verifying Approver role...");

  const response = await fetch(`${BACKEND_URL}/api/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch roles: ${response.status}`);
  }

  const roles = await response.json();
  const approverRole = roles.find((r) => r.code === "approver");

  if (!approverRole) {
    console.log("❌ Approver role not found!");
    return false;
  }

  console.log("✅ Approver role found");
  console.log("   Permissions:", approverRole.permissions);

  const expectedPermissions = [
    "task:read",
    "task:approve",
    "task:publish",
    "org:read",
    "dashboard:view",
  ];

  const hasTaskCreate = approverRole.permissions.includes("task:create");
  const hasAppRead = approverRole.permissions.includes("application:read");
  const hasAppShortlist = approverRole.permissions.includes(
    "application:shortlist",
  );

  if (hasTaskCreate || hasAppRead || hasAppShortlist) {
    console.log("❌ FAIL: Approver has incorrect permissions!");
    if (hasTaskCreate) console.log("   - Should NOT have: task:create");
    if (hasAppRead) console.log("   - Should NOT have: application:read");
    if (hasAppShortlist)
      console.log("   - Should NOT have: application:shortlist");
    return false;
  }

  const hasAllExpected = expectedPermissions.every((p) =>
    approverRole.permissions.includes(p),
  );

  if (!hasAllExpected) {
    console.log("❌ FAIL: Approver missing required permissions!");
    expectedPermissions.forEach((p) => {
      if (!approverRole.permissions.includes(p)) {
        console.log(`   - Missing: ${p}`);
      }
    });
    return false;
  }

  console.log("✅ PASS: Approver has correct permissions!");
  return true;
}

async function main() {
  console.log("================================");
  console.log("RBAC Permission Auto-Seeder");
  console.log("================================\n");

  try {
    // Step 1: Login
    const token = await login();

    // Step 2: Seed permissions
    await seedPermissions(token);

    // Step 3: Verify
    const isCorrect = await verifyApproverRole(token);

    console.log("\n================================");
    if (isCorrect) {
      console.log("✅ SUCCESS: All permissions are correct!");
      console.log("================================\n");
      console.log("Next steps:");
      console.log("1. Restart your backend server");
      console.log("2. Test by logging in as Approver");
      console.log("3. Verify Approver cannot create tasks");
    } else {
      console.log("❌ FAILED: Permissions are not correct");
      console.log("================================\n");
      console.log("Please check the database manually:");
      console.log('db.roles.find({ code: "approver" }).pretty()');
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.log("\nTroubleshooting:");
    console.log("1. Is the backend running on port 5000?");
    console.log("2. Is the admin account set up correctly?");
    console.log("3. Check backend logs for errors");
    process.exit(1);
  }
}

main();

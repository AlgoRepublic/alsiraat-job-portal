/**
 * Seed Reward Types Script
 * Run this to populate default reward types
 */

const BACKEND_URL = "http://localhost:5001";

async function login(email, password) {
  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  return data;
}

async function seedRewardTypes(token, organisationId) {
  console.log("🌱 Seeding default reward types...");

  const orgQ = organisationId
    ? `?organisation=${encodeURIComponent(organisationId)}`
    : "";
  const response = await fetch(
    `${BACKEND_URL}/api/reward-types/seed/defaults${orgQ}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

async function getRewardTypes(token, organisationId) {
  console.log("\n📋 Fetching reward types...");

  const orgQ = organisationId
    ? `?organisation=${encodeURIComponent(organisationId)}`
    : "";
  const response = await fetch(`${BACKEND_URL}/api/reward-types${orgQ}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

async function main() {
  console.log("\n" + "═".repeat(60));
  console.log("🎁 REWARD TYPES SEEDER");
  console.log("═".repeat(60));

  try {
    // Login as admin
    console.log("\n🔐 Logging in as admin...");
    const loginData = await login("admin@alsiraat.edu.au", "Test@123!");
    const token = loginData.token;
    const orgId =
      loginData.user?.activeOrganisation?._id ||
      loginData.user?.activeOrganisation ||
      loginData.user?.organisations?.[0]?._id ||
      loginData.user?.organisations?.[0];
    if (!orgId) {
      throw new Error(
        "No active organisation on user — select an organisation in the app first",
      );
    }
    console.log("✅ Logged in");

    // Seed reward types
    const result = await seedRewardTypes(token, String(orgId));
    console.log(`✅ ${result.message}`);
    console.log(`   Seeded ${result.count} reward types`);

    // Fetch and display reward types
    const rewardTypes = await getRewardTypes(token, String(orgId));
    console.log(`✅ Found ${rewardTypes.length} reward types:\n`);

    rewardTypes.forEach((rt) => {
      console.log(`   ${rt.name} (${rt.code})`);
      console.log(`   - ${rt.description}`);
      console.log(`   - Requires value: ${rt.requiresValue ? "Yes" : "No"}`);
      console.log(`   - Color: ${rt.color}`);
      console.log("");
    });

    console.log("═".repeat(60));
    console.log("✅ SUCCESS: Reward types ready to use!");
    console.log("═".repeat(60) + "\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

main();

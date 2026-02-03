/**
 * Seed Task Categories Script
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

async function seedCategories(token) {
  console.log("🌱 Seeding default task categories...");

  const response = await fetch(
    `${BACKEND_URL}/api/task-categories/seed/defaults`,
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

async function getCategories() {
  console.log("\n📋 Fetching task categories...");

  const response = await fetch(`${BACKEND_URL}/api/task-categories`);
  return response.json();
}

async function main() {
  console.log("\n" + "═".repeat(60));
  console.log("📂 TASK CATEGORIES SEEDER");
  console.log("═".repeat(60));

  try {
    const token = await login("admin@alsiraat.edu.au", "Test@123!");
    console.log("✅ Logged in as admin");

    const result = await seedCategories(token);
    console.log(`✅ ${result.message}`);
    console.log(`   Seeded ${result.count} categories`);

    const categories = await getCategories();
    console.log(`✅ Found ${categories.length} categories:\n`);

    categories.forEach((cat) => {
      console.log(`   ${cat.icon} ${cat.name} (${cat.code})`);
      console.log(`      - ${cat.description}`);
      console.log(`      - Color: ${cat.color}`);
      console.log("");
    });

    console.log("═".repeat(60));
    console.log("✅ SUCCESS: Task categories ready!");
    console.log("═".repeat(60) + "\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

main();

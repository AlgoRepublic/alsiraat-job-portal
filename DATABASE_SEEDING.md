# Database Seeding Guide

## 🌱 Seeding Database After Deployment

After deploying to Cloud Run or EasyPanel, you need to seed the database with initial data (organizations, users, tasks).

---

## Method 1: From Local Machine (Easiest)

This method runs the seed script locally but connects to your production MongoDB.

### Steps:

```bash
# 1. Go to backend folder
cd backend

# 2. Build the project
npm run build

# 3. Set production MongoDB URI (temporary)
export MONGODB_URI="mongodb+srv://your-user:your-password@cluster.mongodb.net/tasker"

# 4. Run production seed script
npm run seed:prod

# 5. Clean up
unset MONGODB_URI
```

**Output should show:**

```
✅ Connected to MongoDB
🗑️  Clearing existing data...
🏫 Creating organizations...
👥 Creating users...
📋 Creating tasks...
✅ Seeding completed!
```

---

## Method 2: Cloud Run Job (One-time execution)

Run the seed script as a one-time Cloud Run job.

### Steps:

```bash
# 1. Create a Cloud Run Job
gcloud run jobs create tasker-seed \
  --image gcr.io/YOUR_PROJECT_ID/tasker-app:latest \
  --region us-central1 \
  --set-env-vars "MONGODB_URI=mongodb+srv://...,NODE_ENV=production" \
  --command "npm" \
  --args "run,seed:prod" \
  --max-retries 0

# 2. Execute the job
gcloud run jobs execute tasker-seed --region us-central1

# 3. View logs
gcloud run jobs executions list --job tasker-seed --region us-central1
gcloud run jobs executions logs read tasker-seed-xxxxx --region us-central1
```

---

## Method 3: EasyPanel Console

Run the seed directly in your EasyPanel container.

### Steps:

1. **Go to EasyPanel** → Your App → **Console**

2. **Run the seed command:**

   ```bash
   npm run seed:prod
   ```

3. **Verify output** - Should see organizations and users created

---

## Method 4: Using Cloud Shell

Use Google Cloud Shell to connect and seed.

```bash
# 1. Open Cloud Shell in Google Cloud Console

# 2. Set your project
gcloud config set project YOUR_PROJECT_ID

# 3. Clone your repo (or use Cloud Source Repositories)
git clone https://github.com/your-username/tasker-app.git
cd tasker-app/backend

# 4. Install dependencies and build
npm install
npm run build

# 5. Set MongoDB URI
export MONGODB_URI="mongodb+srv://..."

# 6. Run seed
npm run seed:prod
```

---

## 🧪 Verify Seeding Worked

After seeding, test with these commands:

```bash
# 1. Get all organizations
curl https://your-app-url.run.app/api/organizations

# Should return:
# [{"id":"...","name":"Al-Siraat College",...}, {"id":"...","name":"Melbourne University",...}]

# 2. Try logging in with test account
# Email: admin@alsiraat.edu.au
# Password: Test@123!
```

**Or test in browser:**

1. Go to your app URL
2. Login with: `admin@alsiraat.edu.au` / `Test@123!`
3. Should see dashboard with tasks

---

## 📊 What Gets Created

The seed script creates:

### Organizations (2)

- **Al-Siraat College** (Islamic school)
- **Melbourne University** (Research institution)

### Users (8)

- **Admin:** `admin@alsiraat.edu.au` / `Test@123!`
- **Owner (Al-Siraat):** `ahmed.khan@alsiraat.edu.au` / `Test@123!`
- **Approver:** `sarah.hassan@alsiraat.edu.au` / `Test@123!`
- **Member:** `ali.raza@alsiraat.edu.au` / `Test@123!`
- **Independent 1:** `fatima.zahra@example.com` / `Test@123!`
- **Independent 2:** `omar.khalid@example.com` / `Test@123!`
- **Owner (Melbourne):** `jane.wilson@unimelb.edu.au` / `Test@123!`
- **Member:** `michael.chen@unimelb.edu.au` / `Test@123!`

### Tasks (10)

- 3 Published tasks (ready to apply)
- 2 Pending approval
- 5 Draft tasks

### Applications (5)

- Sample applications linking independents to published tasks

---

## 🔄 Re-seeding (Clear and Recreate)

The seed script **clears all existing data** before creating new data.

**⚠️ Warning:** This will delete all existing:

- Organizations
- Users
- Tasks
- Applications
- Notifications

**Only run in development or fresh production environments!**

---

## 🐛 Troubleshooting

### Error: "Cannot connect to MongoDB"

**Check:**

```bash
# 1. Verify MongoDB URI format
echo $MONGODB_URI
# Should be: mongodb+srv://user:pass@cluster.mongodb.net/tasker

# 2. Test connection with mongosh
mongosh "$MONGODB_URI"

# 3. Check MongoDB Atlas:
#    - IP Whitelist includes 0.0.0.0/0
#    - User has read/write permissions
#    - Password is correct
```

### Error: "Cannot find module 'dist/scripts/seedAdmin.js'"

**Fix:**

```bash
# Rebuild the backend
cd backend
npm run build

# Verify scripts folder exists
ls -la dist/scripts/

# Should show seedAdmin.js
```

### Script runs but no data appears

**Check:**

```bash
# 1. Verify you're connecting to the right database
echo $MONGODB_URI
# Check the database name in the URI

# 2. Check MongoDB Atlas Metrics
# Go to Atlas → Cluster → Metrics
# Look for recent write operations

# 3. Use MongoDB Compass to connect and view data directly
# Connection string: same as MONGODB_URI
```

---

## 🎯 Production Best Practice

**For production:**

1. Seed once after initial deployment
2. Don't re-seed (keeps user data)
3. Create production users manually or via signup
4. Use seed data only for testing

**For staging/dev:**

- Re-seed as often as needed
- Use seed data for testing features
- Keep test accounts active

---

## 📝 Quick Reference

| Environment            | Command                               |
| ---------------------- | ------------------------------------- |
| **Development**        | `npm run seed`                        |
| **Production (local)** | `npm run seed:prod`                   |
| **Cloud Run Job**      | `gcloud run jobs execute tasker-seed` |
| **EasyPanel**          | Console → `npm run seed:prod`         |

---

**Ready to seed? Pick the method that works best for your setup!**

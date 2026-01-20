# 📚 Complete Documentation Index

## 🚀 Deployment Guides

| File                      | Purpose                             | When to Use                 |
| ------------------------- | ----------------------------------- | --------------------------- |
| **QUICK_REFERENCE.md**    | Quick commands and test credentials | First stop - essential info |
| **EASYPANEL_DEPLOY.md**   | EasyPanel (DigitalOcean) deployment | Deploying to EasyPanel      |
| **DEPLOYMENT.md**         | Google Cloud Run deployment         | Deploying to Google Cloud   |
| **DEPLOYMENT_SUMMARY.md** | Complete deployment checklist       | Track your progress         |

## 🗄️ Database Setup

| File                            | Purpose                           | When to Use                           |
| ------------------------------- | --------------------------------- | ------------------------------------- |
| **MONGODB_SETUP.md**            | How to get MongoDB URI from Atlas | Setting up MongoDB for the first time |
| **DATABASE_SEEDING.md**         | Seed database with test data      | After deployment - add sample data    |
| **MONGODB_DIRECT_SEEDING.md**   | Seed using MongoDB queries        | Alternative seeding method            |
| **mongodb-seed-queries.js**     | Ready-to-run MongoDB queries      | Run directly in mongosh/Compass       |
| **DATABASE_TROUBLESHOOTING.md** | Fix database connection issues    | When database isn't working           |

## 🐳 Docker Files

| File                    | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| **Dockerfile**          | Combined frontend + backend (recommended) |
| **backend/Dockerfile**  | Backend-only container                    |
| **frontend.Dockerfile** | Frontend-only with nginx                  |
| **docker-compose.yml**  | Local development setup                   |

## 🔧 Utilities

| File                   | Purpose                        |
| ---------------------- | ------------------------------ |
| **check-database.sh**  | Test database connection       |
| **deploy-cloudrun.sh** | Automated Cloud Run deployment |

---

## 🎯 Common Workflows

### 1. First Time Setup

```
1. Read: MONGODB_SETUP.md → Get MongoDB URI
2. Read: EASYPANEL_DEPLOY.md → Deploy app
3. Run: check-database.sh → Test connection
4. Read: DATABASE_SEEDING.md → Seed database
5. Test: Login with admin@alsiraat.edu.au
```

### 2. Quick Deploy

```
1. Check: QUICK_REFERENCE.md → Environment variables
2. Deploy → Follow EASYPANEL_DEPLOY.md
3. Seed → npm run seed:prod
4. Verify → curl https://your-url/health
```

### 3. Database Issues

```
1. Run: ./check-database.sh
2. Read: DATABASE_TROUBLESHOOTING.md
3. Fix: Update MONGODB_URI
4. Test: curl https://your-url/api/organizations
```

### 4. Add Test Data

**Option A - Automated:**

```bash
cd backend
npm run build
export MONGODB_URI="..."
npm run seed:prod
```

**Option B - Manual (MongoDB Queries):**

```bash
mongosh "your-connection-string"
load('mongodb-seed-queries.js')
```

---

## 📝 Key Information

### Test Account

- **Email:** admin@alsiraat.edu.au
- **Password:** Test@123!

### Environment Variables (Required)

```env
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/tasker
JWT_SECRET=your-secret-key
```

### Useful Commands

```bash
# Build
npm run build

# Seed (dev)
npm run seed

# Seed (production)
npm run seed:prod

# Check database
./check-database.sh

# Test health
curl https://your-url/health
```

---

## 🔍 Finding What You Need

**I want to...**

- ✅ Deploy to EasyPanel → `EASYPANEL_DEPLOY.md`
- ✅ Deploy to Google Cloud → `DEPLOYMENT.md`
- ✅ Set up MongoDB → `MONGODB_SETUP.md`
- ✅ Add test data → `DATABASE_SEEDING.md`
- ✅ Fix database issues → `DATABASE_TROUBLESHOOTING.md`
- ✅ Quick reference → `QUICK_REFERENCE.md`
- ✅ Seed with queries → `MONGODB_DIRECT_SEEDING.md`
- ✅ Check if working → `check-database.sh`

---

**Start with QUICK_REFERENCE.md for essentials!** 📖

# 🚀 Quick Deployment Reference

## Environment Variables (Required)

```bash
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/tasker
JWT_SECRET=your-64-character-random-secret
```

## Seed Database After Deployment

**Easiest method (from local machine):**

```bash
cd backend
npm run build
export MONGODB_URI="your-production-mongodb-uri"
npm run seed:prod
```

**In Cloud Run/EasyPanel console:**

```bash
npm run seed:prod
```

## Test Deployment

```bash
# Health check
curl https://your-app-url/health
# {"status":"healthy","timestamp":"..."}

# Organizations API
curl https://your-app-url/api/organizations
# [{"id":"...","name":"Al-Siraat College"...}]
```

## Test Account

After seeding:

- **Email:** `admin@alsiraat.edu.au`
- **Password:** `Test@123!`

## Common Commands

| Task              | Command                         |
| ----------------- | ------------------------------- |
| Build backend     | `cd backend && npm run build`   |
| Build frontend    | `yarn build`                    |
| Seed (dev)        | `npm run seed`                  |
| Seed (production) | `npm run seed:prod`             |
| Start production  | `NODE_ENV=production npm start` |

## Files Summary

- `Dockerfile` - Single container (frontend + backend)
- `EASYPANEL_DEPLOY.md` - EasyPanel step-by-step guide
- `DEPLOYMENT.md` - Cloud Run deployment guide
- `DATABASE_SEEDING.md` - Detailed seeding instructions
- `DEPLOYMENT_SUMMARY.md` - Complete deployment checklist

---

📖 **Full guides:** See individual markdown files for detailed instructions

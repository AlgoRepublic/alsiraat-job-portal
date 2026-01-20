# EasyPanel Deployment Guide for Tasker

## 🚀 Quick Start

### Prerequisites

- MongoDB Atlas account (free tier works)
- EasyPanel account on DigitalOcean
- Code pushed to GitHub/GitLab

---

## 📋 Step-by-Step Deployment

### 1. Prepare MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a **free M0 cluster**
3. Create a **database user** with password
4. **Network Access**: Add `0.0.0.0/0` (allow from anywhere)
5. Get your **connection string**:
   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/tasker?retryWrites=true&w=majority
   ```

### 2. Push Your Code to Git

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 3. Deploy on EasyPanel

1. **Login to EasyPanel** → Your DigitalOcean server
2. **Create New App**:
   - Name: `tasker-app`
   - Type: **Docker**
3. **Source**:
   - Connect your GitHub/GitLab repo
   - Branch: `main`
   - Dockerfile: `./Dockerfile` (root)

4. **Domains**:
   - Add your custom domain (e.g., `tasker.yourdomain.com`)
   - Or use the provided subdomain

5. **Environment Variables** (Critical!):

   ```env
   NODE_ENV=production
   PORT=8080
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/tasker
   JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string
   ```

   **Optional AI Features:**

   ```env
   VITE_GEMINI_API_KEY=your-gemini-api-key-from-google-ai-studio
   ```

   > Note: Gemini API key is optional. Without it, AI-powered job description generation will be disabled, but all other features work normally.

6. **Resources**:
   - Memory: 512 MB (minimum)
   - CPU: 0.5 core
   - Port: `8080`

7. **Deploy** → Click "Deploy"

---

## ✅ Verification

After deployment, check:

1. **Health Endpoint**:

   ```bash
   curl https://your-domain.com/health
   # Should return: {"status":"healthy","timestamp":"..."}
   ```

2. **Frontend**:

   ```bash
   curl https://your-domain.com/
   # Should return HTML
   ```

3. **API**:
   ```bash
   curl https://your-domain.com/api/organizations
   # Should return JSON array
   ```

---

## 🔧 Optional: Social Login Setup

### Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable Google+ API
3. Create OAuth 2.0 credentials:
   - Authorized redirect URI: `https://your-domain.com/api/auth/google/callback`
4. Add to EasyPanel environment variables:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback
   ```

---

## 📊 Seed Database (First Time Only)

After deployment, seed the database with test data:

```bash
# SSH into your EasyPanel container
# Or use EasyPanel's console

npm run seed:prod
```

This creates:

- Test organizations (Al-Siraat College, Melbourne University)
- Users with all roles (Admin, Owner, Approver, Member, Independent)
- Sample tasks in various statuses
- Sample applications

**Test Account:**

- Email: `admin@alsiraat.edu.au`
- Password: `Test@123!`

---

## 🐛 Troubleshooting

### App Won't Start

**Check Logs in EasyPanel:**

- Go to App → Logs
- Look for errors

**Common Issues:**

1. **Missing Environment Variables**:
   - Verify all required env vars are set
   - Check for typos in `MONGODB_URI`

2. **MongoDB Connection Failed**:
   - Verify IP whitelist includes `0.0.0.0/0`
   - Test connection string locally first

3. **Port Issues**:
   - Ensure `PORT=8080` is set
   - EasyPanel automatically maps to port 80/443

### Frontend Shows 404

- Check if build completed successfully in deployment logs
- Verify `dist` folder was created during build

### API Returns 500 Errors

- Check MongoDB connection
- Verify `JWT_SECRET` is set
- Check app logs for stack traces

---

## 🔄 Redeploying Updates

```bash
# Make changes locally
git add .
git commit -m "Your changes"
git push origin main

# EasyPanel auto-deploys on push (if enabled)
# Or manually click "Redeploy" in EasyPanel
```

---

## 📈 Monitoring

### View Logs

```bash
# In EasyPanel
App → Logs → View Real-time
```

### Metrics

- EasyPanel dashboard shows:
  - CPU usage
  - Memory usage
  - Network traffic
  - Request count

---

## 🔐 Security Checklist

- [ ] Change `JWT_SECRET` to a random 64-character string
- [ ] MongoDB user has strong password
- [ ] MongoDB Network Access restricted (or monitored)
- [ ] HTTPS enabled (automatic with EasyPanel)
- [ ] Environment variables set (not hardcoded)
- [ ] `.env` files in `.gitignore`

---

## 📞 Support

If you encounter issues:

1. Check EasyPanel documentation
2. Review MongoDB Atlas status
3. Check GitHub Issues for this repo

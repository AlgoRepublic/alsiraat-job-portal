# Tasker - Docker & Cloud Run Deployment Guide

## 📂 Docker Files Overview

| File                  | Purpose                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `Dockerfile`          | **Combined build** - Builds frontend + backend in a single container (recommended for Cloud Run) |
| `backend/Dockerfile`  | Backend-only container                                                                           |
| `frontend.Dockerfile` | Frontend-only container with nginx                                                               |
| `docker-compose.yml`  | Local development with MongoDB                                                                   |
| `nginx.conf`          | Nginx config for separate frontend deployment                                                    |
| `.dockerignore`       | Excludes unnecessary files from Docker builds                                                    |
| `deploy-cloudrun.sh`  | Automated Cloud Run deployment script                                                            |

---

## 🚀 Deployment Options

### Option 1: Single Container (Recommended for Cloud Run)

This deploys both frontend and backend in a single container. The backend serves the frontend static files.

```bash
# Build the combined image
docker build -t tasker-app .

# Run locally to test
docker run -p 8080:8080 \
  -e MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/tasker" \
  -e JWT_SECRET="your-secret-key" \
  tasker-app
```

### Option 2: Separate Containers

Deploy frontend and backend as separate services.

```bash
# Build backend
cd backend
docker build -t tasker-backend .

# Build frontend
cd ..
docker build -f frontend.Dockerfile -t tasker-frontend .
```

---

## ☁️ Cloud Run Deployment

### Prerequisites

1. **Install Google Cloud SDK**: https://cloud.google.com/sdk/docs/install
2. **Authenticate**: `gcloud auth login`
3. **Set project**: `gcloud config set project YOUR_PROJECT_ID`
4. **Enable APIs**:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

### Quick Deploy

```bash
# Make script executable
chmod +x deploy-cloudrun.sh

# Set your project ID
export GCP_PROJECT_ID="your-project-id"

# Deploy
./deploy-cloudrun.sh
```

### Manual Deployment Steps

```bash
# 1. Build the Docker image
docker build -t gcr.io/YOUR_PROJECT_ID/tasker-app .

# 2. Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/tasker-app

# 3. Deploy to Cloud Run
gcloud run deploy tasker-app \
  --image gcr.io/YOUR_PROJECT_ID/tasker-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "NODE_ENV=production,PORT=8080"
```

### Environment Variables

Set these in Cloud Run:

| Variable      | Description                       | Required |
| ------------- | --------------------------------- | -------- |
| `MONGODB_URI` | MongoDB Atlas connection string   | ✅ Yes   |
| `JWT_SECRET`  | Secret key for JWT tokens         | ✅ Yes   |
| `NODE_ENV`    | Set to `production`               | ✅ Yes   |
| `PORT`        | Set to `8080` (Cloud Run default) | ✅ Yes   |

```bash
# Update environment variables
gcloud run services update tasker-app \
  --region us-central1 \
  --set-env-vars "MONGODB_URI=mongodb+srv://...,JWT_SECRET=your-secret"
```

---

## 🐳 Local Development with Docker

### Using Docker Compose

```bash
# Start all services (MongoDB, Backend, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **MongoDB**: localhost:27017

---

## 🗄️ MongoDB Atlas Setup (for Cloud Run)

Since Cloud Run is serverless, you'll need a cloud-hosted MongoDB instance.

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist all IPs (0.0.0.0/0) for Cloud Run access
5. Get your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/tasker?retryWrites=true&w=majority
   ```

---

## 📝 Configuration Notes

### CORS

In production, the frontend and backend are served from the same origin, so CORS is not an issue.

### API URLs

- **Development**: Frontend calls `http://localhost:5001/api`
- **Production**: Frontend calls `/api` (relative path, same origin)

### Health Check

Cloud Run health check hits `/health` endpoint.

---

## 🔧 Troubleshooting

### Container won't start

Check logs: `gcloud run services logs read tasker-app --region us-central1`

### MongoDB connection fails

- Ensure IP whitelist includes `0.0.0.0/0`
- Verify connection string format
- Check if user has proper permissions

### Frontend shows blank page

- Ensure build completed successfully
- Check if static files are in `/frontend/dist`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│              Cloud Run                  │
│  ┌─────────────────────────────────────┐│
│  │        Node.js Server               ││
│  │  ┌─────────────┬─────────────────┐  ││
│  │  │   /api/*    │    /*           │  ││
│  │  │  Express    │  Static Files   │  ││
│  │  │  Backend    │  (React SPA)    │  ││
│  │  └─────────────┴─────────────────┘  ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────┐
        │   MongoDB Atlas   │
        │   (Cloud DB)      │
        └───────────────────┘
```

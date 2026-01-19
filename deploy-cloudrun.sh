#!/bin/bash
# ====================================
# Cloud Run Deployment Script
# ====================================
# Prerequisites:
# 1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
# 2. Authenticate: gcloud auth login
# 3. Set project: gcloud config set project YOUR_PROJECT_ID
# ====================================

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-your-gcp-project-id}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="tasker-app"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Starting Cloud Run Deployment..."
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t ${IMAGE_NAME}:latest .

# Push to Google Container Registry
echo "☁️ Pushing to Container Registry..."
docker push ${IMAGE_NAME}:latest

# Deploy to Cloud Run
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "PORT=8080"

echo ""
echo "✅ Deployment complete!"
echo "📌 Note: You need to set the following secrets in Cloud Run:"
echo "   - MONGODB_URI (your MongoDB Atlas connection string)"
echo "   - JWT_SECRET (your JWT secret key)"
echo ""
echo "Run this to set secrets:"
echo "gcloud run services update ${SERVICE_NAME} --region ${REGION} --set-env-vars 'MONGODB_URI=your-mongodb-uri,JWT_SECRET=your-jwt-secret'"

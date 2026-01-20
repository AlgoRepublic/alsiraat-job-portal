#!/bin/bash
# Database Connection Diagnostic Script

echo "🔍 Tasker Database Connection Diagnostics"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the app URL (you'll need to replace this)
if [ -z "$APP_URL" ]; then
    echo -e "${YELLOW}⚠️  APP_URL not set. Please set it:${NC}"
    echo "   export APP_URL=https://your-app-url.run.app"
    echo ""
    read -p "Enter your app URL: " APP_URL
fi

echo "Testing app at: $APP_URL"
echo ""

# 1. Test Health Endpoint
echo "1️⃣  Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$APP_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "   Response: $HEALTH_BODY"
else
    echo -e "${RED}❌ Health check failed (HTTP $HTTP_CODE)${NC}"
    echo "   This means your app isn't running properly"
fi
echo ""

# 2. Test Organizations API (requires DB)
echo "2️⃣  Testing Organizations API (requires database)..."
ORG_RESPONSE=$(curl -s -w "\n%{http_code}" "$APP_URL/api/organizations")
ORG_HTTP_CODE=$(echo "$ORG_RESPONSE" | tail -1)
ORG_BODY=$(echo "$ORG_RESPONSE" | head -1)

if [ "$ORG_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Organizations API working${NC}"
    ORG_COUNT=$(echo "$ORG_BODY" | grep -o '"id"' | wc -l | tr -d ' ')
    echo "   Found $ORG_COUNT organizations"
    if [ "$ORG_COUNT" = "0" ]; then
        echo -e "${YELLOW}⚠️  Database is connected but empty - needs seeding${NC}"
    fi
else
    echo -e "${RED}❌ Organizations API failed (HTTP $ORG_HTTP_CODE)${NC}"
    echo "   Response: $ORG_BODY"
    echo -e "${RED}   This usually means database connection failed${NC}"
fi
echo ""

# 3. Check if using Cloud Run
echo "3️⃣  Checking deployment type..."
if [[ $APP_URL == *".run.app"* ]]; then
    echo "   Detected: Google Cloud Run"
    echo ""
    echo "   📝 To check environment variables in Cloud Run:"
    echo "   gcloud run services describe YOUR_SERVICE_NAME --region REGION"
    echo ""
elif [[ $APP_URL == *"easypanel"* ]] || [[ $APP_URL == *"digitalocean"* ]]; then
    echo "   Detected: EasyPanel/DigitalOcean"
    echo ""
    echo "   📝 Check environment variables in EasyPanel console"
else
    echo "   Unknown deployment type"
fi

# 4. MongoDB Connection Checklist
echo "4️⃣  MongoDB Connection Checklist"
echo "   ${YELLOW}Verify these settings:${NC}"
echo ""
echo "   ☑️  MongoDB Atlas cluster is running"
echo "   ☑️  Network Access allows 0.0.0.0/0 (all IPs)"
echo "   ☑️  Database user has read/write permissions"
echo "   ☑️  MONGODB_URI environment variable is set in deployment"
echo "   ☑️  Connection string format: mongodb+srv://user:pass@cluster.mongodb.net/tasker"
echo ""

# Summary
echo "=========================================="
if [ "$ORG_HTTP_CODE" = "200" ] && [ "$ORG_COUNT" != "0" ]; then
    echo -e "${GREEN}✅ All checks passed! Database is working.${NC}"
elif [ "$ORG_HTTP_CODE" = "200" ] && [ "$ORG_COUNT" = "0" ]; then
    echo -e "${YELLOW}⚠️  Database connected but empty. Run: npm run seed:prod${NC}"
else
    echo -e "${RED}❌ Database connection failed. Check the steps above.${NC}"
fi
echo ""

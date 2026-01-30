#!/bin/bash

# RBAC Permission Test Script
# This script helps you test the permission fixes

echo "=================================="
echo "RBAC Permission Test Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:5000"
API_BASE="${BACKEND_URL}/api"

echo "Backend URL: ${BACKEND_URL}"
echo ""

# Function to test login
test_login() {
    local email=$1
    local password=$2
    local role_name=$3
    
    echo -e "${YELLOW}Testing login for ${role_name}...${NC}"
    
    response=$(curl -s -X POST "${API_BASE}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${email}\",\"password\":\"${password}\"}")
    
    token=$(echo $response | grep -o '"token":"[^"]*' | sed 's/"token":"//')
    
    if [ -z "$token" ]; then
        echo -e "${RED}✗ Login failed for ${role_name}${NC}"
        echo "Response: $response"
        return 1
    else
        echo -e "${GREEN}✓ Login successful for ${role_name}${NC}"
        echo "$token"
        return 0
    fi
}

# Function to test permission
test_permission() {
    local token=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local should_succeed=$5
    local test_name=$6
    
    echo -e "${YELLOW}Testing: ${test_name}${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE}${endpoint}" \
            -H "Authorization: Bearer ${token}")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}${endpoint}" \
            -H "Authorization: Bearer ${token}" \
            -H "Content-Type: application/json" \
            -d "${data}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$should_succeed" = "true" ]; then
        if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
            echo -e "${GREEN}✓ PASS: Got ${http_code} (expected success)${NC}"
        else
            echo -e "${RED}✗ FAIL: Got ${http_code} (expected success)${NC}"
            echo "Response: $body"
        fi
    else
        if [ "$http_code" -eq 403 ]; then
            echo -e "${GREEN}✓ PASS: Got 403 (expected denial)${NC}"
        else
            echo -e "${RED}✗ FAIL: Got ${http_code} (expected 403)${NC}"
            echo "Response: $body"
        fi
    fi
    echo ""
}

# Main test flow
echo "=================================="
echo "Step 1: Seed Permissions"
echo "=================================="
echo ""
echo "First, login as Admin to seed permissions..."
echo ""

# Login as admin
ADMIN_TOKEN=$(test_login "admin@alsiraat.edu.au" "Test@123!" "Admin")

if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}Cannot proceed without admin token${NC}"
    exit 1
fi

echo ""
echo "Seeding default permissions..."
seed_response=$(curl -s -X POST "${API_BASE}/roles/seed" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json")

echo "Seed response: $seed_response"
echo ""

echo "=================================="
echo "Step 2: Test Approver Permissions"
echo "=================================="
echo ""

# Login as approver
APPROVER_TOKEN=$(test_login "sarah.hassan@alsiraat.edu.au" "Test@123!" "Approver")

if [ -n "$APPROVER_TOKEN" ]; then
    # Test that Approver CANNOT create tasks
    test_permission "$APPROVER_TOKEN" "POST" "/tasks" \
        '{"title":"Test Task","description":"Test","category":"Education","location":"Test","hoursRequired":10,"rewardType":"Paid","rewardValue":100}' \
        "false" "Approver creating task (should FAIL)"
    
    # Test that Approver CANNOT view applications
    test_permission "$APPROVER_TOKEN" "GET" "/applications" \
        "" "false" "Approver viewing applications (should FAIL)"
    
    # Test that Approver CAN view tasks
    test_permission "$APPROVER_TOKEN" "GET" "/tasks" \
        "" "true" "Approver viewing tasks (should SUCCEED)"
fi

echo "=================================="
echo "Step 3: Test Owner Permissions"
echo "=================================="
echo ""

# Login as owner
OWNER_TOKEN=$(test_login "ahmed.khan@alsiraat.edu.au" "Test@123!" "Owner")

if [ -n "$OWNER_TOKEN" ]; then
    # Test that Owner CAN create tasks
    test_permission "$OWNER_TOKEN" "POST" "/tasks" \
        '{"title":"Owner Test Task","description":"Test","category":"Education","location":"Test","hoursRequired":10,"rewardType":"Paid","rewardValue":100}' \
        "true" "Owner creating task (should SUCCEED)"
    
    # Test that Owner CAN view applications
    test_permission "$OWNER_TOKEN" "GET" "/applications" \
        "" "true" "Owner viewing applications (should SUCCEED)"
fi

echo "=================================="
echo "Step 4: Check Database Roles"
echo "=================================="
echo ""
echo "To verify in MongoDB, run:"
echo "  db.roles.find({ code: 'approver' }).pretty()"
echo ""
echo "Expected permissions for Approver:"
echo "  - task:read"
echo "  - task:approve"
echo "  - task:publish"
echo "  - org:read"
echo "  - dashboard:view"
echo ""
echo "Should NOT have:"
echo "  - task:create"
echo "  - application:read"
echo "  - application:shortlist"
echo ""

echo "=================================="
echo "Test Complete!"
echo "=================================="

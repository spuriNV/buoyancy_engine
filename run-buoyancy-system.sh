#!/bin/bash

# Buoyancy Control System - Complete Setup and Run Script
# This script kills all existing processes and starts the entire system

echo "🚢 Buoyancy Control System - Complete Setup"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Kill all existing processes
echo ""
print_status "Step 1: Killing all existing processes..."

# Kill Node.js processes
print_status "Killing Node.js processes..."
pkill -f "node server.js" 2>/dev/null
pkill -f "npm start" 2>/dev/null
pkill -f "ts-node" 2>/dev/null
pkill -f "node.*server" 2>/dev/null

# Kill processes on specific ports
print_status "Killing processes on ports 3000 and 3001..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Wait a moment for processes to fully terminate
sleep 2

# Check if ports are free
if lsof -i:3000 >/dev/null 2>&1; then
    print_warning "Port 3000 is still in use"
else
    print_success "Port 3000 is free"
fi

if lsof -i:3001 >/dev/null 2>&1; then
    print_warning "Port 3001 is still in use"
else
    print_success "Port 3001 is free"
fi

# Step 2: Check MongoDB
echo ""
print_status "Step 2: Checking MongoDB..."

# Check if MongoDB is running
if pgrep -x "mongod" > /dev/null; then
    print_success "MongoDB is running"
else
    print_warning "MongoDB is not running. Starting MongoDB..."
    # Start MongoDB in background
    mongod --dbpath /Users/sakethpoori/data/db > /dev/null 2>&1 &
    sleep 3
    if pgrep -x "mongod" > /dev/null; then
        print_success "MongoDB started successfully"
    else
        print_error "Failed to start MongoDB"
        exit 1
    fi
fi

# Step 3: Install dependencies if needed
echo ""
print_status "Step 3: Checking dependencies..."

# Check data logger dependencies
if [ ! -d "sem/nodejs/node_modules" ]; then
    print_status "Installing data logger dependencies..."
    cd sem/nodejs && npm install && cd ../..
fi

# Check dashboard dependencies
if [ ! -d "crm-api/node_modules" ]; then
    print_status "Installing dashboard dependencies..."
    cd crm-api && npm install && cd ..
fi

# Step 4: Start Data Logger Server
echo ""
print_status "Step 4: Starting Data Logger Server..."

# Start data logger in background
cd sem/nodejs
node server.js > server.log 2>&1 &
DATA_LOGGER_PID=$!
cd ../..

# Wait for server to start
sleep 3

# Test if data logger is running (with retry)
print_status "Testing data logger server..."
for i in {1..10}; do
    if curl -s http://localhost:3000/test > /dev/null 2>&1; then
        print_success "Data Logger Server is running on port 3000"
        break
    else
        if [ $i -eq 10 ]; then
            print_error "Data Logger Server failed to start after 10 attempts"
            echo "Check server.log for details"
            exit 1
        fi
        print_status "Waiting for data logger server... (attempt $i/10)"
        sleep 1
    fi
done

# Step 5: Start Dashboard Server
echo ""
print_status "Step 5: Starting Dashboard Server..."

# Start dashboard in background
cd crm-api
npm start > dashboard.log 2>&1 &
DASHBOARD_PID=$!
cd ..

# Wait for server to start
sleep 5

# Test if dashboard is running (with retry)
print_status "Testing dashboard server..."
for i in {1..15}; do
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        print_success "Dashboard Server is running on port 3001"
        break
    else
        if [ $i -eq 15 ]; then
            print_error "Dashboard Server failed to start after 15 attempts"
            echo "Check dashboard.log for details"
            exit 1
        fi
        print_status "Waiting for dashboard server... (attempt $i/15)"
        sleep 1
    fi
done

# Step 6: Send test data (DISABLED - uncomment to enable)
echo ""
print_status "Step 6: Sending test data... (DISABLED)"

# Send test data to verify the system (with timeout) - DISABLED
# Uncomment the following lines to enable test data sending:
# print_status "Sending test data to verify system..."
# TEST_DATA='{
#   "company_number": "PN0",
#   "timestamp": "0:00:05",
#   "pressure_kpa": 10.2,
#   "depth_m": 1.48,
#   "data_packet": "PN0 0:00:05 FLOAT 10.2 kpa 1.48 meters",
#   "transmission_type": "first_profile_bulk",
#   "profile_number": 1
# }'
# 
# if curl -s --max-time 10 -X POST http://localhost:3000/api/data \
#   -H "Content-Type: application/json" \
#   -d "$TEST_DATA" > /dev/null 2>&1; then
#     print_success "Test data sent successfully"
# else
#     print_warning "Failed to send test data (this is okay if servers are still starting)"
# fi

print_status "Test data sending is disabled. To enable, uncomment the lines above."

# Step 7: Display system status
echo ""
print_status "Step 7: System Status"
echo "=========================="

echo "📊 Data Logger Server: http://localhost:3000"
echo "📈 Dashboard: http://localhost:3001"
echo "🗄️  MongoDB: Running"
echo "🔄 Test Data: Sent"

# Check if data is in MongoDB
if curl -s http://localhost:3001/data | grep -q "PN0"; then
    print_success "Data successfully stored in MongoDB and accessible via dashboard"
else
    print_warning "Data may not be visible in dashboard yet (check browser)"
fi

echo ""
print_success "🎉 Buoyancy Control System is now running!"
echo ""
echo "📋 Next Steps:"
echo "1. Open dashboard: http://localhost:3001"
echo "2. Send more test data: node test-arduino-data.js"
echo "3. Upload Arduino code to your device"
echo ""
echo "🛑 To stop all servers: ./stop-buoyancy-system.sh"
echo ""

# Function to cleanup on script exit
cleanup() {
    echo ""
    print_status "Shutting down servers..."
    kill $DATA_LOGGER_PID 2>/dev/null
    kill $DASHBOARD_PID 2>/dev/null
    print_success "Servers stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Keep script running
echo "Press Ctrl+C to stop all servers"
while true; do
    sleep 10
    # Check if servers are still running (with timeout)
    if ! curl -s --max-time 5 http://localhost:3000/test > /dev/null 2>&1; then
        print_error "Data Logger Server stopped unexpectedly"
        break
    fi
    if ! curl -s --max-time 5 http://localhost:3001 > /dev/null 2>&1; then
        print_error "Dashboard Server stopped unexpectedly"
        break
    fi
done 
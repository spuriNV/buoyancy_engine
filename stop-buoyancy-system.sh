#!/bin/bash

# Buoyancy Control System - Stop Script
# This script stops all servers and processes

echo "🛑 Buoyancy Control System - Stop Script"
echo "========================================="

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

# Step 1: Stop Node.js servers
echo ""
print_status "Step 1: Stopping Node.js servers..."

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

# Step 2: Clean up log files
echo ""
print_status "Step 2: Cleaning up log files..."

# Remove log files if they exist
if [ -f "sem/nodejs/server.log" ]; then
    rm "sem/nodejs/server.log"
    print_success "Removed server.log"
fi

if [ -f "crm-api/dashboard.log" ]; then
    rm "crm-api/dashboard.log"
    print_success "Removed dashboard.log"
fi

# Step 3: Display final status
echo ""
print_status "Step 3: Final Status"
echo "========================"

# Check if any Node.js processes are still running
if pgrep -f "node.*server" > /dev/null; then
    print_warning "Some Node.js processes may still be running"
    ps aux | grep -E "(node|npm|ts-node)" | grep -v grep
else
    print_success "All Node.js servers stopped"
fi

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

echo ""
print_success "🎉 All Buoyancy Control System servers have been stopped!"
echo ""
echo "📋 To restart the system: ./run-buoyancy-system.sh"
echo "" 
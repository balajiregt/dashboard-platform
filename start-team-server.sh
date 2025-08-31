#!/bin/bash

# 🚀 Start Centralized QA Team Dashboard Platform
# This script starts both the backend and frontend servers

set -e

echo "🚀 Starting Centralized QA Team Dashboard Platform..."
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if setup has been completed
check_setup() {
    if [ ! -f "backend/data/team_dashboard.db" ]; then
        echo "❌ Database not found. Please run setup first:"
        echo "   bash setup.sh"
        exit 1
    fi
    
    if [ ! -f "backend/.env" ]; then
        echo "❌ Environment file not found. Please run setup first:"
        echo "   bash setup.sh"
        exit 1
    fi
}

# Start backend server
start_backend() {
    print_status "Starting backend server..."
    cd backend
    
    if [ ! -d "node_modules" ]; then
        print_warning "Backend dependencies not installed. Installing now..."
        npm install
    fi
    
    print_status "Starting backend on port 3001..."
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to start
    sleep 5
    
    # Check if backend is running
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Backend server started successfully on port 3001"
    else
        print_warning "Backend server might still be starting up..."
    fi
}

# Start frontend server
start_frontend() {
    print_status "Starting frontend server..."
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        print_warning "Frontend dependencies not installed. Installing now..."
        npm install
    fi
    
    print_status "Starting frontend on port 3000..."
    npm start &
    FRONTEND_PID=$!
    cd ..
    
    # Wait for frontend to start
    sleep 10
    
    # Check if frontend is running
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend server started successfully on port 3000"
    else
        print_warning "Frontend server might still be starting up..."
    fi
}

# Show access information
show_access_info() {
    echo ""
    echo "🎉 Platform started successfully!"
    echo "=================================="
    echo ""
    echo "📱 Access your dashboard:"
    echo "   🌐 Main Dashboard: http://localhost:3000"
    echo "   👥 Team Dashboard: http://localhost:3000/team"
    echo "   🔌 Backend API:   http://localhost:3001"
    echo "   📊 Health Check:  http://localhost:3001/health"
    echo ""
    echo "🔑 Default credentials:"
    echo "   Admin: admin@team.com / admin"
    echo "   QA Lead: qa_lead@team.com / qa_lead"
    echo "   QA Engineer 1: qa1@team.com / qa1"
    echo "   QA Engineer 2: qa2@team.com / qa2"
    echo ""
    echo "🛑 To stop the servers, press Ctrl+C"
    echo ""
}

# Cleanup function
cleanup() {
    echo ""
    print_status "Shutting down servers..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        print_status "Backend server stopped"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        print_status "Frontend server stopped"
    fi
    
    print_success "All servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    # Check if setup is complete
    check_setup
    
    # Start servers
    start_backend
    start_frontend
    
    # Show access information
    show_access_info
    
    # Keep script running
    print_status "Platform is running. Press Ctrl+C to stop."
    
    # Wait for user to stop
    wait
}

# Run main function
main "$@"

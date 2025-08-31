#!/bin/bash

# 🚀 Centralized QA Team Dashboard Platform Setup Script
# This script will set up the entire platform for you

set -e  # Exit on any error

echo "🚀 Setting up Centralized QA Team Dashboard Platform..."
echo "=================================================="

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

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js $(node --version) is installed"
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "npm $(npm --version) is installed"
}

# Install backend dependencies
setup_backend() {
    print_status "Setting up backend dependencies..."
    cd backend
    
    if [ ! -f "package.json" ]; then
        print_error "Backend package.json not found!"
        exit 1
    fi
    
    print_status "Installing backend dependencies..."
    npm install
    
    print_success "Backend dependencies installed"
    cd ..
}

# Install frontend dependencies
setup_frontend() {
    print_status "Setting up frontend dependencies..."
    cd frontend
    
    if [ ! -f "package.json" ]; then
        print_error "Frontend package.json not found!"
        exit 1
    fi
    
    print_status "Installing frontend dependencies..."
    npm install
    
    print_success "Frontend dependencies installed"
    cd ..
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    # Create data directory for database
    mkdir -p backend/data
    mkdir -p backend/uploads
    
    # Create logs directory
    mkdir -p backend/logs
    
    print_success "Directories created"
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    # Create .env file if it doesn't exist
    if [ ! -f "backend/.env" ]; then
        cat > backend/.env << EOF
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_PATH=./data/team_dashboard.db

# Frontend Configuration
FRONTEND_URL=http://localhost:3000

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log
EOF
        print_success "Environment file created"
    else
        print_warning "Environment file already exists, skipping..."
    fi
}

# Initialize database
initialize_database() {
    print_status "Initializing database..."
    cd backend
    
    # Check if database file exists
    if [ -f "data/team_dashboard.db" ]; then
        print_warning "Database already exists. Do you want to reset it? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            print_status "Removing existing database..."
            rm -f data/team_dashboard.db
        else
            print_status "Keeping existing database..."
            cd ..
            return
        fi
    fi
    
    print_status "Starting database initialization..."
    npm start &
    BACKEND_PID=$!
    
    # Wait for backend to start
    print_status "Waiting for backend to start..."
    sleep 10
    
    # Check if backend is running
    if curl -s http://localhost:3001/health > /dev/null; then
        print_success "Backend is running"
        
        # Stop backend
        kill $BACKEND_PID 2>/dev/null || true
        sleep 2
        
        print_success "Database initialized with sample data"
    else
        print_error "Backend failed to start. Please check the logs."
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    cd ..
}

# Create package.json scripts
create_package_scripts() {
    print_status "Setting up package.json scripts..."
    
    if [ ! -f "package.json" ]; then
        cat > package.json << EOF
{
  "name": "qa-team-dashboard",
  "version": "1.0.0",
  "description": "Centralized QA Team Dashboard Platform",
  "scripts": {
    "setup": "bash setup.sh",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm start",
    "start": "cd backend && npm start",
    "build": "cd frontend && npm run build",
    "test": "cd backend && npm test",
    "clean": "rm -rf backend/data/* backend/logs/* backend/uploads/*",
    "reset": "npm run clean && npm run setup"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  },
  "keywords": ["qa", "dashboard", "team", "testing", "playwright"],
  "author": "Your Team",
  "license": "MIT"
}
EOF
        print_success "Root package.json created"
    else
        print_warning "Root package.json already exists, skipping..."
    fi
}

# Install root dependencies
install_root_deps() {
    print_status "Installing root dependencies..."
    npm install
    print_success "Root dependencies installed"
}

# Display setup completion message
show_completion() {
    echo ""
    echo "🎉 Setup completed successfully!"
    echo "=================================="
    echo ""
    echo "🚀 To start the platform:"
    echo "   npm run dev"
    echo ""
    echo "📱 Access the dashboard:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:3001"
    echo "   Team Dashboard: http://localhost:3000/team"
    echo ""
    echo "🔑 Default credentials:"
    echo "   Admin: admin@team.com / admin"
    echo "   QA Lead: qa_lead@team.com / qa_lead"
    echo "   QA Engineer 1: qa1@team.com / qa1"
    echo "   QA Engineer 2: qa2@team.com / qa2"
    echo ""
    echo "📚 Documentation: README.md"
    echo ""
    echo "🛠️  Available commands:"
    echo "   npm run dev          - Start both frontend and backend"
    echo "   npm run dev:backend  - Start only backend"
    echo "   npm run dev:frontend - Start only frontend"
    echo "   npm run build        - Build frontend for production"
    echo "   npm run clean        - Clean data and logs"
    echo "   npm run reset        - Reset everything and setup again"
    echo ""
}

# Main setup function
main() {
    echo "Starting setup process..."
    echo ""
    
    # Check prerequisites
    check_nodejs
    check_npm
    
    # Setup project
    create_directories
    setup_environment
    setup_backend
    setup_frontend
    create_package_scripts
    install_root_deps
    initialize_database
    
    # Show completion message
    show_completion
}

# Run main function
main "$@"

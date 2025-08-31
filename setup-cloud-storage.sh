#!/bin/bash

# ☁️ Cloud Storage Setup Script for QA Dashboard
# This script helps you set up cloud storage integration

set -e

echo "☁️ Cloud Storage Setup for QA Dashboard"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "backend/package.json" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p backend/credentials
    mkdir -p backend/data/test-results
    mkdir -p backend/logs
    
    print_success "Directories created"
}

# Install cloud storage dependencies
install_dependencies() {
    print_status "Installing cloud storage dependencies..."
    
    cd backend
    npm install googleapis @microsoft/microsoft-graph-client @azure/identity
    cd ..
    
    print_success "Dependencies installed"
}

# Setup Google Drive integration
setup_google_drive() {
    print_status "Setting up Google Drive integration..."
    
    echo ""
    echo "📋 Google Drive Setup Steps:"
    echo "1. Go to https://console.cloud.google.com/"
    echo "2. Create a new project or select existing"
    echo "3. Enable Google Drive API"
    echo "4. Create OAuth 2.0 credentials (Desktop application)"
    echo "5. Download the credentials JSON file"
    echo ""
    
    read -p "Have you completed the Google Cloud setup? (y/N): " -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        read -p "Enter the path to your credentials JSON file: " credentials_path
        
        if [ -f "$credentials_path" ]; then
            cp "$credentials_path" backend/credentials/google-drive-credentials.json
            print_success "Google Drive credentials copied"
            
            # Update .env file
            if [ -f "backend/.env" ]; then
                echo "" >> backend/.env
                echo "# Google Drive Configuration" >> backend/.env
                echo "STORAGE_PROVIDER=google-drive" >> backend/.env
                echo "GOOGLE_DRIVE_CREDENTIALS_PATH=./credentials/google-drive-credentials.json" >> backend/.env
            else
                cat > backend/.env << EOF
# Server Configuration
PORT=3001
NODE_ENV=development

# Google Drive Configuration
STORAGE_PROVIDER=google-drive
GOOGLE_DRIVE_CREDENTIALS_PATH=./credentials/google-drive-credentials.json

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log
EOF
            fi
            
            print_success "Google Drive configuration complete!"
        else
            print_error "Credentials file not found: $credentials_path"
        fi
    else
        print_warning "Google Drive setup skipped"
    fi
}

# Setup OneDrive integration
setup_onedrive() {
    print_status "Setting up OneDrive integration..."
    
    echo ""
    echo "📋 OneDrive Setup Steps:"
    echo "1. Go to https://portal.azure.com/"
    echo "2. Navigate to Azure Active Directory > App registrations"
    echo "3. Create new registration"
    echo "4. Note down: Application ID, Directory ID, Client Secret"
    echo ""
    
    read -p "Have you completed the Azure setup? (y/N): " -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        read -p "Enter your Azure Tenant ID: " tenant_id
        read -p "Enter your Azure Client ID: " client_id
        read -p "Enter your Azure Client Secret: " client_secret
        
        if [ -n "$tenant_id" ] && [ -n "$client_id" ] && [ -n "$client_secret" ]; then
            # Update .env file
            if [ -f "backend/.env" ]; then
                echo "" >> backend/.env
                echo "# OneDrive Configuration" >> backend/.env
                echo "STORAGE_PROVIDER=onedrive" >> backend/.env
                echo "ONEDRIVE_TENANT_ID=$tenant_id" >> backend/.env
                echo "ONEDRIVE_CLIENT_ID=$client_id" >> backend/.env
                echo "ONEDRIVE_CLIENT_SECRET=$client_secret" >> backend/.env
            else
                cat > backend/.env << EOF
# Server Configuration
PORT=3001
NODE_ENV=development

# OneDrive Configuration
STORAGE_PROVIDER=onedrive
ONEDRIVE_TENANT_ID=$tenant_id
ONEDRIVE_CLIENT_ID=$client_id
ONEDRIVE_CLIENT_SECRET=$client_secret

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log
EOF
            fi
            
            print_success "OneDrive configuration complete!"
        else
            print_error "OneDrive credentials incomplete"
        fi
    else
        print_warning "OneDrive setup skipped"
    fi
}

# Setup local storage (fallback)
setup_local_storage() {
    print_status "Setting up local storage fallback..."
    
    if [ -f "backend/.env" ]; then
        echo "" >> backend/.env
        echo "# Local Storage Configuration" >> backend/.env
        echo "STORAGE_PROVIDER=local" >> backend/.env
    else
        cat > backend/.env << EOF
# Server Configuration
PORT=3001
NODE_ENV=development

# Local Storage Configuration
STORAGE_PROVIDER=local

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log
EOF
    fi
    
    print_success "Local storage configuration complete!"
}

# Main setup function
main() {
    echo "Starting cloud storage setup..."
    echo ""
    
    # Check directory
    check_directory
    
    # Create directories
    create_directories
    
    # Install dependencies
    install_dependencies
    
    # Choose storage provider
    echo ""
    echo "🌐 Choose your storage provider:"
    echo "1. Google Drive (Recommended - Easy setup, 15GB free)"
    echo "2. OneDrive (Microsoft organizations, 5GB free)"
    echo "3. Local Storage (Fallback - No cloud setup needed)"
    echo ""
    
    read -p "Enter your choice (1-3): " -r choice
    
    case $choice in
        1)
            setup_google_drive
            ;;
        2)
            setup_onedrive
            ;;
        3)
            setup_local_storage
            ;;
        *)
            print_warning "Invalid choice, setting up local storage"
            setup_local_storage
            ;;
    esac
    
    # Show completion message
    echo ""
    echo "🎉 Cloud storage setup completed!"
    echo "=================================="
    echo ""
    echo "📱 To start your QA dashboard:"
    echo "   npm run dev"
    echo ""
    echo "🌐 Access your dashboard:"
    echo "   http://localhost:3000/team"
    echo ""
    echo "📚 For detailed setup instructions:"
    echo "   See CLOUD_STORAGE_SETUP.md"
    echo ""
    echo "🔄 To change storage provider later:"
    echo "   Edit backend/.env file and restart"
    echo ""
}

# Run main function
main "$@"

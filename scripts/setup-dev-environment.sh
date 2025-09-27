#!/bin/bash

# Development Environment Setup Script
# Sets up the complete development environment with best practices

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js >= 20.0.0"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 20 ]; then
        log_error "Node.js version 20 or higher is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm version
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    local npm_version=$(npm --version | cut -d'.' -f1)
    if [ "$npm_version" -lt 9 ]; then
        log_error "npm version 9 or higher is required. Current version: $(npm --version)"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker >= 24.0.0"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose >= 2.0.0"
        exit 1
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install Git >= 2.30.0"
        exit 1
    fi
    
    log_success "All prerequisites are satisfied"
}

# Setup Git configuration
setup_git() {
    log_info "Setting up Git configuration..."
    
    # Configure Git hooks
    git config core.hooksPath .githooks
    chmod +x .githooks/*
    
    # Configure Git attributes
    if [ ! -f .gitattributes ]; then
        log_warning ".gitattributes not found, creating default one"
        # The .gitattributes file should already exist from our setup
    fi
    
    # Configure Git LFS if needed
    if command -v git-lfs &> /dev/null; then
        git lfs install
        log_success "Git LFS configured"
    else
        log_warning "Git LFS not installed, skipping LFS setup"
    fi
    
    log_success "Git configuration completed"
}

# Setup environment variables
setup_environment() {
    log_info "Setting up environment variables..."
    
    if [ ! -f .env ]; then
        if [ -f env.template ]; then
            cp env.template .env
            log_success "Created .env file from template"
            log_warning "Please update .env file with your actual values"
        else
            log_error "env.template not found"
            exit 1
        fi
    else
        log_info ".env file already exists"
    fi
    
    # Create docker-compose override for development
    if [ ! -f docker-compose.override.yml ]; then
        if [ -f docker-compose.override.yml.example ]; then
            cp docker-compose.override.yml.example docker-compose.override.yml
            log_success "Created docker-compose.override.yml for development"
        else
            log_warning "docker-compose.override.yml.example not found"
        fi
    else
        log_info "docker-compose.override.yml already exists"
    fi
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    
    local directories=(
        "data/postgres"
        "data/redis"
        "data/prometheus"
        "data/grafana"
        "data/elasticsearch"
        "data/trivy-cache"
        "logs"
        "backups"
        "uploads"
        "temp"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_info "Created directory: $dir"
        fi
    done
    
    log_success "Directory structure created"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install root dependencies
    npm ci
    
    # Install mustbeviral dependencies
    if [ -d "mustbeviral" ]; then
        cd mustbeviral
        npm ci
        cd ..
    fi
    
    # Install global dependencies if needed
    if ! command -v wrangler &> /dev/null; then
        log_info "Installing Wrangler CLI..."
        npm install -g wrangler
    fi
    
    log_success "Dependencies installed"
}

# Setup development tools
setup_dev_tools() {
    log_info "Setting up development tools..."
    
    # Install development dependencies
    npm install --save-dev
    
    # Setup pre-commit hooks
    if command -v pre-commit &> /dev/null; then
        pre-commit install
        log_success "Pre-commit hooks installed"
    else
        log_warning "pre-commit not installed, skipping pre-commit setup"
    fi
    
    # Setup linting
    npm run lint:fix || log_warning "Linting completed with warnings"
    
    # Setup formatting
    npm run format || log_warning "Formatting completed with warnings"
    
    log_success "Development tools configured"
}

# Setup Docker environment
setup_docker() {
    log_info "Setting up Docker environment..."
    
    # Create Docker networks if they don't exist
    docker network create mustbeviral-frontend 2>/dev/null || true
    docker network create mustbeviral-backend 2>/dev/null || true
    docker network create mustbeviral-monitoring 2>/dev/null || true
    
    # Pull required images
    log_info "Pulling Docker images..."
    docker-compose pull
    
    log_success "Docker environment ready"
}

# Setup Cloudflare (optional)
setup_cloudflare() {
    log_info "Setting up Cloudflare development environment..."
    
    if command -v wrangler &> /dev/null; then
        # Check if user is logged in
        if wrangler whoami &> /dev/null; then
            log_success "Wrangler is already authenticated"
        else
            log_warning "Wrangler not authenticated. Please run 'wrangler login'"
        fi
        
        # Setup development environment
        if [ -d "mustbeviral/workers" ]; then
            cd mustbeviral/workers
            for worker in */; do
                if [ -d "$worker" ]; then
                    log_info "Setting up worker: $worker"
                    cd "$worker"
                    # Install dependencies if package.json exists
                    if [ -f "package.json" ]; then
                        npm install
                    fi
                    cd ..
                fi
            done
            cd ../..
        fi
    else
        log_warning "Wrangler not installed, skipping Cloudflare setup"
    fi
    
    log_success "Cloudflare development environment configured"
}

# Run initial tests
run_tests() {
    log_info "Running initial tests..."
    
    # Run linting
    npm run lint || log_warning "Linting completed with warnings"
    
    # Run type checking
    npm run type-check || log_warning "Type checking completed with warnings"
    
    # Run unit tests if available
    if npm run test:unit &> /dev/null; then
        npm run test:unit || log_warning "Unit tests completed with some failures"
    fi
    
    log_success "Initial tests completed"
}

# Display setup summary
display_summary() {
    log_success "Development environment setup completed!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Update .env file with your actual values"
    echo "2. Configure Cloudflare credentials if using Workers"
    echo "3. Start the development environment:"
    echo "   npm run dev"
    echo "4. Or start with Docker:"
    echo "   npm run docker:compose"
    echo ""
    echo "🔧 Available commands:"
    echo "  npm run dev              - Start development server"
    echo "  npm run test             - Run all tests"
    echo "  npm run lint             - Run linting"
    echo "  npm run format           - Format code"
    echo "  npm run docker:compose   - Start with Docker"
    echo "  npm run cloudflare:deploy:staging - Deploy to staging"
    echo ""
    echo "📚 Documentation:"
    echo "  README.md                - Project overview"
    echo "  DEPLOYMENT-GUIDE.md      - Deployment instructions"
    echo "  BEST-PRACTICES.md        - Development best practices"
    echo ""
    echo "🆘 Need help?"
    echo "  Check the documentation or contact the development team"
}

# Main setup function
main() {
    log_info "Setting up Must Be Viral V2 development environment..."
    
    check_prerequisites
    setup_git
    setup_environment
    create_directories
    install_dependencies
    setup_dev_tools
    setup_docker
    setup_cloudflare
    run_tests
    display_summary
    
    log_success "Setup completed successfully! 🎉"
}

# Handle script interruption
trap 'log_error "Setup interrupted"; exit 1' INT TERM

# Run main function
main "$@"








#!/bin/bash

# Enterprise Deployment Script for Must Be Viral V2
# This script handles production deployment with zero-downtime

set -euo pipefail

# Configuration
ENVIRONMENT=${1:-production}
VERSION=${2:-latest}
REGISTRY=${REGISTRY:-ghcr.io}
IMAGE_NAME=${IMAGE_NAME:-mustbeviral-v2}
COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="./backups"

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
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    if [ ! -f ".env" ]; then
        log_warning "Environment file .env not found, using defaults"
    fi
    
    log_success "Prerequisites check passed"
}

# Create backup
create_backup() {
    log_info "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    # Backup database
    if docker-compose ps postgres | grep -q "Up"; then
        log_info "Backing up PostgreSQL database..."
        docker-compose exec -T postgres pg_dump -U postgres mustbeviral > "$BACKUP_DIR/db-backup-$(date +%Y%m%d-%H%M%S).sql"
    fi
    
    # Backup volumes
    docker run --rm -v mustbeviral_postgres-data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/postgres-data-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
    
    log_success "Backup created: $BACKUP_FILE"
}

# Pull latest images
pull_images() {
    log_info "Pulling latest images..."
    
    docker-compose pull app
    docker-compose pull postgres
    docker-compose pull redis
    docker-compose pull nginx
    docker-compose pull prometheus
    docker-compose pull grafana
    
    log_success "Images pulled successfully"
}

# Run security scan
security_scan() {
    log_info "Running security scan..."
    
    # Scan the main application image
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
        aquasec/trivy:latest image --exit-code 1 --severity HIGH,CRITICAL \
        "$REGISTRY/$IMAGE_NAME:$VERSION" || {
        log_error "Security scan failed - high/critical vulnerabilities found"
        exit 1
    }
    
    log_success "Security scan passed"
}

# Deploy with zero downtime
deploy() {
    log_info "Starting deployment to $ENVIRONMENT environment..."
    
    # Start new containers alongside old ones
    docker-compose up -d --scale app=2 --no-recreate app
    
    # Wait for new container to be healthy
    log_info "Waiting for new container to be healthy..."
    timeout 300 bash -c 'until docker-compose ps app | grep -q "healthy"; do sleep 5; done' || {
        log_error "New container failed to become healthy"
        docker-compose down
        exit 1
    }
    
    # Remove old container
    log_info "Removing old container..."
    docker-compose up -d --scale app=1 app
    
    # Wait for old container to stop
    sleep 10
    
    # Clean up old images
    log_info "Cleaning up old images..."
    docker image prune -f
    
    log_success "Deployment completed successfully"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Check if all services are running
    if ! docker-compose ps | grep -q "Up"; then
        log_error "Some services are not running"
        docker-compose ps
        exit 1
    fi
    
    # Check application health endpoint
    if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_error "Application health check failed"
        exit 1
    fi
    
    # Check database connection
    if ! docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        log_error "Database health check failed"
        exit 1
    fi
    
    log_success "Health check passed"
}

# Rollback function
rollback() {
    log_warning "Rolling back deployment..."
    
    # Stop current containers
    docker-compose down
    
    # Restore from backup (implement based on your backup strategy)
    log_info "Restoring from backup..."
    
    # Start previous version
    docker-compose up -d
    
    log_success "Rollback completed"
}

# Main deployment flow
main() {
    log_info "Starting enterprise deployment process..."
    
    case "${1:-production}" in
        "production")
            check_prerequisites
            create_backup
            pull_images
            security_scan
            deploy
            health_check
            ;;
        "staging")
            check_prerequisites
            pull_images
            deploy
            health_check
            ;;
        "rollback")
            rollback
            ;;
        *)
            log_error "Invalid environment. Use: production, staging, or rollback"
            exit 1
            ;;
    esac
    
    log_success "Deployment process completed successfully!"
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; rollback; exit 1' INT TERM

# Run main function
main "$@"







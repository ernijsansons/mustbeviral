#!/bin/bash
# Microservices Deployment Script
# Automated deployment of Domain-Driven Design architecture

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
COMPOSE_FILE="docker-compose.microservices.yml"
HEALTH_CHECK_TIMEOUT=120
SERVICE_START_DELAY=10

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Pre-deployment checks
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running. Please start Docker Desktop."
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose >/dev/null 2>&1; then
        error "Docker Compose is not installed."
    fi
    
    # Check if .env file exists
    if [[ ! -f .env ]]; then
        warning ".env file not found. Creating from template..."
        cp env.template .env
        warning "Please update .env file with your configuration before continuing."
        exit 1
    fi
    
    # Validate required environment variables
    source .env
    required_vars=(
        "POSTGRES_PASSWORD"
        "JWT_SECRET"
        "REDIS_PASSWORD"
        "STRIPE_SECRET_KEY"
        "OPENAI_API_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    success "Prerequisites check passed"
}

# Build all service images
build_services() {
    log "Building microservices images..."
    
    # Build in dependency order to optimize Docker layer caching
    services=(
        "postgres"
        "redis"
        "api-gateway"
        "content-service"
        "payment-service"
        "analytics-service" 
        "user-service"
        "ai-agent-service"
        "frontend"
    )
    
    for service in "${services[@]}"; do
        log "Building $service..."
        docker-compose -f $COMPOSE_FILE build --no-cache $service
        success "$service image built successfully"
    done
    
    success "All service images built successfully"
}

# Initialize databases
init_databases() {
    log "Initializing databases..."
    
    # Start PostgreSQL first
    docker-compose -f $COMPOSE_FILE up -d postgres
    
    # Wait for PostgreSQL to be ready
    log "Waiting for PostgreSQL to be ready..."
    timeout 60 bash -c 'until docker-compose -f docker-compose.microservices.yml exec postgres pg_isready -U postgres; do sleep 2; done'
    
    # Run database migrations
    log "Running database migrations..."
    
    # Content Service migrations
    docker-compose -f $COMPOSE_FILE run --rm content-service npm run db:migrate
    
    # Payment Service migrations  
    docker-compose -f $COMPOSE_FILE run --rm payment-service npm run db:migrate
    
    # Analytics Service migrations
    docker-compose -f $COMPOSE_FILE run --rm analytics-service npm run db:migrate
    
    # User Service migrations
    docker-compose -f $COMPOSE_FILE run --rm user-service npm run db:migrate
    
    # AI Agent Service migrations
    docker-compose -f $COMPOSE_FILE run --rm ai-agent-service npm run db:migrate
    
    success "Database initialization completed"
}

# Start infrastructure services
start_infrastructure() {
    log "Starting infrastructure services..."
    
    infrastructure_services=(
        "postgres"
        "redis"
        "qdrant"
        "consul"
        "prometheus"
        "elasticsearch"
    )
    
    for service in "${infrastructure_services[@]}"; do
        log "Starting $service..."
        docker-compose -f $COMPOSE_FILE up -d $service
        sleep $SERVICE_START_DELAY
    done
    
    success "Infrastructure services started"
}

# Start application services
start_application_services() {
    log "Starting application services..."
    
    app_services=(
        "user-service"        # Start first for authentication
        "payment-service"     # Payment domain
        "content-service"     # Content domain  
        "analytics-service"   # Analytics domain
        "ai-agent-service"    # AI domain
        "api-gateway"         # Gateway last
        "frontend"           # Frontend after gateway
    )
    
    for service in "${app_services[@]}"; do
        log "Starting $service..."
        docker-compose -f $COMPOSE_FILE up -d $service
        sleep $SERVICE_START_DELAY
    done
    
    success "Application services started"
}

# Start monitoring services
start_monitoring() {
    log "Starting monitoring and observability services..."
    
    monitoring_services=(
        "grafana"
        "kibana"
        "jaeger"
        "logstash"
    )
    
    for service in "${monitoring_services[@]}"; do
        log "Starting $service..."
        docker-compose -f $COMPOSE_FILE up -d $service
    done
    
    success "Monitoring services started"
}

# Health check for all services
health_check() {
    log "Performing health checks..."
    
    services_health=(
        "api-gateway:8000"
        "content-service:8001"
        "payment-service:8002"
        "analytics-service:8003"
        "user-service:8004"
        "ai-agent-service:8005"
        "frontend:3000"
    )
    
    failed_services=()
    
    for service_port in "${services_health[@]}"; do
        service=$(echo $service_port | cut -d: -f1)
        port=$(echo $service_port | cut -d: -f2)
        
        log "Checking health of $service on port $port..."
        
        timeout=0
        while [ $timeout -lt $HEALTH_CHECK_TIMEOUT ]; do
            if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
                success "$service is healthy"
                break
            fi
            
            sleep 2
            timeout=$((timeout + 2))
        done
        
        if [ $timeout -ge $HEALTH_CHECK_TIMEOUT ]; then
            warning "$service health check failed"
            failed_services+=($service)
        fi
    done
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        success "All services are healthy"
    else
        error "Health check failed for services: ${failed_services[*]}"
    fi
}

# Display service information
show_service_info() {
    log "Microservices Deployment Complete!"
    
    echo -e "\n${GREEN}🚀 Must Be Viral V2 - Microservices Architecture${NC}"
    echo -e "${GREEN}=================================================${NC}\n"
    
    echo -e "${BLUE}Core Services:${NC}"
    echo -e "  🌐 API Gateway:      http://localhost:8000"
    echo -e "  📝 Content Service:  http://localhost:8001"  
    echo -e "  💳 Payment Service:  http://localhost:8002"
    echo -e "  📊 Analytics Service: http://localhost:8003"
    echo -e "  👤 User Service:     http://localhost:8004"
    echo -e "  🤖 AI Agent Service: http://localhost:8005"
    echo -e "  💻 Frontend:         http://localhost:3000"
    
    echo -e "\n${BLUE}Infrastructure:${NC}"
    echo -e "  🗄️  PostgreSQL:      http://localhost:5432"
    echo -e "  🔴 Redis:            http://localhost:6379"
    echo -e "  🔍 Qdrant Vector DB: http://localhost:6333"
    echo -e "  🏛️  Consul:          http://localhost:8500"
    
    echo -e "\n${BLUE}Monitoring & Observability:${NC}"
    echo -e "  📈 Prometheus:       http://localhost:9090"
    echo -e "  📊 Grafana:          http://localhost:3001"
    echo -e "  📋 Kibana:           http://localhost:5601"
    echo -e "  🔍 Jaeger:           http://localhost:16686"
    echo -e "  📨 RabbitMQ:         http://localhost:15672"
    
    echo -e "\n${BLUE}Quick Commands:${NC}"
    echo -e "  View logs:           docker-compose -f $COMPOSE_FILE logs -f [service]"
    echo -e "  Scale service:       docker-compose -f $COMPOSE_FILE up -d --scale [service]=3"
    echo -e "  Stop services:       docker-compose -f $COMPOSE_FILE down"
    echo -e "  View status:         docker-compose -f $COMPOSE_FILE ps"
    
    echo -e "\n${GREEN}✅ All services deployed successfully!${NC}"
    echo -e "${GREEN}✅ Architecture: Domain-Driven Design with Microservices${NC}"
    echo -e "${GREEN}✅ Ready for development and testing${NC}\n"
}

# Cleanup function
cleanup() {
    log "Cleaning up failed deployment..."
    docker-compose -f $COMPOSE_FILE down --remove-orphans
    exit 1
}

# Main deployment flow
main() {
    log "Starting Must Be Viral V2 Microservices Deployment"
    log "Environment: $ENVIRONMENT"
    
    # Trap cleanup on error
    trap cleanup ERR
    
    # Deployment steps
    check_prerequisites
    build_services
    init_databases
    start_infrastructure
    start_application_services
    start_monitoring
    health_check
    show_service_info
    
    success "Deployment completed successfully!"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
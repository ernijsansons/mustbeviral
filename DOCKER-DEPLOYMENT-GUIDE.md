# Docker Deployment Guide

> Comprehensive Docker deployment strategies for Must Be Viral V2 across all environments

## 🐳 Overview

Must Be Viral V2 supports multiple Docker deployment configurations optimized for different use cases:
- **Development**: Hot reload and debugging capabilities
- **Production**: Performance-optimized with clustering
- **Microservices**: Distributed architecture deployment
- **Enterprise**: High-availability with monitoring stack

## 📋 Prerequisites

- Docker >= 24.0.0
- Docker Compose >= 2.20.0
- Docker Buildx (for multi-platform builds)
- Minimum 8GB RAM (16GB recommended for full stack)
- 20GB available disk space

## 🚀 Quick Start

### One-Command Deployment

```bash
# Standard production deployment
npm run docker:compose

# Development with hot reload
npm run docker:compose:dev

# Enterprise with monitoring
npm run docker:compose:enterprise

# Microservices architecture
npm run docker:compose:microservices
```

## 📦 Docker Images

### Main Application Image

```dockerfile
# Multi-stage optimized Dockerfile
FROM node:20-alpine3.19 AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine3.19 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build

FROM node:20-alpine3.19 AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=base --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

USER nodejs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
```

### Image Variants

| Image | Size | Use Case | Features |
|-------|------|----------|----------|
| `mustbeviral:latest` | ~150MB | Production | Optimized, no dev deps |
| `mustbeviral:dev` | ~250MB | Development | Dev tools, hot reload |
| `mustbeviral:debug` | ~200MB | Debugging | Debugging symbols |
| `mustbeviral:alpine` | ~120MB | Minimal | Ultra-lightweight |

## 🔧 Configuration Files

### 1. Standard Production (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: mustbeviral-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/mustbeviral
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - CLUSTER_SIZE=4
    networks:
      - app-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'
        reservations:
          memory: 1G

  postgres:
    image: postgres:15-alpine
    container_name: mustbeviral-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: mustbeviral
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=en_US.UTF-8"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d
      - ./database/postgresql-performance.conf:/etc/postgresql/postgresql.conf
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: mustbeviral-redis
    restart: unless-stopped
    command: redis-server /usr/local/etc/redis/redis.conf --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
      - ./database/redis-performance.conf:/usr/local/etc/redis/redis.conf
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  nginx:
    image: nginx:alpine
    container_name: mustbeviral-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    networks:
      - app-network
    depends_on:
      - app

networks:
  app-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

### 2. Development Configuration (`docker-compose.dev.yml`)

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
      target: development
    container_name: mustbeviral-app-dev
    ports:
      - "3000:3000"
      - "9229:9229"  # Node.js debugger
    environment:
      - NODE_ENV=development
      - DEBUG=*
    volumes:
      - .:/app
      - /app/node_modules
      - /app/mustbeviral/node_modules
    command: npm run dev
    networks:
      - dev-network

  postgres:
    image: postgres:15-alpine
    container_name: mustbeviral-postgres-dev
    environment:
      POSTGRES_DB: mustbeviral_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpassword
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    networks:
      - dev-network

  redis:
    image: redis:7-alpine
    container_name: mustbeviral-redis-dev
    networks:
      - dev-network

  mailhog:
    image: mailhog/mailhog
    container_name: mustbeviral-mailhog
    ports:
      - "1025:1025"
      - "8025:8025"
    networks:
      - dev-network

networks:
  dev-network:
    driver: bridge

volumes:
  postgres_dev_data:
```

### 3. Enterprise Configuration (`docker-compose.enterprise.yml`)

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 4G
          cpus: '6.0'
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    environment:
      - NODE_ENV=production
      - CLUSTER_SIZE=8
      - MEMORY_THRESHOLD=3221225472
      - ADAPTIVE_SCALING=true
    networks:
      - enterprise-network

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_MAX_CONNECTIONS: 200
      POSTGRES_SHARED_BUFFERS: 256MB
      POSTGRES_EFFECTIVE_CACHE_SIZE: 1GB
    volumes:
      - postgres_enterprise_data:/var/lib/postgresql/data
      - ./database/postgresql-enterprise.conf:/etc/postgresql/postgresql.conf
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'
    networks:
      - enterprise-network

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_enterprise_data:/data
    deploy:
      resources:
        limits:
          memory: 1.5G
          cpus: '1.0'
    networks:
      - enterprise-network

  # Monitoring Stack
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/alerts:/etc/prometheus/alerts
    networks:
      - enterprise-network

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning
    networks:
      - enterprise-network

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - enterprise-network

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    container_name: logstash
    volumes:
      - ./monitoring/logstash/config:/usr/share/logstash/pipeline
    networks:
      - enterprise-network
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - enterprise-network
    depends_on:
      - elasticsearch

networks:
  enterprise-network:
    driver: overlay
    attachable: true

volumes:
  postgres_enterprise_data:
  redis_enterprise_data:
  grafana_data:
  elasticsearch_data:
```

### 4. Microservices Configuration (`docker-compose.microservices.yml`)

```yaml
version: '3.8'

services:
  # API Gateway
  api-gateway:
    build: ./services/api-gateway
    container_name: api-gateway
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - USER_SERVICE_URL=http://user-service:8002
      - CONTENT_SERVICE_URL=http://content-service:8003
      - PAYMENT_SERVICE_URL=http://payment-service:8004
      - ANALYTICS_SERVICE_URL=http://analytics-service:8005
      - AI_AGENT_SERVICE_URL=http://ai-agent-service:8006
    networks:
      - microservices-network
    depends_on:
      - redis
      - user-service
      - content-service

  # User Service
  user-service:
    build: ./services/user-service
    container_name: user-service
    ports:
      - "8002:8002"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/userdb
      - REDIS_URL=redis://redis:6379
    networks:
      - microservices-network
    depends_on:
      - postgres
      - redis

  # Content Service
  content-service:
    build: ./services/content
    container_name: content-service
    ports:
      - "8003:8003"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/contentdb
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - AWS_S3_BUCKET=${AWS_S3_BUCKET}
    networks:
      - microservices-network
    depends_on:
      - postgres

  # Payment Service
  payment-service:
    build: ./services/payment-service
    container_name: payment-service
    ports:
      - "8004:8004"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/paymentdb
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    networks:
      - microservices-network
    depends_on:
      - postgres

  # Analytics Service
  analytics-service:
    build: ./services/analytics-service
    container_name: analytics-service
    ports:
      - "8005:8005"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/analyticsdb
      - CLICKHOUSE_URL=http://clickhouse:8123
    networks:
      - microservices-network
    depends_on:
      - postgres
      - clickhouse

  # AI Agent Service
  ai-agent-service:
    build: ./services/ai-agent-service
    container_name: ai-agent-service
    ports:
      - "8006:8006"
    environment:
      - PYTHON_ENV=production
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CLOUDFLARE_AI_API_KEY=${CLOUDFLARE_AI_API_KEY}
    networks:
      - microservices-network
    depends_on:
      - redis

  # Shared Infrastructure
  postgres:
    image: postgres:15-alpine
    container_name: postgres
    environment:
      POSTGRES_MULTIPLE_DATABASES: userdb,contentdb,paymentdb,analyticsdb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - ./database/init-multiple-databases.sh:/docker-entrypoint-initdb.d/init-databases.sh
      - postgres_micro_data:/var/lib/postgresql/data
    networks:
      - microservices-network

  redis:
    image: redis:7-alpine
    container_name: redis
    volumes:
      - redis_micro_data:/data
    networks:
      - microservices-network

  clickhouse:
    image: clickhouse/clickhouse-server:latest
    container_name: clickhouse
    volumes:
      - clickhouse_data:/var/lib/clickhouse
    networks:
      - microservices-network

networks:
  microservices-network:
    driver: bridge

volumes:
  postgres_micro_data:
  redis_micro_data:
  clickhouse_data:
```

## ⚙️ Environment Configuration

### Environment Variables

Create `.env` file with required variables:

```bash
# Database Configuration
POSTGRES_PASSWORD=your-secure-password
POSTGRES_USER=postgres
POSTGRES_DB=mustbeviral

# Redis Configuration
REDIS_PASSWORD=your-redis-password

# Application Security
JWT_SECRET=your-jwt-secret-key-min-32-chars
ENCRYPTION_KEY=your-encryption-key-32-chars

# Performance Tuning
CLUSTER_SIZE=4
MEMORY_THRESHOLD=2147483648
CACHE_TTL=300
LOG_LEVEL=info

# AI Services
OPENAI_API_KEY=your-openai-api-key
CLOUDFLARE_AI_API_KEY=your-cloudflare-api-key
STABILITY_AI_API_KEY=your-stability-api-key

# Storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET=your-s3-bucket-name

# Payment Processing
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-newrelic-key
```

### Environment-Specific Overrides

```bash
# Production overrides (.env.production)
NODE_ENV=production
LOG_LEVEL=error
CLUSTER_SIZE=8
MEMORY_THRESHOLD=4294967296
ADAPTIVE_SCALING=true

# Development overrides (.env.development)
NODE_ENV=development
LOG_LEVEL=debug
CLUSTER_SIZE=2
DEBUG=app:*
```

## 🚀 Deployment Commands

### Basic Deployment

```bash
# Pull latest images and start
docker-compose pull
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Advanced Deployment

```bash
# Build and deploy with no cache
docker-compose build --no-cache
docker-compose up -d --force-recreate

# Deploy specific service
docker-compose up -d --no-deps app

# Scale services
docker-compose up -d --scale app=3

# Rolling update
docker-compose up -d --no-deps --build app
```

### Health Checks

```bash
# Check all services health
./scripts/health-check.sh

# Individual service health
curl http://localhost:3000/health
curl http://localhost:8000/health  # API Gateway
curl http://localhost:8002/health  # User Service
```

## 📊 Performance Optimization

### Resource Limits

```yaml
# Optimized resource allocation
services:
  app:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '4.0'
          pids: 2048
        reservations:
          memory: 2G
          cpus: '2.0'
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    sysctls:
      - net.core.somaxconn=1024
      - net.ipv4.tcp_keepalive_time=120
```

### Volume Optimization

```yaml
# Performance-optimized volumes
volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/mustbeviral/postgres
  
  redis_data:
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs
      o: size=1G,uid=999
```

### Network Optimization

```yaml
# Custom network configuration
networks:
  app-network:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.enable_icc: "true"
      com.docker.network.bridge.enable_ip_masquerade: "true"
      com.docker.network.driver.mtu: 1500
    ipam:
      config:
        - subnet: 172.20.0.0/16
          gateway: 172.20.0.1
```

## 🔒 Security Configuration

### Container Security

```yaml
services:
  app:
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    read_only: true
    tmpfs:
      - /tmp
      - /var/cache
    user: "1001:1001"
```

### Secrets Management

```bash
# Using Docker secrets
echo "my-secret-password" | docker secret create postgres_password -

# In compose file:
services:
  postgres:
    secrets:
      - postgres_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password

secrets:
  postgres_password:
    external: true
```

## 📈 Monitoring Integration

### Prometheus Configuration

```yaml
# Add to monitoring services
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
```

## 🧪 Testing Deployments

### Integration Testing

```bash
#!/bin/bash
# Test deployment script

echo "Starting deployment test..."

# Start services
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be ready
sleep 30

# Run health checks
if curl -f http://localhost:3000/health; then
    echo "✅ App health check passed"
else
    echo "❌ App health check failed"
    exit 1
fi

# Run API tests
npm run test:api

# Run load tests
npm run test:load

# Cleanup
docker-compose -f docker-compose.test.yml down

echo "✅ Deployment test completed successfully"
```

### Performance Testing

```yaml
# Performance testing service
services:
  load-test:
    image: loadimpact/k6:latest
    volumes:
      - ./load-tests:/scripts
    command: run --vus 50 --duration 5m /scripts/api-load-test.js
    depends_on:
      - app
    networks:
      - app-network
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/docker-deploy.yml
name: Docker Deployment

on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to DockerHub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            mustbeviral/app:latest
            mustbeviral/app:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Deploy to staging
        if: github.ref == 'refs/heads/develop'
        run: |
          docker-compose -f docker-compose.staging.yml pull
          docker-compose -f docker-compose.staging.yml up -d
      
      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: |
          docker-compose -f docker-compose.production.yml pull
          docker-compose -f docker-compose.production.yml up -d
```

## 🆘 Troubleshooting

### Common Issues

**Container Won't Start**:
```bash
# Check logs
docker-compose logs app

# Check resource usage
docker stats

# Inspect container
docker inspect mustbeviral-app
```

**Database Connection Issues**:
```bash
# Test database connectivity
docker exec -it mustbeviral-postgres psql -U postgres -d mustbeviral

# Check database logs
docker-compose logs postgres

# Reset database
docker-compose down
docker volume rm mustbeviral_postgres_data
docker-compose up -d
```

**Performance Issues**:
```bash
# Monitor resource usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Check container limits
docker inspect mustbeviral-app | grep -A 10 "Resources"

# Profile application
docker exec -it mustbeviral-app npm run profile
```

### Recovery Procedures

**Rollback Deployment**:
```bash
#!/bin/bash
# Rollback to previous version
PREVIOUS_TAG=$(docker images mustbeviral/app --format "{{.Tag}}" | sed -n '2p')

# Update image tag
sed -i "s/mustbeviral\/app:latest/mustbeviral\/app:$PREVIOUS_TAG/g" docker-compose.yml

# Redeploy
docker-compose up -d --no-deps app

echo "Rolled back to version: $PREVIOUS_TAG"
```

**Backup and Restore**:
```bash
# Backup database
docker exec mustbeviral-postgres pg_dump -U postgres mustbeviral > backup.sql

# Restore database
docker exec -i mustbeviral-postgres psql -U postgres mustbeviral < backup.sql

# Backup volumes
docker run --rm -v mustbeviral_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Container Security Guide](https://docs.docker.com/engine/security/)
- [Performance Tuning Guide](./PERFORMANCE-OPTIMIZATION-REPORT.md)

---

**Docker Deployment Guide** | Version 2.0.0 | Last Updated: January 2025

*Supporting deployment from development to production with enterprise-grade monitoring and security.*
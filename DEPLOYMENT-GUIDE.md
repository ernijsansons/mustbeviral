# Must Be Viral V2 - Enterprise Deployment Guide

## 🚀 Overview

This guide covers the complete deployment process for Must Be Viral V2, including Docker containerization, Cloudflare Workers deployment, and CI/CD pipeline management.

## 📋 Prerequisites

### Required Tools
- **Node.js** >= 20.0.0
- **npm** >= 9.0.0
- **Docker** >= 24.0.0
- **Docker Compose** >= 2.0.0
- **Wrangler CLI** (Cloudflare Workers)
- **Git** >= 2.30.0

### Required Accounts & Services
- **Cloudflare Account** with Workers, Pages, D1, KV, and R2 enabled
- **GitHub Account** for CI/CD
- **Container Registry** (GitHub Container Registry or Docker Hub)

## 🔧 Initial Setup

### 1. Clone and Setup Repository

```bash
# Clone the repository
git clone https://github.com/your-org/must-be-viral-v2.git
cd must-be-viral-v2

# Install dependencies
npm install

# Setup Git hooks
npm run setup:hooks

# Setup environment variables
npm run setup:env
```

### 2. Configure Environment Variables

Copy `env.template` to `.env` and fill in your values:

```bash
cp env.template .env
```

Required environment variables:
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ZONE_ID`
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `ENCRYPTION_KEY`

### 3. Configure Cloudflare

```bash
# Login to Cloudflare
wrangler login

# Verify account access
wrangler whoami
```

## 🐳 Docker Deployment

### Local Development

```bash
# Start all services
npm run docker:compose

# Start Cloudflare-optimized services
npm run docker:compose:cloudflare

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### Production Deployment

```bash
# Build production image
npm run docker:build

# Build Cloudflare-optimized image
npm run docker:build:cloudflare

# Run production container
npm run docker:run
```

### Docker Services

The Docker setup includes:
- **Main Application** (Node.js/Next.js)
- **PostgreSQL Database**
- **Redis Cache**
- **Nginx Reverse Proxy**
- **Prometheus Monitoring**
- **Grafana Dashboard**
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Security Scanning** (Trivy)

## ☁️ Cloudflare Deployment

### Workers Deployment

```bash
# Deploy all workers to staging
npm run cloudflare:deploy:staging

# Deploy all workers to production
npm run cloudflare:deploy:production

# Dry run deployment
npm run cloudflare:deploy:dry-run

# Deploy individual workers
cd mustbeviral/workers/auth-worker
wrangler deploy --env production
```

### Pages Deployment

```bash
# Deploy to Cloudflare Pages
npm run cloudflare:pages:deploy

# Deploy with specific project name
cd mustbeviral
wrangler pages deploy out --project-name must-be-viral-production
```

### Infrastructure Setup

```bash
# Create D1 databases
wrangler d1 create must-be-viral-auth
wrangler d1 create must-be-viral-content
wrangler d1 create must-be-viral-analytics

# Create KV namespaces
wrangler kv:namespace create auth-session-store
wrangler kv:namespace create content-cache
wrangler kv:namespace create analytics-metrics

# Create R2 buckets
wrangler r2 bucket create must-be-viral-assets
wrangler r2 bucket create must-be-viral-media
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The project includes comprehensive CI/CD pipelines:

1. **Security Scanning** - Trivy vulnerability scanning
2. **Build & Test** - Multi-platform Docker builds
3. **Integration Tests** - Database and service testing
4. **Deployment** - Automated staging/production deployment
5. **Performance Testing** - Load testing with k6
6. **Health Checks** - Post-deployment verification

### Pipeline Triggers

- **Push to `main`** → Production deployment
- **Push to `develop`** → Staging deployment
- **Pull Request** → Security scan and testing
- **Manual Dispatch** → Custom environment deployment

### Required GitHub Secrets

```yaml
CLOUDFLARE_ACCOUNT_ID: "your-account-id"
CLOUDFLARE_API_TOKEN: "your-api-token"
CLOUDFLARE_ZONE_ID: "your-zone-id"
SNYK_TOKEN: "your-snyk-token"
GITHUB_TOKEN: "auto-generated"
```

## 🧪 Testing Strategy

### Test Types

1. **Unit Tests** - Individual component testing
2. **Integration Tests** - Service interaction testing
3. **End-to-End Tests** - Full user journey testing
4. **Performance Tests** - Load and stress testing
5. **Security Tests** - Vulnerability scanning

### Running Tests

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📊 Monitoring & Observability

### Health Checks

```bash
# Check application health
npm run health

# Check all services
npm run health:all

# Generate monitoring report
npm run monitor:report
```

### Monitoring Stack

- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **ELK Stack** - Log aggregation and analysis
- **Custom Dashboards** - Business metrics

### Alerting

Configure alerts for:
- High error rates
- Response time degradation
- Resource utilization
- Security incidents

## 🔒 Security Best Practices

### Code Quality

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run type-check

# Security audit
npm run security:audit
```

### Git Hooks

Pre-commit and pre-push hooks ensure:
- Code quality standards
- Security vulnerability checks
- Test execution
- Commit message formatting

### Docker Security

- Non-root user execution
- Read-only filesystems
- Security scanning with Trivy
- Minimal base images
- Regular security updates

## 🚨 Troubleshooting

### Common Issues

#### Docker Issues

```bash
# Clean Docker system
npm run docker:clean

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Cloudflare Issues

```bash
# Check worker status
wrangler tail

# View worker logs
wrangler tail --format=pretty

# Test worker locally
wrangler dev
```

#### Database Issues

```bash
# Check database connection
docker-compose exec postgres psql -U postgres -d mustbeviral

# Reset database
docker-compose down -v
docker-compose up -d
```

### Log Locations

- **Application Logs**: `./logs/`
- **Docker Logs**: `docker-compose logs`
- **Cloudflare Logs**: `wrangler tail`
- **Nginx Logs**: `./nginx-logs/`

## 📈 Performance Optimization

### Docker Optimization

- Multi-stage builds
- Layer caching
- Minimal base images
- Build optimization

### Cloudflare Optimization

- Worker bundling
- KV caching
- R2 CDN
- Edge computing

### Application Optimization

- Code splitting
- Lazy loading
- Image optimization
- Caching strategies

## 🔄 Rollback Procedures

### Docker Rollback

```bash
# Rollback to previous image
docker-compose down
docker pull ghcr.io/your-org/must-be-viral-v2:previous-tag
docker-compose up -d
```

### Cloudflare Rollback

```bash
# Rollback workers
wrangler rollback --env production

# Rollback pages
wrangler pages deployment rollback
```

## 📚 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

## 🆘 Support

For deployment issues:
1. Check the troubleshooting section
2. Review logs and error messages
3. Consult the monitoring dashboards
4. Contact the development team

---

**Last Updated**: December 2024
**Version**: 1.0.0







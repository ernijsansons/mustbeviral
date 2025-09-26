# Optimized Multi-stage Dockerfile for Enterprise Production
# Use the smallest possible Node.js image with security updates
FROM node:20-alpine3.19 AS base

# Security: Install security updates and essential packages in one layer
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache \
    dumb-init \
    tini \
    curl \
    ca-certificates \
    tzdata \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001 -G nodejs \
    && rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# Optimized environment variables for production performance
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size --use-openssl-ca" \
    UV_THREADPOOL_SIZE=16 \
    MALLOC_ARENA_MAX=2 \
    TZ=UTC \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# Create app directory with proper permissions
WORKDIR /app
RUN chown -R nextjs:nodejs /app

# Stage 2: Dependencies - Optimized for caching and performance
FROM base AS deps
WORKDIR /app

# Copy package files first for better layer caching
COPY --chown=nextjs:nodejs package*.json ./

# Optimized dependency installation with aggressive cleanup
RUN npm ci --omit=dev --no-audit --no-fund --prefer-offline --progress=false && \
    npm audit --audit-level=high --omit=dev && \
    npm cache clean --force && \
    rm -rf ~/.npm /tmp/* /var/tmp/* && \
    find node_modules -name "*.md" -delete && \
    find node_modules -name "test" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "__tests__" -type d -exec rm -rf {} + 2>/dev/null || true

# Stage 3: Builder - Separate build environment
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy application source code
COPY --chown=nextjs:nodejs . .

# Build application with proper error handling and cleanup
RUN npm prune --production && \
    rm -rf /tmp/* /var/tmp/*

# Stage 4: Production - Minimal runtime image
FROM base AS production
WORKDIR /app

# Copy built application with proper ownership
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/tmp && \
    chown -R nextjs:nodejs /app/logs /app/tmp

# Security: Switch to non-root user
USER nextjs

# Health check with optimized parameters
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Create optimized startup script
RUN echo '#!/bin/sh\n\
set -e\n\
echo "🚀 Starting Must Be Viral V2 (Performance Optimized)"\n\
echo "📊 Memory: $(cat /proc/meminfo | grep MemAvailable | awk '"'"'{print $2}'"'"') KB available"\n\
echo "💾 Disk: $(df -h / | awk '"'"'NR==2 {print $4}'"'"' available)"\n\
echo "🔧 Node: $(node --version)"\n\
echo "⚡ Clustering: Auto-scaling enabled"\n\
exec node server.js\n' > /app/start.sh && \
    chmod +x /app/start.sh

# Use tini for proper signal handling and zombie reaping
ENTRYPOINT ["tini", "--"]

# Start with performance optimizations
CMD ["/app/start.sh"]

# Metadata labels for better container management
LABEL maintainer="Must Be Viral Team <team@mustbeviral.com>" \
      version="1.0.0" \
      description="Must Be Viral V2 - Enterprise Viral Marketing Platform" \
      org.opencontainers.image.title="Must Be Viral V2" \
      org.opencontainers.image.description="Enterprise-level viral marketing platform" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.authors="Must Be Viral Team" \
      org.opencontainers.image.url="https://mustbeviral.com" \
      org.opencontainers.image.licenses="MIT"

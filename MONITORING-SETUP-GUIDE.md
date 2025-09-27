# Monitoring & Alerting Setup Guide - Must Be Viral V2

## Overview

This guide covers the complete monitoring and alerting setup for production deployment, including metrics collection, dashboards, alerting rules, and incident response.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Application Layer                     │
├─────────────────────────────────────────────────────────┤
│  Frontend (Next.js) │ Backend (Node.js) │ Workers (CF)  │
└──────────┬──────────┴──────────┬────────┴───────┬───────┘
           │                     │                  │
           ▼                     ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                    Metrics Collection                     │
├─────────────────────────────────────────────────────────┤
│    Prometheus    │    CloudWatch    │    Datadog        │
└──────────┬───────┴────────┬─────────┴──────┬────────────┘
           │                 │                │
           ▼                 ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                    Visualization                          │
├─────────────────────────────────────────────────────────┤
│         Grafana        │      Kibana      │   Custom     │
└────────────────────────┴──────────────────┴─────────────┘
           │                 │                │
           ▼                 ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                      Alerting                             │
├─────────────────────────────────────────────────────────┤
│    AlertManager    │    PagerDuty    │    Slack          │
└────────────────────┴─────────────────┴──────────────────┘
```

## 1. Prometheus Setup

### Installation

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    ports:
      - "9093:9093"
    restart: unless-stopped

volumes:
  prometheus_data:
  alertmanager_data:
```

### Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'mustbeviral-monitor'
    environment: 'production'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

# Load rules
rule_files:
  - "alerts.yml"

# Scrape configurations
scrape_configs:
  # Application metrics
  - job_name: 'mustbeviral-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'

  # Node exporter
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  # Database metrics
  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis metrics
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Cloudflare Workers (via push gateway)
  - job_name: 'cloudflare-workers'
    honor_labels: true
    static_configs:
      - targets: ['pushgateway:9091']
```

## 2. Application Metrics

### Node.js Metrics Implementation

```typescript
// src/lib/monitoring/metrics.ts
import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

export class MetricsCollector {
  private registry: Registry;

  // HTTP metrics
  private httpRequestDuration: Histogram<string>;
  private httpRequestTotal: Counter<string>;
  private httpErrorTotal: Counter<string>;

  // Business metrics
  private userRegistrations: Counter<string>;
  private contentCreated: Counter<string>;
  private aiGenerations: Counter<string>;
  private paymentsProcessed: Counter<string>;

  // System metrics
  private activeUsers: Gauge<string>;
  private databaseConnections: Gauge<string>;
  private cacheHitRate: Gauge<string>;

  constructor() {
    this.registry = new Registry();

    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.registry });

    this.initializeMetrics();
  }

  private initializeMetrics() {
    // HTTP metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.registry]
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry]
    });

    this.httpErrorTotal = new Counter({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.registry]
    });

    // Business metrics
    this.userRegistrations = new Counter({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['plan', 'source'],
      registers: [this.registry]
    });

    this.contentCreated = new Counter({
      name: 'content_created_total',
      help: 'Total content items created',
      labelNames: ['type', 'ai_generated'],
      registers: [this.registry]
    });

    this.aiGenerations = new Counter({
      name: 'ai_generations_total',
      help: 'Total AI content generations',
      labelNames: ['model', 'type'],
      registers: [this.registry]
    });

    this.paymentsProcessed = new Counter({
      name: 'payments_processed_total',
      help: 'Total payments processed',
      labelNames: ['type', 'status'],
      registers: [this.registry]
    });

    // System metrics
    this.activeUsers = new Gauge({
      name: 'active_users',
      help: 'Number of currently active users',
      registers: [this.registry]
    });

    this.databaseConnections = new Gauge({
      name: 'database_connections',
      help: 'Number of active database connections',
      labelNames: ['state'],
      registers: [this.registry]
    });

    this.cacheHitRate = new Gauge({
      name: 'cache_hit_rate',
      help: 'Cache hit rate percentage',
      labelNames: ['cache_type'],
      registers: [this.registry]
    });
  }

  // Middleware for Express
  httpMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const labels = {
          method: req.method,
          route: req.route?.path || req.path,
          status: res.statusCode.toString()
        };

        this.httpRequestDuration.observe(labels, duration);
        this.httpRequestTotal.inc(labels);

        if (res.statusCode >= 400) {
          this.httpErrorTotal.inc({
            ...labels,
            error_type: res.statusCode >= 500 ? 'server' : 'client'
          });
        }
      });

      next();
    };
  }

  // Business metric tracking
  trackUserRegistration(plan: string, source: string) {
    this.userRegistrations.inc({ plan, source });
  }

  trackContentCreation(type: string, aiGenerated: boolean) {
    this.contentCreated.inc({
      type,
      ai_generated: aiGenerated ? 'true' : 'false'
    });
  }

  trackAIGeneration(model: string, type: string) {
    this.aiGenerations.inc({ model, type });
  }

  trackPayment(type: string, status: string) {
    this.paymentsProcessed.inc({ type, status });
  }

  // System metric updates
  updateActiveUsers(count: number) {
    this.activeUsers.set(count);
  }

  updateDatabaseConnections(active: number, idle: number) {
    this.databaseConnections.set({ state: 'active' }, active);
    this.databaseConnections.set({ state: 'idle' }, idle);
  }

  updateCacheHitRate(type: string, rate: number) {
    this.cacheHitRate.set({ cache_type: type }, rate);
  }

  // Export metrics
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}

// Initialize metrics collector
export const metrics = new MetricsCollector();
```

### Express Integration

```typescript
// server.ts
import express from 'express';
import { metrics } from './lib/monitoring/metrics';

const app = express();

// Add metrics middleware
app.use(metrics.httpMiddleware());

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(await metrics.getMetrics());
});

// Track business events
app.post('/api/auth/register', async (req, res) => {
  // ... registration logic
  metrics.trackUserRegistration(req.body.plan, req.body.source);
});

app.post('/api/content', async (req, res) => {
  // ... content creation logic
  metrics.trackContentCreation(req.body.type, req.body.aiGenerated);
});
```

## 3. Grafana Dashboards

### Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Must Be Viral - Production Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_errors_total[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "Error %"
          }
        ],
        "type": "graph",
        "alert": {
          "conditions": [
            {
              "evaluator": {
                "params": [5],
                "type": "gt"
              }
            }
          ]
        }
      },
      {
        "title": "Response Time (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P95 Latency"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Active Users",
        "targets": [
          {
            "expr": "active_users",
            "legendFormat": "Active Users"
          }
        ],
        "type": "stat"
      },
      {
        "title": "AI Generations",
        "targets": [
          {
            "expr": "rate(ai_generations_total[1h])",
            "legendFormat": "{{model}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Revenue Metrics",
        "targets": [
          {
            "expr": "sum(rate(payments_processed_total{status='success'}[1d])) * 29",
            "legendFormat": "Daily Revenue (Est)"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
```

## 4. Alert Rules

### Critical Alerts

```yaml
# monitoring/alerts.yml
groups:
  - name: critical
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_errors_total[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for the last 5 minutes"

      # Service down
      - alert: ServiceDown
        expr: up{job="mustbeviral-app"} == 0
        for: 2m
        labels:
          severity: critical
          team: devops
        annotations:
          summary: "Service {{ $labels.instance }} is down"
          description: "{{ $labels.instance }} has been down for more than 2 minutes"

      # Database connection pool exhaustion
      - alert: DatabasePoolExhaustion
        expr: |
          (
            database_connections{state="active"}
            /
            (database_connections{state="active"} + database_connections{state="idle"})
          ) > 0.9
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "Database connection pool near exhaustion"
          description: "{{ $value | humanizePercentage }} of connections are in use"

  - name: performance
    interval: 1m
    rules:
      # High latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket[5m])
          ) > 1
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High latency detected"
          description: "P95 latency is {{ $value }}s"

      # Low cache hit rate
      - alert: LowCacheHitRate
        expr: cache_hit_rate < 0.8
        for: 15m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Cache hit rate below threshold"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"

  - name: business
    interval: 5m
    rules:
      # Low conversion rate
      - alert: LowConversionRate
        expr: |
          (
            sum(rate(user_registrations_total{plan!="free"}[1h]))
            /
            sum(rate(user_registrations_total[1h]))
          ) < 0.02
        for: 2h
        labels:
          severity: warning
          team: product
        annotations:
          summary: "Conversion rate below target"
          description: "Paid conversion rate is {{ $value | humanizePercentage }}"

      # Payment failures
      - alert: HighPaymentFailureRate
        expr: |
          (
            sum(rate(payments_processed_total{status="failed"}[30m]))
            /
            sum(rate(payments_processed_total[30m]))
          ) > 0.1
        for: 10m
        labels:
          severity: critical
          team: payments
        annotations:
          summary: "High payment failure rate"
          description: "{{ $value | humanizePercentage }} of payments are failing"
```

## 5. AlertManager Configuration

```yaml
# monitoring/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: '${SLACK_WEBHOOK_URL}'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true

    - match:
        severity: warning
      receiver: 'slack-warnings'

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'
        description: '{{ .GroupLabels.alertname }}'
        details:
          firing: '{{ .Alerts.Firing | len }}'
          resolved: '{{ .Alerts.Resolved | len }}'

  - name: 'slack-warnings'
    slack_configs:
      - channel: '#alerts-warning'
        send_resolved: true
        title: 'Warning: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'cluster', 'service']
```

## 6. Custom Monitoring Scripts

### Health Check Script

```typescript
// scripts/health-monitor.ts
import axios from 'axios';
import { metrics } from '../src/lib/monitoring/metrics';

interface HealthCheck {
  name: string;
  url: string;
  method: 'GET' | 'POST';
  expectedStatus: number;
  timeout: number;
}

class HealthMonitor {
  private checks: HealthCheck[] = [
    {
      name: 'api_health',
      url: 'https://api.mustbeviral.com/health',
      method: 'GET',
      expectedStatus: 200,
      timeout: 5000
    },
    {
      name: 'auth_service',
      url: 'https://api.mustbeviral.com/api/auth/status',
      method: 'GET',
      expectedStatus: 200,
      timeout: 3000
    },
    {
      name: 'content_service',
      url: 'https://api.mustbeviral.com/api/content/public',
      method: 'GET',
      expectedStatus: 200,
      timeout: 3000
    },
    {
      name: 'payment_webhook',
      url: 'https://api.mustbeviral.com/api/webhooks/stripe',
      method: 'POST',
      expectedStatus: 400, // Expected without valid signature
      timeout: 3000
    }
  ];

  async runChecks(): Promise<void> {
    for (const check of this.checks) {
      try {
        const response = await axios({
          method: check.method,
          url: check.url,
          timeout: check.timeout,
          validateStatus: () => true
        });

        if (response.status === check.expectedStatus) {
          console.log(`✓ ${check.name}: OK (${response.status})`);
          this.recordSuccess(check.name);
        } else {
          console.error(`✗ ${check.name}: FAIL (Expected ${check.expectedStatus}, got ${response.status})`);
          this.recordFailure(check.name, `unexpected_status_${response.status}`);
        }
      } catch (error) {
        console.error(`✗ ${check.name}: ERROR (${error.message})`);
        this.recordFailure(check.name, 'connection_error');
      }
    }
  }

  private recordSuccess(checkName: string): void {
    // Send to metrics system
    metrics.trackHealthCheck(checkName, 'success');
  }

  private recordFailure(checkName: string, reason: string): void {
    // Send to metrics system
    metrics.trackHealthCheck(checkName, 'failure', reason);

    // Send alert if critical
    if (this.isCriticalCheck(checkName)) {
      this.sendAlert(checkName, reason);
    }
  }

  private isCriticalCheck(checkName: string): boolean {
    return ['api_health', 'auth_service'].includes(checkName);
  }

  private sendAlert(checkName: string, reason: string): void {
    // Send to alerting system
    console.error(`CRITICAL: Health check ${checkName} failed: ${reason}`);
  }
}

// Run health checks every minute
const monitor = new HealthMonitor();
setInterval(() => monitor.runChecks(), 60000);
```

## 7. Log Aggregation (ELK Stack)

### Logstash Configuration

```ruby
# monitoring/logstash/pipeline/logstash.conf
input {
  file {
    path => "/var/log/mustbeviral/*.log"
    start_position => "beginning"
    codec => "json"
  }

  tcp {
    port => 5000
    codec => "json"
  }
}

filter {
  # Parse log level
  if [level] {
    mutate {
      add_field => { "log_level" => "%{level}" }
    }
  }

  # Parse user agent
  if [user_agent] {
    useragent {
      source => "user_agent"
      target => "ua"
    }
  }

  # Geolocate IP addresses
  if [client_ip] {
    geoip {
      source => "client_ip"
      target => "geoip"
    }
  }

  # Extract custom metrics
  if [type] == "metric" {
    mutate {
      add_tag => ["metric"]
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "mustbeviral-%{+YYYY.MM.dd}"
  }

  # Send critical errors to alerting
  if [log_level] == "ERROR" or [log_level] == "FATAL" {
    http {
      url => "${ALERT_WEBHOOK_URL}"
      http_method => "post"
      format => "json"
    }
  }
}
```

## 8. Deployment Commands

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Configure Grafana
./scripts/setup-grafana-dashboards.sh

# Test alerting
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning"
    }
  }]'

# Check metrics endpoint
curl http://localhost:3000/metrics

# View Prometheus targets
open http://localhost:9090/targets

# Access Grafana
open http://localhost:3001
# Default: admin/admin
```

## 9. Monitoring Checklist

### Pre-Launch
- [ ] Prometheus installed and configured
- [ ] Grafana dashboards created
- [ ] Alert rules defined
- [ ] AlertManager configured
- [ ] Slack/PagerDuty integration tested
- [ ] Application metrics instrumented
- [ ] Log aggregation configured
- [ ] Health checks implemented
- [ ] Custom monitoring scripts deployed

### Post-Launch
- [ ] Monitor error rates
- [ ] Track response times
- [ ] Watch resource utilization
- [ ] Review alert noise
- [ ] Tune alert thresholds
- [ ] Create runbooks for alerts
- [ ] Schedule on-call rotation
- [ ] Document incident procedures

## 10. Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Uptime | 99.9% | <99% |
| Error Rate | <1% | >5% |
| P95 Latency | <500ms | >1s |
| Cache Hit Rate | >90% | <80% |
| CPU Usage | <70% | >85% |
| Memory Usage | <80% | >90% |
| Disk Usage | <80% | >90% |
| Active Users | Growing | -20% daily |
| Conversion Rate | >5% | <2% |
| Payment Success | >95% | <90% |

---

**Remember**: Good monitoring is proactive, not reactive. Set up alerts before issues occur, not after.
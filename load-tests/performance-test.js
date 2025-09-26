import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';

// Custom metrics for detailed performance analysis
const errorRate = new Rate('errors');
const responseTimeP95 = new Trend('response_time_p95');
const responseTimeP99 = new Trend('response_time_p99');
const requestsPerSecond = new Rate('requests_per_second');
const activeUsers = new Gauge('active_users');
const cacheHitRate = new Rate('cache_hit_rate');
const memoryUsage = new Gauge('memory_usage_mb');

// Performance test configuration
export let options = {
  // Staging configuration for comprehensive testing
  stages: [
    // Ramp up
    { duration: '2m', target: 10 },    // Ramp up to 10 users over 2 minutes
    { duration: '2m', target: 50 },    // Ramp up to 50 users over 2 minutes
    { duration: '3m', target: 100 },   // Ramp up to 100 users over 3 minutes
    { duration: '5m', target: 200 },   // Ramp up to 200 users over 5 minutes
    
    // Peak load testing
    { duration: '10m', target: 200 },  // Stay at 200 users for 10 minutes
    { duration: '5m', target: 500 },   // Spike to 500 users for 5 minutes
    { duration: '2m', target: 200 },   // Scale back to 200 users
    
    // Stress testing
    { duration: '3m', target: 800 },   // Stress test with 800 users
    { duration: '2m', target: 1000 },  // Maximum load with 1000 users
    
    // Ramp down
    { duration: '3m', target: 100 },   // Scale down to 100 users
    { duration: '2m', target: 0 },     // Ramp down to 0 users
  ],
  
  // Performance thresholds (SLA requirements)
  thresholds: {
    // 95% of requests should complete within 2 seconds
    http_req_duration: ['p(95) < 2000'],
    
    // 99% of requests should complete within 5 seconds
    'http_req_duration{scenario:peak_load}': ['p(99) < 5000'],
    
    // Error rate should be below 1%
    http_req_failed: ['rate < 0.01'],
    
    // Specific endpoint performance requirements
    'http_req_duration{endpoint:health}': ['p(95) < 100'],
    'http_req_duration{endpoint:metrics}': ['p(95) < 500'],
    'http_req_duration{endpoint:api}': ['p(95) < 1500'],
    
    // Throughput requirements
    http_reqs: ['rate > 100'], // At least 100 requests per second
    
    // Memory and resource usage
    'memory_usage_mb': ['value < 1000'], // Memory should stay under 1GB
  },
  
  // Test execution settings
  noConnectionReuse: false,
  userAgent: 'k6/must-be-viral-performance-test',
  batch: 10,
  batchPerHost: 5,
  
  // Environment-specific configuration
  ext: {
    loadimpact: {
      name: 'Must Be Viral V2 - Performance Test',
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 60 },
        'amazon:ie:dublin': { loadZone: 'amazon:ie:dublin', percent: 25 },
        'amazon:sg:singapore': { loadZone: 'amazon:sg:singapore', percent: 15 },
      },
    },
  },
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}`;

// Test data setup
const testData = {
  users: generateTestUsers(100),
  endpoints: [
    { path: '/health', weight: 20, method: 'GET' },
    { path: '/metrics', weight: 10, method: 'GET' },
    { path: '/', weight: 30, method: 'GET' },
  ],
  scenarios: ['normal_load', 'peak_load', 'stress_test']
};

function generateTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      id: i + 1,
      name: `user${i + 1}`,
      email: `user${i + 1}@mustbeviral.com`,
    });
  }
  return users;
}

// Test scenarios
export let scenarios = {
  // Normal load testing
  normal_load: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '5m', target: 50 },
      { duration: '10m', target: 50 },
      { duration: '5m', target: 0 },
    ],
    gracefulRampDown: '30s',
    tags: { scenario: 'normal_load' },
  },
  
  // Peak load testing
  peak_load: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '2m', target: 200 },
      { duration: '10m', target: 200 },
      { duration: '2m', target: 0 },
    ],
    gracefulRampDown: '30s',
    tags: { scenario: 'peak_load' },
  },
  
  // Stress testing
  stress_test: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '1m', target: 500 },
      { duration: '5m', target: 500 },
      { duration: '1m', target: 800 },
      { duration: '3m', target: 800 },
      { duration: '2m', target: 0 },
    ],
    gracefulRampDown: '30s',
    tags: { scenario: 'stress_test' },
  },
};

// Main test function
export default function () {
  const scenario = __ENV.K6_SCENARIO || 'normal_load';
  const user = testData.users[Math.floor(Math.random() * testData.users.length)];
  
  // Update active users metric
  activeUsers.add(__VU);
  
  // Execute test based on scenario
  switch (scenario) {
    case 'normal_load':
      executeNormalLoad(user);
      break;
    case 'peak_load':
      executePeakLoad(user);
      break;
    case 'stress_test':
      executeStressTest(user);
      break;
    default:
      executeNormalLoad(user);
  }
  
  // Think time between requests (realistic user behavior)
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

function executeNormalLoad(user) {
  // Health check
  performHealthCheck();
  
  // Main page load
  performPageLoad('/');
  
  // Random think time
  sleep(Math.random() * 3 + 1);
  
  // Metrics check (monitoring overhead simulation)
  if (Math.random() < 0.1) { // 10% chance
    performMetricsCheck();
  }
}

function executePeakLoad(user) {
  // Faster execution for peak load
  performHealthCheck();
  performPageLoad('/');
  
  // Reduced think time for peak load
  sleep(Math.random() * 1 + 0.5);
  
  // More frequent metrics checks during peak
  if (Math.random() < 0.2) { // 20% chance
    performMetricsCheck();
  }
}

function executeStressTest(user) {
  // Minimal think time for stress testing
  performHealthCheck();
  performPageLoad('/');
  
  // Very short think time
  sleep(Math.random() * 0.5 + 0.1);
  
  // Frequent monitoring during stress
  if (Math.random() < 0.3) { // 30% chance
    performMetricsCheck();
  }
}

function performHealthCheck() {
  const response = http.get(`${API_BASE}/health`, {
    timeout: '10s',
    tags: { endpoint: 'health' },
  });
  
  // Performance checks
  const isSuccess = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
    'health check has worker ID': (r) => r.headers['X-Worker-Id'] !== undefined,
    'health check response is valid JSON': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.status === 'healthy';
      } catch (e) {
        return false;
      }
    },
  });
  
  // Record cache hit status
  const cacheHit = response.headers['X-Cache'] === 'HIT';
  cacheHitRate.add(cacheHit ? 1 : 0);
  
  // Record performance metrics
  responseTimeP95.add(response.timings.duration);
  responseTimeP99.add(response.timings.duration);
  
  if (!isSuccess) {
    errorRate.add(1);
  }
  
  // Extract and record memory usage if available
  try {
    const healthData = JSON.parse(response.body);
    if (healthData.memory && healthData.memory.heapUsed) {
      memoryUsage.add(healthData.memory.heapUsed / 1024 / 1024); // Convert to MB
    }
  } catch (e) {
    // Ignore parsing errors
  }
}

function performPageLoad(path = '/') {
  const response = http.get(`${API_BASE}${path}`, {
    timeout: '30s',
    tags: { endpoint: path === '/' ? 'homepage' : 'page' },
  });
  
  const isSuccess = check(response, {
    'page load status is 200': (r) => r.status === 200,
    'page load response time < 2s': (r) => r.timings.duration < 2000,
    'page contains expected content': (r) => r.body.includes('Must Be Viral'),
    'page has proper content type': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('text/html'),
  });
  
  // Record performance metrics
  responseTimeP95.add(response.timings.duration);
  responseTimeP99.add(response.timings.duration);
  
  if (!isSuccess) {
    errorRate.add(1);
  }
  
  // Check for performance headers
  check(response, {
    'has security headers': (r) => {
      return r.headers['X-Content-Type-Options'] === 'nosniff' &&
             r.headers['X-Frame-Options'] === 'DENY' &&
             r.headers['X-Xss-Protection'] === '1; mode=block';
    },
  });
}

function performMetricsCheck() {
  const response = http.get(`${API_BASE}/metrics`, {
    timeout: '15s',
    tags: { endpoint: 'metrics' },
  });
  
  const isSuccess = check(response, {
    'metrics status is 200': (r) => r.status === 200,
    'metrics response time < 500ms': (r) => r.timings.duration < 500,
    'metrics content type is text/plain': (r) => r.headers['Content-Type'] === 'text/plain',
    'metrics contains prometheus format': (r) => r.body.includes('# HELP') && r.body.includes('# TYPE'),
  });
  
  // Record cache hit status
  const cacheHit = response.headers['X-Cache'] === 'HIT';
  cacheHitRate.add(cacheHit ? 1 : 0);
  
  responseTimeP95.add(response.timings.duration);
  responseTimeP99.add(response.timings.duration);
  
  if (!isSuccess) {
    errorRate.add(1);
  }
}

// Test lifecycle hooks
export function setup() {
  console.log('🚀 Starting Must Be Viral V2 Performance Tests');
  console.log(`📊 Base URL: ${BASE_URL}`);
  console.log(`👥 Test Users: ${testData.users.length}`);
  
  // Warm-up request
  const warmupResponse = http.get(`${API_BASE}/health`);
  if (warmupResponse.status !== 200) {
    throw new Error(`Warmup failed: ${warmupResponse.status} - ${warmupResponse.body}`);
  }
  
  console.log('✅ Warmup completed successfully');
  return { baseUrl: BASE_URL, timestamp: new Date().toISOString() };
}

export function teardown(data) {
  console.log('📋 Performance Test Summary');
  console.log(`📅 Started: ${data.timestamp}`);
  console.log(`🏁 Completed: ${new Date().toISOString()}`);
  console.log('🎯 Check detailed results in the k6 output');
}

// Advanced performance analysis
export function handleSummary(data) {
  // Generate detailed HTML report
  const htmlReport = generateHTMLReport(data);
  
  // Generate JSON report for CI/CD pipeline
  const jsonReport = {
    timestamp: new Date().toISOString(),
    test_duration: data.state.testRunDurationMs / 1000,
    metrics: {
      requests: {
        total: data.metrics.http_reqs.values.count,
        rate: data.metrics.http_reqs.values.rate,
        failed: data.metrics.http_req_failed.values.rate * 100,
      },
      response_time: {
        avg: data.metrics.http_req_duration.values.avg,
        p95: data.metrics.http_req_duration.values['p(95)'],
        p99: data.metrics.http_req_duration.values['p(99)'],
        max: data.metrics.http_req_duration.values.max,
      },
      cache_performance: {
        hit_rate: (data.metrics.cache_hit_rate?.values?.rate || 0) * 100,
      },
      resource_usage: {
        memory_mb_avg: data.metrics.memory_usage_mb?.values?.avg || 0,
        memory_mb_max: data.metrics.memory_usage_mb?.values?.max || 0,
      },
    },
    thresholds_passed: Object.keys(data.thresholds).every(
      threshold => data.thresholds[threshold].ok
    ),
  };
  
  return {
    'performance-report.html': htmlReport,
    'performance-results.json': JSON.stringify(jsonReport, null, 2),
    stdout: generateConsoleReport(data),
  };
}

function generateHTMLReport(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Must Be Viral V2 - Performance Test Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .metric { background: #f5f5f5; padding: 20px; margin: 10px 0; border-radius: 5px; }
        .passed { border-left: 5px solid #28a745; }
        .failed { border-left: 5px solid #dc3545; }
        .summary { background: #e9ecef; padding: 30px; border-radius: 10px; }
      </style>
    </head>
    <body>
      <h1>🚀 Must Be Viral V2 Performance Report</h1>
      <div class="summary">
        <h2>📊 Test Summary</h2>
        <p><strong>Total Requests:</strong> ${data.metrics.http_reqs.values.count}</p>
        <p><strong>Request Rate:</strong> ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s</p>
        <p><strong>Error Rate:</strong> ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</p>
        <p><strong>Average Response Time:</strong> ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</p>
        <p><strong>95th Percentile:</strong> ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</p>
        <p><strong>99th Percentile:</strong> ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms</p>
      </div>
      
      <h2>🎯 Performance Thresholds</h2>
      ${Object.entries(data.thresholds).map(([name, threshold]) => `
        <div class="metric ${threshold.ok ? 'passed' : 'failed'}">
          <strong>${name}</strong>: ${threshold.ok ? '✅ PASSED' : '❌ FAILED'}
        </div>
      `).join('')}
      
      <h2>📈 Detailed Metrics</h2>
      <div class="metric">
        <h3>Response Times</h3>
        <ul>
          <li>Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</li>
          <li>Median: ${data.metrics.http_req_duration.values.med.toFixed(2)}ms</li>
          <li>95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</li>
          <li>99th Percentile: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms</li>
          <li>Maximum: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms</li>
        </ul>
      </div>
    </body>
    </html>
  `;
}

function generateConsoleReport(data) {
  return `
  📋 PERFORMANCE TEST RESULTS
  ═══════════════════════════════════════
  📊 Total Requests: ${data.metrics.http_reqs.values.count}
  🚀 Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s
  ⚠️  Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
  ⏱️  Avg Response: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
  📈 95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
  🔥 99th Percentile: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
  
  ${Object.keys(data.thresholds).every(t => data.thresholds[t].ok) ? 
    '🎉 ALL PERFORMANCE THRESHOLDS PASSED!' : 
    '⚠️  SOME PERFORMANCE THRESHOLDS FAILED!'}
  ═══════════════════════════════════════
  `;
}
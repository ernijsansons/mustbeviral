/**
 * Comprehensive Load Testing Suite for Must Be Viral V2
 * Uses K6 for performance testing
 *
 * Installation:
 * - Install k6: https://k6.io/docs/getting-started/installation/
 * - Run: k6 run comprehensive-load-test.js
 * - Dashboard: k6 run --out influxdb=http://localhost:8086/k6 comprehensive-load-test.js
 */

import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomString, randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// ============================================
// Configuration
// ============================================

const BASE_URL = __ENV.BASE_URL || 'https://api.mustbeviral.com';
const TEST_USERS = __ENV.TEST_USERS ? JSON.parse(__ENV.TEST_USERS) : [];

// Test scenarios configuration
export const options = {
  scenarios: {
    // 1. Smoke Test - Verify basic functionality
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      startTime: '0s',
      tags: { scenario: 'smoke' }
    },

    // 2. Load Test - Normal expected load
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Increase to 100
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      startTime: '2m',
      tags: { scenario: 'load' }
    },

    // 3. Stress Test - Beyond normal capacity
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 0 },
      ],
      startTime: '20m',
      tags: { scenario: 'stress' }
    },

    // 4. Spike Test - Sudden traffic surge
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 },  // Spike to 500 users
        { duration: '1m', target: 500 },   // Stay at 500
        { duration: '10s', target: 0 },    // Drop to 0
      ],
      startTime: '45m',
      tags: { scenario: 'spike' }
    },

    // 5. Soak Test - Extended duration
    soak_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2h',
      startTime: '50m',
      tags: { scenario: 'soak' }
    }
  },

  thresholds: {
    // Overall thresholds
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // 95% under 1s, 99% under 2s
    http_req_failed: ['rate<0.1'],                    // Error rate under 10%

    // Scenario-specific thresholds
    'http_req_duration{scenario:load}': ['p(95)<500'],
    'http_req_duration{scenario:stress}': ['p(95)<2000'],
    'http_req_duration{scenario:spike}': ['p(95)<3000'],

    // Custom metrics thresholds
    api_errors: ['rate<0.05'],
    auth_success: ['rate>0.95'],
    content_creation_time: ['p(95)<3000'],
  },
};

// ============================================
// Custom Metrics
// ============================================

const apiErrors = new Rate('api_errors');
const authSuccess = new Rate('auth_success');
const contentCreationTime = new Trend('content_creation_time');
const aiGenerationTime = new Trend('ai_generation_time');
const activeUsers = new Gauge('active_users');
const contentCreated = new Counter('content_created');

// ============================================
// Helper Functions
// ============================================

/**
 * Generate test user credentials
 */
function generateTestUser() {
  const username = `testuser_${randomString(8)}`;
  return {
    username,
    email: `${username}@test.mustbeviral.com`,
    password: 'TestPass123!',
    role: randomItem(['creator', 'influencer', 'brand'])
  };
}

/**
 * Generate test content
 */
function generateTestContent() {
  const types = ['blog_post', 'social_post', 'video_script', 'email', 'ad_copy'];
  const topics = ['technology', 'fashion', 'travel', 'food', 'fitness', 'business'];

  return {
    title: `Test Content ${randomString(10)}`,
    body: `This is test content generated at ${new Date().toISOString()}. ${randomString(100)}`,
    type: randomItem(types),
    topic: randomItem(topics),
    aiGenerated: Math.random() > 0.5,
    tags: [randomItem(topics), randomString(5)]
  };
}

/**
 * Make authenticated request
 */
function authenticatedRequest(url, method, body, token) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : undefined,
      'X-Test-User': 'k6-load-test',
    },
    tags: {
      endpoint: url,
    },
    timeout: '30s',
  };

  if (body) {
    params.body = JSON.stringify(body);
  }

  return http.request(method, `${BASE_URL}${url}`, params.body, params);
}

// ============================================
// Test Scenarios
// ============================================

/**
 * User Registration Flow
 */
function userRegistrationFlow() {
  group('User Registration', () => {
    const user = generateTestUser();

    const registerRes = authenticatedRequest(
      '/api/auth/register',
      'POST',
      user
    );

    const success = check(registerRes, {
      'registration successful': (r) => r.status === 201 || r.status === 200,
      'received auth token': (r) => r.json('token') !== undefined,
      'received user data': (r) => r.json('user.id') !== undefined,
    });

    authSuccess.add(success ? 1 : 0);

    if (!success) {
      apiErrors.add(1);
      console.error(`Registration failed: ${registerRes.status} - ${registerRes.body}`);
    }

    return registerRes.json('token');
  });
}

/**
 * User Login Flow
 */
function userLoginFlow() {
  group('User Login', () => {
    const loginRes = authenticatedRequest(
      '/api/auth/login',
      'POST',
      {
        email: 'test@mustbeviral.com',
        password: 'TestPass123!'
      }
    );

    const success = check(loginRes, {
      'login successful': (r) => r.status === 200,
      'received token': (r) => r.json('token') !== undefined,
    });

    authSuccess.add(success ? 1 : 0);

    if (success) {
      activeUsers.add(1);
      return loginRes.json('token');
    } else {
      apiErrors.add(1);
      return null;
    }
  });
}

/**
 * Content Creation Flow
 */
function contentCreationFlow(token) {
  group('Content Creation', () => {
    const content = generateTestContent();
    const startTime = Date.now();

    const createRes = authenticatedRequest(
      '/api/content',
      'POST',
      content,
      token
    );

    const duration = Date.now() - startTime;
    contentCreationTime.add(duration);

    const success = check(createRes, {
      'content created': (r) => r.status === 201 || r.status === 200,
      'received content id': (r) => r.json('id') !== undefined,
      'response time < 3s': (r) => duration < 3000,
    });

    if (success) {
      contentCreated.add(1);
      return createRes.json('id');
    } else {
      apiErrors.add(1);
      console.error(`Content creation failed: ${createRes.status}`);
      return null;
    }
  });
}

/**
 * AI Generation Flow
 */
function aiGenerationFlow(token) {
  group('AI Content Generation', () => {
    const startTime = Date.now();

    const aiRes = authenticatedRequest(
      '/api/ai/generate',
      'POST',
      {
        prompt: 'Create a viral tweet about technology',
        type: 'social_post',
        platform: 'twitter',
        tone: 'professional'
      },
      token
    );

    const duration = Date.now() - startTime;
    aiGenerationTime.add(duration);

    check(aiRes, {
      'AI generation successful': (r) => r.status === 200,
      'received generated content': (r) => r.json('content') !== undefined,
      'response time < 10s': (r) => duration < 10000,
    });

    if (aiRes.status !== 200) {
      apiErrors.add(1);
    }
  });
}

/**
 * Content Browsing Flow
 */
function contentBrowsingFlow() {
  group('Content Browsing', () => {
    // Get public content
    const publicRes = authenticatedRequest(
      '/api/content/public',
      'GET'
    );

    check(publicRes, {
      'public content loaded': (r) => r.status === 200,
      'received content array': (r) => Array.isArray(r.json('content')),
      'response time < 1s': (r) => r.timings.duration < 1000,
    });

    // Get trending content
    const trendingRes = authenticatedRequest(
      '/api/content/trending',
      'GET'
    );

    check(trendingRes, {
      'trending content loaded': (r) => r.status === 200,
    });

    // Search content
    const searchRes = authenticatedRequest(
      `/api/content/search?q=${randomString(5)}`,
      'GET'
    );

    check(searchRes, {
      'search completed': (r) => r.status === 200,
      'search response < 2s': (r) => r.timings.duration < 2000,
    });
  });
}

/**
 * Analytics Flow
 */
function analyticsFlow(token) {
  group('Analytics Dashboard', () => {
    // Get user analytics
    const analyticsRes = authenticatedRequest(
      '/api/analytics/dashboard',
      'GET',
      null,
      token
    );

    check(analyticsRes, {
      'analytics loaded': (r) => r.status === 200,
      'received metrics': (r) => r.json('metrics') !== undefined,
    });

    // Get engagement metrics
    const engagementRes = authenticatedRequest(
      '/api/analytics/engagement',
      'GET',
      null,
      token
    );

    check(engagementRes, {
      'engagement data loaded': (r) => r.status === 200,
    });
  });
}

/**
 * Payment Flow Simulation
 */
function paymentFlow(token) {
  group('Payment Processing', () => {
    // Create subscription
    const subscriptionRes = authenticatedRequest(
      '/api/payments/subscribe',
      'POST',
      {
        plan: 'pro',
        paymentMethod: 'pm_card_visa' // Test payment method
      },
      token
    );

    check(subscriptionRes, {
      'subscription created': (r) => r.status === 200 || r.status === 201,
      'received subscription id': (r) => r.json('subscriptionId') !== undefined,
    });

    // Get billing info
    const billingRes = authenticatedRequest(
      '/api/payments/billing',
      'GET',
      null,
      token
    );

    check(billingRes, {
      'billing info retrieved': (r) => r.status === 200,
    });
  });
}

/**
 * API Health Checks
 */
function healthChecks() {
  group('Health Checks', () => {
    const healthRes = http.get(`${BASE_URL}/health`);

    check(healthRes, {
      'API is healthy': (r) => r.status === 200,
      'database connected': (r) => r.json('database.connected') === true,
      'redis connected': (r) => r.json('redis.connected') === true,
    });

    const metricsRes = http.get(`${BASE_URL}/metrics`);

    check(metricsRes, {
      'metrics endpoint available': (r) => r.status === 200,
    });
  });
}

// ============================================
// Main Test Execution
// ============================================

export default function() {
  // Determine which scenario is running
  const scenario = __ENV.scenario || exec.scenario.name;

  // Always start with health check
  healthChecks();

  // Execute different flows based on scenario
  switch(scenario) {
    case 'smoke_test':
      // Basic functionality test
      const smokeToken = userLoginFlow();
      if (smokeToken) {
        contentBrowsingFlow();
        contentCreationFlow(smokeToken);
      }
      break;

    case 'load_test':
    case 'soak_test':
      // Normal user behavior simulation
      const loadToken = Math.random() > 0.3 ? userLoginFlow() : userRegistrationFlow();

      if (loadToken) {
        // Simulate realistic user journey
        contentBrowsingFlow();
        sleep(randomIntBetween(1, 3));

        if (Math.random() > 0.5) {
          contentCreationFlow(loadToken);
          sleep(randomIntBetween(2, 5));
        }

        if (Math.random() > 0.7) {
          aiGenerationFlow(loadToken);
          sleep(randomIntBetween(3, 7));
        }

        if (Math.random() > 0.8) {
          analyticsFlow(loadToken);
        }

        if (Math.random() > 0.95) {
          paymentFlow(loadToken);
        }
      } else {
        // Unauthenticated browsing
        contentBrowsingFlow();
      }
      break;

    case 'stress_test':
    case 'spike_test':
      // Heavy load simulation
      const stressToken = userLoginFlow();

      if (stressToken) {
        // Aggressive testing
        for (let i = 0; i < 3; i++) {
          contentCreationFlow(stressToken);
          aiGenerationFlow(stressToken);
        }
        analyticsFlow(stressToken);
      }
      break;

    default:
      // Default behavior
      contentBrowsingFlow();
      break;
  }

  // Random sleep to simulate think time
  sleep(randomIntBetween(1, 5));
}

// ============================================
// Lifecycle Hooks
// ============================================

/**
 * Setup function - runs once per VU before test
 */
export function setup() {
  console.log('===========================================');
  console.log('Must Be Viral V2 - Load Testing Started');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('===========================================');

  // Verify API is accessible
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    fail('API is not healthy, aborting test');
  }

  // Create test users if needed
  const testUsers = [];
  for (let i = 0; i < 5; i++) {
    const user = generateTestUser();
    const res = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify(user),
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (res.status === 201 || res.status === 200) {
      testUsers.push({
        ...user,
        token: res.json('token')
      });
    }
  }

  return { testUsers };
}

/**
 * Teardown function - runs once after all tests
 */
export function teardown(data) {
  console.log('===========================================');
  console.log('Load Testing Completed');
  console.log(`End Time: ${new Date().toISOString()}`);
  console.log('===========================================');

  // Clean up test data if needed
  // Note: In production, you might want to keep test data for analysis
}

/**
 * Handle test results
 */
export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data, null, 2),
    'summary.json': JSON.stringify(data, null, 2),
    'summary.html': htmlReport(data),
  };
}

/**
 * Generate HTML report
 */
function htmlReport(data) {
  const scenarios = data.root_group.scenarios || {};
  const metrics = data.metrics || {};

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Load Test Results - Must Be Viral V2</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; }
        .success { color: green; }
        .failure { color: red; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
        th { background: #333; color: white; }
    </style>
</head>
<body>
    <h1>Load Test Results - Must Be Viral V2</h1>
    <p>Test completed at: ${new Date().toISOString()}</p>

    <h2>Summary</h2>
    <div class="metric">
        <strong>Total Requests:</strong> ${metrics.http_reqs?.values?.count || 0}<br>
        <strong>Failed Requests:</strong> ${metrics.http_req_failed?.values?.fails || 0}<br>
        <strong>Average Response Time:</strong> ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms<br>
        <strong>P95 Response Time:</strong> ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms
    </div>

    <h2>Scenarios</h2>
    <table>
        <tr>
            <th>Scenario</th>
            <th>Status</th>
            <th>Duration</th>
            <th>VUs</th>
        </tr>
        ${Object.entries(scenarios).map(([name, scenario]) => `
        <tr>
            <td>${name}</td>
            <td class="${scenario.status === 'passed' ? 'success' : 'failure'}">${scenario.status}</td>
            <td>${scenario.duration}</td>
            <td>${scenario.vus}</td>
        </tr>
        `).join('')}
    </table>

    <h2>Custom Metrics</h2>
    <div class="metric">
        <strong>API Error Rate:</strong> ${((metrics.api_errors?.values?.rate || 0) * 100).toFixed(2)}%<br>
        <strong>Auth Success Rate:</strong> ${((metrics.auth_success?.values?.rate || 0) * 100).toFixed(2)}%<br>
        <strong>Content Created:</strong> ${metrics.content_created?.values?.count || 0}<br>
        <strong>AI Generation Time (P95):</strong> ${(metrics.ai_generation_time?.values?.['p(95)'] || 0).toFixed(2)}ms
    </div>
</body>
</html>
  `;
}
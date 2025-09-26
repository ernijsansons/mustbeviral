/**
 * Load Testing - Authentication Endpoints
 * Tests authentication performance under various load scenarios
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const successfulLogins = new Rate('successful_logins');
const failedLogins = new Rate('failed_logins');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Ramp-up test
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },   // Ramp up to 10 users over 2 minutes
        { duration: '5m', target: 50 },   // Stay at 50 users for 5 minutes
        { duration: '2m', target: 100 },  // Ramp up to 100 users over 2 minutes
        { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
        { duration: '2m', target: 0 },    // Ramp down to 0 users
      ],
    },

    // Scenario 2: Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },   // Normal load
        { duration: '30s', target: 200 }, // Spike to 200 users
        { duration: '1m', target: 20 },   // Back to normal
      ],
      startTime: '16m', // Start after ramp-up test
    },

    // Scenario 3: Stress test
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 200 },
        { duration: '1m', target: 300 },
        { duration: '3m', target: 300 },
        { duration: '1m', target: 0 },
      ],
      startTime: '20m', // Start after spike test
    }
  },

  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.05'],   // Error rate must be below 5%
    successful_logins: ['rate>0.8'],  // At least 80% of login attempts should succeed
    errors: ['rate<0.1'],             // Error rate should be below 10%
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8787';

// Generate test users
function generateTestUser() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return {
    email: `loadtest${timestamp}${random}@mustbeviral.com`,
    username: `loaduser${timestamp}${random}`,
    password: 'LoadTest123!',
    role: 'creator'
  };
}

// Pre-created test users for login tests
const existingUsers = [
  { email: 'loadtest1@mustbeviral.com', password: 'LoadTest123!' },
  { email: 'loadtest2@mustbeviral.com', password: 'LoadTest123!' },
  { email: 'loadtest3@mustbeviral.com', password: 'LoadTest123!' },
  { email: 'loadtest4@mustbeviral.com', password: 'LoadTest123!' },
  { email: 'loadtest5@mustbeviral.com', password: 'LoadTest123!' },
];

export function setup() {
  console.log('🚀 Starting authentication load test setup...');

  // Pre-create some test users for login tests
  const setupParams = {
    headers: { 'Content-Type': 'application/json' },
  };

  for (const user of existingUsers) {
    const registerData = {
      email: user.email,
      password: user.password,
      username: user.email.split('@')[0],
      role: 'creator'
    };

    http.post(`${API_BASE_URL}/api/auth/register`, JSON.stringify(registerData), setupParams);
  }

  console.log('✅ Setup completed');
  return { existingUsers };
}

export default function (data) {
  const testType = Math.random();

  if (testType < 0.4) {
    // 40% - User registration test
    testUserRegistration();
  } else if (testType < 0.8) {
    // 40% - User login test
    testUserLogin(data.existingUsers);
  } else {
    // 20% - Token refresh test
    testTokenRefresh(data.existingUsers);
  }

  sleep(1); // Wait 1 second between requests
}

function testUserRegistration() {
  const testUser = generateTestUser();

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { test_type: 'registration' },
  };

  const response = http.post(
    `${API_BASE_URL}/api/auth/register`,
    JSON.stringify(testUser),
    params
  );

  const success = check(response, {
    'registration status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'registration response time < 2s': (r) => r.timings.duration < 2000,
    'registration returns token': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.token !== undefined;
      } catch (e) {
        return false;
      }
    }
  });

  if (!success) {
    errorRate.add(1);
    console.log(`Registration failed: ${response.status} - ${response.body}`);
  }
}

function testUserLogin(existingUsers) {
  const user = existingUsers[Math.floor(Math.random() * existingUsers.length)];

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { test_type: 'login' },
  };

  const response = http.post(
    `${API_BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password
    }),
    params
  );

  const success = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 1s': (r) => r.timings.duration < 1000,
    'login returns token': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.token !== undefined && json.refreshToken !== undefined;
      } catch (e) {
        return false;
      }
    }
  });

  if (success) {
    successfulLogins.add(1);
  } else {
    failedLogins.add(1);
    errorRate.add(1);
    console.log(`Login failed: ${response.status} - ${response.body}`);
  }
}

function testTokenRefresh(existingUsers) {
  // First, login to get tokens
  const user = existingUsers[Math.floor(Math.random() * existingUsers.length)];

  const loginResponse = http.post(
    `${API_BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (loginResponse.status !== 200) {
    errorRate.add(1);
    return;
  }

  let loginData;
  try {
    loginData = JSON.parse(loginResponse.body);
  } catch (e) {
    errorRate.add(1);
    return;
  }

  // Now test token refresh
  const refreshParams = {
    headers: { 'Content-Type': 'application/json' },
    tags: { test_type: 'token_refresh' },
  };

  const refreshResponse = http.post(
    `${API_BASE_URL}/api/auth/refresh`,
    JSON.stringify({
      refreshToken: loginData.refreshToken
    }),
    refreshParams
  );

  const success = check(refreshResponse, {
    'token refresh status is 200': (r) => r.status === 200,
    'token refresh response time < 500ms': (r) => r.timings.duration < 500,
    'token refresh returns new token': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.token !== undefined;
      } catch (e) {
        return false;
      }
    }
  });

  if (!success) {
    errorRate.add(1);
    console.log(`Token refresh failed: ${refreshResponse.status} - ${refreshResponse.body}`);
  }
}

export function teardown(data) {
  console.log('🧹 Cleaning up authentication load test...');

  // In a real scenario, you might want to clean up test data
  // For now, we'll leave the data for analysis

  console.log('✅ Teardown completed');
}

// Handle different load test scenarios
export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: `
🎯 Authentication Load Test Results Summary
==========================================

📊 Request Metrics:
- Total Requests: ${data.metrics.http_reqs.values.count}
- Failed Requests: ${data.metrics.http_req_failed.values.passes}
- Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s

⏱️  Response Time Metrics:
- Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
- 95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
- 99th Percentile: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms

✅ Success Metrics:
- Successful Logins: ${(data.metrics.successful_logins?.values.rate * 100 || 0).toFixed(2)}%
- Error Rate: ${(data.metrics.errors?.values.rate * 100 || 0).toFixed(2)}%

🎯 Threshold Results:
${Object.entries(data.thresholds || {}).map(([key, result]) =>
  `- ${key}: ${result.ok ? '✅ PASS' : '❌ FAIL'}`
).join('\n')}
`,
  };
}
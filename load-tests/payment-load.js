/**
 * Load Testing - Payment and Boost Endpoints
 * Tests payment processing under various load conditions
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const paymentIntents = new Counter('payment_intents_created');
const paymentSuccesses = new Counter('payment_successes');
const paymentFailures = new Counter('payment_failures');
const boostCreations = new Counter('boost_creations');
const paymentLatency = new Trend('payment_processing_time');

export const options = {
  scenarios: {
    // Normal payment load
    normal_payments: {
      executor: 'constant-vus',
      vus: 10,
      duration: '3m',
    },

    // Payment burst (Black Friday scenario)
    payment_burst: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 25 },
        { duration: '1m', target: 75 },
        { duration: '30s', target: 25 },
      ],
      startTime: '4m',
    },

    // High-value transaction test
    high_value_payments: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      startTime: '7m',
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% under 3s for payments
    http_req_failed: ['rate<0.01'],    // Less than 1% failures for payments
    payment_processing_time: ['p(90)<2000'], // 90% of payments under 2s
    errors: ['rate<0.02'],             // Less than 2% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8787';

// Test payment data
const testCards = [
  { number: '4242424242424242', cvc: '123', exp_month: 12, exp_year: 2030 }, // Visa success
  { number: '4000000000000002', cvc: '123', exp_month: 12, exp_year: 2030 }, // Visa declined
  { number: '5555555555554444', cvc: '123', exp_month: 12, exp_year: 2030 }, // Mastercard success
  { number: '378282246310005', cvc: '1234', exp_month: 12, exp_year: 2030 }, // Amex success
];

const boostAmounts = [10, 25, 50, 100, 250, 500];
const boostDurations = [1, 3, 7, 14, 30];

export function setup() {
  console.log('🚀 Starting payment load test setup...');

  // Create test user
  const testUser = {
    email: 'paymentload@mustbeviral.com',
    username: 'paymentloaduser',
    password: 'PaymentLoad123!',
    role: 'creator'
  };

  // Register test user
  const registerResponse = http.post(
    `${API_BASE_URL}/api/auth/register`,
    JSON.stringify(testUser),
    { headers: { 'Content-Type': 'application/json' } }
  );

  // Login to get auth token
  const loginResponse = http.post(
    `${API_BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: testUser.email,
      password: testUser.password
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  let authToken = null;
  if (loginResponse.status === 200) {
    try {
      const loginData = JSON.parse(loginResponse.body);
      authToken = loginData.token;
    } catch (e) {
      console.log('Failed to parse login response');
    }
  }

  // Create test content for boost campaigns
  const testContent = {
    title: 'Payment Load Test Content',
    description: 'Content for payment load testing',
    type: 'video',
    url: 'https://example.com/loadtest.mp4'
  };

  let contentId = null;
  if (authToken) {
    const contentResponse = http.post(
      `${API_BASE_URL}/api/content`,
      JSON.stringify(testContent),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    if (contentResponse.status === 201) {
      try {
        const contentData = JSON.parse(contentResponse.body);
        contentId = contentData.data.id;
      } catch (e) {
        console.log('Failed to parse content response');
      }
    }
  }

  console.log('✅ Payment load test setup completed');
  return { authToken, contentId };
}

export default function (data) {
  if (!data.authToken) {
    console.log('No auth token available, skipping test');
    return;
  }

  const testType = Math.random();

  if (testType < 0.6) {
    // 60% - Boost payment flow
    testBoostPaymentFlow(data.authToken, data.contentId);
  } else if (testType < 0.8) {
    // 20% - Payment intent creation
    testPaymentIntentCreation(data.authToken);
  } else {
    // 20% - Payment method management
    testPaymentMethodManagement(data.authToken);
  }

  sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}

function testBoostPaymentFlow(authToken, contentId) {
  if (!contentId) {
    return;
  }

  // Step 1: Create boost campaign
  const boostData = {
    contentId: contentId,
    amount: boostAmounts[Math.floor(Math.random() * boostAmounts.length)],
    duration: boostDurations[Math.floor(Math.random() * boostDurations.length)],
    targetAudience: 'global',
    objectives: ['views', 'engagement']
  };

  const boostParams = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    tags: { operation: 'boost_creation' },
  };

  const startTime = Date.now();

  const boostResponse = http.post(
    `${API_BASE_URL}/api/boost`,
    JSON.stringify(boostData),
    boostParams
  );

  const boostSuccess = check(boostResponse, {
    'boost creation status is 201': (r) => r.status === 201,
    'boost creation response time < 1s': (r) => r.timings.duration < 1000,
    'boost creation returns boost data': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.success === true && json.data !== undefined;
      } catch (e) {
        return false;
      }
    }
  });

  if (!boostSuccess) {
    errorRate.add(1);
    console.log(`Boost creation failed: ${boostResponse.status} - ${boostResponse.body}`);
    return;
  }

  boostCreations.add(1);

  // Step 2: Create payment intent
  const paymentIntentData = {
    amount: boostData.amount,
    currency: 'USD',
    description: `Boost campaign for content ${contentId}`
  };

  const paymentIntentResponse = http.post(
    `${API_BASE_URL}/api/payments/intent`,
    JSON.stringify(paymentIntentData),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      tags: { operation: 'payment_intent' },
    }
  );

  const intentSuccess = check(paymentIntentResponse, {
    'payment intent status is 200': (r) => r.status === 200,
    'payment intent response time < 1s': (r) => r.timings.duration < 1000,
    'payment intent returns client secret': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.success === true && json.data.clientSecret !== undefined;
      } catch (e) {
        return false;
      }
    }
  });

  if (!intentSuccess) {
    errorRate.add(1);
    console.log(`Payment intent failed: ${paymentIntentResponse.status} - ${paymentIntentResponse.body}`);
    return;
  }

  paymentIntents.add(1);

  // Step 3: Simulate payment confirmation
  let paymentIntentId;
  try {
    const intentData = JSON.parse(paymentIntentResponse.body);
    paymentIntentId = intentData.data.id;
  } catch (e) {
    errorRate.add(1);
    return;
  }

  const confirmData = {
    paymentIntentId: paymentIntentId,
    paymentMethodId: 'pm_card_visa' // Mock payment method
  };

  const confirmResponse = http.post(
    `${API_BASE_URL}/api/payments/confirm`,
    JSON.stringify(confirmData),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      tags: { operation: 'payment_confirm' },
    }
  );

  const endTime = Date.now();
  paymentLatency.add(endTime - startTime);

  const confirmSuccess = check(confirmResponse, {
    'payment confirmation status is 200': (r) => r.status === 200,
    'payment confirmation response time < 3s': (r) => r.timings.duration < 3000,
    'payment confirmation returns success': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.success === true;
      } catch (e) {
        return false;
      }
    }
  });

  if (confirmSuccess) {
    paymentSuccesses.add(1);
  } else {
    paymentFailures.add(1);
    errorRate.add(1);
    console.log(`Payment confirmation failed: ${confirmResponse.status} - ${confirmResponse.body}`);
  }
}

function testPaymentIntentCreation(authToken) {
  const amounts = [10, 25, 50, 100, 250];
  const amount = amounts[Math.floor(Math.random() * amounts.length)];

  const intentData = {
    amount: amount,
    currency: 'USD',
    description: 'Load test payment intent'
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    tags: { operation: 'payment_intent_only' },
  };

  const response = http.post(
    `${API_BASE_URL}/api/payments/intent`,
    JSON.stringify(intentData),
    params
  );

  const success = check(response, {
    'standalone intent status is 200': (r) => r.status === 200,
    'standalone intent response time < 500ms': (r) => r.timings.duration < 500,
    'standalone intent returns data': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.success === true && json.data !== undefined;
      } catch (e) {
        return false;
      }
    }
  });

  if (success) {
    paymentIntents.add(1);
  } else {
    errorRate.add(1);
    console.log(`Standalone payment intent failed: ${response.status} - ${response.body}`);
  }
}

function testPaymentMethodManagement(authToken) {
  const params = {
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    tags: { operation: 'payment_methods' },
  };

  // Test getting payment methods
  const getResponse = http.get(
    `${API_BASE_URL}/api/payments/methods`,
    params
  );

  const getSuccess = check(getResponse, {
    'get payment methods status is 200': (r) => r.status === 200,
    'get payment methods response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (!getSuccess) {
    errorRate.add(1);
  }

  // Test payment history
  const historyResponse = http.get(
    `${API_BASE_URL}/api/payments?page=1&limit=10`,
    params
  );

  const historySuccess = check(historyResponse, {
    'payment history status is 200': (r) => r.status === 200,
    'payment history response time < 1s': (r) => r.timings.duration < 1000,
  });

  if (!historySuccess) {
    errorRate.add(1);
  }
}

export function teardown(data) {
  console.log('🧹 Cleaning up payment load test...');

  // In production, you might want to:
  // - Cancel any pending payments
  // - Clean up test data
  // - Generate cleanup report

  console.log('✅ Payment load test teardown completed');
}

export function handleSummary(data) {
  return {
    'payment-load-results.json': JSON.stringify(data, null, 2),
    stdout: `
🎯 Payment System Load Test Results
===================================

📊 Request Metrics:
- Total Requests: ${data.metrics.http_reqs.values.count}
- Failed Requests: ${data.metrics.http_req_failed.values.passes}
- Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s

💳 Payment Metrics:
- Payment Intents Created: ${data.metrics.payment_intents_created?.values.count || 0}
- Successful Payments: ${data.metrics.payment_successes?.values.count || 0}
- Failed Payments: ${data.metrics.payment_failures?.values.count || 0}
- Boost Campaigns Created: ${data.metrics.boost_creations?.values.count || 0}

⏱️  Response Time Metrics:
- Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
- Payment Processing (p90): ${data.metrics.payment_processing_time?.values['p(90)']?.toFixed(2) || 'N/A'}ms
- 95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms

✅ Success Metrics:
- Payment Success Rate: ${data.metrics.payment_successes?.values.count && data.metrics.payment_intents_created?.values.count ?
  ((data.metrics.payment_successes.values.count / data.metrics.payment_intents_created.values.count) * 100).toFixed(2) : 0}%
- Error Rate: ${(data.metrics.errors?.values.rate * 100 || 0).toFixed(2)}%

🎯 Threshold Results:
${Object.entries(data.thresholds || {}).map(([key, result]) =>
  `- ${key}: ${result.ok ? '✅ PASS' : '❌ FAIL'}`
).join('\n')}
`,
  };
}
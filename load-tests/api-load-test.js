/**
 * K6 Load Test for Must Be Viral V2 API
 * Validates performance optimizations under realistic load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTimeTrend = new Trend('response_time_custom');
const requestCounter = new Counter('requests_total');

// Test configuration based on environment
const isStaging = __ENV.TEST_ENV === 'staging';
const isProduction = __ENV.TEST_ENV === 'production';

export let options = {
  // Progressive load test scenarios
  scenarios: {
    // Warm-up phase
    warmup: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '30s', target: 5 },
      ],
      gracefulRampDown: '10s',
    },
    
    // Load test phase
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: isProduction ? [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 40 },
        { duration: '5m', target: 40 },
        { duration: '2m', target: 0 },
      ] : [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      startTime: '1m', // Start after warmup
    },
    
    // Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: isProduction ? 100 : 50 },
        { duration: '30s', target: 0 },
      ],
      startTime: '10m', // Start after load test
    },
  },
  
  // Performance thresholds
  thresholds: {
    // 95% of requests must complete within 500ms (optimized target)
    http_req_duration: isProduction ? ['p(95)<500'] : ['p(95)<300'],
    
    // 99% of requests must complete within 1s
    'http_req_duration{expected_response:true}': ['p(99)<1000'],
    
    // Error rate must be below 1%
    error_rate: ['rate<0.01'],
    
    // Request rate should be sustainable
    http_reqs: isProduction ? ['rate>40'] : ['rate>20'],
    
    // Failed requests should be minimal
    http_req_failed: ['rate<0.005'],
  },
  
  // Global settings
  userAgent: 'K6-LoadTest-MustBeViral/1.0',
  timeout: '30s',
};

// Base URL from environment or default
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data and utilities
const testEndpoints = [
  { path: '/', weight: 50, name: 'homepage' },
  { path: '/health', weight: 30, name: 'health_check' },
  { path: '/metrics', weight: 20, name: 'metrics' },
];

function selectEndpoint() {
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const endpoint of testEndpoints) {
    cumulative += endpoint.weight;
    if (random <= cumulative) {
      return endpoint;
    }
  }
  
  return testEndpoints[0]; // fallback
}

function validateResponse(response, endpoint) {
  const isSuccess = check(response, {
    [`${endpoint.name} - status is 200`]: (r) => r.status === 200,
    [`${endpoint.name} - response time < 1000ms`]: (r) => r.timings.duration < 1000,
    [`${endpoint.name} - response time < 500ms`]: (r) => r.timings.duration < 500,
    [`${endpoint.name} - has body`]: (r) => r.body && r.body.length > 0,
  });
  
  // Additional checks based on endpoint
  if (endpoint.name === 'health_check') {
    check(response, {
      'health - contains status': (r) => r.body.includes('status') || r.body.includes('healthy'),
      'health - has correct headers': (r) => r.headers['Content-Type'].includes('json'),
    });
  }
  
  if (endpoint.name === 'metrics') {
    check(response, {
      'metrics - prometheus format': (r) => r.body.includes('# HELP') && r.body.includes('# TYPE'),
      'metrics - has nodejs metrics': (r) => r.body.includes('nodejs_'),
    });
  }
  
  // Record custom metrics
  errorRate.add(!isSuccess);
  responseTimeTrend.add(response.timings.duration);
  requestCounter.add(1);
  
  return isSuccess;
}

export default function() {
  // Select endpoint based on weight distribution
  const endpoint = selectEndpoint();
  
  // Add realistic headers
  const params = {
    headers: {
      'Accept': endpoint.name === 'metrics' ? 'text/plain' : 'text/html,application/json,*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'User-Agent': 'K6-LoadTest-MustBeViral/1.0',
    },
    timeout: '10s',
  };
  
  // Make request with error handling
  let response;
  try {
    response = http.get(`${BASE_URL}${endpoint.path}`, params);
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    errorRate.add(1);
    return;
  }
  
  // Validate response
  const isValid = validateResponse(response, endpoint);
  
  // Log performance issues
  if (response.timings.duration > 1000) {
    console.warn(`Slow request: ${endpoint.path} took ${response.timings.duration}ms`);
  }
  
  if (!isValid) {
    console.error(`Failed request: ${endpoint.path} - Status: ${response.status}`);
  }
  
  // Simulate realistic user behavior
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 second pause
}

export function handleSummary(data) {
  // Custom summary with optimization metrics
  const summary = {
    stdout: generateConsoleOutput(data),
    'performance-results.json': JSON.stringify(data, null, 2),
  };
  
  return summary;
}

function generateConsoleOutput(data) {
  const results = data.metrics;
  
  let output = '\n' + '='.repeat(80) + '\n';
  output += '📊 PERFORMANCE TEST RESULTS - Must Be Viral V2\n';
  output += '='.repeat(80) + '\n\n';
  
  // Request statistics
  output += '📈 Request Statistics:\n';
  output += `   Total Requests: ${Math.round(results.http_reqs.values.count)}\n`;
  output += `   Request Rate: ${Math.round(results.http_reqs.values.rate * 100) / 100} req/s\n`;
  output += `   Failed Requests: ${Math.round((results.http_req_failed.values.rate || 0) * 100 * 100) / 100}%\n\n`;
  
  // Response time statistics
  output += '⏱️  Response Time Statistics:\n';
  output += `   Average: ${Math.round(results.http_req_duration.values.avg * 100) / 100}ms\n`;
  output += `   Median (P50): ${Math.round(results.http_req_duration.values.med * 100) / 100}ms\n`;
  output += `   P90: ${Math.round(results.http_req_duration.values['p(90)'] * 100) / 100}ms\n`;
  output += `   P95: ${Math.round(results.http_req_duration.values['p(95)'] * 100) / 100}ms\n`;
  output += `   P99: ${Math.round(results.http_req_duration.values['p(99)'] * 100) / 100}ms\n`;
  output += `   Max: ${Math.round(results.http_req_duration.values.max * 100) / 100}ms\n\n`;
  
  // Performance grades
  const avgResponseTime = results.http_req_duration.values.avg;
  const p95ResponseTime = results.http_req_duration.values['p(95)'];
  const errorRate = (results.http_req_failed.values.rate || 0) * 100;
  const requestRate = results.http_reqs.values.rate;
  
  output += '🏆 Performance Assessment:\n';
  output += `   Response Time Grade: ${getResponseTimeGrade(avgResponseTime, p95ResponseTime)}\n`;
  output += `   Reliability Grade: ${getReliabilityGrade(errorRate)}\n`;
  output += `   Throughput Grade: ${getThroughputGrade(requestRate)}\n`;
  output += `   Overall Grade: ${getOverallGrade(avgResponseTime, p95ResponseTime, errorRate, requestRate)}\n\n`;
  
  // Optimization recommendations
  output += '💡 Optimization Recommendations:\n';
  if (p95ResponseTime > 500) {
    output += '   ⚠️  P95 response time > 500ms - Consider caching optimizations\n';
  }
  if (avgResponseTime > 200) {
    output += '   ⚠️  Average response time > 200ms - Review algorithm efficiency\n';
  }
  if (errorRate > 1) {
    output += '   ❌ Error rate > 1% - Investigate error handling\n';
  }
  if (requestRate < 50) {
    output += '   📈 Low throughput - Consider clustering or worker optimization\n';
  }
  
  if (p95ResponseTime <= 300 && errorRate < 0.5 && requestRate > 100) {
    output += '   ✅ Excellent performance! All optimization targets met.\n';
  }
  
  output += '\n' + '='.repeat(80) + '\n';
  
  return output;
}

function getResponseTimeGrade(avg, p95) {
  if (avg < 100 && p95 < 200) return 'A+ 🌟';
  if (avg < 150 && p95 < 300) return 'A 🎯';
  if (avg < 200 && p95 < 500) return 'B+ 👍';
  if (avg < 300 && p95 < 750) return 'B 👌';
  if (avg < 500 && p95 < 1000) return 'C+ 📈';
  return 'F ❌';
}

function getReliabilityGrade(errorRate) {
  if (errorRate < 0.1) return 'A+ 🌟';
  if (errorRate < 0.5) return 'A 🎯';
  if (errorRate < 1) return 'B+ 👍';
  if (errorRate < 2) return 'B 👌';
  if (errorRate < 5) return 'C+ 📈';
  return 'F ❌';
}

function getThroughputGrade(rate) {
  if (rate > 200) return 'A+ 🌟';
  if (rate > 100) return 'A 🎯';
  if (rate > 50) return 'B+ 👍';
  if (rate > 25) return 'B 👌';
  if (rate > 10) return 'C+ 📈';
  return 'F ❌';
}

function getOverallGrade(avg, p95, errorRate, rate) {
  const responseGrade = getResponseTimeGrade(avg, p95);
  const reliabilityGrade = getReliabilityGrade(errorRate);
  const throughputGrade = getThroughputGrade(rate);
  
  const grades = [responseGrade, reliabilityGrade, throughputGrade];
  const avgGradeValue = grades.reduce((sum, grade) => {
    const value = grade.includes('A+') ? 95 : 
                 grade.includes('A') ? 85 : 
                 grade.includes('B+') ? 75 : 
                 grade.includes('B') ? 65 : 
                 grade.includes('C') ? 55 : 0;
    return sum + value;
  }, 0) / 3;
  
  if (avgGradeValue >= 90) return 'A+ 🏆';
  if (avgGradeValue >= 80) return 'A 🥇';
  if (avgGradeValue >= 70) return 'B+ 🥈';
  if (avgGradeValue >= 60) return 'B 🥉';
  if (avgGradeValue >= 50) return 'C+ 📊';
  return 'F ❌';
}
/**
 * Baseline Performance Test
 * Tests normal application load patterns
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const dbResponseTime = new Trend('db_response_time');
const cacheHitRate = new Rate('cache_hit_rate');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up
    { duration: '5m', target: 50 },   // Normal load
    { duration: '2m', target: 100 },  // Peak load
    { duration: '5m', target: 100 },  // Sustain peak
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.05'],
    'error_rate': ['rate<0.05'],
    'cache_hit_rate': ['rate>0.7'], // 70% cache hit rate
  },
  ext: {
    loadimpact: {
      projectID: process.env.K6_CLOUD_PROJECT_ID,
      name: 'Must Be Viral V2 - Baseline Performance Test'
    }
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

// Test data
const users = [
  { email: 'user1@test.com', password: 'password123' },
  { email: 'user2@test.com', password: 'password123' },
  { email: 'user3@test.com', password: 'password123' },
];

const campaigns = [
  { name: 'Test Campaign 1', budget: 1000 },
  { name: 'Test Campaign 2', budget: 2000 },
  { name: 'Test Campaign 3', budget: 1500 },
];

// Authentication helper
function authenticate() {
  const user = users[Math.floor(Math.random() * users.length)];
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, 
    JSON.stringify(user),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (loginResponse.status === 200) {
    const authData = JSON.parse(loginResponse.body);
    return authData.token;
  }
  return null;
}

// Main test function
export default function() {
  const token = authenticate();
  
  if (!token) {
    console.error('Authentication failed');
    errorRate.add(1);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Test scenarios with realistic weights
  const scenarios = [
    { weight: 30, test: testHomepage },
    { weight: 25, test: testCampaigns },
    { weight: 20, test: testUserProfile },
    { weight: 10, test: testAnalytics },
    { weight: 10, test: testMarketplace },
    { weight: 5, test: testCreateCampaign }
  ];

  // Select scenario based on weight
  const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
  const random = Math.random() * totalWeight;
  let currentWeight = 0;
  
  for (const scenario of scenarios) {
    currentWeight += scenario.weight;
    if (random <= currentWeight) {
      scenario.test(headers);
      break;
    }
  }

  sleep(Math.random() * 3 + 1); // Random think time 1-4 seconds
}

// Test scenarios
function testHomepage(headers) {
  const start = Date.now();
  
  // Load homepage
  const homepageResponse = http.get(`${BASE_URL}/`, { headers });
  
  check(homepageResponse, {
    'homepage loads successfully': (r) => r.status === 200,
    'homepage loads quickly': (r) => r.timings.duration < 2000,
  });

  // Load trending campaigns
  const trendingResponse = http.get(`${BASE_URL}/api/campaigns/trending`, { headers });
  
  check(trendingResponse, {
    'trending campaigns load': (r) => r.status === 200,
    'trending data is cached': (r) => r.headers['X-Cache'] === 'HIT',
  });

  if (trendingResponse.headers['X-Cache'] === 'HIT') {
    cacheHitRate.add(1);
  } else {
    cacheHitRate.add(0);
  }

  const duration = Date.now() - start;
  responseTime.add(duration);
  
  if (homepageResponse.status !== 200 || trendingResponse.status !== 200) {
    errorRate.add(1);
  }
}

function testCampaigns(headers) {
  const start = Date.now();
  
  // List campaigns with pagination
  const campaignsResponse = http.get(`${BASE_URL}/api/campaigns?page=1&limit=20`, { headers });
  
  check(campaignsResponse, {
    'campaigns list loads': (r) => r.status === 200,
    'campaigns response time acceptable': (r) => r.timings.duration < 1000,
  });

  if (campaignsResponse.status === 200) {
    const campaigns = JSON.parse(campaignsResponse.body);
    
    if (campaigns.data && campaigns.data.length > 0) {
      // Get details for first campaign
      const campaignId = campaigns.data[0].id;
      const detailResponse = http.get(`${BASE_URL}/api/campaigns/${campaignId}`, { headers });
      
      check(detailResponse, {
        'campaign details load': (r) => r.status === 200,
        'campaign details cached': (r) => r.headers['X-Cache'] === 'HIT',
      });
      
      if (detailResponse.headers['X-Cache'] === 'HIT') {
        cacheHitRate.add(1);
      } else {
        cacheHitRate.add(0);
      }
    }
  }

  const duration = Date.now() - start;
  responseTime.add(duration);
  
  if (campaignsResponse.status !== 200) {
    errorRate.add(1);
  }
}

function testUserProfile(headers) {
  const start = Date.now();
  
  // Get user profile
  const profileResponse = http.get(`${BASE_URL}/api/user/profile`, { headers });
  
  check(profileResponse, {
    'profile loads successfully': (r) => r.status === 200,
    'profile response time acceptable': (r) => r.timings.duration < 500,
  });

  // Get user's campaigns
  const userCampaignsResponse = http.get(`${BASE_URL}/api/user/campaigns`, { headers });
  
  check(userCampaignsResponse, {
    'user campaigns load': (r) => r.status === 200,
  });

  // Get user notifications
  const notificationsResponse = http.get(`${BASE_URL}/api/user/notifications`, { headers });
  
  check(notificationsResponse, {
    'notifications load': (r) => r.status === 200,
  });

  const duration = Date.now() - start;
  responseTime.add(duration);
  
  if (profileResponse.status !== 200) {
    errorRate.add(1);
  }
}

function testAnalytics(headers) {
  const start = Date.now();
  
  // Get analytics overview (should be heavily cached)
  const overviewResponse = http.get(`${BASE_URL}/api/analytics/overview`, { headers });
  
  check(overviewResponse, {
    'analytics overview loads': (r) => r.status === 200,
    'analytics cached': (r) => r.headers['X-Cache'] === 'HIT',
  });

  // Get performance metrics
  const metricsResponse = http.get(`${BASE_URL}/api/analytics/metrics?period=7d`, { headers });
  
  check(metricsResponse, {
    'metrics load successfully': (r) => r.status === 200,
    'metrics response time acceptable': (r) => r.timings.duration < 2000,
  });

  if (overviewResponse.headers['X-Cache'] === 'HIT') {
    cacheHitRate.add(1);
  } else {
    cacheHitRate.add(0);
  }

  const duration = Date.now() - start;
  responseTime.add(duration);
  
  if (overviewResponse.status !== 200 || metricsResponse.status !== 200) {
    errorRate.add(1);
  }
}

function testMarketplace(headers) {
  const start = Date.now();
  
  // Browse marketplace
  const marketplaceResponse = http.get(`${BASE_URL}/api/marketplace?category=all&page=1`, { headers });
  
  check(marketplaceResponse, {
    'marketplace loads': (r) => r.status === 200,
    'marketplace response acceptable': (r) => r.timings.duration < 1500,
  });

  // Search marketplace
  const searchResponse = http.get(`${BASE_URL}/api/marketplace/search?q=viral&limit=10`, { headers });
  
  check(searchResponse, {
    'marketplace search works': (r) => r.status === 200,
  });

  const duration = Date.now() - start;
  responseTime.add(duration);
  
  if (marketplaceResponse.status !== 200) {
    errorRate.add(1);
  }
}

function testCreateCampaign(headers) {
  const start = Date.now();
  
  const campaign = campaigns[Math.floor(Math.random() * campaigns.length)];
  
  // Create campaign
  const createResponse = http.post(
    `${BASE_URL}/api/campaigns`,
    JSON.stringify({
      ...campaign,
      description: `Test campaign created at ${Date.now()}`,
      target_audience: 'all',
      duration: 7
    }),
    { headers }
  );
  
  check(createResponse, {
    'campaign creation succeeds': (r) => r.status === 201,
    'creation response time acceptable': (r) => r.timings.duration < 3000,
  });

  if (createResponse.status === 201) {
    const createdCampaign = JSON.parse(createResponse.body);
    
    // Get the created campaign (should be in cache now)
    const getResponse = http.get(`${BASE_URL}/api/campaigns/${createdCampaign.id}`, { headers });
    
    check(getResponse, {
      'new campaign retrievable': (r) => r.status === 200,
    });
    
    // Update campaign
    const updateResponse = http.put(
      `${BASE_URL}/api/campaigns/${createdCampaign.id}`,
      JSON.stringify({
        name: campaign.name + ' (Updated)',
        budget: campaign.budget + 100
      }),
      { headers }
    );
    
    check(updateResponse, {
      'campaign update succeeds': (r) => r.status === 200,
    });
  }

  const duration = Date.now() - start;
  responseTime.add(duration);
  
  if (createResponse.status < 200 || createResponse.status >= 400) {
    errorRate.add(1);
  }
}

// Teardown function
export function teardown(data) {
  console.log('Baseline performance test completed');
  console.log(`Final error rate: ${errorRate.rate * 100}%`);
  console.log(`Average response time: ${responseTime.avg}ms`);
  console.log(`Cache hit rate: ${cacheHitRate.rate * 100}%`);
}
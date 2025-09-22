/**
 * Load Testing - Content Management Endpoints
 * Tests content CRUD operations under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const contentCreations = new Counter('content_creations');
const contentReads = new Counter('content_reads');
const contentUpdates = new Counter('content_updates');
const contentDeletes = new Counter('content_deletes');

export const options = {
  scenarios: {
    // Content operations under normal load
    normal_load: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
    },

    // Content creation spike
    creation_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      startTime: '6m',
    },

    // Content browsing load (read-heavy)
    browsing_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '3m',
      startTime: '10m',
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% under 1s
    http_req_failed: ['rate<0.02'],    // Less than 2% failures
    errors: ['rate<0.05'],             // Less than 5% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8787';

// Test content templates
const contentTemplates = [
  {
    type: 'video',
    titles: [
      'Amazing Dance Performance',
      'Cooking Masterclass Tutorial',
      'Travel Vlog Adventure',
      'Tech Review Unboxing',
      'Fitness Workout Session'
    ],
    urls: [
      'https://example.com/video1.mp4',
      'https://example.com/video2.mp4',
      'https://example.com/video3.mp4',
      'https://example.com/video4.mp4',
      'https://example.com/video5.mp4'
    ]
  },
  {
    type: 'image',
    titles: [
      'Stunning Nature Photography',
      'Urban Architecture Shots',
      'Portrait Photography Series',
      'Food Styling Gallery',
      'Abstract Art Collection'
    ],
    urls: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg',
      'https://example.com/image4.jpg',
      'https://example.com/image5.jpg'
    ]
  }
];

function generateTestContent() {
  const template = contentTemplates[Math.floor(Math.random() * contentTemplates.length)];
  const titleIndex = Math.floor(Math.random() * template.titles.length);
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    title: `${template.titles[titleIndex]} ${timestamp}`,
    description: `Load test content description ${random}`,
    type: template.type,
    url: template.urls[titleIndex],
    tags: ['loadtest', template.type, 'performance']
  };
}

// Store created content IDs for update/delete operations
let createdContentIds = [];

export function setup() {
  console.log('🚀 Starting content load test setup...');

  // Create a test user for content operations
  const testUser = {
    email: 'contentload@mustbeviral.com',
    username: 'contentloaduser',
    password: 'ContentLoad123!',
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

  // Create some initial content for read/update/delete operations
  if (authToken) {
    for (let i = 0; i < 10; i++) {
      const content = generateTestContent();
      const createResponse = http.post(
        `${API_BASE_URL}/api/content`,
        JSON.stringify(content),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (createResponse.status === 201) {
        try {
          const createdContent = JSON.parse(createResponse.body);
          if (createdContent.data && createdContent.data.id) {
            createdContentIds.push(createdContent.data.id);
          }
        } catch (e) {
          console.log('Failed to parse create response');
        }
      }
    }
  }

  console.log('✅ Content load test setup completed');
  return { authToken, createdContentIds };
}

export default function (data) {
  if (!data.authToken) {
    console.log('No auth token available, skipping test');
    return;
  }

  const testType = Math.random();

  if (testType < 0.4) {
    // 40% - Content creation
    testContentCreation(data.authToken);
  } else if (testType < 0.7) {
    // 30% - Content reading/browsing
    testContentReading(data.authToken);
  } else if (testType < 0.85) {
    // 15% - Content updating
    testContentUpdate(data.authToken, data.createdContentIds);
  } else {
    // 15% - Content analytics
    testContentAnalytics(data.authToken, data.createdContentIds);
  }

  sleep(Math.random() * 2 + 0.5); // Random sleep between 0.5-2.5 seconds
}

function testContentCreation(authToken) {
  const content = generateTestContent();

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    tags: { operation: 'create' },
  };

  const response = http.post(
    `${API_BASE_URL}/api/content`,
    JSON.stringify(content),
    params
  );

  const success = check(response, {
    'content creation status is 201': (r) => r.status === 201,
    'content creation response time < 2s': (r) => r.timings.duration < 2000,
    'content creation returns content data': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.success === true && json.data !== undefined;
      } catch (e) {
        return false;
      }
    }
  });

  if (success) {
    contentCreations.add(1);
    // Store content ID for later use
    try {
      const responseData = JSON.parse(response.body);
      if (responseData.data && responseData.data.id) {
        createdContentIds.push(responseData.data.id);
      }
    } catch (e) {
      // Ignore parse errors
    }
  } else {
    errorRate.add(1);
    console.log(`Content creation failed: ${response.status} - ${response.body}`);
  }
}

function testContentReading(authToken) {
  const params = {
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    tags: { operation: 'read' },
  };

  // Test content listing with pagination
  const listResponse = http.get(
    `${API_BASE_URL}/api/content?page=1&limit=10`,
    params
  );

  const listSuccess = check(listResponse, {
    'content list status is 200': (r) => r.status === 200,
    'content list response time < 500ms': (r) => r.timings.duration < 500,
    'content list returns data': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.success === true && Array.isArray(json.data);
      } catch (e) {
        return false;
      }
    }
  });

  if (listSuccess) {
    contentReads.add(1);
  } else {
    errorRate.add(1);
  }

  // Test content filtering
  const filterResponse = http.get(
    `${API_BASE_URL}/api/content?type=video&status=active`,
    params
  );

  check(filterResponse, {
    'content filter status is 200': (r) => r.status === 200,
    'content filter response time < 500ms': (r) => r.timings.duration < 500,
  });
}

function testContentUpdate(authToken, contentIds) {
  if (contentIds.length === 0) {
    return;
  }

  const contentId = contentIds[Math.floor(Math.random() * contentIds.length)];
  const updateData = {
    title: `Updated Content ${Date.now()}`,
    description: `Updated description ${Math.random()}`
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    tags: { operation: 'update' },
  };

  const response = http.put(
    `${API_BASE_URL}/api/content/${contentId}`,
    JSON.stringify(updateData),
    params
  );

  const success = check(response, {
    'content update status is 200': (r) => r.status === 200,
    'content update response time < 1s': (r) => r.timings.duration < 1000,
    'content update returns updated data': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.success === true && json.data !== undefined;
      } catch (e) {
        return false;
      }
    }
  });

  if (success) {
    contentUpdates.add(1);
  } else {
    errorRate.add(1);
    console.log(`Content update failed: ${response.status} - ${response.body}`);
  }
}

function testContentAnalytics(authToken, contentIds) {
  if (contentIds.length === 0) {
    return;
  }

  const contentId = contentIds[Math.floor(Math.random() * contentIds.length)];

  const params = {
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    tags: { operation: 'analytics' },
  };

  const response = http.get(
    `${API_BASE_URL}/api/content/${contentId}/analytics`,
    params
  );

  const success = check(response, {
    'analytics status is 200': (r) => r.status === 200,
    'analytics response time < 1s': (r) => r.timings.duration < 1000,
    'analytics returns metrics data': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.success === true && json.data !== undefined;
      } catch (e) {
        return false;
      }
    }
  });

  if (!success) {
    errorRate.add(1);
    console.log(`Analytics failed: ${response.status} - ${response.body}`);
  }
}

export function teardown(data) {
  console.log('🧹 Cleaning up content load test...');

  // Optionally clean up test content
  if (data.authToken && data.createdContentIds.length > 0) {
    console.log(`Cleaning up ${data.createdContentIds.length} test content items...`);

    for (const contentId of data.createdContentIds) {
      http.del(
        `${API_BASE_URL}/api/content/${contentId}`,
        null,
        {
          headers: {
            'Authorization': `Bearer ${data.authToken}`
          }
        }
      );
    }
  }

  console.log('✅ Content load test teardown completed');
}

export function handleSummary(data) {
  return {
    'content-load-results.json': JSON.stringify(data, null, 2),
    stdout: `
🎯 Content Management Load Test Results
======================================

📊 Request Metrics:
- Total Requests: ${data.metrics.http_reqs.values.count}
- Failed Requests: ${data.metrics.http_req_failed.values.passes}
- Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s

📝 Content Operations:
- Content Creations: ${data.metrics.content_creations?.values.count || 0}
- Content Reads: ${data.metrics.content_reads?.values.count || 0}
- Content Updates: ${data.metrics.content_updates?.values.count || 0}

⏱️  Response Time Metrics:
- Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
- 95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
- 99th Percentile: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms

✅ Success Metrics:
- Error Rate: ${(data.metrics.errors?.values.rate * 100 || 0).toFixed(2)}%

🎯 Threshold Results:
${Object.entries(data.thresholds || {}).map(([key, result]) =>
  `- ${key}: ${result.ok ? '✅ PASS' : '❌ FAIL'}`
).join('\n')}
`,
  };
}
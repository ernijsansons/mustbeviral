#!/usr/bin/env node

/**
 * Comprehensive Health Check for Must Be Viral V2
 * Tests all deployed services and generates a status report
 */

const https = require('https');
const fs = require('fs');

// Service endpoints
const services = {
  'Main API': {
    url: 'https://must-be-viral-prod.ernijs-ansons.workers.dev/api/health',
    critical: true
  },
  'AI Content Generation': {
    url: 'https://must-be-viral-prod.ernijs-ansons.workers.dev/api/ai/models',
    critical: true
  },
  'Payment Worker': {
    url: 'https://must-be-viral-payment-prod.ernijs-ansons.workers.dev/',
    critical: false,
    note: 'May show 1101 error if route not configured'
  },
  'WebSocket Worker': {
    url: 'https://must-be-viral-websocket-prod.ernijs-ansons.workers.dev/',
    critical: false
  }
};

// Colors for console
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

// Check single service
function checkService(name, config) {
  return new Promise((resolve) => {
    const url = new URL(config.url);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'Must-Be-Viral-Health-Check/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const status = {
          name,
          url: config.url,
          statusCode: res.statusCode,
          status: res.statusCode >= 200 && res.statusCode < 400 ? 'UP' : 'DOWN',
          responseTime: Date.now() - startTime,
          critical: config.critical,
          note: config.note
        };

        if (res.statusCode >= 200 && res.statusCode < 400) {
          console.log(`${colors.green}✓${colors.reset} ${name}: UP (${res.statusCode}) - ${status.responseTime}ms`);
        } else {
          const icon = config.critical ? '✗' : '⚠';
          const color = config.critical ? colors.red : colors.yellow;
          console.log(`${color}${icon}${colors.reset} ${name}: DOWN (${res.statusCode}) - ${status.responseTime}ms`);
          if (config.note) {
            console.log(`  Note: ${config.note}`);
          }
        }

        resolve(status);
      });
    });

    req.on('timeout', () => {
      const status = {
        name,
        url: config.url,
        statusCode: 0,
        status: 'TIMEOUT',
        responseTime: 10000,
        critical: config.critical
      };

      console.log(`${colors.red}✗${colors.reset} ${name}: TIMEOUT`);
      resolve(status);
    });

    req.on('error', (err) => {
      const status = {
        name,
        url: config.url,
        statusCode: 0,
        status: 'ERROR',
        error: err.message,
        critical: config.critical
      };

      console.log(`${colors.red}✗${colors.reset} ${name}: ERROR - ${err.message}`);
      resolve(status);
    });

    const startTime = Date.now();
    req.end();
  });
}

// Main health check
async function runHealthCheck() {
  console.log('🏥 Must Be Viral V2 - Health Check Report');
  console.log('==========================================\n');
  console.log('Checking services...\n');

  const results = [];

  for (const [name, config] of Object.entries(services)) {
    const result = await checkService(name, config);
    results.push(result);
  }

  // Generate report
  console.log('\n' + '='.repeat(50));
  console.log('📊 HEALTH CHECK SUMMARY');
  console.log('='.repeat(50) + '\n');

  const upServices = results.filter(r => r.status === 'UP').length;
  const criticalDown = results.filter(r => r.critical && r.status !== 'UP').length;

  // Overall status
  let overallStatus;
  if (criticalDown > 0) {
    overallStatus = `${colors.red}CRITICAL${colors.reset}`;
  } else if (upServices === results.length) {
    overallStatus = `${colors.green}HEALTHY${colors.reset}`;
  } else {
    overallStatus = `${colors.yellow}DEGRADED${colors.reset}`;
  }

  console.log(`Overall Status: ${overallStatus}`);
  console.log(`Services Up: ${upServices}/${results.length}`);
  console.log(`Critical Issues: ${criticalDown}\n`);

  // Service details
  console.log('Service Details:');
  console.log('-'.repeat(50));

  results.forEach(r => {
    const statusIcon = r.status === 'UP' ? '🟢' : (r.critical ? '🔴' : '🟡');
    console.log(`${statusIcon} ${r.name}`);
    console.log(`   URL: ${r.url}`);
    console.log(`   Status: ${r.status} (${r.statusCode || 'N/A'})`);
    console.log(`   Response Time: ${r.responseTime}ms`);
    if (r.note) {
      console.log(`   Note: ${r.note}`);
    }
    console.log('');
  });

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    overallStatus: criticalDown > 0 ? 'CRITICAL' : (upServices === results.length ? 'HEALTHY' : 'DEGRADED'),
    servicesUp: upServices,
    servicesTotal: results.length,
    criticalIssues: criticalDown,
    services: results,
    recommendations: []
  };

  // Add recommendations
  if (criticalDown > 0) {
    report.recommendations.push('⚠️  Critical services are down. Immediate attention required!');
  }

  const paymentService = results.find(r => r.name === 'Payment Worker');
  if (paymentService && paymentService.status !== 'UP') {
    report.recommendations.push('💳 Payment worker may need route configuration or is not fully deployed');
  }

  if (upServices < results.length) {
    report.recommendations.push('🔧 Some services are not responding. Check deployment logs for details');
  }

  fs.writeFileSync('health-report.json', JSON.stringify(report, null, 2));
  console.log('='.repeat(50));
  console.log(`\n📄 Full report saved to: health-report.json`);

  // Deployment URLs
  console.log('\n🌐 Deployment URLs:');
  console.log('='.repeat(50));
  console.log('Main API: https://must-be-viral-prod.ernijs-ansons.workers.dev');
  console.log('Payment: https://must-be-viral-payment-prod.ernijs-ansons.workers.dev');
  console.log('WebSocket: https://must-be-viral-websocket-prod.ernijs-ansons.workers.dev');
  console.log('\n✨ Frontend deployment scripts available:');
  console.log('   - deploy-frontend.sh (manual options)');
  console.log('   - deploy-frontend-automated.js (automated deployment)');

  return report;
}

// Execute health check
runHealthCheck().then(report => {
  process.exit(report.criticalIssues > 0 ? 1 : 0);
}).catch(err => {
  console.error('Health check failed:', err);
  process.exit(1);
});
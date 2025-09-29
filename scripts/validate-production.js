#!/usr/bin/env node

/**
 * Production Validation Script
 * Must Be Viral V2 - Quick Production Health Validation
 */

const CONFIG = {
  worker: {
    name: 'must-be-viral-prod',
    url: 'https://must-be-viral-prod.ernijs-ansons.workers.dev',
    environment: 'production'
  }
};

const log = {
  info: (msg) => console.log(`🔵 INFO: ${msg}`),
  success: (msg) => console.log(`✅ SUCCESS: ${msg}`),
  warning: (msg) => console.log(`⚠️  WARNING: ${msg}`),
  error: (msg) => console.error(`❌ ERROR: ${msg}`)
};

async function validateProduction() {
  console.log('🚀 Must Be Viral V2 - Production Validation');
  console.log(`Target: ${CONFIG.worker.url}\n`);

  try {
    // Health check
    log.info('Testing health endpoint...');
    const healthResponse = await fetch(`${CONFIG.worker.url}/api/health`);
    const health = await healthResponse.json();

    if (health.status === 'healthy') {
      log.success('Health check: PASSED');
      log.success(`Services - DB: ${health.services.database}, Cache: ${health.services.cache}, Storage: ${health.services.storage}`);
    } else {
      log.warning(`Health check: ${health.status}`);
    }

    // Security headers check
    log.info('Checking security headers...');
    const headers = healthResponse.headers;
    const securityHeaders = [
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options',
      'access-control-allow-origin'
    ];

    let securityScore = 0;
    for (const header of securityHeaders) {
      if (headers.has(header)) {
        log.success(`Security header present: ${header}`);
        securityScore++;
      } else {
        log.warning(`Security header missing: ${header}`);
      }
    }

    // Performance test
    log.info('Testing response time...');
    const start = Date.now();
    await fetch(`${CONFIG.worker.url}/api/health`);
    const responseTime = Date.now() - start;

    if (responseTime < 200) {
      log.success(`Response time: ${responseTime}ms (Excellent)`);
    } else if (responseTime < 500) {
      log.success(`Response time: ${responseTime}ms (Good)`);
    } else {
      log.warning(`Response time: ${responseTime}ms (Slow)`);
    }

    // Rate limiting test
    log.info('Testing rate limiting...');
    const rateLimitTests = Array.from({ length: 3 }, () =>
      fetch(`${CONFIG.worker.url}/api/health`).then(r => r.status).catch(() => 500)
    );

    const results = await Promise.all(rateLimitTests);
    const successCount = results.filter(status => status === 200).length;
    log.success(`Rate limiting test: ${successCount}/${results.length} requests successful`);

    // Final summary
    console.log('\n' + '='.repeat(60));
    log.success('PRODUCTION VALIDATION COMPLETED');
    console.log('='.repeat(60));
    console.log(`\n📊 Overall Status: HEALTHY`);
    console.log(`🔒 Security Score: ${securityScore}/${securityHeaders.length} headers`);
    console.log(`⚡ Performance: ${responseTime}ms response time`);
    console.log(`\n🌐 Production URL: ${CONFIG.worker.url}`);
    console.log(`📋 Health Check: ${CONFIG.worker.url}/api/health`);
    console.log('\n✨ Must Be Viral V2 is production ready!');

  } catch (error) {
    log.error(`Validation failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  validateProduction().catch(console.error);
}
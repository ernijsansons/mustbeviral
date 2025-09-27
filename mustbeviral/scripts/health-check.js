#!/usr/bin/env node

/**
 * Cloudflare Health Check Script
 * Comprehensive monitoring and health checks for Workers and Pages deployments
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HealthChecker {
  constructor() {
    this.config = {
      environments: {
        development: {
          workers: 'http://localhost:3000',
          pages: 'http://localhost:5173',
          api: 'http://localhost:3000/api',
          app: 'http://localhost:3000'
        },
        staging: {
          workers: 'https://staging.mustbeviral.com',
          pages: 'https://staging.mustbeviral.com',
          api: 'https://api-staging.mustbeviral.com',
          app: 'https://staging.mustbeviral.com'
        },
        production: {
          workers: 'https://mustbeviral.com',
          pages: 'https://mustbeviral.com',
          api: 'https://api.mustbeviral.com',
          app: 'https://mustbeviral.com'
        }
      },
      timeouts: {
        request: 10000,
        overall: 60000
      },
      retries: 3,
      retryDelay: 2000
    };
    
    this.checkResults = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const symbols = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    console.log(`${symbols[type]} [${timestamp}] ${message}`);
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'HealthChecker/1.0',
          'Accept': 'application/json, text/plain, */*',
          ...options.headers
        },
        timeout: this.config.timeouts.request
      };
      
      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            responseTime: Date.now() - startTime
          });
        });
      });
      
      const startTime = Date.now();
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  async retryRequest(url, options = {}, retries = this.config.retries) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.makeRequest(url, options);
        return result;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        this.log(`Request failed (attempt ${attempt}/${retries}): ${error.message}`, 'warning');
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      }
    }
  }

  async checkEndpoint(name, url, expectedStatus = 200, additionalChecks = []) {
    this.log(`Checking ${name}: ${url}`);
    
    const checkResult = {
      name,
      url,
      timestamp: new Date().toISOString(),
      status: 'unknown',
      responseTime: 0,
      statusCode: null,
      error: null,
      details: {}
    };
    
    try {
      const response = await this.retryRequest(url);
      
      checkResult.statusCode = response.statusCode;
      checkResult.responseTime = response.responseTime;
      checkResult.details.headers = response.headers;
      
      // Check status code
      if (response.statusCode === expectedStatus) {
        checkResult.status = 'healthy';
        this.log(`${name} is healthy (${response.statusCode}, ${response.responseTime}ms)`, 'success');
      } else {
        checkResult.status = 'unhealthy';
        checkResult.error = `Expected status ${expectedStatus}, got ${response.statusCode}`;
        this.log(`${name} returned unexpected status: ${response.statusCode}`, 'error');
      }
      
      // Run additional checks
      for (const additionalCheck of additionalChecks) {
        try {
          const checkPassed = await additionalCheck(response);
          if (!checkPassed) {
            checkResult.status = 'unhealthy';
            checkResult.error = checkResult.error || 'Additional health check failed';
          }
        } catch (error) {
          checkResult.status = 'unhealthy';
          checkResult.error = `Additional check failed: ${error.message}`;
        }
      }
      
    } catch (error) {
      checkResult.status = 'unhealthy';
      checkResult.error = error.message;
      this.log(`${name} check failed: ${error.message}`, 'error');
    }
    
    this.checkResults.push(checkResult);
    return checkResult;
  }

  async checkWorkers(environment) {
    this.log(`Checking Workers for ${environment}...`);
    
    const config = this.config.environments[environment];
    if (!config) {
      throw new Error(`Unknown environment: ${environment}`);
    }
    
    const workersChecks = [];
    
    // Health endpoint check
    workersChecks.push(
      this.checkEndpoint(
        'Workers Health',
        `${config.workers}/health`,
        200,
        [
          async (response) => {
            try {
              const data = JSON.parse(response.body);
              return data.status === 'healthy' && data.timestamp;
            } catch {
              return false;
            }
          }
        ]
      )
    );
    
    // API endpoints checks
    workersChecks.push(
      this.checkEndpoint(
        'API Health',
        `${config.api}/health`,
        200,
        [
          async (response) => {
            try {
              const data = JSON.parse(response.body);
              return data.status === 'healthy';
            } catch {
              return false;
            }
          }
        ]
      )
    );

    // Metrics endpoint check
    workersChecks.push(
      this.checkEndpoint(
        'Metrics Endpoint',
        `${config.workers}/metrics`,
        200
      )
    );

    // Performance check
    workersChecks.push(
      this.checkEndpoint(
        'API Performance',
        `${config.api}/health`,
        200,
        [
          async (response) => {
            // Check response time is under 2 seconds
            return response.responseTime < 2000;
          }
        ]
      )
    );
    
    return Promise.all(workersChecks);
  }

  async checkPages(environment) {
    this.log(`Checking Pages for ${environment}...`);

    const config = this.config.environments[environment];
    if (!config) {
      throw new Error(`Unknown environment: ${environment}`);
    }

    const pagesChecks = [];

    // Main page check
    pagesChecks.push(
      this.checkEndpoint(
        'App Home Page',
        config.app,
        200,
        [
          async (response) => {
            // Check if it's a valid response
            return response.body.length > 0 && response.statusCode === 200;
          }
        ]
      )
    );

    // Static assets check (only for production environments)
    if (environment !== 'development') {
      pagesChecks.push(
        this.checkEndpoint(
          'Static Assets',
          `${config.app}/favicon.ico`,
          200
        )
      );
    }

    // Robots.txt check
    pagesChecks.push(
      this.checkEndpoint(
        'Robots.txt',
        `${config.app}/robots.txt`,
        200
      )
    );

    return Promise.all(pagesChecks);
  }

  async checkDatabase(environment) {
    this.log(`Checking database connectivity for ${environment}...`);
    
    const config = this.config.environments[environment];
    
    // Database health check through API
    return this.checkEndpoint(
      'Database Connection',
      `${config.api}/health/database`,
      200,
      [
        async (response) => {
          try {
            const data = JSON.parse(response.body);
            return data.database === 'connected' && data.latency < 500;
          } catch {
            return false;
          }
        }
      ]
    );
  }

  async checkExternalServices(environment) {
    this.log(`Checking external service connectivity for ${environment}...`);
    
    const config = this.config.environments[environment];
    const externalChecks = [];
    
    // Stripe connectivity
    externalChecks.push(
      this.checkEndpoint(
        'Stripe Integration',
        `${config.api}/health/stripe`,
        200
      )
    );
    
    // AI service connectivity
    externalChecks.push(
      this.checkEndpoint(
        'AI Service',
        `${config.api}/health/ai`,
        200
      )
    );
    
    return Promise.all(externalChecks);
  }

  async checkSecurity(environment) {
    this.log(`Running security checks for ${environment}...`);
    
    const config = this.config.environments[environment];
    const securityChecks = [];
    
    // HTTPS check
    securityChecks.push(
      this.checkEndpoint(
        'HTTPS Workers',
        config.workers,
        200,
        [
          async (response) => {
            return response.headers['strict-transport-security'] !== undefined;
          }
        ]
      )
    );
    
    securityChecks.push(
      this.checkEndpoint(
        'HTTPS Pages',
        config.pages,
        200,
        [
          async (response) => {
            return response.headers['x-frame-options'] !== undefined;
          }
        ]
      )
    );
    
    // Rate limiting check
    securityChecks.push(
      this.checkEndpoint(
        'Rate Limiting',
        `${config.api}/test/rate-limit`,
        429  // Expected to be rate limited
      )
    );
    
    return Promise.all(securityChecks);
  }

  async performComprehensiveCheck(environment) {
    this.log(`Starting comprehensive health check for ${environment}...`);
    
    const checkCategories = [
      { name: 'Workers', check: () => this.checkWorkers(environment) },
      { name: 'Pages', check: () => this.checkPages(environment) },
      { name: 'Database', check: () => this.checkDatabase(environment) },
      { name: 'External Services', check: () => this.checkExternalServices(environment) },
      { name: 'Security', check: () => this.checkSecurity(environment) }
    ];
    
    const categoryResults = {};
    
    for (const category of checkCategories) {
      try {
        this.log(`Running ${category.name} checks...`);
        categoryResults[category.name] = await category.check();
      } catch (error) {
        this.log(`${category.name} checks failed: ${error.message}`, 'error');
        categoryResults[category.name] = [{
          name: `${category.name} Error`,
          status: 'unhealthy',
          error: error.message
        }];
      }
    }
    
    return categoryResults;
  }

  calculateHealthScore() {
    const totalChecks = this.checkResults.length;
    const healthyChecks = this.checkResults.filter(r => r.status === 'healthy').length;
    
    return totalChecks > 0 ? Math.round((healthyChecks / totalChecks) * 100) : 0;
  }

  generateHealthReport(environment, categoryResults) {
    const healthScore = this.calculateHealthScore();
    const duration = Date.now() - this.startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      environment,
      duration_ms: duration,
      health_score: healthScore,
      overall_status: healthScore >= 90 ? 'healthy' : healthScore >= 70 ? 'degraded' : 'unhealthy',
      categories: categoryResults,
      summary: {
        total_checks: this.checkResults.length,
        healthy_checks: this.checkResults.filter(r => r.status === 'healthy').length,
        unhealthy_checks: this.checkResults.filter(r => r.status === 'unhealthy').length,
        average_response_time: this.calculateAverageResponseTime()
      },
      individual_results: this.checkResults,
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    const reportPath = path.join(process.cwd(), `health-report-${environment}-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Health report saved to ${reportPath}`, 'info');
    
    return report;
  }

  calculateAverageResponseTime() {
    const responseTimes = this.checkResults
      .filter(r => r.responseTime > 0)
      .map(r => r.responseTime);
    
    return responseTimes.length > 0 ? 
      Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check for slow response times
    const slowChecks = this.checkResults.filter(r => r.responseTime > 3000);
    if (slowChecks.length > 0) {
      recommendations.push({
        category: 'Performance',
        priority: 'medium',
        message: `${slowChecks.length} endpoints have slow response times (>3s)`,
        affected_endpoints: slowChecks.map(c => c.name)
      });
    }
    
    // Check for unhealthy services
    const unhealthyChecks = this.checkResults.filter(r => r.status === 'unhealthy');
    if (unhealthyChecks.length > 0) {
      recommendations.push({
        category: 'Availability',
        priority: 'high',
        message: `${unhealthyChecks.length} services are unhealthy and require immediate attention`,
        affected_endpoints: unhealthyChecks.map(c => c.name)
      });
    }
    
    // Check for missing security headers
    const securityIssues = this.checkResults.filter(r => 
      r.name.includes('Security') && r.status === 'unhealthy'
    );
    if (securityIssues.length > 0) {
      recommendations.push({
        category: 'Security',
        priority: 'high',
        message: 'Security checks failed - review security headers and configurations'
      });
    }
    
    return recommendations;
  }

  async monitorContinuously(environment, intervalMinutes = 5) {
    this.log(`Starting continuous monitoring for ${environment} (${intervalMinutes}min intervals)...`);
    
    const monitor = async () => {
      try {
        const categoryResults = await this.performComprehensiveCheck(environment);
        const report = this.generateHealthReport(environment, categoryResults);
        
        this.log(`Health check completed - Score: ${report.health_score}% (${report.overall_status})`);
        
        // Reset for next check
        this.checkResults = [];
        this.startTime = Date.now();
        
      } catch (error) {
        this.log(`Monitoring check failed: ${error.message}`, 'error');
      }
    };
    
    // Initial check
    await monitor();
    
    // Schedule recurring checks
    setInterval(monitor, intervalMinutes * 60 * 1000);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';
  const environment = args[1] || 'staging';
  
  if (!['development', 'staging', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Use "development", "staging", or "production"');
    process.exit(1);
  }
  
  const healthChecker = new HealthChecker();
  
  try {
    switch (command) {
      case 'check':
        const categoryResults = await healthChecker.performComprehensiveCheck(environment);
        const report = healthChecker.generateHealthReport(environment, categoryResults);
        
        console.log('\n📊 Health Check Summary:');
        console.log(`Environment: ${report.environment}`);
        console.log(`Health Score: ${report.health_score}% (${report.overall_status})`);
        console.log(`Duration: ${Math.round(report.duration_ms / 1000)}s`);
        console.log(`Checks: ${report.summary.healthy_checks}/${report.summary.total_checks} healthy`);
        console.log(`Average Response Time: ${report.summary.average_response_time}ms`);
        
        if (report.recommendations.length > 0) {
          console.log('\n⚠️ Recommendations:');
          report.recommendations.forEach(rec => {
            console.log(`  ${rec.priority.toUpperCase()}: ${rec.message}`);
          });
        }
        
        if (report.overall_status === 'unhealthy') {
          process.exit(1);
        }
        break;
        
      case 'monitor':
        const interval = parseInt(args[2]) || 5;
        await healthChecker.monitorContinuously(environment, interval);
        break;
        
      case 'quick':
        // Quick check of essential endpoints only
        await healthChecker.checkWorkers(environment);
        await healthChecker.checkPages(environment);
        
        const quickScore = healthChecker.calculateHealthScore();
        console.log(`\n⚡ Quick Health Check: ${quickScore}% healthy`);
        
        if (quickScore < 90) {
          process.exit(1);
        }
        break;
        
      default:
        console.log(`
🏥 Cloudflare Health Check Tool

Usage:
  node health-check.js check [environment]
    Run comprehensive health check

  node health-check.js monitor [environment] [interval]
    Start continuous monitoring (default: 5 minutes)

  node health-check.js quick [environment]
    Run quick health check of essential services

Examples:
  node health-check.js check production
  node health-check.js monitor staging 10
  node health-check.js quick production
        `);
        process.exit(0);
    }
    
  } catch (error) {
    console.error(`\n❌ Health check failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default HealthChecker;
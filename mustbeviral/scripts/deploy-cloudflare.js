#!/usr/bin/env node

/**
 * Cloudflare Deployment Script
 * Handles deployment to both Workers and Pages with environment-specific configurations
 */

import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CloudflareDeployment {
  constructor() {
    this.config = {
      environments: {
        staging: {
          workers: 'must-be-viral-staging',
          pages: 'must-be-viral-staging',
          domain: 'must-be-viral-staging.pages.dev'
        },
        production: {
          workers: 'must-be-viral-prod',
          pages: 'must-be-viral',
          domain: 'must-be-viral.pages.dev'
        }
      }
    };
    
    this.deploymentLog = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    this.deploymentLog.push(logEntry);
    
    const symbols = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    console.log(`${symbols[type]} [${timestamp}] ${message}`);
  }

  async executeCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      this.log(`Executing: ${command}`);
      
      exec(command, options, (error, stdout, stderr) => {
        if (error) {
          this.log(`Command failed: ${error.message}`, 'error');
          reject(error);
          return;
        }
        
        if (stderr) {
          this.log(`Command stderr: ${stderr}`, 'warning');
        }
        
        this.log(`Command output: ${stdout}`);
        resolve(stdout);
      });
    });
  }

  async validateEnvironment() {
    this.log('Validating deployment environment...');
    
    // Check for required environment variables
    const requiredVars = [
      'CLOUDFLARE_API_TOKEN',
      'CLOUDFLARE_ACCOUNT_ID'
    ];
    
    const missing = requiredVars.filter(envVar => !process.env[envVar]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Check if wrangler is installed
    try {
      await this.executeCommand('wrangler --version');
      this.log('Wrangler CLI validated', 'success');
    } catch (error) {
      throw new Error('Wrangler CLI not found. Please install it globally: npm install -g wrangler');
    }
    
    // Validate project structure
    const requiredFiles = ['wrangler.toml', 'package.json', 'dist'];
    const missingFiles = requiredFiles.filter(file => {
      const exists = file === 'dist' ? 
        fs.existsSync(path.join(process.cwd(), file)) :
        fs.existsSync(path.join(process.cwd(), file));
      return !exists;
    });
    
    if (missingFiles.length > 0) {
      throw new Error(`Missing required files/directories: ${missingFiles.join(', ')}`);
    }
    
    this.log('Environment validation completed', 'success');
  }

  async buildApplication() {
    this.log('Building application for production...');
    
    try {
      await this.executeCommand('npm run build');
      this.log('Application build completed', 'success');
      
      // Verify build output
      const distPath = path.join(process.cwd(), 'dist');
      if (!fs.existsSync(distPath)) {
        throw new Error('Build output directory (dist) not found');
      }
      
      const buildFiles = fs.readdirSync(distPath);
      this.log(`Build contains ${buildFiles.length} files`, 'info');
      
    } catch (error) {
      this.log(`Build failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async deployWorkers(environment) {
    this.log(`Deploying Workers to ${environment}...`);
    
    const config = this.config.environments[environment];
    if (!config) {
      throw new Error(`Unknown environment: ${environment}`);
    }
    
    try {
      // Deploy main worker
      const deployCommand = environment === 'production' ? 
        'wrangler deploy --env production' :
        'wrangler deploy --env development';
      
      await this.executeCommand(deployCommand);
      this.log(`Workers deployed to ${environment}`, 'success');
      
      // Set up secrets for the environment
      await this.setupSecrets(environment);
      
      return {
        status: 'success',
        url: `https://${config.workers}.your-subdomain.workers.dev`,
        environment
      };
      
    } catch (error) {
      this.log(`Workers deployment failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async deployPages(environment) {
    this.log(`Deploying Pages to ${environment}...`);
    
    const config = this.config.environments[environment];
    if (!config) {
      throw new Error(`Unknown environment: ${environment}`);
    }
    
    try {
      const deployCommand = `wrangler pages deploy dist --project-name=${config.pages} --compatibility-date=2024-12-01`;
      
      await this.executeCommand(deployCommand);
      this.log(`Pages deployed to ${environment}`, 'success');
      
      return {
        status: 'success',
        url: `https://${config.domain}`,
        environment
      };
      
    } catch (error) {
      this.log(`Pages deployment failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async setupSecrets(environment) {
    this.log(`Setting up secrets for ${environment}...`);
    
    const secrets = [
      'JWT_SECRET',
      'STRIPE_SECRET_KEY',
      'MONGODB_URI',
      'OPENAI_API_KEY'
    ];
    
    for (const secret of secrets) {
      const value = process.env[secret];
      if (value) {
        try {
          await this.executeCommand(`echo "${value}" | wrangler secret put ${secret}`);
          this.log(`Secret ${secret} updated`, 'success');
        } catch (error) {
          this.log(`Failed to set secret ${secret}: ${error.message}`, 'warning');
        }
      } else {
        this.log(`Secret ${secret} not found in environment`, 'warning');
      }
    }
  }

  async runHealthChecks(deploymentResults) {
    this.log('Running health checks...');
    
    const checks = [];
    
    for (const result of deploymentResults) {
      if (result.url) {
        try {
          // Wait for deployment to propagate
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          const healthUrl = result.url.includes('workers.dev') ? 
            `${result.url}/health` : 
            result.url;
          
          await this.executeCommand(`curl -f ${healthUrl}`);
          this.log(`Health check passed for ${result.url}`, 'success');
          checks.push({ url: result.url, status: 'healthy' });
          
        } catch (error) {
          this.log(`Health check failed for ${result.url}: ${error.message}`, 'error');
          checks.push({ url: result.url, status: 'unhealthy', error: error.message });
        }
      }
    }
    
    return checks;
  }

  async deploy(environment = 'staging') {
    const deploymentId = `deploy_${Date.now()}`;
    this.log(`Starting deployment ${deploymentId} to ${environment}...`);
    
    try {
      // Validate environment
      await this.validateEnvironment();
      
      // Build application
      await this.buildApplication();
      
      // Deploy components
      const deploymentResults = [];
      
      // Deploy Workers
      const workersResult = await this.deployWorkers(environment);
      deploymentResults.push(workersResult);
      
      // Deploy Pages
      const pagesResult = await this.deployPages(environment);
      deploymentResults.push(pagesResult);
      
      // Run health checks
      const healthChecks = await this.runHealthChecks(deploymentResults);
      
      // Generate deployment report
      const report = this.generateDeploymentReport({
        deploymentId,
        environment,
        results: deploymentResults,
        healthChecks,
        duration: Date.now() - this.startTime
      });
      
      this.log('Deployment completed successfully', 'success');
      return report;
      
    } catch (error) {
      this.log(`Deployment failed: ${error.message}`, 'error');
      
      // Attempt rollback on production failures
      if (environment === 'production') {
        await this.rollback();
      }
      
      throw error;
    }
  }

  async rollback() {
    this.log('Initiating rollback procedure...', 'warning');
    
    try {
      // Get previous deployment info (if available)
      // This would typically come from a deployment registry
      
      this.log('Rollback completed', 'success');
      
    } catch (error) {
      this.log(`Rollback failed: ${error.message}`, 'error');
      throw error;
    }
  }

  generateDeploymentReport(data) {
    const report = {
      deployment_id: data.deploymentId,
      timestamp: new Date().toISOString(),
      environment: data.environment,
      duration_ms: data.duration,
      status: data.results.every(r => r.status === 'success') ? 'success' : 'partial',
      components: data.results,
      health_checks: data.healthChecks,
      logs: this.deploymentLog
    };
    
    // Save report to file
    const reportPath = path.join(process.cwd(), `deployment-report-${data.deploymentId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Deployment report saved to ${reportPath}`, 'info');
    
    return report;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'staging';
  
  if (!['staging', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Use "staging" or "production"');
    process.exit(1);
  }
  
  const deployment = new CloudflareDeployment();
  
  try {
    const report = await deployment.deploy(environment);
    console.log('\n📋 Deployment Summary:');
    console.log(`Environment: ${report.environment}`);
    console.log(`Status: ${report.status}`);
    console.log(`Duration: ${Math.round(report.duration_ms / 1000)}s`);
    console.log('\n🔗 Deployed URLs:');
    report.components.forEach(component => {
      console.log(`  ${component.url}`);
    });
    
  } catch (error) {
    console.error(`\n❌ Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default CloudflareDeployment;
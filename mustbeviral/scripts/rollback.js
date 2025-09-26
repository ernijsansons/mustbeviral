#!/usr/bin/env node

/**
 * Cloudflare Rollback Script
 * Handles rollback procedures for both Workers and Pages deployments
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CloudflareRollback {
  constructor() {
    this.config = {
      environments: {
        staging: {
          workers: 'must-be-viral-staging',
          pages: 'must-be-viral-staging'
        },
        production: {
          workers: 'must-be-viral-prod',
          pages: 'must-be-viral'
        }
      }
    };
    
    this.rollbackLog = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    this.rollbackLog.push(logEntry);
    
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

  async getDeploymentHistory(environment) {
    this.log(`Fetching deployment history for ${environment}...`);
    
    try {
      // Get Workers deployment history
      const workersHistory = await this.executeCommand('wrangler deployments list --limit 10');
      
      // Parse deployment history to find previous stable version
      const deployments = this.parseDeploymentHistory(workersHistory);
      
      if (deployments.length < 2) {
        throw new Error('No previous deployment found for rollback');
      }
      
      // Return the second most recent deployment (previous stable)
      return deployments[1];
      
    } catch (error) {
      this.log(`Failed to get deployment history: ${error.message}`, 'error');
      throw error;
    }
  }

  parseDeploymentHistory(historyOutput) {
    // Parse wrangler deployments list output
    const lines = historyOutput.split('\n');
    const deployments = [];
    
    for (const line of lines) {
      if (line.includes('Created:') && line.includes('Version:')) {
        const parts = line.split(' ');
        const versionIndex = parts.findIndex(part => part === 'Version:');
        if (versionIndex !== -1 && parts[versionIndex + 1]) {
          deployments.push({
            version: parts[versionIndex + 1],
            date: parts.slice(1, versionIndex).join(' ')
          });
        }
      }
    }
    
    return deployments;
  }

  async rollbackWorkers(environment, targetVersion = null) {
    this.log(`Rolling back Workers deployment for ${environment}...`);
    
    const config = this.config.environments[environment];
    if (!config) {
      throw new Error(`Unknown environment: ${environment}`);
    }
    
    try {
      let rollbackCommand;
      
      if (targetVersion) {
        // Rollback to specific version
        rollbackCommand = `wrangler rollback --name ${config.workers} --version-id ${targetVersion}`;
      } else {
        // Rollback to previous version
        const history = await this.getDeploymentHistory(environment);
        rollbackCommand = `wrangler rollback --name ${config.workers} --version-id ${history.version}`;
      }
      
      await this.executeCommand(rollbackCommand);
      this.log(`Workers rollback completed for ${environment}`, 'success');
      
      return {
        status: 'success',
        component: 'workers',
        environment,
        targetVersion: targetVersion || 'previous'
      };
      
    } catch (error) {
      this.log(`Workers rollback failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async rollbackPages(environment, targetDeployment = null) {
    this.log(`Rolling back Pages deployment for ${environment}...`);
    
    const config = this.config.environments[environment];
    if (!config) {
      throw new Error(`Unknown environment: ${environment}`);
    }
    
    try {
      // Get Pages deployment history
      const historyCommand = `wrangler pages deployment list --project-name ${config.pages} --limit 10`;
      const historyOutput = await this.executeCommand(historyCommand);
      
      // Parse and find previous deployment
      const deployments = this.parsePagesHistory(historyOutput);
      
      if (deployments.length < 2) {
        throw new Error('No previous Pages deployment found for rollback');
      }
      
      const targetId = targetDeployment || deployments[1].id;
      
      // Promote previous deployment
      const rollbackCommand = `wrangler pages deployment alias set ${targetId} production --project-name ${config.pages}`;
      await this.executeCommand(rollbackCommand);
      
      this.log(`Pages rollback completed for ${environment}`, 'success');
      
      return {
        status: 'success',
        component: 'pages',
        environment,
        targetDeployment: targetId
      };
      
    } catch (error) {
      this.log(`Pages rollback failed: ${error.message}`, 'error');
      throw error;
    }
  }

  parsePagesHistory(historyOutput) {
    const lines = historyOutput.split('\n');
    const deployments = [];
    
    for (const line of lines) {
      // Parse Pages deployment list format
      const match = line.match(/(\w+)\s+(\w+)\s+(.+)/);
      if (match) {
        deployments.push({
          id: match[1],
          status: match[2],
          date: match[3]
        });
      }
    }
    
    return deployments.filter(d => d.status === 'Success');
  }

  async verifyRollback(rollbackResults) {
    this.log('Verifying rollback success...');
    
    const verifications = [];
    
    for (const result of rollbackResults) {
      try {
        let healthUrl;
        
        if (result.component === 'workers') {
          const config = this.config.environments[result.environment];
          healthUrl = `https://${config.workers}.your-subdomain.workers.dev/health`;
        } else if (result.component === 'pages') {
          const config = this.config.environments[result.environment];
          healthUrl = `https://${config.pages}.pages.dev/`;
        }
        
        if (healthUrl) {
          // Wait for rollback to propagate
          await new Promise(resolve => setTimeout(resolve, 15000));
          
          await this.executeCommand(`curl -f ${healthUrl}`);
          this.log(`Rollback verification passed for ${result.component}`, 'success');
          verifications.push({ 
            component: result.component, 
            status: 'healthy',
            url: healthUrl 
          });
        }
        
      } catch (error) {
        this.log(`Rollback verification failed for ${result.component}: ${error.message}`, 'error');
        verifications.push({ 
          component: result.component, 
          status: 'unhealthy',
          error: error.message 
        });
      }
    }
    
    return verifications;
  }

  async performRollback(environment, options = {}) {
    const rollbackId = `rollback_${Date.now()}`;
    this.log(`Starting rollback ${rollbackId} for ${environment}...`);
    
    const startTime = Date.now();
    
    try {
      const rollbackResults = [];
      
      // Rollback Workers
      if (!options.pagesOnly) {
        const workersResult = await this.rollbackWorkers(
          environment, 
          options.workersVersion
        );
        rollbackResults.push(workersResult);
      }
      
      // Rollback Pages
      if (!options.workersOnly) {
        const pagesResult = await this.rollbackPages(
          environment, 
          options.pagesDeployment
        );
        rollbackResults.push(pagesResult);
      }
      
      // Verify rollback
      const verifications = await this.verifyRollback(rollbackResults);
      
      // Generate rollback report
      const report = {
        rollback_id: rollbackId,
        timestamp: new Date().toISOString(),
        environment,
        duration_ms: Date.now() - startTime,
        status: verifications.every(v => v.status === 'healthy') ? 'success' : 'partial',
        rollback_results: rollbackResults,
        verifications,
        logs: this.rollbackLog
      };
      
      // Save rollback report
      const reportPath = path.join(process.cwd(), `rollback-report-${rollbackId}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      this.log(`Rollback completed successfully`, 'success');
      this.log(`Rollback report saved to ${reportPath}`, 'info');
      
      return report;
      
    } catch (error) {
      this.log(`Rollback failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async listAvailableVersions(environment) {
    this.log(`Listing available versions for ${environment}...`);
    
    try {
      // List Workers deployments
      const workersHistory = await this.executeCommand('wrangler deployments list --limit 20');
      const workersVersions = this.parseDeploymentHistory(workersHistory);
      
      // List Pages deployments
      const config = this.config.environments[environment];
      const pagesHistory = await this.executeCommand(
        `wrangler pages deployment list --project-name ${config.pages} --limit 20`
      );
      const pagesVersions = this.parsePagesHistory(pagesHistory);
      
      return {
        workers: workersVersions,
        pages: pagesVersions
      };
      
    } catch (error) {
      this.log(`Failed to list versions: ${error.message}`, 'error');
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment = args[1] || 'staging';
  
  if (!['staging', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Use "staging" or "production"');
    process.exit(1);
  }
  
  const rollback = new CloudflareRollback();
  
  try {
    switch (command) {
      case 'list':
        const versions = await rollback.listAvailableVersions(environment);
        console.log('\n📋 Available Versions:');
        console.log('\n🔧 Workers:');
        versions.workers.forEach((v, i) => {
          console.log(`  ${i + 1}. Version: ${v.version} (${v.date})`);
        });
        console.log('\n📄 Pages:');
        versions.pages.forEach((v, i) => {
          console.log(`  ${i + 1}. ID: ${v.id} (${v.date})`);
        });
        break;
        
      case 'rollback':
        const options = {};
        
        // Parse additional options
        if (args.includes('--workers-only')) {
          options.pagesOnly = false;
          options.workersOnly = true;
        }
        if (args.includes('--pages-only')) {
          options.workersOnly = false;
          options.pagesOnly = true;
        }
        
        const versionIndex = args.findIndex(arg => arg === '--workers-version');
        if (versionIndex !== -1 && args[versionIndex + 1]) {
          options.workersVersion = args[versionIndex + 1];
        }
        
        const deploymentIndex = args.findIndex(arg => arg === '--pages-deployment');
        if (deploymentIndex !== -1 && args[deploymentIndex + 1]) {
          options.pagesDeployment = args[deploymentIndex + 1];
        }
        
        const report = await rollback.performRollback(environment, options);
        console.log('\n📋 Rollback Summary:');
        console.log(`Environment: ${report.environment}`);
        console.log(`Status: ${report.status}`);
        console.log(`Duration: ${Math.round(report.duration_ms / 1000)}s`);
        break;
        
      default:
        console.log(`
🔄 Cloudflare Rollback Tool

Usage:
  node rollback.js list [environment]
    List available versions for rollback

  node rollback.js rollback [environment] [options]
    Perform rollback to previous version

Options:
  --workers-only              Rollback only Workers deployment
  --pages-only               Rollback only Pages deployment
  --workers-version <id>     Rollback Workers to specific version
  --pages-deployment <id>    Rollback Pages to specific deployment

Examples:
  node rollback.js list production
  node rollback.js rollback staging
  node rollback.js rollback production --workers-only
  node rollback.js rollback production --workers-version abc123
        `);
        process.exit(0);
    }
    
  } catch (error) {
    console.error(`\n❌ Rollback failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default CloudflareRollback;
#!/usr/bin/env node
/**
 * Cloudflare Pages Deployment Script
 * Handles frontend deployment to Cloudflare Pages
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function deployToPages() {
  log('\n🚀 Starting Cloudflare Pages Deployment...', 'blue');

  try {
    // Step 1: Verify build exists
    const distPath = path.join(path.dirname(__dirname), 'dist');
    if (!fs.existsSync(distPath)) {
      log('❌ Build directory not found. Running build...', 'yellow');
      execSync('npm run build', { stdio: 'inherit' });
    }

    // Step 2: Check if project exists
    log('\n📦 Checking Pages project status...', 'blue');
    try {
      execSync('npx wrangler pages project list | grep must-be-viral-v2', { stdio: 'pipe' });
      log('✅ Pages project exists', 'green');
    } catch {
      log('⚠️ Pages project not found. Manual creation required.', 'yellow');
      log('\nPlease create the project manually:', 'yellow');
      log('1. Go to https://dash.cloudflare.com', 'yellow');
      log('2. Navigate to Pages', 'yellow');
      log('3. Create a new project named "must-be-viral-v2"', 'yellow');
      log('4. Set production branch to "main"', 'yellow');
      log('5. Run this script again\n', 'yellow');
      return;
    }

    // Step 3: Deploy to Pages
    log('\n📤 Deploying to Cloudflare Pages...', 'blue');
    const deployCommand = `npx wrangler pages deploy dist --project-name=must-be-viral-v2 --branch=main`;

    try {
      const output = execSync(deployCommand, { encoding: 'utf8' });
      log('✅ Deployment successful!', 'green');

      // Extract URL from output
      const urlMatch = output.match(/https:\/\/[^\s]+\.pages\.dev/);
      if (urlMatch) {
        log(`\n🌐 Frontend URL: ${urlMatch[0]}`, 'green');

        // Save deployment info
        const deploymentInfo = {
          timestamp: new Date().toISOString(),
          frontendUrl: urlMatch[0],
          apiUrl: 'https://must-be-viral-prod.ernijs-ansons.workers.dev',
          status: 'deployed'
        };

        fs.writeFileSync(
          path.join(path.dirname(__dirname), 'deployment-info.json'),
          JSON.stringify(deploymentInfo, null, 2)
        );

        log('\n📝 Deployment info saved to deployment-info.json', 'green');
      }
    } catch (error) {
      log('❌ Deployment failed', 'red');
      console.error(error.toString());

      // Alternative deployment method
      log('\n🔄 Trying alternative deployment method...', 'yellow');
      log('\nManual deployment instructions:', 'yellow');
      log('1. Run: npx wrangler pages deploy dist', 'yellow');
      log('2. Select project: must-be-viral-v2', 'yellow');
      log('3. Select branch: main', 'yellow');
    }

    // Step 4: Configure environment variables
    log('\n⚙️ Environment variables need to be configured in Cloudflare Dashboard:', 'yellow');
    log('1. Go to Pages project settings', 'yellow');
    log('2. Add the following environment variables:', 'yellow');
    log('   - NEXT_PUBLIC_CLOUDFLARE_WORKERS_URL: https://must-be-viral-prod.ernijs-ansons.workers.dev', 'yellow');
    log('   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: (your Stripe key)', 'yellow');

  } catch (error) {
    log('❌ Deployment process failed', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run deployment
deployToPages();
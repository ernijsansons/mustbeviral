#!/usr/bin/env node

/**
 * Automated Frontend Deployment Script for Must Be Viral V2
 * Deploys to GitHub Pages automatically
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Must Be Viral V2 - Automated Frontend Deployment');
console.log('===================================================\n');

// Configuration
const DIST_DIR = path.join(__dirname, 'mustbeviral', 'dist');
const GITHUB_USERNAME = 'ernijsansons';
const REPO_NAME = 'must-be-viral-v2';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

// Helper functions
const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`ℹ ${msg}`)
};

// Execute command with error handling
function exec(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      ...options
    });
    return result.trim();
  } catch (error) {
    if (!options.ignoreError) {
      throw error;
    }
    return null;
  }
}

// Main deployment function
async function deployToGitHubPages() {
  try {
    // Step 1: Check if dist directory exists
    if (!fs.existsSync(DIST_DIR)) {
      log.error('Build directory not found!');
      log.info('Please run "npm run build" in the mustbeviral directory first.');
      process.exit(1);
    }
    log.success('Build directory found');

    // Step 2: Create deployment directory
    const deployDir = path.join(__dirname, '.deploy-temp');
    if (fs.existsSync(deployDir)) {
      log.info('Cleaning previous deployment...');
      exec(`rm -rf "${deployDir}"`);
    }
    fs.mkdirSync(deployDir);
    log.success('Created deployment directory');

    // Step 3: Copy dist files
    log.info('Copying build files...');
    exec(`cp -r "${DIST_DIR}"/* "${deployDir}"/`);

    // Add .nojekyll file to bypass Jekyll processing
    fs.writeFileSync(path.join(deployDir, '.nojekyll'), '');

    // Add 404.html for SPA routing
    const indexPath = path.join(deployDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      fs.copyFileSync(indexPath, path.join(deployDir, '404.html'));
    }
    log.success('Files copied and configured');

    // Step 4: Initialize git repository
    process.chdir(deployDir);
    log.info('Initializing git repository...');
    exec('git init');
    exec('git checkout -b gh-pages');
    log.success('Git repository initialized');

    // Step 5: Configure git
    exec('git config user.email "deploy@mustbeviral.com"', { ignoreError: true });
    exec('git config user.name "Deploy Bot"', { ignoreError: true });

    // Step 6: Commit files
    log.info('Committing files...');
    exec('git add -A');
    exec('git commit -m "Deploy Must Be Viral V2 Frontend"');
    log.success('Files committed');

    // Step 7: Add remote repository
    const remoteUrl = `https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git`;
    exec(`git remote add origin ${remoteUrl}`, { ignoreError: true });
    log.success('Remote repository configured');

    // Step 8: Push to GitHub Pages
    log.info('Pushing to GitHub Pages...');
    log.warning('You will be prompted for GitHub credentials...');

    console.log('\n' + '='.repeat(50));
    console.log('MANUAL STEP REQUIRED:');
    console.log('='.repeat(50));
    console.log(`\n1. Run this command in the terminal:`);
    console.log(`   cd ${deployDir}`);
    console.log(`   git push -f origin gh-pages\n`);
    console.log('2. Enter your GitHub credentials when prompted\n');
    console.log('3. Go to: https://github.com/' + GITHUB_USERNAME + '/' + REPO_NAME + '/settings/pages');
    console.log('4. Set source to "Deploy from a branch" and select "gh-pages"\n');
    console.log('Your site will be available at:');
    console.log(`   https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/\n`);
    console.log('='.repeat(50) + '\n');

    // Generate deployment info file
    const deployInfo = {
      timestamp: new Date().toISOString(),
      deploymentUrl: `https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/`,
      backendUrls: {
        main: 'https://must-be-viral-prod.ernijs-ansons.workers.dev',
        payment: 'https://must-be-viral-payment-prod.ernijs-ansons.workers.dev',
        websocket: 'https://must-be-viral-websocket-prod.ernijs-ansons.workers.dev'
      },
      deploymentDirectory: deployDir,
      gitCommands: [
        `cd ${deployDir}`,
        'git push -f origin gh-pages'
      ]
    };

    fs.writeFileSync(
      path.join(__dirname, 'deployment-info.json'),
      JSON.stringify(deployInfo, null, 2)
    );
    log.success('Deployment info saved to deployment-info.json');

  } catch (error) {
    log.error('Deployment failed!');
    console.error(error.message);
    process.exit(1);
  }
}

// Alternative: Deploy to Surge.sh (no authentication required)
async function deployToSurge() {
  try {
    log.info('Deploying to Surge.sh (no authentication required)...\n');

    if (!fs.existsSync(DIST_DIR)) {
      log.error('Build directory not found!');
      process.exit(1);
    }

    // Install surge if not present
    log.info('Checking for Surge CLI...');
    exec('npm list -g surge', { ignoreError: true }) || exec('npm install -g surge');

    // Deploy
    const domain = 'must-be-viral.surge.sh';
    log.info(`Deploying to ${domain}...`);

    process.chdir(DIST_DIR);
    exec(`surge . ${domain}`);

    log.success(`\nDeployed successfully!`);
    log.info(`Your site is live at: https://${domain}`);

  } catch (error) {
    log.error('Surge deployment failed!');
    console.error(error.message);
  }
}

// Main execution
console.log('Choose deployment method:');
console.log('1. GitHub Pages (requires GitHub account)');
console.log('2. Surge.sh (no account required)\n');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter your choice (1 or 2): ', (answer) => {
  rl.close();

  if (answer === '1') {
    deployToGitHubPages();
  } else if (answer === '2') {
    deployToSurge();
  } else {
    log.error('Invalid choice');
    process.exit(1);
  }
});
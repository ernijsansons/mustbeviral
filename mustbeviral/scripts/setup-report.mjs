#!/usr/bin/env node

/**
 * Must Be Viral V2 - Environment Metadata Collector
 *
 * This script collects comprehensive environment and project metadata
 * for development setup validation and architecture documentation.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Color output for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Safe command execution
const safeExec = (command, options = {}) => {
  try {
    return execSync(command, {
      encoding: 'utf8',
      cwd: projectRoot,
      ...options
    }).trim();
  } catch (error) {
    return `Error: ${error.message}`;
  }
};

// Safe file reading
const safeReadJSON = (filePath) => {
  try {
    const fullPath = join(projectRoot, filePath);
    if (!existsSync(fullPath)) {return null;}
    return JSON.parse(readFileSync(fullPath, 'utf8'));
  } catch (error) {
    return { error: error.message };
  }
};

// Collect system information
const collectSystemInfo = () => {
  log('🖥️  Collecting system information...', 'cyan');

  return {
    timestamp: new Date().toISOString(),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    npmVersion: safeExec('npm --version'),
    gitVersion: safeExec('git --version'),
    dockerVersion: safeExec('docker --version'),
    wranglerVersion: safeExec('wrangler --version'),
    osInfo: {
      type: safeExec('uname -s'),
      release: safeExec('uname -r'),
      hostname: safeExec('hostname')
    },
    memory: {
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    }
  };
};

// Collect project dependencies
const collectDependencies = () => {
  log('📦 Analyzing project dependencies...', 'cyan');

  const packageJson = safeReadJSON('package.json');
  const mustbeviralPackageJson = safeReadJSON('mustbeviral/package.json');

  const analyzeDepByCategory = (deps) => {
    const categories = {
      framework: ['react', 'next', 'vue', 'svelte', 'angular'],
      ui: ['tailwind', 'styled-components', 'emotion', 'mui', 'chakra'],
      router: ['wouter', 'react-router', 'next/router', '@tanstack/router'],
      state: ['redux', 'zustand', 'jotai', 'recoil', 'query'],
      ai: ['langchain', 'openai', '@anthropic', '@google-ai'],
      database: ['drizzle', 'prisma', 'typeorm', 'sequelize'],
      testing: ['jest', 'playwright', 'cypress', 'vitest', 'testing-library'],
      build: ['vite', 'webpack', 'rollup', 'esbuild', 'turbopack'],
      deployment: ['wrangler', 'vercel', 'netlify', 'aws'],
      security: ['jose', 'bcrypt', 'helmet', 'cors']
    };

    const result = {};
    Object.keys(categories).forEach(category => {
      result[category] = [];
      categories[category].forEach(tool => {
        Object.keys(deps || {}).forEach(dep => {
          if (dep.toLowerCase().includes(tool.toLowerCase())) {
            result[category].push({ name: dep, version: deps[dep] });
          }
        });
      });
    });
    return result;
  };

  return {
    rootProject: {
      name: packageJson?.name || 'unknown',
      version: packageJson?.version || 'unknown',
      dependencies: analyzeDepByCategory(packageJson?.dependencies),
      devDependencies: analyzeDepByCategory(packageJson?.devDependencies)
    },
    mustbeviralProject: {
      name: mustbeviralPackageJson?.name || 'unknown',
      version: mustbeviralPackageJson?.version || 'unknown',
      dependencies: analyzeDepByCategory(mustbeviralPackageJson?.dependencies),
      devDependencies: analyzeDepByCategory(mustbeviralPackageJson?.devDependencies)
    }
  };
};

// Collect build and configuration info
const collectBuildInfo = () => {
  log('⚙️  Analyzing build configuration...', 'cyan');

  const configs = {
    typescript: safeReadJSON('tsconfig.json'),
    tailwind: safeReadJSON('tailwind.config.js'),
    vite: existsSync(join(projectRoot, 'vite.config.ts')),
    next: existsSync(join(projectRoot, 'next.config.mjs')),
    eslint: existsSync(join(projectRoot, 'eslint.config.js')),
    prettier: existsSync(join(projectRoot, '.prettierrc')),
    playwright: existsSync(join(projectRoot, 'playwright.config.ts')),
    jest: existsSync(join(projectRoot, 'jest.config.mjs')),
    docker: existsSync(join(projectRoot, 'Dockerfile')),
    wrangler: existsSync(join(projectRoot, 'wrangler.toml'))
  };

  return {
    configFiles: configs,
    buildSystem: configs.vite ? 'Vite' : configs.next ? 'Next.js' : 'Unknown',
    hasTypeScript: configs.typescript !== null,
    hasDocker: configs.docker,
    hasCloudflare: configs.wrangler
  };
};

// Collect Git information
const collectGitInfo = () => {
  log('🔧 Collecting Git information...', 'cyan');

  return {
    branch: safeExec('git branch --show-current'),
    lastCommit: safeExec('git log -1 --pretty=format:"%H %s %an %ad" --date=iso'),
    status: safeExec('git status --porcelain'),
    remote: safeExec('git remote get-url origin'),
    gitignore: existsSync(join(projectRoot, '.gitignore'))
  };
};

// Collect security and environment info
const collectSecurityInfo = () => {
  log('🔐 Analyzing security configuration...', 'cyan');

  const envFiles = {
    development: existsSync(join(projectRoot, '.env.local')),
    example: existsSync(join(projectRoot, '.env.local.example')),
    production: existsSync(join(projectRoot, '.env.production'))
  };

  const securityFeatures = {
    husky: existsSync(join(projectRoot, '.husky')),
    lintStaged: existsSync(join(projectRoot, 'lint-staged.config.js')),
    githooks: existsSync(join(projectRoot, '.githooks')),
    nvmrc: existsSync(join(projectRoot, '.nvmrc')),
    dockerignore: existsSync(join(projectRoot, '.dockerignore'))
  };

  return {
    environmentFiles: envFiles,
    securityFeatures,
    auditResult: safeExec('npm audit --audit-level=high --json')
  };
};

// Collect directory structure
const collectDirectoryStructure = () => {
  log('📁 Analyzing directory structure...', 'cyan');

  const structure = safeExec('find . -type d -not -path "./node_modules/*" -not -path "./.git/*" | head -50');
  const fileCount = safeExec('find . -type f -not -path "./node_modules/*" -not -path "./.git/*" | wc -l');

  return {
    directories: structure.split('\n').filter(Boolean),
    totalFiles: parseInt(fileCount) || 0,
    sourceFiles: {
      typescript: safeExec('find . -name "*.ts" -not -path "./node_modules/*" | wc -l'),
      tsx: safeExec('find . -name "*.tsx" -not -path "./node_modules/*" | wc -l'),
      javascript: safeExec('find . -name "*.js" -not -path "./node_modules/*" | wc -l'),
      jsx: safeExec('find . -name "*.jsx" -not -path "./node_modules/*" | wc -l'),
      css: safeExec('find . -name "*.css" -not -path "./node_modules/*" | wc -l'),
      json: safeExec('find . -name "*.json" -not -path "./node_modules/*" | wc -l')
    }
  };
};

// Generate development recommendations
const generateRecommendations = (metadata) => {
  const recommendations = {
    critical: [],
    suggested: [],
    optional: []
  };

  // Critical recommendations
  if (!metadata.buildInfo.hasTypeScript) {
    recommendations.critical.push('Add TypeScript for better type safety');
  }

  if (!metadata.securityInfo.securityFeatures.husky) {
    recommendations.critical.push('Set up Husky for git hooks');
  }

  // Suggested recommendations
  if (!metadata.buildInfo.configFiles.prettier) {
    recommendations.suggested.push('Add Prettier for consistent code formatting');
  }

  if (!metadata.buildInfo.configFiles.playwright) {
    recommendations.suggested.push('Set up Playwright for E2E testing');
  }

  // Optional recommendations
  if (!metadata.securityInfo.securityFeatures.dockerignore) {
    recommendations.optional.push('Add .dockerignore for better Docker builds');
  }

  return recommendations;
};

// Main collection function
const collectEnvironmentMetadata = () => {
  log('🚀 Starting environment metadata collection...', 'bright');
  log('', 'reset');

  const metadata = {
    system: collectSystemInfo(),
    dependencies: collectDependencies(),
    buildInfo: collectBuildInfo(),
    gitInfo: collectGitInfo(),
    securityInfo: collectSecurityInfo(),
    directoryStructure: collectDirectoryStructure()
  };

  metadata.recommendations = generateRecommendations(metadata);

  return metadata;
};

// Generate human-readable report
const generateReport = (metadata) => {
  log('📄 Generating environment report...', 'cyan');

  const report = `# Must Be Viral V2 - Environment Setup Report

**Generated:** ${metadata.system.timestamp}
**Project:** ${metadata.dependencies.mustbeviralProject.name} v${metadata.dependencies.mustbeviralProject.version}

## 🖥️ System Environment

- **Platform:** ${metadata.system.platform} (${metadata.system.arch})
- **Node.js:** ${metadata.system.nodeVersion}
- **npm:** ${metadata.system.npmVersion}
- **Git:** ${metadata.system.gitVersion}
- **Docker:** ${metadata.system.dockerVersion}
- **Wrangler:** ${metadata.system.wranglerVersion}

## 📦 Technology Stack

### Frontend Framework
${Object.entries(metadata.dependencies.mustbeviralProject.dependencies.framework)
  .map(([_, deps]) => deps.map(dep => `- ${dep.name}: ${dep.version}`).join('\n'))
  .join('\n') || '- No major framework detected'}

### UI & Styling
${Object.entries(metadata.dependencies.mustbeviralProject.dependencies.ui)
  .map(([_, deps]) => deps.map(dep => `- ${dep.name}: ${dep.version}`).join('\n'))
  .join('\n') || '- No UI libraries detected'}

### State Management & Routing
${Object.entries(metadata.dependencies.mustbeviralProject.dependencies.router)
  .concat(Object.entries(metadata.dependencies.mustbeviralProject.dependencies.state))
  .map(([_, deps]) => deps.map(dep => `- ${dep.name}: ${dep.version}`).join('\n'))
  .join('\n') || '- No state management detected'}

### AI/ML Integration
${Object.entries(metadata.dependencies.mustbeviralProject.dependencies.ai)
  .map(([_, deps]) => deps.map(dep => `- ${dep.name}: ${dep.version}`).join('\n'))
  .join('\n') || '- No AI libraries detected'}

## ⚙️ Build Configuration

- **Build System:** ${metadata.buildInfo.buildSystem}
- **TypeScript:** ${metadata.buildInfo.hasTypeScript ? '✅ Configured' : '❌ Not configured'}
- **Docker:** ${metadata.buildInfo.hasDocker ? '✅ Configured' : '❌ Not configured'}
- **Cloudflare:** ${metadata.buildInfo.hasCloudflare ? '✅ Configured' : '❌ Not configured'}

### Configuration Files
${Object.entries(metadata.buildInfo.configFiles)
  .map(([name, exists]) => `- ${name}: ${exists ? '✅' : '❌'}`)
  .join('\n')}

## 📁 Project Structure

- **Total Files:** ${metadata.directoryStructure.totalFiles}
- **TypeScript Files:** ${metadata.directoryStructure.sourceFiles.typescript}
- **TSX Files:** ${metadata.directoryStructure.sourceFiles.tsx}
- **JavaScript Files:** ${metadata.directoryStructure.sourceFiles.javascript}
- **CSS Files:** ${metadata.directoryStructure.sourceFiles.css}

## 🔐 Security & Environment

### Environment Files
${Object.entries(metadata.securityInfo.environmentFiles)
  .map(([name, exists]) => `- .env.${name}: ${exists ? '✅' : '❌'}`)
  .join('\n')}

### Security Features
${Object.entries(metadata.securityInfo.securityFeatures)
  .map(([name, exists]) => `- ${name}: ${exists ? '✅' : '❌'}`)
  .join('\n')}

## 🔧 Git Information

- **Current Branch:** ${metadata.gitInfo.branch}
- **Last Commit:** ${metadata.gitInfo.lastCommit}
- **Remote Origin:** ${metadata.gitInfo.remote}
- **Working Directory:** ${metadata.gitInfo.status ? 'Has changes' : 'Clean'}

## 💡 Development Recommendations

### 🚨 Critical
${metadata.recommendations.critical.map(rec => `- ${rec}`).join('\n') || '- All critical requirements met!'}

### 💡 Suggested
${metadata.recommendations.suggested.map(rec => `- ${rec}`).join('\n') || '- All suggested improvements in place!'}

### 🔧 Optional
${metadata.recommendations.optional.map(rec => `- ${rec}`).join('\n') || '- All optional improvements in place!'}

---

**Report completed successfully! 🎉**
**Next: Review recommendations and update development setup accordingly.**
`;

  return report;
};

// Main execution
try {
  log('🔍 Must Be Viral V2 - Environment Metadata Collector', 'bright');
  log('=' .repeat(60), 'blue');

  const metadata = collectEnvironmentMetadata();
  const report = generateReport(metadata);

  // Save files
  const reportsDir = join(projectRoot, '.reports');
  if (!existsSync(reportsDir)) {
    safeExec('mkdir -p .reports');
  }

  const metadataFile = join(reportsDir, 'environment-metadata.json');
  const reportFile = join(reportsDir, 'environment-report.md');

  writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
  writeFileSync(reportFile, report);

  log('', 'reset');
  log('✅ Environment analysis complete!', 'green');
  log('', 'reset');
  log('📄 Files generated:', 'cyan');
  log(`   - ${metadataFile}`, 'blue');
  log(`   - ${reportFile}`, 'blue');
  log('', 'reset');
  log('📊 Quick Summary:', 'yellow');
  log(`   - Build System: ${metadata.buildInfo.buildSystem}`, 'reset');
  log(`   - TypeScript: ${metadata.buildInfo.hasTypeScript ? '✅' : '❌'}`, 'reset');
  log(`   - Total Files: ${metadata.directoryStructure.totalFiles}`, 'reset');
  log(`   - Critical Issues: ${metadata.recommendations.critical.length}`, 'reset');

  if (metadata.recommendations.critical.length > 0) {
    log('', 'reset');
    log('⚠️  Critical recommendations found:', 'yellow');
    metadata.recommendations.critical.forEach(rec => log(`   - ${rec}`, 'red'));
  } else {
    log('', 'reset');
    log('🎉 All critical requirements met!', 'green');
  }

  process.exit(0);

} catch (error) {
  log('', 'reset');
  log('❌ Error during metadata collection:', 'red');
  log(error.message, 'red');
  log('', 'reset');
  log('📋 Partial metadata may have been saved.', 'yellow');
  process.exit(1);
}
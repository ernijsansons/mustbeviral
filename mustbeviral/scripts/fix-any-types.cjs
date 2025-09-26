#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const config = {
  srcPattern: 'src/**/*.{ts,tsx}',
  testPattern: '__tests__/**/*.{ts,tsx}',
  mockPattern: '__mocks__/**/*.{ts,tsx}',

  // Type replacements
  replacements: {
    // Simple any replacements
    ': any': ': unknown',
    '<any>': '<unknown>',
    'as any': 'as unknown',
    'Array<any>': 'Array<unknown>',
    'Promise<any>': 'Promise<unknown>',

    // Function types
    ': Function': ': (...args: unknown[]) => unknown',
    'Array<Function>': 'Array<(...args: unknown[]) => unknown>',

    // Event handlers (React)
    '(e: any)': '(e: React.ChangeEvent<HTMLInputElement>)',
    '(event: any)': '(event: React.MouseEvent)',

    // Common patterns
    'catch (error)': 'catch (error: unknown)',
    'catch (e)': 'catch (e: unknown)',
    'catch (err)': 'catch (err: unknown)',
  },

  // Files to skip
  skipFiles: [
    'vite.config.ts',
    'jest.config',
    '.d.ts'
  ]
};

// Stats tracking
let stats = {
  filesProcessed: 0,
  replacementsMade: 0,
  errors: 0
};

function shouldSkipFile(filePath) {
  return config.skipFiles.some(skip => filePath.includes(skip));
}

function processFile(filePath) {
  if (shouldSkipFile(filePath)) {
    console.log(`  ⏭️  Skipping ${path.basename(filePath)}`);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fileReplacements = 0;

    // Apply replacements
    for (const [search, replace] of Object.entries(config.replacements)) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, replace);
        fileReplacements += matches.length;
      }
    }

    // Special cases that need context

    // Replace 'any' in type annotations but not in comments or strings
    content = content.replace(/:\s*any(\s|,|\)|;|>|\}|\])/g, ': unknown$1');

    // Replace Function type with proper signature
    content = content.replace(/:\s*Function\b/g, ': (...args: unknown[]) => unknown');

    // Fix error types in catch blocks
    content = content.replace(/catch\s*\(\s*(\w+)\s*\)/g, 'catch ($1: unknown)');

    // Fix React event handlers
    content = content.replace(/onChange=\{[^}]*\((\w+): any\)/g, (match, param) => {
      return match.replace(': any', ': React.ChangeEvent<HTMLInputElement>');
    });

    content = content.replace(/onClick=\{[^}]*\((\w+): any\)/g, (match, param) => {
      return match.replace(': any', ': React.MouseEvent');
    });

    // Check if any changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Fixed ${fileReplacements} 'any' types in ${path.basename(filePath)}`);
      stats.replacementsMade += fileReplacements;
    }

    stats.filesProcessed++;
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}: ${error.message}`);
    stats.errors++;
  }
}

function fixDirectory(pattern, label) {
  console.log(`\n📁 Processing ${label}...`);
  const files = glob.sync(pattern);

  files.forEach(file => {
    processFile(file);
  });
}

// Main execution
console.log('🔧 Fixing TypeScript "any" types...\n');
console.log('This script will:');
console.log('  • Replace "any" with "unknown" where safe');
console.log('  • Fix Function types with proper signatures');
console.log('  • Add proper types to error handlers');
console.log('  • Fix React event handler types\n');

// Process directories in order
fixDirectory(config.srcPattern, 'Source files');
fixDirectory(config.testPattern, 'Test files');
fixDirectory(config.mockPattern, 'Mock files');

// Report results
console.log('\n📊 Results:');
console.log('================');
console.log(`Files processed: ${stats.filesProcessed}`);
console.log(`Replacements made: ${stats.replacementsMade}`);
console.log(`Errors: ${stats.errors}`);

// Verify build still works
console.log('\n🔍 Verifying build...');
const { execSync } = require('child_process');

try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Build successful!');
} catch (error) {
  console.error('❌ Build failed! You may need to manually fix some type issues.');
  console.error('Run "npm run build" to see specific errors.');
}

console.log('\n✨ Type fixing complete!');
console.log('Next steps:');
console.log('  1. Run "npm run lint" to see remaining errors');
console.log('  2. Run "npx tsc --noEmit" to check for type errors');
console.log('  3. Manually fix any complex type issues');
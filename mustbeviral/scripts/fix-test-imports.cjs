#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Fixing test file imports...');

// Find all test files
function findTestFiles(dir) {
  const files = [];

  function scan(directory) {
    const items = fs.readdirSync(directory);

    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (item.includes('.test.') || item.includes('.spec.')) {
        files.push(fullPath);
      }
    }
  }

  scan(dir);
  return files;
}

const testFiles = findTestFiles('__tests__');
console.log(`Found ${testFiles.length} test files`);

let totalFixed = 0;

testFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fileFixed = 0;

    // Remove common unused test imports
    const unusedImports = [
      '_describe', '_CostTracker', '_TokenOptimizer', '_SmartCache',
      '_BatchProcessor', '_createMockCloudflareEnv'
    ];

    unusedImports.forEach(unused => {
      if (content.includes(unused)) {
        // Remove from import statements
        content = content.replace(new RegExp(`, ${unused}`, 'g'), '');
        content = content.replace(new RegExp(`${unused}, `, 'g'), '');
        content = content.replace(new RegExp(`\\{ ${unused} \\}`, 'g'), '{}');
        fileFixed++;
      }
    });

    // Clean up empty imports
    content = content.replace(/import \{\s*\} from [^;]+;/g, '');
    content = content.replace(/import \{,/g, 'import {');
    content = content.replace(/,\s*\} from/g, ' } from');

    if (fileFixed > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Fixed ${fileFixed} imports in ${path.basename(filePath)}`);
      totalFixed += fileFixed;
    }

  } catch (error) {
    console.error(`  ❌ Error fixing ${filePath}: ${error.message}`);
  }
});

console.log(`\n📊 Total test import fixes: ${totalFixed}`);
console.log('🧪 Test import fixes complete!');
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚨 Emergency regex syntax fixes...');

// Find all test files that might have broken regex patterns
function findTestFiles() {
  const files = [];

  function scan(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (item.includes('.test.') || item.includes('.spec.')) {
        files.push(fullPath);
      }
    }
  }

  scan('__tests__');
  return files;
}

const testFiles = findTestFiles();
console.log(`Scanning ${testFiles.length} test files for broken regex patterns...`);

let totalFixed = 0;
let filesFixed = 0;

testFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fileFixed = 0;

    // Fix common broken regex patterns from our earlier bulk fixes
    const regexFixes = [
      // Empty regex patterns (most critical)
      { from: /expect\.stringMatching\(\/\/([^)]+)\$\/\)/g, to: 'expect.stringMatching(\/\/$1$\/)' },
      // Broken API path patterns
      { from: /\/\/api\//g, to: '/\\/api\\/' },
      // Fix malformed regex literals
      { from: /\/\/([^/]+)\$\//g, to: '/\\/$1$/' },
      // Fix parentheses in regex
      { from: /\(\//g, to: '(\/' },
      // Fix common test patterns
      { from: /stringMatching\(\/\/api/g, to: 'stringMatching(\/\\/api' },
      // Fix double forward slashes at start of regex
      { from: /\/\^\/\//g, to: '/\\^\\/' },
    ];

    regexFixes.forEach(({ from, to }) => {
      const before = content;
      content = content.replace(from, to);
      if (content !== before) fileFixed++;
    });

    // Manual specific fixes for patterns we've seen
    content = content.replace(/expect\.stringMatching\(\/\/api\/([^)]+)\$\/\)/g,
      'expect.stringMatching(/\\/api\\/$1$/)');

    // Fix unterminated regex literals (add closing slash)
    content = content.replace(/\/\^[^/]+$/gm, (match) => match + '/');

    if (fileFixed > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Fixed ${fileFixed} regex patterns in ${path.basename(filePath)}`);
      totalFixed += fileFixed;
      filesFixed++;
    }

  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}: ${error.message}`);
  }
});

console.log(`\n🚨 Emergency regex fixes:`);
console.log(`Files fixed: ${filesFixed}`);
console.log(`Patterns fixed: ${totalFixed}`);
console.log('🚨 Emergency regex fixes complete!');
#!/usr/bin/env node

/**
 * Fix nullish coalescing operator issues
 * Replaces logical OR (||) with nullish coalescing (??) where appropriate
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to fix nullish coalescing issues
const patterns = [
  // Simple variable assignments: var = value || defaultValue
  {
    pattern: /(\w+)\s*=\s*([^|]+)\s*\|\|\s*([^;,\n]+)/g,
    replacement: '$1 = $2 ?? $3'
  },
  // Function parameters: func(param || defaultValue)
  {
    pattern: /(\w+)\s*\(\s*([^|]+)\s*\|\|\s*([^)]+)\s*\)/g,
    replacement: '$1($2 ?? $3)'
  },
  // Return statements: return value || defaultValue
  {
    pattern: /return\s+([^|]+)\s*\|\|\s*([^;,\n]+)/g,
    replacement: 'return $1 ?? $2'
  },
  // Object property access: obj.prop || defaultValue
  {
    pattern: /(\w+(?:\.\w+)*)\s*\|\|\s*([^;,\n\)]+)/g,
    replacement: '$1 ?? $2'
  },
  // Assignment with nullish coalescing: var ??= value
  {
    pattern: /(\w+)\s*=\s*\1\s*\|\|\s*([^;,\n]+)/g,
    replacement: '$1 ??= $2'
  }
];

// Files to process
const filePatterns = [
  'src/**/*.{ts,tsx}',
  'workers/**/*.{ts,tsx}'
];

function fixNullishCoalescing(content) {
  let fixed = content;
  let changes = 0;
  
  patterns.forEach(({ pattern, replacement }) => {
    const matches = fixed.match(pattern);
    if (matches) {
      fixed = fixed.replace(pattern, replacement);
      changes += matches.length;
    }
  });
  
  return { content: fixed, changes };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: fixed, changes } = fixNullishCoalescing(content);
    
    if (changes > 0) {
      fs.writeFileSync(filePath, fixed, 'utf8');
      console.log(`✅ Fixed ${changes} nullish coalescing issues in ${filePath}`);
      return changes;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function main() {
  console.log('🔧 Fixing nullish coalescing operator issues...\n');
  
  let totalChanges = 0;
  let filesProcessed = 0;
  
  filePatterns.forEach(pattern => {
    const files = glob.sync(pattern, { cwd: process.cwd() });
    
    files.forEach(file => {
      const changes = processFile(file);
      totalChanges += changes;
      if (changes > 0) {filesProcessed++;}
    });
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${filesProcessed}`);
  console.log(`   Total changes: ${totalChanges}`);
  
  if (totalChanges > 0) {
    console.log('\n✨ Nullish coalescing fixes completed!');
  } else {
    console.log('\n✅ No nullish coalescing issues found.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixNullishCoalescing, processFile };

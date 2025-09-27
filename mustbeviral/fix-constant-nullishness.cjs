#!/usr/bin/env node

/**
 * Fix constant nullishness issues
 * Removes unnecessary nullish coalescing with constants
 */

const fs = require('fs');
const _path = require('path');
const { glob } = require('glob');

// Files to process
const filePatterns = [
  'src/**/*.{ts,tsx}',
  'workers/**/*.{ts,tsx}'
];

function fixConstantNullishness(content) {
  let fixed = content;
  let changes = 0;
  
  // Pattern to match constant nullishness: null ?? value, undefined ?? value
  const constantPatterns = [
    {
      pattern: /null\s*\?\?\s*([^;,\n\)]+)/g,
      replacement: '$1'
    },
    {
      pattern: /undefined\s*\?\?\s*([^;,\n\)]+)/g,
      replacement: '$1'
    },
    {
      pattern: /true\s*\?\?\s*([^;,\n\)]+)/g,
      replacement: 'true'
    },
    {
      pattern: /false\s*\?\?\s*([^;,\n\)]+)/g,
      replacement: '$1'
    }
  ];
  
  constantPatterns.forEach(({ pattern, replacement }) => {
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
    const { content: fixed, changes } = fixConstantNullishness(content);
    
    if (changes > 0) {
      fs.writeFileSync(filePath, fixed, 'utf8');
      console.log(`✅ Fixed ${changes} constant nullishness issues in ${filePath}`);
      return changes;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function main() {
  console.log('🔧 Fixing constant nullishness issues...\n');
  
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
    console.log('\n✨ Constant nullishness fixes completed!');
  } else {
    console.log('\n✅ No constant nullishness issues found.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixConstantNullishness, processFile };

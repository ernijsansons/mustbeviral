#!/usr/bin/env node

/**
 * Simple pattern-based fixes for common ESLint errors
 */

import fs from 'fs';
import { glob } from 'glob';

const filePatterns = [
  'src/**/*.{ts,tsx}',
  'workers/**/*.{ts,tsx}'
];

async function fixNullishCoalescing(content) {
  let fixed = content;
  let changes = 0;
  
  // Fix simple || to ?? patterns
  const patterns = [
    // Simple variable assignments: var = value || defaultValue
    {
      pattern: /(\w+)\s*=\s*([^|]+)\s*\|\|\s*([^;,\n)]+)/g,
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
    }
  ];
  
  patterns.forEach(({ pattern, replacement }) => {
    const matches = fixed.match(pattern);
    if (matches) {
      fixed = fixed.replace(pattern, replacement);
      changes += matches.length;
    }
  });
  
  return { content: fixed, changes };
}

async function fixConstantNullishness(content) {
  let fixed = content;
  let changes = 0;
  
  // Fix constant nullishness: null ?? value -> value
  const patterns = [
    {
      pattern: /null\s*\?\?\s*([^;,\n)]+)/g,
      replacement: '$1'
    },
    {
      pattern: /undefined\s*\?\?\s*([^;,\n)]+)/g,
      replacement: '$1'
    }
  ];
  
  patterns.forEach(({ pattern, replacement }) => {
    const matches = fixed.match(pattern);
    if (matches) {
      fixed = fixed.replace(pattern, replacement);
      changes += matches.length;
    }
  });
  
  return { content: fixed, changes };
}

async function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let totalChanges = 0;
    
    // Fix constant nullishness first
    const { content: fixed1, changes: changes1 } = await fixConstantNullishness(content);
    content = fixed1;
    totalChanges += changes1;
    
    // Fix nullish coalescing
    const { content: fixed2, changes: changes2 } = await fixNullishCoalescing(content);
    content = fixed2;
    totalChanges += changes2;
    
    if (totalChanges > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${totalChanges} issues in ${filePath}`);
      return totalChanges;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('🔧 Fixing simple patterns...\n');
  
  let totalChanges = 0;
  let filesProcessed = 0;
  
  for (const pattern of filePatterns) {
    const files = await glob(pattern, { cwd: process.cwd() });
    
    for (const file of files) {
      const changes = await processFile(file);
      totalChanges += changes;
      if (changes > 0) {filesProcessed++;}
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${filesProcessed}`);
  console.log(`   Total changes: ${totalChanges}`);
  
  if (totalChanges > 0) {
    console.log('\n✨ Simple pattern fixes completed!');
  } else {
    console.log('\n✅ No simple pattern issues found.');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}


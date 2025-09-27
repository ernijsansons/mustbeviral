#!/usr/bin/env node

/**
 * Fix missing curly braces after if conditions
 * Adds curly braces around single-line if statements
 */

const fs = require('fs');
const _path = require('path');
const glob = require('glob');

// Files to process
const filePatterns = [
  'src/**/*.{ts,tsx}',
  'workers/**/*.{ts,tsx}'
];

function fixCurlyBraces(content) {
  let fixed = content;
  let changes = 0;
  
  // Pattern to match if statements without curly braces
  const ifPattern = /if\s*\([^)]+\)\s*(?!\s*\{)([^;\n]+)/g;
  
  fixed = fixed.replace(ifPattern, (match, statement) => {
    const trimmedStatement = statement.trim();
    
    // Skip if already has curly braces or is a complex statement
    if (trimmedStatement.includes('{') || trimmedStatement.includes('}')) {
      return match;
    }
    
    // Skip if statement ends with semicolon (likely already correct)
    if (trimmedStatement.endsWith(';')) {
      return match;
    }
    
    // Add curly braces around the statement
    changes++;
    return match.replace(statement, ` {\n    ${trimmedStatement}\n  }`);
  });
  
  // Pattern to match else statements without curly braces
  const elsePattern = /else\s*(?!\s*\{)([^;\n]+)/g;
  
  fixed = fixed.replace(elsePattern, (match, statement) => {
    const trimmedStatement = statement.trim();
    
    // Skip if already has curly braces
    if (trimmedStatement.includes('{') || trimmedStatement.includes('}')) {
      return match;
    }
    
    // Skip if statement ends with semicolon
    if (trimmedStatement.endsWith(';')) {
      return match;
    }
    
    // Add curly braces around the statement
    changes++;
    return match.replace(statement, ` {\n    ${trimmedStatement}\n  }`);
  });
  
  return { content: fixed, changes };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: fixed, changes } = fixCurlyBraces(content);
    
    if (changes > 0) {
      fs.writeFileSync(filePath, fixed, 'utf8');
      console.log(`✅ Fixed ${changes} curly brace issues in ${filePath}`);
      return changes;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function main() {
  console.log('🔧 Fixing missing curly braces...\n');
  
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
    console.log('\n✨ Curly brace fixes completed!');
  } else {
    console.log('\n✅ No curly brace issues found.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixCurlyBraces, processFile };

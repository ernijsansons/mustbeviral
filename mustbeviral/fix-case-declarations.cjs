#!/usr/bin/env node

/**
 * Fix lexical declarations in case blocks
 * Wraps case block declarations in curly braces
 */

const fs = require('fs');
const _path = require('path');
const glob = require('glob');

// Files to process
const filePatterns = [
  'src/**/*.{ts,tsx}',
  'workers/**/*.{ts,tsx}'
];

function fixCaseDeclarations(content) {
  let fixed = content;
  let changes = 0;
  
  // Pattern to match case blocks with lexical declarations
  const casePattern = /(case\s+[^:]+:\s*)((?:const|let|var)\s+\w+[^;]*;)/g;
  
  fixed = fixed.replace(casePattern, (match, casePart, declaration) => {
    // Check if the case block already has curly braces
    const afterCase = content.substring(content.indexOf(match) + match.length);
    const nextCase = afterCase.search(/case\s+[^:]+:\s*/);
    const nextDefault = afterCase.search(/default\s*:\s*/);
    const nextBrace = afterCase.search(/[{}]/);
    
    const caseBlockEnd = Math.min(
      nextCase === -1 ? Infinity : nextCase,
      nextDefault === -1 ? Infinity : nextDefault
    );
    
    if (nextBrace !== -1 && nextBrace < caseBlockEnd) {
      // Already has braces, no need to fix
      return match;
    }
    
    // Wrap the case block in curly braces
    changes++;
    return `${casePart}{\n    ${declaration}\n  }`;
  });
  
  return { content: fixed, changes };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: fixed, changes } = fixCaseDeclarations(content);
    
    if (changes > 0) {
      fs.writeFileSync(filePath, fixed, 'utf8');
      console.log(`✅ Fixed ${changes} case declaration issues in ${filePath}`);
      return changes;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function main() {
  console.log('🔧 Fixing case declaration issues...\n');
  
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
    console.log('\n✨ Case declaration fixes completed!');
  } else {
    console.log('\n✅ No case declaration issues found.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixCaseDeclarations, processFile };

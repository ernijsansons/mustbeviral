#!/usr/bin/env node

/**
 * Fix unused variables and parameters
 * Removes unused variables and prefixes unused parameters with underscore
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to fix unused variables
const patterns = [
  // Remove unused variable declarations
  {
    pattern: /^\s*(const|let|var)\s+(\w+)\s*=.*?;\s*$/gm,
    checkUnused: true
  },
  // Prefix unused function parameters with underscore
  {
    pattern: /function\s+\w+\s*\(([^)]+)\)/g,
    fixParams: true
  },
  // Prefix unused arrow function parameters
  {
    pattern: /\(([^)]+)\)\s*=>/g,
    fixParams: true
  }
];

// Files to process
const filePatterns = [
  'src/**/*.{ts,tsx}',
  'workers/**/*.{ts,tsx}'
];

function isVariableUsed(content, variableName) {
  // Simple check - look for variable usage (not declarations)
  const declarationPattern = new RegExp(`(const|let|var)\\s+${variableName}\\s*=`, 'g');
  const usagePattern = new RegExp(`\\b${variableName}\\b`, 'g');
  
  const declarations = content.match(declarationPattern) || [];
  const usages = content.match(usagePattern) || [];
  
  // If usages are more than declarations, variable is used
  return usages.length > declarations.length;
}

function fixUnusedParameters(content) {
  let fixed = content;
  let changes = 0;
  
  // Fix function parameters
  fixed = fixed.replace(/function\s+\w+\s*\(([^)]+)\)/g, (match, params) => {
    const paramList = params.split(',').map(param => {
      const trimmed = param.trim();
      if (trimmed && !trimmed.startsWith('_') && !trimmed.includes(':')) {
        // Check if parameter is used in function body
        const paramName = trimmed.split('=')[0].trim();
        const functionBody = content.substring(content.indexOf(match) + match.length);
        const nextBrace = functionBody.indexOf('{');
        const closingBrace = functionBody.lastIndexOf('}');
        
        if (nextBrace !== -1 && closingBrace !== -1) {
          const body = functionBody.substring(nextBrace + 1, closingBrace);
          if (!body.includes(paramName) && !body.includes(`_${paramName}`)) {
            changes++;
            return `_${trimmed}`;
          }
        }
      }
      return trimmed;
    });
    
    return match.replace(params, paramList.join(', '));
  });
  
  return { content: fixed, changes };
}

function removeUnusedVariables(content) {
  const fixed = content;
  let changes = 0;
  
  // Find and remove unused variable declarations
  const lines = content.split('\n');
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const varMatch = line.match(/^\s*(const|let|var)\s+(\w+)\s*=/);
    
    if (varMatch) {
      const [, , varName] = varMatch;
      const remainingContent = lines.slice(i + 1).join('\n');
      
      if (!isVariableUsed(remainingContent, varName)) {
        // Skip this line (remove unused variable)
        changes++;
        continue;
      }
    }
    
    newLines.push(line);
  }
  
  return { content: newLines.join('\n'), changes };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Fix unused parameters
    const { content: fixedParams, changes: paramChanges } = fixUnusedParameters(content);
    
    // Remove unused variables
    const { content: fixed, changes: varChanges } = removeUnusedVariables(fixedParams);
    
    const totalChanges = paramChanges + varChanges;
    
    if (totalChanges > 0) {
      fs.writeFileSync(filePath, fixed, 'utf8');
      console.log(`✅ Fixed ${totalChanges} unused variable issues in ${filePath}`);
      return totalChanges;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function main() {
  console.log('🔧 Fixing unused variables and parameters...\n');
  
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
    console.log('\n✨ Unused variable fixes completed!');
  } else {
    console.log('\n✅ No unused variable issues found.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixUnusedParameters, removeUnusedVariables, processFile };

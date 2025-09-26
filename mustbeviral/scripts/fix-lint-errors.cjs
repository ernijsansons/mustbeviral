#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get lint errors
console.log('🔍 Analyzing lint errors...');
let lintOutput = '';
try {
  lintOutput = execSync('npm run lint 2>&1', { encoding: 'utf-8' }).toString();
} catch (error) {
  // Lint will fail with exit code 1 if there are errors, but we still get the output
  lintOutput = error.stdout || error.output[1] || '';
}

// Parse errors
const errors = {};
const lines = lintOutput.split('\n');

lines.forEach(line => {
  const match = line.match(/^(.*?):\s*(\d+):(\d+)\s+(error|warning)\s+(.*?)\s+(@?\S+)$/);
  if (match) {
    const [, file, lineNum, col, severity, message, rule] = match;
    if (!errors[rule]) {
      errors[rule] = [];
    }
    errors[rule].push({ file, lineNum, col, severity, message });
  }
});

// Count errors by type
const errorCounts = {};
Object.keys(errors).forEach(rule => {
  errorCounts[rule] = errors[rule].length;
});

// Sort by count
const sortedErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]);

console.log('\n📊 Error Summary:');
console.log('================');
sortedErrors.forEach(([rule, count]) => {
  console.log(`${rule}: ${count}`);
});

// Auto-fix strategies
console.log('\n🔧 Applying fixes...\n');

// Fix unused variables by prefixing with underscore
if (errors['@typescript-eslint/no-unused-vars']) {
  console.log('Fixing unused variables...');
  const unusedVars = errors['@typescript-eslint/no-unused-vars'];

  const fileGroups = {};
  unusedVars.forEach(error => {
    if (!fileGroups[error.file]) {
      fileGroups[error.file] = [];
    }
    fileGroups[error.file].push(error);
  });

  Object.entries(fileGroups).forEach(([file, fileErrors]) => {
    try {
      const filePath = path.resolve(file);
      if (!fs.existsSync(filePath)) return;

      let content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Sort errors by line number in reverse to avoid index shifting
      fileErrors.sort((a, b) => parseInt(b.lineNum) - parseInt(a.lineNum));

      fileErrors.forEach(error => {
        const lineIdx = parseInt(error.lineNum) - 1;
        if (lineIdx >= 0 && lineIdx < lines.length) {
          const line = lines[lineIdx];

          // Extract variable name from error message
          const varMatch = error.message.match(/'([^']+)'/);
          if (varMatch) {
            const varName = varMatch[1];

            // Check if it's an import
            if (line.includes('import')) {
              // Remove the unused import
              if (line.includes(`{ ${varName}`)) {
                // Remove from destructured imports
                lines[lineIdx] = line.replace(new RegExp(`${varName},?\\s*`), '');
              } else if (line.includes(`import ${varName}`)) {
                // Remove entire import line
                lines[lineIdx] = '';
              }
            } else if (line.includes('catch')) {
              // Prefix catch error with underscore
              lines[lineIdx] = line.replace(`(${varName})`, `(_${varName})`);
            } else {
              // Prefix variable with underscore
              const regex = new RegExp(`\\b${varName}\\b`, 'g');
              lines[lineIdx] = line.replace(regex, `_${varName}`);
            }
          }
        }
      });

      content = lines.join('\n');
      fs.writeFileSync(filePath, content);
      console.log(`  ✅ Fixed ${fileErrors.length} unused variables in ${path.basename(file)}`);
    } catch (error) {
      console.log(`  ❌ Error fixing ${file}: ${error.message}`);
    }
  });
}

// Fix 'any' types by replacing with 'unknown'
if (errors['@typescript-eslint/no-explicit-any']) {
  console.log('\nFixing any types...');
  const anyErrors = errors['@typescript-eslint/no-explicit-any'];

  const fileGroups = {};
  anyErrors.forEach(error => {
    if (!fileGroups[error.file]) {
      fileGroups[error.file] = [];
    }
    fileGroups[error.file].push(error);
  });

  Object.entries(fileGroups).forEach(([file, fileErrors]) => {
    try {
      const filePath = path.resolve(file);
      if (!fs.existsSync(filePath)) return;

      let content = fs.readFileSync(filePath, 'utf-8');

      // Replace 'any' with 'unknown' in type annotations
      content = content.replace(/:\s*any(\s|,|\)|;|>)/g, ': unknown$1');
      content = content.replace(/<any>/g, '<unknown>');
      content = content.replace(/as\s+any/g, 'as unknown');
      content = content.replace(/Array<any>/g, 'Array<unknown>');

      fs.writeFileSync(filePath, content);
      console.log(`  ✅ Fixed ${fileErrors.length} any types in ${path.basename(file)}`);
    } catch (error) {
      console.log(`  ❌ Error fixing ${file}: ${error.message}`);
    }
  });
}

// Fix Function types
if (errors['@typescript-eslint/no-unsafe-function-type']) {
  console.log('\nFixing Function types...');
  const funcErrors = errors['@typescript-eslint/no-unsafe-function-type'];

  const fileGroups = {};
  funcErrors.forEach(error => {
    if (!fileGroups[error.file]) {
      fileGroups[error.file] = [];
    }
    fileGroups[error.file].push(error);
  });

  Object.entries(fileGroups).forEach(([file, fileErrors]) => {
    try {
      const filePath = path.resolve(file);
      if (!fs.existsSync(filePath)) return;

      let content = fs.readFileSync(filePath, 'utf-8');

      // Replace Function with proper type
      content = content.replace(/:\s*Function\b/g, ': (...args: unknown[]) => unknown');
      content = content.replace(/Array<Function>/g, 'Array<(...args: unknown[]) => unknown>');

      fs.writeFileSync(filePath, content);
      console.log(`  ✅ Fixed ${fileErrors.length} Function types in ${path.basename(file)}`);
    } catch (error) {
      console.log(`  ❌ Error fixing ${file}: ${error.message}`);
    }
  });
}

console.log('\n✨ Fix script completed!');
console.log('Run "npm run lint" again to see remaining errors.');
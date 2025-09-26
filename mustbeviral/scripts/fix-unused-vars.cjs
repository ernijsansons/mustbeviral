#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get lint output for unused variables
function getUnusedVars() {
  console.log('🔍 Analyzing unused variables...');

  let lintOutput = '';
  try {
    lintOutput = execSync('npm run lint 2>&1', { encoding: 'utf-8' });
  } catch (error) {
    // Lint will fail if there are errors, but we still get output
    lintOutput = error.stdout || error.output?.[1] || '';
  }

  const unusedVars = [];
  const lines = lintOutput.split('\n');

  lines.forEach(line => {
    // Match unused variable errors
    const match = line.match(/^(.*?):(\d+):(\d+)\s+error\s+'([^']+)' is (defined but never used|assigned a value but never used)\s+@typescript-eslint\/no-unused-vars/);
    if (match) {
      const [, file, lineNum, col, varName, errorType] = match;
      unusedVars.push({
        file: file.trim(),
        line: parseInt(lineNum),
        col: parseInt(col),
        varName,
        errorType
      });
    }
  });

  return unusedVars;
}

// Group errors by file
function groupByFile(errors) {
  const grouped = {};
  errors.forEach(error => {
    if (!grouped[error.file]) {
      grouped[error.file] = [];
    }
    grouped[error.file].push(error);
  });
  return grouped;
}

// Fix unused variables in a file
function fixFile(filePath, errors) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  File not found: ${filePath}`);
      return 0;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let fixCount = 0;

    // Sort errors by line number in reverse (to avoid index shifting)
    errors.sort((a, b) => b.line - a.line);

    errors.forEach(error => {
      const lineIdx = error.line - 1;
      if (lineIdx >= 0 && lineIdx < lines.length) {
        const line = lines[lineIdx];
        const varName = error.varName;

        // Handle different types of unused variables
        if (line.includes('import')) {
          // Handle imports
          if (line.includes(`{ ${varName}`) || line.includes(`, ${varName}`) || line.includes(`${varName},`) || line.includes(`${varName} }`)) {
            // Remove from destructured imports
            lines[lineIdx] = line
              .replace(new RegExp(`\\b${varName},\\s*`), '')
              .replace(new RegExp(`,\\s*${varName}\\b`), '')
              .replace(new RegExp(`\\b${varName}\\b`), '')
              .replace(/\{\s*,/, '{')
              .replace(/,\s*\}/, '}')
              .replace(/\{\s*\}/, '{}')
              .replace(/import\s+\{\s*\}\s+from\s+['"][^'"]+['"];?/, '');
          } else if (line.includes(`import ${varName}`)) {
            // Remove entire import line if it's a default import
            lines[lineIdx] = '';
          }
          fixCount++;
        } else if (line.includes('catch')) {
          // Prefix catch error variables with underscore
          lines[lineIdx] = line.replace(
            new RegExp(`catch\\s*\\(\\s*${varName}\\b`),
            `catch (_${varName}`
          );
          fixCount++;
        } else if (error.errorType === 'assigned a value but never used') {
          // For variables that are assigned but never used, prefix with underscore
          lines[lineIdx] = line.replace(
            new RegExp(`\\b(const|let|var)\\s+${varName}\\b`),
            `$1 _${varName}`
          );
          fixCount++;
        } else if (line.includes('function') || line.includes('=>')) {
          // For function parameters, prefix with underscore
          lines[lineIdx] = line.replace(
            new RegExp(`\\b${varName}\\b`),
            `_${varName}`
          );
          fixCount++;
        }
      }
    });

    // Write back the fixed content
    content = lines.join('\n');

    // Clean up empty lines from removed imports
    content = content.replace(/\n\n\n+/g, '\n\n');

    fs.writeFileSync(filePath, content, 'utf8');
    return fixCount;
  } catch (error) {
    console.error(`  ❌ Error fixing ${filePath}: ${error.message}`);
    return 0;
  }
}

// Main execution
console.log('🔧 Fixing unused variables...\n');
console.log('This script will:');
console.log('  • Remove unused imports');
console.log('  • Prefix unused but necessary variables with underscore');
console.log('  • Clean up import statements\n');

const unusedVars = getUnusedVars();

if (unusedVars.length === 0) {
  console.log('✅ No unused variables found!');
  process.exit(0);
}

console.log(`Found ${unusedVars.length} unused variables\n`);

const fileGroups = groupByFile(unusedVars);
let totalFixed = 0;
let filesFixed = 0;

for (const [file, errors] of Object.entries(fileGroups)) {
  console.log(`📝 Processing ${path.basename(file)}...`);
  const fixed = fixFile(file, errors);
  if (fixed > 0) {
    console.log(`  ✅ Fixed ${fixed} unused variables`);
    totalFixed += fixed;
    filesFixed++;
  }
}

// Report results
console.log('\n📊 Results:');
console.log('================');
console.log(`Files processed: ${Object.keys(fileGroups).length}`);
console.log(`Files fixed: ${filesFixed}`);
console.log(`Variables fixed: ${totalFixed}`);

// Verify build still works
console.log('\n🔍 Verifying build...');

try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Build successful!');
} catch (error) {
  console.error('❌ Build failed! You may need to manually fix some issues.');
  console.error('Run "npm run build" to see specific errors.');
}

console.log('\n✨ Unused variable fixing complete!');
console.log('Next steps:');
console.log('  1. Run "npm run lint" to verify fixes');
console.log('  2. Review changes with "git diff"');
console.log('  3. Test your application');
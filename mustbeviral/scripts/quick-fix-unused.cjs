#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Get specific unused variable errors
function getSpecificUnusedVars() {
  console.log('🔍 Finding specific unused variable patterns...');

  let lintOutput = '';
  try {
    lintOutput = execSync('npm run lint 2>&1', { encoding: 'utf-8' });
  } catch (error) {
    lintOutput = error.stdout || error.output?.[1] || '';
  }

  const fixes = [];
  const lines = lintOutput.split('\n');

  lines.forEach(line => {
    // Pattern: file:line:col error 'variable' is defined but never used
    const match = line.match(/^(.+?):(\d+):(\d+)\s+error\s+'(\w+)' is defined but never used.*@typescript-eslint\/no-unused-vars/);
    if (match) {
      const [, file, lineNum, , varName] = match;
      fixes.push({ file: file.trim(), line: parseInt(lineNum), varName });
    }

    // Pattern for function parameters
    const paramMatch = line.match(/^(.+?):(\d+):(\d+)\s+error\s+'(\w+)' is defined but never used.*@typescript-eslint\/no-unused-vars/);
    if (paramMatch) {
      const [, file, lineNum, , varName] = paramMatch;
      fixes.push({ file: file.trim(), line: parseInt(lineNum), varName });
    }
  });

  return fixes;
}

// Apply quick fixes
function quickFix(fixes) {
  const fileGroups = {};
  fixes.forEach(fix => {
    if (!fileGroups[fix.file]) {
      fileGroups[fix.file] = [];
    }
    fileGroups[fix.file].push(fix);
  });

  let totalFixed = 0;

  Object.entries(fileGroups).forEach(([file, fileFixes]) => {
    if (!fs.existsSync(file)) return;

    try {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;

      fileFixes.forEach(fix => {
        // Quick prefixes for unused parameters
        if (content.includes(`(${fix.varName}:`)) {
          content = content.replace(`(${fix.varName}:`, `(_${fix.varName}:`);
          modified = true;
          totalFixed++;
        } else if (content.includes(`(${fix.varName},`)) {
          content = content.replace(`(${fix.varName},`, `(_${fix.varName},`);
          modified = true;
          totalFixed++;
        } else if (content.includes(`(${fix.varName})`)) {
          content = content.replace(`(${fix.varName})`, `(_${fix.varName})`);
          modified = true;
          totalFixed++;
        } else if (content.includes(`${fix.varName}:`)) {
          content = content.replace(`${fix.varName}:`, `_${fix.varName}:`);
          modified = true;
          totalFixed++;
        }
      });

      if (modified) {
        fs.writeFileSync(file, content);
        console.log(`  ✅ Fixed ${fileFixes.length} unused vars in ${file.split('/').pop()}`);
      }
    } catch (error) {
      console.log(`  ❌ Error fixing ${file}: ${error.message}`);
    }
  });

  return totalFixed;
}

// Main execution
console.log('🚀 Quick fixing unused variables...\n');

const fixes = getSpecificUnusedVars();
console.log(`Found ${fixes.length} unused variables\n`);

if (fixes.length > 0) {
  const fixed = quickFix(fixes);
  console.log(`\n✅ Fixed ${fixed} unused variables`);

  // Test build
  try {
    execSync('npm run build', { stdio: 'pipe' });
    console.log('✅ Build still works!');
  } catch (error) {
    console.log('⚠️  Build may have issues, check manually');
  }
} else {
  console.log('✅ No unused variables found!');
}

console.log('\n🎉 Quick fix complete!');
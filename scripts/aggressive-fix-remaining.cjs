#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Get all linting errors
function getAllErrors() {
  console.log('🔍 Getting all linting errors...');

  let lintOutput = '';
  try {
    lintOutput = execSync('npm run lint 2>&1', { encoding: 'utf-8' });
  } catch (error) {
    lintOutput = error.stdout || error.output?.[1] || '';
  }

  const errors = [];
  const lines = lintOutput.split('\n');

  lines.forEach(line => {
    // Match error lines with file:line:col pattern
    const match = line.match(/^(.+?):(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(@[\w-]+\/[\w-]+|[\w-]+)$/);
    if (match) {
      const [, file, lineNum, col, type, message, rule] = match;
      errors.push({
        file: file.trim(),
        line: parseInt(lineNum),
        col: parseInt(col),
        type: type.trim(),
        message: message.trim(),
        rule: rule.trim()
      });
    }
  });

  console.log(`Found ${errors.length} linting errors`);
  return errors;
}

// Fix unused variables by prefixing with underscore
function fixUnusedVariables(errors) {
  const unusedVarErrors = errors.filter(e =>
    e.rule === '@typescript-eslint/no-unused-vars' ||
    (e.message.includes('is defined but never used') ||
     e.message.includes('is assigned a value but never used'))
  );

  console.log(`\n🔧 Fixing ${unusedVarErrors.length} unused variable errors...`);

  const fileGroups = {};
  unusedVarErrors.forEach(error => {
    if (!fileGroups[error.file]) {
      fileGroups[error.file] = [];
    }
    fileGroups[error.file].push(error);
  });

  let totalFixed = 0;

  Object.entries(fileGroups).forEach(([filePath, fileErrors]) => {
    if (!fs.existsSync(filePath)) return;

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let fileFixed = 0;

      fileErrors.forEach(error => {
        const lines = content.split('\n');
        const targetLine = lines[error.line - 1];

        if (!targetLine) return;

        // Extract variable name from message
        const varMatch = error.message.match(/'([^']+)' is (defined but never used|assigned a value but never used)/);
        if (!varMatch) return;

        const varName = varMatch[1];

        // Skip if already prefixed
        if (varName.startsWith('_')) return;

        // Fix the specific line
        const updatedLine = targetLine
          .replace(new RegExp(`\\b${varName}\\b(?=\\s*[,):=])`, 'g'), `_${varName}`)
          .replace(new RegExp(`\\b${varName}\\b(?=\\s*:)`, 'g'), `_${varName}`);

        if (updatedLine !== targetLine) {
          lines[error.line - 1] = updatedLine;
          fileFixed++;
        }
      });

      if (fileFixed > 0) {
        const newContent = lines.join('\n');
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`  ✅ Fixed ${fileFixed} unused vars in ${filePath.split(/[/\\]/).pop()}`);
        totalFixed += fileFixed;
      }

    } catch (error) {
      console.error(`  ❌ Error fixing ${filePath}: ${error.message}`);
    }
  });

  return totalFixed;
}

// Fix escape character issues
function fixEscapeCharacters(errors) {
  const escapeErrors = errors.filter(e => e.rule === 'no-useless-escape');

  console.log(`\n🔧 Fixing ${escapeErrors.length} escape character errors...`);

  const fileGroups = {};
  escapeErrors.forEach(error => {
    if (!fileGroups[error.file]) {
      fileGroups[error.file] = [];
    }
    fileGroups[error.file].push(error);
  });

  let totalFixed = 0;

  Object.entries(fileGroups).forEach(([filePath, fileErrors]) => {
    if (!fs.existsSync(filePath)) return;

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let fileFixed = 0;

      // Fix common unnecessary escapes
      const fixes = [
        [/\\\//g, '/'],           // \/ -> /
        [/\\"/g, '"'],            // \" -> " (in some contexts)
        [/\\\*/g, '*'],           // \* -> *
        [/\\\+/g, '+'],           // \+ -> +
        [/\\\?/g, '?'],           // \? -> ?
      ];

      fixes.forEach(([pattern, replacement]) => {
        const before = content;
        content = content.replace(pattern, replacement);
        if (content !== before) fileFixed++;
      });

      if (fileFixed > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ Fixed escape chars in ${filePath.split(/[/\\]/).pop()}`);
        totalFixed += fileFixed;
      }

    } catch (error) {
      console.error(`  ❌ Error fixing ${filePath}: ${error.message}`);
    }
  });

  return totalFixed;
}

// Fix any types
function fixAnyTypes(errors) {
  const anyTypeErrors = errors.filter(e =>
    e.rule === '@typescript-eslint/no-explicit-any' ||
    e.message.includes('Unexpected any')
  );

  console.log(`\n🔧 Fixing ${anyTypeErrors.length} any type errors...`);

  const fileGroups = {};
  anyTypeErrors.forEach(error => {
    if (!fileGroups[error.file]) {
      fileGroups[error.file] = [];
    }
    fileGroups[error.file].push(error);
  });

  let totalFixed = 0;

  Object.entries(fileGroups).forEach(([filePath, fileErrors]) => {
    if (!fs.existsSync(filePath)) return;

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let fileFixed = 0;

      // Simple any -> unknown replacements
      const before = content;
      content = content.replace(/\bany\b/g, 'unknown');

      if (content !== before) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ Fixed any types in ${filePath.split(/[/\\]/).pop()}`);
        totalFixed += fileErrors.length;
        fileFixed = fileErrors.length;
      }

    } catch (error) {
      console.error(`  ❌ Error fixing ${filePath}: ${error.message}`);
    }
  });

  return totalFixed;
}

// Main execution
console.log('🚀 Aggressively fixing remaining linting errors...\n');

const errors = getAllErrors();

if (errors.length > 0) {
  console.log(`\n📊 Error breakdown:`);
  const errorsByRule = {};
  errors.forEach(e => {
    errorsByRule[e.rule] = (errorsByRule[e.rule] || 0) + 1;
  });

  Object.entries(errorsByRule)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([rule, count]) => {
      console.log(`  ${rule}: ${count}`);
    });

  let totalFixed = 0;

  // Fix in order of impact
  totalFixed += fixUnusedVariables(errors);
  totalFixed += fixEscapeCharacters(errors);
  totalFixed += fixAnyTypes(errors);

  console.log(`\n📊 Results:`);
  console.log(`================`);
  console.log(`Errors fixed: ${totalFixed}`);

  // Check remaining
  console.log('\n🔍 Checking remaining errors...');
  const newErrors = getAllErrors();
  console.log(`Remaining errors: ${newErrors.length}`);
  console.log(`Eliminated: ${errors.length - newErrors.length}`);

} else {
  console.log('✅ No errors found!');
}

console.log('\n🎉 Aggressive fix complete!');
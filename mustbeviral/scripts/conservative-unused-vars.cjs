#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎯 Conservative unused variable fixes...');

// Get specific unused variable errors
function getUnusedVarErrors() {
  let lintOutput = '';
  try {
    lintOutput = execSync('npm run lint 2>&1', { encoding: 'utf-8' });
  } catch (error) {
    lintOutput = error.stdout || error.output?.[1] || '';
  }

  const errors = [];
  const lines = lintOutput.split('\n');

  lines.forEach(line => {
    const match = line.match(/^(.+?):(\d+):(\d+)\s+error\s+'([^']+)' is (defined but never used|assigned a value but never used)\s+@typescript-eslint\/no-unused-vars/);
    if (match) {
      const [, file, lineNum, col, varName, errorType] = match;
      errors.push({
        file: file.trim(),
        line: parseInt(lineNum),
        col: parseInt(col),
        varName: varName.trim(),
        errorType: errorType.trim()
      });
    }
  });

  return errors;
}

// Conservative fixes for safe patterns
function fixUnusedVariables() {
  const errors = getUnusedVarErrors();
  console.log(`Found ${errors.length} unused variable errors`);

  const fileGroups = {};
  errors.forEach(error => {
    if (!fileGroups[error.file]) fileGroups[error.file] = [];
    fileGroups[error.file].push(error);
  });

  let totalFixed = 0;
  let filesFixed = 0;

  Object.entries(fileGroups).forEach(([filePath, fileErrors]) => {
    if (!fs.existsSync(filePath)) return;

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      let fileFixed = 0;

      // Sort by line number in reverse
      fileErrors.sort((a, b) => b.line - a.line);

      fileErrors.forEach(error => {
        const varName = error.varName;

        // Skip React imports and common libraries
        if (['React', 'useState', 'useEffect', 'useCallback', 'useMemo'].includes(varName)) return;

        // Pattern 1: Remove unused imports (most common and safe)
        if (content.includes(`import`) && content.includes(varName)) {
          // Remove from named imports safely
          const importRegex = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from`, 'g');
          content = content.replace(importRegex, (match, imports) => {
            const importList = imports.split(',').map(imp => imp.trim());
            const filteredImports = importList.filter(imp =>
              !imp.includes(varName) || imp.includes(':') // Keep type imports
            );

            if (filteredImports.length === 0) {
              return ''; // Remove entire import line
            } else if (filteredImports.length < importList.length) {
              return `import { ${filteredImports.join(', ')} } from`;
            }
            return match;
          });

          if (content !== originalContent) fileFixed++;
        }

        // Pattern 2: Function parameter prefixing (conservative)
        else if (content.includes(`(${varName}:`) || content.includes(`(${varName},`)) {
          const lines = content.split('\n');
          const targetLine = lines[error.line - 1];
          if (targetLine && !targetLine.includes(`_${varName}`)) {
            lines[error.line - 1] = targetLine
              .replace(new RegExp(`\\(${varName}:`, 'g'), `(_${varName}:`)
              .replace(new RegExp(`\\(${varName},`, 'g'), `(_${varName},`);
            content = lines.join('\n');
            fileFixed++;
          }
        }
      });

      if (fileFixed > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ Fixed ${fileFixed} unused vars in ${filePath.split(/[/\\]/).pop()}`);
        totalFixed += fileFixed;
        filesFixed++;
      }

    } catch (error) {
      console.error(`  ❌ Error fixing ${filePath}: ${error.message}`);
    }
  });

  return { totalFixed, filesFixed };
}

// Execute
const { totalFixed, filesFixed } = fixUnusedVariables();

console.log(`\n📊 Results:`);
console.log(`Files fixed: ${filesFixed}`);
console.log(`Variables fixed: ${totalFixed}`);

console.log('\n🎉 Conservative unused variable fixes complete!');
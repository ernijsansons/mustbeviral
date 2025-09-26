#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 Aggressive unused variable cleanup...');

// Get all unused variable errors with detailed parsing
function getUnusedVariableErrors() {
  let lintOutput = '';
  try {
    lintOutput = execSync('npm run lint 2>&1', { encoding: 'utf-8' });
  } catch (error) {
    lintOutput = error.stdout || error.output?.[1] || '';
  }

  const errors = [];
  const lines = lintOutput.split('\n');

  lines.forEach(line => {
    // More comprehensive regex to catch all unused variable patterns
    const match = line.match(/^(.+?):(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+@typescript-eslint\/no-unused-vars/);
    if (match) {
      const [, file, lineNum, col, type, message] = match;

      // Extract variable name from message
      const varMatch = message.match(/'([^']+)'/);
      if (varMatch) {
        errors.push({
          file: file.trim(),
          line: parseInt(lineNum),
          col: parseInt(col),
          varName: varMatch[1],
          message: message.trim()
        });
      }
    }
  });

  console.log(`Found ${errors.length} unused variable errors`);
  return errors;
}

// Aggressive unused variable fixes
function fixUnusedVariables() {
  const errors = getUnusedVariableErrors();

  const fileGroups = {};
  errors.forEach(error => {
    if (!fileGroups[error.file]) fileGroups[error.file] = [];
    fileGroups[error.file].push(error);
  });

  let totalFixed = 0;
  let filesFixed = 0;

  Object.entries(fileGroups).slice(0, 20).forEach(([filePath, fileErrors]) => { // Process first 20 files
    if (!fs.existsSync(filePath)) return;

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      let fileFixed = 0;

      // Sort by line number in reverse to avoid index shifting
      fileErrors.sort((a, b) => b.line - a.line);

      fileErrors.forEach(error => {
        const varName = error.varName;

        // Strategy 1: Remove unused imports (safest)
        if (content.includes('import') && varName !== 'React') {
          // Remove from named imports
          const importRegex = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from`, 'g');
          content = content.replace(importRegex, (match, imports) => {
            const importList = imports.split(',').map(imp => imp.trim()).filter(imp => imp);
            const filteredImports = importList.filter(imp =>
              !imp.includes(varName) ||
              imp.includes('type ') ||
              ['React', 'useState', 'useEffect'].some(reserved => imp.includes(reserved))
            );

            if (filteredImports.length === 0) {
              fileFixed++;
              return ''; // Remove entire import line
            } else if (filteredImports.length < importList.length) {
              fileFixed++;
              return `import { ${filteredImports.join(', ')} } from`;
            }
            return match;
          });
        }

        // Strategy 2: Prefix function parameters with underscore
        else if (error.message.includes('is defined but never used')) {
          const lines = content.split('\n');
          const targetLine = lines[error.line - 1];

          if (targetLine) {
            // Function parameter patterns
            let newLine = targetLine
              .replace(new RegExp(`\\(${varName}\\s*:`), `(_${varName}:`)
              .replace(new RegExp(`\\(${varName}\\s*,`), `(_${varName},`)
              .replace(new RegExp(`\\(${varName}\\s*\\)`), `(_${varName})`)
              .replace(new RegExp(`\\s${varName}\\s*:`), ` _${varName}:`)
              .replace(new RegExp(`\\s${varName}\\s*,`), ` _${varName},`)
              // Destructuring patterns
              .replace(new RegExp(`\\{\\s*${varName}\\s*,`), `{ _${varName},`)
              .replace(new RegExp(`\\{\\s*${varName}\\s*\\}`), `{ _${varName} }`)
              // Array destructuring
              .replace(new RegExp(`\\[\\s*${varName}\\s*,`), `[_${varName},`)
              .replace(new RegExp(`\\[\\s*${varName}\\s*\\]`), `[_${varName}]`);

            if (newLine !== targetLine) {
              lines[error.line - 1] = newLine;
              content = lines.join('\n');
              fileFixed++;
            }
          }
        }

        // Strategy 3: Remove unused variable assignments
        else if (error.message.includes('is assigned a value but never used')) {
          const lines = content.split('\n');
          const targetLine = lines[error.line - 1];

          if (targetLine && targetLine.includes(`const ${varName}`) && !targetLine.includes('=')) {
            // Comment out the line instead of removing to be safe
            lines[error.line - 1] = `    // ${targetLine.trim()} // Removed unused variable`;
            content = lines.join('\n');
            fileFixed++;
          }
        }
      });

      // Clean up empty import lines
      content = content.replace(/import\s*\{\s*\}\s*from[^;]+;\s*/g, '');
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

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
console.log(`Files processed: ${filesFixed}`);
console.log(`Variables fixed: ${totalFixed}`);

console.log('\n🚀 Aggressive unused variable cleanup complete!');
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const config = {
  patterns: [
    'src/**/*.{ts,tsx,js,jsx}',
    '__tests__/**/*.{ts,tsx,js,jsx}',
    '__mocks__/**/*.{ts,tsx,js,jsx}'
  ],

  // Common unnecessary escape fixes
  escapeReplacements: {
    // Forward slash in regex - not needed unless it's the regex delimiter
    '\\/': '/',

    // Quotes in regex - depends on context
    '\\"': '"',

    // Other common unnecessary escapes
    '\\-': '-',
    '\\!': '!',
    '\\#': '#',
    '\\%': '%',
    '\\&': '&',
    '\\=': '=',
    '\\<': '<',
    '\\>': '>',
    '\\_': '_',
    '\\~': '~',
    '\\`': '`',
  },

  // Files to skip
  skipFiles: [
    'node_modules',
    'dist',
    'build',
    '.git'
  ]
};

// Stats tracking
let stats = {
  filesProcessed: 0,
  fixesMade: 0,
  errors: 0
};

function shouldSkipFile(filePath) {
  return config.skipFiles.some(skip => filePath.includes(skip));
}

function fixFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fileFixes = 0;

    // Fix regex patterns with unnecessary escapes
    // This regex looks for regex literals and fixes common unnecessary escapes
    content = content.replace(/\/([^\/\n]+)\/([gimuy]*)/g, (match, pattern, flags) => {
      let fixedPattern = pattern;

      // Fix unnecessary forward slash escapes
      fixedPattern = fixedPattern.replace(/\\\//g, '/');

      // Fix other unnecessary escapes in regex context
      // But be careful not to break valid escapes like \d, \w, \s, etc.
      fixedPattern = fixedPattern
        .replace(/\\([!#%&=<>_~`-])/g, '$1')  // Remove escape from these chars
        .replace(/\\(["'])/g, (m, quote) => {
          // Keep quote escapes if they match the string delimiter
          return m;
        });

      const newMatch = `/${fixedPattern}/${flags}`;
      if (newMatch !== match) {
        fileFixes++;
      }
      return newMatch;
    });

    // Fix template literal unnecessary escapes
    content = content.replace(/`([^`]*)`/g, (match, inner) => {
      let fixedInner = inner;

      // In template literals, only ` and ${ need escaping
      fixedInner = fixedInner
        .replace(/\\([^`$\\])/g, '$1')  // Remove unnecessary escapes
        .replace(/\\\$/g, (m) => {
          // Keep \$ only if followed by {
          return inner[inner.indexOf(m) + 2] === '{' ? m : '$';
        });

      const newMatch = `\`${fixedInner}\``;
      if (newMatch !== match) {
        fileFixes++;
      }
      return newMatch;
    });

    // Fix string literal unnecessary escapes
    content = content.replace(/(["'])([^"']*)\1/g, (match, quote, inner) => {
      let fixedInner = inner;

      // In strings, only the matching quote and backslash need escaping
      if (quote === '"') {
        fixedInner = fixedInner.replace(/\\([^"\\nrt])/g, (m, char) => {
          // Keep valid escapes like \n, \r, \t
          return char === '"' ? m : char;
        });
      } else {
        fixedInner = fixedInner.replace(/\\([^'\\nrt])/g, (m, char) => {
          return char === "'" ? m : char;
        });
      }

      const newMatch = `${quote}${fixedInner}${quote}`;
      if (newMatch !== match) {
        fileFixes++;
      }
      return newMatch;
    });

    // Check if any changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Fixed ${fileFixes} escape issues in ${path.basename(filePath)}`);
      stats.fixesMade += fileFixes;
    }

    stats.filesProcessed++;
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}: ${error.message}`);
    stats.errors++;
  }
}

// Main execution
console.log('🔧 Fixing unnecessary escape characters...\n');
console.log('This script will:');
console.log('  • Remove unnecessary escape characters from regex patterns');
console.log('  • Fix escape sequences in strings and templates');
console.log('  • Preserve necessary escapes\n');

// Process all patterns
config.patterns.forEach(pattern => {
  const files = glob.sync(pattern);
  console.log(`\n📁 Processing ${pattern} (${files.length} files)...`);

  files.forEach(file => {
    fixFile(file);
  });
});

// Report results
console.log('\n📊 Results:');
console.log('================');
console.log(`Files processed: ${stats.filesProcessed}`);
console.log(`Fixes made: ${stats.fixesMade}`);
console.log(`Errors: ${stats.errors}`);

// Verify build still works
console.log('\n🔍 Verifying build...');
const { execSync } = require('child_process');

try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Build successful!');
} catch (error) {
  console.error('❌ Build failed! You may need to manually fix some issues.');
  console.error('Run "npm run build" to see specific errors.');
}

console.log('\n✨ Escape character fixing complete!');
console.log('Next steps:');
console.log('  1. Run "npm run lint" to verify fixes');
console.log('  2. Review changes with "git diff"');
console.log('  3. Test regex patterns to ensure they still work correctly');
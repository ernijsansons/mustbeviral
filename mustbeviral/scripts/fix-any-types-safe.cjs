#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎯 Conservative any type fixes...');

// Get TypeScript files recursively
function getAllTSFiles(dir = 'src') {
  const files = [];

  function scan(directory) {
    const items = fs.readdirSync(directory);

    for (const item of items) {
      if (item.startsWith('.') || item === 'node_modules') continue;

      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (item.match(/\.(ts|tsx)$/)) {
        files.push(fullPath);
      }
    }
  }

  scan(dir);
  return files;
}

const tsFiles = getAllTSFiles();
console.log(`Scanning ${tsFiles.length} TypeScript files`);

let totalFixed = 0;
let filesFixed = 0;

tsFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fileFixed = 0;

    // Conservative any -> unknown replacements (safe patterns only)
    const safeReplacements = [
      // Function parameters
      { from: /: any\)/g, to: ': unknown)' },
      // Function return types
      { from: /: any;/g, to: ': unknown;' },
      // Variable declarations
      { from: /: any =/g, to: ': unknown =' },
      // Generic type parameters
      { from: /<any>/g, to: '<unknown>' },
      // Array types
      { from: /any\[\]/g, to: 'unknown[]' },
      // Object types
      { from: /Record<string, any>/g, to: 'Record<string, unknown>' },
      { from: /\{ \[key: string\]: any \}/g, to: '{ [key: string]: unknown }' },
      // Promise types
      { from: /Promise<any>/g, to: 'Promise<unknown>' }
    ];

    safeReplacements.forEach(({ from, to }) => {
      const before = content;
      content = content.replace(from, to);
      if (content !== before) fileFixed++;
    });

    if (fileFixed > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Fixed ${fileFixed} any types in ${path.basename(filePath)}`);
      totalFixed += fileFixed;
      filesFixed++;
    }

  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}: ${error.message}`);
  }
});

console.log(`\n📊 Results:`);
console.log(`Files fixed: ${filesFixed}`);
console.log(`Any types replaced: ${totalFixed}`);
console.log('🎯 Conservative any type fixes complete!');
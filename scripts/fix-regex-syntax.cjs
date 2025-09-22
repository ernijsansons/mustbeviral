#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing regex syntax errors...');

const filesToFix = [
  '__tests__/integration/api-content.test.ts',
  '__tests__/integration/api-payments.test.ts'
];

let totalFixed = 0;

filesToFix.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${filePath}`);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fileFixed = 0;

    // Fix broken regex patterns
    const regexFixes = [
      // API path patterns
      { from: /path\.match\(\/\^\/api\/([^)]+)\$\/\)/g, to: 'path.match(/^\\/api\\/$1$/)' },
      // More specific fixes for the broken patterns we saw
      { from: /\/\^\/api\/content\/\[\^\/\]\+\$\//g, to: '/^\\/api\\/content\\/[^\\/]+$/' },
      { from: /\/\^\/api\/payments\/\[\^\/\]\+\$\//g, to: '/^\\/api\\/payments\\/[^\\/]+$/' },
      { from: /\/\^\/api\/boost\/\[\^\/\]\+\$\//g, to: '/^\\/api\\/boost\\/[^\\/]+$/' },
      { from: /\/\^\/api\/payouts\/\[\^\/\]\+\$\//g, to: '/^\\/api\\/payouts\\/[^\\/]+$/' }
    ];

    regexFixes.forEach(({ from, to }) => {
      const before = content;
      content = content.replace(from, to);
      if (content !== before) fileFixed++;
    });

    // Specific manual fixes for the syntax errors we saw
    content = content.replace(/if \(path\.match\(\/\^\/api\/content\/\[\^\/\]\+\$\/\) && method === 'GET'\)/g,
      "if (path.match(/^\\/api\\/content\\/[^\\/]+$/) && method === 'GET')");

    content = content.replace(/if \(path\.match\(\/\^\/api\/content\/\[\^\/\]\+\$\/\) && method === 'PUT'\)/g,
      "if (path.match(/^\\/api\\/content\\/[^\\/]+$/) && method === 'PUT')");

    content = content.replace(/if \(path\.match\(\/\^\/api\/content\/\[\^\/\]\+\$\/\) && method === 'DELETE'\)/g,
      "if (path.match(/^\\/api\\/content\\/[^\\/]+$/) && method === 'DELETE')");

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Fixed regex syntax in ${filePath.split('/').pop()}`);
      totalFixed++;
    }

  } catch (error) {
    console.error(`  ❌ Error fixing ${filePath}: ${error.message}`);
  }
});

console.log(`\n📊 Total regex syntax fixes: ${totalFixed}`);
console.log('🔧 Regex syntax fixes complete!');
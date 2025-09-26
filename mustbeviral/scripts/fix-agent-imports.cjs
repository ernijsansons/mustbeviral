#!/usr/bin/env node

const fs = require('fs');

console.log('🎯 Fixing agent import patterns...');

const agentFiles = [
  'src/lib/ai/agents/TwitterAgent.ts',
  'src/lib/ai/agents/TikTokAgent.ts',
  'src/lib/ai/agents/InstagramAgent.ts'
];

let totalFixed = 0;

agentFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${filePath}`);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fileFixed = 0;

    // Fix unused imports
    if (content.includes('_IPlatformAgent')) {
      content = content.replace(/import \{ _IPlatformAgent,\s*/g, 'import { ');
      fileFixed++;
    }

    if (content.includes('_AlgorithmIntelligence')) {
      content = content.replace(/, _AlgorithmIntelligence/g, '');
      content = content.replace(/_AlgorithmIntelligence, /g, '');
      fileFixed++;
    }

    // Fix prompt variable usage
    if (content.includes('{ _prompt,')) {
      content = content.replace(/{ _prompt,/g, '{ prompt,');
      fileFixed++;
    }

    if (fileFixed > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Fixed ${fileFixed} import issues in ${filePath.split('/').pop()}`);
      totalFixed += fileFixed;
    }

  } catch (error) {
    console.error(`  ❌ Error fixing ${filePath}: ${error.message}`);
  }
});

console.log(`\n📊 Total import fixes: ${totalFixed}`);
console.log('🎉 Agent import fixes complete!');
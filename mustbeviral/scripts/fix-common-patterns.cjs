#!/usr/bin/env node

const fs = require('fs');

console.log('🎯 Fixing common unused variable patterns...');

const commonFixes = [
  {
    file: 'src/lib/ai/agents/InstagramAgent.ts',
    fixes: [
      // Fix unused parameters in functions
      { from: /async ([a-zA-Z]+)\([^)]*topic[^)]*\): Promise/, to: 'async $1(_topic: string): Promise' },
      { from: /async ([a-zA-Z]+)\([^)]*request[^)]*\): Promise/, to: 'async $1(_request: ContentGenerationRequest): Promise' },
      { from: /async ([a-zA-Z]+)\([^)]*content[^)]*\): Promise/, to: 'async $1(_content: string): Promise' },
      { from: /async ([a-zA-Z]+)\([^)]*sourcePlatform[^)]*\): Promise/, to: 'async $1(_sourcePlatform: string, content: string): Promise' },
      // Fix unused assignments by commenting them out
      { from: /const adaptedContent = [^;]+;/, to: '// const adaptedContent = ...content adapted... (unused)' }
    ]
  },
  {
    file: 'src/lib/ai/agents/TikTokAgent.ts',
    fixes: [
      // Same patterns as Instagram
      { from: /async ([a-zA-Z]+)\([^)]*topic[^)]*\): Promise/, to: 'async $1(_topic: string): Promise' },
      { from: /async ([a-zA-Z]+)\([^)]*request[^)]*\): Promise/, to: 'async $1(_request: ContentGenerationRequest): Promise' },
      { from: /async ([a-zA-Z]+)\([^)]*content[^)]*\): Promise/, to: 'async $1(_content: string): Promise' }
    ]
  },
  {
    file: 'src/lib/ai/agents/TwitterAgent.ts',
    fixes: [
      // Same patterns as others
      { from: /async ([a-zA-Z]+)\([^)]*topic[^)]*\): Promise/, to: 'async $1(_topic: string): Promise' },
      { from: /async ([a-zA-Z]+)\([^)]*request[^)]*\): Promise/, to: 'async $1(_request: ContentGenerationRequest): Promise' },
      { from: /async ([a-zA-Z]+)\([^)]*content[^)]*\): Promise/, to: 'async $1(_content: string): Promise' }
    ]
  }
];

let totalFixed = 0;

commonFixes.forEach(({ file, fixes }) => {
  if (!fs.existsSync(file)) {
    console.log(`  ⚠️  File not found: ${file}`);
    return;
  }

  try {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;
    let fileFixed = 0;

    fixes.forEach(({ from, to }) => {
      const before = content;
      content = content.replace(from, to);
      if (content !== before) fileFixed++;
    });

    // Additional common patterns
    // Fix _.forEach patterns
    content = content.replace(/\.forEach\(\([^,)]*_[^,)]*,\s*([^)]*)\)/g, '.forEach((_, $1)');
    content = content.replace(/\.map\(\([^,)]*_[^,)]*,\s*([^)]*)\)/g, '.map((_, $1)');

    // Fix destructuring with unused variables
    content = content.replace(/\{\s*_([a-zA-Z]+),/g, '{ _$1,');

    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`  ✅ Fixed common patterns in ${file.split('/').pop()}`);
      totalFixed++;
    }

  } catch (error) {
    console.error(`  ❌ Error fixing ${file}: ${error.message}`);
  }
});

console.log(`\n📊 Total common pattern fixes: ${totalFixed}`);
console.log('🎯 Common pattern fixes complete!');
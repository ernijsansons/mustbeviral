#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔍 Analyzing remaining errors...');

let lintOutput = '';
try {
  lintOutput = execSync('npm run lint 2>&1', { encoding: 'utf-8' });
} catch (error) {
  lintOutput = error.stdout || error.output?.[1] || '';
}

const errorCounts = {};
const lines = lintOutput.split('\n');

lines.forEach(line => {
  const match = line.match(/@[\w-]+\/[\w-]+|[\w-]+$/);
  if (match) {
    const rule = match[0];
    errorCounts[rule] = (errorCounts[rule] || 0) + 1;
  }
});

console.log('\n📊 Top error categories:');
Object.entries(errorCounts)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 15)
  .forEach(([rule, count]) => {
    console.log(`  ${rule}: ${count}`);
  });

const totalErrors = Object.values(errorCounts).reduce((a, b) => a + b, 0);
console.log(`\nTotal errors: ${totalErrors}`);
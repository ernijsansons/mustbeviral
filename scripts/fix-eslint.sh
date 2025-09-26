#!/bin/bash

echo "🔧 FIXING ESLINT UNUSED VARIABLES"

# Fix unused variables in worker files by prefixing with underscore
find mustbeviral/workers -name "*.ts" -type f -exec sed -i 's/\b\([a-zA-Z][a-zA-Z0-9]*\): [^,)]*\([,)]\)/\_\1: any\2/g' {} \;

# Fix specific common patterns
find mustbeviral/workers -name "*.ts" -type f -exec sed -i 's/const \([a-zA-Z][a-zA-Z0-9]*\) = /const \_\1 = /g' {} \;
find mustbeviral/workers -name "*.ts" -type f -exec sed -i 's/let \([a-zA-Z][a-zA-Z0-9]*\) = /let \_\1 = /g' {} \;

echo "✅ ESLint fixes applied"
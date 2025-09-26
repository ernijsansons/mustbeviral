# CI/CD Guardrails - Repository Size and Quality Controls

**Purpose:** Prevent repository bloat and maintain code quality through automated checks

## Overview

These guardrails ensure that the repository remains clean, efficient, and free from unnecessary bloat. They should be implemented in your CI/CD pipeline to catch issues before they reach the main branch.

## GitHub Actions Workflow

Create `.github/workflows/repo-guardrails.yml`:

```yaml
name: Repository Guardrails

on:
  pull_request:
    branches: [main, master, develop]
  push:
    branches: [main, master]

jobs:
  size-check:
    name: Repository Size Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check for large files
        run: |
          echo "Checking for files larger than 1MB..."
          large_files=$(find . -type f -size +1M ! -path "./.git/*" ! -path "./node_modules/*" 2>/dev/null)
          if [ ! -z "$large_files" ]; then
            echo "❌ Large files detected (>1MB):"
            echo "$large_files"
            echo "Consider using Git LFS or external storage for these files."
            exit 1
          fi
          echo "✅ No large files detected"

      - name: Check for build artifacts
        run: |
          echo "Checking for build artifacts..."
          artifacts=$(find . -type d \( -name "dist" -o -name "build" -o -name ".next" -o -name "coverage" -o -name "storybook-static" -o -name ".cache" -o -name ".turbo" -o -name "out" \) ! -path "./node_modules/*" 2>/dev/null)
          if [ ! -z "$artifacts" ]; then
            echo "❌ Build artifacts detected:"
            echo "$artifacts"
            echo "These should be in .gitignore"
            exit 1
          fi
          echo "✅ No build artifacts detected"

      - name: Check for temporary files
        run: |
          echo "Checking for temporary files..."
          temp_files=$(find . -type f \( -name "*.tmp" -o -name "*.temp" -o -name "*.log" -o -name ".DS_Store" -o -name "Thumbs.db" \) ! -path "./.git/*" ! -path "./node_modules/*" 2>/dev/null)
          if [ ! -z "$temp_files" ]; then
            echo "❌ Temporary files detected:"
            echo "$temp_files"
            exit 1
          fi
          echo "✅ No temporary files detected"

      - name: Check for archive files
        run: |
          echo "Checking for archive files..."
          archives=$(find . -type f \( -name "*.zip" -o -name "*.tar" -o -name "*.gz" -o -name "*.7z" -o -name "*.rar" \) ! -path "./node_modules/*" 2>/dev/null)
          if [ ! -z "$archives" ]; then
            echo "⚠️ Archive files detected:"
            echo "$archives"
            echo "Consider if these are necessary in version control"
          fi

      - name: Check total PR size
        if: github.event_name == 'pull_request'
        run: |
          echo "Checking PR size..."
          size=$(git diff --stat origin/${{ github.base_ref }}..HEAD | tail -1 | awk '{print $4}')
          if [ "$size" -gt "500" ]; then
            echo "⚠️ Large PR detected: $size insertions"
            echo "Consider breaking this into smaller PRs"
          fi

  file-pattern-check:
    name: File Pattern Validation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check for sensitive files
        run: |
          echo "Checking for sensitive files..."
          sensitive=$(find . -type f \( -name ".env" -o -name ".env.local" -o -name "*.pem" -o -name "*.key" -o -name ".dev.vars" \) ! -path "./.git/*" ! -path "./node_modules/*" 2>/dev/null | grep -v ".example")
          if [ ! -z "$sensitive" ]; then
            echo "❌ Potential sensitive files detected:"
            echo "$sensitive"
            echo "These should not be committed to version control"
            exit 1
          fi
          echo "✅ No sensitive files detected"

      - name: Check for duplicate test files
        run: |
          echo "Checking for duplicate test patterns..."
          # Check for both .js and .ts versions of same test
          for js_file in $(find . -name "*.spec.js" -o -name "*.test.js" ! -path "./node_modules/*"); do
            ts_file="${js_file%.js}.ts"
            if [ -f "$ts_file" ]; then
              echo "⚠️ Duplicate test files found:"
              echo "  - $js_file"
              echo "  - $ts_file"
            fi
          done

      - name: Validate file extensions
        run: |
          echo "Checking for unexpected file types..."
          unexpected=$(find . -type f \( -name "*.exe" -o -name "*.dll" -o -name "*.so" -o -name "*.dylib" -o -name "*.class" \) ! -path "./node_modules/*" 2>/dev/null)
          if [ ! -z "$unexpected" ]; then
            echo "❌ Unexpected binary files detected:"
            echo "$unexpected"
            exit 1
          fi
          echo "✅ No unexpected file types"

  dependency-check:
    name: Dependency Security Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run npm audit
        run: |
          npm audit --audit-level=high
          cd mustbeviral && npm audit --audit-level=high

      - name: Check for unused dependencies
        run: |
          npx depcheck || true
          cd mustbeviral && npx depcheck || true

  code-quality:
    name: Code Quality Checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          npm ci
          cd mustbeviral && npm ci

      - name: Run linting
        run: |
          npm run lint
          cd mustbeviral && npm run lint

      - name: Run type checking
        run: |
          npm run type-check || true
          cd mustbeviral && npm run typecheck

      - name: Check for console.log statements
        run: |
          echo "Checking for console.log statements..."
          console_logs=$(grep -r "console.log" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=__tests__ --exclude-dir=scripts . || true)
          if [ ! -z "$console_logs" ]; then
            echo "⚠️ console.log statements found:"
            echo "$console_logs" | head -20
            echo "Consider using proper logging library"
          fi

  cloudflare-validation:
    name: Cloudflare Workers Validation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          npm ci
          cd mustbeviral && npm ci

      - name: Validate Worker configs
        run: |
          echo "Validating wrangler.toml files..."
          for config in $(find . -name "wrangler.toml"); do
            echo "Checking: $config"
            npx wrangler deploy --dry-run --config "$config" || echo "⚠️ Warning: $config validation failed"
          done

      - name: Check Worker size limits
        run: |
          echo "Checking worker bundle sizes..."
          cd mustbeviral
          npx wrangler deploy --dry-run --outdir dist-test
          if [ -d "dist-test" ]; then
            for file in dist-test/*.js; do
              size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
              if [ "$size" -gt 1048576 ]; then
                echo "❌ Worker bundle exceeds 1MB limit: $file ($size bytes)"
                exit 1
              fi
            done
          fi
```

## Pre-commit Hooks

Add to `.githooks/pre-commit`:

```bash
#!/bin/bash

echo "Running pre-commit checks..."

# Check for large files
large_files=$(find . -type f -size +1M ! -path "./.git/*" ! -path "./node_modules/*" -exec ls -lh {} \; 2>/dev/null)
if [ ! -z "$large_files" ]; then
    echo "❌ Large files detected (>1MB):"
    echo "$large_files"
    echo "Use Git LFS or exclude these files"
    exit 1
fi

# Check for common build artifacts
if ls dist/ 2>/dev/null || ls build/ 2>/dev/null || ls .next/ 2>/dev/null; then
    echo "❌ Build artifacts detected. Add to .gitignore:"
    ls -la dist/ build/ .next/ 2>/dev/null
    exit 1
fi

# Check for sensitive files
if [ -f ".env" ] || [ -f ".env.local" ] || [ -f ".dev.vars" ]; then
    echo "❌ Sensitive files detected. Do not commit:"
    ls -la .env* .dev.vars 2>/dev/null
    exit 1
fi

echo "✅ Pre-commit checks passed"
```

## Size Monitoring Dashboard

Create `.github/workflows/size-monitor.yml`:

```yaml
name: Repository Size Monitor

on:
  schedule:
    - cron: '0 0 * * 1' # Weekly on Monday
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Calculate repository metrics
        run: |
          echo "## Repository Size Report - $(date)" > size-report.md
          echo "" >> size-report.md

          # Total size
          echo "### Total Repository Size" >> size-report.md
          du -sh . >> size-report.md
          echo "" >> size-report.md

          # Top 20 largest directories
          echo "### Top 20 Largest Directories" >> size-report.md
          du -h --max-depth=3 . | sort -hr | head -20 >> size-report.md
          echo "" >> size-report.md

          # File count by type
          echo "### File Count by Extension" >> size-report.md
          find . -type f ! -path "./.git/*" ! -path "./node_modules/*" | \
            sed 's/.*\.//' | sort | uniq -c | sort -rn | head -20 >> size-report.md

      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: size-report
          path: size-report.md

      - name: Create issue if size exceeds threshold
        run: |
          size=$(du -s . | awk '{print $1}')
          # Threshold: 100MB (excluding .git and node_modules)
          if [ "$size" -gt 102400 ]; then
            echo "Repository size exceeds 100MB threshold"
            # Create GitHub issue (requires GH_TOKEN)
            # gh issue create --title "Repository Size Alert" --body "Repository exceeds 100MB"
          fi
```

## Enforcement Rules

### Mandatory Checks (Block PR)

1. **No files > 1MB** (except those in Git LFS)
2. **No build artifacts** (dist/, build/, .next/, etc.)
3. **No sensitive files** (.env, .dev.vars, private keys)
4. **No binary executables** (.exe, .dll, .so)
5. **npm audit high/critical** must pass
6. **Linting** must pass
7. **Type checking** must pass

### Warning Checks (Non-blocking)

1. Archive files present
2. PR size > 500 lines
3. console.log statements
4. Duplicate test files
5. Unused dependencies

### Periodic Monitoring

1. Weekly size reports
2. Monthly dependency updates
3. Quarterly security audits

## Implementation Checklist

- [ ] Add `repo-guardrails.yml` to `.github/workflows/`
- [ ] Configure pre-commit hooks in `.githooks/`
- [ ] Enable branch protection rules in GitHub
- [ ] Set up size monitoring workflow
- [ ] Configure Dependabot for dependency updates
- [ ] Add status checks to PR requirements
- [ ] Document size limits in CONTRIBUTING.md
- [ ] Train team on new requirements

## Rollback Plan

If guardrails block legitimate changes:

1. Create override PR with justification
2. Temporarily disable specific check
3. Update guardrails configuration
4. Re-enable after PR merge

## Success Metrics

Track monthly:

- Repository size trend
- Build time improvements
- Number of blocked issues
- False positive rate
- Developer satisfaction

## Contact

For questions or exceptions, contact:

- Repository maintainers
- DevOps team
- Security team for sensitive file issues

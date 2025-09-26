# Git History Purge Plan - Phase 3

**Date:** 2025-09-26
**Current .git size:** 7.9MB
**Estimated reduction:** 3-5MB (40-60%)
**Risk Level:** MEDIUM - Requires force push

## ⚠️ WARNING

This operation will **permanently rewrite git history**. All collaborators must re-clone the repository after this operation.

## Analysis Results

### Large Files in History

1. **Coverage Reports:** 519 files (~2MB total)

   - `coverage/lcov.info` (505KB)
   - `coverage/lcov-report/*.html` files
   - `playwright-report/index.html` (462KB)

2. **Build Artifacts:**

   - `.next/cache/` files
   - `tsconfig.tsbuildinfo` (362KB)

3. **Archive Files:**

   - `must-be-viral-export-2025-08-22.zip` (already moved in Phase 2)

4. **Lock Files:**
   - Multiple versions of `package-lock.json` (up to 954KB each)
   - These should be kept but compressed better

## Files/Patterns to Remove from History

### Priority 1 - Definitely Remove (No Risk)

```
coverage/
playwright-report/
.next/
dist/
build/
*.tsbuildinfo
*.lcov
*.zip
*.tar.gz
__graveyard__/
```

### Priority 2 - Consider Removing (Low Risk)

```
*.log
*.tmp
*.temp
.DS_Store
Thumbs.db
node_modules/  # Should never have been committed
```

### Priority 3 - Keep in History

```
package-lock.json  # Needed for reproducible builds
migrations/         # Database history important
*.sql              # Schema changes important
```

## Backup Instructions

### Step 1: Create Local Backup

```bash
# Create backup directory
mkdir ../must-be-viral-backup-$(date +%Y%m%d)

# Copy entire repository
cp -r . ../must-be-viral-backup-$(date +%Y%m%d)/

# Create compressed backup
tar -czf ../must-be-viral-backup-$(date +%Y%m%d).tar.gz .
```

### Step 2: Push Current State to Backup Branch

```bash
git checkout -b backup/pre-history-rewrite
git push origin backup/pre-history-rewrite
```

## Execution Script

### Option A: Using git-filter-repo (Recommended)

```bash
# Install git-filter-repo if not available
pip install git-filter-repo

# Create paths file
cat > paths-to-remove.txt << 'EOF'
coverage/
playwright-report/
.next/
dist/
build/
tsconfig.tsbuildinfo
must-be-viral-export-2025-08-22.zip
__graveyard__/
EOF

# Run filter
git filter-repo --paths-from-file paths-to-remove.txt --invert-paths

# Add back remote
git remote add origin https://github.com/your-org/must-be-viral-v2.git
```

### Option B: Using BFG Repo Cleaner

```bash
# Download BFG
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Remove files larger than 1M (excluding package-lock.json)
java -jar bfg-1.14.0.jar --delete-files '*.{zip,tsbuildinfo,lcov}'

# Remove folders
java -jar bfg-1.14.0.jar --delete-folders '{coverage,playwright-report,.next,dist,build,__graveyard__}'

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Option C: Manual with git filter-branch (Slower)

```bash
# Remove specific directories
git filter-branch --tree-filter 'rm -rf coverage playwright-report .next dist build __graveyard__' --prune-empty HEAD

# Remove specific files
git filter-branch --tree-filter 'rm -f tsconfig.tsbuildinfo *.zip *.lcov' --prune-empty HEAD

# Cleanup
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## Post-Cleanup Verification

### 1. Check New Repository Size

```bash
du -sh .git
git count-objects -v
```

### 2. Verify Important Files Still Exist

```bash
# Check critical files
ls -la mustbeviral/src/worker.ts
ls -la mustbeviral/wrangler.toml
ls -la package.json
ls -la package-lock.json
```

### 3. Test Build

```bash
cd mustbeviral
npm ci
npm run build
npm run typecheck
```

## Force Push Instructions

### ⚠️ DANGER ZONE - Point of No Return

```bash
# Force push to main branch
git push --force origin main

# Or safer: push to new branch first
git push origin HEAD:main-cleaned --force

# Delete old branches
git push origin --delete backup/pre-history-rewrite
```

## Team Communication Template

```
Subject: URGENT - Repository History Rewrite Required

Team,

We're performing a git history cleanup to reduce repository size.

REQUIRED ACTIONS:
1. Push any uncommitted work NOW
2. After [TIME], delete your local repository
3. Re-clone fresh: git clone [REPO_URL]

WHAT'S CHANGING:
- Removing build artifacts from history (coverage/, .next/, etc.)
- Current code unchanged
- Reducing .git size by ~40%

TIMELINE:
- Backup created: [TIME]
- History rewrite: [TIME]
- Safe to re-clone: [TIME]

Contact me with any questions.
```

## Rollback Plan

If issues occur:

```bash
# Option 1: Restore from backup branch
git fetch origin backup/pre-history-rewrite
git reset --hard origin/backup/pre-history-rewrite
git push --force origin main

# Option 2: Restore from local backup
cd ../must-be-viral-backup-[date]
git remote add origin [repo-url]
git push --force origin main
```

## Success Metrics

### Before

- .git size: 7.9MB
- Objects in repo: ~5000
- Largest blob: 954KB

### Expected After

- .git size: 3-5MB
- Objects in repo: ~3000
- Largest blob: <500KB

## Automation Script

Save as `phase3-history-cleanup.sh`:

```bash
#!/bin/bash
set -e

echo "=== GIT HISTORY CLEANUP - PHASE 3 ==="
echo "This will permanently rewrite history!"
read -p "Type 'PROCEED' to continue: " confirm

if [ "$confirm" != "PROCEED" ]; then
    echo "Aborted"
    exit 1
fi

# Create backup
echo "Creating backup..."
git checkout -b backup/$(date +%Y%m%d-%H%M%S)
git push origin HEAD

# Show before size
echo "Before: $(du -sh .git)"

# Install git-filter-repo
pip install -q git-filter-repo

# Create exclusion list
cat > .git/paths-to-remove.txt << 'EOF'
coverage/
playwright-report/
.next/
dist/
build/
tsconfig.tsbuildinfo
*.zip
*.lcov
__graveyard__/
EOF

# Run cleanup
echo "Running cleanup..."
git filter-repo --paths-from-file .git/paths-to-remove.txt --invert-paths --force

# Re-add remote
git remote add origin $(git config --get remote.origin.url)

# Show after size
echo "After: $(du -sh .git)"

echo "Complete! Now run:"
echo "  git push --force origin main"
```

## Decision Point

### Proceed with Phase 3?

**Pros:**

- Reduce .git size by 40-60%
- Faster clones
- Cleaner history

**Cons:**

- Requires force push
- All developers must re-clone
- Breaks existing PR references

**Recommendation:** Given the .git is only 7.9MB, Phase 3 is **OPTIONAL**. The main benefit was achieved in Phase 2 by removing files from the working tree.

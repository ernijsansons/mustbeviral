<#
.SYNOPSIS
    Git History Cleanup Script - Phase 3
    Removes build artifacts and large files from git history

.DESCRIPTION
    This script permanently rewrites git history to remove:
    - Build artifacts (coverage/, .next/, dist/)
    - Large temporary files
    - Backup files and archives

    WARNING: This requires force push and all collaborators must re-clone

.PARAMETER Mode
    DryRun or Execute (default DryRun)

.PARAMETER Method
    Cleanup method: FilterRepo, BFG, or FilterBranch (default FilterRepo)

.PARAMETER SkipBackup
    Skip creating backup branch (not recommended)

.EXAMPLE
    .\phase3-history-cleanup.ps1
    .\phase3-history-cleanup.ps1 -Mode Execute
    .\phase3-history-cleanup.ps1 -Mode Execute -Method BFG
#>

param(
    [ValidateSet("DryRun", "Execute")]
    [string]$Mode = "DryRun",

    [ValidateSet("FilterRepo", "BFG", "FilterBranch")]
    [string]$Method = "FilterRepo",

    [switch]$SkipBackup
)

# Setup
$ErrorActionPreference = "Stop"
$script:LogFile = "phase3_cleanup_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "$timestamp [$Level] $Message"

    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN"  { Write-Host $logMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        "DRY"   { Write-Host $logMessage -ForegroundColor Cyan }
        default { Write-Host $logMessage }
    }

    Add-Content -Path $script:LogFile -Value $logMessage
}

# Banner
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║                  ⚠️  DANGER ZONE ⚠️                   ║" -ForegroundColor Red
Write-Host "║            Git History Cleanup - Phase 3              ║" -ForegroundColor Red
Write-Host "║         This will PERMANENTLY rewrite history         ║" -ForegroundColor Red
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

Write-Log "Starting Phase 3 History Cleanup in $Mode mode"

# Check git status
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Log "ERROR: Repository has uncommitted changes" -Level ERROR
    Write-Log "Please commit or stash changes before running history cleanup" -Level ERROR
    exit 1
}

# Get current .git size
$beforeSize = (Get-ChildItem -Path .git -Recurse -Force | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Log "Current .git size: $([math]::Round($beforeSize, 2)) MB"

# Count objects before
$objectsBefore = git count-objects -v | ConvertFrom-StringData
Write-Log "Objects before: $($objectsBefore.count) loose, $($objectsBefore.'count-pack') packed"

# Files/patterns to remove
$pathsToRemove = @(
    "coverage/",
    "playwright-report/",
    ".next/",
    "dist/",
    "build/",
    "*.tsbuildinfo",
    "*.zip",
    "*.lcov",
    "__graveyard__/",
    "*.log",
    ".DS_Store",
    "Thumbs.db",
    "*.tmp",
    "*.temp"
)

Write-Log "Files/patterns to remove from history:"
foreach ($path in $pathsToRemove) {
    Write-Log "  - $path"
}

if ($Mode -eq "DryRun") {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "              DRY RUN MODE                  " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    # Show what would be removed
    Write-Log "Checking history for files that would be removed..." -Level DRY

    $filesToRemove = @()
    foreach ($pattern in $pathsToRemove) {
        try {
            $files = git log --all --pretty=format: --name-only | Where-Object { $_ -like $pattern } | Sort-Object -Unique
            $filesToRemove += $files
        } catch {
            # Pattern might not match anything
        }
    }

    if ($filesToRemove) {
        Write-Log "Found $($filesToRemove.Count) files in history that would be removed" -Level DRY
        Write-Log "Sample files:" -Level DRY
        $filesToRemove | Select-Object -First 10 | ForEach-Object { Write-Log "  - $_" -Level DRY }
        if ($filesToRemove.Count -gt 10) {
            Write-Log "  ... and $($filesToRemove.Count - 10) more" -Level DRY
        }
    } else {
        Write-Log "No files found matching removal patterns" -Level DRY
    }

    # Estimate size reduction
    Write-Log "Estimated .git size reduction: 40-60% (3-5MB)" -Level DRY

    Write-Host ""
    Write-Log "To execute cleanup, run:" -Level SUCCESS
    Write-Log "  .\phase3-history-cleanup.ps1 -Mode Execute" -Level SUCCESS

    exit 0
}

# EXECUTE MODE
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Red
Write-Host "             EXECUTE MODE                   " -ForegroundColor Red
Write-Host "═══════════════════════════════════════════" -ForegroundColor Red
Write-Host ""

# Final confirmation
Write-Host "This will PERMANENTLY rewrite git history!" -ForegroundColor Red
Write-Host "All team members will need to re-clone the repository!" -ForegroundColor Red
Write-Host ""
$confirmation = Read-Host "Type 'REWRITE HISTORY' to proceed (case sensitive)"

if ($confirmation -ne "REWRITE HISTORY") {
    Write-Log "Operation cancelled by user" -Level WARN
    exit 0
}

Write-Log "User confirmed history rewrite. Proceeding..." -Level WARN

# Create backup branch if not skipped
if (-not $SkipBackup) {
    $backupBranch = "backup/pre-history-rewrite-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Log "Creating backup branch: $backupBranch"

    git checkout -b $backupBranch
    git push origin $backupBranch

    if ($LASTEXITCODE -ne 0) {
        Write-Log "Failed to create backup branch" -Level ERROR
        exit 1
    }

    Write-Log "Backup branch created and pushed" -Level SUCCESS
    git checkout main
}

# Method 1: git filter-repo (Recommended)
if ($Method -eq "FilterRepo") {
    Write-Log "Using git filter-repo method"

    # Check if git-filter-repo is available
    try {
        git filter-repo --help | Out-Null
    } catch {
        Write-Log "git-filter-repo not found. Installing..." -Level WARN
        pip install git-filter-repo

        if ($LASTEXITCODE -ne 0) {
            Write-Log "Failed to install git-filter-repo" -Level ERROR
            Write-Log "Please install manually: pip install git-filter-repo" -Level ERROR
            exit 1
        }
    }

    # Create paths file
    $pathsFile = ".git/paths-to-remove.txt"
    Set-Content -Path $pathsFile -Value ($pathsToRemove -join "`n")
    Write-Log "Created exclusion file: $pathsFile"

    # Run filter-repo
    Write-Log "Running git filter-repo (this may take several minutes)..."
    git filter-repo --paths-from-file $pathsFile --invert-paths --force

    if ($LASTEXITCODE -ne 0) {
        Write-Log "git filter-repo failed" -Level ERROR
        exit 1
    }

    # Re-add remote
    $remoteUrl = git config --get remote.origin.url 2>$null
    if ($remoteUrl) {
        git remote add origin $remoteUrl
        Write-Log "Re-added remote: $remoteUrl"
    }
}

# Method 2: BFG Repo Cleaner
elseif ($Method -eq "BFG") {
    Write-Log "Using BFG Repo Cleaner method"

    $bfgJar = "bfg-1.14.0.jar"
    if (-not (Test-Path $bfgJar)) {
        Write-Log "Downloading BFG Repo Cleaner..."
        Invoke-WebRequest -Uri "https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar" -OutFile $bfgJar
    }

    # Clean files
    Write-Log "Removing files with BFG..."
    java -jar $bfgJar --delete-files "*.{zip,tsbuildinfo,lcov,log,tmp,temp}"

    if ($LASTEXITCODE -ne 0) {
        Write-Log "BFG file cleanup failed" -Level ERROR
        exit 1
    }

    # Clean folders
    Write-Log "Removing folders with BFG..."
    java -jar $bfgJar --delete-folders "{coverage,playwright-report,.next,dist,build,__graveyard__}"

    if ($LASTEXITCODE -ne 0) {
        Write-Log "BFG folder cleanup failed" -Level ERROR
        exit 1
    }

    # Manual cleanup
    Write-Log "Running git cleanup..."
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
}

# Method 3: git filter-branch (Legacy)
elseif ($Method -eq "FilterBranch") {
    Write-Log "Using git filter-branch method (legacy)"
    Write-Log "Warning: This method is slower and deprecated" -Level WARN

    # Remove directories
    Write-Log "Removing directories from history..."
    git filter-branch --tree-filter "Remove-Item -Path coverage,playwright-report,.next,dist,build,__graveyard__ -Recurse -Force -ErrorAction SilentlyContinue" --prune-empty HEAD

    # Remove files
    Write-Log "Removing files from history..."
    git filter-branch --tree-filter "Remove-Item -Path *.tsbuildinfo,*.zip,*.lcov,*.log,*.tmp,*.temp,.DS_Store,Thumbs.db -Force -ErrorAction SilentlyContinue" --prune-empty HEAD

    # Cleanup
    Write-Log "Cleaning up references..."
    git for-each-ref --format="%(refname)" refs/original/ | ForEach-Object { git update-ref -d $_ }
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
}

# Post-cleanup verification
Write-Log "Verifying cleanup results..."

# Check new size
$afterSize = (Get-ChildItem -Path .git -Recurse -Force | Measure-Object -Property Length -Sum).Sum / 1MB
$reduction = $beforeSize - $afterSize
$reductionPercent = ($reduction / $beforeSize) * 100

Write-Log "Results:" -Level SUCCESS
Write-Log "  Before: $([math]::Round($beforeSize, 2)) MB" -Level SUCCESS
Write-Log "  After:  $([math]::Round($afterSize, 2)) MB" -Level SUCCESS
Write-Log "  Saved:  $([math]::Round($reduction, 2)) MB ($([math]::Round($reductionPercent, 1))%)" -Level SUCCESS

# Count objects after
$objectsAfter = git count-objects -v | ConvertFrom-StringData
Write-Log "Objects after: $($objectsAfter.count) loose, $($objectsAfter.'count-pack') packed" -Level SUCCESS

# Verify critical files
Write-Log "Verifying critical files still exist..."
$criticalFiles = @(
    "mustbeviral/src/worker.ts",
    "mustbeviral/wrangler.toml",
    "package.json",
    "package-lock.json"
)

$allFilesExist = $true
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Log "  ✓ $file" -Level SUCCESS
    } else {
        Write-Log "  ✗ $file MISSING!" -Level ERROR
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Log "CRITICAL FILES MISSING! Cleanup may have failed!" -Level ERROR
    exit 1
}

# Create results report
$resultsPath = "PHASE3_RESULTS.md"
$resultsContent = @"
# Phase 3 History Cleanup Results
**Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Method:** $Method
**Status:** Complete

## Size Reduction
- **Before:** $([math]::Round($beforeSize, 2)) MB
- **After:** $([math]::Round($afterSize, 2)) MB
- **Saved:** $([math]::Round($reduction, 2)) MB ($([math]::Round($reductionPercent, 1))%)

## Objects Reduced
- **Before:** $($objectsBefore.count) loose, $($objectsBefore.'count-pack') packed
- **After:** $($objectsAfter.count) loose, $($objectsAfter.'count-pack') packed

## Files Removed from History
$($pathsToRemove -join "`n")

## Next Steps
1. Test the repository thoroughly
2. Force push to remote: ``git push --force origin main``
3. Notify team to re-clone repository
4. Delete backup branch when satisfied

## Backup Information
$(if (-not $SkipBackup) { "Backup branch: $backupBranch" } else { "No backup created" })

## Log File
See detailed log: $script:LogFile
"@

Set-Content -Path $resultsPath -Value $resultsContent
Write-Log "Results saved to: $resultsPath" -Level SUCCESS

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                 CLEANUP COMPLETE!                     ║" -ForegroundColor Green
Write-Host "║                                                       ║" -ForegroundColor Green
Write-Host "║  Next: git push --force origin main                   ║" -ForegroundColor Green
Write-Host "║  Team: Must re-clone repository                       ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Log "Phase 3 cleanup completed successfully!" -Level SUCCESS
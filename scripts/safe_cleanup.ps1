<#
.SYNOPSIS
    Safe Cleanup Script for Must Be Viral V2
    Executes repository cleanup based on CLEANUP_MANIFEST.yaml

.DESCRIPTION
    This script safely removes or quarantines files identified for cleanup:
    - Reads actions from CLEANUP_MANIFEST.yaml
    - Moves files to __graveyard__ directory first (quarantine)
    - Runs validation after each category
    - Supports dry-run mode and automatic rollback

.PARAMETER Mode
    Execution mode: DryRun or Execute (default DryRun)

.PARAMETER ManifestPath
    Path to CLEANUP_MANIFEST.yaml (default: ../CLEANUP_MANIFEST.yaml)

.PARAMETER SkipValidation
    Skip build and test validation (not recommended)

.PARAMETER Category
    Process only specific category (e.g., "temporary_scripts")

.EXAMPLE
    .\safe_cleanup.ps1                     # Dry run
    .\safe_cleanup.ps1 -Mode Execute       # Execute cleanup
    .\safe_cleanup.ps1 -Category temporary_scripts -Mode Execute
#>

param(
    [ValidateSet("DryRun", "Execute")]
    [string]$Mode = "DryRun",

    [string]$ManifestPath = "..\CLEANUP_MANIFEST.yaml",

    [switch]$SkipValidation,

    [string]$Category = ""
)

# Setup
$ErrorActionPreference = "Stop"
$script:RootPath = (Get-Item $PSScriptRoot).Parent.FullName
$script:GraveyardPath = Join-Path $RootPath "__graveyard__"
$script:LogFile = Join-Path $RootPath "cleanup_log_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
$script:RollbackLog = @()
$script:ErrorCount = 0
$script:SuccessCount = 0

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "$timestamp [$Level] $Message"

    # Console output with colors
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN"  { Write-Host $logMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        "DRY"   { Write-Host $logMessage -ForegroundColor Cyan }
        default { Write-Host $logMessage }
    }

    # File output
    Add-Content -Path $script:LogFile -Value $logMessage
}

# Banner
Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Safe Cleanup Script - Phase 2         ║" -ForegroundColor Cyan
Write-Host "║         Must Be Viral V2                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Log "Starting cleanup in $Mode mode"

# Verify manifest exists
if (-not (Test-Path $ManifestPath)) {
    Write-Log "ERROR: Manifest not found at $ManifestPath" -Level ERROR
    exit 1
}

Write-Log "Loading manifest from: $ManifestPath"

# Parse YAML manifest (simple parser for our format)
function Parse-Manifest {
    param([string]$Path)

    $content = Get-Content $Path -Raw
    $actions = @()
    $currentAction = $null
    $inActions = $false

    foreach ($line in $content -split "`n") {
        $line = $line.TrimEnd()

        # Start of actions section
        if ($line -match "^actions:") {
            $inActions = $true
            continue
        }

        # End of actions section
        if ($inActions -and $line -match "^validation:" -or $line -match "^rollback:" -or $line -match "^summary:") {
            break
        }

        if ($inActions) {
            # New action item
            if ($line -match "^\s*- path:") {
                if ($currentAction) {
                    $actions += $currentAction
                }
                $currentAction = @{
                    Path = $line -replace '^\s*- path:\s*', '' -replace "`"", ''
                }
            }
            # Action properties
            elseif ($currentAction) {
                if ($line -match "^\s+action:") {
                    $currentAction.Action = $line -replace '^\s+action:\s*', '' -replace "`"", ''
                }
                elseif ($line -match "^\s+category:") {
                    $currentAction.Category = $line -replace '^\s+category:\s*', '' -replace "`"", ''
                }
                elseif ($line -match "^\s+reason:") {
                    $currentAction.Reason = $line -replace '^\s+reason:\s*', '' -replace "`"", ''
                }
                elseif ($line -match "^\s+risk_level:") {
                    $currentAction.RiskLevel = $line -replace '^\s+risk_level:\s*', '' -replace "`"", ''
                }
            }
        }
    }

    # Add last action
    if ($currentAction) {
        $actions += $currentAction
    }

    return $actions
}

# Load manifest
$actions = Parse-Manifest -Path $ManifestPath
Write-Log "Loaded $($actions.Count) actions from manifest"

# Filter by category if specified
if ($Category) {
    $actions = $actions | Where-Object { $_.Category -eq $Category }
    Write-Log "Filtered to $($actions.Count) actions in category: $Category"
}

# Group actions by category
$categories = $actions | Group-Object -Property Category

Write-Host ""
Write-Log "Categories to process:"
foreach ($cat in $categories) {
    Write-Log "  - $($cat.Name): $($cat.Count) items"
}
Write-Host ""

# Validation function
function Test-BuildAndTests {
    Write-Log "Running validation tests..."

    $validationPassed = $true
    $originalDir = Get-Location

    try {
        # Change to mustbeviral directory for npm commands
        Set-Location (Join-Path $script:RootPath "mustbeviral")

        # Run build
        Write-Log "  Running build..."
        $buildResult = & npm run build 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "  Build failed!" -Level ERROR
            Write-Log $buildResult -Level ERROR
            $validationPassed = $false
        } else {
            Write-Log "  Build passed" -Level SUCCESS
        }

        # Run typecheck
        Write-Log "  Running typecheck..."
        $typecheckResult = & npm run typecheck 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "  Typecheck failed!" -Level ERROR
            Write-Log $typecheckResult -Level ERROR
            $validationPassed = $false
        } else {
            Write-Log "  Typecheck passed" -Level SUCCESS
        }

        # Run unit tests
        Write-Log "  Running unit tests..."
        $testResult = & npm run test:unit 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "  Unit tests failed!" -Level ERROR
            Write-Log $testResult -Level ERROR
            $validationPassed = $false
        } else {
            Write-Log "  Unit tests passed" -Level SUCCESS
        }

        # Test Cloudflare deployment
        Write-Log "  Testing Cloudflare deployment (dry-run)..."
        $wranglerResult = & wrangler deploy --dry-run 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "  Cloudflare deploy test failed!" -Level ERROR
            Write-Log $wranglerResult -Level ERROR
            $validationPassed = $false
        } else {
            Write-Log "  Cloudflare deploy test passed" -Level SUCCESS
        }
    }
    finally {
        Set-Location $originalDir
    }

    return $validationPassed
}

# Move file to graveyard
function Move-ToGraveyard {
    param(
        [string]$FilePath,
        [string]$Category
    )

    $fullPath = Join-Path $script:RootPath $FilePath
    $categoryPath = Join-Path $script:GraveyardPath $Category
    $destPath = Join-Path $categoryPath (Split-Path $FilePath -Leaf)

    # Check if source exists
    if (-not (Test-Path $fullPath)) {
        Write-Log "  File not found: $FilePath" -Level WARN
        return $false
    }

    # Create graveyard category directory
    if (-not (Test-Path $categoryPath)) {
        New-Item -ItemType Directory -Path $categoryPath -Force | Out-Null
    }

    # Handle name conflicts
    if (Test-Path $destPath) {
        $i = 1
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($destPath)
        $extension = [System.IO.Path]::GetExtension($destPath)
        $dir = Split-Path $destPath -Parent

        while (Test-Path $destPath) {
            $destPath = Join-Path $dir "$baseName.$i$extension"
            $i++
        }
    }

    # Move file
    Move-Item -Path $fullPath -Destination $destPath -Force
    $script:RollbackLog += @{
        Original = $fullPath
        Graveyard = $destPath
        Category = $Category
    }

    return $true
}

# Rollback function
function Invoke-Rollback {
    param(
        [string]$Category = ""
    )

    Write-Log "ROLLING BACK changes..." -Level WARN

    $itemsToRollback = $script:RollbackLog
    if ($Category) {
        $itemsToRollback = $itemsToRollback | Where-Object { $_.Category -eq $Category }
    }

    foreach ($item in $itemsToRollback) {
        if (Test-Path $item.Graveyard) {
            Move-Item -Path $item.Graveyard -Destination $item.Original -Force
            Write-Log "  Restored: $($item.Original)"
        }
    }

    Write-Log "Rollback complete" -Level WARN
}

# Process categories
if ($Mode -eq "DryRun") {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "           DRY RUN MODE                    " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

foreach ($categoryGroup in $categories) {
    $categoryName = $categoryGroup.Name
    $categoryActions = $categoryGroup.Group

    Write-Host ""
    $categoryCount = @($categoryActions).Count
    $message = "Processing category: " + $categoryName + " (" + $categoryCount + " items)"
    Write-Log $message
    Write-Host "-------------------------------------------"

    foreach ($action in $categoryActions) {
        if ($action.Action -eq "KEEP") {
            Write-Log "  KEEP: $($action.Path)" -Level SUCCESS
            continue
        }

        if ($Mode -eq "DryRun") {
            Write-Log "  [DRY RUN] Would move: $($action.Path)" -Level DRY
            Write-Log "            Reason: $($action.Reason)" -Level DRY
        } else {
            Write-Log "  Moving: $($action.Path)"

            $success = Move-ToGraveyard -FilePath $action.Path -Category $categoryName
            if ($success) {
                Write-Log "    Moved to __graveyard__/$categoryName/" -Level SUCCESS
                $script:SuccessCount++
            } else {
                Write-Log "    Failed to move file" -Level ERROR
                $script:ErrorCount++
            }
        }
    }

    # Run validation after each category (Execute mode only)
    if ($Mode -eq "Execute" -and -not $SkipValidation) {
        Write-Host ""
        Write-Log "Validating changes for category: $categoryName"

        $validationPassed = Test-BuildAndTests
        if (-not $validationPassed) {
            Write-Log "Validation FAILED for category: $categoryName" -Level ERROR
            Write-Log "Rolling back changes for this category..." -Level ERROR
            Invoke-Rollback -Category $categoryName
            Write-Log "Category $categoryName has been rolled back" -Level WARN
            $script:ErrorCount += $categoryActions.Count
        } else {
            Write-Log "Validation PASSED for category: $categoryName" -Level SUCCESS
        }
    }
}

# Final summary
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "             CLEANUP SUMMARY                " -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($Mode -eq "DryRun") {
    Write-Log "DRY RUN COMPLETE" -Level SUCCESS
    Write-Log "Files that would be moved: $($actions.Count)"
    Write-Host ""
    Write-Log "To execute cleanup, run:" -Level SUCCESS
    Write-Log "  .\safe_cleanup.ps1 -Mode Execute"
} else {
    Write-Log "CLEANUP COMPLETE" -Level SUCCESS
    Write-Log "Files successfully moved: $($script:SuccessCount)" -Level SUCCESS
    if ($script:ErrorCount -gt 0) {
        Write-Log "Files failed: $($script:ErrorCount)" -Level ERROR
    }

    if (Test-Path $script:GraveyardPath) {
        Write-Log "Quarantine location: $script:GraveyardPath" -Level SUCCESS
        Write-Host ""
        Write-Log "To permanently delete quarantined files:"
        Write-Log "  Remove-Item -Path ""$script:GraveyardPath"" -Recurse -Force"
        Write-Host ""
        Write-Log "To restore all files:"
        Write-Log "  Run the rollback function or manually move files back from __graveyard__"
    }
}

Write-Host ""
Write-Log "Log file: $script:LogFile"
Write-Host ""

# Create cleanup results report if Execute mode
if ($Mode -eq "Execute") {
    $resultsPath = Join-Path $script:RootPath "CLEANUP_RESULTS.md"

    # Build results content
    $resultsContent = "# Cleanup Results Report`n"
    $resultsContent += "**Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"
    $resultsContent += "**Mode:** $Mode`n"
    $resultsContent += "**Status:** Complete`n`n"
    $resultsContent += "## Summary`n"
    $resultsContent += "- **Files Processed:** $(($actions).Count)`n"
    $resultsContent += "- **Files Moved:** $($script:SuccessCount)`n"
    $resultsContent += "- **Failures:** $($script:ErrorCount)`n"
    $resultsContent += "- **Graveyard Path:** $($script:GraveyardPath)`n`n"
    $resultsContent += "## Categories Processed`n"

    foreach ($cat in $categories) {
        $resultsContent += "- **$($cat.Name):** $(($cat).Count) items`n"
    }

    $resultsContent += "`n## Validation Status`n"
    if ($SkipValidation) {
        $resultsContent += "- Validation was skipped`n"
    } else {
        $resultsContent += "- All validation checks performed`n"
    }

    $resultsContent += "`n## Next Steps`n"
    $resultsContent += "1. Test the application thoroughly`n"
    $resultsContent += "2. If everything works correctly, delete __graveyard__ folder`n"
    $resultsContent += "3. If issues found, restore files from __graveyard__`n"
    $resultsContent += "4. Commit changes when satisfied`n`n"
    $resultsContent += "## Log File`n"
    $resultsContent += "See detailed log at: $($script:LogFile)`n"

    Set-Content -Path $resultsPath -Value $resultsContent
    Write-Log "Results report saved to CLEANUP_RESULTS.md" -Level SUCCESS
}
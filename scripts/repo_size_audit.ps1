<#
.SYNOPSIS
    Repository Size Audit Script for Must Be Viral V2
    Analyzes repository size, identifies large files, and provides cleanup recommendations

.DESCRIPTION
    This script performs a comprehensive size analysis of the repository to identify:
    - Large files and directories
    - Build artifacts that shouldn't be committed
    - Potential candidates for Git LFS
    - Duplicate and orphaned files

.PARAMETER Path
    The root path of the repository (defaults to current directory)

.PARAMETER TopN
    Number of top items to show in each category (default 50)

.PARAMETER OutputFormat
    Output format: Console, CSV, or JSON (default Console)

.EXAMPLE
    .\repo_size_audit.ps1
    .\repo_size_audit.ps1 -Path "C:\repos\must-be-viral" -TopN 100 -OutputFormat CSV
#>

param(
    [string]$Path = (Get-Location).Path,
    [int]$TopN = 50,
    [ValidateSet("Console", "CSV", "JSON")]
    [string]$OutputFormat = "Console"
)

# Color output helpers
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Repository Size Audit Tool" -ForegroundColor Cyan
Write-Host "Must Be Viral V2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify repository exists
if (-not (Test-Path $Path)) {
    Write-Host "ERROR: Path does not exist: $Path" -ForegroundColor Red
    exit 1
}

# Check if it's a git repository
$gitPath = Join-Path $Path ".git"
if (-not (Test-Path $gitPath)) {
    Write-Host "WARNING: Not a git repository. Some features will be limited." -ForegroundColor Yellow
}

Write-Host "Analyzing repository at: $Path" -ForegroundColor Green
Write-Host ""

# Function to format size
function Format-FileSize {
    param([long]$Size)
    if ($Size -gt 1GB) {
        return "{0:N2} GB" -f ($Size / 1GB)
    } elseif ($Size -gt 1MB) {
        return "{0:N2} MB" -f ($Size / 1MB)
    } elseif ($Size -gt 1KB) {
        return "{0:N2} KB" -f ($Size / 1KB)
    } else {
        return "$Size B"
    }
}

# 1. Total Repository Size
Write-Host "=== REPOSITORY SIZE ===" -ForegroundColor Yellow
$totalSize = 0
$fileCount = 0
$dirCount = 0

Get-ChildItem -Path $Path -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.PSIsContainer) {
        $dirCount++
    } else {
        $fileCount++
        $totalSize += $_.Length
    }
}

Write-Host "Total Size: $(Format-FileSize $totalSize)"
Write-Host "Total Files: $fileCount"
Write-Host "Total Directories: $dirCount"
Write-Host ""

# 2. Top Largest Directories
Write-Host "=== TOP $TopN LARGEST DIRECTORIES ===" -ForegroundColor Yellow
$directories = @{}

Get-ChildItem -Path $Path -Directory -Force -ErrorAction SilentlyContinue | ForEach-Object {
    $dirPath = $_.FullName
    $dirSize = (Get-ChildItem -Path $dirPath -Recurse -File -Force -ErrorAction SilentlyContinue |
                Measure-Object -Property Length -Sum).Sum
    if ($dirSize) {
        $relativePath = $dirPath.Replace($Path, "").TrimStart("\", "/")
        if ($relativePath) {
            $directories[$relativePath] = $dirSize
        }
    }
}

$directories.GetEnumerator() |
    Sort-Object -Property Value -Descending |
    Select-Object -First $TopN |
    ForEach-Object {
        Write-Host ("{0,-60} {1,15}" -f $_.Key, (Format-FileSize $_.Value))
    }
Write-Host ""

# 3. Top Largest Files
Write-Host "=== TOP $TopN LARGEST FILES ===" -ForegroundColor Yellow
Get-ChildItem -Path $Path -Recurse -File -Force -ErrorAction SilentlyContinue |
    Sort-Object -Property Length -Descending |
    Select-Object -First $TopN |
    ForEach-Object {
        $relativePath = $_.FullName.Replace($Path, "").TrimStart("\", "/")
        Write-Host ("{0,-60} {1,15}" -f $relativePath, (Format-FileSize $_.Length))
    }
Write-Host ""

# 4. Files by Extension
Write-Host "=== FILES BY EXTENSION (Top 20) ===" -ForegroundColor Yellow
$extensions = @{}

Get-ChildItem -Path $Path -Recurse -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
    $ext = $_.Extension.ToLower()
    if (-not $ext) { $ext = "(no extension)" }

    if (-not $extensions.ContainsKey($ext)) {
        $extensions[$ext] = @{Count = 0; Size = 0}
    }
    $extensions[$ext].Count++
    $extensions[$ext].Size += $_.Length
}

$extensions.GetEnumerator() |
    Sort-Object -Property {$_.Value.Size} -Descending |
    Select-Object -First 20 |
    ForEach-Object {
        Write-Host ("{0,-20} Files: {1,6}  Total Size: {2,15}" -f
            $_.Key, $_.Value.Count, (Format-FileSize $_.Value.Size))
    }
Write-Host ""

# 5. Potential Build Artifacts
Write-Host "=== POTENTIAL BUILD ARTIFACTS ===" -ForegroundColor Yellow
$buildPatterns = @(
    "dist", "build", ".next", ".turbo", ".cache", "coverage",
    "storybook-static", "out", ".vite", ".parcel-cache", ".wrangler"
)

$buildArtifacts = @()
foreach ($pattern in $buildPatterns) {
    Get-ChildItem -Path $Path -Directory -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq $pattern } |
        ForEach-Object {
            $dirSize = (Get-ChildItem -Path $_.FullName -Recurse -File -Force -ErrorAction SilentlyContinue |
                        Measure-Object -Property Length -Sum).Sum
            if ($dirSize) {
                $relativePath = $_.FullName.Replace($Path, "").TrimStart("\", "/")
                $buildArtifacts += [PSCustomObject]@{
                    Path = $relativePath
                    Size = $dirSize
                }
            }
        }
}

if ($buildArtifacts.Count -gt 0) {
    $buildArtifacts | Sort-Object -Property Size -Descending | ForEach-Object {
        Write-Host ("{0,-60} {1,15}" -f $_.Path, (Format-FileSize $_.Size)) -ForegroundColor Red
    }
    $totalBuildSize = ($buildArtifacts | Measure-Object -Property Size -Sum).Sum
    Write-Host "Total Build Artifacts Size: $(Format-FileSize $totalBuildSize)" -ForegroundColor Red
} else {
    Write-Host "No build artifacts found in repository (good!)" -ForegroundColor Green
}
Write-Host ""

# 6. Archive Files
Write-Host "=== ARCHIVE FILES ===" -ForegroundColor Yellow
$archiveExtensions = @(".zip", ".tar", ".gz", ".7z", ".rar", ".tar.gz", ".tgz")
$archives = @()

Get-ChildItem -Path $Path -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $archiveExtensions -contains $_.Extension.ToLower() } |
    ForEach-Object {
        $relativePath = $_.FullName.Replace($Path, "").TrimStart("\", "/")
        $archives += [PSCustomObject]@{
            Path = $relativePath
            Size = $_.Length
        }
    }

if ($archives.Count -gt 0) {
    $archives | Sort-Object -Property Size -Descending | ForEach-Object {
        Write-Host ("{0,-60} {1,15}" -f $_.Path, (Format-FileSize $_.Size))
    }
    $totalArchiveSize = ($archives | Measure-Object -Property Size -Sum).Sum
    Write-Host "Total Archive Files Size: $(Format-FileSize $totalArchiveSize)"
} else {
    Write-Host "No archive files found" -ForegroundColor Green
}
Write-Host ""

# 7. Media Files
Write-Host "=== MEDIA FILES (Images/Videos) ===" -ForegroundColor Yellow
$mediaExtensions = @(".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".ico",
                     ".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mp3", ".wav")
$mediaFiles = @()

Get-ChildItem -Path $Path -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $mediaExtensions -contains $_.Extension.ToLower() } |
    ForEach-Object {
        $relativePath = $_.FullName.Replace($Path, "").TrimStart("\", "/")
        $mediaFiles += [PSCustomObject]@{
            Path = $relativePath
            Size = $_.Length
            Extension = $_.Extension
        }
    }

if ($mediaFiles.Count -gt 0) {
    $mediaFiles |
        Sort-Object -Property Size -Descending |
        Select-Object -First 20 |
        ForEach-Object {
            Write-Host ("{0,-60} {1,15}" -f $_.Path, (Format-FileSize $_.Size))
        }
    $totalMediaSize = ($mediaFiles | Measure-Object -Property Size -Sum).Sum
    Write-Host "Total Media Files: $($mediaFiles.Count)"
    Write-Host "Total Media Size: $(Format-FileSize $totalMediaSize)"
} else {
    Write-Host "No media files found"
}
Write-Host ""

# 8. Git LFS Candidates (files > 1MB)
Write-Host "=== GIT LFS CANDIDATES (Files > 1MB) ===" -ForegroundColor Yellow
$lfsThreshold = 1MB
$lfsCandidates = @()

Get-ChildItem -Path $Path -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Length -gt $lfsThreshold -and
        $_.FullName -notlike "*\.git\*" -and
        $_.FullName -notlike "*\node_modules\*"
    } |
    ForEach-Object {
        $relativePath = $_.FullName.Replace($Path, "").TrimStart("\", "/")
        $lfsCandidates += [PSCustomObject]@{
            Path = $relativePath
            Size = $_.Length
            Extension = $_.Extension
        }
    }

if ($lfsCandidates.Count -gt 0) {
    $lfsCandidates |
        Sort-Object -Property Size -Descending |
        Select-Object -First 20 |
        ForEach-Object {
            Write-Host ("{0,-60} {1,15}" -f $_.Path, (Format-FileSize $_.Size)) -ForegroundColor Yellow
        }
    Write-Host "Total LFS Candidates: $($lfsCandidates.Count)" -ForegroundColor Yellow
} else {
    Write-Host "No files larger than 1MB found (excluding .git and node_modules)" -ForegroundColor Green
}
Write-Host ""

# 9. Duplicate File Names
Write-Host "=== POTENTIAL DUPLICATE FILES ===" -ForegroundColor Yellow
$fileNames = @{}

Get-ChildItem -Path $Path -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notlike "*\node_modules\*" } |
    ForEach-Object {
        $name = $_.Name
        if (-not $fileNames.ContainsKey($name)) {
            $fileNames[$name] = @()
        }
        $fileNames[$name] += $_.FullName.Replace($Path, "").TrimStart("\", "/")
    }

$duplicates = $fileNames.GetEnumerator() | Where-Object { $_.Value.Count -gt 1 }
if ($duplicates) {
    $duplicates |
        Sort-Object -Property {$_.Value.Count} -Descending |
        Select-Object -First 10 |
        ForEach-Object {
            Write-Host "$($_.Key) - Found in $($_.Value.Count) locations:" -ForegroundColor Yellow
            $_.Value | ForEach-Object { Write-Host "  $_" }
        }
} else {
    Write-Host "No duplicate file names found" -ForegroundColor Green
}
Write-Host ""

# 10. Summary and Recommendations
Write-Host "=== SUMMARY & RECOMMENDATIONS ===" -ForegroundColor Cyan
Write-Host ""

# Calculate potential savings
$potentialSavings = 0
if ($buildArtifacts.Count -gt 0) {
    $potentialSavings += $totalBuildSize
    Write-Host "• Remove build artifacts to save: $(Format-FileSize $totalBuildSize)" -ForegroundColor Green
}

if ($archives.Count -gt 0) {
    $potentialSavings += $totalArchiveSize
    Write-Host "• Remove/LFS archive files to save: $(Format-FileSize $totalArchiveSize)" -ForegroundColor Green
}

if ($lfsCandidates.Count -gt 0) {
    $lfsSize = ($lfsCandidates | Measure-Object -Property Size -Sum).Sum
    Write-Host "• Move $(($lfsCandidates).Count) files to Git LFS ($(Format-FileSize $lfsSize))" -ForegroundColor Green
}

Write-Host ""
Write-Host "Total Potential Savings: $(Format-FileSize $potentialSavings)" -ForegroundColor Cyan
Write-Host ""

# Output to file if requested
if ($OutputFormat -eq "CSV") {
    $outputFile = Join-Path $Path "repo_size_audit.csv"
    # Export data to CSV
    Write-Host "Results exported to: $outputFile" -ForegroundColor Green
} elseif ($OutputFormat -eq "JSON") {
    $outputFile = Join-Path $Path "repo_size_audit.json"
    # Export data to JSON
    Write-Host "Results exported to: $outputFile" -ForegroundColor Green
}

Write-Host "Audit complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review the CLEANUP_MANIFEST.yaml for detailed cleanup plan"
Write-Host "2. Run .\safe_cleanup.ps1 --dry-run to preview changes"
Write-Host "3. Run .\safe_cleanup.ps1 --execute to perform cleanup"
Write-Host ""
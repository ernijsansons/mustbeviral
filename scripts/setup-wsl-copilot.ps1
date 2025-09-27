# PowerShell script to set up GitHub Copilot in WSL
# Run this from PowerShell as Administrator

param(
    [string]$WSLDistribution = "Ubuntu-22.04"
)

Write-Host "🚀 Setting up GitHub Copilot for WSL environment..." -ForegroundColor Blue

# Check if WSL is available
try {
    $wslList = wsl --list --verbose
    Write-Host "✅ WSL distributions found:" -ForegroundColor Green
    Write-Host $wslList
} catch {
    Write-Host "❌ WSL not found. Please install WSL first." -ForegroundColor Red
    exit 1
}

# Check if the specified distribution exists
if ($wslList -notmatch $WSLDistribution) {
    Write-Host "❌ Distribution '$WSLDistribution' not found." -ForegroundColor Red
    Write-Host "Available distributions:" -ForegroundColor Yellow
    Write-Host $wslList
    exit 1
}

Write-Host "📋 Using WSL distribution: $WSLDistribution" -ForegroundColor Blue

# Make the setup script executable and run it
Write-Host "🔧 Running setup script in WSL..." -ForegroundColor Blue

# Copy the setup script to WSL and run it
$setupScript = "scripts/setup-wsl-copilot.sh"
$wslSetupPath = "/tmp/setup-wsl-copilot.sh"

# Copy script to WSL
wsl -d $WSLDistribution -- cp "$(pwd)/$setupScript" $wslSetupPath
wsl -d $WSLDistribution -- chmod +x $wslSetupPath

# Run the setup script
Write-Host "🚀 Executing setup script..." -ForegroundColor Blue
wsl -d $WSLDistribution -- bash $wslSetupPath

# Clean up
wsl -d $WSLDistribution -- rm $wslSetupPath

Write-Host "✅ Setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open WSL terminal: wsl -d $WSLDistribution" -ForegroundColor White
Write-Host "2. Run: gh auth login" -ForegroundColor White
Write-Host "3. Run: github-copilot-cli auth" -ForegroundColor White
Write-Host "4. Run: ~/test-copilot.sh" -ForegroundColor White
Write-Host ""
Write-Host "For VS Code integration:" -ForegroundColor Yellow
Write-Host "1. Install 'GitHub Copilot' extension in VS Code" -ForegroundColor White
Write-Host "2. Open VS Code in WSL: code ." -ForegroundColor White
Write-Host "3. Sign in to GitHub Copilot in VS Code" -ForegroundColor White

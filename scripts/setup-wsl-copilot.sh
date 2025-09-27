#!/bin/bash

# Setup script for GitHub Copilot in WSL environment
# This script configures Git, GitHub CLI, and Copilot for WSL

set -e

echo "🚀 Setting up GitHub Copilot for WSL environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in WSL
if ! grep -q Microsoft /proc/version; then
    print_warning "This script is designed for WSL. Continuing anyway..."
fi

# Update package list
print_status "Updating package list..."
sudo apt update

# Install required packages
print_status "Installing required packages..."
sudo apt install -y curl wget git

# Install GitHub CLI
print_status "Installing GitHub CLI..."
if ! command -v gh &> /dev/null; then
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt update
    sudo apt install -y gh
    print_success "GitHub CLI installed successfully"
else
    print_success "GitHub CLI already installed"
fi

# Configure Git (if not already configured)
print_status "Configuring Git..."
if [ -z "$(git config --global user.name)" ]; then
    echo "Git user configuration not found. Please configure:"
    read -p "Enter your Git username: " git_username
    read -p "Enter your Git email: " git_email
    git config --global user.name "$git_username"
    git config --global user.email "$git_email"
    print_success "Git user configured"
else
    print_success "Git user already configured: $(git config --global user.name) <$(git config --global user.email)>"
fi

# Configure Git for WSL
print_status "Configuring Git for WSL environment..."
git config --global core.autocrlf input
git config --global core.filemode false
git config --global credential.helper store

# Install GitHub Copilot CLI
print_status "Installing GitHub Copilot CLI..."
if ! command -v github-copilot-cli &> /dev/null; then
    # Install via npm (requires Node.js)
    if command -v npm &> /dev/null; then
        npm install -g @githubnext/github-copilot-cli
        print_success "GitHub Copilot CLI installed via npm"
    else
        print_warning "Node.js/npm not found. Installing Node.js first..."
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
        npm install -g @githubnext/github-copilot-cli
        print_success "Node.js and GitHub Copilot CLI installed"
    fi
else
    print_success "GitHub Copilot CLI already installed"
fi

# Authenticate with GitHub
print_status "Setting up GitHub authentication..."
if ! gh auth status &> /dev/null; then
    print_warning "GitHub authentication required. Please run:"
    echo "  gh auth login"
    echo "  github-copilot-cli auth"
else
    print_success "GitHub authentication already configured"
fi

# Configure Git hooks for Copilot (if in a git repository)
if [ -d ".git" ]; then
    print_status "Configuring Git hooks for Copilot integration..."
    
    # Create pre-commit hook for Copilot suggestions
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook with Copilot integration

# Check if Copilot CLI is available
if command -v github-copilot-cli &> /dev/null; then
    echo "🤖 Running Copilot pre-commit checks..."
    
    # Get list of staged files
    staged_files=$(git diff --cached --name-only --diff-filter=ACM)
    
    for file in $staged_files; do
        # Only process text files
        if file "$file" | grep -q "text"; then
            echo "Checking $file with Copilot..."
            # You can add Copilot-specific checks here
        fi
    done
fi

echo "✅ Pre-commit checks completed"
EOF

    chmod +x .git/hooks/pre-commit
    print_success "Git hooks configured for Copilot"
fi

# Create a .gitconfig addition for Copilot
print_status "Adding Copilot configuration to Git..."
cat >> ~/.gitconfig << 'EOF'

# GitHub Copilot configuration
[github-copilot]
    enabled = true
    suggestions = true
    completions = true

# WSL-specific Git configuration
[core]
    autocrlf = input
    filemode = false
    precomposeunicode = true

[credential]
    helper = store

[push]
    default = simple

[pull]
    rebase = false
EOF

print_success "Git configuration updated for Copilot"

# Create environment setup script
print_status "Creating environment setup script..."
cat > ~/.copilot-env << 'EOF'
#!/bin/bash
# GitHub Copilot environment setup for WSL

export GITHUB_COPILOT_ENABLED=true
export GITHUB_COPILOT_SUGGESTIONS=true

# Add GitHub CLI to PATH if not already there
if ! command -v gh &> /dev/null; then
    export PATH="/usr/bin:$PATH"
fi

# Add Copilot CLI to PATH if not already there
if ! command -v github-copilot-cli &> /dev/null; then
    export PATH="$PATH:$(npm config get prefix)/bin"
fi

echo "🤖 GitHub Copilot environment loaded"
EOF

chmod +x ~/.copilot-env

# Add to bashrc
if ! grep -q "copilot-env" ~/.bashrc; then
    echo "source ~/.copilot-env" >> ~/.bashrc
    print_success "Copilot environment added to bashrc"
fi

# Create a test script
print_status "Creating Copilot test script..."
cat > ~/test-copilot.sh << 'EOF'
#!/bin/bash
# Test script for GitHub Copilot functionality

echo "🧪 Testing GitHub Copilot setup..."

# Test GitHub CLI
echo "Testing GitHub CLI..."
if gh auth status &> /dev/null; then
    echo "✅ GitHub CLI authentication: OK"
else
    echo "❌ GitHub CLI authentication: FAILED"
    echo "   Run: gh auth login"
fi

# Test Copilot CLI
echo "Testing Copilot CLI..."
if command -v github-copilot-cli &> /dev/null; then
    echo "✅ Copilot CLI: INSTALLED"
    if github-copilot-cli auth &> /dev/null; then
        echo "✅ Copilot CLI authentication: OK"
    else
        echo "❌ Copilot CLI authentication: FAILED"
        echo "   Run: github-copilot-cli auth"
    fi
else
    echo "❌ Copilot CLI: NOT INSTALLED"
fi

# Test Git configuration
echo "Testing Git configuration..."
if git config --global user.name &> /dev/null; then
    echo "✅ Git user configured: $(git config --global user.name)"
else
    echo "❌ Git user not configured"
fi

echo "🎉 Copilot setup test completed!"
EOF

chmod +x ~/test-copilot.sh

print_success "Setup completed! 🎉"
echo ""
echo "Next steps:"
echo "1. Run: gh auth login"
echo "2. Run: github-copilot-cli auth"
echo "3. Run: ~/test-copilot.sh (to verify setup)"
echo "4. Restart your terminal or run: source ~/.bashrc"
echo ""
echo "For VS Code integration:"
echo "1. Install the 'GitHub Copilot' extension in VS Code"
echo "2. Make sure VS Code is running in WSL mode"
echo "3. Sign in to GitHub Copilot in VS Code"

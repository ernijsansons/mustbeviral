#!/bin/bash

# Frontend Deployment Script for Must Be Viral V2
# This script provides multiple deployment options for the frontend

echo "🚀 Must Be Viral V2 - Frontend Deployment Script"
echo "================================================"

# Configuration
FRONTEND_DIR="mustbeviral"
DIST_DIR="mustbeviral/dist"
GITHUB_REPO="ernijsansons/must-be-viral-v2"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if dist folder exists
if [ ! -d "$DIST_DIR" ]; then
    echo -e "${RED}Error: Build directory not found at $DIST_DIR${NC}"
    echo "Please run 'npm run build' in the mustbeviral directory first."
    exit 1
fi

echo -e "${GREEN}✓ Build directory found${NC}"

# Deployment Options Menu
echo ""
echo "Select deployment method:"
echo "1) GitHub Pages (Recommended - No API token required)"
echo "2) Netlify Drop (Manual - Drag & drop deployment)"
echo "3) Vercel (Using Vercel CLI)"
echo "4) Surge.sh (Quick & simple deployment)"
echo "5) Manual upload instructions"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo -e "${YELLOW}Deploying to GitHub Pages...${NC}"
        echo ""
        echo "Instructions:"
        echo "1. Create a new repository on GitHub if not already created"
        echo "2. Initialize git in the dist directory:"
        echo "   cd $DIST_DIR"
        echo "   git init"
        echo "   git add ."
        echo "   git commit -m 'Deploy Must Be Viral V2'"
        echo "   git branch -M gh-pages"
        echo "   git remote add origin https://github.com/$GITHUB_REPO.git"
        echo "   git push -u origin gh-pages"
        echo ""
        echo "3. Go to repository settings > Pages"
        echo "4. Set source to 'Deploy from a branch' and select 'gh-pages'"
        echo "5. Your site will be available at: https://ernijsansons.github.io/must-be-viral-v2/"
        echo ""
        echo "Alternative: Use GitHub Actions (create .github/workflows/deploy.yml)"
        ;;

    2)
        echo -e "${YELLOW}Deploying to Netlify Drop...${NC}"
        echo ""
        echo "Instructions:"
        echo "1. Open https://app.netlify.com/drop in your browser"
        echo "2. Drag the '$DIST_DIR' folder to the browser window"
        echo "3. Netlify will automatically deploy your site"
        echo "4. You'll get a unique URL like: https://amazing-site-123.netlify.app"
        echo "5. You can claim a custom domain or connect your own"
        echo ""
        echo "No account required for testing!"
        ;;

    3)
        echo -e "${YELLOW}Deploying to Vercel...${NC}"
        echo ""
        echo "Instructions:"
        echo "1. Install Vercel CLI: npm i -g vercel"
        echo "2. Run: cd $DIST_DIR && vercel"
        echo "3. Follow the prompts to deploy"
        echo "4. Your site will be available at a .vercel.app URL"
        echo ""
        echo "Command to run:"
        echo "  cd $DIST_DIR && npx vercel --prod"
        ;;

    4)
        echo -e "${YELLOW}Deploying to Surge.sh...${NC}"
        echo ""
        echo "Instructions:"
        echo "1. Install Surge: npm i -g surge"
        echo "2. Run: cd $DIST_DIR && surge"
        echo "3. Choose a domain (e.g., must-be-viral.surge.sh)"
        echo "4. Your site will be live immediately!"
        echo ""
        echo "Command to run:"
        echo "  cd $DIST_DIR && npx surge"
        ;;

    5)
        echo -e "${YELLOW}Manual Upload Instructions...${NC}"
        echo ""
        echo "The frontend build is ready at: $DIST_DIR"
        echo ""
        echo "You can manually upload this folder to any of these services:"
        echo ""
        echo "📦 Static Hosting Services:"
        echo "   - Cloudflare Pages (pages.cloudflare.com) - Drag & drop"
        echo "   - Netlify (netlify.com) - Drag & drop"
        echo "   - Vercel (vercel.com) - Import from folder"
        echo "   - Render (render.com) - Static site hosting"
        echo "   - Firebase Hosting (firebase.google.com)"
        echo ""
        echo "📁 Required files (all in $DIST_DIR):"
        echo "   - index.html (entry point)"
        echo "   - assets/ (JavaScript and CSS files)"
        echo "   - All other static files"
        echo ""
        echo "⚙️ Important Settings:"
        echo "   - Set build command to: (skip, already built)"
        echo "   - Set output directory to: /"
        echo "   - Enable SPA routing (for React Router)"
        ;;

    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Deployment instructions complete!${NC}"
echo ""
echo "Backend APIs are already live at:"
echo "  - Main API: https://must-be-viral-prod.ernijs-ansons.workers.dev"
echo "  - Payment: https://must-be-viral-payment-prod.ernijs-ansons.workers.dev"
echo "  - WebSocket: https://must-be-viral-websocket-prod.ernijs-ansons.workers.dev"
echo ""
echo "Don't forget to update your frontend's API_URL in the environment!"
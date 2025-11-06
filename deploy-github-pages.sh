#!/bin/bash

# Deploy script for GitHub Pages
# This script builds the app and deploys it to dave-doty/automata repository

set -e  # Exit on any error

echo "🚀 Deploying automata-solid to GitHub Pages..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PAGES_REPO="https://github.com/dave-doty/automata.git"
TEMP_DIR="automata-github-pages"

# Step 1: Build the application
echo -e "${BLUE}📦 Building application...${NC}"
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

# Step 2: Clone or update the GitHub Pages repository
if [ -d "$TEMP_DIR" ]; then
    echo -e "${BLUE}🔄 Updating existing repository...${NC}"
    cd "$TEMP_DIR"
    git fetch origin
    git reset --hard origin/main
    cd ..
else
    echo -e "${BLUE}📥 Cloning GitHub Pages repository...${NC}"
    git clone "$PAGES_REPO" "$TEMP_DIR"
fi

# Step 3: Replace content
echo -e "${BLUE}🔄 Replacing content...${NC}"
cd "$TEMP_DIR"

# Remove old files (but keep .git and README.md)
# Use git to remove tracked files (safer and more reliable)
echo -e "${BLUE}🗑️  Removing old files...${NC}"
# Remove all tracked files except README.md
git ls-files | grep -v '^README.md$' | xargs -r git rm -rf --
# Remove untracked files and directories except README.md
git clean -fdx -e README.md

# Copy new build files
echo -e "${BLUE}📋 Copying new build files...${NC}"
cp -r ../dist/* .

# Step 4: Check if there are changes to commit
if git diff --quiet && git diff --staged --quiet; then
    echo -e "${GREEN}✅ No changes to deploy${NC}"
    cd ..
    exit 0
fi

# Step 5: Commit and push
echo -e "${BLUE}📤 Committing and pushing changes...${NC}"

# Configure git user from parent repo if not already set
if [ -z "$(git config user.name)" ] || [ -z "$(git config user.email)" ]; then
    echo -e "${BLUE}⚙️  Configuring git identity...${NC}"
    PARENT_NAME=$(cd .. && git config user.name 2>/dev/null || echo "")
    PARENT_EMAIL=$(cd .. && git config user.email 2>/dev/null || echo "")
    
    if [ -n "$PARENT_NAME" ]; then
        git config user.name "$PARENT_NAME"
    else
        git config user.name "Deployment Script"
    fi
    
    if [ -n "$PARENT_EMAIL" ]; then
        git config user.email "$PARENT_EMAIL"
    else
        git config user.email "noreply@github.com"
    fi
fi

git add .

# Create a commit message with timestamp
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
git commit -m "Update to new TypeScript/SolidJS automata app

Deployed on: $TIMESTAMP

- Replace old Elm-based app with modern TypeScript/SolidJS version
- Improved performance and maintainability  
- Enhanced error reporting and YAML parsing
- Fixed TM tape handling bugs"

git push origin main

cd ..

echo -e "${GREEN}✅ Successfully deployed to https://dave-doty.github.io/automata/${NC}"
echo -e "${GREEN}🌐 Changes should be live in a few minutes${NC}"
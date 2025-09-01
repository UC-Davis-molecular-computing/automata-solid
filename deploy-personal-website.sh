#!/bin/bash

# Deployment script for automata-ts
# Builds the project and uploads to server

set -e  # Exit on any error

echo "🔨 Building project..."
npm run build

echo "📁 Uploading files to server..."
# Upload contents of dist/ to server (not the dist folder itself)
scp -r dist/* $d:public_html/automata/

echo "✅ Deployment complete!"
echo "🌐 Site should be available at: https://web.cs.ucdavis.edu/~doty/automata/"

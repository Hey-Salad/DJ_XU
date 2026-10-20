#!/bin/bash

# Deploy DJ XU to Cloudflare Pages
# Make sure you have CLOUDFLARE_API_TOKEN set in your environment

echo "🚀 Deploying DJ XU to Cloudflare Pages..."
echo ""

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ dist folder not found. Building project first..."
    npm run build
fi

# Deploy to Pages
# CLOUDFLARE_API_TOKEN comes from the environment (see DEPLOYMENT_GUIDE.md); never put it in this file.
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
    echo "❌ CLOUDFLARE_API_TOKEN is not set. export it from your secret store first."
    exit 1
fi
npx wrangler@latest pages deploy dist --project-name=dj-xu --branch=production

echo ""
echo "✅ Deployment complete!"
echo ""
echo "⚠️  IMPORTANT: Make sure to set environment variables in Cloudflare dashboard:"
echo "   https://dash.cloudflare.com → Workers & Pages → dj-xu → Settings → Environment variables"

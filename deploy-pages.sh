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
export CLOUDFLARE_API_TOKEN=<redacted cloudflare-api-key …Y30b>
npx wrangler@latest pages deploy dist --project-name=dj-xu --branch=production

echo ""
echo "✅ Deployment complete!"
echo ""
echo "⚠️  IMPORTANT: Make sure to set environment variables in Cloudflare dashboard:"
echo "   https://dash.cloudflare.com → Workers & Pages → dj-xu → Settings → Environment variables"

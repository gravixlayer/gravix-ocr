#!/bin/bash

# Vercel Deployment Script for GravixOCR
# This script automates the deployment process to Vercel

echo "🚀 Starting GravixOCR deployment to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Build the project
echo "🔨 Building the project..."
npm run build

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set your GRAVIXLAYER_API_KEY in Vercel dashboard"
echo "2. Go to your Vercel project settings"
echo "3. Add environment variable: GRAVIXLAYER_API_KEY"
echo "4. Redeploy if needed"
echo ""
echo "🔗 Your app will be available at your Vercel domain"

#!/bin/bash

# Disaster Response Platform Deployment Script
echo "🚀 Starting deployment process..."

# Build frontend
echo "📦 Building frontend..."
cd client
npm run build
cd ..

# Create deployment package
echo "📁 Creating deployment package..."
rm -rf deployment-package
mkdir deployment-package

# Copy necessary files
cp -r client/build deployment-package/frontend
cp -r routes deployment-package/
cp -r services deployment-package/
cp -r middleware deployment-package/
cp -r utils deployment-package/
cp -r database deployment-package/
cp server.js deployment-package/
cp package.json deployment-package/
cp package-lock.json deployment-package/
cp .env.example deployment-package/
cp README.md deployment-package/
cp SUBMISSION_NOTE.md deployment-package/

# Create zip file
echo "🗜️ Creating zip file..."
zip -r disaster-response-platform.zip deployment-package/

echo "✅ Deployment package created: disaster-response-platform.zip"
echo "📋 Next steps:"
echo "1. Push code to GitHub"
echo "2. Deploy frontend to Vercel"
echo "3. Deploy backend to Render"
echo "4. Submit the zip file with your assignment" 
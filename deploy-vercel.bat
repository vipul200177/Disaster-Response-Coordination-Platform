@echo off
echo 🚀 Deploying Disaster Response Platform to Vercel...
echo ================================================

echo.
echo 📦 Step 1: Setting up Vercel project...
echo.

REM Set project name manually to avoid folder name issues
vercel --prod --yes --name disaster-response-platform

echo.
echo ✅ Deployment completed!
echo.
echo 🌐 Your application should now be live at the URL shown above
echo.
pause 
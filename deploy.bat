@echo off
echo 🚀 Disaster Response Platform Deployment Script
echo ================================================

echo.
echo Choose deployment option:
echo 1. Vercel (Full-Stack - Recommended)
echo 2. Render (Full-Stack)
echo 3. Netlify + Render (Separate)
echo 4. Test locally only
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo 📦 Deploying to Vercel...
    echo Installing Vercel CLI...
    npm install -g vercel
    echo.
    echo 🚀 Starting Vercel deployment...
    vercel --prod
) else if "%choice%"=="2" (
    echo.
    echo 📦 Deploying to Render...
    echo Please:
    echo 1. Push your code to GitHub
    echo 2. Go to https://render.com
    echo 3. Connect your GitHub repository
    echo 4. Choose "Web Service"
    echo 5. Set build command: npm install
    echo 6. Set start command: npm start
    echo 7. Deploy!
    pause
) else if "%choice%"=="3" (
    echo.
    echo 📦 Deploying to Netlify + Render...
    echo Please:
    echo 1. Deploy backend to Render first
    echo 2. Update netlify.toml with your backend URL
    echo 3. Deploy frontend to Netlify
    pause
) else if "%choice%"=="4" (
    echo.
    echo 🧪 Testing locally...
    echo Starting server...
    npm start
) else (
    echo Invalid choice!
    pause
)

echo.
echo ✅ Deployment script completed!
pause 
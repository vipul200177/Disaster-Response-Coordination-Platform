@echo off
echo ========================================
echo Disaster Response Platform - GitHub Setup
echo ========================================
echo.

echo Please follow these steps:
echo.
echo 1. Go to https://github.com
echo 2. Create a new repository named: disaster-response-coordination-platform
echo 3. Make it PUBLIC
echo 4. Copy the repository URL
echo.
echo After creating the repository, enter your GitHub username below:
echo.

set /p username="Enter your GitHub username: "

echo.
echo Adding remote origin...
git remote add origin https://github.com/%username%/disaster-response-coordination-platform.git

echo.
echo Pushing to GitHub...
git push -u origin master

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Your repository should now be available at:
echo https://github.com/%username%/disaster-response-coordination-platform
echo.
pause 
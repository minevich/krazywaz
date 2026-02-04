@echo off
echo ==========================================
echo    Deploying Rabbi Kraz Website Updates
echo ==========================================
echo.
echo 1. Configuring Remote...
:: Try adding, if fails (already exists), set url
git remote add origin https://github.com/rabbikraz/krazywaz.git 2>NUL
git remote set-url origin https://github.com/rabbikraz/krazywaz.git

echo 2. Adding files...
git add .

echo 3. Committing changes...
git commit -m "Refactor: Site restructuring, Contact API, and Playlist Viewer"

echo 4. Pushing to origin/main...
git branch -M main
git push -u origin main

echo.
echo ==========================================
echo    Success! Check GitHub.
echo ==========================================
pause

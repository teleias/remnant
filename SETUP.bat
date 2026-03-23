@echo off
cd /d "%~dp0"

echo ============================================
echo  REMNANT - Setup Script
echo  A Game by Christian Claudio
echo ============================================
echo.
echo  Running from: %cd%
echo.

if not exist "package.json" (
    echo [ERROR] package.json not found in %cd%
    echo.
    echo  Make sure all files from inside the "remnant"
    echo  folder in the zip are directly in this folder.
    echo  package.json should be right next to SETUP.bat
    echo.
    pause
    exit /b 1
)
echo [OK] Project files found.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo  Opening download page for you...
    start https://nodejs.org
    echo.
    echo  Install the LTS version, restart your computer,
    echo  then double click SETUP.bat again.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do echo [OK] Node.js %%v
echo.

echo [INSTALLING] Dependencies (may take a minute)...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)
echo [OK] Dependencies installed.
echo.

echo [BUILDING] Game...
call npx vite build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Build failed.
    pause
    exit /b 1
)
echo [OK] Game built.
echo.

echo ============================================
echo  SETUP COMPLETE
echo ============================================
echo.
echo  PLAY.bat   = Launch game in browser
echo  BUILD.bat  = Open Claude Code to develop
echo ============================================
pause

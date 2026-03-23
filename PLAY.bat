@echo off
cd /d "%~dp0"

echo ============================================
echo  REMNANT - Starting Dev Server
echo ============================================
echo.
echo  Game will open in your browser automatically.
echo  Press Ctrl+C to stop the server.
echo.

if not exist "node_modules" (
    echo [NOTE] Running setup first...
    call npm install >nul 2>&1
)

call npm run dev
pause

@echo off
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║         🧠 SOMA COGNITIVE TERMINAL - ELECTRON APP 🧠         ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Starting SOMA Cognitive Terminal...
echo.

cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules\" (
    echo ⚠️  Dependencies not installed. Installing now...
    echo.
    call npm install --legacy-peer-deps
    echo.
    echo ✅ Dependencies installed
    echo.
)

REM Create desktop shortcut if it doesn't exist
if not exist "%USERPROFILE%\Desktop\SOMA Terminal.lnk" (
    echo.
    echo 🔗 Creating desktop shortcut...
    powershell -ExecutionPolicy Bypass -File "%~dp0create-desktop-shortcut.ps1"
    echo.
)

echo 🚀 Launching Electron app...
echo 📝 Starting backend server...
echo 🪟 Electron window will open shortly...
echo.

REM Start Electron in production mode (uses pre-built dist)
electron .

if errorlevel 1 (
    echo.
    echo ❌ Error starting app. Check the output above.
    echo.
)

pause

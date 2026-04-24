@echo off
echo ===============================================================================
echo   SOMA ULTRA - HIGH-EFFICIENCY MODE (2015 ANVIL EDITION)
echo ===============================================================================
echo.
echo   [1] Setting Environment to RESOURCE_GUARD...
set NODE_ENV=production
set SOMA_MODE=single
set SOMA_GPU=false
set SOMA_LOAD_HEAVY=false
set SOMA_LOAD_TRADING=true
set SOMA_HYBRID_SEARCH=false
set SOMA_LOAD_VISION=false

echo   [2] Memory Limits: 2048MB Reserved for SOMA Core.
echo.

echo   [3] Starting SOMA ULTRA (Efficient Core)...
set HOST=0.0.0.0
echo       - Network: OPEN (Accessible via your local IP)
echo       - Medical Lab: ENABLED
echo       - Engineering Swarm: ENABLED
echo       - Vision/Heavy: DISABLED
echo.
echo   Access the dashboard at: http://localhost:3001
echo.

node --max-old-space-size=2048 --expose-gc launcher_ULTRA.mjs
pause

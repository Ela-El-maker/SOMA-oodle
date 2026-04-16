# SOMA Complete Startup Script
Write-Host "🧠 Starting SOMA Cognitive Terminal..." -ForegroundColor Cyan

# Kill any existing processes on required ports
Write-Host "Cleaning up ports..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 3001,3002 -ErrorAction SilentlyContinue | 
    Select-Object -ExpandProperty OwningProcess | 
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

# Start backend server
Write-Host "Starting backend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node server/index.cjs"

# Wait for backend to be ready
Write-Host "Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start Electron app
Write-Host "Starting Electron app..." -ForegroundColor Green
npm run electron:dev

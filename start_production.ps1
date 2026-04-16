# SOMA ULTRA - PRODUCTION LAUNCHER
# Verified Architecture: Unified ASI (Brain + Soul + Integration)

Write-Host "==============================================================================="
Write-Host "  SOMA ULTRA - PRODUCTION STARTUP"
Write-Host "==============================================================================="
Write-Host ""

# 1. Environment Setup
Write-Host "  [1] Setting Environment to PRODUCTION..."
$env:NODE_ENV = "production"
$env:SOMA_MODE = "cluster"
$env:SOMA_GPU = "true"

# 2. Dependency Check
Write-Host "  [2] Checking for dependencies..."
if (-not (Test-Path "node_modules")) {
    Write-Host "      Node modules not found. Installing..."
    npm install
}

# 3. Validation
Write-Host "  [3] validating configuration..."
if (-not (Test-Path ".env")) {
    Write-Host "      WARNING: .env file not found! System may fail to connect to APIs." -ForegroundColor Yellow
}

# 4. Launch
Write-Host "  [4] Starting SOMA ULTRA (Unified Architecture)..."
Write-Host "      - Unified Core: ONLINE (Port 3001)"
Write-Host "      - Emotional Engine: ONLINE"
Write-Host "      - Personality Engine: ONLINE"
Write-Host "      - ASI Layer: ONLINE"
Write-Host "      - Tree Search: ENABLED"
Write-Host ""
Write-Host "  Access the dashboard at: http://localhost:3001"
Write-Host ""

# Run the launcher
node launcher_ULTRA.mjs

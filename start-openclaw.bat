@echo off
echo Starting OpenClaw Gateway for SOMA...
set OPENCLAW_STATE_DIR=%CD%\vendor\openclaw-data
set OPENCLAW_LOG_DIR=%CD%\vendor\openclaw-data\logs
mkdir "%OPENCLAW_LOG_DIR%" 2>nul

echo [SOMA] Connecting to Neural Link...
.\vendor\openclaw-cli\node_modules\.bin\openclaw.cmd gateway --port 19001 --allow-unconfigured --dev --token soma-secret-token
pause


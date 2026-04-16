@echo off
echo [PROPHET] Initializing SOMA ML Engine...
cd backend/prophet-engine

REM Check for venv
if not exist "venv" (
    echo [PROPHET] Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate
    echo [PROPHET] Installing dependencies...
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate
)

echo [PROPHET] Starting Flask Server on Port 5000...
python server.py
pause

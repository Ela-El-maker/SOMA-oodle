@echo off
REM run-training-aurora.bat
REM Manually triggers AURORA lobe LoRA training against current knowledge library.
REM Produces soma-aurora:latest in Ollama.

REM Use venv python if available
if exist ".soma_venv\Scripts\python.exe" (
    set PYTHON=.soma_venv\Scripts\python.exe
) else (
    set PYTHON=python
    echo [SOMA Train] WARNING: .soma_venv not found -- using system python
    echo [SOMA Train] Run setup-training.bat first for best results
)

REM Build JSONL from knowledge library + seeds
echo [SOMA Train] Building AURORA training data from knowledge library...
%PYTHON% build-training-data.py --lobe aurora

REM Find the newest lobe-aurora-*.jsonl
for /f "delims=" %%i in ('dir /b /od /a-d "SOMA\training-data\lobe-aurora-*.jsonl" 2^>nul') do set LATEST=%%i

if not defined LATEST (
    echo [SOMA Train] ERROR: No training data found. Make sure SOMA has been running to build the knowledge library.
    pause
    exit /b 1
)

set DATA_PATH=SOMA\training-data\%LATEST%
set OUTPUT_DIR=models\soma-aurora-%DATE:~-4,4%%DATE:~-7,2%%DATE:~-10,2%

echo [SOMA Train] Data: %DATA_PATH%
echo [SOMA Train] Output: %OUTPUT_DIR%
echo [SOMA Train] Model: google/gemma-3-4b-it
echo [SOMA Train] This will take 30-90 minutes depending on GPU.
echo.

%PYTHON% train-soma-llama.py ^
    --data "%DATA_PATH%" ^
    --output "%OUTPUT_DIR%" ^
    --model google/gemma-3-4b-it ^
    --epochs 3 ^
    --batch-size 2 ^
    --max-seq-len 2048 ^
    --lobe aurora

if errorlevel 1 (
    echo [SOMA Train] Training failed. Check output above for errors.
    pause
    exit /b 1
)

echo.
echo [SOMA Train] Training complete! Test with:
echo   ollama run soma-aurora:latest
pause

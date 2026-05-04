@echo off
REM setup-training.bat
REM Creates .soma_venv and installs all LoRA training dependencies.
REM Run this ONCE before first training. Takes 5-10 min.

echo [SOMA Setup] Creating Python virtual environment...
python -m venv .soma_venv
if errorlevel 1 (
    echo [SOMA Setup] ERROR: python not found. Install Python 3.10+ from python.org
    pause
    exit /b 1
)

echo [SOMA Setup] Activating venv...
call .soma_venv\Scripts\activate.bat

echo [SOMA Setup] Installing PyTorch with CUDA 12.4...
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124 --quiet
if errorlevel 1 (
    echo [SOMA Setup] ERROR: PyTorch install failed. Check your internet connection.
    pause
    exit /b 1
)

echo [SOMA Setup] Installing unsloth...
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git" --quiet
if errorlevel 1 (
    echo [SOMA Setup] Trying stable unsloth release...
    pip install unsloth --quiet
)

echo [SOMA Setup] Installing training dependencies...
pip install -r requirements-training.txt --quiet

echo.
echo [SOMA Setup] Verifying GPU...
python -c "import torch; print('[SOMA Setup] CUDA available:', torch.cuda.is_available()); print('[SOMA Setup] GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'NONE')"

echo.
echo [SOMA Setup] Done! Run run-training-logos.bat to train the first lobe.
pause

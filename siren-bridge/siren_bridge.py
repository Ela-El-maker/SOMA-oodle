"""
SOMA Siren Bridge — launches the real Fish-Speech API server on port 8080.
Replaces the previous sine-wave stub with actual neural TTS.
"""
import os
import sys
import subprocess
from pathlib import Path

# Paths
BRIDGE_DIR  = Path(__file__).parent
ENGINE_DIR  = BRIDGE_DIR / "engine"
WEIGHTS_DIR = BRIDGE_DIR / "weights"
PYTHON      = str(BRIDGE_DIR / ".venv" / "Scripts" / "python.exe")

LLAMA_CKPT    = str(WEIGHTS_DIR)
DECODER_CKPT  = str(WEIGHTS_DIR / "firefly-gan-vq-fsq-8x1024-21hz-generator.pth")
API_SCRIPT    = str(ENGINE_DIR / "tools" / "api.py")

if __name__ == "__main__":
    log_path = BRIDGE_DIR / "siren_bridge.log"
    err_path  = BRIDGE_DIR / "siren_bridge_err.log"

    print("[Siren] Launching Fish-Speech neural TTS on port 8080...")
    print(f"[Siren]   Llama checkpoint : {LLAMA_CKPT}")
    print(f"[Siren]   Decoder checkpoint: {DECODER_CKPT}")
    print(f"[Siren]   Logs -> {log_path}")

    cmd = [
        PYTHON, API_SCRIPT,
        "--llama-checkpoint-path", LLAMA_CKPT,
        "--decoder-checkpoint-path", DECODER_CKPT,
        "--listen", "0.0.0.0:8080",
        "--device", "cuda",
        "--half",
    ]

    env = os.environ.copy()
    env["PYTHONPATH"] = str(ENGINE_DIR)

    with open(log_path, "w") as out, open(err_path, "w") as err:
        subprocess.run(cmd, cwd=str(ENGINE_DIR), env=env, stdout=out, stderr=err)

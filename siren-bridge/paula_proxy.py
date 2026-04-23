"""
Paula TTS Proxy — wraps Fish-Speech /v1/tts with Paula's reference audio (voice cloning).
Listens on port 8081. Accepts JSON {"text": "..."}, returns audio/wav bytes.
Falls through to plain Fish-Speech if reference audio unavailable.
"""
import json
import os
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import requests
import ormsgpack

# Make engine/tools importable
BRIDGE_DIR = Path(__file__).parent
ENGINE_DIR  = BRIDGE_DIR / "engine"
sys.path.insert(0, str(ENGINE_DIR))

from tools.commons import ServeReferenceAudio, ServeTTSRequest

FISH_URL = os.environ.get("FISH_SPEECH_URL", "http://localhost:8080") + "/v1/tts"

PAULA_REF_AUDIO_PATH = BRIDGE_DIR / "paula_reference.mp3"
PAULA_REF_TEXT = (
    "Hi everyone, I'm excited to share some insights about building strong "
    "professional relationships. Remember, authentic connections are built on "
    "trust and mutual respect. Take time to listen, show genuine interest, and "
    "always follow through on your commitments."
)

# Load reference audio once at startup
if PAULA_REF_AUDIO_PATH.exists():
    with open(PAULA_REF_AUDIO_PATH, "rb") as f:
        PAULA_REF_BYTES = f.read()
    print(f"[Paula] Reference audio loaded — {len(PAULA_REF_BYTES):,} bytes")
else:
    PAULA_REF_BYTES = None
    print(f"[Paula] WARNING: reference audio not found at {PAULA_REF_AUDIO_PATH}")
    print("[Paula]          Will use Fish-Speech default voice.")


class PaulaHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            status = "ready" if PAULA_REF_BYTES else "no_reference"
            self.wfile.write(json.dumps({"status": status}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path not in ("/tts", "/v1/tts"):
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        body   = self.rfile.read(length)

        try:
            data = json.loads(body)
            text = data.get("text", "").strip()
        except Exception:
            self.send_response(400)
            self.end_headers()
            return

        if not text:
            self.send_response(400)
            self.end_headers()
            return

        # Build ServeTTSRequest — with Paula ref if available, plain otherwise
        references = []
        if PAULA_REF_BYTES:
            references = [ServeReferenceAudio(audio=PAULA_REF_BYTES, text=PAULA_REF_TEXT)]

        tts_req = ServeTTSRequest(
            text=text,
            references=references,
            format="wav",
            streaming=False,
            latency="balanced",
        )

        try:
            t0 = time.time()
            resp = requests.post(
                FISH_URL,
                data=ormsgpack.packb(tts_req, option=ormsgpack.OPT_SERIALIZE_PYDANTIC),
                headers={"content-type": "application/msgpack"},
                timeout=30,
            )
            elapsed = time.time() - t0

            if resp.status_code == 200:
                print(f"[Paula] synthesized {len(text)} chars in {elapsed:.1f}s ({len(resp.content):,} bytes)")
                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Content-Length", str(len(resp.content)))
                self.end_headers()
                self.wfile.write(resp.content)
            else:
                print(f"[Paula] Fish-Speech returned {resp.status_code}: {resp.text[:200]}")
                self.send_response(resp.status_code)
                self.end_headers()
                self.wfile.write(resp.content)

        except requests.exceptions.ConnectionError:
            print("[Paula] Fish-Speech not reachable on :8080")
            self.send_response(503)
            self.end_headers()
        except Exception as e:
            print(f"[Paula] Unexpected error: {e}")
            self.send_response(500)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # silence default access log (we have our own)


if __name__ == "__main__":
    port = int(os.environ.get("PAULA_PORT", 8081))
    server = HTTPServer(("0.0.0.0", port), PaulaHandler)
    print(f"[Paula] Voice proxy running on http://0.0.0.0:{port}")
    print(f"[Paula] Forwarding to Fish-Speech: {FISH_URL}")
    server.serve_forever()

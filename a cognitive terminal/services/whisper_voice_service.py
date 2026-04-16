"""
Local Voice Recognition using Whisper
Runs on your GPU - NO INTERNET NEEDED!
Full conversation with SOMA
"""

import whisper
import sounddevice as sd
import numpy as np
import json
import sys
import queue
import threading
from scipy.io.wavfile import write
import tempfile
import os

class WhisperVoiceService:
    """Local speech recognition using Whisper on GPU"""

    def __init__(self, model_size='base'):
        """
        model_size options:
        - tiny: Fastest, less accurate
        - base: Good balance (RECOMMENDED)
        - small: More accurate, slower
        - medium: Very accurate, slow
        - large: Best accuracy, very slow
        """
        print(f"[Whisper] Loading {model_size} model...", file=sys.stderr)

        # Load model on GPU
        self.model = whisper.load_model(model_size, device='cuda')

        print(f"[Whisper] Model loaded on GPU!", file=sys.stderr)

        # Audio settings
        self.sample_rate = 16000
        self.channels = 1
        self.recording = False
        self.audio_queue = queue.Queue()

    def record_audio(self, duration=5):
        """Record audio from microphone"""
        print(f"[Whisper] 🎤 Recording for {duration} seconds...", file=sys.stderr)

        # Record audio
        recording = sd.rec(
            int(duration * self.sample_rate),
            samplerate=self.sample_rate,
            channels=self.channels,
            dtype='float32'
        )
        sd.wait()  # Wait until recording is done

        print("[Whisper] ✅ Recording complete", file=sys.stderr)
        return recording

    def transcribe_audio(self, audio_data):
        """Transcribe audio using Whisper"""
        print("[Whisper] 🧠 Transcribing...", file=sys.stderr)

        # Save to temporary file (Whisper needs a file)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
            tmp_path = tmp_file.name
            write(tmp_path, self.sample_rate, audio_data)

        try:
            # Transcribe with Whisper (on GPU!)
            result = self.model.transcribe(
                tmp_path,
                fp16=True,  # Use GPU acceleration
                language='en'
            )

            text = result['text'].strip()
            print(f"[Whisper] ✅ Transcribed: '{text}'", file=sys.stderr)
            return text

        finally:
            # Cleanup temp file
            try:
                os.unlink(tmp_path)
            except:
                pass

    def listen_once(self, duration=5):
        """Listen and transcribe once"""
        audio = self.record_audio(duration)
        text = self.transcribe_audio(audio)
        return text

    def continuous_listen(self, callback, chunk_duration=3):
        """Continuous listening mode"""
        print("[Whisper] 🎙️ Continuous listening started", file=sys.stderr)

        self.recording = True

        def audio_callback(indata, frames, time, status):
            if status:
                print(f"[Whisper] Audio status: {status}", file=sys.stderr)
            self.audio_queue.put(indata.copy())

        # Start audio stream
        with sd.InputStream(
            callback=audio_callback,
            channels=self.channels,
            samplerate=self.sample_rate
        ):
            buffer = []
            frames_per_chunk = int(chunk_duration * self.sample_rate)

            while self.recording:
                try:
                    # Get audio chunk
                    data = self.audio_queue.get(timeout=0.1)
                    buffer.append(data)

                    # When we have enough for a chunk
                    if len(buffer) * len(buffer[0]) >= frames_per_chunk:
                        # Concatenate and transcribe
                        audio_chunk = np.concatenate(buffer)
                        text = self.transcribe_audio(audio_chunk)

                        if text and len(text) > 0:
                            callback(text)

                        buffer = []

                except queue.Empty:
                    continue

    def stop_listening(self):
        """Stop continuous listening"""
        self.recording = False
        print("[Whisper] 🛑 Stopped listening", file=sys.stderr)


# ==========================================
# FLASK SERVER FOR ROBUST LOCAL API
# ==========================================
from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile

app = Flask(__name__)
CORS(app) # Enable CORS for frontend access

service = None

@app.route('/transcribe', methods=['POST'])
def transcribe_endpoint():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    tmp_path = None
    
    try:
        # Save to temp file with explicit directory
        tmp_fd, tmp_path = tempfile.mkstemp(suffix='.webm')
        os.close(tmp_fd)  # Close file descriptor immediately
        
        # Save uploaded file
        audio_file.save(tmp_path)
        
        # Transcribe
        result = service.model.transcribe(tmp_path, fp16=True)
        text = result['text'].strip()
        print(f"[API] Transcribed: {text}", file=sys.stderr)
        return jsonify({'text': text})
    except Exception as e:
        print(f"[API] Error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except:
                pass

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'online', 'model': 'loaded'})

def run_server(port=5002, model_size='base'):
    global service
    service = WhisperVoiceService(model_size=model_size)
    print(f"🚀 Whisper API Server running on port {port}", file=sys.stderr)
    app.run(host='0.0.0.0', port=port)

def main():
    """CLI interface"""
    import argparse

    parser = argparse.ArgumentParser(description='Whisper Voice Service')
    parser.add_argument('--command', type=str, default='server',
                       choices=['listen_once', 'test', 'server'],
                       help='Command to execute')
    parser.add_argument('--duration', type=int, default=5,
                       help='Recording duration in seconds')
    parser.add_argument('--model', type=str, default='base',
                       choices=['tiny', 'base', 'small', 'medium', 'large'],
                       help='Whisper model size')
    parser.add_argument('--port', type=int, default=5002,
                       help='Server port')

    args = parser.parse_args()

    if args.command == 'server':
        run_server(port=args.port, model_size=args.model)
        
    elif args.command == 'listen_once':
        # Initialize service just for this command
        service = WhisperVoiceService(model_size=args.model)
        text = service.listen_once(duration=args.duration)
        result = {
            'success': True,
            'text': text,
            'duration': args.duration
        }
        print(json.dumps(result))

    elif args.command == 'test':
        service = WhisperVoiceService(model_size=args.model)
        print("\n=== Whisper Voice Test ===", file=sys.stderr)
        print("Speak now...", file=sys.stderr)
        text = service.listen_once(duration=args.duration)

        result = {
            'success': True,
            'text': text,
            'message': 'Voice recognition working!'
        }
        print(json.dumps(result))


if __name__ == '__main__':
    main()

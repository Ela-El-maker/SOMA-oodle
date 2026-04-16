"""
SOMA Whisper Flask Server - Local Voice Transcription API
Provides HTTP endpoint for voice recognition using Whisper
Port: 5002
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import tempfile
import os
import sys
from werkzeug.utils import secure_filename

# Ensure local ffmpeg is in PATH
bin_path = os.path.join(os.path.dirname(__file__), 'bin')
if os.path.exists(bin_path):
    os.environ["PATH"] += os.pathsep + bin_path
    print(f"[Whisper Flask] Added {bin_path} to PATH", file=sys.stderr)

app = Flask(__name__)
# Enable CORS with explicit configuration for Orb frontend
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:*", "http://127.0.0.1:*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": False
    }
})

# Global Whisper model
model = None
MODEL_SIZE = 'base'  # base model - good balance of speed/accuracy

def init_whisper():
    """Initialize Whisper model on startup"""
    global model
    print(f"[Whisper Flask] Loading {MODEL_SIZE} model...", file=sys.stderr, flush=True)

    try:
        # Try to load on CUDA (GPU) first
        model = whisper.load_model(MODEL_SIZE, device='cuda')
        print(f"[Whisper Flask] ✅ Model loaded on GPU!", file=sys.stderr, flush=True)
    except Exception as e:
        # Fallback to CPU
        print(f"[Whisper Flask] ⚠️ GPU not available, using CPU: {e}", file=sys.stderr, flush=True)
        model = whisper.load_model(MODEL_SIZE, device='cpu')
        print(f"[Whisper Flask] ✅ Model loaded on CPU", file=sys.stderr, flush=True)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'operational',
        'model': MODEL_SIZE,
        'device': 'cuda' if model.device.type == 'cuda' else 'cpu'
    })

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio file to text
    Expects: multipart/form-data with 'audio' file
    Returns: { "text": "transcribed text", "language": "en" }
    """
    try:
        print(f"[Whisper Flask] 📨 Received transcribe request", file=sys.stderr, flush=True)
        print(f"[Whisper Flask] 📋 Request headers: {dict(request.headers)}", file=sys.stderr, flush=True)
        print(f"[Whisper Flask] 📋 Request files: {list(request.files.keys())}", file=sys.stderr, flush=True)

        # Check if audio file is present
        if 'audio' not in request.files:
            print(f"[Whisper Flask] ❌ No 'audio' field in request.files", file=sys.stderr, flush=True)
            return jsonify({'error': 'No audio file provided', 'success': False}), 400

        audio_file = request.files['audio']

        if audio_file.filename == '':
            print(f"[Whisper Flask] ❌ Empty filename", file=sys.stderr, flush=True)
            return jsonify({'error': 'Empty filename', 'success': False}), 400

        # Get content length - may be None if not provided
        content_length = audio_file.content_length if audio_file.content_length else 'unknown'
        print(f"[Whisper Flask] 🎤 Received audio: {audio_file.filename} ({content_length} bytes)",
              file=sys.stderr, flush=True)

        # Determine file extension from content type or filename
        content_type = audio_file.content_type
        filename = secure_filename(audio_file.filename)
        
        # Map content types to extensions
        if 'webm' in content_type or filename.endswith('.webm'):
            suffix = '.webm'
        elif 'wav' in content_type or filename.endswith('.wav'):
            suffix = '.wav'
        elif 'mp3' in content_type or filename.endswith('.mp3'):
            suffix = '.mp3'
        elif 'ogg' in content_type or filename.endswith('.ogg'):
            suffix = '.ogg'
        elif 'm4a' in content_type or filename.endswith('.m4a'):
            suffix = '.m4a'
        else:
            suffix = '.webm'  # Default
        
        print(f"[Whisper Flask] 📁 Content-Type: {content_type}, Extension: {suffix}", file=sys.stderr, flush=True)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            tmp_path = tmp_file.name
            audio_file.save(tmp_path)
        
        # Verify file was saved
        file_size = os.path.getsize(tmp_path)
        print(f"[Whisper Flask] 💾 Saved {file_size} bytes to {tmp_path}", file=sys.stderr, flush=True)
        
        if file_size < 1000:
            print(f"[Whisper Flask] ⚠️ Warning: File size is very small ({file_size} bytes) - may be silence or corrupt", file=sys.stderr, flush=True)

        print(f"[Whisper Flask] 🧠 Transcribing...", file=sys.stderr, flush=True)

        try:
            # Transcribe with Whisper
            # Whisper uses FFmpeg internally to decode audio
            result = model.transcribe(
                tmp_path,
                fp16=(model.device.type == 'cuda'),  # Use FP16 on GPU
                language='en',  # Force English for faster processing
                task='transcribe',
                verbose=False  # Reduce console spam
            )

            text = result['text'].strip()
            language = result.get('language', 'en')

            print(f"[Whisper Flask] ✅ Transcribed: '{text}'", file=sys.stderr, flush=True)

            return jsonify({
                'text': text,
                'language': language,
                'success': True
            })

        except FileNotFoundError as e:
            # FFmpeg not found - provide helpful error
            error_msg = "FFmpeg not found. Whisper requires FFmpeg to decode audio files."
            print(f"[Whisper Flask] ❌ {error_msg}", file=sys.stderr, flush=True)
            print(f"[Whisper Flask] 💡 Install FFmpeg:", file=sys.stderr, flush=True)
            print(f"[Whisper Flask]    Windows: choco install ffmpeg OR download from https://ffmpeg.org/download.html", file=sys.stderr, flush=True)
            print(f"[Whisper Flask]    Original error: {e}", file=sys.stderr, flush=True)
            return jsonify({
                'error': error_msg,
                'success': False,
                'solution': 'Install FFmpeg: https://ffmpeg.org/download.html'
            }), 500
        
        except RuntimeError as e:
            # Audio decoding error (corrupt file, unsupported format, etc.)
            import traceback
            error_str = str(e)
            error_msg = "Audio decoding failed"
            
            # Provide specific guidance based on error
            if 'ffmpeg' in error_str.lower():
                error_msg = "FFmpeg failed to decode audio. Check FFmpeg installation and codec support."
            elif 'codec' in error_str.lower():
                error_msg = f"Unsupported audio codec. File format: {suffix}"
            else:
                error_msg = f"Audio decoding failed: {error_str}"
            
            full_trace = traceback.format_exc()
            print(f"[Whisper Flask] ❌ {error_msg}", file=sys.stderr, flush=True)
            print(f"[Whisper Flask] 📋 Error details: {error_str}", file=sys.stderr, flush=True)
            print(f"[Whisper Flask] 📋 Full trace:", file=sys.stderr, flush=True)
            print(full_trace, file=sys.stderr, flush=True)
            
            return jsonify({
                'error': error_msg,
                'success': False,
                'details': error_str
            }), 500

        except Exception as e:
            # Other transcription errors
            import traceback
            error_msg = f"Transcription failed: {str(e)}"
            full_trace = traceback.format_exc()
            print(f"[Whisper Flask] ❌ {error_msg}", file=sys.stderr, flush=True)
            print(f"[Whisper Flask] 📋 Full error trace:", file=sys.stderr, flush=True)
            print(full_trace, file=sys.stderr, flush=True)
            return jsonify({
                'error': error_msg,
                'success': False,
                'trace': full_trace if app.debug else None
            }), 500

        finally:
            # Cleanup temporary file
            try:
                os.unlink(tmp_path)
            except Exception as e:
                print(f"[Whisper Flask] ⚠️ Failed to delete temp file: {e}", file=sys.stderr, flush=True)

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Whisper Flask] ❌ Unexpected Error: {str(e)}", file=sys.stderr, flush=True)
        print(f"[Whisper Flask] 📋 Full trace:", file=sys.stderr, flush=True)
        print(error_trace, file=sys.stderr, flush=True)
        return jsonify({
            'error': str(e),
            'success': False,
            'trace': error_trace if app.debug else None
        }), 500

@app.route('/', methods=['GET'])
def root():
    """Root endpoint - service info"""
    return jsonify({
        'service': 'SOMA Whisper Transcription API',
        'version': '1.0.0',
        'model': MODEL_SIZE,
        'endpoints': {
            '/health': 'GET - Health check',
            '/transcribe': 'POST - Transcribe audio file'
        }
    })

if __name__ == '__main__':
    print("=" * 60, file=sys.stderr, flush=True)
    print("SOMA Whisper Flask Server", file=sys.stderr, flush=True)
    print("=" * 60, file=sys.stderr, flush=True)
    print("Starting on http://localhost:5002", file=sys.stderr, flush=True)
    print("Endpoint: POST /transcribe", file=sys.stderr, flush=True)
    print("=" * 60, file=sys.stderr, flush=True)

    # Initialize model before starting server
    init_whisper()

    # Start Flask server
    app.run(
        host='0.0.0.0',
        port=5002,
        debug=True,  # Enable debug mode to see detailed errors
        threaded=True  # Handle concurrent requests
    )

import os
from typing import Optional
from flask import Blueprint, request, Response, jsonify
from flask_jwt_extended import jwt_required
import requests

TTS_API_BASE = "https://api.elevenlabs.io/v1"

tts_bp = Blueprint("tts", __name__)


def _get_api_key() -> Optional[str]:
    # Prefer backend-specific var, fallback to generic
    return os.getenv("ELEVENLABS_API_KEY") or os.getenv("XI_API_KEY")


@tts_bp.route("/tts/speak", methods=["POST"])
@jwt_required()
def tts_speak():
    """
    Proxy Text-to-Speech via ElevenLabs API.
    Request JSON:
      - text: string (required)
      - voice_id: string (optional; default is Rachel)
      - model_id: string (optional; default eleven_multilingual_v2)
      - output_format: string (optional; default mp3_44100_128)
    Returns audio stream (audio/mpeg) on success.
    """
    try:
        payload = request.get_json() or {}
        text = (payload.get("text") or "").strip()
        if not text:
            return jsonify({"error": "Missing 'text'"}), 400

        voice_id = payload.get("voice_id") or "JBFqnCBsd6RMkjVDRZzb"
        model_id = payload.get("model_id") or "eleven_multilingual_v2"
        output_format = payload.get("output_format") or "mp3_44100_128"

        api_key = _get_api_key()
        if not api_key:
            return jsonify({"error": "ELEVENLABS_API_KEY not configured on server"}), 500

        url = f"{TTS_API_BASE}/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": api_key,
            "accept": "audio/mpeg",
            "content-type": "application/json",
        }
        body = {
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            },
            "output_format": output_format,
        }

        # Stream request to keep memory usage low
        r = requests.post(url, headers=headers, json=body, stream=True, timeout=60)
        if r.status_code >= 400:
            try:
                err = r.json()
            except Exception:
                err = {"message": r.text}
            return jsonify({"error": "TTS request failed", "details": err, "status_code": r.status_code}), r.status_code

        def generate():
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk

        return Response(generate(), mimetype="audio/mpeg")
    except requests.Timeout:
        return jsonify({"error": "TTS provider timeout"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500

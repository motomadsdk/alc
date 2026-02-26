import os
import math
import io
import wave
import struct
from datetime import datetime
from flask import Flask, render_template, jsonify, send_from_directory, request, send_file
from werkzeug.exceptions import BadRequest

from config import get_config, Config
from logger import setup_logging
from utils import parse_time, validate_latency, validate_filename
from csv_handler import (
    NetworkConfigHandler, DeviceDataHandler, TrafficLogger, CSVHandler
)
from image_handler import ImageHandler
from pdf_generator import generate_flowchart_pdf

# Initialize Flask app
app = Flask(__name__)

# Load configuration
config = get_config()
app.config.from_object(config)

# Initialize logging
logger = setup_logging(app)

# Initialize handlers
image_handler = ImageHandler(Config.IMAGE_FOLDER)
network_handler = NetworkConfigHandler(Config.NETWORK_CNF_FILE)
device_handler = DeviceDataHandler(
    Config.CSV_DIR,
    network_handler,
    image_finder=image_handler.find
)
traffic_logger = TrafficLogger(Config.TRAFFIC_LOG_FILE)

# Caches
devices_cache = None
devices_cache_time = None
popularity_cache = None

def get_devices():
    """Get cached devices list with TTL-based refresh."""
    global devices_cache, devices_cache_time
    now = datetime.now()
    
    if devices_cache and devices_cache_time:
        age = (now - devices_cache_time).total_seconds()
        if age < Config.CACHE_TTL:
            return devices_cache
    
    try:
        device_handler.load()
        devices_cache = device_handler.devices
        devices_cache_time = now
        
        # Log missing images
        missing = image_handler.get_missing_images(devices_cache)
        if missing:
            logger.info(f"{len(missing)} devices missing images")
        else:
            logger.debug("All device images found")
        
        return devices_cache
    
    except Exception as e:
        logger.error(f"Error loading devices: {e}")
        return []



@app.route('/')
def index():
    return render_template('index.html')


@app.route('/table')
def table_view():
    devices = get_devices()
    return render_template('table.html', devices=devices)


@app.route('/api/data')
def get_data():
    """Get all devices data as JSON."""
    try:
        devices = get_devices()
        return jsonify(devices)
    except Exception as e:
        logger.error(f"Error fetching data: {e}")
        return jsonify({"error": "Failed to load device data"}), 500


@app.route('/images/<path:filename>')
def serve_image(filename):
    """Serve image files with security validation."""
    try:
        if not validate_filename(filename):
            logger.warning(f"Invalid filename requested: {filename}")
            return "Invalid filename", 400
        
        return send_from_directory(Config.IMAGE_FOLDER, filename)
    except Exception as e:
        logger.error(f"Image serving error: {e}")
        return "Image not found", 404


@app.route('/api/audio_preview')
def audio_preview():
    """
    Generate stereo WAV file with latency demonstration.
    Left channel: Beep at T=0, Right channel: Beep at T=latency_ms
    """
    try:
        latency_ms = validate_latency(
            float(request.args.get('latency', 0)),
            Config.AUDIO_MAX_LATENCY_MS
        )
        
        buf = _generate_latency_audio(latency_ms)
        
        return send_file(
            buf,
            mimetype="audio/wav",
            as_attachment=True,
            download_name=f"latency_{latency_ms}ms.wav"
        )
    
    except (ValueError, TypeError) as e:
        logger.warning(f"Invalid audio request: {e}")
        return jsonify({"error": "Invalid latency value"}), 400
    except Exception as e:
        logger.error(f"Audio generation error: {e}")
        return jsonify({"error": "Failed to generate audio"}), 500


def _generate_latency_audio(latency_ms):
    """Generate stereo WAV buffer with latency demonstration."""
    sample_rate = Config.AUDIO_SAMPLE_RATE
    beep_freq = Config.AUDIO_BEEP_FREQ
    beep_duration_ms = Config.AUDIO_BEEP_DURATION_MS
    
    duration_sec = 1.0 + (latency_ms / 1000.0)
    num_samples = int(sample_rate * duration_sec)
    beep_samples = int(sample_rate * (beep_duration_ms / 1000.0))
    latency_samples = int(sample_rate * (latency_ms / 1000.0))
    
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wav_file:
        wav_file.setnchannels(2)  # Stereo
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            # Left channel: beep at T=0
            l_val = 0
            if 0 <= i < beep_samples:
                fade = 1.0 if i <= beep_samples * 0.8 else (beep_samples - i) / (beep_samples * 0.2)
                l_val = int(math.sin(2 * math.pi * beep_freq * i / sample_rate) * 16384 * fade)
            
            # Right channel: beep at T=latency_ms
            r_val = 0
            if latency_samples <= i < (latency_samples + beep_samples):
                rel_i = i - latency_samples
                fade = 1.0 if rel_i <= beep_samples * 0.8 else (beep_samples - rel_i) / (beep_samples * 0.2)
                r_val = int(math.sin(2 * math.pi * beep_freq * rel_i / sample_rate) * 16384 * fade)
            
            wav_file.writeframes(struct.pack('<hh', l_val, r_val))
    
    buf.seek(0)
    return buf


@app.route('/api/sources')
def get_sources():
    """Get available sources from sources.csv."""
    try:
        sources = {}
        rows = CSVHandler.safe_read_csv(Config.SOURCES_CSV_FILE)
        
        for row in rows:
            source_name = row.get('source_name', '').strip()
            url = row.get('url', '').strip()
            if source_name and url:
                sources[source_name] = url
        
        return jsonify(sources)
    
    except Exception as e:
        logger.error(f"Error loading sources: {e}")
        return jsonify({}), 500


@app.route('/api/export-flowchart-pdf', methods=['POST'])
def export_flowchart_pdf():
    """Export signal chain as professional flowchart PDF."""
    try:
        data = request.get_json()
        chain = data.get('chain', [])
        total_latency = float(data.get('total_latency', 0))
        
        if not chain:
            return jsonify({"error": "Empty chain"}), 400
        
        # Generate PDF with flowchart
        pdf_bytes = generate_flowchart_pdf(chain, total_latency)
        
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"signal_chain_flowchart_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        )
    
    except Exception as e:
        logger.error(f"PDF export error: {e}")
        return jsonify({"error": "Failed to generate PDF"}), 500


@app.route('/api/track', methods=['POST'])
def track_event():
    """Log user events for analytics."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        event_name = str(data.get('event', 'unknown')).strip()
        device_name = str(data.get('device', 'unknown')).strip()
        brand = str(data.get('brand', 'unknown')).strip()
        user_id = str(data.get('user_id', 'anonymous')).strip()
        
        # Log the event
        success = traffic_logger.log_event(event_name, device_name, brand, user_id)
        
        if success:
            return jsonify({"status": "success"})
        else:
            logger.warning("Failed to log event")
            return jsonify({"error": "Failed to log event"}), 500
    
    except Exception as e:
        logger.error(f"Tracking error: {e}")
        return jsonify({"error": "Internal error"}), 500


@app.route('/health')
def health_check():
    """Health check endpoint for monitoring."""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }), 200


@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    logger.warning(f"404 error: {request.path}")
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors."""
    logger.error(f"Internal error: {e}")
    return jsonify({"error": "Internal server error"}), 500


# Startup initialization
try:
    logger.info("Initializing application...")
    image_handler.scan()
    network_handler.load()
    get_devices()
    logger.info("Application initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize application: {e}")
    raise


if __name__ == '__main__':
    logger.info(f"Starting app on {Config.HOST}:{Config.PORT}")
    app.run(debug=Config.DEBUG, host=Config.HOST, port=Config.PORT)

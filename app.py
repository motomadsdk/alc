import os
import csv
import re
import datetime
import math
import io
import wave
import struct
from flask import Flask, render_template, jsonify, send_from_directory, request, send_file

app = Flask(__name__)

# Configuration
CSV_FILE = 'MOTO Audio delay - Ark1.csv'

# Detect image folder (root /images or static/images)
IMAGE_FOLDER = 'images' if os.path.exists('images') else os.path.join('static', 'images')

# Image Cache (filename -> relative path)
IMAGE_CACHE = {}

def scan_images():
    """
    Recursively scans the image folder and builds a map of {filename: relative_path}.
    This allows images to be organized in subfolders and even in a root /images folder.
    """
    global IMAGE_CACHE
    IMAGE_CACHE = {} 
    
    if not os.path.exists(IMAGE_FOLDER):
        print(f"Warning: Image folder '{IMAGE_FOLDER}' not found.")
        return

    for root, _, files in os.walk(IMAGE_FOLDER):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.svg')):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, IMAGE_FOLDER).replace('\\', '/')
                IMAGE_CACHE[file.lower()] = rel_path

def parse_time(time_str):
    """
    Parses time string from CSV (e.g., "2,27ms", "0,21ms (round trip)").
    Returns float value in ms.
    """
    if not time_str:
        return 0.0
    
    # Remove "ms" and other text, replace comma with dot
    clean_str = time_str.lower().replace('ms', '').replace(',', '.').split('(')[0].strip()
    
    try:
        return float(clean_str)
    except ValueError:
        return 0.0


def find_best_image_match(device_name):
    """
    Tries to find the best matching image file for a device name.
    Checks multiple naming conventions in order of preference.
    """
    # Potential filenames to check (without .png extension)
    candidates = []
    
    # 1. Exact match (e.g. "Shure AD4D (ADX1) (Axient digital)")
    candidates.append(device_name)
    
    # 2. Base name only (before "->")
    base_name = device_name.split('->')[0].strip()
    if base_name != device_name:
        candidates.append(base_name)

    # 3. Sanitized versions (lowercase, underscores)
    #    "Shure AD4D (ADX1)" -> "shure_ad4d__adx1" or "shure_ad4d_adx1"
    def sanitize(s):
        # Replace non-alphanumeric with underscore, collapse multiple underscores
        s = re.sub(r'[^a-zA-Z0-9]', '_', s).lower()
        return re.sub(r'_+', '_', s).strip('_')

    candidates.append(sanitize(device_name))
    candidates.append(sanitize(base_name))

    # 4. Legacy "Safe Short" (current logic: "Shure AD4D..." -> "shure_ad4d")
    short_name = base_name.split('(')[0].strip()
    candidates.append(sanitize(short_name))
    
    # Check if files exist
    # Check if files exist via Recursive Cache
    # Ensure cache is populated
    if not IMAGE_CACHE:
        scan_images()

    for candidate in candidates:
        # Check both .png and .jpg
        for ext in ['.png', '.jpg', '.jpeg', '.svg']:
            # Construct the filename we are looking for
            target_filename = f"{candidate}{ext}".lower()
            
            # Check if this filename exists in our recursive cache
            if target_filename in IMAGE_CACHE:
                return IMAGE_CACHE[target_filename]
                
    # Fallback: Return the legacy generated name (flat) if not found
    return f"{sanitize(short_name)}.png"

def get_devices_from_csv():
    devices = []
    
    if not os.path.exists(CSV_FILE):
        print(f"Error: CSV file '{CSV_FILE}' not found.")
        return []

    try:
        with open(CSV_FILE, mode='r', encoding='utf-8') as csvfile:
            reader = csv.reader(csvfile, delimiter=',')
            
            # Skip header
            next(reader, None)
            
            for row in reader:
                if not any(row): continue
                # Expected: Name, Input Type, Output Type, Input SR, Output SR, Latency
                if len(row) < 6: continue

                name = row[0].strip()
                input_type = row[1].strip()
                output_type = row[2].strip()
                input_sr = row[3].strip()
                output_sr = row[4].strip()
                time_str = row[5].strip()
                source = row[6].strip() if len(row) > 6 else "-"
                
                # Image filename lookup
                image_filename = find_best_image_match(name)
                
                # Extract Brand (first word of name)
                brand = name.split(' ')[0].strip() if name else "Unknown"

                devices.append({
                    'id': len(devices),
                    'name': name,
                    'brand': brand,
                    'latency': parse_time(time_str),
                    'display_time': time_str,
                    'image': image_filename,
                    'source': source,
                    'raw_data': {
                        'input_type': input_type,
                        'output_type': output_type,
                        'input_sr': input_sr,
                        'output_sr': output_sr
                    }
                })
                
    except Exception as e:
        print(f"Error parsing CSV: {e}")
        return []

    # --- Popularity Sorting Logic ---
    popularity = {}
    log_file = os.path.join(os.path.dirname(__file__), 'traffic_log.csv')
    if os.path.exists(log_file):
        try:
            with open(log_file, mode='r', encoding='utf-8') as f:
                reader = csv.reader(f)
                next(reader, None) # Skip header
                for row in reader:
                    if len(row) >= 3:
                        dev_name = row[2] # Device Name is at index 2
                        popularity[dev_name] = popularity.get(dev_name, 0) + 1
        except Exception as e:
            print(f"Error reading traffic log: {e}")

    # Sort devices: 
    # 1. Popularity (descending)
    # 2. Name (ascending) - for stability
    def get_sort_key(d):
        score = popularity.get(d['name'], 0)
        return (-score, d['name'])

    devices.sort(key=get_sort_key)

    return devices

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/table')
def table_view():
    devices = get_devices_from_csv()
    return render_template('table.html', devices=devices)

@app.route('/api/data')
def get_data():
    devices = get_devices_from_csv()
    return jsonify(devices)

@app.route('/images/<path:filename>')
def serve_image(filename):
    return send_from_directory(IMAGE_FOLDER, filename)

@app.route('/api/audio_preview')
def audio_preview():
    """
    Generates a stereo WAV file with two beeps.
    Left ear: Beep at T=0
    Right ear: Beep at T=Latency
    """
    try:
        latency_ms = float(request.args.get('latency', 0))
        # Limit latency for safety
        latency_ms = max(0, min(1000, latency_ms))
        
        sample_rate = 44100
        duration_sec = 1.0 + (latency_ms / 1000.0)
        num_samples = int(sample_rate * duration_sec)
        
        beep_freq = 1000 # Hz
        beep_duration_ms = 100
        beep_samples = int(sample_rate * (beep_duration_ms / 1000.0))
        
        # Buffer for WAV file
        buf = io.BytesIO()
        with wave.open(buf, 'wb') as wav_file:
            wav_file.setnchannels(2) # Stereo
            wav_file.setsampwidth(2) # 16-bit
            wav_file.setframerate(sample_rate)
            
            latency_samples = int(sample_rate * (latency_ms / 1000.0))
            
            for i in range(num_samples):
                # Left Channel Beep (starts at 0)
                l_val = 0
                if 0 <= i < beep_samples:
                    # Sine wave with fade out
                    fade = 1.0
                    if i > beep_samples * 0.8: # Fade out last 20%
                        fade = (beep_samples - i) / (beep_samples * 0.2)
                    l_val = int(math.sin(2 * math.pi * beep_freq * i / sample_rate) * 16384 * fade)
                
                # Right Channel Beep (starts after latency)
                r_val = 0
                if latency_samples <= i < (latency_samples + beep_samples):
                    rel_i = i - latency_samples
                    fade = 1.0
                    if rel_i > beep_samples * 0.8:
                        fade = (beep_samples - rel_i) / (beep_samples * 0.2)
                    r_val = int(math.sin(2 * math.pi * beep_freq * rel_i / sample_rate) * 16384 * fade)
                
                wav_file.writeframes(struct.pack('<hh', l_val, r_val))

        buf.seek(0)
        return send_file(
            buf,
            mimetype="audio/wav",
            as_attachment=True,
            download_name=f"latency_{latency_ms}ms.wav"
        )
    except Exception as e:
        print(f"Audio generation error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/sources')
def get_sources():
    sources = {}
    csv_path = os.path.join(os.path.dirname(__file__), 'sources.csv')
    if os.path.exists(csv_path):
        try:
            with open(csv_path, mode='r', encoding='utf-8') as f:
                reader = csv.reader(f)
                header = next(reader, None) # Skip header
                for row in reader:
                    if len(row) >= 2:
                        source_name = row[0].strip()
                        url = row[1].strip()
                        if source_name and url:
                            sources[source_name] = url
        except Exception as e:
            print(f"Error reading sources.csv: {e}")
    return jsonify(sources)

@app.route('/api/track', methods=['POST'])
def track_event():
    try:
        data = request.json
        event_name = data.get('event', 'unknown')
        device_name = data.get('device', 'unknown')
        brand = data.get('brand', 'unknown')
        user_id = data.get('user_id', 'anonymous') # NEW: Capture User ID
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        log_file = os.path.join(os.path.dirname(__file__), 'traffic_log.csv')
        file_exists = os.path.exists(log_file)
        
        with open(log_file, mode='a', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            # Check header to see if we need to update schema or just append
            # For simplicity, if file exists but has old header, we might have mismatch issues.
            # Ideally we'd migrate, but appending a column to NEW rows is "okay" for CSV readers usually.
            if not file_exists:
                writer.writerow(['Timestamp', 'Event', 'Device', 'Brand', 'UserID'])
            
            # Write row
            writer.writerow([timestamp, event_name, device_name, brand, user_id])
            
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Tracking error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

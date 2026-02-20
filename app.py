import os
import csv
import re
from flask import Flask, render_template, jsonify, send_from_directory

app = Flask(__name__)

# Configuration
CSV_FILE = 'MOTO Audio delay - Ark1.csv'
IMAGE_FOLDER = os.path.join('static', 'images')

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
    for candidate in candidates:
        # Check both .png and .jpg
        for ext in ['.png', '.jpg', '.jpeg']:
            filename = f"{candidate}{ext}"
            full_path = os.path.join(IMAGE_FOLDER, filename)
            if os.path.exists(full_path):
                return filename
                
    # Fallback: Return the legacy generated name even if it doesn't exist (so UI shows broken link/alt text)
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
                
                devices.append({
                    'id': len(devices),
                    'name': name,
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)

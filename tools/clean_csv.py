import csv
import os

CSV_FILE = 'MOTO Audio delay - Ark1.csv'
OUTPUT_FILE = 'MOTO Audio delay - Ark1.csv' # Overwrite

def clean_latency(lat_str):
    # Standardize to "X,XXms" format
    # remove quotes, whitespace
    s = lat_str.replace('"', '').strip()
    
    # Check if it has ms
    if not s.lower().endswith('ms'):
        # basic number?
        pass # might add ms later if needed, but let's assume valid input for now
        
    s = s.lower().replace('ms', '').strip()
    
    # Verify it's a number
    try:
        # replace comma with dot for float conversion
        val = float(s.replace(',', '.'))
        # format back to comma string
        # If it was 0.105 -> 0,105
        # If it was 2.27 -> 2,27
        return f"{val}".replace('.', ',') + "ms"
    except ValueError:
        return lat_str # Return original if parse fails

def clean_csv():
    if not os.path.exists(CSV_FILE):
        print("File not found")
        return

    rows = []
    seen = set()

    with open(CSV_FILE, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        
        for row in reader:
            if not any(row): continue
            if len(row) < 5: continue
            
            # Clean fields
            name = row[0].strip()
            in_type = row[1].strip()
            out_type = row[2].strip()
            sr = row[3].strip()
            lat = clean_latency(row[4].strip())
            
            # Create a tuple for deduplication key
            # We treat Name + Latency as unique enough? Or Name+In+Out+SR+Lat?
            # Let's use all fields to be safe, but ignore exact string matching on latency if value is same?
            # Actually, standardizing latency first helps.
            
            key = (name, in_type, out_type, sr, lat)
            
            if key not in seen:
                seen.add(key)
                rows.append([name, in_type, out_type, sr, lat])
    
    # Write back
    with open(OUTPUT_FILE, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)
        
    print(f"Cleaned CSV. Wrote {len(rows)} unique rows.")

if __name__ == "__main__":
    clean_csv()

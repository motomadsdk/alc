import csv
import re
import os

# Source is the file that currently exists and has 4 columns
SOURCE_CSV = 'MOTO Audio delay - Ark1.csv'
# DEST CSV will be the one used by app
DEST_CSV = 'MOTO Audio delay - Ark1_new.csv'

def process_row(row):
    # Expected: Device Name, Input Type, Output Type, Latency
    if len(row) < 4: return None
    
    name = row[0].strip()
    input_type = row[1].strip()
    output_type = row[2].strip()
    latency = row[3].strip()
    
    sample_rate = "-"
    
    # Extract SR from name
    # e.g. "Soniflex ... (96KHz)"
    lower_name = name.lower()
    
    if "96khz" in lower_name or "96 khz" in lower_name:
        sample_rate = "96kHz"
    elif "48khz" in lower_name or "48 khz" in lower_name:
        sample_rate = "48kHz"
    elif "44.1" in lower_name:
        sample_rate = "44.1kHz"
    
    return [name, input_type, output_type, sample_rate, latency]

rows = []
try:
    with open(SOURCE_CSV, 'r', encoding='utf-8') as f: # standard utf-8 for the file I likely created
        reader = csv.reader(f)
        try:
            header = next(reader)
            # Verify header
            if "Input Type" not in header[1]:
                # Maybe it is the old file??
                print("Warning: Header doesn't match expected 4-col format. Trying 6-col logic?")
                # Use heuristics if needed, but for now assume 4-col based on cat output
        except StopIteration: pass
        
        for row in reader:
            if any(row):
                new_row = process_row(row)
                if new_row:
                    rows.append(new_row)
except Exception as e:
    print(f"Read Error: {e}")

try:
    with open(DEST_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["Device Name", "Input Type", "Output Type", "Sample Rate", "Latency"])
        writer.writerows(rows)
    print(f"Created {DEST_CSV} with {len(rows)} rows.")
except Exception as e:
    print(f"Write Error: {e}")

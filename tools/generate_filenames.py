import csv
import re
import os

CSV_FILE = 'MOTO Audio delay - Ark1.csv'

def get_filename(name):
    safe_name = re.sub(r'[^a-zA-Z0-9]', '_', name).lower().strip('_')
    return f"{safe_name}.png"

try:
    with open(CSV_FILE, mode='r', encoding='utf-8-sig') as csvfile:
        reader = csv.reader(csvfile, delimiter=',')
        next(reader, None) # Skip header
        
        seen = set()
        print("Device Name | Image Filename")
        print("--- | ---")
        
        for row in reader:
            if not any(row) or len(row) < 1: continue
            
            dev1 = row[0].strip()
            dev2 = row[2].strip() if len(row) > 2 else ""
            
            name_to_use = dev1 if dev1 else dev2
            
            if name_to_use and name_to_use not in seen:
                seen.add(name_to_use)
                print(f"{name_to_use} | {get_filename(name_to_use)}")

except FileNotFoundError:
    print("CSV not found")

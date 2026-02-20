import csv
import re

def analyze_csv(file_path):
    devices = {}
    
    with open(file_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            full_name = row['Device Name']
            # Try to extract base name and mode
            # Matches: "Device Name (Mode)" or "Device Name (Setting) (Mode)"
            match = re.search(r'^(.*?)\s*\((High Density|Long Range|Low Latency|Pass-thru|Standard)\)$', full_name)
            if match:
                base_name = match.group(1).strip()
                mode = match.group(2)
            else:
                base_name = full_name
                mode = None
            
            key = (base_name, row['Input Type'], row['Output Type'], row['Input Sample Rate'], row['Output Sample Rate'])
            if key not in devices:
                devices[key] = {}
            
            devices[key][mode] = row['Latency']

    # Find devices where modes have same latency
    for key, modes in devices.items():
        if len(modes) > 1:
            latencies = set(modes.values())
            if len(latencies) == 1:
                 print(f"Redundant Modes for {key[0]} [{key[1]}->{key[2]}]: {list(modes.keys())} all have {list(latencies)[0]}")
            else:
                 print(f"DIFFERENT Latencies for {key[0]} [{key[1]}->{key[2]}]: {modes}")

if __name__ == "__main__":
    analyze_csv('MOTO Audio delay - Ark1.csv')

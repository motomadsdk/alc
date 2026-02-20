import csv
import os
import re
import argparse
import sys

# --- CONFIGURATION ---
CSV_FILE = 'MOTO Audio delay - Ark1.csv'
SOURCES_FILE = 'sources.csv'
TEMP_FILE = 'MOTO Audio delay - Ark1_temp.csv'

# BRAND STANDARDS (Official Factory Specs)
BRAND_SPECS = {
    'Shure Axient Digital': {'latency': '2,0ms', 'pattern': r'Axient Digital|AD4D|AD4Q', 'note': 'Standard Mode'},
    'Shure Axient Digital (HD)': {'latency': '2,9ms', 'pattern': r'High Density', 'note': 'High Density Mode'},
    'Shure ADTQ (ADXR) FM': {'latency': '1,27ms', 'pattern': r'ADTQ.*Analog FM', 'is_exact': True},
    'Shure ADTQ (ADXR) NB/WB': {'latency': '3,1ms', 'pattern': r'ADTQ.*Narrow band|ADTQ.*Wide band', 'is_exact': True},
    'Shure ADTQ (P10R+)': {'latency': '0,98ms', 'pattern': r'ADTQ.*P10R\+', 'is_exact': True},
    'Shure PSM1000 P10T': {'latency': '0,44ms', 'pattern': r'PSM1000 P10T', 'is_exact': True},
    'Shure ULX-D': {'latency': '2,45ms', 'pattern': r'ULX-D', 'note': 'Standard Mode'},
    'Shure ULX-D (HD)': {'latency': '2,95ms', 'pattern': r'ULX-D.*High Density'},
    'Sennheiser Digital 6000': {'latency': '3,0ms', 'pattern': r'Digital 6000'},
    'Sennheiser EW-DX': {'latency': '2,4ms', 'pattern': r'EW-DX', 'note': 'Standard Mode'},
    'L-Acoustics LA12X': {'latency': '3,84ms', 'pattern': r'LA12X'},
    'DiGiCo Quantum': {'latency': '1,0ms', 'pattern': r'Quantum'},
    'DiGiCo SD-Rack (96k)': {'latency': '0,53ms', 'pattern': r'SD-Rack|SD-Mini Rack|SD-Nano Rack', 'sr': '96kHz'},
    'DiGiCo SD-Rack (48k)': {'latency': '0,8ms', 'pattern': r'SD-Rack|SD-Mini Rack|SD-Nano Rack', 'sr': '48kHz'},
    'Soniflex (96k)': {'latency': '0,105ms', 'pattern': r'Soniflex', 'sr': '96kHz'},
    'Soniflex (48k)': {'latency': '0,24ms', 'pattern': r'Soniflex', 'sr': '48kHz'},
    'Wisycom MPR50 (Standard)': {'latency': '0,9ms', 'pattern': r'MPR50.*Standard'},
    'Wisycom MPR50 (Long Range)': {'latency': '1,4ms', 'pattern': r'MPR50.*Long Range'},
    'Wisycom MTK982 (MPR50)': {'latency': '1,08ms', 'pattern': r'MTK982.*MPR50'},
}

# Devices that are primarily RECEIVERS (should only have Analog input representing the RF capsule source in this app)
RECEIVERS = ['AD4D', 'AD4Q', 'ULX-D', 'Digital 6000', 'EW-DX', 'ARX32', 'MPR50']

def validate_row(row):
    """
    Applies MOTO Data Rules to a single CSV row.
    Returns: (is_valid, corrected_row, message, should_delete)
    """
    name = row.get('Device Name', '')
    in_type = row.get('Input Type', '')
    out_type = row.get('Output Type', '')
    in_sr = row.get('Input Sample Rate', '')
    out_sr = row.get('Output Sample Rate', '')
    latency = row.get('Latency', '')
    
    modified = False
    should_delete = False
    messages = []

    # RULE 0: Receiver Input Filtering (User's point: "They don't have Dante input")
    if any(rec in name for rec in RECEIVERS):
        if in_type != 'Analog':
            should_delete = True
            messages.append(f"REMOVED: Receiver {name} cannot have {in_type} input (RF->Out is represented as Analog->Out)")
            return True, row, messages, True

    # RULE 1: Analog Sample Rate must be "-"
    if in_type.lower() == 'analog' and in_sr != '-':
        row['Input Sample Rate'] = '-'
        modified = True
        messages.append("Reset Analog Input SR to '-'")
    
    if out_type.lower() == 'analog' and out_sr != '-':
        row['Output Sample Rate'] = '-'
        modified = True
        messages.append("Reset Analog Output SR to '-'")

    # RULE 2: Correct Latency Formatting (X,YYms)
    clean_latency = latency.replace('.', ',')
    if not clean_latency.endswith('ms'):
        clean_latency += 'ms'
    
    if clean_latency != latency:
        row['Latency'] = clean_latency
        modified = True
        messages.append(f"Formatted latency: {latency} -> {clean_latency}")

    # RULE 3: Brand Standards Fact-checking
    for brand, spec in BRAND_SPECS.items():
        if re.search(spec['pattern'], name, re.IGNORECASE):
            # Check for Sample Rate sub-rule
            if 'sr' in spec:
                if in_sr == spec['sr'] or out_sr == spec['sr']:
                    target = spec['latency']
                    if row['Latency'] != target:
                        row['Latency'] = target
                        modified = True
                        messages.append(f"Standardized {brand} latency to {target}")
            # Exact matches for specific modes
            else:
                if 'latency' in spec and row['Latency'] != spec['latency']:
                    # Special check to not override HD with standard if both patterns match
                    if 'High Density' in name and 'High Density' not in brand:
                        continue
                    if 'Standard' in name and 'Standard' not in brand and 'High Density' in brand:
                        continue
                        
                    row['Latency'] = spec['latency']
                    modified = True
                    messages.append(f"Standardized {brand} latency to {spec['latency']}")

    return modified, row, messages, False

def run_audit(apply_changes=False):
    if not os.path.exists(CSV_FILE):
        print(f"Error: {CSV_FILE} not found.")
        return

    results = []
    stats = {'total': 0, 'modified': 0, 'deleted': 0}

    with open(CSV_FILE, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            stats['total'] += 1
            modified, new_row, msgs, deleted = validate_row(row.copy())
            if deleted:
                stats['deleted'] += 1
                continue
            
            if modified:
                stats['modified'] += 1
            results.append(new_row)

    if apply_changes:
        with open(CSV_FILE, mode='w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(results)
        print(f"Successfully cleaned library: {stats['modified']} rows corrected, {stats['deleted']} impossible rows removed.")
    else:
        print(f"Audit complete. Found {stats['modified']} corrections and {stats['deleted']} rows to remove.")
        print("Run with --apply to commit changes.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ALC AI Data Orchestrator")
    parser.add_argument('--apply', action='store_true', help="Apply corrections to the CSV file")
    parser.add_argument('--validate', action='store_true', help="Scan for errors but don't save")
    
    args = parser.parse_args()
    
    if args.apply:
        run_audit(apply_changes=True)
    elif args.validate:
        run_audit(apply_changes=False)
    else:
        # Default to loop mode as user requested "running in background"
        print("MOTO AI Data Orchestrator Active.")
        print("Rules loaded: Analog Strip, Latency Formatting, Brand Standards (DiGiCo, Shure, Sennheiser).")
        run_audit(apply_changes=False)

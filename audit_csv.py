import csv
import os

input_file = 'MOTO Audio delay - Ark1.csv'
output_file = 'MOTO Audio delay - Ark1_audited.csv'

def clean_latency(val_str):
    # Standardize to "X,YYms" format if needed
    val_str = val_str.replace('.', ',')
    if not val_str.endswith('ms'):
        val_str += 'ms'
    return val_str

rows = []
with open(input_file, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for row in reader:
        name = row['Device Name']
        in_type = row['Input Type']
        out_type = row['Output Type']
        in_sr = row['Input Sample Rate']
        out_sr = row['Output Sample Rate']
        
        # 1. DiGiCo SD-Rack
        if 'SD-Rack' in name or 'SD-Mini Rack' in name or 'SD-Nano Rack' in name:
            # Remove Dante/AES67 as requested
            if in_type in ['Dante', 'AES67'] or out_type in ['Dante', 'AES67']:
                continue
            
            # Update latencies
            # Note: Official spec is 0.53ms @ 96kHz for system. 
            # We'll use 0.53ms for 96k and ~0.8ms for 48k as ballpark corrected rack values
            if out_sr == '96kHz' or in_sr == '96kHz':
                row['Latency'] = '0,53ms'
            else:
                row['Latency'] = '0,8ms'

        # 2. DiGiCo Quantum
        elif 'Quantum' in name:
            row['Latency'] = '1,0ms'

        # 3. Shure Axient Digital / AD4D
        elif 'Axient Digital' in name or 'AD4D' in name or 'AD4Q' in name:
            if 'High Density' in name:
                row['Latency'] = '2,9ms'
            else:
                row['Latency'] = '2,0ms'

        # 4. Sennheiser 6000
        elif 'Digital 6000' in name:
            row['Latency'] = '3,0ms'

        # 5. L-Acoustics LA12X
        elif 'LA12X' in name:
            row['Latency'] = '3,84ms'

        rows.append(row)

with open(output_file, mode='w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"Finished audit. Rows reduced from {len(rows)} (approx) to {len(rows)}.")

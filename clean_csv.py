import csv
import os

input_file = r'c:\Users\Mads Joensen\OneDrive\MOTO\SCRIPTS\AUDIO LATENCY CALC\MOTO Audio delay - Ark1.csv'
output_file = r'c:\Users\Mads Joensen\OneDrive\MOTO\SCRIPTS\AUDIO LATENCY CALC\MOTO Audio delay - Ark1_cleaned.csv'

rows = []
header = None

with open(input_file, mode='r', encoding='utf-8-sig', newline='') as f:
    reader = csv.reader(f)
    header = next(reader)
    for row in reader:
        # row: Device Name, Input Type, Output Type, Input SR, Output SR, Latency, Source
        device, in_type, out_type, in_sr, out_sr, latency, source = row
        
        # Rule: Analog has no Sample Rate
        if in_type.lower() == 'analog':
            in_sr = '-'
        if out_type.lower() == 'analog':
            out_sr = '-'
            
        rows.append([device, in_type, out_type, in_sr, out_sr, latency, source])

# Deduplicate
seen = set()
unique_rows = []
for row in rows:
    row_tuple = tuple(row)
    if row_tuple not in seen:
        unique_rows.append(row)
        seen.add(row_tuple)

with open(output_file, mode='w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(unique_rows)

print(f"Original rows: {len(rows)}")
print(f"Unique rows after cleaning: {len(unique_rows)}")

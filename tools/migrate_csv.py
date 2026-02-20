import csv
import os

CSV_FILE = 'MOTO Audio delay - Ark1.csv'
OUTPUT_FILE = 'MOTO Audio delay - Ark1.csv'

def migrate_csv():
    if not os.path.exists(CSV_FILE):
        print("File not found")
        return

    new_rows = []

    with open(CSV_FILE, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        
        # Check if already migrated
        if 'Input Sample Rate' in header:
            print("CSV already migrated!")
            return

        # New Header
        new_header = ['Device Name', 'Input Type', 'Output Type', 'Input Sample Rate', 'Output Sample Rate', 'Latency']
        
        for row in reader:
            if not any(row): continue
            
            # Old Format: Name, InType, OutType, SR, Latency
            name = row[0].strip()
            in_type = row[1].strip()
            out_type = row[2].strip()
            sr = row[3].strip()
            lat = row[4].strip()
            
            # Migration Logic
            input_sr = sr
            output_sr = sr
            
            # If Analog, SR is meaningless/null
            if in_type.lower() == 'analog':
                input_sr = '-'
            if out_type.lower() == 'analog':
                output_sr = '-'
                
            # Special handling for known devices or just default to splitting?
            # User mentioned "converters". We don't have enough info in the old CSV to know if something converts.
            # So for now, we assume if it's Digital->Digital, it passes through the SR.
            # If it's Analog->Digital, Input is -, Output is SR.
            # If it's Digital->Analog, Input is SR, Output is -.
            
            # Refined Logic:
            if in_type.lower() == 'analog' and out_type.lower() != 'analog':
               # A->D
               input_sr = '-'
               output_sr = sr
            elif in_type.lower() != 'analog' and out_type.lower() == 'analog':
               # D->A
               input_sr = sr
               output_sr = '-'
            elif in_type.lower() == 'analog' and out_type.lower() == 'analog':
               # A->A
               input_sr = '-'
               output_sr = '-'
            else:
               # D->D (e.g. SRC)
               # For now, default to same. User will have to manually edit for SRC devices.
               pass

            new_rows.append([name, in_type, out_type, input_sr, output_sr, lat])
            
    # Write back
    with open(OUTPUT_FILE, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(new_header)
        writer.writerows(new_rows)
        
    print(f"Migrated CSV. Processed {len(new_rows)} rows.")

if __name__ == "__main__":
    migrate_csv()

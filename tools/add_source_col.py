import csv
import os

CSV_FILE = 'MOTO Audio delay - Ark1.csv'
TEMP_FILE = 'temp_migrated.csv'

def add_source_column():
    if not os.path.exists(CSV_FILE):
        print(f"File {CSV_FILE} not found.")
        return

    rows = []
    header = []

    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            print("Empty CSV")
            return
        
        # Check if column already exists
        if 'Source' in header:
            print("Source column already exists.")
            return

        header.append('Source')
        
        for row in reader:
            if not any(row): continue
            # Add default value
            row.append('(user provided / measured)')
            rows.append(row)

    # Write back
    with open(TEMP_FILE, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)
    
    # Replace original
    os.replace(TEMP_FILE, CSV_FILE)
    print("Migration successful: Added 'Source' column.")

if __name__ == "__main__":
    add_source_column()

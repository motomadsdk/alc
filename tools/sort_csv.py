import csv
import os

CSV_FILE = 'MOTO Audio delay - Ark1.csv'
TEMP_FILE = 'temp_sorted.csv'

def sort_csv():
    if not os.path.exists(CSV_FILE):
        print(f"File {CSV_FILE} not found.")
        return

    try:
        with open(CSV_FILE, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader)
            rows = [row for row in reader if any(row)]
        
        # Sort by Device Name (first column), case-insensitive
        rows.sort(key=lambda x: x[0].strip().lower())
        
        with open(TEMP_FILE, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(header)
            writer.writerows(rows)
            
        os.replace(TEMP_FILE, CSV_FILE)
        print("CSV sorted successfully.")
        
    except Exception as e:
        print(f"Error sorting CSV: {e}")

if __name__ == "__main__":
    sort_csv()

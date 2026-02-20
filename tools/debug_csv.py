import csv
import os

def test_csv_parsing():
    file_path = 'MOTO Audio delay - Ark1.csv'
    print(f"Testing file: {file_path}")
    
    if not os.path.exists(file_path):
        print("File not found!")
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader)
            print(f"Header: {header}")
            
            count = 0
            for row in reader:
                if not any(row): continue
                print(f"Row {count}: {row} (Len: {len(row)})")
                if len(row) < 6:
                    print(f"!!! Row {count} FAILED length check < 6")
                else:
                    print(f"Row {count} PASSED")
                count += 1
                
            print(f"Total rows processed: {count}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_csv_parsing()

import csv
from collections import Counter

CSV_FILE = 'MOTO Audio delay - Ark1.csv'

def check_duplicates():
    try:
        with open(CSV_FILE, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader)
            
            rows = [tuple(row) for row in reader if any(row)]
            
        counts = Counter(rows)
        duplicates = {row: count for row, count in counts.items() if count > 1}
        
        total_duplicates = sum(count - 1 for count in duplicates.values())
        
        print(f"Total rows: {len(rows)}")
        print(f"Unique rows: {len(counts)}")
        print(f"Duplicate entries found: {total_duplicates}")
        
        if duplicates:
            print("\nExamples of duplicates:")
            for i, (row, count) in enumerate(duplicates.items()):
                if i >= 5: break
                print(f"({count} times): {row[0]}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_duplicates()

import csv

CSV_FILE = 'MOTO Audio delay - Ark1.csv'

def find_digico():
    try:
        with open(CSV_FILE, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader)
            
            digico_entries = []
            for i, row in enumerate(reader, start=2): # 1-based index, header is 1
                if row and row[0].lower().startswith('digico'):
                    digico_entries.append((i, row))
            
        print(f"Found {len(digico_entries)} DiGiCo entries.")
        
        if digico_entries:
            print("First 5 entries:")
            for i, row in digico_entries[:5]:
                print(f"Line {i}: {row}")
            
            # Check for potential errors
            print("\nChecking for errors...")
            for i, row in digico_entries:
                if len(row) < 6:
                    print(f"Error: Line {i} has missing columns: {row}")
                # Check latency format (expecting "x,xms" or "xms" or similar)
                latency = row[5] if len(row) > 5 else ""
                if "ms" not in latency.lower():
                     print(f"Warning: Line {i} latency format suspicious: '{latency}'")
                
                # Check sample rates
                sr_in = row[3] if len(row) > 3 else ""
                sr_out = row[4] if len(row) > 4 else ""
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    find_digico()

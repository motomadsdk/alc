import csv

unique_inputs = set()
unique_outputs = set()

with open('MOTO Audio delay - Ark1.csv', 'r', encoding='utf-8', errors='ignore') as f:
    reader = csv.reader(f)
    next(reader, None) # Skip header
    for row in reader:
        if len(row) > 2:
            unique_inputs.add(row[1].strip())
            unique_outputs.add(row[2].strip())

print("Unique Inputs:", sorted(unique_inputs))
print("Unique Outputs:", sorted(unique_outputs))


import csv

def read_csv(filename):
    with open(filename, mode='r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        return list(reader)

def compare_csvs(file1, file2):
    data1 = read_csv(file1)
    data2 = read_csv(file2)
    
    report = []
    report.append(f"File 1: {file1} ({len(data1)} rows)")
    report.append(f"File 2: {file2} ({len(data2)} rows)")
    
    if not data1 or not data2:
        return "One of the files is empty."
        
    cols1 = set(data1[0].keys())
    cols2 = set(data2[0].keys())
    
    if cols1 != cols2:
        report.append(f"Columns in 1 but not 2: {cols1 - cols2}")
        report.append(f"Columns in 2 but not 1: {cols2 - cols1}")
    
    # Simple row-level comparison assuming same order
    min_len = min(len(data1), len(data2))
    diff_count = 0
    diff_details = []
    
    for i in range(min_len):
        row1 = data1[i]
        row2 = data2[i]
        
        if row1 != row2:
            diff_count += 1
            if diff_count <= 20:
                changed = []
                # Check all columns in both
                all_cols = set(row1.keys()) | set(row2.keys())
                for col in sorted(list(all_cols)):
                    val1 = row1.get(col, "(MISSING)")
                    val2 = row2.get(col, "(MISSING)")
                    if val1 != val2:
                        changed.append(f"{col}: '{val1}' -> '{val2}'")
                diff_details.append(f"Row {i+2}: {', '.join(changed)}")
    
    report.append(f"Total rows with changes (in first {min_len} rows): {diff_count}")
    if len(data1) != len(data2):
        report.append(f"Row count mismatch: {len(data1)} vs {len(data2)}")
        
    if diff_details:
        report.append("\nFirst 20 row changes:")
        report.extend(diff_details)
        
    return "\n".join(report)

f1 = "FRESH - Commercial Properties Tracking - 2024 - 2026 REPORT (Mostly Clean).csv"
f2 = "FRESH V2 - Commercial Properties Tracking - 2024 - 2026 REPORT (Mostly Clean).csv"

print(compare_csvs(f1, f2))

f1 = "FRESH - Commercial Properties Tracking - 2024 - 2026 REPORT (Mostly Clean).csv"
f2 = "FRESH V2 - Commercial Properties Tracking - 2024 - 2026 REPORT (Mostly Clean).csv"

print(compare_csvs(f1, f2))

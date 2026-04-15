import csv
from collections import defaultdict

def read_csv(filename):
    with open(filename, mode='r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        return list(reader)

def get_stats(data):
    stats = {
        'total_rows': len(data),
        'communities': set(),
        'missing_prices': 0,
        'missing_crew': 0,
        'missing_hours': 0,
        'community_row_counts': defaultdict(int)
    }
    for row in data:
        comm = row.get('Community', '').strip()
        stats['communities'].add(comm)
        stats['community_row_counts'][comm] += 1
        if not row.get('Monthly price'): stats['missing_prices'] += 1
        if not row.get('Crew Leader'): stats['missing_crew'] += 1
        if not row.get('Hours Spent'): stats['missing_hours'] += 1
    return stats

f1 = "FRESH - Commercial Properties Tracking - 2024 - 2026 REPORT (Mostly Clean).csv"
f2 = "FRESH V2 - Commercial Properties Tracking - 2024 - 2026 REPORT (Mostly Clean).csv"

d1 = read_csv(f1)
d2 = read_csv(f2)

s1 = get_stats(d1)
s2 = get_stats(d2)

print(f"Stats Comparison:")
print(f"Total Rows: {s1['total_rows']} -> {s2['total_rows']}")
print(f"Unique Communities: {len(s1['communities'])} -> {len(s2['communities'])}")
print(f"Missing Prices: {s1['missing_prices']} -> {s2['missing_prices']}")
print(f"Missing Crew Leader: {s1['missing_crew']} -> {s2['missing_crew']}")
print(f"Missing Hours: {s1['missing_hours']} -> {s2['missing_hours']}")

# Find communities that were renamed or merged
renamed_from = s1['communities'] - s2['communities']
renamed_to = s2['communities'] - s1['communities']

print(f"\nCommunities removed/renamed in V2: {len(renamed_from)}")
if len(renamed_from) < 50:
    print(sorted(list(renamed_from)))

print(f"\nNew community names in V2: {len(renamed_to)}")
if len(renamed_to) < 50:
    print(sorted(list(renamed_to)))

# Check for specific improvements in price coverage
improvement_comms = []
for comm in s2['communities']:
    if comm in s1['communities']:
        rows1 = [r for r in d1 if r['Community'] == comm]
        rows2 = [r for r in d2 if r['Community'] == comm]
        m1 = sum(1 for r in rows1 if not r['Monthly price'])
        m2 = sum(1 for r in rows2 if not r['Monthly price'])
        if m2 < m1:
            improvement_comms.append((comm, m1, m2))

print(f"\nCommunities with improved price coverage in V2: {len(improvement_comms)}")
for comm, old_m, new_m in improvement_comms[:20]:
    print(f" - {comm}: {old_m} -> {new_m} missing prices")

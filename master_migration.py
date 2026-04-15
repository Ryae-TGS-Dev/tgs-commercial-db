import csv
import re
import uuid
import sys
import requests
from datetime import datetime

# ── DEFINITIVE SOURCE OF TRUTH CONFIG ─────────────────────────────────────────
SUPABASE_URL = 'https://dymddhvvaurwukjtilzb.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bWRkaHZ2YXVyd3VranRpbHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzgwNDYsImV4cCI6MjA5MDgxNDA0Nn0.N339YrWEW3l7Q-sJAjYs93-OXHsKqlWhqwncq5S7jt8'
CSV_SOURCE = 'FRESH V3 - Commercial Properties Tracking - 2024 - 2026 REPORT (Mostly Clean).csv'

# PRICING POLICY: Everything is $20.00
DEFAULT_UNIT_PRICE = 20.00

PRODUCT_SKU_COLUMNS = [
    'Trimtect (Jugs)', 'Ranger Pro (Gal)', 'Gypsum', '8 Way (Buckets)',
    '16-0-8', '8-2-12', '8-0-12', '25-0-5', '20-20-20', '25-0-25',
    '0-0-30', '8-0-10', '0-0-0', '0-0-20', '0-0-22', '0-0-24', '0-0-50',
    '10-0-7', '10-15-12', '13-3-13', '15-0-15', '15-0-8', '16-0-0',
    '20-0-20', '24-0-11', '26-0-11', '8-10-10', '8-2-10', '46-0-0',
    '25-0-11', '10-0-20', '10-0-8', '0-0-10', '0-0-13', '13-0-13',
]

# ── Helpers ──────────────────────────────────────────────────────────────────

def parse_date(val):
    val = str(val).strip()
    if not val: return None
    for fmt in ('%Y-%b-%d', '%m/%d/%Y', '%Y-%B-%d', '%d-%b-%Y'):
        try:
            return datetime.strptime(val, fmt).strftime('%Y-%m-%d')
        except ValueError:
            pass
    return None

def clean_numeric(val):
    if not val: return None
    line = str(val).split('\n')[0].strip()
    cleaned = re.sub(r'[^\d.]', '', line)
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None

def clean_int(val):
    if not val: return 0
    cleaned = re.sub(r'[^\d]', '', str(val))
    return int(cleaned) if cleaned else 0

def get_master_info(name, zone_from_csv='', area_from_csv=''):
    name = name.strip()
    master, zone = name, zone_from_csv
    if ' - ' in name and not re.match(r'^\d', name):
        parts = name.split(' - ', 1)
        master, zone = parts[0].strip(), parts[1].strip()
    current_zone = zone or zone_from_csv
    return master, current_zone

# ── Execution ────────────────────────────────────────────────────────────────

def run_migration():
    print(f"Starting Fresh Migration from: {CSV_SOURCE}")
    
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    }

    # 1. Clear Database
    tables = ['service_product_usage', 'service_history', 'communities', 'products']
    print("Emptying database...")
    for table in tables:
        r = requests.delete(f'{SUPABASE_URL}/rest/v1/{table}?id=not.is.null', headers=headers)
        if r.status_code not in (200, 204):
            print(f"  Warning: Could not clear {table} [{r.status_code}]: {r.text}")

    # 2. Re-create Products with $20 Pricing
    product_map = {}
    products_to_insert = []
    for sku in PRODUCT_SKU_COLUMNS:
        pid = str(uuid.uuid4())
        product_map[sku] = pid
        products_to_insert.append({
            'id': pid,
            'sku': sku,
            'unit_price': DEFAULT_UNIT_PRICE,
            'coverage_sqft': 8000,
        })

    # 3. Parse CSV
    all_rows = []
    with open(CSV_SOURCE, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_name = row.get('Community', '').strip()
            service_date = parse_date(row.get('Service Date', ''))
            if not raw_name or not service_date: continue
            all_rows.append((service_date, row))

    all_rows.sort(key=lambda x: x[0])
    print(f"  Parsed {len(all_rows)} valid service records.")

    # 4. Build Data Structures
    community_map = {}
    service_rows = []
    product_usage_rows = []

    for service_date, row in all_rows:
        raw_name = row.get('Community', '').strip()
        company = row.get('Company', '').strip()
        area = row.get('Area', '').strip()
        zone_csv = row.get('Zone', '').strip()
        
        master_name, zone_name = get_master_info(raw_name, zone_csv, area)
        fingerprint = master_name.lower()

        monthly_val = clean_numeric(row.get('Monthly price', ''))
        annual_val = clean_numeric(row.get('Annual Price', ''))

        if fingerprint not in community_map:
            community_map[fingerprint] = {
                'id': str(uuid.uuid4()),
                'name': master_name,
                'company': company,
                'total_monthly_price': monthly_val or 0,
                'total_annual_price': annual_val or ((monthly_val * 12) if monthly_val else 0),
                'status': 'Active',
            }
        else:
            if company: community_map[fingerprint]['company'] = company
            if monthly_val:
                community_map[fingerprint]['total_monthly_price'] = monthly_val
                if annual_val: 
                    community_map[fingerprint]['total_annual_price'] = annual_val

        cid = community_map[fingerprint]['id']
        sid = str(uuid.uuid4())

        is_one_time = any(x in row.get('One Time - Special Service - STOP', '').lower() for x in ['special', 'stop', 'one', 'yes'])

        service_rows.append({
            'id': sid,
            'community_id': cid,
            'source_community_name': raw_name,
            'area_name': area or '',
            'zone_name': zone_name or '',
            'service_date': service_date,
            'service_performed': row.get('Service Performed', '').strip(),
            'service_category': 'One-Time Service' if is_one_time else 'Contract Maintenance',
            'is_special_service': is_one_time,
            'company': company,
            'crew_count': clean_int(row.get('Crew Count', '')),
            'crew_leader': row.get('Crew Leader', '').strip(),
            'crew_members': row.get('Crew Members', '').strip()[:2000],
            'labor_hours': row.get('Hours Spent', '').strip(),
            'total_labor_hours_num': clean_numeric(row.get('Hours Spent', '')),
            'monthly_revenue': monthly_val,
        })

        for sku in PRODUCT_SKU_COLUMNS:
            qty = clean_numeric(row.get(sku, ''))
            if qty and qty > 0:
                product_usage_rows.append({
                    'service_id': sid,
                    'product_id': product_map[sku],
                    'quantity_used': qty,
                    'unit_cost_at_time': DEFAULT_UNIT_PRICE,
                })

    # 5. Batch Upload
    def post_batch(table, records, batch_size=200):
        total = len(records)
        for i in range(0, total, batch_size):
            batch = records[i:i + batch_size]
            r = requests.post(f'{SUPABASE_URL}/rest/v1/{table}', headers=headers, json=batch)
            if r.status_code not in (200, 201):
                print(f"\nERROR {table} [{r.status_code}]: {r.text[:500]}")
                return False
            print(f"  Uploading {table}: {min(i+batch_size, total)}/{total}", end='\r')
        print(f"  {table} Uploaded - OK")
        return True

    post_batch('products', products_to_insert)
    post_batch('communities', list(community_map.values()))
    post_batch('service_history', service_rows, batch_size=500)
    post_batch('service_product_usage', product_usage_rows, batch_size=500)

    print(f"\n[DONE] Fresh Start Complete. Migrated {len(service_rows)} records.")

if __name__ == '__main__':
    run_migration()

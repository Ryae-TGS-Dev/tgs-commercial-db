import requests

SUPABASE_URL = 'https://dymddhvvaurwukjtilzb.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bWRkaHZ2YXVyd3VranRpbHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzgwNDYsImV4cCI6MjA5MDgxNDA0Nn0.N339YrWEW3l7Q-sJAjYs93-OXHsKqlWhqwncq5S7jt8'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}

def verify():
    # Check total counts
    for table in ['products', 'communities', 'service_history', 'service_product_usage']:
        r = requests.get(f'{SUPABASE_URL}/rest/v1/{table}?select=count', headers=headers, params={'Prefer': 'count=exact'})
        print(f"{table} count: {r.headers.get('Content-Range')}")

    # Check some communities MRR
    r = requests.get(f'{SUPABASE_URL}/rest/v1/communities?select=name,total_monthly_price&limit=5', headers=headers)
    print("\nSample Communities:")
    for c in r.json():
        print(f"  {c['name']}: ${c['total_monthly_price']}")

    # Check some service history
    r = requests.get(f'{SUPABASE_URL}/rest/v1/service_history?select=source_community_name,total_lawn_material_cost,service_date&limit=5', headers=headers)
    print("\nSample Service History:")
    for h in r.json():
        print(f"  {h['source_community_name']} ({h['service_date']}): ${h['total_lawn_material_cost']}")

if __name__ == '__main__':
    verify()

import requests
SUPABASE_URL = 'https://dymddhvvaurwukjtilzb.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bWRkaHZ2YXVyd3VranRpbHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzgwNDYsImV4cCI6MjA5MDgxNDA0Nn0.N339YrWEW3l7Q-sJAjYs93-OXHsKqlWhqwncq5S7jt8'
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

# Query PostgREST for the first row to see keys
r = requests.get(f'{SUPABASE_URL}/rest/v1/service_history?limit=1', headers=headers)
print("Status:", r.status_code)
if r.status_code == 200:
    data = r.json()
    if data:
        print("Columns in service_history:", data[0].keys())
    else:
        print("Table is empty (as expected after clear).")
        # Try to get definition via OpenAPI
        r2 = requests.get(f'{SUPABASE_URL}/rest/v1/', headers=headers)
        if r2.status_code == 200:
             # Look for service_history in the OpenAPI spec
             spec = r2.json()
             defs = spec.get('definitions', {})
             if 'service_history' in defs:
                 print("Properties:", defs['service_history'].get('properties', {}).keys())

import requests
import json
SUPABASE_URL = 'https://dymddhvvaurwukjtilzb.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bWRkaHZ2YXVyd3VranRpbHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzgwNDYsImV4cCI6MjA5MDgxNDA0Nn0.N339YrWEW3l7Q-sJAjYs93-OXHsKqlWhqwncq5S7jt8'
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

r = requests.get(f'{SUPABASE_URL}/rest/v1/', headers=headers)
if r.status_code == 200:
    spec = r.json()
    defs = spec.get('definitions', {})
    if 'service_history' in defs:
        print(json.dumps(list(defs['service_history'].get('properties', {}).keys()), indent=2))
    else:
        print("service_history not in definitions")
        print("Available definitions:", list(defs.keys()))
else:
    print("Failed to get spec:", r.status_code)

import requests
import json
SUPABASE_URL = 'https://dymddhvvaurwukjtilzb.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bWRkaHZ2YXVyd3VranRpbHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzgwNDYsImV4cCI6MjA5MDgxNDA0Nn0.N339YrWEW3l7Q-sJAjYs93-OXHsKqlWhqwncq5S7jt8'
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Accept': 'application/json'
}

# PostgREST OpenAPI spec is often at / (the root)
r = requests.get(f'{SUPABASE_URL}/rest/v1/', headers=headers)
if r.status_code == 200:
    spec = r.json()
    paths = spec.get('paths', {})
    sh_path = paths.get('/service_history', {})
    post_op = sh_path.get('post', {})
    params = post_op.get('parameters', [])
    for p in params:
        if p.get('name') == 'body':
            schema = p.get('schema', {})
            # If it's a list, look at items
            if schema.get('type') == 'array':
                items = schema.get('items', {})
                print("Columns (from items properties):")
                print(json.dumps(list(items.get('properties', {}).keys()), indent=2))
            else:
                print("Columns (from schema properties):")
                print(json.dumps(list(schema.get('properties', {}).keys()), indent=2))
else:
    print(f"Error {r.status_code}: {r.text}")

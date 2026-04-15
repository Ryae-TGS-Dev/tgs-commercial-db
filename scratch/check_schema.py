import requests

SUPABASE_URL = 'https://dymddhvvaurwukjtilzb.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bWRkaHZ2YXVyd3VranRpbHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzgwNDYsImV4cCI6MjA5MDgxNDA0Nn0.N339YrWEW3l7Q-sJAjYs93-OXHsKqlWhqwncq5S7jt8'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}

# Fetching the schema via the PostgREST /rest/v1/ table endpoint
# Actually, PostgREST doesn't directly give schema via a data request, but we can do a LIMIT 0 request and check headers or the OpenAPI spec.
# The most direct way to get columns is often the OpenAPI spec: /rest/v1/

def get_columns(table_name):
    # Try getting one row to see columns
    r = requests.get(f'{SUPABASE_URL}/rest/v1/{table_name}?limit=1', headers=headers)
    if r.status_code == 200:
        data = r.json()
        if data:
            return list(data[0].keys())
        else:
            # If table is empty, we can try the OpenAPI spec or another way.
            # PostgREST allows getting the schema via OPTIONS or /
            r_schema = requests.get(f'{SUPABASE_URL}/rest/v1/', headers=headers)
            if r_schema.status_code == 200:
                schema_data = r_schema.json()
                definitions = schema_data.get('definitions', {})
                table_def = definitions.get(table_name, {})
                properties = table_def.get('properties', {})
                return list(properties.keys())
    return None

tables = ['communities', 'service_history', 'products', 'service_product_usage']
for t in tables:
    cols = get_columns(t)
    print(f"Table: {t}\nColumns: {cols}\n")

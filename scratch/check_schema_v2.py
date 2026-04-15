import requests
import json

SUPABASE_URL = 'https://dymddhvvaurwukjtilzb.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bWRkaHZ2YXVyd3VranRpbHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzgwNDYsImV4cCI6MjA5MDgxNDA0Nn0.N339YrWEW3l7Q-sJAjYs93-OXHsKqlWhqwncq5S7jt8'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}

# Fetching the schema via the PostgREST OpenAPI spec
r_schema = requests.get(f'{SUPABASE_URL}/rest/v1/', headers=headers)
if r_schema.status_code == 200:
    schema_data = r_schema.json()
    definitions = schema_data.get('definitions', {})
    print(f"Available tables in definitions: {list(definitions.keys())}\n")
    
    for table_name in definitions.keys():
        table_def = definitions.get(table_name, {})
        properties = table_def.get('properties', {})
        print(f"Table: {table_name}")
        print(f"Columns: {list(properties.keys())}\n")
else:
    print(f"Error fetching schema: {r_schema.status_code} - {r_schema.text}")

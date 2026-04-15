const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  const envFile = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length === 2) env[parts[0].trim()] = parts[1].trim();
  });
  return env;
}

async function scan() {
  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  console.log('--- SONOMA OAKS 2026 FULL YEAR AUDIT ---');
  
  const { data: services, error } = await supabase
    .from('service_history')
    .select('id, source_community_name, service_date, total_labor_hours_num, community_id')
    .ilike('source_community_name', '%Sonoma%')
    .gte('service_date', '2026-01-01')
    .lte('service_date', '2026-12-31')
    .order('service_date', { ascending: false });

  if (error) { console.error(error); return; }

  if (services.length === 0) {
    console.log('No services found for anything containing "Sonoma" in all of 2026.');
  } else {
    console.log(`\nFound ${services.length} total visits for Sonoma in 2026:\n`);
    services.forEach(s => {
      console.log(`${s.service_date} | Hrs: ${s.total_labor_hours_num || 0} | ID: ${s.community_id || 'NULL'}`);
    });
  }

  console.log('\n--- SCAN COMPLETE ---');
}

scan();

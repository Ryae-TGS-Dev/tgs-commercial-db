import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrate() {
  console.log('--- Starting Crew Leader Migration ---');

  // 1. Create table
  await supabase.rpc('execute_sql', { sql: `
    CREATE TABLE IF NOT EXISTS crew_leaders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT UNIQUE NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `});

  // 2. Extract existing names from service_history
  const { data: history } = await supabase.from('service_history').select('crew_leader').not('crew_leader', 'is', null).neq('crew_leader', '');
  
  if (history) {
    const names = new Set<string>();
    history.forEach(r => names.add(r.crew_leader.trim()));
    
    console.log(`Found ${names.size} unique crew leaders. Inserting...`);

    const inserts = Array.from(names).map(name => ({ name }));
    const { error } = await supabase.from('crew_leaders').upsert(inserts, { onConflict: 'name' });
    
    if (error) console.error('Error inserting crew leaders:', error);
    else console.log('Successfully migrated crew leaders.');
  }

  console.log('--- Migration Finished ---');
}

migrate();

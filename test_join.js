const { createClient } = require('@supabase/supabase-js');

const url = "https://dymddhvvaurwukjtilzb.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bWRkaHZ2YXVyd3VranRpbHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzgwNDYsImV4cCI6MjA5MDgxNDA0Nn0.N339YrWEW3l7Q-sJAjYs93-OXHsKqlWhqwncq5S7jt8";
const supabase = createClient(url, key);
const id = '953eef10-0eb4-4e29-a3bc-4d256c848f15';

(async () => {
    const { data: history } = await supabase.from('service_history').select('*').eq('community_id', id);
    const { data: productUsage } = await supabase.from('service_product_usage').select('service_id, quantity_used, products(sku, unit_price), service_history!inner(community_id)').eq('service_history.community_id', id);
    
    const historyWithMaterials = history.map((h) => {
      const materials = productUsage.filter((u) => u.service_id === h.id);
      return { ...h, materials };
    });
    
    console.dir(historyWithMaterials.filter(h => h.materials.length > 0), { depth: null });
})();

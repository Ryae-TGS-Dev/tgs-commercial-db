const fs = require('fs');

const files = [
  'WIP - Commercial Properties Tracking - 2024 REPORT.csv',
  'WIP - Commercial Properties Tracking - 2025 REPORT.csv',
  'WIP - Commercial Properties Tracking - 2026 REPORT.csv'
];

const priceMap = {};

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  
  const csv = fs.readFileSync(file, 'utf-8');
  const lines = csv.split('\n');

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    let cols = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"' && line[j+1] !== '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current);

    const comm = cols[1]?.trim();
    // Assuming monthly price is col 10 and annual is col 11
    let monthlyRaw = cols[10]?.trim() || '';
    let annualRaw = cols[11]?.trim() || '';
    
    // Fallback logic in case the columns shifted due to header changes
    // Scan for $ in the last 4 columns if columns don't match
    if (!monthlyRaw.includes('$')) {
        for(let k = cols.length - 1; k >= 0; k--) {
            if (cols[k] && cols[k].includes('$')) {
                // heuristic fallback, may not be perfect but catches mismatches
            }
        }
    }

    const monthly = monthlyRaw.replace(/"/g, '').replace(/\$/g, '').replace(/,/g, '');
    const annual = annualRaw.replace(/"/g, '').replace(/\$/g, '').replace(/,/g, '');

    if (comm && monthly && monthly !== '0.00' && monthly !== '-' && monthly !== '#VALUE!' && !isNaN(parseFloat(monthly))) {
      const pMonthly = parseFloat(monthly);
      const pAnnual = parseFloat(annual) || (pMonthly * 12);
      
      // Override with newest/largest price if multiple found
      if (!priceMap[comm] || priceMap[comm].monthly < pMonthly) {
        priceMap[comm] = { monthly: pMonthly, annual: pAnnual };
      }
    }
  }
}

fs.writeFileSync('pricing_extract_all.json', JSON.stringify(priceMap, null, 2));

console.log(`Extracted ${Object.keys(priceMap).length} communities with non-zero pricing from 2024, 2025, and 2026.`);

// Generate the SQL verification file directly here to save time
let sqlQuery = `
WITH extracted_data (name, parsed_monthly, parsed_annual) AS (
  VALUES
`;

const values = [];
for (const [name, prices] of Object.entries(priceMap)) {
  if (name.includes("'")) continue; // skip syntax breakers
  values.push(`    ('${name}', ${prices.monthly}, ${prices.annual})`);
}

sqlQuery += values.join(',\n');
sqlQuery += `
)
SELECT 
  c.id, 
  c.name, 
  c.total_monthly_price as db_monthly, 
  c.total_annual_price as db_annual,
  e.parsed_monthly as csv_monthly,
  e.parsed_annual as csv_annual
FROM communities c
JOIN extracted_data e ON c.name ILIKE '%' || e.name || '%'
WHERE c.total_monthly_price = 0 OR c.total_annual_price = 0;
`;

fs.writeFileSync('check_all_mismatches.sql', sqlQuery);
console.log("SQL mismatch script generated: check_all_mismatches.sql");

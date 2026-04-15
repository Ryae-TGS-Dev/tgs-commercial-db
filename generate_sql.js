const fs = require('fs');

const pricing = JSON.parse(fs.readFileSync('pricing_extract.json', 'utf8'));

let sqlQuery = `
WITH extracted_data (name, parsed_monthly, parsed_annual) AS (
  VALUES
`;

const values = [];
for (const [name, prices] of Object.entries(pricing)) {
  if (name.includes("'")) continue; // skip names with single quotes to simplify SQL
  if (!prices.monthly || !prices.annual) continue;
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

fs.writeFileSync('check_mismatches.sql', sqlQuery);
console.log("SQL created.");

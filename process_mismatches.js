const fs = require('fs');

const contents = fs.readFileSync('C:/Users/Ryae Anthony/.gemini/antigravity/brain/5cc61818-f140-4bd7-83e4-7bb704d7611c/.system_generated/steps/348/output.txt', 'utf8');
const payload = JSON.parse(contents);
const resultStr = payload.result;
const start = resultStr.indexOf('[');
const end = resultStr.lastIndexOf(']');
const dataStr = resultStr.substring(start, end + 1);
const json = JSON.parse(dataStr);
console.log('Total mismatches found in DB:', json.length);

const unique = [...new Set(json.map(j => j.name))];
console.log('Unique properties affected:', unique.length);

let updateSql = '';
for (const row of json) {
  const m = parseFloat(row.csv_monthly) || 0;
  const a = parseFloat(row.csv_annual) || 0;
  updateSql += "UPDATE communities SET total_monthly_price = " + m + ", total_annual_price = " + a + " WHERE id = '" + row.id + "';\n";
}
fs.writeFileSync('bulk_update_prices.sql', updateSql);
console.log("bulk_update_prices.sql has been generated.");

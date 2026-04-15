const fs = require('fs');

const csv = fs.readFileSync('WIP - Commercial Properties Tracking - 2026 REPORT.csv', 'utf-8');
const lines = csv.split('\n');

const priceMap = {};

// Skip row 1, which has "TOTAL COUNT"
// Row 2 is the header
for (let i = 2; i < lines.length; i++) {
  // Rough CSV parse splitting by comma but ignoring commas inside quotes
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
  const monthly = cols[10]?.trim().replace(/"/g, '').replace(/\$/g, '').replace(/,/g, '');
  const annual = cols[11]?.trim().replace(/"/g, '').replace(/\$/g, '').replace(/,/g, '');

  if (comm && monthly && monthly !== '0.00' && monthly !== '-' && monthly !== '#VALUE!' && !isNaN(parseFloat(monthly))) {
    if (!priceMap[comm]) {
      priceMap[comm] = { monthly: parseFloat(monthly), annual: parseFloat(annual) };
    }
  }
}

fs.writeFileSync('pricing_extract.json', JSON.stringify(priceMap, null, 2));
console.log(`Extracted ${Object.keys(priceMap).length} communities with non-zero pricing.`);

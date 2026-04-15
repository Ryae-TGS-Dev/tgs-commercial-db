const fs = require('fs');

const contents = fs.readFileSync('C:/Users/Ryae Anthony/.gemini/antigravity/brain/5cc61818-f140-4bd7-83e4-7bb704d7611c/.system_generated/steps/348/output.txt', 'utf8');
const payload = JSON.parse(contents);
const resultStr = payload.result;
const start = resultStr.indexOf('[');
const end = resultStr.lastIndexOf(']');
const dataStr = resultStr.substring(start, end + 1);
const json = JSON.parse(dataStr);

let report = 'DB_UUID,DB_Name,CSV_Monthly_Price,CSV_Annual_Price\n';
for (const row of json) {
  // escaping comma inside names for the CSV report
  const cleanName = row.name.includes(',') ? `"${row.name}"` : row.name;
  report += `${row.id},${cleanName},${row.csv_monthly},${row.csv_annual}\n`;
}

fs.writeFileSync('update_preview.csv', report);
console.log('update_preview.csv has been generated!');

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, '..', '토에이산교 정산.xlsx'));
const sheet = wb.Sheets['1) LC Overview_240318갱신'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const idMap = {
  1:'d39d1bc0-654a-4e4f-8b09-962600af3212',
  2:'aa9625fb-c8e4-4b4f-9f9d-e6b93560e757',
  3:'49c10803-37ef-4d07-9529-f07d6890681d',
  4:'4672544b-96b8-42a4-ba55-17e7f11f39ed',
  5:'0e47d867-5080-493e-a58b-775961a98280',
  6:'6212d99b-4586-44c7-b0d9-8bc7c7d4b72b',
  7:'4b1855a5-9ff0-4ee2-8c11-04fbf8e62ea8',
  8:'b2d96dd0-12b2-4383-af61-61fe8d259e73',
  9:'25a655a3-976f-40ac-8aaf-7220a9dc9f61',
  10:'e025b978-3768-4eac-9a05-a8cf5ce6674c',
  11:'e276a85e-0b61-4322-872d-b1c57cbda705',
  12:'6f2b882f-9059-40ca-862e-be76884c204d',
  13:'6883c935-2c12-4305-9997-f70cac7a0510',
  14:'c4094b16-b301-49fd-a47b-f1549a1c1c82',
  15:'ccf750af-66a2-4224-8fa7-68a766c96169',
  16:'bf8ea88c-789d-419c-8c52-e58b9ff78bc9',
  17:'ddb92826-7f86-4806-9638-5fdaeb505369',
  18:'6c478ff8-1804-4ea7-b341-c4068cdfa752',
  19:'547bc4fd-f242-46aa-959c-19b339f34623',
  20:'08cf515b-58cd-444e-b0bb-eddc9655873d',
  21:'d7eef0ce-59bd-4a7f-b103-1eec12235781',
  22:'350553cd-d651-4219-b8ea-2b1626d1f414',
  23:'83f21778-675f-4ace-83e7-7a18a31d5f1c',
  24:'ac2b97c9-3337-4bad-8096-b18d29eff3b8',
  25:'3cf2d7e2-6cfa-4979-bb3f-868ead7daf82',
  26:'1d3d66a4-654d-4b26-92fb-d8e9a97f242a',
  27:'03542566-c14f-4abd-8145-8ea18141ad24',
  28:'516a72ff-7b40-4745-9871-71160318d6ca',
  29:'a130df17-eeab-48a5-b1bd-09941630e219',
  30:'4638f314-89bd-4bc9-8b38-997a4dcc3fbf',
  31:'c381e9e9-65f1-4ffe-b6d4-f2734eda8100',
  32:'94d52589-f70e-4f90-b51b-d2b2436b57cd',
  33:'505f69e0-4cf2-4e98-8aa4-811d450b467d',
  34:'4500bc54-bbec-4ffb-8666-e3b085ac5b1b',
  35:'e18c7162-dee0-4f19-b463-8397fd8bd4a8',
  36:'8ba8087b-343d-47ad-8fb8-fb517a906355',
  37:'1f974f27-7e99-4332-8537-fac0ef51b6a2',
  38:'ba3d6af9-33ac-44b1-836a-789a5f327c2a',
  39:'eb0281c7-2f46-4235-a708-d4392395cd07',
  40:'e0ffc911-a4f4-4b78-804a-4cc42c0427df',
  41:'a4e8fcaa-798a-41c7-90d4-567e0ddd37dc'
};

function extractRound(val) {
  if (!val) return null;
  const str = String(val).replace(/\s+/g, '');
  const m = str.match(/(\d+)차/);
  return m ? parseInt(m[1]) : null;
}

function esc(s) {
  if (s === null || s === undefined || s === '') return 'NULL';
  return "'" + String(s).replace(/'/g, "''").replace(/\r\n|\n|\r/g, ' ').trim() + "'";
}

let currentRound = null;
let currentSpec = null;
let currentColor = null;
const items = [];

for (let i = 0; i < data.length; i++) {
  const row = data[i];
  const col0  = row[0];
  const col13 = row[13]; // 스펙
  const col14 = row[14]; // 사이즈
  const col15 = row[15]; // 단가
  const col16 = row[16]; // 수량
  const col17 = row[17]; // 단위
  const col18 = row[18]; // 색상/g

  const rn = extractRound(col0);
  if (rn !== null) currentRound = rn;

  if (!currentRound) continue;
  if (!col14 || col14 === '') continue;
  if (typeof col14 === 'string' && col14.includes('사이즈')) continue;
  if (typeof col14 === 'string' && col14.replace(/\s+/g,'').includes('누적')) continue;
  if (typeof col14 === 'string' && col14.toLowerCase().includes('total')) continue;
  if (typeof col13 === 'string' && col13.toLowerCase().includes('total')) continue;
  if (typeof col13 === 'string' && col13.includes('스펙')) continue;
  if (typeof col16 !== 'number' || col16 <= 0) continue;

  if (col13 && col13 !== '') currentSpec = col13;
  if (col18 && col18 !== '') currentColor = col18;

  items.push({
    round: currentRound,
    tid: idMap[currentRound],
    spec: currentSpec,
    color: currentColor,
    size: col14,
    unit_price_usd: typeof col15 === 'number' ? col15 : null,
    quantity: Math.round(col16),
    unit: col17 || 'Cases'
  });
}

// 검증 요약
const byRound = {};
for (const it of items) {
  if (!byRound[it.round]) byRound[it.round] = [];
  byRound[it.round].push(it);
}

console.log('=== 파싱 결과 요약 ===');
console.log('총 품목 수:', items.length);
for (let r = 1; r <= 41; r++) {
  const its = byRound[r] || [];
  console.log(`  ${r}차: ${its.length}품목`);
}

// SQL 생성
let sql = `-- ============================================================
-- transaction_items 전체 마이그레이션 (1~41차)
-- 소스: 토에이산교 정산.xlsx → 1) LC Overview 탭
-- 생성일: ${new Date().toISOString().slice(0,10)}
-- 총 품목: ${items.length}건
-- ============================================================

BEGIN;

-- STEP 1: 잠금 해제 (1~33차 is_locked=true → false)
UPDATE transactions SET is_locked = false WHERE round_no BETWEEN 1 AND 33;

-- STEP 2: 기존 품목 삭제 (재실행 안전)
DELETE FROM transaction_items
WHERE transaction_id IN (SELECT id FROM transactions WHERE round_no BETWEEN 1 AND 41);

-- STEP 3: 품목 INSERT\n`;

// VALUES 블록 생성
const valueLines = [];
let sortOrder = 0;
let prevRound = null;

for (const it of items) {
  if (it.round !== prevRound) {
    sortOrder = 0;
    prevRound = it.round;
  }

  const priceStr = it.unit_price_usd !== null ? it.unit_price_usd.toString() : 'NULL';
  valueLines.push(
    `  ('${it.tid}', ${esc(it.spec)}, ${esc(it.color)}, ${esc(it.size)}, ` +
    `${priceStr}, ${it.quantity}, ${esc(it.unit)}, ${sortOrder++})`
  );
}

sql += `INSERT INTO transaction_items
  (transaction_id, spec, color, size, unit_price_usd, quantity, unit, sort_order)
VALUES\n`;
sql += valueLines.join(',\n') + ';\n';

sql += `
-- STEP 4: 재잠금 (1~33차)
UPDATE transactions SET is_locked = true WHERE round_no BETWEEN 1 AND 33;

-- STEP 5: 검증 쿼리
SELECT t.round_no, COUNT(ti.id) AS item_count
FROM transactions t
LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
GROUP BY t.round_no
ORDER BY t.round_no;

COMMIT;
`;

const outPath = path.join(__dirname, '..', 'scripts', 'migration_items.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log('\nSQL 파일 생성:', outPath);
console.log('SQL 파일 크기:', fs.statSync(outPath).size, 'bytes');

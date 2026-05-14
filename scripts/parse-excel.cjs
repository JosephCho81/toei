const XLSX = require('xlsx')

const filePath = 'C:/Users/Joseph/Desktop/2026_수입일람정리_최종정산내역 정리_수정6.xlsx'
const wb = XLSX.readFile(filePath, { cellDates: false, cellText: false })

// ─────────────────────────────────────────────
// 시트1: LC Overview - 전체 출력
// ─────────────────────────────────────────────
const ws1 = wb.Sheets['1) LC Overview_240318갱신']
const lc = XLSX.utils.sheet_to_json(ws1, { header: 1, defval: null })
console.log('\n===== 시트1: LC Overview 전체 =====')
lc.forEach((row, i) => {
  if (row.some(c => c !== null)) {
    console.log(`R${i+1}:`, JSON.stringify(row))
  }
})

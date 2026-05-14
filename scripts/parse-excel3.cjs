const XLSX = require('xlsx')
const filePath = 'C:/Users/Joseph/Desktop/2026_수입일람정리_최종정산내역 정리_수정6.xlsx'
const wb = XLSX.readFile(filePath, { cellDates: false, cellText: false })

const ws3 = wb.Sheets['3) 최종정산 내역_250429']
const closing = XLSX.utils.sheet_to_json(ws3, { header: 1, defval: null })
console.log('\n===== 시트3: 최종정산 내역 전체 =====')
closing.forEach((row, i) => {
  if (row.some(c => c !== null)) {
    console.log(`R${i+1}:`, JSON.stringify(row))
  }
})

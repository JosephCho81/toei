const XLSX = require('xlsx')
const filePath = 'C:/Users/Joseph/Desktop/2026_수입일람정리_최종정산내역 정리_수정6.xlsx'
const wb = XLSX.readFile(filePath, { cellDates: false, cellText: false })

// 시트2: 중간정산
const ws2 = wb.Sheets['2) 중간정산 내역_240318갱신']
const interim = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: null })
console.log('\n===== 시트2: 중간정산 내역 전체 =====')
interim.forEach((row, i) => {
  if (row.some(c => c !== null)) {
    console.log(`R${i+1}:`, JSON.stringify(row))
  }
})

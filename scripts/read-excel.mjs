import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'

const filePath = 'C:/Users/Joseph/Desktop/2026_수입일람정리_최종정산내역 정리_수정6.xlsx'
const wb = XLSX.readFile(filePath, { cellDates: false, cellText: false })

console.log('=== 시트 목록 ===')
console.log(wb.SheetNames)

// 각 시트의 첫 30행씩 출력
for (const name of wb.SheetNames) {
  if (name === '김거룩수정') continue
  const ws = wb.Sheets[name]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  console.log(`\n=== 시트: ${name} (총 ${data.length}행) ===`)
  console.log('첫 5행:')
  for (let i = 0; i < Math.min(5, data.length); i++) {
    console.log(`행${i+1}:`, JSON.stringify(data[i]))
  }
}

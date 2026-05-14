// 한국은행 ECOS API - 달러/원 최초 고시 환율
// 통계표코드: 731Y001, 주기: DD

export async function getBokExchangeRate(date: string): Promise<number | null> {
  const apiKey = process.env.BOK_API_KEY
  if (!apiKey) throw new Error('BOK_API_KEY is not configured')

  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/1/731Y001/DD/${date}/${date}`

  const res = await fetch(url, { next: { revalidate: 86400 } })
  if (!res.ok) return null

  const data = await res.json()
  const rows = data?.StatisticSearch?.row

  if (!Array.isArray(rows) || rows.length === 0) return null

  const value = parseFloat(rows[0].DATA_VALUE)
  return isNaN(value) ? null : value
}

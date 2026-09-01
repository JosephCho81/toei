/** 인쇄물 유출 대비 배경 워터마크. 화면·인쇄 모두에 옅게 깔린다. */
export function ConfidentialWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none select-none fixed inset-0 z-0 overflow-hidden"
      style={{ opacity: 0.04 }}
    >
      <div style={{
        position: 'absolute', inset: '-60%',
        display: 'flex', flexWrap: 'wrap', gap: '40px',
        transform: 'rotate(-45deg)', alignContent: 'flex-start',
      }}>
        {Array.from({ length: 300 }, (_, i) => (
          <span key={i} style={{ fontSize: '40px', fontWeight: 900, color: '#000', whiteSpace: 'nowrap' }}>
            대외비
          </span>
        ))}
      </div>
    </div>
  )
}

export function ReportBanner({ roundLabel, manufacturerName, orderNo }: {
  roundLabel: string
  manufacturerName: string | null
  orderNo: string | null
}) {
  return (
    <>
      <div className="border border-green-200 rounded-lg px-6 py-5 flex items-center justify-between bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/CI_a1korea.png" alt="한국에이원" style={{ height: '48px', objectFit: 'contain' }} />
        <div className="text-center">
          <h1 className="text-lg font-bold text-green-800">토에이산교 ↔ 한국에이원</h1>
          <p className="text-base font-semibold text-green-700 mt-0.5">정산 리포트</p>
          <p className="text-xs text-muted-foreground mt-1">
            {roundLabel}{manufacturerName ? ` | ${manufacturerName}` : ''}{orderNo ? ` | ${orderNo}` : ''}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/CI_toei.png" alt="토에이산교" style={{ height: '48px', objectFit: 'contain' }} />
      </div>
      <p className="text-xs text-right mb-4 mt-1" style={{ color: '#666666' }}>
        ※ 모든 금액은 부가세 별도 기준입니다.
      </p>
    </>
  )
}

/** 리포트 하단 서명·결재란. 결재 표는 인쇄할 때만 나온다. */
export function ReportFooter({ roundLabel, today }: { roundLabel: string; today: string }) {
  return (
    <>
      {/* 푸터 */}
      <footer className="mt-8 pt-4 border-t border-gray-200 text-xs text-muted-foreground flex justify-between items-center">
        <span>한국에이원 | {roundLabel} 정산 리포트</span>
        <span>{today} 생성</span>
      </footer>

      {/* 도장 란 (인쇄 시만 표시) */}
      <div className="hidden print:block mt-8 break-before-page">
        <p className="text-xs text-muted-foreground mb-2 text-center">결재</p>
        <table className="w-full border-collapse text-center text-sm" style={{ borderTop: '1px solid #9ca3af' }}>
          <thead>
            <tr>
              {['담당자', '확인자', '승인자'].map(h => (
                <th key={h} className="font-medium py-2 text-muted-foreground" style={{ border: '1px solid #9ca3af', width: '33.33%' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {[0, 1, 2].map(i => (
                <td key={i} style={{ border: '1px solid #9ca3af', height: '80px' }} />
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}

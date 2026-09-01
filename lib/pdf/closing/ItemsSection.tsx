import { Text, View } from '@react-pdf/renderer'
import { BORDER } from '../pdfStyles'
import { Row, krw, krwSigned } from '../parts'
import { s, rowStyles } from './styles'
import type { ClosingPdfData } from './types'

export function ItemsSection({ data }: { data: ClosingPdfData }) {
  return (
    <>
        {data.items.length > 0 && (
          <View>
            <Text style={s.sectionLabel}>수입 품목 내역</Text>
            <View style={s.itemsTable}>
              <View style={s.itemsHeaderRow}>
                <Text style={[s.itemsHeaderCell, { width: '26%' }]}>스펙</Text>
                <Text style={[s.itemsHeaderCell, { width: '18%', borderLeftWidth: 1, borderLeftColor: BORDER }]}>색상</Text>
                <Text style={[s.itemsHeaderCell, { width: '12%', borderLeftWidth: 1, borderLeftColor: BORDER }]}>사이즈</Text>
                <Text style={[s.itemsHeaderCell, { width: '20%', borderLeftWidth: 1, borderLeftColor: BORDER }]}>단가(USD)</Text>
                <Text style={[s.itemsHeaderCell, { width: '13%', borderLeftWidth: 1, borderLeftColor: BORDER }]}>수량</Text>
                <Text style={[s.itemsHeaderCell, { width: '11%', borderLeftWidth: 1, borderLeftColor: BORDER }]}>단위</Text>
              </View>
              {data.items.map((item, i) => {
                const isLast = i === data.items.length - 1
                const isEven = i % 2 === 1
                const rowStyle = isLast
                  ? (isEven ? s.itemsDataRowLastEven : s.itemsDataRowLast)
                  : (isEven ? s.itemsDataRowEven : s.itemsDataRow)
                return (
                  <View key={i} style={rowStyle}>
                    <Text style={[s.itemsCell, { width: '26%' }]}>{item.spec}</Text>
                    <Text style={[s.itemsCell, { width: '18%' }]}>{item.color}</Text>
                    <Text style={[s.itemsCell, { width: '12%' }]}>{item.size}</Text>
                    <Text style={[s.itemsCell, { width: '20%' }]}>{item.unitPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    <Text style={[s.itemsCell, { width: '13%' }]}>{item.quantity.toLocaleString('ko-KR')}</Text>
                    <Text style={[s.itemsCellLast, { width: '11%' }]}>{item.unit}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {data.interimRate != null && (
          <View>
            <Text style={s.sectionLabel}>중간정산 내역 (참고)</Text>
            <View style={s.table}>
              <Row label="통관환율" value={`${data.interimRate.toLocaleString('ko-KR')}원/$`} styles={rowStyles} />
              {data.shippingItems.map((item, i) => (
                <Row key={`sh-${i}`} label={item.itemName} value={krw(item.amountKrw)} even={(i + 1) % 2 === 1} indent styles={rowStyles} />
              ))}
              {data.shippingItems.length > 0 && (
                <Row
                  label="해상운임 소계"
                  value={krw(data.shippingItems.reduce((acc, r) => acc + r.amountKrw, 0))}
                  even={(data.shippingItems.length + 1) % 2 === 1}
                 styles={rowStyles} />
              )}
              {data.customsItems.map((item, i) => {
                const offset = 1 + data.shippingItems.length + (data.shippingItems.length > 0 ? 1 : 0)
                return (
                  <Row key={`cu-${i}`} label={item.itemName} value={krw(item.amountKrw)} even={(offset + i) % 2 === 1} indent styles={rowStyles} />
                )
              })}
              {data.customsItems.length > 0 && (
                <Row
                  label="통관비용 소계"
                  value={krw(data.customsItems.reduce((acc, r) => acc + r.amountKrw, 0))}
                  even={(1 + data.shippingItems.length + (data.shippingItems.length > 0 ? 1 : 0) + data.customsItems.length) % 2 === 1}
                 styles={rowStyles} />
              )}
              <Row
                label="중간정산 확정금액"
                value={data.interimConfirmedKrw != null ? krwSigned(data.interimConfirmedKrw) : '-'}
                isLast
              styles={rowStyles} />
            </View>
          </View>
        )}
    </>
  )
}

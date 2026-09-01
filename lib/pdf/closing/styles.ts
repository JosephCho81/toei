import { pdfStyles, GREEN, GRAY_BG, BORDER, WHITE, GREEN_GAIN, RED } from '../pdfStyles'
import { labelStyles } from '../parts'

export const s = {
  ...pdfStyles,
  fxGainText: { color: GREEN_GAIN, fontWeight: 700 as const },
  fxLossText: { color: RED, fontWeight: 700 as const },
  grandTotalBox: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
    padding: 12,
    marginTop: 12,
  },
  grandTotalRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 4,
  },
  grandTotalDivider: {
    borderTopWidth: 1,
    borderTopColor: '#A5D6A7',
    marginTop: 6,
    marginBottom: 6,
  },
  itemsTable: { borderWidth: 1, borderColor: BORDER },
  itemsHeaderRow: {
    flexDirection: 'row' as const,
    backgroundColor: GREEN,
    minHeight: 20,
    alignItems: 'center' as const,
  },
  itemsHeaderCell: {
    color: WHITE,
    fontSize: 7.5,
    fontWeight: 700 as const,
    paddingLeft: 5,
    paddingRight: 3,
    paddingTop: 4,
    paddingBottom: 4,
  },
  itemsDataRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 20,
    alignItems: 'center' as const,
  },
  itemsDataRowEven: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 20,
    alignItems: 'center' as const,
    backgroundColor: GRAY_BG,
  },
  itemsDataRowLast: {
    flexDirection: 'row' as const,
    minHeight: 20,
    alignItems: 'center' as const,
  },
  itemsDataRowLastEven: {
    flexDirection: 'row' as const,
    minHeight: 20,
    alignItems: 'center' as const,
    backgroundColor: GRAY_BG,
  },
  itemsCell: {
    fontSize: 8.5,
    paddingLeft: 5,
    paddingRight: 3,
    paddingTop: 4,
    paddingBottom: 4,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  itemsCellLast: {
    fontSize: 8.5,
    paddingLeft: 5,
    paddingRight: 3,
    paddingTop: 4,
    paddingBottom: 4,
  },
}


export const rowStyles = labelStyles('42%')

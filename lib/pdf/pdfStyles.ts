import { StyleSheet } from '@react-pdf/renderer'

export const GREEN = '#2E7D32'
export const GREEN_LIGHT = '#388E3C'
export const GRAY_BG = '#f7f9fc'
export const BORDER = '#A5D6A7'
export const TEXT = '#333333'
export const MUTED = '#5a6778'
export const WHITE = '#ffffff'
export const GREEN_GAIN = '#16a34a'
export const RED = '#dc2626'

export const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansKR',
    fontSize: 10,
    color: TEXT,
    paddingTop: 36,
    paddingBottom: 60,
    paddingLeft: 40,
    paddingRight: 40,
  },
  header: {
    backgroundColor: GREEN,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLogo: {
    height: 40,
    width: 80,
    objectFit: 'contain',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  companyName: {
    color: WHITE,
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 5,
    textAlign: 'center',
  },
  docTitle: {
    color: WHITE,
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 8.5,
    color: GREEN_LIGHT,
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 3,
  },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
  },
  rowOdd: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 26,
    alignItems: 'center',
  },
  rowEven: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 26,
    alignItems: 'center',
    backgroundColor: GRAY_BG,
  },
  lastRowOdd: {
    flexDirection: 'row',
    minHeight: 26,
    alignItems: 'center',
  },
  lastRowEven: {
    flexDirection: 'row',
    minHeight: 26,
    alignItems: 'center',
    backgroundColor: GRAY_BG,
  },
  summaryBox: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: GREEN,
    padding: 14,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: GREEN,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 700,
    color: GREEN,
  },
  paidView: {
    backgroundColor: GREEN_GAIN,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 3,
    paddingBottom: 3,
    alignSelf: 'flex-start',
  },
  unpaidView: {
    backgroundColor: RED,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 3,
    paddingBottom: 3,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: WHITE,
    fontSize: 9,
    fontWeight: 700,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
    fontSize: 8,
    color: '#9aa3b0',
  },
  disclaimer: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'right',
    marginBottom: 10,
  },
})

// 실행: node --test lib/products/sizes.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { sizeSequenceFor, nextSize, DEFAULT_SIZE_SEQUENCE, XS_FIRST_SIZE_SEQUENCE } from './sizes.ts'

test('마스터에 등록된 사이즈 순서가 최우선', () => {
  assert.deepEqual(sizeSequenceFor(['S', 'M'], 'A1 라텍스'), ['S', 'M'])
})

test('A1 라텍스·A1 니트릴만 XS 로 시작', () => {
  assert.deepEqual(sizeSequenceFor(null, 'A1 라텍스'), XS_FIRST_SIZE_SEQUENCE)
  assert.deepEqual(sizeSequenceFor(null, 'A1 니트릴'), XS_FIRST_SIZE_SEQUENCE)
  assert.deepEqual(sizeSequenceFor(null, 'A1 NITRILE'), XS_FIRST_SIZE_SEQUENCE)
})

test('A1 이 아닌 라텍스·니트릴은 XS 없음', () => {
  assert.deepEqual(sizeSequenceFor(null, '라텍스 장갑'), DEFAULT_SIZE_SEQUENCE)
  assert.deepEqual(sizeSequenceFor(null, '니트릴 블루'), DEFAULT_SIZE_SEQUENCE)
  assert.deepEqual(sizeSequenceFor(null, '비닐'), DEFAULT_SIZE_SEQUENCE)
  assert.deepEqual(sizeSequenceFor(null, null), DEFAULT_SIZE_SEQUENCE)
})

test('S 를 직접 고른 뒤에는 XS 로 되돌아가지 않는다', () => {
  // 담당자 보고 오류: XS,S,M,L 순서에서 첫 행을 S 로 바꾸면 다음 행이 XS 가 되던 문제
  assert.equal(nextSize(XS_FIRST_SIZE_SEQUENCE, ['S']), 'M')
  assert.equal(nextSize(XS_FIRST_SIZE_SEQUENCE, ['S', 'M']), 'L')
  assert.equal(nextSize(XS_FIRST_SIZE_SEQUENCE, ['M']), 'L')
})

test('순서대로 채운 경우는 그대로 이어간다', () => {
  assert.equal(nextSize(XS_FIRST_SIZE_SEQUENCE, []), 'XS')
  assert.equal(nextSize(XS_FIRST_SIZE_SEQUENCE, ['XS']), 'S')
  assert.equal(nextSize(XS_FIRST_SIZE_SEQUENCE, ['XS', 'S', 'M']), 'L')
})

test('순서를 다 쓰면 빈 값(직접 입력)', () => {
  assert.equal(nextSize(XS_FIRST_SIZE_SEQUENCE, ['XS', 'S', 'M', 'L']), '')
  assert.equal(nextSize(DEFAULT_SIZE_SEQUENCE, ['L']), '')
})

test('순서에 없는 사이즈를 쓰면 남은 것 중 첫 값', () => {
  assert.equal(nextSize(DEFAULT_SIZE_SEQUENCE, ['XXL']), 'S')
})

test('대소문자·공백 무시', () => {
  assert.equal(nextSize(XS_FIRST_SIZE_SEQUENCE, [' s ']), 'M')
})

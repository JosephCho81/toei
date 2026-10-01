import test from 'node:test'
import assert from 'node:assert/strict'
import { canEdit, canEditNotes, loginEmail, roleOf, toeiRedirect } from './role.ts'

test('ID 만 넣으면 내부 도메인을 붙이고, 이메일은 그대로 둔다', () => {
  assert.equal(loginEmail(' Toei '), 'toei@toei.local')
  assert.equal(loginEmail('alkorea'), 'alkorea@toei.local')
  assert.equal(loginEmail('a@b.com'), 'a@b.com')
})

test('역할은 app_metadata 에서만 읽는다 — user_metadata 의 역할은 무시한다', () => {
  assert.equal(roleOf({ app_metadata: { role: 'toei_user' } }), 'toei_user')
  assert.equal(roleOf({ app_metadata: {}, user_metadata: { role: 'a1_admin' } } as never), null)
  assert.equal(roleOf({ app_metadata: { role: 'superuser' } }), null)
  assert.equal(roleOf(null), null)
})

test('토에이는 메모만, 역할 없는 계정은 아무것도 못 고친다', () => {
  assert.equal(canEdit('a1_admin'), true)
  assert.equal(canEdit('toei_user'), false)
  assert.equal(canEditNotes('toei_user'), true)
  assert.equal(canEdit(null), false)
  assert.equal(canEditNotes(null), false)
})

test('토에이 차단 화면은 읽기 화면으로 보낸다', () => {
  assert.equal(toeiRedirect('/transactions/abc/interim'), '/transactions/abc/report')
  assert.equal(toeiRedirect('/transactions/abc/closing'), '/transactions/abc/report')
  assert.equal(toeiRedirect('/transactions/abc/edit'), '/transactions/abc')
  assert.equal(toeiRedirect('/transactions/new'), '/transactions')
  assert.equal(toeiRedirect('/payments/ledger'), null)
  assert.equal(toeiRedirect('/settings'), '/payments')
  assert.equal(toeiRedirect('/products'), '/payments')
  assert.equal(toeiRedirect('/payments'), null)
  assert.equal(toeiRedirect('/transactions/abc'), null)
  assert.equal(toeiRedirect('/transactions/abc/report'), null)
  assert.equal(toeiRedirect('/settlements/interim'), null)
})

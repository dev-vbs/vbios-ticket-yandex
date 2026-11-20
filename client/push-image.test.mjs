import test from 'node:test'
import assert from 'node:assert/strict'
import { loadNotificationImage } from './src/push-image.ts'

test('notification previews use only the authenticated attachment endpoint', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (...args) => {
    calls.push(args)
    return { ok: true, json: async () => ({ data: [{ mime_type: 'image/png', data: 'aGVsbG8=' }] }) }
  })
  assert.equal(await loadNotificationImage(42), 'data:image/png;base64,aGVsbG8=')
  assert.equal(calls[0][0], '/shm/v1/user/ticket/media/42')
  assert.equal(calls[0][1].credentials, 'same-origin')
  assert.equal(calls[0][1].cache, 'no-store')
  assert.equal(calls[0][1].redirect, 'error')
  assert.equal(await loadNotificationImage('https://example.test'), undefined)
  assert.equal(calls.length, 1)
})

test('unavailable or malformed attachments fall back to text notifications', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => ({ ok: false }))
  assert.equal(await loadNotificationImage(1), undefined)
  fetch.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ data: [{ mime_type: 'text/html', data: 'aGVsbG8=' }] }) }))
  assert.equal(await loadNotificationImage(1), undefined)
  fetch.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ data: [{ mime_type: 'image/png', data: 'bad data' }] }) }))
  assert.equal(await loadNotificationImage(1), undefined)
  fetch.mock.mockImplementation(async () => { throw new Error('offline') })
  assert.equal(await loadNotificationImage(1), undefined)
})

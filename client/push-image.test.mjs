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

test('large attachments are reduced before being used as notification images', async (t) => {
  const originalBitmap = globalThis.createImageBitmap
  const originalCanvas = globalThis.OffscreenCanvas
  t.after(() => {
    if (originalBitmap === undefined) delete globalThis.createImageBitmap
    else globalThis.createImageBitmap = originalBitmap
    if (originalCanvas === undefined) delete globalThis.OffscreenCanvas
    else globalThis.OffscreenCanvas = originalCanvas
  })
  let closed = false
  globalThis.createImageBitmap = async () => ({ width: 3000, height: 1500, close: () => { closed = true } })
  globalThis.OffscreenCanvas = class {
    constructor(width, height) { this.width = width; this.height = height }
    getContext() { return { drawImage: () => {} } }
    async convertToBlob() {
      assert.equal(this.width, 960)
      assert.equal(this.height, 480)
      return new Blob(['preview'], { type: 'image/jpeg' })
    }
  }
  const original = Buffer.alloc(2 * 1024 * 1024, 1).toString('base64')
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ data: [{ mime_type: 'image/png', data: original }] }) }))
  assert.equal(await loadNotificationImage(42), `data:image/jpeg;base64,${Buffer.from('preview').toString('base64')}`)
  assert.equal(closed, true)
})

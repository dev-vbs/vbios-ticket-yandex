const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const maxEncodedLength = 7 * 1024 * 1024
const maxPreviewLength = 1024 * 1024

async function preparePreview(data: string, mimeType: string): Promise<string | undefined> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
    return data.length <= maxPreviewLength ? `data:${mimeType};base64,${data}` : undefined
  }

  const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0))
  const bitmap = await createImageBitmap(new Blob([bytes], { type: mimeType }))
  try {
    const scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height))
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)))
    const context = canvas.getContext('2d')
    if (!context) return undefined
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const preview = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.75 })
    const previewBytes = new Uint8Array(await preview.arrayBuffer())
    if (previewBytes.length > maxPreviewLength * 3 / 4) return undefined
    let binary = ''
    for (let offset = 0; offset < previewBytes.length; offset += 8192) {
      binary += String.fromCharCode(...previewBytes.subarray(offset, offset + 8192))
    }
    return `data:image/jpeg;base64,${btoa(binary)}`
  } finally {
    bitmap.close()
  }
}

// The push contains only an attachment ID. The API checks the logged-in owner.
export async function loadNotificationImage(mediaId: unknown): Promise<string | undefined> {
  if (typeof mediaId !== 'number' || !Number.isSafeInteger(mediaId) || mediaId <= 0) return undefined

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(`/shm/v1/user/ticket/media/${mediaId}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    })
    if (!response.ok) return undefined
    const body = await response.json()
    const media = Array.isArray(body?.data) ? body.data[0] : body?.data
    if (!imageTypes.has(media?.mime_type) || typeof media?.data !== 'string' ||
        !media.data.length || media.data.length > maxEncodedLength ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(media.data)) return undefined
    return await preparePreview(media.data, media.mime_type)
  } catch {
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

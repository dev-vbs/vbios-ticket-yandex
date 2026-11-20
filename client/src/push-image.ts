const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const maxEncodedLength = 7 * 1024 * 1024

// The push contains only an attachment ID. The API checks the logged-in owner.
export async function loadNotificationImage(mediaId: unknown): Promise<string | undefined> {
  if (typeof mediaId !== 'number' || !Number.isSafeInteger(mediaId) || mediaId <= 0) return undefined

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
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
    return `data:${media.mime_type};base64,${media.data}`
  } catch {
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

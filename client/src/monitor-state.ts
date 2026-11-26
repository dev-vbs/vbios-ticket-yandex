export type MonitorState = 'online' | 'offline' | 'maintenance' | 'unknown'
export type MonitorSample = { at: number; status: string; latency_ms?: number | null }

export function hasMonitorLatency(value?: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function monitorState(status?: string, latency?: number | null): MonitorState {
  if (status === 'online' || status === 'offline' || status === 'maintenance') return status
  return hasMonitorLatency(latency) ? 'online' : 'unknown'
}

export function icmpReading(source: string | undefined, stale: boolean, latency?: number | null) {
  if (stale || source !== 'icmp') return 'Нет свежего замера'
  return hasMonitorLatency(latency) ? `${latency.toLocaleString('ru-RU')} мс` : 'Нет ответа ICMP'
}

export function monitorHistory(history: MonitorSample[] | undefined, now: number) {
  const currentBucket = Math.floor(now / 300000) * 300
  return Array.from({ length: 12 }, (_, index) => {
    const at = currentBucket - (11 - index) * 300
    const samples = (history || []).filter((sample) =>
      Number.isFinite(sample.at) && sample.at >= at && sample.at < at + 300 && sample.at <= now / 1000
    )
    // Keep an outage visible even if a later check in the same interval succeeds.
    const failure = samples.filter((sample) => sample.status === 'offline')
    const maintenance = samples.filter((sample) => sample.status === 'maintenance')
    const candidates = failure.length ? failure : maintenance.length ? maintenance : samples
    const sample = candidates.reduce<MonitorSample | undefined>((last, item) => !last || item.at > last.at ? item : last, undefined)
    return { at, sample, state: sample ? monitorState(sample.status, sample.latency_ms) : 'unknown' as const }
  })
}

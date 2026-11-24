import { useEffect, useState } from 'react';

// Browser-to-node HTTP RTT, never a fabricated ICMP or billing-server ping.
export default function NodeLatency({ url, refreshKey }: { url?: string; refreshKey?: number }) {
  const [latency, setLatency] = useState<number | null>(null);
  const [probeState, setProbeState] = useState<'checking' | 'missing' | 'failed' | 'ready'>('checking');
  useEffect(() => {
    setLatency(null);
    if (!url) { setProbeState('missing'); return; }
    let target: URL;
    try { target = new URL(url); } catch { setProbeState('failed'); return; }
    if (target.protocol !== 'https:' || target.username || target.password) { setProbeState('failed'); return; }
    setProbeState('checking');
    let stopped = false;
    let controller: AbortController | undefined;
    let timer: number;
    const measure = async () => {
      if (document.hidden) { timer = window.setTimeout(measure, 30000); return; }
      const samples: number[] = [];
      for (let i = 0; i < 3 && !stopped; i++) {
        controller = new AbortController();
        const timeout = window.setTimeout(() => controller?.abort(), 4000);
        try {
          target.searchParams.set('_probe', `${Date.now()}-${i}`);
          const start = performance.now();
          const response = await fetch(target, { signal: controller.signal, mode: 'cors', cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' });
          if (response.ok) samples.push(performance.now() - start);
          void response.body?.cancel().catch(() => {});
        } catch { /* Missing CORS or unavailable endpoint is not a successful probe. */ }
        finally { window.clearTimeout(timeout); }
      }
      if (!stopped) {
        samples.sort((a, b) => a - b);
        const middle = Math.floor(samples.length / 2);
        const median = samples.length % 2 ? samples[middle] : (samples[middle - 1] + samples[middle]) / 2;
        setLatency(samples.length ? Math.max(1, Math.round(median)) : null);
        setProbeState(samples.length ? 'ready' : 'failed');
        timer = window.setTimeout(measure, 5 * 60000);
      }
    };
    void measure();
    return () => { stopped = true; controller?.abort(); window.clearTimeout(timer); };
  }, [url, refreshKey]);
  const reading = probeState === 'ready' ? `Доступен · ≈${latency} мс`
    : probeState === 'checking' ? 'Проверяем…'
    : probeState === 'missing' ? 'Проверка не настроена' : 'Нет ответа HTTPS';
  const hint = probeState === 'failed' ? 'Браузер не получил успешный ответ. Причиной также могут быть DNS, сертификат или CORS.' : undefined;
  return <span className="monitor-latency" data-probe={probeState} title={hint}><strong>{reading}</strong><small>С вашего устройства · HTTPS</small></span>;
}

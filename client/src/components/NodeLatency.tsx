import { useEffect, useState } from 'react';

// Browser-to-node HTTP RTT, never a fabricated ICMP or billing-server ping.
export default function NodeLatency({ url }: { url?: string }) {
  const [latency, setLatency] = useState<number | null>(null);
  useEffect(() => {
    setLatency(null);
    if (!url) return;
    let target: URL;
    try { target = new URL(url); } catch { return; }
    if (target.protocol !== 'https:' || target.username || target.password) return;
    let stopped = false;
    let controller: AbortController | undefined;
    let timer: number;
    const measure = async () => {
      if (document.hidden) { timer = window.setTimeout(measure, 60000); return; }
      const samples: number[] = [];
      for (let i = 0; i < 3 && !stopped; i++) {
        controller = new AbortController();
        const timeout = window.setTimeout(() => controller?.abort(), 4000);
        try {
          target.searchParams.set('_probe', `${Date.now()}-${i}`);
          const start = performance.now();
          const response = await fetch(target, { signal: controller.signal, mode: 'cors', cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' });
          await response.arrayBuffer();
          if (response.ok) samples.push(performance.now() - start);
        } catch { /* Missing CORS or unavailable endpoint is not a successful probe. */ }
        finally { window.clearTimeout(timeout); }
      }
      if (!stopped) {
        samples.sort((a, b) => a - b);
        setLatency(samples.length ? Math.max(1, Math.round(samples[Math.floor(samples.length / 2)])) : null);
        timer = window.setTimeout(measure, 60000);
      }
    };
    void measure();
    return () => { stopped = true; controller?.abort(); window.clearTimeout(timer); };
  }, [url]);
  return <span className="monitor-latency" title="HTTP-задержка от вашего браузера до сервера; медиана до трёх измерений">{latency === null ? '—' : `~${latency} мс`}</span>;
}

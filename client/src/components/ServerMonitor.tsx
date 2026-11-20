import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NodeLatency from './NodeLatency';
import './ServerMonitor.css';

export type MonitorData = { enabled?: boolean; state?: string; checked_at?: number; nodes?: Array<{ name: string; country?: string; status?: string; ping_url?: string; latency_ms?: number | null }> };
const hasPing = (value?: number | null) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function ServerRow({ node, stale }: { node: NonNullable<MonitorData['nodes']>[number]; stale: boolean }) {
  const [browserReady, setBrowserReady] = useState(false);
  const ping = !stale && (hasPing(node.latency_ms) || browserReady);
  const state = stale ? 'unknown' : node.status === 'maintenance' ? 'maintenance' : node.status === 'offline' ? 'offline' : ping ? 'online' : 'unknown';
  const label = state === 'online' ? 'Доступен' : state === 'offline' ? 'Недоступен' : state === 'maintenance' ? 'Техработы' : 'Нет данных';
  const emoji = state === 'online' ? '✅' : state === 'offline' ? '❌' : state === 'maintenance' ? '🛠️' : '⚪';
  return <li className="server-status-row" data-state={state}>
    <span className="server-status-icon" aria-hidden="true">{emoji}</span>
    <div className="server-status-name"><strong>{node.name}</strong><small>{node.country || 'Локация не указана'}</small></div>
    <div className="server-status-result"><span className="server-status-label">{label}</span>
      {stale ? <span className="server-status-note">Данные устарели</span> : <NodeLatency url={node.ping_url} serverLatency={node.latency_ms} onResult={setBrowserReady} />}
    </div>
  </li>;
}

export default function ServerMonitor({ monitor }: { monitor: MonitorData }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const stale = monitor.state === 'unknown' || (typeof monitor.checked_at === 'number' && now / 1000 - monitor.checked_at > 180);
  const nodes = monitor.nodes || [];
  const verified = !stale ? nodes.filter(node => hasPing(node.latency_ms) && node.status !== 'offline' && node.status !== 'maintenance').length : 0;
  const failures = !stale ? nodes.filter(node => node.status === 'offline').length : 0;
  return <section className="server-status-panel" aria-label="Доступность серверов">
    <header><div><span className="server-status-eyebrow">📡 Мониторинг сети</span><h2>Доступность серверов</h2></div><span className="server-status-summary">{stale ? 'Нет свежих данных' : failures ? `${failures} недоступно` : verified ? `${verified} из ${nodes.length} проверено` : 'Автоматическая проверка'}</span></header>
    {nodes.length ? <ul>{nodes.map((node, index) => <ServerRow key={`${node.name}-${index}`} node={node} stale={stale} />)}</ul> : <p className="server-status-empty">⚪ Данных о серверах пока нет. Проверка обновляется автоматически.</p>}
    <footer><span>🟢 Доступен</span><span>🔴 Недоступен</span><span>⚪ Нет замера</span><Link to="/status">История проверок →</Link></footer>
    <p className="server-status-help">Задержка от биллинга и с вашего устройства может отличаться. Нет замера — доступность не подтверждена.</p>
  </section>;
}

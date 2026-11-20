import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NodeLatency from './NodeLatency';
import './ServerMonitor.css';

type Sample = { at: number; status: string; latency_ms?: number | null };
export type MonitorData = { enabled?: boolean; state?: string; checked_at?: number; nodes?: Array<{ id?: string; name: string; country?: string; status?: string; ping_url?: string; latency_ms?: number | null; history?: Sample[] }> };
const hasPing = (value?: number | null) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const stateOf = (status?: string, latency?: number | null) => status === 'offline' || status === 'maintenance' ? status : hasPing(latency) ? 'online' : 'unknown';
const labels: Record<string, string> = { online: 'Доступен', offline: 'Недоступен', maintenance: 'Техработы', unknown: 'Нет замера' };
function MiniNode({ node, stale, now }: { node: NonNullable<MonitorData['nodes']>[number]; stale: boolean; now: number }) {
  const [browserReady, setBrowserReady] = useState(false);
  const state = stale ? 'unknown' : node.status === 'offline' || node.status === 'maintenance' ? node.status : hasPing(node.latency_ms) || browserReady ? 'online' : 'unknown';
  const bucket = Math.floor(now / 300000) * 300;
  return <Link to="/status" className="network-widget__node" aria-label={`${node.name}: ${labels[state]}. Открыть мониторинг`}>
    <div className="network-widget__node-title"><strong>{node.name}</strong><i data-state={state} title={labels[state]} /></div>
    <div className="network-widget__reading"><span data-state={state}>{labels[state]}</span>{stale ? <small>Данные устарели</small> : <NodeLatency url={node.ping_url} serverLatency={node.latency_ms} onResult={setBrowserReady} />}</div>
    <div className="network-widget__bars" aria-label="Проверки за час, интервалы по 5 минут">{Array.from({ length: 12 }, (_, index) => {
      const at = bucket - (11 - index) * 300;
      const sample = (node.history || []).filter(item => item.at >= at && item.at < at + 300 && item.at <= now / 1000).reduce<Sample | undefined>((last, item) => !last || item.at > last.at ? item : last, undefined);
      const status = sample ? stateOf(sample.status, sample.latency_ms) : 'unknown';
      const title = new Date(at * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' · ' + (sample ? labels[status] : 'Нет проверки');
      return <span key={at} data-state={status} title={title} aria-label={title} />;
    })}</div>
  </Link>;
}
export default function ServerMonitor({ monitor }: { monitor: MonitorData }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const stale = monitor.state === 'unknown' || !monitor.checked_at || now / 1000 - monitor.checked_at > 360;
  const nodes = monitor.nodes || [];
  const verified = stale ? 0 : nodes.filter(node => stateOf(node.status, node.latency_ms) === 'online').length;
  const failures = !stale && nodes.some(node => node.status === 'offline');
  return <section className="network-widget" aria-label="Краткий мониторинг сети">
    <header><div><h2><i data-state={stale || !nodes.length ? 'unknown' : failures ? 'offline' : verified === nodes.length ? 'online' : 'unknown'} />Состояние сети</h2><p>{stale ? 'Нет свежих данных' : `${verified} из ${nodes.length} доступны по проверке биллинга`}</p></div><Link to="/status">Весь мониторинг <span aria-hidden="true">↗</span></Link></header>
    {nodes.length ? <div className="network-widget__grid">{nodes.map((node, index) => <MiniNode node={node} stale={stale} now={now} key={node.id || `${node.name}-${index}`} />)}</div> : <p className="network-widget__empty">Ожидаем первую проверку серверов.</p>}
    <footer>Последний час · одна полоска — 5 минут · серый цвет — нет подтверждённого замера</footer>
  </section>;
}

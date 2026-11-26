import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { icmpReading, monitorHistory, monitorState } from '../monitor-state';
import type { MonitorSample } from '../monitor-state';
import './ServerMonitor.css';

export type MonitorData = { enabled?: boolean; state?: string; checked_at?: number; latency_source?: string; nodes?: Array<{ id?: string; name: string; country?: string; status?: string; latency_ms?: number | null; history?: MonitorSample[] }> };
const labels: Record<string, string> = { online: 'Доступен', offline: 'Недоступен', maintenance: 'Техработы', unknown: 'Нет замера' };
function MiniNode({ node, stale, now, source }: { node: NonNullable<MonitorData['nodes']>[number]; stale: boolean; now: number; source?: string }) {
  const state = stale ? 'unknown' : monitorState(node.status, node.latency_ms);
  return <Link to="/status" className="network-widget__node" aria-label={`${node.name}: ${labels[state]}. Открыть мониторинг`}>
    <div className="network-widget__node-title"><strong>{node.name}</strong><i data-state={state} title={labels[state]} /></div>
    <div className="network-widget__reading"><strong>{icmpReading(source, stale, node.latency_ms)}</strong><div>ICMP · от биллинга</div></div>
    <div className="network-widget__bars" aria-label="Проверки за час, интервалы по 5 минут">{monitorHistory(node.history, now).map(({ at, sample, state: status }) => {
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
  const verified = stale ? 0 : nodes.filter(node => monitorState(node.status, node.latency_ms) === 'online').length;
  const failures = !stale && nodes.some(node => node.status === 'offline');
  return <section className="network-widget" aria-label="Краткий мониторинг сети">
    <header><div><h2><i data-state={stale || !nodes.length ? 'unknown' : failures ? 'offline' : verified === nodes.length ? 'online' : 'unknown'} />Состояние сети</h2><p>{stale ? 'Нет свежих данных' : `${verified} из ${nodes.length} доступны по проверке биллинга`}</p></div><Link to="/status">Весь мониторинг <span aria-hidden="true">↗</span></Link></header>
    {nodes.length ? <div className="network-widget__grid">{nodes.map((node, index) => <MiniNode node={node} stale={stale} now={now} source={monitor.latency_source} key={node.id || `${node.name}-${index}`} />)}</div> : <p className="network-widget__empty">Ожидаем первую проверку серверов.</p>}
    <footer>История проверок биллинга за час · одна полоска — 5 минут</footer>
  </section>;
}

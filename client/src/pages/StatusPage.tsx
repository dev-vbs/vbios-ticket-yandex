import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { monitorApi } from '../api/client';
import { ThemeToggle } from '../components/ThemeToggle';
import { config } from '../config';
import { hasMonitorLatency, monitorHistory, monitorState } from '../monitor-state';
import type { MonitorSample } from '../monitor-state';
import './StatusPage.css';

type Node = { id?: string; name: string; country?: string; status?: string; panel_reason?: string; latency_ms?: number | null; history?: MonitorSample[] };
type Monitor = { enabled?: boolean; state?: string; checked_at?: number; nodes?: Node[] };
const labels: Record<string, string> = { online: 'Доступен', offline: 'Недоступен', maintenance: 'Техработы', unknown: 'Нет данных' };
function nodeState(node: Node, stale: boolean) {
  return stale ? 'unknown' : monitorState(node.status, node.latency_ms);
}
export default function StatusPage() {
  const [data, setData] = useState<Monitor>({});
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const refresh = useRef<() => void>(() => {});
  useEffect(() => {
    let disposed = false, pending = false;
    const load = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const response = await monitorApi.get();
        const raw = response.data?.data ?? response.data;
        const value = Array.isArray(raw) ? raw[0] : raw;
        if (!value || !Array.isArray(value.nodes)) throw Error('Invalid monitor response');
        if (!disposed) { setData(value); setError(false); }
      } catch { if (!disposed) setError(true); }
      finally { pending = false; if (!disposed) { setLoading(false); setNow(Date.now()); } }
    };
    refresh.current = () => { void load(); };
    const visible = () => { if (!document.hidden) void load(); };
    void load();
    const timer = window.setInterval(() => { setNow(Date.now()); void load(); }, 5 * 60000);
    document.addEventListener('visibilitychange', visible);
    return () => { disposed = true; clearInterval(timer); document.removeEventListener('visibilitychange', visible); refresh.current = () => {}; };
  }, []);
  const nodes = data.nodes || [];
  const stale = error || data.state === 'unknown' || !data.checked_at || now / 1000 - data.checked_at > 360;
  const states = nodes.map(node => nodeState(node, stale));
  const online = states.filter(state => state === 'online').length;
  const summary = loading ? 'Получаем состояние серверов' : error ? 'Не удалось обновить данные' : !data.enabled ? 'Мониторинг не включён' : !nodes.length ? 'Нет данных о серверах' : states.includes('offline') ? 'Есть недоступные серверы' : states.includes('maintenance') ? 'На части серверов идут техработы' : online === nodes.length ? 'Все проверенные серверы доступны' : 'Ожидаем подтверждения доступности';
  return <div className="status-page"><div className="status-container">
    <header className="status-header"><Link to="/">{config.APP_NAME}</Link><div><Link to="/">В кабинет</Link><ThemeToggle /></div></header>
    <main><div className="status-title"><h1>Состояние сети</h1><p>Доступность нод и задержка подключения. Обновляем каждые 5 минут.</p></div>
      <section className="status-overview" aria-live="polite" data-state={stale ? 'unknown' : states.includes('offline') ? 'offline' : states.includes('maintenance') ? 'maintenance' : online === nodes.length && nodes.length ? 'online' : 'unknown'}><span className="status-dot" /><div><h2>{summary}</h2><p>{data.checked_at ? 'Последняя проверка: ' + new Date(data.checked_at * 1000).toLocaleTimeString('ru-RU') : 'Первая проверка ещё не получена'}</p></div><button type="button" onClick={() => refresh.current()}>Обновить</button></section>
      <div className="status-counts"><span><b>{online}</b> доступны</span><span><b>{states.filter(state => state === 'offline').length}</b> недоступны</span><span><b>{nodes.length}</b> всего нод</span></div>
      <section className="status-nodes" aria-label="Состояние нод">{nodes.map((node, index) => {
        const state = nodeState(node, stale);
        return <article className="status-node" key={node.id || index}><div className="status-node__heading"><div><h2>{node.name}</h2><p>{node.country || 'Локация не указана'}</p></div><span className="status-badge" data-state={state}><i className="status-dot" />{labels[state]}</span></div>
          <div className="status-bars" aria-label="История проверок за последний час, интервалы по 5 минут">{monitorHistory(node.history, now).map(({ at, sample, state: status }) => {
            const title = new Date(at * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' · ' + (sample ? labels[status] : 'Нет проверки') + (sample && hasMonitorLatency(sample.latency_ms) ? ' · ' + sample.latency_ms + ' мс' : '');
            return <span key={at} data-state={status} title={title} aria-label={title} />;
          })}</div><div className="status-node__footer"><span>60 минут назад</span><strong>{state === 'online' ? node.latency_ms + ' мс · от биллинга' : labels[state]}</strong><span>Сейчас</span></div>
          {node.panel_reason === 'node_not_found' && <p className="status-node__notice">Нода не найдена в панели по UUID. {state === 'online' ? 'TCP-проверка настроенного адреса успешна.' : 'Проверьте UUID Node и настройки проверки.'}</p>}
        </article>;
      })}</section>
      {!loading && !nodes.length && <p className="status-empty">{error ? 'Повторите проверку позже.' : 'Администратору нужно настроить monitor_nodes в config.main и доступ к Remnawave.'}</p>}
      <footer className="status-help"><div><span data-state="online" className="status-dot" />Доступен <span data-state="offline" className="status-dot" />Недоступен <span data-state="maintenance" className="status-dot" />Техработы <span className="status-dot" />Нет проверки</div><p>Полоска — пять минут. Красная показывает хотя бы один сбой за этот интервал. Серый цвет означает отсутствие подтверждённой проверки.</p><p>Статус панели Remnawave и TCP-проверка от биллинга не гарантируют доступность с каждого устройства. Это не ICMP ping.</p></footer>
    </main></div></div>;
}

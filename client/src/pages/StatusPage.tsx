import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { monitorApi } from '../api/client';
import { ThemeToggle } from '../components/ThemeToggle';
import { config } from '../config';
import './StatusPage.css';

type Sample = { at: number; status: string; latency_ms?: number | null };
type Node = { id?: string; name: string; country?: string; status?: string; latency_ms?: number | null; history?: Sample[] };
type Monitor = { enabled?: boolean; state?: string; checked_at?: number; nodes?: Node[] };
const labels: Record<string, string> = { online: 'Доступен', offline: 'Недоступен', maintenance: 'Техработы', unknown: 'Нет данных' };
function nodeState(node: Node, stale: boolean) {
  if (stale) return 'unknown';
  if (node.status === 'offline' || node.status === 'maintenance') return node.status;
  return node.status === 'online' && typeof node.latency_ms === 'number' && Number.isFinite(node.latency_ms) && node.latency_ms >= 0 ? 'online' : 'unknown';
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
    const timer = window.setInterval(() => { setNow(Date.now()); void load(); }, 60000);
    document.addEventListener('visibilitychange', visible);
    return () => { disposed = true; clearInterval(timer); document.removeEventListener('visibilitychange', visible); refresh.current = () => {}; };
  }, []);
  const nodes = data.nodes || [];
  const stale = error || data.state === 'unknown' || !data.checked_at || now / 1000 - data.checked_at > 180;
  const states = nodes.map(node => nodeState(node, stale));
  const online = states.filter(state => state === 'online').length;
  const summary = loading ? 'Получаем состояние серверов' : error ? 'Не удалось обновить данные' : !data.enabled ? 'Мониторинг не включён' : !nodes.length ? 'Нет данных о серверах' : states.includes('offline') ? 'Есть недоступные серверы' : states.includes('maintenance') ? 'На части серверов идут техработы' : online === nodes.length ? 'Все проверенные серверы доступны' : 'Ожидаем подтверждения доступности';
  const currentMinute = Math.floor(now / 60000) * 60;
  return <div className="status-page"><div className="status-container">
    <header className="status-header"><Link to="/">{config.APP_NAME}</Link><div><Link to="/">В кабинет</Link><ThemeToggle /></div></header>
    <main><div className="status-title"><h1>Состояние сети</h1><p>Доступность нод и задержка подключения. Обновляем раз в минуту.</p></div>
      <section className="status-overview" aria-live="polite" data-state={stale ? 'unknown' : states.includes('offline') ? 'offline' : online === nodes.length && nodes.length ? 'online' : 'unknown'}><span className="status-dot" /><div><h2>{summary}</h2><p>{data.checked_at ? 'Последняя проверка: ' + new Date(data.checked_at * 1000).toLocaleTimeString('ru-RU') : 'Первая проверка ещё не получена'}</p></div><button type="button" onClick={() => refresh.current()}>Обновить</button></section>
      <div className="status-counts"><span><b>{online}</b> доступны</span><span><b>{states.filter(state => state === 'offline').length}</b> недоступны</span><span><b>{nodes.length}</b> всего нод</span></div>
      <section className="status-nodes" aria-label="Состояние нод">{nodes.map((node, index) => {
        const state = nodeState(node, stale);
        const samples = new Map((node.history || []).map(sample => [sample.at, sample]));
        return <article className="status-node" key={node.id || index}><div className="status-node__heading"><div><h2>{node.name}</h2><p>{node.country || 'Локация не указана'}</p></div><span className="status-badge" data-state={state}><i className="status-dot" />{labels[state]}</span></div>
          <div className="status-bars" aria-label="История проверок за последние 60 минут">{Array.from({ length: 60 }, (_, i) => {
            const at = currentMinute - (59 - i) * 60;
            const sample = samples.get(at);
            const status = sample && labels[sample.status] ? sample.status : 'unknown';
            const title = new Date(at * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' · ' + (sample ? labels[status] : 'Нет проверки') + (typeof sample?.latency_ms === 'number' ? ' · ' + sample.latency_ms + ' мс' : '');
            return <span key={at} data-state={status} title={title} aria-label={title} />;
          })}</div><div className="status-node__footer"><span>60 минут назад</span><strong>{state === 'online' ? node.latency_ms + ' мс · от биллинга' : labels[state]}</strong><span>Сейчас</span></div>
        </article>;
      })}</section>
      {!loading && !nodes.length && <p className="status-empty">{error ? 'Повторите проверку позже.' : 'Администратору нужно настроить monitor_nodes в config.main и доступ к Remnawave.'}</p>}
      <footer className="status-help"><div><span data-state="online" className="status-dot" />Доступен <span data-state="offline" className="status-dot" />Недоступен <span data-state="maintenance" className="status-dot" />Техработы <span className="status-dot" />Нет проверки</div><p>Полоска — одна минута. Серый цвет означает отсутствие подтверждённого замера. Пропущенные проверки не считаются успешной работой.</p><p>Статус панели Remnawave и TCP-проверка от биллинга не гарантируют доступность с каждого устройства. Это не ICMP ping.</p></footer>
    </main></div></div>;
}

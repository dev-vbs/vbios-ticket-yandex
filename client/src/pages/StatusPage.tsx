import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconActivity, IconArrowLeft, IconChartBar, IconCircleCheck, IconHelpCircle, IconRefresh, IconServer, IconServerOff, IconTool } from '@tabler/icons-react';
import { monitorApi } from '../api/client';
import { ThemeToggle } from '../components/ThemeToggle';

import { config } from '../config';
import { hasMonitorLatency, icmpReading, monitorHistory, monitorState } from '../monitor-state';
import type { MonitorSample } from '../monitor-state';
import './StatusPage.css';

type Node = { id?: string; name: string; country?: string; status?: string; panel_reason?: string; latency_ms?: number | null; history?: MonitorSample[] };
type Monitor = { enabled?: boolean; state?: string; checked_at?: number; latency_source?: string; nodes?: Node[] };
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
  const metrics = [
    { label: 'Всего нод', value: nodes.length, icon: IconServer, state: 'total' },
    { label: 'Доступны', value: online, icon: IconCircleCheck, state: 'online' },
    { label: 'Недоступны', value: states.filter(state => state === 'offline').length, icon: IconServerOff, state: 'offline' },
    { label: 'Техработы', value: states.filter(state => state === 'maintenance').length, icon: IconTool, state: 'maintenance' },
    { label: 'Нет данных', value: states.filter(state => state === 'unknown').length, icon: IconHelpCircle, state: 'unknown' },
  ];
  const summary = loading ? 'Получаем состояние серверов' : error ? 'Не удалось обновить данные' : !data.enabled ? 'Мониторинг не включён' : !nodes.length ? 'Нет данных о серверах' : states.includes('offline') ? 'Есть недоступные серверы' : states.includes('maintenance') ? 'На части серверов идут техработы' : online === nodes.length ? 'Все проверенные серверы доступны' : 'Ожидаем подтверждения доступности';
  return <div className="status-page"><div className="status-container">
    <aside className="status-sidebar">
      <header><Link to="/"><img src={config.LOGO_URL} alt="" />{config.APP_NAME}</Link><ThemeToggle /></header>
      <nav aria-label="Разделы мониторинга">
        <a href="#status-overview"><IconChartBar size={18} />Обзор</a>
        <a href="#status-nodes"><IconServer size={18} />Ноды</a>
        <a href="#status-help"><IconHelpCircle size={18} />О проверках</a>
        <Link to="/"><IconArrowLeft size={18} />В кабинет</Link>
      </nav>
    </aside>
    <main className="status-main"><div className="status-title" id="status-overview"><h1>Состояние сети</h1><p>Статус нод и задержка ICMP от сервера биллинга. Обновление каждые 5 минут.</p></div>
      <section className="status-overview" aria-live="polite" data-state={stale ? 'unknown' : states.includes('offline') ? 'offline' : states.includes('maintenance') ? 'maintenance' : online === nodes.length && nodes.length ? 'online' : 'unknown'}><span className="status-dot" /><div><h2>{summary}</h2><p>{data.checked_at ? 'Проверка биллинга: ' + new Date(data.checked_at * 1000).toLocaleTimeString('ru-RU') : 'Ожидаем данные биллинга'}</p></div><button type="button" onClick={() => refresh.current()}><IconRefresh size={16} />Обновить</button></section>
      <section className="status-section" aria-labelledby="status-summary-heading">
        <h2 id="status-summary-heading">Сводка биллинга</h2>
        <div className="status-counts">{metrics.map(({ label, value, icon: Icon, state }) => (
          <div className="status-metric" key={state} data-state={state}>
            <span className="status-icon"><Icon size={19} aria-hidden="true" /></span>
            <div><span>{label}</span><strong>{loading || !data.enabled ? '—' : value}</strong></div>
          </div>
        ))}</div>
      </section>
      <section id="status-nodes" className="status-section" aria-labelledby="status-nodes-heading">
        <h2 id="status-nodes-heading">Состояние нод</h2>
        <div className="status-nodes">{nodes.map((node, index) => {
        const state = nodeState(node, stale);
        return <article className="status-node" key={node.id || index} data-state={state}><div className="status-node__heading"><span className="status-icon"><IconActivity size={19} aria-hidden="true" /></span><div><h3>{node.name}</h3>{node.country && <p>{node.country}</p>}</div><span className="status-badge"><i className="status-dot" />{labels[state]}</span></div>
          <div className="status-node__metrics"><div className="status-node__history"><p>История биллинга</p>
          <div className="status-bars" aria-label="История проверок за последний час, интервалы по 5 минут">{monitorHistory(node.history, now).map(({ at, sample, state: status }) => {
            const title = new Date(at * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' · ' + (sample ? labels[status] : 'Нет проверки') + (sample && hasMonitorLatency(sample.latency_ms) ? ' · ' + sample.latency_ms + ' мс' : '');
            return <span key={at} data-state={status} title={title} aria-label={title} />;
          })}</div><div className="status-node__footer"><span>Час назад</span><span>Сейчас</span></div></div>
          <div className="status-node__probe"><p>ICMP · от биллинга</p><strong className="monitor-latency">{icmpReading(data.latency_source, stale, node.latency_ms)}</strong></div></div>
          {node.panel_reason === 'node_not_found' && <p className="status-node__notice">Нода не найдена в панели по UUID. Проверьте UUID в Remnawave.</p>}
        </article>;
      })}</div>
      {!loading && !nodes.length && <p className="status-empty">{error ? 'Повторите проверку позже.' : 'Администратору нужно настроить monitor_nodes в config.main и доступ к Remnawave.'}</p>}
      </section>
      <footer id="status-help" className="status-help"><h2>О проверках</h2><div><span data-state="online" className="status-dot" />Доступен <span data-state="offline" className="status-dot" />Недоступен <span data-state="maintenance" className="status-dot" />Техработы <span className="status-dot" />Нет проверки</div><p>Полоски показывают историю биллинга за час с интервалом в пять минут.</p><p>Задержка измеряется ICMP от сервера биллинга. Если нода блокирует ICMP, статус Remnawave всё равно доступен.</p></footer>
    </main></div></div>;
}

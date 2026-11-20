import { useState } from "react";

const gb = (value: number) => `${(value / 1073741824).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ГБ`;
const day = (value?: string) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }) : value || "Дата не указана";

export default function TrafficChart({ values, days }: { values: number[]; days: string[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const samples = values.map((value) => Number.isFinite(value) && value >= 0 ? value : null);
  const valid = samples.filter((value): value is number => value !== null);
  const total = valid.reduce((sum, value) => sum + value, 0);
  const peak = Math.max(0, ...valid);
  const active = selected !== null && selected < samples.length ? selected : null;
  const peakIndex = samples.findIndex((value) => value === peak);
  const dateRange = days.length ? `${day(days[0])} — ${day(days[Math.min(days.length, samples.length) - 1])}` : "Доступный период";
  return <div className="remna-traffic remna-traffic-v2">
    <header className="remna-traffic-heading">
      <div><strong>Как вы расходуете трафик</strong><p>{dateRange} · даты по UTC</p></div>
      <span className="traffic-period-label">По дням</span>
    </header>
    {!valid.length ? <div className="traffic-empty"><strong>Пока нет статистики</strong><p>Когда панель передаст данные, здесь появится расход по дням.</p></div> : <>
      <div className="traffic-metrics">
        <div className="traffic-metric traffic-metric-primary"><span>Всего за период</span><strong>{gb(total)}</strong><small>Сумма доступных дневных замеров</small></div>
        <div className="traffic-metric"><span>В среднем за день</span><strong>{gb(total / valid.length)}</strong><small>По дням с данными: {valid.length}</small></div>
        <div className="traffic-metric"><span>Самый активный день</span><strong>{gb(peak)}</strong><small>{day(days[peakIndex])}</small></div>
      </div>
      <div className="traffic-plot-heading">
        <div><i /> <strong>Расход по дням</strong></div>
        <span>Нажмите на столбец, чтобы узнать расход</span>
      </div>
      <div className="traffic-selection" aria-live="polite">
        <span>{active === null ? "Выберите день на графике" : day(days[active])}</span>
        <strong>{active === null ? "Каждый столбец — один день" : samples[active] === null ? "Нет данных" : gb(samples[active]!)}</strong>
        {active !== null && <button type="button" onClick={() => setSelected(null)}>Сбросить выбор</button>}
      </div>
      <p className="traffic-scroll-hint">Проведите по графику, чтобы посмотреть остальные дни →</p>
      <div className="traffic-plot-scroll" tabIndex={0} role="region" aria-label="График расхода трафика по дням, прокручивается по горизонтали">
        <div className="traffic-plot" style={{ minWidth: Math.max(280, samples.length * 30) }}>
          <div className="traffic-y-labels" aria-hidden="true"><span>{gb(peak)}</span><span>{gb(peak / 2)}</span><span>0 ГБ</span></div>
          <div className="traffic-bars" role="group" aria-label="Выберите день">
            {samples.map((value, index) => <button key={index} type="button" className="traffic-day" aria-pressed={active === index}
              aria-label={`${day(days[index])}: ${value === null ? "нет данных" : gb(value)}`}
              onClick={() => setSelected(active === index ? null : index)}>
              <span className="traffic-day-track"><i className={value === null ? "is-missing" : value === 0 ? "is-zero" : ""}
                style={{ height: `${value === null || peak === 0 ? 0 : value / peak * 100}%` }} /></span>
              <span className="traffic-day-label">{index === 0 || index === samples.length - 1 || index % Math.max(1, Math.ceil(samples.length / 7)) === 0 ? day(days[index]) : ""}</span>
            </button>)}
          </div>
        </div>
      </div>
      <p className="traffic-chart-note">{total === 0 ? "В доступных замерах расход равен нулю." : "Показан расход, а не скорость соединения."} Лимит подписки и остаток смотрите в диагностике.</p>
      <details className="remna-traffic-details"><summary>Все значения по дням <span>{valid.length} с данными</span></summary>
        <div className="remna-table-wrap"><table className="remna-table remna-traffic-table">
          <thead><tr><th>Дата · UTC</th><th>Трафик</th><th>Доля расхода</th></tr></thead>
          <tbody>{samples.map((value, index) => <tr key={index}><td>{day(days[index])}</td><td>{value === null ? "Нет данных" : gb(value)}</td><td>{value === null || total === 0 ? "—" : `${(value / total * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`}</td></tr>)}</tbody>
        </table></div>
      </details>
    </>}
  </div>;
}

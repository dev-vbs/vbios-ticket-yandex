import { useState } from "react";

const colors = ["#f16c52", "#f5c85c", "#7fb0e2", "#a474c4", "#97c96b"];
const gb = (value: number) => `${(value / 1073741824).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ГБ`;
const day = (value?: string) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }) : value || "—";

export default function TrafficChart({ values, days }: { values: number[]; days: string[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const total = values.reduce((sum, value) => sum + value, 0);
  const size = Math.max(1, Math.ceil(values.length / 5));
  const periods = Array.from({ length: Math.ceil(values.length / size) }, (_, index) => {
    const start = index * size, end = Math.min(values.length, start + size);
    return { value: values.slice(start, end).reduce((sum, value) => sum + value, 0),
      label: start === end - 1 ? day(days[start]) : `${day(days[start])} — ${day(days[end - 1])}` };
  });
  let offset = 0;
  const active = selected === null ? null : periods[selected];
  const percent = (value: number) => (total ? value / total * 100 : 0).toLocaleString("ru-RU", { maximumFractionDigits: 1 });
  return <div className="remna-traffic">
    <header className="remna-traffic-heading"><div><strong>Расход трафика</strong><p>Последние 30 дней · время UTC</p></div><span>{values.length} дней</span></header>
    {!values.length ? <p>Данных за этот период пока нет.</p> : <>
      <div className="remna-traffic-overview">
        <div className="remna-donut">
          <svg viewBox="0 0 240 240" role="img" aria-label={`Расход: ${gb(total)}. Значения доступны в таблице ниже.`}>
            <circle cx="120" cy="120" r="86" fill="none" stroke="var(--mantine-color-default-border)" strokeWidth="30" />
            {periods.map((period, index) => {
              const share = total ? period.value / total * 100 : 0, start = offset; offset += share;
              return share > 0 ? <circle key={index} cx="120" cy="120" r="86" fill="none" stroke={colors[index]}
                strokeWidth={selected === index ? 36 : 30} pathLength="100" strokeDasharray={`${share} ${100 - share}`}
                strokeDashoffset={-start} transform="rotate(-90 120 120)" opacity={selected !== null && selected !== index ? 0.3 : 1}>
                <title>{period.label}: {gb(period.value)} · {percent(period.value)}%</title>
              </circle> : null;
            })}
          </svg>
          <div className="remna-donut-center"><span>{active ? "За период" : "Всего потрачено"}</span><strong>{gb(active ? active.value : total)}</strong><small>{active ? active.label : "за 30 дней"}</small></div>
        </div>
        <div className="remna-traffic-legend" aria-label="Расход по периодам">
          {periods.map((period, index) => <button type="button" key={index} aria-pressed={selected === index}
            onClick={() => setSelected(selected === index ? null : index)} className="remna-traffic-period">
            <i style={{ background: colors[index] }} /><span>{period.label}<small>{gb(period.value)}</small></span><strong>{percent(period.value)}%</strong>
          </button>)}
        </div>
      </div>
      {total === 0 && <p>За этот период трафик не расходовался.</p>}
      <details className="remna-traffic-details" open><summary>Расход по дням <span>{values.length} дней</span></summary>
        <div className="remna-table-wrap"><table className="remna-table remna-traffic-table">
          <thead><tr><th>Дата · UTC</th><th>Трафик</th><th>Доля за период</th></tr></thead>
          <tbody><tr className="remna-traffic-total"><td>Всего</td><td>{gb(total)}</td><td>{total ? "100%" : "—"}</td></tr>
            {values.map((value, index) => <tr key={index}><td>{day(days[index])}</td><td>{gb(value)}</td><td>
              <div className="remna-traffic-share"><span>{percent(value)}%</span><div><i style={{ width: `${total ? value / total * 100 : 0}%`, background: colors[Math.floor(index / size)] }} /></div></div>
            </td></tr>)}
          </tbody>
        </table></div>
      </details>
    </>}
  </div>;
}

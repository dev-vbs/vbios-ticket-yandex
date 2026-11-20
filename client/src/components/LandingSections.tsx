import { IconArrowRight, IconKey, IconShieldLock, IconHeadset } from '@tabler/icons-react';

type Entry = { title: string; description: string; price?: string; details?: string };
type Content = { catalog?: Entry[]; plans?: Entry[]; catalog_title?: string; plans_title?: string; catalog_description?: string; catalog_button?: string; plans_description?: string; plan_button?: string; geography_title?: string; geography_description?: string };
export default function LandingSections({ main, nodes, onStart }: { main: Content; nodes: { name: string; country?: string }[]; onStart: () => void }) {
  const catalog = main.catalog || [
    { title: 'Услуги и подписки', description: 'Выбор, подключение и продление в одном кабинете.' },
    { title: 'Управление доступом', description: 'Настройки и инструкции для ваших устройств.' },
    { title: 'Поддержка', description: 'Обращения и ответы специалистов сохраняются в кабинете.' },
  ];
  const icons = [IconKey, IconShieldLock, IconHeadset];
  return <>
    <section className="landing-section" id="welcome-catalog"><span className="landing-label">01 — ВОЗМОЖНОСТИ</span><h2>{main.catalog_title || 'Ваши сервисы. Один кабинет.'}</h2><p className="landing-lead">{main.catalog_description || 'Подключайте нужное, следите за сроком действия и оплачивайте услуги без лишних переходов.'}</p><div className="landing-catalog">{catalog.map((entry, index) => { const Icon = icons[index % icons.length]; return <article key={entry.title}><span className="landing-icon"><Icon size={21} /></span><h3>{entry.title}</h3><p>{entry.description}</p><button onClick={onStart} type="button">{main.catalog_button || 'Открыть кабинет'} <IconArrowRight size={16} /></button></article>; })}</div></section>
    {!!main.plans?.length && <section className="landing-section" id="welcome-plans"><span className="landing-label">02 — ТАРИФЫ</span><h2>{main.plans_title || 'Выберите подходящий вариант'}</h2><p className="landing-lead">{main.plans_description || 'Выберите подходящую подписку. Актуальные условия и оплата — в кабинете.'}</p><div className="landing-plans">{main.plans.map(entry => <article key={entry.title}><h3>{entry.title}</h3><strong>{entry.price}</strong><p>{entry.description}</p>{entry.details && <p className="landing-plan-details">{entry.details}</p>}<button type="button" onClick={onStart}>{main.plan_button || 'Выбрать тариф'} <IconArrowRight size={16} /></button></article>)}</div></section>}
    {!!nodes.length && <section className="landing-geography" id="welcome-geography"><span className="landing-label">СЕТЬ — ГЕОГРАФИЯ</span><h2>{main.geography_title || 'Выберите свою локацию'}</h2><p>{main.geography_description || 'Доступные локации зависят от выбранной подписки. Состояние серверов можно посмотреть в мониторинге выше.'}</p><div>{nodes.map((node, index) => <article key={`${node.name}-${index}`}><span>{String(index + 1).padStart(2, '0')} / ЛОКАЦИЯ</span><h3>{node.name}</h3><p>{node.country}</p></article>)}</div></section>}
  </>;
}

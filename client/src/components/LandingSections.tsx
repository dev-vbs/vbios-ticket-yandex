import { IconArrowRight, IconKey, IconShieldLock, IconHeadset } from '@tabler/icons-react';

type Entry = { title: string; description: string; price?: string; details?: string };
type Content = { catalog?: Entry[]; plans?: Entry[]; catalog_title?: string; plans_title?: string; catalog_description?: string; catalog_button?: string; plans_description?: string; plan_button?: string; geography_title?: string; geography_description?: string };
export function LandingPlans({ main, onStart }: { main: Content; onStart: () => void }) {
  if (!main.plans?.length) return null;
  return <section className="landing-section landing-pricing" id="welcome-plans" aria-labelledby="welcome-plans-title">
    <h2 id="welcome-plans-title">{main.plans_title || 'Подписка под ваши задачи.'}</h2><p className="landing-lead">{main.plans_description || 'Сравните стоимость и срок. Выберите подписку — оформление продолжится в кабинете.'}</p>
    <div className="landing-plans">{main.plans.map((entry, index) => <article key={index}>
      <h3>{entry.title}</h3><div className="landing-plan-price"><span>Стоимость</span><strong>{entry.price}</strong></div>
      {entry.details && <p className="landing-plan-details">{entry.details}</p>}
      {entry.description && <p className="landing-plan-description">{entry.description}</p>}
      <button type="button" onClick={onStart} aria-label={(main.plan_button || 'Выбрать подписку') + ': ' + entry.title}>{main.plan_button || 'Выбрать подписку'} <IconArrowRight size={18} /></button>
    </article>)}</div>
    <p className="landing-pricing__note">Выбор и оплата — в личном кабинете. Итоговые условия будут показаны перед оплатой.</p>
  </section>;
}
export default function LandingSections({ main, nodes, onStart }: { main: Content; nodes: { name: string; country?: string }[]; onStart: () => void }) {
  const catalog = main.catalog || [
    { title: 'Услуги и подписки', description: 'Выбор, подключение и продление в одном кабинете.' },
    { title: 'Управление доступом', description: 'Настройки и инструкции для ваших устройств.' },
    { title: 'Поддержка', description: 'Обращения и ответы специалистов сохраняются в кабинете.' },
  ];
  const icons = [IconKey, IconShieldLock, IconHeadset];
  return <>
    <section className="landing-section" id="welcome-catalog"><span className="landing-label">01 — ВОЗМОЖНОСТИ</span><h2>{main.catalog_title || 'Ваши сервисы. Один кабинет.'}</h2><p className="landing-lead">{main.catalog_description || 'Подключайте нужное, следите за сроком действия и оплачивайте услуги без лишних переходов.'}</p><div className="landing-catalog">{catalog.map((entry, index) => { const Icon = icons[index % icons.length]; return <article key={entry.title}><span className="landing-icon"><Icon size={21} /></span><h3>{entry.title}</h3><p>{entry.description}</p><button onClick={onStart} type="button">{main.catalog_button || 'Открыть кабинет'} <IconArrowRight size={16} /></button></article>; })}</div></section>
    {!!nodes.length && <section className="landing-geography" id="welcome-geography"><span className="landing-label">СЕТЬ — ГЕОГРАФИЯ</span><h2>{main.geography_title || 'Выберите свою локацию'}</h2><p>{main.geography_description || 'Доступные локации зависят от выбранной подписки. Состояние серверов можно посмотреть в мониторинге выше.'}</p><div>{nodes.map((node, index) => <article key={`${node.name}-${index}`}><span>{String(index + 1).padStart(2, '0')} / ЛОКАЦИЯ</span><h3>{node.name}</h3><p>{node.country}</p></article>)}</div></section>}
  </>;
}

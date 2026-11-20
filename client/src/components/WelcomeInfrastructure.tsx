import { Link } from 'react-router-dom';
import { IconArrowUpRight } from '@tabler/icons-react';

type Card = { title: string; description?: string };
function ServerShape({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <path d="M30 70 100 30 170 70 100 110Z M30 70v58l70 41 70-41V70 M100 110v59" />
    <path d="m42 94 46 27m-46-11 46 27m25-14 42-25m-42 41 42-25" />
    <ellipse cx="47" cy="125" rx="4" ry="6" transform="rotate(-30 47 125)" />
    <path d="m61 134 19 11" />
  </g>;
}
function InfrastructureArt({ network = false }: { network?: boolean }) {
  return <svg className="infrastructure-art" viewBox="0 0 240 290" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {network ? <>
      <path d="M120 88V45m0 0L62 78m58-33 58 33M62 78v27m116-27v27" />
      <circle cx="120" cy="30" r="14" /><circle cx="120" cy="30" r="5" />
      <path d="M120 8V3m0 54v-5M98 30h-5m54 0h-5m-38-16-4-4m40 40-4-4m0-32 4-4m-40 40 4-4" />
      <g transform="translate(5 45) scale(.72)"><ServerShape /></g>
      <g transform="translate(91 91) scale(.72)"><ServerShape /></g>
      <path d="m41 192 44 26m69 16 43-25" strokeDasharray="3 6" />
      <circle cx="42" cy="192" r="5" /><circle cx="198" cy="209" r="5" /><circle cx="119" cy="251" r="6" />
    </> : <>
      <path d="M55 126C12 107 24 52 57 56c10-39 63-49 82-13 33-5 57 25 50 53 39 24 27 72-4 78" />
      <path d="M60 58c17-21 47-22 63 0 21-4 47 15 49 37" opacity=".65" />
      <g transform="translate(12 80)"><ServerShape /><path d="M30 140v30l70 41 70-41v-30M100 184v27m-55-48 36 21m33 8 37-22" /><ellipse cx="48" cy="177" rx="4" ry="6" transform="rotate(-30 48 177)" /></g>
    </>}
  </svg>;
}
export default function WelcomeInfrastructure({ cards, onStart }: { cards?: Card[]; onStart: () => void }) {
  return <div className="infrastructure-grid">
    <button className="infrastructure-card" type="button" onClick={onStart}>
      <span className="infrastructure-card__top">Подключение <IconArrowUpRight size={40} stroke={1} /></span>
      <InfrastructureArt />
      <span className="infrastructure-card__bottom"><strong>{cards?.[0]?.title || 'Ваша подписка. Ваши устройства.'}</strong><small>{cards?.[0]?.description || 'Выберите услугу и начните пользоваться'}</small></span>
    </button>
    <Link className="infrastructure-card" to="/status">
      <span className="infrastructure-card__top">Состояние сети <IconArrowUpRight size={40} stroke={1} /></span>
      <InfrastructureArt network />
      <span className="infrastructure-card__bottom"><strong>{cards?.[1]?.title || 'Сеть под контролем.'}</strong><small>{cards?.[1]?.description || 'Доступность серверов и история проверок'}</small></span>
    </Link>
  </div>;
}

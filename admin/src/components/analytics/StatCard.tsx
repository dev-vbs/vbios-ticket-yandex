import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: ReactNode;
  value: string | number;
  icon: LucideIcon;
  color: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  trend,
  loading = false,
  onClick,
}: StatCardProps) {
  const colorClasses: Record<string, { bg: string; text: string; glow: string }> = {
    cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    violet: { bg: 'bg-violet-500/20', text: 'text-violet-400', glow: 'shadow-violet-500/20' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
    rose: { bg: 'bg-rose-500/20', text: 'text-rose-400', glow: 'shadow-rose-500/20' },
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
    orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
    pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', glow: 'shadow-pink-500/20' },
  };

  const colors = colorClasses[color] || colorClasses.cyan;

  return (
    <div
      className={`card p-5 transition-all duration-200 ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium truncate"
            style={{ color: 'var(--theme-content-text-muted)' }}
          >
            {title}
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--theme-content-text)' }}>
            {loading ? (
              <span className="inline-block w-16 h-8 bg-slate-700 animate-pulse rounded" />
            ) : (
              value
            )}
          </p>
          {subtitle && (
            <p
              className="text-xs mt-1 truncate"
              style={{ color: 'var(--theme-content-text-muted)' }}
            >
              {subtitle}
            </p>
          )}
          {trend && !loading && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--theme-content-text-muted)' }}
                >
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0 ml-3`}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
      </div>
    </div>
  );
}

interface StatCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
}

export function StatCardGrid({ children, columns = 4 }: StatCardGridProps) {
  const colClasses: Record<number, string> = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  };

  return (
    <div className={`grid ${colClasses[columns]} gap-4`}>
      {children}
    </div>
  );
}

export default StatCard;

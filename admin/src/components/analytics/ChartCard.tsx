import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface ChartCardProps {
  title: ReactNode;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  loading?: boolean;
}

export function ChartCard({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-cyan-400',
  children,
  actions,
  className = '',
  loading = false,
}: ChartCardProps) {
  return (
    <div className={`card ${className}`}>
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--theme-content-text)' }}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="card-body">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: string | number;
  color?: string;
  percentage?: number;
}

export function MetricRow({ label, value, color, percentage }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'var(--theme-card-border)' }}>
      <div className="flex items-center gap-2">
        {color && (
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <span style={{ color: 'var(--theme-content-text)' }}>{label}</span>
      </div>
      <div className="flex items-center gap-3">
        {percentage !== undefined && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--theme-sidebar-item-active-bg)',
              color: 'var(--theme-primary-color)',
            }}
          >
            {percentage.toFixed(1)}%
          </span>
        )}
        <span className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
          {value}
        </span>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
}

export function EmptyState({
  title = 'Нет данных',
  description = 'Данные для отображения отсутствуют',
  icon: Icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <Icon
          className="w-12 h-12 mb-4"
          style={{ color: 'var(--theme-content-text-muted)' }}
        />
      )}
      <h4 className="font-medium mb-1" style={{ color: 'var(--theme-content-text)' }}>
        {title}
      </h4>
      <p className="text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
        {description}
      </p>
    </div>
  );
}

export default ChartCard;

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'emerald' | 'amber' | 'indigo' | 'rose' | 'purple';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}) => {
  const variantStyles = {
    default: {
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-slate-100 text-slate-700',
      textColor: 'text-slate-900',
    },
    emerald: {
      bg: 'bg-white',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-50 text-emerald-600',
      textColor: 'text-emerald-950',
    },
    amber: {
      bg: 'bg-white',
      border: 'border-amber-200',
      iconBg: 'bg-amber-50 text-amber-600',
      textColor: 'text-amber-950',
    },
    indigo: {
      bg: 'bg-white',
      border: 'border-indigo-200',
      iconBg: 'bg-indigo-50 text-indigo-600',
      textColor: 'text-indigo-950',
    },
    rose: {
      bg: 'bg-white',
      border: 'border-rose-200',
      iconBg: 'bg-rose-50 text-rose-600',
      textColor: 'text-rose-950',
    },
    purple: {
      bg: 'bg-white',
      border: 'border-purple-200',
      iconBg: 'bg-purple-50 text-purple-600',
      textColor: 'text-purple-950',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className={cn(
        'rounded-xl border p-5 shadow-sm transition-all hover:shadow-md',
        style.bg,
        style.border
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', style.iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3">
        <div className={cn('text-2xl font-bold tracking-tight', style.textColor)}>
          {value}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

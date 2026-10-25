import React from 'react';
import { SquircleCard } from './SquircleCard';

interface ModuleCardProps {
  icon: React.ComponentType<{ className?: string }>;
  /** Tailwind classes for the icon badge (background, border, text colour). */
  iconTone?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/** Card with an icon + title header, used by every panel module and most settings sections. */
export const ModuleCard: React.FC<ModuleCardProps> = ({
  icon: Icon,
  iconTone = 'bg-theme-accent/15 border-theme-accent/25 text-theme-accent',
  title,
  subtitle,
  actions,
  className = 'bg-theme-card border border-theme-border',
  children,
}) => (
  <SquircleCard elevation={2} radius="lg" className={`p-4 shadow-squircle space-y-3 ${className}`}>
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-8 h-8 rounded-squircle border flex items-center justify-center shrink-0 ${iconTone}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-theme-text truncate">{title}</h3>
          {subtitle && <p className="text-[10px] text-theme-text-muted mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </div>
    {children}
  </SquircleCard>
);

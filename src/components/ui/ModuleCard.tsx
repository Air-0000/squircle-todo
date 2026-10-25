import React from 'react';

interface ModuleCardProps {
  icon: React.ComponentType<{ className?: string }>;
  /** Classes for the icon square (background + icon colour). */
  iconTone?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right side of the header, usually plain text buttons. */
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/** Card with an icon + title header, used by every panel module. */
export const ModuleCard: React.FC<ModuleCardProps> = ({
  icon: Icon,
  iconTone = 'bg-theme-accent text-theme-accent-contrast',
  title,
  subtitle,
  actions,
  className = '',
  children,
}) => (
  <section className={`bg-theme-card rounded-squircle-md shadow-squircle p-4 space-y-3.5 ${className}`}>
    <header className="flex items-center gap-3">
      <span className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0 ${iconTone}`}>
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="text-body font-semibold text-theme-text truncate">{title}</h3>
        {subtitle && <p className="text-footnote text-theme-text-secondary truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </header>
    {children}
  </section>
);

/** Plain accent text button for card headers ("编辑", "重置"). */
export const TextButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'accent' | 'danger' | 'muted' }> = ({
  tone = 'accent',
  className = '',
  ...rest
}) => (
  <button
    type="button"
    className={`h-8 px-1.5 text-callout font-medium flex items-center gap-1 active:opacity-50 transition-opacity ${
      tone === 'danger' ? 'text-rose-500' : tone === 'muted' ? 'text-theme-text-secondary' : 'text-theme-accent'
    } ${className}`}
    {...rest}
  />
);

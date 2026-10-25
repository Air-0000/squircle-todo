/**
 * iOS-style grouped lists: a Section is an optional caption above a rounded
 * card; Rows inside it are separated by hairlines inset past their icon.
 */
import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SectionProps {
  title?: React.ReactNode;
  /** Right side of the caption line (e.g. a "全部已读" text button). */
  action?: React.ReactNode;
  footer?: React.ReactNode;
  /** 'list' stacks Rows with separators; 'card' is a padded free-form card. */
  variant?: 'list' | 'card' | 'plain';
  className?: string;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, action, footer, variant = 'list', className = '', children }) => (
  <section className={className}>
    {(title || action) && (
      <div className="flex items-end justify-between gap-3 px-4 pb-1.5 min-h-[22px]">
        {title && <h2 className="text-footnote text-theme-text-secondary">{title}</h2>}
        {action && <div className="text-footnote shrink-0">{action}</div>}
      </div>
    )}
    {variant === 'plain' ? (
      children
    ) : (
      <div
        className={`bg-theme-card rounded-squircle-md shadow-squircle overflow-hidden ${
          variant === 'card' ? 'p-4 space-y-3' : '[&>*:last-child_.row-sep]:border-transparent'
        }`}
      >
        {children}
      </div>
    )}
    {footer && <p className="px-4 pt-1.5 text-caption text-theme-text-muted leading-relaxed">{footer}</p>}
  </section>
);

/** Rounded coloured square holding a row icon, as in iOS Settings. */
export const RowIcon: React.FC<{ icon: React.ComponentType<{ className?: string }>; className?: string }> = ({
  icon: Icon,
  className = 'bg-theme-accent text-theme-accent-contrast',
}) => (
  <span className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0 ${className}`}>
    <Icon className="w-[18px] h-[18px]" />
  </span>
);

interface RowProps {
  /** Leading element: a RowIcon, a CheckButton, … */
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Trailing value text, shown in secondary colour. */
  value?: React.ReactNode;
  /** Any trailing control (Switch, badge, …). */
  trailing?: React.ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  tone?: 'default' | 'accent' | 'danger';
  /** Extra content under the row (e.g. an expanded editor). */
  children?: React.ReactNode;
  titleClassName?: string;
  className?: string;
}

export const Row: React.FC<RowProps> = ({
  leading,
  title,
  subtitle,
  value,
  trailing,
  chevron,
  onClick,
  tone = 'default',
  children,
  titleClassName = '',
  className = '',
}) => {
  const titleColor = tone === 'danger' ? 'text-rose-500' : tone === 'accent' ? 'text-theme-accent' : 'text-theme-text';
  const Tag = onClick ? 'button' : 'div';
  return (
    <div className={className}>
      <Tag
        {...(onClick ? { type: 'button' as const, onClick } : {})}
        className={`w-full flex items-center gap-3 pl-4 text-left ${onClick ? 'active:bg-theme-card-subtle transition-colors' : ''}`}
      >
        {leading}
        <div className="row-sep flex-1 min-w-0 flex items-center gap-3 pr-4 py-3 min-h-[48px] border-b border-theme-border">
          <div className="flex-1 min-w-0">
            <div className={`text-body ${titleColor} ${titleClassName}`}>{title}</div>
            {subtitle && <div className="text-footnote text-theme-text-secondary mt-0.5">{subtitle}</div>}
          </div>
          {value !== undefined && <div className="text-body text-theme-text-secondary shrink-0 tabular-nums">{value}</div>}
          {trailing}
          {chevron && <ChevronRight className="w-4 h-4 text-theme-text-muted shrink-0 -mr-1" />}
        </div>
      </Tag>
      {children}
    </div>
  );
};

/** Small rounded label for statuses ("紧急", "已启用", unread counts). */
export const Badge: React.FC<{ tone?: 'accent' | 'danger' | 'neutral' | 'success'; children: React.ReactNode; className?: string }> = ({
  tone = 'neutral',
  children,
  className = '',
}) => {
  const tones = {
    accent: 'bg-theme-accent-subtle text-theme-accent',
    danger: 'bg-rose-500/10 text-rose-500',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    neutral: 'bg-theme-card-subtle text-theme-text-secondary',
  };
  return (
    <span className={`inline-flex items-center gap-1 h-5 px-1.5 rounded-[6px] text-caption2 font-semibold shrink-0 ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
};

/** Row list flush with the edges of a padded card (ModuleCard); must be its last child. */
export const CardList: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`-mx-4 -mb-4 border-t border-theme-border [&>*:last-child_.row-sep]:border-transparent ${className}`}>{children}</div>
);

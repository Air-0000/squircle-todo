/** Native-style controls shared by tabs, modules and sheets. */
import React, { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { haptic } from '../../utils/bridge';

// ---------------------------------------------------------------------------
// SegmentedControl
// ---------------------------------------------------------------------------

export interface Segment<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  /** Text colour of the selected segment (e.g. red for "overdue"). */
  activeClassName?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Segment<T>[];
  size?: 'sm' | 'md';
  /** 'track': iOS segmented control. 'chips': scrollable filter chips. */
  appearance?: 'track' | 'chips';
  /** Track only: segments share the full width. */
  stretch?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  appearance = 'track',
  stretch = true,
  className = '',
}: SegmentedControlProps<T>) {
  const select = (v: T) => {
    if (v !== value) haptic('light');
    onChange(v);
  };

  if (appearance === 'chips') {
    return (
      <div className={`flex items-center gap-2 overflow-x-auto no-scrollbar ${className}`} role="tablist">
        {options.map(opt => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => select(opt.value)}
              className={`h-8 px-3.5 rounded-full text-footnote font-medium whitespace-nowrap transition-colors shrink-0 ${
                active ? 'bg-theme-accent text-theme-accent-contrast' : 'bg-theme-card-subtle text-theme-text'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`${stretch ? 'flex' : 'inline-flex'} items-stretch p-0.5 rounded-[10px] bg-theme-card-subtle ${size === 'sm' ? 'h-7' : 'h-8'} ${className}`}
      role="tablist"
    >
      {options.map(opt => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => select(opt.value)}
            className={`${stretch ? 'flex-1' : ''} px-3 rounded-[8px] whitespace-nowrap flex items-center justify-center gap-1 transition-all ${
              size === 'sm' ? 'text-caption' : 'text-footnote'
            } ${
              active
                ? `bg-theme-card dark:bg-white/[0.16] shadow-2xs font-semibold ${opt.activeClassName ?? 'text-theme-text'}`
                : 'text-theme-text-secondary font-medium'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CheckButton — circular completion toggle (Reminders-style)
// ---------------------------------------------------------------------------

interface CheckButtonProps {
  checked: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
  tone?: 'accent' | 'danger';
  label?: string;
}

export const CheckButton: React.FC<CheckButtonProps> = ({ checked, onToggle, size = 'md', tone = 'accent', label }) => {
  const box = size === 'sm' ? 'w-5 h-5' : 'w-[22px] h-[22px]';
  const on = tone === 'danger' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-theme-accent border-theme-accent text-theme-accent-contrast';
  const off = tone === 'danger' ? 'border-rose-400' : 'border-theme-text-muted';
  return (
    <button
      type="button"
      aria-label={label ?? (checked ? '标记为未完成' : '标记为已完成')}
      aria-pressed={checked}
      onClick={e => {
        e.stopPropagation();
        onToggle();
      }}
      // Larger hit area than the visible circle.
      className="-m-2 p-2 shrink-0"
    >
      <span className={`${box} rounded-full border-[1.5px] flex items-center justify-center transition-colors ${checked ? on : off}`}>
        {checked && <Check className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} stroke-[3]`} />}
      </span>
    </button>
  );
};

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------

export const ProgressBar: React.FC<{ ratio: number; height?: string; className?: string }> = ({ ratio, height = 'h-1', className = '' }) => (
  <div className={`w-full ${height} bg-theme-card-subtle rounded-full overflow-hidden ${className}`}>
    <div
      className={`h-full rounded-full transition-all duration-300 ${ratio >= 1 ? 'bg-emerald-500' : 'bg-theme-accent'}`}
      style={{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }}
    />
  </div>
);

// ---------------------------------------------------------------------------
// QuickAddForm — "+ 新建…" input row
// ---------------------------------------------------------------------------

interface QuickAddFormProps {
  placeholder: string;
  onSubmit: (text: string) => void;
  buttonLabel?: string;
  tone?: 'accent' | 'danger';
  /** 'row' sits inside a list card; 'field' is a standalone rounded field. */
  variant?: 'row' | 'field';
}

export const QuickAddForm: React.FC<QuickAddFormProps> = ({ placeholder, onSubmit, buttonLabel = '添加', tone = 'accent', variant = 'field' }) => {
  const [text, setText] = useState('');
  // Not a <form>: this often sits inside another form (the add-task sheet).
  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onSubmit(value);
    setText('');
  };
  const color = tone === 'danger' ? 'text-rose-500' : 'text-theme-accent';
  const field = (
    <>
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        enterKeyHint="done"
        className="flex-1 min-w-0 bg-transparent text-body text-theme-text placeholder:text-theme-text-muted outline-none"
      />
      {text.trim() && (
        <button type="button" onClick={submit} className={`text-callout font-semibold shrink-0 ${color}`}>
          {buttonLabel}
        </button>
      )}
    </>
  );
  const plus = (
    // Same footprint as a CheckButton so it lines up with task rows.
    <span className="w-[22px] flex justify-center shrink-0">
      <Plus className={`w-5 h-5 ${color}`} strokeWidth={2.25} />
    </span>
  );

  if (variant === 'row') {
    return (
      <div className="flex items-center gap-3 pl-4">
        {plus}
        <div className="row-sep flex-1 min-w-0 flex items-center gap-2 pr-4 min-h-[48px] border-b border-theme-border">{field}</div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 h-11 px-3 rounded-squircle bg-theme-card-subtle">
      {plus}
      {field}
    </div>
  );
};

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export const EmptyState: React.FC<{ icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ icon, children, className = '' }) => (
  <div className={`py-8 px-6 text-center text-footnote text-theme-text-muted space-y-2 ${className}`}>
    {icon && <div className="flex justify-center">{icon}</div>}
    <div>{children}</div>
  </div>
);

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------

/** Standalone input / select / textarea. */
export const inputClass =
  'w-full h-11 px-3 rounded-squircle bg-theme-card-subtle text-body text-theme-text placeholder:text-theme-text-muted outline-none focus:ring-2 focus:ring-theme-accent/40';

/** Borderless input that lives inside a list row. */
export const rowInputClass = 'flex-1 min-w-0 bg-transparent text-body text-theme-text placeholder:text-theme-text-muted outline-none text-right';

// ---------------------------------------------------------------------------
// Switch
// ---------------------------------------------------------------------------

export const Switch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => {
      haptic('light');
      onChange(!checked);
    }}
    className={`relative inline-flex h-[28px] w-[46px] shrink-0 rounded-full p-[2px] transition-colors duration-200 ${
      checked ? 'bg-theme-accent' : 'bg-theme-card-subtle dark:bg-white/20'
    }`}
  >
    <span
      className={`h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-transform duration-200 ${
        checked ? 'translate-x-[18px]' : 'translate-x-0'
      }`}
    />
  </button>
);

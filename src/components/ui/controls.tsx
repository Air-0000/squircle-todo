/** Small building blocks shared by tabs, modules and modals. */
import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { haptic } from '../../utils/bridge';

// ---------------------------------------------------------------------------
// SegmentedControl — the pill tab strip used all over the app
// ---------------------------------------------------------------------------

export interface Segment<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  /** Active styling override (e.g. red for "overdue"). */
  activeClassName?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Segment<T>[];
  size?: 'xs' | 'sm';
  /** 'track' renders inside a rounded track; 'chips' renders free-floating, scrollable chips. */
  appearance?: 'track' | 'chips';
  stretch?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'sm',
  appearance = 'track',
  stretch = false,
  className = '',
}: SegmentedControlProps<T>) {
  const text = size === 'xs' ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1';
  const container =
    appearance === 'track'
      ? 'flex items-center gap-1 bg-theme-card-subtle p-0.5 rounded-full border border-theme-border/60'
      : 'flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5';

  return (
    <div className={`${container} ${className}`} role="tablist">
      {options.map(opt => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) haptic('light');
              onChange(opt.value);
            }}
            className={`${text} rounded-full font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
              stretch ? 'flex-1' : ''
            } ${
              active
                ? opt.activeClassName ?? 'bg-theme-accent text-theme-accent-contrast shadow-2xs'
                : appearance === 'chips'
                  ? 'bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text'
                  : 'text-theme-text-secondary hover:text-theme-text'
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
// CheckButton — round/squircle completion toggle
// ---------------------------------------------------------------------------

interface CheckButtonProps {
  checked: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
  shape?: 'round' | 'squircle';
  tone?: 'accent' | 'success';
  label?: string;
}

export const CheckButton: React.FC<CheckButtonProps> = ({
  checked,
  onToggle,
  size = 'md',
  shape = 'squircle',
  tone = 'accent',
  label,
}) => {
  const box = size === 'sm' ? 'w-4.5 h-4.5' : 'w-5 h-5';
  const on =
    tone === 'success'
      ? 'bg-emerald-500 border-emerald-500 text-white'
      : 'bg-theme-accent border-theme-accent text-theme-accent-contrast shadow-sm';
  return (
    <button
      type="button"
      aria-label={label ?? (checked ? '标记为未完成' : '标记为已完成')}
      aria-pressed={checked}
      onClick={e => {
        e.stopPropagation();
        onToggle();
      }}
      className={`${box} ${shape === 'round' ? 'rounded-full' : 'rounded-squircle-sm'} border flex items-center justify-center shrink-0 transition-colors ${
        checked ? on : 'border-theme-border hover:border-theme-accent bg-theme-card-subtle'
      }`}
    >
      {checked && <Check className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} stroke-[3]`} />}
    </button>
  );
};

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------

export const ProgressBar: React.FC<{ ratio: number; height?: string; className?: string }> = ({
  ratio,
  height = 'h-1',
  className = '',
}) => (
  <div className={`w-full ${height} bg-theme-border/60 rounded-full overflow-hidden ${className}`}>
    <div
      className={`h-full rounded-full transition-all duration-300 ${ratio >= 1 ? 'bg-emerald-500' : 'bg-theme-accent'}`}
      style={{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }}
    />
  </div>
);

// ---------------------------------------------------------------------------
// QuickAddForm — single-line input + 添加 button
// ---------------------------------------------------------------------------

interface QuickAddFormProps {
  placeholder: string;
  onSubmit: (text: string) => void;
  buttonLabel?: string;
  tone?: 'accent' | 'danger';
}

export const QuickAddForm: React.FC<QuickAddFormProps> = ({ placeholder, onSubmit, buttonLabel = '添加', tone = 'accent' }) => {
  const [text, setText] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSubmit(value);
    setText('');
  };
  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder}
        className={`flex-1 min-w-0 bg-theme-card-subtle px-3 py-2 rounded-squircle border text-xs text-theme-text placeholder:text-theme-text-muted focus:outline-none ${
          tone === 'danger' ? 'border-rose-500/30 focus:border-rose-500' : 'border-theme-border focus:border-theme-accent'
        }`}
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className={`py-2 px-3.5 rounded-squircle text-xs font-bold shadow-squircle active:scale-95 disabled:opacity-50 shrink-0 ${
          tone === 'danger' ? 'bg-rose-500 text-white' : 'bg-theme-accent text-theme-accent-contrast'
        }`}
      >
        {buttonLabel}
      </button>
    </form>
  );
};

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export const EmptyState: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="py-5 text-center text-theme-text-muted text-xs bg-theme-card-subtle rounded-squircle border border-theme-border/40 space-y-1">
    {icon && <div className="flex justify-center">{icon}</div>}
    <div>{children}</div>
  </div>
);

// ---------------------------------------------------------------------------
// Field helpers for forms
// ---------------------------------------------------------------------------

export const inputClass =
  'w-full bg-theme-card-subtle px-2.5 py-1.5 rounded-squircle border border-theme-border/60 text-theme-text outline-none focus:border-theme-accent text-xs';

export const ToggleRow: React.FC<{
  icon?: React.ReactNode;
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: React.ReactNode;
}> = ({ icon, label, checked, onChange, children }) => (
  <div className="space-y-1.5 pt-1 border-t border-theme-border/40">
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-xs font-semibold text-theme-text flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="accent-theme-accent rounded w-3.5 h-3.5"
      />
    </label>
    {checked && children}
  </div>
);

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
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? 'bg-theme-accent' : 'bg-stone-300 dark:bg-stone-700'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out my-0.5 ${
        checked ? 'translate-x-4.5' : 'translate-x-0.5'
      }`}
    />
  </button>
);

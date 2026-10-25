import {
  BookOpen,
  Briefcase,
  Calendar,
  CalendarDays,
  FolderPlus,
  GraduationCap,
  Hourglass,
  Layers,
  ListChecks,
  Palette,
  RefreshCw,
  Ruler,
  Siren,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import type { PanelIconName, PanelModuleType, PanelTemplateId } from '../../domain/panels';

export const PANEL_ICONS: Record<PanelIconName, LucideIcon> = {
  GraduationCap,
  Palette,
  Briefcase,
  Calendar,
  FolderPlus,
};

export const panelIcon = (name: string | undefined): LucideIcon => PANEL_ICONS[name as PanelIconName] ?? FolderPlus;

export const MODULE_ICONS: Record<PanelModuleType, LucideIcon> = {
  countdown: Hourglass,
  pomodoro: Timer,
  ebbinghaus: BookOpen,
  pipeline: Layers,
  emergency: Siren,
  cycles: RefreshCw,
  specs: Ruler,
  calendar: CalendarDays,
  tasklist: ListChecks,
};

/** Icon-square colours (iOS Settings style) per panel template and module. */
export const TEMPLATE_TONES: Record<PanelTemplateId, string> = {
  exam: 'bg-indigo-500 text-white',
  art: 'bg-pink-500 text-white',
  work: 'bg-sky-600 text-white',
  calendar: 'bg-blue-500 text-white',
  blank: 'bg-slate-500 text-white',
};

export const MODULE_TONES: Record<PanelModuleType, string> = {
  countdown: 'bg-orange-500 text-white',
  pomodoro: 'bg-emerald-500 text-white',
  ebbinghaus: 'bg-indigo-500 text-white',
  pipeline: 'bg-purple-500 text-white',
  emergency: 'bg-rose-500 text-white',
  cycles: 'bg-amber-500 text-white',
  specs: 'bg-cyan-500 text-white',
  calendar: 'bg-blue-500 text-white',
  tasklist: 'bg-theme-accent text-theme-accent-contrast',
};

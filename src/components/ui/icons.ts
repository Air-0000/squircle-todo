import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  Calendar,
  Clock,
  FolderPlus,
  GraduationCap,
  Layers,
  ListChecks,
  Palette,
  RotateCcw,
  Sliders,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import type { PanelIconName, PanelModuleType } from '../../domain/panels';

export const PANEL_ICONS: Record<PanelIconName, LucideIcon> = {
  GraduationCap,
  Palette,
  Briefcase,
  Calendar,
  FolderPlus,
};

export const panelIcon = (name: string | undefined): LucideIcon => PANEL_ICONS[name as PanelIconName] ?? FolderPlus;

export const MODULE_ICONS: Record<PanelModuleType, LucideIcon> = {
  countdown: Clock,
  pomodoro: Timer,
  ebbinghaus: BookOpen,
  pipeline: Layers,
  emergency: AlertTriangle,
  cycles: RotateCcw,
  specs: Sliders,
  calendar: Calendar,
  tasklist: ListChecks,
};

import { create } from 'zustand';
import { createPanel, normalizePanels, type Panel, type PanelModuleType, type PanelTemplateId } from '../domain/panels';
import { persistSlice, readJSON, STORAGE_KEYS } from '../utils/storage';

interface PanelState {
  panels: Panel[];

  addPanel: (templateId: PanelTemplateId, name?: string) => Panel;
  updatePanel: (id: string, patch: Partial<Omit<Panel, 'id'>>) => void;
  deletePanel: (id: string) => void;
  /** Returns false when it would disable the panel's last module. */
  toggleModule: (id: string, module: PanelModuleType) => boolean;
  replacePanels: (panels: Panel[]) => void;
}

export const usePanelStore = create<PanelState>((set, get) => ({
  panels: normalizePanels(readJSON(STORAGE_KEYS.panels)),

  addPanel: (templateId, name) => {
    const panel = createPanel(templateId, name);
    set(state => ({ panels: [...state.panels, panel] }));
    return panel;
  },

  updatePanel: (id, patch) =>
    set(state => ({ panels: state.panels.map(p => (p.id === id ? { ...p, ...patch } : p)) })),

  deletePanel: id => set(state => ({ panels: state.panels.filter(p => p.id !== id) })),

  toggleModule: (id, module) => {
    const panel = get().panels.find(p => p.id === id);
    if (!panel) return false;
    const enabled = panel.enabledModules.includes(module);
    if (enabled && panel.enabledModules.length <= 1) return false;
    get().updatePanel(id, {
      enabledModules: enabled ? panel.enabledModules.filter(m => m !== module) : [...panel.enabledModules, module],
    });
    return true;
  },

  replacePanels: panels => set({ panels }),
}));

persistSlice(usePanelStore, STORAGE_KEYS.panels, s => s.panels);

export const usePanel = (id: string | null | undefined) =>
  usePanelStore(s => (id ? s.panels.find(p => p.id === id) : undefined));

/**
 * Navigation and modal visibility. Kept out of the data stores so that data
 * actions stay free of UI concerns.
 */
import { create } from 'zustand';
import type { CyclePeriod } from '../domain/task';

/** 'tasks' | 'analytics' | 'settings' | <panel id> */
export type TabId = string;

export const BASE_TABS = { tasks: 'tasks', analytics: 'analytics', settings: 'settings' } as const;

/**
 * Where the add-task sheet files the new task:
 * 'inbox', 'emergency', a panel id, or the panel-less 'exam' / 'art' flavours.
 */
export interface AddTaskContext {
  target: string;
  period?: CyclePeriod;
}

interface UIState {
  activeTab: TabId;
  addTask: AddTaskContext | null;
  editingTaskId: string | null;
  backupOpen: boolean;
  addPanelOpen: boolean;
  configuringPanelId: string | null;
  feedbackOpen: boolean;
  bulletinListOpen: boolean;
  bulletinDetailId: string | null;
  publishBulletinOpen: boolean;
  updateOpen: boolean;

  setActiveTab: (tab: TabId) => void;
  openAddTask: (context?: Partial<AddTaskContext>) => void;
  openEditTask: (taskId: string) => void;
  /** Closes one modal by key. */
  close: (key: ModalKey) => void;
  open: (key: Exclude<ModalKey, 'addTask' | 'editingTaskId' | 'configuringPanelId' | 'bulletinDetailId'>) => void;
  configurePanel: (panelId: string) => void;
  showBulletin: (bulletinId: string) => void;
}

type ModalKey =
  | 'addTask'
  | 'editingTaskId'
  | 'backupOpen'
  | 'addPanelOpen'
  | 'configuringPanelId'
  | 'feedbackOpen'
  | 'bulletinListOpen'
  | 'bulletinDetailId'
  | 'publishBulletinOpen'
  | 'updateOpen';

const CLOSED: Pick<UIState, ModalKey> = {
  addTask: null,
  editingTaskId: null,
  backupOpen: false,
  addPanelOpen: false,
  configuringPanelId: null,
  feedbackOpen: false,
  bulletinListOpen: false,
  bulletinDetailId: null,
  publishBulletinOpen: false,
  updateOpen: false,
};

export const useUIStore = create<UIState>(set => ({
  activeTab: BASE_TABS.tasks,
  ...CLOSED,

  setActiveTab: activeTab => set({ activeTab }),
  openAddTask: context => set({ addTask: { target: 'inbox', ...context } }),
  openEditTask: editingTaskId => set({ editingTaskId }),
  close: key => set({ [key]: CLOSED[key] } as Partial<UIState>),
  open: key => set({ [key]: true } as Partial<UIState>),
  configurePanel: configuringPanelId => set({ configuringPanelId }),
  showBulletin: bulletinDetailId => set({ bulletinDetailId }),
}));

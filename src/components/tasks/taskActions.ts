/**
 * Task actions as triggered from the UI: the store update plus exactly one
 * round of haptic / confetti feedback.
 */
import { getTask, useTaskStore } from '../../stores/useTaskStore';
import { useUIStore } from '../../stores/useUIStore';
import { haptic } from '../../utils/bridge';
import { burstConfetti } from '../../utils/confetti';

function feedback(nowCompleted: boolean) {
  if (nowCompleted) {
    haptic('success');
    burstConfetti();
  } else {
    haptic('light');
  }
}

export function toggleTask(id: string): void {
  const before = getTask(id);
  if (!before) return;
  useTaskStore.getState().toggleTask(id);
  feedback(!before.completed);
}

export function toggleSubtask(taskId: string, subtaskId: string): void {
  const sub = getTask(taskId)?.subtasks.find(s => s.id === subtaskId);
  if (!sub) return;
  useTaskStore.getState().toggleSubtask(taskId, subtaskId);
  feedback(!sub.completed);
}

export function deleteTask(id: string): void {
  haptic('medium');
  useTaskStore.getState().deleteTask(id);
}

export function openTask(id: string): void {
  haptic('light');
  useUIStore.getState().openEditTask(id);
}

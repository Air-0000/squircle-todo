import React, { useState, useMemo } from 'react';
import { AlertTriangle, Plus, CheckCircle2 } from 'lucide-react';
import { SquircleCard } from '../../common/SquircleCard';
import { useTaskStore } from '../../../stores/useTaskStore';
import { nativeBridge } from '../../../utils/bridge';
import { toast } from '../../../stores/useToastStore';

interface EmergencyModuleProps {
  onOpenAddEmergency?: () => void;
}

export const EmergencyModule: React.FC<EmergencyModuleProps> = ({
  onOpenAddEmergency,
}) => {
  const { tasks, addEmergencyTask, resolveEmergencyTask } = useTaskStore();
  const [quickInput, setQuickInput] = useState('');

  const activeEmergencies = useMemo(() => {
    return tasks.filter(t => 
      !t.isTemplate && 
      t.category !== 'template' && 
      !t.tags?.includes('预设事项') &&
      (t.isEmergency || t.periodType === 'emergency' || t.category === 'emergency') &&
      !t.completed && 
      !t.isCompleted
    );
  }, [tasks]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    addEmergencyTask(quickInput.trim(), 'urgent');
    setQuickInput('');
    nativeBridge.performHapticFeedback('heavy');
    toast.error(`🚨 突发事件「${quickInput.trim()}」已置顶并设为最高优先级！`);
  };

  const handleResolve = (id: string, title: string) => {
    resolveEmergencyTask(id);
    nativeBridge.performHapticFeedback('success');
    toast.success(`已处置并销项突发事件「${title}」`);
  };

  return (
    <SquircleCard elevation={2} radius="lg" className="p-4 bg-theme-card border border-rose-500/30 shadow-squircle space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-squircle bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-xs font-bold text-theme-text">突发紧急事件响应</h3>
              {activeEmergencies.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold animate-pulse">
                  {activeEmergencies.length} 项处理中
                </span>
              )}
            </div>
            <p className="text-[10px] text-theme-text-muted mt-0.5">
              全系统最高优先级置顶响应与处置闭环
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddEmergency}
          className="p-1 px-2.5 rounded-squircle bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-500 text-xs font-bold flex items-center space-x-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>登记突发</span>
        </button>
      </div>

      {/* Quick fast emergency input */}
      <form onSubmit={handleQuickAdd} className="flex items-center space-x-2">
        <input
          type="text"
          value={quickInput}
          onChange={e => setQuickInput(e.target.value)}
          placeholder="快速上报突发事件（如配电箱跳闸、消防门异常）..."
          className="flex-1 bg-theme-card-subtle px-3 py-2 rounded-squircle border border-theme-border text-xs text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-rose-500"
        />
        <button
          type="submit"
          disabled={!quickInput.trim()}
          className="py-2 px-3 rounded-squircle bg-rose-500 text-white text-xs font-bold shadow-sm active:scale-95 disabled:opacity-50"
        >
          置顶
        </button>
      </form>

      {/* Active emergency incident cards */}
      {activeEmergencies.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {activeEmergencies.map(em => (
            <div
              key={em.id}
              className="p-2.5 rounded-squircle bg-rose-500/10 border border-rose-500/25 flex items-center justify-between"
            >
              <div className="flex items-center space-x-2 min-w-0 pr-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="text-xs font-bold text-rose-500 truncate">{em.title}</span>
              </div>
              <button
                onClick={() => handleResolve(em.id, em.title)}
                className="py-1 px-2.5 rounded-squircle bg-emerald-500 text-white text-[11px] font-bold flex items-center space-x-1 shrink-0 active:scale-95"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>处置销项</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </SquircleCard>
  );
};

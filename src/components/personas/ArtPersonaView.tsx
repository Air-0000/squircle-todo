import React, { useState } from 'react';
import { 
  Palette, 
  Layers, 
  Tag, 
  Plus, 
  PenTool
} from 'lucide-react';
import { SquircleCard } from '../common/SquircleCard';
import { PillTag } from '../common/PillTag';
import { SquircleButton } from '../common/SquircleButton';
import { useTaskStore } from '../../stores/useTaskStore';
import { TodoItem, ArtData, ArtStage } from '../../types';
import { nativeBridge } from '../../utils/bridge';
import { triggerConfetti } from '../common/ConfettiBurst';

export const ART_PIPELINE_STAGES: { id: ArtStage; label: string; desc: string }[] = [
  { id: 'planning', label: '企划', desc: '灵感需求与构思' },
  { id: 'draft', label: '草稿', desc: '人体动态与构图' },
  { id: 'lineart', label: '线稿', desc: '闭合描线与修型' },
  { id: 'flat_color', label: '铺色', desc: '固有色与光影大关系' },
  { id: 'detail', label: '细化', desc: '材质质感与刻画' },
  { id: 'post_process', label: '后期', desc: '调色滤镜与特效' },
  { id: 'delivery', label: '交付', desc: '成稿导出交件' },
];

const PRESET_INSPIRATION_TAGS = [
  '赛博朋克', '日系厚涂', '厚涂二次元', '扁平插画', 
  '丁达尔光', '冷暖对撞', '电影感色调', '逆光剪影',
  '广角构图', '三分法', '情绪大头', '立绘商单'
];

export const ArtPersonaView: React.FC = () => {
  const { tasks, addTask, updateTask } = useTaskStore();

  // Quick Commission / Artwork Creation State
  const [quickTitle, setQuickTitle] = useState('');
  const [canvasWidth, setCanvasWidth] = useState(3840);
  const [canvasHeight, setCanvasHeight] = useState(2160);
  const [dpi, setDpi] = useState(300);
  const [colorSpace] = useState<'RGB' | 'CMYK'>('RGB');
  const [software] = useState('Clip Studio Paint');
  const [estimatedHours, setEstimatedHours] = useState(12);

  // Quick Task Creation
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    addTask({
      title: quickTitle.trim(),
      persona: 'art',
      priority: 'high',
      tags: ['绘画创作', '商业插画', software],
      artData: {
        stage: 'planning',
        pipelineMilestone: 'planning',
        milestonesCompleted: ['planning'],
        canvasWidth,
        canvasHeight,
        canvasUnit: 'px',
        dpi,
        colorSpace,
        colorProfile: colorSpace,
        software,
        estimatedHours,
        actualHours: 0,
        inspirationTags: ['新企划'],
      },
      personaData: {
        stage: 'planning',
        pipelineMilestone: 'planning',
        milestonesCompleted: ['planning'],
        canvasWidth,
        canvasHeight,
        canvasUnit: 'px',
        dpi,
        colorSpace,
        software,
        estimatedHours,
        actualHours: 0,
        inspirationTags: ['新企划'],
      }
    });

    setQuickTitle('');
    nativeBridge.performHapticFeedback('light');
    triggerConfetti();
  };

  // Advance Pipeline Milestone
  const handleAdvanceStage = (task: TodoItem, stageId: ArtStage) => {
    const art: ArtData = task.artData || task.personaData || {};
    const currentCompleted = Array.isArray(art.milestonesCompleted) ? [...art.milestonesCompleted] : [];
    
    if (!currentCompleted.includes(stageId)) {
      currentCompleted.push(stageId);
    }

    const updatedArt: ArtData = {
      ...art,
      stage: stageId,
      pipelineMilestone: stageId,
      milestonesCompleted: currentCompleted,
    };

    updateTask(task.id, {
      artData: updatedArt,
      personaData: updatedArt,
    });

    nativeBridge.performHapticFeedback('success');
    if (stageId === 'delivery') {
      triggerConfetti();
    }
  };

  // Add Logged Hours
  const handleAddHours = (task: TodoItem, deltaHours: number) => {
    const art: ArtData = task.artData || task.personaData || {};
    const newActual = Math.max(0, (art.actualHours || 0) + deltaHours);

    const updatedArt: ArtData = {
      ...art,
      actualHours: newActual,
    };

    updateTask(task.id, {
      artData: updatedArt,
      personaData: updatedArt,
    });

    nativeBridge.performHapticFeedback('light');
  };

  // Toggle inspiration tag
  const handleToggleTag = (task: TodoItem, tag: string) => {
    const art: ArtData = task.artData || task.personaData || {};
    const currentTags = Array.isArray(art.inspirationTags) ? [...art.inspirationTags] : [];
    const index = currentTags.indexOf(tag);
    if (index >= 0) {
      currentTags.splice(index, 1);
    } else {
      currentTags.push(tag);
    }

    const updatedArt: ArtData = {
      ...art,
      inspirationTags: currentTags,
    };

    updateTask(task.id, {
      artData: updatedArt,
      personaData: updatedArt,
    });

    nativeBridge.performHapticFeedback('light');
  };

  const artTasks = tasks.filter(t => (t.persona || t.personaId) === 'art');

  return (
    <div className="space-y-3.5">
      {/* 1. 7-Stage Pipeline Workflow Banner */}
      <SquircleCard elevation={2} radius="lg" className="p-4 bg-gradient-to-r from-theme-card to-theme-card-subtle border border-theme-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-squircle bg-indigo-500/15 text-indigo-500">
              <Palette className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-theme-text uppercase tracking-wider">
              7 阶段标准创作管线工作流
            </span>
          </div>
          <PillTag size="sm" variant="accent" label="插画/商单/原画" />
        </div>

        {/* Pipeline Stage Pills Horizontal Scroll */}
        <div className="grid grid-cols-7 gap-1 text-center pt-1">
          {ART_PIPELINE_STAGES.map((s, idx) => (
            <div key={s.id} className="space-y-1">
              <div className="w-full py-1 rounded-squircle bg-theme-card-subtle border border-theme-border/60 text-[10px] font-bold text-theme-accent">
                {idx + 1}
              </div>
              <div className="text-[10px] font-medium text-theme-text truncate">{s.label}</div>
            </div>
          ))}
        </div>
      </SquircleCard>

      {/* 2. New Art Project Creator with Canvas Specs */}
      <form onSubmit={handleQuickAdd} className="p-3 bg-theme-card rounded-squircle border border-theme-border space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-theme-text flex items-center space-x-1.5">
            <PenTool className="w-3.5 h-3.5 text-theme-accent" />
            <span>新建画作 / 商单企划</span>
          </span>
          <span className="text-[10px] text-theme-text-muted">默认进入 7 阶段管线</span>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="输入画作企划名称（如：赛博雨夜少女商用立绘）..."
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            className="flex-1 text-xs px-3 py-2 rounded-squircle bg-theme-card-subtle text-theme-text border border-theme-border/60 outline-none focus:border-theme-accent"
          />
          <SquircleButton size="sm" variant="filled" type="submit" icon={<Plus className="w-3.5 h-3.5" />}>
            创建
          </SquircleButton>
        </div>

        {/* Canvas Specifications Row */}
        <div className="grid grid-cols-4 gap-1.5 text-[11px] text-theme-text-secondary pt-1">
          <div className="flex items-center space-x-1 bg-theme-card-subtle px-2 py-1 rounded-squircle border border-theme-border/50">
            <span className="text-[10px] text-theme-text-muted">宽:</span>
            <input
              type="number"
              value={canvasWidth}
              onChange={e => setCanvasWidth(Number(e.target.value))}
              className="w-full bg-transparent text-theme-text outline-none text-[11px]"
            />
          </div>
          <div className="flex items-center space-x-1 bg-theme-card-subtle px-2 py-1 rounded-squircle border border-theme-border/50">
            <span className="text-[10px] text-theme-text-muted">高:</span>
            <input
              type="number"
              value={canvasHeight}
              onChange={e => setCanvasHeight(Number(e.target.value))}
              className="w-full bg-transparent text-theme-text outline-none text-[11px]"
            />
          </div>
          <div className="flex items-center space-x-1 bg-theme-card-subtle px-1.5 py-1 rounded-squircle border border-theme-border/50">
            <span className="text-[10px] text-theme-text-muted">DPI:</span>
            <select
              value={dpi}
              onChange={e => setDpi(Number(e.target.value))}
              className="bg-transparent text-theme-text outline-none text-[11px]"
            >
              <option value={300}>300</option>
              <option value={350}>350</option>
              <option value={600}>600</option>
              <option value={72}>72</option>
            </select>
          </div>
          <div className="flex items-center space-x-1 bg-theme-card-subtle px-1.5 py-1 rounded-squircle border border-theme-border/50">
            <span className="text-[10px] text-theme-text-muted">预估:</span>
            <input
              type="number"
              value={estimatedHours}
              onChange={e => setEstimatedHours(Number(e.target.value))}
              className="w-8 bg-transparent text-theme-text outline-none text-[11px]"
            />
            <span className="text-[10px]">h</span>
          </div>
        </div>
      </form>

      {/* 3. Artwork Task List with Pipeline & Hours Tracker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-theme-text flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-theme-accent" />
            <span>进行中的绘画项目 ({artTasks.length})</span>
          </h4>
          <span className="text-[10px] text-theme-text-muted">点击阶段切换 · 工时审计</span>
        </div>

        {artTasks.length === 0 ? (
          <div className="py-6 text-center text-xs text-theme-text-muted bg-theme-card-subtle rounded-squircle border border-dashed border-theme-border/70">
            暂无绘画项目，可在上方快速新建画作
          </div>
        ) : (
          artTasks.map(task => {
            const art: ArtData = task.artData || task.personaData || {};
            const completedStages = Array.isArray(art.milestonesCompleted) ? art.milestonesCompleted : [];
            const progressPct = Math.round((completedStages.length / ART_PIPELINE_STAGES.length) * 100);
            const est = art.estimatedHours || 10;
            const act = art.actualHours || 0;
            const delta = act - est;
            const isOvertime = delta > 0;

            return (
              <SquircleCard key={task.id} elevation={1} radius="md" className="p-3.5 bg-theme-card border border-theme-border space-y-3">
                {/* Title & Canvas Specs */}
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-semibold text-xs text-theme-text">{task.title}</h5>
                    <div className="text-[10px] text-theme-text-secondary flex items-center space-x-2 mt-0.5">
                      <span>{art.canvasWidth || 3840}×{art.canvasHeight || 2160}px</span>
                      <span>·</span>
                      <span>{art.dpi || 300} DPI</span>
                      <span>·</span>
                      <span>{art.colorSpace || 'RGB'}</span>
                      <span>·</span>
                      <span>{art.software || 'CSP'}</span>
                    </div>
                  </div>

                  {/* Hours Audit Badge */}
                  <div className="flex items-center space-x-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      isOvertime 
                        ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20' 
                        : 'bg-emerald-500/15 text-emerald-500'
                    }`}>
                      {act}h / {est}h {isOvertime ? `(+${delta}h 超时)` : `(-${Math.abs(delta)}h)`}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-theme-text-secondary">
                    <span>管线进度</span>
                    <span className="font-semibold text-theme-accent">{progressPct}%</span>
                  </div>
                  <div className="h-2 w-full bg-theme-card-subtle rounded-full overflow-hidden border border-theme-border/40">
                    <div 
                      className="h-full bg-theme-accent rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* 7-Stage Pipeline Switcher Buttons */}
                <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none">
                  {ART_PIPELINE_STAGES.map(s => {
                    const isDone = completedStages.includes(s.id);
                    const isCurrent = art.stage === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleAdvanceStage(task, s.id)}
                        className={`px-2 py-1 rounded-squircle text-[10px] font-medium shrink-0 transition-colors ${
                          isCurrent
                            ? 'bg-theme-accent text-theme-accent-contrast shadow-sm'
                            : isDone
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>

                {/* Hours Quick Adjust & Inspiration Tag Row */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-theme-border/40">
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-theme-text-muted">记录工时:</span>
                    <button
                      onClick={() => handleAddHours(task, 1)}
                      className="px-2 py-0.5 rounded-squircle bg-theme-card-subtle text-theme-text hover:bg-theme-accent/20 text-[10px]"
                    >
                      +1h
                    </button>
                    <button
                      onClick={() => handleAddHours(task, 2)}
                      className="px-2 py-0.5 rounded-squircle bg-theme-card-subtle text-theme-text hover:bg-theme-accent/20 text-[10px]"
                    >
                      +2h
                    </button>
                  </div>

                  {/* Active Tags */}
                  <div className="flex items-center space-x-1">
                    {Array.isArray(art.inspirationTags) && art.inspirationTags.slice(0, 3).map((t, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleToggleTag(task, t)}
                        className="text-[10px] px-1.5 py-0.2 rounded-full bg-theme-accent-subtle text-theme-accent hover:opacity-80"
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                </div>
              </SquircleCard>
            );
          })
        )}
      </div>

      {/* 4. Inspiration Tag Matrix Pool */}
      <SquircleCard elevation={1} radius="md" className="p-3 bg-theme-card border border-theme-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-theme-text flex items-center space-x-1.5">
            <Tag className="w-3.5 h-3.5 text-theme-accent" />
            <span>灵感与风格参考标签库</span>
          </span>
          <span className="text-[10px] text-theme-text-muted">常见艺术风格参考</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESET_INSPIRATION_TAGS.map(tag => (
            <span
              key={tag}
              className="text-[10px] px-2 py-1 rounded-squircle bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text border border-theme-border/60"
            >
              #{tag}
            </span>
          ))}
        </div>
      </SquircleCard>
    </div>
  );
};

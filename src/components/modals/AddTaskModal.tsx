import React, { useState } from 'react';
import {
  AlertTriangle,
  BookTemplate,
  Calendar,
  Check,
  Clock,
  GraduationCap,
  ListChecks,
  Palette,
  Plus,
  Repeat,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { addDays, toDateKey } from '../../domain/dates';
import { PIECEWISE_TEMPLATES } from '../../domain/piecewise';
import { cloneSubtasks, createSubtask, templateBaseTitle, type CyclePeriod } from '../../domain/task';
import {
  buildTaskDraft,
  FREQUENCY_OPTIONS,
  resolveAddTarget,
  targetFlavor,
  type AddTaskForm,
  type AddTarget,
  type FrequencyId,
} from '../../domain/taskForm';
import { panelIcon } from '../ui/icons';
import { useTaskStore } from '../../stores/useTaskStore';
import { usePanelStore } from '../../stores/usePanelStore';
import { useUIStore, type AddTaskContext } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
import { burstConfetti } from '../../utils/confetti';
import { Modal } from '../ui/Modal';
import { SquircleButton } from '../ui/SquircleButton';
import { inputClass, ToggleRow } from '../ui/controls';

const FORM_ID = 'add-task-form';

const EXAM_SUBJECTS = [
  { id: 'math', label: '数学 / 统考数学' },
  { id: 'english', label: '考研英语' },
  { id: 'politics', label: '思想政治理论' },
  { id: 'major1', label: '专业课一' },
  { id: 'major2', label: '专业课二' },
];

const PERIOD_OPTIONS: { id: CyclePeriod; label: string }[] = [
  { id: 'daily', label: '☀️ 每日打卡' },
  { id: 'weekly', label: '📅 本周重点' },
  { id: 'monthly', label: '🌕 本月规划' },
];

function initialForm(context: AddTaskContext): AddTaskForm {
  const today = new Date();
  const inAMonth = toDateKey(addDays(today, 30));
  const period = context.period ?? 'daily';
  return {
    title: '',
    subtasks: [],
    routine: 'daily',
    period,
    emergencyLevel: 'urgent',
    usePeriodRange: true,
    startDate: toDateKey(today),
    endDate: inAMonth,
    frequency: period,
    customFrequency: '每周一',
    useAlarm: false,
    alarmTime: '',
    usePiecewise: false,
    piecewiseTemplate: 'exam_stages',
    examSubject: 'math',
    clientName: '',
    submitDate: inAMonth,
  };
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

type Patch = (patch: Partial<AddTaskForm>) => void;

const choiceClass = (active: boolean, danger = false) =>
  `rounded-squircle text-xs border transition-colors ${
    active
      ? danger
        ? 'bg-rose-500 text-white font-bold border-rose-500 shadow-sm'
        : 'bg-theme-accent text-theme-accent-contrast font-bold border-theme-accent shadow-sm'
      : 'bg-theme-card text-theme-text-secondary border-theme-border/60 hover:text-theme-text'
  }`;

const sectionClass = 'p-2.5 bg-theme-card-subtle rounded-squircle border border-theme-border/60 space-y-2';

const TargetPicker: React.FC<{ value: string; onChange: (target: string) => void; target: AddTarget; form: AddTaskForm }> = ({
  value,
  onChange,
  target,
  form,
}) => {
  const panels = usePanelStore(s => s.panels);
  const hasTemplate = (id: 'exam' | 'art') => panels.some(p => p.templateId === id);
  const options = [
    { id: 'inbox', label: '通用待办', icon: ListChecks },
    { id: 'emergency', label: '突发事件', icon: AlertTriangle },
    ...panels.map(p => ({ id: p.id, label: p.name, icon: panelIcon(p.icon) })),
    ...(hasTemplate('exam') ? [] : [{ id: 'exam', label: '考研备考', icon: GraduationCap }]),
    ...(hasTemplate('art') ? [] : [{ id: 'art', label: '绘画创作', icon: Palette }]),
  ];
  const flavor = targetFlavor(target);
  const where =
    target.kind === 'emergency'
      ? '🚨 突发事件栏'
      : flavor === 'exam'
        ? form.routine === 'daily' ? '考研 · 每日打卡' : '考研 · 专项备考'
        : flavor === 'art'
          ? form.routine === 'daily' ? '绘画 · 每日打卡' : '绘画 · 约稿排单'
          : target.kind === 'panel'
            ? target.panel.name
            : '全部待办';
  const when =
    target.kind === 'emergency' ? '即时响应置顶' : PERIOD_OPTIONS.find(p => p.id === form.period)?.label ?? '';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-theme-text">选择所属类别（自动分流至对应页面）</span>
        <span className="text-[10px] text-theme-accent font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>自动归类入库</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              haptic('light');
              onChange(id);
            }}
            className={`px-3 py-1.5 flex items-center gap-1.5 active:scale-95 ${choiceClass(value === id, id === 'emergency')}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[11px]">{label}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-squircle bg-theme-accent/10 border border-theme-accent/25 text-theme-accent text-[11px] font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-pulse shrink-0" />
        <span className="truncate">
          自动归档至：【{where}】· {when}
        </span>
      </div>
    </div>
  );
};

const EmergencySection: React.FC<{ form: AddTaskForm; patch: Patch }> = ({ form, patch }) => {
  const templates = useTaskStore(s => s.tasks).filter(t => t.isTemplate);
  return (
    <div className="p-2.5 bg-rose-500/10 rounded-squircle border border-rose-500/40 space-y-2">
      <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        <span>突发事件等级与处置:</span>
      </span>
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'urgent' as const, label: '⚠️ 重要紧急', desc: '即时响应排查' },
          { id: 'critical' as const, label: '⚡ 特急处置', desc: '全速优先置顶' },
        ].map(level => (
          <button
            key={level.id}
            type="button"
            onClick={() => patch({ emergencyLevel: level.id })}
            className={`p-1.5 text-left ${choiceClass(form.emergencyLevel === level.id, true)}`}
          >
            <div className="text-[11px] font-semibold">{level.label}</div>
            <div className="text-[9px] opacity-80">{level.desc}</div>
          </button>
        ))}
      </div>
      {templates.length > 0 && (
        <div className="space-y-1.5 pt-1.5 border-t border-rose-300/30">
          <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
            <BookTemplate className="w-3 h-3" />
            <span>从预设预案库一键选用（自动载入子任务清单）:</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {templates.map(tpl => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  haptic('light');
                  patch({ title: templateBaseTitle(tpl), subtasks: cloneSubtasks(tpl.subtasks) });
                }}
                className="px-2 py-1 rounded-squircle text-[10px] bg-theme-card hover:bg-rose-500/15 border border-rose-300/50 text-theme-text font-medium transition-all"
              >
                {tpl.title} {tpl.subtasks.length > 0 && `(${tpl.subtasks.length}项)`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PeriodSection: React.FC<{ form: AddTaskForm; patch: Patch }> = ({ form, patch }) => (
  <div className={sectionClass}>
    <span className="text-[11px] font-medium text-theme-text-secondary">周期与分栏选项:</span>
    <div className="grid grid-cols-3 gap-1.5">
      {PERIOD_OPTIONS.map(p => (
        <button
          key={p.id}
          type="button"
          onClick={() => {
            haptic('light');
            patch({ period: p.id, frequency: p.id });
          }}
          className={`py-1.5 font-medium ${choiceClass(form.period === p.id)}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  </div>
);

const RoutineSection: React.FC<{ flavor: 'exam' | 'art'; form: AddTaskForm; patch: Patch }> = ({ flavor, form, patch }) => {
  const options =
    flavor === 'exam'
      ? [
          { id: 'daily' as const, label: '☀️ 考研每日打卡', desc: '00:00自动重置' },
          { id: 'project' as const, label: '📚 专项科目备考', desc: '长期备考目标' },
        ]
      : [
          { id: 'daily' as const, label: '☀️ 绘画每日打卡', desc: '00:00自动重置' },
          { id: 'project' as const, label: '🎨 商单约稿排单', desc: '稿件进度跟踪' },
        ];
  return (
    <div className={sectionClass}>
      <span className="text-[11px] font-medium text-theme-text-secondary">{flavor === 'exam' ? '考研' : '绘画'}分栏选项（自动进入对应栏目）:</span>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map(o => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              haptic('light');
              patch({ routine: o.id });
            }}
            className={`py-1.5 px-2 text-left ${choiceClass(form.routine === o.id)}`}
          >
            <div className="text-[11px] font-semibold">{o.label}</div>
            <div className="text-[9px] opacity-80">{o.desc}</div>
          </button>
        ))}
      </div>
      {flavor === 'exam' && (
        <label className="block">
          <span className="text-[10px] text-theme-text-muted">考研科目:</span>
          <select value={form.examSubject} onChange={e => patch({ examSubject: e.target.value })} className={`mt-0.5 ${inputClass}`}>
            {EXAM_SUBJECTS.map(s => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {flavor === 'art' && form.routine === 'project' && (
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-theme-border/40">
          <label>
            <span className="text-[10px] text-theme-text-muted">单名 / 车主名字:</span>
            <input
              type="text"
              placeholder="客户或车主姓名"
              value={form.clientName}
              onChange={e => patch({ clientName: e.target.value })}
              className={`mt-0.5 ${inputClass}`}
            />
          </label>
          <label>
            <span className="text-[10px] text-theme-text-muted">交付截止时间:</span>
            <input type="date" value={form.submitDate} onChange={e => patch({ submitDate: e.target.value })} className={`mt-0.5 ${inputClass}`} />
          </label>
        </div>
      )}
    </div>
  );
};

const SubtaskSection: React.FC<{ form: AddTaskForm; patch: Patch }> = ({ form, patch }) => {
  const [text, setText] = useState('');
  const add = () => {
    if (!text.trim()) return;
    patch({ subtasks: [...form.subtasks, createSubtask(text)] });
    setText('');
    haptic('light');
  };
  return (
    <div className={sectionClass}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-theme-text flex items-center gap-1.5">
          <ListChecks className="w-3.5 h-3.5 text-theme-accent" />
          <span>配置执行子任务步骤 ({form.subtasks.length})</span>
        </span>
        <span className="text-[10px] text-theme-text-muted">选填 · 亦可在卡片上进入二级界面添加</span>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="+ 输入执行子步骤按回车快速添加..."
          className={`flex-1 ${inputClass} bg-theme-card`}
        />
        <button type="button" onClick={add} className="px-2.5 py-1.5 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold shrink-0">
          添加
        </button>
      </div>
      {form.subtasks.length > 0 && (
        <div className="space-y-1 pt-1 max-h-36 overflow-y-auto">
          {form.subtasks.map((st, i) => (
            <div key={st.id} className="flex items-center justify-between p-1.5 rounded bg-theme-card border border-theme-border/40 text-[11px]">
              <span className="text-theme-text font-medium truncate flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-theme-accent/15 text-theme-accent text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="truncate">{st.text}</span>
              </span>
              <button
                type="button"
                onClick={() => patch({ subtasks: form.subtasks.filter(s => s.id !== st.id) })}
                className="text-theme-text-muted hover:text-rose-500 text-xs px-1"
                aria-label="移除子步骤"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PiecewiseSection: React.FC<{ form: AddTaskForm; patch: Patch }> = ({ form, patch }) => {
  const current = PIECEWISE_TEMPLATES.find(t => t.id === form.piecewiseTemplate) ?? PIECEWISE_TEMPLATES[0];
  return (
    <div className="space-y-2 p-2.5 bg-theme-accent-subtle/30 rounded-squircle border border-theme-accent/40">
      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-xs font-bold text-theme-text flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-theme-accent" />
          <span>分段函数周期变化任务 (f(t) 规则)</span>
        </span>
        <input
          type="checkbox"
          checked={form.usePiecewise}
          onChange={e => patch({ usePiecewise: e.target.checked })}
          className="accent-theme-accent rounded w-4 h-4 cursor-pointer"
        />
      </label>
      {form.usePiecewise && (
        <div className="space-y-2 pt-1 border-t border-theme-accent/20">
          <span className="text-[10px] text-theme-text-muted">选择分段递进模板:</span>
          <div className="space-y-1.5">
            {PIECEWISE_TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => patch({ piecewiseTemplate: tpl.id })}
                className={`w-full p-2 rounded-squircle border text-left transition-colors ${
                  form.piecewiseTemplate === tpl.id
                    ? 'bg-theme-card border-theme-accent shadow-sm'
                    : 'bg-theme-card-subtle/60 border-theme-border/50 hover:border-theme-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-theme-text">{tpl.name}</span>
                  <span className="text-[9px] text-theme-accent px-1.5 py-px rounded-full bg-theme-accent-subtle">共 {tpl.totalDays} 天</span>
                </div>
                <p className="text-[10px] text-theme-text-secondary leading-tight mt-0.5">{tpl.desc}</p>
              </button>
            ))}
          </div>
          <div className="p-2 bg-theme-card rounded-squircle border border-theme-border/60 space-y-1">
            <span className="text-[10px] font-semibold text-theme-accent">📐 阶段函数输出规则列表:</span>
            {current.stages.map(st => (
              <div key={st.id} className="text-[10px] flex items-center justify-between py-0.5 border-b border-theme-border/30 last:border-none">
                <span className="text-theme-text font-medium">{st.stageName}</span>
                <span className="text-theme-text-muted">{st.formula}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ScheduleSection: React.FC<{ form: AddTaskForm; patch: Patch; showFrequency: boolean }> = ({ form, patch, showFrequency }) => (
  <>
    <ToggleRow
      icon={<Calendar className="w-3.5 h-3.5 text-theme-accent" />}
      label="执行期限 (开始日期 ~ 结束日期)"
      checked={form.usePeriodRange}
      onChange={usePeriodRange => patch({ usePeriodRange })}
    >
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="text-[10px] text-theme-text-muted">开始日期:</span>
          <input type="date" value={form.startDate} onChange={e => patch({ startDate: e.target.value })} className={`mt-0.5 ${inputClass}`} />
        </label>
        <label>
          <span className="text-[10px] text-theme-text-muted">结束日期:</span>
          <input type="date" value={form.endDate} onChange={e => patch({ endDate: e.target.value })} className={`mt-0.5 ${inputClass}`} />
        </label>
      </div>
    </ToggleRow>

    {showFrequency && (
      <div className="space-y-1.5 pt-1 border-t border-theme-border/40">
        <label className="text-xs font-semibold text-theme-text flex items-center gap-1">
          <Repeat className="w-3.5 h-3.5 text-theme-accent" />
          <span>固定周期刷新频次</span>
        </label>
        <select
          value={form.frequency}
          onChange={e => patch({ frequency: e.target.value as FrequencyId })}
          className={`${inputClass} py-2 font-medium`}
        >
          {FREQUENCY_OPTIONS.map(opt => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        {form.frequency === 'custom' && (
          <input
            type="text"
            placeholder="例如：每周一、周三 / 每3天一次"
            value={form.customFrequency}
            onChange={e => patch({ customFrequency: e.target.value })}
            className={`${inputClass} mt-1`}
          />
        )}
      </div>
    )}

    <ToggleRow
      icon={<Clock className="w-3.5 h-3.5 text-theme-accent" />}
      label="闹钟 / 定时提醒"
      checked={form.useAlarm}
      onChange={useAlarm => patch({ useAlarm })}
    >
      <input type="time" value={form.alarmTime} onChange={e => patch({ alarmTime: e.target.value })} className={inputClass} />
    </ToggleRow>
  </>
);

// ---------------------------------------------------------------------------
// Form + modal
// ---------------------------------------------------------------------------

const AddTaskFormBody: React.FC<{ context: AddTaskContext; onDone: () => void }> = ({ context, onDone }) => {
  const panels = usePanelStore(s => s.panels);
  const addTask = useTaskStore(s => s.addTask);
  const [targetId, setTargetId] = useState(context.target);
  const [form, setForm] = useState(() => initialForm(context));
  const patch: Patch = p => setForm(f => ({ ...f, ...p }));

  const target = resolveAddTarget(targetId, panels);
  const flavor = targetFlavor(target);
  const isEmergency = target.kind === 'emergency';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const { draft, destination, navigateTo } = buildTaskDraft(form, target);
    addTask(draft);
    haptic('success');
    burstConfetti();
    toast.success(`已自动归类放入【${destination}】页面！`);
    useUIStore.getState().setActiveTab(navigateTo);
    onDone();
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-3.5">
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-theme-text">事件名称 *</span>
        <input
          type="text"
          autoFocus
          placeholder="输入待办事项内容（如：背考研单词 List 1 / 提交线稿 / 消防巡检）..."
          value={form.title}
          onChange={e => patch({ title: e.target.value })}
          className={`${inputClass} py-2.5 border-theme-border/80 font-medium`}
        />
      </label>

      <TargetPicker value={targetId} onChange={setTargetId} target={target} form={form} />

      {isEmergency && <EmergencySection form={form} patch={patch} />}
      {(flavor === 'exam' || flavor === 'art') && target.kind !== 'emergency' && <RoutineSection flavor={flavor} form={form} patch={patch} />}
      {!isEmergency && flavor !== 'exam' && flavor !== 'art' && <PeriodSection form={form} patch={patch} />}

      <SubtaskSection form={form} patch={patch} />
      {!isEmergency && <PiecewiseSection form={form} patch={patch} />}
      <ScheduleSection form={form} patch={patch} showFrequency={!isEmergency && !form.usePiecewise} />
    </form>
  );
};

export const AddTaskModal: React.FC = () => {
  const context = useUIStore(s => s.addTask);
  const close = () => useUIStore.getState().close('addTask');
  const isEmergency = context?.target === 'emergency';

  return (
    <Modal
      open={Boolean(context)}
      onClose={close}
      icon={<Plus className="w-4 h-4" />}
      title="添加待办事件"
      subtitle="周期自适应 · 分段函数 · 突发登记"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <SquircleButton size="sm" variant="ghost" onClick={close}>
            取消
          </SquircleButton>
          <SquircleButton size="sm" variant="filled" type="submit" form={FORM_ID} haptic={false} icon={<Check className="w-3.5 h-3.5" />}>
            {isEmergency ? '登记突发事件' : '添加事件'}
          </SquircleButton>
        </div>
      }
    >
      {/* Mounted per opening, so every opening starts from a fresh form. */}
      {context && <AddTaskFormBody context={context} onDone={close} />}
    </Modal>
  );
};

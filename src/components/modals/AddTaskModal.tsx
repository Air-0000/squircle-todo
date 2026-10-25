import React, { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
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
import { useTaskStore } from '../../stores/useTaskStore';
import { usePanelStore } from '../../stores/usePanelStore';
import { useUIStore, type AddTaskContext } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
import { burstConfetti } from '../../utils/confetti';
import { Modal } from '../ui/Modal';
import { Row, Section } from '../ui/List';
import { QuickAddForm, SegmentedControl, Switch } from '../ui/controls';

const FORM_ID = 'add-task-form';

const EXAM_SUBJECTS = [
  { id: 'math', label: '数学' },
  { id: 'english', label: '英语' },
  { id: 'politics', label: '政治' },
  { id: 'major1', label: '专业课一' },
  { id: 'major2', label: '专业课二' },
];

const PERIOD_OPTIONS: { value: CyclePeriod; label: string }[] = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
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
    usePeriodRange: false,
    startDate: toDateKey(today),
    endDate: inAMonth,
    frequency: period,
    customFrequency: '每周一',
    useAlarm: false,
    alarmTime: '08:00',
    usePiecewise: false,
    piecewiseTemplate: 'exam_stages',
    examSubject: 'math',
    clientName: '',
    submitDate: inAMonth,
  };
}

type Patch = (patch: Partial<AddTaskForm>) => void;

/** Borderless value control that sits on the right of a Row. */
const valueInput = 'bg-transparent text-body text-theme-accent text-right outline-none min-w-0';

const SelectValue: React.FC<{ value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }> = ({ value, onChange, options }) => (
  <label className="relative flex items-center gap-1 text-theme-text-secondary">
    <select value={value} onChange={e => onChange(e.target.value)} className="appearance-none bg-transparent text-body text-right outline-none pr-5">
      {options.map(o => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
    <ChevronDown className="w-4 h-4 absolute right-0 pointer-events-none" />
  </label>
);

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

const TargetSection: React.FC<{ value: string; onChange: (id: string) => void; target: AddTarget; form: AddTaskForm }> = ({ value, onChange, target, form }) => {
  const panels = usePanelStore(s => s.panels);
  const hasTemplate = (id: 'exam' | 'art') => panels.some(p => p.templateId === id);
  const options = [
    { value: 'inbox', label: '待办' },
    { value: 'emergency', label: '突发事件' },
    ...panels.map(p => ({ value: p.id, label: p.name })),
    ...(hasTemplate('exam') ? [] : [{ value: 'exam', label: '考研' }]),
    ...(hasTemplate('art') ? [] : [{ value: 'art', label: '绘画' }]),
  ];
  const flavor = targetFlavor(target);
  const where =
    target.kind === 'emergency'
      ? '突发事件，置顶并标为最高优先级'
      : target.kind === 'panel'
        ? `「${target.panel.name}」面板`
        : flavor === 'exam'
          ? '考研事项'
          : flavor === 'art'
            ? '绘画事项'
            : '待办列表';
  const recur = target.kind === 'emergency' ? '' : flavor === 'exam' || flavor === 'art' ? (form.routine === 'daily' ? '，每天 0 点重置' : '') : `，${PERIOD_OPTIONS.find(p => p.value === form.period)?.label}重置`;
  return (
    <Section title="添加到" variant="plain" footer={`将放入${where}${recur}`}>
      <SegmentedControl appearance="chips" value={value} onChange={onChange} options={options} className="-mx-4 px-4" />
    </Section>
  );
};

const EmergencySection: React.FC<{ form: AddTaskForm; patch: Patch }> = ({ form, patch }) => {
  const templates = useTaskStore(s => s.tasks).filter(t => t.isTemplate);
  return (
    <>
      <Section title="等级" variant="plain">
        <SegmentedControl
          value={form.emergencyLevel}
          onChange={emergencyLevel => patch({ emergencyLevel })}
          options={[
            { value: 'urgent', label: '紧急' },
            { value: 'critical', label: '特急', activeClassName: 'text-rose-500' },
          ]}
        />
      </Section>
      {templates.length > 0 && (
        <Section title="从预设载入" footer="会填入标题并载入预设的处置步骤。">
          {templates.map(tpl => (
            <Row
              key={tpl.id}
              title={templateBaseTitle(tpl)}
              value={`${tpl.subtasks.length} 步`}
              chevron
              onClick={() => {
                haptic('light');
                patch({ title: templateBaseTitle(tpl), subtasks: cloneSubtasks(tpl.subtasks) });
              }}
            />
          ))}
        </Section>
      )}
    </>
  );
};

const RoutineSection: React.FC<{ flavor: 'exam' | 'art'; form: AddTaskForm; patch: Patch }> = ({ flavor, form, patch }) => (
  <Section title="类型" variant="plain">
    <div className="space-y-3">
      <SegmentedControl
        value={form.routine}
        onChange={routine => patch({ routine })}
        options={[
          { value: 'daily', label: '每日打卡' },
          { value: 'project', label: flavor === 'exam' ? '专项备考' : '商单约稿' },
        ]}
      />
      {flavor === 'exam' && (
        <div className="bg-theme-card rounded-squircle-md shadow-squircle overflow-hidden [&>*:last-child_.row-sep]:border-transparent">
          <Row title="科目" trailing={<SelectValue value={form.examSubject} onChange={examSubject => patch({ examSubject })} options={EXAM_SUBJECTS} />} />
        </div>
      )}
      {flavor === 'art' && form.routine === 'project' && (
        <div className="bg-theme-card rounded-squircle-md shadow-squircle overflow-hidden [&>*:last-child_.row-sep]:border-transparent">
          <Row
            title="委托人"
            trailing={<input type="text" value={form.clientName} onChange={e => patch({ clientName: e.target.value })} placeholder="选填" className={`${valueInput} w-40`} />}
          />
          <Row title="交付日期" trailing={<input type="date" value={form.submitDate} onChange={e => patch({ submitDate: e.target.value })} className={valueInput} />} />
        </div>
      )}
    </div>
  </Section>
);

const SubtaskSection: React.FC<{ form: AddTaskForm; patch: Patch }> = ({ form, patch }) => (
  <Section title="子任务">
    {form.subtasks.map((st, i) => (
      <Row
        key={st.id}
        leading={<span className="w-[22px] text-center text-footnote font-semibold text-theme-text-secondary tabular-nums">{i + 1}</span>}
        title={st.text}
        trailing={
          <button
            type="button"
            aria-label="移除子任务"
            onClick={() => patch({ subtasks: form.subtasks.filter(s => s.id !== st.id) })}
            className="w-7 h-7 -mr-1 rounded-full flex items-center justify-center text-theme-text-muted"
          >
            <X className="w-4 h-4" />
          </button>
        }
      />
    ))}
    <QuickAddForm
      variant="row"
      placeholder="添加子任务"
      onSubmit={text => {
        patch({ subtasks: [...form.subtasks, createSubtask(text)] });
        haptic('light');
      }}
    />
  </Section>
);

const ScheduleSection: React.FC<{ form: AddTaskForm; patch: Patch; allowRecurrence: boolean }> = ({ form, patch, allowRecurrence }) => {
  const stages = (PIECEWISE_TEMPLATES.find(t => t.id === form.piecewiseTemplate) ?? PIECEWISE_TEMPLATES[0]).stages;
  return (
    <Section
      title="计划"
      footer={form.usePiecewise && allowRecurrence ? stages.map(s => `${s.stageName.replace(/^.*：/, '')}：第 ${s.startDay}–${s.endDay} 天 ${s.frequencyText}`).join('；') : undefined}
    >
      <Row title="执行期限" trailing={<Switch checked={form.usePeriodRange} onChange={usePeriodRange => patch({ usePeriodRange })} label="执行期限" />} />
      {form.usePeriodRange && (
        <>
          <Row title="开始" className="pl-4" trailing={<input type="date" value={form.startDate} onChange={e => patch({ startDate: e.target.value })} className={valueInput} />} />
          <Row title="结束" className="pl-4" trailing={<input type="date" value={form.endDate} onChange={e => patch({ endDate: e.target.value })} className={valueInput} />} />
        </>
      )}

      {allowRecurrence && !form.usePiecewise && (
        <Row
          title="刷新频次"
          trailing={
            <SelectValue
              value={form.frequency}
              onChange={v => patch({ frequency: v as FrequencyId })}
              options={FREQUENCY_OPTIONS.map(o => ({ id: o.id, label: o.label.replace(/ \(.*\)$/, '') }))}
            />
          }
        />
      )}
      {allowRecurrence && !form.usePiecewise && form.frequency === 'custom' && (
        <Row
          title="自定义"
          className="pl-4"
          trailing={<input type="text" value={form.customFrequency} onChange={e => patch({ customFrequency: e.target.value })} placeholder="如：每周一、周三" className={`${valueInput} w-44`} />}
        />
      )}

      {allowRecurrence && (
        <Row title="分段周期" subtitle="按阶段改变打卡频次" trailing={<Switch checked={form.usePiecewise} onChange={usePiecewise => patch({ usePiecewise })} label="分段周期" />} />
      )}
      {allowRecurrence &&
        form.usePiecewise &&
        PIECEWISE_TEMPLATES.map(tpl => (
          <Row
            key={tpl.id}
            className="pl-4"
            title={tpl.name}
            subtitle={`${tpl.desc}，共 ${tpl.totalDays} 天`}
            onClick={() => patch({ piecewiseTemplate: tpl.id })}
            trailing={form.piecewiseTemplate === tpl.id ? <Check className="w-5 h-5 text-theme-accent shrink-0" /> : <span className="w-5" />}
          />
        ))}

      <Row title="提醒" trailing={<Switch checked={form.useAlarm} onChange={useAlarm => patch({ useAlarm })} label="提醒" />} />
      {form.useAlarm && (
        <Row title="时间" className="pl-4" trailing={<input type="time" value={form.alarmTime} onChange={e => patch({ alarmTime: e.target.value })} className={valueInput} />} />
      )}
    </Section>
  );
};

// ---------------------------------------------------------------------------
// Form + sheet
// ---------------------------------------------------------------------------

const AddTaskFormBody: React.FC<{ context: AddTaskContext; onDone: () => void; onTitleChange: (title: string) => void }> = ({ context, onDone, onTitleChange }) => {
  const panels = usePanelStore(s => s.panels);
  const addTask = useTaskStore(s => s.addTask);
  const [targetId, setTargetId] = useState(context.target);
  const [form, setForm] = useState(() => initialForm(context));
  const patch: Patch = p => {
    setForm(f => ({ ...f, ...p }));
    if (p.title !== undefined) onTitleChange(p.title);
  };

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
    toast.success(`已添加到「${destination}」`);
    useUIStore.getState().setActiveTab(navigateTo);
    onDone();
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-6">
      <Section>
        <input
          type="text"
          autoFocus
          value={form.title}
          onChange={e => patch({ title: e.target.value })}
          placeholder={isEmergency ? '发生了什么？' : '要做什么？'}
          className="w-full h-12 px-4 bg-transparent text-headline text-theme-text placeholder:text-theme-text-muted outline-none"
        />
      </Section>

      <TargetSection
        value={targetId}
        onChange={id => {
          setTargetId(id);
          haptic('light');
        }}
        target={target}
        form={form}
      />

      {isEmergency && <EmergencySection form={form} patch={patch} />}
      {(flavor === 'exam' || flavor === 'art') && <RoutineSection flavor={flavor} form={form} patch={patch} />}
      {!isEmergency && flavor !== 'exam' && flavor !== 'art' && (
        <Section title="重复" variant="plain">
          <SegmentedControl value={form.period} onChange={period => patch({ period, frequency: period })} options={PERIOD_OPTIONS} />
        </Section>
      )}

      <SubtaskSection form={form} patch={patch} />
      <ScheduleSection form={form} patch={patch} allowRecurrence={!isEmergency} />
    </form>
  );
};

export const AddTaskModal: React.FC = () => {
  const context = useUIStore(s => s.addTask);
  const [hasTitle, setHasTitle] = useState(false);
  const close = () => {
    useUIStore.getState().close('addTask');
    setHasTitle(false);
  };

  return (
    <Modal
      open={Boolean(context)}
      onClose={close}
      title={context?.target === 'emergency' ? '登记突发事件' : '新建待办'}
      primary={{ label: '添加', form: FORM_ID, disabled: !hasTitle }}
    >
      {/* Mounted per opening, so every opening starts from a fresh form. */}
      {context && <AddTaskFormBody context={context} onDone={close} onTitleChange={t => setHasTitle(Boolean(t.trim()))} />}
    </Modal>
  );
};

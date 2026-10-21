import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Clock, 
  BookOpen, 
  CheckCircle, 
  Play, 
  Pause, 
  RotateCcw, 
  Flame,
  Plus
} from 'lucide-react';
import { SquircleCard } from '../common/SquircleCard';
import { PillTag } from '../common/PillTag';
import { SquircleButton } from '../common/SquircleButton';
import { useTaskStore } from '../../stores/useTaskStore';
import { TodoItem, ExamData } from '../../types';
import { nativeBridge } from '../../utils/bridge';
import { triggerConfetti } from '../common/ConfettiBurst';

const SUBJECT_OPTIONS = [
  { id: 'all', label: '全科汇总' },
  { id: 'math', label: '数学 / 统考数学' },
  { id: 'english', label: '考研英语' },
  { id: 'politics', label: '思想政治理论' },
  { id: 'major1', label: '专业课一' },
  { id: 'major2', label: '专业课二' },
];

export const ExamPersonaView: React.FC = () => {
  const { tasks, addTask, updateTask } = useTaskStore();
  const [selectedSubject, setSelectedSubject] = useState('all');
  
  // Target Exam Date (Defaults to late December)
  const [targetExamDate] = useState('2026-12-26');
  const [daysRemaining, setDaysRemaining] = useState(79);

  // Pomodoro / Mock Stopwatch State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'pomodoro' | 'mock'>('pomodoro'); // 25min vs 180min
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(25 * 60);
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);

  // Quick Task Creation Input
  const [quickTitle, setQuickTitle] = useState('');
  const [quickSubject, setQuickSubject] = useState('math');
  const [quickModule, setQuickModule] = useState('高等数学');
  const [quickType, setQuickType] = useState('习题练习');

  // Compute Days Remaining
  useEffect(() => {
    const now = new Date();
    const target = new Date(targetExamDate);
    const diffMs = target.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    setDaysRemaining(days);
  }, [targetExamDate]);

  // Timer Tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timeLeftSeconds > 0) {
      interval = setInterval(() => {
        setTimeLeftSeconds(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            nativeBridge.performHapticFeedback('success');
            triggerConfetti();
            // Record focus minutes to task if linked
            if (activeTimerTaskId) {
              const minutes = timerMode === 'pomodoro' ? 25 : 180;
              const task = tasks.find(t => t.id === activeTimerTaskId);
              if (task) {
                const currentData = (task.examData || task.personaData || {}) as ExamData;
                updateTask(activeTimerTaskId, {
                  examData: {
                    ...currentData,
                    subject: currentData.subject || 'math',
                    focusTimeTotalMinutes: (currentData.focusTimeTotalMinutes || 0) + minutes,
                    pomodoroCount: (currentData.pomodoroCount || 0) + 1,
                  },
                  personaData: {
                    ...currentData,
                    subject: currentData.subject || 'math',
                    focusTimeTotalMinutes: (currentData.focusTimeTotalMinutes || 0) + minutes,
                    pomodoroCount: (currentData.pomodoroCount || 0) + 1,
                  }
                });
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeLeftSeconds, activeTimerTaskId, timerMode, tasks, updateTask]);

  const handleStartTimer = (mode: 'pomodoro' | 'mock', taskId?: string) => {
    setTimerMode(mode);
    setTimeLeftSeconds(mode === 'pomodoro' ? 25 * 60 : 180 * 60);
    if (taskId) setActiveTimerTaskId(taskId);
    setIsTimerRunning(true);
    nativeBridge.performHapticFeedback('medium');
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeftSeconds(timerMode === 'pomodoro' ? 25 * 60 : 180 * 60);
    nativeBridge.performHapticFeedback('light');
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Ebbinghaus Review Intervals (+1, +2, +4, +7, +15 days)
  const handleAdvanceEbbinghaus = (task: TodoItem) => {
    const exam: Partial<ExamData> = task.examData || task.personaData || {};
    const currentRound = exam.ebbinghausRound || 0;
    const nextRound = Math.min(5, currentRound + 1);

    const intervals = [1, 2, 4, 7, 15];
    const now = new Date();
    const nextDue = nextRound <= 5 
      ? new Date(now.getTime() + intervals[nextRound - 1] * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : '已满5轮';

    const updatedExam: ExamData = {
      subject: exam.subject || 'math',
      moduleName: exam.moduleName,
      chapter: exam.chapter,
      questionType: exam.questionType,
      ebbinghausTracking: true,
      ebbinghausRound: nextRound,
      ebbinghaus: {
        round: nextRound,
        nextDue,
        history: [...(exam.ebbinghaus?.history || []), now.toISOString().slice(0, 10)],
      },
      focusTimeTotalMinutes: exam.focusTimeTotalMinutes,
      pomodoroCount: exam.pomodoroCount,
    };

    updateTask(task.id, {
      examData: updatedExam,
      personaData: updatedExam,
    });

    nativeBridge.performHapticFeedback('success');
    triggerConfetti();
  };

  // Quick Add Exam Task
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    addTask({
      title: quickTitle.trim(),
      persona: 'exam',
      priority: 'high',
      tags: [SUBJECT_OPTIONS.find(s => s.id === quickSubject)?.label || '考研', quickType],
      examData: {
        subject: quickSubject,
        moduleName: quickModule,
        questionType: quickType,
        ebbinghausTracking: true,
        ebbinghausRound: 0,
        focusTimeTotalMinutes: 0,
        pomodoroCount: 0,
      },
      personaData: {
        subject: quickSubject,
        moduleName: quickModule,
        questionType: quickType,
        ebbinghausTracking: true,
        ebbinghausRound: 0,
        focusTimeTotalMinutes: 0,
        pomodoroCount: 0,
      }
    });

    setQuickTitle('');
    nativeBridge.performHapticFeedback('light');
    triggerConfetti();
  };

  // Filter exam tasks
  const examTasks = tasks.filter(t => (t.persona || t.personaId) === 'exam');
  const filteredTasks = examTasks.filter(t => {
    if (selectedSubject === 'all') return true;
    const subj = t.examData?.subject || t.personaData?.subject;
    return subj === selectedSubject;
  });

  return (
    <div className="space-y-3.5">
      {/* 1. Countdown Banner Card */}
      <SquircleCard elevation={2} radius="lg" className="p-4 bg-gradient-to-r from-theme-card to-theme-card-subtle border border-theme-border relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-squircle bg-amber-500/15 text-amber-500">
                <GraduationCap className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-theme-text uppercase tracking-wider">
                2027 考研全国统考倒计时
              </span>
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-theme-accent tracking-tight">{daysRemaining}</span>
              <span className="text-xs font-medium text-theme-text-secondary">天</span>
              <span className="text-[11px] text-theme-text-muted">（目标日期：{targetExamDate}）</span>
            </div>
          </div>

          <div className="text-right">
            <PillTag 
              variant="accent" 
              size="sm" 
              icon={<Flame className="w-3 h-3 text-orange-500" />}
              label="星光不负赶路人" 
            />
            <div className="text-[10px] text-theme-text-muted mt-1.5">
              每日精进 · 艾宾浩斯记忆强化
            </div>
          </div>
        </div>
      </SquircleCard>

      {/* 2. Focus Study & Mock Exam Stopwatch Controller */}
      <SquircleCard elevation={1} radius="md" className="p-3.5 space-y-3 bg-theme-card border border-theme-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-theme-accent" />
            <h3 className="text-xs font-bold text-theme-text">专注计时与真题模考</h3>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => handleStartTimer('pomodoro')}
              className={`px-2.5 py-1 rounded-squircle text-[11px] font-medium transition-colors ${
                timerMode === 'pomodoro' 
                  ? 'bg-theme-accent text-theme-accent-contrast shadow-sm' 
                  : 'bg-theme-card-subtle text-theme-text-secondary'
              }`}
            >
              25m 番茄钟
            </button>
            <button
              onClick={() => handleStartTimer('mock')}
              className={`px-2.5 py-1 rounded-squircle text-[11px] font-medium transition-colors ${
                timerMode === 'mock' 
                  ? 'bg-theme-accent text-theme-accent-contrast shadow-sm' 
                  : 'bg-theme-card-subtle text-theme-text-secondary'
              }`}
            >
              180m 真题模考
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-squircle bg-theme-card-subtle border border-theme-border/60">
          <div>
            <div className="text-2xl font-mono font-bold text-theme-text">
              {formatTimer(timeLeftSeconds)}
            </div>
            <div className="text-[10px] text-theme-text-muted mt-0.5">
              {timerMode === 'pomodoro' ? '高效沉浸专注 · 告别手机干扰' : '考研全真模拟考场环境'}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <SquircleButton
              size="sm"
              variant={isTimerRunning ? 'tonal' : 'filled'}
              icon={isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              onClick={() => {
                setIsTimerRunning(!isTimerRunning);
                nativeBridge.performHapticFeedback('light');
              }}
            >
              {isTimerRunning ? '暂停' : '开始'}
            </SquircleButton>
            <SquircleButton
              size="sm"
              variant="ghost"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleResetTimer}
            >
              重置
            </SquircleButton>
          </div>
        </div>
      </SquircleCard>

      {/* 3. Subject Filter Tabs */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none">
        {SUBJECT_OPTIONS.map(sub => (
          <button
            key={sub.id}
            onClick={() => {
              setSelectedSubject(sub.id);
              nativeBridge.performHapticFeedback('light');
            }}
            className={`px-2.5 py-1 rounded-squircle text-xs whitespace-nowrap shrink-0 transition-colors ${
              selectedSubject === sub.id
                ? 'bg-theme-accent text-theme-accent-contrast font-semibold shadow-sm'
                : 'bg-theme-card text-theme-text-secondary hover:text-theme-text border border-theme-border/60'
            }`}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {/* 4. Quick Subject Task Input */}
      <form onSubmit={handleQuickAdd} className="p-3 bg-theme-card rounded-squircle border border-theme-border space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="新建考研任务（例如：张宇高数18讲 第五讲习题）..."
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            className="flex-1 text-xs px-3 py-2 rounded-squircle bg-theme-card-subtle text-theme-text border border-theme-border/60 outline-none focus:border-theme-accent"
          />
          <SquircleButton size="sm" variant="filled" type="submit" icon={<Plus className="w-3.5 h-3.5" />}>
            添加
          </SquircleButton>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-theme-text-secondary">
          <select 
            value={quickSubject} 
            onChange={e => setQuickSubject(e.target.value)}
            className="bg-theme-card-subtle px-2 py-1 rounded-squircle border border-theme-border/60 text-theme-text outline-none"
          >
            <option value="math">数学</option>
            <option value="english">英语</option>
            <option value="politics">政治</option>
            <option value="major1">专业课一</option>
            <option value="major2">专业课二</option>
          </select>
          <input
            type="text"
            placeholder="模块/章节"
            value={quickModule}
            onChange={e => setQuickModule(e.target.value)}
            className="w-24 bg-theme-card-subtle px-2 py-1 rounded-squircle border border-theme-border/60 text-theme-text outline-none"
          />
          <select
            value={quickType}
            onChange={e => setQuickType(e.target.value)}
            className="bg-theme-card-subtle px-2 py-1 rounded-squircle border border-theme-border/60 text-theme-text outline-none"
          >
            <option value="习题练习">习题练习</option>
            <option value="核心词汇">核心词汇</option>
            <option value="真题精析">真题精析</option>
            <option value="知识背诵">知识背诵</option>
          </select>
        </div>
      </form>

      {/* 5. Ebbinghaus Spaced Repetition Mastery Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-theme-text flex items-center space-x-1.5">
            <BookOpen className="w-3.5 h-3.5 text-theme-accent" />
            <span>艾宾浩斯复习进度与科目列表 ({filteredTasks.length})</span>
          </h4>
          <span className="text-[10px] text-theme-text-muted">1/2/4/7/15天记忆曲线</span>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="py-6 text-center text-xs text-theme-text-muted bg-theme-card-subtle rounded-squircle border border-dashed border-theme-border/70">
            该科目下暂无任务，可在上方输入框添加
          </div>
        ) : (
          filteredTasks.map(task => {
            const exam: Partial<ExamData> = task.examData || task.personaData || {};
            const round = exam.ebbinghausRound || 0;
            const focusMinutes = exam.focusTimeTotalMinutes || 0;

            return (
              <SquircleCard key={task.id} elevation={1} radius="md" className="p-3 bg-theme-card border border-theme-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs text-theme-text line-clamp-1">{task.title}</span>
                    {task.isPinned && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-500 text-[10px] font-bold">
                        置顶
                      </span>
                    )}
                  </div>
                  <PillTag 
                    size="sm" 
                    variant={round >= 5 ? 'accent' : 'subtle'} 
                    label={round >= 5 ? '已完全掌握' : `第 ${round}/5 轮复习`} 
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-theme-text-secondary pt-1">
                  {/* 5-dot mastery indicator */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] text-theme-text-muted">掌握度:</span>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map(dot => (
                        <span 
                          key={dot}
                          className={`w-2.5 h-2.5 rounded-full transition-colors ${
                            dot <= round 
                              ? 'bg-theme-accent shadow-sm' 
                              : 'bg-stone-200 dark:bg-stone-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Focus Minutes Badge */}
                  {focusMinutes > 0 && (
                    <span className="text-[10px] text-amber-500 font-medium">
                      已专注 {focusMinutes} 分钟
                    </span>
                  )}

                  {/* Advance Review Round Button */}
                  <button
                    onClick={() => handleAdvanceEbbinghaus(task)}
                    className="flex items-center space-x-1 px-2 py-0.5 rounded-squircle bg-theme-accent/15 text-theme-accent hover:bg-theme-accent/25 text-[10px] font-medium transition-colors"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>打卡下一轮</span>
                  </button>
                </div>
              </SquircleCard>
            );
          })
        )}
      </div>
    </div>
  );
};

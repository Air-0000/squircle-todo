import React, { useState } from 'react';
import { 
  Users, 
  AlertTriangle, 
  CheckSquare, 
  Car, 
  Plus, 
  FileText, 
  ArrowRightLeft,
  Flame
} from 'lucide-react';
import { SquircleCard } from '../common/SquircleCard';
import { PillTag } from '../common/PillTag';
import { SquircleButton } from '../common/SquircleButton';
import { useTaskStore } from '../../stores/useTaskStore';
import { SecurityData, SecurityShiftType, VisitorRecord, ChecklistItem } from '../../types';
import { nativeBridge } from '../../utils/bridge';
import { triggerConfetti } from '../common/ConfettiBurst';

const SHIFT_TYPES: { id: SecurityShiftType; label: string; time: string }[] = [
  { id: 'morning', label: '早班', time: '08:00 - 16:00' },
  { id: 'afternoon', label: '中班', time: '16:00 - 24:00' },
  { id: 'night', label: '夜班', time: '00:00 - 08:00' },
];

const PRESET_PATROL_ITEMS = [
  '消控室主机信号与联动排查',
  '各楼层消防栓水压及灭火器指针检查',
  '弱电井与发电机房配电柜温升监测',
  '地下停车场防盗门禁与通道道闸巡检',
  '园区外围周界红外对射报警测试',
];

export const SecurityPersonaView: React.FC = () => {
  const { tasks, addTask } = useTaskStore();

  // Shift handover form
  const [currentShift, setCurrentShift] = useState<SecurityShiftType>('morning');
  const [dutyOfficer, setDutyOfficer] = useState('张伟');
  const [relievingOfficer, setRelievingOfficer] = useState('李明');
  const [handoverNotes, setHandoverNotes] = useState('设备运转正常，无异常报警');

  // Emergency Incident Quick Add
  const [emergencyTitle, setEmergencyTitle] = useState('');
  const [isAddingEmergency, setIsAddingEmergency] = useState(false);

  // Visitor Flow Registration
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [visitPurpose, setVisitPurpose] = useState('业务拜访 / 施工');

  // 1. Submit Shift Handover Record
  const handleCreateHandoverTask = (e: React.FormEvent) => {
    e.preventDefault();
    const shiftLabel = SHIFT_TYPES.find(s => s.id === currentShift)?.label || '班次';

    addTask({
      title: `【班次交接】${shiftLabel}值班记录 (${dutyOfficer} → ${relievingOfficer})`,
      persona: 'security',
      priority: 'high',
      tags: ['班次交接', shiftLabel, dutyOfficer],
      securityData: {
        shift: currentShift,
        shiftType: currentShift,
        dutyPersonnel: dutyOfficer,
        relievingPersonnel: relievingOfficer,
        handoverStatus: 'completed',
        notes: handoverNotes,
        isEmergency: false,
      },
      personaData: {
        shift: currentShift,
        shiftType: currentShift,
        dutyPersonnel: dutyOfficer,
        relievingPersonnel: relievingOfficer,
        handoverStatus: 'completed',
        notes: handoverNotes,
        isEmergency: false,
      }
    });

    nativeBridge.performHapticFeedback('success');
    triggerConfetti();
  };

  // 2. Submit Emergency Incident (Top Pinned + Urgent)
  const handleCreateEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyTitle.trim()) return;

    addTask({
      title: `🚨【突发应急】${emergencyTitle.trim()}`,
      persona: 'security',
      priority: 'urgent',
      isPinned: true,
      tags: ['突发应急', '安保置顶'],
      securityData: {
        isEmergency: true,
        dutyPersonnel: dutyOfficer,
        notes: '紧急呼叫就绪，优先处置中',
      },
      personaData: {
        isEmergency: true,
        dutyPersonnel: dutyOfficer,
        notes: '紧急呼叫就绪，优先处置中',
      }
    });

    setEmergencyTitle('');
    setIsAddingEmergency(false);
    nativeBridge.performHapticFeedback('heavy');
  };

  // 3. Register Visitor & Vehicle Log
  const handleRegisterVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) return;

    const newRecord: VisitorRecord = {
      id: `vis-${Date.now()}`,
      visitorName: visitorName.trim(),
      phone: visitorPhone.trim(),
      plateNumber: plateNumber.trim(),
      purpose: visitPurpose,
      inTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      status: 'on_site',
    };

    addTask({
      title: `【出入登记】${visitorName.trim()} (${plateNumber || '步行'}) - ${visitPurpose}`,
      persona: 'security',
      priority: 'medium',
      tags: ['出入报备', '在场待离场'],
      securityData: {
        visitorLog: newRecord,
        dutyPersonnel: dutyOfficer,
      },
      personaData: {
        visitorLog: newRecord,
        dutyPersonnel: dutyOfficer,
      }
    });

    setVisitorName('');
    setVisitorPhone('');
    setPlateNumber('');
    nativeBridge.performHapticFeedback('light');
    triggerConfetti();
  };

  // 4. Create Standard Patrol Inspection List
  const handleCreatePatrolTask = () => {
    const subtasks: ChecklistItem[] = PRESET_PATROL_ITEMS.map((item, idx) => ({
      id: `patrol-${Date.now()}-${idx}`,
      text: item,
      title: item,
      completed: false,
      isCompleted: false,
      order: idx,
    }));

    addTask({
      title: `【定时巡查】${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 设施消防例行巡检清单`,
      persona: 'security',
      priority: 'high',
      tags: ['例行巡检', '消控安防'],
      subtasks,
      checklists: subtasks,
      securityData: {
        patrolItems: subtasks,
        dutyPersonnel: dutyOfficer,
      },
      personaData: {
        patrolItems: subtasks,
        dutyPersonnel: dutyOfficer,
      }
    });

    nativeBridge.performHapticFeedback('success');
    triggerConfetti();
  };

  // Filter security tasks
  const securityTasks = tasks.filter(t => (t.persona || t.personaId) === 'security');

  return (
    <div className="space-y-3.5">
      {/* 1. Emergency Quick Incident Trigger Card */}
      <SquircleCard elevation={2} radius="lg" className="p-3.5 bg-gradient-to-r from-rose-500/10 to-theme-card border border-rose-500/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-squircle bg-rose-500/20 text-rose-500">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wide">
                突发应急事项一键置顶上报
              </h3>
              <p className="text-[10px] text-theme-text-muted">触发后强制全局置顶且标红警示</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddingEmergency(!isAddingEmergency)}
            className="px-2.5 py-1 rounded-squircle bg-rose-500 text-white text-xs font-semibold shadow-sm active:scale-95 transition-transform"
          >
            {isAddingEmergency ? '收起' : '+ 快速报备'}
          </button>
        </div>

        {isAddingEmergency && (
          <form onSubmit={handleCreateEmergency} className="pt-2 border-t border-rose-500/20 flex space-x-2">
            <input
              type="text"
              autoFocus
              placeholder="输入紧急情况（如：2号楼西消防梯感烟报警/大门车辆刮擦）..."
              value={emergencyTitle}
              onChange={e => setEmergencyTitle(e.target.value)}
              className="flex-1 text-xs px-3 py-2 rounded-squircle bg-theme-card text-theme-text border border-rose-500/40 outline-none focus:border-rose-500"
            />
            <SquircleButton size="sm" variant="filled" type="submit" className="bg-rose-500 text-white">
              置顶
            </SquircleButton>
          </form>
        )}
      </SquircleCard>

      {/* 2. Shift Handover Controller */}
      <SquircleCard elevation={1} radius="md" className="p-3.5 bg-theme-card border border-theme-border space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-theme-text flex items-center space-x-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-theme-accent" />
            <span>三班交接登记表</span>
          </span>
          <div className="flex items-center space-x-1">
            {SHIFT_TYPES.map(s => (
              <button
                key={s.id}
                onClick={() => setCurrentShift(s.id)}
                className={`px-2 py-0.5 rounded-squircle text-[10px] font-medium transition-colors ${
                  currentShift === s.id
                    ? 'bg-theme-accent text-theme-accent-contrast shadow-sm'
                    : 'bg-theme-card-subtle text-theme-text-secondary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreateHandoverTask} className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-1 bg-theme-card-subtle px-2.5 py-1.5 rounded-squircle border border-theme-border/60">
              <span className="text-[10px] text-theme-text-muted">值班员:</span>
              <input
                type="text"
                value={dutyOfficer}
                onChange={e => setDutyOfficer(e.target.value)}
                className="w-full bg-transparent text-theme-text outline-none text-xs"
              />
            </div>
            <div className="flex items-center space-x-1 bg-theme-card-subtle px-2.5 py-1.5 rounded-squircle border border-theme-border/60">
              <span className="text-[10px] text-theme-text-muted">接班员:</span>
              <input
                type="text"
                value={relievingOfficer}
                onChange={e => setRelievingOfficer(e.target.value)}
                className="w-full bg-transparent text-theme-text outline-none text-xs"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="交接备注事项（设备/钥匙/未结事项）..."
              value={handoverNotes}
              onChange={e => setHandoverNotes(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 rounded-squircle bg-theme-card-subtle text-theme-text border border-theme-border/60 outline-none"
            />
            <SquircleButton size="sm" variant="filled" type="submit">
              生成交接单
            </SquircleButton>
          </div>
        </form>
      </SquircleCard>

      {/* 3. Patrol & Visitor Action Row */}
      <div className="grid grid-cols-2 gap-2">
        {/* Quick Patrol Checklist Generator */}
        <button
          onClick={handleCreatePatrolTask}
          className="p-3 bg-theme-card rounded-squircle border border-theme-border flex items-center space-x-2.5 text-left hover:border-theme-accent transition-colors shadow-squircle"
        >
          <div className="p-2 rounded-squircle bg-blue-500/15 text-blue-500 shrink-0">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-theme-text">发起设施巡检</div>
            <div className="text-[10px] text-theme-text-muted mt-0.5">自动生成5项消控打卡清单</div>
          </div>
        </button>

        {/* Visitor Registration Modal Switcher */}
        <div className="p-3 bg-theme-card rounded-squircle border border-theme-border flex items-center space-x-2.5 text-left shadow-squircle">
          <div className="p-2 rounded-squircle bg-emerald-500/15 text-emerald-500 shrink-0">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-theme-text">车辆与访客登记</div>
            <div className="text-[10px] text-theme-text-muted mt-0.5">实时台账记录归档</div>
          </div>
        </div>
      </div>

      {/* 4. Visitor Quick Register Form */}
      <form onSubmit={handleRegisterVisitor} className="p-3 bg-theme-card rounded-squircle border border-theme-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-theme-text flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 text-theme-accent" />
            <span>外来访客与车辆快速录入</span>
          </span>
          <span className="text-[10px] text-theme-text-muted">门岗进出实时流水</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-xs">
          <input
            type="text"
            placeholder="访客姓名"
            value={visitorName}
            onChange={e => setVisitorName(e.target.value)}
            className="bg-theme-card-subtle px-2 py-1.5 rounded-squircle border border-theme-border/60 text-theme-text outline-none text-xs"
          />
          <input
            type="text"
            placeholder="手机号"
            value={visitorPhone}
            onChange={e => setVisitorPhone(e.target.value)}
            className="bg-theme-card-subtle px-2 py-1.5 rounded-squircle border border-theme-border/60 text-theme-text outline-none text-xs"
          />
          <input
            type="text"
            placeholder="车牌号 (若有)"
            value={plateNumber}
            onChange={e => setPlateNumber(e.target.value)}
            className="bg-theme-card-subtle px-2 py-1.5 rounded-squircle border border-theme-border/60 text-theme-text outline-none text-xs"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="来访事由 / 接待部门"
            value={visitPurpose}
            onChange={e => setVisitPurpose(e.target.value)}
            className="flex-1 text-xs px-2.5 py-1.5 rounded-squircle bg-theme-card-subtle text-theme-text border border-theme-border/60 outline-none"
          />
          <SquircleButton size="sm" variant="filled" type="submit" icon={<Plus className="w-3.5 h-3.5" />}>
            登记
          </SquircleButton>
        </div>
      </form>

      {/* 5. Security Logs & Shift Tasks */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-theme-text flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5 text-theme-accent" />
            <span>值班流水与台账 ({securityTasks.length})</span>
          </h4>
          <span className="text-[10px] text-theme-text-muted">巡检/交接/访客流水</span>
        </div>

        {securityTasks.length === 0 ? (
          <div className="py-6 text-center text-xs text-theme-text-muted bg-theme-card-subtle rounded-squircle border border-dashed border-theme-border/70">
            暂无安保记录，点击上方按钮发起巡检或交接
          </div>
        ) : (
          securityTasks.map(task => {
            const sec: SecurityData = task.securityData || task.personaData || {};
            const isEmerg = task.isPinned || sec.isEmergency;

            return (
              <SquircleCard 
                key={task.id} 
                elevation={1} 
                radius="md" 
                className={`p-3 border space-y-1.5 transition-colors ${
                  isEmerg 
                    ? 'bg-rose-500/10 border-rose-500/40 shadow-md' 
                    : 'bg-theme-card border-theme-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {isEmerg && (
                      <span className="p-1 rounded-squircle bg-rose-500 text-white shrink-0">
                        <Flame className="w-3 h-3" />
                      </span>
                    )}
                    <span className="font-semibold text-xs text-theme-text line-clamp-1">{task.title}</span>
                  </div>

                  <PillTag 
                    size="sm" 
                    variant={isEmerg ? 'urgent' : 'subtle'}
                    label={isEmerg ? '紧急置顶' : sec.shiftType || '常规记录'} 
                  />
                </div>

                {sec.notes && (
                  <p className="text-[11px] text-theme-text-secondary leading-snug line-clamp-2">
                    {sec.notes}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-theme-text-muted pt-1 border-t border-theme-border/30">
                  <span>值班员: {sec.dutyPersonnel || '安保处'}</span>
                  <span>{new Date(task.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </SquircleCard>
            );
          })
        )}
      </div>
    </div>
  );
};

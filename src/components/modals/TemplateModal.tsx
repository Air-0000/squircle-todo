import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FolderPlus, 
  X, 
  Plus, 
  Sparkles,
  BookMarked
} from 'lucide-react';
import { SquircleCard } from '../common/SquircleCard';
import { PillTag } from '../common/PillTag';
import { SquircleButton } from '../common/SquircleButton';
import { useTaskStore } from '../../stores/useTaskStore';
import { nativeBridge } from '../../utils/bridge';
import { triggerConfetti } from '../common/ConfettiBurst';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CustomTemplate {
  id: string;
  name: string;
  desc: string;
  category: string;
  defaultPriority: 'urgent' | 'high' | 'medium' | 'low';
  tags: string[];
  subtasks: string[];
}

const DEFAULT_TEMPLATES: CustomTemplate[] = [
  {
    id: 'tmpl-reading',
    name: '深度阅读与文献拆解',
    desc: '文献精读、摘要提取、批判性笔记、方法论归纳',
    category: '科研/阅读',
    defaultPriority: 'high',
    tags: ['文献精读', '笔记整理', '科研方法'],
    subtasks: ['通读摘要与引言', '核心算法/逻辑推导', '实验数据复现记录', '撰写总结卡片'],
  },
  {
    id: 'tmpl-fitness',
    name: '每日体能训练计划',
    desc: '热身拉伸、无氧抗阻、有氧心肺、训练后冷身记录',
    category: '健康打卡',
    defaultPriority: 'medium',
    tags: ['健身', '核心力量', '心肺体能'],
    subtasks: ['动态关节热身 10分钟', '力量抗阻主项 4组×10次', '高强度有氧心肺 20分钟', '筋膜枪放松拉伸'],
  },
  {
    id: 'tmpl-meeting',
    name: '日常例会与工作交办',
    desc: '议题筹备、会议纪要要点、行动项跟进与负责人确认',
    category: '日常办公',
    defaultPriority: 'high',
    tags: ['工作例会', '待办行动项', '跨部门协同'],
    subtasks: ['对齐会前各方议题材料', '记录会议决议与责任人', '发送邮件会议纪要', '建立截止时间复盘任务'],
  },
];

export const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose }) => {
  const { addTask } = useTaskStore();
  const [templates, setTemplates] = useState<CustomTemplate[]>(DEFAULT_TEMPLATES);

  // New template form
  const [isCreating, setIsCreating] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateCategory, setTemplateCategory] = useState('个人自定义');
  const [templateSubtaskStr, setTemplateSubtaskStr] = useState('');

  if (!isOpen) return null;

  const handleApplyTemplate = (tmpl: CustomTemplate) => {
    addTask({
      title: `【${tmpl.name}】${new Date().toLocaleDateString('zh-CN')} 打卡`,
      description: tmpl.desc,
      persona: 'custom',
      priority: tmpl.defaultPriority,
      tags: [...tmpl.tags, tmpl.category],
      subtasks: tmpl.subtasks.map((s, idx) => ({
        id: `sub-${Date.now()}-${idx}`,
        text: s,
        title: s,
        completed: false,
        isCompleted: false,
        order: idx,
      })),
    });

    nativeBridge.performHapticFeedback('success');
    triggerConfetti();
    onClose();
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    const subtasks = templateSubtaskStr
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const newTmpl: CustomTemplate = {
      id: `tmpl-${Date.now()}`,
      name: templateName.trim(),
      desc: templateDesc.trim() || '用户自定义工作流模板',
      category: templateCategory.trim() || '自定义',
      defaultPriority: 'high',
      tags: [templateCategory.trim() || '自定义', '自定义模板'],
      subtasks: subtasks.length > 0 ? subtasks : ['第一项待办项', '第二项待办项'],
    };

    setTemplates([newTmpl, ...templates]);
    setIsCreating(false);
    setTemplateName('');
    setTemplateDesc('');
    setTemplateSubtaskStr('');
    nativeBridge.performHapticFeedback('light');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md bg-theme-card rounded-squircle-lg border border-theme-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-theme-border/60 bg-theme-card">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-squircle bg-theme-accent/15 text-theme-accent">
              <FolderPlus className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-theme-text">工作流模板与分类管理</h3>
              <p className="text-[10px] text-theme-text-muted">一键生成专属待办与子清单</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-squircle text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-subtle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Action Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-theme-text">预置模版库</span>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="text-xs text-theme-accent hover:underline flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreating ? '取消新建' : '新建自定义模板'}</span>
            </button>
          </div>

          {/* New Template Form */}
          {isCreating && (
            <form onSubmit={handleCreateTemplate} className="p-3 bg-theme-card-subtle rounded-squircle border border-theme-border/70 space-y-2 text-xs">
              <input
                type="text"
                placeholder="模板名称（如：短视频脚本拆解）..."
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                className="w-full bg-theme-card px-2.5 py-1.5 rounded-squircle border border-theme-border/60 text-theme-text outline-none text-xs"
              />
              <input
                type="text"
                placeholder="所属分类标签（如：自媒体）..."
                value={templateCategory}
                onChange={e => setTemplateCategory(e.target.value)}
                className="w-full bg-theme-card px-2.5 py-1.5 rounded-squircle border border-theme-border/60 text-theme-text outline-none text-xs"
              />
              <textarea
                placeholder="子待办检查项（每行一项）：&#10;选题搜集与竞品剖析&#10;撰写分镜脚本与台词&#10;实拍录制与B-roll补充&#10;剪辑导出与封面设计"
                rows={4}
                value={templateSubtaskStr}
                onChange={e => setTemplateSubtaskStr(e.target.value)}
                className="w-full bg-theme-card p-2 rounded-squircle border border-theme-border/60 text-theme-text outline-none text-xs font-mono"
              />
              <div className="flex justify-end space-x-2 pt-1">
                <SquircleButton size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
                  取消
                </SquircleButton>
                <SquircleButton size="sm" variant="filled" type="submit">
                  保存模板
                </SquircleButton>
              </div>
            </form>
          )}

          {/* Template Cards List */}
          <div className="space-y-2.5">
            {templates.map(tmpl => (
              <SquircleCard
                key={tmpl.id}
                elevation={1}
                radius="md"
                className="p-3 bg-theme-card-subtle border border-theme-border space-y-2 hover:border-theme-accent transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <BookMarked className="w-3.5 h-3.5 text-theme-accent" />
                      <h4 className="font-semibold text-xs text-theme-text">{tmpl.name}</h4>
                    </div>
                    <p className="text-[10px] text-theme-text-secondary mt-0.5">{tmpl.desc}</p>
                  </div>
                  <PillTag size="sm" variant="subtle" label={tmpl.category} />
                </div>

                {/* Subtask Preview */}
                <div className="space-y-1 pt-1 border-t border-theme-border/40 text-[11px] text-theme-text-muted">
                  {tmpl.subtasks.map((st, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-theme-accent/60"></span>
                      <span className="truncate">{st}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
                  <SquircleButton
                    size="sm"
                    variant="tonal"
                    icon={<Sparkles className="w-3 h-3 text-theme-accent" />}
                    onClick={() => handleApplyTemplate(tmpl)}
                  >
                    应用并创建待办
                  </SquircleButton>
                </div>
              </SquircleCard>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

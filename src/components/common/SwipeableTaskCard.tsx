import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Trash2, Check } from 'lucide-react';
import { TodoItem } from '../../types';
import { SPRING_PHYSICS } from '../../constants/themes';
import { triggerConfetti } from './ConfettiBurst';
import { nativeBridge } from '../../utils/bridge';

export interface SwipeableTaskCardProps {
  task: TodoItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (task: TodoItem) => void;
  children?: React.ReactNode;
  className?: string;
}

export const SwipeableTaskCard: React.FC<SwipeableTaskCardProps> = ({
  task,
  onToggle,
  onDelete,
  onClick,
  children,
  className = '',
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const dragX = useMotionValue(0);
  const hasTriggeredHapticRef = useRef(false);

  // Elastic drag bounds & reveal styling
  const actionOpacity = useTransform(dragX, [-80, -30, 0], [1, 0.5, 0]);
  const actionScale = useTransform(dragX, [-100, -60, 0], [1, 0.85, 0.7]);

  const handleDrag = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    // Tactile threshold haptic when swiping past -75px
    if (info.offset.x < -75 && !hasTriggeredHapticRef.current) {
      nativeBridge.performHapticFeedback('light');
      hasTriggeredHapticRef.current = true;
    } else if (info.offset.x >= -75 && hasTriggeredHapticRef.current) {
      hasTriggeredHapticRef.current = false;
    }
  };

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    hasTriggeredHapticRef.current = false;

    // Full swipe threshold: auto-delete
    if (info.offset.x < -135 || info.velocity.x < -600) {
      setIsDeleting(true);
      nativeBridge.performHapticFeedback('medium');
      setTimeout(() => onDelete(task.id), 180);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const willBeCompleted = !task.completed;

    if (willBeCompleted) {
      nativeBridge.performHapticFeedback('success');
      const rect = e.currentTarget.getBoundingClientRect();
      const origin = {
        x: (rect.left + rect.width / 2) / (window.innerWidth || 360),
        y: (rect.top + rect.height / 2) / (window.innerHeight || 640),
      };
      triggerConfetti(origin);
    } else {
      nativeBridge.performHapticFeedback('light');
    }

    onToggle(task.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: isDeleting ? 0 : 1, y: 0, scale: isDeleting ? 0.92 : 1 }}
      exit={{ 
        opacity: 0, 
        x: -120, 
        height: 0, 
        marginBottom: 0, 
        overflow: 'hidden', 
        transition: SPRING_PHYSICS.cardExit 
      }}
      transition={SPRING_PHYSICS.defaultCard}
      className={`relative overflow-hidden rounded-squircle touch-pan-y ${className}`}
    >
      {/* Background Action Tray (Revealed on Swipe Left) */}
      <motion.div
        style={{ opacity: actionOpacity }}
        className="absolute inset-y-0 right-0 w-24 bg-rose-500 rounded-squircle flex items-center justify-center text-white z-0"
      >
        <motion.button
          style={{ scale: actionScale }}
          onClick={(e) => {
            e.stopPropagation();
            nativeBridge.performHapticFeedback('medium');
            onDelete(task.id);
          }}
          className="p-3 rounded-full flex flex-col items-center justify-center text-xs font-medium space-y-1"
          aria-label="删除任务"
        >
          <Trash2 className="w-5 h-5 text-white" />
          <span className="text-[10px]">删除</span>
        </motion.button>
      </motion.div>

      {/* Draggable Card Surface */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={{ left: 0.2, right: 0.05 }}
        dragTransition={{ bounceStiffness: 350, bounceDamping: 28 }}
        style={{ x: dragX }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onClick={() => onClick?.(task)}
        className="relative z-10 bg-theme-card p-4 rounded-squircle border border-theme-border/70 shadow-squircle flex items-center space-x-3 select-none active:cursor-grabbing cursor-grab"
      >
        {/* Animated Checkbox with Spring Pop */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          animate={{ scale: task.completed ? [1, 1.25, 1] : 1 }}
          transition={SPRING_PHYSICS.quickCheckbox}
          onClick={handleCheckboxClick}
          aria-label={task.completed ? '标记为未完成' : '标记为已完成'}
          className={`w-6 h-6 rounded-squircle-sm flex items-center justify-center border transition-colors flex-shrink-0 ${
            task.completed
              ? 'bg-theme-accent border-theme-accent text-theme-accent-contrast shadow-sm'
              : 'border-theme-border bg-theme-card-subtle hover:border-theme-accent'
          }`}
        >
          {task.completed && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </motion.div>
          )}
        </motion.button>

        {/* Task Title with Animated GPU Strikethrough */}
        <div className="flex-1 min-w-0 relative">
          <div className="relative inline-block max-w-full">
            <span
              className={`text-sm font-medium tracking-tight block truncate transition-colors duration-200 ${
                task.completed ? 'text-theme-text-muted line-through opacity-70' : 'text-theme-text'
              }`}
            >
              {task.title}
            </span>

            {/* GPU-Accelerated Composite-Only Strikethrough Line */}
            <motion.span
              initial={false}
              animate={{ scaleX: task.completed ? 1 : 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              style={{ originX: 0 }}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-theme-text-muted/80 rounded-full pointer-events-none transform-gpu"
            />
          </div>

          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SwipeableTaskCard;

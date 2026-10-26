import React from 'react';
import { AddTaskModal } from '../modals/AddTaskModal';
import { TaskEditModal } from '../modals/TaskEditModal';
import { BackupModal } from '../modals/BackupModal';
import { AddPanelModal } from '../modals/AddPanelModal';
import { ConfigureModulesModal } from '../modals/ConfigureModulesModal';
import { BulletinModal } from '../modals/BulletinModal';
import { BulletinListModal } from '../modals/BulletinListModal';
import { PublishBulletinModal } from '../modals/PublishBulletinModal';
import { FeedbackModal } from '../modals/FeedbackModal';
import { UpdateModal } from '../modals/UpdateModal';
import { GlobalToast } from '../ui/GlobalToast';
import { ConfirmModal } from '../ui/ConfirmModal';
import { FocusClockModal } from '../focus/FocusClockModal';
import { DynamicIslandCapsule } from '../focus/DynamicIslandCapsule';

/** Every overlay in the app; each reads its own open state from the stores. */
export const ModalHost: React.FC = () => (
  <>
    <AddTaskModal />
    <TaskEditModal />
    <BackupModal />
    <AddPanelModal />
    <ConfigureModulesModal />
    <BulletinListModal />
    <BulletinModal />
    <PublishBulletinModal />
    <FeedbackModal />
    <UpdateModal />
    <GlobalToast />
    <ConfirmModal />
    <FocusClockModal />
    <DynamicIslandCapsule />
  </>
);

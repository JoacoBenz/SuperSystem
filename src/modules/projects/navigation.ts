import type { NavigationItem } from '@/src/core/modules/types';

export const projectsNavigation: NavigationItem[] = [
  {
    key: '/projects',
    label: 'Projects',
    icon: 'FolderOutlined',
    requiredPermissions: ['projects.project.read'],
  },
  {
    key: '/projects/tasks',
    label: 'My Tasks',
    icon: 'CheckSquareOutlined',
    requiredPermissions: ['projects.task.read'],
  },
  {
    key: '/projects/time',
    label: 'Time Tracking',
    icon: 'ClockCircleOutlined',
    requiredPermissions: ['projects.time_entry.read'],
  },
];

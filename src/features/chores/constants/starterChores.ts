import type { ChoreScheduleType } from '@/features/chores/types';

export type StarterChore = {
  id: string;
  title: string;
  description: string;
  points: number;
  scheduleType: ChoreScheduleType;
  requiresApproval: boolean;
  minAge: number;
  maxAge: number;
};

export const starterChores: StarterChore[] = [
  {
    id: 'tidy-toys',
    title: 'Tidy up toys',
    description: 'Put toys back where they belong.',
    points: 5,
    scheduleType: 'daily',
    requiresApproval: false,
    minAge: 4,
    maxAge: 8,
  },
  {
    id: 'make-bed',
    title: 'Make your bed',
    description: 'Straighten your bed after waking up.',
    points: 5,
    scheduleType: 'daily',
    requiresApproval: false,
    minAge: 6,
    maxAge: 13,
  },
  {
    id: 'set-table',
    title: 'Set the dinner table',
    description: 'Place napkins, utensils, and plates.',
    points: 10,
    scheduleType: 'daily',
    requiresApproval: true,
    minAge: 7,
    maxAge: 15,
  },
  {
    id: 'laundry-helper',
    title: 'Help with laundry',
    description: 'Sort socks and fold simple items.',
    points: 10,
    scheduleType: 'weekly',
    requiresApproval: true,
    minAge: 8,
    maxAge: 16,
  },
  {
    id: 'trash-night',
    title: 'Take out trash',
    description: 'Help move trash and recycling bins.',
    points: 15,
    scheduleType: 'weekly',
    requiresApproval: true,
    minAge: 10,
    maxAge: 17,
  },
];

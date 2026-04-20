export type ChoreScheduleType = 'one_time' | 'daily' | 'weekly';

export type ChoreFormValues = {
  title: string;
  description: string;
  points: number;
  scheduleType: ChoreScheduleType;
  weeklyDays: number[];
  assignedKidIds: string[];
  requiresApproval: boolean;
};

import { supabase } from '@/shared/lib/supabase';
import type { ChoreFormValues } from '@/features/chores/types';

const today = (): string => new Date().toISOString().slice(0, 10);

const asScheduleConfig = (values: ChoreFormValues) => {
  if (values.scheduleType !== 'weekly') return null;
  return { days: values.weeklyDays };
};

export const listChores = async (familyId: string) => {
  const { data, error } = await supabase
    .from('chores')
    .select('*')
    .eq('family_id', familyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const choreIds = data.map((chore) => chore.id);

  if (choreIds.length === 0) return data.map((chore) => ({ ...chore, chore_assignments: [] }));

  const { data: assignments, error: assignmentsError } = await supabase
    .from('chore_assignments')
    .select('chore_id,kid_id')
    .in('chore_id', choreIds);
  if (assignmentsError) throw assignmentsError;

  return data.map((chore) => ({
    ...chore,
    chore_assignments: assignments.filter((assignment) => assignment.chore_id === chore.id),
  }));
};

export const createChore = async (familyId: string, createdBy: string, values: ChoreFormValues) => {
  const { data: chore, error } = await supabase
    .from('chores')
    .insert({
      family_id: familyId,
      created_by: createdBy,
      title: values.title,
      description: values.description || null,
      points: values.points,
      schedule_type: values.scheduleType,
      schedule_config: asScheduleConfig(values),
      requires_approval: values.requiresApproval,
    })
    .select()
    .single();
  if (error) throw error;

  if (values.assignedKidIds.length > 0) {
    const { error: assignmentsError } = await supabase.from('chore_assignments').insert(
      values.assignedKidIds.map((kidId) => ({
        chore_id: chore.id,
        kid_id: kidId,
      })),
    );
    if (assignmentsError) throw assignmentsError;

    const { error: instancesError } = await supabase.from('chore_instances').insert(
      values.assignedKidIds.map((kidId) => ({
        chore_id: chore.id,
        kid_id: kidId,
        family_id: familyId,
        due_date: today(),
        status: 'pending' as const,
      })),
    );
    if (instancesError) throw instancesError;
  }

  return chore;
};

export const updateChore = async (
  choreId: string,
  familyId: string,
  values: ChoreFormValues,
) => {
  const { data: chore, error } = await supabase
    .from('chores')
    .update({
      title: values.title,
      description: values.description || null,
      points: values.points,
      schedule_type: values.scheduleType,
      schedule_config: asScheduleConfig(values),
      requires_approval: values.requiresApproval,
    })
    .eq('id', choreId)
    .eq('family_id', familyId)
    .select()
    .single();
  if (error) throw error;

  const { error: deleteError } = await supabase.from('chore_assignments').delete().eq('chore_id', choreId);
  if (deleteError) throw deleteError;

  if (values.assignedKidIds.length > 0) {
    const { error: insertError } = await supabase.from('chore_assignments').insert(
      values.assignedKidIds.map((kidId) => ({
        chore_id: choreId,
        kid_id: kidId,
      })),
    );
    if (insertError) throw insertError;
  }

  return chore;
};

export const batchCreateStarterChores = async (
  familyId: string,
  createdBy: string,
  chores: Array<{
    title: string;
    description: string;
    points: number;
    scheduleType: 'one_time' | 'daily' | 'weekly';
    requiresApproval: boolean;
  }>,
  kidIds: string[],
) => {
  const inserts = chores.map((chore) =>
    createChore(familyId, createdBy, {
      title: chore.title,
      description: chore.description,
      points: chore.points,
      scheduleType: chore.scheduleType,
      weeklyDays: chore.scheduleType === 'weekly' ? [1, 3, 5] : [],
      assignedKidIds: kidIds,
      requiresApproval: chore.requiresApproval,
    }),
  );
  return Promise.all(inserts);
};

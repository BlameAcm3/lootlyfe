import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { QUEST_CATEGORIES, type QuestCategoryId } from '../../data/presetQuests';
import { useLexicon } from '../../hooks/useLexicon';
import { useTheme } from '../../hooks/useTheme';
import { weekdayShort } from '../../lib/dates';
import { cn } from '../../lib/cn';
import type { LexiconKey } from '../../lib/lexicon';
import { todayIso, type Recurrence, type RecurrenceType } from '../../lib/recurrence';
import type { AdventurerRow } from '../../queries/adventurerQueries';
import { Button, Card, Input } from '../ui';

export type QuestFormValues = {
  title: string;
  description: string;
  category: QuestCategoryId;
  goldReward: number;
  xpReward: number;
  isRequired: boolean;
  requiresApproval: boolean;
  recurrence: Recurrence;
  assignedAdventurerIds: string[];
};

type QuestFormProps = {
  initial?: Partial<QuestFormValues>;
  /** Active adventurers available for assignment. */
  adventurers: AdventurerRow[];
  submitting?: boolean;
  onSubmit: (values: QuestFormValues) => void;
};

const RECURRENCE_TYPES: RecurrenceType[] = ['daily', 'weekly', 'monthly', 'once'];
const RECURRENCE_LABEL_KEYS: Record<RecurrenceType, LexiconKey> = {
  daily: 'recurrence_daily',
  weekly: 'recurrence_weekly',
  monthly: 'recurrence_monthly',
  once: 'recurrence_once',
};
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

type FieldErrors = Partial<
  Record<'title' | 'rewards' | 'weekly' | 'onceDate' | 'monthlyDay' | 'window' | 'assign', string>
>;

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn('rounded-full px-4 py-2', selected ? 'bg-accent-info' : 'bg-bg-base')}
    >
      <Text
        className={cn(
          'text-sm',
          selected ? 'text-text-inverse font-bold' : 'text-text-muted font-semibold',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text className="text-text-muted text-xs font-bold uppercase tracking-wider">{text}</Text>;
}

function FieldError({ text }: { text?: string }) {
  return text ? <Text className="text-danger text-xs font-semibold">{text}</Text> : null;
}

export const QuestForm = ({ initial, adventurers, submitting, onSubmit }: QuestFormProps) => {
  const { t } = useLexicon();
  const { palette } = useTheme();
  const initialRecurrence = initial?.recurrence;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<QuestCategoryId>(initial?.category ?? 'chores');
  const [gold, setGold] = useState(String(initial?.goldReward ?? 5));
  const [xp, setXp] = useState(String(initial?.xpReward ?? 10));
  const [isRequired, setIsRequired] = useState(initial?.isRequired ?? false);
  const [requiresApproval, setRequiresApproval] = useState(initial?.requiresApproval ?? true);
  const [assignedIds, setAssignedIds] = useState<string[]>(initial?.assignedAdventurerIds ?? []);

  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    initialRecurrence?.type ?? 'daily',
  );
  const [weeklyDays, setWeeklyDays] = useState<number[]>(
    initialRecurrence?.type === 'weekly' ? initialRecurrence.days : [],
  );
  const [monthlyDay, setMonthlyDay] = useState(
    String(initialRecurrence?.type === 'monthly' ? initialRecurrence.day : 1),
  );
  const [onceDate, setOnceDate] = useState(
    initialRecurrence?.type === 'once' ? initialRecurrence.date : todayIso(),
  );
  const [windowEnabled, setWindowEnabled] = useState(Boolean(initialRecurrence?.window));
  const [windowStart, setWindowStart] = useState(initialRecurrence?.window?.start ?? '16:00');
  const [windowEnd, setWindowEnd] = useState(initialRecurrence?.window?.end ?? '18:00');

  const [errors, setErrors] = useState<FieldErrors>({});

  const toggleWeekday = (day: number) =>
    setWeeklyDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );

  const toggleAdventurer = (id: string) =>
    setAssignedIds((current) =>
      current.includes(id) ? current.filter((a) => a !== id) : [...current, id],
    );

  const handleSubmit = () => {
    const nextErrors: FieldErrors = {};
    const goldValue = Number(gold);
    const xpValue = Number(xp);
    const monthlyDayValue = Number(monthlyDay);

    if (!title.trim()) nextErrors.title = t('quest_title_required');
    if (
      !Number.isInteger(goldValue) ||
      goldValue < 0 ||
      !Number.isInteger(xpValue) ||
      xpValue < 0
    ) {
      nextErrors.rewards = t('quest_reward_invalid');
    }
    if (recurrenceType === 'weekly' && weeklyDays.length === 0) {
      nextErrors.weekly = t('recurrence_weekly_days_required');
    }
    if (
      recurrenceType === 'monthly' &&
      (!Number.isInteger(monthlyDayValue) || monthlyDayValue < 1 || monthlyDayValue > 31)
    ) {
      nextErrors.monthlyDay = t('recurrence_date_invalid');
    }
    if (recurrenceType === 'once' && !ISO_DATE_RE.test(onceDate)) {
      nextErrors.onceDate = t('recurrence_date_invalid');
    }
    if (
      windowEnabled &&
      (!HHMM_RE.test(windowStart) || !HHMM_RE.test(windowEnd) || windowStart >= windowEnd)
    ) {
      nextErrors.window = t('time_window_invalid');
    }
    if (assignedIds.length === 0) nextErrors.assign = t('quest_assign_required');

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const shared = {
      // Preserve the original schedule anchor when editing.
      startDate: initialRecurrence?.startDate ?? todayIso(),
      ...(initialRecurrence?.endDate ? { endDate: initialRecurrence.endDate } : {}),
      ...(windowEnabled ? { window: { start: windowStart, end: windowEnd } } : {}),
    };
    const recurrence: Recurrence =
      recurrenceType === 'weekly'
        ? { type: 'weekly', days: weeklyDays, ...shared }
        : recurrenceType === 'monthly'
          ? { type: 'monthly', day: monthlyDayValue, ...shared }
          : recurrenceType === 'once'
            ? { type: 'once', date: onceDate, ...shared }
            : { type: 'daily', ...shared };

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      goldReward: goldValue,
      xpReward: xpValue,
      isRequired,
      requiresApproval,
      recurrence,
      assignedAdventurerIds: assignedIds,
    });
  };

  return (
    <Card className="gap-5">
      <Input
        accessibilityLabel={t('quest_title_label')}
        label={t('quest_title_label')}
        value={title}
        onChangeText={(value) => {
          setTitle(value);
          setErrors((current) => ({ ...current, title: undefined }));
        }}
        error={errors.title}
      />

      <Input
        accessibilityLabel={t('quest_description_label')}
        label={t('quest_description_label')}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <View className="gap-2">
        <FieldLabel text={t('quest_category_label')} />
        <View className="flex-row flex-wrap gap-2">
          {QUEST_CATEGORIES.map((option) => (
            <Chip
              key={option.id}
              label={`${option.emoji} ${t(option.labelKey)}`}
              selected={option.id === category}
              onPress={() => setCategory(option.id)}
            />
          ))}
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            accessibilityLabel={t('quest_gold_label')}
            label={t('quest_gold_label')}
            value={gold}
            onChangeText={setGold}
            keyboardType="number-pad"
          />
        </View>
        <View className="flex-1">
          <Input
            accessibilityLabel={t('quest_xp_label')}
            label={t('quest_xp_label')}
            value={xp}
            onChangeText={setXp}
            keyboardType="number-pad"
          />
        </View>
      </View>
      <FieldError text={errors.rewards} />

      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-text-primary text-sm font-bold">{t('quest_required_label')}</Text>
          <Text className="text-text-muted text-xs">{t('quest_required_hint')}</Text>
        </View>
        <Switch
          accessibilityLabel={t('quest_required_label')}
          value={isRequired}
          onValueChange={setIsRequired}
          trackColor={{ false: palette.border, true: palette['accent-info'] }}
        />
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-text-primary text-sm font-bold">{t('quest_approval_label')}</Text>
          <Text className="text-text-muted text-xs">{t('quest_approval_hint')}</Text>
        </View>
        <Switch
          accessibilityLabel={t('quest_approval_label')}
          value={requiresApproval}
          onValueChange={setRequiresApproval}
          trackColor={{ false: palette.border, true: palette['accent-info'] }}
        />
      </View>

      <View className="gap-2">
        <FieldLabel text={t('quest_recurrence_label')} />
        <View className="flex-row flex-wrap gap-2">
          {RECURRENCE_TYPES.map((option) => (
            <Chip
              key={option}
              label={t(RECURRENCE_LABEL_KEYS[option])}
              selected={option === recurrenceType}
              onPress={() => setRecurrenceType(option)}
            />
          ))}
        </View>

        {recurrenceType === 'weekly' ? (
          <View className="gap-2 pt-1">
            <View className="flex-row flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <Chip
                  key={day}
                  label={weekdayShort(day)}
                  selected={weeklyDays.includes(day)}
                  onPress={() => toggleWeekday(day)}
                />
              ))}
            </View>
            <FieldError text={errors.weekly} />
          </View>
        ) : null}

        {recurrenceType === 'monthly' ? (
          <Input
            accessibilityLabel={t('recurrence_monthly_day_label')}
            label={t('recurrence_monthly_day_label')}
            value={monthlyDay}
            onChangeText={setMonthlyDay}
            keyboardType="number-pad"
            error={errors.monthlyDay}
          />
        ) : null}

        {recurrenceType === 'once' ? (
          <Input
            accessibilityLabel={t('recurrence_once_date_label')}
            label={t('recurrence_once_date_label')}
            value={onceDate}
            onChangeText={setOnceDate}
            placeholder={todayIso()}
            error={errors.onceDate}
          />
        ) : null}
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <FieldLabel text={t('time_window_label')} />
          <Switch
            accessibilityLabel={t('time_window_label')}
            value={windowEnabled}
            onValueChange={setWindowEnabled}
            trackColor={{ false: palette.border, true: palette['accent-info'] }}
          />
        </View>
        {windowEnabled ? (
          <View className="gap-2">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  accessibilityLabel={t('time_window_start_label')}
                  label={t('time_window_start_label')}
                  value={windowStart}
                  onChangeText={setWindowStart}
                />
              </View>
              <View className="flex-1">
                <Input
                  accessibilityLabel={t('time_window_end_label')}
                  label={t('time_window_end_label')}
                  value={windowEnd}
                  onChangeText={setWindowEnd}
                />
              </View>
            </View>
            <FieldError text={errors.window} />
          </View>
        ) : null}
      </View>

      <View className="gap-2">
        <FieldLabel text={t('quest_assign_label')} />
        <View className="flex-row flex-wrap gap-2">
          {adventurers.map((adventurer) => (
            <Chip
              key={adventurer.id}
              label={adventurer.nickname}
              selected={assignedIds.includes(adventurer.id)}
              onPress={() => toggleAdventurer(adventurer.id)}
            />
          ))}
        </View>
        <FieldError text={errors.assign} />
      </View>

      <Button
        accessibilityLabel={t('quest_save_action')}
        label={t('quest_save_action')}
        size="lg"
        disabled={submitting}
        onPress={handleSubmit}
      />
    </Card>
  );
};

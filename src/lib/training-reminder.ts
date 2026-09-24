export const TRAINING_REMINDER_DAY_OPTIONS = [30, 60, 90, 180] as const;

export type TrainingReminderDays = (typeof TRAINING_REMINDER_DAY_OPTIONS)[number];

export function normalizeTrainingReminderDays(value: number | null | undefined): TrainingReminderDays {
  if (value === 60 || value === 90 || value === 180) return value;
  return 30;
}

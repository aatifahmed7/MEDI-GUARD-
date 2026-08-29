import { AppSettings, MedicationEvent } from '../types.js';

export type ReminderState = 'UPCOMING' | 'DUE' | 'DELAYED' | 'SNOOZED' | 'TAKEN_ON_TIME' | 'TAKEN_LATE' | 'MISSED';

function minutesFor(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getReminderState(event: MedicationEvent, now: Date, settings: AppSettings): ReminderState {
  if (event.status === 'Taken on Time') return 'TAKEN_ON_TIME';
  if (event.status === 'Taken Late') return 'TAKEN_LATE';
  if (event.status === 'Missed') return 'MISSED';

  const current = now.getHours() * 60 + now.getMinutes();
  const scheduled = minutesFor(event.scheduledTime);
  const difference = current - scheduled;
  if (difference < 0) return 'UPCOMING';
  if (difference < settings.lateThresholdMinutes) return 'DUE';
  if (difference < settings.missedThresholdMinutes) return 'DELAYED';
  return 'MISSED';
}

export function reminderLabel(state: ReminderState) {
  return state === 'DUE' ? 'DUE NOW' : state === 'DELAYED' ? 'DELAYED' : state === 'MISSED' ? 'MISSED' : state.replaceAll('_', ' ');
}

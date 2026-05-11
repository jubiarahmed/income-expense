import {
  addDays,
  differenceInCalendarDays,
  differenceInMinutes,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';

export function todayISO() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function toISODate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export function formatShortDate(value?: string) {
  if (!value) return 'No date';
  return format(parseISO(value), 'MMM d');
}

export function formatFullDate(value?: string) {
  if (!value) return 'No date';
  return format(parseISO(value), 'MMM d, yyyy');
}

export function isDateOverdue(value?: string) {
  if (!value) return false;
  return isBefore(startOfDay(parseISO(value)), startOfDay(new Date()));
}

export function isDateDueSoon(value?: string, days = 7) {
  if (!value) return false;
  const date = startOfDay(parseISO(value));
  const today = startOfDay(new Date());
  return !isBefore(date, today) && !isAfter(date, addDays(today, days));
}

export function daysUntil(value?: string) {
  if (!value) return undefined;
  return differenceInCalendarDays(parseISO(value), new Date());
}

export function getMonthRange(reference = new Date()) {
  return {
    start: toISODate(startOfMonth(reference)),
    end: toISODate(endOfMonth(reference)),
  };
}

export function getLastNDays(days: number) {
  const now = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = subDays(now, days - index - 1);
    return toISODate(date);
  });
}

export function isSameISODate(left: string, right: string) {
  return isSameDay(parseISO(left), parseISO(right));
}

export function formatRelativeDateTime(value?: string) {
  if (!value) return '';
  const at = typeof value === 'string' ? new Date(value) : value;
  const now = new Date();
  const minutes = differenceInMinutes(now, at);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const sameDay = isSameDay(at, now);
  if (sameDay) return format(at, "p");
  const yesterday = isSameDay(at, subDays(now, 1));
  if (yesterday) return `Yesterday · ${format(at, 'p')}`;
  const days = differenceInCalendarDays(now, at);
  if (days < 7) return `${days}d ago · ${format(at, 'p')}`;
  return format(at, 'MMM d, yyyy · p');
}

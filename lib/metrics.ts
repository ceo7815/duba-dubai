import { addDays, dubaiKey } from "@/lib/dates";

const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function dayKey(iso: string) {
  return dubaiKey(new Date(iso));
}

export function monthKey(key = dubaiKey()) {
  return key.slice(0, 7);
}

export function previousMonthKey(key = dubaiKey()) {
  return monthKey(addDays(`${monthKey(key)}-01`, -1));
}

export function weekStart(key = dubaiKey()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    weekday: "short",
  }).format(new Date(`${key}T12:00:00+04:00`));
  const index = weekdays[weekday as keyof typeof weekdays] ?? 0;
  return addDays(key, -index);
}

export function inDays(iso: string, start: string, end: string) {
  const key = dayKey(iso);
  return key >= start && key < end;
}

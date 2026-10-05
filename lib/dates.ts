const DUBAI = "Asia/Dubai";

export function dubaiKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DUBAI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dubaiDayRange(key = dubaiKey()) {
  const start = new Date(`${key}T00:00:00+04:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { key, start: start.toISOString(), end: end.toISOString() };
}

export function addDays(key: string, days: number) {
  const start = new Date(`${key}T00:00:00+04:00`);
  start.setUTCDate(start.getUTCDate() + days);
  return dubaiKey(start);
}

export function fromDubaiInput(value: string) {
  return new Date(`${value}:00+04:00`).toISOString();
}

export function toDubaiInput(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DUBAI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: DUBAI,
    weekday: "short",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDay(key: string) {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: DUBAI,
    weekday: "long",
    day: "numeric",
    month: "numeric",
  }).format(new Date(`${key}T12:00:00+04:00`));
}

export function formatClock(iso: string) {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: DUBAI,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

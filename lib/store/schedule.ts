const HOURS: Record<number, [number, number] | null> = {
  0: [11 * 60, 23 * 60],
  1: [11 * 60, 23 * 60],
  2: [11 * 60, 22 * 60],
  3: [11 * 60, 23 * 60],
  4: [11 * 60, 23 * 60 + 50],
  5: [11 * 60, 16 * 60],
  6: null,
};

const LEAD_MINUTES = 40;

export function dubaiNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, dow: dayOfWeek(date), minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export function dayOfWeek(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function clock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function slots(date: string, now = dubaiNow()) {
  const hours = HOURS[dayOfWeek(date)];
  if (!hours || date < now.date) return [];
  let start = hours[0];
  if (date === now.date) start = Math.max(start, Math.ceil((now.minutes + LEAD_MINUTES) / 20) * 20);
  const list: string[] = [];
  for (let minute = start; minute <= hours[1]; minute += 20) list.push(clock(minute));
  return list;
}

export function availableDates(rules: { friday: boolean; special: boolean }, count = 14, now = dubaiNow()) {
  const list: string[] = [];
  for (let offset = 0; offset < 70 && list.length < count; offset += 1) {
    const date = addDays(now.date, offset);
    const dow = dayOfWeek(date);
    if (dow === 6) continue;
    if (rules.friday && dow !== 5) continue;
    if (rules.special) {
      const thursday = addDays(date, -1);
      if (now.date > thursday || (now.date === thursday && now.minutes >= 16 * 60)) continue;
    }
    if (slots(date, now).length === 0) continue;
    list.push(date);
  }
  return list;
}

export function shabbatClosed(now = dubaiNow()) {
  return now.dow === 6;
}

export function storeOpen(now = dubaiNow()) {
  const hours = HOURS[now.dow];
  return Boolean(hours && now.minutes >= hours[0] && now.minutes <= hours[1]);
}

export function specialsOpen(now = dubaiNow()) {
  return !(now.dow === 4 && now.minutes >= 16 * 60) && now.dow !== 6;
}

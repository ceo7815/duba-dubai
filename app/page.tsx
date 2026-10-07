import Link from "next/link";
import { redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { addDays, dubaiKey, formatClock, formatDay } from "@/lib/dates";
import { fulfillmentLabels, isFulfillment, money, needsDestination } from "@/lib/domain";
import { dayKey, inDays, weekStart } from "@/lib/metrics";
import { listOrders, type OrderRow } from "@/lib/orders";
import { itemsFor, prepFrom } from "@/lib/prep";
import { requireProfile } from "@/lib/profile";
import { stripeReady } from "@/lib/stripe";
import { dubaiNow, specialsOpen, storeOpen } from "@/lib/store/schedule";

const MINUTE = 60_000;
const HOURS = Array.from({ length: 13 }, (_, index) => 11 + index);
const beforeKitchen = ["awaiting", "link_sent", "cash_agreed"];
const done = ["out", "feedback_sent"];
const confirmed = ["paid_shopify", "in_kitchen", "out", "feedback_sent"];

const hourFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", hourCycle: "h23" });

export default async function DashboardPage() {
  const profile = await requireProfile();
  if (profile.role === "kitchen" || profile.role === "manager") redirect("/today");
  if (profile.role === "accounts") redirect("/money");
  if (profile.role === "integrations") redirect("/connections");

  const orders = await listOrders();
  const now = requestTime();
  const clock = dubaiNow();
  const today = dubaiKey();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const thisWeek = weekStart(today);
  const nextWeek = addDays(thisWeek, 7);
  const lastWeek = addDays(thisWeek, -7);
  const friday = addDays(today, (5 - clock.dow + 7) % 7);
  const specialsClose = new Date(`${addDays(friday, -1)}T16:00:00+04:00`).getTime();

  const live = orders.filter((order) => order.status !== "draft" && !unpaidSite(order));
  const real = live.filter((order) => !order.is_quote);
  const onDay = (key: string) => live.filter((order) => dayKey(order.scheduled_at) === key);
  const ahead = (order: OrderRow) => dayKey(order.scheduled_at) >= today && !done.includes(order.status);

  const todayOrders = onDay(today);
  const kitchen = todayOrders.filter((order) => order.status === "in_kitchen").length;
  const left = todayOrders.filter((order) => done.includes(order.status)).length;
  const next = todayOrders.find((order) => !done.includes(order.status));
  const perHour = HOURS.map((hour) => todayOrders.filter((order) => Number(hourFormat.format(new Date(order.scheduled_at))) === hour).length);
  const busiest = Math.max(1, ...perHour);

  const fridayOrders = onDay(friday);
  const weekOrders = live.filter((order) => inDays(order.scheduled_at, thisWeek, nextWeek));
  const items = await itemsFor([...new Set([...weekOrders, ...fridayOrders].map((order) => order.id))]);
  const fridayIds = new Set(fridayOrders.map((order) => order.id));
  const fridayPrep = prepFrom(items.filter((item) => fridayIds.has(item.order_id)));
  const weekIds = new Set(weekOrders.map((order) => order.id));
  const sellers = new Map<string, number>();
  for (const item of items) {
    if (!weekIds.has(item.order_id) || item.name.startsWith("↳")) continue;
    const name = item.name.split(" · ")[0];
    sellers.set(name, (sellers.get(name) ?? 0) + item.quantity);
  }
  const topSellers = [...sellers.entries()].toSorted((a, b) => b[1] - a[1]).slice(0, 5);

  const paidIn = (list: OrderRow[]) => list.reduce((sum, order) => sum + Number(order.paid), 0);
  const realWeek = real.filter((order) => inDays(order.scheduled_at, thisWeek, nextWeek));
  const todayIn = paidIn(real.filter((order) => dayKey(order.scheduled_at) === today));
  const weekIn = paidIn(real.filter((order) => inDays(order.scheduled_at, thisWeek, tomorrow)));
  const lastWeekIn = paidIn(real.filter((order) => inDays(order.scheduled_at, lastWeek, addDays(tomorrow, -7))));
  const change = lastWeekIn > 0 ? Math.round(((weekIn - lastWeekIn) / lastWeekIn) * 100) : null;
  const weekSales = realWeek.filter((order) => confirmed.includes(order.status));
  const average = weekSales.length ? weekSales.reduce((sum, order) => sum + Number(order.amount), 0) / weekSales.length : 0;
  const openMoney = real
    .filter((order) => confirmed.includes(order.status) && Number(order.amount) > Number(order.paid))
    .reduce((sum, order) => sum + Number(order.amount) - Number(order.paid), 0);

  const abandoned = orders.filter(
    (order) =>
      unpaidSite(order) &&
      now - new Date(order.created_at).getTime() > 30 * MINUTE &&
      dayKey(order.scheduled_at) >= today,
  );
  const pending = live.filter((order) => ahead(order) && beforeKitchen.includes(order.status));
  const unpaid = real.filter((order) => confirmed.includes(order.status) && Number(order.amount) > Number(order.paid));
  const missing = live.filter(
    (order) =>
      ahead(order) &&
      (!order.phone.trim() || (isFulfillment(order.fulfillment) && needsDestination(order.fulfillment) && !order.destination.trim())),
  );
  const feedback = orders.filter((order) => order.status === "out");
  const attention = [
    { label: "תשלום באתר לא הושלם", hint: "לקוח התחיל ולא שילם. כדאי להתקשר", list: abandoned, href: "/orders" },
    { label: "ממתין לאישור", hint: "נשלח ללקוח ועוד לא אישר", list: pending, href: "/orders?stage=waiting" },
    { label: "לא שולם", hint: "אושרו ועוד לא התקבל תשלום", list: unpaid, href: "/expected" },
    { label: "חסרים פרטים", hint: "כתובת או טלפון", list: missing, href: "/orders" },
    { label: "משוב בוקר", hint: "יצאו ועוד לא נשלח משוב", list: feedback, href: "/morning" },
  ].filter((row) => row.list.length > 0);

  const fromSite = weekOrders.filter((order) => order.source === "site").length;
  const sitePercent = weekOrders.length ? Math.round((fromSite / weekOrders.length) * 100) : 0;
  const before = new Set(live.filter((order) => dayKey(order.scheduled_at) < thisWeek).map((order) => order.phone_key));
  const weekPhones = new Set(weekOrders.map((order) => order.phone_key).filter(Boolean));
  const returning = [...weekPhones].filter((phone) => before.has(phone)).length;
  const fresh = weekPhones.size - returning;

  const open = storeOpen(clock);
  const specials = specialsOpen(clock);
  const stripe = stripeReady() && Boolean(process.env.STRIPE_WEBHOOK_SECRET);

  return (
    <Work title="מרכז בקרה" role={profile.role}>
      <Link href="/today" className="rounded-3xl bg-[#111111] px-5 py-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white/60">היום · {formatDay(today)}</p>
            <p className="mt-2 text-6xl font-extrabold leading-none">{todayOrders.length}</p>
            <p className="mt-1 text-base font-bold">הזמנות לצאת</p>
          </div>
          <div className="flex flex-col items-end gap-1 pt-1 text-sm font-bold text-white/80">
            <span>במטבח {kitchen}</span>
            <span>יצאו {left}</span>
            <span>נשארו {todayOrders.length - left}</span>
          </div>
        </div>

        {next ? (
          <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-xs font-bold text-white/60">הבאה שיוצאת</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="truncate text-lg font-extrabold">{next.customer_name || "ללא שם"}</p>
              <p className="shrink-0 text-lg font-extrabold">{formatClock(next.scheduled_at)}</p>
            </div>
            <p className="mt-0.5 text-sm font-bold text-white/70">
              {isFulfillment(next.fulfillment) ? fulfillmentLabels[next.fulfillment] : next.fulfillment} ·{" "}
              {countdown(new Date(next.scheduled_at).getTime() - now)}
            </p>
          </div>
        ) : todayOrders.length > 0 ? (
          <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold">כל ההזמנות של היום יצאו</p>
        ) : null}

        <div className="mt-4">
          <div className="flex h-14 items-end gap-1" dir="ltr">
            {perHour.map((count, index) => (
              <div
                key={HOURS[index]}
                className={`flex-1 rounded-t ${count ? "bg-white" : "bg-white/15"}`}
                style={{ height: `${count ? Math.max(18, (count / busiest) * 100) : 8}%` }}
                title={`${HOURS[index]}:00 · ${count}`}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-bold text-white/50" dir="ltr">
            <span>11:00</span>
            <span>17:00</span>
            <span>23:00</span>
          </div>
        </div>
      </Link>

      <Link href={`/board#day-${friday}`} className="rounded-2xl border border-line bg-card px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-muted">שישי · {formatDay(friday)}</p>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
              now < specialsClose ? "bg-[#111111] text-white" : "bg-line text-muted"
            }`}
          >
            {now < specialsClose ? `ספיישלים נסגרים בעוד ${countdown(specialsClose - now, true)}` : "ספיישלים נסגרו"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="זוגי" value={fridayPrep.packages.couple} />
          <Stat label="משפחתי" value={fridayPrep.packages.family} />
          <Stat label="הזמנות" value={fridayOrders.length} />
        </div>
        {fridayPrep.lines.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3">
            {fridayPrep.lines.slice(0, 6).map((line) => (
              <li key={`${line.group}-${line.name}`} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-bold">{line.name}</span>
                <span className="shrink-0 font-extrabold">×{line.quantity}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Link>

      <Link href="/money" className="rounded-2xl border border-line bg-card px-4 py-4">
        <p className="text-sm font-bold text-muted">כסף</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-muted">נכנס השבוע</p>
            <p className="mt-1 text-3xl font-extrabold leading-none">{money(weekIn)}</p>
          </div>
          {change !== null ? (
            <span
              className={`rounded-full px-2.5 py-1 text-sm font-extrabold ${
                change >= 0 ? "bg-[#e6f4ea] text-[#1e6b34]" : "bg-[#fde8e8] text-[#a12626]"
              }`}
              dir="ltr"
            >
              {change >= 0 ? "+" : ""}
              {change}%
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs font-bold text-muted">לעומת אותם ימים בשבוע שעבר: {money(lastWeekIn)}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
          <Small label="היום" value={money(todayIn)} />
          <Small label="ממוצע הזמנה" value={money(Math.round(average))} />
          <Small label="פתוח לגבייה" value={money(openMoney)} />
        </div>
      </Link>

      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <p className="px-4 pb-3 pt-4 text-sm font-bold text-muted">צריך טיפול</p>
        {attention.length === 0 ? (
          <p className="px-4 pb-4 text-base font-extrabold">הכל מטופל</p>
        ) : (
          attention.map((row) => (
            <Link
              key={row.label}
              href={row.list.length === 1 ? `/orders/${row.list[0].id}` : row.href}
              className="flex min-h-14 items-center justify-between gap-3 border-t border-line px-4 py-3"
            >
              <span>
                <span className="block text-base font-extrabold">{row.label}</span>
                <span className="block text-xs font-bold text-muted">
                  {row.list.length === 1 ? row.list[0].customer_name || row.hint : row.hint}
                </span>
              </span>
              <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#111111] px-2 text-sm font-extrabold text-white">
                {row.list.length}
              </span>
            </Link>
          ))
        )}
      </section>

      <section className="rounded-2xl border border-line bg-card px-4 py-4">
        <p className="text-sm font-bold text-muted">השבוע · {weekOrders.length} הזמנות</p>
        <div className="mt-3">
          <div className="flex justify-between text-xs font-bold">
            <span>חנות האתר {fromSite}</span>
            <span>ידני {weekOrders.length - fromSite}</span>
          </div>
          <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-[#111111]" style={{ width: `${sitePercent}%` }} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label="לקוחות חדשים" value={fresh} />
          <Stat label="חוזרים" value={returning} />
        </div>
        {topSellers.length > 0 ? (
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-xs font-bold text-muted">הכי נמכרות</p>
            <ol className="mt-2 flex flex-col gap-1.5">
              {topSellers.map(([name, quantity], index) => (
                <li key={name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-bold">
                    {index + 1}. {name}
                  </span>
                  <span className="shrink-0 font-extrabold">×{quantity}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>

      <Link
        href="/board"
        className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3 text-sm"
      >
        <span className="font-bold text-muted">אתמול</span>
        <span className="font-extrabold">
          {onDay(yesterday).length} הזמנות · {money(paidIn(real.filter((order) => dayKey(order.scheduled_at) === yesterday)))}
        </span>
      </Link>

      <Link href="/connections" className="flex flex-wrap items-center gap-2 px-1 text-xs font-bold">
        <Dot on={open} label={open ? "החנות פתוחה" : "החנות סגורה עכשיו"} />
        <Dot on={specials} label={specials ? "ספיישלים פתוחים" : "ספיישלים סגורים"} />
        <Dot on={stripe} label={stripe ? "סטרייפ מחובר" : "סטרייפ לא מחובר"} />
      </Link>
    </Work>
  );
}

function unpaidSite(order: OrderRow) {
  return order.source === "site" && order.status === "link_sent";
}

function requestTime() {
  return Date.now();
}

function countdown(ms: number, long = false) {
  const late = ms < 0;
  const minutes = Math.round(Math.abs(ms) / MINUTE);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  const text =
    days > 0
      ? `${days} ${days === 1 ? "יום" : "ימים"}${hours ? ` ו־${hours} ש׳` : ""}`
      : hours > 0
        ? `${hours} ש׳${rest ? ` ${rest} ד׳` : ""}`
        : `${rest} ד׳`;
  if (late) return `באיחור ${text}`;
  return long ? text : `בעוד ${text}`;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-paper px-3 py-2.5">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold leading-none">{value}</p>
    </div>
  );
}

function Small({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-extrabold">{value}</p>
    </div>
  );
}

function Dot({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1">
      <span className={`h-2 w-2 rounded-full ${on ? "bg-[#1e9e4a]" : "bg-[#c0392b]"}`} />
      {label}
    </span>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { addDays, dubaiKey } from "@/lib/dates";
import { money } from "@/lib/domain";
import { dayKey, inDays, weekStart } from "@/lib/metrics";
import { listOrders } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";

export default async function DashboardPage() {
  const profile = await requireProfile();
  if (profile.role === "kitchen") redirect("/today");
  if (profile.role === "accounts") redirect("/money");
  if (profile.role === "integrations") redirect("/connections");

  const orders = await listOrders();
  const today = dubaiKey();
  const yesterday = addDays(today, -1);
  const thisWeek = weekStart(today);
  const thursday = addDays(thisWeek, 4);
  const friday = addDays(thisWeek, 5);
  const nextWeek = addDays(thisWeek, 7);

  const live = orders.filter((order) => order.status !== "draft");
  const onDay = (key: string) => live.filter((order) => dayKey(order.scheduled_at) === key);
  const yesterdayOrders = onDay(yesterday);
  const todayOrders = onDay(today);
  const yesterdayIn = yesterdayOrders.reduce((sum, order) => sum + Number(order.paid), 0);
  const kitchen = todayOrders.filter((order) => order.status === "in_kitchen").length;
  const left = todayOrders.filter((order) => order.status === "out" || order.status === "feedback_sent").length;
  const still = todayOrders.length - left;
  const ahead = live.filter((order) => {
    const day = dayKey(order.scheduled_at);
    return day >= today && order.status !== "out" && order.status !== "feedback_sent";
  }).length;
  const weekCount = live.filter((order) => inDays(order.scheduled_at, thisWeek, nextWeek)).length;
  const peak = live.filter((order) => {
    const day = dayKey(order.scheduled_at);
    return day === thursday || day === friday;
  }).length;
  const waiting = live.filter((order) =>
    ["awaiting", "link_sent", "cash_agreed", "paid_shopify"].includes(order.status),
  ).length;
  const unpaid = live.filter((order) => Number(order.amount) > Number(order.paid)).length;
  const feedback = orders.filter((order) => order.status === "out").length;

  return (
    <Work title="מרכז בקרה" role={profile.role}>
      <Link href="/today" className="rounded-3xl bg-[#111111] px-5 py-6 text-white">
        <p className="text-sm font-bold text-white/60">היום</p>
        <p className="mt-3 text-6xl font-extrabold leading-none">{todayOrders.length}</p>
        <p className="mt-2 text-lg font-bold">הזמנות לצאת</p>
        <p className="mt-5 text-sm font-bold text-white/80">
          במטבח {kitchen} · יצאו {left} · עוד לא יצאו {still}
        </p>
      </Link>

      <Link
        href={`/board#day-${yesterday}`}
        className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-4"
      >
        <div>
          <p className="text-sm font-bold text-muted">אתמול</p>
          <p className="mt-1 text-2xl font-extrabold">{yesterdayOrders.length} הזמנות</p>
        </div>
        <div className="text-end">
          <p className="text-sm font-bold text-muted">נכנס</p>
          <p className="mt-1 text-2xl font-extrabold">{money(yesterdayIn)}</p>
        </div>
      </Link>

      <Link
        href={`/board#day-${today}`}
        className="rounded-2xl border border-line bg-card px-4 py-4"
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-muted">לפנינו</p>
            <p className="mt-1 text-3xl font-extrabold leading-none">{ahead}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-muted">השבוע</p>
            <p className="mt-1 text-3xl font-extrabold leading-none">{weekCount}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-muted">חמישי–שישי</p>
            <p className="mt-1 text-3xl font-extrabold leading-none">{peak}</p>
          </div>
        </div>
      </Link>

      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <p className="px-4 pt-4 text-sm font-bold text-muted">צריך טיפול</p>
        <Attention href="/today" label="אושרו ועוד לא במטבח" value={waiting} />
        <Attention href="/expected" label="לא שולם" value={unpaid} />
        <Attention href="/morning" label="משוב בוקר" value={feedback} />
      </section>
    </Work>
  );
}

function Attention({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} className="flex min-h-14 items-center justify-between border-t border-line px-4 py-3">
      <span className="text-base font-extrabold">{label}</span>
      <span className="text-xl font-extrabold">{value}</span>
    </Link>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { SendToChef } from "@/app/orders/send-to-chef";
import { Work } from "@/app/shell";
import { chefIntro, kitchenChef } from "@/lib/kitchen-message";
import { formatClock } from "@/lib/dates";
import { isStage, money, stageOf, stages, type Stage } from "@/lib/domain";
import { itemsByOrder } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";
import { DayCard } from "./day-card";
import { todayOrders } from "./orders";
import { Refresher } from "./refresher";
import { canOperate } from "@/lib/roles";

const tabLabels: Record<Stage, string> = { waiting: "ממתין", kitchen: "במטבח", out: "יצא" };

export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const profile = await requireProfile();
  if (profile.role === "accounts") redirect("/money");
  if (profile.role === "integrations") redirect("/connections");
  const owner = canOperate(profile?.role);

  const { show: wanted } = await searchParams;
  const show: Stage | "all" = typeof wanted === "string" && isStage(wanted) ? wanted : "all";
  const orders = await todayOrders(owner);
  const counts = Object.fromEntries(
    stages.map((stage) => [stage, orders.filter((order) => stageOf(order.status) === stage).length]),
  ) as Record<Stage, number>;
  const shown = show === "all" ? orders : orders.filter((order) => stageOf(order.status) === show);
  const total = orders.reduce((sum, order) => sum + Number(order.amount), 0);
  const items = await itemsByOrder(shown.map((order) => order.id));
  const now = requestTime();
  const tabs = [
    { key: "all", label: "הכל", count: orders.length },
    ...stages
      .filter((stage) => owner || stage !== "waiting")
      .map((stage) => ({ key: stage, label: tabLabels[stage], count: counts[stage] })),
  ];

  return (
    <Work title="היום" role={profile.role}>
      <Refresher />
      <section className="rounded-2xl bg-[#111111] px-4 py-4 text-white">
        <div className="flex items-end justify-between gap-3">
          <p className="text-4xl font-extrabold leading-none">{orders.length} הזמנות</p>
          <div className="flex items-center gap-3">
            {owner ? <p className="text-lg font-extrabold">{money(total)}</p> : null}
            {shown.length > 0 ? (
              <Link
                href={show === "all" ? "/today/print" : `/today/print?show=${show}`}
                aria-label="הדפסת כל ההזמנות"
                title="הדפסת כל ההזמנות"
                className="flex size-11 items-center justify-center rounded-xl bg-white text-[#111111]"
              >
                <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <path d="M6 14h12v7H6z" />
                </svg>
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-sm font-bold text-white/80">
          {owner ? <span>ממתין לאישור {counts.waiting}</span> : null}
          <span>במטבח {counts.kitchen}</span>
          <span>יצא {counts.out}</span>
        </div>
      </section>

      {shown.length > 0 ? (
        <SendToChef
          orderIds={shown.map((order) => order.id)}
          intro={chefIntro(shown)}
          label={`שליחת PDF של ${shown.length === 1 ? "ההזמנה" : `${shown.length} ההזמנות`} ל${kitchenChef.name}`}
        />
      ) : null}

      <div className="grid auto-cols-fr grid-flow-col gap-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/today" : `/today?show=${tab.key}`}
            className={`min-w-0 truncate rounded-lg px-1.5 py-2 text-center text-[13px] font-extrabold ${
              show === tab.key ? "bg-[#111111] text-white" : "bg-card text-ink"
            }`}
          >
            {tab.label} {tab.count}
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {orders.length === 0 ? "אין הזמנות להיום." : "אין הזמנות בסינון הזה."}
        </p>
      ) : (
        shown.map((order) => (
          <DayCard
            key={order.id}
            order={order}
            time={formatClock(order.scheduled_at)}
            items={items.get(order.id) ?? []}
            owner={owner}
            late={stageOf(order.status) !== "out" && new Date(order.scheduled_at).getTime() < now}
          />
        ))
      )}
    </Work>
  );
}

function requestTime() {
  return Date.now();
}

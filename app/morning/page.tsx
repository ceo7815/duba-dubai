import { redirect } from "next/navigation";
import { markFeedback } from "@/app/orders/actions";
import { Ticket } from "@/app/orders/ticket";
import { Work } from "@/app/shell";
import { listOrders } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";
import { fullAccess } from "@/lib/roles";

export default async function MorningPage() {
  const profile = await requireProfile();
  if (!fullAccess(profile?.role)) redirect("/login");

  const waiting = (await listOrders()).filter((order) => order.status === "out");

  return (
    <Work title="משוב בוקר" backHref="/more" role={profile.role}>
      <p className="text-sm leading-6 text-muted">
        מי שרכש ויצא, ועוד לא סומן שנשלח משוב. את המילים היא שולחת.
      </p>
      {waiting.length === 0 ? (
        <p className="rounded-2xl border border-line bg-card px-4 py-5 text-sm text-muted">
          אין משובים שמחכים.
        </p>
      ) : (
        waiting.map((order) => (
          <div key={order.id} className="flex flex-col gap-2">
            <Ticket order={order} href={`/orders/${order.id}`} />
            <form action={markFeedback}>
              <input type="hidden" name="id" value={order.id} />
              <button className="button">סומן שנשלח משוב</button>
            </form>
          </div>
        ))
      )}
    </Work>
  );
}

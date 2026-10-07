import { redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { requireProfile } from "@/lib/profile";
import { stripeReady } from "@/lib/stripe";
import { fullAccess } from "@/lib/roles";

export default async function ConnectionsPage() {
  const profile = await requireProfile();
  if (!fullAccess(profile?.role) && profile.role !== "integrations") redirect("/login");
  const stripe = stripeReady() && Boolean(process.env.STRIPE_WEBHOOK_SECRET);

  return (
    <Work title="חיבורים" role={profile.role}>
      <p className="text-sm leading-6 text-muted">
        שתי דרכים להזמנה נכנסת: חנות האתר והזמנה ידנית שמקלידים כאן. שתיהן משולמות בסטרייפ ונכנסות לאותה רשימת הזמנות.
      </p>
      <article className="rounded-2xl border border-line bg-card px-4 py-4">
        <h2 className="text-lg font-extrabold">חנות האתר</h2>
        <p className="mt-2 text-sm leading-6">
          הלקוח בוחר מנות, יום ושעה, משלם בכרטיס, וההזמנה נכנסת ישר למטבח בלי הקלדה.
        </p>
        <p className="mt-2 text-sm font-bold">{stripe ? "פעיל" : "החנות פתוחה. התשלום יפעל כשסטרייפ יחובר"}</p>
      </article>
      <article className="rounded-2xl border border-line bg-card px-4 py-4">
        <h2 className="text-lg font-extrabold">הזמנה ידנית</h2>
        <p className="mt-2 text-sm leading-6">
          הזמנה שמגיעה בטלפון או בוואטסאפ. מקלידים אותה, והלקוח מקבל קישור לאישור ולתשלום.
        </p>
        <p className="mt-2 text-sm font-bold">פעיל</p>
      </article>
      <article className="rounded-2xl border border-line bg-card px-4 py-4">
        <h2 className="text-lg font-extrabold">סטרייפ</h2>
        <p className="mt-2 text-sm leading-6">סוגר את התשלום בשתי הדרכים. ברגע שהכסף עובר, ההזמנה במטבח.</p>
        <p className="mt-2 text-sm font-bold">{stripe ? "מחובר" : "עדיין לא מחובר"}</p>
      </article>
    </Work>
  );
}

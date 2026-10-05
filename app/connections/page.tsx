import { redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { requireProfile } from "@/lib/profile";

export default async function ConnectionsPage() {
  const profile = await requireProfile();
  if (profile.role !== "owner" && profile.role !== "integrations") redirect("/");

  return (
    <Work title="חיבורים" role={profile.role}>
      <p className="text-sm leading-6 text-muted">
        שתי כניסות אוטומטיות לאותה הזמנה. שתיהן מחכות לטלפון של נבו. עד אז רק מזומן, אירוע קבוצתי, והקלדה חריגה נעשים ביד.
      </p>
      <article className="rounded-2xl border border-line bg-card px-4 py-4">
        <h2 className="text-lg font-extrabold">וואטסאפ</h2>
        <p className="mt-2 text-sm leading-6">
          השיחה נכתבת להזמנה, קישור הסטרייפ יוצא, והתשלום מוריד אותה למטבח. היא עדיין יכולה לאשר ולשלוח בעצמה.
        </p>
        <p className="mt-2 text-sm font-bold">עדיין לא מחובר</p>
      </article>
      <article className="rounded-2xl border border-line bg-card px-4 py-4">
        <h2 className="text-lg font-extrabold">שופיפיי</h2>
        <p className="mt-2 text-sm leading-6">
          הזמנה ששולמה באתר נכנסת ישר למטבח, בלי שיחת וואטסאפ ובלי הקלדה.
        </p>
        <p className="mt-2 text-sm font-bold">עדיין לא מחובר</p>
      </article>
      <article className="rounded-2xl border border-line bg-card px-4 py-4">
        <h2 className="text-lg font-extrabold">סטרייפ</h2>
        <p className="mt-2 text-sm leading-6">סוגר את קישור הוואטסאפ. ברגע שהכסף עובר, ההזמנה במטבח.</p>
        <p className="mt-2 text-sm font-bold">עדיין לא מחובר</p>
      </article>
    </Work>
  );
}

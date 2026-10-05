import { redirect } from "next/navigation";
import { markInvoice } from "@/app/money/actions";
import { CashForm, FeeForm, InvoiceForm } from "@/app/money/money-forms";
import { Work } from "@/app/shell";
import { money } from "@/lib/domain";
import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

type Cash = { id: string; direction: string; amount: number; note: string; happened_on: string };
type Invoice = {
  id: string;
  supplier: string;
  amount: number;
  note: string;
  sent_to_mali: boolean;
  happened_on: string;
};

export default async function MoneyPage() {
  const profile = await requireProfile();
  if (profile.role !== "owner" && profile.role !== "accounts") redirect("/");

  const supabase = await createClient();
  const [{ data: cash }, { data: invoices }, { data: settings }, { data: orders }] =
    await Promise.all([
      supabase.from("cash_entries").select("id, direction, amount, note, happened_on").order("happened_on", { ascending: false }),
      supabase.from("invoices").select("id, supplier, amount, note, sent_to_mali, happened_on").order("happened_on", { ascending: false }),
      supabase.from("business_settings").select("stripe_fee_percent, withholding_percent").eq("id", 1).maybeSingle(),
      profile.role === "owner"
        ? supabase.from("orders").select("ending, status, amount, paid")
        : Promise.resolve({ data: [] as { ending: string | null; status: string; amount: number; paid: number }[] }),
    ]);

  const cashRows = (cash ?? []) as Cash[];
  const invoiceRows = (invoices ?? []) as Invoice[];
  const cashIn = cashRows.filter((row) => row.direction === "in").reduce((sum, row) => sum + Number(row.amount), 0);
  const cashOut = cashRows.filter((row) => row.direction === "out").reduce((sum, row) => sum + Number(row.amount), 0);
  const invoiceTotal = invoiceRows.reduce((sum, row) => sum + Number(row.amount), 0);
  const orderRows = orders ?? [];
  const expected = orderRows
    .filter((row) => row.status === "link_sent")
    .reduce((sum, row) => sum + Math.max(0, Number(row.amount) - Number(row.paid)), 0);

  return (
    <Work title="כסף" role={profile.role} backHref={profile.role === "owner" ? "/more" : undefined}>
      <p className="text-sm leading-6 text-muted">
        רווח העסק הוא נטו אחרי עמלת סליקה ואחרי 5% מהנטו, ועוד מזומן, פחות חשבוניות. המספר הזה לא מוצג עד שמלי מאשרת מה ה-5% אומר. כסף שצפוי להיכנס הוא שורה נפרדת.
      </p>
      <section className="rounded-2xl border border-line bg-card p-4">
        <p className="text-sm">מזומן נכנס {money(cashIn)}</p>
        <p className="mt-1 text-sm">מזומן יוצא {money(cashOut)}</p>
        <p className="mt-1 text-sm">חשבוניות {money(invoiceTotal)}</p>
        <p className="mt-1 text-sm">עמלת סטרייפ {settings?.stripe_fee_percent ?? 2.9}%</p>
        <p className="mt-1 text-sm">ניכוי {settings?.withholding_percent ?? 5}% מהנטו, ממתין לאישור</p>
        {profile.role === "owner" ? (
          <p className="mt-3 text-sm font-extrabold">צפוי להיכנס {money(expected)}</p>
        ) : null}
      </section>
      <CashForm />
      {cashRows.map((row) => (
        <p key={row.id} className="rounded-2xl border border-line bg-card px-4 py-3 text-sm">
          {row.happened_on} · {row.direction === "in" ? "נכנס" : row.direction === "refund" ? "החזר" : "יוצא"} {money(Number(row.amount))}
          {row.note ? ` · ${row.note}` : ""}
        </p>
      ))}
      <InvoiceForm />
      {invoiceRows.map((row) => (
        <article key={row.id} className="rounded-2xl border border-line bg-card p-4">
          <p className="font-extrabold">{row.supplier}</p>
          <p className="mt-1 text-sm">
            {row.happened_on} · {money(Number(row.amount))}
            {row.note ? ` · ${row.note}` : ""}
          </p>
          {row.sent_to_mali ? (
            <p className="mt-2 text-sm font-bold">סומן שנשלח למלי</p>
          ) : (
            <form action={markInvoice} className="mt-3">
              <input type="hidden" name="id" value={row.id} />
              <button className="button">נשלח למלי</button>
            </form>
          )}
        </article>
      ))}
      {profile.role === "owner" ? <FeeForm fee={Number(settings?.stripe_fee_percent ?? 2.9)} /> : null}
    </Work>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { PrintNow } from "@/app/orders/[id]/print/print-now";
import { OrderPage } from "@/app/orders/order-sheet";
import type { OrderItem, OrderRow } from "@/lib/orders";
import { DownloadPdf } from "./download-pdf";

export const metadata: Metadata = {
  title: "הזמנות למטבח · דובה",
  description: "דף הדפסה ו-PDF של ההזמנות",
  openGraph: { title: "הזמנות למטבח · Duba Dubai", description: "דף הדפסה ו-PDF של ההזמנות" },
  robots: { index: false, follow: false },
};

type SheetOrder = OrderRow & { items: OrderItem[] };

export default async function KitchenSheetPage({ params }: PageProps<"/k/[token]">) {
  const { token } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data } = await supabase.rpc("kitchen_sheet", { lookup: token });
  const orders = (Array.isArray(data) ? data : []) as SheetOrder[];
  if (orders.length === 0) notFound();

  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(new Date(orders[0].scheduled_at));
  const fileName = orders.length === 1 ? `duba-${orders[0].id.slice(0, 6)}.pdf` : `duba-kitchen-${day}.pdf`;

  return (
    <main className="order-print min-h-dvh bg-[#e9e6e1] py-6 print:bg-white print:py-0">
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .order-print * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <div className="no-print mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <p className="text-sm font-extrabold">
          {orders.length === 1 ? "הזמנה אחת" : `${orders.length} הזמנות`}
        </p>
        <div className="flex gap-2">
          <DownloadPdf fileName={fileName} />
          <PrintNow />
        </div>
      </div>
      <div className="flex flex-col gap-6 print:gap-0">
        {orders.map((order) => (
          <OrderPage key={order.id} order={order} items={order.items} showMoney={false} />
        ))}
      </div>
    </main>
  );
}

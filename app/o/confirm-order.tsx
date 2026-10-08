"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmGuestOrder } from "@/app/o/actions";
import type { GuestText } from "@/lib/guest-text";

const primary =
  "flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[#1c1c1c] px-5 text-[15px] font-medium text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] disabled:opacity-70";

export function ConfirmOrder({
  token,
  text,
  payUrl = "",
  total = "",
}: {
  token: string;
  text: GuestText;
  payUrl?: string;
  total?: string;
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState<"" | "pay" | "only">("");
  const [error, setError] = useState("");

  async function confirm(thenPay: boolean) {
    setPending(thenPay ? "pay" : "only");
    setError("");
    const result = await confirmGuestOrder(token);
    if (!result.ok) {
      setPending("");
      setError(text.failed);
      return;
    }
    if (thenPay && payUrl) {
      window.location.href = payUrl;
      return;
    }
    setPending("");
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="flex flex-col gap-2">
        <p className="rounded-full bg-[#1c1c1c] px-4 py-3.5 text-center text-sm font-medium text-white">
          {text.confirmed} ✓
        </p>
        {payUrl ? <PayButton href={payUrl} text={text} total={total} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-1 no-print">
      {payUrl ? (
        <>
          <button type="button" className={primary} disabled={Boolean(pending)} onClick={() => confirm(true)}>
            <CardIcon />
            {pending === "pay" ? (
              text.toCheckout
            ) : (
              <span>
                {text.confirmPay}
                {total ? (
                  <>
                    {" · "}
                    <bdi>{total}</bdi>
                  </>
                ) : null}
              </span>
            )}
          </button>
          <button
            type="button"
            disabled={Boolean(pending)}
            onClick={() => confirm(false)}
            className="min-h-10 text-[13px] font-medium text-[#8a8175] underline decoration-[#d9d1c7] underline-offset-4"
          >
            {pending === "only" ? text.confirming : text.confirmOnly}
          </button>
        </>
      ) : (
        <button type="button" className={primary} disabled={Boolean(pending)} onClick={() => confirm(false)}>
          {pending ? text.confirming : text.confirm}
        </button>
      )}
      {error ? <p className="text-center text-sm font-bold">{error}</p> : null}
    </div>
  );
}

export function PayButton({ href, text, total }: { href: string; text: GuestText; total: string }) {
  return (
    <a href={href} className={primary}>
      <CardIcon />
      <span>
        {text.payNow}
        {total ? (
          <>
            {" · "}
            <bdi>{total}</bdi>
          </>
        ) : null}
      </span>
    </a>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19M6.5 15h4" />
    </svg>
  );
}

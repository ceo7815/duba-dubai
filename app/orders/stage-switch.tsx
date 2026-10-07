"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPaid, removeOrder, sendOut, undoOut } from "@/app/orders/actions";
import { stageOf, type OrderStatus } from "@/lib/domain";

const UNDO_SECONDS = 10;

export function Train({
  id,
  status,
  balance,
  owner,
}: {
  id: string;
  status: OrderStatus;
  balance: number;
  owner: boolean;
}) {
  const [left, setLeft] = useState(0);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const stage = stageOf(status);

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  function run(task: () => Promise<{ error?: string }>, after?: () => void) {
    setError("");
    start(async () => {
      const result = await task();
      if (result.error) setError(result.error);
      else after?.();
    });
  }

  return (
    <div className={`flex flex-col gap-2 ${pending ? "pointer-events-none opacity-60" : ""}`}>
      {stage === "waiting" ? (
        <p className="rounded-xl bg-[#fff1cc] py-3 text-center text-sm font-extrabold text-[#7a4f00]">
          ממתין לאישור הלקוח בקישור
        </p>
      ) : stage === "kitchen" ? (
        <button
          type="button"
          onClick={() => run(() => sendOut(id), () => setLeft(UNDO_SECONDS))}
          className="min-h-12 rounded-xl bg-[#1b8a3f] text-base font-extrabold text-white"
        >
          יצא ללקוח
        </button>
      ) : left > 0 ? (
        <div className="flex gap-2">
          <p className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-[#e3f3e8] text-sm font-extrabold text-[#1b6a33]">
            יצא ללקוח
          </p>
          <button
            type="button"
            onClick={() => run(() => undoOut(id), () => setLeft(0))}
            className="min-h-12 rounded-xl border border-ink bg-card px-4 text-sm font-extrabold"
          >
            ביטול · {left}
          </button>
        </div>
      ) : (
        <p className="rounded-xl bg-[#e3f3e8] py-3 text-center text-sm font-extrabold text-[#1b6a33]">יצא ללקוח</p>
      )}
      {owner && balance > 0 ? (
        <button
          type="button"
          onClick={() => run(() => markPaid(id))}
          className="min-h-11 rounded-xl border border-[#1b8a3f] bg-card text-sm font-extrabold text-[#1b6a33]"
        >
          התקבל תשלום
        </button>
      ) : null}
      {error ? <p className="text-sm font-bold text-[#d64545]">{error}</p> : null}
    </div>
  );
}

export function DeleteOrder({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-12 rounded-2xl border border-[#d64545] bg-card text-base font-extrabold text-[#d64545]"
      >
        מחיקה
      </button>
    );
  }
  return (
    <div className={`flex flex-col gap-2 ${pending ? "pointer-events-none opacity-60" : ""}`}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            start(async () => {
              const result = await removeOrder(id);
              if (result.error) setError(result.error);
              else router.push("/orders");
            })
          }
          className="min-h-12 flex-1 rounded-2xl bg-[#d64545] text-base font-extrabold text-white"
        >
          כן, למחוק
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="button-quiet flex-1">
          ביטול
        </button>
      </div>
      {error ? <p className="text-sm font-bold text-[#d64545]">{error}</p> : null}
    </div>
  );
}

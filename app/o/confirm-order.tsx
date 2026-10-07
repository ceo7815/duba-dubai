"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmGuestOrder } from "@/app/o/actions";

export function ConfirmOrder({ token }: { token: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setPending(true);
    setError("");
    const result = await confirmGuestOrder(token);
    setPending(false);
    if (!result.ok) {
      setError("האישור לא נשמר. נסו שוב.");
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <p className="rounded-full bg-[#1c1c1c] px-4 py-3.5 text-center text-sm font-medium text-white">
        ההזמנה אושרה
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 no-print">
      <button
        type="button"
        className="min-h-12 w-full rounded-full bg-[#1c1c1c] text-sm font-medium text-white shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
        disabled={pending}
        onClick={confirm}
      >
        {pending ? "מאשרים" : "לחץ לאישור הזמנה"}
      </button>
      {error ? <p className="text-center text-sm font-bold">{error}</p> : null}
    </div>
  );
}

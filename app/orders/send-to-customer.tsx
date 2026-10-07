"use client";

import { useState } from "react";
import { issueGuestLink } from "@/app/orders/actions";

function waPhone(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `971${digits.slice(1)}`;
  return digits;
}

export function SendToCustomer({ orderId }: { orderId: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function send() {
    setPending(true);
    setError("");
    const result = await issueGuestLink(orderId, window.location.origin);
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    const phone = waPhone(result.phone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(result.message)}`, "_blank", "noopener");
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" className="button" disabled={pending} onClick={send}>
        {pending ? "מכינים" : "שליחה לוואטסאפ"}
      </button>
      {error ? <p className="text-sm font-bold">{error}</p> : null}
    </div>
  );
}

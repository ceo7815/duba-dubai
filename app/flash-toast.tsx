"use client";

import { useEffect, useState } from "react";

const cookieName = "duba_flash";

export function FlashToast({ value }: { value: string }) {
  const [dismissed, setDismissed] = useState("");
  const message =
    value && value !== dismissed
      ? decodeURIComponent(value).split("|").slice(1).join("|")
      : "";

  useEffect(() => {
    if (!value) return;
    document.cookie = `${cookieName}=; path=/; max-age=0; samesite=lax`;
    const timer = window.setTimeout(() => setDismissed(value), 2200);
    return () => window.clearTimeout(timer);
  }, [value]);

  if (!message) return null;
  return (
    <div
      className="flash-toast no-print"
      role="status"
      aria-live="polite"
      key={value}
    >
      {message}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useCart } from "@/lib/store/cart";
import { LANG_COOKIE, type Lang } from "@/lib/store/i18n";

export function LangToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next: Lang = lang === "en" ? "he" : "en";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        start(() => router.refresh());
      }}
      className="flex h-10 min-w-10 items-center justify-center rounded-full border border-white/25 px-3 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
      aria-label={next === "he" ? "עברית" : "English"}
    >
      {next === "he" ? "עב" : "EN"}
    </button>
  );
}

export function CartLink({ label }: { label: string }) {
  const lines = useCart();
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <Link href="/shop/cart" aria-label={label} className="relative flex size-10 items-center justify-center">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 7h12l-1 13H7L6 7Z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      {count > 0 ? (
        <span className="absolute -end-0.5 bottom-0.5 flex min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold leading-5 text-black">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

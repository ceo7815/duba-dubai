"use client";

import { dict, type Lang } from "@/lib/store/i18n";

export function ContactForm({ lang }: { lang: Lang }) {
  const t = dict(lang);
  const field =
    "mt-1.5 min-h-12 w-full rounded-lg border border-white/30 bg-[#121212] px-4 text-[16px] text-white focus:border-white focus:outline-none";

  function send(form: FormData) {
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const text = [
      `${t.name}: ${value("name")}`,
      value("email") ? `${t.emailLabel}: ${value("email")}` : "",
      value("phone") ? `${t.phone}: ${value("phone")}` : "",
      "",
      value("message"),
    ]
      .filter((line, index) => line || index === 3)
      .join("\n");
    window.open(`https://wa.me/971559060717?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  return (
    <form action={send} className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="block text-sm text-white/75">
        {t.name}
        <input name="name" required autoComplete="name" className={field} />
      </label>
      <label className="block text-sm text-white/75">
        {t.emailLabel}
        <input name="email" type="email" autoComplete="email" dir="ltr" className={field} />
      </label>
      <label className="block text-sm text-white/75 sm:col-span-2">
        {t.phone}
        <input name="phone" type="tel" autoComplete="tel" dir="ltr" className={field} />
      </label>
      <label className="block text-sm text-white/75 sm:col-span-2">
        {t.message}
        <textarea name="message" required rows={5} className={`${field} py-3`} />
      </label>
      <button type="submit" className="min-h-12 rounded-lg bg-white px-10 font-semibold text-black hover:bg-white/90 sm:w-fit">
        {t.sendWhatsapp}
      </button>
    </form>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from "libphonenumber-js";
import { defaultCountry, readPhone, type CountryCode } from "@/lib/phone";

type Country = { code: CountryCode; name: string; en: string; dial: string };

const pinned: CountryCode[] = ["IL", "AE", "US", "FR", "GB", "RU", "UA", "BE", "CA", "DE", "IT", "CH", "AU", "AR", "BR", "ZA"];

const shortNames: Partial<Record<CountryCode, string>> = {
  US: "ארה״ב",
  GB: "בריטניה",
  AE: "איחוד האמירויות",
  RU: "רוסיה",
  KR: "דרום קוריאה",
  KP: "צפון קוריאה",
  CZ: "צ׳כיה",
  BA: "בוסניה",
  CD: "קונגו (קינשאסה)",
  CG: "קונגו",
  HK: "הונג קונג",
  MO: "מקאו",
  PS: "הרשות הפלסטינית",
  VA: "הוותיקן",
};

let cached: Country[] | null = null;

function countries() {
  if (cached) return cached;
  const he = new Intl.DisplayNames(["he"], { type: "region" });
  const en = new Intl.DisplayNames(["en"], { type: "region" });
  cached = getCountries()
    .map((code) => ({
      code,
      name: shortNames[code] ?? he.of(code) ?? code,
      en: en.of(code) ?? code,
      dial: getCountryCallingCode(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "he"));
  return cached;
}

function flag(code: string) {
  return String.fromCodePoint(...[...code].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

function initial(value: string) {
  const parsed = value ? readPhone(value) : null;
  if (parsed?.country) return { country: parsed.country, national: parsed.formatNational() };
  return { country: defaultCountry, national: value };
}

export function PhoneField({ name, defaultValue = "" }: { name: string; defaultValue?: string }) {
  const start = useMemo(() => initial(defaultValue), [defaultValue]);
  const [country, setCountry] = useState<CountryCode>(start.country);
  const [national, setNational] = useState(start.national);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const list = countries();
  const current = list.find((item) => item.code === country) ?? list[0];
  const parsed = national.trim() ? parsePhoneNumberFromString(national, country) : undefined;
  const valid = Boolean(parsed?.isValid());
  const value = valid && parsed ? parsed.formatInternational() : "";

  useEffect(() => {
    input.current?.setCustomValidity(
      !national.trim() ? "" : valid ? "" : `המספר לא תקין ל${current.name}`,
    );
  }, [national, valid, current.name]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const root = document.documentElement;
    root.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, "");
    if (!q) return null;
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.en.toLowerCase().includes(q) ||
        item.code.toLowerCase() === q ||
        item.dial.startsWith(q),
    );
  }, [list, query]);

  function change(text: string) {
    const trimmed = text.trim();
    if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
      const hit = readPhone(trimmed);
      if (hit?.country && hit.isValid()) {
        setCountry(hit.country);
        setNational(hit.formatNational());
        return;
      }
    }
    setNational(text);
  }

  function pick(code: CountryCode) {
    setCountry(code);
    setOpen(false);
    setQuery("");
    requestAnimationFrame(() => input.current?.focus());
  }

  const row = (item: Country) => (
    <li key={item.code}>
      <button
        type="button"
        onClick={() => pick(item.code)}
        className={`flex min-h-12 w-full items-center gap-3 px-4 text-start text-[15px] ${
          item.code === country ? "bg-[#111111] text-white" : ""
        }`}
      >
        <span className="text-xl leading-none">{flag(item.code)}</span>
        <span className="flex-1 font-bold">{item.name}</span>
        <span dir="ltr" className={`text-sm ${item.code === country ? "text-white/70" : "text-muted"}`}>
          +{item.dial}
        </span>
      </button>
    </li>
  );

  return (
    <div className="flex flex-col gap-1.5">
      <input type="hidden" name={name} value={value} />
      <div dir="ltr" className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`מדינה: ${current.name}`}
          style={{ width: "auto", paddingInline: "0.75rem" }}
          className="field flex shrink-0 items-center gap-1.5"
        >
          <span className="text-xl leading-none">{flag(current.code)}</span>
          <span className="text-[15px] font-bold">+{current.dial}</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <input
          ref={input}
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          onChange={(event) => change(event.target.value)}
          onBlur={() => {
            if (valid && parsed) setNational(parsed.formatNational());
          }}
          placeholder={country === "IL" ? "050-123-4567" : country === "AE" ? "050 123 4567" : ""}
          className="field field-en min-w-0 flex-1"
        />
      </div>
      <p className={`text-xs font-bold ${valid ? "text-emerald-700" : "text-muted"}`}>
        {valid
          ? `✓ ${current.name} · ${value}`
          : national.trim()
            ? `המספר עדיין לא תקין ל${current.name}`
            : `${current.name} · אפשר גם להדביק מספר עם +`}
      </p>

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-line p-3">
              <input
                ref={search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="חיפוש מדינה או קידומת"
                className="field flex-1"
              />
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 px-3 text-sm font-bold">
                סגירה
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain">
              {results ? (
                results.length ? (
                  <ul className="divide-y divide-line">{results.map(row)}</ul>
                ) : (
                  <p className="p-4 text-sm text-muted">לא נמצאה מדינה</p>
                )
              ) : (
                <>
                  <p className="px-4 pt-3 pb-1 text-xs font-bold text-muted">נפוצות</p>
                  <ul className="divide-y divide-line">
                    {pinned.map((code) => list.find((item) => item.code === code)).filter(Boolean).map((item) => row(item!))}
                  </ul>
                  <p className="px-4 pt-4 pb-1 text-xs font-bold text-muted">כל המדינות</p>
                  <ul className="divide-y divide-line">{list.map(row)}</ul>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

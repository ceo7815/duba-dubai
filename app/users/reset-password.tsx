"use client";

import { useState, useTransition } from "react";
import { resetUserPassword } from "@/app/auth-actions";

type Result = { password: string; email: string; verified: boolean };

export function ResetPassword({ id, name, phone }: { id: string; name: string; phone: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const loginUrl = typeof window === "undefined" ? "" : `${window.location.origin}/login`;
  const message = result
    ? `שלום ${name}, הפרטים לכניסה למערכת דובה:\n${loginUrl}\nדוא״ל: ${result.email}\nסיסמה: ${result.password}`
    : "";
  const digits = phone.replace(/\D/g, "");

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <p className="font-extrabold">סיסמה חדשה</p>
      <p className="mt-1 text-sm leading-6 text-muted">
        המערכת יוצרת סיסמה פשוטה, בודקת שהכניסה איתה עובדת ומציגה אותה כאן לשליחה.
      </p>

      {result ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="rounded-xl bg-paper p-3 text-sm" dir="ltr">
            <p className="text-start">{result.email}</p>
            <p className="text-start text-xl font-extrabold tracking-wide">{result.password}</p>
          </div>
          <p className={`text-sm font-bold ${result.verified ? "text-emerald-700" : "text-red-700"}`}>
            {result.verified ? "✓ נבדק: הכניסה עם הסיסמה הזאת עובדת" : "הסיסמה נשמרה אבל בדיקת הכניסה נכשלה. תגידו לי"}
          </p>
          <button
            type="button"
            className="min-h-11 rounded-2xl bg-[#111111] text-sm font-extrabold text-white"
            onClick={async () => {
              await navigator.clipboard.writeText(message).catch(() => {});
              setCopied(true);
            }}
          >
            {copied ? "הועתק ✓" : "העתקת פרטי הכניסה"}
          </button>
          {digits ? (
            <a
              href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener"
              className="flex min-h-11 items-center justify-center rounded-2xl border border-ink text-sm font-extrabold"
            >
              שליחה בוואטסאפ
            </a>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-sm font-bold">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        className="mt-3 min-h-11 w-full rounded-2xl border border-ink text-sm font-extrabold disabled:opacity-50"
        onClick={() => {
          if (!window.confirm(`ליצור סיסמה חדשה ל${name || "משתמש"}? הסיסמה הקודמת תפסיק לעבוד.`)) return;
          setError("");
          setCopied(false);
          start(async () => {
            const next = await resetUserPassword(id);
            if ("error" in next) setError(next.error);
            else setResult(next);
          });
        }}
      >
        {pending ? "יוצרים ובודקים…" : result ? "יצירת סיסמה אחרת" : "יצירת סיסמה חדשה"}
      </button>
    </section>
  );
}

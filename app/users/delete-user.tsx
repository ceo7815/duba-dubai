"use client";

import { useState, useTransition } from "react";
import { deleteUser } from "@/app/auth-actions";

export function DeleteUser({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <p className="font-extrabold">מחיקת משתמש</p>
      <p className="mt-1 text-sm leading-6 text-muted">
        המשתמש לא יוכל להיכנס יותר והחשבון יימחק לגמרי. אם רוצים רק לעצור גישה זמנית, עדיף לכבות את החשבון.
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-bold">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        className="mt-3 min-h-11 w-full rounded-2xl border border-ink text-sm font-extrabold"
        onClick={() => {
          if (!window.confirm(`למחוק את ${name || "המשתמש"}? אי אפשר לבטל.`)) return;
          setError("");
          start(async () => {
            const result = await deleteUser(id);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {pending ? "מוחקים…" : "מחיקת המשתמש"}
      </button>
    </section>
  );
}

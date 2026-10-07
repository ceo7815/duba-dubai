"use client";

import { useEffect, useState, useTransition } from "react";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestPush,
  setNotifyPrefs,
} from "@/app/notifications/actions";
import {
  deviceName,
  isIOS,
  isStandalone,
  keyBytes,
  keysOf,
  pushSupported,
  registerWorker,
} from "@/lib/push-client";

export type NotifyEvent = { key: string; label: string; hint: string };

type Status = "loading" | "unsupported" | "install" | "denied" | "off" | "on";

async function currentStatus(): Promise<Status> {
  if (!pushSupported()) return isIOS() && !isStandalone() ? "install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  return subscription && Notification.permission === "granted" ? "on" : "off";
}

export function NotificationsPanel({
  publicKey,
  events,
  prefs,
  devices,
}: {
  publicKey: string;
  events: NotifyEvent[];
  prefs: Record<string, boolean>;
  devices: number;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState(prefs);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    currentStatus().then(setStatus, () => setStatus("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await registerWorker();
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(publicKey),
        }));
      const keys = keysOf(subscription);
      const saved = keys ? await savePushSubscription(keys, deviceName()) : { ok: false };
      if (!saved.ok) {
        setMessage("לא הצלחנו לשמור את המכשיר. נסו שוב");
        return;
      }
      setStatus("on");
      const test = await sendTestPush();
      setMessage(test.error ? test.error : "ההתראות הופעלו. שלחנו התראת בדיקה");
    } catch {
      setMessage("ההפעלה נכשלה. ודאו שהאפליקציה פתוחה מהאייקון במסך הבית");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
      setMessage("ההתראות כובו במכשיר הזה");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMessage("");
    const result = await sendTestPush();
    setMessage(result.error ?? "נשלחה התראת בדיקה");
    setBusy(false);
  }

  function toggle(key: string) {
    const next = { ...values, [key]: values[key] === false };
    setValues(next);
    startSaving(async () => {
      const result = await setNotifyPrefs(next);
      if (result.error) {
        setValues(values);
        setMessage(result.error);
      }
    });
  }

  return (
    <>
      <section className="rounded-2xl border border-line bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-extrabold">המכשיר הזה</p>
            <p className="text-sm text-muted">
              {status === "on"
                ? "התראות פעילות"
                : status === "loading"
                  ? "בודק…"
                  : "התראות כבויות"}
            </p>
          </div>
          <span
            className={`h-3 w-3 rounded-full ${status === "on" ? "bg-emerald-500" : "bg-neutral-300"}`}
          />
        </div>

        {status === "install" ? (
          <ol className="mt-4 list-decimal space-y-1 ps-5 text-sm leading-6">
            <li>פותחים את הכתובת ב־Safari</li>
            <li>לוחצים על כפתור השיתוף (ריבוע עם חץ למעלה)</li>
            <li>בוחרים &quot;הוספה למסך הבית&quot;</li>
            <li>פותחים את דובה מהאייקון, נכנסים וחוזרים למסך הזה</li>
          </ol>
        ) : null}

        {status === "unsupported" ? (
          <p className="mt-4 text-sm leading-6">
            הדפדפן הזה לא תומך בהתראות. באייפון צריך iOS 16.4 ומעלה, באנדרואיד Chrome.
          </p>
        ) : null}

        {status === "denied" ? (
          <p className="mt-4 text-sm leading-6">
            ההתראות חסומות בהגדרות הטלפון. באייפון: הגדרות ← התראות ← דובה ← לאפשר.
            באנדרואיד: לחיצה ארוכה על האייקון ← פרטי אפליקציה ← התראות.
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          {status === "off" ? (
            <button
              type="button"
              disabled={busy || !publicKey}
              onClick={enable}
              className="min-h-12 rounded-full bg-[#111111] px-5 text-[15px] font-extrabold text-white disabled:opacity-50"
            >
              {busy ? "מפעיל…" : "הפעלת התראות"}
            </button>
          ) : null}
          {status === "on" ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={test}
                className="min-h-12 rounded-full bg-[#111111] px-5 text-[15px] font-extrabold text-white disabled:opacity-50"
              >
                {busy ? "שולח…" : "שליחת התראת בדיקה"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={disable}
                className="min-h-11 rounded-full border border-line px-5 text-sm font-bold disabled:opacity-50"
              >
                כיבוי במכשיר הזה
              </button>
            </>
          ) : null}
        </div>

        {message ? (
          <p className="mt-3 text-sm font-bold" role="status">
            {message}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-muted">
          {devices > 0 ? `מכשירים מחוברים לחשבון שלך: ${devices}` : "עדיין אין מכשיר מחובר"}
        </p>
      </section>

      {events.length > 0 ? (
        <section className="rounded-2xl border border-line bg-card p-4">
          <p className="pb-2 text-base font-extrabold">על מה לקבל התראה</p>
          <ul className="divide-y divide-line">
            {events.map((event) => {
              const on = values[event.key] !== false;
              return (
                <li key={event.key}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    disabled={saving}
                    onClick={() => toggle(event.key)}
                    className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-start"
                  >
                    <span>
                      <span className="block text-[15px] font-bold">{event.label}</span>
                      <span className="block text-xs text-muted">{event.hint}</span>
                    </span>
                    <span
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-[#111111]" : "bg-neutral-300"}`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${on ? "start-6" : "start-1"}`}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="pt-2 text-xs text-muted">
            בשבת ההתראות מגיעות בשקט, בלי צליל.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-line bg-card p-4 text-sm">
          לתפקיד שלך אין כרגע התראות על הזמנות.
        </section>
      )}
    </>
  );
}

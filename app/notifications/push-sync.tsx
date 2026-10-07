"use client";

import { useEffect } from "react";
import { savePushSubscription } from "@/app/notifications/actions";
import { deviceName, keysOf, pushSupported, registerWorker } from "@/lib/push-client";

const syncedKey = "duba_push_synced";

export function PushSync() {
  useEffect(() => {
    if (!pushSupported()) return;
    (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {});
    if (Notification.permission !== "granted" || sessionStorage.getItem(syncedKey)) return;
    sessionStorage.setItem(syncedKey, "1");

    registerWorker()
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        const keys = subscription ? keysOf(subscription) : null;
        if (keys) return savePushSubscription(keys, deviceName());
      })
      .catch(() => {});
  }, []);

  return null;
}

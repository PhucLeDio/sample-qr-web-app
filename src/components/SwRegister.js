"use client";

import { useEffect } from "react";

export default function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!('serviceWorker' in navigator)) return;

    let registration = null;
    navigator.serviceWorker
      .register('/sw.js')
      .then(async (reg) => {
        registration = reg;

        // Try to register a one-off background sync (sync event)
        if ('sync' in registration) {
          try {
            await registration.sync.register('sync-requests');
          } catch (e) {
            // ignore
          }
        }

        // Try to request periodic sync (not widely available)
        if ('periodicSync' in registration) {
          try {
            const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
            if (status.state === 'granted') {
              await registration.periodicSync.register('content-sync', {
                minInterval: 24 * 60 * 60 * 1000, // 1 day
              });
            }
          } catch (e) {
            // ignore
          }
        }

        // Try to request push permission and subscribe (requires a VAPID public key)
        if ('PushManager' in window) {
          try {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
              // If you have a VAPID public key, pass it to subscribe().
              // const vapidPublicKey = '<YOUR_VAPID_PUBLIC_KEY>';
              // const sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidPublicKey });
            }
          } catch (err) {
            // ignore
          }
        }
      })
      .catch((err) => {
        // registration failed
      });
  }, []);

  return null;
}

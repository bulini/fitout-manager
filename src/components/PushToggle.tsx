"use client";
import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/app/actions";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushToggle({ vapidKey }: { vapidKey: string }) {
  const [supported, setSupported] = useState(true);
  const [sub, setSub] = useState<PushSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription().then(setSub));
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg("Permesso negato. Abilitalo dalle impostazioni del browser.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const s = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = s.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await savePushSubscription(json);
      setSub(s);
      setMsg("Notifiche attive su questo dispositivo.");
    } catch (e) {
      setMsg("Errore: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!sub) return;
    setBusy(true);
    await removePushSubscription(sub.endpoint);
    await sub.unsubscribe();
    setSub(null);
    setBusy(false);
    setMsg("Notifiche disattivate su questo dispositivo.");
  }

  if (!supported) return <p className="text-sm text-amber-700">Questo browser non supporta le notifiche push.</p>;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {sub ? (
        <button className="btn-outline" onClick={disable} disabled={busy}>Disattiva su questo dispositivo</button>
      ) : (
        <button className="btn-primary" onClick={enable} disabled={busy}>🔔 Attiva notifiche</button>
      )}
      {msg && <span className="text-sm text-stone-600">{msg}</span>}
    </div>
  );
}

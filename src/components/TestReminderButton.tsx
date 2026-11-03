"use client";
import { useState } from "react";

export function TestReminderButton() {
  const [state, setState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setState(null);
    try {
      const res = await fetch("/api/notify/test", { method: "POST" });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error);
      if (r.users === 0) setState("Nessuna cosa da fare in scadenza: niente da inviare.");
      else setState(`Inviato — push: ${r.sent.push}, email: ${r.sent.email}, telegram: ${r.sent.telegram}`);
    } catch (e) {
      setState("Errore: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sm:text-right">
      <button className="btn-outline w-full sm:w-auto" onClick={run} disabled={loading}>
        {loading ? "Invio…" : "Invia ora"}
      </button>
      {state && <p className="mt-1 text-xs text-stone-600">{state}</p>}
    </div>
  );
}

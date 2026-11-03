"use client";
import { useState, useTransition } from "react";
import { applyTemplateToMany } from "@/app/templates-actions";
import { formatDate } from "@/lib/dates";
import { STORE_STATUS_COLOR, type Store } from "@/lib/types";

type S = Pick<Store, "id" | "name" | "city" | "status" | "opening_date">;

export function ApplyToStores({ templateId, stores, disabled }: { templateId: string; stores: S[]; disabled: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setResult(null);
          const r = await applyTemplateToMany(templateId, fd);
          setResult(`Create ${r.created} attività in ${r.stores} store.`);
        })
      }
      className="card space-y-3 p-4"
    >
      <h2 className="font-semibold">Applica agli store</h2>
      <div className="max-h-72 space-y-1 overflow-auto">
        {stores.map((s) => (
          <label key={s.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-stone-50">
            <input type="checkbox" name="store_id" value={s.id} className="h-4 w-4 accent-brand-600" />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STORE_STATUS_COLOR[s.status] }} />
            <span className="flex-1 truncate">{s.name}</span>
            <span className={`text-xs ${s.opening_date ? "text-stone-500" : "text-amber-700"}`}>
              {s.opening_date ? formatDate(s.opening_date) : "no data"}
            </span>
          </label>
        ))}
        {stores.length === 0 && <p className="text-sm text-stone-500">Nessuno store attivo.</p>}
      </div>
      <div>
        <label className="label">Calcola le scadenze da</label>
        <select name="base" defaultValue="apertura" className="input">
          <option value="apertura">Data di apertura (se manca: oggi)</option>
          <option value="oggi">Oggi</option>
        </select>
      </div>
      <p className="text-xs text-stone-500">Le attività già presenti nello store (stesso titolo) vengono saltate.</p>
      <button className="btn-primary w-full" disabled={pending || disabled}>
        {pending ? "Applico…" : "Applica template"}
      </button>
      {result && <p className="text-sm text-green-700">{result}</p>}
    </form>
  );
}

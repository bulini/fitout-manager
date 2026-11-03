"use client";
import { useState, useTransition } from "react";
import { applyTemplate, saveStoreAsTemplate } from "@/app/templates-actions";
import type { Template } from "@/lib/types";

export function StoreTemplatePanel({
  storeId,
  storeName,
  hasOpeningDate,
  templates,
  taskCount,
}: {
  storeId: string;
  storeName: string;
  hasOpeningDate: boolean;
  templates: Pick<Template, "id" | "name">[];
  taskCount: number;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <div className="card space-y-4 p-4">
      <h2 className="font-semibold">Template</h2>

      <form
        action={(fd) =>
          start(async () => {
            setResult(null);
            const r = await applyTemplate(storeId, fd);
            setResult(`Aggiunte ${r.created} attività${r.skipped ? `, ${r.skipped} già presenti saltate` : ""}.`);
          })
        }
        className="space-y-2"
      >
        <select name="template_id" required className="input" defaultValue="">
          <option value="" disabled>Scegli un template…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select name="base" defaultValue={hasOpeningDate ? "apertura" : "oggi"} className="input">
          <option value="apertura" disabled={!hasOpeningDate}>
            Scadenze dalla data di apertura{hasOpeningDate ? "" : " (non impostata)"}
          </option>
          <option value="oggi">Scadenze a partire da oggi</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="skip_existing" defaultChecked className="h-4 w-4 accent-brand-600" />
          Salta le attività già presenti
        </label>
        <button className="btn-primary w-full" disabled={pending || templates.length === 0}>
          {pending ? "Applico…" : "Applica template"}
        </button>
        {templates.length === 0 && <p className="text-xs text-stone-500">Nessun template: creane uno da qui sotto o da Template.</p>}
        {result && <p className="text-sm text-green-700">{result}</p>}
      </form>

      <div className="border-t border-stone-100 pt-3">
        {saving ? (
          <form action={saveStoreAsTemplate.bind(null, storeId)} className="space-y-2">
            <input name="name" required defaultValue={`Apertura tipo — ${storeName}`} className="input" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="only_open" className="h-4 w-4 accent-brand-600" />
              Solo le attività non completate
            </label>
            <p className="text-xs text-stone-500">
              Le scadenze diventano relative {hasOpeningDate ? "alla data di apertura di questo store" : "a oggi (lo store non ha data di apertura)"}.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setSaving(false)}>Annulla</button>
              <button className="btn-primary">Crea template</button>
            </div>
          </form>
        ) : (
          <button className="btn-ghost w-full border border-stone-200" disabled={taskCount === 0} onClick={() => setSaving(true)}>
            💾 Salva questa to-do list come template
          </button>
        )}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { deleteTemplateItem, moveTemplateItem, updateTemplateItem } from "@/app/templates-actions";
import { offsetLabel } from "@/lib/templates";
import { PRIORITY_LABEL, type TemplateItem } from "@/lib/types";
import { OffsetFields } from "./OffsetFields";

export function TemplateItemRow({ item, isFirst, isLast }: { item: TemplateItem; isFirst: boolean; isLast: boolean }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await updateTemplateItem(item.id, item.template_id, fd);
          setEditing(false);
        }}
        className="space-y-2 p-3"
      >
        <input name="title" defaultValue={item.title} required className="input" />
        <textarea name="notes" defaultValue={item.notes ?? ""} rows={2} placeholder="Note" className="input" />
        <div className="flex flex-wrap items-center gap-2">
          <OffsetFields offset={item.offset_days} />
          <select name="priority" defaultValue={String(item.priority)} className="input w-auto">
            <option value="1">Alta</option>
            <option value="2">Media</option>
            <option value="3">Bassa</option>
          </select>
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn-danger" onClick={() => deleteTemplateItem(item.id, item.template_id)}>Elimina</button>
            <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Annulla</button>
            <button className="btn-primary">Salva</button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3">
      <div className="flex flex-col">
        <button className="px-1 text-xs text-stone-400 hover:text-stone-800 disabled:opacity-20" disabled={isFirst}
          onClick={() => moveTemplateItem(item.id, item.template_id, -1)} aria-label="Su">▲</button>
        <button className="px-1 text-xs text-stone-400 hover:text-stone-800 disabled:opacity-20" disabled={isLast}
          onClick={() => moveTemplateItem(item.id, item.template_id, 1)} aria-label="Giù">▼</button>
      </div>
      <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(true)}>
        <div className="font-medium">{item.title}</div>
        {item.notes && <div className="truncate text-sm text-stone-500">{item.notes}</div>}
        <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-stone-600">{offsetLabel(item.offset_days)}</span>
          <span className={`rounded px-1.5 py-0.5 ${item.priority === 1 ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-600"}`}>
            {PRIORITY_LABEL[item.priority]}
          </span>
        </div>
      </button>
    </div>
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysISO, daysFromToday, todayISO } from "@/lib/dates";
import type { Store, Task, TemplateItem } from "@/lib/types";

export type BaseDate = "apertura" | "oggi";

/** Data di partenza per calcolare le scadenze: apertura dello store (se c'è) oppure oggi. */
export function resolveBase(store: Pick<Store, "opening_date">, base: BaseDate): string {
  return base === "apertura" && store.opening_date ? store.opening_date : todayISO();
}

/**
 * Crea nello store le task di un template.
 * Salta le voci con lo stesso titolo di una task già presente (non completata o completata).
 */
export async function applyTemplateToStore(
  db: SupabaseClient,
  templateId: string,
  storeId: string,
  base: BaseDate,
  skipExisting = true
): Promise<{ created: number; skipped: number }> {
  const [{ data: store }, { data: items }, { data: existing }] = await Promise.all([
    db.from("stores").select("id, opening_date").eq("id", storeId).single(),
    db.from("task_template_items").select("*").eq("template_id", templateId).order("position"),
    db.from("tasks").select("title").eq("store_id", storeId),
  ]);
  if (!store) throw new Error("Punto vendita non trovato");

  const baseISO = resolveBase(store, base);
  const have = new Set((existing ?? []).map((t) => t.title.trim().toLowerCase()));
  const rows = ((items ?? []) as TemplateItem[])
    .filter((i) => !skipExisting || !have.has(i.title.trim().toLowerCase()))
    .map((i) => ({
      store_id: storeId,
      template_id: templateId,
      title: i.title,
      notes: i.notes,
      priority: i.priority,
      due_date: i.offset_days === null ? null : addDaysISO(baseISO, i.offset_days),
    }));

  if (rows.length) {
    const { error } = await db.from("tasks").insert(rows);
    if (error) throw new Error(error.message);
  }
  return { created: rows.length, skipped: (items?.length ?? 0) - rows.length };
}

/** Giorni tra due date ISO (b - a). */
function diffDays(a: string, b: string) {
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86_400_000);
}

/**
 * Data di apertura cambiata: aggiorna le scadenze delle attività non completate nate da un template.
 * - c'era già una data → sposta tutte della stessa differenza (mantiene eventuali ritocchi manuali)
 * - non c'era → ricalcola dagli offset del template (le scadenze erano partite da "oggi")
 */
export async function shiftTemplateTasks(
  db: SupabaseClient,
  storeId: string,
  oldOpening: string | null,
  newOpening: string
): Promise<number> {
  const { data: tasks } = await db
    .from("tasks")
    .select("id, title, due_date, template_id")
    .eq("store_id", storeId)
    .neq("status", "fatto")
    .not("template_id", "is", null);
  const list = (tasks ?? []) as Pick<Task, "id" | "title" | "due_date" | "template_id">[];
  if (!list.length) return 0;

  let updates: { id: string; due_date: string }[] = [];
  if (oldOpening) {
    const delta = diffDays(oldOpening, newOpening);
    if (delta === 0) return 0;
    updates = list.filter((t) => t.due_date).map((t) => ({ id: t.id, due_date: addDaysISO(t.due_date!, delta) }));
  } else {
    const tplIds = [...new Set(list.map((t) => t.template_id!))];
    const { data: items } = await db
      .from("task_template_items")
      .select("template_id, title, offset_days")
      .in("template_id", tplIds);
    const key = (tpl: string, title: string) => `${tpl}::${title.trim().toLowerCase()}`;
    const offsets = new Map((items ?? []).map((i) => [key(i.template_id, i.title), i.offset_days as number | null]));
    updates = list.flatMap((t) => {
      const off = offsets.get(key(t.template_id!, t.title));
      return off === undefined || off === null ? [] : [{ id: t.id, due_date: addDaysISO(newOpening, off) }];
    });
  }

  await Promise.all(updates.map((u) => db.from("tasks").update({ due_date: u.due_date }).eq("id", u.id)));
  return updates.length;
}

/** Trasforma le task di uno store in voci di template (scadenze relative all'apertura o a oggi). */
export function tasksToTemplateItems(tasks: Task[], store: Pick<Store, "opening_date">) {
  const baseISO = store.opening_date ?? todayISO();
  const baseOffset = daysFromToday(baseISO);
  return [...tasks]
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.created_at.localeCompare(b.created_at))
    .map((t, i) => ({
      title: t.title,
      notes: t.notes,
      priority: t.priority,
      offset_days: t.due_date ? daysFromToday(t.due_date) - baseOffset : null,
      position: i,
    }));
}

export function offsetLabel(offset: number | null): string {
  if (offset === null) return "senza scadenza";
  if (offset === 0) return "giorno di apertura";
  return offset < 0 ? `${-offset} g prima dell'apertura` : `${offset} g dopo l'apertura`;
}

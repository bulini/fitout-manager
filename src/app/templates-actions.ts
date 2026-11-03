"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { applyTemplateToStore, tasksToTemplateItems, type BaseDate } from "@/lib/templates";
import type { Store, Task } from "@/lib/types";

const str = (v: FormDataEntryValue | null) => {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
};
const intOrNull = (v: FormDataEntryValue | null) => {
  const s = str(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
};

/** Campi form "offset_n" (giorni) + "offset_dir" (prima|dopo). Vuoto = senza scadenza. */
function parseOffset(formData: FormData): number | null {
  const n = intOrNull(formData.get("offset_n"));
  if (n === null) return null;
  return formData.get("offset_dir") === "dopo" ? Math.abs(n) : -Math.abs(n);
}

async function db() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

// ---------- template ----------
export async function createTemplate(formData: FormData) {
  const supabase = await db();
  const { data, error } = await supabase
    .from("task_templates")
    .insert({ name: str(formData.get("name")) ?? "Nuovo template", description: str(formData.get("description")) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/templates");
  redirect(`/templates/${data.id}`);
}

export async function updateTemplate(id: string, formData: FormData) {
  const supabase = await db();
  const { error } = await supabase
    .from("task_templates")
    .update({ name: str(formData.get("name")), description: str(formData.get("description")) })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/templates/${id}`);
  revalidatePath("/templates");
}

export async function deleteTemplate(id: string) {
  const supabase = await db();
  const { error } = await supabase.from("task_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/templates");
  redirect("/templates");
}

export async function duplicateTemplate(id: string) {
  const supabase = await db();
  const [{ data: tpl }, { data: items }] = await Promise.all([
    supabase.from("task_templates").select("*").eq("id", id).single(),
    supabase.from("task_template_items").select("*").eq("template_id", id),
  ]);
  if (!tpl) throw new Error("Template non trovato");
  const { data: copy, error } = await supabase
    .from("task_templates")
    .insert({ name: `${tpl.name} (copia)`, description: tpl.description })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (items?.length) {
    await supabase.from("task_template_items").insert(
      items.map(({ title, notes, priority, offset_days, position }) => ({
        template_id: copy.id, title, notes, priority, offset_days, position,
      }))
    );
  }
  revalidatePath("/templates");
  redirect(`/templates/${copy.id}`);
}

// ---------- voci ----------
export async function addTemplateItem(templateId: string, formData: FormData) {
  const supabase = await db();
  const title = str(formData.get("title"));
  if (!title) return;
  const { count } = await supabase
    .from("task_template_items")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);
  const { error } = await supabase.from("task_template_items").insert({
    template_id: templateId,
    title,
    priority: Number(formData.get("priority") ?? 2),
    offset_days: parseOffset(formData),
    position: count ?? 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/templates/${templateId}`);
}

export async function updateTemplateItem(itemId: string, templateId: string, formData: FormData) {
  const supabase = await db();
  const { error } = await supabase
    .from("task_template_items")
    .update({
      title: str(formData.get("title")),
      notes: str(formData.get("notes")),
      priority: Number(formData.get("priority") ?? 2),
      offset_days: parseOffset(formData),
    })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/templates/${templateId}`);
}

export async function deleteTemplateItem(itemId: string, templateId: string) {
  const supabase = await db();
  const { error } = await supabase.from("task_template_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/templates/${templateId}`);
}

export async function moveTemplateItem(itemId: string, templateId: string, dir: -1 | 1) {
  const supabase = await db();
  const { data: items } = await supabase
    .from("task_template_items")
    .select("id, position")
    .eq("template_id", templateId)
    .order("position");
  const list = items ?? [];
  const i = list.findIndex((x) => x.id === itemId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(
    list.map((x, idx) => supabase.from("task_template_items").update({ position: idx }).eq("id", x.id))
  );
  revalidatePath(`/templates/${templateId}`);
}

// ---------- store <-> template ----------
/** Salva la to-do list di uno store come nuovo template. */
export async function saveStoreAsTemplate(storeId: string, formData: FormData) {
  const supabase = await db();
  const [{ data: store }, { data: tasks }] = await Promise.all([
    supabase.from("stores").select("*").eq("id", storeId).single(),
    supabase.from("tasks").select("*").eq("store_id", storeId),
  ]);
  if (!store) throw new Error("Punto vendita non trovato");
  const s = store as Store;
  const onlyOpen = formData.get("only_open") === "on";
  const list = ((tasks ?? []) as Task[]).filter((t) => !onlyOpen || t.status !== "fatto");

  const { data: tpl, error } = await supabase
    .from("task_templates")
    .insert({
      name: str(formData.get("name")) ?? `Template da ${s.name}`,
      description: `Creato dalla to-do list di ${s.name}`,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const items = tasksToTemplateItems(list, s).map((i) => ({ ...i, template_id: tpl.id }));
  if (items.length) {
    const { error: e2 } = await supabase.from("task_template_items").insert(items);
    if (e2) throw new Error(e2.message);
  }
  revalidatePath("/templates");
  redirect(`/templates/${tpl.id}`);
}

export async function applyTemplate(storeId: string, formData: FormData) {
  const supabase = await db();
  const templateId = str(formData.get("template_id"));
  if (!templateId) return { created: 0, skipped: 0 };
  const base = (str(formData.get("base")) ?? "apertura") as BaseDate;
  const res = await applyTemplateToStore(supabase, templateId, storeId, base, formData.get("skip_existing") === "on");
  revalidatePath(`/stores/${storeId}`);
  revalidatePath("/");
  return res;
}

/** Applica un template a più store in un colpo solo. */
export async function applyTemplateToMany(templateId: string, formData: FormData) {
  const supabase = await db();
  const storeIds = formData.getAll("store_id").map(String);
  const base = (str(formData.get("base")) ?? "apertura") as BaseDate;
  let created = 0;
  for (const id of storeIds) {
    created += (await applyTemplateToStore(supabase, templateId, id, base, true)).created;
  }
  revalidatePath("/");
  revalidatePath(`/templates/${templateId}`);
  return { stores: storeIds.length, created };
}

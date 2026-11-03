"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { StoreStatus, TaskStatus } from "@/lib/types";
import { applyTemplateToStore } from "@/lib/templates";

const str = (v: FormDataEntryValue | null) => {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
};

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// ---------------- AUTH ----------------
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------- STORES ----------------
export async function createStore(formData: FormData) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("stores")
    .insert({
      name: str(formData.get("name")) ?? "Nuovo punto vendita",
      address: str(formData.get("address")),
      city: str(formData.get("city")),
      lat: Number(formData.get("lat")),
      lng: Number(formData.get("lng")),
      status: (str(formData.get("status")) ?? "in_apertura") as StoreStatus,
      opening_date: str(formData.get("opening_date")),
      manager_name: str(formData.get("manager_name")),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const templateId = str(formData.get("template_id"));
  if (templateId) await applyTemplateToStore(supabase, templateId, data.id, "apertura");
  revalidatePath("/");
  redirect(`/stores/${data.id}`);
}

export async function updateStore(id: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("stores")
    .update({
      name: str(formData.get("name")),
      address: str(formData.get("address")),
      city: str(formData.get("city")),
      status: str(formData.get("status")) as StoreStatus,
      opening_date: str(formData.get("opening_date")),
      manager_name: str(formData.get("manager_name")),
      notes: str(formData.get("notes")),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/stores/${id}`);
  revalidatePath("/");
}

export async function moveStore(id: string, lat: number, lng: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("stores").update({ lat, lng }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteStore(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("stores").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
}

// ---------------- TASKS ----------------
export async function createTask(storeId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const title = str(formData.get("title"));
  if (!title) return;
  const { error } = await supabase.from("tasks").insert({
    store_id: storeId,
    title,
    due_date: str(formData.get("due_date")),
    priority: Number(formData.get("priority") ?? 2),
    assigned_to: str(formData.get("assigned_to")),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/stores/${storeId}`);
  revalidatePath("/");
}

export async function setTaskStatus(taskId: string, storeId: string, status: TaskStatus) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/stores/${storeId}`);
  revalidatePath("/");
}

export async function updateTask(taskId: string, storeId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({
      title: str(formData.get("title")),
      notes: str(formData.get("notes")),
      due_date: str(formData.get("due_date")),
      priority: Number(formData.get("priority") ?? 2),
      assigned_to: str(formData.get("assigned_to")),
    })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/stores/${storeId}`);
}

export async function deleteTask(taskId: string, storeId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/stores/${storeId}`);
  revalidatePath("/");
}

// ---------------- PROFILO / NOTIFICHE ----------------
export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: str(formData.get("full_name")),
      telegram_chat_id: str(formData.get("telegram_chat_id")),
      notify_push: formData.get("notify_push") === "on",
      notify_email: formData.get("notify_email") === "on",
      notify_telegram: formData.get("notify_telegram") === "on",
      reminder_days_before: Number(formData.get("reminder_days_before") ?? 3),
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    { onConflict: "endpoint" }
  );
  if (error) throw new Error(error.message);
}

export async function removePushSubscription(endpoint: string) {
  const { supabase } = await requireUser();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

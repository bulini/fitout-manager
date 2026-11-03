import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteStore, updateStore } from "@/app/actions";
import { STORE_STATUS_COLOR, STORE_STATUS_LABEL, type Profile, type Store, type Task } from "@/lib/types";
import { prioritizeTasks } from "@/lib/ai";
import { TaskList } from "@/components/TaskList";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StoreTemplatePanel } from "@/components/StoreTemplatePanel";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: store }, { data: tasks }, { data: team }, { data: templates }] = await Promise.all([
    supabase.from("stores").select("*").eq("id", id).single(),
    supabase.from("tasks").select("*").eq("store_id", id),
    supabase.from("profiles").select("id, full_name, email"),
    supabase.from("task_templates").select("id, name").order("name"),
  ]);
  if (!store) notFound();
  const s = store as Store;
  const ordered = await prioritizeTasks((tasks ?? []) as Task[], s);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Link href="/" className="hover:underline">Mappa</Link> <span>/</span> <span>{s.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: STORE_STATUS_COLOR[s.status] }} />
          <h1 className="text-2xl font-semibold">{s.name}</h1>
        </div>
        <TaskList
          storeId={s.id}
          tasks={ordered}
          team={(team ?? []) as Pick<Profile, "id" | "full_name" | "email">[]}
        />
      </section>

      <aside className="space-y-4">
        <StoreTemplatePanel
          storeId={s.id}
          storeName={s.name}
          hasOpeningDate={!!s.opening_date}
          templates={templates ?? []}
          taskCount={ordered.length}
        />
        <form action={updateStore.bind(null, s.id)} className="card space-y-3 p-4">
          <h2 className="font-semibold">Dati punto vendita</h2>
          <div>
            <label className="label">Nome</label>
            <input name="name" defaultValue={s.name} required className="input" />
          </div>
          <div>
            <label className="label">Indirizzo</label>
            <input name="address" defaultValue={s.address ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Città</label>
            <input name="city" defaultValue={s.city ?? ""} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Stato</label>
              <select name="status" defaultValue={s.status} className="input">
                {Object.entries(STORE_STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Apertura</label>
              <input type="date" name="opening_date" defaultValue={s.opening_date ?? ""} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Responsabile</label>
            <input name="manager_name" defaultValue={s.manager_name ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Note</label>
            <textarea name="notes" defaultValue={s.notes ?? ""} rows={4} className="input" />
          </div>
          <div className="flex justify-between">
            <ConfirmButton
              action={deleteStore.bind(null, s.id)}
              message="Eliminare il punto vendita e tutte le sue cose da fare?"
              className="btn-danger"
            >
              Elimina
            </ConfirmButton>
            <button className="btn-primary">Salva</button>
          </div>
          <a
            className="block text-center text-xs text-stone-500 hover:underline"
            target="_blank"
            rel="noreferrer"
            href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
          >
            Apri indicazioni stradali ↗
          </a>
        </form>
      </aside>
    </div>
  );
}

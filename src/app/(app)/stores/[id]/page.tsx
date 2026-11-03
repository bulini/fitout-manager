import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteStore, updateStore } from "@/app/actions";
import { STORE_STATUS_COLOR, STORE_STATUS_LABEL, type Profile, type Store, type Task } from "@/lib/types";
import { prioritizeTasks } from "@/lib/ai";
import { formatDate, daysFromToday } from "@/lib/dates";
import { TaskList } from "@/components/TaskList";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StoreTemplatePanel } from "@/components/StoreTemplatePanel";
import { StoreTabs } from "@/components/StoreTabs";
import { BackIcon } from "@/components/Icons";

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
  const openCount = ordered.filter((t) => t.status !== "fatto").length;
  const days = s.opening_date ? daysFromToday(s.opening_date) : null;

  const details = (
    <form action={updateStore.bind(null, s.id)} className="card space-y-3 p-4">
      <h2 className="hidden font-semibold md:block">Dati punto vendita</h2>
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
      <div className="grid grid-cols-2 gap-3">
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
      <label className="flex items-start gap-2.5 rounded-xl bg-stone-50 p-3 text-sm">
        <input type="checkbox" name="shift_tasks" defaultChecked className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600" />
        <span>
          Se cambio la data di apertura, sposta le scadenze delle attività da template
          <span className="block text-xs text-stone-500">Solo quelle non completate.</span>
        </span>
      </label>
      <div>
        <label className="label">Responsabile</label>
        <input name="manager_name" defaultValue={s.manager_name ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Note</label>
        <textarea name="notes" defaultValue={s.notes ?? ""} rows={4} className="input" />
      </div>
      <button className="btn-primary w-full">Salva modifiche</button>
      <a
        className="btn-outline w-full"
        target="_blank"
        rel="noreferrer"
        href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
      >
        🧭 Indicazioni stradali
      </a>
      <div className="border-t border-stone-100 pt-3">
        <ConfirmButton
          action={deleteStore.bind(null, s.id)}
          message="Eliminare il punto vendita e tutte le sue cose da fare?"
          className="btn-danger w-full"
        >
          Elimina punto vendita
        </ConfirmButton>
      </div>
    </form>
  );

  return (
    <div>
      <div className="mb-3 flex items-start gap-2">
        <Link href="/" className="btn-ghost -ml-2 shrink-0 px-2" aria-label="Indietro">
          <BackIcon className="h-6 w-6" />
        </Link>
        <div className="min-w-0 pt-1">
          <h1 className="text-xl font-semibold leading-tight md:text-2xl">{s.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: STORE_STATUS_COLOR[s.status] }} />
              {STORE_STATUS_LABEL[s.status]}
            </span>
            {s.city && <span>{s.city}</span>}
            {s.opening_date && (
              <span className={days !== null && days >= 0 && days <= 14 ? "font-medium text-amber-700" : ""}>
                Apre {formatDate(s.opening_date)}
                {days !== null && days >= 0 && ` (tra ${days} g)`}
              </span>
            )}
          </div>
        </div>
      </div>

      <StoreTabs
        tabs={[
          {
            key: "todo",
            label: `Attività${openCount ? ` (${openCount})` : ""}`,
            content: (
              <TaskList
                storeId={s.id}
                tasks={ordered}
                team={(team ?? []) as Pick<Profile, "id" | "full_name" | "email">[]}
              />
            ),
          },
          {
            key: "template",
            label: "Template",
            content: (
              <StoreTemplatePanel
                storeId={s.id}
                storeName={s.name}
                hasOpeningDate={!!s.opening_date}
                templates={templates ?? []}
                taskCount={ordered.length}
              />
            ),
          },
          { key: "dati", label: "Dati", content: details },
        ]}
      />
    </div>
  );
}

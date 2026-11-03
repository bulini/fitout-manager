import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addTemplateItem,
  deleteTemplate,
  duplicateTemplate,
  updateTemplate,
} from "@/app/templates-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { BackIcon } from "@/components/Icons";
import { OffsetFields } from "@/components/OffsetFields";
import { TemplateItemRow } from "@/components/TemplateItemRow";
import { ApplyToStores } from "@/components/ApplyToStores";
import type { Store, Template, TemplateItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: tpl }, { data: items }, { data: stores }] = await Promise.all([
    supabase.from("task_templates").select("*").eq("id", id).single(),
    supabase.from("task_template_items").select("*").eq("template_id", id).order("position"),
    supabase.from("stores").select("id, name, city, status, opening_date").neq("status", "chiuso").order("name"),
  ]);
  if (!tpl) notFound();
  const t = tpl as Template;
  const list = (items ?? []) as TemplateItem[];

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_340px]">
      <section className="space-y-3">
        <Link href="/templates" className="inline-flex items-center text-sm text-stone-500">
          <BackIcon className="h-4 w-4" /> Template
        </Link>

        <form action={updateTemplate.bind(null, t.id)} className="card space-y-2 p-4">
          <input name="name" defaultValue={t.name} required className="input text-lg font-semibold" />
          <textarea name="description" defaultValue={t.description ?? ""} rows={2} placeholder="Descrizione" className="input" />
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex gap-1">
              <ConfirmButton action={deleteTemplate.bind(null, t.id)} message="Eliminare il template? Le task già create negli store restano." className="btn-danger">
                Elimina
              </ConfirmButton>
              <ConfirmButton action={duplicateTemplate.bind(null, t.id)} message="Creare una copia del template?" className="btn-ghost">
                Duplica
              </ConfirmButton>
            </div>
            <button className="btn-primary">Salva</button>
          </div>
        </form>

        <form action={addTemplateItem.bind(null, t.id)} className="card space-y-2 p-3">
          <input name="title" required placeholder="Nuova attività…" className="input" />
          <div className="flex flex-wrap items-center gap-2">
            <OffsetFields />
            <select name="priority" defaultValue="2" className="input w-28 sm:w-auto" aria-label="Priorità">
              <option value="1">Alta</option>
              <option value="2">Media</option>
              <option value="3">Bassa</option>
            </select>
            <button className="btn-primary flex-1 sm:ml-auto sm:flex-none">Aggiungi</button>
          </div>
        </form>

        <div className="card divide-y divide-stone-100">
          {list.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Il template è vuoto.</p>}
          {list.map((item, i) => (
            <TemplateItemRow key={item.id} item={item} isFirst={i === 0} isLast={i === list.length - 1} />
          ))}
        </div>
      </section>

      <aside>
        <ApplyToStores
          templateId={t.id}
          stores={(stores ?? []) as Pick<Store, "id" | "name" | "city" | "status" | "opening_date">[]}
          disabled={list.length === 0}
        />
      </aside>
    </div>
  );
}

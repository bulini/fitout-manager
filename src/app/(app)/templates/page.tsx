import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTemplate } from "@/app/templates-actions";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("task_templates")
    .select("id, name, description, updated_at, task_template_items(count)")
    .order("name");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Template di to-do</h1>
        <p className="text-sm text-stone-500">
          Liste di attività riutilizzabili. Le scadenze sono relative alla data di apertura: quando applichi un template a uno
          store vengono calcolate in automatico.
        </p>
      </div>

      <form action={createTemplate} className="card flex flex-wrap gap-2 p-3">
        <input name="name" required placeholder="Nome template, es. Apertura standard" className="input min-w-[200px] flex-1" />
        <button className="btn-primary">Crea template</button>
      </form>
      <p className="text-xs text-stone-500">
        Puoi anche partire da uno store esistente: apri lo store e usa “Salva come template”.
      </p>

      <ul className="space-y-2">
        {(templates ?? []).map((t) => {
          const count = (t.task_template_items as unknown as { count: number }[])?.[0]?.count ?? 0;
          return (
            <li key={t.id}>
              <Link href={`/templates/${t.id}`} className="card flex items-center gap-3 p-3 hover:border-brand-500">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">📋</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{t.name}</div>
                  {t.description && <div className="truncate text-xs text-stone-500">{t.description}</div>}
                </div>
                <span className="text-sm text-stone-600">{count} attività</span>
              </Link>
            </li>
          );
        })}
        {(templates ?? []).length === 0 && (
          <li className="card p-6 text-center text-sm text-stone-500">Nessun template ancora.</li>
        )}
      </ul>
    </div>
  );
}

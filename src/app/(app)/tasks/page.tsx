import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { urgencyScore } from "@/lib/ai";
import { dueLabel, formatDate } from "@/lib/dates";
import { PRIORITY_LABEL, STORE_STATUS_COLOR, type Store, type Task } from "@/lib/types";

export const dynamic = "force-dynamic";

const toneClass = {
  late: "bg-red-50 text-red-700",
  soon: "bg-amber-50 text-amber-700",
  ok: "bg-stone-100 text-stone-600",
  none: "bg-stone-50 text-stone-400",
};

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ mine?: string }> }) {
  const { mine } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let q = supabase.from("tasks").select("*").neq("status", "fatto");
  if (mine && user) q = q.eq("assigned_to", user.id);
  const [{ data: tasks }, { data: stores }] = await Promise.all([q, supabase.from("stores").select("*")]);

  const storeById = new Map(((stores ?? []) as Store[]).map((s) => [s.id, s]));
  const list = ((tasks ?? []) as Task[])
    .map((t) => ({ t, s: storeById.get(t.store_id)! }))
    .filter((x) => x.s && x.s.status !== "chiuso")
    .sort((a, b) => urgencyScore(b.t, b.s) - urgencyScore(a.t, a.s));

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cose da fare</h1>
        <div className="flex gap-1 text-sm">
          <Link href="/tasks" className={mine ? "btn-ghost" : "btn-primary"}>Tutte</Link>
          <Link href="/tasks?mine=1" className={mine ? "btn-primary" : "btn-ghost"}>Assegnate a me</Link>
        </div>
      </div>
      <p className="text-sm text-stone-500">
        Ordinate per urgenza: scadenza, priorità e vicinanza alla data di apertura del punto vendita.
      </p>
      <div className="card divide-y divide-stone-100">
        {list.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Tutto fatto 🎉</p>}
        {list.map(({ t, s }) => {
          const due = dueLabel(t.due_date);
          return (
            <Link key={t.id} href={`/stores/${s.id}`} className="flex items-start gap-3 p-3 hover:bg-stone-50">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STORE_STATUS_COLOR[s.status] }} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-stone-500">
                  {s.name}
                  {s.opening_date && ` · apre ${formatDate(s.opening_date)}`}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                <span className={`rounded px-1.5 py-0.5 ${toneClass[due.tone]}`}>{due.text}</span>
                {t.priority === 1 && <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">{PRIORITY_LABEL[1]}</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

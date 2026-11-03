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
      <div>
        <h1 className="text-2xl font-semibold">Cose da fare</h1>
        <p className="text-sm text-stone-500">Ordinate per urgenza: scadenza, priorità e data di apertura.</p>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-200/70 p-1 md:inline-grid">
        {[
          { href: "/tasks", label: `Tutte`, on: !mine },
          { href: "/tasks?mine=1", label: "Assegnate a me", on: !!mine },
        ].map((x) => (
          <Link
            key={x.href}
            href={x.href}
            className={`rounded-lg px-4 py-2 text-center text-sm font-medium ${x.on ? "bg-white shadow-sm" : "text-stone-600"}`}
          >
            {x.label}
          </Link>
        ))}
      </div>
      <div className="card divide-y divide-stone-100 overflow-hidden">
        {list.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Tutto fatto 🎉</p>}
        {list.map(({ t, s }) => {
          const due = dueLabel(t.due_date);
          return (
            <Link key={t.id} href={`/stores/${s.id}`} className="flex items-start gap-3 p-3.5 active:bg-stone-50 md:hover:bg-stone-50">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STORE_STATUS_COLOR[s.status] }} />
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-snug">{t.title}</div>
                <div className="mt-0.5 text-xs text-stone-500">
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

import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import type { Store } from "@/lib/types";
import { Dashboard, type StoreWithCounts } from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: stores }, { data: openTasks }] = await Promise.all([
    supabase.from("stores").select("*").order("name"),
    supabase.from("tasks").select("store_id, due_date").neq("status", "fatto"),
  ]);

  const today = todayISO();
  const counts = new Map<string, { open: number; overdue: number }>();
  for (const t of openTasks ?? []) {
    const c = counts.get(t.store_id) ?? { open: 0, overdue: 0 };
    c.open++;
    if (t.due_date && t.due_date < today) c.overdue++;
    counts.set(t.store_id, c);
  }

  const data: StoreWithCounts[] = ((stores ?? []) as Store[]).map((s) => ({
    ...s,
    open: counts.get(s.id)?.open ?? 0,
    overdue: counts.get(s.id)?.overdue ?? 0,
  }));

  return <Dashboard stores={data} />;
}

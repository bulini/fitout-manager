import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysISO, todayISO } from "@/lib/dates";
import { composeReminder, urgencyScore, type DigestItem } from "@/lib/ai";
import { sendEmail, sendPush, sendTelegram } from "@/lib/notify";
import type { Profile, Store, Task } from "@/lib/types";

type Channel = "push" | "email" | "telegram";

/**
 * Costruisce il riepilogo per un utente: task non completate, dei punti vendita
 * non chiusi, scadute o in scadenza entro N giorni (o senza scadenza ma con
 * apertura entro N giorni), assegnate a lui o a tutto il team.
 */
export function buildDigest(profile: Profile, stores: Store[], tasks: Task[]): DigestItem[] {
  const today = todayISO();
  const horizon = addDaysISO(today, profile.reminder_days_before);
  const byStore = new Map(stores.filter((s) => s.status !== "chiuso").map((s) => [s.id, s]));

  const relevant = tasks.filter((t) => {
    if (t.status === "fatto") return false;
    if (t.assigned_to && t.assigned_to !== profile.id) return false;
    const store = byStore.get(t.store_id);
    if (!store) return false;
    if (t.due_date) return t.due_date <= horizon;
    return !!store.opening_date && store.opening_date <= horizon;
  });

  const groups = new Map<string, Task[]>();
  for (const t of relevant) groups.set(t.store_id, [...(groups.get(t.store_id) ?? []), t]);

  return [...groups.entries()]
    .map(([storeId, ts]) => {
      const store = byStore.get(storeId)!;
      const sorted = ts.sort((a, b) => urgencyScore(b, store) - urgencyScore(a, store));
      return { store, tasks: sorted, top: urgencyScore(sorted[0], store) };
    })
    .sort((a, b) => b.top - a.top)
    .map(({ store, tasks }) => ({ store, tasks }));
}

export interface RunResult {
  users: number;
  sent: Record<Channel, number>;
  skipped: number;
}

/**
 * Esegue l'invio dei reminder. `force` ignora il log giornaliero (per i test),
 * `onlyUserId` limita a un utente.
 */
export async function runReminders(
  db: SupabaseClient,
  opts: { force?: boolean; onlyUserId?: string } = {}
): Promise<RunResult> {
  const today = todayISO();
  let profilesQ = db.from("profiles").select("*");
  if (opts.onlyUserId) profilesQ = profilesQ.eq("id", opts.onlyUserId);

  const [{ data: profiles }, { data: stores }, { data: tasks }, { data: subs }, { data: log }] = await Promise.all([
    profilesQ,
    db.from("stores").select("*"),
    db.from("tasks").select("*").neq("status", "fatto"),
    db.from("push_subscriptions").select("*"),
    db.from("reminder_log").select("user_id, channel").eq("sent_on", today),
  ]);

  const already = new Set((log ?? []).map((l) => `${l.user_id}:${l.channel}`));
  const result: RunResult = { users: 0, sent: { push: 0, email: 0, telegram: 0 }, skipped: 0 };
  const expired: string[] = [];

  for (const p of (profiles ?? []) as Profile[]) {
    const digest = buildDigest(p, (stores ?? []) as Store[], (tasks ?? []) as Task[]);
    const count = digest.reduce((a, d) => a + d.tasks.length, 0);
    if (count === 0) {
      result.skipped++;
      continue;
    }
    result.users++;
    const msg = await composeReminder(digest, p.full_name);
    const done = async (channel: Channel) => {
      result.sent[channel]++;
      await db.from("reminder_log").upsert(
        { user_id: p.id, channel, sent_on: today, task_count: count },
        { onConflict: "user_id,channel,sent_on" }
      );
    };
    const should = (c: Channel) => opts.force || !already.has(`${p.id}:${c}`);

    if (p.notify_push && should("push")) {
      const mine = (subs ?? []).filter((s) => s.user_id === p.id);
      const r = await sendPush(mine, msg);
      expired.push(...r.expired);
      if (r.sent > 0) await done("push");
    }
    if (p.notify_email && p.email && should("email")) {
      if (await sendEmail(p.email, msg)) await done("email");
    }
    if (p.notify_telegram && p.telegram_chat_id && should("telegram")) {
      if (await sendTelegram(p.telegram_chat_id, msg)) await done("telegram");
    }
  }

  if (expired.length) await db.from("push_subscriptions").delete().in("endpoint", expired);
  return result;
}

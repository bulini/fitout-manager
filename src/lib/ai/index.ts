/**
 * Livello AI di Boxyland Manager.
 *
 * Il provider si sceglie con AI_PROVIDER (none | anthropic | openai).
 * Per ora è attivo solo "none": regole deterministiche (scadenza, priorità,
 * vicinanza all'apertura). Quando decidi il provider basta implementare
 * l'interfaccia AIProvider in un nuovo file e registrarlo in getProvider().
 * Il resto dell'app (pagine, cron, notifiche) chiama solo le funzioni qui sotto.
 */
import { daysFromToday, formatDate } from "@/lib/dates";
import type { Store, Task } from "@/lib/types";

export interface DigestItem {
  store: Pick<Store, "id" | "name" | "city" | "opening_date" | "status">;
  tasks: Pick<Task, "id" | "title" | "due_date" | "priority" | "status">[];
}

export interface ReminderMessage {
  subject: string;
  /** testo semplice (Telegram, push) */
  text: string;
  /** versione breve per la notifica push */
  short: string;
}

export interface AIProvider {
  prioritize<T extends Task>(tasks: T[], store?: Store): Promise<T[]>;
  composeReminder(digest: DigestItem[], recipientName?: string | null): Promise<ReminderMessage>;
}

// ---------- Provider di default: regole, nessuna chiamata esterna ----------
function urgencyScore(t: Pick<Task, "due_date" | "priority" | "status">, store?: Pick<Store, "opening_date">) {
  if (t.status === "fatto") return -1e9;
  let score = (4 - t.priority) * 10; // alta=30, media=20, bassa=10
  if (t.due_date) {
    const d = daysFromToday(t.due_date);
    score += d < 0 ? 100 + Math.min(-d, 30) * 2 : Math.max(0, 40 - d * 4);
  }
  if (store?.opening_date) {
    const d = daysFromToday(store.opening_date);
    if (d >= 0 && d <= 14) score += 30 - d * 2; // apertura imminente: tutto più urgente
  }
  if (t.status === "in_corso") score += 5;
  return score;
}

const rulesProvider: AIProvider = {
  async prioritize(tasks, store) {
    return [...tasks].sort((a, b) => urgencyScore(b, store) - urgencyScore(a, store));
  },

  async composeReminder(digest, recipientName) {
    const total = digest.reduce((a, d) => a + d.tasks.length, 0);
    const overdue = digest.reduce(
      (a, d) => a + d.tasks.filter((t) => t.due_date && daysFromToday(t.due_date) < 0).length,
      0
    );
    const lines: string[] = [];
    lines.push(`Ciao${recipientName ? " " + recipientName : ""}! Ecco le cose da fare di oggi.`);
    for (const d of digest) {
      const opening = d.store.opening_date ? ` — apertura ${formatDate(d.store.opening_date)}` : "";
      lines.push("");
      lines.push(`📍 ${d.store.name}${d.store.city ? " (" + d.store.city + ")" : ""}${opening}`);
      for (const t of d.tasks) {
        let when = "";
        if (t.due_date) {
          const n = daysFromToday(t.due_date);
          when = n < 0 ? ` ⚠️ scaduta da ${-n} g` : n === 0 ? " · oggi" : ` · entro ${formatDate(t.due_date)}`;
        }
        lines.push(`  ${t.priority === 1 ? "🔴" : "•"} ${t.title}${when}`);
      }
    }
    const top = digest[0]?.tasks[0];
    if (top) {
      lines.push("");
      lines.push(`👉 Se fai una cosa sola oggi: "${top.title}" (${digest[0].store.name}).`);
    }
    return {
      subject: `Boxyland: ${total} ${total === 1 ? "cosa" : "cose"} da fare${overdue ? `, ${overdue} ${overdue === 1 ? "scaduta" : "scadute"}` : ""}`,
      text: lines.join("\n"),
      short: top
        ? `${total} da fare${overdue ? ` (${overdue} ${overdue === 1 ? "scaduta" : "scadute"})` : ""}. Prima: ${top.title} — ${digest[0].store.name}`
        : "Nessuna cosa da fare oggi",
    };
  },
};

function getProvider(): AIProvider {
  switch (process.env.AI_PROVIDER) {
    // case "anthropic": return anthropicProvider;   // da aggiungere
    // case "openai":    return openaiProvider;      // da aggiungere
    default:
      return rulesProvider;
  }
}

export const prioritizeTasks = <T extends Task>(tasks: T[], store?: Store) => getProvider().prioritize(tasks, store);
export const composeReminder = (digest: DigestItem[], name?: string | null) => getProvider().composeReminder(digest, name);
export { urgencyScore };

const TZ = "Europe/Rome";

/** Data di oggi (YYYY-MM-DD) nel fuso italiano. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Giorni da oggi alla data (negativo = scaduta). */
export function daysFromToday(iso: string): number {
  const a = new Date(todayISO() + "T12:00:00Z").getTime();
  const b = new Date(iso + "T12:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00Z").toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function dueLabel(iso: string | null): { text: string; tone: "late" | "soon" | "ok" | "none" } {
  if (!iso) return { text: "senza scadenza", tone: "none" };
  const d = daysFromToday(iso);
  if (d < 0) return { text: `scaduta da ${-d} g`, tone: "late" };
  if (d === 0) return { text: "oggi", tone: "soon" };
  if (d === 1) return { text: "domani", tone: "soon" };
  if (d <= 3) return { text: `tra ${d} g`, tone: "soon" };
  return { text: formatDate(iso), tone: "ok" };
}

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { runReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/** Invia subito il riepilogo all'utente loggato su tutti i suoi canali attivi. */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await runReminders(createServiceClient(), { force: true, onlyUserId: user.id });
  return NextResponse.json({ ok: true, ...result });
}

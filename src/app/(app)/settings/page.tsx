import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/app/actions";
import type { Profile } from "@/lib/types";
import { PushToggle } from "@/components/PushToggle";
import { TestReminderButton } from "@/components/TestReminderButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  const p = data as Profile | null;

  const channels = {
    push: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY,
    email: !!process.env.RESEND_API_KEY,
    telegram: !!process.env.TELEGRAM_BOT_TOKEN,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Notifiche e reminder</h1>

      <div className="card space-y-2 p-4">
        <h2 className="font-semibold">Notifiche push su questo dispositivo</h2>
        <p className="text-sm text-stone-500">
          Su iPhone prima aggiungi l&apos;app alla schermata Home (Condividi → Aggiungi a Home), poi attiva le notifiche da lì.
        </p>
        {channels.push ? (
          <PushToggle vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!} />
        ) : (
          <p className="text-sm text-amber-700">Chiavi VAPID non configurate sul server.</p>
        )}
      </div>

      <form action={updateProfile} className="card space-y-4 p-4">
        <h2 className="font-semibold">Il tuo riepilogo giornaliero</h2>
        <div>
          <label className="label">Nome</label>
          <input name="full_name" defaultValue={p?.full_name ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Avvisami delle scadenze con quanti giorni di anticipo</label>
          <input type="number" min={0} max={60} name="reminder_days_before" defaultValue={p?.reminder_days_before ?? 3} className="input w-28" />
        </div>
        <fieldset className="space-y-2">
          <legend className="label">Canali</legend>
          <Check name="notify_push" label="Push (browser / telefono)" checked={p?.notify_push} available={channels.push} />
          <Check name="notify_email" label={`Email (${p?.email ?? ""})`} checked={p?.notify_email} available={channels.email} />
          <Check name="notify_telegram" label="Telegram" checked={p?.notify_telegram} available={channels.telegram} />
        </fieldset>
        <div>
          <label className="label">Telegram chat ID</label>
          <input name="telegram_chat_id" defaultValue={p?.telegram_chat_id ?? ""} className="input" placeholder="es. 123456789" />
          <p className="mt-1 text-xs text-stone-500">
            Scrivi /start al bot di Boxyland su Telegram, poi apri @userinfobot per leggere il tuo ID e incollalo qui.
          </p>
        </div>
        <div className="flex justify-end">
          <button className="btn-primary">Salva</button>
        </div>
      </form>

      <div className="card flex items-center justify-between gap-3 p-4">
        <div>
          <h2 className="font-semibold">Prova</h2>
          <p className="text-sm text-stone-500">Ricevi adesso il riepilogo sui canali attivi.</p>
        </div>
        <TestReminderButton />
      </div>
    </div>
  );
}

function Check({ name, label, checked, available }: { name: string; label: string; checked?: boolean; available: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 accent-brand-600" />
      {label}
      {!available && <span className="text-xs text-amber-700">(non configurato sul server)</span>}
    </label>
  );
}

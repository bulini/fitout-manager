# Boxyland Manager

Web app (PWA) per gestire i punti vendita Boxyland sulla mappa, con una to-do list per ogni punto e reminder automatici via **push**, **email** e **Telegram**.

Stack: Next.js 15 (App Router) · Supabase (auth + Postgres) · Leaflet/OpenStreetMap · Vercel (hosting + cron).

## Cosa c'è già

| Area | Dettaglio |
|---|---|
| Login | Email + password (Supabase Auth). Tutte le pagine sono protette dal middleware. |
| Mappa | Punti vendita con colore per stato (pianificato, in apertura, aperto, chiuso) e badge rosso con le task scadute. Clic sulla mappa → nuovo punto. Pin posizionabile anche dall'indirizzo (geocoding OSM). |
| Punto vendita | Scheda modificabile + to-do list: scadenza, priorità, assegnatario, stato (da fare / in corso / fatto), note. |
| Cose da fare | Vista unica di tutte le task aperte, ordinate per urgenza. Filtro "assegnate a me". |
| Template | Liste di attività riutilizzabili con scadenze relative all'apertura (es. "30 g prima"). Si creano da zero o salvando la to-do di uno store, e si applicano a uno o più store (anche alla creazione). Le attività già presenti vengono saltate. |
| Reminder | Ogni mattina (07:00 UTC) un cron prepara per ogni utente il riepilogo delle task scadute o in scadenza entro N giorni (impostabile) e lo manda sui canali attivi. Non invia mai due volte nello stesso giorno sullo stesso canale. |
| AI | `src/lib/ai/index.ts`: per ora usa regole (scadenza + priorità + vicinanza all'apertura) per ordinare le task e scrivere il messaggio. Quando scegli il provider basta implementare l'interfaccia `AIProvider`. |

## Setup (circa 15 minuti)

### 1. Supabase
1. Crea un progetto su [supabase.com](https://supabase.com).
2. **SQL Editor** → esegui in ordine i file di `supabase/migrations/` (`0001_init.sql`, `0002_templates.sql`, …) → **Run**.
3. **Authentication → Sign In / Providers**: lascia attivo Email e **disattiva "Allow new users to sign up"** (l'app è privata).
4. **Authentication → Users → Add user**: crea gli utenti del team (email + password, spunta "Auto confirm").
5. **Project Settings → API**: copia URL, `anon key` e `service_role key`.

### 2. Variabili d'ambiente
```bash
cp .env.example .env.local
npm install
npm run vapid          # genera le chiavi per le notifiche push
```
Compila `.env.local`. I canali senza chiave vengono semplicemente saltati:
- **Email**: crea una API key su [resend.com](https://resend.com) e verifica il tuo dominio per `EMAIL_FROM`.
- **Telegram**: crea un bot con [@BotFather](https://t.me/BotFather) e copia il token. Ogni utente scrive `/start` al bot e incolla il suo chat ID in *Notifiche*.

### 3. Avvio in locale
```bash
npm run dev
```
Apri http://localhost:3000 e accedi con un utente creato al punto 1.

### 4. Pubblicazione su Vercel
1. Pusha il repo su GitHub e importalo su Vercel.
2. Copia tutte le variabili di `.env.local` in *Settings → Environment Variables* e imposta `NEXT_PUBLIC_APP_URL` con l'URL pubblico.
3. Il cron in `vercel.json` parte da solo. Vercel invia `Authorization: Bearer $CRON_SECRET`.
   Per provarlo a mano: `curl -H "Authorization: Bearer $CRON_SECRET" https://tuo-dominio/api/cron/reminders`

> Le push richiedono HTTPS (in locale funzionano su `localhost`). Su iPhone l'app va prima aggiunta alla schermata Home.

## Struttura
```
src/
  app/
    (app)/            pagine protette: mappa, stores/[id], tasks, settings
    login/            pagina di accesso
    api/cron/reminders  job giornaliero
    api/notify/test     "Invia ora" dalla pagina Notifiche
    actions.ts        server actions (CRUD)
  components/         mappa, to-do list, push toggle…
  lib/
    ai/               livello AI (sostituibile)
    reminders.ts      costruzione riepilogo + invio
    notify.ts         push / email / telegram
    supabase/         client server, browser e service role
  middleware.ts       protezione login
supabase/migrations/  schema DB + RLS
public/sw.js          service worker per le push
```

## Prossimi passi possibili
- Collegare il provider AI (scomposizione automatica delle task, suggerimenti, messaggi personalizzati)
- Ruoli (admin / responsabile di zona) e RLS per area
- Comandi del bot Telegram per spuntare le task dalla chat

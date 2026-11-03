import "server-only";
import webpush from "web-push";
import { Resend } from "resend";
import type { ReminderMessage } from "@/lib/ai";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", pub, priv);
  vapidReady = true;
  return true;
}

export type PushSub = { endpoint: string; p256dh: string; auth: string };

/** Ritorna gli endpoint scaduti (da cancellare). */
export async function sendPush(subs: PushSub[], msg: ReminderMessage, url = "/tasks"): Promise<{ sent: number; expired: string[] }> {
  if (!ensureVapid() || subs.length === 0) return { sent: 0, expired: [] };
  const payload = JSON.stringify({ title: msg.subject, body: msg.short, url });
  const expired: string[] = [];
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
        sent++;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) expired.push(s.endpoint);
        else console.error("push error", code, e);
      }
    })
  );
  return { sent, expired };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export async function sendEmail(to: string, msg: ReminderMessage): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const resend = new Resend(key);
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#00859b">Boxyland Manager</h2>
      <pre style="font:14px/1.6 system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(msg.text)}</pre>
      <p><a href="${APP_URL}/tasks" style="background:#00859b;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Apri le cose da fare</a></p>
    </div>`;
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Boxyland Manager <onboarding@resend.dev>",
    to,
    subject: msg.subject,
    text: msg.text + `\n\n${APP_URL}/tasks`,
    html,
  });
  if (error) console.error("email error", error);
  return !error;
}

export async function sendTelegram(chatId: string, msg: ReminderMessage): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `*${msg.subject}*\n\n${msg.text}`.slice(0, 4000),
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[{ text: "Apri Boxyland Manager", url: `${APP_URL}/tasks` }]] },
    }),
  });
  if (!res.ok) {
    // ritenta senza Markdown (titoli con caratteri speciali)
    const retry = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: `${msg.subject}\n\n${msg.text}`.slice(0, 4000) }),
    });
    if (!retry.ok) console.error("telegram error", await retry.text());
    return retry.ok;
  }
  return true;
}

import type { Env } from './env';

/**
 * Instant alert to the owner's phone. Sends to every channel that is configured:
 * Telegram (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID) and/or WhatsApp via CallMeBot
 * (CALLMEBOT_API_KEY + OWNER_WHATSAPP). Never throws.
 */
export async function notifyOwner(env: Env, text: string): Promise<void> {
  const jobs: Promise<unknown>[] = [];
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) jobs.push(sendTelegram(env, text));
  if (env.CALLMEBOT_API_KEY && env.OWNER_WHATSAPP) jobs.push(sendCallMeBot(env, text));
  await Promise.all(jobs);
}

async function sendTelegram(env: Env, text: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
    });
    if (!res.ok) console.error('telegram failed', res.status, await res.text());
  } catch (err) {
    console.error('telegram error', err);
  }
}

async function sendCallMeBot(env: Env, text: string) {
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(env.OWNER_WHATSAPP)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(env.CALLMEBOT_API_KEY)}`;
    const res = await fetch(url);
    if (!res.ok) console.error('callmebot failed', res.status);
  } catch (err) {
    console.error('callmebot error', err);
  }
}

/** wa.me link to message a client on WhatsApp (numbers stored as +91XXXXXXXXXX). */
export const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;

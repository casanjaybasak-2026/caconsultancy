import type { Env } from './env';

/** Sends a WhatsApp message to the owner's own number via CallMeBot. Never throws. */
export async function notifyOwnerWhatsApp(env: Env, text: string): Promise<void> {
  if (!env.CALLMEBOT_API_KEY || !env.OWNER_WHATSAPP) return;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(env.OWNER_WHATSAPP)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(env.CALLMEBOT_API_KEY)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) console.error('callmebot failed', res.status);
  } catch (err) {
    console.error('callmebot error', err);
  }
}

/** wa.me link to message a client (Indian numbers stored as +91XXXXXXXXXX). */
export const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;

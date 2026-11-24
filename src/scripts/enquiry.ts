const SB = 'https://htfluyhsaondqacgeyou.supabase.co';
const ANON = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;

export function submitEnquiry(form: HTMLFormElement) {
  const status = form.querySelector<HTMLElement>('#e-status')!;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (d.website) return;
    if (!d.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email ?? '') || !/^[0-9+\-\s()]{7,15}$/.test(d.phone ?? '') || !d.message?.trim()) {
      status.textContent = 'Please fill in your name, a valid email, mobile number and message.';
      status.className = 'text-sm text-danger';
      return;
    }
    const btn = form.querySelector('button')!;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    const res = await fetch(`${SB}/rest/v1/enquiries`, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ name: d.name.trim(), email: d.email.trim(), phone: d.phone.trim(), service: d.service || null, message: d.message.trim() }),
    }).catch(() => null);
    if (res?.ok) {
      form.reset();
      status.textContent = "Thank you — your enquiry has been received. We'll get back to you shortly.";
      status.className = 'text-sm text-success';
    } else {
      status.textContent = 'Something went wrong sending your enquiry. Please try again in a moment.';
      status.className = 'text-sm text-danger';
    }
    btn.disabled = false;
    btn.textContent = 'Send enquiry';
  });
}

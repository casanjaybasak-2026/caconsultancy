export function submitEnquiry(form: HTMLFormElement) {
  const status = form.querySelector<HTMLElement>('#e-status')!;
  const say = (msg: string, ok: boolean) => {
    status.textContent = msg;
    status.className = `text-sm ${ok ? 'text-success' : 'text-danger'}`;
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (!d.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email ?? '') || !/^[0-9+\-\s()]{7,15}$/.test(d.phone ?? '') || !d.message?.trim())
      return say('Please fill in your name, a valid email, mobile number and message.', false);
    const btn = form.querySelector('button')!;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    const res = await fetch('/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).catch(() => null);
    if (res?.ok) {
      form.reset();
      say("Thank you — your enquiry has been received. We'll get back to you shortly.", true);
    } else {
      const body = await res?.json().catch(() => null);
      say(body?.errors ? Object.values(body.errors).join(' ') : 'Something went wrong sending your enquiry. Please try again in a moment.', false);
    }
    btn.disabled = false;
    btn.textContent = 'Send enquiry';
  });
}

declare global {
  interface Window { Razorpay: any }
}

const STORE = 'skb-booking-form';
type Fields = Record<string, string>;

const $ = <T extends Element>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);

function showErrors(form: HTMLFormElement, errors: Record<string, string>) {
  form.querySelectorAll<HTMLElement>('[data-error]').forEach((el) => (el.textContent = errors[el.dataset.error!] ?? ''));
  const first = Object.keys(errors)[0];
  if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus();
}

function localErrors(d: Fields, agreed: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if ((d.name ?? '').trim().length < 2) e.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email ?? '')) e.email = 'Please enter a valid email address.';
  if (!/^[6-9]\d{9}$/.test((d.phone ?? '').replace(/[\s\-()]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, ''))) e.phone = 'Please enter a valid 10-digit mobile number.';
  if (!agreed) e.agree = 'Please accept the terms to continue.';
  return e;
}

function setBusy(btn: HTMLButtonElement, busy: boolean, label = 'Pay ₹1,000 & book') {
  btn.disabled = busy;
  btn.lastChild!.textContent = busy ? ' Please wait…' : ' ' + label;
}

export function initBooking() {
  const form = $<HTMLFormElement>('#booking-form');
  if (!form) return;
  const btn = $<HTMLButtonElement>('[data-submit]', form)!;
  const status = $<HTMLElement>('#booking-status')!;

  // Restore after a failed attempt, or prefill client type from ?type=
  const saved = sessionStorage.getItem(STORE);
  if (saved) {
    const d = JSON.parse(saved) as Fields;
    for (const [k, v] of Object.entries(d)) {
      const el = form.elements.namedItem(k) as HTMLInputElement | null;
      if (el && el.type !== 'checkbox') el.value = v;
    }
  }
  const type = new URLSearchParams(location.search).get('type');
  if (type) (form.elements.namedItem('client_type') as HTMLSelectElement).value = type;
  const date = form.elements.namedItem('preferred_date') as HTMLInputElement;
  date.min = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    status.textContent = '';
    const fd = new FormData(form);
    const agreed = fd.get('agree') === 'on';
    fd.delete('agree');
    const data = Object.fromEntries(fd) as Fields;
    const errs = localErrors(data, agreed);
    showErrors(form, errs);
    if (Object.keys(errs).length) return;

    sessionStorage.setItem(STORE, JSON.stringify(data));
    setBusy(btn, true);
    try {
      const res = await fetch('/api/booking/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const order = await res.json();
      if (!res.ok) {
        if (order.errors) showErrors(form, order.errors);
        else status.textContent = order.error ?? 'Could not start the payment. Please try again.';
        setBusy(btn, false);
        return;
      }
      if (!window.Razorpay) throw new Error('Razorpay checkout did not load');

      const rzp = new window.Razorpay({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: 'CA S K Basak',
        description: 'Consultation booking fee (incl. GST)',
        image: '/icon-192.png',
        prefill: order.prefill,
        notes: { appointment_id: order.appointment_id },
        theme: { color: '#0f2545' },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setBusy(btn, true, 'Confirming…');
          const v = await fetch('/api/booking/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) })
            .then((x) => x.json().then((b) => ({ ok: x.ok, b })))
            .catch(() => ({ ok: false, b: {} as any }));
          if (v.ok) {
            sessionStorage.removeItem(STORE);
            location.href = `/booking/success?ref=${encodeURIComponent(v.b.ref)}`;
          } else {
            // The webhook will still record a genuine payment; send the client to the failure page with the payment id.
            location.href = `/booking/failed?reason=verify&payment=${encodeURIComponent(r.razorpay_payment_id)}`;
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(btn, false);
            status.textContent = 'Payment window closed. Your details are saved — you can try again.';
          },
        },
      });
      rzp.on('payment.failed', (r: any) => {
        location.href = `/booking/failed?reason=${encodeURIComponent(r?.error?.reason ?? 'payment_failed')}`;
      });
      rzp.open();
    } catch {
      status.textContent = 'Could not reach the payment server. Please check your connection and try again.';
      setBusy(btn, false);
    }
  });
}

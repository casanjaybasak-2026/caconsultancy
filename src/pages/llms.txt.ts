import type { APIRoute } from 'astro';
import { getArticles, getServices } from '../lib/content';
import { MONITORS } from '../data/monitors';
import { SITE } from '../config/site';

export const GET: APIRoute = async () => {
  const [articles, services] = await Promise.all([getArticles(), getServices()]);
  const u = (p: string) => `${SITE.url}${p}`;
  const body = `# CA S K Basak — Chartered Accountant & Financial Consultant (Kolkata, India)

> CA S K Basak is a Chartered Accountant (member of ICAI) based in Kolkata, West Bengal, providing income tax, GST, audit support, accounting, loan/CMA and project reports, MIS/virtual CFO and business advisory to individuals, professionals and MSMEs across India. One-to-one consultations cost ₹1,000 including GST and can be booked and paid online.

Key facts:
- Location: Kolkata, West Bengal, India; most work is handled remotely for clients anywhere in India.
- Clients: salaried individuals, professionals, MSMEs, startups, traders and companies.
- Consultation: ₹1,000 incl. GST, paid via Razorpay; slot confirmed within one working day; Google Meet, phone or in person.
- Monthly online monitoring tools for MSMEs (financial health, DSCR/loans, cash flow, receivables/payables, CMA readiness, MIS/CFO dashboard), plans from ₹399/month.
- Content on this site is general information, not personalised advice.

## Core pages
- [Home](${u('/')}): overview of the practice, services and booking
- [Services](${u('/services')}): all services with descriptions and how fees work
- [Book a consultation](${u('/appointment')}): ₹1,000 one-to-one consultation, booking FAQs
- [About CA S K Basak](${u('/about')}): profile, focus areas, memberships
- [For individuals](${u('/individuals')}): income tax returns, regime choice, notices, planning
- [For business & MSME](${u('/business')}): accounting, GST, CMA/project reports, MIS, valuation
- [Contact](${u('/contact')})

## Services
${services.map((s) => `- ${s.title}: ${s.description}`).join('\n')}

## Monthly monitoring tools
${MONITORS.map((m) => `- [${m.nav}](${u('/' + m.slug)}): ${m.lead}`).join('\n')}

## Guides
${articles.map((a) => `- [${a.title}](${u('/resources/' + a.slug)}): ${a.excerpt}`).join('\n')}

## Policies
- [Refund & cancellation policy](${u('/refund-policy')})
- [Privacy policy](${u('/privacy-policy')})
- [Terms of use](${u('/terms')})
- [Disclaimer](${u('/disclaimer')})
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

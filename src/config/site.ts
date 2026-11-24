/**
 * Brand and contact details. Values in Supabase `site_config` (editable in /admin → Settings)
 * override the contact fallbacks below at build time. Fill these in before go-live.
 */
export const SITE = {
  url: 'https://ca-sk-basak-consultancy.in',
  name: 'CA S K Basak',
  legalName: 'CA S K Basak – Chartered Accountant & Financial Consultant',
  tagline: 'Chartered Accountant & Financial Consultant',
  person: 'S K Basak',
  city: 'Kolkata',
  region: 'West Bengal',
  country: 'IN',
  memberOf: 'The Institute of Chartered Accountants of India (ICAI)',
  feeRupees: 1000,
  feeLabel: 'Consultation fee ₹1,000 (incl. GST)',
  gaId: 'G-NF8YPK6ZJH',
  adsenseClient: 'ca-pub-9565724265217851',
  googleVerification: '6uXVrt1CKV9oE12r9fKvkD0QdkM6EyimPYDgPdVKSWw',
};

export interface SiteConfig {
  contact_phone: string;
  contact_whatsapp: string;
  contact_email: string;
  office_address: string;
}

/** TODO before go-live: add phone, WhatsApp (digits with country code, e.g. 919830000000), email, address. */
export const CONTACT_FALLBACK: SiteConfig = {
  contact_phone: '',
  contact_whatsapp: '',
  contact_email: '',
  office_address: 'Kolkata, West Bengal, India',
};

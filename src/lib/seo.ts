import { SITE, type SiteConfig } from '../config/site';
import type { Article, Faq, Plan, Service } from './content';

const ctx = 'https://schema.org';
export const abs = (path: string) => SITE.url + (path === '/' ? '/' : path);
const ORG_ID = `${SITE.url}/#organization`;
const PERSON_ID = `${SITE.url}/#person`;
const SITE_ID = `${SITE.url}/#website`;

export function orgJsonLd(cfg: SiteConfig, services: Service[] = []) {
  const sameAs: string[] = [];
  return {
    '@context': ctx,
    '@type': ['AccountingService', 'ProfessionalService'],
    '@id': ORG_ID,
    name: SITE.name,
    alternateName: SITE.legalName,
    description:
      'Chartered Accountant in Kolkata offering income tax, GST, audit, accounting, loan/CMA and business advisory services for individuals, professionals and MSMEs across India.',
    url: SITE.url + '/',
    logo: `${SITE.url}/icon-512.png`,
    image: `${SITE.url}/icon-512.png`,
    founder: { '@id': PERSON_ID },
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    paymentAccepted: 'UPI, Credit Card, Debit Card, Net Banking',
    ...(cfg.contact_phone && { telephone: cfg.contact_phone }),
    ...(cfg.contact_email && { email: cfg.contact_email }),
    address: {
      '@type': 'PostalAddress',
      ...(cfg.office_address && cfg.office_address !== 'Kolkata, West Bengal, India' && { streetAddress: cfg.office_address }),
      addressLocality: SITE.city,
      addressRegion: SITE.region,
      addressCountry: SITE.country,
    },
    areaServed: [{ '@type': 'City', name: 'Kolkata' }, { '@type': 'State', name: 'West Bengal' }, { '@type': 'Country', name: 'India' }],
    knowsAbout: ['Income tax', 'GST', 'Audit and assurance', 'Accounting and bookkeeping', 'CMA data', 'DSCR', 'Working capital', 'Virtual CFO', 'Financial modelling'],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Chartered accountancy services',
      itemListElement: services.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title, description: s.short_description } })),
    },
    makesOffer: {
      '@type': 'Offer',
      name: 'One-to-one consultation with a Chartered Accountant',
      price: String(SITE.feeRupees),
      priceCurrency: 'INR',
      url: abs('/appointment'),
      availability: 'https://schema.org/InStock',
    },
    ...(sameAs.length && { sameAs }),
  };
}

export const personJsonLd = () => ({
  '@context': ctx,
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'CA S K Basak',
  jobTitle: 'Chartered Accountant & Financial Consultant',
  hasCredential: { '@type': 'EducationalOccupationalCredential', credentialCategory: 'Professional qualification', name: 'Chartered Accountant', recognizedBy: { '@type': 'Organization', name: SITE.memberOf } },
  memberOf: { '@type': 'Organization', name: SITE.memberOf },
  worksFor: { '@id': ORG_ID },
  url: abs('/about'),
  knowsAbout: ['Income tax', 'GST', 'Audit', 'Financial analysis', 'Loan and project advisory', 'Financial modelling'],
});

export const websiteJsonLd = () => ({
  '@context': ctx,
  '@type': 'WebSite',
  '@id': SITE_ID,
  name: SITE.name,
  url: SITE.url + '/',
  publisher: { '@id': ORG_ID },
  inLanguage: 'en-IN',
});

export const serviceJsonLd = (s: { name: string; description: string; url: string; offers?: object[] }) => ({
  '@context': ctx,
  '@type': 'Service',
  name: s.name,
  description: s.description,
  url: s.url,
  provider: { '@id': ORG_ID },
  areaServed: { '@type': 'Country', name: 'India' },
  ...(s.offers && { offers: s.offers }),
});

export const planOffers = (plans: Plan[], url: string) =>
  plans.map((p) => ({
    '@type': 'Offer',
    name: p.name,
    price: String(p.price_inr),
    priceCurrency: 'INR',
    url,
    priceSpecification: { '@type': 'UnitPriceSpecification', price: String(p.price_inr), priceCurrency: 'INR', unitCode: 'MON', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' } },
  }));

export const faqJsonLd = (faqs: Pick<Faq, 'question' | 'answer'>[]) => ({
  '@context': ctx,
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
});

export const articleJsonLd = (a: Article, description: string) => ({
  '@context': ctx,
  '@type': 'Article',
  headline: a.title,
  description,
  articleSection: a.category,
  datePublished: a.published_at,
  dateModified: a.updated_at ?? a.published_at,
  author: { '@id': PERSON_ID, '@type': 'Person', name: 'CA S K Basak', url: abs('/about') },
  publisher: { '@id': ORG_ID },
  mainEntityOfPage: abs(`/resources/${a.slug}`),
  inLanguage: 'en-IN',
  isAccessibleForFree: true,
});

export const breadcrumbJsonLd = (items: [string, string][]) => ({
  '@context': ctx,
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
});

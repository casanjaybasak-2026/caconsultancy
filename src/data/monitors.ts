export interface Monitor {
  slug: string;
  product: string;
  nav: string;
  title: string;        // <title>
  description: string;  // meta description
  h1: string;
  lead: string;
  intro?: string;
  cta: string;
  features: [string, string][];
  why?: { heading: string; body: string };
  disclaimer: string;
}

const billing = 'Recurring subscription billed monthly. Cancel anytime before your next billing date to stop future charges.';

export const MONITORS: Monitor[] = [
  {
    slug: 'business-financial-health-monitor', product: 'financial_health', nav: 'Business Financial Health',
    title: 'Business Financial Health Check & Monthly Ratio Analysis | CA S K Basak',
    description: 'Monthly business financial health monitoring for MSMEs: profitability, cash flow, working capital, debt and key ratios with automated reports and optional CA review.',
    h1: 'Know your business financial health every month',
    lead: 'Upload your monthly financial data and get a clear view of profitability, cash flow, working capital, debt and key financial ratios.',
    cta: 'Start monitoring',
    features: [
      ['Monthly dashboard', 'Revenue, profit, cash and key ratios updated every month.'],
      ['Automated reports', 'A clear PDF report generated automatically after each submission.'],
      ['Historical trends', 'Month-on-month and multi-month trend comparison as data builds up.'],
      ['Optional CA review', 'Add professional review and recommendations on the CA Review plan.'],
    ],
    disclaimer: 'This financial monitoring service is intended for management information and decision support. Scores, ratios and observations depend on the completeness and accuracy of the data you supply and do not guarantee future financial performance. CA review, where selected, is limited to the agreed scope of engagement.',
  },
  {
    slug: 'loan-dscr-monitor', product: 'loan_dscr', nav: 'Loan & DSCR Monitor',
    title: 'DSCR Calculation & Loan Monitoring for Business Loans | CA S K Basak',
    description: 'Monitor DSCR, debt, EMI burden, cash flow and repayment capacity every month from one dashboard. Loan register, renewal readiness and optional CA review.',
    h1: 'Know your business loan health before the bank does',
    lead: 'Monitor DSCR, debt, EMI burden, cash flow and repayment capacity every month from one dashboard.',
    intro: 'Your financial position changes every month. Our monitoring system helps you identify changes in repayment capacity, debt burden and cash-flow coverage before they become major problems.',
    cta: 'Start monitoring',
    features: [
      ['Loan register', 'Track every loan — term loans, cash credit, working capital — in one place.'],
      ['DSCR every month', 'A transparent, documented DSCR calculation, not a black-box number.'],
      ['Renewal readiness', 'See document checklists and maturity dates before they become urgent.'],
      ['Optional CA review', 'Add professional review of exceptions and recommendations on the CA Review plan.'],
    ],
    why: { heading: 'Prepare for your next bank renewal with confidence', body: 'Document checklists, DSCR trends and exception tracking — so renewal conversations start from a position of clarity, not scramble.' },
    disclaimer: 'This service provides financial monitoring and management information based on data supplied by the customer. Calculations, scores and observations are intended for planning and monitoring purposes and are not a guarantee of loan approval, credit sanction or lender decision. Lending decisions are made independently by financial institutions based on their own policies, documentation and assessment. CA review, where selected, is limited to the agreed scope of professional services.',
  },
  {
    slug: 'cash-flow-monitor', product: 'cash_flow', nav: 'Cash Flow & Working Capital',
    title: 'Working Capital & Cash Flow Management for MSMEs | CA S K Basak',
    description: 'Monitor cash flow, receivables, payables and working capital every month with automated financial analysis and optional CA review. Built for Indian MSMEs.',
    h1: 'Know your cash position before it becomes a problem',
    lead: 'Monitor cash flow, receivables, payables and working capital every month with automated financial analysis and optional CA review.',
    intro: 'Profit does not always mean cash. This service helps business owners understand where cash is coming from, where it is going and when additional working capital may be required.',
    cta: 'Start monitoring',
    features: [
      ['Cash flow dashboard', 'Inflow, outflow and operating cash flow, updated every month.'],
      ['Receivables & payables', 'Ageing buckets so you see what is overdue, not just totals.'],
      ['Working capital cycle', 'Cash conversion cycle with receivable, inventory and payable days shown separately.'],
      ['Optional CA review', 'Exception review and professional observations on the CA Review plan.'],
    ],
    disclaimer: 'This service provides management information and financial monitoring based on data supplied by the customer. Forecasts, ratios, working-capital estimates and automated observations are indicative and depend on the assumptions and information provided. They are not guarantees of future cash flows, funding availability or business performance. CA review, where selected, is limited to the agreed scope of professional services.',
  },
  {
    slug: 'receivable-payable-monitor', product: 'receivable_payable', nav: 'Receivable & Payable Collection',
    title: 'Receivables & Payables Collection Management for MSMEs | CA S K Basak',
    description: 'Track receivables, overdue invoices, supplier payments and working-capital pressure from one simple dashboard, with automated ageing and collection priority.',
    h1: 'Get paid faster. Know what you owe.',
    lead: 'Track receivables, overdue invoices, supplier payments and working-capital pressure from one simple dashboard.',
    intro: 'Stop relying on spreadsheets to remember who owes you money and what payments are coming due.',
    cta: 'Start monitoring',
    features: [
      ['Automated ageing', 'Configurable ageing buckets, updated the moment you add or update an invoice.'],
      ['Customer concentration', 'See which customers hold the largest share of your outstanding receivables.'],
      ['Collection priority', 'A transparent, weighted score tells you who to follow up with first.'],
      ['Optional CA review', 'Exception review and professional observations on the CA Review plan.'],
    ],
    disclaimer: 'This service is designed to assist businesses with receivable and payable monitoring, ageing analysis, collection planning and working-capital management based on information supplied by the customer. Automated priorities, forecasts and observations are management-support tools and should not be treated as guarantees of collection, payment or future cash flow. CA review, where selected, is limited to the agreed scope of professional services.',
  },
  {
    slug: 'cma-bank-renewal-monitor', product: 'cma_bank_renewal', nav: 'CMA & Bank Loan Renewal',
    title: 'CMA Data Preparation & Bank Loan Renewal Monitoring | CA S K Basak',
    description: 'Stay bank-ready all year: monitor financial position, loan obligations, working capital and CMA readiness with automated reporting and optional CA review.',
    h1: 'Stay bank-ready all year, not just before renewal',
    lead: 'Continuously monitor your financial position, loan obligations, working capital and CMA readiness with automated reporting and optional CA review.',
    cta: 'Start CMA monitoring',
    features: [
      ['Document readiness', "A live checklist so you know exactly what's ready and what's pending — not the week before renewal."],
      ['Renewal calendar', "Every facility's review, renewal and expiry dates tracked in one place."],
      ['Readiness score', 'A transparent score across financials, ratios, working capital and documentation.'],
      ['Optional CA review', 'Professional review of your CMA data and projections on the CA Review plan.'],
    ],
    why: { heading: "Preparation shouldn't start at the deadline", body: 'Businesses often begin preparing financial documents only shortly before a CC renewal, OD renewal, loan review, or additional finance requirement. This can create pressure, missing information and last-minute errors. This service helps maintain financial readiness throughout the year.' },
    disclaimer: 'This service provides financial monitoring, CMA readiness support and management information based on customer-provided data and configured methodologies. Projections, ratios, working-capital calculations and readiness indicators are intended for planning and internal monitoring purposes. They do not guarantee loan sanction, renewal, enhancement or any decision by a bank or financial institution. Professional CA services, review and certification are subject to applicable professional standards, legal requirements and the agreed scope of engagement.',
  },
  {
    slug: 'monthly-mis-cfo-dashboard', product: 'mis_cfo_dashboard', nav: 'Monthly MIS & CFO Dashboard',
    title: 'Virtual CFO Services & Monthly MIS Reporting for MSMEs | CA S K Basak',
    description: 'Automated monthly MIS, financial KPIs, budget vs actual, cash-flow monitoring and virtual CFO review for Indian MSMEs — one dashboard, every month.',
    h1: 'Your business numbers. One dashboard. Every month.',
    lead: 'Automated MIS, financial KPIs, cash-flow monitoring and management insights designed to help business owners make better financial decisions.',
    intro: 'Most businesses have accounting data but lack timely management information. This service converts financial data into a structured management dashboard.',
    cta: 'Start CFO dashboard',
    features: [
      ['Executive dashboard', 'Every KPI from every module you subscribe to, in one screen — not five different logins.'],
      ['Budget vs actual', 'Enter a monthly budget and see real variance against what actually happened.'],
      ['CFO attention score', 'A transparent priority score across cash, profitability, receivables, debt and budget.'],
      ['Optional CA/CFO review', 'Professional observations and a quarterly business review on Virtual CFO Review.'],
    ],
    disclaimer: 'This service provides management information and financial monitoring based on information supplied by the customer and connected data sources. Automated calculations, trends, forecasts, scores and observations are intended to support management decision-making and depend on the completeness and accuracy of the underlying information. They do not guarantee future financial performance. Professional CA/CFO review, where selected, is limited to the agreed scope of engagement.',
  },
];

export const BILLING_NOTE = billing;

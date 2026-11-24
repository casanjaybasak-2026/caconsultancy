export const MONITORS = [
  'business-financial-health-monitor',
  'loan-dscr-monitor',
  'cash-flow-monitor',
  'receivable-payable-monitor',
  'cma-bank-renewal-monitor',
  'monthly-mis-cfo-dashboard',
] as const;

const SUBS = new Set([
  'dashboard', 'login', 'signup', 'submit', 'payment-status',
  'loans', 'receivables', 'payables', 'actions', 'facilities', 'budget',
]);

/** Paths served by the compiled legacy React app (tools + admin). */
export function isLegacyRoute(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/admin' || p.startsWith('/admin/')) return true;
  const [, first, second, ...rest] = p.split('/');
  return rest.length === 0 && (MONITORS as readonly string[]).includes(first) && !!second && SUBS.has(second);
}

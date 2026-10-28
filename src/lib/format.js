const usd = (d) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: d, maximumFractionDigits: d });
const money0 = usd(0);
const money2 = usd(2);
const money4 = usd(4);
const num1 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const dash = '—';
export const fmtMoney = (n) => (n == null ? dash : money0.format(n));
export const fmtPrice = (n) => (n == null ? dash : money4.format(n)); // per-unit prices are small
export const fmtMoney2 = (n) => (n == null ? dash : money2.format(n));
export const fmtPct = (n) => (n == null ? dash : `${num1.format(n)}%`);
export const fmtHours = (n) => (n == null ? dash : `${num1.format(n)} hrs`);
export const fmtSigned = (n, f) => (n == null ? dash : `${n > 0 ? '+' : n < 0 ? '−' : ''}${f(Math.abs(n))}`);

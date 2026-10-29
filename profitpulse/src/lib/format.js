const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Avoid "-$0" / "-0.0%" from tiny negative values.
const clean = (n, digits) => {
  const f = 10 ** digits;
  const r = Math.round(n * f) / f;
  return r === 0 ? 0 : r;
};

export const fmtUSD = (n) => (Number.isFinite(n) ? usd0.format(clean(n, 0)) : '—');
export const fmtUSD2 = (n) => (Number.isFinite(n) ? usd2.format(clean(n, 2)) : '—');
export const fmtCompact = (n) => (Number.isFinite(n) ? compact.format(n) : '—');
export const fmtInt = (n) => (Number.isFinite(n) ? int.format(n) : '—');
export const fmtNum1 = (n) => (Number.isFinite(n) ? dec1.format(clean(n, 1)) : '—');
export const fmtPct = (n, d = 1) => (Number.isFinite(n) ? `${clean(n, d).toFixed(d)}%` : '—');
export const fmtHours = (n) => (Number.isFinite(n) ? `${dec1.format(clean(n, 1))} hrs` : '—');
export const fmtSignedUSD = (n) => (Number.isFinite(n) ? `${clean(n, 0) > 0 ? '+' : ''}${usd0.format(clean(n, 0))}` : '—');
export const fmtPts = (n) => (Number.isFinite(n) ? `${clean(n, 1) > 0 ? '+' : ''}${clean(n, 1).toFixed(1)} pts` : '—');

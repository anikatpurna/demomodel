// Pure financial logic for ProfitPulse. No React, no I/O.
// Operating cost is treated as the all-in monthly cost and ALREADY includes labor, so labor hours
// are informational only and never added to cost.

export const DEFAULT_THRESHOLD = 15; // minimum acceptable gross margin (%)
export const WATCHLIST_BAND = 5; // "Healthy" starts this many points above the threshold
export const STATUSES = ['Healthy', 'Watchlist', 'At Risk', 'Loss-Making'];
const EPS = 1e-9;

const cents = (n) => Math.round(n * 100) / 100;

/** Gross margin % = profit / revenue × 100. Returns 0 when revenue is not positive (no division by zero). */
export function calcMargin(revenue, cost) {
  if (!(revenue > 0)) return 0;
  return ((revenue - cost) * 100) / revenue;
}

/**
 * Healthy: margin ≥ threshold + 5 (20% by default)
 * Watchlist: threshold ≤ margin < threshold + 5
 * At Risk: 0 ≤ margin < threshold
 * Loss-Making: margin < 0
 */
export function classify(margin, threshold = DEFAULT_THRESHOLD) {
  if (margin >= threshold + WATCHLIST_BAND - EPS) return 'Healthy';
  if (margin >= threshold - EPS) return 'Watchlist';
  if (margin >= -EPS) return 'At Risk';
  return 'Loss-Making';
}

/** Adds profit, margin and status to a customer. The source object is not mutated. */
export function enrich(customer, threshold = DEFAULT_THRESHOLD) {
  const profit = cents(customer.revenue - customer.cost);
  const margin = calcMargin(customer.revenue, customer.cost);
  return { ...customer, profit, margin, status: classify(margin, threshold) };
}

export function enrichAll(customers, threshold = DEFAULT_THRESHOLD) {
  return customers.map((c) => enrich(c, threshold));
}

/** Portfolio totals. Margin = total profit / total revenue (NOT the average of customer margins). */
export function summarize(customers, threshold = DEFAULT_THRESHOLD) {
  const revenue = customers.reduce((s, c) => s + c.revenue, 0);
  const cost = customers.reduce((s, c) => s + c.cost, 0);
  const profit = revenue - cost;
  const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  customers.forEach((c) => { statusCounts[c.status] += 1; });
  const withLabor = customers.filter((c) => c.laborHours > 0);
  return {
    revenue,
    cost,
    profit,
    margin: calcMargin(revenue, cost),
    count: customers.length,
    belowThreshold: customers.filter((c) => c.margin < threshold - EPS).length,
    statusCounts,
    laborHours: withLabor.length ? withLabor.reduce((s, c) => s + c.laborHours, 0) : null,
    laborProfit: withLabor.length ? withLabor.reduce((s, c) => s + c.profit, 0) : null,
  };
}

/** Portfolio result if every customer's operating cost rose by `pct` percent. Originals are untouched. */
export function portfolioAtCostIncrease(customers, pct, threshold = DEFAULT_THRESHOLD) {
  return summarize(
    customers.map((c) => enrich({ ...c, cost: cents(c.cost * (1 + pct / 100)) }, threshold)),
    threshold,
  );
}

/**
 * What-if for one customer: operating cost rises by `pct` percent, revenue is unchanged.
 * Never mutates the customer. Required revenue = simulated cost / (1 − target margin).
 */
export function simulate(customer, pct, threshold = DEFAULT_THRESHOLD) {
  const base = enrich(customer, threshold);
  const cost = cents(customer.cost * (1 + pct / 100));
  const sim = enrich({ ...customer, cost }, threshold);
  const requiredRevenue = threshold < 100 ? cost / (1 - threshold / 100) : Infinity;
  const additionalRevenue = Math.max(0, requiredRevenue - customer.revenue);
  return {
    baseline: base,
    simulated: sim,
    pct,
    costChange: cost - customer.cost,
    profitChange: sim.profit - base.profit,
    marginChange: sim.margin - base.margin, // percentage points
    requiredRevenue,
    additionalRevenue,
    additionalRevenuePct: customer.revenue > 0 ? (additionalRevenue / customer.revenue) * 100 : 0,
  };
}

/** Cost increase (%) at which profit reaches exactly zero. Infinity if cost is 0. */
export function breakevenIncreasePct(customer) {
  return customer.cost > 0 ? (customer.revenue / customer.cost - 1) * 100 : Infinity;
}

/** Cost increase (%) at which margin falls to the threshold. Negative = already below it. */
export function thresholdIncreasePct(customer, threshold = DEFAULT_THRESHOLD) {
  return customer.cost > 0 ? ((customer.revenue * (1 - threshold / 100)) / customer.cost - 1) * 100 : Infinity;
}

/** Margin curve for the simulator chart: one point per `step` percent of cost increase. */
export function marginCurve(customer, maxPct = 30, step = 1) {
  const pts = [];
  for (let p = 0; p <= maxPct + EPS; p += step) {
    const cost = customer.cost * (1 + p / 100);
    pts.push({ pct: p, margin: calcMargin(customer.revenue, cost), profit: customer.revenue - cost });
  }
  return pts;
}

// ---------- Automation ----------

export const AUTOMATION_FIELDS = [
  { key: 'quotes', label: 'Quotes per month', step: 1, integer: true },
  { key: 'manualMin', label: 'Manual preparation (minutes per quote)', step: 1 },
  { key: 'appMin', label: 'App-assisted preparation (minutes per quote)', step: 1 },
  { key: 'rate', label: 'Analyst hourly labor cost ($)', step: 1 },
];
export const FALLBACK_AUTOMATION = { quotes: 40, manualMin: 45, appMin: 8, rate: 35 };

export function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (typeof v !== 'string' || v.trim() === '') return NaN;
  const n = Number(v.trim());
  return Number.isFinite(n) ? n : NaN;
}

export function validateAutomation(values) {
  const errors = {};
  for (const f of AUTOMATION_FIELDS) {
    const n = toNumber(values[f.key]);
    if (Number.isNaN(n)) errors[f.key] = 'Enter a number';
    else if (n < 0) errors[f.key] = 'Cannot be negative';
    else if (f.integer && !Number.isInteger(n)) errors[f.key] = 'Use a whole number';
  }
  return errors;
}

/** Hypothetical time/capacity estimate. Returns null when any input is invalid. */
export function calcAutomation(values) {
  if (Object.keys(validateAutomation(values)).length) return null;
  const q = toNumber(values.quotes);
  const manualHours = (q * toNumber(values.manualMin)) / 60;
  const appHours = (q * toNumber(values.appMin)) / 60;
  const hoursSaved = manualHours - appHours;
  const monthlyValue = hoursSaved * toNumber(values.rate);
  return {
    manualHours,
    appHours,
    hoursSaved,
    reductionPct: manualHours > 0 ? (hoursSaved / manualHours) * 100 : 0,
    monthlyValue,
    annualValue: monthlyValue * 12,
  };
}

/** Default automation assumptions from the dataset (quotes summed; times and rate weighted by quotes). */
export function automationDefaults(customers) {
  const rows = customers.filter((c) => c.quotes > 0);
  if (!rows.length) return { ...FALLBACK_AUTOMATION };
  const quotes = rows.reduce((s, c) => s + c.quotes, 0);
  const weighted = (key, fallback) => {
    const r = rows.filter((c) => c[key] !== null && c[key] !== undefined);
    const w = r.reduce((s, c) => s + c.quotes, 0);
    return w > 0 ? Math.round((r.reduce((s, c) => s + c[key] * c.quotes, 0) / w) * 100) / 100 : fallback;
  };
  return {
    quotes,
    manualMin: weighted('manualMin', FALLBACK_AUTOMATION.manualMin),
    appMin: weighted('appMin', FALLBACK_AUTOMATION.appMin),
    rate: weighted('rate', FALLBACK_AUTOMATION.rate),
  };
}

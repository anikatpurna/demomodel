// Pure calculation + validation logic. No React, no I/O.

// Field definitions for the pricing calculator. `min`/`max` are inclusive unless
// `minExclusive` / `maxExclusive` is set.
export const PRICING_FIELDS = [
  { key: 'employees', label: 'Number of employees', min: 0, step: 1, integer: true },
  { key: 'hourly_wage', label: 'Hourly employee wage ($)', min: 0, step: 0.5 },
  { key: 'hours_per_day', label: 'Hours per day', min: 0, max: 24, step: 0.5 },
  { key: 'days_per_month', label: 'Working days per month', min: 0, max: 31, step: 1 },
  { key: 'payroll_burden_pct', label: 'Payroll burden (%)', min: 0, max: 200, step: 0.5 },
  { key: 'monthly_overhead', label: 'Monthly overhead ($)', min: 0, step: 100 },
  { key: 'monthly_units', label: 'Monthly units processed', min: 0, minExclusive: true, step: 100 },
  { key: 'target_margin_pct', label: 'Target gross profit margin (%)', min: 0, max: 100, maxExclusive: true, step: 0.5 },
];

export const SAVINGS_FIELDS = [
  { key: 'quotes_per_month', label: 'Pricing quotes per month', min: 0, step: 1 },
  { key: 'manual_minutes_per_quote', label: 'Manual minutes per quote', min: 0, step: 1 },
  { key: 'automated_minutes_per_quote', label: 'Automated minutes per quote', min: 0, step: 1 },
  { key: 'analyst_hourly_cost', label: 'Analyst labor cost ($/hour)', min: 0, step: 1 },
];

export const DEFAULT_PRICING = {
  employees: 10,
  hourly_wage: 20,
  hours_per_day: 8,
  days_per_month: 22,
  payroll_burden_pct: 20,
  monthly_overhead: 5000,
  monthly_units: 50000,
  target_margin_pct: 25,
};

export const DEFAULT_SAVINGS = {
  quotes_per_month: 40,
  manual_minutes_per_quote: 45,
  automated_minutes_per_quote: 8,
  analyst_hourly_cost: 35,
};

/** Convert a form value (string or number) to a finite number, or NaN. */
export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string' || value.trim() === '') return NaN;
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : NaN;
}

/** Returns { key: message } for every invalid field. Empty object = valid. */
export function validate(values, fields) {
  const errors = {};
  for (const f of fields) {
    const n = toNumber(values[f.key]);
    if (Number.isNaN(n)) {
      errors[f.key] = 'Enter a number';
    } else if (f.integer && !Number.isInteger(n)) {
      errors[f.key] = 'Must be a whole number';
    } else if (f.min !== undefined && (f.minExclusive ? n <= f.min : n < f.min)) {
      errors[f.key] = f.minExclusive ? `Must be greater than ${f.min}` : `Must be at least ${f.min}`;
    } else if (f.max !== undefined && (f.maxExclusive ? n >= f.max : n > f.max)) {
      errors[f.key] = f.maxExclusive ? `Must be less than ${f.max}` : `Must be at most ${f.max}`;
    }
  }
  return errors;
}

/**
 * Pricing calculation. Returns null if any input is invalid, so callers can
 * never display NaN/Infinity (units > 0 and margin < 100 are enforced by validate).
 */
export function calculatePricing(values) {
  if (Object.keys(validate(values, PRICING_FIELDS)).length > 0) return null;
  const v = Object.fromEntries(PRICING_FIELDS.map((f) => [f.key, toNumber(values[f.key])]));

  const baseLaborCost = v.employees * v.hourly_wage * v.hours_per_day * v.days_per_month;
  const payrollBurdenCost = baseLaborCost * (v.payroll_burden_pct / 100);
  const loadedLaborCost = baseLaborCost + payrollBurdenCost;
  const totalMonthlyCost = loadedLaborCost + v.monthly_overhead;
  const costPerUnit = totalMonthlyCost / v.monthly_units;
  const sellingPricePerUnit = costPerUnit / (1 - v.target_margin_pct / 100);
  const monthlyRevenue = sellingPricePerUnit * v.monthly_units;
  const monthlyProfit = monthlyRevenue - totalMonthlyCost;
  const grossMarginPct = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;

  return {
    baseLaborCost,
    payrollBurdenCost,
    loadedLaborCost,
    monthlyOverhead: v.monthly_overhead,
    totalMonthlyCost,
    costPerUnit,
    sellingPricePerUnit,
    monthlyRevenue,
    monthlyProfit,
    grossMarginPct,
  };
}

/**
 * What happens to the scenario if the company keeps charging the baseline price
 * instead of re-pricing. Returns null if either side is unavailable.
 */
export function calculateAtFixedPrice(scenarioValues, price) {
  const r = calculatePricing(scenarioValues);
  if (!r || !Number.isFinite(price)) return null;
  const units = toNumber(scenarioValues.monthly_units);
  const revenue = price * units;
  const profit = revenue - r.totalMonthlyCost;
  return { revenue, profit, marginPct: revenue > 0 ? (profit / revenue) * 100 : 0 };
}

/** Automation savings. Returns null if any assumption is invalid. */
export function calculateSavings(values) {
  if (Object.keys(validate(values, SAVINGS_FIELDS)).length > 0) return null;
  const v = Object.fromEntries(SAVINGS_FIELDS.map((f) => [f.key, toNumber(values[f.key])]));

  const manualHours = (v.quotes_per_month * v.manual_minutes_per_quote) / 60;
  const automatedHours = (v.quotes_per_month * v.automated_minutes_per_quote) / 60;
  const hoursSaved = manualHours - automatedHours;
  // Guard against division by zero when manual time is 0.
  const reductionPct = manualHours > 0 ? (hoursSaved / manualHours) * 100 : 0;
  const monthlyValue = hoursSaved * v.analyst_hourly_cost;

  return {
    manualHours,
    automatedHours,
    hoursSaved,
    reductionPct,
    monthlyValue,
    annualValue: monthlyValue * 12,
  };
}

/** Absolute and percentage change; pct is null when the baseline is 0. */
export function change(baseline, scenario) {
  if (baseline === null || scenario === null || baseline === undefined || scenario === undefined) return null;
  const abs = scenario - baseline;
  return { abs, pct: baseline !== 0 ? (abs / Math.abs(baseline)) * 100 : null };
}

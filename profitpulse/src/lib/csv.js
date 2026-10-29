import { toNumber } from './analytics.js';

/** Minimal RFC-4180 style parser (quotes, escaped quotes, CRLF, BOM). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const norm = (h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// Accepted header names (after normalization) for each field.
const ALIASES = {
  name: ['customer', 'customer_name', 'name', 'account'],
  revenue: ['monthly_revenue', 'revenue'],
  cost: ['monthly_operating_cost', 'operating_cost', 'monthly_cost', 'cost'],
  units: ['monthly_units', 'units'],
  laborHours: ['monthly_labor_hours', 'labor_hours'],
  quotes: ['quotes_per_month', 'quotes'],
  manualMin: ['manual_minutes_per_quote', 'manual_minutes'],
  appMin: ['app_minutes_per_quote', 'app_minutes', 'automated_minutes_per_quote'],
  rate: ['analyst_hourly_cost', 'analyst_hourly_rate', 'hourly_rate'],
};
const OPTIONAL = ['units', 'laborHours', 'quotes', 'manualMin', 'appMin', 'rate'];
const MAX_ROWS = 500;

export class DataError extends Error {
  constructor(issues) {
    super(issues[0]);
    this.issues = issues;
  }
}

/** Accepts "85000", "$85,000", " 85 000 " style numbers. Returns NaN if it is not a plain number. */
function parseMoney(raw) {
  return toNumber(String(raw ?? '').replace(/[$,\s]/g, ''));
}

/**
 * Parse and validate a customer CSV. Returns { customers, notes }.
 * Throws DataError with a list of human-readable issues (with row numbers) if the file cannot be used.
 */
export function parseCustomers(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new DataError(['The file needs a header row and at least one customer row.']);
  if (rows.length - 1 > MAX_ROWS) throw new DataError([`The file has more than ${MAX_ROWS} customers. Please upload a smaller file.`]);

  const headers = rows[0].map(norm);
  const col = {};
  for (const [field, names] of Object.entries(ALIASES)) col[field] = headers.findIndex((h) => names.includes(h));
  const missing = ['name', 'revenue', 'cost'].filter((f) => col[f] < 0);
  if (missing.length) {
    const label = { name: 'customer', revenue: 'monthly_revenue', cost: 'monthly_operating_cost' };
    throw new DataError([`Missing required column(s): ${missing.map((m) => label[m]).join(', ')}.`]);
  }

  const issues = [];
  const customers = [];
  const seen = new Set();
  rows.slice(1).forEach((r, i) => {
    const line = i + 2; // spreadsheet row number
    const cell = (f) => (col[f] >= 0 ? (r[col[f]] ?? '').trim() : '');
    const name = cell('name');
    if (!name) { issues.push(`Row ${line}: customer name is blank.`); return; }
    const revenue = parseMoney(cell('revenue'));
    const cost = parseMoney(cell('cost'));
    let ok = true;
    if (Number.isNaN(revenue)) { issues.push(`Row ${line} (${name}): monthly_revenue is missing or not a number.`); ok = false; }
    else if (revenue <= 0) { issues.push(`Row ${line} (${name}): monthly_revenue must be greater than 0.`); ok = false; }
    if (Number.isNaN(cost)) { issues.push(`Row ${line} (${name}): monthly_operating_cost is missing or not a number.`); ok = false; }
    else if (cost < 0) { issues.push(`Row ${line} (${name}): monthly_operating_cost cannot be negative.`); ok = false; }
    const optional = {};
    for (const f of OPTIONAL) {
      const raw = cell(f);
      if (raw === '') { optional[f] = null; continue; }
      const v = parseMoney(raw);
      if (Number.isNaN(v) || v < 0) { issues.push(`Row ${line} (${name}): ${ALIASES[f][0]} must be a non-negative number.`); ok = false; }
      optional[f] = v;
    }
    if (!ok) return;
    if (seen.has(name.toLowerCase())) issues.push(`Row ${line}: duplicate customer "${name}".`);
    seen.add(name.toLowerCase());
    customers.push({ id: `c${i}`, name, revenue, cost, ...optional });
  });

  if (issues.length) throw new DataError(issues);
  return { customers, notes: [] };
}

// ---------- Export ----------

// Stop spreadsheet apps from treating a text cell as a formula.
const safe = (v) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
const esc = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows) => rows.map((r) => r.map(esc).join(',')).join('\r\n');
const r2 = (n) => (n === null || n === undefined || !Number.isFinite(n) ? '' : Math.round(n * 100) / 100);

/** Financial summary: portfolio, customers, current simulator scenario and automation estimate. */
export function buildSummaryRows({ datasetLabel, threshold, summary, customers, sim, automationInputs, automation }) {
  const rows = [
    ['ProfitPulse financial summary'],
    ['Dataset', safe(datasetLabel)],
    ['Margin threshold (%)', threshold],
    [],
    ['PORTFOLIO'],
    ['Customers analyzed', summary.count],
    ['Monthly revenue ($)', r2(summary.revenue)],
    ['Monthly operating cost ($)', r2(summary.cost)],
    ['Monthly gross profit ($)', r2(summary.profit)],
    ['Portfolio gross margin (%)', r2(summary.margin)],
    ['Customers below threshold', summary.belowThreshold],
    [],
    ['CUSTOMERS'],
    ['Customer', 'Monthly revenue ($)', 'Monthly operating cost ($)', 'Gross profit ($)', 'Gross margin (%)', 'Monthly units', 'Labor hours', 'Status'],
    ...customers.map((c) => [safe(c.name), r2(c.revenue), r2(c.cost), r2(c.profit), r2(c.margin), c.units ?? '', c.laborHours ?? '', c.status]),
  ];
  if (sim) {
    rows.push(
      [],
      ['COST SCENARIO (what-if)'],
      ['Customer', safe(sim.baseline.name)],
      ['Operating cost increase (%)', sim.pct],
      ['Baseline operating cost ($)', r2(sim.baseline.cost), 'Simulated operating cost ($)', r2(sim.simulated.cost)],
      ['Baseline profit ($)', r2(sim.baseline.profit), 'Simulated profit ($)', r2(sim.simulated.profit)],
      ['Baseline margin (%)', r2(sim.baseline.margin), 'Simulated margin (%)', r2(sim.simulated.margin)],
      ['Baseline status', sim.baseline.status, 'Simulated status', sim.simulated.status],
      ['Additional monthly revenue needed to reach threshold ($)', r2(sim.additionalRevenue)],
    );
  }
  if (automation) {
    rows.push(
      [],
      ['AUTOMATION ESTIMATE (hypothetical)'],
      ['Quotes per month', automationInputs.quotes],
      ['Manual minutes per quote', automationInputs.manualMin],
      ['App-assisted minutes per quote', automationInputs.appMin],
      ['Analyst hourly cost ($)', automationInputs.rate],
      ['Manual hours per month', r2(automation.manualHours)],
      ['App-assisted hours per month', r2(automation.appHours)],
      ['Hours saved per month', r2(automation.hoursSaved)],
      ['Time reduction (%)', r2(automation.reductionPct)],
      ['Estimated monthly labor capacity value ($)', r2(automation.monthlyValue)],
      ['Estimated annual labor capacity value ($)', r2(automation.annualValue)],
    );
  }
  rows.push([], ['NOTE', 'Estimates are hypothetical, not verified cost savings. Freed staff time is not a guaranteed payroll reduction. Demo data is fictional.']);
  return rows;
}

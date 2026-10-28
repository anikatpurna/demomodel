import { PRICING_FIELDS, SAVINGS_FIELDS } from './calc.js';

/** Minimal RFC-4180 style parser (handles quotes, escaped quotes, CRLF). */
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

const normalize = (h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/**
 * Turn CSV text into scenario objects: { name, pricing, savings }.
 * Missing/blank numeric columns are left as '' so the UI flags them rather than guessing.
 * Throws an Error with a user-readable message if the file is unusable.
 */
export function parseScenarios(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('The CSV needs a header row and at least one data row.');
  const headers = rows[0].map(normalize);
  const missing = PRICING_FIELDS.map((f) => f.key).filter((k) => !headers.includes(k));
  if (missing.length) throw new Error(`Missing required column(s): ${missing.join(', ')}`);

  return rows.slice(1).map((r, i) => {
    const get = (key) => {
      const idx = headers.indexOf(key);
      return idx >= 0 && r[idx] !== undefined ? r[idx].trim() : '';
    };
    const name = get('scenario') || get('name') || `Scenario ${i + 1}`;
    return {
      name,
      pricing: Object.fromEntries(PRICING_FIELDS.map((f) => [f.key, get(f.key)])),
      savings: Object.fromEntries(SAVINGS_FIELDS.map((f) => [f.key, get(f.key)])),
    };
  });
}

// Prevent spreadsheet formula injection when a text cell is opened in Excel.
function safeText(value) {
  const s = String(value ?? '');
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function escapeCell(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows) {
  return rows.map((r) => r.map(escapeCell).join(',')).join('\r\n');
}

const fmt = (n, d = 4) => (n === null || n === undefined || Number.isNaN(n) ? '' : Number(n.toFixed(d)));

/**
 * Build the pricing summary export. `data` holds the two scenarios' inputs/results
 * and the savings assumptions/results.
 */
export function buildSummaryRows({ baselineName, scenarioName, baselineInputs, scenarioInputs, baseline, scenario, savingsInputs, savings }) {
  const rows = [['Section', 'Metric', baselineName ? `Baseline (${safeText(baselineName)})` : 'Baseline', scenarioName ? `Scenario (${safeText(scenarioName)})` : 'Scenario', 'Change']];

  PRICING_FIELDS.forEach((f) =>
    rows.push(['Scenario inputs', f.label, baselineInputs[f.key], scenarioInputs[f.key], '']),
  );

  const results = [
    ['Base labor cost ($)', 'baseLaborCost'],
    ['Loaded labor cost ($)', 'loadedLaborCost'],
    ['Total monthly cost ($)', 'totalMonthlyCost'],
    ['Cost per unit ($)', 'costPerUnit'],
    ['Recommended selling price per unit ($)', 'sellingPricePerUnit'],
    ['Monthly revenue ($)', 'monthlyRevenue'],
    ['Monthly profit ($)', 'monthlyProfit'],
    ['Gross margin (%)', 'grossMarginPct'],
  ];
  results.forEach(([label, key]) => {
    const b = baseline ? baseline[key] : null;
    const s = scenario ? scenario[key] : null;
    rows.push(['Calculated results', label, fmt(b), fmt(s), b !== null && s !== null ? fmt(s - b) : '']);
  });

  SAVINGS_FIELDS.forEach((f) => rows.push(['Automation assumptions', f.label, savingsInputs[f.key], '', '']));
  if (savings) {
    [
      ['Manual monthly hours', savings.manualHours],
      ['Automated monthly hours', savings.automatedHours],
      ['Monthly hours saved', savings.hoursSaved],
      ['Reduction in preparation time (%)', savings.reductionPct],
      ['Estimated monthly labor capacity value ($)', savings.monthlyValue],
      ['Annualized labor capacity value ($)', savings.annualValue],
    ].forEach(([label, val]) => rows.push(['Automation estimate', label, fmt(val, 2), '', '']));
  }

  rows.push([]);
  rows.push(['Note', 'All data is fictional. Savings figures are illustrative estimates based on editable assumptions, not verified company savings.', '', '', '']);
  return rows;
}

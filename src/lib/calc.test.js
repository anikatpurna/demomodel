import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePricing, calculateSavings, calculateAtFixedPrice, validate, PRICING_FIELDS, DEFAULT_PRICING, DEFAULT_SAVINGS } from './calc.js';
import { parseScenarios, buildSummaryRows, toCsv } from './csv.js';
import { readFileSync } from 'node:fs';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test('baseline pricing matches hand calculation', () => {
  const r = calculatePricing(DEFAULT_PRICING);
  close(r.baseLaborCost, 10 * 20 * 8 * 22); // 35,200
  close(r.loadedLaborCost, 42240);
  close(r.totalMonthlyCost, 47240);
  close(r.costPerUnit, 0.9448);
  close(r.sellingPricePerUnit, 0.9448 / 0.75);
  close(r.monthlyRevenue, 47240 / 0.75);
  close(r.monthlyProfit, 47240 / 0.75 - 47240);
  close(r.grossMarginPct, 25);
});

test('invalid inputs return null instead of NaN/Infinity', () => {
  assert.equal(calculatePricing({ ...DEFAULT_PRICING, monthly_units: 0 }), null);
  assert.equal(calculatePricing({ ...DEFAULT_PRICING, target_margin_pct: 100 }), null);
  assert.equal(calculatePricing({ ...DEFAULT_PRICING, employees: '' }), null);
  assert.equal(calculatePricing({ ...DEFAULT_PRICING, hourly_wage: -1 }), null);
  assert.equal(calculatePricing({ ...DEFAULT_PRICING, employees: 2.5 }), null);
  assert.deepEqual(Object.keys(validate({ ...DEFAULT_PRICING, monthly_units: 0 }, PRICING_FIELDS)), ['monthly_units']);
});

test('20% volume reduction raises price and keeps target margin', () => {
  const b = calculatePricing(DEFAULT_PRICING);
  const s = calculatePricing({ ...DEFAULT_PRICING, monthly_units: 40000 });
  close(s.sellingPricePerUnit, b.sellingPricePerUnit * 1.25);
  close(s.grossMarginPct, 25);
  const held = calculateAtFixedPrice({ ...DEFAULT_PRICING, monthly_units: 40000 }, b.sellingPricePerUnit);
  assert.ok(held.marginPct < 25);
});

test('automation savings', () => {
  const s = calculateSavings(DEFAULT_SAVINGS);
  close(s.manualHours, 30);
  close(s.automatedHours, (40 * 8) / 60);
  close(s.hoursSaved, 30 - (40 * 8) / 60);
  close(s.reductionPct, (1 - 8 / 45) * 100);
  close(s.monthlyValue, s.hoursSaved * 35);
  close(s.annualValue, s.monthlyValue * 12);
  assert.equal(calculateSavings({ ...DEFAULT_SAVINGS, manual_minutes_per_quote: 0 }).reductionPct, 0);
  assert.equal(calculateSavings({ ...DEFAULT_SAVINGS, quotes_per_month: 'abc' }), null);
});

test('sample CSV parses and exports', () => {
  const scenarios = parseScenarios(readFileSync(new URL('../pricing_dummy_data.csv', import.meta.url), 'utf8'));
  assert.equal(scenarios.length, 5);
  assert.equal(scenarios[0].name, 'Baseline');
  assert.ok(scenarios.every((s) => calculatePricing(s.pricing) && calculateSavings(s.savings)));
  const b = calculatePricing(scenarios[0].pricing);
  const csv = toCsv(buildSummaryRows({
    baselineName: '=evil', scenarioName: 'x', baselineInputs: scenarios[0].pricing, scenarioInputs: scenarios[2].pricing,
    baseline: b, scenario: calculatePricing(scenarios[2].pricing), savingsInputs: scenarios[0].savings, savings: calculateSavings(scenarios[0].savings),
  }));
  assert.match(csv, /Recommended selling price per unit/);
  assert.match(csv, /'=evil/);
  assert.match(csv, /not verified company savings/);
});

test('CSV parser rejects files missing required columns', () => {
  assert.throws(() => parseScenarios('a,b\n1,2'), /Missing required/);
});

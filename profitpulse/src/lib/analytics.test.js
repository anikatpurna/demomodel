import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcMargin, classify, enrichAll, summarize, simulate, portfolioAtCostIncrease, breakevenIncreasePct, thresholdIncreasePct, calcAutomation, automationDefaults, marginCurve } from './analytics.js';
import { parseCustomers, buildSummaryRows, toCsv, DataError } from './csv.js';
import { generateInsights } from './insights.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);
const csv = readFileSync(new URL('../data/customer_profitability_demo.csv', import.meta.url), 'utf8');
const load = () => enrichAll(parseCustomers(csv).customers);
const byName = (list, n) => list.find((c) => c.name === n);

test('demo CSV parses to five customers', () => {
  const { customers } = parseCustomers(csv);
  assert.equal(customers.length, 5);
  assert.deepEqual(customers.map((c) => c.name), ['Atlas Retail', 'Summit Foods', 'Nova Commerce', 'BluePeak Distribution', 'Horizon Logistics']);
});

test('status rules and exact boundaries', () => {
  assert.equal(classify(20), 'Healthy');
  assert.equal(classify(19.99), 'Watchlist');
  assert.equal(classify(15), 'Watchlist');
  assert.equal(classify(14.99), 'At Risk');
  assert.equal(classify(0), 'At Risk');
  assert.equal(classify(-0.01), 'Loss-Making');
  const c = load();
  assert.equal(byName(c, 'Horizon Logistics').status, 'Healthy'); // exactly 20.0%
  assert.equal(byName(c, 'Summit Foods').status, 'Watchlist'); // exactly 15.0%
  assert.equal(byName(c, 'BluePeak Distribution').status, 'At Risk'); // 10.0%
  assert.equal(byName(c, 'Nova Commerce').status, 'Healthy');
});

test('threshold shifts the watchlist band', () => {
  assert.equal(classify(22, 20), 'Watchlist');
  assert.equal(classify(25, 20), 'Healthy');
  assert.equal(classify(19, 20), 'At Risk');
});

test('portfolio margin is total profit / total revenue (not an average of margins)', () => {
  const s = summarize(load());
  assert.equal(s.revenue, 400000);
  assert.equal(s.cost, 314850);
  assert.equal(s.profit, 85150);
  close(s.margin, (85150 / 400000) * 100); // 21.2875
  const avg = load().reduce((a, c) => a + c.margin, 0) / 5;
  assert.ok(Math.abs(avg - s.margin) > 0.1, 'average of margins differs, so the test is meaningful');
  assert.equal(s.belowThreshold, 1); // only BluePeak; Summit is exactly 15%
});

test('BluePeak +15% cost example from the brief', () => {
  const blue = byName(load(), 'BluePeak Distribution');
  const r = simulate(blue, 15);
  assert.equal(r.simulated.cost, 49680);
  assert.equal(r.simulated.profit, -1680);
  close(r.simulated.margin, -3.5);
  assert.equal(r.simulated.status, 'Loss-Making');
  assert.equal(r.baseline.status, 'At Risk');
  assert.equal(r.profitChange, -6480);
  close(r.marginChange, -13.5);
  close(r.requiredRevenue, 49680 / 0.85);
  close(r.additionalRevenue, 49680 / 0.85 - 48000);
});

test('additional revenue never negative; simulation does not mutate source data', () => {
  const atlas = byName(load(), 'Atlas Retail');
  const snapshot = JSON.stringify(atlas);
  const r = simulate(atlas, 0);
  assert.equal(r.additionalRevenue, 0);
  simulate(atlas, 30);
  portfolioAtCostIncrease([atlas], 20);
  assert.equal(JSON.stringify(atlas), snapshot);
});

test('break-even and threshold headroom', () => {
  const blue = byName(load(), 'BluePeak Distribution');
  close(breakevenIncreasePct(blue), (48000 / 43200 - 1) * 100);
  assert.ok(thresholdIncreasePct(blue) < 0); // already below 15%
  close(thresholdIncreasePct(byName(load(), 'Summit Foods')), 0, 1e-9);
  const curve = marginCurve(blue, 30, 1);
  assert.equal(curve.length, 31);
  close(curve[0].margin, 10);
});

test('zero cost / zero revenue do not divide by zero', () => {
  assert.equal(calcMargin(0, 100), 0);
  assert.equal(breakevenIncreasePct({ revenue: 100, cost: 0 }), Infinity);
  assert.ok(Number.isFinite(simulate({ revenue: 100, cost: 0, name: 'x' }, 10).simulated.margin));
});

test('automation defaults come from the dataset and compute correctly', () => {
  const d = automationDefaults(load());
  assert.deepEqual(d, { quotes: 54, manualMin: 45, appMin: 8, rate: 35 });
  const a = calcAutomation(d);
  close(a.manualHours, 54 * 45 / 60);
  close(a.appHours, 54 * 8 / 60);
  close(a.hoursSaved, a.manualHours - a.appHours);
  close(a.reductionPct, (1 - 8 / 45) * 100);
  close(a.annualValue, a.monthlyValue * 12);
  assert.equal(calcAutomation({ ...d, quotes: 'x' }), null);
  assert.equal(calcAutomation({ ...d, manualMin: 0 }).reductionPct, 0);
  assert.deepEqual(automationDefaults([{ revenue: 1, cost: 1 }]), { quotes: 40, manualMin: 45, appMin: 8, rate: 35 });
});

test('CSV validation reports problems with row numbers', () => {
  const bad = (text, re) => assert.throws(() => parseCustomers(text), (e) => e instanceof DataError && re.test(e.issues.join('\n')));
  bad('a,b\n1,2', /Missing required column/);
  bad('customer,monthly_revenue,monthly_operating_cost\nA,0,10', /Row 2.*greater than 0/);
  bad('customer,monthly_revenue,monthly_operating_cost\nA,abc,10', /Row 2.*not a number/);
  bad('customer,monthly_revenue,monthly_operating_cost\nA,10,-5', /cannot be negative/);
  bad('customer,monthly_revenue,monthly_operating_cost\n,10,5', /name is blank/);
  bad('customer,monthly_revenue,monthly_operating_cost\nA,10,5\na,10,5', /duplicate/);
  bad('customer,monthly_revenue,monthly_operating_cost', /header row/);
  const ok = parseCustomers('Customer,Monthly Revenue,"Monthly Operating Cost"\nA,"$10,000","$7,500"');
  assert.equal(ok.customers[0].revenue, 10000);
  assert.equal(ok.customers[0].units, null);
});

test('insights are data-driven and export is safe', () => {
  const customers = load();
  const summary = summarize(customers);
  const ins = generateInsights({ customers, summary, threshold: 15, automation: calcAutomation(automationDefaults(customers)) });
  const titles = ins.map((i) => i.title).join('\n');
  assert.match(titles, /BluePeak Distribution has the lowest gross margin/);
  assert.match(titles, /One customer is below the 15% target margin/);
  assert.match(titles, /15% operating cost increase would make BluePeak Distribution loss-making/);
  assert.match(titles, /Nova Commerce contributes the largest monthly gross profit/);
  assert.match(titles, /Summit Foods is on the watchlist/);
  assert.ok(ins.every((i) => i.evidence && i.action));
  assert.ok(!/AI/.test(titles.replace(/ProfitPulse/g, '')), 'insights never claim to be AI-generated');

  const rows = buildSummaryRows({ datasetLabel: '=evil', threshold: 15, summary, customers, sim: simulate(customers[3], 15), automationInputs: automationDefaults(customers), automation: calcAutomation(automationDefaults(customers)) });
  const out = toCsv(rows);
  assert.match(out, /'=evil/);
  assert.match(out, /hypothetical/i);
  assert.match(out, /-1680/);
});

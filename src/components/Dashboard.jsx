import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { change } from '../lib/calc.js';
import { fmtMoney, fmtPrice, fmtPct, fmtSigned, dash } from '../lib/format.js';

const COLORS = ['#111111', '#d97706', '#9ca3af'];

const units = (n) => new Intl.NumberFormat('en-US').format(n);

function Kpi({ label, value, help }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {help && <div className="kpi-help">{help}</div>}
    </div>
  );
}

/** Step 2: your price. `unitsPerMonth` is the baseline monthly volume (number). */
export function ResultsSection({ result, unitsPerMonth, marginPct }) {
  if (!result) return <p className="warn">Some of your numbers in Step 1 need attention. Fix the highlighted fields to see your price.</p>;
  const pie = [
    { name: 'Wages', value: result.baseLaborCost },
    { name: 'Payroll costs', value: result.payrollBurdenCost },
    { name: 'Other costs', value: result.monthlyOverhead },
  ].filter((d) => d.value > 0);

  return (
    <>
      <div className="hero" aria-live="polite">
        <div className="hero-label">Your recommended price</div>
        <div className="hero-value">{fmtPrice(result.sellingPricePerUnit)} <span>per unit</span></div>
        <p className="hero-text">
          Handling {units(unitsPerMonth)} units a month costs you <strong>{fmtMoney(result.totalMonthlyCost)}</strong>{' '}
          ({fmtPrice(result.costPerUnit)} per unit). Charging {fmtPrice(result.sellingPricePerUnit)} per unit brings in{' '}
          <strong>{fmtMoney(result.monthlyRevenue)}</strong> and leaves <strong>{fmtMoney(result.monthlyProfit)}</strong> profit
          — a {fmtPct(marginPct)} margin.
        </p>
      </div>

      <div className="kpis">
        <Kpi label="Total monthly cost" value={fmtMoney(result.totalMonthlyCost)} help="Wages + payroll costs + other costs" />
        <Kpi label="Cost per unit" value={fmtPrice(result.costPerUnit)} help="What each unit costs you to handle" />
        <Kpi label="Monthly revenue" value={fmtMoney(result.monthlyRevenue)} help="Price × units" />
        <Kpi label="Monthly profit" value={fmtMoney(result.monthlyProfit)} help="Revenue − total cost" />
        <Kpi label="Profit margin" value={fmtPct(result.grossMarginPct)} help="Profit as a share of revenue" />
      </div>

      <h3>Where your money goes</h3>
      <div role="img" aria-label={`Pie chart of monthly cost: ${pie.map((d) => `${d.name} ${fmtMoney(d.value)}`).join(', ')}`}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={pie} dataKey="value" nameKey="name" outerRadius={85} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
              {pie.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => fmtMoney(v)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

const ROWS = [
  { key: 'totalMonthlyCost', label: 'Total monthly cost', f: fmtMoney },
  { key: 'sellingPricePerUnit', label: 'Recommended price per unit', f: fmtPrice },
  { key: 'monthlyRevenue', label: 'Monthly revenue', f: fmtMoney },
  { key: 'monthlyProfit', label: 'Monthly profit', f: fmtMoney },
  { key: 'grossMarginPct', label: 'Profit margin', f: fmtPct },
];

/** Plain-English summary of how the what-if differs from the starting numbers. */
function Summary({ baseline, scenario, atBaselinePrice }) {
  const price = change(baseline.sellingPricePerUnit, scenario.sellingPricePerUnit);
  const profit = change(baseline.monthlyProfit, scenario.monthlyProfit);
  const same = Math.abs(price.abs) < 1e-9 && Math.abs(profit.abs) < 0.005 && Math.abs(scenario.totalMonthlyCost - baseline.totalMonthlyCost) < 0.005;
  if (same) return <p className="note">Nothing has changed yet. Try a quick what-if above, or change the numbers below.</p>;

  const dir = price.abs > 0 ? 'rises' : price.abs < 0 ? 'falls' : 'stays the same';
  return (
    <div className="note">
      <p>
        <strong>To keep your {fmtPct(scenario.grossMarginPct)} margin, your price per unit {dir}</strong>
        {price.abs !== 0 && <> by {fmtPrice(Math.abs(price.abs))}{price.pct !== null && <> ({fmtPct(Math.abs(price.pct))})</>}, to {fmtPrice(scenario.sellingPricePerUnit)}</>}.
      </p>
      {atBaselinePrice && (
        <p>
          <strong>If you do not change your price</strong> ({fmtPrice(baseline.sellingPricePerUnit)}), monthly profit would be{' '}
          {fmtMoney(atBaselinePrice.profit)} instead of {fmtMoney(baseline.monthlyProfit)}
          {' '}({fmtSigned(atBaselinePrice.profit - baseline.monthlyProfit, fmtMoney)}), and your margin would be {fmtPct(atBaselinePrice.marginPct)}.
        </p>
      )}
    </div>
  );
}

/** Step 3: what-if comparison. */
export function ComparisonSection({ baseline, scenario, atBaselinePrice }) {
  if (!baseline) return <p className="warn">Fix the numbers in Step 1 first.</p>;
  if (!scenario) return <p className="warn">Some what-if numbers need attention. Fix the highlighted fields below.</p>;

  const compare = [
    { metric: 'Cost', Today: baseline.totalMonthlyCost, 'What if': scenario.totalMonthlyCost },
    { metric: 'Revenue', Today: baseline.monthlyRevenue, 'What if': scenario.monthlyRevenue },
    { metric: 'Profit', Today: baseline.monthlyProfit, 'What if': scenario.monthlyProfit },
  ];

  return (
    <>
      <Summary baseline={baseline} scenario={scenario} atBaselinePrice={atBaselinePrice} />

      <div className="table-wrap">
        <table>
          <caption className="sr-only">Today compared with the what-if scenario</caption>
          <thead>
            <tr><th scope="col">Per month</th><th scope="col">Today</th><th scope="col">What if</th><th scope="col">Change</th><th scope="col">% change</th></tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const b = baseline[row.key];
              const s = scenario[row.key];
              const c = change(b, s);
              const cls = c && Math.abs(c.abs) > 1e-9 ? (c.abs > 0 ? 'up' : 'down') : '';
              return (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  <td>{row.f(b)}</td>
                  <td>{row.f(s)}</td>
                  <td className={cls}>{c ? fmtSigned(c.abs, row.f) : dash}</td>
                  <td className={cls}>{c && c.pct !== null ? fmtSigned(c.pct, fmtPct) : dash}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div role="img" aria-label="Bar chart comparing today and the what-if scenario for cost, revenue and profit">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={compare} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="metric" />
            <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(v) => fmtMoney(v)} />
            <Legend />
            <Bar dataKey="Today" fill="#9ca3af" />
            <Bar dataKey="What if" fill="#111111" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

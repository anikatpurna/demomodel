import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { change } from '../lib/calc.js';
import { fmtMoney, fmtPrice, fmtPct, fmtSigned, dash } from '../lib/format.js';

const COLORS = ['#2563eb', '#f59e0b', '#64748b'];

function Kpi({ label, value, sub }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

const ROWS = [
  { key: 'totalMonthlyCost', label: 'Total monthly cost', f: fmtMoney },
  { key: 'sellingPricePerUnit', label: 'Recommended price / unit', f: fmtPrice },
  { key: 'monthlyRevenue', label: 'Monthly revenue', f: fmtMoney },
  { key: 'monthlyProfit', label: 'Monthly profit', f: fmtMoney },
  { key: 'grossMarginPct', label: 'Gross margin', f: fmtPct },
];

export default function Dashboard({ baseline, scenario, atBaselinePrice }) {
  const breakdown = (r) =>
    r
      ? [
          { name: 'Base labor', value: r.baseLaborCost },
          { name: 'Payroll burden', value: r.payrollBurdenCost },
          { name: 'Overhead', value: r.monthlyOverhead },
        ].filter((d) => d.value > 0)
      : [];

  const compare = baseline && scenario
    ? [
        { metric: 'Total cost', Baseline: baseline.totalMonthlyCost, Scenario: scenario.totalMonthlyCost },
        { metric: 'Revenue', Baseline: baseline.monthlyRevenue, Scenario: scenario.monthlyRevenue },
        { metric: 'Profit', Baseline: baseline.monthlyProfit, Scenario: scenario.monthlyProfit },
      ]
    : [];

  return (
    <section className="card" aria-labelledby="dash-h">
      <h2 id="dash-h">Financial dashboard</h2>

      {!baseline && <p className="warn">Fix the invalid Baseline inputs to see results.</p>}
      {!scenario && <p className="warn">Fix the invalid Scenario inputs to see results.</p>}

      <h3>Scenario results</h3>
      <div className="kpis">
        <Kpi label="Total monthly cost" value={fmtMoney(scenario?.totalMonthlyCost)} />
        <Kpi label="Recommended price / unit" value={fmtPrice(scenario?.sellingPricePerUnit)} />
        <Kpi label="Projected revenue" value={fmtMoney(scenario?.monthlyRevenue)} />
        <Kpi label="Projected profit" value={fmtMoney(scenario?.monthlyProfit)} />
        <Kpi label="Gross profit margin" value={fmtPct(scenario?.grossMarginPct)} />
      </div>

      <h3>Baseline vs. scenario</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Metric</th><th>Baseline</th><th>Scenario</th><th>Change</th><th>% change</th></tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const b = baseline?.[row.key] ?? null;
              const s = scenario?.[row.key] ?? null;
              const c = change(b, s);
              const cls = c && c.abs !== 0 ? (c.abs > 0 ? 'up' : 'down') : '';
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

      {atBaselinePrice && (
        <p className="note">
          <strong>If the baseline price ({fmtPrice(baseline.sellingPricePerUnit)}/unit) is not changed:</strong> scenario
          revenue would be {fmtMoney(atBaselinePrice.revenue)}, profit {fmtMoney(atBaselinePrice.profit)}, and gross
          margin {fmtPct(atBaselinePrice.marginPct)} (vs. the {fmtPct(scenario.grossMarginPct)} target at the recommended price).
        </p>
      )}

      <div className="charts">
        <div className="chart">
          <h3>Cost breakdown — baseline</h3>
          <CostPie data={breakdown(baseline)} />
        </div>
        <div className="chart">
          <h3>Cost breakdown — scenario</h3>
          <CostPie data={breakdown(scenario)} />
        </div>
        <div className="chart wide">
          <h3>Baseline vs. scenario (monthly $)</h3>
          {compare.length ? (
            <div role="img" aria-label="Bar chart comparing baseline and scenario cost, revenue and profit">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={compare} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => fmtMoney(v)} />
                  <Legend />
                  <Bar dataKey="Baseline" fill="#64748b" />
                  <Bar dataKey="Scenario" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted">No data</p>
          )}
        </div>
      </div>
    </section>
  );
}

function CostPie({ data }) {
  if (!data.length) return <p className="muted">No data</p>;
  return (
    <div role="img" aria-label={`Pie chart of cost breakdown: ${data.map((d) => `${d.name} ${fmtMoney(d.value)}`).join(', ')}`}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={85} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
            {data.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => fmtMoney(v)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

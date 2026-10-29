import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, Receipt, TrendingUp, Percent, AlertTriangle, Users, ArrowRight, CheckCircle2, ShieldAlert, Lightbulb, XCircle, Eye, Info } from 'lucide-react';
import { KpiCard, ChartCard, SectionHeader, ChartTooltip, axisProps, useLabelWidth } from './ui.jsx';
import { portfolioAtCostIncrease } from '../lib/analytics.js';
import { fmtUSD, fmtCompact, fmtPct, fmtInt } from '../lib/format.js';
import { COLORS, PALETTE, STATUS_STYLE } from '../lib/theme.js';

const MAX_ROWS = 12;
const short = (s) => (s.length > 22 ? `${s.slice(0, 21)}…` : s);
const height = (n, per = 46) => Math.max(200, n * per + 48);
const idOf = (d) => d?.payload?.id ?? d?.id;

const LEVEL_ICON = { risk: XCircle, watch: Eye, positive: CheckCircle2, info: Info };
const LEVEL_COLOR = { risk: 'text-loss bg-red-50', watch: 'text-warn bg-amber-50', positive: 'text-profit bg-green-50', info: 'text-blue-600 bg-blue-50' };

export default function Overview({ customers, summary, threshold, onOpenCustomer, goTo, insights }) {
  const labelW = useLabelWidth();
  const rows = useMemo(() => [...customers].sort((a, b) => b.revenue - a.revenue).slice(0, MAX_ROWS), [customers]);
  const p10 = useMemo(() => portfolioAtCostIncrease(customers, 10, threshold), [customers, threshold]);
  const attention = customers.filter((c) => c.margin < threshold - 1e-9).sort((a, b) => a.margin - b.margin);
  const profitable = summary.profit > 0;
  const byProfit = useMemo(() => [...rows].sort((a, b) => b.profit - a.profit), [rows]);
  const byMargin = useMemo(() => [...rows].sort((a, b) => b.margin - a.margin), [rows]);
  const donut = useMemo(() => customers.filter((c) => c.profit > 0).sort((a, b) => b.profit - a.profit).map((c, i) => ({ ...c, fill: PALETTE[i % PALETTE.length] })), [customers]);
  const share = (c) => (summary.profit !== 0 ? (c.profit / summary.profit) * 100 : 0);
  const lossTotal = customers.filter((c) => c.profit < 0).reduce((s, c) => s + c.profit, 0);
  const trimmed = customers.length > MAX_ROWS;

  return (
    <div className="space-y-6">
      <SectionHeader title="Executive Overview" subtitle="How financially healthy is the customer portfolio? Revenue, cost and profit across all customers, per month." />

      {/* 10-second answers */}
      <section aria-label="Key answers" className="pp-fade grid gap-px overflow-hidden rounded-2xl bg-white/10 bg-midnight text-white shadow-lift md:grid-cols-3">
        <div className="bg-midnight p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><CheckCircle2 size={14} aria-hidden="true" />Are we profitable?</p>
          <p className={`mt-2 text-3xl font-semibold ${profitable ? 'text-electric' : 'text-red-400'}`}>{profitable ? 'Yes' : summary.profit === 0 ? 'Break-even' : 'No'}</p>
          <p className="mt-1 text-sm text-slate-300">{fmtUSD(summary.profit)} gross profit a month at a {fmtPct(summary.margin)} margin.</p>
        </div>
        <div className="bg-midnight p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><ShieldAlert size={14} aria-hidden="true" />Which customers need attention?</p>
          <p className={`mt-2 text-3xl font-semibold ${attention.length ? 'text-amber-300' : 'text-electric'}`}>{attention.length ? `${attention.length} below ${fmtPct(threshold, 0)}` : 'None below target'}</p>
          <p className="mt-1 text-sm text-slate-300">
            {attention.length ? attention.slice(0, 3).map((c) => `${c.name} (${fmtPct(c.margin)})`).join(', ') + (attention.length > 3 ? `, +${attention.length - 3} more` : '') : `Every customer is at or above the ${fmtPct(threshold, 0)} margin threshold.`}
          </p>
        </div>
        <div className="bg-midnight p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><TrendingUp size={14} aria-hidden="true" />If operating costs rise 10%?</p>
          <p className="mt-2 text-3xl font-semibold text-white tnum">{fmtPct(p10.margin)} <span className="text-base font-normal text-slate-400">margin</span></p>
          <p className="mt-1 text-sm text-slate-300">
            Profit would be {fmtUSD(p10.profit)}.{' '}
            <button type="button" onClick={() => goTo('simulator')} className="inline-flex items-center gap-1 font-semibold text-electric hover:underline">Try the simulator <ArrowRight size={14} aria-hidden="true" /></button>
          </p>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Total monthly revenue" value={summary.revenue} format={fmtUSD} icon={Banknote} tone="blue" sub={`Across ${summary.count} customers`} tip="Sum of monthly revenue for every customer." />
        <KpiCard label="Total monthly operating costs" value={summary.cost} format={fmtUSD} icon={Receipt} tone="slate" sub={`${fmtPct(summary.revenue ? (summary.cost / summary.revenue) * 100 : 0)} of revenue`} tip="Sum of monthly operating cost. Operating cost already includes labor, so labor is never added again." />
        <KpiCard label="Total monthly gross profit" value={summary.profit} format={fmtUSD} icon={TrendingUp} tone={summary.profit >= 0 ? 'green' : 'red'} sub="Revenue − operating costs" tip="Total revenue minus total operating cost." />
        <KpiCard label="Portfolio gross margin" value={summary.margin} format={(n) => fmtPct(n)} icon={Percent} tone="teal" sub="Total profit ÷ total revenue" tip="Calculated as total profit ÷ total revenue — NOT the average of each customer's margin, so larger customers carry more weight." />
        <KpiCard label={`Customers below ${fmtPct(threshold, 0)} margin`} value={summary.belowThreshold} format={fmtInt} icon={AlertTriangle} tone={summary.belowThreshold ? 'amber' : 'green'} sub={summary.belowThreshold ? 'Review these accounts' : 'All accounts at or above target'} tip="Customers whose gross margin is strictly below your minimum margin threshold (editable in the top bar)." />
        <KpiCard label="Total customers analyzed" value={summary.count} format={fmtInt} icon={Users} tone="slate" sub={`${summary.statusCounts.Healthy} healthy · ${summary.statusCounts.Watchlist} watchlist · ${summary.statusCounts['At Risk'] + summary.statusCounts['Loss-Making']} at risk or loss`} />
      </div>

      {trimmed && <p className="text-xs text-slate-500">Charts show the top {MAX_ROWS} customers by revenue. All {customers.length} customers are included in the totals and in the Customer Profitability table.</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Customer revenue vs. operating cost" subtitle="Click a bar to open the customer." tip="Monthly revenue next to monthly operating cost. A large gap means more gross profit.">
          <div role="img" aria-label={`Bar chart of revenue and operating cost for ${rows.length} customers`}>
            <ResponsiveContainer width="100%" height={height(rows.length, 62)}>
              <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 16 }} barCategoryGap="22%">
                <CartesianGrid horizontal={false} stroke={COLORS.grid} />
                <XAxis type="number" tickFormatter={fmtCompact} {...axisProps} />
                <YAxis type="category" dataKey="name" width={labelW} tickFormatter={short} {...axisProps} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={<ChartTooltip rows={(p) => [{ label: 'Revenue', value: fmtUSD(p.revenue), color: COLORS.revenue }, { label: 'Operating cost', value: fmtUSD(p.cost), color: COLORS.cost }]} />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill={COLORS.revenue} radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d) => onOpenCustomer(idOf(d))} />
                <Bar dataKey="cost" name="Operating cost" fill={COLORS.cost} radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d) => onOpenCustomer(idOf(d))} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Customer profitability comparison" subtitle="Monthly gross profit, colored by status." tip="Gross profit = revenue − operating cost. Bar color shows the profitability status.">
          <div role="img" aria-label="Bar chart of monthly gross profit per customer">
            <ResponsiveContainer width="100%" height={height(byProfit.length, 62)}>
              <BarChart data={byProfit} layout="vertical" margin={{ left: 4, right: 16 }} barCategoryGap="30%">
                <CartesianGrid horizontal={false} stroke={COLORS.grid} />
                <XAxis type="number" tickFormatter={fmtCompact} {...axisProps} />
                <YAxis type="category" dataKey="name" width={labelW} tickFormatter={short} {...axisProps} />
                <ReferenceLine x={0} stroke={COLORS.navy} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={<ChartTooltip rows={(p) => [{ label: 'Gross profit', value: fmtUSD(p.profit), color: STATUS_STYLE[p.status].color }, { label: 'Status', value: p.status, color: STATUS_STYLE[p.status].color }]} />} />
                <Bar dataKey="profit" name="Gross profit" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d) => onOpenCustomer(idOf(d))}>
                  {byProfit.map((c) => <Cell key={c.id} fill={STATUS_STYLE[c.status].color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Gross margin by customer" subtitle={`Dashed line = ${fmtPct(threshold, 0)} minimum margin.`} tip="Gross margin = profit ÷ revenue. Customers left of the dashed line are below your minimum margin.">
          <div role="img" aria-label="Bar chart of gross margin per customer with the minimum margin marked">
            <ResponsiveContainer width="100%" height={height(byMargin.length, 54)}>
              <BarChart data={byMargin} layout="vertical" margin={{ left: 4, right: 24 }} barCategoryGap="30%">
                <CartesianGrid horizontal={false} stroke={COLORS.grid} />
                <XAxis type="number" tickFormatter={(v) => `${v}%`} {...axisProps} />
                <YAxis type="category" dataKey="name" width={labelW} tickFormatter={short} {...axisProps} />
                <ReferenceLine x={0} stroke={COLORS.navy} />
                <ReferenceLine x={threshold} stroke="#D97706" strokeDasharray="5 4" strokeWidth={2} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={<ChartTooltip rows={(p) => [{ label: 'Gross margin', value: fmtPct(p.margin), color: STATUS_STYLE[p.status].color }, { label: 'Status', value: p.status, color: STATUS_STYLE[p.status].color }]} />} />
                <Bar dataKey="margin" name="Gross margin" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d) => onOpenCustomer(idOf(d))}>
                  {byMargin.map((c) => <Cell key={c.id} fill={STATUS_STYLE[c.status].color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Profit contribution by customer" subtitle="Share of total monthly gross profit." tip="Each customer's gross profit as a percentage of the portfolio's total gross profit. Loss-making customers reduce the total and are listed separately.">
          {donut.length ? (
            <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="relative" role="img" aria-label={`Donut chart of profit contribution: ${donut.map((c) => `${c.name} ${fmtPct(share(c))}`).join(', ')}`}>
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={donut} dataKey="profit" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={2} stroke="none" onClick={(d) => onOpenCustomer(idOf(d))} cursor="pointer">
                      {donut.map((c) => <Cell key={c.id} fill={c.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip title={(p) => p.name} rows={(p) => [{ label: 'Gross profit', value: fmtUSD(p.profit), color: p.fill }, { label: 'Share of profit', value: fmtPct(share(p)), color: p.fill }]} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div><p className="text-xs text-slate-500">Total profit</p><p className="text-lg font-semibold tnum">{fmtCompact(summary.profit)}</p></div>
                </div>
              </div>
              <ul className="space-y-1.5 text-sm">
                {donut.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => onOpenCustomer(c.id)} className="flex min-w-0 items-center gap-2 text-left hover:underline"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.fill }} /><span className="truncate">{c.name}</span></button>
                    <span className="tnum font-semibold">{fmtPct(share(c))}</span>
                  </li>
                ))}
                {lossTotal < 0 && <li className="mt-2 border-t border-slate-200 pt-2 text-xs text-loss">Loss-making customers reduce portfolio profit by {fmtUSD(-lossTotal)}.</li>}
              </ul>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">No customer currently has a positive gross profit.</p>
          )}
        </ChartCard>
      </div>

      {/* Insights preview */}
      <section className="card p-5" aria-labelledby="ov-ins">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 id="ov-ins" className="flex items-center gap-2 text-base font-semibold"><Lightbulb size={18} className="text-electric-dark" aria-hidden="true" />Executive insights</h3>
          <button type="button" className="btn !min-h-0 !py-1.5" onClick={() => goTo('insights')}>View all insights <ArrowRight size={14} aria-hidden="true" /></button>
        </div>
        <ul className="grid gap-3 md:grid-cols-3">
          {insights.filter((i) => i.level !== 'info').slice(0, 3).map((i) => {
            const Icon = LEVEL_ICON[i.level];
            return (
              <li key={i.id} className="rounded-xl border border-slate-200 p-3.5">
                <p className="flex items-start gap-2 text-sm font-semibold"><span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg ${LEVEL_COLOR[i.level]}`}><Icon size={14} aria-hidden="true" /></span>{i.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{i.detail}</p>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-500">Rules-based analysis of the figures above — not a live AI model.</p>
      </section>
    </div>
  );
}

import React, { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, ArrowDown, ArrowUp, RotateCcw, Target, Info, TrendingDown, ShieldCheck } from 'lucide-react';
import { SectionHeader, StatusBadge, AnimatedValue, InfoTip, ChartCard, ChartTooltip, axisProps, EmptyState } from './ui.jsx';
import { simulate, marginCurve, breakevenIncreasePct, thresholdIncreasePct } from '../lib/analytics.js';
import { fmtUSD, fmtSignedUSD, fmtPct, fmtPts, fmtCompact } from '../lib/format.js';
import { COLORS, STATUS_STYLE } from '../lib/theme.js';

const PRESETS = [5, 10, 15, 20];
const MAX_PCT = 30;
const pctLabel = (p) => `${Number.isInteger(p) ? p : p.toFixed(1)}%`;

function explain(r, threshold) {
  const { baseline: b, simulated: s } = r;
  const t = pctLabel(threshold);
  if (r.pct === 0) {
    return `At today's costs, ${b.name} earns ${fmtUSD(b.profit)} a month (${fmtPct(b.margin)} margin) and is ${b.status}. Move the slider or pick a preset to see how rising operating costs would change that.`;
  }
  let text = `A ${pctLabel(r.pct)} rise in operating costs adds ${fmtUSD(r.costChange)} a month. With revenue unchanged, ${b.name}'s profit moves from ${fmtUSD(b.profit)} to ${fmtUSD(s.profit)} and its margin from ${fmtPct(b.margin)} to ${fmtPct(s.margin)}.`;
  text += s.status !== b.status ? ` That moves the account from ${b.status} to ${s.status}.` : ` The account stays ${s.status}.`;
  if (s.status === 'Loss-Making') text += ' It would lose money every month at this cost level.';
  text += r.additionalRevenue > 0
    ? ` To restore a ${t} margin with costs at this level, monthly revenue would need to rise by ${fmtUSD(r.additionalRevenue)} (${fmtPct(r.additionalRevenuePct)}), to ${fmtUSD(r.requiredRevenue)} — for example through repricing, which is a management decision to evaluate.`
    : ` Revenue already supports a ${t} margin at this cost level.`;
  return text;
}

function Delta({ value, format, upIsGood }) {
  if (Math.abs(value) < 1e-9 || !Number.isFinite(value)) return <span className="text-xs text-slate-400">no change</span>;
  const up = value > 0;
  const good = up === upIsGood;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${good ? 'text-profit' : 'text-loss'}`}>
      <Icon size={12} aria-hidden="true" />{format(value)}
    </span>
  );
}

function Row({ label, children, delta }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right">
        <div className="tnum text-lg font-semibold">{children}</div>
        {delta && <div className="mt-0.5">{delta}</div>}
      </dd>
    </div>
  );
}

export default function Simulator({ customers, threshold, customerId, setCustomerId, pct, setPct }) {
  const customer = customers.find((c) => c.id === customerId) ?? customers[0];
  const r = useMemo(() => (customer ? simulate(customer, pct, threshold) : null), [customer, pct, threshold]);
  const curve = useMemo(() => (customer ? marginCurve(customer, MAX_PCT, 1) : []), [customer]);
  if (!customer || !r) return <EmptyState title="No customers to simulate">Upload a dataset with at least one customer.</EmptyState>;

  const { baseline: b, simulated: s } = r;
  const sStyle = STATUS_STYLE[s.status];
  const be = breakevenIncreasePct(customer);
  const room = thresholdIncreasePct(customer, threshold);
  const lo = Math.floor(Math.min(...curve.map((d) => d.margin), -2) / 5) * 5;
  const hi = Math.ceil(Math.max(...curve.map((d) => d.margin), threshold + 7) / 5) * 5;
  const stepY = hi - lo > 45 ? 10 : 5;
  const yTicks = [];
  for (let v = Math.ceil(lo / stepY) * stepY; v <= hi; v += stepY) yTicks.push(v);
  const barData = [
    { name: 'Revenue', Baseline: b.revenue, Simulated: s.revenue },
    { name: 'Operating cost', Baseline: b.cost, Simulated: s.cost },
    { name: 'Gross profit', Baseline: b.profit, Simulated: s.profit },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Scenario Simulator" subtitle="What happens to profitability when operating costs increase? Pick a customer, then drag the slider. Your original data is never changed." />

      {/* Customer selector */}
      <section aria-label="Choose a customer" className="card p-4">
        <p className="eyebrow mb-3">1 · Choose a customer</p>
        {customers.length <= 8 ? (
          <div className="flex flex-wrap gap-2">
            {customers.map((c) => {
              const on = c.id === customer.id;
              return (
                <button key={c.id} type="button" aria-pressed={on} onClick={() => setCustomerId(c.id)} className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-left text-sm transition ${on ? 'border-electric bg-electric-soft/50 shadow-[0_0_0_2px_#14B8A6]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLE[c.status].dot}`} aria-hidden="true" />
                  <span><span className="block font-semibold">{c.name}</span><span className="tnum block text-xs text-slate-500">{fmtPct(c.margin)} margin · {c.status}</span></span>
                </button>
              );
            })}
          </div>
        ) : (
          <select className="input max-w-md" value={customer.id} onChange={(e) => setCustomerId(e.target.value)} aria-label="Customer to simulate">
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {fmtPct(c.margin)} ({c.status})</option>)}
          </select>
        )}
      </section>

      {/* Control panel */}
      <section aria-label="Cost increase control" className="overflow-hidden rounded-2xl bg-midnight p-5 text-white shadow-lift sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">2 · Increase operating costs by<InfoTip dark align="left" text="Applies the same percentage increase to this customer's monthly operating cost. Revenue is held constant so you can see the pure cost effect." /></p>
            <p className="mt-1 flex items-baseline gap-3">
              <span className="text-6xl font-semibold tracking-tight text-electric sm:text-7xl" aria-live="polite"><AnimatedValue value={pct} format={(v) => `+${v.toFixed(Number.isInteger(pct) ? 0 : 1)}%`} /></span>
              <span className="text-sm text-slate-400">= {fmtSignedUSD(r.costChange)} / month</span>
            </p>
            <div className="mt-6">
              <input
                type="range" className="pp-range" min={0} max={MAX_PCT} step={0.5} value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                style={{ '--fill': `${(pct / MAX_PCT) * 100}%` }}
                aria-label="Operating cost increase percentage" aria-valuetext={`${pctLabel(pct)} increase`}
              />
              <div className="mt-2 flex justify-between text-xs text-slate-400" aria-hidden="true">
                {[0, 5, 10, 15, 20, 25, 30].map((t) => <span key={t}>{t}%</span>)}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Preset scenarios">
              {PRESETS.map((p) => (
                <button key={p} type="button" aria-pressed={pct === p} onClick={() => setPct(p)} className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${pct === p ? 'border-electric bg-electric text-navy' : 'border-white/20 bg-white/5 text-white hover:bg-white/15'}`}>+{p}% operating cost</button>
              ))}
              <button type="button" onClick={() => setPct(0)} disabled={pct === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-40"><RotateCcw size={14} aria-hidden="true" />Reset scenario</button>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-4 lg:w-72" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Profitability risk status<InfoTip dark align="right" text={`Healthy ≥ ${pctLabel(threshold + 5)} · Watchlist ≥ ${pctLabel(threshold)} · At Risk ≥ 0% · Loss-Making < 0%. The minimum margin is editable in the top bar.`} /></p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={b.status} />
              {s.status !== b.status ? <><ArrowRight size={16} className="text-slate-400" aria-hidden="true" /><StatusBadge status={s.status} size="lg" /></> : <span className="text-xs text-slate-400">no status change</span>}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              {Number.isFinite(be) && <>Break-even at <strong className="text-white">+{pctLabel(be)}</strong> cost. </>}
              {room > 0 ? <>Margin stays above {pctLabel(threshold)} up to <strong className="text-white">+{pctLabel(room)}</strong>.</> : <>Already below the {pctLabel(threshold)} minimum.</>}
            </p>
          </div>
        </div>
      </section>

      {/* Side by side */}
      <section aria-label="Baseline versus simulated scenario" className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between"><h3 className="text-base font-semibold">Baseline</h3><span className="eyebrow">Current data</span></div>
          <dl className="mt-2">
            <Row label="Monthly revenue">{fmtUSD(b.revenue)}</Row>
            <Row label="Operating cost">{fmtUSD(b.cost)}</Row>
            <Row label="Gross profit"><span className={b.profit < 0 ? 'text-loss' : ''}>{fmtUSD(b.profit)}</span></Row>
            <Row label="Gross margin"><span className={b.margin < 0 ? 'text-loss' : ''}>{fmtPct(b.margin)}</span></Row>
            <Row label="Status"><StatusBadge status={b.status} /></Row>
          </dl>
        </div>
        <div className="hidden items-center md:flex" aria-hidden="true"><span className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card"><ArrowRight size={18} className="text-slate-400" /></span></div>
        <div className="card p-5 transition-all duration-300" style={{ boxShadow: `0 0 0 2px ${sStyle.color}, 0 8px 24px rgba(11,18,32,0.10)` }}>
          <div className="flex items-center justify-between"><h3 className="text-base font-semibold">Simulated <span className="text-slate-500">(+{pctLabel(pct)} cost)</span></h3><span className="eyebrow">Scenario</span></div>
          <dl className="mt-2">
            <Row label="Monthly revenue">{fmtUSD(s.revenue)}</Row>
            <Row label="New operating cost" delta={<Delta value={r.costChange} format={fmtSignedUSD} upIsGood={false} />}><AnimatedValue value={s.cost} format={fmtUSD} /></Row>
            <Row label="New monthly profit" delta={<Delta value={r.profitChange} format={fmtSignedUSD} upIsGood />}><AnimatedValue value={s.profit} format={fmtUSD} className={s.profit < 0 ? 'text-loss' : ''} /></Row>
            <Row label="New gross margin" delta={<Delta value={r.marginChange} format={fmtPts} upIsGood />}><AnimatedValue value={s.margin} format={(v) => fmtPct(v)} className={s.margin < 0 ? 'text-loss' : ''} /></Row>
            <Row label="Status"><StatusBadge status={s.status} /></Row>
          </dl>
        </div>
      </section>

      {/* What it means + required revenue */}
      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3" aria-labelledby="meaning" aria-live="polite">
          <h3 id="meaning" className="flex items-center gap-2 text-base font-semibold"><Info size={17} className="text-electric-dark" aria-hidden="true" />What this means for the business</h3>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-700">{explain(r, threshold)}</p>
        </section>
        <section className="card p-5 lg:col-span-2" aria-labelledby="req">
          <h3 id="req" className="flex items-center gap-2 text-base font-semibold"><Target size={17} className="text-electric-dark" aria-hidden="true" />Revenue needed for a {pctLabel(threshold)} margin
            <InfoTip align="right" text={`Required revenue = simulated operating cost ÷ (1 − ${threshold / 100}). Additional revenue = MAX(0, required revenue − current revenue). Costs are held at the simulated level.`} />
          </h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Required monthly revenue</dt><dd className="tnum font-semibold">{fmtUSD(r.requiredRevenue)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Current monthly revenue</dt><dd className="tnum font-semibold">{fmtUSD(customer.revenue)}</dd></div>
          </dl>
          <div className={`mt-3 rounded-xl p-3 ${r.additionalRevenue > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{r.additionalRevenue > 0 ? <TrendingDown size={13} aria-hidden="true" /> : <ShieldCheck size={13} aria-hidden="true" />}Additional revenue needed</p>
            <p className="tnum mt-1 text-2xl font-semibold"><AnimatedValue value={r.additionalRevenue} format={fmtUSD} /><span className="text-sm font-normal text-slate-500"> / month</span></p>
            <p className="mt-0.5 text-xs text-slate-600">{r.additionalRevenue > 0 ? `${fmtPct(r.additionalRevenuePct)} above current revenue` : 'Current revenue already meets the target.'}</p>
          </div>
        </section>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Margin as operating costs rise" subtitle={`${customer.name}: background bands show the status zones; the dot is your current scenario.`} tip="Each point shows gross margin if operating cost rose by that percentage with revenue unchanged.">
          <div role="img" aria-label={`Line chart of ${customer.name} gross margin from 0 to 30 percent cost increase. At ${pctLabel(pct)} the margin is ${fmtPct(s.margin)}.`}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={curve} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <defs><linearGradient id="mfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.profit} stopOpacity={0.25} /><stop offset="100%" stopColor={COLORS.profit} stopOpacity={0} /></linearGradient></defs>
                <ReferenceArea y1={-1000} y2={0} fill="#DC2626" fillOpacity={0.08} ifOverflow="hidden" />
                <ReferenceArea y1={0} y2={threshold} fill="#EA580C" fillOpacity={0.07} ifOverflow="hidden" />
                <ReferenceArea y1={threshold} y2={threshold + 5} fill="#D97706" fillOpacity={0.08} ifOverflow="hidden" />
                <ReferenceArea y1={threshold + 5} y2={1000} fill="#16A34A" fillOpacity={0.07} ifOverflow="hidden" />
                <CartesianGrid stroke={COLORS.grid} vertical={false} />
                <XAxis type="number" dataKey="pct" domain={[0, MAX_PCT]} ticks={[0, 5, 10, 15, 20, 25, 30]} tickFormatter={(v) => `+${v}%`} {...axisProps} />
                <YAxis tickFormatter={(v) => `${Math.round(v)}%`} width={46} domain={[lo, hi]} ticks={yTicks} allowDataOverflow {...axisProps} />
                <ReferenceLine y={0} stroke={COLORS.loss} strokeDasharray="4 4" label={{ value: 'Break-even', position: 'insideBottomRight', fill: COLORS.loss, fontSize: 11 }} />
                <ReferenceLine y={threshold} stroke="#D97706" strokeDasharray="4 4" label={{ value: `${pctLabel(threshold)} minimum`, position: 'insideTopRight', fill: '#B45309', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip title={(p) => `+${p.pct}% operating cost`} rows={(p) => [{ label: 'Gross margin', value: fmtPct(p.margin), color: COLORS.profit }, { label: 'Gross profit', value: fmtUSD(p.profit), color: COLORS.revenue }]} />} />
                <Area type="monotone" dataKey="margin" stroke={COLORS.profit} strokeWidth={2.5} fill="url(#mfill)" isAnimationActive={false} />
                <ReferenceLine x={pct} stroke={sStyle.color} strokeOpacity={0.5} />
                <ReferenceDot x={pct} y={s.margin} r={8} fill={sStyle.color} stroke="#fff" strokeWidth={3} ifOverflow="extendDomain" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Baseline vs. simulated scenario" subtitle="Monthly revenue, operating cost and gross profit." tip="Grey bars are today's numbers. Colored bars are the simulation; the color matches the simulated status.">
          <div role="img" aria-label={`Bar chart comparing baseline and simulated revenue, operating cost and gross profit for ${customer.name}`}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} barGap={6}>
                <CartesianGrid stroke={COLORS.grid} vertical={false} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis tickFormatter={fmtCompact} width={56} {...axisProps} />
                <ReferenceLine y={0} stroke={COLORS.navy} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={<ChartTooltip title={(p) => p.name} rows={(p) => [{ label: 'Baseline', value: fmtUSD(p.Baseline), color: COLORS.cost }, { label: 'Simulated', value: fmtUSD(p.Simulated), color: sStyle.color }]} />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Baseline" fill={COLORS.cost} radius={[6, 6, 0, 0]} animationDuration={300} />
                <Bar dataKey="Simulated" fill={sStyle.color} radius={[6, 6, 0, 0]} animationDuration={300}>
                  {barData.map((d) => <Cell key={d.name} fill={d.name === 'Gross profit' ? (s.profit >= 0 ? COLORS.profit : COLORS.loss) : d.name === 'Operating cost' ? sStyle.color : COLORS.revenue} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

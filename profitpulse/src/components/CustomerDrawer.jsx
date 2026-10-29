import React, { useEffect, useRef } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { X, SlidersHorizontal } from 'lucide-react';
import { StatusBadge, ChartTooltip, InfoTip, axisProps } from './ui.jsx';
import { breakevenIncreasePct, thresholdIncreasePct } from '../lib/analytics.js';
import { fmtUSD, fmtUSD2, fmtPct, fmtPts, fmtInt, fmtCompact } from '../lib/format.js';
import { COLORS, STATUS_STYLE } from '../lib/theme.js';

function Metric({ label, value, tip, tone = '' }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}{tip && <InfoTip text={tip} align="left" />}</p>
      <p className={`tnum mt-0.5 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export default function CustomerDrawer({ customer: c, summary, threshold, onClose, onSimulate }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [onClose]);

  const style = STATUS_STYLE[c.status];
  const be = breakevenIncreasePct(c);
  const room = thresholdIncreasePct(c, threshold);
  const data = [
    { name: 'Revenue', value: c.revenue, fill: COLORS.revenue },
    { name: 'Operating cost', value: c.cost, fill: COLORS.cost },
    { name: 'Gross profit', value: c.profit, fill: c.profit >= 0 ? COLORS.profit : COLORS.loss },
  ];
  const gaugeMax = Math.max(40, threshold + 15, Math.ceil(c.margin / 5) * 5);
  const pos = (m) => `${Math.max(0, Math.min(100, (m / gaugeMax) * 100))}%`;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-navy/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <aside role="dialog" aria-modal="true" aria-labelledby="drawer-title" className="pp-slide absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5" style={{ borderTop: `4px solid ${style.color}` }}>
          <div>
            <p className="eyebrow">Customer detail</p>
            <h2 id="drawer-title" className="mt-1 text-2xl font-semibold tracking-tight">{c.name}</h2>
            <div className="mt-2"><StatusBadge status={c.status} size="lg" /></div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="btn !min-h-0 !p-2" aria-label="Close customer detail"><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Monthly revenue" value={fmtUSD(c.revenue)} />
            <Metric label="Operating cost" value={fmtUSD(c.cost)} tip="Monthly operating cost. Includes labor." />
            <Metric label="Gross profit" value={fmtUSD(c.profit)} tone={c.profit < 0 ? 'text-loss' : ''} tip="Revenue − operating cost." />
            <Metric label="Gross margin" value={fmtPct(c.margin)} tone={c.margin < 0 ? 'text-loss' : ''} tip="Gross profit ÷ revenue." />
          </div>

          <section aria-label="Margin position">
            <p className="mb-2 text-sm font-semibold">Margin position</p>
            <div className="relative h-3 rounded-full bg-slate-100">
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: pos(c.margin), background: style.color }} />
              <div className="absolute -top-1 h-5 w-0.5 bg-amber-600" style={{ left: pos(threshold) }} title={`Minimum margin ${fmtPct(threshold, 0)}`} />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-slate-500"><span>0%</span><span className="text-amber-700">{fmtPct(threshold, 0)} minimum</span><span>{gaugeMax}%</span></div>
            <p className="mt-2 text-sm text-slate-600">{fmtPts(c.margin - summary.margin)} vs. the portfolio margin of {fmtPct(summary.margin)}.</p>
          </section>

          <section aria-label="Revenue, cost and profit">
            <p className="mb-2 text-sm font-semibold">Revenue, cost and profit</p>
            <div role="img" aria-label={`Bar chart: revenue ${fmtUSD(c.revenue)}, operating cost ${fmtUSD(c.cost)}, gross profit ${fmtUSD(c.profit)}`}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke={COLORS.grid} />
                  <XAxis dataKey="name" {...axisProps} />
                  <YAxis tickFormatter={fmtCompact} width={52} {...axisProps} />
                  <ReferenceLine y={0} stroke={COLORS.navy} />
                  <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={<ChartTooltip title={(p) => p.name} rows={(p) => [{ label: p.name, value: fmtUSD(p.value), color: p.fill }]} />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>{data.map((d) => <Cell key={d.name} fill={d.fill} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section aria-label="Portfolio position" className="grid grid-cols-2 gap-3">
            <Metric label="Share of portfolio revenue" value={fmtPct(summary.revenue ? (c.revenue / summary.revenue) * 100 : 0)} />
            <Metric label="Share of portfolio profit" value={summary.profit > 0 ? fmtPct((c.profit / summary.profit) * 100) : '—'} />
            <Metric label="Break-even cost increase" value={Number.isFinite(be) ? fmtPct(be) : '—'} tip="How much operating cost could rise (revenue unchanged) before profit reaches $0." />
            <Metric label={`Headroom to ${fmtPct(threshold, 0)} margin`} value={room > 0 ? `${fmtPct(room)} cost rise` : 'Already below'} tip="How much operating cost could rise before the margin falls to your minimum margin." tone={room > 0 ? '' : 'text-loss'} />
            {c.units > 0 && <Metric label="Revenue per unit" value={fmtUSD2(c.revenue / c.units)} />}
            {c.units > 0 && <Metric label="Cost per unit" value={fmtUSD2(c.cost / c.units)} />}
            {c.units > 0 && <Metric label="Profit per unit" value={fmtUSD2(c.profit / c.units)} tone={c.profit < 0 ? 'text-loss' : ''} />}
            {c.units !== null && <Metric label="Monthly units" value={fmtInt(c.units)} />}
            {c.laborHours > 0 && <Metric label="Labor hours" value={fmtInt(c.laborHours)} tip="Context only — labor is already inside operating cost and is not added again." />}
            {c.laborHours > 0 && <Metric label="Profit per labor hour" value={fmtUSD2(c.profit / c.laborHours)} tone={c.profit < 0 ? 'text-loss' : ''} />}
          </section>
        </div>

        <div className="border-t border-slate-200 p-4">
          <button type="button" className="btn btn-primary w-full" onClick={() => onSimulate(c.id)}><SlidersHorizontal size={16} aria-hidden="true" /> Simulate a cost increase for {c.name}</button>
        </div>
      </aside>
    </div>
  );
}

import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { Clock, Zap, Hourglass, TrendingDown, CalendarClock, CalendarRange, RotateCcw, AlertTriangle } from 'lucide-react';
import { SectionHeader, KpiCard, ChartCard, NumberField, ChartTooltip, axisProps } from './ui.jsx';
import { AUTOMATION_FIELDS, validateAutomation } from '../lib/analytics.js';
import { fmtHours, fmtPct, fmtUSD, fmtNum1 } from '../lib/format.js';
import { COLORS } from '../lib/theme.js';

const HINTS = {
  quotes: 'Pricing quotes and profitability analyses prepared each month.',
  manualMin: 'Time to prepare one by hand in Excel.',
  appMin: 'Time to prepare one with the app.',
  rate: 'Cost of one analyst hour. Defaults to $35 if the data has no rate.',
};

export default function Efficiency({ inputs, onChange, onReset, result, fromData }) {
  const errors = validateAutomation(inputs);
  const chart = result ? [
    { name: 'Manual process', hours: result.manualHours, fill: COLORS.cost },
    { name: 'App-assisted', hours: result.appHours, fill: COLORS.profit },
  ] : [];

  return (
    <div className="space-y-6">
      <SectionHeader title="Efficiency & Automation Value" subtitle="How much staff time could we potentially save by automating repetitive analysis?">
        <button type="button" className="btn" onClick={onReset}><RotateCcw size={15} aria-hidden="true" />Reset assumptions</button>
      </SectionHeader>

      <p role="note" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span><strong>Hypothetical estimates, not verified cost savings.</strong> Hours saved are freed analyst capacity. They do not represent guaranteed payroll reductions, and the dollar value only becomes a real saving if that time is actually eliminated or redirected.</span>
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <section className="card h-fit space-y-4 p-5" aria-labelledby="assump">
          <h3 id="assump" className="text-base font-semibold">Assumptions</h3>
          <p className="text-xs text-slate-500">{fromData ? 'Starting values come from the dataset (quotes are summed across customers). Edit any value.' : 'The dataset has no quote-time columns, so standard example values are used. Edit any value.'}</p>
          {AUTOMATION_FIELDS.map((f) => (
            <NumberField key={f.key} id={`auto-${f.key}`} label={f.label} hint={HINTS[f.key]} value={inputs[f.key]} error={errors[f.key]} step={f.step} onChange={(v) => onChange(f.key, v)} prefix={f.key === 'rate' ? '$' : undefined} />
          ))}
        </section>

        <div className="space-y-6">
          {!result && <p className="warn rounded-xl bg-red-50 p-4 text-sm font-medium text-loss">Fix the highlighted assumptions to see the estimate.</p>}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard label="Monthly manual work hours" value={result?.manualHours ?? NaN} format={fmtHours} icon={Clock} tone="slate" tip="Quotes per month × manual minutes per quote ÷ 60." />
            <KpiCard label="Monthly app-assisted hours" value={result?.appHours ?? NaN} format={fmtHours} icon={Zap} tone="teal" tip="Quotes per month × app-assisted minutes per quote ÷ 60." />
            <KpiCard label="Monthly hours saved" value={result?.hoursSaved ?? NaN} format={fmtHours} icon={Hourglass} tone="green" tip="Manual hours − app-assisted hours." />
            <KpiCard label="Time reduction" value={result?.reductionPct ?? NaN} format={(n) => fmtPct(n)} icon={TrendingDown} tone="blue" tip="Hours saved ÷ manual hours." />
            <KpiCard label="Est. monthly labor capacity value" value={result?.monthlyValue ?? NaN} format={fmtUSD} icon={CalendarClock} tone="amber" sub="Hypothetical" tip="Hours saved × analyst hourly cost. A measure of freed capacity — not cash saved." />
            <KpiCard label="Est. annual labor capacity value" value={result?.annualValue ?? NaN} format={fmtUSD} icon={CalendarRange} tone="amber" sub="Hypothetical · monthly × 12" tip="Monthly labor capacity value × 12." />
          </div>

          <ChartCard title="Monthly preparation time: manual vs. app-assisted" subtitle="Hours per month for the assumptions on the left." tip="Compares total analyst hours needed each month with and without the app.">
            {result ? (
              <div role="img" aria-label={`Bar chart: manual ${fmtHours(result.manualHours)} versus app-assisted ${fmtHours(result.appHours)} per month`}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chart} margin={{ top: 22, right: 12, left: 0 }} barCategoryGap="35%">
                    <CartesianGrid vertical={false} stroke={COLORS.grid} />
                    <XAxis dataKey="name" {...axisProps} />
                    <YAxis tickFormatter={(v) => `${Math.round(v)}h`} width={44} {...axisProps} />
                    <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={<ChartTooltip title={(p) => p.name} rows={(p) => [{ label: 'Hours per month', value: fmtHours(p.hours), color: p.fill }]} />} />
                    <Bar dataKey="hours" radius={[8, 8, 0, 0]} animationDuration={500}>
                      {chart.map((d) => <Cell key={d.name} fill={d.fill} />)}
                      <LabelList dataKey="hours" position="top" formatter={(v) => fmtHours(v)} style={{ fill: COLORS.navy, fontSize: 12, fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="py-10 text-center text-sm text-slate-500">No estimate available.</p>}
          </ChartCard>

          {result && (
            <section className="card p-5" aria-labelledby="ex">
              <h3 id="ex" className="text-base font-semibold">What this means</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-700">
                If preparing {fmtNum1(Number(inputs.quotes))} quotes a month drops from {fmtNum1(Number(inputs.manualMin))} to {fmtNum1(Number(inputs.appMin))} minutes each, the team would need about {fmtHours(result.appHours)} instead of {fmtHours(result.manualHours)} — roughly {fmtHours(result.hoursSaved)} of capacity freed per month ({fmtPct(result.reductionPct, 0)} less preparation time). At {fmtUSD(Number(inputs.rate))} per analyst hour that capacity is worth about {fmtUSD(result.monthlyValue)} a month, or {fmtUSD(result.annualValue)} a year, <em>if</em> it were redirected to higher-value analysis. These figures rest entirely on the editable assumptions and should be validated before use in a business case.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

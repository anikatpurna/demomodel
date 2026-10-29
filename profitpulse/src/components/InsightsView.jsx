import React from 'react';
import { XCircle, Eye, CheckCircle2, Info, Lightbulb, ArrowRight, Cpu } from 'lucide-react';
import { SectionHeader, EmptyState } from './ui.jsx';

const LEVELS = {
  risk: { label: 'Risk', icon: XCircle, chip: 'bg-red-50 text-red-700 ring-red-200', bar: '#DC2626' },
  watch: { label: 'Watch', icon: Eye, chip: 'bg-amber-50 text-amber-700 ring-amber-200', bar: '#D97706' },
  positive: { label: 'Opportunity', icon: CheckCircle2, chip: 'bg-green-50 text-green-700 ring-green-200', bar: '#16A34A' },
  info: { label: 'Note', icon: Info, chip: 'bg-blue-50 text-blue-700 ring-blue-200', bar: '#60A5FA' },
};

export default function InsightsView({ insights, goTo }) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Executive Insights" subtitle="Plain-language findings generated from the calculations in this dashboard. Each one shows the evidence behind it and a possible management action." />

      <p role="note" className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <Cpu size={18} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
        <span><strong className="text-navy">Rules-based analysis, not a live AI model.</strong> These insights are produced by fixed rules applied to your numbers and update when the data or margin threshold changes. Actions are suggestions for discussion — not automatic business decisions.</span>
      </p>

      {insights.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No insights yet">Load a dataset with at least one customer.</EmptyState>
      ) : (
        <ol className="space-y-4">
          {insights.map((i) => {
            const L = LEVELS[i.level];
            const Icon = L.icon;
            return (
              <li key={i.id} className="card pp-fade overflow-hidden" style={{ borderLeft: `4px solid ${L.bar}` }}>
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${L.chip}`}><Icon size={13} aria-hidden="true" />{L.label}</span>
                    <span className="text-xs text-slate-500">Evidence: {i.evidence}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold leading-snug">{i.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{i.detail}</p>
                  <p className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><Lightbulb size={15} className="mt-0.5 shrink-0 text-electric-dark" aria-hidden="true" /><span><span className="font-semibold">Possible action:</span> {i.action}</span></p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn" onClick={() => goTo('simulator')}>Test a cost increase <ArrowRight size={15} aria-hidden="true" /></button>
        <button type="button" className="btn" onClick={() => goTo('customers')}>Review customers <ArrowRight size={15} aria-hidden="true" /></button>
      </div>
    </div>
  );
}

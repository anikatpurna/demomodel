import React, { useMemo, useState } from 'react';
import { Search, ArrowUpDown, ArrowDown, ArrowUp, ChevronRight, SearchX, X } from 'lucide-react';
import { SectionHeader, StatusBadge, EmptyState, InfoTip } from './ui.jsx';
import { STATUSES } from '../lib/analytics.js';
import { fmtUSD, fmtPct, fmtInt } from '../lib/format.js';
import { STATUS_STYLE } from '../lib/theme.js';

const SORTS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'profit', label: 'Gross profit' },
  { key: 'margin', label: 'Gross margin' },
  { key: 'cost', label: 'Operating cost' },
];

function MarginBar({ margin, status }) {
  const w = Math.max(0, Math.min(40, margin)) / 40 * 100;
  return (
    <div className="flex items-center gap-2.5">
      <span className="tnum w-14 text-right font-semibold">{fmtPct(margin)}</span>
      <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 lg:block" aria-hidden="true">
        <span className="block h-full rounded-full transition-all" style={{ width: `${w}%`, background: STATUS_STYLE[status].color }} />
      </span>
    </div>
  );
}

export default function Customers({ customers, threshold, selectedId, onOpen }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [sortKey, setSortKey] = useState('revenue');
  const [dir, setDir] = useState('desc');

  const showUnits = customers.some((c) => c.units !== null);
  const showLabor = customers.some((c) => c.laborHours !== null);
  const counts = useMemo(() => Object.fromEntries(['All', ...STATUSES].map((s) => [s, s === 'All' ? customers.length : customers.filter((c) => c.status === s).length])), [customers]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers
      .filter((c) => (status === 'All' || c.status === status) && (!q || c.name.toLowerCase().includes(q)))
      .sort((a, b) => (dir === 'asc' ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]));
  }, [customers, query, status, sortKey, dir]);

  const th = (key, label, tip) => (
    <th scope="col" className="px-4 py-3 text-right font-semibold" aria-sort={sortKey === key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-navy" onClick={() => (sortKey === key ? setDir(dir === 'asc' ? 'desc' : 'asc') : (setSortKey(key), setDir('desc')))}>
        {label}
        {sortKey === key ? (dir === 'asc' ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" />) : <ArrowUpDown size={12} className="opacity-40" aria-hidden="true" />}
      </button>
      {tip && <InfoTip text={tip} align="right" />}
    </th>
  );

  return (
    <div className="space-y-5">
      <SectionHeader title="Customer Profitability" subtitle="Which customers are most and least profitable — and which are at risk? Select a customer for the full breakdown." />

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input type="search" className="input pl-9" placeholder="Search customers…" aria-label="Search customers" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Sort by
            <select className="input !w-auto" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          <button type="button" className="btn" onClick={() => setDir(dir === 'asc' ? 'desc' : 'asc')} aria-label={`Sort direction: ${dir === 'asc' ? 'ascending' : 'descending'}. Click to reverse.`}>
            {dir === 'asc' ? <><ArrowUp size={15} /> Low → High</> : <><ArrowDown size={15} /> High → Low</>}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {['All', ...STATUSES].map((s) => {
            const on = status === s;
            return (
              <button key={s} type="button" aria-pressed={on} onClick={() => setStatus(s)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${on ? 'border-navy bg-navy text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}>
                {s !== 'All' && <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[s].dot}`} aria-hidden="true" />}
                {s}
                <span className={`tnum rounded-full px-1.5 text-xs ${on ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>{counts[s]}</span>
              </button>
            );
          })}
          <span className="ml-auto self-center text-xs text-slate-500">Status uses a {fmtPct(threshold, 0)} minimum margin (Healthy from {fmtPct(threshold + 5, 0)}).</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={SearchX} title="No customers match">
          Try a different search or status filter.
          <button type="button" className="btn mx-auto mt-4" onClick={() => { setQuery(''); setStatus('All'); }}><X size={14} /> Clear filters</button>
        </EmptyState>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Customer profitability, {rows.length} customers</caption>
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-semibold">Customer</th>
                    {th('revenue', 'Revenue')}
                    {th('cost', 'Operating cost')}
                    {th('profit', 'Gross profit', 'Revenue − operating cost.')}
                    {th('margin', 'Margin', 'Gross profit ÷ revenue.')}
                    {showUnits && <th scope="col" className="px-4 py-3 text-right font-semibold">Units</th>}
                    {showLabor && <th scope="col" className="px-4 py-3 text-right font-semibold">Labor hrs</th>}
                    <th scope="col" className="px-4 py-3 text-left font-semibold">Status</th>
                    <th scope="col" className="w-8 px-2"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const sel = c.id === selectedId;
                    return (
                      <tr key={c.id} onClick={() => onOpen(c.id)} className={`cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50 ${sel ? 'bg-electric-soft/40 shadow-[inset_3px_0_0_#14B8A6]' : ''}`} aria-selected={sel}>
                        <th scope="row" className="px-4 py-3.5 text-left font-semibold">
                          <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(c.id); }} className="text-left hover:underline" aria-label={`Open details for ${c.name}`}>{c.name}</button>
                        </th>
                        <td className="tnum px-4 text-right">{fmtUSD(c.revenue)}</td>
                        <td className="tnum px-4 text-right text-slate-600">{fmtUSD(c.cost)}</td>
                        <td className={`tnum px-4 text-right font-semibold ${c.profit < 0 ? 'text-loss' : ''}`}>{fmtUSD(c.profit)}</td>
                        <td className="px-4"><div className="flex justify-end"><MarginBar margin={c.margin} status={c.status} /></div></td>
                        {showUnits && <td className="tnum px-4 text-right text-slate-600">{c.units === null ? '—' : fmtInt(c.units)}</td>}
                        {showLabor && <td className="tnum px-4 text-right text-slate-600">{c.laborHours === null ? '—' : fmtInt(c.laborHours)}</td>}
                        <td className="px-4"><StatusBadge status={c.status} /></td>
                        <td className="px-2 text-slate-400"><ChevronRight size={16} aria-hidden="true" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onOpen(c.id)} className={`card w-full p-4 text-left transition active:scale-[0.99] ${c.id === selectedId ? 'ring-2 ring-electric' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{c.name}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                    <div><dt className="text-xs text-slate-500">Revenue</dt><dd className="tnum font-medium">{fmtUSD(c.revenue)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Operating cost</dt><dd className="tnum font-medium">{fmtUSD(c.cost)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Gross profit</dt><dd className={`tnum font-semibold ${c.profit < 0 ? 'text-loss' : ''}`}>{fmtUSD(c.profit)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Margin</dt><dd className="tnum font-semibold">{fmtPct(c.margin)}</dd></div>
                    {showUnits && <div><dt className="text-xs text-slate-500">Units</dt><dd className="tnum">{c.units === null ? '—' : fmtInt(c.units)}</dd></div>}
                    {showLabor && <div><dt className="text-xs text-slate-500">Labor hours</dt><dd className="tnum">{c.laborHours === null ? '—' : fmtInt(c.laborHours)}</dd></div>}
                  </dl>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-xs text-slate-500">Operating cost already includes labor. Labor hours are shown for context only and are never added to cost.</p>
    </div>
  );
}

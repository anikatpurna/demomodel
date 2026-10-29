import React, { useEffect, useId, useState } from 'react';
import { Info, CheckCircle2, Eye, AlertTriangle, XCircle } from 'lucide-react';
import { STATUS_STYLE, COLORS } from '../lib/theme.js';
import useAnimatedNumber from '../lib/useAnimatedNumber.js';

const STATUS_ICON = { Healthy: CheckCircle2, Watchlist: Eye, 'At Risk': AlertTriangle, 'Loss-Making': XCircle };

export function StatusBadge({ status, size = 'sm' }) {
  const s = STATUS_STYLE[status];
  const Icon = STATUS_ICON[status];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 font-semibold ring-1 ring-inset ${s.bg} ${s.text} ${s.ring} ${size === 'lg' ? 'py-1.5 text-sm' : 'py-0.5 text-xs'}`}>
      <Icon size={size === 'lg' ? 16 : 13} aria-hidden="true" />
      {status}
    </span>
  );
}

/** Hover / focus explanation for a calculation. */
export function InfoTip({ text, align = 'center', dark = false }) {
  const id = useId();
  const pos = align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <button type="button" aria-label="What does this mean?" aria-describedby={id} className={`rounded-full p-0.5 transition ${dark ? 'text-slate-300 hover:text-white' : 'text-slate-400 hover:text-electric-dark'}`}>
        <Info size={14} aria-hidden="true" />
      </button>
      <span id={id} role="tooltip" className={`pointer-events-none absolute top-full z-40 mt-1.5 hidden w-64 max-w-[calc(100vw-2rem)] rounded-lg bg-navy p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-white shadow-lift group-focus-within:block group-hover:block ${pos}`}>
        {text}
      </span>
    </span>
  );
}

export function SectionHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy sm:text-[1.75rem]">{title}</h2>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-600">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function ChartCard({ title, subtitle, tip, children, className = '' }) {
  return (
    <section className={`card p-5 ${className}`}>
      <h3 className="text-base font-semibold text-navy">
        {title}
        {tip && <InfoTip text={tip} align="left" />}
      </h3>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      {Icon && <Icon size={28} className="mb-3 text-slate-400" aria-hidden="true" />}
      <p className="font-semibold text-navy">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
    </div>
  );
}

/** Number that tweens when its value changes. */
export function AnimatedValue({ value, format, className = '' }) {
  const v = useAnimatedNumber(value);
  return <span className={`tnum ${className}`}>{format(v)}</span>;
}

export function KpiCard({ label, value, format, icon: Icon, tone = 'teal', sub, tip }) {
  const tones = {
    teal: 'bg-electric-soft text-electric-dark',
    blue: 'bg-blue-100 text-blue-700',
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className="card pp-fade p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}{tip && <InfoTip text={tip} align="left" />}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon size={18} aria-hidden="true" /></span>
      </div>
      <p className="mt-3 text-[1.9rem] font-semibold leading-none tracking-tight text-navy"><AnimatedValue value={value} format={format} /></p>
      {sub && <p className="mt-2 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function NumberField({ id, label, hint, value, error, onChange, step = 1, prefix, suffix }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-navy">{label}</label>
      {hint && <p id={`${id}-h`} className="mb-1 text-xs text-slate-500">{hint}</p>}
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          className={`input ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-9' : ''}`}
          value={value}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={[hint ? `${id}-h` : null, error ? `${id}-e` : null].filter(Boolean).join(' ') || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{suffix}</span>}
      </div>
      {error && <p id={`${id}-e`} role="alert" className="mt-1 text-xs font-medium text-loss">{error}</p>}
    </div>
  );
}

/** Recharts tooltip with formatted rows. `rows` maps a data point to [{label, value, color}]. */
export function ChartTooltip({ active, payload, rows, title }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-semibold text-navy">{title ? title(p) : p.name}</p>
      {rows(p).map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-6 text-slate-600">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: r.color }} />{r.label}</span>
          <span className="tnum font-semibold text-navy">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

export const axisProps = { tick: { fill: COLORS.axis, fontSize: 12 }, axisLine: false, tickLine: false };

/** Width for category labels on horizontal bar charts; narrower on phones. */
export function useLabelWidth(wide = 150, narrow = 100) {
  const query = '(max-width: 639px)';
  const [small, setSmall] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setSmall(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return small ? narrow : wide;
}

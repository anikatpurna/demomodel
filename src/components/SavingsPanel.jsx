import React from 'react';
import NumberField from './NumberField.jsx';
import { SAVINGS_FIELDS, validate } from '../lib/calc.js';
import { fmtHours, fmtPct, fmtMoney } from '../lib/format.js';

export default function SavingsPanel({ values, onChange, result }) {
  const errors = validate(values, SAVINGS_FIELDS);
  return (
    <>
      <p className="muted">
        Preparing quotes by hand takes time. This shows how much analyst time automation could free up, using the example
        numbers below. Change them to match your own.
      </p>
      <div className="savings-grid">
        <div>
          {SAVINGS_FIELDS.map((f) => (
            <NumberField key={f.key} id={`sav-${f.key}`} field={f} value={values[f.key]} error={errors[f.key]} onChange={onChange} />
          ))}
        </div>
        <div>
          {result ? (
            <p className="hero-text">
              By hand, quotes take <strong>{fmtHours(result.manualHours)}</strong> a month. With automation they take{' '}
              <strong>{fmtHours(result.automatedHours)}</strong> — <strong>{fmtHours(result.hoursSaved)}</strong> saved ({fmtPct(result.reductionPct)} less time).
            </p>
          ) : (
            <p className="warn">Fix the highlighted numbers to see the time saved.</p>
          )}
          <div className="kpis single">
            <Stat label="Manual monthly hours" value={fmtHours(result?.manualHours)} />
            <Stat label="Automated monthly hours" value={fmtHours(result?.automatedHours)} />
            <Stat label="Hours saved per month" value={fmtHours(result?.hoursSaved)} />
            <Stat label="Reduction in preparation time" value={fmtPct(result?.reductionPct)} />
            <Stat label="Estimated monthly value of time freed" value={fmtMoney(result?.monthlyValue)} />
            <Stat label="Estimated yearly value of time freed" value={fmtMoney(result?.annualValue)} />
          </div>
          <p className="muted small">
            These are estimates from the example numbers, not verified savings. “Value of time freed” is the cost of the
            hours saved — it becomes real savings only if that time is redirected or reduced.
          </p>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

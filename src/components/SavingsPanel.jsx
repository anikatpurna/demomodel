import React from 'react';
import NumberField from './NumberField.jsx';
import { SAVINGS_FIELDS, validate } from '../lib/calc.js';
import { fmtHours, fmtPct, fmtMoney } from '../lib/format.js';

export default function SavingsPanel({ values, onChange, result }) {
  const errors = validate(values, SAVINGS_FIELDS);
  return (
    <section className="card" aria-labelledby="sav-h">
      <h2 id="sav-h">Automation savings (illustrative)</h2>
      <p className="muted">
        All assumptions below are fictional and editable. Results are estimates of freed analyst capacity, not verified
        company savings.
      </p>
      <div className="savings-grid">
        <div>
          {SAVINGS_FIELDS.map((f) => (
            <NumberField key={f.key} id={`sav-${f.key}`} field={f} value={values[f.key]} error={errors[f.key]} onChange={onChange} />
          ))}
        </div>
        <div className="kpis single">
          <Stat label="Manual monthly hours" value={fmtHours(result?.manualHours)} />
          <Stat label="Automated monthly hours" value={fmtHours(result?.automatedHours)} />
          <Stat label="Monthly hours saved" value={fmtHours(result?.hoursSaved)} />
          <Stat label="Reduction in preparation time" value={fmtPct(result?.reductionPct)} />
          <Stat label="Est. monthly labor capacity value" value={fmtMoney(result?.monthlyValue)} />
          <Stat label="Annualized labor capacity value" value={fmtMoney(result?.annualValue)} />
        </div>
      </div>
    </section>
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

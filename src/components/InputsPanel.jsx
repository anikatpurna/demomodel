import React from 'react';
import NumberField from './NumberField.jsx';
import { PRICING_FIELDS, validate } from '../lib/calc.js';

const GROUPS = [
  { title: 'Your team', keys: ['employees', 'hourly_wage', 'hours_per_day', 'days_per_month', 'payroll_burden_pct'] },
  { title: 'Other costs & volume', keys: ['monthly_overhead', 'monthly_units'] },
  { title: 'Your goal', keys: ['target_margin_pct'] },
];

// Renders the pricing fields in friendly groups. Used for both the main inputs and the "what if" inputs.
export default function InputsPanel({ values, onChange, idPrefix }) {
  const errors = validate(values, PRICING_FIELDS);
  return (
    <div className="groups">
      {GROUPS.map((g) => (
        <fieldset key={g.title}>
          <legend>{g.title}</legend>
          {g.keys.map((k) => {
            const f = PRICING_FIELDS.find((x) => x.key === k);
            return <NumberField key={k} id={`${idPrefix}-${k}`} field={f} value={values[k]} error={errors[k]} onChange={onChange} />;
          })}
        </fieldset>
      ))}
    </div>
  );
}

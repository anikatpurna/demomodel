import React from 'react';
import NumberField from './NumberField.jsx';
import { PRICING_FIELDS, validate } from '../lib/calc.js';

// Two editable columns: Baseline and Scenario.
export default function InputsPanel({ baseline, scenario, onBaseline, onScenario, onReduceUnits, onResetScenario }) {
  const bErr = validate(baseline, PRICING_FIELDS);
  const sErr = validate(scenario, PRICING_FIELDS);
  return (
    <section className="card" aria-labelledby="inputs-h">
      <h2 id="inputs-h">Pricing inputs</h2>
      <div className="quick-actions">
        <button type="button" className="btn primary" onClick={onReduceUnits}>
          Scenario: reduce monthly units by 20%
        </button>
        <button type="button" className="btn" onClick={onResetScenario}>
          Reset scenario to baseline
        </button>
      </div>
      <div className="two-col">
        <fieldset>
          <legend>Baseline</legend>
          {PRICING_FIELDS.map((f) => (
            <NumberField key={f.key} id={`b-${f.key}`} field={f} value={baseline[f.key]} error={bErr[f.key]} onChange={onBaseline} />
          ))}
        </fieldset>
        <fieldset>
          <legend>Modified scenario</legend>
          {PRICING_FIELDS.map((f) => (
            <NumberField key={f.key} id={`s-${f.key}`} field={f} value={scenario[f.key]} error={sErr[f.key]} onChange={onScenario} />
          ))}
        </fieldset>
      </div>
    </section>
  );
}

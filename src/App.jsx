import React, { useMemo, useRef, useState } from 'react';
import sampleCsv from './pricing_dummy_data.csv?raw';
import InputsPanel from './components/InputsPanel.jsx';
import Dashboard from './components/Dashboard.jsx';
import SavingsPanel from './components/SavingsPanel.jsx';
import { calculatePricing, calculateSavings, calculateAtFixedPrice, toNumber, DEFAULT_PRICING, DEFAULT_SAVINGS } from './lib/calc.js';
import { parseScenarios, buildSummaryRows, toCsv } from './lib/csv.js';

const initialScenarios = parseScenarios(sampleCsv);

export default function App() {
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [baselineIdx, setBaselineIdx] = useState(0);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const first = initialScenarios[0] ?? { pricing: DEFAULT_PRICING, savings: DEFAULT_SAVINGS };
  const [baseline, setBaseline] = useState({ ...first.pricing });
  const [scenario, setScenario] = useState({ ...first.pricing });
  const [savingsInputs, setSavingsInputs] = useState({ ...first.savings });
  const [loadError, setLoadError] = useState('');
  const fileRef = useRef(null);

  const baseRes = useMemo(() => calculatePricing(baseline), [baseline]);
  const scenRes = useMemo(() => calculatePricing(scenario), [scenario]);
  const savings = useMemo(() => calculateSavings(savingsInputs), [savingsInputs]);
  const atBaselinePrice = useMemo(
    () => (baseRes && scenRes ? calculateAtFixedPrice(scenario, baseRes.sellingPricePerUnit) : null),
    [baseRes, scenRes, scenario],
  );

  const setField = (setter) => (key, value) => setter((prev) => ({ ...prev, [key]: value }));

  function pickBaseline(i) {
    setBaselineIdx(i);
    setBaseline({ ...scenarios[i].pricing });
    setSavingsInputs({ ...scenarios[i].savings });
  }
  function pickScenario(i) {
    setScenarioIdx(i);
    setScenario({ ...scenarios[i].pricing });
  }

  function reduceUnits() {
    const units = toNumber(baseline.monthly_units);
    if (!(units > 0)) return;
    // Applied to the baseline units so repeated clicks are idempotent.
    setScenario({ ...baseline, monthly_units: String(Math.round(units * 0.8 * 100) / 100) });
  }

  function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseScenarios(String(reader.result));
        setScenarios(parsed);
        setBaselineIdx(0);
        setScenarioIdx(parsed.length > 1 ? 1 : 0);
        setBaseline({ ...parsed[0].pricing });
        setScenario({ ...parsed[parsed.length > 1 ? 1 : 0].pricing });
        setSavingsInputs({ ...parsed[0].savings });
        setLoadError('');
      } catch (err) {
        setLoadError(err.message);
      }
    };
    reader.onerror = () => setLoadError('Could not read that file.');
    reader.readAsText(file);
    e.target.value = '';
  }

  function download() {
    const rows = buildSummaryRows({
      baselineName: scenarios[baselineIdx]?.name,
      scenarioName: scenarioIdx === baselineIdx && JSON.stringify(scenario) === JSON.stringify(baseline) ? scenarios[scenarioIdx]?.name : 'Modified scenario',
      baselineInputs: baseline,
      scenarioInputs: scenario,
      baseline: baseRes,
      scenario: scenRes,
      savingsInputs,
      savings,
    });
    const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smartquote-pricing-summary.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>SmartQuote AI — Warehouse Pricing Intelligence</h1>
          <p className="muted">
            Fictional demo. All data is fictional; no figures here are verified company savings. Calculations run entirely in your browser.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn primary" onClick={download}>Download pricing summary (CSV)</button>
        </div>
      </header>

      <section className="card" aria-labelledby="data-h">
        <h2 id="data-h">Sample scenarios</h2>
        <div className="loader">
          <label>
            Load into Baseline
            <select value={baselineIdx} onChange={(e) => pickBaseline(Number(e.target.value))}>
              {scenarios.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
            </select>
          </label>
          <label>
            Load into Modified scenario
            <select value={scenarioIdx} onChange={(e) => pickScenario(Number(e.target.value))}>
              {scenarios.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
            </select>
          </label>
          <div>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Upload scenarios CSV…</button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onUpload} hidden aria-label="Upload scenarios CSV" />
          </div>
        </div>
        {loadError && <p className="error" role="alert">{loadError}</p>}
      </section>

      <InputsPanel
        baseline={baseline}
        scenario={scenario}
        onBaseline={setField(setBaseline)}
        onScenario={setField(setScenario)}
        onReduceUnits={reduceUnits}
        onResetScenario={() => setScenario({ ...baseline })}
      />
      <Dashboard baseline={baseRes} scenario={scenRes} atBaselinePrice={atBaselinePrice} />
      <SavingsPanel values={savingsInputs} onChange={setField(setSavingsInputs)} result={savings} />

      <footer className="muted">SmartQuote AI is a fictional demonstration. Estimates are illustrative, based on editable assumptions.</footer>
    </div>
  );
}

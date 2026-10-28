import React, { useMemo, useRef, useState } from 'react';
import sampleCsv from './pricing_dummy_data.csv?raw';
import logo from './assets/humano-logo.png';
import InputsPanel from './components/InputsPanel.jsx';
import { ResultsSection, ComparisonSection } from './components/Dashboard.jsx';
import SavingsPanel from './components/SavingsPanel.jsx';
import { calculatePricing, calculateSavings, calculateAtFixedPrice, toNumber, DEFAULT_PRICING, DEFAULT_SAVINGS } from './lib/calc.js';
import { parseScenarios, buildSummaryRows, toCsv } from './lib/csv.js';

const initialScenarios = parseScenarios(sampleCsv);

const STEPS = [
  ['1', 'Enter your numbers', 'Team, costs, volume and the profit you want.'],
  ['2', 'See your price', 'We calculate the price per unit that hits your goal.'],
  ['3', 'Try “what if”', 'See how a change affects price and profit.'],
  ['4', 'See time saved', 'Estimate the hours automation can free up.'],
];

export default function App() {
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [baselineIdx, setBaselineIdx] = useState(0);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const first = initialScenarios[0] ?? { pricing: DEFAULT_PRICING, savings: DEFAULT_SAVINGS };
  const [baseline, setBaseline] = useState({ ...first.pricing });
  const [scenario, setScenario] = useState({ ...first.pricing });
  const [savingsInputs, setSavingsInputs] = useState({ ...first.savings });
  const [loadError, setLoadError] = useState('');
  const [quickLabel, setQuickLabel] = useState('');
  const fileRef = useRef(null);

  const baseRes = useMemo(() => calculatePricing(baseline), [baseline]);
  const scenRes = useMemo(() => calculatePricing(scenario), [scenario]);
  const savings = useMemo(() => calculateSavings(savingsInputs), [savingsInputs]);
  const atBaselinePrice = useMemo(
    () => (baseRes && scenRes ? calculateAtFixedPrice(scenario, baseRes.sellingPricePerUnit) : null),
    [baseRes, scenRes, scenario],
  );

  const setField = (setter) => (key, value) => setter((prev) => ({ ...prev, [key]: value }));
  // Editing the starting numbers also moves the what-if along, unless the user has already changed it.
  const editBaseline = (key, value) => {
    setScenario((s) => (s[key] === baseline[key] ? { ...s, [key]: value } : s));
    setBaseline((b) => ({ ...b, [key]: value }));
  };

  function pickBaseline(i) {
    setBaselineIdx(i);
    setBaseline({ ...scenarios[i].pricing });
    setScenario({ ...scenarios[i].pricing });
    setSavingsInputs({ ...scenarios[i].savings });
    setQuickLabel('');
  }
  function pickScenario(i) {
    setScenarioIdx(i);
    setScenario({ ...scenarios[i].pricing });
    setQuickLabel(scenarios[i].name);
  }

  function reduceUnits() {
    const units = toNumber(baseline.monthly_units);
    if (!(units > 0)) return;
    // Always 80% of the starting volume, so repeated clicks don't compound.
    setScenario({ ...baseline, monthly_units: String(Math.round(units * 0.8 * 100) / 100) });
    setQuickLabel('Volume drops 20%');
  }
  function resetScenario() {
    setScenario({ ...baseline });
    setQuickLabel('');
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
        setScenarioIdx(0);
        setBaseline({ ...parsed[0].pricing });
        setScenario({ ...parsed[0].pricing });
        setSavingsInputs({ ...parsed[0].savings });
        setQuickLabel('');
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
    const unchanged = JSON.stringify(scenario) === JSON.stringify(baseline);
    const rows = buildSummaryRows({
      baselineName: scenarios[baselineIdx]?.name,
      scenarioName: unchanged ? scenarios[baselineIdx]?.name : quickLabel || 'Modified scenario',
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
    a.download = 'humano-pricing-summary.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const baseUnits = toNumber(baseline.monthly_units);

  return (
    <div className="app">
      <header className="app-header">
        <img className="logo" src={logo} alt="Humano" width="748" height="164" />
        <div>
          <h1>SmartQuote AI — Warehouse Pricing Intelligence</h1>
          <p className="lead">Get a clear, consistent warehouse price in minutes — and see what happens if things change.</p>
        </div>
      </header>

      <p className="banner" role="note">
        <strong>Demo with fictional data.</strong> Example numbers only. Time-saving figures are estimates, not verified company savings.
      </p>

      <ol className="steps" aria-label="How it works">
        {STEPS.map(([n, title, text]) => (
          <li key={n}>
            <span className="step-n" aria-hidden="true">{n}</span>
            <div><strong>{title}</strong><span>{text}</span></div>
          </li>
        ))}
      </ol>

      <section className="card" aria-labelledby="s1">
        <h2 id="s1"><span className="badge">1</span> Enter your numbers</h2>
        <div className="loader">
          <label>
            Start from an example
            <select value={baselineIdx} onChange={(e) => pickBaseline(Number(e.target.value))}>
              {scenarios.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
            </select>
          </label>
          <div>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Use my own CSV file…</button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onUpload} hidden aria-label="Upload scenarios CSV" />
          </div>
        </div>
        {loadError && <p className="error" role="alert">{loadError}</p>}
        <InputsPanel values={baseline} onChange={editBaseline} idPrefix="b" />
      </section>

      <section className="card" aria-labelledby="s2">
        <h2 id="s2"><span className="badge">2</span> Your price</h2>
        <ResultsSection result={baseRes} unitsPerMonth={baseUnits} marginPct={baseRes?.grossMarginPct} />
      </section>

      <section className="card" aria-labelledby="s3">
        <h2 id="s3"><span className="badge">3</span> What if things change?</h2>
        <p className="muted">Pick a quick change, or adjust any number below. Your original numbers from Step 1 stay untouched for comparison.</p>
        <div className="quick-actions">
          <button type="button" className="btn primary" onClick={reduceUnits}>What if volume drops 20%?</button>
          <label className="inline">
            Or compare with an example
            <select value={scenarioIdx} onChange={(e) => pickScenario(Number(e.target.value))}>
              {scenarios.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
            </select>
          </label>
          <button type="button" className="btn" onClick={resetScenario}>Start over</button>
        </div>
        <details className="more">
          <summary>Change other numbers</summary>
          <InputsPanel values={scenario} onChange={setField(setScenario)} idPrefix="s" />
        </details>
        <ComparisonSection baseline={baseRes} scenario={scenRes} atBaselinePrice={atBaselinePrice} />
      </section>

      <section className="card" aria-labelledby="s4">
        <h2 id="s4"><span className="badge">4</span> Time saved by automating quotes</h2>
        <SavingsPanel values={savingsInputs} onChange={setField(setSavingsInputs)} result={savings} />
      </section>

      <section className="card save" aria-labelledby="s5">
        <div>
          <h2 id="s5">Save your summary</h2>
          <p className="muted">Download a spreadsheet (CSV) with your numbers, the calculated prices and the time-saved estimate.</p>
        </div>
        <button type="button" className="btn primary" onClick={download}>Download pricing summary (CSV)</button>
      </section>

      <footer className="muted">SmartQuote AI by Humano is a fictional demonstration. Estimates are illustrative and based on editable assumptions.</footer>
    </div>
  );
}

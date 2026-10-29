import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import demoCsv from './data/customer_profitability_demo.csv?raw';
import Sidebar, { SECTIONS } from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import Overview from './components/Overview.jsx';
import Customers from './components/Customers.jsx';
import CustomerDrawer from './components/CustomerDrawer.jsx';
import Simulator from './components/Simulator.jsx';
import Efficiency from './components/Efficiency.jsx';
import InsightsView from './components/InsightsView.jsx';
import { DEFAULT_THRESHOLD, enrichAll, summarize, calcAutomation, automationDefaults, toNumber, simulate } from './lib/analytics.js';
import { parseCustomers, DataError, buildSummaryRows, toCsv } from './lib/csv.js';
import { generateInsights } from './lib/insights.js';

const demo = parseCustomers(demoCsv).customers;
const ids = SECTIONS.map((s) => s.id);
const fromHash = () => (ids.includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : 'overview');
const MAX_FILE_BYTES = 1_000_000;

export default function App() {
  const [raw, setRaw] = useState(demo);
  const [source, setSource] = useState({ demo: true, name: 'Fictional demo data' });
  const [section, setSection] = useState(fromHash);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [thresholdText, setThresholdText] = useState(String(DEFAULT_THRESHOLD));
  const [openId, setOpenId] = useState(null);
  const [simId, setSimId] = useState(demo[0].id);
  const [simPct, setSimPct] = useState(0);
  const [autoInputs, setAutoInputs] = useState(() => automationDefaults(demo));
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState(null); // { title, issues[] }
  const [toast, setToast] = useState('');
  const mainRef = useRef(null);

  // Threshold: keep the last valid number so a half-typed value never breaks calculations.
  const parsedThreshold = toNumber(thresholdText);
  const thresholdError = Number.isNaN(parsedThreshold) ? 'Enter a number' : parsedThreshold < 1 || parsedThreshold > 50 ? 'Use a value from 1 to 50' : '';
  const lastGood = useRef(DEFAULT_THRESHOLD);
  if (!thresholdError) lastGood.current = parsedThreshold;
  const threshold = lastGood.current;

  const customers = useMemo(() => enrichAll(raw, threshold), [raw, threshold]);
  const summary = useMemo(() => summarize(customers, threshold), [customers, threshold]);
  const hasQuoteData = raw.some((c) => c.quotes > 0);
  const automation = useMemo(() => calcAutomation(autoInputs), [autoInputs]);
  const insights = useMemo(() => generateInsights({ customers, summary, threshold, automation }), [customers, summary, threshold, automation]);
  const opened = customers.find((c) => c.id === openId) ?? null;
  const simCustomer = customers.find((c) => c.id === simId) ?? customers[0];

  // Hash navigation (so sections are linkable and the back button works).
  useEffect(() => {
    const onHash = () => setSection(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    const label = SECTIONS.find((s) => s.id === section)?.label ?? '';
    document.title = `${label} | ProfitPulse — Business Intelligence & Profitability Analytics`;
    window.scrollTo({ top: 0 });
  }, [section]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const goTo = useCallback((id) => {
    setMobileOpen(false);
    setOpenId(null);
    if (window.location.hash.slice(1) !== id) window.location.hash = id;
    else setSection(id);
    setTimeout(() => mainRef.current?.focus({ preventScroll: true }), 0);
  }, []);

  const loadDataset = (list, src, message) => {
    setRaw(list);
    setSource(src);
    setSimId(list[0].id);
    setSimPct(0);
    setOpenId(null);
    setAutoInputs(automationDefaults(list));
    setToast(message);
  };

  function onUpload(file) {
    if (!file) return;
    setProblem(null);
    if (file.size > MAX_FILE_BYTES) { setProblem({ title: 'That file is too large', issues: ['Please upload a CSV under 1 MB.'] }); return; }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { customers: list } = parseCustomers(String(reader.result));
        loadDataset(list, { demo: false, name: file.name }, `Loaded ${list.length} customer${list.length === 1 ? '' : 's'} from ${file.name}`);
      } catch (err) {
        setProblem({ title: 'We could not use that file — your current data is unchanged', issues: err instanceof DataError ? err.issues : ['The file could not be read as a CSV.'] });
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => { setLoading(false); setProblem({ title: 'The file could not be read', issues: ['Try saving it again as a plain .csv file.'] }); };
    reader.readAsText(file);
  }

  function onReset() {
    setProblem(null);
    setThresholdText(String(DEFAULT_THRESHOLD));
    loadDataset(demo, { demo: true, name: 'Fictional demo data' }, 'Restored the original demo data');
  }

  function onDownload() {
    const rows = buildSummaryRows({
      datasetLabel: source.name,
      threshold,
      summary,
      customers,
      sim: simCustomer ? simulate(simCustomer, simPct, threshold) : null,
      automationInputs: autoInputs,
      automation,
    });
    const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'profitpulse-financial-summary.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToast('Downloaded profitpulse-financial-summary.csv');
  }

  const openCustomer = useCallback((id) => id && setOpenId(id), []);
  const closeCustomer = useCallback(() => setOpenId(null), []);
  const simulateCustomer = (id) => { setSimId(id); setOpenId(null); goTo('simulator'); };
  const title = SECTIONS.find((s) => s.id === section)?.label;

  return (
    <div className="flex min-h-screen overflow-x-clip">
      <a href="#main" className="sr-only z-[70] rounded-lg bg-white px-3 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>Skip to content</a>
      <Sidebar active={section} onNavigate={goTo} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} isDemo={source.demo} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} onMenu={() => setMobileOpen(true)} isDemo={source.demo} fileName={source.name} threshold={thresholdText} thresholdError={thresholdError} onThreshold={setThresholdText} onUpload={onUpload} onDownload={onDownload} onReset={onReset} loading={loading} />

        <main id="main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 outline-none sm:px-6 lg:py-8">
          {problem && (
            <div role="alert" className="pp-fade mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="mt-0.5 shrink-0 text-loss" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-red-900">{problem.title}</p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-red-800">
                    {problem.issues.slice(0, 8).map((m) => <li key={m}>{m}</li>)}
                  </ul>
                  {problem.issues.length > 8 && <p className="mt-1 text-sm text-red-800">…and {problem.issues.length - 8} more.</p>}
                  <p className="mt-2 text-xs text-red-700">Required columns: customer, monthly_revenue, monthly_operating_cost. Optional: monthly_units, monthly_labor_hours, quotes_per_month, manual_minutes_per_quote, app_minutes_per_quote, analyst_hourly_cost.</p>
                </div>
                <button type="button" onClick={() => setProblem(null)} className="rounded-lg p-1.5 text-red-700 hover:bg-red-100" aria-label="Dismiss message"><X size={16} /></button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading dataset">
              <div className="skeleton h-24" /><div className="grid gap-4 sm:grid-cols-3"><div className="skeleton h-32" /><div className="skeleton h-32" /><div className="skeleton h-32" /></div><div className="skeleton h-72" />
            </div>
          ) : (
            <div key={section} className="pp-fade">
              {section === 'overview' && <Overview customers={customers} summary={summary} threshold={threshold} onOpenCustomer={openCustomer} goTo={goTo} insights={insights} />}
              {section === 'customers' && <Customers customers={customers} threshold={threshold} selectedId={openId} onOpen={openCustomer} />}
              {section === 'simulator' && <Simulator customers={customers} threshold={threshold} customerId={simCustomer?.id} setCustomerId={setSimId} pct={simPct} setPct={setSimPct} />}
              {section === 'efficiency' && <Efficiency inputs={autoInputs} onChange={(k, v) => setAutoInputs((p) => ({ ...p, [k]: v }))} onReset={() => setAutoInputs(automationDefaults(raw))} result={automation} fromData={hasQuoteData} />}
              {section === 'insights' && <InsightsView insights={insights} goTo={goTo} />}
            </div>
          )}

          <footer className="mt-10 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
            {source.demo ? 'All customers and figures are fictional demo data. ' : 'Figures reflect the dataset you uploaded and are not stored anywhere — everything runs in your browser. '}
            Insights are rules-based calculations, and automation values are hypothetical estimates, not verified cost savings.
          </footer>
        </main>
      </div>

      {opened && <CustomerDrawer customer={opened} summary={summary} threshold={threshold} onClose={closeCustomer} onSimulate={simulateCustomer} />}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex justify-center px-4">
        {toast && <p className="pp-fade pointer-events-auto flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-medium text-white shadow-lift"><CheckCircle2 size={16} className="text-electric" aria-hidden="true" />{toast}</p>}
      </div>
    </div>
  );
}

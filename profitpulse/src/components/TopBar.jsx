import React, { useRef } from 'react';
import { Menu, Upload, Download, RotateCcw, FlaskConical, FileSpreadsheet, Target } from 'lucide-react';
import { InfoTip } from './ui.jsx';

export default function TopBar({ title, onMenu, isDemo, fileName, threshold, thresholdError, onThreshold, onUpload, onDownload, onReset, loading }) {
  const fileRef = useRef(null);
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
        <button type="button" onClick={onMenu} className="btn !min-h-0 !p-2 lg:hidden" aria-label="Open menu"><Menu size={20} /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-navy sm:text-base">{title}</p>
          <p className="hidden text-xs text-slate-500 sm:block">ProfitPulse · Business Intelligence & Profitability Analytics</p>
        </div>

        {isDemo ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"><FlaskConical size={13} aria-hidden="true" />Fictional Demo Data</span>
        ) : (
          <span className="inline-flex max-w-[220px] items-center gap-1.5 truncate rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 ring-1 ring-inset ring-blue-200" title={fileName}><FileSpreadsheet size={13} aria-hidden="true" /><span className="truncate">Uploaded: {fileName}</span></span>
        )}

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600" htmlFor="threshold">
            <Target size={14} aria-hidden="true" /><span className="hidden sm:inline">Min margin</span>
            <InfoTip align="right" text="Your minimum acceptable gross margin. It drives the 'below threshold' count, the Watchlist band (threshold to threshold + 5 pts), the required-revenue calculation and the insights. Default 15%." />
          </label>
          <div className="relative w-24">
            <input
              id="threshold"
              type="number"
              min="1"
              max="50"
              step="1"
              value={threshold}
              onChange={(e) => onThreshold(e.target.value)}
              aria-invalid={thresholdError ? 'true' : 'false'}
              aria-describedby={thresholdError ? 'threshold-err' : undefined}
              className="input !min-h-[36px] pr-7 text-right"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden aria-label="Upload customer CSV" onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={loading} aria-label="Upload CSV"><Upload size={16} /><span className="hidden md:inline">{loading ? 'Reading…' : 'Upload CSV'}</span></button>
          <button type="button" className="btn" onClick={onDownload} aria-label="Download summary CSV"><Download size={16} /><span className="hidden md:inline">Summary CSV</span></button>
          <button type="button" className="btn" onClick={onReset} aria-label="Reset to original demo data"><RotateCcw size={16} /><span className="hidden md:inline">Reset demo</span></button>
        </div>
      </div>
      {thresholdError && <p id="threshold-err" role="alert" className="border-t border-red-100 bg-red-50 px-6 py-1.5 text-xs font-medium text-loss">{thresholdError} (using the last valid value)</p>}
    </header>
  );
}

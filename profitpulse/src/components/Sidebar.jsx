import React from 'react';
import { Activity, LayoutDashboard, Users, SlidersHorizontal, Timer, Lightbulb, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';

export const SECTIONS = [
  { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
  { id: 'customers', label: 'Customer Profitability', icon: Users },
  { id: 'simulator', label: 'Scenario Simulator', icon: SlidersHorizontal },
  { id: 'efficiency', label: 'Efficiency & ROI', icon: Timer },
  { id: 'insights', label: 'Executive Insights', icon: Lightbulb },
];

export default function Sidebar({ active, onNavigate, collapsed, onToggle, mobileOpen, onCloseMobile, isDemo }) {
  const narrow = collapsed && !mobileOpen; // icon-only mode (desktop only)
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-sm lg:hidden" onClick={onCloseMobile} aria-hidden="true" />}
      <aside
        aria-label="Primary"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-navy text-slate-300 transition-all duration-300 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${narrow ? 'w-[76px]' : 'w-64'}`}
      >
        <div className={`flex h-16 items-center ${narrow ? 'justify-center' : 'justify-between px-5'}`}>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-electric text-navy"><Activity size={20} strokeWidth={2.5} aria-hidden="true" /></span>
            {!narrow && <span className="text-lg font-semibold tracking-tight text-white">ProfitPulse</span>}
          </div>
          {mobileOpen && (
            <button type="button" onClick={onCloseMobile} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Close menu"><X size={20} /></button>
          )}
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const on = active === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => { e.preventDefault(); onNavigate(id); }}
                aria-current={on ? 'page' : undefined}
                title={narrow ? label : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${narrow ? 'justify-center' : ''} ${on ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}
              >
                {on && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-electric" aria-hidden="true" />}
                <Icon size={19} className={on ? 'text-electric' : ''} aria-hidden="true" />
                {!narrow && <span>{label}</span>}
                {narrow && <span className="sr-only">{label}</span>}
              </a>
            );
          })}
        </nav>

        <div className="space-y-3 p-3">
          {!narrow && (
            <p className="rounded-xl bg-white/5 px-3 py-2.5 text-xs leading-relaxed text-slate-400">
              {isDemo ? 'All figures use fictional demo data.' : 'Showing your uploaded dataset.'} Insights are rules-based calculations, not a live AI model.
            </p>
          )}
          <button type="button" onClick={onToggle} className="hidden w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-white lg:flex" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}>
            {collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /> Collapse</>}
          </button>
        </div>
      </aside>
    </>
  );
}

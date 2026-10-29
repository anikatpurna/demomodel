# SmartQuote AI — Warehouse Pricing Intelligence

A client-side React + Vite app for building warehouse pricing quotes, comparing scenarios, and estimating
quote-preparation time savings. **All data is fictional. The automation savings are illustrative estimates
based on editable assumptions — not verified company savings.**

No backend, database, authentication, or API key is needed; every calculation runs in the browser.

## Features

- **Customer-friendly layout** – Humano logo, a 4-step flow (enter numbers → see price → what if → time saved), a hint under every input, a headline price with a plain-English explanation, and written summaries of what changes in a what-if. (Logo: `src/assets/humano-logo.png`.)

- **Pricing calculator** – employees, wage, hours/day, days/month, payroll burden, overhead, units, target margin.
- **Scenario analysis** – editable Baseline and Modified-scenario columns, instant recalculation, side-by-side
  table with absolute and % change, and a one-click "reduce monthly units by 20%" scenario. Also shows what happens
  if you *don't* re-price (baseline price held at the scenario's volume).
- **Dashboard** – cost, price/unit, revenue, profit, margin; cost-breakdown pies and a baseline-vs-scenario bar chart (Recharts).
- **Automation savings** – editable assumptions (quotes/month, manual vs. automated minutes, analyst $/hr) → hours, % reduction, monthly and annualized capacity value.
- **CSV export** – scenario inputs, calculated results, and savings assumptions/estimates.
- **Sample data** – `src/pricing_dummy_data.csv` is loaded on start; use **Upload scenarios CSV…** to load your own
  (required columns: `employees, hourly_wage, hours_per_day, days_per_month, payroll_burden_pct, monthly_overhead, monthly_units, target_margin_pct`;
  optional: `scenario` and the four savings columns).

## Formulas

```
base labor      = employees × hourly wage × hours/day × days/month
loaded labor    = base labor × (1 + burden% / 100)
total cost      = loaded labor + overhead
cost per unit   = total cost / units
selling price   = cost per unit / (1 − target margin% / 100)
revenue         = price × units
profit          = revenue − total cost
gross margin %  = profit / revenue × 100
```

Validation: all fields must be numeric and non-negative; units must be > 0 and target margin must be < 100, so
division by zero is impossible. Invalid inputs show an inline error and results display "—".

## Run locally

Requires Node.js 18+.

```bash
npm install
```

```bash
npm run dev
```

Other commands:

```bash
npm test          # unit tests for the calculation and CSV logic
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

## Deploy to Netlify

`netlify.toml` already sets build command `npm run build` and publish directory `dist`.

**Option A – Git:** push this repo to GitHub, then in Netlify choose *Add new site → Import an existing project*,
pick the repo, and deploy (the settings are read from `netlify.toml`).

**Option B – CLI:**

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

**Option C – Drag and drop:** run `npm run build`, then drag the `dist` folder onto https://app.netlify.com/drop.

## Project layout

```
src/lib/calc.js      pure pricing / savings / validation logic
src/lib/csv.js       CSV parsing and summary export
src/lib/calc.test.js unit tests
src/components/      InputsPanel, Dashboard, SavingsPanel, NumberField
src/App.jsx          state and wiring
```

## Apps in this repository

* **SmartQuote AI** (repository root) — warehouse pricing calculator. See the sections above.
* **ProfitPulse** (`profitpulse/`) — customer profitability dashboard with a what-if simulator. See [`profitpulse/README.md`](profitpulse/README.md).

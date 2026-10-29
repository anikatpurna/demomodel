# ProfitPulse — Business Intelligence & Profitability Analytics

An interactive customer-profitability dashboard built with React, Vite, Tailwind CSS, Recharts and Lucide icons.
It runs entirely in the browser: no backend, database, authentication, paid API or API key.

**All demo data is fictional.** Insights are produced by fixed rules applied to the numbers (not a live AI model),
and automation values are hypothetical estimates, not verified cost savings.

## Sections

| Section | Answers |
| --- | --- |
| Executive Overview | How healthy is the portfolio? Three headline answers, six KPI cards, four charts, insight preview |
| Customer Profitability | Who is most / least profitable and at risk? Search, sort, status filter, customer detail panel |
| Scenario Simulator | What happens if operating costs rise 0–30%? Slider, presets, side-by-side baseline vs. simulated, required-revenue calculation |
| Efficiency & ROI | How much staff time could automation free up? Editable assumptions, hours saved, capacity value |
| Executive Insights | Rules-based findings with evidence and *possible* management actions |

Also: CSV upload (validated), downloadable financial-summary CSV, reset to demo data, editable minimum-margin
threshold, tooltips explaining calculations, collapsible sidebar, responsive layout, "Fictional Demo Data" label.

## Calculations

```
gross profit        = monthly revenue − monthly operating cost
gross margin %      = gross profit ÷ revenue × 100
portfolio margin %  = total profit ÷ total revenue × 100        (not an average of customer margins)

status (default 15% minimum margin):
  Healthy      margin ≥ 20%        (minimum + 5 pts)
  Watchlist    15% ≤ margin < 20%
  At Risk      0% ≤ margin < 15%
  Loss-Making  margin < 0%

simulation (revenue held constant):
  new cost            = cost × (1 + increase%)
  required revenue    = new cost ÷ (1 − minimum margin)
  additional revenue  = MAX(0, required revenue − current revenue)

automation:
  manual hours = quotes × manual minutes ÷ 60
  app hours    = quotes × app minutes ÷ 60
  hours saved  = manual − app;  value = hours saved × analyst rate;  annual = monthly × 12
```

Operating cost is treated as all-in and **already includes labor**. Labor hours are shown for context
(for example profit per labor hour) and are never added to cost. Simulations never modify the loaded data.

Worked example (BluePeak Distribution, +15% cost): cost $43,200 → $49,680, profit $4,800 → −$1,680,
margin 10.0% → −3.5%, status At Risk → Loss-Making, additional revenue needed for a 15% margin ≈ $10,447.

Changing the **Min margin** in the top bar moves the Watchlist/Healthy bands with it (Healthy starts 5 points
above the minimum), and drives the "below threshold" count, the required-revenue formula and the insights.

## CSV format

Required columns: `customer`, `monthly_revenue`, `monthly_operating_cost`.
Optional: `monthly_units`, `monthly_labor_hours`, `quotes_per_month`, `manual_minutes_per_quote`,
`app_minutes_per_quote`, `analyst_hourly_cost` (defaults to $35 when absent).
Values such as `$85,000` are accepted. Files with blank names, non-numeric or non-positive revenue, negative
costs or duplicate customers are rejected with row-level messages, and your current data is left unchanged.
Maximum 500 customers / 1 MB.

## Run locally

Requires Node.js 18+.

```bash
cd profitpulse
npm install
```

```bash
npm run dev
```

```bash
npm test          # unit tests for the financial logic, CSV validation and insights
npm run build     # production build into dist/
npm run preview   # serve the production build
```

## Deploy to Netlify

This app lives in the `profitpulse/` folder of the repository. `profitpulse/netlify.toml` sets the base
directory, build command (`npm run build`) and publish directory (`dist`).

* **Git:** in Netlify choose *Add new site → Import an existing project*, pick the repository, and set
  **Base directory** to `profitpulse` (Netlify may read it from `netlify.toml` automatically). Deploy.
* **CLI:**

```bash
cd profitpulse
npm install
npm run build
npx netlify-cli deploy --prod --dir=dist
```

* **Drag and drop:** run `npm run build` in `profitpulse/`, then drop the `dist` folder on https://app.netlify.com/drop.

## Project layout

```
src/lib/analytics.js   margins, status, portfolio totals, simulation, automation (pure functions)
src/lib/csv.js         CSV parsing + validation, summary export
src/lib/insights.js    rules-based insights
src/lib/analytics.test.js
src/components/        Sidebar, TopBar, Overview, Customers, CustomerDrawer, Simulator, Efficiency, InsightsView, ui
src/data/customer_profitability_demo.csv
```

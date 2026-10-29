import { breakevenIncreasePct, thresholdIncreasePct, portfolioAtCostIncrease, simulate } from './analytics.js';
import { fmtUSD, fmtPct, fmtPts, fmtHours, fmtUSD2 } from './format.js';

/**
 * Rules-based insights. Every statement is computed from the data — no model is called and nothing is
 * invented. Actions are possible management actions, not decisions.
 * level: 'risk' | 'watch' | 'positive' | 'info'
 */
export function generateInsights({ customers, summary, threshold, automation }) {
  const out = [];
  if (!customers.length) return out;
  const many = customers.length > 1;
  const byMargin = [...customers].sort((a, b) => a.margin - b.margin);
  const lowest = byMargin[0];
  const highest = byMargin[byMargin.length - 1];
  const t = fmtPct(threshold, 0);

  // 1. Customers below target margin
  const below = customers.filter((c) => c.margin < threshold - 1e-9);
  if (below.length) {
    out.push({
      id: 'below',
      level: below.some((c) => c.status === 'Loss-Making') ? 'risk' : 'watch',
      title: `${below.length === 1 ? 'One customer is' : `${below.length} customers are`} below the ${t} target margin`,
      detail: below.map((c) => `${c.name} (${fmtPct(c.margin)})`).join(', ') + '.',
      evidence: `Customers with margin < ${t}: ${below.length} of ${customers.length}`,
      action: 'Review pricing assumptions and investigate operating costs for these accounts.',
    });
  } else {
    out.push({
      id: 'below',
      level: 'positive',
      title: `No customers are below the ${t} target margin`,
      detail: `The lowest margin in the portfolio is ${fmtPct(lowest.margin)} (${lowest.name}).`,
      evidence: `Customers with margin < ${t}: 0 of ${customers.length}`,
      action: 'Keep monitoring low-margin accounts as costs change.',
    });
  }

  // 2. Loss-making customers
  const losing = customers.filter((c) => c.status === 'Loss-Making');
  if (losing.length) {
    out.push({
      id: 'loss',
      level: 'risk',
      title: `${losing.map((c) => c.name).join(', ')} ${losing.length === 1 ? 'is' : 'are'} loss-making`,
      detail: losing.map((c) => `${c.name}: ${fmtUSD(c.profit)} per month (${fmtPct(c.margin)})`).join('; ') + '.',
      evidence: 'Gross profit below $0',
      action: 'Investigate operating costs and evaluate whether pricing or scope should be revisited.',
    });
  }

  // 3. Lowest margin
  if (many) {
    out.push({
      id: 'lowest',
      level: lowest.status === 'Healthy' ? 'info' : lowest.status === 'Watchlist' ? 'watch' : 'risk',
      title: `${lowest.name} has the lowest gross margin in the portfolio`,
      detail: `${fmtPct(lowest.margin)} versus ${fmtPct(summary.margin)} for the portfolio overall (status: ${lowest.status}). It earns ${fmtUSD(lowest.profit)} gross profit on ${fmtUSD(lowest.revenue)} revenue.`,
      evidence: `Margin gap to portfolio: ${fmtPts(lowest.margin - summary.margin)}`,
      action: 'Review pricing assumptions and look for the cost drivers behind the gap.',
    });
  }

  // 4. Cost-shock exposure at +15%
  const shock = 15;
  const newlyLosing = customers.filter((c) => c.profit >= 0 && simulate(c, shock, threshold).simulated.status === 'Loss-Making');
  if (newlyLosing.length) {
    out.push({
      id: 'shock',
      level: 'risk',
      title: `A ${shock}% operating cost increase would make ${newlyLosing.map((c) => c.name).join(', ')} loss-making`,
      detail: newlyLosing
        .map((c) => {
          const s = simulate(c, shock, threshold);
          return `${c.name}: profit ${fmtUSD(c.profit)} → ${fmtUSD(s.simulated.profit)}, margin ${fmtPct(c.margin)} → ${fmtPct(s.simulated.margin)}`;
        })
        .join('; ') + '.',
      evidence: `Break-even cost increase: ${newlyLosing.map((c) => `${c.name} +${fmtPct(breakevenIncreasePct(c))}`).join(', ')}`,
      action: 'Open the Scenario Simulator to test mitigation, and monitor low-margin accounts.',
    });
  } else {
    const nearest = [...customers].sort((a, b) => breakevenIncreasePct(a) - breakevenIncreasePct(b))[0];
    const be = breakevenIncreasePct(nearest);
    out.push({
      id: 'shock',
      level: 'positive',
      title: `No customer turns loss-making from a ${shock}% operating cost increase`,
      detail: Number.isFinite(be)
        ? `The most exposed account is ${nearest.name}, which reaches break-even at a ${fmtPct(be)} cost increase.`
        : 'No customer has operating cost data that creates exposure.',
      evidence: `Tested at +${shock}% operating cost`,
      action: 'Keep monitoring low-margin accounts.',
    });
  }

  // 5. Portfolio-level cost sensitivity
  const p10 = portfolioAtCostIncrease(customers, 10, threshold);
  out.push({
    id: 'portfolio-shock',
    level: p10.margin < threshold - 1e-9 ? 'watch' : 'info',
    title: `A 10% cost increase across all customers would cut portfolio margin to ${fmtPct(p10.margin)}`,
    detail: `Monthly gross profit would move from ${fmtUSD(summary.profit)} to ${fmtUSD(p10.profit)} (${fmtPts(p10.margin - summary.margin)} margin) if revenue stayed unchanged.`,
    evidence: `Portfolio margin today: ${fmtPct(summary.margin)}`,
    action: 'Review pricing assumptions, including cost pass-through terms in contracts.',
  });

  // 6. Watchlist proximity
  customers.filter((c) => c.status === 'Watchlist').forEach((c) => {
    const room = thresholdIncreasePct(c, threshold);
    out.push({
      id: `watch-${c.id}`,
      level: 'watch',
      title: `${c.name} is on the watchlist`,
      detail: `Margin is ${fmtPct(c.margin)}, ${fmtPts(c.margin - threshold)} above the ${t} threshold. ${room <= 0.05 ? 'Any cost increase would take it below the threshold.' : `A ${fmtPct(room)} operating cost increase would take it below the threshold.`}`,
      evidence: `Cost headroom before falling below ${t}: ${fmtPct(Math.max(0, room))}`,
      action: 'Monitor this account and evaluate labor productivity and pricing at the next review.',
    });
  });

  // 7. Largest profit contributor
  const top = [...customers].sort((a, b) => b.profit - a.profit)[0];
  if (summary.profit > 0 && top.profit > 0) {
    const share = (top.profit / summary.profit) * 100;
    out.push({
      id: 'top',
      level: share >= 40 ? 'watch' : 'positive',
      title: `${top.name} contributes the largest monthly gross profit`,
      detail: `${fmtUSD(top.profit)} per month, ${fmtPct(share)} of portfolio profit${share >= 40 ? ' — a high concentration if this account were lost or repriced' : ''}.`,
      evidence: `Share of portfolio gross profit: ${fmtPct(share)}`,
      action: share >= 40 ? 'Consider the concentration risk and protect this relationship.' : 'Study what makes this account work and whether it can be replicated.',
    });
  }

  // 8. Highest margin
  if (many && highest.id !== top?.id) {
    out.push({
      id: 'highest',
      level: 'positive',
      title: `${highest.name} has the highest gross margin`,
      detail: `${fmtPct(highest.margin)} on ${fmtUSD(highest.revenue)} monthly revenue.`,
      evidence: `Margin vs portfolio: ${fmtPts(highest.margin - summary.margin)}`,
      action: 'Look at pricing and cost structure here for ideas that could apply to weaker accounts.',
    });
  }

  // 9. Labor productivity (labor hours are informational; already inside operating cost)
  const withLabor = customers.filter((c) => c.laborHours > 0);
  if (withLabor.length > 1 && summary.laborHours > 0) {
    const pph = (c) => c.profit / c.laborHours;
    const worst = [...withLabor].sort((a, b) => pph(a) - pph(b))[0];
    const avg = summary.laborProfit / summary.laborHours;
    out.push({
      id: 'labor',
      level: 'info',
      title: `${worst.name} earns the least gross profit per labor hour`,
      detail: `${fmtUSD2(pph(worst))} per labor hour versus ${fmtUSD2(avg)} across the portfolio. Labor hours are shown for context only; labor is already included in operating cost and is not added again.`,
      evidence: `${worst.laborHours.toLocaleString('en-US')} labor hours · ${fmtUSD(worst.profit)} gross profit`,
      action: 'Evaluate labor productivity for this account.',
    });
  }

  // 10. Automation (hypothetical)
  if (automation) {
    out.push({
      id: 'automation',
      level: 'info',
      title: `Automating repetitive analysis could free about ${fmtHours(automation.hoursSaved)} per month (hypothetical)`,
      detail: `Based on the editable assumptions in Efficiency & ROI. This is capacity that could be redirected to analysis — it is not a verified cost saving or a guaranteed payroll reduction.`,
      evidence: `${fmtPct(automation.reductionPct, 0)} less preparation time`,
      action: 'Validate the time assumptions with the team before using them in any business case.',
    });
  }

  const rank = { risk: 0, watch: 1, positive: 2, info: 3 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

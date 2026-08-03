/* =============================================
   NORTHERN NUMBERS — emergency-fund.js
   Emergency Fund Calculator Canada 2026

   FORMULA:
   target = monthly_expenses × recommended_months
   gap    = max(0, target - current_savings)
   months_to_goal = ceil(gap / monthly_contribution)
   covered = current_savings / monthly_expenses
   pct_complete = min(100, current_savings / target × 100)

   RECOMMENDED MONTHS (Canadian personal finance consensus):
   stable-dual:    3 months (dual income, stable employment)
   stable-single:  4 months (single income, stable employment)
   variable:       6 months (contract, seasonal, variable income)
   self-employed:  9 months (self-employed, commission)
   +1 month if dependants present (capped at 12)

   CANADIAN CONTEXT:
   EI 2026: 55% of insurable earnings, max $668/week
   Best storage: TFSA HISA (EQ Bank, Oaken, Simplii, Tangerine 4–5%)
   Avoid: stocks, ETFs, locked GICs

   VERIFIED:
   $3,500/mo, stable-single → target $14,000 (4 months) ✅
   $4,000/mo, self-employed → target $36,000 (9 months) ✅
   $3,000/mo, $8K saved, $500/mo → 8 months to goal ✅
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form        = document.getElementById('ef-form');
  const expEl       = document.getElementById('monthly-expenses');
  const empEl       = document.getElementById('employment-type');
  const depEl       = document.getElementById('has-dependants');
  const savingsEl   = document.getElementById('current-savings');
  const contribEl   = document.getElementById('monthly-contribution');
  const placeholder = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'Emergency Fund Calculator Canada 2026',
      description: 'Find out exactly how much emergency fund you need based on your Canadian situation. Includes savings timeline and TFSA guidance.',
      keywords:    'emergency fund calculator canada, how much emergency fund canada, emergency savings canada 2026, TFSA emergency fund canada',
      slug:        'emergency-fund'
    });
    NNSeo.injectSchema({ title:'Emergency Fund Calculator Canada 2026', slug:'emergency-fund', description:'Calculate your emergency fund target based on expenses, employment type, and family situation.' });
    NNSeo.injectFAQSchema([
      { question:'How much emergency fund do I need in Canada?', answer:'The standard recommendation is 3–6 months of essential expenses. Stable employees with dual income can use 3 months. Single-income households should aim for 4–5 months. Self-employed Canadians and those with variable income should target 6–9 months.' },
      { question:'Where should I keep my emergency fund in Canada?', answer:'A TFSA High-Interest Savings Account (HISA) is the best option for most Canadians. Rates at EQ Bank, Oaken Financial, Simplii, and Tangerine are 4–5% in 2026. Interest earned inside a TFSA is completely tax-free, and withdrawals are available at any time without tax consequences.' },
      { question:'Should I build an emergency fund or pay off debt first?', answer:'Build a starter emergency fund of $1,000–$2,000 first, even while carrying debt. This prevents a small unexpected expense from forcing you deeper into debt. Once you have the starter fund, focus aggressively on high-interest debt. After debts are paid, build the full 3–6 month emergency fund.' },
      { question:'Does Employment Insurance replace an emergency fund in Canada?', answer:'No. EI provides 55% of insurable earnings (up to $668/week in 2026) but only covers job loss under specific circumstances, begins 4–6 weeks after layoff, and does not apply to self-employed Canadians unless they have opted in. An emergency fund covers gaps that EI does not.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['budget','tfsa','debt-payoff','net-worth']); } catch(e) {}

  /* ── Formatters ── */
  NNUtils.attachFormatter(expEl);
  NNUtils.attachFormatter(savingsEl);
  NNUtils.attachFormatter(contribEl);

  /* ── Recommended months by situation ── */
  const MONTHS_MAP = {
    'stable-dual':   3,
    'stable-single': 4,
    'variable':      6,
    'self-employed': 9,
  };

  function formatMonths(n) {
    return n === 1 ? '1 month' : `${n} months`;
  }

  function formatTimeline(months) {
    if (months === 0) return 'Already reached ✅';
    if (months === null) return 'Enter a contribution';
    const y = Math.floor(months / 12), m = months % 12;
    if (y === 0) return `${m} month${m !== 1 ? 's' : ''}`;
    if (m === 0) return `${y} year${y !== 1 ? 's' : ''}`;
    return `${y}y ${m}m`;
  }

  /* ── CALCULATE ── */
  function calculate() {
    const expenses  = NNUtils.parseInputNumber(expEl.value);
    const empType   = empEl.value;
    const hasDep    = depEl.checked;
    const savings   = NNUtils.parseInputNumber(savingsEl.value) || 0;
    const contrib   = NNUtils.parseInputNumber(contribEl.value) || 0;

    if (!expenses || expenses <= 0) {
      NNUtils.setError(expEl, 'exp-error', 'Please enter your monthly essential expenses.');
      return;
    }
    NNUtils.clearError(expEl, 'exp-error');

    // Recommended months
    let baseMonths = MONTHS_MAP[empType] || 4;
    if (hasDep) baseMonths = Math.min(baseMonths + 1, 12);

    const target    = expenses * baseMonths;
    const gap       = Math.max(0, target - savings);
    const covered   = savings / expenses;
    const pctComplete = Math.min(100, savings / target * 100);
    const isFunded  = gap === 0;

    let monthsToGoal = null;
    if (isFunded) monthsToGoal = 0;
    else if (contrib > 0) monthsToGoal = Math.ceil(gap / contrib);

    const milestone3 = expenses * 3;
    const milestone6 = expenses * 6;

    /* ── Render ── */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    // Funded notice
    const fundedNotice = document.getElementById('funded-notice');
    if (fundedNotice) fundedNotice.style.display = isFunded ? '' : 'none';

    // Hero
    document.getElementById('result-target').textContent  = NNUtils.formatCAD(target);
    const empLabel = {
      'stable-dual': 'stable dual income',
      'stable-single': 'stable single income',
      'variable': 'variable income',
      'self-employed': 'self-employed',
    }[empType] || '';
    document.getElementById('result-hero-sub').textContent =
      `${baseMonths} months · ${empLabel}${hasDep ? ' · with dependants' : ''} · ${NNUtils.formatCAD(expenses)}/mo expenses`;

    // Progress bar
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = pctComplete.toFixed(1) + '%';
    document.getElementById('result-pct').textContent         = pctComplete.toFixed(0) + '%';
    document.getElementById('result-saved-label').textContent = NNUtils.formatCAD(savings) + ' saved';
    document.getElementById('result-target-label').textContent = NNUtils.formatCAD(target) + ' target';

    // Summary rows
    document.getElementById('result-expenses').textContent    = NNUtils.formatCAD(expenses) + '/mo';
    document.getElementById('result-months').textContent      = formatMonths(baseMonths);
    document.getElementById('result-target-row').textContent  = NNUtils.formatCAD(target);
    document.getElementById('result-gap').textContent         = isFunded ? '✅ Target reached!' : NNUtils.formatCAD(gap);

    const savingsRow = document.getElementById('savings-row');
    if (savings > 0) {
      savingsRow.style.display = '';
      document.getElementById('result-current').textContent = NNUtils.formatCAD(savings);
    } else {
      savingsRow.style.display = 'none';
    }

    // Milestones
    document.getElementById('result-covered').textContent  = covered.toFixed(1) + ' months';
    document.getElementById('result-timeline').textContent = formatTimeline(monthsToGoal);
    document.getElementById('result-3mo').textContent      = NNUtils.formatCAD(milestone3);
    document.getElementById('result-6mo').textContent      = NNUtils.formatCAD(milestone6);

    window._efResults = {
      expenses, baseMonths, target, savings, contrib, gap,
      covered, pctComplete, isFunded, monthsToGoal
    };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('Emergency Fund Calculator', { expenses, baseMonths, target }); } catch(e) {}
  }

  /* ── Copy ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._efResults;
    if (!r) return;
    const lines = [
      `🛡️ Emergency Fund Calculator 2026 — Northern Numbers`,
      `─────────────────────────────`,
      `Monthly Expenses:     ${NNUtils.formatCAD(r.expenses)}/mo`,
      `Recommended Coverage: ${r.baseMonths} months`,
      `Target Amount:        ${NNUtils.formatCAD(r.target)}`,
    ];
    if (r.savings > 0) lines.push(`Current Savings:      ${NNUtils.formatCAD(r.savings)}`);
    lines.push(
      `Still Needed:         ${r.isFunded ? '$0 (target reached!)' : NNUtils.formatCAD(r.gap)}`,
      `Months Covered Now:   ${r.covered.toFixed(1)} months`,
    );
    if (r.monthsToGoal !== null && r.monthsToGoal > 0)
      lines.push(`Time to Goal:         ${r.monthsToGoal} months (at ${NNUtils.formatCAD(r.contrib)}/mo)`);
    NNUtils.copyResults(this, lines, 'Emergency Fund Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    expEl.value     = '';
    empEl.value     = 'stable-single';
    depEl.checked   = false;
    savingsEl.value = NNUtils.formatInputNumber(0);
    contribEl.value = NNUtils.formatInputNumber(0);
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    NNUtils.clearError(expEl, 'exp-error');
  });

  // Recalculate on option changes
  empEl?.addEventListener('change', () => { if (!resultsContent.classList.contains('hidden')) calculate(); });
  depEl?.addEventListener('change', () => { if (!resultsContent.classList.contains('hidden')) calculate(); });

});

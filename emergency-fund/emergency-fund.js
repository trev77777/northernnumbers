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
      { question:'Should I build an emergency fund before paying off debt?', answer:'Build a starter emergency fund of $1,000–$2,000 first, even while carrying high-interest debt. Without any cushion, a small unexpected expense — a car repair, a dental bill — forces you back into debt. Once you have that starter fund, attack high-interest debt aggressively. After the debt is paid off, build the full 3–6 month emergency fund. This sequence prevents you from running in circles between saving and debt repayment.' },
      { question:'Can I use my TFSA as an emergency fund in Canada?', answer:'Yes — and it\'s often the best approach. A TFSA HISA gives you tax-free interest (currently 4–5% at online banks), full flexibility to withdraw at any time without tax consequences, and your contribution room is restored the following January 1 after a withdrawal. Keep the money in a simple savings account within the TFSA, not in stocks or ETFs, to ensure it\'s accessible and not subject to market drops when you need it most.' },
      { question:'What qualifies as a true emergency?', answer:'True emergencies are unexpected, necessary, and urgent: job loss, major medical expenses not covered by provincial health care, essential car repairs (if you need the car for work), urgent home repairs (a broken furnace in January), or a family emergency requiring travel. Vacations, new phones, holiday gifts, and planned purchases are not emergencies — those belong in a separate savings goal. Keeping your emergency fund mentally separate helps prevent spending it on non-emergencies.' },
      { question:'How much is enough — should I use expenses or income as the base?', answer:'Use essential monthly expenses, not gross income. An emergency fund is designed to cover your needs while you recover — not to replace your entire lifestyle. Add up rent or mortgage, groceries, utilities, insurance, minimum debt payments, transportation, and phone. Leave out discretionary spending like dining out, subscriptions, and entertainment. This gives you a realistic, achievable target that covers what you actually need to survive a crisis.' },
      { question:'What if I have a home equity line of credit (HELOC) — do I still need an emergency fund?', answer:'A HELOC can serve as a backup, but it should not replace a cash emergency fund. HELOCs can be frozen or reduced by lenders during a financial crisis — exactly when you need them most. In 2008–2009, many Canadian banks reduced HELOC limits as home values dropped. A cash emergency fund is yours unconditionally. A HELOC is a credit facility that a lender can restrict. Use the HELOC as a last resort for large emergencies beyond your cash fund, not as a substitute for one.' },
      { question:'Should my emergency fund be bigger if I have a mortgage?', answer:'Yes — homeowners generally need a larger emergency fund than renters. Missing mortgage payments has severe consequences (credit damage, power of sale proceedings), and homeowners face unexpected maintenance costs that renters don\'t — a new furnace ($3,000–$8,000), roof repairs ($5,000–$15,000), or a failed water heater ($1,000–$2,000). Financial planners often recommend homeowners target 5–6 months rather than the standard 3, plus a separate home maintenance fund of 1–2% of home value per year.' },
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
    if (window.NNUtils) try { NNUtils.scrollToCalcTop(); } catch(e) {}
  });

  // Recalculate on option changes
  empEl?.addEventListener('change', () => { if (!resultsContent.classList.contains('hidden')) calculate(); });
  depEl?.addEventListener('change', () => { if (!resultsContent.classList.contains('hidden')) calculate(); });

});

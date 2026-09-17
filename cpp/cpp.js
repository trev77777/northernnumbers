/* =============================================
   NORTHERN NUMBERS — cpp.js
   Canada Pension Plan (CPP) Calculator 2026

   FORMULA:
   1. Pensionable earnings = min(income, YMPE) - basic_exemption
   2. Base monthly benefit = (pensionable / YMPE) × MAX_MONTHLY × (years / 39)
   3. Age factor = 1 + (months_from_65 × rate)
      Early (before 65): -0.6% per month → max -36% at 60
      Late  (after 65):  +0.7% per month → max +42% at 70
   4. Monthly benefit = base × age_factor

   2026 figures (YMPE, max monthly benefit) come from data/nn-constants.js
   (NN.CPP) — the shared source of truth. Do not hardcode a private copy.
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form          = document.getElementById('cpp-form');
  const avgIncomeEl   = document.getElementById('avg-income');
  const yearsEl       = document.getElementById('years-contributed');
  const startAgeEl    = document.getElementById('start-age');
  const currentAgeEl  = document.getElementById('current-age');
  const placeholder   = document.getElementById('results-placeholder');
  const resultsContent= document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'CPP Calculator Canada 2026',
      description: 'Free Canada Pension Plan calculator. Estimate your monthly CPP benefit at age 60, 65, or 70 based on your income and contribution years.',
      keywords:    'cpp calculator canada 2026, canada pension plan calculator, cpp benefit calculator, when to take cpp',
      slug:        'cpp'
    });
    NNSeo.injectSchema({ title:'CPP Calculator Canada 2026', slug:'cpp', description:'Estimate your CPP retirement benefit at 60, 65, or 70 based on income and contribution years.' });
    NNSeo.injectFAQSchema([
      { question:'Can I collect CPP and still work?', answer:'Yes. If you are under 70 and still working while collecting CPP, you and your employer continue to contribute to CPP through the Post-Retirement Benefit (PRB). Each year of contributions after you start CPP adds a small additional monthly benefit to your pension, paid the following year. At age 70 contributions stop automatically.' },
      { question:'Does CPP affect my OAS or GIS?', answer:'CPP income counts toward your net income for OAS clawback purposes. If your total income — including CPP — exceeds $95,323 in 2026, your OAS benefit will be reduced. CPP income also reduces your Guaranteed Income Supplement (GIS) eligibility, since GIS is income-tested. Use our OAS Calculator to see how your CPP income affects your OAS and GIS amounts.' },
      { question:'What happens to my CPP if I die early?', answer:'CPP provides survivor benefits. Your spouse or common-law partner may receive the CPP Survivor\'s Pension — up to 60% of your CPP if they are 65 or older, or a reduced amount if they are younger. Your dependent children may also receive the Children\'s Benefit. A one-time Death Benefit of up to $2,500 is paid to your estate.' },
      { question:'Is CPP income taxable?', answer:'Yes, CPP retirement benefits are fully taxable as income. Service Canada will issue you a T4A(P) slip each year showing your total CPP income. You can request that tax be withheld at source, or pay tax through quarterly installments. Unlike GIS, CPP does not have any tax-free status.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['oas', 'rrsp', 'income-tax', 'rrif']); } catch(e) {}

  /* ── Formatters ── */
  NNUtils.attachFormatter(avgIncomeEl);

  /* ── CORE CALCULATION (reads shared constants — see data/nn-constants.js) ── */
  const CPP_MAX_MONTHLY = (window.NN && NN.CPP && NN.CPP.MAX_MONTHLY_65) ? NN.CPP.MAX_MONTHLY_65 : 1507.65;  // 2026 maximum at age 65 (Service Canada)
  const CPP_YMPE        = (window.NN && NN.CPP) ? NN.CPP.YMPE : 74600;
  const CPP_EXEMPTION   = (window.NN && NN.CPP) ? NN.CPP.BASIC_EXEMPTION : 3500;
  const MAX_YEARS       = 39;

  function ageFactor(startAge) {
    const monthsDiff = (startAge - 65) * 12;
    if (monthsDiff < 0) return Math.max(0.64, 1 + monthsDiff * 0.006);
    return Math.min(1.42, 1 + monthsDiff * 0.007);
  }

  function calcCPP(avgIncome, years, startAge) {
    const pensionable  = Math.max(0, Math.min(avgIncome, CPP_YMPE) - CPP_EXEMPTION);
    const proportion   = Math.min(years / MAX_YEARS, 1.0);
    const baseMonthly  = (pensionable / CPP_YMPE) * CPP_MAX_MONTHLY * proportion;
    const factor       = ageFactor(startAge);
    return {
      monthly:    Math.round(baseMonthly * factor * 100) / 100,
      annual:     Math.round(baseMonthly * factor * 12 * 100) / 100,
      base:       Math.round(baseMonthly * 100) / 100,
      factor:     Math.round(factor * 100 * 10) / 10
    };
  }

  function calculate() {
    const avgIncome = NNUtils.parseInputNumber(avgIncomeEl.value);
    const years     = parseInt(yearsEl.value) || 0;
    const startAge  = parseInt(startAgeEl.value) || 65;
    const currentAge= parseInt(currentAgeEl?.value) || 45;

    if (!avgIncome || avgIncome <= 0) {
      NNUtils.setError(avgIncomeEl, 'avg-income-error', 'Please enter your average annual income.');
      return;
    }
    NNUtils.clearError(avgIncomeEl, 'avg-income-error');

    if (!years || years < 1 || years > 39) {
      NNUtils.setError(yearsEl, 'years-error', 'Enter years contributed between 1 and 39.');
      return;
    }
    NNUtils.clearError(yearsEl, 'years-error');

    const r = calcCPP(avgIncome, years, startAge);
    const yearsUntil = Math.max(0, startAge - currentAge);
    const lifeExpect = 85; // conservative Canadian average
    const yearsReceiving = Math.max(0, lifeExpect - startAge);
    const lifetimeTotal = r.annual * yearsReceiving;

    /* Render */
    const wasHidden = resultsContent.classList.contains('hidden');
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    document.getElementById('result-age-label').textContent   = startAge;
    document.getElementById('result-monthly').textContent     = NNUtils.formatCAD(r.monthly);
    document.getElementById('result-annual-sub').textContent  = NNUtils.formatCAD(r.annual) + ' per year';
    document.getElementById('result-monthly-row').textContent = NNUtils.formatCAD(r.monthly);
    document.getElementById('result-annual').textContent      = NNUtils.formatCAD(r.annual);
    document.getElementById('result-adjustment').textContent  =
      startAge === 65 ? 'None (standard age)' :
      startAge < 65   ? `−${(100 - r.factor).toFixed(1)}% (took early)` :
                        `+${(r.factor - 100).toFixed(1)}% (delayed)`;
    document.getElementById('result-base').textContent        = NNUtils.formatCAD(r.base) + '/month';
    document.getElementById('result-years-until').textContent = yearsUntil === 0 ? 'Now' : yearsUntil + ' years';
    document.getElementById('result-lifetime').textContent    = NNUtils.formatCAD(lifetimeTotal) + ` (to age ${lifeExpect})`;

    // Income replacement rate
    const replacementRate = avgIncome > 0 ? (r.annual / avgIncome * 100) : 0;
    const replacementEl = document.getElementById('result-replacement');
    if (replacementEl) replacementEl.textContent = replacementRate.toFixed(1) + '%';

    /* Age comparison table */
    const compEl = document.getElementById('age-comparison');
    if (compEl) {
      const ages = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70];
      compEl.innerHTML = ages.map(age => {
        const cr = calcCPP(avgIncome, years, age);
        const isSelected = age === startAge;
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);margin-bottom:2px;${isSelected ? 'background:var(--color-primary-light);font-weight:700;' : 'border-bottom:1px solid var(--color-border);'}">
          <span style="${isSelected ? 'color:var(--color-primary)' : 'color:var(--color-text-muted)'}">Age ${age}${isSelected ? ' ← your choice' : ''}</span>
          <span style="${isSelected ? 'color:var(--color-primary)' : ''}">${NNUtils.formatCAD(cr.monthly)}/mo &nbsp; <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${cr.factor > 100 ? '+' : cr.factor < 100 ? '' : ''}${(cr.factor - 100).toFixed(1)}%</span></span>
        </div>`;
      }).join('');
    }

    /* Break-even analysis */
    const beEl = document.getElementById('breakeven-analysis');
    if (beEl) {
      const base65 = calcCPP(avgIncome, years, 65);
      let html = '';

      [60, 70].forEach(compareAge => {
        const cr = calcCPP(avgIncome, years, compareAge);
        if (compareAge < 65) {
          // Break-even: when does taking at 65 surpass taking at 60?
          // Monthly diff = base65.monthly - cr.monthly (65 pays more per month)
          // Cost of waiting = cr.monthly * months_waited (income lost while waiting)
          const monthsWaited = (65 - compareAge) * 12;
          const incomeLost = cr.monthly * monthsWaited;
          const monthlyGain = base65.monthly - cr.monthly;
          const breakEvenMonths = monthlyGain > 0 ? incomeLost / monthlyGain : 0;
          const breakEvenAge = 65 + breakEvenMonths / 12;
          html += `<div style="padding:var(--space-3) 0;border-bottom:1px solid var(--color-border)">
            <p style="font-weight:600;margin-bottom:var(--space-1)">Take at 60 vs 65</p>
            <p style="font-size:var(--text-sm);color:var(--color-text-muted)">
              Taking at 60: ${NNUtils.formatCAD(cr.monthly)}/mo · Taking at 65: ${NNUtils.formatCAD(base65.monthly)}/mo<br>
              Break-even age: <strong>~${Math.round(breakEvenAge)}</strong> — if you live past this, waiting to 65 pays more total.
            </p>
          </div>`;
        } else {
          // Break-even: when does taking at 70 surpass taking at 65?
          const monthsWaited = (compareAge - 65) * 12;
          const incomeLost = base65.monthly * monthsWaited;
          const monthlyGain = cr.monthly - base65.monthly;
          const breakEvenMonths = monthlyGain > 0 ? incomeLost / monthlyGain : 0;
          const breakEvenAge = compareAge + breakEvenMonths / 12;
          html += `<div style="padding:var(--space-3) 0">
            <p style="font-weight:600;margin-bottom:var(--space-1)">Take at 65 vs 70</p>
            <p style="font-size:var(--text-sm);color:var(--color-text-muted)">
              Taking at 65: ${NNUtils.formatCAD(base65.monthly)}/mo · Taking at 70: ${NNUtils.formatCAD(cr.monthly)}/mo<br>
              Break-even age: <strong>~${Math.round(breakEvenAge)}</strong> — if you live past this, waiting to 70 pays more total.
            </p>
          </div>`;
        }
      });
      beEl.innerHTML = html;
    }

    window._cppResults = { avgIncome, years, startAge, r, lifetimeTotal };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('CPP Calculator', { startAge, years }); } catch(e) {}
  }

  /* ── Auto-recalc on age change ── */
  startAgeEl?.addEventListener('change', function() {
    if (!resultsContent.classList.contains('hidden')) calculate();
  });

  /* ── Copy Results ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._cppResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `🇨🇦 CPP Benefit Estimate 2026`,
      `─────────────────────────────`,
      `💰 Average Income:       ${NNUtils.formatCAD(r.avgIncome)}`,
      `📅 Years Contributed:    ${r.years} years`,
      `🎂 Starting Age:         ${r.startAge}`,
      `─────────────────────────────`,
      `💵 Monthly CPP:          ${NNUtils.formatCAD(r.r.monthly)}`,
      `📆 Annual CPP:           ${NNUtils.formatCAD(r.r.annual)}`,
      `📈 Age Adjustment:       ${r.r.factor > 100 ? '+' : ''}${(r.r.factor - 100).toFixed(1)}%`,
      `🏦 Lifetime Total:       ${NNUtils.formatCAD(r.lifetimeTotal)} (to age 85)`,
      `💼 Income Replacement:   ${(r.r.annual / r.avgIncome * 100).toFixed(1)}%`
    ], 'CPP Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    avgIncomeEl.value    = NNUtils.formatInputNumber(CPP_YMPE);
    yearsEl.value        = '35';
    startAgeEl.value     = '65';
    if (currentAgeEl) currentAgeEl.value = '45';
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    NNUtils.clearError(avgIncomeEl, 'avg-income-error');
    NNUtils.clearError(yearsEl, 'years-error');
  });

});

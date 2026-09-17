/* =============================================
   NORTHERN NUMBERS — oas.js
   Old Age Security (OAS) Calculator 2026

   FORMULAS:
   1. OAS proportion = min(years_in_canada / 40, 1.0)
      Partial: each year = 2.5% of full amount
   2. Base monthly = OAS_RATE × proportion (see NN.OAS in nn-constants.js)
   3. Deferral factor = 1 + (months_after_65 × 0.006)
      Max 36% at age 70
   4. Gross monthly = base × deferral_factor
   5. Clawback = max(0, net_income - NN.OAS.CLAWBACK_THRESHOLD) × 0.15 / 12
   6. Net monthly = max(0, gross - clawback)

   GIS:
   - Reduces by $1 for every $2 of other monthly income
   - Maximums: see NN.GIS in nn-constants.js

   IMPORTANT: OAS and GIS monthly amounts are indexed to CPI every
   January/April/July/October — they are NOT fixed for the full year.
   The figures used here are for the quarter in NN.OAS.QUARTER_LABEL /
   NN.GIS.QUARTER_LABEL (data/nn-constants.js). Re-verify against
   canada.ca each quarter rather than assuming these hold all year.
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form          = document.getElementById('oas-form');
  const currentAgeEl  = document.getElementById('current-age');
  const startAgeEl    = document.getElementById('start-age');
  const yearsEl       = document.getElementById('years-in-canada');
  const netIncomeEl   = document.getElementById('net-income');
  const ageGroupEl    = document.getElementById('age-group');
  const maritalEl     = document.getElementById('marital-status');
  const otherIncomeEl = document.getElementById('other-income');
  const placeholder   = document.getElementById('results-placeholder');
  const resultsContent= document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'OAS Calculator Canada 2026',
      description: 'Free Old Age Security calculator. Calculate your monthly OAS benefit, GIS eligibility, clawback amount, and deferral bonus for 2026.',
      keywords:    'oas calculator canada 2026, old age security calculator, oas clawback calculator, gis calculator canada',
      slug:        'oas'
    });
    NNSeo.injectSchema({ title:'OAS Calculator Canada 2026', slug:'oas', description:'Calculate your OAS benefit, GIS eligibility, clawback, and deferral bonus for 2026.' });
    NNSeo.injectFAQSchema([
      { question:'Do I have to apply for OAS or is it automatic?', answer:'OAS is not automatic for everyone. Some Canadians are enrolled automatically and receive a letter from Service Canada the month after their 64th birthday. If you do not receive a letter, you must apply. You can apply online through My Service Canada Account or by paper application. Apply at least 6 months before you want payments to begin to avoid delays.' },
      { question:'Can I receive OAS if I live outside Canada?', answer:'Yes, if you are 65 or older, a Canadian citizen or legal resident, and have lived in Canada for at least 20 years after age 18, you can receive OAS while living abroad. If you have fewer than 20 years, you can only receive OAS while residing in Canada or in a country with a social security agreement with Canada.' },
      { question:'Is OAS affected by CPP income?', answer:'Yes indirectly. OAS itself is not based on CPP, but your CPP income counts toward your net income for the OAS clawback calculation. If your total net income — including CPP — exceeds $95,323, your OAS will be reduced by 15 cents for every dollar above that threshold.' },
      { question:'What is the difference between OAS and GIS?', answer:'OAS is a universal pension available to all eligible Canadians 65 and older — it is taxable income. GIS is an additional non-taxable benefit for low-income OAS recipients. You must already receive OAS to receive GIS. GIS is income-tested and reduces as your other income increases, phasing out entirely when your income reaches approximately $25,000 per year for singles.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['cpp', 'rrsp', 'income-tax', 'rrif']); } catch(e) {}

  /* ── Formatters ── */
  NNUtils.attachFormatter(netIncomeEl);
  NNUtils.attachFormatter(otherIncomeEl);

  /* ── Auto-recalc on dropdown change ── */
  [startAgeEl, ageGroupEl, maritalEl].forEach(el => {
    el?.addEventListener('change', function() {
      if (!resultsContent.classList.contains('hidden')) calculate();
    });
  });

  /* ── CONSTANTS (reads data/nn-constants.js — the shared source of
     truth for OAS/GIS; fallback literals below are the July–September
     2026 quarter and only apply if that shared file failed to load) ── */
  const OAS_65_74      = (window.NN && NN.OAS) ? NN.OAS.MONTHLY_65_TO_74 : 751.97;
  const OAS_75_PLUS    = (window.NN && NN.OAS) ? NN.OAS.MONTHLY_75_PLUS  : 827.17;
  const CLAWBACK_THRESH= (window.NN && NN.OAS) ? NN.OAS.CLAWBACK_THRESHOLD : 95323;
  const CLAWBACK_RATE  = (window.NN && NN.OAS) ? NN.OAS.CLAWBACK_RATE : 0.15;
  const DEFERRAL_RATE  = 0.006;
  const FULL_YEARS     = 40;
  const GIS_SINGLE_MAX = (window.NN && NN.GIS) ? NN.GIS.MAX_MONTHLY_SINGLE : 1123.17;
  const GIS_COUPLE_MAX = (window.NN && NN.GIS) ? NN.GIS.MAX_MONTHLY_COUPLE : 676.09;
  const OAS_QUARTER    = (window.NN && NN.OAS && NN.OAS.QUARTER_LABEL) ? NN.OAS.QUARTER_LABEL : 'current quarter';

  /* ── CALCULATION ENGINE ── */
  function calcOAS(years, startAge, netIncome, ageGroup) {
    const proportion    = Math.min(years / FULL_YEARS, 1.0);
    const baseRate      = ageGroup === '75_plus' ? OAS_75_PLUS : OAS_65_74;
    const monthsDeferred= Math.max(0, (startAge - 65) * 12);
    const deferralFactor= 1 + Math.min(monthsDeferred * DEFERRAL_RATE, 0.36);
    const grossMonthly  = baseRate * proportion * deferralFactor;
    const annualClawback= Math.max(0, netIncome - CLAWBACK_THRESH) * CLAWBACK_RATE;
    const monthlyClawback = annualClawback / 12;
    const netMonthly    = Math.max(0, grossMonthly - monthlyClawback);

    return {
      proportion:       Math.round(proportion * 100 * 10) / 10,
      deferralFactor:   Math.round(deferralFactor * 100 * 10) / 10,
      grossMonthly:     Math.round(grossMonthly * 100) / 100,
      monthlyClawback:  Math.round(monthlyClawback * 100) / 100,
      netMonthly:       Math.round(netMonthly * 100) / 100,
      annualNet:        Math.round(netMonthly * 12 * 100) / 100,
      baseRate,
    };
  }

  function calcGIS(netMonthlyOAS, otherMonthly, marital) {
    const maxGIS = marital === 'couple' ? GIS_COUPLE_MAX : GIS_SINGLE_MAX;
    // GIS reduces $1 per $2 of other income (excluding OAS)
    const reduction = otherMonthly / 2;
    const gis = Math.max(0, maxGIS - reduction);
    return Math.round(gis * 100) / 100;
  }

  /* ── CALCULATE ── */
  function calculate() {
    const years      = parseInt(yearsEl.value) || 0;
    const startAge   = parseInt(startAgeEl.value) || 65;
    const currentAge = parseInt(currentAgeEl?.value) || 64;
    const netIncome  = NNUtils.parseInputNumber(netIncomeEl.value);
    const ageGroup   = ageGroupEl?.value || '65_74';
    const marital    = maritalEl?.value || 'single';
    const otherIncome= NNUtils.parseInputNumber(otherIncomeEl?.value || '0');

    if (years < 10) {
      NNUtils.setError(yearsEl, 'years-error', 'Minimum 10 years in Canada required for OAS.');
      return;
    }
    NNUtils.clearError(yearsEl, 'years-error');

    if (isNaN(netIncome) || netIncome < 0) {
      NNUtils.setError(netIncomeEl, 'income-error', 'Please enter your estimated net annual income.');
      return;
    }
    NNUtils.clearError(netIncomeEl, 'income-error');

    const r = calcOAS(years, startAge, netIncome, ageGroup);
    const gis = calcGIS(r.netMonthly, otherIncome, marital);
    const totalMonthly = r.netMonthly + gis;
    const yearsUntil = Math.max(0, startAge - currentAge);
    const lifeExpect = 85;
    const yearsReceiving = Math.max(0, lifeExpect - startAge);
    const lifetimeTotal = r.annualNet * yearsReceiving;
    const gisEligible = gis > 0;

    /* Render */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    document.getElementById('result-monthly-oas').textContent  = NNUtils.formatCAD(r.netMonthly);
    document.getElementById('result-annual-sub').textContent   = NNUtils.formatCAD(r.annualNet) + ' per year';
    document.getElementById('result-base-oas').textContent     = NNUtils.formatCAD(r.baseRate) + '/month (full)';
    document.getElementById('result-eligibility').textContent  = r.proportion + '% of full OAS (' + years + ' of 40 years)';
    document.getElementById('result-deferral').textContent     = startAge === 65 ? 'None (standard age)' : '+' + (r.deferralFactor - 100).toFixed(1) + '% for deferring to ' + startAge;
    document.getElementById('result-clawback').textContent     = r.monthlyClawback > 0 ? '−' + NNUtils.formatCAD(r.monthlyClawback) + '/month' : 'None (income below threshold)';
    document.getElementById('result-net-oas').textContent      = NNUtils.formatCAD(r.netMonthly) + '/month';
    document.getElementById('result-gis-eligible').textContent = gisEligible ? '✅ Eligible' : 'Not eligible (income too high)';
    document.getElementById('result-gis-amount').textContent   = gisEligible ? NNUtils.formatCAD(gis) + '/month' : '—';
    document.getElementById('result-total-monthly').textContent= NNUtils.formatCAD(totalMonthly) + '/month';
    document.getElementById('result-annual-oas').textContent   = NNUtils.formatCAD(r.annualNet);
    document.getElementById('result-years-until').textContent  = yearsUntil === 0 ? 'Now' : yearsUntil + ' year' + (yearsUntil !== 1 ? 's' : '');
    document.getElementById('result-lifetime').textContent     = NNUtils.formatCAD(lifetimeTotal);

    /* Deferral comparison table */
    const compEl = document.getElementById('deferral-comparison');
    if (compEl) {
      compEl.innerHTML = [65,66,67,68,69,70].map(age => {
        const cr = calcOAS(years, age, netIncome, ageGroup);
        const isSel = age === startAge;
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);margin-bottom:2px;${isSel ? 'background:var(--color-primary-light);font-weight:700;' : 'border-bottom:1px solid var(--color-border);'}">
          <span style="${isSel ? 'color:var(--color-primary)' : 'color:var(--color-text-muted)'}">Age ${age}${isSel ? ' ← your choice' : ''}</span>
          <span style="${isSel ? 'color:var(--color-primary)' : ''}">${NNUtils.formatCAD(cr.netMonthly)}/mo &nbsp;<span style="font-size:var(--text-xs);color:var(--color-text-muted)">${age > 65 ? '+' : ''}${(cr.deferralFactor - 100).toFixed(1)}%</span></span>
        </div>`;
      }).join('');
    }

    window._oasResults = { years, startAge, netIncome, r, gis, totalMonthly, lifetimeTotal };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('OAS Calculator', { startAge, years }); } catch(e) {}
  }

  /* ── Copy Results ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._oasResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `🏅 OAS Benefit Estimate 2026`,
      `─────────────────────────────`,
      `📅 Years in Canada:      ${r.years}`,
      `🎂 Starting Age:         ${r.startAge}`,
      `💰 Net Annual Income:    ${NNUtils.formatCAD(r.netIncome)}`,
      `─────────────────────────────`,
      `💵 Monthly OAS (net):    ${NNUtils.formatCAD(r.r.netMonthly)}`,
      `📆 Annual OAS:           ${NNUtils.formatCAD(r.r.annualNet)}`,
      `📈 Deferral Bonus:       ${r.startAge > 65 ? '+' + (r.r.deferralFactor - 100).toFixed(1) + '%' : 'None'}`,
      `⚠️  Clawback:             ${r.r.monthlyClawback > 0 ? '−' + NNUtils.formatCAD(r.r.monthlyClawback) + '/mo' : 'None'}`,
      `🎁 GIS:                  ${r.gis > 0 ? NNUtils.formatCAD(r.gis) + '/mo' : 'Not eligible'}`,
      `💼 Total Monthly:        ${NNUtils.formatCAD(r.totalMonthly)}`,
      `🏦 Lifetime (to 85):     ${NNUtils.formatCAD(r.lifetimeTotal)}`
    ], 'OAS Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    if (currentAgeEl)  currentAgeEl.value  = '64';
    if (startAgeEl)    startAgeEl.value    = '65';
    if (yearsEl)       yearsEl.value       = '40';
    if (netIncomeEl)   netIncomeEl.value   = NNUtils.formatInputNumber(40000);
    if (ageGroupEl)    ageGroupEl.value    = '65_74';
    if (maritalEl)     maritalEl.value     = 'single';
    if (otherIncomeEl) otherIncomeEl.value = NNUtils.formatInputNumber(0);
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    NNUtils.clearError(yearsEl, 'years-error');
    NNUtils.clearError(netIncomeEl, 'income-error');
  });

});

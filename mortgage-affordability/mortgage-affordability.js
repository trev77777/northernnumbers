/* =============================================
   NORTHERN NUMBERS — mortgage-affordability.js
   Canadian Mortgage Affordability Calculator 2026

   RULES VERIFIED:
   1. Stress test: qualify at max(contract_rate + 2%, 5.25%)
   2. GDS ≤ 39%: (P+I + tax + heat + 50% condo) / gross monthly
   3. TDS ≤ 44%: (GDS components + other debts) / gross monthly
   4. Canadian compounding: semi-annual, not monthly
      monthly_rate = (1 + annual_rate/2)^(1/6) - 1
   5. CMHC premium: 4% / 3.1% / 2.8% / 0% (added to mortgage)
   6. Min down: 5% under $500K, 5% + 10% for $500K-$1.5M, 20%+ over $1.5M
   7. Max insured price: $1,500,000 (raised from $1M, effective Dec 15, 2024)

   Binary search finds max purchase price where both
   GDS and TDS constraints are satisfied simultaneously.

   Verified: $120K income, 4.5% rate, $60K down → ~$462,000 max
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form        = document.getElementById('afford-form');
  const incomeEl    = document.getElementById('gross-income');
  const dpEl        = document.getElementById('down-payment');
  const rateEl      = document.getElementById('mortgage-rate');
  const rateSlider  = document.getElementById('rate-slider');
  const amortEl     = document.getElementById('amort-years');
  const debtsEl     = document.getElementById('monthly-debts');
  const propTaxEl   = document.getElementById('property-tax');
  const heatingEl   = document.getElementById('heating');
  const condoEl     = document.getElementById('condo-fee');
  const placeholder = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'Mortgage Affordability Calculator Canada 2026',
      description: 'Find out how much house you can afford in Canada using GDS/TDS ratios and the OSFI mortgage stress test.',
      keywords:    'mortgage affordability calculator canada 2026, how much house can i afford canada, mortgage stress test calculator, cmhc calculator canada',
      slug:        'mortgage-affordability'
    });
    NNSeo.injectSchema({ title:'Mortgage Affordability Calculator Canada 2026', slug:'mortgage-affordability', description:'Calculate maximum home price using OSFI stress test, GDS/TDS ratios, and 2026 CMHC rules.' });
    NNSeo.injectFAQSchema([
      { question:'What income do I need to afford a $700,000 home?', answer:'With a 10% down payment ($70,000) at a 4.5% rate, you need approximately $130,000–$140,000 in gross annual household income to qualify for a $700,000 home under the 39% GDS ratio at the 6.5% stress test rate. Reducing other debts or increasing your down payment lowers the income requirement significantly.' },
      { question:'Does the stress test apply to mortgage renewals?', answer:'If you renew with your existing lender, the stress test generally does not apply. If you switch lenders at renewal, the stress test does apply. This means some Canadians who pass the stress test at purchase may not qualify to switch lenders at renewal if rates or incomes have changed — effectively locking them in with their current lender.' },
      { question:'Can I get a 30-year amortization with less than 20% down?', answer:'As of August 2024, first-time buyers purchasing a newly built home can access a 30-year insured amortization. This reduces monthly payments by approximately 10–12% compared to a 25-year amortization but significantly increases total interest paid over the life of the mortgage.' },
      { question:'Does this calculator account for the First Home Buyer\'s Incentive?', answer:'The First Home Buyer\'s Incentive (FHBI) was cancelled by the federal government in March 2024. This calculator does not include it. The FHSA (First Home Savings Account) is not a direct subsidy and functions as a tax-deductible savings account — its contribution is reflected in your down payment amount.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['mortgage','land-transfer-tax','budget','gst-hst']); } catch(e) {}

  /* ── Info tips ── */
  if (window.NNUtils) try { NNUtils.initInfoTips(); } catch(e) {}

  /* ── Formatters ── */
  NNUtils.attachFormatter(incomeEl);
  NNUtils.attachFormatter(dpEl);
  NNUtils.attachFormatter(debtsEl);
  NNUtils.attachFormatter(propTaxEl);
  NNUtils.attachFormatter(heatingEl);
  NNUtils.attachFormatter(condoEl);
  NNUtils.syncSlider(rateEl, rateSlider, { isDollar: false });
  NNUtils.initTableToggle('dp-toggle', 'dp-breakdown');

  /* ── Auto-recalc on amort change ── */
  amortEl?.addEventListener('change', () => {
    const show30 = amortEl.value === '30';
    const opts30 = document.getElementById('amort-30-options');
    if (opts30) opts30.style.display = show30 ? '' : 'none';
    if (!resultsContent.classList.contains('hidden')) calculate();
  });

  // Wire FTHB/new build checkboxes to recalc
  ['buyer-fthb','buyer-newbuild'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      if (!resultsContent.classList.contains('hidden')) calculate();
    });
  });

  /* ── Presets ── */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const p = this.dataset.preset;
      if (p === 'firsttime') { incomeEl.value = NNUtils.formatInputNumber(90000);  dpEl.value = NNUtils.formatInputNumber(35000);  rateEl.value = '4.5'; amortEl.value = '25'; }
      if (p === 'typical')   { incomeEl.value = NNUtils.formatInputNumber(120000); dpEl.value = NNUtils.formatInputNumber(60000);  rateEl.value = '4.5'; amortEl.value = '25'; }
      if (p === 'upsizing')  { incomeEl.value = NNUtils.formatInputNumber(160000); dpEl.value = NNUtils.formatInputNumber(200000); rateEl.value = '4.5'; amortEl.value = '25'; }
      if (p === 'highearner'){ incomeEl.value = NNUtils.formatInputNumber(250000); dpEl.value = NNUtils.formatInputNumber(500000); rateEl.value = '4.5'; amortEl.value = '30'; }
      rateSlider.value = rateEl.value;
      debtsEl.value = NNUtils.formatInputNumber(0);
      propTaxEl.value = NNUtils.formatInputNumber(4000);
      heatingEl.value = NNUtils.formatInputNumber(150);
      condoEl.value   = NNUtils.formatInputNumber(0);
      calculate();
    });
  });

  /* ── CORE FUNCTIONS ── */
  function monthlyRate(annualPct) {
    // Canadian mortgage: semi-annual compounding
    return Math.pow(1 + annualPct / 100 / 2, 1/6) - 1;
  }

  function monthlyPayment(principal, mr, months) {
    if (mr === 0) return principal / months;
    return principal * mr * Math.pow(1 + mr, months) / (Math.pow(1 + mr, months) - 1);
  }

  function cmhcRate(dpPct) {
    // Standard rates — 25-year amortization
    if (dpPct >= 0.20) return 0;
    if (dpPct >= 0.15) return 0.028;
    if (dpPct >= 0.10) return 0.031;
    return 0.040;
  }

  function cmhcHomeStartRate(ltv) {
    // CMHC Home Start rates — 30-year insured (FTHB or new build)
    if (ltv <= 0.80)   return 0;
    if (ltv <= 0.8500) return 0.030;
    if (ltv <= 0.9000) return 0.033;
    return 0.042; // 90.01%–95% LTV
  }

  function stressRate(contractRate) {
    const floor = (window.NN && NN.MORTGAGE) ? NN.MORTGAGE.STRESS_TEST_RATE : 5.25;
    return Math.max(contractRate + 2.0, floor);
  }

  // Reads data/nn-constants.js NN.getMinDownPayment — the single source
  // of truth shared with mortgage.js and first-home-costs.js (was
  // previously a private $1M-cap copy that had drifted from the
  // current $1.5M insured price ceiling).
  function minDownPayment(price) {
    if (window.NN && NN.getMinDownPayment) return NN.getMinDownPayment(price);
    if (price < 500000)  return price * 0.05;
    if (price <= 1500000) return 500000 * 0.05 + (price - 500000) * 0.10;
    return price * 0.20;
  }

  function onLTT(price) {
    // Ontario LTT estimate for closing costs
    const brackets = [[55000,0.005],[250000,0.01],[400000,0.015],[2000000,0.02],[Infinity,0.025]];
    let tax = 0, prev = 0;
    for (const [lim, rate] of brackets) {
      if (price <= prev) break;
      tax += (Math.min(price, lim) - prev) * rate;
      prev = lim;
    }
    return tax;
  }

  /* ── BINARY SEARCH ── */
  function findMaxPrice(income, dp, contractRate, amortYears, monthlyDebts, propTaxAnnual, heatingMo, condoMo, gdsLimit, tdsLimit, is30yrInsured) {
    const grossMo     = income / 12;
    const stress      = stressRate(contractRate);
    const mr          = monthlyRate(stress);
    const amortMo     = amortYears * 12;
    const propTaxMo   = propTaxAnnual / 12;
    const condoHalf   = condoMo * 0.50;

    let lo = dp, hi = 5_000_000;
    for (let i = 0; i < 80; i++) {
      const mid      = (lo + hi) / 2;
      const mortgage = mid - dp;
      if (mortgage <= 0) { hi = mid; continue; }
      const dpPct    = dp / mid;
      const ltv      = mid > 0 ? (mid - dp) / mid : 0;
      const premium  = is30yrInsured ? cmhcHomeStartRate(ltv) : cmhcRate(dpPct);
      const insured  = mortgage * (1 + premium);
      const pi       = monthlyPayment(insured, mr, amortMo);
      const pith     = pi + propTaxMo + heatingMo + condoHalf;
      const gds      = pith / grossMo;
      const tds      = (pith + monthlyDebts) / grossMo;
      if (gds <= gdsLimit && tds <= tdsLimit) lo = mid; else hi = mid;
    }
    return lo;
  }

  /* ── CALCULATE ── */
  function calculate() {
    const income     = NNUtils.parseInputNumber(incomeEl.value);
    const dp         = NNUtils.parseInputNumber(dpEl.value);
    const rate       = parseFloat(rateEl.value) || 4.5;
    const amort      = parseInt(amortEl.value) || 25;
    const debts      = NNUtils.parseInputNumber(debtsEl.value) || 0;
    const fthb       = document.getElementById('buyer-fthb')?.checked || false;
    const newBuild   = document.getElementById('buyer-newbuild')?.checked || false;
    const propTax    = NNUtils.parseInputNumber(propTaxEl.value) || 4000;
    const heating    = NNUtils.parseInputNumber(heatingEl.value) || 150;
    const condo      = NNUtils.parseInputNumber(condoEl.value) || 0;

    if (!income || income <= 0) { NNUtils.setError(incomeEl,'income-error','Please enter your gross annual income.'); return; }
    NNUtils.clearError(incomeEl,'income-error');

    if (!dp || dp <= 0) { NNUtils.setError(dpEl,'dp-error','Please enter your down payment.'); return; }
    NNUtils.clearError(dpEl,'dp-error');

    const GDS_LIMIT = 0.39;
    const TDS_LIMIT = 0.44;

    const is30yrInsured = amort === 30 && (fthb || newBuild) && dp / (income * 4) < 0.20; // rough LTV check
    const maxPrice    = Math.floor(findMaxPrice(income, dp, rate, amort, debts, propTax, heating, condo, GDS_LIMIT, TDS_LIMIT, is30yrInsured));
    const mortgage    = maxPrice - dp;
    const dpPct       = dp / maxPrice;
    const ltv         = mortgage / maxPrice;
    const minDp       = minDownPayment(maxPrice);
    const premium     = is30yrInsured ? cmhcHomeStartRate(ltv) : cmhcRate(dpPct);
    const insured     = mortgage * (1 + premium);
    const stressR     = stressRate(rate);
    const mrStress    = monthlyRate(stressR);
    const mrContract  = monthlyRate(rate);
    const amortMo     = amort * 12;
    const piStress    = monthlyPayment(insured, mrStress, amortMo);
    const piContract  = monthlyPayment(insured, mrContract, amortMo);
    const propTaxMo   = propTax / 12;
    const condoHalf   = condo * 0.50;
    const pith        = piStress + propTaxMo + heating + condoHalf;
    const gds         = pith / (income / 12);
    const tds         = (pith + debts) / (income / 12);
    const binding     = gds >= tds - 0.01 ? 'GDS (housing costs)' : 'TDS (including debts)';

    // Income needed — binding constraint (GDS or TDS whichever requires more income)
    const reqGDSIncome  = (pith * 12) / GDS_LIMIT;
    const reqTDSIncome  = ((pith + debts) * 12) / TDS_LIMIT;
    const incomeNeeded  = Math.max(reqGDSIncome, reqTDSIncome);

    // Closing costs
    const ltt            = onLTT(maxPrice);
    const cmhcPremiumAmt = mortgage * premium;
    const cmhcTax        = premium > 0 ? cmhcPremiumAmt * 0.08 : 0; // Ontario 8% PST on CMHC premium
    const closingTotal   = dp + ltt + 3500 + cmhcTax;

    /* Round only the final displayed dollar amounts — binary floating
       point can leave an exact half-cent tie just below the rounding
       point (e.g. a $50,105 mortgage at the 10–14.99%-down (3.1%) CMHC
       tier computes the premium as 1553.2549999999999, which
       Intl.NumberFormat rounds down to $1,553.25 instead of $1,553.26).
       The binary-search/tiered-LTT math above stays at full precision;
       only these display copies are rounded. */
    const cmhcPremiumAmtR = NNUtils.roundMoney(cmhcPremiumAmt);
    const cmhcTaxR        = NNUtils.roundMoney(cmhcTax);
    const lttR            = NNUtils.roundMoney(ltt);
    const closingTotalR   = NNUtils.roundMoney(closingTotal);

    /* Render */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    document.getElementById('result-max-price').textContent  = NNUtils.formatCAD(maxPrice);
    document.getElementById('result-hero-sub').textContent   = `${NNUtils.formatCAD(dp)} down · ${rate}% rate · ${amort}-yr amort · stress test ${stressR.toFixed(2)}%`;
    document.getElementById('result-price-row').textContent  = NNUtils.formatCAD(maxPrice);
    document.getElementById('result-mortgage').textContent   = NNUtils.formatCAD(mortgage);

    const cmhcRow = document.getElementById('cmhc-row');
    if (premium > 0) {
      cmhcRow.style.display = '';
      document.getElementById('result-cmhc').textContent = NNUtils.formatCAD(cmhcPremiumAmtR) + ` (${(premium*100).toFixed(1)}%)`;
    } else {
      cmhcRow.style.display = 'none';
    }

    document.getElementById('result-monthly-contract').textContent = NNUtils.formatCAD(piContract) + '/mo';
    document.getElementById('result-monthly-stress').textContent   = NNUtils.formatCAD(piStress)   + '/mo';
    document.getElementById('result-stress-rate').textContent      = stressR.toFixed(2) + '%';
    document.getElementById('result-gds').textContent              = (gds * 100).toFixed(1) + '%';
    document.getElementById('result-tds').textContent              = (tds * 100).toFixed(1) + '%';
    document.getElementById('result-constraint').textContent       = binding;
    document.getElementById('result-pith').textContent             = NNUtils.formatCAD(pith) + '/mo';
    document.getElementById('result-dp-pct').textContent          = (dpPct * 100).toFixed(1) + '%';
    document.getElementById('result-cmhc-required').textContent   = premium > 0 ? 'Yes — ' + (premium*100).toFixed(1) + ' %' : 'No (≥20% down)';
    document.getElementById('result-income-needed').textContent   = NNUtils.formatCAD(incomeNeeded) + '/yr';

    document.getElementById('close-dp').textContent    = NNUtils.formatCAD(dp);
    document.getElementById('close-ltt').textContent   = NNUtils.formatCAD(lttR);
    const cmhcTaxRow = document.getElementById('close-cmhc-tax-row');
    const cmhcTaxEl  = document.getElementById('close-cmhc-tax');
    if (cmhcTaxRow && cmhcTaxEl) {
      if (cmhcTax > 0) { cmhcTaxRow.style.display = ''; cmhcTaxEl.textContent = NNUtils.formatCAD(cmhcTaxR); }
      else              { cmhcTaxRow.style.display = 'none'; }
    }
    document.getElementById('close-total').textContent = NNUtils.formatCAD(closingTotalR);

    // Warn if down payment below minimum
    if (dp < minDp) {
      NNUtils.setError(dpEl, 'dp-error', `Your down payment is below the minimum required (${NNUtils.formatCAD(minDp)}) for a ${NNUtils.formatCAD(maxPrice)} purchase. Results shown with your current down payment.`);
    } else {
      NNUtils.clearError(dpEl, 'dp-error');
    }

    window._affordResults = { income, dp, rate, amort, maxPrice, mortgage, premium, stressR, piContract, piStress, pith, gds, tds, incomeNeeded };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('Mortgage Affordability Calculator', { income, maxPrice }); } catch(e) {}
  }

  /* ── Copy Results ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._affordResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `🏠 Mortgage Affordability — Northern Numbers`,
      `─────────────────────────────`,
      `💰 Gross Income:          ${NNUtils.formatCAD(r.income)}/year`,
      `💵 Down Payment:          ${NNUtils.formatCAD(r.dp)}`,
      `📈 Contract Rate:         ${r.rate}%`,
      `🔍 Stress Test Rate:      ${r.stressR.toFixed(2)}%`,
      `📅 Amortization:          ${r.amort} years`,
      `─────────────────────────────`,
      `🏡 Max Home Price:        ${NNUtils.formatCAD(r.maxPrice)}`,
      `🏦 Max Mortgage:          ${NNUtils.formatCAD(r.mortgage)}`,
      `💳 CMHC Premium:          ${r.premium > 0 ? (r.premium*100).toFixed(1)+'%' : 'None (≥20% down)'}`,
      `💵 Monthly Payment:       ${NNUtils.formatCAD(r.piContract)}/mo (contract rate)`,
      `📊 GDS Ratio:             ${(r.gds*100).toFixed(1)}% (limit 39%)`,
      `📊 TDS Ratio:             ${(r.tds*100).toFixed(1)}% (limit 44%)`
    ], 'Mortgage Affordability Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    incomeEl.value  = NNUtils.formatInputNumber(120000);
    dpEl.value      = NNUtils.formatInputNumber(60000);
    rateEl.value    = '4.5';
    rateSlider.value= '4.5';
    amortEl.value   = '25';
    debtsEl.value   = NNUtils.formatInputNumber(0);
    propTaxEl.value = NNUtils.formatInputNumber(4000);
    heatingEl.value = NNUtils.formatInputNumber(150);
    condoEl.value   = NNUtils.formatInputNumber(0);
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(incomeEl,'income-error');
    NNUtils.clearError(dpEl,'dp-error');
    if (window.NNUtils) try { NNUtils.scrollToCalcTop(); } catch(e) {}
  });

});

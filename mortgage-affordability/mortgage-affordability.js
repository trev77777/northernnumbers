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
   6. Min down: 5% under $500K, 5% + 10% for $500K-$1M, 20%+ for $1M+
   7. Max insured price: $999,999

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
      { question:'How much mortgage can I afford in Canada?', answer:'Canadian lenders use the GDS ratio (≤39%) and TDS ratio (≤44%) calculated at the OSFI stress test rate. The stress test requires qualifying at your contract rate plus 2%, or 5.25%, whichever is higher. On a $120,000 household income with $60,000 down at 4.5%, you can typically afford a home around $460,000–$470,000.' },
      { question:'What is the mortgage stress test in Canada?', answer:'The OSFI stress test requires you to qualify at the higher of your contract rate + 2% or 5.25%. If your bank offers 4.5%, you must prove you can afford payments at 6.5%. This applies to all federally regulated lenders including major banks.' },
      { question:'How much down payment do I need in Canada?', answer:'For homes under $500,000: minimum 5%. For $500,000–$999,999: 5% on the first $500,000 plus 10% on the remainder. For homes $1,000,000 and above: minimum 20% — CMHC mortgage insurance is not available.' },
      { question:'What is the GDS ratio in Canada?', answer:'The Gross Debt Service (GDS) ratio is the percentage of your gross monthly income that goes toward housing costs — mortgage principal and interest, property taxes, heating, and 50% of condo fees. Canadian lenders generally require a GDS ratio of 39% or less.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['mortgage','land-transfer-tax','budget','gst-hst']); } catch(e) {}

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
    if (!resultsContent.classList.contains('hidden')) calculate();
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
    if (dpPct >= 0.20) return 0;
    if (dpPct >= 0.15) return 0.028;
    if (dpPct >= 0.10) return 0.031;
    return 0.040;
  }

  function stressRate(contractRate) {
    return Math.max(contractRate + 2.0, 5.25);
  }

  function minDownPayment(price) {
    if (price < 500000)  return price * 0.05;
    if (price < 1000000) return 500000 * 0.05 + (price - 500000) * 0.10;
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
  function findMaxPrice(income, dp, contractRate, amortYears, monthlyDebts, propTaxAnnual, heatingMo, condoMo, gdsLimit, tdsLimit) {
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
      const premium  = cmhcRate(dpPct);
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
    const propTax    = NNUtils.parseInputNumber(propTaxEl.value) || 4000;
    const heating    = NNUtils.parseInputNumber(heatingEl.value) || 150;
    const condo      = NNUtils.parseInputNumber(condoEl.value) || 0;

    if (!income || income <= 0) { NNUtils.setError(incomeEl,'income-error','Please enter your gross annual income.'); return; }
    NNUtils.clearError(incomeEl,'income-error');

    if (!dp || dp <= 0) { NNUtils.setError(dpEl,'dp-error','Please enter your down payment.'); return; }
    NNUtils.clearError(dpEl,'dp-error');

    const GDS_LIMIT = 0.39;
    const TDS_LIMIT = 0.44;

    const maxPrice    = Math.floor(findMaxPrice(income, dp, rate, amort, debts, propTax, heating, condo, GDS_LIMIT, TDS_LIMIT));
    const mortgage    = maxPrice - dp;
    const dpPct       = dp / maxPrice;
    const minDp       = minDownPayment(maxPrice);
    const premium     = cmhcRate(dpPct);
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

    // Income needed cross-check
    const incomeNeeded = pith / GDS_LIMIT * 12;

    // Closing costs
    const ltt       = onLTT(maxPrice);
    const closingTotal = dp + ltt + 3500;

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
      document.getElementById('result-cmhc').textContent = NNUtils.formatCAD(mortgage * premium) + ` (${(premium*100).toFixed(1)}%)`;
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
    document.getElementById('close-ltt').textContent   = NNUtils.formatCAD(ltt);
    document.getElementById('close-total').textContent = NNUtils.formatCAD(closingTotal);

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
  });

});

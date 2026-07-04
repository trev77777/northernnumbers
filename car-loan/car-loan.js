/* =============================================
   NORTHERN NUMBERS — car-loan.js
   Canadian Car Loan Calculator

   Formula: Standard amortization
   PMT = P × r(1+r)^n / ((1+r)^n - 1)
   Where:
     P = principal (amount financed)
     r = periodic interest rate
     n = number of payment periods

   Tax: Applied to (vehicle price - trade-in)
   as per most Canadian provincial rules.

   Verified against: RateHub, TD auto loan calculator
   Formula source: Standard financial amortization
   Test results: See formula verification in build notes

   Tested values:
   $35K car, $5K down, $3K trade, ON 13% HST, 6.99%, 60mo → $626.76/mo ✅
   $25K car, no down, ON HST, 9.99%, 72mo → $523.21/mo ✅
   $30K car, $5K down, 0% interest, 48mo → $602.08/mo ✅
============================================= */

'use strict';

/* ─── SEO + SCHEMA ─────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {

  NNSeo.init({
    title:       'Car Loan Calculator Canada',
    description: 'Calculate your car loan payments, total interest, and true cost of ownership. Free Canadian auto loan calculator with HST/GST, trade-in, and full amortization schedule.',
    keywords:    'car loan calculator canada, auto loan calculator canada, vehicle loan calculator, car payment calculator canada, car financing calculator',
    slug:        'car-loan'
  });

  NNSeo.injectSchema({
    title:       'Car Loan Calculator Canada',
    slug:        'car-loan',
    description: 'Free Canadian car loan calculator with tax, trade-in value, and full amortization schedule.'
  });

  NNSeo.injectFAQSchema([
    { question: 'What is a good car loan interest rate in Canada?', answer: 'In 2026, good rates for new cars range from 5–8%. Excellent credit (750+) may qualify for 0–4% manufacturer promotions. Used car rates typically run 7–12%.' },
    { question: 'How much car can I afford in Canada?', answer: 'A common guideline is to keep total vehicle costs (payment + insurance + fuel + maintenance) under 15–20% of your monthly take-home pay.' },
    { question: 'Is it better to finance through the dealer or my bank?', answer: 'Get pre-approved by your bank before visiting a dealership. Dealers occasionally offer subsidized 0% rates, but banks and credit unions often beat dealer financing for used cars.' },
    { question: 'Does paying bi-weekly save money vs monthly on a car loan?', answer: 'For car loans, the savings are minimal compared to mortgages due to shorter terms. The bigger factor is your interest rate and loan term.' },
    { question: 'Can I pay off my car loan early in Canada?', answer: 'Most Canadian auto loans allow early repayment without penalty. Always confirm with your lender. Extra principal payments can shorten your loan and save significant interest.' }
  ]);

  /* ─── DOM REFS ─────────────────────────── */
  const vehiclePriceEl  = document.getElementById('vehicle-price');
  const downPaymentEl   = document.getElementById('down-payment');
  const tradeInEl       = document.getElementById('trade-in');
  const interestRateEl  = document.getElementById('interest-rate');
  const loanTermEl      = document.getElementById('loan-term');
  const provinceEl      = document.getElementById('province');
  const feesEl          = document.getElementById('fees');
  const customTaxEl     = document.getElementById('custom-tax');
  const downSlider      = document.getElementById('down-slider');
  const rateSlider      = document.getElementById('rate-slider');
  const form            = document.getElementById('car-loan-form');
  const placeholder     = document.getElementById('results-placeholder');
  const resultsContent  = document.getElementById('results-content');
  const amortSection    = document.getElementById('amort-section');
  const amortToggle     = document.getElementById('amort-toggle');
  const amortWrapper    = document.getElementById('amort-table-wrapper');
  const amortTbody      = document.getElementById('amort-tbody');

  let currentFreq = 'monthly';

  /* ─── PROVINCE DROPDOWN ────────────────── */
  if (provinceEl) {
    provinceEl.innerHTML = NNComponents.PROVINCE_OPTIONS;
    provinceEl.value = 'ON';
  }

  /* ─── RELATED CALCULATORS ──────────────── */
  NNComponents.renderRelated('nn-related', ['loan', 'budget', 'mortgage', 'compound-interest']);

  /* ─── FORMATTERS ───────────────────────── */
  NNUtils.attachFormatters(vehiclePriceEl, downPaymentEl, tradeInEl, feesEl);

  /* ─── ADVANCED TOGGLE ──────────────────── */
  NNUtils.initAdvancedToggle('advanced-toggle', 'advanced-fields');

  /* ─── SLIDERS ──────────────────────────── */
  NNUtils.syncSlider(downPaymentEl, downSlider, { isDollar: true, onChange: liveUpdate });
  NNUtils.syncSlider(interestRateEl, rateSlider, { onChange: liveUpdate });

  interestRateEl.addEventListener('input', function() {
    const val = parseFloat(this.value);
    if (!isNaN(val) && val >= 0 && val <= 30) rateSlider.value = val;
    liveUpdate();
  });

  /* ─── PAYMENT FREQUENCY ────────────────── */
  document.querySelectorAll('.freq-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      currentFreq = this.dataset.freq;
      document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('is-active'));
      this.classList.add('is-active');
      liveUpdate();
    });
  });

  /* ─── PRESETS ──────────────────────────── */
  const PRESETS = {
    firstcar: { price: 22000, down: 3000, trade: 0,    fees: 500, rate: 8.99, term: 60, prov: 'ON' },
    average:  { price: 35000, down: 5000, trade: 3000, fees: 500, rate: 6.99, term: 60, prov: 'ON' },
    used:     { price: 15000, down: 2000, trade: 1500, fees: 300, rate: 9.99, term: 48, prov: 'ON' },
    truck:    { price: 65000, down: 10000, trade: 5000, fees: 750, rate: 5.99, term: 72, prov: 'ON' }
  };

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const p = PRESETS[this.dataset.preset];
      if (!p) return;
      vehiclePriceEl.value = NNUtils.formatInputNumber(p.price);
      downPaymentEl.value  = NNUtils.formatInputNumber(p.down);
      tradeInEl.value      = NNUtils.formatInputNumber(p.trade);
      feesEl.value         = NNUtils.formatInputNumber(p.fees);
      interestRateEl.value = p.rate;
      loanTermEl.value     = p.term;
      provinceEl.value     = p.prov;
      if (downSlider) downSlider.value = Math.min(p.down, 50000);
      if (rateSlider) rateSlider.value = p.rate;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
      this.classList.add('is-active');
      // Open advanced if fees > 0
      if (p.fees > 0) {
        const af = document.getElementById('advanced-fields');
        const at = document.getElementById('advanced-toggle');
        if (af && !af.classList.contains('is-open')) {
          af.classList.add('is-open');
          if (at) at.setAttribute('aria-expanded','true');
        }
      }
      calculate();
    });
  });

  /* ─── GET TAX RATE ─────────────────────── */
  function getTaxRate() {
    const custom = parseFloat(customTaxEl?.value);
    if (!isNaN(custom) && custom >= 0) return custom / 100;
    const prov   = provinceEl?.value || 'ON';
    const entry  = NN.TAX_RATES.PROVINCIAL[prov];
    if (!entry) return 0.13;
    return entry.rate !== undefined ? entry.rate : (entry.total || NN.TAX_RATES.GST);
  }

  /* ─── CALCULATE ────────────────────────── */
  function calculate() {
    const price   = NNUtils.parseInputNumber(vehiclePriceEl.value);
    const down    = NNUtils.parseInputNumber(downPaymentEl.value);
    const trade   = NNUtils.parseInputNumber(tradeInEl.value);
    const fees    = NNUtils.parseInputNumber(feesEl?.value || '0');
    const rate    = parseFloat(interestRateEl.value) || 0;
    const term    = parseInt(loanTermEl.value) || 60;
    const freq    = currentFreq;

    // Validate
    let valid = true;
    if (!price || price <= 0) {
      NNUtils.setError(vehiclePriceEl, 'vehicle-price-error', 'Please enter the vehicle price.');
      valid = false;
    } else {
      NNUtils.clearError(vehiclePriceEl, 'vehicle-price-error');
    }
    if (rate < 0 || rate > 30) {
      NNUtils.setError(interestRateEl, 'interest-rate-error', 'Enter a rate between 0% and 30%.');
      valid = false;
    } else {
      NNUtils.clearError(interestRateEl, 'interest-rate-error');
    }
    if (!valid) return;

    // Tax on (price - trade) — standard Canadian rule
    const taxRate  = getTaxRate();
    const taxable  = Math.max(price - trade, 0);
    const tax      = taxable * taxRate;

    // Amount financed
    const financed = price - down - trade + tax + fees;
    if (financed <= 0) {
      // Down + trade covers everything
      showZeroFinanced(price, down, trade, tax);
      return;
    }

    // Periods
    const periodsPerYear = { monthly: 12, biweekly: 26, weekly: 52 }[freq];
    const n = Math.round(term / 12 * periodsPerYear);
    const r = (rate / 100) / periodsPerYear;

    // Payment
    let payment;
    if (r === 0) {
      payment = financed / n;
    } else {
      payment = financed * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    }

    const totalPayments = payment * n;
    const totalInterest = totalPayments - financed;
    const totalCost     = totalPayments + down + trade;

    // Build amortization
    const schedule = buildAmort(financed, r, payment, n, freq, term);

    // Render
    renderResults({
      price, down, trade, fees, tax, taxRate, financed,
      payment, freq, term, rate, periodsPerYear, n,
      totalPayments, totalInterest, totalCost, schedule
    });

    if (window.NNAnalytics) NNAnalytics.trackCalculator('Car Loan Calculator', { rate, term, freq });
  }

  /* ─── BUILD AMORTIZATION ───────────────── */
  function buildAmort(principal, r, payment, n, freq, termMonths) {
    let balance = principal;
    const schedule = [];
    for (let i = 1; i <= n; i++) {
      const interest  = balance * r;
      const princ     = Math.min(payment - interest, balance);
      balance        -= princ;
      if (balance < 0.01) balance = 0;
      schedule.push({ period: i, payment: princ + interest, principal: princ, interest, balance });
    }
    return schedule;
  }

  /* ─── RENDER RESULTS ───────────────────── */
  function renderResults(d) {
    const wasHidden = resultsContent.classList.contains('hidden');
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    // Freq labels
    const freqLabels = { monthly:'Monthly Payment', biweekly:'Bi-Weekly Payment', weekly:'Weekly Payment' };
    const freqShort  = { monthly:'month', biweekly:'bi-weekly period', weekly:'week' };

    // Payment hero
    document.getElementById('payment-label').textContent  = freqLabels[d.freq];
    document.getElementById('result-payment').textContent = NNUtils.formatCAD(d.payment);
    document.getElementById('result-payment-sub').textContent =
      `${d.n} payments over ${d.term} months`;

    // Summary rows
    document.getElementById('result-price').textContent          = NNUtils.formatCAD(d.price);
    document.getElementById('result-tax').textContent            = `${NNUtils.formatCAD(d.tax)} (${(d.taxRate*100).toFixed(2)}%)`;
    document.getElementById('result-financed').textContent       = NNUtils.formatCAD(d.financed);
    document.getElementById('result-interest').textContent       = NNUtils.formatCAD(Math.max(0, d.totalInterest));
    document.getElementById('result-total-payments').textContent = NNUtils.formatCAD(d.totalPayments);
    document.getElementById('result-total-cost').textContent     = NNUtils.formatCAD(d.totalCost);

    // Breakdown bar
    const principalPct = d.financed / d.totalPayments * 100;
    const interestPct  = 100 - principalPct;
    document.getElementById('bar-principal').style.width = `${Math.max(2, principalPct)}%`;
    document.getElementById('bar-interest').style.width  = `${Math.max(2, interestPct)}%`;
    document.getElementById('principal-pct').textContent = `${principalPct.toFixed(1)}%`;
    document.getElementById('interest-pct').textContent  = `${interestPct.toFixed(1)}%`;

    // Cost card
    document.getElementById('cost-down').textContent     = NNUtils.formatCAD(d.down);
    document.getElementById('cost-tradein').textContent  = d.trade > 0 ? `−${NNUtils.formatCAD(d.trade)}` : '$0.00';
    document.getElementById('cost-loan').textContent     = NNUtils.formatCAD(d.totalPayments);
    document.getElementById('cost-interest').textContent = NNUtils.formatCAD(Math.max(0, d.totalInterest));
    document.getElementById('cost-total').textContent    = NNUtils.formatCAD(d.totalCost);

    // Rate insight
    const rateInsightEl = document.getElementById('rate-insight-text');
    if (rateInsightEl) {
      const intRatio = d.totalInterest / d.financed;
      let insight;
      if (d.rate === 0) {
        insight = 'You have a 0% interest rate — excellent! You\'re only paying back what you borrowed.';
      } else if (d.rate < 5) {
        insight = `At ${d.rate}%, this is an excellent rate. You're paying ${NNUtils.formatCAD(d.totalInterest)} in interest — ${(intRatio*100).toFixed(0)}% of your loan amount.`;
      } else if (d.rate < 8) {
        insight = `At ${d.rate}%, this is a typical rate for a good credit score. Your total interest is ${NNUtils.formatCAD(d.totalInterest)}. Improving your credit score by 50 points could save you 1–2%.`;
      } else if (d.rate < 12) {
        insight = `At ${d.rate}%, you're paying a higher rate — likely for a used vehicle or average credit. Consider a credit union for better rates. Your interest totals ${NNUtils.formatCAD(d.totalInterest)}.`;
      } else {
        insight = `At ${d.rate}%, this is a high rate. If possible, shop around — credit unions often offer 3–5% lower than dealer financing. A 3% reduction on this loan would save approximately ${NNUtils.formatCAD(d.totalInterest * 0.25)}.`;
      }
      rateInsightEl.textContent = insight;
    }

    // Summary pills
    const provName = (NN.PROV_NAMES && NN.PROV_NAMES[provinceEl?.value]) || provinceEl?.value || 'ON';
    NNUtils.renderSummaryPills('result-summary-box', [
      `🚗 ${NNUtils.formatCAD0(d.price)}`,
      `💰 ${NNUtils.formatCAD0(d.down)} down`,
      `📈 ${d.rate}% rate`,
      `📅 ${d.term} months`,
      `🏛 ${provName}`
    ]);

    // Celebration
    let celebration = '';
    if (d.rate === 0) celebration = '🎉 <strong>0% financing!</strong> You\'re not paying any interest — that\'s the best deal in auto financing.';
    else if (d.rate < 4) celebration = '🎉 <strong>Excellent rate!</strong> You\'ve secured a very competitive interest rate on your vehicle.';
    else if (d.totalInterest < d.financed * 0.1) celebration = '✅ <strong>Great deal!</strong> Your total interest is under 10% of the loan amount — well managed.';
    NNUtils.renderCelebration('result-celebration', celebration);

    // Amortization table
    renderAmortTable(d.schedule, d.freq);
    amortSection.removeAttribute('hidden');

    // Store for copy
    window._carLoanResults = d;

    NNUtils.scrollToResults('results-heading', wasHidden);
  }

  function showZeroFinanced(price, down, trade, tax) {
    const wasHidden = resultsContent.classList.contains('hidden');
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');
    document.getElementById('payment-label').textContent = 'Monthly Payment';
    document.getElementById('result-payment').textContent = '$0.00';
    document.getElementById('result-payment-sub').textContent = 'Your down payment and trade-in cover the full purchase price.';
    document.getElementById('result-price').textContent     = NNUtils.formatCAD(price);
    document.getElementById('result-tax').textContent       = NNUtils.formatCAD(tax);
    document.getElementById('result-financed').textContent  = '$0.00';
    document.getElementById('result-interest').textContent  = '$0.00';
    document.getElementById('result-total-payments').textContent = '$0.00';
    document.getElementById('result-total-cost').textContent = NNUtils.formatCAD(down + trade + tax);
    NNUtils.renderCelebration('result-celebration', '🎉 <strong>No loan needed!</strong> Your down payment and trade-in fully cover this vehicle.');
    NNUtils.scrollToResults('results-heading', wasHidden);
  }

  /* ─── AMORT TABLE ──────────────────────── */
  function renderAmortTable(schedule, freq) {
    if (!amortTbody) return;
    const periodLabel = { monthly:'Month', biweekly:'Period', weekly:'Week' }[freq] || 'Period';
    document.querySelector('.amort-table th:first-child').textContent = periodLabel;

    amortTbody.innerHTML = '';
    schedule.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.period}</td>
        <td>${NNUtils.formatCAD(row.payment)}</td>
        <td>${NNUtils.formatCAD(row.principal)}</td>
        <td class="td-interest">${NNUtils.formatCAD(row.interest)}</td>
        <td>${NNUtils.formatCAD(Math.max(0, row.balance))}</td>`;
      amortTbody.appendChild(tr);
    });
  }

  /* ─── AMORT TOGGLE ─────────────────────── */
  if (amortToggle && amortWrapper) {
    amortToggle.addEventListener('click', function() {
      const isOpen = amortWrapper.classList.toggle('is-open');
      this.setAttribute('aria-expanded', String(isOpen));
    });
  }

  /* ─── LIVE UPDATE ──────────────────────── */
  function liveUpdate() {
    if (!resultsContent.classList.contains('hidden')) calculate();
  }

  provinceEl?.addEventListener('change', liveUpdate);
  loanTermEl?.addEventListener('change', liveUpdate);

  /* ─── FORM SUBMIT ──────────────────────── */
  form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });
  form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); calculate(); } });
  });

  /* ─── COPY RESULTS ─────────────────────── */
  document.getElementById('copy-results-btn')?.addEventListener('click', function() {
    const d = window._carLoanResults;
    if (!d) return;
    const freqLabel = { monthly:'Monthly', biweekly:'Bi-Weekly', weekly:'Weekly' }[d.freq];
    NNUtils.copyResults(this, [
      `🚗 Vehicle Price:          ${NNUtils.formatCAD(d.price)}`,
      `💰 Down Payment:           ${NNUtils.formatCAD(d.down)}`,
      `🔄 Trade-in Value:         ${NNUtils.formatCAD(d.trade)}`,
      `🏛 Sales Tax:              ${NNUtils.formatCAD(d.tax)}`,
      `💳 Amount Financed:        ${NNUtils.formatCAD(d.financed)}`,
      `📅 ${freqLabel} Payment:   ${NNUtils.formatCAD(d.payment)}`,
      `💸 Total Interest:         ${NNUtils.formatCAD(Math.max(0, d.totalInterest))}`,
      `💵 Total Loan Payments:    ${NNUtils.formatCAD(d.totalPayments)}`,
      `🏷 Total Vehicle Cost:     ${NNUtils.formatCAD(d.totalCost)}`
    ], 'Car Loan Calculator');
  });

  /* ─── RESET ────────────────────────────── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    vehiclePriceEl.value = '';
    downPaymentEl.value  = '';
    tradeInEl.value      = '0';
    feesEl.value         = '0';
    customTaxEl.value    = '';
    interestRateEl.value = '6.99';
    loanTermEl.value     = '60';
    provinceEl.value     = 'ON';
    currentFreq          = 'monthly';
    if (downSlider) downSlider.value = 0;
    if (rateSlider) rateSlider.value = 6.99;

    document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('is-active'));
    document.querySelector('[data-freq="monthly"]')?.classList.add('is-active');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));

    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    amortSection.setAttribute('hidden', '');

    const af = document.getElementById('advanced-fields');
    const at = document.getElementById('advanced-toggle');
    if (af) { af.classList.remove('is-open'); }
    if (at) { at.setAttribute('aria-expanded', 'false'); }
  });

  /* ─── INIT ─────────────────────────────── */
  vehiclePriceEl.value = NNUtils.formatInputNumber(35000);
  downPaymentEl.value  = NNUtils.formatInputNumber(5000);

});

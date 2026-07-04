/* =============================================
   NORTHERN NUMBERS — loan.js
   Canadian Loan Calculator

   Formula: Standard amortization
   PMT = P × r(1+r)^n / ((1+r)^n - 1)

   Extra payments: Simulated period-by-period,
   extra amount applied directly to principal
   each period, reducing balance and total interest.

   Verified:
   $15,000 @ 9.99%, 36mo → $483.94/mo ✅
   $30,000 @ 7.5%,  60mo → $601.14/mo ✅
   $10,000 @ 12%,   24mo → $470.73/mo ✅
   $20,000 @ 8%,    48mo bi-weekly → $225.01 ✅
   $25,000 @ 9.99%, 60mo + $100 extra → saves $1,401.47 ✅
============================================= */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ─── SEO ──────────────────────────────── */
  NNSeo.init({
    title:       'Loan Calculator Canada',
    description: 'Free Canadian loan calculator. Calculate monthly payments, total interest, and payoff time for personal loans, lines of credit, and debt consolidation. Includes extra payment savings.',
    keywords:    'loan calculator canada, personal loan calculator canada, line of credit calculator, debt consolidation calculator canada, loan payment calculator',
    slug:        'loan'
  });

  NNSeo.injectSchema({
    title:       'Loan Calculator Canada',
    slug:        'loan',
    description: 'Free Canadian loan calculator with extra payment savings and full amortization schedule.'
  });

  NNSeo.injectFAQSchema([
    { question: 'What is a good personal loan rate in Canada?', answer: 'In 2026, good personal loan rates range from 6–10% for credit scores above 700. Average credit sees 10–15%. Credit unions often beat bank rates by 1–3%.' },
    { question: 'How much can I borrow for a personal loan in Canada?', answer: 'Most Canadian banks offer $1,000–$50,000. Some secured loans reach $100,000. Total debt payments should generally not exceed 40% of gross income.' },
    { question: 'Can I pay off a personal loan early in Canada?', answer: 'Most Canadian personal loans allow early repayment, though some charge prepayment penalties of 1–3 months interest. Always check your loan agreement first.' },
    { question: 'Is it better to get a shorter or longer loan term?', answer: 'Shorter terms mean higher payments but much less total interest. A $15,000 loan at 9.99% costs $2,422 over 36 months vs $4,063 over 60 months — choose the shortest term you can comfortably afford.' },
    { question: 'What is an origination fee on a Canadian loan?', answer: 'A one-time charge (usually 1–5% of the loan amount) for processing. Always include fees when comparing offers — a lower rate with high fees may cost more than a higher rate with no fees.' }
  ]);

  /* ─── DOM REFS ─────────────────────────── */
  const loanAmountEl   = document.getElementById('loan-amount');
  const interestRateEl = document.getElementById('interest-rate');
  const loanTermEl     = document.getElementById('loan-term');
  const extraPaymentEl = document.getElementById('extra-payment');
  const loanFeesEl     = document.getElementById('loan-fees');
  const amountSlider   = document.getElementById('amount-slider');
  const rateSlider     = document.getElementById('rate-slider');
  const form           = document.getElementById('loan-form');
  const placeholder    = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');
  const amortSection   = document.getElementById('amort-section');
  const amortToggle    = document.getElementById('amort-toggle');
  const amortWrapper   = document.getElementById('amort-table-wrapper');
  const amortTbody     = document.getElementById('amort-tbody');

  let currentFreq = 'monthly';

  /* ─── RELATED CALCULATORS ──────────────── */
  NNComponents.renderRelated('nn-related', ['car-loan', 'mortgage', 'budget', 'compound-interest']);

  /* ─── FORMATTERS ───────────────────────── */
  NNUtils.attachFormatters(loanAmountEl, extraPaymentEl, loanFeesEl);

  /* ─── ADVANCED TOGGLE ──────────────────── */
  NNUtils.initAdvancedToggle('advanced-toggle', 'advanced-fields');

  /* ─── SLIDERS ──────────────────────────── */
  NNUtils.syncSlider(loanAmountEl, amountSlider, { isDollar: true, onChange: liveUpdate });
  NNUtils.syncSlider(interestRateEl, rateSlider,  { onChange: liveUpdate });

  interestRateEl.addEventListener('input', function () {
    const val = parseFloat(this.value);
    if (!isNaN(val) && val >= 0 && val <= 30) rateSlider.value = val;
    liveUpdate();
  });

  /* ─── PAYMENT FREQUENCY ────────────────── */
  document.querySelectorAll('.freq-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      currentFreq = this.dataset.freq;
      document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('is-active'));
      this.classList.add('is-active');
      liveUpdate();
    });
  });

  /* ─── PRESETS ──────────────────────────── */
  const PRESETS = {
    personal:      { amount: 15000, rate: 9.99,  term: 36,  freq: 'monthly',  extra: 0 },
    loc:           { amount: 10000, rate: 7.70,  term: 24,  freq: 'monthly',  extra: 0 },
    consolidation: { amount: 30000, rate: 7.50,  term: 60,  freq: 'monthly',  extra: 100 },
    student:       { amount: 20000, rate: 5.45,  term: 120, freq: 'monthly',  extra: 0 }
  };

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const p = PRESETS[this.dataset.preset];
      if (!p) return;

      loanAmountEl.value   = NNUtils.formatInputNumber(p.amount);
      interestRateEl.value = p.rate;
      loanTermEl.value     = p.term;
      extraPaymentEl.value = NNUtils.formatInputNumber(p.extra);
      if (amountSlider) amountSlider.value = Math.min(p.amount, 100000);
      if (rateSlider)   rateSlider.value   = p.rate;

      currentFreq = p.freq || 'monthly';
      document.querySelectorAll('.freq-btn').forEach(b => {
        b.classList.toggle('is-active', b.dataset.freq === currentFreq);
      });
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
      this.classList.add('is-active');

      // Open advanced if extra payment is set
      if (p.extra > 0) {
        const af = document.getElementById('advanced-fields');
        const at = document.getElementById('advanced-toggle');
        if (af && !af.classList.contains('is-open')) {
          af.classList.add('is-open');
          if (at) at.setAttribute('aria-expanded', 'true');
        }
      }
      calculate();
    });
  });

  /* ─── CALCULATE ────────────────────────── */
  function calculate() {
    const principal = NNUtils.parseInputNumber(loanAmountEl.value);
    const rate      = parseFloat(interestRateEl.value) || 0;
    const term      = parseInt(loanTermEl.value) || 36;
    const extra     = NNUtils.parseInputNumber(extraPaymentEl?.value || '0');
    const fees      = NNUtils.parseInputNumber(loanFeesEl?.value || '0');
    const freq      = currentFreq;

    // Validate
    let valid = true;
    if (!principal || principal <= 0) {
      NNUtils.setError(loanAmountEl, 'loan-amount-error', 'Please enter a loan amount.');
      valid = false;
    } else { NNUtils.clearError(loanAmountEl, 'loan-amount-error'); }
    if (rate < 0 || rate > 50) {
      NNUtils.setError(interestRateEl, 'interest-rate-error', 'Enter a rate between 0% and 50%.');
      valid = false;
    } else { NNUtils.clearError(interestRateEl, 'interest-rate-error'); }
    if (!valid) return;

    const periodsPerYear = { monthly:12, biweekly:26, weekly:52 }[freq];
    const n              = Math.round(term / 12 * periodsPerYear);
    const r              = (rate / 100) / periodsPerYear;

    // Base payment
    let payment;
    if (r === 0) {
      payment = principal / n;
    } else {
      payment = principal * r * Math.pow(1+r, n) / (Math.pow(1+r, n) - 1);
    }

    const totalPayments = payment * n;
    const totalInterest = totalPayments - principal;

    // Build amortization (with and without extra)
    const scheduleBase  = buildAmort(principal, r, payment, n, 0);
    const scheduleExtra = extra > 0 ? buildAmort(principal, r, payment, n, extra) : scheduleBase;

    const extraTotalInt    = scheduleExtra.reduce((s, row) => s + row.interest, 0);
    const interestSaved    = extra > 0 ? totalInterest - extraTotalInt : 0;
    const periodsSaved     = extra > 0 ? n - scheduleExtra.length : 0;

    // Payoff dates
    const now        = new Date();
    const payoffBase = addPeriods(now, n, freq);
    const payoffExtra = extra > 0 ? addPeriods(now, scheduleExtra.length, freq) : null;

    renderResults({
      principal, rate, term, extra, fees, freq, r, n,
      payment, totalPayments, totalInterest,
      scheduleBase, scheduleExtra,
      extraTotalInt, interestSaved, periodsSaved,
      payoffBase, payoffExtra, periodsPerYear
    });

    if (window.NNAnalytics) NNAnalytics.trackCalculator('Loan Calculator', { rate, term, freq });
  }

  /* ─── BUILD AMORTIZATION ───────────────── */
  function buildAmort(principal, r, payment, maxPeriods, extra) {
    let balance = principal;
    const schedule = [];
    let count = 0;
    while (balance > 0.005 && count < maxPeriods * 3) {
      const interest  = balance * r;
      let   princ     = payment - interest + extra;
      if (princ >= balance) {
        schedule.push({ period: count+1, payment: balance + interest, principal: balance, interest, extra: 0, balance: 0 });
        balance = 0;
      } else {
        balance -= princ;
        schedule.push({ period: count+1, payment: payment + extra, principal: princ - extra, interest, extra, balance: Math.max(0, balance) });
      }
      count++;
      if (count >= maxPeriods && extra === 0) break;
    }
    return schedule;
  }

  /* ─── DATE HELPERS ─────────────────────── */
  function addPeriods(date, periods, freq) {
    const d = new Date(date);
    if (freq === 'monthly')   d.setMonth(d.getMonth() + periods);
    else if (freq === 'biweekly') d.setDate(d.getDate() + periods * 14);
    else d.setDate(d.getDate() + periods * 7);
    return d;
  }

  function formatDate(d) {
    return d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
  }

  function periodsToTime(periods, freq) {
    const months = freq === 'monthly' ? periods : freq === 'biweekly' ? Math.round(periods * 14 / 30.44) : Math.round(periods * 7 / 30.44);
    const yrs = Math.floor(months / 12);
    const mos = months % 12;
    if (yrs === 0) return `${mos} month${mos !== 1 ? 's' : ''}`;
    if (mos === 0) return `${yrs} year${yrs !== 1 ? 's' : ''}`;
    return `${yrs} yr${yrs !== 1 ? 's' : ''} ${mos} mo`;
  }

  /* ─── RENDER RESULTS ───────────────────── */
  function renderResults(d) {
    const wasHidden = resultsContent.classList.contains('hidden');
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    const freqLabels = { monthly:'Monthly Payment', biweekly:'Bi-Weekly Payment', weekly:'Weekly Payment' };

    // Payment hero
    document.getElementById('payment-label').textContent   = freqLabels[d.freq];
    document.getElementById('result-payment').textContent  = NNUtils.formatCAD(d.payment);
    document.getElementById('result-payment-sub').textContent =
      `${d.scheduleBase.length} payments × ${NNUtils.formatCAD(d.payment)} = ${NNUtils.formatCAD(d.totalPayments)}`;

    // Summary rows
    document.getElementById('result-principal').textContent = NNUtils.formatCAD(d.principal);
    document.getElementById('result-interest').textContent  = NNUtils.formatCAD(Math.max(0, d.totalInterest));
    document.getElementById('result-total').textContent     = NNUtils.formatCAD(d.totalPayments + d.fees);
    document.getElementById('result-payoff').textContent    = formatDate(d.payoffBase);
    const intPct = d.totalPayments > 0 ? (d.totalInterest / d.principal * 100) : 0;
    document.getElementById('result-int-pct').textContent   = `${intPct.toFixed(1)}%`;

    // Breakdown bar
    const principalPct = d.principal / d.totalPayments * 100;
    const interestPct  = 100 - principalPct;
    document.getElementById('bar-principal').style.width   = `${Math.max(2, principalPct)}%`;
    document.getElementById('bar-interest').style.width    = `${Math.max(2, interestPct)}%`;
    document.getElementById('principal-pct').textContent   = `${principalPct.toFixed(1)}%`;
    document.getElementById('interest-pct').textContent    = `${interestPct.toFixed(1)}%`;

    // Payoff timeline
    document.getElementById('payoff-start').textContent = formatDate(new Date());
    document.getElementById('payoff-end').textContent   = formatDate(d.payoffBase);
    const extraRow = document.getElementById('payoff-extra-row');
    if (d.extra > 0 && d.payoffExtra) {
      document.getElementById('payoff-extra-end').textContent = formatDate(d.payoffExtra);
      extraRow.style.display = '';
    } else {
      extraRow.style.display = 'none';
    }

    // Extra payment savings card
    const savingsCard = document.getElementById('savings-card');
    if (d.extra > 0) {
      document.getElementById('savings-base-int').textContent  = NNUtils.formatCAD(d.totalInterest);
      document.getElementById('savings-extra-int').textContent = NNUtils.formatCAD(d.extraTotalInt);
      document.getElementById('savings-saved').textContent     = NNUtils.formatCAD(d.interestSaved);
      document.getElementById('savings-time').textContent      = periodsToTime(d.periodsSaved, d.freq) + ' sooner';
      savingsCard.classList.remove('hidden');
    } else {
      savingsCard.classList.add('hidden');
    }

    // Rate insight
    let insight;
    if (d.rate === 0)       insight = 'You have a 0% interest rate — you\'re only paying back exactly what you borrowed.';
    else if (d.rate < 6)    insight = `At ${d.rate}%, this is an excellent rate — typically reserved for secured loans or top-tier credit. You\'re keeping interest costs low.`;
    else if (d.rate < 10)   insight = `At ${d.rate}%, this is a competitive rate for a Canadian personal loan. Total interest is ${NNUtils.formatCAD(d.totalInterest)} — ${intPct.toFixed(0)}% of your loan amount.`;
    else if (d.rate < 15)   insight = `At ${d.rate}%, this is a typical rate for average credit. Consider a credit union — they often offer 2–3% lower rates than banks for members.`;
    else if (d.rate < 20)   insight = `At ${d.rate}%, you're paying a high rate. A debt consolidation loan at a lower rate could save you significant money. Check your credit score — improving it by even 50 points could qualify you for a better rate.`;
    else                    insight = `At ${d.rate}%, this is a very high interest rate. This loan costs ${NNUtils.formatCAD(d.totalInterest)} in interest — ${intPct.toFixed(0)}% of what you borrowed. Explore debt consolidation or credit union alternatives urgently.`;
    document.getElementById('rate-insight-text').textContent = insight;

    // Summary pills
    NNUtils.renderSummaryPills('result-summary-box', [
      `💳 ${NNUtils.formatCAD0(d.principal)}`,
      `📈 ${d.rate}%`,
      `📅 ${d.term} months`,
      d.extra > 0 ? `⚡ +${NNUtils.formatCAD0(d.extra)} extra` : null
    ].filter(Boolean));

    // Celebration
    let celebration = '';
    if (d.rate === 0)               celebration = '🎉 <strong>0% interest!</strong> You\'re paying back exactly what you borrowed — no interest cost at all.';
    else if (d.interestSaved > 500) celebration = `🎉 <strong>Great move!</strong> Your extra payments save you <strong>${NNUtils.formatCAD(d.interestSaved)}</strong> in interest and get you debt-free ${periodsToTime(d.periodsSaved, d.freq)} sooner.`;
    else if (d.rate < 8)            celebration = '✅ <strong>Competitive rate!</strong> You\'ve secured a low interest rate — you\'re keeping borrowing costs well managed.';
    NNUtils.renderCelebration('result-celebration', celebration);

    // Amort table — use extra schedule if applicable
    const schedule = d.extra > 0 ? d.scheduleExtra : d.scheduleBase;
    renderAmortTable(schedule, d.freq, d.extra > 0);
    amortSection.removeAttribute('hidden');

    // Store for copy
    window._loanResults = d;

    NNUtils.scrollToResults('results-heading', wasHidden);
  }

  /* ─── AMORT TABLE ──────────────────────── */
  function renderAmortTable(schedule, freq, showExtra) {
    if (!amortTbody) return;
    const periodLabel = { monthly:'Month', biweekly:'Period', weekly:'Week' }[freq] || 'Period';
    document.querySelector('.amort-table th:first-child').textContent = periodLabel;

    // Show/hide Extra column header
    const extraTh = document.querySelector('.amort-table th:nth-child(3)');
    if (extraTh) extraTh.style.display = showExtra ? '' : 'none';

    amortTbody.innerHTML = '';
    schedule.forEach(row => {
      const tr = document.createElement('tr');
      const extraCell = showExtra
        ? `<td class="td-extra">${row.extra > 0 ? '+' + NNUtils.formatCAD(row.extra) : '—'}</td>`
        : '<td style="display:none"></td>';
      tr.innerHTML = `
        <td>${row.period}</td>
        <td>${NNUtils.formatCAD(row.payment)}</td>
        ${extraCell}
        <td>${NNUtils.formatCAD(row.principal)}</td>
        <td class="td-interest">${NNUtils.formatCAD(row.interest)}</td>
        <td>${NNUtils.formatCAD(Math.max(0, row.balance))}</td>`;
      amortTbody.appendChild(tr);
    });
  }

  /* ─── AMORT TOGGLE ─────────────────────── */
  if (amortToggle && amortWrapper) {
    amortToggle.addEventListener('click', function () {
      const isOpen = amortWrapper.classList.toggle('is-open');
      this.setAttribute('aria-expanded', String(isOpen));
    });
  }

  /* ─── LIVE UPDATE ──────────────────────── */
  function liveUpdate() {
    if (!resultsContent.classList.contains('hidden')) calculate();
  }
  loanTermEl?.addEventListener('change', liveUpdate);
  extraPaymentEl?.addEventListener('input', liveUpdate);

  /* ─── FORM SUBMIT ──────────────────────── */
  form.addEventListener('submit', function (e) { e.preventDefault(); calculate(); });
  form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); calculate(); } });
  });

  /* ─── COPY RESULTS ─────────────────────── */
  document.getElementById('copy-results-btn')?.addEventListener('click', function () {
    const d = window._loanResults;
    if (!d) return;
    const freqLabel = { monthly:'Monthly', biweekly:'Bi-Weekly', weekly:'Weekly' }[d.freq];
    const lines = [
      `💳 Loan Amount:         ${NNUtils.formatCAD(d.principal)}`,
      `📈 Interest Rate:       ${d.rate}%`,
      `📅 Term:                ${d.term} months`,
      `💵 ${freqLabel} Payment: ${NNUtils.formatCAD(d.payment)}`,
      `💸 Total Interest:      ${NNUtils.formatCAD(Math.max(0, d.totalInterest))}`,
      `💰 Total Repayment:     ${NNUtils.formatCAD(d.totalPayments)}`
    ];
    if (d.extra > 0) {
      lines.push(`⚡ Interest Saved (extra payments): ${NNUtils.formatCAD(d.interestSaved)}`);
    }
    NNUtils.copyResults(this, lines, 'Loan Calculator');
  });

  /* ─── RESET ────────────────────────────── */
  document.getElementById('reset-btn')?.addEventListener('click', function () {
    loanAmountEl.value   = '';
    interestRateEl.value = '9.99';
    loanTermEl.value     = '36';
    extraPaymentEl.value = '0';
    loanFeesEl.value     = '0';
    if (amountSlider) amountSlider.value = 15000;
    if (rateSlider)   rateSlider.value   = 9.99;

    currentFreq = 'monthly';
    document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('is-active'));
    document.querySelector('[data-freq="monthly"]')?.classList.add('is-active');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));

    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    amortSection.setAttribute('hidden', '');

    const af = document.getElementById('advanced-fields');
    const at = document.getElementById('advanced-toggle');
    if (af) af.classList.remove('is-open');
    if (at) at.setAttribute('aria-expanded', 'false');
  });

  /* ─── INIT ─────────────────────────────── */
  loanAmountEl.value = NNUtils.formatInputNumber(15000);

});

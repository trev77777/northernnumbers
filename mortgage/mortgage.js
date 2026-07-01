/* =============================================
   NORTHERN NUMBERS — mortgage.js
   Canadian Mortgage Calculator Logic

   Key Canadian rule: mortgages compound semi-annually,
   not monthly. We convert to an effective monthly rate.

   CMHC rules (2024):
   - 5.00% – 9.99% down  → 4.00% premium
   - 10.00% – 14.99% down → 3.10% premium
   - 15.00% – 19.99% down → 2.80% premium
   - 20.00%+ down         → 0% (conventional)
   Premium is added to the mortgage balance before payment calc.
   ============================================= */

'use strict';

/* =============================================
   1. STATE
   ============================================= */
const state = {
  dpType: 'dollar',      // 'dollar' or 'percent'
  frequency: 'monthly'   // 'monthly' | 'biweekly' | 'accelerated'
};


/* =============================================
   2. DOM REFERENCES
   ============================================= */
const form             = document.getElementById('mortgage-form');
const purchasePriceEl  = document.getElementById('purchase-price');
const downPaymentEl    = document.getElementById('down-payment');
const interestRateEl   = document.getElementById('interest-rate');
const amortizationEl   = document.getElementById('amortization');
const startDateEl      = document.getElementById('start-date');
const cmhcNotice       = document.getElementById('cmhc-notice');
const dpPrefix         = document.getElementById('dp-prefix');

const resultsPlaceholder = document.getElementById('results-placeholder');
const resultsContent     = document.getElementById('results-content');

const resultPayment       = document.getElementById('result-payment');
const paymentLabel        = document.getElementById('payment-label');
const resultBaseMortgage  = document.getElementById('result-base-mortgage');
const resultCmhcPremium   = document.getElementById('result-cmhc-premium');
const resultCmhcRow       = document.getElementById('result-cmhc-row');
const resultTotalMortgage = document.getElementById('result-total-mortgage');
const resultTotalPay      = document.getElementById('result-total-payments');
const resultTotalInt      = document.getElementById('result-total-interest');
const resultPayoffDate    = document.getElementById('result-payoff-date');

const barPrincipal       = document.getElementById('bar-principal');
const barInterest        = document.getElementById('bar-interest');
const legendPrincipalPct = document.getElementById('legend-principal-pct');
const legendInterestPct  = document.getElementById('legend-interest-pct');

const amortSection       = document.getElementById('amort-section');
const amortToggle        = document.getElementById('amort-toggle');
const amortTableWrapper  = document.getElementById('amort-table-wrapper');
const amortTbody         = document.getElementById('amort-tbody');


/* =============================================
   3. FORMATTING UTILITIES
   ============================================= */

/**
 * Format a number as CAD currency.
 * e.g. 1234.56 → "$1,234.56"
 */
function formatCAD(amount) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format a raw number with thousands commas, no decimals.
 * Used for input field display. e.g. 500000 → "500,000"
 */
function formatInputNumber(value) {
  const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Strip formatting from an input field value → raw number.
 * e.g. "500,000" → 500000
 */
function parseInputNumber(value) {
  return parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
}

/**
 * Format a number as a percentage string.
 * e.g. 0.2345 → "23.45%"
 */
function formatPct(decimal) {
  return (decimal * 100).toFixed(1) + '%';
}

/**
 * Format a Date as "Month YYYY"
 * e.g. new Date(2031, 5) → "June 2031"
 */
function formatMonthYear(date) {
  return date.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
}


/* =============================================
   3b. LIVE INPUT FORMATTING
   Attach comma-formatting to dollar inputs as
   the user types. Preserves cursor position.
   ============================================= */
function attachInputFormatter(inputEl) {
  function formatValue() {
    // Only format dollar inputs (not % mode)
    if (inputEl === downPaymentEl && state.dpType === 'percent') return;

    const raw = this.value.replace(/[^0-9]/g, '');
    const num = parseInt(raw, 10);

    if (raw === '') { this.value = ''; return; }

    const formatted = isNaN(num) ? '' : new Intl.NumberFormat('en-CA', {
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(num);

    // Preserve cursor position
    const selStart = this.selectionStart;
    const prevLen  = this.value.length;
    this.value     = formatted;
    const newLen   = this.value.length;
    const newPos   = Math.max(0, selStart + (newLen - prevLen));
    try { this.setSelectionRange(newPos, newPos); } catch(e) {}
  }

  // Use both input and change to catch iOS Safari
  inputEl.addEventListener('input',  formatValue);
  inputEl.addEventListener('change', formatValue);
}

attachInputFormatter(purchasePriceEl);
attachInputFormatter(downPaymentEl);



/* =============================================
   4. CMHC PREMIUM CALCULATION
   ============================================= */

/**
 * Calculate CMHC mortgage default insurance premium.
 * Premium is a % of the BASE mortgage (purchase price - down payment).
 *
 * @param {number} dpRatio       - down payment as decimal, e.g. 0.10
 * @param {number} baseMortgage  - purchase price minus down payment
 * @returns {{ rate: number, premium: number }}
 */
function calcCmhc(dpRatio, baseMortgage) {
  let rate = 0;

  if (dpRatio >= 0.20) {
    rate = 0;
  } else if (dpRatio >= 0.15) {
    rate = 0.0280;
  } else if (dpRatio >= 0.10) {
    rate = 0.0310;
  } else if (dpRatio >= 0.05) {
    rate = 0.0400;
  } else {
    rate = 0; // under 5% — validation blocks this case
  }

  return { rate, premium: baseMortgage * rate };
}


/* =============================================
   5. CORE MORTGAGE MATH
   ============================================= */

/**
 * Convert Canadian nominal annual rate (semi-annual compounding)
 * to an effective rate per payment period.
 *
 * Canadian law (Interest Act): mortgages must state the rate as
 * compounded semi-annually, not in advance.
 *
 * Formula:
 *   effectiveAnnual = (1 + nominalRate/2)^2 - 1
 *   ratePerPeriod   = (1 + effectiveAnnual)^(1/periodsPerYear) - 1
 *
 * @param {number} annualRatePct   - e.g. 5.25 (percent)
 * @param {number} periodsPerYear  - 12 (monthly), 26 (bi-weekly)
 * @returns {number} effective rate per payment period
 */
function getEffectiveRatePerPeriod(annualRatePct, periodsPerYear) {
  const nominalRate    = annualRatePct / 100;
  const effectiveAnnual = Math.pow(1 + nominalRate / 2, 2) - 1;
  return Math.pow(1 + effectiveAnnual, 1 / periodsPerYear) - 1;
}

/**
 * Calculate fixed payment per period using the standard annuity formula.
 *
 * @param {number} principal    - Mortgage amount
 * @param {number} ratePerPeriod
 * @param {number} totalPeriods - Total number of payments
 * @returns {number} payment per period
 */
function calcPayment(principal, ratePerPeriod, totalPeriods) {
  if (ratePerPeriod === 0) {
    return principal / totalPeriods;
  }
  return principal *
    (ratePerPeriod * Math.pow(1 + ratePerPeriod, totalPeriods)) /
    (Math.pow(1 + ratePerPeriod, totalPeriods) - 1);
}

/**
 * Build a full annual amortization schedule.
 * Returns an array of yearly summaries: { year, payment, principal, interest, balance }
 *
 * @param {number} principal
 * @param {number} ratePerPeriod
 * @param {number} paymentAmount
 * @param {number} periodsPerYear
 * @param {Date|null} startDate
 * @returns {Array}
 */
function buildAmortSchedule(principal, ratePerPeriod, paymentAmount, periodsPerYear, startDate) {
  let balance = principal;
  const schedule = [];
  let periodCount = 0;
  let startYear = startDate ? startDate.getFullYear() : new Date().getFullYear();

  while (balance > 0.01) {
    let yearPrincipal = 0;
    let yearInterest  = 0;
    let yearPayment   = 0;

    for (let p = 0; p < periodsPerYear; p++) {
      if (balance <= 0.01) break;

      const interestPortion  = balance * ratePerPeriod;
      let principalPortion   = paymentAmount - interestPortion;

      // Last payment adjustment — avoid negative balance
      if (principalPortion > balance) {
        principalPortion = balance;
      }

      yearInterest  += interestPortion;
      yearPrincipal += principalPortion;
      yearPayment   += principalPortion + interestPortion;
      balance       -= principalPortion;
      periodCount++;
    }

    schedule.push({
      year:      startYear + schedule.length,
      payment:   yearPayment,
      principal: yearPrincipal,
      interest:  yearInterest,
      balance:   Math.max(balance, 0)
    });

    // Safety: prevent infinite loop on edge cases
    if (schedule.length > 50) break;
  }

  return schedule;
}


/* =============================================
   5. VALIDATION
   ============================================= */

function setError(inputEl, errorEl, message) {
  inputEl.classList.add('is-error');
  errorEl.textContent = message;
  errorEl.classList.add('is-visible');
}

function clearError(inputEl, errorEl) {
  inputEl.classList.remove('is-error');
  errorEl.textContent = '';
  errorEl.classList.remove('is-visible');
}

/**
 * Validate all inputs. Returns { valid, values } or { valid: false }.
 */
function validateInputs() {
  let valid = true;

  // Purchase price — strip commas before parsing
  const priceErrorEl = document.getElementById('purchase-price-error');
  const price = parseInputNumber(purchasePriceEl.value);
  if (!price || price < 50000) {
    setError(purchasePriceEl, priceErrorEl, 'Please enter a purchase price of at least $50,000.');
    valid = false;
  } else {
    clearError(purchasePriceEl, priceErrorEl);
  }

  // Down payment — strip commas before parsing
  const dpErrorEl = document.getElementById('down-payment-error');
  let downPayment = parseInputNumber(downPaymentEl.value);
  if (isNaN(downPayment) || downPayment < 0) {
    setError(downPaymentEl, dpErrorEl, 'Please enter a valid down payment.');
    valid = false;
  } else {
    if (state.dpType === 'percent') {
      // In percent mode, value is already a plain number (no commas)
      downPayment = parseFloat(downPaymentEl.value) || 0;
      downPayment = price * (downPayment / 100);
    }
    const dpRatio = price > 0 ? downPayment / price : 0;
    if (downPayment >= price) {
      setError(downPaymentEl, dpErrorEl, 'Down payment must be less than the purchase price.');
      valid = false;
    } else if (dpRatio < 0.05) {
      setError(downPaymentEl, dpErrorEl, 'Minimum down payment for an insured mortgage is 5%.');
      valid = false;
    } else {
      clearError(downPaymentEl, dpErrorEl);
    }
  }

  // Interest rate — plain number, no formatting needed
  const rateErrorEl = document.getElementById('interest-rate-error');
  const rate = parseFloat(interestRateEl.value);
  if (!rate || rate < 0.1 || rate > 25) {
    setError(interestRateEl, rateErrorEl, 'Please enter an interest rate between 0.1% and 25%.');
    valid = false;
  } else {
    clearError(interestRateEl, rateErrorEl);
  }

  if (!valid) return { valid: false };

  // Resolve final down payment value
  let resolvedDp;
  if (state.dpType === 'percent') {
    resolvedDp = price * ((parseFloat(downPaymentEl.value) || 0) / 100);
  } else {
    resolvedDp = parseInputNumber(downPaymentEl.value);
  }

  return {
    valid: true,
    values: {
      price,
      downPayment: resolvedDp,
      rate,
      amortYears: parseInt(amortizationEl.value),
      frequency: state.frequency,
      startDate: startDateEl.value ? new Date(startDateEl.value + '-01') : null
    }
  };
}


/* =============================================
   6. CALCULATE & RENDER RESULTS
   ============================================= */

function calculate() {
  const { valid, values } = validateInputs();
  if (!valid) return;

  const { price, downPayment, rate, amortYears, frequency, startDate } = values;

  // --- CMHC ---
  const baseMortgage  = price - downPayment;
  const dpRatio       = downPayment / price;
  const cmhc          = calcCmhc(dpRatio, baseMortgage);
  const totalMortgage = baseMortgage + cmhc.premium; // financed amount

  // Determine periods per year and label
  let periodsPerYear, freqLabel;
  let isAccelerated = false;

  switch (frequency) {
    case 'biweekly':
      periodsPerYear = 26;
      freqLabel = 'Bi-Weekly Payment';
      break;
    case 'accelerated':
      periodsPerYear = 26;
      freqLabel = 'Accelerated Bi-Weekly Payment';
      isAccelerated = true;
      break;
    default:
      periodsPerYear = 12;
      freqLabel = 'Monthly Payment';
  }

  // Get effective rate per payment period (Canadian semi-annual compounding)
  const ratePerPeriod = getEffectiveRatePerPeriod(rate, periodsPerYear);
  const totalPeriods  = amortYears * periodsPerYear;

  // Payment is based on totalMortgage (base + CMHC premium)
  let paymentAmount = calcPayment(totalMortgage, ratePerPeriod, totalPeriods);

  // Accelerated bi-weekly: half of equivalent monthly payment
  if (isAccelerated) {
    const monthlyRate    = getEffectiveRatePerPeriod(rate, 12);
    const monthlyPayment = calcPayment(totalMortgage, monthlyRate, amortYears * 12);
    paymentAmount = monthlyPayment / 2;
  }

  // Build amortization schedule starting from totalMortgage
  const schedule      = buildAmortSchedule(totalMortgage, ratePerPeriod, paymentAmount, periodsPerYear, startDate);
  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
  const totalPayments = totalMortgage + totalInterest;

  // Payoff date
  let payoffDate = null;
  if (startDate) {
    payoffDate = new Date(startDate);
    payoffDate.setMonth(payoffDate.getMonth() + schedule.length * 12);
  }

  // Breakdown percentages
  const principalPct = totalMortgage / totalPayments;
  const interestPct  = totalInterest / totalPayments;

  // --- Render ---
  resultsPlaceholder.classList.add('hidden');
  resultsContent.classList.remove('hidden');

  paymentLabel.textContent         = freqLabel;
  resultPayment.textContent        = formatCAD(paymentAmount);
  resultBaseMortgage.textContent   = formatCAD(baseMortgage);
  resultTotalMortgage.textContent  = formatCAD(totalMortgage);
  resultTotalPay.textContent       = formatCAD(totalPayments);
  resultTotalInt.textContent       = formatCAD(totalInterest);
  resultPayoffDate.textContent     = payoffDate
    ? formatMonthYear(payoffDate)
    : `~${schedule.length} years`;

  // Show CMHC row only when premium applies
  if (cmhc.premium > 0) {
    resultCmhcPremium.textContent = `${formatCAD(cmhc.premium)} (${(cmhc.rate * 100).toFixed(2)}%)`;
    resultCmhcRow.classList.remove('hidden');
  } else {
    resultCmhcRow.classList.add('hidden');
  }

  // Breakdown bar
  barPrincipal.style.width       = formatPct(principalPct);
  barInterest.style.width        = formatPct(interestPct);
  legendPrincipalPct.textContent = formatPct(principalPct);
  legendInterestPct.textContent  = formatPct(interestPct);

  // Render amortization schedule
  renderAmortTable(schedule);

  // Input summary pills
  const summaryBox = document.getElementById('result-summary-box');
  if (summaryBox) {
    const dpDisplay = state.dpType === 'percent'
      ? `${downPaymentEl.value}% down`
      : `${formatCAD(downPayment)} down`;
    summaryBox.innerHTML = `
      <p style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:var(--space-3);">Your mortgage is based on</p>
      <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);">
        <span class="summary-tag">🏠 ${formatCAD(price)}</span>
        <span class="summary-tag">💰 ${dpDisplay}</span>
        <span class="summary-tag">📈 ${rate * 100}% rate</span>
        <span class="summary-tag">📅 ${amortYears} yr amort</span>
      </div>`;
    summaryBox.classList.remove('hidden');
  }

  // Accelerated savings card
  const savingsCard = document.getElementById('savings-card');
  if (savingsCard) {
    if (frequency === 'accelerated') {
      // Compare against standard monthly
      const monthlyRate2  = getEffectiveRatePerPeriod(rate, 12);
      const monthlyPmt    = calcPayment(totalMortgage, monthlyRate2, amortYears * 12);
      const monthlySchedule = buildAmortSchedule(totalMortgage, monthlyRate2, monthlyPmt, 12, startDate);
      const monthlyInterest = monthlySchedule.reduce((s, r) => s + r.interest, 0);
      const interestSaved   = monthlyInterest - totalInterest;
      const monthsSaved     = (monthlySchedule.length - schedule.length) * 12;
      const yearsSaved      = Math.floor(Math.abs(monthsSaved) / 12);
      const moSaved         = Math.abs(monthsSaved) % 12;
      const timeSavedText   = yearsSaved > 0
        ? `${yearsSaved} yr${yearsSaved > 1 ? 's' : ''} ${moSaved > 0 ? moSaved + ' mo' : ''}`
        : `${moSaved} months`;

      document.getElementById('savings-monthly-total').textContent  = formatCAD(totalMortgage + monthlyInterest);
      document.getElementById('savings-accel-total').textContent    = formatCAD(totalPayments);
      document.getElementById('savings-interest-saved').textContent = formatCAD(interestSaved);
      document.getElementById('savings-time-saved').textContent     = timeSavedText;
      savingsCard.classList.remove('hidden');
    } else {
      savingsCard.classList.add('hidden');
    }
  }

  // Store for copy
  window._mortgageResults = {
    payment: formatCAD(paymentAmount),
    freq: freqLabel,
    baseMortgage: formatCAD(baseMortgage),
    totalMortgage: formatCAD(totalMortgage),
    totalInterest: formatCAD(totalInterest),
    totalPayments: formatCAD(totalPayments),
    payoff: payoffDate ? formatMonthYear(payoffDate) : `~${schedule.length} years`
  };

  // Scroll to results heading
  const resultsHeading = document.getElementById('results-heading');
  if (resultsHeading) {
    const top = resultsHeading.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}


/* =============================================
   7. AMORTIZATION TABLE
   ============================================= */

function renderAmortTable(schedule) {
  amortTbody.innerHTML = '';

  schedule.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.year}</td>
      <td>${formatCAD(row.payment)}</td>
      <td class="td-principal">${formatCAD(row.principal)}</td>
      <td class="td-interest">${formatCAD(row.interest)}</td>
      <td>${formatCAD(row.balance)}</td>
    `;
    amortTbody.appendChild(tr);
  });

  // Show the amortization section
  amortSection.removeAttribute('hidden');
}

// Toggle amort table open/close
amortToggle.addEventListener('click', function () {
  const isOpen = amortTableWrapper.classList.toggle('is-open');
  amortToggle.setAttribute('aria-expanded', isOpen.toString());
});


/* =============================================
   8. DOWN PAYMENT TOGGLE ($ vs %)
   ============================================= */

document.querySelectorAll('[data-dp-type]').forEach(btn => {
  btn.addEventListener('click', function () {
    const type = this.dataset.dpType;
    if (type === state.dpType) return;

    const price      = parseInputNumber(purchasePriceEl.value);
    const currentVal = state.dpType === 'percent'
      ? parseFloat(downPaymentEl.value) || 0
      : parseInputNumber(downPaymentEl.value);

    if (type === 'percent' && price > 0) {
      // Convert dollar → percentage
      downPaymentEl.value       = ((currentVal / price) * 100).toFixed(1);
      dpPrefix.textContent      = '%';
      downPaymentEl.placeholder = '20';
      downPaymentEl.inputMode   = 'decimal';
    } else {
      // Convert percentage → formatted dollar
      const dollarVal           = Math.round(price * (currentVal / 100));
      downPaymentEl.value       = formatInputNumber(dollarVal);
      dpPrefix.textContent      = '$';
      downPaymentEl.placeholder = '100,000';
      downPaymentEl.inputMode   = 'numeric';
    }

    state.dpType = type;

    document.querySelectorAll('[data-dp-type]').forEach(b => {
      b.classList.toggle('is-active', b.dataset.dpType === type);
      b.setAttribute('aria-pressed', (b.dataset.dpType === type).toString());
    });

    checkCmhc();
  });
});


/* =============================================
   9. PAYMENT FREQUENCY TOGGLE
   ============================================= */

document.querySelectorAll('[data-freq]').forEach(btn => {
  btn.addEventListener('click', function () {
    state.frequency = this.dataset.freq;

    document.querySelectorAll('[data-freq]').forEach(b => {
      b.classList.toggle('is-active', b.dataset.freq === state.frequency);
      b.setAttribute('aria-pressed', (b.dataset.freq === state.frequency).toString());
    });
  });
});


/* =============================================
   10. CMHC CHECK — show notice + live rate on input
   ============================================= */

function checkCmhc() {
  const price = parseInputNumber(purchasePriceEl.value);
  let dp;

  if (state.dpType === 'percent') {
    dp = price * ((parseFloat(downPaymentEl.value) || 0) / 100);
  } else {
    dp = parseInputNumber(downPaymentEl.value);
  }

  const dpRatio   = price > 0 ? dp / price : 0;
  const needsCmhc = dpRatio >= 0.05 && dpRatio < 0.20 && price > 0 && dp > 0;
  const { rate }  = calcCmhc(dpRatio, price - dp);

  const cmhcRateEl = document.getElementById('cmhc-rate-label');
  if (cmhcRateEl) {
    cmhcRateEl.textContent = `${(rate * 100).toFixed(2)}%`;
  }

  cmhcNotice.classList.toggle('is-visible', needsCmhc);
}

purchasePriceEl.addEventListener('input', checkCmhc);
downPaymentEl.addEventListener('input', checkCmhc);


/* =============================================
   11. FORM SUBMIT
   ============================================= */

form.addEventListener('submit', function (e) {
  e.preventDefault();
  calculate();
});

// Also calculate on Enter key in any input field
form.querySelectorAll('input, select').forEach(el => {
  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      calculate();
    }
  });
});


/* =============================================
   12. INIT — Set default start date and format inputs
   ============================================= */
(function init() {
  const now  = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  startDateEl.value     = `${yyyy}-${mm}`;
  purchasePriceEl.value = formatInputNumber(500000);
  downPaymentEl.value   = formatInputNumber(100000);
  checkCmhc();
})();


/* =============================================
   13. RATE SLIDER ↔ INPUT SYNC
   ============================================= */
const rateSlider = document.getElementById('rate-slider');
if (rateSlider) {
  rateSlider.addEventListener('input', function () {
    interestRateEl.value = parseFloat(this.value).toFixed(2);
    checkCmhc();
    if (!resultsContent.classList.contains('hidden')) calculate();
  });
  interestRateEl.addEventListener('input', function () {
    const val = parseFloat(this.value);
    if (!isNaN(val) && val >= 0.5 && val <= 10) rateSlider.value = val;
  });
}


/* =============================================
   14. PRESETS
   ============================================= */
const PRESETS = {
  starter:  { price: 500000, dp: 25000,  rate: 5.25, amort: 25, freq: 'monthly' },
  average:  { price: 750000, dp: 150000, rate: 5.25, amort: 25, freq: 'monthly' },
  upsizer:  { price: 1100000, dp: 300000, rate: 5.00, amort: 25, freq: 'accelerated' },
  renewal:  { price: 600000, dp: 120000, rate: 5.50, amort: 20, freq: 'accelerated' }
};

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const p = PRESETS[this.dataset.preset];
    if (!p) return;

    purchasePriceEl.value = formatInputNumber(p.price);
    downPaymentEl.value   = formatInputNumber(p.dp);
    interestRateEl.value  = p.rate;
    amortizationEl.value  = p.amort;
    if (rateSlider) rateSlider.value = p.rate;

    // Reset dp mode to $
    state.dpType          = 'dollar';
    dpPrefix.textContent  = '$';
    downPaymentEl.inputMode = 'numeric';
    document.querySelectorAll('[data-dp-type]').forEach(b => {
      b.classList.toggle('is-active', b.dataset.dpType === 'dollar');
      b.setAttribute('aria-pressed', (b.dataset.dpType === 'dollar').toString());
    });

    // Set frequency
    state.frequency = p.freq;
    document.querySelectorAll('[data-freq]').forEach(b => {
      b.classList.toggle('is-active', b.dataset.freq === p.freq);
      b.setAttribute('aria-pressed', (b.dataset.freq === p.freq).toString());
    });

    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
    this.classList.add('is-active');

    checkCmhc();
    calculate();
  });
});


/* =============================================
   15. RESET
   ============================================= */
const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
  resetBtn.addEventListener('click', function () {
    purchasePriceEl.value = formatInputNumber(500000);
    downPaymentEl.value   = formatInputNumber(100000);
    interestRateEl.value  = '5.25';
    amortizationEl.value  = '25';
    if (rateSlider) rateSlider.value = 5.25;

    state.dpType    = 'dollar';
    state.frequency = 'monthly';
    dpPrefix.textContent = '$';

    document.querySelectorAll('[data-dp-type]').forEach(b => {
      b.classList.toggle('is-active', b.dataset.dpType === 'dollar');
      b.setAttribute('aria-pressed', (b.dataset.dpType === 'dollar').toString());
    });
    document.querySelectorAll('[data-freq]').forEach(b => {
      b.classList.toggle('is-active', b.dataset.freq === 'monthly');
      b.setAttribute('aria-pressed', (b.dataset.freq === 'monthly').toString());
    });
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));

    resultsPlaceholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    amortSection.setAttribute('hidden', '');

    const summaryBox = document.getElementById('result-summary-box');
    if (summaryBox) summaryBox.classList.add('hidden');
    const savingsCard = document.getElementById('savings-card');
    if (savingsCard) savingsCard.classList.add('hidden');
    const copyBtn = document.getElementById('copy-results-btn');
    if (copyBtn) { copyBtn.textContent = '📋 Copy Results to Clipboard'; copyBtn.classList.remove('copied'); }

    checkCmhc();
  });
}


/* =============================================
   16. COPY RESULTS
   ============================================= */
const copyBtn = document.getElementById('copy-results-btn');
if (copyBtn) {
  copyBtn.addEventListener('click', function () {
    const r = window._mortgageResults;
    if (!r) return;
    const text = [
      '🏠 My Mortgage Results — Northern Numbers',
      '─────────────────────────',
      `💰 ${r.freq}:        ${r.payment}`,
      `🏦 Base Mortgage:        ${r.baseMortgage}`,
      `📋 Total Mortgage:       ${r.totalMortgage}`,
      `💸 Total Interest:       ${r.totalInterest}`,
      `💵 Total Payments:       ${r.totalPayments}`,
      `📅 Payoff Date:          ${r.payoff}`,
      '─────────────────────────',
      'Calculated at northernnumbers.ca/mortgage/'
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = '✅ Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => { copyBtn.textContent = '📋 Copy Results to Clipboard'; copyBtn.classList.remove('copied'); }, 2500);
    }).catch(() => { copyBtn.textContent = 'Copy not supported in this browser'; });
  });
}

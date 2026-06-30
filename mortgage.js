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

  // Purchase price
  const priceErrorEl = document.getElementById('purchase-price-error');
  const price = parseFloat(purchasePriceEl.value);
  if (!price || price < 50000) {
    setError(purchasePriceEl, priceErrorEl, 'Please enter a purchase price of at least $50,000.');
    valid = false;
  } else {
    clearError(purchasePriceEl, priceErrorEl);
  }

  // Down payment
  const dpErrorEl = document.getElementById('down-payment-error');
  let downPayment = parseFloat(downPaymentEl.value);
  if (isNaN(downPayment) || downPayment < 0) {
    setError(downPaymentEl, dpErrorEl, 'Please enter a valid down payment.');
    valid = false;
  } else {
    if (state.dpType === 'percent') {
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

  // Interest rate
  const rateErrorEl = document.getElementById('interest-rate-error');
  const rate = parseFloat(interestRateEl.value);
  if (!rate || rate < 0.1 || rate > 25) {
    setError(interestRateEl, rateErrorEl, 'Please enter an interest rate between 0.1% and 25%.');
    valid = false;
  } else {
    clearError(interestRateEl, rateErrorEl);
  }

  if (!valid) return { valid: false };

  const rawDp = parseFloat(downPaymentEl.value);
  const resolvedDp = state.dpType === 'percent'
    ? price * (rawDp / 100)
    : rawDp;

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

  // Scroll to results on mobile
  if (window.innerWidth < 900) {
    resultsContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

    const price = parseFloat(purchasePriceEl.value) || 0;
    const currentVal = parseFloat(downPaymentEl.value) || 0;

    // Convert value between $ and %
    if (type === 'percent' && price > 0) {
      downPaymentEl.value = ((currentVal / price) * 100).toFixed(1);
      dpPrefix.textContent = '%';
      downPaymentEl.placeholder = '20';
      downPaymentEl.max = '99.9';
      downPaymentEl.step = '0.5';
    } else {
      downPaymentEl.value = Math.round(price * (currentVal / 100));
      dpPrefix.textContent = '$';
      downPaymentEl.placeholder = '100,000';
      downPaymentEl.removeAttribute('max');
      downPaymentEl.step = '1000';
    }

    state.dpType = type;

    // Update button states
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
  const price = parseFloat(purchasePriceEl.value) || 0;
  let dp = parseFloat(downPaymentEl.value) || 0;

  if (state.dpType === 'percent') {
    dp = price * (dp / 100);
  }

  const dpRatio   = price > 0 ? dp / price : 0;
  const needsCmhc = dpRatio >= 0.05 && dpRatio < 0.20 && price > 0 && dp > 0;
  const { rate }  = calcCmhc(dpRatio, price - dp);

  // Update live rate label inside the notice
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
   12. INIT — Set default start date to current month
   ============================================= */
(function init() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  startDateEl.value = `${yyyy}-${mm}`;

  // Run initial CMHC check with default values
  checkCmhc();
})();

/* =============================================
   NORTHERN NUMBERS — tfsa.js
   Canadian TFSA Calculator Logic

   Key Canadian TFSA rules:
   - Annual limit: $7,000 for 2024, 2025, 2026
   - Unused room carries forward indefinitely
   - Withdrawals restore room on Jan 1 of following year
   - Over-contribution penalty: 1% per month on excess
   - Lifetime room in 2026 (eligible since 2009): $95,000
   ============================================= */

'use strict';

/* =============================================
   1. DOM REFERENCES
   ============================================= */
const form               = document.getElementById('tfsa-form');
const balanceEl          = document.getElementById('current-balance');
const roomEl             = document.getElementById('contrib-room');
const contributionEl     = document.getElementById('contribution');
const frequencyEl        = document.getElementById('contrib-frequency');
const returnEl           = document.getElementById('annual-return');
const horizonEl          = document.getElementById('time-horizon');
const annualLimitEl      = document.getElementById('annual-limit');
const inflationEl        = document.getElementById('inflation-rate');

const resultsPlaceholder = document.getElementById('tfsa-results-placeholder');
const resultsContent     = document.getElementById('tfsa-results-content');

const resultFutureValue    = document.getElementById('result-future-value');
const resultTotalContribs  = document.getElementById('result-total-contributions');
const resultGrowth         = document.getElementById('result-investment-growth');
const resultRemainingRoom  = document.getElementById('result-remaining-room');
const resultInflation      = document.getElementById('result-inflation-adjusted');

const milestone100k      = document.getElementById('milestone-100k');
const milestone250k      = document.getElementById('milestone-250k');
const milestone500k      = document.getElementById('milestone-500k');
const milestone100kYear  = document.getElementById('milestone-100k-year');
const milestone250kYear  = document.getElementById('milestone-250k-year');
const milestone500kYear  = document.getElementById('milestone-500k-year');
const milestone100kLabel = document.getElementById('milestone-100k-label');
const milestone250kLabel = document.getElementById('milestone-250k-label');
const milestone500kLabel = document.getElementById('milestone-500k-label');

const growthSection      = document.getElementById('growth-section');
const growthToggle       = document.getElementById('growth-toggle');
const growthTableWrapper = document.getElementById('growth-table-wrapper');
const growthTbody        = document.getElementById('growth-tbody');

const overContribWarning = document.getElementById('over-contrib-warning');


/* =============================================
   2. FORMATTING UTILITIES
   ============================================= */

function formatCAD(amount) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatCAD0(amount) {
  // No decimal places — for cleaner display of large round numbers
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatInputNumber(value) {
  const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

function parseInputNumber(value) {
  return parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
}


/* =============================================
   3. LIVE INPUT FORMATTING (dollar fields)
   ============================================= */
function attachFormatter(inputEl) {
  inputEl.addEventListener('input', function () {
    const raw    = this.value.replace(/[^0-9]/g, '');
    if (raw === '') { this.value = ''; return; }
    const num    = parseInt(raw, 10);
    const formatted = isNaN(num) ? '' : new Intl.NumberFormat('en-CA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
    const selStart = this.selectionStart;
    const prevLen  = this.value.length;
    this.value     = formatted;
    const newLen   = this.value.length;
    this.setSelectionRange(
      Math.max(0, selStart + (newLen - prevLen)),
      Math.max(0, selStart + (newLen - prevLen))
    );
  });
}

attachFormatter(balanceEl);
attachFormatter(roomEl);
attachFormatter(contributionEl);
attachFormatter(annualLimitEl);


/* =============================================
   4. VALIDATION
   ============================================= */
function setError(inputEl, errorElId, message) {
  inputEl.classList.add('is-error');
  const el = document.getElementById(errorElId);
  if (el) { el.textContent = message; el.classList.add('is-visible'); }
}

function clearError(inputEl, errorElId) {
  inputEl.classList.remove('is-error');
  const el = document.getElementById(errorElId);
  if (el) { el.textContent = ''; el.classList.remove('is-visible'); }
}

function validateInputs() {
  let valid = true;

  // Balance — allow 0
  const balance = parseInputNumber(balanceEl.value);
  if (isNaN(balance) || balance < 0) {
    setError(balanceEl, 'current-balance-error', 'Please enter a valid balance (0 or more).');
    valid = false;
  } else {
    clearError(balanceEl, 'current-balance-error');
  }

  // Contribution room
  const room = parseInputNumber(roomEl.value);
  if (isNaN(room) || room < 0) {
    setError(roomEl, 'contrib-room-error', 'Please enter your available contribution room (0 or more).');
    valid = false;
  } else {
    clearError(roomEl, 'contrib-room-error');
  }

  // Contribution amount
  const contribution = parseInputNumber(contributionEl.value);
  if (isNaN(contribution) || contribution < 0) {
    setError(contributionEl, 'contribution-error', 'Please enter a valid contribution amount.');
    valid = false;
  } else {
    clearError(contributionEl, 'contribution-error');
  }

  // Annual return
  const annualReturn = parseFloat(returnEl.value);
  if (isNaN(annualReturn) || annualReturn < 0 || annualReturn > 30) {
    setError(returnEl, 'annual-return-error', 'Please enter an expected return between 0% and 30%.');
    valid = false;
  } else {
    clearError(returnEl, 'annual-return-error');
  }

  // Time horizon
  const horizon = parseInt(horizonEl.value);
  if (isNaN(horizon) || horizon < 1 || horizon > 60) {
    setError(horizonEl, 'time-horizon-error', 'Please enter a time horizon between 1 and 60 years.');
    valid = false;
  } else {
    clearError(horizonEl, 'time-horizon-error');
  }

  if (!valid) return { valid: false };

  return {
    valid: true,
    values: {
      balance,
      room,
      contribution,
      frequency: frequencyEl.value,
      annualReturn,
      horizon,
      annualLimit: parseInputNumber(annualLimitEl.value) || 7000,
      inflationRate: parseFloat(inflationEl.value) || 0
    }
  };
}


/* =============================================
   5. CORE TFSA MATH
   ============================================= */

/**
 * Convert a periodic contribution to an annual equivalent.
 * @param {number} amount - contribution amount
 * @param {string} frequency - 'yearly'|'monthly'|'biweekly'|'weekly'|'onetime'
 * @returns {number} annual contribution amount
 */
function toAnnualContribution(amount, frequency) {
  switch (frequency) {
    case 'monthly':   return amount * 12;
    case 'biweekly':  return amount * 26;
    case 'weekly':    return amount * 52;
    case 'onetime':   return amount; // only in year 1
    default:          return amount; // yearly
  }
}

/**
 * Project TFSA growth year by year.
 * Returns array of { year, contribution, growth, balance, roomUsed, roomRemaining }
 */
function projectTfsa(balance, room, contribution, frequency, annualReturn, horizon, annualLimit) {
  const annualContrib = toAnnualContribution(contribution, frequency);
  const rate          = annualReturn / 100;
  const currentYear   = new Date().getFullYear();

  let currentBalance      = balance;
  let currentRoom         = room;
  let totalContributions  = 0;
  const schedule          = [];

  // Milestones
  const milestones = { 100000: null, 250000: null, 500000: null };

  for (let y = 1; y <= horizon; y++) {
    // Add new annual room (except year 1 — room already includes current year)
    if (y > 1) {
      currentRoom += annualLimit;
    }

    // Contribution this year (one-time only applies to year 1)
    const yearContrib = (frequency === 'onetime' && y > 1) ? 0 : annualContrib;

    // Cap contribution at available room
    const actualContrib = Math.min(yearContrib, currentRoom);
    currentRoom        -= actualContrib;
    totalContributions += actualContrib;

    // Growth on (opening balance + contributions, simplified as mid-year)
    const growthBase = currentBalance + actualContrib * 0.5;
    const yearGrowth = growthBase * rate;

    currentBalance = currentBalance + actualContrib + yearGrowth;

    // Check milestones
    const calYear = currentYear + y;
    if (!milestones[100000]  && currentBalance >= 100000)  milestones[100000]  = calYear;
    if (!milestones[250000]  && currentBalance >= 250000)  milestones[250000]  = calYear;
    if (!milestones[500000]  && currentBalance >= 500000)  milestones[500000]  = calYear;

    schedule.push({
      year:           calYear,
      contribution:   actualContrib,
      growth:         yearGrowth,
      balance:        currentBalance,
      roomUsed:       actualContrib,
      roomRemaining:  currentRoom
    });
  }

  return {
    schedule,
    milestones,
    totalContributions,
    finalBalance: currentBalance,
    remainingRoom: schedule[schedule.length - 1]?.roomRemaining ?? 0
  };
}

/**
 * Adjust a future value for inflation.
 * PV = FV / (1 + r)^n
 */
function inflationAdjust(futureValue, inflationRate, years) {
  if (inflationRate <= 0) return futureValue;
  return futureValue / Math.pow(1 + inflationRate / 100, years);
}


/* =============================================
   6. OVER-CONTRIBUTION LIVE CHECK
   ============================================= */
function checkOverContrib() {
  const room         = parseInputNumber(roomEl.value);
  const contribution = parseInputNumber(contributionEl.value);
  const frequency    = frequencyEl.value;
  const annualContrib = toAnnualContribution(contribution, frequency);

  const isOver = room > 0 && contribution > 0 && annualContrib > room;
  overContribWarning.classList.toggle('is-visible', isOver);
}

roomEl.addEventListener('input', checkOverContrib);
contributionEl.addEventListener('input', checkOverContrib);
frequencyEl.addEventListener('change', checkOverContrib);


/* =============================================
   7. RENDER RESULTS
   ============================================= */
function renderResults(data, horizon, inflationRate) {
  const { schedule, milestones, totalContributions, finalBalance, remainingRoom } = data;
  const investmentGrowth = finalBalance - totalContributions - parseInputNumber(balanceEl.value);
  const inflationValue   = inflationAdjust(finalBalance, inflationRate, horizon);

  resultsPlaceholder.classList.add('hidden');
  resultsContent.classList.remove('hidden');

  resultFutureValue.textContent   = formatCAD(finalBalance);
  resultTotalContribs.textContent = formatCAD(totalContributions);
  resultGrowth.textContent        = formatCAD(Math.max(0, investmentGrowth));
  resultRemainingRoom.textContent = formatCAD(remainingRoom);
  resultInflation.textContent     = formatCAD(inflationValue);

  // Milestones
  renderMilestone(milestone100k, milestone100kYear, milestone100kLabel, milestones[100000], finalBalance >= 100000);
  renderMilestone(milestone250k, milestone250kYear, milestone250kLabel, milestones[250000], finalBalance >= 250000);
  renderMilestone(milestone500k, milestone500kYear, milestone500kLabel, milestones[500000], finalBalance >= 500000);

  // Growth table
  renderGrowthTable(schedule);

  if (window.innerWidth < 900) {
    resultsContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function renderMilestone(cardEl, yearEl, labelEl, year, reached) {
  if (year) {
    yearEl.textContent  = year;
    labelEl.textContent = reached ? 'achieved' : 'projected year';
    cardEl.classList.toggle('is-reached', reached);
  } else {
    yearEl.textContent  = 'N/A';
    labelEl.textContent = 'not within horizon';
    cardEl.classList.remove('is-reached');
  }
}


/* =============================================
   8. GROWTH TABLE
   ============================================= */
function renderGrowthTable(schedule) {
  growthTbody.innerHTML = '';

  schedule.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.year}</td>
      <td>${formatCAD(row.contribution)}</td>
      <td class="td-growth">${formatCAD(row.growth)}</td>
      <td>${formatCAD(row.balance)}</td>
      <td>${formatCAD(row.roomRemaining)}</td>
    `;
    growthTbody.appendChild(tr);
  });

  growthSection.removeAttribute('hidden');
}

growthToggle.addEventListener('click', function () {
  const isOpen = growthTableWrapper.classList.toggle('is-open');
  this.setAttribute('aria-expanded', isOpen.toString());
});


/* =============================================
   9. FORM SUBMIT
   ============================================= */
form.addEventListener('submit', function (e) {
  e.preventDefault();

  const { valid, values } = validateInputs();
  if (!valid) return;

  const { balance, room, contribution, frequency, annualReturn, horizon, annualLimit, inflationRate } = values;

  const data = projectTfsa(balance, room, contribution, frequency, annualReturn, horizon, annualLimit);
  renderResults(data, horizon, inflationRate);
});

form.querySelectorAll('input, select').forEach(el => {
  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); form.dispatchEvent(new Event('submit')); }
  });
});


/* =============================================
   10. INIT — format default values on load
   ============================================= */
(function init() {
  balanceEl.value     = formatInputNumber(0);
  roomEl.value        = formatInputNumber(95000);
  contributionEl.value = formatInputNumber(7000);
  annualLimitEl.value = formatInputNumber(7000);
  checkOverContrib();
})();

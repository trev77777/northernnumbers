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
const overContribWarning = document.getElementById('over-contrib-warning');

const resultsPlaceholder = document.getElementById('tfsa-results-placeholder');
const resultsContent     = document.getElementById('tfsa-results-content');
const resultFutureValue  = document.getElementById('result-future-value');
const resultTotalContribs = document.getElementById('result-total-contributions');
const resultGrowth       = document.getElementById('result-investment-growth');
const resultRemainingRoom = document.getElementById('result-remaining-room');
const resultInflation    = document.getElementById('result-inflation-adjusted');

const milestone100k      = document.getElementById('milestone-100k');
const milestone250k      = document.getElementById('milestone-250k');
const milestone500k      = document.getElementById('milestone-500k');
const milestone100kYear  = document.getElementById('milestone-100k-year');
const milestone250kYear  = document.getElementById('milestone-250k-year');
const milestone500kYear  = document.getElementById('milestone-500k-year');
const milestone100kText  = document.getElementById('milestone-100k-text');
const milestone250kText  = document.getElementById('milestone-250k-text');
const milestone500kText  = document.getElementById('milestone-500k-text');

const growthSection      = document.getElementById('growth-section');
const growthToggle       = document.getElementById('growth-toggle');
const growthTableWrapper = document.getElementById('growth-table-wrapper');
const growthTbody        = document.getElementById('growth-tbody');


/* =============================================
   2. FORMATTING UTILITIES
   ============================================= */
function formatCAD(amount) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD',
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(amount);
}

function formatInputNumber(value) {
  const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(num);
}

function parseInputNumber(value) {
  return parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
}


/* =============================================
   3. LIVE INPUT FORMATTING
   ============================================= */
function attachFormatter(inputEl) {
  inputEl.addEventListener('input', function () {
    const raw = this.value.replace(/[^0-9]/g, '');
    if (raw === '') { this.value = ''; return; }
    const num = parseInt(raw, 10);
    const formatted = isNaN(num) ? '' : new Intl.NumberFormat('en-CA', {
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(num);
    const sel = this.selectionStart;
    const prev = this.value.length;
    this.value = formatted;
    const newPos = Math.max(0, sel + (this.value.length - prev));
    this.setSelectionRange(newPos, newPos);
  });
}

attachFormatter(balanceEl);
attachFormatter(roomEl);
attachFormatter(contributionEl);
attachFormatter(annualLimitEl);


/* =============================================
   4. ADVANCED SETTINGS TOGGLE
   ============================================= */
const advancedToggle = document.getElementById('advanced-toggle');
const advancedFields = document.getElementById('advanced-fields');

advancedToggle.addEventListener('click', function () {
  const isOpen = advancedFields.classList.toggle('is-open');
  this.setAttribute('aria-expanded', isOpen.toString());
});


/* =============================================
   5. PRESETS
   ============================================= */
const PRESETS = {
  beginner: {
    balance: 0,
    room: 95000,
    contribution: 100,
    frequency: 'monthly',
    annualReturn: 4,
    horizon: 20,
    label: '🌱 Beginner Investor',
    desc: 'Just getting started — $100/month, conservative 4% return'
  },
  average: {
    balance: 15000,
    room: 50000,
    contribution: 7000,
    frequency: 'yearly',
    annualReturn: 6,
    horizon: 20,
    label: '🍁 Average Canadian',
    desc: 'Maxing out TFSA yearly with a balanced 6% return'
  },
  growth: {
    balance: 50000,
    room: 45000,
    contribution: 7000,
    frequency: 'yearly',
    annualReturn: 8,
    horizon: 25,
    label: '📈 Growth Investor',
    desc: 'Existing TFSA, maxing out yearly, aggressive 8% return'
  }
};

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const preset = PRESETS[this.dataset.preset];
    if (!preset) return;

    balanceEl.value      = formatInputNumber(preset.balance);
    roomEl.value         = formatInputNumber(preset.room);
    contributionEl.value = formatInputNumber(preset.contribution);
    frequencyEl.value    = preset.frequency;
    returnEl.value       = preset.annualReturn;
    horizonEl.value      = preset.horizon;

    // Mark active
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
    this.classList.add('is-active');

    checkOverContrib();

    // Auto-calculate on preset select
    form.dispatchEvent(new Event('submit'));
  });
});


/* =============================================
   6. VALIDATION
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

  const balance = parseInputNumber(balanceEl.value);
  if (isNaN(balance) || balance < 0) {
    setError(balanceEl, 'current-balance-error', 'Please enter a valid balance (0 or more).');
    valid = false;
  } else { clearError(balanceEl, 'current-balance-error'); }

  const room = parseInputNumber(roomEl.value);
  if (isNaN(room) || room < 0) {
    setError(roomEl, 'contrib-room-error', 'Please enter your available contribution room (0 or more).');
    valid = false;
  } else { clearError(roomEl, 'contrib-room-error'); }

  const contribution = parseInputNumber(contributionEl.value);
  if (isNaN(contribution) || contribution < 0) {
    setError(contributionEl, 'contribution-error', 'Please enter a valid contribution amount.');
    valid = false;
  } else { clearError(contributionEl, 'contribution-error'); }

  const annualReturn = parseFloat(returnEl.value);
  if (isNaN(annualReturn) || annualReturn < 0 || annualReturn > 30) {
    setError(returnEl, 'annual-return-error', 'Please enter a return between 0% and 30%.');
    valid = false;
  } else { clearError(returnEl, 'annual-return-error'); }

  const horizon = parseInt(horizonEl.value);
  if (isNaN(horizon) || horizon < 1 || horizon > 60) {
    setError(horizonEl, 'time-horizon-error', 'Please enter a time horizon between 1 and 60 years.');
    valid = false;
  } else { clearError(horizonEl, 'time-horizon-error'); }

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
   7. CORE TFSA MATH
   ============================================= */
function toAnnualContribution(amount, frequency) {
  switch (frequency) {
    case 'monthly':  return amount * 12;
    case 'biweekly': return amount * 26;
    case 'weekly':   return amount * 52;
    case 'onetime':  return amount;
    default:         return amount; // yearly
  }
}

function projectTfsa(balance, room, contribution, frequency, annualReturn, horizon, annualLimit) {
  const annualContrib = toAnnualContribution(contribution, frequency);
  const rate          = annualReturn / 100;
  const currentYear   = new Date().getFullYear();

  let currentBalance     = balance;
  let currentRoom        = room;
  let totalContributions = 0;
  const schedule         = [];
  const milestones       = { 100000: null, 250000: null, 500000: null };

  for (let y = 1; y <= horizon; y++) {
    if (y > 1) currentRoom += annualLimit;

    const yearContrib  = (frequency === 'onetime' && y > 1) ? 0 : annualContrib;
    const actualContrib = Math.min(yearContrib, currentRoom);
    currentRoom        -= actualContrib;
    totalContributions += actualContrib;

    const growthBase = currentBalance + actualContrib * 0.5;
    const yearGrowth = growthBase * rate;
    currentBalance   = currentBalance + actualContrib + yearGrowth;

    const calYear = currentYear + y;
    if (!milestones[100000]  && currentBalance >= 100000)  milestones[100000]  = calYear;
    if (!milestones[250000]  && currentBalance >= 250000)  milestones[250000]  = calYear;
    if (!milestones[500000]  && currentBalance >= 500000)  milestones[500000]  = calYear;

    schedule.push({
      year: calYear,
      contribution: actualContrib,
      growth: yearGrowth,
      balance: currentBalance,
      roomRemaining: currentRoom
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

function inflationAdjust(futureValue, inflationRate, years) {
  if (inflationRate <= 0) return futureValue;
  return futureValue / Math.pow(1 + inflationRate / 100, years);
}


/* =============================================
   8. OVER-CONTRIBUTION LIVE CHECK
   ============================================= */
function checkOverContrib() {
  const room          = parseInputNumber(roomEl.value);
  const contribution  = parseInputNumber(contributionEl.value);
  const annualContrib = toAnnualContribution(contribution, frequencyEl.value);
  const isOver        = room > 0 && contribution > 0 && annualContrib > room;
  overContribWarning.classList.toggle('is-visible', isOver);
}

roomEl.addEventListener('input', checkOverContrib);
contributionEl.addEventListener('input', checkOverContrib);
frequencyEl.addEventListener('change', checkOverContrib);


/* =============================================
   9. RENDER RESULTS
   ============================================= */
function renderMilestone(cardEl, yearEl, textEl, amount, year, reached) {
  const label   = amount >= 1000000
    ? '$' + (amount / 1000000) + 'M'
    : '$' + (amount / 1000) + ',000';

  if (year) {
    yearEl.textContent = year;
    textEl.innerHTML   = `You could reach <strong>${label}</strong> in`;
    cardEl.classList.toggle('is-reached', reached);
  } else {
    yearEl.textContent = 'N/A';
    textEl.innerHTML   = `<strong>${label}</strong> — not within your time horizon`;
    cardEl.classList.remove('is-reached');
  }
}

function renderResults(data, horizon, inflationRate) {
  const { schedule, milestones, totalContributions, finalBalance, remainingRoom } = data;
  const startingBalance  = parseInputNumber(balanceEl.value);
  const investmentGrowth = finalBalance - totalContributions - startingBalance;
  const inflationValue   = inflationAdjust(finalBalance, inflationRate, horizon);

  resultsPlaceholder.classList.add('hidden');
  resultsContent.classList.remove('hidden');

  resultFutureValue.textContent   = formatCAD(finalBalance);
  resultTotalContribs.textContent = formatCAD(totalContributions);
  resultGrowth.textContent        = formatCAD(Math.max(0, investmentGrowth));
  resultRemainingRoom.textContent = formatCAD(remainingRoom);
  resultInflation.textContent     = formatCAD(inflationValue);

  renderMilestone(milestone100k, milestone100kYear, milestone100kText, 100000,  milestones[100000],  finalBalance >= 100000);
  renderMilestone(milestone250k, milestone250kYear, milestone250kText, 250000,  milestones[250000],  finalBalance >= 250000);
  renderMilestone(milestone500k, milestone500kYear, milestone500kText, 500000,  milestones[500000],  finalBalance >= 500000);

  renderGrowthTable(schedule);

  if (window.innerWidth < 900) {
    resultsContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}


/* =============================================
   10. GROWTH TABLE
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
   11. FORM SUBMIT
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
   12. INIT
   ============================================= */
(function init() {
  balanceEl.value      = formatInputNumber(0);
  roomEl.value         = formatInputNumber(95000);
  contributionEl.value = formatInputNumber(7000);
  annualLimitEl.value  = formatInputNumber(7000);
  checkOverContrib();
})();

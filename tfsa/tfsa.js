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

const resultsPlaceholder  = document.getElementById('tfsa-results-placeholder');
const resultsContent      = document.getElementById('tfsa-results-content');
const resultFutureValue   = document.getElementById('result-future-value');
const resultTotalContribs = document.getElementById('result-total-contributions');
const resultGrowth        = document.getElementById('result-investment-growth');
const resultRemainingRoom = document.getElementById('result-remaining-room');
const resultInflation     = document.getElementById('result-inflation-adjusted');
const resultSummaryBox    = document.getElementById('result-summary-box');

const milestone100k     = document.getElementById('milestone-100k');
const milestone250k     = document.getElementById('milestone-250k');
const milestone500k     = document.getElementById('milestone-500k');
const milestone100kYear = document.getElementById('milestone-100k-year');
const milestone250kYear = document.getElementById('milestone-250k-year');
const milestone500kYear = document.getElementById('milestone-500k-year');
const milestone100kText = document.getElementById('milestone-100k-text');
const milestone250kText = document.getElementById('milestone-250k-text');
const milestone500kText = document.getElementById('milestone-500k-text');

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

function friendlyFrequency(freq) {
  const map = {
    yearly: 'year', monthly: 'month', biweekly: 'two weeks',
    weekly: 'week', onetime: 'one time'
  };
  return map[freq] || freq;
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
    const sel  = this.selectionStart;
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
   — Sets all fields then calls calculate() directly
     (avoids timing issues with form.dispatchEvent)
   ============================================= */
const PRESETS = {
  beginner: {
    balance: 0, room: 95000, contribution: 100,
    frequency: 'monthly', annualReturn: 4, horizon: 20
  },
  average: {
    balance: 15000, room: 50000, contribution: 7000,
    frequency: 'yearly', annualReturn: 6, horizon: 20
  },
  growth: {
    balance: 50000, room: 45000, contribution: 7000,
    frequency: 'yearly', annualReturn: 8, horizon: 25
  }
};

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const key    = this.dataset.preset;
    const preset = PRESETS[key];
    if (!preset) return;

    // Set all field values
    balanceEl.value       = formatInputNumber(preset.balance);
    roomEl.value          = formatInputNumber(preset.room);
    contributionEl.value  = formatInputNumber(preset.contribution);
    returnEl.value        = preset.annualReturn;
    horizonEl.value       = preset.horizon;

    // Force frequency dropdown to update and trigger change listeners
    frequencyEl.value = preset.frequency;
    frequencyEl.dispatchEvent(new Event('change'));

    // Mark active preset button
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
    this.classList.add('is-active');

    // Update over-contribution warning with new values
    checkOverContrib();

    // Calculate directly — no event dispatch needed
    calculate();
  });
});


/* =============================================
   6. VALIDATION
   ============================================= */
function setError(inputEl, errorElId, msg) {
  inputEl.classList.add('is-error');
  const el = document.getElementById(errorElId);
  if (el) { el.textContent = msg; el.classList.add('is-visible'); }
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
      balance, room, contribution,
      frequency:     frequencyEl.value,
      annualReturn,
      horizon,
      annualLimit:   parseInputNumber(annualLimitEl.value) || 7000,
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

/**
 * Project TFSA growth year by year.
 * FIX: milestone check now happens AFTER updating balance,
 * and runs against every year's ending balance — not just the final year.
 */
function projectTfsa(balance, room, contribution, frequency, annualReturn, horizon, annualLimit) {
  const annualContrib = toAnnualContribution(contribution, frequency);
  const rate          = annualReturn / 100;
  const currentYear   = new Date().getFullYear();

  let currentBalance     = balance;
  let currentRoom        = room;
  let totalContributions = 0;
  const schedule         = [];

  // Milestones — null until hit
  const milestones = { 100000: null, 250000: null, 500000: null };

  for (let y = 1; y <= horizon; y++) {
    // New room added at start of each year after year 1
    if (y > 1) currentRoom += annualLimit;

    // One-time contributions only apply in year 1
    const yearContrib   = (frequency === 'onetime' && y > 1) ? 0 : annualContrib;
    const actualContrib = Math.min(yearContrib, currentRoom);
    currentRoom        -= actualContrib;
    totalContributions += actualContrib;

    // Growth calculated on opening balance + half the year's contribution (mid-year approximation)
    const growthBase = currentBalance + actualContrib * 0.5;
    const yearGrowth = growthBase * rate;

    // Update balance FIRST, then check milestones
    currentBalance = currentBalance + actualContrib + yearGrowth;

    const calYear = currentYear + y;

    // Check milestones against this year's ending balance
    if (!milestones[100000] && currentBalance >= 100000)  milestones[100000] = calYear;
    if (!milestones[250000] && currentBalance >= 250000)  milestones[250000] = calYear;
    if (!milestones[500000] && currentBalance >= 500000)  milestones[500000] = calYear;

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
    finalBalance:  currentBalance,
    remainingRoom: schedule[schedule.length - 1]?.roomRemaining ?? 0
  };
}

function inflationAdjust(futureValue, inflationRate, years) {
  if (inflationRate <= 0) return futureValue;
  return futureValue / Math.pow(1 + inflationRate / 100, years);
}


/* =============================================
   8. OVER-CONTRIBUTION LIVE CHECK
   Only warns if the FIRST YEAR contribution
   exceeds current available room. After year 1,
   new room opens up each January so recurring
   contributions are not flagged.
   ============================================= */
function checkOverContrib() {
  const room         = parseInputNumber(roomEl.value);
  const contribution = parseInputNumber(contributionEl.value);
  const frequency    = frequencyEl.value;

  // Don't warn if either field is empty / zero
  if (!room || !contribution) {
    overContribWarning.classList.remove('is-visible');
    return;
  }

  // One-time: just compare directly
  if (frequency === 'onetime') {
    overContribWarning.classList.toggle('is-visible', contribution > room);
    return;
  }

  // For recurring: only warn if the ANNUAL total in year 1 exceeds current room.
  // We don't warn for future years because new room accumulates every January.
  const annualContrib = toAnnualContribution(contribution, frequency);
  const isOver = annualContrib > room;
  overContribWarning.classList.toggle('is-visible', isOver);
}

roomEl.addEventListener('input', checkOverContrib);
contributionEl.addEventListener('input', checkOverContrib);
frequencyEl.addEventListener('change', checkOverContrib);


/* =============================================
   9. RENDER — Input summary box
   Shows a plain-English summary of what the user entered
   before the big result number.
   ============================================= */
function renderSummaryBox(contribution, frequency, horizon, annualReturn) {
  if (!resultSummaryBox) return;

  // Plain English frequency labels (cleaner than dropdown labels)
  const freqLabel = {
    yearly:  'annually',
    monthly: 'monthly',
    biweekly: 'bi-weekly',
    weekly:  'weekly',
    onetime: 'one-time'
  }[frequency] || 'annually';

  // Format contribution with frequency naturally
  const contribText = frequency === 'onetime'
    ? `${formatCAD(contribution)} one-time contribution`
    : `${formatCAD(contribution)} / ${freqLabel}`;

  resultSummaryBox.innerHTML = `
    <p style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);
      text-transform:uppercase;letter-spacing:0.05em;margin-bottom:var(--space-3);">
      Your projection is based on
    </p>
    <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);">
      <span class="summary-tag">💰 ${contribText}</span>
      <span class="summary-tag">📅 ${horizon} years</span>
      <span class="summary-tag">📈 ${annualReturn}% annual return</span>
    </div>
  `;
  resultSummaryBox.classList.remove('hidden');
}


/* =============================================
   10. RENDER MILESTONES
   FIX: milestones now correctly show year for any
   milestone crossed during the projection period.
   ============================================= */
function renderMilestone(cardEl, yearEl, textEl, amount, year, finalBalance) {
  const label = '$' + amount.toLocaleString('en-CA');
  const reached = finalBalance >= amount;

  if (year) {
    // Milestone was hit during the projection
    yearEl.textContent = year;
    textEl.innerHTML   = `You could reach <strong>${label}</strong> in`;
    cardEl.classList.toggle('is-reached', reached);
  } else {
    // Not hit within the time horizon
    yearEl.textContent = 'N/A';
    textEl.innerHTML   = `<strong>${label}</strong> — beyond your time horizon`;
    cardEl.classList.remove('is-reached');
  }
}


/* =============================================
   11. CELEBRATION MESSAGE
   Shows a contextual congratulations line
   based on the final projected balance.
   ============================================= */
function renderCelebration(finalBalance) {
  const celebEl = document.getElementById('result-celebration');
  if (!celebEl) return;

  let msg = '';
  if (finalBalance >= 1000000) {
    msg = '🎉 Congratulations! Your TFSA could grow to over <strong>one million dollars</strong> — completely tax-free.';
  } else if (finalBalance >= 500000) {
    msg = '🎉 Congratulations! Your TFSA could grow to over <strong>half a million dollars</strong>. That\'s a powerful tax-free nest egg.';
  } else if (finalBalance >= 250000) {
    msg = '🎉 Great progress! Your TFSA could grow to over <strong>$250,000</strong> — all tax-free growth.';
  } else if (finalBalance >= 100000) {
    msg = '✅ Your TFSA could reach over <strong>$100,000</strong>. Staying consistent will get you there.';
  }

  if (msg) {
    celebEl.innerHTML = msg;
    celebEl.classList.remove('hidden');
  } else {
    celebEl.classList.add('hidden');
  }
}


/* =============================================
   12. RENDER RESULTS
   ============================================= */
function renderResults(data, values) {
  const { schedule, milestones, totalContributions, finalBalance, remainingRoom } = data;
  const { horizon, inflationRate, contribution, frequency, annualReturn } = values;
  const startingBalance  = parseInputNumber(balanceEl.value);
  const investmentGrowth = finalBalance - totalContributions - startingBalance;
  const inflationValue   = inflationAdjust(finalBalance, inflationRate, horizon);

  resultsPlaceholder.classList.add('hidden');
  resultsContent.classList.remove('hidden');

  // Summary box
  renderSummaryBox(contribution, frequency, horizon, annualReturn);

  // Main numbers
  resultFutureValue.textContent    = formatCAD(finalBalance);
  resultTotalContribs.textContent  = formatCAD(totalContributions);
  resultGrowth.textContent         = formatCAD(Math.max(0, investmentGrowth));
  resultRemainingRoom.textContent  = formatCAD(remainingRoom);
  resultInflation.textContent      = formatCAD(inflationValue);

  // Celebration message based on final balance
  renderCelebration(finalBalance);

  // Milestones — pass finalBalance so reached state is correct
  renderMilestone(milestone100k, milestone100kYear, milestone100kText, 100000, milestones[100000], finalBalance);
  renderMilestone(milestone250k, milestone250kYear, milestone250kText, 250000, milestones[250000], finalBalance);
  renderMilestone(milestone500k, milestone500kYear, milestone500kText, 500000, milestones[500000], finalBalance);

  // Growth table
  renderGrowthTable(schedule);

  // Scroll to results on mobile
  if (window.innerWidth < 900) {
    resultsContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}


/* =============================================
   12. GROWTH TABLE
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
   13. CALCULATE — central function called by
   both form submit and preset buttons
   ============================================= */
function calculate() {
  const result = validateInputs();
  if (!result.valid) return;
  const { values } = result;
  const data = projectTfsa(
    values.balance, values.room, values.contribution,
    values.frequency, values.annualReturn, values.horizon, values.annualLimit
  );
  renderResults(data, values);
}


/* =============================================
   14. FORM EVENTS
   ============================================= */
form.addEventListener('submit', function (e) {
  e.preventDefault();
  calculate();
});

// Reset button
const resetBtn = document.getElementById('tfsa-reset-btn');
if (resetBtn) {
  resetBtn.addEventListener('click', function () {
    balanceEl.value      = formatInputNumber(0);
    roomEl.value         = formatInputNumber(95000);
    contributionEl.value = formatInputNumber(7000);
    frequencyEl.value    = 'yearly';
    returnEl.value       = '6';
    horizonEl.value      = '20';
    annualLimitEl.value  = formatInputNumber(7000);
    inflationEl.value    = '2.1';

    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));

    resultsPlaceholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    growthSection.setAttribute('hidden', '');
    overContribWarning.classList.remove('is-visible');
    if (resultSummaryBox) resultSummaryBox.classList.add('hidden');
  });
}

form.querySelectorAll('input, select').forEach(el => {
  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); calculate(); }
  });
});


/* =============================================
   15. INIT
   ============================================= */
(function init() {
  balanceEl.value      = formatInputNumber(0);
  roomEl.value         = formatInputNumber(95000);
  contributionEl.value = formatInputNumber(7000);
  annualLimitEl.value  = formatInputNumber(7000);
  // Don't trigger over-contrib warning on page load
  // — wait for user interaction
})();

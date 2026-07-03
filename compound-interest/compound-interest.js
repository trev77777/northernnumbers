/* =============================================
   NORTHERN NUMBERS — compound-interest.js
   Canadian Compound Interest Calculator

   Formula: FV = PV(1 + r/n)^(nt) + PMT × [((1+r/n)^(nt) - 1) / (r/n)]
   Where:
     PV  = initial investment
     r   = annual rate (decimal)
     n   = compounding periods per year
     t   = years
     PMT = periodic contribution (converted to match compounding periods)
   ============================================= */

'use strict';

const CURRENT_YEAR = new Date().getFullYear();

/* =============================================
   1. DOM REFERENCES
   ============================================= */
const form            = document.getElementById('ci-form');
const initialEl       = document.getElementById('initial-investment');
const contribEl       = document.getElementById('regular-contribution');
const contribFreqEl   = document.getElementById('contrib-frequency');
const rateEl          = document.getElementById('annual-rate');
const compoundFreqEl  = document.getElementById('compound-frequency');
const yearsEl         = document.getElementById('investment-years');
const inflationEl     = document.getElementById('inflation-rate');
const targetGoalEl    = document.getElementById('target-goal');
const contribSlider   = document.getElementById('contrib-slider');
const rateSlider      = document.getElementById('rate-slider');
const yearsSlider     = document.getElementById('years-slider');

const bInitialEl      = document.getElementById('b-initial');
const bContribEl      = document.getElementById('b-contribution');
const bRateEl         = document.getElementById('b-rate');
const bYearsEl        = document.getElementById('b-years');

const placeholder     = document.getElementById('ci-results-placeholder');
const resultsContent  = document.getElementById('ci-results-content');
const summaryBox      = document.getElementById('result-summary-box');
const celebrationEl   = document.getElementById('result-celebration');

const resultFV        = document.getElementById('result-future-value');
const resultContribs  = document.getElementById('result-total-contributions');
const resultInterest  = document.getElementById('result-total-interest');
const resultGrowthPct = document.getElementById('result-growth-pct');
const resultInflAdj   = document.getElementById('result-inflation-adj');
const resultAvgAnnual = document.getElementById('result-avg-annual');
const resultAvgMonthly= document.getElementById('result-avg-monthly');
const barContrib      = document.getElementById('bar-contrib');
const barInterest     = document.getElementById('bar-interest');
const contribPctEl    = document.getElementById('contrib-pct');
const interestPctEl   = document.getElementById('interest-pct');
const rule72Value     = document.getElementById('rule72-value');
const rule72Text      = document.getElementById('rule72-text');
const income3El       = document.getElementById('income-3pct');
const income4El       = document.getElementById('income-4pct');
const income5El       = document.getElementById('income-5pct');
const insightText     = document.getElementById('insight-text');
const goalCard        = document.getElementById('goal-card');
const goalTarget      = document.getElementById('goal-target');
const goalProjected   = document.getElementById('goal-projected');
const goalYears       = document.getElementById('goal-years');
const goalExtra       = document.getElementById('goal-extra');
const compareCard     = document.getElementById('compare-results-card');

const chartSection    = document.getElementById('chart-section');
const chartToggle     = document.getElementById('chart-toggle');
const chartWrapper    = document.getElementById('chart-wrapper');
const chartCanvas     = document.getElementById('growth-chart');
const growthSection   = document.getElementById('growth-section');
const growthToggle    = document.getElementById('growth-toggle');
const growthWrapper   = document.getElementById('growth-table-wrapper');
const growthTbody     = document.getElementById('growth-tbody');

let compareMode = false;


/* =============================================
   2. FORMATTING
   ============================================= */
function formatCAD(n) {
  return new Intl.NumberFormat('en-CA', { style:'currency', currency:'CAD', minimumFractionDigits:2, maximumFractionDigits:2 }).format(n);
}
function formatCAD0(n) {
  return new Intl.NumberFormat('en-CA', { style:'currency', currency:'CAD', minimumFractionDigits:0, maximumFractionDigits:0 }).format(n);
}
function formatInputNumber(v) {
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? '' : new Intl.NumberFormat('en-CA', { minimumFractionDigits:0, maximumFractionDigits:0 }).format(n);
}
function parseInputNumber(v) {
  return parseFloat(String(v).replace(/[^0-9.]/g, '')) || 0;
}


/* =============================================
   3. LIVE INPUT FORMATTERS
   ============================================= */
function attachFormatter(el) {
  if (!el) return;
  function fmt() {
    const raw = this.value.replace(/[^0-9]/g, '');
    if (!raw) { this.value = ''; return; }
    const num = parseInt(raw, 10);
    const formatted = isNaN(num) ? '' : new Intl.NumberFormat('en-CA', { minimumFractionDigits:0, maximumFractionDigits:0 }).format(num);
    const sel = this.selectionStart, prev = this.value.length;
    this.value = formatted;
    try { this.setSelectionRange(Math.max(0, sel + (this.value.length - prev)), Math.max(0, sel + (this.value.length - prev))); } catch(e) {}
  }
  el.addEventListener('input', fmt);
  el.addEventListener('change', fmt);
}
[initialEl, contribEl, targetGoalEl, bInitialEl, bContribEl].forEach(attachFormatter);


/* =============================================
   4. SLIDERS ↔ INPUTS (two-way sync)
   ============================================= */
function syncSlider(inputEl, sliderEl, isLive) {
  if (!sliderEl) return;
  sliderEl.addEventListener('input', function () {
    const val = parseFloat(this.value);
    if (inputEl === contribEl) {
      inputEl.value = formatInputNumber(val);
    } else {
      inputEl.value = val;
    }
    if (isLive && !resultsContent.classList.contains('hidden')) calculate();
  });
  inputEl.addEventListener('input', function () {
    const val = inputEl === contribEl ? parseInputNumber(this.value) : parseFloat(this.value);
    if (!isNaN(val)) sliderEl.value = val;
  });
}
syncSlider(contribEl, contribSlider, true);
syncSlider(rateEl,    rateSlider,    true);
syncSlider(yearsEl,   yearsSlider,   true);


/* =============================================
   5. COMPARE MODE TOGGLE
   ============================================= */
const compareToggle  = document.getElementById('compare-toggle');
const compareSection = document.getElementById('compare-section');

function setCompareMode(active) {
  compareMode = active;
  compareToggle.classList.toggle('is-active', active);
  compareToggle.setAttribute('aria-pressed', String(active));
  compareSection.classList.toggle('is-open', active);
  compareCard.classList.toggle('hidden', !active);
}
compareToggle.addEventListener('click', () => setCompareMode(!compareMode));
compareToggle.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCompareMode(!compareMode); } });


/* =============================================
   6. ADVANCED TOGGLE
   ============================================= */
const advancedToggle = document.getElementById('advanced-toggle');
const advancedFields = document.getElementById('advanced-fields');
advancedToggle.addEventListener('click', function () {
  const isOpen = advancedFields.classList.toggle('is-open');
  this.setAttribute('aria-expanded', String(isOpen));
});


/* =============================================
   7. PRESETS
   ============================================= */
const PRESETS = {
  starter:    { initial: 1000,  contrib: 100,  freq: 'monthly',  rate: 4,   n: 12, years: 20, goal: 50000  },
  young:      { initial: 5000,  contrib: 300,  freq: 'monthly',  rate: 7,   n: 12, years: 30, goal: 250000 },
  retirement: { initial: 50000, contrib: 500,  freq: 'monthly',  rate: 6,   n: 12, years: 20, goal: 500000 },
  aggressive: { initial: 10000, contrib: 1000, freq: 'monthly',  rate: 9,   n: 12, years: 25, goal: 1000000},
  passive:    { initial: 10000, contrib: 500,  freq: 'monthly',  rate: 7,   n: 12, years: 25, goal: 500000 }
};

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const p = PRESETS[this.dataset.preset];
    if (!p) return;

    initialEl.value      = formatInputNumber(p.initial);
    contribEl.value      = formatInputNumber(p.contrib);
    contribFreqEl.value  = p.freq;
    rateEl.value         = p.rate;
    compoundFreqEl.value = p.n;
    yearsEl.value        = p.years;
    targetGoalEl.value   = formatInputNumber(p.goal);

    if (contribSlider) contribSlider.value = Math.min(p.contrib, 2000);
    if (rateSlider)    rateSlider.value    = p.rate;
    if (yearsSlider)   yearsSlider.value   = p.years;

    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
    this.classList.add('is-active');
    calculate();
  });
});


/* =============================================
   8. COMPOUND INTEREST MATH
   ============================================= */
function toAnnualContribution(amount, frequency) {
  switch (frequency) {
    case 'monthly':   return amount * 12;
    case 'biweekly':  return amount * 26;
    case 'weekly':    return amount * 52;
    case 'yearly':    return amount;
    default:          return amount * 12;
  }
}

/**
 * Project investment year by year.
 * Uses end-of-period contributions for accuracy.
 */
function projectInvestment(initial, annualContrib, rate, compoundN, years, inflationRate) {
  const r         = rate / 100;
  const rPerPeriod = r / compoundN;
  const currentYear = CURRENT_YEAR;

  let balance          = initial;
  let totalContributed = initial;
  const schedule       = [];
  const milestones     = { 25000: null, 50000: null, 100000: null, 250000: null, 500000: null, 1000000: null };

  // Contribution per compounding period
  const contribPerPeriod = annualContrib / compoundN;

  for (let y = 1; y <= years; y++) {
    const yearStart    = balance;
    const yearContrib  = annualContrib;
    let   yearBalance  = balance;

    // Apply compounding periods within the year
    for (let p = 0; p < compoundN; p++) {
      yearBalance = yearBalance * (1 + rPerPeriod) + contribPerPeriod;
    }

    const yearInterest  = yearBalance - yearStart - yearContrib;
    totalContributed   += yearContrib;
    balance             = yearBalance;

    const calYear = currentYear + y;
    const inflAdj = balance / Math.pow(1 + inflationRate / 100, y);

    Object.keys(milestones).forEach(m => {
      if (!milestones[m] && balance >= Number(m)) milestones[m] = calYear;
    });

    schedule.push({
      year: calYear,
      yearContrib,
      yearInterest: Math.max(0, yearInterest),
      balance,
      inflAdj
    });
  }

  return {
    schedule,
    milestones,
    finalBalance: balance,
    totalContributed,
    totalInterest: balance - totalContributed
  };
}

function inflationAdjust(fv, rate, years) {
  if (!rate) return fv;
  return fv / Math.pow(1 + rate / 100, years);
}

/**
 * Binary search: find extra monthly contribution needed to reach goal
 * within the given number of years.
 */
function findExtraContrib(initial, annualContrib, rate, n, years, goal) {
  let lo = 0, hi = 100000;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const { finalBalance } = projectInvestment(initial, annualContrib + mid * 12, rate, n, years, 0);
    if (finalBalance >= goal) hi = mid;
    else lo = mid;
  }
  return hi < 100000 ? hi : null;
}

/**
 * Binary search: find the year when balance exceeds goal.
 */
function yearsToGoal(initial, annualContrib, rate, n, goal, maxYears = 60) {
  for (let y = 1; y <= maxYears; y++) {
    const { finalBalance } = projectInvestment(initial, annualContrib, rate, n, y, 0);
    if (finalBalance >= goal) return y;
  }
  return null;
}


/* =============================================
   9. RENDER MILESTONE
   ============================================= */
function renderMilestone(id, yearId, subId, year, finalBalance, threshold) {
  const card   = document.getElementById(id);
  const yearEl = document.getElementById(yearId);
  const subEl  = document.getElementById(subId);
  if (!card || !yearEl) return;

  const reached   = finalBalance >= threshold;
  const yearsAway = year ? year - CURRENT_YEAR : null;

  if (year) {
    yearEl.textContent = year;
    if (subEl) subEl.textContent = reached ? 'Already reached ✓' : `${yearsAway} year${yearsAway === 1 ? '' : 's'} from now`;
    card.classList.toggle('is-reached', reached);
  } else {
    yearEl.textContent = 'N/A';
    if (subEl) subEl.textContent = 'beyond your timeline';
    card.classList.remove('is-reached');
  }
}


/* =============================================
   10. CANVAS CHART
   ============================================= */
function drawChart(schedule) {
  if (!chartCanvas) return;
  const ctx  = chartCanvas.getContext('2d');
  const dpr  = window.devicePixelRatio || 1;
  const W    = chartCanvas.offsetWidth;
  const H    = 280;
  chartCanvas.width  = W * dpr;
  chartCanvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const step   = Math.ceil(schedule.length / 30);
  const data   = schedule.filter((_, i) => i % step === 0 || i === schedule.length - 1);
  const maxVal = Math.max(...data.map(d => d.balance)) * 1.05;

  const padL = 65, padR = 16, padT = 20, padB = 40;
  const cW   = W - padL - padR;
  const cH   = H - padT - padB;

  ctx.clearRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth   = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (cH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
    const val = maxVal * (1 - i / 4);
    ctx.fillStyle    = '#9CA3AF';
    ctx.font         = '10px Inter, sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(val >= 1000000 ? `$${(val/1000000).toFixed(1)}M` : val >= 1000 ? `$${Math.round(val/1000)}k` : `$${Math.round(val)}`, padL - 6, y);
  }

  const xOf = (i) => padL + (i / (data.length - 1)) * cW;
  const yOf = (v) => padT + cH - (v / maxVal) * cH;

  // Contributions area fill
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = xOf(i), y = yOf(d.totalContributed ?? d.balance);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(xOf(data.length - 1), padT + cH);
  ctx.lineTo(xOf(0), padT + cH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(156,163,175,0.2)';
  ctx.fill();

  // Contributions line
  ctx.beginPath();
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth   = 2;
  ctx.setLineDash([5, 4]);
  data.forEach((d, i) => {
    const x = xOf(i), y = yOf(d.totalContributed ?? d.balance);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // Balance area fill
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = xOf(i), y = yOf(d.balance);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(xOf(data.length - 1), padT + cH);
  ctx.lineTo(xOf(0), padT + cH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(59,130,246,0.1)';
  ctx.fill();

  // Balance line
  ctx.beginPath();
  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth   = 2.5;
  data.forEach((d, i) => {
    const x = xOf(i), y = yOf(d.balance);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // X-axis labels
  ctx.fillStyle    = '#9CA3AF';
  ctx.font         = '10px Inter, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  data.forEach((d, i) => {
    if (i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) {
      ctx.fillText(d.year, xOf(i), padT + cH + 6);
    }
  });
}

chartToggle.addEventListener('click', function () {
  const isOpen = chartWrapper.classList.toggle('is-open');
  this.setAttribute('aria-expanded', String(isOpen));
  if (isOpen && window._ciSchedule) drawChart(window._ciSchedule);
});

growthToggle.addEventListener('click', function () {
  const isOpen = growthWrapper.classList.toggle('is-open');
  this.setAttribute('aria-expanded', String(isOpen));
});


/* =============================================
   11. INSIGHTS
   ============================================= */
function getInsight(totalContribs, totalInterest, rate, years) {
  const ratio = totalInterest / totalContribs;
  if (ratio > 4)   return 'Your portfolio has entered exponential growth — compound interest is now generating far more wealth than your contributions. This is the "eighth wonder of the world" in action.';
  if (ratio > 2)   return 'Your investment returns are now earning significantly more than your contributions each year. Compound growth is accelerating powerfully.';
  if (ratio > 1)   return 'Compound growth has now surpassed your total contributions — your money is working harder than you are. This is the tipping point most investors strive to reach.';
  if (ratio > 0.5) return 'Your investments are earning roughly half as much as your contributions. As time goes on, compound interest will increasingly dominate your wealth growth.';
  return 'You\'ve contributed more than you\'ve earned in returns so far — this is normal in the early years. Stay consistent and compound interest will begin to accelerate.';
}

function getCelebration(fv) {
  if (fv >= 1000000) return '🎉 <strong>Congratulations!</strong> Your investment could grow to over <strong>one million dollars</strong>. That\'s the power of compound interest.';
  if (fv >= 500000)  return '🎉 <strong>Excellent!</strong> Your portfolio could exceed <strong>half a million dollars</strong>. Compound growth is working hard for you.';
  if (fv >= 250000)  return '🎉 Your investment could reach over <strong>$250,000</strong>. Consistent contributions and compounding are a powerful combination.';
  if (fv >= 100000)  return '✅ Your investment could reach over <strong>$100,000</strong>. Staying consistent will get you there.';
  return '';
}


/* =============================================
   12. VALIDATE
   ============================================= */
function validateInputs() {
  let valid = true;
  const rate = parseFloat(rateEl.value);
  if (isNaN(rate) || rate <= 0 || rate > 30) {
    rateEl.classList.add('is-error');
    document.getElementById('annual-rate-error').textContent = 'Enter a rate between 0.1% and 30%.';
    valid = false;
  } else {
    rateEl.classList.remove('is-error');
    document.getElementById('annual-rate-error').textContent = '';
  }
  const years = parseInt(yearsEl.value);
  if (isNaN(years) || years < 1 || years > 60) {
    yearsEl.classList.add('is-error');
    document.getElementById('investment-years-error').textContent = 'Enter 1–60 years.';
    valid = false;
  } else {
    yearsEl.classList.remove('is-error');
    document.getElementById('investment-years-error').textContent = '';
  }
  if (!valid) return { valid: false };
  return {
    valid: true,
    values: {
      initial:      parseInputNumber(initialEl.value),
      contrib:      parseInputNumber(contribEl.value),
      contribFreq:  contribFreqEl.value,
      rate:         rate,
      n:            parseInt(compoundFreqEl.value) || 12,
      years:        years,
      inflation:    parseFloat(inflationEl.value) || 0,
      goal:         parseInputNumber(targetGoalEl.value)
    }
  };
}


/* =============================================
   13. CALCULATE & RENDER
   ============================================= */
function calculate() {
  const { valid, values } = validateInputs();
  if (!valid) return;

  const { initial, contrib, contribFreq, rate, n, years, inflation, goal } = values;
  const annualContrib = toAnnualContribution(contrib, contribFreq);

  const data = projectInvestment(initial, annualContrib, rate, n, years, inflation);
  const { schedule, milestones, finalBalance, totalContributed, totalInterest } = data;

  // Track total contributed per year for chart
  let runningContrib = initial;
  schedule.forEach(row => {
    runningContrib += row.yearContrib;
    row.totalContributed = runningContrib;
  });

  const inflAdj       = inflationAdjust(finalBalance, inflation, years);
  const growthPct     = totalContributed > 0 ? ((finalBalance - totalContributed) / totalContributed) * 100 : 0;
  const avgAnnual     = totalInterest / years;
  const avgMonthly    = avgAnnual / 12;
  const rule72Years   = rate > 0 ? (72 / rate).toFixed(1) : '—';
  const contribPct    = finalBalance > 0 ? (totalContributed / finalBalance) * 100 : 50;
  const interestPct   = 100 - contribPct;

  // Show results
  const wasHidden = resultsContent.classList.contains('hidden');
  placeholder.classList.add('hidden');
  resultsContent.classList.remove('hidden');

  // Summary pills
  const freqLabel = { monthly: 'monthly', biweekly: 'bi-weekly', weekly: 'weekly', yearly: 'yearly' }[contribFreq] || 'monthly';
  summaryBox.innerHTML = `
    <p style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--space-3)">Your projection is based on</p>
    <div style="display:flex;flex-wrap:wrap;gap:var(--space-3)">
      <span class="summary-tag">💰 ${formatCAD0(contrib)} ${freqLabel}</span>
      <span class="summary-tag">📈 ${rate}% return</span>
      <span class="summary-tag">📅 ${years} years</span>
      <span class="summary-tag">🔄 ${compoundFreqEl.options[compoundFreqEl.selectedIndex].text} compounding</span>
    </div>`;
  summaryBox.classList.remove('hidden');

  // Celebration
  const celebMsg = getCelebration(finalBalance);
  if (celebMsg) {
    celebrationEl.innerHTML = celebMsg;
    celebrationEl.classList.remove('hidden');
  } else {
    celebrationEl.classList.add('hidden');
  }

  // Main numbers
  resultFV.textContent         = formatCAD(finalBalance);
  resultContribs.textContent   = formatCAD(totalContributed);
  resultInterest.textContent   = formatCAD(Math.max(0, totalInterest));
  resultGrowthPct.textContent  = `${growthPct.toFixed(1)}%`;
  resultInflAdj.textContent    = formatCAD(inflAdj);
  resultAvgAnnual.textContent  = formatCAD(avgAnnual);
  resultAvgMonthly.textContent = formatCAD(avgMonthly);

  // Breakdown bar
  barContrib.style.width   = `${Math.max(2, contribPct)}%`;
  barInterest.style.width  = `${Math.max(2, interestPct)}%`;
  contribPctEl.textContent = `${contribPct.toFixed(1)}%`;
  interestPctEl.textContent= `${interestPct.toFixed(1)}%`;

  // Rule of 72
  rule72Value.textContent = `${rule72Years} years`;
  rule72Text.textContent  = `At ${rate}%, your money doubles approximately every ${rule72Years} years. This means an investment that's worth ${formatCAD0(initial || 10000)} today could be worth ${formatCAD0((initial || 10000) * 2)} in ${rule72Years} years without any additional contributions.`;

  // Monthly income
  income3El.textContent = `${formatCAD0(finalBalance * 0.03 / 12)}/month`;
  income4El.textContent = `${formatCAD0(finalBalance * 0.04 / 12)}/month`;
  income5El.textContent = `${formatCAD0(finalBalance * 0.05 / 12)}/month`;

  // Insight
  insightText.textContent = getInsight(totalContributed, Math.max(0, totalInterest), rate, years);

  // Goal planner
  if (goal > 0) {
    goalCard.style.display = '';
    goalTarget.textContent  = formatCAD0(goal);
    goalProjected.textContent = formatCAD0(finalBalance);
    const yrsNeeded = yearsToGoal(initial, annualContrib, rate, n, goal);
    if (yrsNeeded) {
      goalYears.textContent = `${yrsNeeded} year${yrsNeeded === 1 ? '' : 's'} (${CURRENT_YEAR + yrsNeeded})`;
    } else {
      goalYears.textContent = finalBalance >= goal ? 'Already reached ✓' : 'Beyond 60 years';
    }
    if (finalBalance < goal) {
      const extra = findExtraContrib(initial, annualContrib, rate, n, years, goal);
      goalExtra.textContent = extra !== null ? `${formatCAD0(extra)}/month more` : 'Extend timeline';
    } else {
      goalExtra.textContent = '✅ On track!';
    }
  } else {
    goalCard.style.display = 'none';
  }

  // Milestones
  renderMilestone('tl-25k',  'tl-25k-year',  'tl-25k-sub',  milestones[25000],   finalBalance, 25000);
  renderMilestone('tl-50k',  'tl-50k-year',  'tl-50k-sub',  milestones[50000],   finalBalance, 50000);
  renderMilestone('tl-100k', 'tl-100k-year', 'tl-100k-sub', milestones[100000],  finalBalance, 100000);
  renderMilestone('tl-250k', 'tl-250k-year', 'tl-250k-sub', milestones[250000],  finalBalance, 250000);
  renderMilestone('tl-500k', 'tl-500k-year', 'tl-500k-sub', milestones[500000],  finalBalance, 500000);
  renderMilestone('tl-1m',   'tl-1m-year',   'tl-1m-sub',   milestones[1000000], finalBalance, 1000000);

  // Compare mode
  if (compareMode) {
    const bInitial = parseInputNumber(bInitialEl.value);
    const bContrib = parseInputNumber(bContribEl.value) * 12;
    const bRate    = parseFloat(bRateEl.value) || 5;
    const bYears   = parseInt(bYearsEl.value) || 25;
    const bData    = projectInvestment(bInitial, bContrib, bRate, n, bYears, 0);
    const diff     = Math.abs(finalBalance - bData.finalBalance);
    const aWins    = finalBalance >= bData.finalBalance;

    document.getElementById('compare-val-a').textContent = formatCAD(finalBalance);
    document.getElementById('compare-sub-a').textContent = `${rate}% · ${years} yrs · ${formatCAD0(contrib)}/mo`;
    document.getElementById('compare-val-b').textContent = formatCAD(bData.finalBalance);
    document.getElementById('compare-sub-b').textContent = `${bRate}% · ${bYears} yrs · ${formatCAD0(bInitial + bContrib / 12)}/mo`;
    document.getElementById('compare-col-a').classList.toggle('is-winner', aWins);
    document.getElementById('compare-col-b').classList.toggle('is-winner', !aWins);
    document.getElementById('compare-diff').textContent = `Scenario ${aWins ? 'A' : 'B'} produces ${formatCAD(diff)} more`;
    compareCard.classList.remove('hidden');
  }

  // Store for copy
  window._ciResults = {
    futureValue: formatCAD(finalBalance),
    contributions: formatCAD(totalContributed),
    interest: formatCAD(Math.max(0, totalInterest)),
    growthPct: `${growthPct.toFixed(1)}%`,
    inflAdj: formatCAD(inflAdj),
    income4: `${formatCAD0(finalBalance * 0.04 / 12)}/month`
  };
  window._ciSchedule = schedule;

  // Growth table
  growthTbody.innerHTML = '';
  schedule.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.year}</td>
      <td>${formatCAD(row.yearContrib)}</td>
      <td class="td-interest">${formatCAD(row.yearInterest)}</td>
      <td>${formatCAD(row.balance)}</td>
      <td>${formatCAD(row.inflAdj)}</td>`;
    growthTbody.appendChild(tr);
  });
  growthSection.removeAttribute('hidden');
  chartSection.removeAttribute('hidden');

  // Scroll on first show
  if (wasHidden) {
    const heading = document.getElementById('ci-results-heading');
    if (heading) window.scrollTo({ top: heading.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  }
}


/* =============================================
   14. FORM EVENTS
   ============================================= */
form.addEventListener('submit', e => { e.preventDefault(); calculate(); });
form.querySelectorAll('input, select').forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); calculate(); } });
});


/* =============================================
   15. COPY RESULTS
   ============================================= */
const copyBtn = document.getElementById('copy-results-btn');
if (copyBtn) {
  copyBtn.addEventListener('click', function () {
    const r = window._ciResults;
    if (!r) return;
    const text = [
      '📈 My Investment Projection — Northern Numbers',
      '─────────────────────────',
      `💰 Future Portfolio Value:  ${r.futureValue}`,
      `💵 Total Contributions:     ${r.contributions}`,
      `📈 Total Interest Earned:   ${r.interest}`,
      `📊 Investment Growth:       ${r.growthPct}`,
      `📉 Inflation-Adjusted Value:${r.inflAdj}`,
      `💳 Monthly Income (4%):     ${r.income4}`,
      '─────────────────────────',
      'Calculated at northernnumbers.ca/compound-interest/'
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = '✅ Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => { copyBtn.textContent = '📋 Copy Results to Clipboard'; copyBtn.classList.remove('copied'); }, 2500);
    }).catch(() => { copyBtn.textContent = 'Copy not supported'; });
  });
}


/* =============================================
   16. RESET
   ============================================= */
document.getElementById('ci-reset-btn')?.addEventListener('click', function () {
  initialEl.value     = formatInputNumber(10000);
  contribEl.value     = formatInputNumber(500);
  contribFreqEl.value = 'monthly';
  rateEl.value        = '7';
  compoundFreqEl.value= '12';
  yearsEl.value       = '25';
  inflationEl.value   = '2';
  targetGoalEl.value  = formatInputNumber(500000);
  if (contribSlider) contribSlider.value = 500;
  if (rateSlider)    rateSlider.value    = 7;
  if (yearsSlider)   yearsSlider.value   = 25;

  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
  setCompareMode(false);

  placeholder.classList.remove('hidden');
  resultsContent.classList.add('hidden');
  growthSection.setAttribute('hidden', '');
  chartSection.setAttribute('hidden', '');
  if (summaryBox)     summaryBox.classList.add('hidden');
  if (celebrationEl)  celebrationEl.classList.add('hidden');
});


/* =============================================
   17. INIT
   ============================================= */
(function init() {
  initialEl.value    = formatInputNumber(10000);
  contribEl.value    = formatInputNumber(500);
  targetGoalEl.value = formatInputNumber(500000);
  if (bInitialEl) bInitialEl.value = formatInputNumber(10000);
  if (bContribEl) bContribEl.value = formatInputNumber(300);
})();

/* =============================================
   NORTHERN NUMBERS — rrsp.js
   Canadian RRSP Calculator Logic

   Key Canadian RRSP rules:
   - Contribution room = 18% of prior year earned income, max $32,490 (2026)
   - Unused room carries forward indefinitely
   - Must convert to RRIF by Dec 31 of the year you turn 71
   - Over-contribution buffer: $2,000 lifetime
   - Tax deduction = contribution × marginal tax rate
   ============================================= */

'use strict';

/* =============================================
   1. TAX DATA — 2026 Federal + Provincial
   Combined marginal rates at various income levels
   ============================================= */

// Federal tax brackets 2026
const FED_BRACKETS = [
  { min: 0,       max: 57375,  rate: 0.15   },
  { min: 57375,   max: 114750, rate: 0.205  },
  { min: 114750,  max: 158519, rate: 0.26   },
  { min: 158519,  max: 220000, rate: 0.29   },
  { min: 220000,  max: Infinity, rate: 0.33 }
];

// Provincial tax brackets 2026 (approximate — updated annually)
const PROV_BRACKETS = {
  ON: [
    { min: 0,       max: 51446,  rate: 0.0505 },
    { min: 51446,   max: 102894, rate: 0.0915 },
    { min: 102894,  max: 150000, rate: 0.1116 },
    { min: 150000,  max: 220000, rate: 0.1216 },
    { min: 220000,  max: Infinity, rate: 0.1316 }
  ],
  AB: [
    { min: 0,       max: 148269, rate: 0.10   },
    { min: 148269,  max: 177922, rate: 0.12   },
    { min: 177922,  max: 237230, rate: 0.13   },
    { min: 237230,  max: 355845, rate: 0.14   },
    { min: 355845,  max: Infinity, rate: 0.15 }
  ],
  BC: [
    { min: 0,       max: 45654,  rate: 0.0506 },
    { min: 45654,   max: 91310,  rate: 0.077  },
    { min: 91310,   max: 104835, rate: 0.105  },
    { min: 104835,  max: 127299, rate: 0.1229 },
    { min: 127299,  max: 172602, rate: 0.147  },
    { min: 172602,  max: 240716, rate: 0.168  },
    { min: 240716,  max: Infinity, rate: 0.205 }
  ],
  MB: [
    { min: 0,       max: 47000,  rate: 0.108  },
    { min: 47000,   max: 100000, rate: 0.1275 },
    { min: 100000,  max: Infinity, rate: 0.174 }
  ],
  SK: [
    { min: 0,       max: 49720,  rate: 0.105  },
    { min: 49720,   max: 142058, rate: 0.125  },
    { min: 142058,  max: Infinity, rate: 0.145 }
  ],
  QC: [
    { min: 0,       max: 53255,  rate: 0.14   },
    { min: 53255,   max: 106495, rate: 0.19   },
    { min: 106495,  max: 129590, rate: 0.24   },
    { min: 129590,  max: Infinity, rate: 0.2575 }
  ],
  NB: [
    { min: 0,       max: 49958,  rate: 0.094  },
    { min: 49958,   max: 99916,  rate: 0.14   },
    { min: 99916,   max: 185064, rate: 0.16   },
    { min: 185064,  max: Infinity, rate: 0.195 }
  ],
  NS: [
    { min: 0,       max: 29590,  rate: 0.0879 },
    { min: 29590,   max: 59180,  rate: 0.1495 },
    { min: 59180,   max: 93000,  rate: 0.1667 },
    { min: 93000,   max: 150000, rate: 0.175  },
    { min: 150000,  max: Infinity, rate: 0.21 }
  ],
  PE: [
    { min: 0,       max: 32656,  rate: 0.0965 },
    { min: 32656,   max: 64313,  rate: 0.1363 },
    { min: 64313,   max: 105000, rate: 0.1665 },
    { min: 105000,  max: 140000, rate: 0.18   },
    { min: 140000,  max: Infinity, rate: 0.1875 }
  ],
  NL: [
    { min: 0,       max: 43198,  rate: 0.087  },
    { min: 43198,   max: 86395,  rate: 0.145  },
    { min: 86395,   max: 154244, rate: 0.158  },
    { min: 154244,  max: 215943, rate: 0.178  },
    { min: 215943,  max: 275870, rate: 0.198  },
    { min: 275870,  max: Infinity, rate: 0.208 }
  ],
  YT: [
    { min: 0,       max: 57375,  rate: 0.064  },
    { min: 57375,   max: 114750, rate: 0.09   },
    { min: 114750,  max: 500000, rate: 0.109  },
    { min: 500000,  max: Infinity, rate: 0.128 }
  ],
  NT: [
    { min: 0,       max: 50597,  rate: 0.059  },
    { min: 50597,   max: 101198, rate: 0.086  },
    { min: 101198,  max: 164525, rate: 0.122  },
    { min: 164525,  max: Infinity, rate: 0.1405 }
  ],
  NU: [
    { min: 0,       max: 53268,  rate: 0.04   },
    { min: 53268,   max: 106537, rate: 0.07   },
    { min: 106537,  max: 173205, rate: 0.09   },
    { min: 173205,  max: Infinity, rate: 0.115 }
  ]
};

const RRSP_MAX_2026 = 32490; // 2026 annual RRSP contribution maximum


/* =============================================
   2. TAX CALCULATION FUNCTIONS
   ============================================= */

/**
 * Calculate marginal tax rate at a given income level
 * for a given province (combined federal + provincial).
 */
function getMarginalRate(income, province) {
  const fedRate  = getBracketRate(income, FED_BRACKETS);
  const provRate = getBracketRate(income, PROV_BRACKETS[province] || PROV_BRACKETS['ON']);
  return fedRate + provRate;
}

function getBracketRate(income, brackets) {
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (income > brackets[i].min) return brackets[i].rate;
  }
  return brackets[0].rate;
}

/**
 * Estimate tax refund from an RRSP contribution.
 * Refund = contribution × combined marginal rate at current income.
 */
function estimateTaxRefund(income, contribution, province) {
  const marginalRate = getMarginalRate(income, province);
  return contribution * marginalRate;
}

/**
 * Estimate RRSP contribution room based on income.
 * Room = 18% of income, capped at RRSP_MAX_2026.
 */
function estimateRoomFromIncome(income) {
  return Math.min(Math.round(income * 0.18), RRSP_MAX_2026);
}


/* =============================================
   3. DOM REFERENCES
   ============================================= */
const form               = document.getElementById('rrsp-form');
const incomeEl           = document.getElementById('annual-income');
const provinceEl         = document.getElementById('province');
const currentAgeEl       = document.getElementById('current-age');
const retirementAgeEl    = document.getElementById('retirement-age');
const balanceEl          = document.getElementById('rrsp-balance');
const roomEl             = document.getElementById('rrsp-room');
const contributionEl     = document.getElementById('rrsp-contribution');
const lumpSumEl          = document.getElementById('lump-sum');
const frequencyEl        = document.getElementById('contrib-frequency');
const returnEl           = document.getElementById('annual-return');
const inflationEl        = document.getElementById('inflation-rate');
const salaryGrowthEl     = document.getElementById('salary-growth');
const employerMatchEl    = document.getElementById('employer-match');
const retirementTaxEl    = document.getElementById('retirement-tax-rate');
const overContribWarning = document.getElementById('over-contrib-warning');
const roomAutoBadge      = document.getElementById('room-auto-badge');

const resultsPlaceholder   = document.getElementById('rrsp-results-placeholder');
const resultsContent       = document.getElementById('rrsp-results-content');
const resultSummaryBox     = document.getElementById('result-summary-box');
const resultCelebration    = document.getElementById('result-celebration');
const resultFutureValue    = document.getElementById('result-future-value');
const resultTotalContribs  = document.getElementById('result-total-contributions');
const resultEmployerMatch  = document.getElementById('result-employer-match');
const resultGrowth         = document.getElementById('result-investment-growth');
const resultInflation      = document.getElementById('result-inflation-adjusted');
const resultRemainingRoom  = document.getElementById('result-remaining-room');
const resultRrifYear       = document.getElementById('result-rrif-year');
const resultRetirementIncome = document.getElementById('result-retirement-income');
const resultTaxRefund      = document.getElementById('result-tax-refund');
const strategyText         = document.getElementById('strategy-text');
const comparisonWinner     = document.getElementById('comparison-winner');
const comparisonText       = document.getElementById('comparison-text');

const milestone100k     = document.getElementById('milestone-100k');
const milestone250k     = document.getElementById('milestone-250k');
const milestone500k     = document.getElementById('milestone-500k');
const milestone1m       = document.getElementById('milestone-1m');
const milestone100kYear = document.getElementById('milestone-100k-year');
const milestone250kYear = document.getElementById('milestone-250k-year');
const milestone500kYear = document.getElementById('milestone-500k-year');
const milestone1mYear   = document.getElementById('milestone-1m-year');
const milestone100kText = document.getElementById('milestone-100k-text');
const milestone250kText = document.getElementById('milestone-250k-text');
const milestone500kText = document.getElementById('milestone-500k-text');
const milestone1mText   = document.getElementById('milestone-1m-text');

const growthSection      = document.getElementById('growth-section');
const growthToggle       = document.getElementById('growth-toggle');
const growthTableWrapper = document.getElementById('growth-table-wrapper');
const growthTbody        = document.getElementById('growth-tbody');
const rrifNote           = document.getElementById('rrif-note');


/* =============================================
   4. FORMATTING UTILITIES
   ============================================= */
function formatCAD(amount) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD',
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(amount);
}

function formatCAD0(amount) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD',
    minimumFractionDigits: 0, maximumFractionDigits: 0
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
   5. LIVE INPUT FORMATTING
   ============================================= */
function attachFormatter(inputEl) {
  if (!inputEl) return;
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

attachFormatter(incomeEl);
attachFormatter(balanceEl);
attachFormatter(roomEl);
attachFormatter(contributionEl);
attachFormatter(lumpSumEl);


/* =============================================
   6. AUTO-ESTIMATE RRSP ROOM FROM INCOME
   ============================================= */
function autoEstimateRoom() {
  const income = parseInputNumber(incomeEl.value);
  if (!income || income < 1000) {
    roomAutoBadge.classList.add('hidden');
    return;
  }
  const estimated = estimateRoomFromIncome(income);
  roomEl.value = formatInputNumber(estimated);
  roomAutoBadge.classList.remove('hidden');
  checkOverContrib();
}

incomeEl.addEventListener('input', autoEstimateRoom);
provinceEl.addEventListener('change', function () {
  checkOverContrib();
});


/* =============================================
   7. ADVANCED SETTINGS TOGGLE
   ============================================= */
const advancedToggle = document.getElementById('advanced-toggle');
const advancedFields = document.getElementById('advanced-fields');

advancedToggle.addEventListener('click', function () {
  const isOpen = advancedFields.classList.toggle('is-open');
  this.setAttribute('aria-expanded', isOpen.toString());
});


/* =============================================
   8. PRESETS
   ============================================= */
const PRESETS = {
  graduate: {
    income: 55000, province: 'ON', currentAge: 25, retirementAge: 65,
    balance: 0, room: 9900, contribution: 200, frequency: 'monthly',
    annualReturn: 7, lumpSum: 0
  },
  average: {
    income: 85000, province: 'ON', currentAge: 35, retirementAge: 65,
    balance: 25000, room: 29000, contribution: 7000, frequency: 'yearly',
    annualReturn: 6, lumpSum: 0
  },
  highincome: {
    income: 175000, province: 'ON', currentAge: 40, retirementAge: 60,
    balance: 150000, room: 32490, contribution: 32490, frequency: 'yearly',
    annualReturn: 7, lumpSum: 0
  },
  nearretirement: {
    income: 110000, province: 'ON', currentAge: 58, retirementAge: 65,
    balance: 350000, room: 19800, contribution: 19800, frequency: 'yearly',
    annualReturn: 5, lumpSum: 0
  }
};

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const key    = this.dataset.preset;
    const preset = PRESETS[key];
    if (!preset) return;

    incomeEl.value        = formatInputNumber(preset.income);
    provinceEl.value      = preset.province;
    currentAgeEl.value    = preset.currentAge;
    retirementAgeEl.value = preset.retirementAge;
    balanceEl.value       = formatInputNumber(preset.balance);
    roomEl.value          = formatInputNumber(preset.room);
    contributionEl.value  = formatInputNumber(preset.contribution);
    frequencyEl.value     = preset.frequency;
    returnEl.value        = preset.annualReturn;
    lumpSumEl.value       = formatInputNumber(0);
    roomAutoBadge.classList.add('hidden');

    frequencyEl.dispatchEvent(new Event('change'));

    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
    this.classList.add('is-active');

    checkOverContrib();
    calculate();
  });
});


/* =============================================
   9. OVER-CONTRIBUTION CHECK
   ============================================= */
function toAnnualContribution(amount, frequency) {
  switch (frequency) {
    case 'monthly':  return amount * 12;
    case 'biweekly': return amount * 26;
    case 'weekly':   return amount * 52;
    case 'onetime':  return amount;
    default:         return amount;
  }
}

function checkOverContrib() {
  const room         = parseInputNumber(roomEl.value);
  const contribution = parseInputNumber(contributionEl.value);
  const frequency    = frequencyEl.value;
  const lumpSum      = parseInputNumber(lumpSumEl?.value || '0');

  if (!room || (!contribution && !lumpSum)) {
    overContribWarning.classList.remove('is-visible');
    return;
  }

  const annualContrib = toAnnualContribution(contribution, frequency);
  const year1Total    = lumpSum + annualContrib;
  // RRSP has $2,000 lifetime buffer before penalties
  const isOver        = year1Total > (room + 2000);

  if (isOver) {
    const fmt = (n) => new Intl.NumberFormat('en-CA', {
      style: 'currency', currency: 'CAD',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(n);

    let msg = `⚠️ <strong>Possible over-contribution.</strong> `;
    if (lumpSum > 0) {
      msg += `Your lump sum (${fmt(lumpSum)}) plus recurring contributions (${fmt(annualContrib)}/year) total <strong>${fmt(year1Total)}</strong>, which exceeds your room of <strong>${fmt(room)}</strong> plus the $2,000 buffer. `;
    } else {
      msg += `At this frequency, your annual contributions total <strong>${fmt(annualContrib)}</strong>, which exceeds your room of <strong>${fmt(room)}</strong> plus the $2,000 buffer. `;
    }
    msg += `The CRA charges 1% per month on excess amounts. Verify your room before contributing.`;
    overContribWarning.innerHTML = msg;
  }
  overContribWarning.classList.toggle('is-visible', isOver);
}

roomEl.addEventListener('input', checkOverContrib);
contributionEl.addEventListener('input', checkOverContrib);
frequencyEl.addEventListener('change', checkOverContrib);
if (lumpSumEl) lumpSumEl.addEventListener('input', checkOverContrib);


/* =============================================
   10. VALIDATION
   ============================================= */
function setError(inputEl, errorElId, msg) {
  if (!inputEl) return;
  inputEl.classList.add('is-error');
  const el = document.getElementById(errorElId);
  if (el) { el.textContent = msg; el.classList.add('is-visible'); }
}

function clearError(inputEl, errorElId) {
  if (!inputEl) return;
  inputEl.classList.remove('is-error');
  const el = document.getElementById(errorElId);
  if (el) { el.textContent = ''; el.classList.remove('is-visible'); }
}

function validateInputs() {
  let valid = true;

  const income = parseInputNumber(incomeEl.value);
  if (!income || income < 1000) {
    setError(incomeEl, 'annual-income-error', 'Please enter a valid annual income.');
    valid = false;
  } else { clearError(incomeEl, 'annual-income-error'); }

  const currentAge = parseInt(currentAgeEl.value);
  if (isNaN(currentAge) || currentAge < 18 || currentAge > 70) {
    setError(currentAgeEl, 'current-age-error', 'Please enter your current age (18–70).');
    valid = false;
  } else { clearError(currentAgeEl, 'current-age-error'); }

  const retirementAge = parseInt(retirementAgeEl.value);
  if (isNaN(retirementAge) || retirementAge < currentAge + 1 || retirementAge > 71) {
    setError(retirementAgeEl, 'retirement-age-error', 'Retirement age must be after current age and no later than 71.');
    valid = false;
  } else { clearError(retirementAgeEl, 'retirement-age-error'); }

  const balance = parseInputNumber(balanceEl.value);
  if (isNaN(balance) || balance < 0) {
    setError(balanceEl, 'rrsp-balance-error', 'Please enter a valid RRSP balance.');
    valid = false;
  } else { clearError(balanceEl, 'rrsp-balance-error'); }

  const contribution = parseInputNumber(contributionEl.value);
  if (isNaN(contribution) || contribution < 0) {
    setError(contributionEl, 'rrsp-contribution-error', 'Please enter a valid contribution amount.');
    valid = false;
  } else { clearError(contributionEl, 'rrsp-contribution-error'); }

  const annualReturn = parseFloat(returnEl.value);
  if (isNaN(annualReturn) || annualReturn < 0 || annualReturn > 30) {
    setError(returnEl, 'annual-return-error', 'Please enter a return between 0% and 30%.');
    valid = false;
  } else { clearError(returnEl, 'annual-return-error'); }

  if (!valid) return { valid: false };

  return {
    valid: true,
    values: {
      income,
      province:        provinceEl.value,
      currentAge,
      retirementAge,
      balance,
      room:            parseInputNumber(roomEl.value),
      contribution,
      lumpSum:         parseInputNumber(lumpSumEl.value),
      frequency:       frequencyEl.value,
      annualReturn,
      inflationRate:   parseFloat(inflationEl.value) || 2.1,
      salaryGrowth:    parseFloat(salaryGrowthEl.value) || 0,
      employerMatch:   parseFloat(employerMatchEl.value) || 0,
      retirementTax:   parseFloat(retirementTaxEl.value) || 20
    }
  };
}


/* =============================================
   11. CORE RRSP PROJECTION MATH
   ============================================= */
function projectRrsp(values) {
  const {
    income, province, currentAge, retirementAge, balance,
    room, contribution, lumpSum, frequency,
    annualReturn, salaryGrowth, employerMatch
  } = values;

  const years         = retirementAge - currentAge;
  const rate          = annualReturn / 100;
  const annualContrib = toAnnualContribution(contribution, frequency);
  const matchRate     = employerMatch / 100;
  const currentYear   = new Date().getFullYear();

  let currentBalance      = balance;
  let currentRoom         = room;
  let currentIncome       = income;
  let totalContributions  = 0;
  let totalEmployerMatch  = 0;
  const schedule          = [];
  const milestones        = { 100000: null, 250000: null, 500000: null, 1000000: null };

  for (let y = 1; y <= years; y++) {
    const age     = currentAge + y;
    const calYear = currentYear + y;

    // New room accumulates each year based on growing income
    if (y > 1) {
      currentIncome = currentIncome * (1 + salaryGrowth / 100);
      const newRoom = Math.min(Math.round(currentIncome * 0.18), RRSP_MAX_2026);
      currentRoom  += newRoom;
    }

    // Year 1: apply lump sum first
    let actualContrib = 0;
    if (y === 1 && lumpSum > 0) {
      const lumpActual   = Math.min(lumpSum, currentRoom);
      currentRoom       -= lumpActual;
      totalContributions += lumpActual;
      actualContrib     += lumpActual;
    }

    // Regular contribution
    const yearContrib    = (frequency === 'onetime' && y > 1) ? 0 : annualContrib;
    const regularActual  = Math.min(yearContrib, currentRoom);
    currentRoom         -= regularActual;
    totalContributions  += regularActual;
    actualContrib       += regularActual;

    // Employer match
    const matchAmount    = actualContrib * matchRate;
    totalEmployerMatch  += matchAmount;
    const totalDeposit   = actualContrib + matchAmount;

    // Growth (mid-year approximation)
    const growthBase = currentBalance + totalDeposit * 0.5;
    const yearGrowth = growthBase * rate;
    currentBalance   = currentBalance + totalDeposit + yearGrowth;

    // Milestones
    if (!milestones[100000]  && currentBalance >= 100000)  milestones[100000]  = calYear;
    if (!milestones[250000]  && currentBalance >= 250000)  milestones[250000]  = calYear;
    if (!milestones[500000]  && currentBalance >= 500000)  milestones[500000]  = calYear;
    if (!milestones[1000000] && currentBalance >= 1000000) milestones[1000000] = calYear;

    schedule.push({
      year: calYear,
      age,
      contribution:  actualContrib,
      employerMatch: matchAmount,
      growth:        yearGrowth,
      balance:       currentBalance
    });
  }

  return {
    schedule,
    milestones,
    totalContributions,
    totalEmployerMatch,
    finalBalance:   currentBalance,
    remainingRoom:  currentRoom,
    rrifYear:       currentYear + (71 - currentAge)
  };
}

function inflationAdjust(futureValue, inflationRate, years) {
  if (inflationRate <= 0) return futureValue;
  return futureValue / Math.pow(1 + inflationRate / 100, years);
}


/* =============================================
   12. DYNAMIC STRATEGY & COMPARISON TEXT
   ============================================= */
function getStrategyText(income, currentAge, retirementAge, province, finalBalance) {
  const marginalRate = getMarginalRate(income, province);
  const marginalPct  = Math.round(marginalRate * 100);
  const yearsLeft    = retirementAge - currentAge;

  if (income >= 150000) {
    return `At your income level, you're in the ${marginalPct}% combined marginal bracket. Every $1,000 you contribute to your RRSP saves you approximately $${Math.round(marginalRate * 1000)} in taxes this year. Maximizing your RRSP room is one of the most powerful tax strategies available to high-income Canadians.`;
  } else if (income >= 80000) {
    return `You're in the ${marginalPct}% combined marginal bracket. RRSP contributions provide meaningful immediate tax savings, and your money grows tax-sheltered until retirement. Consider also contributing to a TFSA for flexibility — both accounts can work together effectively.`;
  } else if (income < 50000) {
    return `At your current income level (${marginalPct}% marginal bracket), you may get more long-term flexibility from a TFSA since you can withdraw tax-free at any time. However, RRSP contributions still reduce your taxes now and may be worth considering if your retirement income is expected to be lower.`;
  } else if (yearsLeft <= 10) {
    return `With ${yearsLeft} years until retirement, capital preservation becomes increasingly important. Consider gradually shifting toward lower-risk investments while still making contributions to maximize your deduction. Consult a financial advisor about your RRSP-to-RRIF conversion strategy.`;
  }
  return `Your RRSP contributions reduce your taxable income and grow tax-sheltered until retirement. With ${yearsLeft} years of compounding ahead, consistent contributions — even modest ones — can make a significant difference by retirement.`;
}

function getComparisonText(income, province) {
  const marginalRate = getMarginalRate(income, province);
  const marginalPct  = Math.round(marginalRate * 100);

  if (income >= 100000) {
    return {
      winner: '✅ RRSP is likely the better choice today',
      text: `At your income level (${marginalPct}% marginal bracket), RRSP contributions generate large immediate tax deductions. You save taxes now at a high rate, and in retirement your withdrawals will likely be taxed at a lower rate. This tax arbitrage makes RRSPs especially powerful for high-income Canadians.`
    };
  } else if (income >= 60000) {
    return {
      winner: '✅ Both RRSP and TFSA are worth using',
      text: `At your income level, both accounts offer real benefits. Use your RRSP for the tax deduction and long-term retirement growth, and your TFSA for flexibility and tax-free access. Many Canadians reinvest their RRSP tax refund directly into a TFSA — doubling the tax efficiency of each dollar.`
    };
  } else {
    return {
      winner: '✅ TFSA may provide greater flexibility',
      text: `At lower income levels (${marginalPct}% marginal bracket), RRSP deductions are less impactful since you're already in a lower tax bracket. A TFSA may offer more flexibility — withdrawals are always tax-free, don't affect income-tested benefits, and your room comes back the following year. You can revisit RRSP contributions when your income increases.`
    };
  }
}

function getCelebrationText(finalBalance) {
  if (finalBalance >= 1000000) return '🎉 Congratulations! Your RRSP could grow to over <strong>one million dollars</strong> — a truly significant retirement nest egg.';
  if (finalBalance >= 500000)  return '🎉 Congratulations! Your RRSP could grow to over <strong>half a million dollars</strong>. You\'re on a strong track for retirement.';
  if (finalBalance >= 250000)  return '🎉 Great progress! Your RRSP could grow to over <strong>$250,000</strong> by retirement.';
  if (finalBalance >= 100000)  return '✅ Your RRSP could reach over <strong>$100,000</strong>. Stay consistent and compounding will do the heavy lifting.';
  return null;
}


/* =============================================
   13. RENDER RESULTS
   ============================================= */
function renderSummaryBox(values) {
  if (!resultSummaryBox) return;
  const { contribution, frequency, currentAge, retirementAge, annualReturn } = values;
  const years = retirementAge - currentAge;

  const freqLabel = {
    yearly: 'annually', monthly: 'monthly', biweekly: 'bi-weekly',
    weekly: 'weekly', onetime: 'one-time'
  }[frequency] || 'annually';

  const contribText = frequency === 'onetime'
    ? `${formatCAD(contribution)} one-time`
    : `${formatCAD(contribution)} / ${freqLabel}`;

  resultSummaryBox.innerHTML = `
    <p style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:var(--space-3);">Your projection is based on</p>
    <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);">
      <span class="summary-tag">💰 ${contribText}</span>
      <span class="summary-tag">📅 ${years} years</span>
      <span class="summary-tag">📈 ${annualReturn}% annual return</span>
    </div>
  `;
  resultSummaryBox.classList.remove('hidden');
}

function renderMilestone(cardEl, yearEl, textEl, subEl, amount, year, finalBalance) {
  const label   = amount >= 1000000 ? '$1,000,000' : '$' + amount.toLocaleString('en-CA');
  const reached = finalBalance >= amount;
  const currentYear = new Date().getFullYear();

  if (year) {
    const yearsAway = year - currentYear;
    yearEl.textContent = year;
    textEl.innerHTML   = `<strong>${label}</strong> ${reached ? '✓' : ''}`;
    if (subEl) subEl.textContent = yearsAway <= 0 ? 'already reached' : `${yearsAway} year${yearsAway === 1 ? '' : 's'} from now`;
    cardEl.classList.toggle('is-reached', reached);
  } else {
    yearEl.textContent = 'N/A';
    textEl.innerHTML   = `<strong>${label}</strong>`;
    if (subEl) subEl.textContent = 'beyond your time horizon';
    cardEl.classList.remove('is-reached');
  }
}

function calcTaxOwed(income, province) {
  // Simplified: apply brackets cumulatively for a rough total tax estimate
  let tax = 0;
  const fedBrackets = FED_BRACKETS;
  const provBrackets = PROV_BRACKETS[province] || PROV_BRACKETS['ON'];

  for (let i = 0; i < fedBrackets.length; i++) {
    const b = fedBrackets[i];
    if (income <= b.min) break;
    const taxable = Math.min(income, b.max) - b.min;
    tax += taxable * b.rate;
  }
  for (let i = 0; i < provBrackets.length; i++) {
    const b = provBrackets[i];
    if (income <= b.min) break;
    const taxable = Math.min(income, b.max) - b.min;
    tax += taxable * b.rate;
  }
  return tax;
}

function calcReinvestScenario(values, baseBalance) {
  // Project RRSP if user reinvests their annual tax refund as extra contribution each year
  const { income, province, currentAge, retirementAge, contribution,
          lumpSum, frequency, annualReturn, salaryGrowth, employerMatch } = values;

  const years         = retirementAge - currentAge;
  const rate          = annualReturn / 100;
  const annualContrib = toAnnualContribution(contribution, frequency);
  const matchRate     = employerMatch / 100;
  const refundRate    = getMarginalRate(income, province);

  let balance = baseBalance;

  for (let y = 1; y <= years; y++) {
    const yearContrib   = (frequency === 'onetime' && y > 1) ? 0 : annualContrib;
    // Extra from reinvesting last year's refund
    const reinvestExtra = y > 1 ? annualContrib * refundRate : 0;
    const totalDeposit  = yearContrib + reinvestExtra + (yearContrib + reinvestExtra) * matchRate;
    const growthBase    = balance + totalDeposit * 0.5;
    balance             = balance + totalDeposit + growthBase * rate;
  }
  return balance;
}

function renderResults(data, values) {
  const { schedule, milestones, totalContributions, totalEmployerMatch, finalBalance, remainingRoom, rrifYear } = data;
  const { currentAge, retirementAge, annualReturn, inflationRate, income, province } = values;
  const years            = retirementAge - currentAge;
  const startingBalance  = parseInputNumber(balanceEl.value);
  const investmentGrowth = finalBalance - totalContributions - totalEmployerMatch - startingBalance;
  const inflationValue   = inflationAdjust(finalBalance, inflationRate, years);
  const contribution     = parseInputNumber(contributionEl.value);
  const taxRefund        = estimateTaxRefund(income, contribution, province);
  const refundPct        = contribution > 0 ? Math.round((taxRefund / contribution) * 100) : 0;
  const retirementIncome = finalBalance * 0.04;
  const currentYear      = new Date().getFullYear();

  // Tax with vs without RRSP
  const taxWithout = calcTaxOwed(income, province);
  const taxWith    = calcTaxOwed(income - contribution, province);
  const taxSaved   = taxWithout - taxWith;

  // Reinvest scenario
  const withReinvest    = calcReinvestScenario(values, startingBalance);
  const reinvestExtra   = withReinvest - finalBalance;

  resultsPlaceholder.classList.add('hidden');
  resultsContent.classList.remove('hidden');

  renderSummaryBox(values);

  const celebMsg = getCelebrationText(finalBalance);
  if (celebMsg) {
    resultCelebration.innerHTML = celebMsg;
    resultCelebration.classList.remove('hidden');
  } else {
    resultCelebration.classList.add('hidden');
  }

  // Hero tax refund
  resultTaxRefund.textContent = formatCAD(taxRefund);
  const refundPctEl = document.getElementById('result-refund-pct');
  if (refundPctEl) refundPctEl.textContent = `You're getting back ${refundPct}% of your contribution`;

  // Tax savings comparison
  const taxWithoutEl = document.getElementById('result-tax-without');
  const taxWithEl    = document.getElementById('result-tax-with');
  const taxSavedEl   = document.getElementById('result-tax-saved');
  if (taxWithoutEl) taxWithoutEl.textContent = formatCAD(taxWithout);
  if (taxWithEl)    taxWithEl.textContent    = formatCAD(taxWith);
  if (taxSavedEl)   taxSavedEl.textContent   = `${formatCAD(taxSaved)} saved`;

  // Main numbers
  resultFutureValue.textContent   = formatCAD(finalBalance);
  resultTotalContribs.textContent = formatCAD(totalContributions);
  resultEmployerMatch.textContent = totalEmployerMatch > 0 ? formatCAD(totalEmployerMatch) : '$0.00';
  resultGrowth.textContent        = formatCAD(Math.max(0, investmentGrowth));
  resultInflation.textContent     = formatCAD(inflationValue);
  resultRemainingRoom.textContent = formatCAD(remainingRoom);
  resultRrifYear.textContent      = rrifYear.toString();

  resultRetirementIncome.textContent = `${formatCAD0(retirementIncome)}/year`;

  // Reinvest comparison
  const noReinvestEl    = document.getElementById('result-no-reinvest');
  const withReinvestEl  = document.getElementById('result-with-reinvest');
  const reinvestExtraEl = document.getElementById('result-reinvest-extra');
  if (noReinvestEl)    noReinvestEl.textContent    = formatCAD(finalBalance);
  if (withReinvestEl)  withReinvestEl.textContent  = formatCAD(withReinvest);
  if (reinvestExtraEl) reinvestExtraEl.textContent = `+${formatCAD(reinvestExtra)}`;

  // Strategy + comparison
  strategyText.textContent = getStrategyText(income, currentAge, retirementAge, province, finalBalance);
  const comparison = getComparisonText(income, province);
  comparisonWinner.textContent = comparison.winner;
  comparisonText.textContent   = comparison.text;

  // Milestones with "years from now"
  const m100kSub = document.getElementById('milestone-100k-sub');
  const m250kSub = document.getElementById('milestone-250k-sub');
  const m500kSub = document.getElementById('milestone-500k-sub');
  const m1mSub   = document.getElementById('milestone-1m-sub');

  renderMilestone(milestone100k, milestone100kYear, milestone100kText, m100kSub, 100000,  milestones[100000],  finalBalance);
  renderMilestone(milestone250k, milestone250kYear, milestone250kText, m250kSub, 250000,  milestones[250000],  finalBalance);
  renderMilestone(milestone500k, milestone500kYear, milestone500kText, m500kSub, 500000,  milestones[500000],  finalBalance);
  renderMilestone(milestone1m,   milestone1mYear,   milestone1mText,   m1mSub,   1000000, milestones[1000000], finalBalance);

  if (retirementAge >= 65) rrifNote.style.display = 'block';

  // Store results for copy button
  window._rrspResults = {
    futureValue: formatCAD(finalBalance),
    taxRefund: formatCAD(taxRefund),
    retirementIncome: `${formatCAD0(retirementIncome)}/year`,
    totalContribs: formatCAD(totalContributions),
    inflationValue: formatCAD(inflationValue)
  };

  renderGrowthTable(schedule);

  if (window.innerWidth < 900) {
    resultsContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}


/* =============================================
   14. GROWTH TABLE
   ============================================= */
function renderGrowthTable(schedule) {
  growthTbody.innerHTML = '';
  schedule.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.year}</td>
      <td>${row.age}</td>
      <td>${formatCAD(row.contribution)}</td>
      <td class="td-growth">${formatCAD(row.employerMatch)}</td>
      <td class="td-growth">${formatCAD(row.growth)}</td>
      <td>${formatCAD(row.balance)}</td>
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
   15. CALCULATE
   ============================================= */
function calculate() {
  const result = validateInputs();
  if (!result.valid) return;
  const data = projectRrsp(result.values);
  renderResults(data, result.values);
}

form.addEventListener('submit', function (e) {
  e.preventDefault();
  calculate();
});

form.querySelectorAll('input, select').forEach(el => {
  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); calculate(); }
  });
});


/* =============================================
   16. RESET
   ============================================= */
const resetBtn = document.getElementById('rrsp-reset-btn');
if (resetBtn) {
  resetBtn.addEventListener('click', function () {
    incomeEl.value        = formatInputNumber(85000);
    provinceEl.value      = 'ON';
    currentAgeEl.value    = '35';
    retirementAgeEl.value = '65';
    balanceEl.value       = formatInputNumber(0);
    roomEl.value          = '';
    contributionEl.value  = formatInputNumber(7000);
    lumpSumEl.value       = formatInputNumber(0);
    frequencyEl.value     = 'yearly';
    returnEl.value        = '6';
    inflationEl.value     = '2.1';
    salaryGrowthEl.value  = '2';
    employerMatchEl.value = '0';
    retirementTaxEl.value = '20';

    roomAutoBadge.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
    overContribWarning.classList.remove('is-visible');
    if (contribSlider) contribSlider.value = 7000;

    resultsPlaceholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    growthSection.setAttribute('hidden', '');
    rrifNote.style.display = 'none';
    if (resultSummaryBox) resultSummaryBox.classList.add('hidden');
    if (resultCelebration) resultCelebration.classList.add('hidden');
  });
}


/* =============================================
   17. CONTRIBUTION SLIDER
   ============================================= */
const contribSlider = document.getElementById('contrib-slider');

if (contribSlider) {
  // Slider → updates text input
  contribSlider.addEventListener('input', function () {
    const val = parseInt(this.value);
    contributionEl.value = formatInputNumber(val);
    checkOverContrib();
    // Live recalculate if results already showing
    if (!resultsContent.classList.contains('hidden')) calculate();
  });

  // Text input → updates slider
  contributionEl.addEventListener('input', function () {
    const val = parseInputNumber(this.value);
    if (!isNaN(val) && val >= 0 && val <= 32490) {
      contribSlider.value = val;
    }
  });

  // Update slider max when room changes
  roomEl.addEventListener('input', function () {
    const room = parseInputNumber(this.value);
    if (room > 0 && room <= 32490) contribSlider.max = room;
  });
}


/* =============================================
   18. COPY RESULTS
   ============================================= */
const copyBtn = document.getElementById('copy-results-btn');
if (copyBtn) {
  copyBtn.addEventListener('click', function () {
    const r = window._rrspResults;
    if (!r) return;

    const text = [
      '📊 My RRSP Projection — Northern Numbers',
      '─────────────────────────',
      `💰 Estimated Tax Refund:     ${r.taxRefund}`,
      `📈 Future RRSP Value:        ${r.futureValue}`,
      `🏖 Retirement Income (4%):   ${r.retirementIncome}`,
      `💵 Total Contributions:      ${r.totalContribs}`,
      `📉 Inflation-Adjusted Value: ${r.inflationValue}`,
      '─────────────────────────',
      'Calculated at northernnumbers.ca/rrsp/'
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = '✅ Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = '📋 Copy Results to Clipboard';
        copyBtn.classList.remove('copied');
      }, 2500);
    }).catch(() => {
      copyBtn.textContent = 'Copy not supported in this browser';
    });
  });
}


/* =============================================
   19. INIT
   ============================================= */
(function init() {
  incomeEl.value       = formatInputNumber(85000);
  balanceEl.value      = formatInputNumber(0);
  contributionEl.value = formatInputNumber(7000);
  lumpSumEl.value      = formatInputNumber(0);
  if (contribSlider) contribSlider.value = 7000;
  autoEstimateRoom();
})();

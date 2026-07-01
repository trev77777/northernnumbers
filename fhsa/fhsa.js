/* =============================================
   NORTHERN NUMBERS — fhsa.js
   Canadian FHSA Calculator Logic

   Key FHSA rules (2026):
   - Annual limit: $8,000/year
   - Lifetime limit: $40,000
   - Carry-forward: max $8,000 unused room from prior year
   - Contributions are tax-deductible (like RRSP)
   - Withdrawals are tax-free for qualifying home purchase
   - Account closes within 15 years or transfers to RRSP
   - Contribution deadline: December 31 (no 60-day grace)
   ============================================= */

'use strict';

/* =============================================
   1. TAX DATA — 2026 Federal + Provincial
   (Same brackets as RRSP calculator)
   ============================================= */
const FED_BRACKETS = [
  { min: 0,      max: 57375,   rate: 0.15   },
  { min: 57375,  max: 114750,  rate: 0.205  },
  { min: 114750, max: 158519,  rate: 0.26   },
  { min: 158519, max: 220000,  rate: 0.29   },
  { min: 220000, max: Infinity, rate: 0.33  }
];

const PROV_BRACKETS = {
  ON: [{ min:0,max:51446,rate:0.0505 },{ min:51446,max:102894,rate:0.0915 },{ min:102894,max:150000,rate:0.1116 },{ min:150000,max:220000,rate:0.1216 },{ min:220000,max:Infinity,rate:0.1316 }],
  AB: [{ min:0,max:148269,rate:0.10 },{ min:148269,max:177922,rate:0.12 },{ min:177922,max:237230,rate:0.13 },{ min:237230,max:355845,rate:0.14 },{ min:355845,max:Infinity,rate:0.15 }],
  BC: [{ min:0,max:45654,rate:0.0506 },{ min:45654,max:91310,rate:0.077 },{ min:91310,max:104835,rate:0.105 },{ min:104835,max:127299,rate:0.1229 },{ min:127299,max:172602,rate:0.147 },{ min:172602,max:240716,rate:0.168 },{ min:240716,max:Infinity,rate:0.205 }],
  MB: [{ min:0,max:47000,rate:0.108 },{ min:47000,max:100000,rate:0.1275 },{ min:100000,max:Infinity,rate:0.174 }],
  SK: [{ min:0,max:49720,rate:0.105 },{ min:49720,max:142058,rate:0.125 },{ min:142058,max:Infinity,rate:0.145 }],
  QC: [{ min:0,max:53255,rate:0.14 },{ min:53255,max:106495,rate:0.19 },{ min:106495,max:129590,rate:0.24 },{ min:129590,max:Infinity,rate:0.2575 }],
  NB: [{ min:0,max:49958,rate:0.094 },{ min:49958,max:99916,rate:0.14 },{ min:99916,max:185064,rate:0.16 },{ min:185064,max:Infinity,rate:0.195 }],
  NS: [{ min:0,max:29590,rate:0.0879 },{ min:29590,max:59180,rate:0.1495 },{ min:59180,max:93000,rate:0.1667 },{ min:93000,max:150000,rate:0.175 },{ min:150000,max:Infinity,rate:0.21 }],
  PE: [{ min:0,max:32656,rate:0.0965 },{ min:32656,max:64313,rate:0.1363 },{ min:64313,max:105000,rate:0.1665 },{ min:105000,max:140000,rate:0.18 },{ min:140000,max:Infinity,rate:0.1875 }],
  NL: [{ min:0,max:43198,rate:0.087 },{ min:43198,max:86395,rate:0.145 },{ min:86395,max:154244,rate:0.158 },{ min:154244,max:215943,rate:0.178 },{ min:215943,max:275870,rate:0.198 },{ min:275870,max:Infinity,rate:0.208 }],
  YT: [{ min:0,max:57375,rate:0.064 },{ min:57375,max:114750,rate:0.09 },{ min:114750,max:500000,rate:0.109 },{ min:500000,max:Infinity,rate:0.128 }],
  NT: [{ min:0,max:50597,rate:0.059 },{ min:50597,max:101198,rate:0.086 },{ min:101198,max:164525,rate:0.122 },{ min:164525,max:Infinity,rate:0.1405 }],
  NU: [{ min:0,max:53268,rate:0.04 },{ min:53268,max:106537,rate:0.07 },{ min:106537,max:173205,rate:0.09 },{ min:173205,max:Infinity,rate:0.115 }]
};

const FHSA_ANNUAL_LIMIT   = 8000;
const FHSA_LIFETIME_LIMIT = 40000;
const HBP_MAX             = 35000;
const CURRENT_YEAR        = new Date().getFullYear();


/* =============================================
   2. TAX FUNCTIONS
   ============================================= */
function getBracketRate(income, brackets) {
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (income > brackets[i].min) return brackets[i].rate;
  }
  return brackets[0].rate;
}

function getMarginalRate(income, province) {
  const fed  = getBracketRate(income, FED_BRACKETS);
  const prov = getBracketRate(income, PROV_BRACKETS[province] || PROV_BRACKETS.ON);
  return fed + prov;
}

function estimateTaxRefund(income, contribution, province) {
  return contribution * getMarginalRate(income, province);
}


/* =============================================
   3. DOM REFERENCES
   ============================================= */
const form               = document.getElementById('fhsa-form');
const incomeEl           = document.getElementById('annual-income');
const provinceEl         = document.getElementById('province');
const currentAgeEl       = document.getElementById('current-age');
const purchaseYearEl     = document.getElementById('purchase-year');
const balanceEl          = document.getElementById('fhsa-balance');
const roomEl             = document.getElementById('fhsa-room');
const contributionEl     = document.getElementById('fhsa-contribution');
const lumpSumEl          = document.getElementById('lump-sum');
const frequencyEl        = document.getElementById('contrib-frequency');
const returnEl           = document.getElementById('annual-return');
const annualLimitEl      = document.getElementById('annual-limit');
const inflationEl        = document.getElementById('inflation-rate');
const rrspBalanceEl      = document.getElementById('rrsp-balance');
const homePriceEl        = document.getElementById('home-price');
const downPaymentPctEl   = document.getElementById('down-payment-pct');
const contribSlider      = document.getElementById('contrib-slider');
const overContribWarning = document.getElementById('over-contrib-warning');
const lifetimeWarning    = document.getElementById('lifetime-warning');
const roomAutoBadge      = document.getElementById('room-auto-badge');

const partnerBalanceEl      = document.getElementById('partner-balance');
const partnerContribEl      = document.getElementById('partner-contribution');
const partnerIncomeEl       = document.getElementById('partner-income');

const resultsPlaceholder = document.getElementById('fhsa-results-placeholder');
const resultsContent     = document.getElementById('fhsa-results-content');
const resultSummaryBox   = document.getElementById('result-summary-box');
const resultCelebration  = document.getElementById('result-celebration');
const coupleResultBadge  = document.getElementById('couple-result-badge');

const resultFutureValue     = document.getElementById('result-future-value');
const resultTaxRefund       = document.getElementById('result-tax-refund');
const resultRefundPct       = document.getElementById('result-refund-pct');
const resultTotalContribs   = document.getElementById('result-total-contributions');
const resultGrowth          = document.getElementById('result-investment-growth');
const resultInflation       = document.getElementById('result-inflation-adjusted');
const resultRemainingRoom   = document.getElementById('result-remaining-room');
const resultTotalDownpayment = document.getElementById('result-total-downpayment');
const strategyText          = document.getElementById('strategy-text');

const growthSection      = document.getElementById('growth-section');
const growthToggle       = document.getElementById('growth-toggle');
const growthTableWrapper = document.getElementById('growth-table-wrapper');
const growthTbody        = document.getElementById('growth-tbody');

let coupleMode = false;


/* =============================================
   4. FORMATTING
   ============================================= */
function formatCAD(n) {
  return new Intl.NumberFormat('en-CA', { style:'currency', currency:'CAD', minimumFractionDigits:2, maximumFractionDigits:2 }).format(n);
}
function formatCAD0(n) {
  return new Intl.NumberFormat('en-CA', { style:'currency', currency:'CAD', minimumFractionDigits:0, maximumFractionDigits:0 }).format(n);
}
function formatInputNumber(v) {
  const n = parseFloat(String(v).replace(/[^0-9.]/g,''));
  if (isNaN(n)) return '';
  return new Intl.NumberFormat('en-CA', { minimumFractionDigits:0, maximumFractionDigits:0 }).format(n);
}
function parseInputNumber(v) {
  return parseFloat(String(v).replace(/[^0-9.]/g,'')) || 0;
}


/* =============================================
   5. LIVE FORMATTERS
   ============================================= */
function attachFormatter(el) {
  if (!el) return;
  function fmt() {
    const raw = this.value.replace(/[^0-9]/g,'');
    if (!raw) { this.value=''; return; }
    const num = parseInt(raw,10);
    const formatted = isNaN(num) ? '' : new Intl.NumberFormat('en-CA',{minimumFractionDigits:0,maximumFractionDigits:0}).format(num);
    const sel = this.selectionStart, prev = this.value.length;
    this.value = formatted;
    try { this.setSelectionRange(Math.max(0,sel+(this.value.length-prev)),Math.max(0,sel+(this.value.length-prev))); } catch(e){}
  }
  el.addEventListener('input', fmt);
  el.addEventListener('change', fmt);
}

[incomeEl, balanceEl, roomEl, contributionEl, lumpSumEl, annualLimitEl,
 homePriceEl, partnerBalanceEl, partnerContribEl, partnerIncomeEl, rrspBalanceEl].forEach(attachFormatter);


/* =============================================
   6. DEADLINE BANNER
   ============================================= */
(function updateDeadline() {
  const daysEl = document.getElementById('days-remaining');
  if (!daysEl) return;
  const deadline = new Date(CURRENT_YEAR, 11, 31);
  const today    = new Date();
  const diff     = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  daysEl.textContent = diff > 0 ? diff : '0';
})();


/* =============================================
   7. COUPLE MODE TOGGLE
   ============================================= */
const coupleToggle   = document.getElementById('couple-toggle');
const partnerSection = document.getElementById('partner-section');

function setCoupleMode(active) {
  coupleMode = active;
  coupleToggle.classList.toggle('is-active', active);
  coupleToggle.setAttribute('aria-pressed', active.toString());
  partnerSection.classList.toggle('is-open', active);
}

coupleToggle.addEventListener('click', function () { setCoupleMode(!coupleMode); });
coupleToggle.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCoupleMode(!coupleMode); }
});


/* =============================================
   8. ADVANCED TOGGLE
   ============================================= */
const advancedToggle = document.getElementById('advanced-toggle');
const advancedFields = document.getElementById('advanced-fields');
advancedToggle.addEventListener('click', function () {
  const isOpen = advancedFields.classList.toggle('is-open');
  this.setAttribute('aria-expanded', isOpen.toString());
});


/* =============================================
   9. CONTRIBUTION SLIDER ↔ INPUT SYNC
   ============================================= */
if (contribSlider) {
  contribSlider.addEventListener('input', function () {
    const val = parseInt(this.value);
    contributionEl.value = formatInputNumber(val);
    checkOverContrib();
    if (!resultsContent.classList.contains('hidden')) calculate();
  });
  contributionEl.addEventListener('input', function () {
    const val = parseInputNumber(this.value);
    if (!isNaN(val) && val >= 0 && val <= FHSA_ANNUAL_LIMIT) contribSlider.value = val;
  });
}


/* =============================================
   10. OVER-CONTRIBUTION + LIFETIME CHECK
   ============================================= */
function toAnnualContribution(amount, frequency) {
  switch(frequency) {
    case 'monthly':   return amount * 12;
    case 'biweekly':  return amount * 26;
    case 'weekly':    return amount * 52;
    case 'quarterly': return amount * 4;
    case 'onetime':   return amount;
    default:          return amount;
  }
}

function checkOverContrib() {
  const room     = parseInputNumber(roomEl.value);
  const contrib  = parseInputNumber(contributionEl.value);
  const lump     = parseInputNumber(lumpSumEl.value);
  const freq     = frequencyEl.value;
  const balance  = parseInputNumber(balanceEl.value);

  // Lifetime warning
  const totalSoFar = balance + lump;
  if (totalSoFar > FHSA_LIFETIME_LIMIT * 0.85) {
    lifetimeWarning.classList.add('is-visible');
  } else {
    lifetimeWarning.classList.remove('is-visible');
  }

  if (!room || (!contrib && !lump)) { overContribWarning.classList.remove('is-visible'); return; }

  const annualContrib = toAnnualContribution(contrib, freq);
  const year1Total    = lump + annualContrib;
  const isOver        = year1Total > room;

  if (isOver) {
    const fmt = n => formatCAD0(n);
    let msg = `⚠️ <strong>Over-contribution risk in year 1.</strong> `;
    if (lump > 0) {
      msg += `Lump sum (${fmt(lump)}) + recurring (${fmt(annualContrib)}/year) = <strong>${fmt(year1Total)}</strong>, exceeds your room of <strong>${fmt(room)}</strong>. `;
    } else {
      msg += `Annual contributions of <strong>${fmt(annualContrib)}</strong> exceed your available room of <strong>${fmt(room)}</strong>. `;
    }
    msg += `Excess is penalized at 1%/month by the CRA.`;
    overContribWarning.innerHTML = msg;
  }
  overContribWarning.classList.toggle('is-visible', isOver);
}

[roomEl, contributionEl, lumpSumEl].forEach(el => el && el.addEventListener('input', checkOverContrib));
frequencyEl.addEventListener('change', checkOverContrib);


/* =============================================
   11. PRESETS
   ============================================= */
const PRESETS = {
  firsthome:  { income:70000, province:'ON', age:27, purchaseYear:2030, balance:5000, room:8000, contrib:500, freq:'monthly', return:5, homePrice:550000, dp:10 },
  average:    { income:85000, province:'ON', age:30, purchaseYear:2029, balance:8000, room:8000, contrib:8000, freq:'yearly', return:6, homePrice:700000, dp:10 },
  highincome: { income:160000, province:'ON', age:32, purchaseYear:2028, balance:16000, room:8000, contrib:8000, freq:'yearly', return:7, homePrice:900000, dp:20 },
  aggressive: { income:95000, province:'BC', age:25, purchaseYear:2031, balance:0, room:16000, contrib:8000, freq:'yearly', return:8, homePrice:800000, dp:20 }
};

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const p = PRESETS[this.dataset.preset];
    if (!p) return;

    incomeEl.value         = formatInputNumber(p.income);
    provinceEl.value       = p.province;
    currentAgeEl.value     = p.age;
    purchaseYearEl.value   = p.purchaseYear;
    balanceEl.value        = formatInputNumber(p.balance);
    roomEl.value           = formatInputNumber(p.room);
    contributionEl.value   = formatInputNumber(p.contrib);
    lumpSumEl.value        = formatInputNumber(0);
    frequencyEl.value      = p.freq;
    returnEl.value         = p.return;
    homePriceEl.value      = formatInputNumber(p.homePrice);
    downPaymentPctEl.value = p.dp;
    if (contribSlider) contribSlider.value = Math.min(p.contrib, FHSA_ANNUAL_LIMIT);

    roomAutoBadge.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
    this.classList.add('is-active');

    setCoupleMode(false);
    frequencyEl.dispatchEvent(new Event('change'));
    checkOverContrib();
    calculate();
  });
});


/* =============================================
   12. VALIDATION
   ============================================= */
function setError(el, id, msg) {
  if (!el) return;
  el.classList.add('is-error');
  const e = document.getElementById(id);
  if (e) { e.textContent = msg; e.classList.add('is-visible'); }
}
function clearError(el, id) {
  if (!el) return;
  el.classList.remove('is-error');
  const e = document.getElementById(id);
  if (e) { e.textContent = ''; e.classList.remove('is-visible'); }
}

function validateInputs() {
  let valid = true;

  const income = parseInputNumber(incomeEl.value);
  if (!income || income < 1000) { setError(incomeEl,'annual-income-error','Please enter a valid income.'); valid=false; }
  else clearError(incomeEl,'annual-income-error');

  const age = parseInt(currentAgeEl.value);
  if (isNaN(age)||age<18||age>70) { setError(currentAgeEl,'current-age-error','Please enter your age (18–70).'); valid=false; }
  else clearError(currentAgeEl,'current-age-error');

  const purchaseYear = parseInt(purchaseYearEl.value);
  if (isNaN(purchaseYear)||purchaseYear<CURRENT_YEAR||purchaseYear>2060) { setError(purchaseYearEl,'purchase-year-error','Please enter a valid purchase year.'); valid=false; }
  else clearError(purchaseYearEl,'purchase-year-error');

  const balance = parseInputNumber(balanceEl.value);
  if (isNaN(balance)||balance<0) { setError(balanceEl,'fhsa-balance-error','Please enter a valid balance.'); valid=false; }
  else clearError(balanceEl,'fhsa-balance-error');

  const annualReturn = parseFloat(returnEl.value);
  if (isNaN(annualReturn)||annualReturn<0||annualReturn>30) { setError(returnEl,'annual-return-error','Please enter a return between 0–30%.'); valid=false; }
  else clearError(returnEl,'annual-return-error');

  if (!valid) return { valid:false };

  return {
    valid: true,
    values: {
      income,
      province:      provinceEl.value,
      age,
      purchaseYear,
      balance,
      room:          parseInputNumber(roomEl.value),
      contribution:  parseInputNumber(contributionEl.value),
      lumpSum:       parseInputNumber(lumpSumEl.value),
      frequency:     frequencyEl.value,
      annualReturn,
      annualLimit:   parseInputNumber(annualLimitEl.value) || FHSA_ANNUAL_LIMIT,
      inflationRate: parseFloat(inflationEl.value) || 2.1,
      rrspBalance:   parseInputNumber(rrspBalanceEl.value),
      homePrice:     parseInputNumber(homePriceEl.value),
      downPaymentPct: parseFloat(downPaymentPctEl.value) || 10,
      partnerBalance:      coupleMode ? parseInputNumber(partnerBalanceEl.value) : 0,
      partnerContribution: coupleMode ? parseInputNumber(partnerContribEl.value) : 0,
      partnerIncome:       coupleMode ? parseInputNumber(partnerIncomeEl.value) : 0,
      coupleMode
    }
  };
}


/* =============================================
   13. CORE FHSA PROJECTION MATH
   ============================================= */
function projectFhsa(values) {
  const { balance, room, contribution, lumpSum, frequency, annualReturn,
          annualLimit, purchaseYear, age, coupleMode,
          partnerBalance, partnerContribution } = values;

  const years         = Math.max(purchaseYear - CURRENT_YEAR, 1);
  const rate          = annualReturn / 100;
  const annualContrib = toAnnualContribution(contribution, frequency);

  let currentBalance       = balance;
  let currentRoom          = Math.min(room, FHSA_LIFETIME_LIMIT - balance);
  let lifetimeContributed  = balance;
  let totalContributions   = 0;
  const schedule           = [];
  const milestones         = { 25000:null, 40000:null, 50000:null, 75000:null, 100000:null };
  // Custom target milestone handled after
  let carryForward         = 0;

  for (let y = 1; y <= years; y++) {
    const calYear   = CURRENT_YEAR + y;
    const currentAge = age + y;

    // Add new room (capped by lifetime and carry-forward rules)
    if (y > 1) {
      const newRoom = Math.min(annualLimit, FHSA_LIFETIME_LIMIT - lifetimeContributed);
      // Carry-forward: can add up to annualLimit of unused room from prior year
      const totalRoom = Math.min(newRoom + Math.min(carryForward, annualLimit), FHSA_LIFETIME_LIMIT - lifetimeContributed);
      currentRoom     = Math.max(0, totalRoom);
    }

    // Year 1: lump sum first
    let actualContrib = 0;
    if (y === 1 && lumpSum > 0) {
      const lumpActual     = Math.min(lumpSum, currentRoom);
      currentRoom         -= lumpActual;
      lifetimeContributed += lumpActual;
      totalContributions  += lumpActual;
      actualContrib       += lumpActual;
    }

    // Regular contribution — cap at room and lifetime
    const yearContrib    = (frequency === 'onetime' && y > 1) ? 0 : Math.min(annualContrib, currentRoom);
    const regularActual  = Math.min(yearContrib, FHSA_LIFETIME_LIMIT - lifetimeContributed);
    currentRoom         -= regularActual;
    lifetimeContributed += regularActual;
    totalContributions  += regularActual;
    actualContrib       += regularActual;

    // Track carry-forward (unused annual room)
    carryForward = Math.max(0, annualLimit - actualContrib);

    // Growth
    const growthBase   = currentBalance + actualContrib * 0.5;
    const yearGrowth   = growthBase * rate;
    currentBalance     = currentBalance + actualContrib + yearGrowth;

    // Milestones
    if (!milestones[25000]  && currentBalance >= 25000)  milestones[25000]  = calYear;
    if (!milestones[40000]  && currentBalance >= 40000)  milestones[40000]  = calYear;
    if (!milestones[50000]  && currentBalance >= 50000)  milestones[50000]  = calYear;
    if (!milestones[75000]  && currentBalance >= 75000)  milestones[75000]  = calYear;
    if (!milestones[100000] && currentBalance >= 100000) milestones[100000] = calYear;

    schedule.push({
      year: calYear, age: currentAge,
      contribution: actualContrib,
      growth: yearGrowth,
      balance: currentBalance,
      roomRemaining: Math.max(0, FHSA_LIFETIME_LIMIT - lifetimeContributed)
    });
  }

  // Partner projection (simple — same rate)
  let partnerFinal = 0;
  if (coupleMode && partnerContribution > 0) {
    let pb = partnerBalance;
    let pLifetime = partnerBalance;
    for (let y = 1; y <= years; y++) {
      const pRoom   = Math.min(annualLimit, FHSA_LIFETIME_LIMIT - pLifetime);
      const pContrib = Math.min(partnerContribution, pRoom);
      pLifetime += pContrib;
      pb = pb + pContrib + (pb + pContrib * 0.5) * rate;
    }
    partnerFinal = pb;
  }

  return {
    schedule,
    milestones,
    totalContributions,
    finalBalance: currentBalance,
    partnerFinal,
    lifetimeContributed,
    remainingRoom: Math.max(0, FHSA_LIFETIME_LIMIT - lifetimeContributed)
  };
}

function inflationAdjust(fv, rate, years) {
  if (rate <= 0) return fv;
  return fv / Math.pow(1 + rate / 100, years);
}


/* =============================================
   14. STRATEGY TEXT
   ============================================= */
function getStrategyText(income, province, finalBalance, targetDP, purchaseYear) {
  const marginalRate = getMarginalRate(income, province);
  const marginalPct  = Math.round(marginalRate * 100);
  const yearsLeft    = purchaseYear - CURRENT_YEAR;
  const onTrack      = finalBalance >= targetDP;

  if (income >= 120000) {
    return `At your income level (${marginalPct}% marginal bracket), the FHSA provides an outstanding immediate tax deduction — every $8,000 contribution could save you approximately ${formatCAD0(8000 * marginalRate)} in taxes this year. Maximize your FHSA before any other savings account.`;
  } else if (onTrack) {
    return `You're on track to reach your down payment goal by ${purchaseYear}. Keep contributing consistently and consider putting your annual tax refund back into your FHSA to accelerate growth.`;
  } else if (yearsLeft <= 3) {
    return `With only ${yearsLeft} years until your target purchase, consider using more conservative investments (GICs, bond ETFs) to protect your savings from short-term market swings. Maximize your contributions and your partner's FHSA if applicable.`;
  }
  return `Your FHSA combines tax-deductible contributions and tax-free withdrawals — the best of both the RRSP and TFSA for home buyers. Maximize your $8,000/year contributions and consider reinvesting your annual tax refund to reach your goal faster.`;
}


/* =============================================
   15. RENDER RESULTS
   ============================================= */
function renderTimelineItem(id, yearId, subId, year, currentBalance, threshold, isCustom) {
  const card   = document.getElementById(id);
  const yearEl = document.getElementById(yearId);
  const subEl  = document.getElementById(subId);
  if (!card || !yearEl) return;

  const reached   = currentBalance >= threshold;
  const yearsAway = year ? year - CURRENT_YEAR : null;

  if (year) {
    yearEl.textContent = year;
    if (subEl) subEl.textContent = reached ? 'Already reached ✓' : `${yearsAway} year${yearsAway === 1 ? '' : 's'} away`;
    card.classList.toggle('is-reached', reached);
    if (isCustom) card.classList.add('is-target');
    card.style.display = '';
  } else {
    yearEl.textContent = 'N/A';
    if (subEl) subEl.textContent = 'beyond your savings horizon';
    card.classList.remove('is-reached', 'is-target');
    card.style.display = '';
  }
}

function renderResults(data, values) {
  const { schedule, milestones, totalContributions, finalBalance, partnerFinal, remainingRoom, lifetimeContributed } = data;
  const { income, province, age, purchaseYear, inflationRate, rrspBalance,
          homePrice, downPaymentPct, partnerIncome, coupleMode, contribution } = values;

  const years         = purchaseYear - CURRENT_YEAR;
  const targetDP      = homePrice * (downPaymentPct / 100);
  const combinedValue = finalBalance + (coupleMode ? partnerFinal : 0);
  const hbpAvailable  = Math.min(rrspBalance, HBP_MAX);
  const totalForDP    = combinedValue + hbpAvailable;
  const progressPct   = Math.min(100, Math.round((combinedValue / targetDP) * 100));
  const inflationValue = inflationAdjust(finalBalance, inflationRate, years);
  const investGrowth  = finalBalance - totalContributions - parseInputNumber(balanceEl.value);
  const taxRefund     = estimateTaxRefund(income, parseInputNumber(contributionEl.value), province);
  const refundPct     = contribution > 0 ? Math.round((taxRefund / contribution) * 100) : 0;
  const partnerRefund = coupleMode && partnerIncome ? estimateTaxRefund(partnerIncome, parseInputNumber(partnerContribEl.value), province) : 0;

  // Show results
  resultsPlaceholder.classList.add('hidden');
  resultsContent.classList.remove('hidden');

  // Couple badge
  coupleResultBadge.classList.toggle('hidden', !coupleMode);

  // Summary pills
  const freqLabel = { yearly:'annually', monthly:'monthly', biweekly:'bi-weekly', weekly:'weekly', quarterly:'quarterly', onetime:'one-time' }[values.frequency] || 'annually';
  const contribText = values.frequency === 'onetime' ? `${formatCAD(values.contribution)} one-time` : `${formatCAD(values.contribution)} / ${freqLabel}`;
  if (resultSummaryBox) {
    resultSummaryBox.innerHTML = `
      <p style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:var(--space-3);">Your projection is based on</p>
      <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);">
        <span class="summary-tag">🏠 Buy in ${purchaseYear}</span>
        <span class="summary-tag">💰 ${contribText}</span>
        <span class="summary-tag">📈 ${values.annualReturn}% return</span>
        ${coupleMode ? '<span class="summary-tag">💑 Couple Mode</span>' : ''}
      </div>`;
    resultSummaryBox.classList.remove('hidden');
  }

  // Celebration
  let celebMsg = '';
  if (combinedValue >= targetDP) celebMsg = `🎉 <strong>You're on track!</strong> Your FHSA${coupleMode ? 's' : ''} could cover your entire ${downPaymentPct}% down payment by ${purchaseYear}.`;
  else if (progressPct >= 80) celebMsg = `✅ <strong>Almost there!</strong> You're ${progressPct}% of the way to your down payment goal.`;
  else if (finalBalance >= 40000) celebMsg = `🎉 Your FHSA could reach the <strong>$40,000 lifetime maximum</strong> — fully maximized tax-free!`;
  if (celebMsg) { resultCelebration.innerHTML = celebMsg; resultCelebration.classList.remove('hidden'); }
  else resultCelebration.classList.add('hidden');

  // Big value
  resultFutureValue.textContent = formatCAD(combinedValue);
  document.getElementById('fhsa-value-label').textContent = coupleMode ? 'Combined FHSA Value' : 'Future FHSA Value';

  // Down payment progress
  const progressBar = document.getElementById('progress-bar');
  const progressPctEl = document.getElementById('progress-pct');
  if (progressBar) { progressBar.style.width = `${progressPct}%`; progressBar.classList.toggle('is-success', progressPct >= 100); }
  if (progressPctEl) { progressPctEl.textContent = `${progressPct}%`; progressPctEl.classList.toggle('is-success', progressPct >= 100); }

  const needed = Math.max(0, targetDP - combinedValue);
  const monthsLeft = years * 12;
  const extraNeededPerMonth = needed > 0 && monthsLeft > 0 ? needed / monthsLeft : 0;

  let statusMsg = '';
  if (progressPct >= 100) statusMsg = `✅ You're on track to cover your full down payment by ${purchaseYear}!`;
  else if (extraNeededPerMonth > 0) statusMsg = `You need approximately ${formatCAD0(extraNeededPerMonth)}/month more to reach your goal by ${purchaseYear}.`;
  else statusMsg = `Keep contributing consistently to reach your goal.`;

  const progStatus = document.getElementById('progress-status');
  if (progStatus) progStatus.textContent = statusMsg;
  const progFhsa = document.getElementById('prog-fhsa');
  const progTarget = document.getElementById('prog-target');
  const progNeeded = document.getElementById('prog-needed');
  const progHbp    = document.getElementById('prog-hbp');
  if (progFhsa)   progFhsa.textContent   = formatCAD(combinedValue);
  if (progTarget) progTarget.textContent = formatCAD(targetDP);
  if (progNeeded) progNeeded.textContent = needed > 0 ? formatCAD(needed) : '✅ Goal reached';
  if (progHbp)    progHbp.textContent    = hbpAvailable > 0 ? formatCAD(hbpAvailable) : 'N/A';

  // Tax refund hero
  let refundDisplay = formatCAD(taxRefund);
  if (coupleMode && partnerRefund > 0) refundDisplay = `${formatCAD(taxRefund)} + ${formatCAD(partnerRefund)} = ${formatCAD(taxRefund + partnerRefund)}`;
  resultTaxRefund.textContent = coupleMode && partnerRefund > 0 ? formatCAD(taxRefund + partnerRefund) : formatCAD(taxRefund);
  if (resultRefundPct) resultRefundPct.textContent = `You're getting back ${refundPct}% of your contribution${coupleMode ? ' (combined)' : ''}`;

  // Summary rows
  resultTotalContribs.textContent   = formatCAD(totalContributions);
  resultGrowth.textContent          = formatCAD(Math.max(0, investGrowth));
  resultInflation.textContent       = formatCAD(inflationValue);
  resultRemainingRoom.textContent   = formatCAD(remainingRoom);
  resultTotalDownpayment.textContent = formatCAD(totalForDP);

  // HBP card
  const hbpFhsaEl   = document.getElementById('hbp-fhsa-amount');
  const hbpRrspEl   = document.getElementById('hbp-rrsp-amount');
  const hbpTotalEl  = document.getElementById('hbp-total');
  const hbpPartnerRow   = document.getElementById('hbp-couple-row');
  const hbpPartnerEl    = document.getElementById('hbp-partner-amount');
  if (hbpFhsaEl)  hbpFhsaEl.textContent  = formatCAD(finalBalance);
  if (hbpRrspEl)  hbpRrspEl.textContent  = hbpAvailable > 0 ? formatCAD(hbpAvailable) : 'N/A';
  if (hbpTotalEl) hbpTotalEl.textContent = formatCAD(totalForDP);
  if (coupleMode && partnerFinal > 0 && hbpPartnerRow && hbpPartnerEl) {
    hbpPartnerRow.style.display = '';
    hbpPartnerEl.style.display  = '';
    hbpPartnerEl.textContent    = formatCAD(partnerFinal);
  } else if (hbpPartnerRow) {
    hbpPartnerRow.style.display = 'none';
  }

  // Timeline milestones
  renderTimelineItem('tl-25k', 'tl-25k-year', 'tl-25k-sub', milestones[25000],  finalBalance, 25000,  false);
  renderTimelineItem('tl-40k', 'tl-40k-year', 'tl-40k-sub', milestones[40000],  finalBalance, 40000,  false);
  renderTimelineItem('tl-50k', 'tl-50k-year', 'tl-50k-sub', milestones[50000],  finalBalance, 50000,  false);
  renderTimelineItem('tl-75k', 'tl-75k-year', 'tl-75k-sub', milestones[75000],  finalBalance, 75000,  false);

  // Custom target (if different from above)
  const customTargets = [25000, 40000, 50000, 75000];
  if (targetDP > 0 && !customTargets.includes(targetDP)) {
    const targetCard  = document.getElementById('tl-target');
    const targetLabel = document.getElementById('tl-target-label');
    const targetYear  = document.getElementById('tl-target-year');
    const targetSub   = document.getElementById('tl-target-sub');
    if (targetCard) {
      targetCard.style.display = '';
      if (targetLabel) targetLabel.textContent = `${formatCAD0(targetDP)} (your goal)`;
      // Find year when balance hits target
      const hitYear = schedule.find(r => r.balance >= targetDP);
      if (hitYear) {
        if (targetYear) targetYear.textContent = hitYear.year;
        if (targetSub)  targetSub.textContent  = `${hitYear.year - CURRENT_YEAR} years away`;
        targetCard.classList.toggle('is-reached', finalBalance >= targetDP);
        targetCard.classList.add('is-target');
      } else {
        if (targetYear) targetYear.textContent = 'N/A';
        if (targetSub)  targetSub.textContent  = 'beyond your horizon';
      }
    }
  }

  // Strategy
  if (strategyText) strategyText.textContent = getStrategyText(income, province, combinedValue, targetDP, purchaseYear);

  // Store for copy
  window._fhsaResults = {
    futureValue: formatCAD(combinedValue),
    taxRefund: formatCAD(taxRefund + partnerRefund),
    totalContribs: formatCAD(totalContributions),
    downPaymentTotal: formatCAD(totalForDP),
    progressPct: `${progressPct}%`
  };

  // Growth table
  growthTbody.innerHTML = '';
  schedule.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.year}</td>
      <td>${row.age}</td>
      <td>${formatCAD(row.contribution)}</td>
      <td class="td-growth">${formatCAD(row.growth)}</td>
      <td>${formatCAD(row.balance)}</td>
      <td>${formatCAD(row.roomRemaining)}</td>
    `;
    growthTbody.appendChild(tr);
  });
  growthSection.removeAttribute('hidden');

  if (window.innerWidth < 900) {
    resultsContent.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }
}

growthToggle.addEventListener('click', function () {
  const isOpen = growthTableWrapper.classList.toggle('is-open');
  this.setAttribute('aria-expanded', isOpen.toString());
});


/* =============================================
   16. CALCULATE
   ============================================= */
function calculate() {
  const result = validateInputs();
  if (!result.valid) return;
  const data = projectFhsa(result.values);
  renderResults(data, result.values);
}

form.addEventListener('submit', function (e) { e.preventDefault(); calculate(); });
form.querySelectorAll('input, select').forEach(el => {
  el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); calculate(); } });
});


/* =============================================
   17. COPY RESULTS
   ============================================= */
const copyBtn = document.getElementById('copy-results-btn');
if (copyBtn) {
  copyBtn.addEventListener('click', function () {
    const r = window._fhsaResults;
    if (!r) return;
    const text = [
      '🏠 My FHSA Projection — Northern Numbers',
      '─────────────────────────',
      `💰 Tax Refund This Year:   ${r.taxRefund}`,
      `📈 Future FHSA Value:      ${r.futureValue}`,
      `🏠 Total for Down Payment: ${r.downPaymentTotal}`,
      `💵 Total Contributions:    ${r.totalContribs}`,
      `📊 Progress to Goal:       ${r.progressPct}`,
      '─────────────────────────',
      'Calculated at northernnumbers.ca/fhsa/'
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = '✅ Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => { copyBtn.textContent = '📋 Copy Results to Clipboard'; copyBtn.classList.remove('copied'); }, 2500);
    }).catch(() => { copyBtn.textContent = 'Copy not supported in this browser'; });
  });
}


/* =============================================
   18. RESET
   ============================================= */
document.getElementById('fhsa-reset-btn')?.addEventListener('click', function () {
  incomeEl.value         = formatInputNumber(85000);
  provinceEl.value       = 'ON';
  currentAgeEl.value     = '28';
  purchaseYearEl.value   = '2030';
  balanceEl.value        = formatInputNumber(0);
  roomEl.value           = formatInputNumber(8000);
  contributionEl.value   = formatInputNumber(8000);
  lumpSumEl.value        = formatInputNumber(0);
  frequencyEl.value      = 'yearly';
  returnEl.value         = '6';
  homePriceEl.value      = formatInputNumber(650000);
  downPaymentPctEl.value = '10';
  if (contribSlider) contribSlider.value = 8000;
  if (partnerBalanceEl) partnerBalanceEl.value = formatInputNumber(0);
  if (partnerContribEl) partnerContribEl.value = formatInputNumber(8000);
  if (partnerIncomeEl)  partnerIncomeEl.value  = formatInputNumber(75000);

  roomAutoBadge.classList.add('hidden');
  overContribWarning.classList.remove('is-visible');
  lifetimeWarning.classList.remove('is-visible');
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
  setCoupleMode(false);

  resultsPlaceholder.classList.remove('hidden');
  resultsContent.classList.add('hidden');
  growthSection.setAttribute('hidden','');
  if (resultSummaryBox) resultSummaryBox.classList.add('hidden');
  if (resultCelebration) resultCelebration.classList.add('hidden');
});


/* =============================================
   19. INIT
   ============================================= */
(function init() {
  incomeEl.value       = formatInputNumber(85000);
  balanceEl.value      = formatInputNumber(0);
  roomEl.value         = formatInputNumber(8000);
  contributionEl.value = formatInputNumber(8000);
  lumpSumEl.value      = formatInputNumber(0);
  homePriceEl.value    = formatInputNumber(650000);
  if (annualLimitEl)   annualLimitEl.value = formatInputNumber(8000);
  if (rrspBalanceEl)   rrspBalanceEl.value = formatInputNumber(0);
  checkOverContrib();
})();

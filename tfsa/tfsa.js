/* =============================================
   NORTHERN NUMBERS — tfsa.js
   Canadian TFSA Calculator Logic

   Key Canadian TFSA rules:
   - Annual limit: $7,000 for 2024, 2025, 2026
   - Unused room carries forward indefinitely
   - Withdrawals restore room on Jan 1 of following year
   - Over-contribution penalty: 1% per month on excess
   - Lifetime room in 2026 (eligible since 2009): $95,000

   Contribution timing (approved):
   - One-Time Contribution Today: Year 1 only, capped at available room
   - Annual Contribution: begins Year 2, when CRA adds new room each January
   - No false over-contribution warning when lump sum = available room

   SHARED FRAMEWORK: uses NNUtils for all formatting, parsing,
   slider sync, and error handling. tfsa.js MUST load last in
   index.html so NNUtils is always available.
   ============================================= */
'use strict';

/* ── CRA annual limits ───────────────────────────────────────── */
const TFSA_LIMITS = {
  2009:5000,2010:5000,2011:5000,2012:5000,
  2013:5500,2014:5500,2015:10000,
  2016:5500,2017:5500,2018:5500,
  2019:6000,2020:6000,2021:6000,
  2022:6000,2023:6500,2024:7000,2025:7000,2026:7000
};
const CURRENT_YEAR = new Date().getFullYear();

function calcLifetimeRoom(birthYear) {
  const first = Math.max(birthYear + 18, 2009);
  if (first > CURRENT_YEAR) return 0;
  let total = 0;
  for (let y = first; y <= CURRENT_YEAR; y++) total += (TFSA_LIMITS[y] || 7000);
  return total;
}

function toAnnualContribution(amount, frequency) {
  switch (frequency) {
    case 'monthly':  return amount * 12;
    case 'biweekly': return amount * 26;
    case 'weekly':   return amount * 52;
    case 'onetime':  return amount;
    default:         return amount;
  }
}

/* ── Everything inside DOMContentLoaded so NNUtils is available ── */
document.addEventListener('DOMContentLoaded', function () {

  /* DOM refs */
  const form               = document.getElementById('tfsa-form');
  const balanceEl          = document.getElementById('current-balance');
  const roomEl             = document.getElementById('contrib-room');
  const contributionEl     = document.getElementById('contribution');
  const frequencyEl        = document.getElementById('contrib-frequency');
  const returnEl           = document.getElementById('annual-return');
  const returnSlider       = document.getElementById('return-slider');
  const returnCaution      = document.getElementById('return-high-caution');
  const horizonEl          = document.getElementById('time-horizon');
  const annualLimitEl      = document.getElementById('annual-limit');
  const inflationEl        = document.getElementById('inflation-rate');
  const overContribWarning = document.getElementById('over-contrib-warning');
  const lumpSumEl          = document.getElementById('lump-sum');
  const pastContribEl      = document.getElementById('past-contributions');
  const birthYearEl        = document.getElementById('birth-year');
  const roomAutoBadge      = document.getElementById('room-auto-badge');
  const resultsPlaceholder = document.getElementById('tfsa-results-placeholder');
  const resultsContent     = document.getElementById('tfsa-results-content');
  const resultFutureValue  = document.getElementById('result-future-value');
  const resultTotalContribs= document.getElementById('result-total-contributions');
  const resultGrowth       = document.getElementById('result-investment-growth');
  const resultRemainingRoom= document.getElementById('result-remaining-room');
  const resultInflation    = document.getElementById('result-inflation-adjusted');
  const resultSummaryBox   = document.getElementById('result-summary-box');
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

  /* ── 1. FORMATTING — NNUtils exclusively ──────────────────── */
  NNUtils.attachFormatters(balanceEl, roomEl, contributionEl, annualLimitEl);
  if (lumpSumEl)     NNUtils.attachFormatter(lumpSumEl);
  if (pastContribEl) NNUtils.attachFormatter(pastContribEl);

  /* ── 2. RETURN SLIDER — NNUtils.syncSlider ────────────────── */
  if (returnSlider && returnEl) {
    /* NNUtils.syncSlider handles slider→input direction */
    NNUtils.syncSlider(returnEl, returnSlider, {
      onChange: function(val) {
        if (returnCaution) returnCaution.classList.toggle('hidden', val <= 10);
      }
    });
    /* Number input → slider + caution (typing direction) */
    returnEl.addEventListener('input', function() {
      const val = parseFloat(this.value);
      if (!isNaN(val)) returnSlider.value = Math.min(Math.max(val, 0), 15);
      if (returnCaution) returnCaution.classList.toggle('hidden', isNaN(val) || val <= 10);
    });
  }

  /* ── 3. AUTO-CALC ROOM FROM BIRTH YEAR ────────────────────── */
  function autoCalcRoom() {
    const raw = birthYearEl ? birthYearEl.value.replace(/\D/g,'') : '';
    if (!raw || raw.length < 4) {
      if (roomAutoBadge) roomAutoBadge.classList.add('hidden');
      return;
    }
    const yr = parseInt(raw);
    if (isNaN(yr) || yr < 1940 || yr > 2008) {
      if (roomAutoBadge) roomAutoBadge.classList.add('hidden');
      return;
    }
    const lifetimeRoom  = calcLifetimeRoom(yr);
    if (lifetimeRoom <= 0) return;
    const pastContribs  = NNUtils.parseInputNumber(pastContribEl ? pastContribEl.value : '0');
    const remaining     = Math.max(0, lifetimeRoom - pastContribs);
    roomEl.value        = NNUtils.formatInputNumber(remaining);
    if (roomAutoBadge) roomAutoBadge.classList.remove('hidden');
    checkOverContrib();
  }

  if (birthYearEl)   birthYearEl.addEventListener('input', autoCalcRoom);
  if (pastContribEl) pastContribEl.addEventListener('input', autoCalcRoom);

  /* ── 4. ADVANCED TOGGLE ───────────────────────────────────── */
  NNUtils.initAdvancedToggle('advanced-toggle', 'advanced-fields');

  /* ── 5. PRESETS ───────────────────────────────────────────── */
  const PRESETS = {
    starter:   { balance:0,     room:95000, contribution:500,  frequency:'monthly',  annualReturn:4, horizon:20 },
    consistent:{ balance:10000, room:50000, contribution:7000, frequency:'yearly',   annualReturn:6, horizon:20 },
    aggressive:{ balance:25000, room:30000, contribution:7000, frequency:'yearly',   annualReturn:8, horizon:25 }
  };

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const p = PRESETS[this.dataset.preset];
      if (!p) return;
      balanceEl.value      = NNUtils.formatInputNumber(p.balance);
      roomEl.value         = NNUtils.formatInputNumber(p.room);
      contributionEl.value = NNUtils.formatInputNumber(p.contribution);
      returnEl.value       = p.annualReturn;
      horizonEl.value      = p.horizon;
      frequencyEl.value    = p.frequency;
      if (returnSlider)  returnSlider.value = p.annualReturn;
      if (returnCaution) returnCaution.classList.toggle('hidden', p.annualReturn <= 10);
      if (lumpSumEl)     lumpSumEl.value     = NNUtils.formatInputNumber(0);
      if (pastContribEl) pastContribEl.value = NNUtils.formatInputNumber(0);
      if (birthYearEl)   birthYearEl.value   = '';
      if (roomAutoBadge) roomAutoBadge.classList.add('hidden');
      annualLimitEl.value = NNUtils.formatInputNumber(7000);
      if (inflationEl) inflationEl.value = '2.1';
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
      this.classList.add('is-active');
      checkOverContrib();
      calculate();
    });
  });

  /* ── 6. OVER-CONTRIBUTION CHECK ───────────────────────────── */
  function checkOverContrib() {
    if (!overContribWarning) return;
    const room         = NNUtils.parseInputNumber(roomEl.value);
    const contribution = NNUtils.parseInputNumber(contributionEl.value);
    const frequency    = frequencyEl.value;
    const lumpSum      = NNUtils.parseInputNumber(lumpSumEl ? lumpSumEl.value : '0');
    const annualLimit  = NNUtils.parseInputNumber(annualLimitEl ? annualLimitEl.value : '7000') || 7000;

    if (!room || (!contribution && !lumpSum)) {
      overContribWarning.classList.remove('is-visible');
      overContribWarning.innerHTML = '';
      return;
    }

    const annualContrib = frequency === 'onetime'
      ? contribution
      : toAnnualContribution(contribution, frequency);

    /* Intended pattern: lump today ≤ room AND annual ≤ new CRA room → no warning */
    if (lumpSum > 0 && lumpSum <= room + 0.01 && annualContrib <= annualLimit + 0.01) {
      overContribWarning.classList.remove('is-visible');
      overContribWarning.innerHTML = '';
      return;
    }

    const f = n => NNUtils.formatCAD0(n);
    let isOver = false, msg = '';
    if (lumpSum > room) {
      isOver = true;
      msg = `⚠️ <strong>Heads up — possible over-contribution.</strong> Your one-time contribution of <strong>${f(lumpSum)}</strong> exceeds your available room of <strong>${f(room)}</strong>. The CRA charges 1% per month on the excess.`;
    } else if (lumpSum === 0 && annualContrib > room) {
      isOver = true;
      msg = `⚠️ <strong>Heads up — possible over-contribution in Year 1.</strong> Your annual contributions total <strong>${f(annualContrib)}/year</strong>, which exceeds your available room of <strong>${f(room)}</strong>.`;
    } else if (lumpSum > 0 && annualContrib > annualLimit + 0.01) {
      isOver = true;
      msg = `⚠️ <strong>Annual contribution may exceed new CRA room.</strong> After your one-time contribution, the CRA adds <strong>${f(annualLimit)}</strong> each January. Your annual amount of <strong>${f(annualContrib)}</strong> exceeds this.`;
    }

    overContribWarning.innerHTML = msg;
    overContribWarning.classList.toggle('is-visible', isOver);
  }

  roomEl.addEventListener('input',         checkOverContrib);
  contributionEl.addEventListener('input', checkOverContrib);
  frequencyEl.addEventListener('change',   checkOverContrib);
  if (lumpSumEl) lumpSumEl.addEventListener('input', checkOverContrib);

  /* ── 7. VALIDATION ────────────────────────────────────────── */
  function validateInputs() {
    let valid = true;
    const balance = NNUtils.parseInputNumber(balanceEl.value);
    if (isNaN(balance) || balance < 0) {
      NNUtils.setError(balanceEl,'current-balance-error','Enter 0 or your current balance.'); valid=false;
    } else { NNUtils.clearError(balanceEl,'current-balance-error'); }

    const room = NNUtils.parseInputNumber(roomEl.value);
    if (isNaN(room) || room < 0) {
      NNUtils.setError(roomEl,'contrib-room-error','Enter your available contribution room.'); valid=false;
    } else { NNUtils.clearError(roomEl,'contrib-room-error'); }

    const contribution = NNUtils.parseInputNumber(contributionEl.value);
    if (isNaN(contribution) || contribution < 0) {
      NNUtils.setError(contributionEl,'contribution-error','Enter 0 or your annual contribution.'); valid=false;
    } else { NNUtils.clearError(contributionEl,'contribution-error'); }

    const annualReturn = parseFloat(returnEl.value);
    if (isNaN(annualReturn) || annualReturn < 0 || annualReturn > 30) {
      NNUtils.setError(returnEl,'annual-return-error','Enter a return between 0% and 30%.'); valid=false;
    } else { NNUtils.clearError(returnEl,'annual-return-error'); }

    const horizon = parseInt(horizonEl.value);
    if (isNaN(horizon) || horizon < 1 || horizon > 60) {
      NNUtils.setError(horizonEl,'time-horizon-error','Enter a period between 1 and 60 years.'); valid=false;
    } else { NNUtils.clearError(horizonEl,'time-horizon-error'); }

    if (!valid) return { valid:false };
    return {
      valid:true,
      values:{
        balance, room, contribution,
        frequency:    frequencyEl.value,
        annualReturn,
        horizon,
        annualLimit:  NNUtils.parseInputNumber(annualLimitEl.value) || 7000,
        inflationRate:parseFloat(inflationEl ? inflationEl.value : '0') || 0,
        lumpSum:      NNUtils.parseInputNumber(lumpSumEl ? lumpSumEl.value : '0')
      }
    };
  }

  /* ── 8. PROJECTION ENGINE — unchanged ────────────────────── */
  function projectTfsa(balance, room, contribution, frequency, annualReturn, horizon, annualLimit, lumpSum) {
    lumpSum = lumpSum || 0;
    const annualContrib = toAnnualContribution(contribution, frequency);
    const rate          = annualReturn / 100;
    const currentYear   = new Date().getFullYear();
    let currentBalance  = balance;
    let currentRoom     = room;
    let totalContributions = 0;
    const schedule      = [];
    const milestones    = { 100000:null, 250000:null, 500000:null };

    for (let y = 1; y <= horizon; y++) {
      if (y > 1) currentRoom += annualLimit;

      let actualContrib = 0;
      if (y === 1 && lumpSum > 0) {
        const lumpActual   = Math.min(lumpSum, currentRoom);
        currentRoom       -= lumpActual;
        totalContributions+= lumpActual;
        actualContrib     += lumpActual;
      }

      const yearContrib   = (frequency === 'onetime' && y > 1) ? 0 : annualContrib;
      const regularActual = Math.min(yearContrib, currentRoom);
      currentRoom        -= regularActual;
      totalContributions += regularActual;
      actualContrib      += regularActual;

      const growthBase = currentBalance + actualContrib * 0.5;
      const yearGrowth = growthBase * rate;
      currentBalance   = currentBalance + actualContrib + yearGrowth;

      const calYear = currentYear + y;
      if (!milestones[100000] && currentBalance >= 100000) milestones[100000] = calYear;
      if (!milestones[250000] && currentBalance >= 250000) milestones[250000] = calYear;
      if (!milestones[500000] && currentBalance >= 500000) milestones[500000] = calYear;

      schedule.push({ year:calYear, contribution:actualContrib, growth:yearGrowth, balance:currentBalance, roomRemaining:currentRoom });
    }

    return { schedule, milestones, totalContributions, finalBalance:currentBalance,
             remainingRoom: schedule[schedule.length-1]?.roomRemaining ?? 0 };
  }

  function inflationAdjust(fv, rate, years) {
    if (rate <= 0) return fv;
    return fv / Math.pow(1 + rate/100, years);
  }

  /* ── 9. SUMMARY BOX ──────────────────────────────────────── */
  function renderSummaryBox(contribution, frequency, horizon, annualReturn, lumpSum) {
    if (!resultSummaryBox) return;
    const freqLabel = { yearly:'annually', monthly:'monthly', biweekly:'bi-weekly', weekly:'weekly', onetime:'one-time' }[frequency] || 'annually';
    const tags = [];
    if (lumpSum > 0) tags.push(`<span class="summary-tag">💵 ${NNUtils.formatCAD(lumpSum)} today</span>`);
    if (frequency !== 'onetime' && contribution > 0) {
      const start = lumpSum > 0 ? 'from Year 2' : freqLabel;
      tags.push(`<span class="summary-tag">💰 ${NNUtils.formatCAD(contribution)} / ${start}</span>`);
    } else if (frequency === 'onetime' && !lumpSum) {
      tags.push(`<span class="summary-tag">💰 ${NNUtils.formatCAD(contribution)} one-time</span>`);
    }
    tags.push(`<span class="summary-tag">📈 ${annualReturn}% return</span>`);
    tags.push(`<span class="summary-tag">📅 ${horizon} years</span>`);
    resultSummaryBox.innerHTML = `
      <p style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:var(--space-3);">Your projection is based on</p>
      <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);">${tags.join('')}</div>`;
    resultSummaryBox.classList.remove('hidden');
  }

  /* ── 10. MILESTONES ──────────────────────────────────────── */
  function renderMilestone(cardEl, yearEl, textEl, amount, year, finalBalance) {
    if (!cardEl) return;
    const label = '$' + amount.toLocaleString('en-CA');
    if (year) {
      yearEl.textContent = year;
      textEl.innerHTML   = `You could reach <strong>${label}</strong> in`;
      cardEl.classList.toggle('is-reached', finalBalance >= amount);
    } else {
      yearEl.textContent = 'N/A';
      textEl.innerHTML   = `<strong>${label}</strong> — beyond your time horizon`;
      cardEl.classList.remove('is-reached');
    }
  }

  /* ── 11. RENDER RESULTS ──────────────────────────────────── */
  function renderResults(data, values) {
    const { finalBalance, totalContributions, remainingRoom, milestones, schedule } = data;
    const startingBalance  = NNUtils.parseInputNumber(balanceEl.value);
    const investmentGrowth = finalBalance - startingBalance - totalContributions;
    const inflAdj          = inflationAdjust(finalBalance, values.inflationRate, values.horizon);

    const celebEl = document.getElementById('result-celebration');
    if (celebEl) {
      let msg = '';
      if (finalBalance >= 1000000)     msg = `🎉 <strong>TFSA Millionaire!</strong> Your TFSA could reach over <strong>${NNUtils.formatCAD(finalBalance)}</strong>.`;
      else if (finalBalance >= 500000) msg = `🎉 <strong>Half a million!</strong> Your TFSA could reach <strong>${NNUtils.formatCAD(finalBalance)}</strong>.`;
      else if (finalBalance >= 100000) msg = `✅ <strong>Six figures!</strong> You could reach <strong>${NNUtils.formatCAD(finalBalance)}</strong> in your TFSA.`;
      celebEl.innerHTML = msg;
      celebEl.classList.toggle('hidden', !msg);
    }

    if (resultFutureValue)   resultFutureValue.textContent   = NNUtils.formatCAD(finalBalance);
    if (resultTotalContribs) resultTotalContribs.textContent = NNUtils.formatCAD(totalContributions);
    if (resultGrowth)        resultGrowth.textContent        = NNUtils.formatCAD(Math.max(0, investmentGrowth));
    if (resultRemainingRoom) resultRemainingRoom.textContent = NNUtils.formatCAD(remainingRoom);
    if (resultInflation)     resultInflation.textContent     = values.inflationRate > 0 ? NNUtils.formatCAD(inflAdj) : 'Inflation adjustment off';

    renderMilestone(milestone100k, milestone100kYear, milestone100kText, 100000, milestones[100000], finalBalance);
    renderMilestone(milestone250k, milestone250kYear, milestone250kText, 250000, milestones[250000], finalBalance);
    renderMilestone(milestone500k, milestone500kYear, milestone500kText, 500000, milestones[500000], finalBalance);

    renderSummaryBox(values.contribution, values.frequency, values.horizon, values.annualReturn, values.lumpSum);

    if (growthTbody) {
      growthTbody.innerHTML = '';
      schedule.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${row.year}</td><td>${NNUtils.formatCAD(row.contribution)}</td><td>${NNUtils.formatCAD(row.growth)}</td><td>${NNUtils.formatCAD(row.balance)}</td><td>${NNUtils.formatCAD(row.roomRemaining)}</td>`;
        growthTbody.appendChild(tr);
      });
    }

    if (resultsPlaceholder) resultsPlaceholder.classList.add('hidden');
    if (resultsContent)     resultsContent.classList.remove('hidden');
    if (growthSection)      growthSection.removeAttribute('hidden');

    NNUtils.scrollToResults('tfsa-results-content', true);
  }

  /* ── 12. CALCULATE ───────────────────────────────────────── */
  function calculate() {
    const result = validateInputs();
    if (!result.valid) return;
    const { values } = result;
    const data = projectTfsa(values.balance, values.room, values.contribution,
      values.frequency, values.annualReturn, values.horizon, values.annualLimit, values.lumpSum);
    renderResults(data, values);
    if (window.NNAnalytics) NNAnalytics.trackCalculator('TFSA Calculator', { annualReturn:values.annualReturn, horizon:values.horizon });
  }

  /* ── 13. FORM EVENTS ─────────────────────────────────────── */
  if (form) {
    form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });
    form.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); calculate(); }});
    });
  }

  if (growthToggle && growthTableWrapper) {
    growthToggle.addEventListener('click', function() {
      const isOpen = growthTableWrapper.classList.toggle('is-open');
      this.setAttribute('aria-expanded', String(isOpen));
    });
  }

  /* ── 14. RESET ───────────────────────────────────────────── */
  const resetBtn = document.getElementById('tfsa-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      if (balanceEl)      balanceEl.value      = NNUtils.formatInputNumber(0);
      if (roomEl)         roomEl.value         = NNUtils.formatInputNumber(95000);
      if (contributionEl) contributionEl.value = NNUtils.formatInputNumber(7000);
      if (frequencyEl)    frequencyEl.value    = 'yearly';
      if (returnEl)       returnEl.value       = '6';
      if (returnSlider)   returnSlider.value   = '6';
      if (returnCaution)  returnCaution.classList.add('hidden');
      if (horizonEl)      horizonEl.value      = '20';
      if (annualLimitEl)  annualLimitEl.value  = NNUtils.formatInputNumber(7000);
      if (inflationEl)    inflationEl.value    = '2.1';
      if (lumpSumEl)      lumpSumEl.value      = NNUtils.formatInputNumber(0);
      if (pastContribEl)  pastContribEl.value  = NNUtils.formatInputNumber(0);
      if (birthYearEl)    birthYearEl.value    = '';
      if (roomAutoBadge)  roomAutoBadge.classList.add('hidden');
      if (overContribWarning) { overContribWarning.classList.remove('is-visible'); overContribWarning.innerHTML = ''; }
      if (resultSummaryBox) resultSummaryBox.classList.add('hidden');
      if (resultsPlaceholder) resultsPlaceholder.classList.remove('hidden');
      if (resultsContent)     resultsContent.classList.add('hidden');
      if (growthSection)      growthSection.setAttribute('hidden','');
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
    });
  }

  /* ── 15. SEO ─────────────────────────────────────────────── */
  if (window.NNSeo) {
    NNSeo.init({
      title:       'TFSA Calculator Canada',
      description: 'Free Canadian TFSA calculator. Project your tax-free savings growth, calculate contribution room, and see when your TFSA reaches $100K, $250K, and $500K.',
      keywords:    'TFSA calculator, TFSA contribution room 2026, tax-free savings account calculator Canada, TFSA growth calculator',
      slug:        'tfsa'
    });
  }

}); // end DOMContentLoaded

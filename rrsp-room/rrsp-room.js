/* =============================================
   NORTHERN NUMBERS — rrsp-room.js
   RRSP Contribution Room Calculator Canada 2026

   2026 CONFIRMED RULES (Source: CRA Nov 2025):
   - Dollar limit: $33,810 (up from $32,490 in 2025)
   - 2027 limit confirmed: $35,390
   - Rate: 18% of prior-year (2025) earned income
   - Income to max: $33,810 / 0.18 = $187,833.33
   - PA reduces room dollar-for-dollar (T4 Box 52)
   - Unused room carries forward indefinitely
   - Over-contribution buffer: $2,000 lifetime (penalty-free)
   - Penalty for excess: 1% per month on amount > $2,000 over limit
   - Age limit: must convert RRSP to RRIF/annuity by Dec 31, year of turning 71

   FORMULA (CRA exact):
   1. New room = min(earned_income × 18%, $33,810)
   2. New room after PA = max(0, new_room - pension_adjustment)
   3. Deduction limit = new_room_after_PA + carry_forward
   4. Available room = deduction_limit - contributed_2026
   5. Over-contribution = max(0, contributed_2026 - deduction_limit)
   6. Excess over buffer = max(0, over_contribution - 2000)
   7. Monthly penalty = excess_over_buffer × 1%

   VERIFIED:
   $80K × 18% = $14,400 ✅
   $187,834 × 18% = $33,810 (cap) ✅
   PA reduces new room to min of 0 ✅
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form        = document.getElementById('rrsp-form');
  const incomeEl    = document.getElementById('earned-income');
  const paEl        = document.getElementById('pension-adjustment');
  const carryEl     = document.getElementById('carryforward');
  const contribEl   = document.getElementById('contributed');
  const placeholder = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── Constants ── */
  const LIMIT_2026 = 33810;
  const RATE       = 0.18;
  const OC_BUFFER  = 2000;
  const OC_PENALTY = 0.01; // 1% per month

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'RRSP Contribution Room Calculator Canada 2026',
      description: 'Find out how much RRSP contribution room you have for 2026. Includes pension adjustment, carry-forward, and over-contribution check.',
      keywords:    'RRSP contribution room calculator 2026, how much RRSP room do I have, RRSP deduction limit 2026, RRSP contribution limit canada',
      slug:        'rrsp-room'
    });
    NNSeo.injectSchema({ title:'RRSP Contribution Room Calculator Canada 2026', slug:'rrsp-room', description:'Calculate your 2026 RRSP contribution room based on earned income, pension adjustment, and carry-forward.' });
    NNSeo.injectFAQSchema([
      { question:'What is the RRSP contribution limit for 2026?', answer:'The 2026 RRSP dollar limit is $33,810. Your personal limit is the lesser of $33,810 or 18% of your 2025 earned income, minus any pension adjustment, plus unused carry-forward room. The income needed to reach the $33,810 cap is $187,834.' },
      { question:'Where can I find my RRSP contribution room?', answer:'Your exact RRSP deduction limit is on your CRA Notice of Assessment (NOA) from your most recent tax filing. You can also check it in CRA My Account online or the MyCRA mobile app.' },
      { question:'Can I carry forward unused RRSP room?', answer:'Yes. Unused RRSP contribution room carries forward indefinitely with no expiry. If you had earned income since 1991 but did not contribute the maximum each year, you may have significant accumulated room available.' },
      { question:'What happens if I over-contribute to my RRSP?', answer:'CRA allows a lifetime over-contribution buffer of $2,000 — the first $2,000 over your limit is penalty-free. Any amount over $2,000 above your limit is subject to a 1% per month penalty tax. File a T1-OVP if you have excess contributions.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['rrsp','tfsa-room','tfsa','income-tax']); } catch(e) {}

  /* ── Formatters ── */
  NNUtils.attachFormatter(incomeEl);
  NNUtils.attachFormatter(paEl);
  NNUtils.attachFormatter(carryEl);
  NNUtils.attachFormatter(contribEl);

  /* ── Presets ── */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const p = this.dataset.preset;
      paEl.value    = NNUtils.formatInputNumber(0);
      carryEl.value = NNUtils.formatInputNumber(0);
      contribEl.value = NNUtils.formatInputNumber(0);

      if (p === 'employee') {
        incomeEl.value = NNUtils.formatInputNumber(80000);
      } else if (p === 'selfemployed') {
        incomeEl.value = NNUtils.formatInputNumber(120000);
        carryEl.value  = NNUtils.formatInputNumber(15000);
      } else if (p === 'pension') {
        incomeEl.value = NNUtils.formatInputNumber(90000);
        paEl.value     = NNUtils.formatInputNumber(9000);
        carryEl.value  = NNUtils.formatInputNumber(10000);
        contribEl.value = NNUtils.formatInputNumber(5000);
      } else if (p === 'maxout') {
        incomeEl.value = NNUtils.formatInputNumber(250000);
        contribEl.value = NNUtils.formatInputNumber(10000);
      }
      calculate();
    });
  });

  /* ── CALCULATE ── */
  function calculate() {
    const earnedIncome = NNUtils.parseInputNumber(incomeEl.value);
    const pa           = NNUtils.parseInputNumber(paEl.value) || 0;
    const carryforward = NNUtils.parseInputNumber(carryEl.value) || 0;
    const contributed  = NNUtils.parseInputNumber(contribEl.value) || 0;

    if (!earnedIncome || earnedIncome < 0) {
      NNUtils.setError(incomeEl, 'income-error', 'Please enter your 2025 earned income (can be 0 for no earned income).');
      return;
    }
    NNUtils.clearError(incomeEl, 'income-error');

    // Step 1: New room for 2026 based on 2025 earned income
    const newRoom = Math.min(earnedIncome * RATE, LIMIT_2026);

    // Step 2: Subtract pension adjustment (PA cannot make new room negative)
    const newRoomAfterPA = Math.max(0, newRoom - pa);

    // Step 3: Add carry-forward
    const deductionLimit = newRoomAfterPA + carryforward;

    // Step 4: Subtract contributions made
    const availableRoom = deductionLimit - contributed;

    // Step 5: Over-contribution analysis
    const isOver = availableRoom < 0;
    const overAmt = isOver ? Math.abs(availableRoom) : 0;
    const excessOverBuffer = Math.max(0, overAmt - OC_BUFFER);
    const monthlyPenalty = excessOverBuffer * OC_PENALTY;

    // Percentage of $33,810 limit used
    const pctOfLimit = newRoom > 0 ? (newRoom / LIMIT_2026 * 100).toFixed(1) + '%' : '0%';

    /* ── Render ── */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    // Over-contribution warning
    const ocNotice = document.getElementById('overcontrib-notice');
    const ocDetail = document.getElementById('overcontrib-detail');
    if (ocNotice) ocNotice.style.display = isOver ? '' : 'none';
    if (ocDetail) ocDetail.style.display = isOver ? '' : 'none';

    // Hero
    const heroLabel = document.getElementById('hero-label');
    const heroValue = document.getElementById('result-available-room');
    const heroSub   = document.getElementById('result-hero-sub');

    if (heroLabel) heroLabel.textContent = isOver ? 'Over-Contribution Amount' : 'Available RRSP Room in 2026';
    if (heroValue) heroValue.textContent = isOver ? NNUtils.formatCAD(overAmt) : NNUtils.formatCAD(availableRoom);
    if (heroSub) {
      const isCapped = earnedIncome * RATE >= LIMIT_2026;
      heroSub.textContent = isOver
        ? `${NNUtils.formatCAD(overAmt)} over your deduction limit — see below`
        : `${isCapped ? 'Income capped at $33,810 limit' : `18% of $${earnedIncome.toLocaleString()}`} · ${pa > 0 ? `PA −${NNUtils.formatCAD(pa)} · ` : ''}${carryforward > 0 ? `+${NNUtils.formatCAD(carryforward)} carry-forward` : 'no carry-forward'}`;
    }

    // Summary rows
    document.getElementById('result-earned').textContent       = NNUtils.formatCAD(earnedIncome);
    document.getElementById('result-new-room').textContent     = NNUtils.formatCAD(newRoom) + (earnedIncome * RATE >= LIMIT_2026 ? ' (capped)' : '');
    document.getElementById('result-new-after-pa').textContent = NNUtils.formatCAD(newRoomAfterPA);
    document.getElementById('result-deduction-limit').textContent = NNUtils.formatCAD(deductionLimit);
    document.getElementById('result-available').textContent    = isOver ? '−' + NNUtils.formatCAD(overAmt) : NNUtils.formatCAD(availableRoom);
    document.getElementById('result-pct-used').textContent     = pctOfLimit;

    const paRow = document.getElementById('pa-row');
    if (pa > 0) {
      paRow.style.display = '';
      document.getElementById('result-pa').textContent = '−' + NNUtils.formatCAD(pa);
    } else { paRow.style.display = 'none'; }

    const carryRow = document.getElementById('carry-row');
    if (carryforward > 0) {
      carryRow.style.display = '';
      document.getElementById('result-carryforward').textContent = '+' + NNUtils.formatCAD(carryforward);
    } else { carryRow.style.display = 'none'; }

    const contribRow = document.getElementById('contrib-row');
    if (contributed > 0) {
      contribRow.style.display = '';
      document.getElementById('result-contributed').textContent = '−' + NNUtils.formatCAD(contributed);
    } else { contribRow.style.display = 'none'; }

    // Over-contribution detail
    if (isOver) {
      document.getElementById('result-overamt').textContent       = NNUtils.formatCAD(overAmt);
      document.getElementById('result-penalty-base').textContent  = excessOverBuffer > 0 ? NNUtils.formatCAD(excessOverBuffer) : 'None (within $2,000 buffer)';
      document.getElementById('result-monthly-penalty').textContent = excessOverBuffer > 0 ? NNUtils.formatCAD(monthlyPenalty) + '/month' : '$0 (within buffer)';
    }

    window._rrspResults = {
      earnedIncome, pa, carryforward, contributed,
      newRoom, newRoomAfterPA, deductionLimit, availableRoom,
      isOver, overAmt, excessOverBuffer, monthlyPenalty
    };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('RRSP Room Calculator', { earnedIncome, availableRoom }); } catch(e) {}
  }

  /* ── Copy ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._rrspResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `📊 RRSP Contribution Room 2026 — Northern Numbers`,
      `─────────────────────────────`,
      `2025 Earned Income:    ${NNUtils.formatCAD(r.earnedIncome)}`,
      `New Room (18%):        ${NNUtils.formatCAD(r.newRoom)}`,
      `Pension Adjustment:    −${NNUtils.formatCAD(r.pa)}`,
      `Carry-Forward:         +${NNUtils.formatCAD(r.carryforward)}`,
      `2026 Deduction Limit:  ${NNUtils.formatCAD(r.deductionLimit)}`,
      `Contributions Made:    −${NNUtils.formatCAD(r.contributed)}`,
      `─────────────────────────────`,
      `Available Room:        ${r.isOver ? '−' + NNUtils.formatCAD(r.overAmt) + ' (OVER)' : NNUtils.formatCAD(r.availableRoom)}`,
    ], 'RRSP Room Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    incomeEl.value  = '';
    paEl.value      = NNUtils.formatInputNumber(0);
    carryEl.value   = NNUtils.formatInputNumber(0);
    contribEl.value = NNUtils.formatInputNumber(0);
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(incomeEl, 'income-error');
  });

});

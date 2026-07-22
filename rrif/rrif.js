/* =============================================
   NORTHERN NUMBERS — rrif.js
   Canadian RRIF Minimum Withdrawal Calculator 2026

   FORMULAS:
   - Ages < 71:  factor = 1 / (90 - age)
   - Ages 71-94: CRA prescribed table (post-2015 budget)
   - Age 95+:    20.00% flat
   - Min withdrawal = Jan 1 balance × factor
   - Balance Dec 31 = (balance - total_withdrawal) × (1 + growth)

   Source: CRA Income Tax Act, Schedule I
   Verified: age 71 = 5.28%, age 72 = 5.40%,
             age 80 = 6.82%, age 94 = 18.79%, age 95+ = 20.00%
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form           = document.getElementById('rrif-form');
  const balanceEl      = document.getElementById('rrif-balance');
  const ageEl          = document.getElementById('current-age');
  const spouseToggleEl = document.getElementById('use-spouse-age');
  const spouseAgeEl    = document.getElementById('spouse-age');
  const spouseGroup    = document.getElementById('spouse-age-group');
  const growthEl       = document.getElementById('growth-rate');
  const growthSlider   = document.getElementById('growth-slider');
  const extraWdEl      = document.getElementById('additional-withdrawal');
  const projYearsEl    = document.getElementById('projection-years');
  const placeholder    = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'RRIF Calculator Canada 2026',
      description: 'Calculate mandatory RRIF minimum withdrawals by age using official CRA prescribed factors. Project your RRIF balance and income to age 90+.',
      keywords:    'rrif calculator canada 2026, rrif minimum withdrawal calculator, rrif withdrawal table 2026, rrif calculator by age',
      slug:        'rrif'
    });
    NNSeo.injectSchema({ title:'RRIF Calculator Canada 2026', slug:'rrif', description:'Calculate mandatory RRIF minimum withdrawals using official 2026 CRA prescribed factors.' });
    NNSeo.injectFAQSchema([
      { question:'What is the RRIF minimum withdrawal at age 71 in 2026?', answer:'At age 71, the CRA prescribed factor is 5.28%. On a $500,000 RRIF balance, the minimum withdrawal is $26,400. On a $300,000 balance it is $15,840, and on a $1,000,000 balance it is $52,800.' },
      { question:'When must I convert my RRSP to a RRIF in Canada?', answer:'You must convert your RRSP to a RRIF by December 31 of the year you turn 71. No minimum withdrawal is required in the year you open the RRIF — the first mandatory minimum applies the following year.' },
      { question:'Can I use my younger spouse\'s age for RRIF withdrawals?', answer:'Yes. You can irrevocably elect to base your RRIF minimum withdrawal on your younger spouse\'s age instead of yours. This reduces your mandatory annual withdrawal since younger ages have lower prescribed factors. The election must be made when the RRIF is opened.' },
      { question:'Are RRIF withdrawals taxable in Canada?', answer:'Yes. All RRIF withdrawals are fully taxable as ordinary income. You receive a T4RIF slip each year. Minimum withdrawals are not subject to withholding tax at source, but amounts above the minimum are subject to 10%, 20%, or 30% withholding depending on the amount withdrawn above the minimum.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['rrsp','cpp','oas','income-tax']); } catch(e) {}

  /* ── CRA Prescribed Factors ── */
  const CRA_FACTORS = {
    55:1/35, 56:1/34, 57:1/33, 58:1/32, 59:1/31,
    60:1/30, 61:1/29, 62:1/28, 63:1/27, 64:1/26,
    65:1/25, 66:1/24, 67:1/23, 68:1/22, 69:1/21, 70:1/20,
    71:0.0528, 72:0.0540, 73:0.0553, 74:0.0567,
    75:0.0582, 76:0.0598, 77:0.0617, 78:0.0636, 79:0.0658,
    80:0.0682, 81:0.0708, 82:0.0738, 83:0.0771, 84:0.0808,
    85:0.0851, 86:0.0899, 87:0.0955, 88:0.1021, 89:0.1099,
    90:0.1192, 91:0.1306, 92:0.1449, 93:0.1634, 94:0.1879,
    95:0.2000,
  };

  function getFactor(age) {
    if (age >= 95) return 0.2000;
    if (age < 55)  return 1 / (90 - age);
    return CRA_FACTORS[age] || 0.2000;
  }

  /* ── Formatters + sliders ── */
  NNUtils.attachFormatter(balanceEl);
  NNUtils.attachFormatter(extraWdEl);
  NNUtils.syncSlider(growthEl, growthSlider, { isDollar: false });
  NNUtils.initTableToggle('table-toggle', 'projection-table');

  /* ── Spouse age toggle ── */
  spouseToggleEl?.addEventListener('change', function() {
    spouseGroup.style.display = this.value === 'spouse' ? '' : 'none';
    if (!resultsContent.classList.contains('hidden')) calculate();
  });

  /* ── Auto-recalc on dropdowns ── */
  projYearsEl?.addEventListener('change', function() {
    if (!resultsContent.classList.contains('hidden')) calculate();
  });

  /* ── Presets ── */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const p = this.dataset.preset;
      spouseToggleEl.value = 'own';
      spouseGroup.style.display = 'none';
      extraWdEl.value = NNUtils.formatInputNumber(0);
      projYearsEl.value = '90';
      if (p === 'modest')  { balanceEl.value = NNUtils.formatInputNumber(300000); ageEl.value = '71'; growthEl.value = '5.0'; }
      if (p === 'typical') { balanceEl.value = NNUtils.formatInputNumber(500000); ageEl.value = '71'; growthEl.value = '5.0'; }
      if (p === 'large')   { balanceEl.value = NNUtils.formatInputNumber(1000000); ageEl.value = '71'; growthEl.value = '5.0'; }
      if (p === 'early')   { balanceEl.value = NNUtils.formatInputNumber(400000); ageEl.value = '65'; growthEl.value = '5.0'; }
      growthSlider.value = growthEl.value;
      calculate();
    });
  });

  /* ── CALCULATE ── */
  function calculate() {
    const balance   = NNUtils.parseInputNumber(balanceEl.value);
    const ownAge    = parseInt(ageEl.value) || 71;
    const useSpouse = spouseToggleEl.value === 'spouse';
    const spouseAge = parseInt(spouseAgeEl?.value) || ownAge;
    const calcAge   = useSpouse && spouseAge < ownAge ? spouseAge : ownAge;
    const growth    = parseFloat(growthEl.value) / 100 || 0.05;
    const extraWd   = NNUtils.parseInputNumber(extraWdEl.value) || 0;
    const projToAge = parseInt(projYearsEl.value) || 90;

    if (!balance || balance <= 0) {
      NNUtils.setError(balanceEl, 'balance-error', 'Please enter your RRIF balance.');
      return;
    }
    NNUtils.clearError(balanceEl, 'balance-error');

    if (!calcAge || calcAge < 55 || calcAge > 100) {
      NNUtils.setError(ageEl, 'age-error', 'Please enter an age between 55 and 100.');
      return;
    }
    NNUtils.clearError(ageEl, 'age-error');

    const factor    = getFactor(calcAge);
    const minWd     = balance * factor;
    const totalWd   = minWd + extraWd;
    const balAfter  = Math.max(0, (balance - totalWd) * (1 + growth));
    const OAS_THRESH = 90997;
    const oasRisk   = minWd > OAS_THRESH ? '⚠️ Exceeds clawback threshold' : minWd > OAS_THRESH * 0.75 ? '⚡ Approaching threshold' : '✅ Below threshold';

    /* Render */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    document.getElementById('result-min-withdrawal').textContent = NNUtils.formatCAD(minWd);
    document.getElementById('result-hero-sub').textContent       = `Age ${calcAge} · Factor ${(factor*100).toFixed(2)}% · ${NNUtils.formatCAD(balance)} balance`;
    document.getElementById('result-balance').textContent        = NNUtils.formatCAD(balance);
    document.getElementById('result-age-used').textContent       = useSpouse && spouseAge < ownAge ? `${calcAge} (spouse's age)` : `${calcAge}`;
    document.getElementById('result-factor').textContent         = (factor * 100).toFixed(2) + '%';
    document.getElementById('result-min-wd-row').textContent     = NNUtils.formatCAD(minWd);

    const extraRow = document.getElementById('extra-wd-row');
    if (extraWd > 0) {
      extraRow.style.display = '';
      document.getElementById('result-extra-wd').textContent = NNUtils.formatCAD(extraWd);
    } else {
      extraRow.style.display = 'none';
    }

    document.getElementById('result-total-wd').textContent    = NNUtils.formatCAD(totalWd);
    document.getElementById('result-monthly').textContent     = NNUtils.formatCAD(minWd / 12);
    document.getElementById('result-rate-pct').textContent    = (factor * 100).toFixed(2) + '%';
    document.getElementById('result-oas-risk').textContent    = oasRisk;
    document.getElementById('result-balance-after').textContent = NNUtils.formatCAD(balAfter);

    /* Projection table */
    const tbody = document.getElementById('projection-body');
    if (tbody) {
      let rows = ''; let b = balance;
      const yearsToProject = Math.min(projToAge - calcAge + 1, 40);
      for (let i = 0; i < yearsToProject; i++) {
        const a   = calcAge + i;
        const f   = getFactor(a);
        const mwd = b * f;
        const twd = mwd + extraWd;
        const end = Math.max(0, (b - twd) * (1 + growth));
        const isEven = i % 2 === 0;
        const atClawback = mwd > OAS_THRESH;
        rows += `<tr style="${isEven?'background:var(--color-bg);':''}border-bottom:1px solid var(--color-border)">
          <td style="padding:var(--space-2) var(--space-3);font-weight:${i===0?'700':'400'}">${a}${i===0?' ←':''}</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right">${(f*100).toFixed(2)}%</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right;color:${atClawback?'var(--color-danger)':''}">${NNUtils.formatCAD(mwd)}</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right">${NNUtils.formatCAD(b)}</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right">${end > 0 ? NNUtils.formatCAD(end) : '—'}</td>
        </tr>`;
        if (end <= 0) break;
        b = end;
      }
      tbody.innerHTML = rows;
    }

    window._rrifResults = { balance, calcAge, factor, minWd, extraWd, totalWd, balAfter };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('RRIF Calculator', { age: calcAge, balance }); } catch(e) {}
  }

  /* ── Copy Results ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._rrifResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `📊 RRIF Calculator 2026 — Northern Numbers`,
      `─────────────────────────────`,
      `💰 RRIF Balance (Jan 1):  ${NNUtils.formatCAD(r.balance)}`,
      `🎂 Age:                   ${r.calcAge}`,
      `📈 CRA Factor:            ${(r.factor*100).toFixed(2)}%`,
      `─────────────────────────────`,
      `💵 Minimum Withdrawal:    ${NNUtils.formatCAD(r.minWd)}`,
      `📅 Monthly Income:        ${NNUtils.formatCAD(r.minWd/12)}`,
      `💼 Total Withdrawal:      ${NNUtils.formatCAD(r.totalWd)}`,
      `🏦 Balance After:         ${NNUtils.formatCAD(r.balAfter)}`
    ], 'RRIF Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    balanceEl.value      = NNUtils.formatInputNumber(500000);
    ageEl.value          = '71';
    spouseToggleEl.value = 'own';
    spouseGroup.style.display = 'none';
    growthEl.value       = '5.0';
    growthSlider.value   = '5.0';
    extraWdEl.value      = NNUtils.formatInputNumber(0);
    projYearsEl.value    = '90';
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(balanceEl, 'balance-error');
    NNUtils.clearError(ageEl, 'age-error');
  });

});

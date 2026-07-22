/* =============================================
   NORTHERN NUMBERS — inflation.js
   Canadian Inflation / Purchasing Power Calculator

   FORMULAS:
   Future value:   FV = PV × (1 + r)^t
   Past value:     PV = FV / (1 + r)^t
   Total inflation: (FV/PV - 1) × 100
   Rule of 70:     70 / rate = years to halve

   Verified against Bank of Canada inflation calculator ✅
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ─────────────────────────────── */
  const form         = document.getElementById('inflation-form');
  const amountEl     = document.getElementById('amount');
  const directionEl  = document.getElementById('direction');
  const yearsEl      = document.getElementById('years');
  const yearsSlider  = document.getElementById('years-slider');
  const rateEl       = document.getElementById('inflation-rate');
  const rateSlider   = document.getElementById('rate-slider');
  const placeholder  = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ─────────────────────────────────────────────────── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'Canadian Inflation Calculator 2026',
      description: 'Free Canadian inflation calculator. See how inflation erodes purchasing power over time using Canadian CPI data.',
      keywords:    'inflation calculator canada, cpi calculator canada, purchasing power calculator canada',
      slug:        'inflation'
    });
    NNSeo.injectSchema({ title:'Canadian Inflation Calculator 2026', slug:'inflation', description:'Calculate the impact of inflation on purchasing power using Canadian CPI data.' });
    NNSeo.injectFAQSchema([
      { question:'What is the current inflation rate in Canada?', answer:'As of 2025, Canada\'s inflation rate is approximately 2.3%, close to the Bank of Canada\'s 2% target. After peaking at 6.8% in 2022, inflation has steadily declined due to interest rate increases.' },
      { question:'How does inflation affect purchasing power?', answer:'Inflation reduces the real value of money over time. At 2% inflation, $10,000 today will only have the purchasing power of about $8,200 in 10 years. The compound effect means small inflation rates have a significant long-term impact.' },
      { question:'What is the Rule of 70?', answer:'Divide 70 by the annual inflation rate to estimate how long it takes for purchasing power to halve. At 2% inflation, purchasing power halves in approximately 35 years. At 6.8%, it halves in about 10 years.' },
      { question:'Are CPP and OAS adjusted for inflation?', answer:'Yes. Both CPP and OAS are indexed to the Consumer Price Index and adjusted quarterly, maintaining real purchasing power throughout retirement.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['compound-interest','rrsp','tfsa','cpp']); } catch(e) {}

  /* ── Sliders + formatters ────────────────────────────────── */
  NNUtils.attachFormatter(amountEl);
  NNUtils.syncSlider(yearsEl, yearsSlider, { isDollar: false });
  NNUtils.syncSlider(rateEl, rateSlider, { isDollar: false });
  NNUtils.initTableToggle('table-toggle', 'year-table');

  /* ── Presets ─────────────────────────────────────────────── */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const p = this.dataset.preset;
      if (p === 'boc')        { amountEl.value = '10,000'; yearsEl.value = '10'; rateEl.value = '2.0'; directionEl.value = 'future'; }
      if (p === 'recent')     { amountEl.value = '10,000'; yearsEl.value = '10'; rateEl.value = '2.7'; directionEl.value = 'future'; }
      if (p === 'high')       { amountEl.value = '10,000'; yearsEl.value = '5';  rateEl.value = '6.8'; directionEl.value = 'future'; }
      if (p === 'retirement') { amountEl.value = '50,000'; yearsEl.value = '25'; rateEl.value = '2.5'; directionEl.value = 'future'; }
      yearsSlider.value = yearsEl.value;
      rateSlider.value  = rateEl.value;
      calculate();
    });
  });

  /* ── Direction label update ──────────────────────────────── */
  directionEl?.addEventListener('change', function() {
    if (!resultsContent.classList.contains('hidden')) calculate();
  });

  /* ── CALCULATION ENGINE ──────────────────────────────────── */
  function calculate() {
    const amount    = NNUtils.parseInputNumber(amountEl.value);
    const years     = parseInt(yearsEl.value) || 0;
    const rate      = parseFloat(rateEl.value) || 0;
    const direction = directionEl.value;

    // Validate
    if (!amount || amount <= 0) {
      NNUtils.setError(amountEl, 'amount-error', 'Please enter a dollar amount.');
      return;
    }
    NNUtils.clearError(amountEl, 'amount-error');

    if (!years || years < 1) {
      NNUtils.setError(yearsEl, 'years-error', 'Please enter at least 1 year.');
      return;
    }
    NNUtils.clearError(yearsEl, 'years-error');

    const r = rate / 100;

    // Core formula
    let equivalent, totalInflation, powerChange;
    if (direction === 'future') {
      equivalent     = amount * Math.pow(1 + r, years);
      totalInflation = (equivalent / amount - 1) * 100;
      powerChange    = -((1 - amount / equivalent) * 100);
    } else {
      equivalent     = amount / Math.pow(1 + r, years);
      totalInflation = (amount / equivalent - 1) * 100;
      powerChange    = ((equivalent / amount) - 1) * 100;
    }

    const rule70      = rate > 0 ? Math.round(70 / rate) : 0;
    const annualCost  = amount * r;
    // Purchasing power loss in today's dollars:
    // What $X today is worth in real terms after inflation
    const purchPowerToday = direction === 'future'
      ? amount / Math.pow(1 + r, years)        // today's equivalent of your money's future buying power
      : equivalent;                             // past → present: equivalent already in today's dollars
    const valueLost = direction === 'future'
      ? amount - purchPowerToday                // real loss: how much purchasing power eroded in today's $
      : amount - equivalent;                    // past → present: nominal difference

    // Render
    const wasHidden = resultsContent.classList.contains('hidden');
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    // Hero
    const heroLabel = direction === 'future'
      ? `What $${NNUtils.formatInputNumber(amount)} costs in ${years} year${years>1?'s':''}`
      : `Equivalent value ${years} year${years>1?'s':''} ago`;
    document.getElementById('result-hero-label').textContent = heroLabel;
    document.getElementById('result-equivalent').textContent = NNUtils.formatCAD(equivalent);
    document.getElementById('result-hero-sub').textContent   = direction === 'future'
      ? `At ${rate}% inflation over ${years} years`
      : `That amount had the same purchasing power as ${NNUtils.formatCAD(amount)} today`;

    // Summary rows
    document.getElementById('result-start').textContent         = NNUtils.formatCAD(amount);
    document.getElementById('result-years-display').textContent = years + ' year' + (years>1?'s':'');
    document.getElementById('result-rate-display').textContent  = rate + '% per year';
    document.getElementById('result-total-inflation').textContent= '+' + totalInflation.toFixed(1) + '%';
    document.getElementById('result-power-change').textContent  = (powerChange > 0 ? '+' : '') + powerChange.toFixed(1) + '% purchasing power';

    // Purchasing Power Remaining
    const powerRemaining = direction === 'future'
      ? (amount / equivalent * 100)        // how much original value remains
      : (equivalent / amount * 100);       // what % of today's value the past amount was
    const remainingEl = document.getElementById('result-power-remaining');
    if (remainingEl) {
      remainingEl.textContent = powerRemaining.toFixed(1) + '% of original value';
      remainingEl.style.color = powerRemaining >= 100
        ? 'var(--color-success)'
        : powerRemaining >= 70 ? '' : 'var(--color-danger)';
    }

    // Milestone cards
    document.getElementById('result-lost').textContent        = NNUtils.formatCAD(Math.abs(valueLost));
    document.getElementById('result-real-return').textContent = rate.toFixed(1) + '%/year (nominal)';
    document.getElementById('result-half-life').textContent   = rule70 + ' years';
    document.getElementById('result-annual-cost').textContent = NNUtils.formatCAD(annualCost) + '/year';

    // Year-by-year breakdown
    const tbody = document.getElementById('breakdown-body');
    if (tbody) {
      let rows = '';
      const showYears = Math.min(years, 50);
      for (let y = 1; y <= showYears; y++) {
        const val = direction === 'future'
          ? amount * Math.pow(1 + r, y)
          : amount / Math.pow(1 + r, y);
        const change = ((val / amount) - 1) * 100;
        const isEven = y % 2 === 0;
        rows += `<tr style="${isEven?'background:var(--color-bg);':''}border-bottom:1px solid var(--color-border)">
          <td style="padding:var(--space-2) var(--space-3)">${y}</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right;font-weight:500">${NNUtils.formatCAD(val)}</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right;color:${change>=0?'var(--color-success)':'var(--color-danger)'}">${change>=0?'+':''}${change.toFixed(1)}%</td>
        </tr>`;
      }
      tbody.innerHTML = rows;
    }

    // Store for copy
    window._inflationResults = { amount, years, rate, direction, equivalent, totalInflation, powerChange, valueLost, rule70 };

    // Scroll
    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('Inflation Calculator', { rate, years }); } catch(e) {}
  }

  /* ── Copy Results ────────────────────────────────────────── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._inflationResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `📉 Inflation Calculator — Northern Numbers`,
      `─────────────────────────────`,
      `💰 Starting Amount:      ${NNUtils.formatCAD(r.amount)}`,
      `📅 Years:                ${r.years}`,
      `📈 Inflation Rate:       ${r.rate}%/year`,
      `📊 Direction:            ${r.direction === 'future' ? 'Present → Future' : 'Past → Present'}`,
      `─────────────────────────────`,
      `💵 Equivalent Value:     ${NNUtils.formatCAD(r.equivalent)}`,
      `📉 Total Inflation:      +${r.totalInflation.toFixed(1)}%`,
      `💸 Value Change:         ${NNUtils.formatCAD(Math.abs(r.valueLost))}`,
      `⏱  Purchasing Power Halves: ~${r.rule70} years (Rule of 70)`
    ], 'Inflation Calculator');
  });

  /* ── Reset ───────────────────────────────────────────────── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    amountEl.value    = NNUtils.formatInputNumber(10000);
    yearsEl.value     = '10';
    rateEl.value      = '2.0';
    directionEl.value = 'future';
    yearsSlider.value = '10';
    rateSlider.value  = '2.0';
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(amountEl, 'amount-error');
    NNUtils.clearError(yearsEl, 'years-error');
  });

});

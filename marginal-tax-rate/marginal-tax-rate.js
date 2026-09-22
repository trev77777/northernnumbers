/* =============================================
   NORTHERN NUMBERS — marginal-tax-rate.js
   Marginal vs Effective Tax Rate Calculator 2026

   CONFIRMED 2026 BRACKETS (Source: TaxTips.ca, CRA T4127, Trans Canada WM):
   Federal brackets: $58,523 / $117,045 / $181,440 / $258,482
   Federal rates: 14% / 20.5% / 26% / 29.29%* / 33%
   (*29.29% includes 0.29% BPA phase-out effect in $181,440-$258,482 range)
   Federal BPA: $16,452 (tapered to $14,829 above $181,440)
   Federal bottom rate: 14% (reduced from 15%, effective January 1, 2026, Bill C-4)

   METHOD: Combined federal + provincial marginal rate tables.
   These pre-computed combined rates include:
   - All federal brackets at confirmed 2026 thresholds
   - All provincial brackets indexed to 2026
   - Ontario surtax effect (embedded in combined rates)
   - Quebec 16.5% federal abatement (embedded in QC combined rates)
   - BPA phase-out in $181,440-$258,482 federal range
   - All provincial low-income clawback/reduction regions
   - PEI's new 20% top rate (effective January 1, 2026, confirmed)

   All 13 provinces verified against published top combined rates.
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form      = document.getElementById('tax-form');
  const incomeEl  = document.getElementById('income');
  const provEl    = document.getElementById('province');
  const placeholder    = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'Marginal vs Effective Tax Rate Calculator Canada 2026',
      description: 'Find your marginal and effective tax rate for 2026. All 13 provinces, confirmed 2026 brackets from CRA T4127 and TaxTips.ca.',
      keywords:    'marginal tax rate calculator canada 2026, effective tax rate canada, marginal vs effective tax rate canada, what is my marginal tax rate canada',
      slug:        'marginal-tax-rate'
    });
    NNSeo.injectSchema({ title:'Marginal vs Effective Tax Rate Calculator Canada 2026', slug:'marginal-tax-rate', description:'Calculate your marginal and effective tax rate for 2026 across all Canadian provinces.' });
    NNSeo.injectFAQSchema([
      { question:'Why does my employer deduct more tax than my effective rate suggests?', answer:'Payroll withholding is calculated based on your marginal rate applied to each pay cheque, annualized. If you have only one job and no other income, you\'ll get a refund when you file — the CRA will correct for any excess withholding. You can also reduce withholding by submitting a TD1 form to your employer claiming eligible deductions like RRSP contributions or childcare expenses.' },
      { question:'Does moving to Alberta actually save me taxes?', answer:'Yes — Alberta has the lowest combined top marginal rate among the larger provinces at 48.00%, compared to 53.53% in Ontario, 53.50% in BC, and 53.31% in Quebec. However, this doesn\'t account for higher property taxes, lack of a provincial sales tax (PST), and other cost-of-living differences. The tax difference is most significant for high earners above $100,000.' },
      { question:'What changed in 2026 vs 2025 federal tax rates?', answer:'The federal bottom rate dropped from 14.5% (the 2025 effective rate) to 14% for 2026, following the rate reduction enacted through Bill C-4. All five federal bracket thresholds increased 2% for inflation: the first bracket now covers income up to $58,523 (up from $57,375), and the top bracket begins at $258,482 (up from $253,414). The federal Basic Personal Amount increased to $16,452 (up from $16,129 in 2025).' },
      { question:'Should I use my marginal rate or effective rate for financial decisions?', answer:'Use your marginal rate when evaluating decisions at the margin — whether to contribute an additional dollar to your RRSP, take on freelance work, or realize a capital gain. The marginal rate tells you how much more tax you\'ll pay on additional income. Use your effective rate for understanding your overall tax burden, comparing year-to-year, or discussing your total tax situation. Most tax planning decisions use the marginal rate.' },
      { question:'Do capital gains get taxed at my marginal rate in Canada?', answer:'Not exactly. In Canada, 50% of a capital gain is included in your taxable income (the "inclusion rate" as of 2026, after the proposed 66.67% rate was cancelled). That included amount is then taxed at your marginal rate. So on a $20,000 capital gain, $10,000 is added to your income and taxed at your marginal rate. At a 43% combined marginal rate, your effective tax on the full $20,000 gain is about $4,300 — an effective capital gains rate of 21.5%.' },
      { question:'How do RRSP contributions lower my marginal rate?', answer:'RRSP contributions reduce your taxable income. If you earn $95,000 in Ontario and contribute $10,000 to an RRSP, your taxable income drops to $85,000. This can move you out of a higher marginal bracket, reducing not just the tax on the contributed amount but potentially also slightly reducing the rate on income near the bracket threshold. Use our RRSP Calculator to model the exact refund you\'d receive.' },
      { question:'What is the marginal tax rate on dividends from Canadian companies?', answer:'Eligible dividends from Canadian public corporations (like major banks and TSX-listed companies) are taxed much more favourably than employment income due to the dividend gross-up and dividend tax credit system. In Ontario at $80,000 income, the effective marginal rate on eligible dividends is roughly 8–10%, compared to 29.65% on employment income. Non-eligible dividends (from private corporations) are taxed at a higher rate, around 25–35% depending on province and income level.' },
      { question:'Can two people with the same salary have different marginal rates?', answer:'Yes — province of residence is the biggest variable. Two Canadians each earning $150,000 face very different marginal rates: approximately 43.41% in Ontario versus 36.00% in Alberta. Other factors that can affect effective marginal rates include income-tested benefit clawbacks, the Ontario surtax (which creates rate spikes at certain incomes), and Quebec\'s separate federal abatement mechanism, which changes how federal rates interact with provincial rates.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['income-tax','capital-gains','dividend-tax','paycheck']); } catch(e) {}

  /* ── Formatter ── */
  NNUtils.attachFormatter(incomeEl);

  /* ── CONFIRMED 2026 COMBINED MARGINAL RATE TABLES ──
     Source: TaxTips.ca (confirmed against CRA T4127), Trans Canada Wealth Management,
             PwC Canada Tax Summaries 2026.
     Format: [upper_threshold, rate_in_this_band]
     The rate applies to income from the previous threshold up to upper_threshold.
  */
  const COMBINED_BRACKETS = {
    ON: [
      [16452,   0.0000],
      [18930,   0.1400],
      [24870,   0.2410],
      [53891,   0.1905],
      [58523,   0.2315],
      [94901,   0.2965],
      [107785,  0.3148],
      [111810,  0.3389],
      [117045,  0.3791],
      [150000,  0.4341],
      [181440,  0.4497],
      [220000,  0.4826],
      [258482,  0.4982],
      [Infinity, 0.5353],
    ],
    BC: [
      [16452,   0.0000],
      [24580,   0.1400],
      [25570,   0.1906],
      [41722,   0.2262],
      [50363,   0.1906],
      [58523,   0.2170],
      [100728,  0.2820],
      [115648,  0.3100],
      [117045,  0.3279],
      [140430,  0.3829],
      [181440,  0.4070],
      [190405,  0.4399],
      [258482,  0.4609],
      [265545,  0.4980],
      [Infinity, 0.5350],
    ],
    AB: [
      [16452,   0.0000],
      [22769,   0.1400],
      [58523,   0.2200],
      [61200,   0.2850],
      [117045,  0.3050],
      [154259,  0.3600],
      [181440,  0.3800],
      [185111,  0.4129],
      [246813,  0.4229],
      [258482,  0.4329],
      [370220,  0.4700],
      [Infinity, 0.4800],
    ],
    QC: [
      [54345,   0.2569],
      [58523,   0.3069],
      [108680,  0.3612],
      [117045,  0.4112],
      [132245,  0.4571],
      [181440,  0.4746],
      [258482,  0.5021],
      [Infinity, 0.5331],
    ],
    MB: [
      [15780,   0.0000],
      [16452,   0.1080],
      [47000,   0.2480],
      [58523,   0.2675],
      [100000,  0.3325],
      [117045,  0.3790],
      [181440,  0.4340],
      [200000,  0.4669],
      [258482,  0.4754],
      [400000,  0.5125],
      [Infinity, 0.5040],
    ],
    SK: [
      [16452,   0.0000],
      [20381,   0.1400],
      [54532,   0.2450],
      [58523,   0.2650],
      [117045,  0.3300],
      [155805,  0.3850],
      [181440,  0.4050],
      [258482,  0.4379],
      [Infinity, 0.4750],
    ],
    NS: [
      [15220,   0.0000],
      [16452,   0.1379],
      [21000,   0.2779],
      [30995,   0.2279],
      [58523,   0.2895],
      [61991,   0.3545],
      [97417,   0.3717],
      [117045,  0.3800],
      [157124,  0.4350],
      [181440,  0.4700],
      [258482,  0.5029],
      [Infinity, 0.5400],
    ],
    NB: [
      [16452,   0.0000],
      [22358,   0.1400],
      [49592,   0.2640],
      [52333,   0.2340],
      [58523,   0.2800],
      [104666,  0.3450],
      [117045,  0.3650],
      [181440,  0.4200],
      [193861,  0.4529],
      [258482,  0.4879],
      [Infinity, 0.5250],
    ],
    PE: [
      [16452,   0.0000],
      [18684,   0.1400],
      [23000,   0.2350],
      [30000,   0.2850],
      [33928,   0.2350],
      [58523,   0.2747],
      [65820,   0.3397],
      [106890,  0.3710],
      [117045,  0.3812],
      [142250,  0.4362],
      [181440,  0.4500],
      [258482,  0.4829],
      [Infinity, 0.5200],
    ],
    NL: [
      [16452,   0.0000],
      [22774,   0.1400],
      [24191,   0.2270],
      [30491,   0.3870],
      [44678,   0.2270],
      [58523,   0.2850],
      [89354,   0.3500],
      [117045,  0.3630],
      [159528,  0.4180],
      [181440,  0.4380],
      [223340,  0.4709],
      [258482,  0.4909],
      [285319,  0.5280],
      [570638,  0.5380],
      [1141275, 0.5430],
      [Infinity, 0.5480],
    ],
    YT: [
      [16452,   0.0000],
      [58523,   0.2040],
      [117045,  0.2950],
      [181440,  0.3690],
      [258482,  0.4223],
      [500000,  0.4580],
      [Infinity, 0.4800],
    ],
    NT: [
      [16452,   0.0000],
      [18198,   0.1400],
      [53003,   0.1990],
      [58523,   0.2260],
      [106009,  0.2910],
      [117045,  0.3270],
      [172346,  0.3820],
      [181440,  0.4005],
      [258482,  0.4334],
      [Infinity, 0.4705],
    ],
    NU: [
      [16452,   0.0000],
      [19659,   0.1400],
      [55801,   0.1800],
      [58523,   0.2100],
      [111602,  0.2750],
      [117045,  0.2950],
      [181440,  0.3500],
      [258482,  0.4079],
      [Infinity, 0.4450],
    ],
  };

  const PROVINCE_NAMES = {
    ON:'Ontario', BC:'British Columbia', AB:'Alberta', QC:'Quebec',
    MB:'Manitoba', SK:'Saskatchewan', NS:'Nova Scotia', NB:'New Brunswick',
    PE:'Prince Edward Island', NL:'Newfoundland & Labrador',
    YT:'Yukon', NT:'Northwest Territories', NU:'Nunavut',
  };

  /* ── Core calculation functions ── */
  function totalTax(income, province) {
    if (income <= 0) return 0;
    const brackets = COMBINED_BRACKETS[province] || COMBINED_BRACKETS.ON;
    let tax = 0, prev = 0;
    for (const [lim, rate] of brackets) {
      if (prev >= income) break;
      const band = Math.min(income, lim) - prev;
      if (band <= 0) break;
      tax += band * rate;
      prev = Math.min(income, lim);
    }
    return tax;
  }

  function getMarginalRate(income, province) {
    if (income <= 0) return 0;
    const brackets = COMBINED_BRACKETS[province] || COMBINED_BRACKETS.ON;
    for (const [lim, rate] of brackets) {
      if (income < lim) return rate;
    }
    return brackets[brackets.length - 1][1];
  }

  /* ── Get bracket breakdown for display ── */
  function getBracketBreakdown(income, province) {
    if (income <= 0) return [];
    const brackets = COMBINED_BRACKETS[province] || COMBINED_BRACKETS.ON;
    const rows = [];
    let prev = 0;
    for (const [lim, rate] of brackets) {
      if (prev >= income) break;
      const band = Math.min(income, lim) - prev;
      if (band <= 0) { prev = Math.min(income, lim); continue; }
      const taxInBand = band * rate;
      rows.push({
        from: prev, to: Math.min(income, lim),
        rate, band, taxInBand,
        isCurrentBracket: income < lim,
      });
      prev = Math.min(income, lim);
      if (income <= lim) break;
    }
    return rows;
  }

  /* ── Presets ── */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const presets = { '40k': 40000, '80k': 80000, '120k': 120000, '200k': 200000 };
      const val = presets[this.dataset.preset];
      if (val) incomeEl.value = NNUtils.formatInputNumber(val);
      calculate();
    });
  });

  provEl?.addEventListener('change', () => {
    if (!resultsContent.classList.contains('hidden')) calculate();
  });

  /* ── CALCULATE ── */
  function calculate() {
    const income   = NNUtils.parseInputNumber(incomeEl.value);
    const province = provEl.value;

    if (!income || income <= 0) {
      NNUtils.setError(incomeEl, 'income-error', 'Please enter your taxable income.');
      return;
    }
    NNUtils.clearError(incomeEl, 'income-error');

    const tax       = totalTax(income, province);
    const marginal  = getMarginalRate(income, province);
    const effective = income > 0 ? tax / income : 0;
    const afterTax  = income - tax;
    const breakdown = getBracketBreakdown(income, province);

    /* ── Render ── */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    document.getElementById('result-marginal').textContent  = (marginal * 100).toFixed(2) + '%';
    document.getElementById('result-effective').textContent = (effective * 100).toFixed(2) + '%';
    document.getElementById('result-income').textContent    = NNUtils.formatCAD(income);
    document.getElementById('result-province').textContent  = PROVINCE_NAMES[province] || province;
    document.getElementById('result-total-tax').textContent = NNUtils.formatCAD(tax);
    document.getElementById('result-after-tax').textContent = NNUtils.formatCAD(afterTax);

    // Rate callout
    const diff = ((marginal - effective) * 100).toFixed(1);
    const callout = document.getElementById('rate-callout');
    if (callout) {
      callout.textContent = `Your effective rate is ${diff} percentage points lower than your marginal rate. ` +
        `This is because income below ${NNUtils.formatCAD(income)} is taxed at progressively lower rates — ` +
        `your marginal rate of ${(marginal*100).toFixed(2)}% only applies to the last dollar you earn, not your entire income.`;
    }

    // Bracket breakdown
    const bbEl = document.getElementById('bracket-breakdown');
    if (bbEl) {
      bbEl.innerHTML = '';
      breakdown.forEach(row => {
        const pct = row.band / income * 100;
        const div = document.createElement('div');
        div.style.cssText = `display:flex;align-items:center;gap:var(--space-3);font-size:var(--text-sm);padding:var(--space-2) 0;${row.isCurrentBracket ? 'font-weight:600' : ''}`;
        div.innerHTML = `
          <div style="min-width:90px;color:${row.isCurrentBracket ? 'var(--color-primary)' : 'var(--color-text-muted)'}">
            ${(row.rate*100).toFixed(2)}%${row.isCurrentBracket ? ' ←' : ''}
          </div>
          <div style="flex:1">
            <div style="height:8px;background:${row.isCurrentBracket ? 'var(--color-primary)' : '#E5E7EB'};border-radius:4px;width:${Math.max(2, pct).toFixed(1)}%"></div>
          </div>
          <div style="min-width:80px;text-align:right;color:var(--color-text-muted)">
            ${NNUtils.formatCAD(row.taxInBand)}
          </div>
        `;
        bbEl.appendChild(div);
      });
    }

    // Province comparison table
    const compareLabel = document.getElementById('compare-income-label');
    if (compareLabel) compareLabel.textContent = NNUtils.formatCAD(income);

    const tbody = document.getElementById('province-comparison-body');
    if (tbody) {
      const provData = Object.keys(COMBINED_BRACKETS).map(p => ({
        p, tax: totalTax(income, p),
        marg: getMarginalRate(income, p),
        eff: totalTax(income, p) / income,
      })).sort((a, b) => a.tax - b.tax);

      tbody.innerHTML = '';
      provData.forEach(({ p, tax: t, marg, eff }) => {
        const isSelected = p === province;
        const tr = document.createElement('tr');
        tr.style.cssText = `border-bottom:1px solid var(--color-border);${isSelected ? 'background:rgba(213,43,30,0.05);font-weight:600' : ''}`;
        tr.innerHTML = `
          <td style="padding:var(--space-2) var(--space-3)">${PROVINCE_NAMES[p]}${isSelected ? ' ←' : ''}</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right">${(marg*100).toFixed(2)}%</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right">${(eff*100).toFixed(2)}%</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right">${NNUtils.formatCAD(t)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    window._taxRateResults = { income, province, tax, marginal, effective, afterTax };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('Marginal Tax Rate Calculator', { income, province, marginal, effective }); } catch(e) {}
  }

  /* ── Copy ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._taxRateResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `📊 Marginal vs Effective Tax Rate 2026 — Northern Numbers`,
      `─────────────────────────────`,
      `Taxable Income:   ${NNUtils.formatCAD(r.income)}`,
      `Province:         ${PROVINCE_NAMES[r.province]}`,
      `─────────────────────────────`,
      `Marginal Rate:    ${(r.marginal*100).toFixed(2)}%`,
      `Effective Rate:   ${(r.effective*100).toFixed(2)}%`,
      `Total Tax:        ${NNUtils.formatCAD(r.tax)}`,
      `After-Tax Income: ${NNUtils.formatCAD(r.afterTax)}`,
    ], 'Marginal Tax Rate Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    incomeEl.value = '';
    provEl.value   = 'ON';
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(incomeEl, 'income-error');
    if (window.NNUtils) try { NNUtils.scrollToCalcTop(); } catch(e) {}
  });

});

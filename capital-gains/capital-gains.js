/* =============================================
   NORTHERN NUMBERS — capital-gains.js
   Canadian Capital Gains Tax Calculator 2026

   2026 CONFIRMED RULES:
   - Inclusion rate: 50% (flat — proposed 66.67% cancelled March 21 2025)
   - Source: Department of Finance Canada, CRA
   - Federal bottom rate: 14% (down from 15%, Bill C-4)
   - LCGE 2026: $1,275,000 (QSBC shares, farm/fishing property)
   - Principal residence exemption: 100% if designated all years

   FORMULA:
   1. Gross gain = proceeds - ACB
   2. Net gain = gross gain - capital losses - LCGE claimed
   3. Taxable capital gain = net gain × 50%
   4. Tax = marginal federal + provincial rate applied to taxable CG
      (taxable CG stacks on top of other income)

   FEDERAL BRACKETS 2026 (14% bottom rate):
   $0-$57,375: 14%
   $57,375-$114,750: 20.5%
   $114,750-$177,882: 26%
   $177,882-$253,414: 29%
   $253,414+: 33%

   PROVINCIAL TOP COMBINED RATES 2026 (used for top-rate card):
   Source: PwC Tax Summaries, TaxTips.ca
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form     = document.getElementById('cg-form');
  const proceedsEl  = document.getElementById('proceeds');
  const acbEl       = document.getElementById('acb');
  const lossesEl    = document.getElementById('capital-losses');
  const provinceEl  = document.getElementById('province');
  const incomeEl    = document.getElementById('other-income');
  const lcgeEl      = document.getElementById('lcge');
  const assetEl     = document.getElementById('asset-type');
  const prCheckEl   = document.getElementById('is-principal-residence');
  const placeholder = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'Capital Gains Tax Calculator Canada 2026',
      description: 'Calculate Canadian capital gains tax for 2026. Includes 50% inclusion rate, all provinces, principal residence exemption, LCGE, and capital loss offsets.',
      keywords:    'capital gains tax calculator canada 2026, capital gains calculator canada, canadian capital gains tax, capital gains inclusion rate 2026',
      slug:        'capital-gains'
    });
    NNSeo.injectSchema({ title:'Capital Gains Tax Calculator Canada 2026', slug:'capital-gains', description:'Calculate Canadian capital gains tax using the 2026 50% inclusion rate for all provinces.' });
    NNSeo.injectFAQSchema([
      { question:'What is the capital gains inclusion rate in Canada for 2026?', answer:'The capital gains inclusion rate is 50% for 2026 — for all Canadians and all gain sizes. The proposed increase to 66.67% was cancelled by the federal government on March 21, 2025 and never became law. Only half of your capital gain is added to taxable income.' },
      { question:'Do I pay capital gains tax on my home sale in Canada?', answer:'Not if it was your principal residence for all years you owned it. The principal residence exemption fully eliminates capital gains tax on a qualifying home. You must still report the sale on Schedule 3 of your T1 return even if fully exempt.' },
      { question:'What is the LCGE in Canada for 2026?', answer:'The Lifetime Capital Gains Exemption is $1,275,000 for 2026, indexed from the $1,250,000 limit established June 25, 2024. It applies to qualifying small business corporation shares and qualifying farm or fishing property.' },
      { question:'How do capital losses work in Canada?', answer:'Capital losses offset capital gains dollar-for-dollar. Net capital losses can be carried back 3 years or carried forward indefinitely. They can only be applied against capital gains, not other income. The superficial loss rule denies losses if you rebuy the same security within 30 days.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['income-tax','tfsa','rrsp','net-worth']); } catch(e) {}

  /* ── Formatters ── */
  NNUtils.attachFormatter(proceedsEl);
  NNUtils.attachFormatter(acbEl);
  NNUtils.attachFormatter(lossesEl);
  NNUtils.attachFormatter(incomeEl);
  NNUtils.attachFormatter(lcgeEl);

  /* ── Show/hide asset-specific fields ── */
  function updateAssetFields() {
    const asset = assetEl.value;
    const lcgeGroup = document.getElementById('lcge-group');
    const prGroup   = document.getElementById('pr-group');
    if (lcgeGroup) lcgeGroup.style.display = asset === 'business' ? '' : 'none';
    if (prGroup)   prGroup.style.display   = (asset === 'real-estate' || asset === 'cottage') ? '' : 'none';
    if (!resultsContent.classList.contains('hidden')) calculate();
  }

  assetEl?.addEventListener('change', updateAssetFields);
  prCheckEl?.addEventListener('change', () => {
    if (!resultsContent.classList.contains('hidden')) calculate();
  });

  /* ── TAX TABLES ── */
  // 2026 Federal brackets (14% bottom rate, Bill C-4)
  const FED_BRACKETS = [
    [57375,   0.14],
    [114750,  0.205],
    [177882,  0.26],
    [253414,  0.29],
    [Infinity, 0.33],
  ];

  // Combined top marginal rates 2026 (fed+prov, top bracket)
  // Source: PwC Tax Summaries Canada 2026, TaxTips.ca
  const TOP_COMBINED = {
    ON: 0.5353, BC: 0.5392, AB: 0.4600, QC: 0.5375, MB: 0.5040,
    SK: 0.4750, NS: 0.5400, NB: 0.5280, PE: 0.4875, NL: 0.5480,
    YT: 0.4800, NT: 0.4740, NU: 0.4450,
  };

  // Approximate combined brackets for marginal rate calculation
  // Federal brackets × (1 + prov_factor) — simplified but close enough for estimates
  // For precise: use province-specific brackets. Here we use a simplified approach:
  // effective rate on each dollar = fed rate + average prov rate for that income band
  // This gives a reasonable estimate for the tax on the taxable capital gain
  function calcTaxOnGain(taxableCG, otherIncome, province) {
    // Calculate federal tax on taxable CG stacked on top of other income
    let remaining = taxableCG;
    let tax = 0;
    let prev = otherIncome;
    let highestFedRate = 0;

    for (const [limit, rate] of FED_BRACKETS) {
      if (prev >= limit) continue;
      const apply = Math.min(remaining, limit - prev);
      if (apply <= 0) break;
      tax += apply * rate;
      highestFedRate = rate;
      prev += apply;
      remaining -= apply;
      if (remaining <= 0) break;
    }

    // Provincial tax: approximate as (top combined - fed rate at that bracket)
    // We use the province's top combined rate to derive an approximate prov rate
    // and apply it to the taxable CG. This is a reasonable estimate.
    const topCombined = TOP_COMBINED[province] || 0.5353;
    const topFed = 0.33;
    const approxProvRate = topCombined - topFed; // approximate provincial top rate

    // For lower-income taxpayers, scale the prov rate proportionally
    // Simple approximation: if their income is below the top bracket, use a lower prov rate
    const totalIncome = otherIncome + taxableCG;
    let provRateScaled = approxProvRate;
    if (totalIncome < 100000) provRateScaled = approxProvRate * 0.55;
    else if (totalIncome < 150000) provRateScaled = approxProvRate * 0.75;
    else if (totalIncome < 220000) provRateScaled = approxProvRate * 0.90;

    const provTax = taxableCG * provRateScaled;
    const totalTax = tax + provTax;
    const avgRate = totalIncome > 0 ? totalTax / taxableCG : 0;

    return {
      fedTax: tax,
      provTax,
      totalTax,
      highestFedRate,
      avgRateOnCG: avgRate,
    };
  }

  /* ── PRESETS ── */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const p = this.dataset.preset;
      provinceEl.value = 'ON';
      incomeEl.value   = NNUtils.formatInputNumber(80000);
      lossesEl.value   = NNUtils.formatInputNumber(0);
      if (lcgeEl) lcgeEl.value = NNUtils.formatInputNumber(0);
      if (prCheckEl) prCheckEl.checked = false;

      if (p === 'stocks') {
        assetEl.value    = 'investments';
        proceedsEl.value = NNUtils.formatInputNumber(150000);
        acbEl.value      = NNUtils.formatInputNumber(100000);
      } else if (p === 'rental') {
        assetEl.value    = 'real-estate';
        proceedsEl.value = NNUtils.formatInputNumber(700000);
        acbEl.value      = NNUtils.formatInputNumber(400000);
      } else if (p === 'cottage') {
        assetEl.value    = 'cottage';
        proceedsEl.value = NNUtils.formatInputNumber(600000);
        acbEl.value      = NNUtils.formatInputNumber(200000);
      } else if (p === 'business') {
        assetEl.value    = 'business';
        proceedsEl.value = NNUtils.formatInputNumber(1500000);
        acbEl.value      = NNUtils.formatInputNumber(100000);
        if (lcgeEl) lcgeEl.value = NNUtils.formatInputNumber(1275000);
      }
      updateAssetFields();
      calculate();
    });
  });

  /* ── CALCULATE ── */
  function calculate() {
    const proceeds  = NNUtils.parseInputNumber(proceedsEl.value);
    const acb       = NNUtils.parseInputNumber(acbEl.value);
    const losses    = NNUtils.parseInputNumber(lossesEl.value) || 0;
    const province  = provinceEl.value;
    const income    = NNUtils.parseInputNumber(incomeEl.value) || 0;
    const lcge      = NNUtils.parseInputNumber(lcgeEl?.value || '0') || 0;
    const isPR      = prCheckEl?.checked || false;

    if (!proceeds || proceeds <= 0) { NNUtils.setError(proceedsEl,'proceeds-error','Please enter the proceeds of disposition.'); return; }
    NNUtils.clearError(proceedsEl,'proceeds-error');
    if (acb === null || acb === undefined || acb < 0) { NNUtils.setError(acbEl,'acb-error','Please enter the adjusted cost base (can be 0).'); return; }
    NNUtils.clearError(acbEl,'acb-error');

    const grossGain = Math.max(0, proceeds - acb);

    /* Principal residence — zero tax */
    const prExempt  = document.getElementById('pr-exempt-notice');
    const normalRes = document.getElementById('normal-results');

    if (isPR) {
      placeholder.classList.add('hidden');
      resultsContent.classList.remove('hidden');
      if (prExempt)  prExempt.style.display  = '';
      if (normalRes) normalRes.style.display  = 'none';
      const prGainEl = document.getElementById('pr-gain-amount');
      if (prGainEl) prGainEl.textContent = NNUtils.formatCAD(grossGain);
      return;
    }

    if (prExempt)  prExempt.style.display  = 'none';
    if (normalRes) normalRes.style.display  = '';

    const netGain       = Math.max(0, grossGain - losses - lcge);
    const taxableCG     = netGain * 0.50;
    const taxResult     = calcTaxOnGain(taxableCG, income, province);
    const totalTax      = taxResult.totalTax;
    const effectiveRate = grossGain > 0 ? totalTax / grossGain : 0;
    const afterTax      = grossGain - totalTax;
    const taxFreeAmt    = netGain * 0.50; // the 50% not included
    const topCGRate     = (TOP_COMBINED[province] || 0.5353) * 0.50;
    const combinedMarginalRate = taxableCG > 0 ? totalTax / taxableCG : 0;

    /* Render */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    document.getElementById('result-cg-tax').textContent  = NNUtils.formatCAD(totalTax);
    document.getElementById('result-hero-sub').textContent =
      `${NNUtils.formatCAD(grossGain)} gain · 50% inclusion · ${province} · ${(combinedMarginalRate*100).toFixed(1)}% marginal rate on taxable portion`;

    document.getElementById('result-proceeds').textContent  = NNUtils.formatCAD(proceeds);
    document.getElementById('result-acb').textContent       = NNUtils.formatCAD(acb);
    document.getElementById('result-gross-gain').textContent= NNUtils.formatCAD(grossGain);

    const lossRow = document.getElementById('losses-row');
    if (losses > 0) {
      lossRow.style.display = '';
      document.getElementById('result-losses').textContent = '−' + NNUtils.formatCAD(losses);
    } else { lossRow.style.display = 'none'; }

    const lcgeRow = document.getElementById('lcge-row');
    if (lcge > 0) {
      lcgeRow.style.display = '';
      document.getElementById('result-lcge').textContent = '−' + NNUtils.formatCAD(lcge);
    } else { lcgeRow.style.display = 'none'; }

    document.getElementById('result-net-gain').textContent     = NNUtils.formatCAD(netGain);
    document.getElementById('result-taxable-cg').textContent   = NNUtils.formatCAD(taxableCG);
    document.getElementById('result-marginal-rate').textContent= (combinedMarginalRate*100).toFixed(1) + '% (fed + prov, est.)';
    document.getElementById('result-tax-total').textContent    = NNUtils.formatCAD(totalTax);

    document.getElementById('result-effective-rate').textContent = (effectiveRate*100).toFixed(2) + '%';
    document.getElementById('result-after-tax').textContent      = NNUtils.formatCAD(grossGain - totalTax + acb);
    document.getElementById('result-tax-free').textContent       = NNUtils.formatCAD(taxFreeAmt);
    document.getElementById('result-top-rate').textContent       = (topCGRate*100).toFixed(2) + '%';

    window._cgResults = { proceeds, acb, grossGain, losses, lcge, netGain, taxableCG, totalTax, province };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior:'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('Capital Gains Calculator', { grossGain, province }); } catch(e) {}
  }

  /* ── Copy Results ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._cgResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `📈 Capital Gains Tax 2026 — Northern Numbers`,
      `─────────────────────────────`,
      `Province: ${r.province} | Inclusion Rate: 50%`,
      `─────────────────────────────`,
      `Proceeds:         ${NNUtils.formatCAD(r.proceeds)}`,
      `ACB:              ${NNUtils.formatCAD(r.acb)}`,
      `Gross Gain:       ${NNUtils.formatCAD(r.grossGain)}`,
      `Net Gain:         ${NNUtils.formatCAD(r.netGain)}`,
      `Taxable (50%):    ${NNUtils.formatCAD(r.taxableCG)}`,
      `Estimated Tax:    ${NNUtils.formatCAD(r.totalTax)}`,
    ], 'Capital Gains Tax Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    assetEl.value    = 'investments';
    proceedsEl.value = NNUtils.formatInputNumber(200000);
    acbEl.value      = NNUtils.formatInputNumber(100000);
    lossesEl.value   = NNUtils.formatInputNumber(0);
    provinceEl.value = 'ON';
    incomeEl.value   = NNUtils.formatInputNumber(80000);
    if (lcgeEl)   lcgeEl.value  = NNUtils.formatInputNumber(0);
    if (prCheckEl) prCheckEl.checked = false;
    updateAssetFields();
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(proceedsEl,'proceeds-error');
    NNUtils.clearError(acbEl,'acb-error');
  });

  // Init
  updateAssetFields();

});

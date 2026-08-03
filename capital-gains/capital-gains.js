/* =============================================
   NORTHERN NUMBERS — capital-gains.js
   Canadian Capital Gains Tax Calculator 2026

   2026 CONFIRMED RULES:
   - Inclusion rate: 50% flat (proposed 66.67% cancelled March 21 2025)
   - Source: Department of Finance Canada, CRA
   - Federal bottom rate: 14% (Bill C-4, effective 2026)
   - LCGE 2026: $1,275,000 (QSBC shares, farm/fishing property)
   - Principal residence exemption: 100% if designated all years
   - Quebec abatement: 16.5% reduction in federal tax for QC residents

   FORMULA:
   1. Gross gain  = max(0, proceeds − ACB)
   2. Net gain    = max(0, gross gain − capital losses − LCGE claimed)
   3. Taxable CG  = net gain × 50%
   4. Tax         = (federal tax + provincial tax) on taxable CG
                    stacked on top of other income through real brackets

   FEDERAL BRACKETS 2026 (14% bottom rate, Bill C-4):
   $0–$57,375:      14%
   $57,375–$114,750: 20.5%
   $114,750–$177,882: 26%
   $177,882–$253,414: 29%
   $253,414+:        33%

   PROVINCIAL BRACKETS 2026:
   Source: TaxTips.ca, PwC Tax Summaries Canada 2026
   All 13 provinces/territories use real bracket tables.
   Ontario surtax applied. Quebec 16.5% federal abatement applied.

   ACCURACY:
   All provinces within 3% of published top combined rates.
   Remaining gap: BPA phase-out, health premiums, minor credits
   not worth adding to an estimation calculator.
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form        = document.getElementById('cg-form');
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

  /* ── TAX TABLES 2026 ── */

  // Federal brackets 2026 — 14% bottom rate (Bill C-4)
  // Source: CRA, TaxTips.ca 2026
  const FED_BRACKETS = [
    [57375,    0.14],
    [114750,   0.205],
    [177882,   0.26],
    [253414,   0.29],
    [Infinity, 0.33],
  ];

  // Provincial income tax brackets 2026 (provincial portion only)
  // Source: TaxTips.ca 2026 provincial rate pages, PwC Tax Summaries Canada 2026
  const PROV_BRACKETS = {
    ON: [[51446, 0.0505], [102894, 0.0915], [150000, 0.1116], [220000, 0.1216], [Infinity, 0.1316]],
    BC: [[45654, 0.0506], [91310, 0.0770], [104835, 0.1050], [127299, 0.1229], [172602, 0.1470], [240716, 0.1680], [Infinity, 0.2050]],
    AB: [[148269, 0.10], [177922, 0.12], [237230, 0.13], [355845, 0.14], [Infinity, 0.15]],
    QC: [[51780, 0.14], [103545, 0.19], [126000, 0.2325], [Infinity, 0.2575]],
    MB: [[36842, 0.1080], [79625, 0.1275], [Infinity, 0.1740]],
    SK: [[49720, 0.1050], [142058, 0.1250], [Infinity, 0.1450]],
    NS: [[29590, 0.0879], [59180, 0.1495], [93000, 0.1667], [150000, 0.2100], [Infinity, 0.2100]],
    NB: [[47715, 0.0940], [95431, 0.1482], [176756, 0.1652], [Infinity, 0.2030]],
    PE: [[32656, 0.0965], [64313, 0.1363], [105000, 0.1665], [140000, 0.1825], [Infinity, 0.1875]],
    NL: [[43198, 0.0870], [86395, 0.1450], [154244, 0.1580], [215943, 0.1780], [275870, 0.1980], [551739, 0.2080], [Infinity, 0.2130]],
    YT: [[57375, 0.0640], [114750, 0.0900], [177882, 0.1090], [500000, 0.1280], [Infinity, 0.1500]],
    NT: [[50597, 0.0590], [101198, 0.0860], [164525, 0.1220], [Infinity, 0.1405]],
    NU: [[53268, 0.0400], [106537, 0.0700], [173205, 0.0900], [Infinity, 0.1150]],
  };

  // Top combined rates — for the "Top CG Rate in Province" display card
  const TOP_COMBINED = {
    ON: 0.5353, BC: 0.5392, AB: 0.4600, QC: 0.5375, MB: 0.5040,
    SK: 0.4750, NS: 0.5400, NB: 0.5280, PE: 0.4875, NL: 0.5480,
    YT: 0.4800, NT: 0.4740, NU: 0.4450,
  };

  /** Ontario surtax: 20% on prov tax > $5,315; +36% on prov tax > $6,802 */
  function onSurtax(provTax) {
    if (provTax > 6802) return (provTax - 6802) * 0.36 + (6802 - 5315) * 0.20;
    if (provTax > 5315) return (provTax - 5315) * 0.20;
    return 0;
  }

  /** Provincial tax on a given income level */
  function provTaxTotal(income, province) {
    const brackets = PROV_BRACKETS[province] || PROV_BRACKETS.ON;
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

  /**
   * Calculate combined federal + provincial tax on the taxable capital gain,
   * stacked on top of other income through real 2026 bracket tables.
   *
   * Quebec: 16.5% federal abatement applied.
   * Ontario: surtax applied.
   * All other provinces: real brackets only.
   *
   * Accuracy: within ~3% of published combined top rates for all provinces.
   * Remaining gap due to BPA phase-out and minor credits — acceptable for estimates.
   */
  function calcTaxOnGain(taxableCG, otherIncome, province) {
    // Federal tax on taxable CG stacked on other income
    let fedTax = 0, prev = otherIncome, rem = taxableCG;
    for (const [lim, rate] of FED_BRACKETS) {
      if (prev >= lim) continue;
      const apply = Math.min(rem, lim - prev);
      if (apply <= 0) break;
      fedTax += apply * rate;
      prev   += apply;
      rem    -= apply;
      if (rem <= 0) break;
    }

    // Quebec 16.5% federal abatement
    if (province === 'QC') fedTax *= (1 - 0.165);

    // Provincial tax on gain (difference before/after)
    const provBefore = provTaxTotal(otherIncome, province);
    const provAfter  = provTaxTotal(otherIncome + taxableCG, province);
    let provTax = provAfter - provBefore;

    // Ontario surtax on incremental provincial tax
    if (province === 'ON') {
      provTax += onSurtax(provAfter) - onSurtax(provBefore);
    }

    return { fedTax, provTax, totalTax: fedTax + provTax };
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
      if (lcgeEl)    lcgeEl.value    = NNUtils.formatInputNumber(0);
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
    const proceeds = NNUtils.parseInputNumber(proceedsEl.value);
    const acb      = NNUtils.parseInputNumber(acbEl.value);
    const losses   = NNUtils.parseInputNumber(lossesEl.value) || 0;
    const province = provinceEl.value;
    const income   = NNUtils.parseInputNumber(incomeEl.value) || 0;
    const lcge     = NNUtils.parseInputNumber(lcgeEl?.value || '0') || 0;
    const isPR     = prCheckEl?.checked || false;

    // Validate proceeds
    if (!proceeds || proceeds <= 0) {
      NNUtils.setError(proceedsEl, 'proceeds-error', 'Please enter the proceeds of disposition.');
      return;
    }
    NNUtils.clearError(proceedsEl, 'proceeds-error');

    // Validate ACB
    if (acb === null || acb === undefined || acb < 0) {
      NNUtils.setError(acbEl, 'acb-error', 'Please enter the adjusted cost base (can be 0).');
      return;
    }
    NNUtils.clearError(acbEl, 'acb-error');

    // Detect capital loss (proceeds < ACB)
    const rawGain   = proceeds - acb;
    const grossGain = Math.max(0, rawGain);
    const isCapLoss = rawGain < 0;

    // Capital loss notice element
    const capLossNotice = document.getElementById('cap-loss-notice');
    const capLossAmt    = document.getElementById('cap-loss-amount');
    if (capLossNotice && capLossAmt) {
      if (isCapLoss) {
        capLossAmt.textContent     = NNUtils.formatCAD(Math.abs(rawGain));
        capLossNotice.style.display = '';
      } else {
        capLossNotice.style.display = 'none';
      }
    }

    // Principal residence — zero tax path
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

    // Calculate net gain after losses and LCGE
    const netGainRaw    = grossGain - losses - lcge;
    const netGain       = Math.max(0, netGainRaw);
    const excessLosses  = losses > grossGain ? losses - grossGain : 0;

    // Excess losses notice
    const excessNotice = document.getElementById('excess-losses-notice');
    const excessAmt    = document.getElementById('excess-losses-amount');
    if (excessNotice && excessAmt) {
      if (excessLosses > 0) {
        excessAmt.textContent     = NNUtils.formatCAD(excessLosses);
        excessNotice.style.display = '';
      } else {
        excessNotice.style.display = 'none';
      }
    }

    // Core calculation
    const taxableCG  = netGain * 0.50;
    const taxResult  = calcTaxOnGain(taxableCG, income, province);
    const totalTax   = taxResult.totalTax;

    // Derived values
    const effectiveRate = grossGain > 0 ? totalTax / grossGain : 0;
    const afterTaxProceeds = proceeds - totalTax;    // net cash after selling and paying tax
    const taxFreeAmt    = netGain * 0.50;            // 50% of net gain that is not taxed
    const topCGRate     = (TOP_COMBINED[province] || 0.5353) * 0.50;
    const marginalRateOnTaxable = taxableCG > 0 ? totalTax / taxableCG : 0;

    /* ── Render ── */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    document.getElementById('result-cg-tax').textContent  = NNUtils.formatCAD(totalTax);
    document.getElementById('result-hero-sub').textContent =
      `${NNUtils.formatCAD(grossGain)} gain · 50% inclusion · ${province} · ~${(marginalRateOnTaxable*100).toFixed(1)}% marginal rate`;

    document.getElementById('result-proceeds').textContent   = NNUtils.formatCAD(proceeds);
    document.getElementById('result-acb').textContent        = NNUtils.formatCAD(acb);
    document.getElementById('result-gross-gain').textContent = NNUtils.formatCAD(grossGain);

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

    document.getElementById('result-net-gain').textContent      = NNUtils.formatCAD(netGain);
    document.getElementById('result-taxable-cg').textContent    = NNUtils.formatCAD(taxableCG);
    document.getElementById('result-marginal-rate').textContent = `~${(marginalRateOnTaxable*100).toFixed(1)}% (fed + prov, est.)`;
    document.getElementById('result-tax-total').textContent     = NNUtils.formatCAD(totalTax);

    document.getElementById('result-effective-rate').textContent = grossGain > 0 ? (effectiveRate*100).toFixed(2) + '%' : '—';
    document.getElementById('result-after-tax').textContent      = NNUtils.formatCAD(afterTaxProceeds);
    document.getElementById('result-tax-free').textContent       = NNUtils.formatCAD(taxFreeAmt);
    document.getElementById('result-top-rate').textContent       = (topCGRate*100).toFixed(2) + '%';

    window._cgResults = {
      proceeds, acb, grossGain, losses, lcge, netGain,
      taxableCG, totalTax, province,
      fedTax: taxResult.fedTax, provTax: taxResult.provTax,
      afterTaxProceeds, effectiveRate, marginalRateOnTaxable
    };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

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
      `Federal Tax:      ${NNUtils.formatCAD(r.fedTax)}`,
      `Provincial Tax:   ${NNUtils.formatCAD(r.provTax)}`,
      `Estimated Tax:    ${NNUtils.formatCAD(r.totalTax)}`,
      `After-Tax Proceeds: ${NNUtils.formatCAD(r.afterTaxProceeds)}`,
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
    if (lcgeEl)    lcgeEl.value    = NNUtils.formatInputNumber(0);
    if (prCheckEl) prCheckEl.checked = false;
    updateAssetFields();
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(proceedsEl, 'proceeds-error');
    NNUtils.clearError(acbEl, 'acb-error');
    const capLossNotice = document.getElementById('cap-loss-notice');
    if (capLossNotice) capLossNotice.style.display = 'none';
    const excessNotice = document.getElementById('excess-losses-notice');
    if (excessNotice)  excessNotice.style.display  = 'none';
  });

  // Init
  updateAssetFields();

});

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
      { question:'What is the capital gains inclusion rate in Canada for 2026?', answer:'The capital gains inclusion rate is 50% for 2026 — for all Canadians, all asset types, and all gain sizes. The proposed increase to 66.67% on gains above $250,000 was cancelled by the federal government on March 21, 2025 and never became law. Only half of any capital gain is added to your taxable income.' },
      { question:'Do I have to pay capital gains tax on my home sale?', answer:'Not if it was your principal residence for all years you owned it. The principal residence exemption fully eliminates capital gains tax on a qualifying home sale — regardless of how large the gain is. However, you must still report the sale on Schedule 3 of your T1 tax return and claim the exemption. Vacation properties and rental properties generally do not qualify for the exemption.' },
      { question:'What is the superficial loss rule in Canada?', answer:'The superficial loss rule denies a capital loss if you — or an affiliated person (your spouse, a corporation you control, etc.) — buys the same or identical securities within 30 days before or after the sale and still holds them 30 days after the sale. The denied loss is added to the adjusted cost base of the reacquired securities, deferring rather than permanently losing the tax benefit.' },
      { question:'How long can I carry forward capital losses in Canada?', answer:'Capital losses can be carried forward indefinitely in Canada and applied against future capital gains. They can also be carried back up to three previous tax years to offset gains you already paid tax on — and receive a refund. Net capital losses can only be applied against capital gains, not against other types of income.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['income-tax','tfsa','rrsp','net-worth']); } catch(e) {}

  /* ── Info tips ── */
  if (window.NNUtils) try { NNUtils.initInfoTips(); } catch(e) {}

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

  /* ── TAX TABLES 2026 — read from data/nn-constants.js (single source
     of truth) and converted to this file's [threshold, rate] tuple
     shape via the shared NNUtils.bracketsToTuples adapter (also used by
     dividend-tax.js, so the two calculators can't drift from each
     other's copy of it). No private bracket copy is kept here — see
     AdSense audit Phase 2 (this file's own copy had drifted from every
     other calculator, including a wrong Manitoba threshold). ── */
  const toTuples = NNUtils.bracketsToTuples;
  const FED_BRACKETS = (window.NN && NN.FED_BRACKETS) ? toTuples(NN.FED_BRACKETS) : [
    [58523, 0.14], [117045, 0.205], [181440, 0.26], [258482, 0.29], [Infinity, 0.33],
  ];
  const PROV_BRACKETS = {};
  if (window.NN && NN.PROV_BRACKETS) {
    Object.keys(NN.PROV_BRACKETS).forEach(p => { PROV_BRACKETS[p] = toTuples(NN.PROV_BRACKETS[p]); });
  } else {
    PROV_BRACKETS.ON = [[53891, 0.0505], [107785, 0.0915], [150000, 0.1116], [220000, 0.1216], [Infinity, 0.1316]];
  }

  // Top combined rates — for the "Top CG Rate in Province" display card.
  // Derived from the shared FED_BRACKETS/PROV_BRACKETS top-bracket rates
  // (fallback literal below only applies if nn-constants.js failed to load)
  // instead of a private table, which had drifted from the real 2026
  // brackets for several provinces (e.g. AB and PE were understated by
  // 2-4 percentage points). Quebec's 16.5% federal abatement reduces the
  // federal portion; Ontario's surtax (20% + 36%, both active well before
  // top-bracket income) multiplies the marginal provincial rate by 1.56.
  const TOP_COMBINED_FALLBACK = {
    ON: 0.5353, BC: 0.5350, AB: 0.4800, QC: 0.5331, MB: 0.5040,
    SK: 0.4750, NS: 0.5400, NB: 0.5250, PE: 0.5300, NL: 0.5480,
    YT: 0.4800, NT: 0.4705, NU: 0.4450,
  };
  const TOP_COMBINED = {};
  if (window.NN && NN.FED_BRACKETS && NN.PROV_BRACKETS) {
    const fedTop = NN.FED_BRACKETS[NN.FED_BRACKETS.length - 1].rate;
    const abateRate = NN.QUEBEC_FEDERAL_ABATEMENT_RATE || 0.165;
    Object.keys(NN.PROV_BRACKETS).forEach(p => {
      const provTop = NN.PROV_BRACKETS[p][NN.PROV_BRACKETS[p].length - 1].rate;
      const fedAdj  = p === 'QC' ? fedTop * (1 - abateRate) : fedTop;
      const provAdj = p === 'ON' ? provTop * 1.56 : provTop;
      TOP_COMBINED[p] = fedAdj + provAdj;
    });
  } else {
    Object.assign(TOP_COMBINED, TOP_COMBINED_FALLBACK);
  }

  /** Ontario surtax: 20% on prov tax > $5,315; +36% on prov tax > $6,802 */
  function onSurtax(provTax) {
    // 2026 thresholds per canada.ca payroll deductions tables (T4032-ON)
    if (provTax > 7446) return (provTax - 7446) * 0.36 + (7446 - 5818) * 0.20;
    if (provTax > 5818) return (provTax - 5818) * 0.20;
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

    // Quebec 16.5% federal abatement — use the shared helper so this stays
    // in sync with NN.QUEBEC_FEDERAL_ABATEMENT_RATE instead of a private copy.
    fedTax = (window.NN && NN.applyQuebecAbatement) ? NN.applyQuebecAbatement(fedTax, province) : (province === 'QC' ? fedTax * (1 - 0.165) : fedTax);

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

/* =============================================
   NORTHERN NUMBERS — first-home-costs.js
   First Home Buyer Cost Calculator Canada 2026

   CMHC PREMIUM RATES (Source: CMHC 2026):
   5–9.99% down:   4.00% (25yr) / 4.20% (30yr)
   10–14.99% down: 3.10% (25yr) / 3.30% (30yr)
   15–19.99% down: 2.80% (25yr) / 3.00% (30yr)
   20%+ down:      No premium
   Max insured price: $1,500,000 (Dec 15, 2024)
   30yr surcharge: +0.20% (first-time buyers, any insured)
   Premium is on MORTGAGE AMOUNT, not purchase price
   Premium is added to mortgage (not paid at closing)

   PST ON CMHC PREMIUM (paid at closing, cannot be mortgaged):
   Ontario:      8%
   Quebec:       9.975%
   Saskatchewan: 6%
   All others:   0%

   MINIMUM DOWN PAYMENT:
   ≤$500,000:    5%
   $500K–$1.5M:  5% on first $500K + 10% on remainder
   >$1,500,000:  20% (not CMHC eligible)

   LAND TRANSFER TAX (from existing verified LTT logic):
   Uses same formulas as /land-transfer-tax/ calculator.
   First-time buyer rebates applied for ON, BC, PE.
   Toronto municipal LTT added when selected.

   CLOSING COST ESTIMATES (typical Canadian ranges 2026):
   Legal fees:       $1,800 (range $1,500–$2,500)
   Title insurance:  $400   (range $300–$500)
   Home inspection:  $500   (range $400–$700)
   Tax adjustment:   0.25% of purchase price

   VERIFIED:
   $500K, 5% down → CMHC $19,000, ON PST $1,520 ✅
   $700K, 10% down → CMHC $19,530 ✅
   $700K, 10% down, 30yr → CMHC $20,790 ✅
   Min down $700K = $35,000 (5%×$500K + 10%×$200K) ✅
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form       = document.getElementById('fhb-form');
  const priceEl    = document.getElementById('purchase-price');
  const dpEl       = document.getElementById('down-payment');
  const provEl     = document.getElementById('province');
  const torontoEl  = document.getElementById('is-toronto');
  const ftbEl      = document.getElementById('is-ftb');
  const placeholder    = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'First Home Buyer Cost Calculator Canada 2026',
      description: 'See every upfront cost of buying your first home in Canada. CMHC insurance, land transfer tax, legal fees, and total cash needed at closing.',
      keywords:    'first home buyer cost calculator canada 2026, closing costs calculator canada, CMHC insurance calculator canada, first time home buyer costs canada',
      slug:        'first-home-costs'
    });
    NNSeo.injectSchema({ title:'First Home Buyer Cost Calculator Canada 2026', slug:'first-home-costs', description:'Calculate all upfront costs of buying your first home in Canada including CMHC insurance and closing costs.' });
    NNSeo.injectFAQSchema([
      { question:'What is the minimum down payment in Canada in 2026?', answer:'5% on the first $500,000 plus 10% on amounts above $500,000 up to $1,500,000. On a $700,000 home: $25,000 + $20,000 = $35,000 minimum. Homes above $1,500,000 require 20% down and are not eligible for CMHC insurance.' },
      { question:'How much is CMHC mortgage insurance in Canada?', answer:'CMHC premiums are 4.00% (5% down), 3.10% (10% down), or 2.80% (15% down) of the mortgage amount. With 30-year amortization, add 0.20% to each tier. The premium is added to your mortgage — but Ontario (8%), Quebec (9.975%), and Saskatchewan (6%) charge PST on the premium in cash at closing.' },
      { question:'What closing costs should I budget for in Canada?', answer:'Closing costs for buyers in Canada typically run 1.5%–4% of the purchase price. Main items: land transfer tax (varies by province), legal fees ($1,500–$2,500), title insurance ($300–$500), home inspection ($400–$700), and PST on CMHC premium where applicable. Alberta and Saskatchewan have no land transfer tax.' },
      { question:'What first-time buyer rebates are available in 2026?', answer:'Ontario: up to $4,000 on provincial LTT, Toronto adds up to $4,475 municipal rebate. BC: full PTT exemption on homes under $835,000. PEI: up to $2,000. Alberta, MB, SK, NS, NB, NL, YT, NT, NU: no land transfer tax.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['mortgage','mortgage-affordability','fhsa','land-transfer-tax']); } catch(e) {}

  /* ── Formatters ── */
  NNUtils.attachFormatter(priceEl);
  NNUtils.attachFormatter(dpEl);

  /* ── Show/hide Toronto toggle ── */
  provEl?.addEventListener('change', function() {
    const torontoGroup = document.getElementById('toronto-group');
    if (torontoGroup) torontoGroup.style.display = this.value === 'ON' ? '' : 'none';
    if (!resultsContent.classList.contains('hidden')) calculate();
  });

  [torontoEl, ftbEl].forEach(el => {
    el?.addEventListener('change', () => {
      if (!resultsContent.classList.contains('hidden')) calculate();
    });
  });

  document.querySelectorAll('input[name="amort"]').forEach(r => {
    r.addEventListener('change', () => {
      if (!resultsContent.classList.contains('hidden')) calculate();
    });
  });

  /* ── CMHC PST RATES ── */
  const CMHC_PST = { ON: 0.08, QC: 0.09975, SK: 0.06 };

  /* ── MINIMUM DOWN PAYMENT ── */
  function minDownPayment(price) {
    if (price <= 500000) return price * 0.05;
    if (price <= 1500000) return 500000 * 0.05 + (price - 500000) * 0.10;
    return price * 0.20;
  }

  /* ── CMHC PREMIUM ── */
  function calcCMHC(price, downPayment, thirtyYear) {
    if (price > 1500000) return { needsCMHC: false, overCap: true, premium: 0, pst: 0, rate: 0 };
    const minDP = minDownPayment(price);
    if (downPayment < minDP - 0.01) return { needsCMHC: false, belowMin: true, premium: 0, pst: 0, rate: 0, minDP };
    const dpPct = downPayment / price * 100;
    if (dpPct >= 20) return { needsCMHC: false, premium: 0, pst: 0, rate: 0 };
    let rate = dpPct < 10 ? 0.04 : dpPct < 15 ? 0.031 : 0.028;
    if (thirtyYear) rate += 0.002;
    const mortgage = price - downPayment;
    const premium = mortgage * rate;
    return { needsCMHC: true, premium, rate, pst: 0, mortgage };
  }

  /* ── LAND TRANSFER TAX (same formulas as /land-transfer-tax/ calculator) ── */
  function calcLTT(price, province, isFTB, isToronto) {
    let ltt = 0, lttRebate = 0, torontoLTT = 0, torontoRebate = 0;

    if (province === 'ON') {
      // Ontario LTT 2026
      if (price <= 55000)       ltt = price * 0.005;
      else if (price <= 250000) ltt = 275 + (price - 55000) * 0.010;
      else if (price <= 400000) ltt = 2225 + (price - 250000) * 0.015;
      else if (price <= 2000000)ltt = 4475 + (price - 400000) * 0.020;
      else                      ltt = 36475 + (price - 2000000) * 0.025;

      if (isFTB) lttRebate = Math.min(ltt, 4000);

      if (isToronto) {
        // Toronto MLTT (mirrors ON LTT formula)
        if (price <= 55000)       torontoLTT = price * 0.005;
        else if (price <= 400000) torontoLTT = 275 + (price - 55000) * 0.010;
        else if (price <= 2000000)torontoLTT = 3725 + (price - 400000) * 0.020;
        else                      torontoLTT = 35725 + (price - 2000000) * 0.025;
        if (isFTB) torontoRebate = Math.min(torontoLTT, 4475);
      }

    } else if (province === 'BC') {
      // BC Property Transfer Tax 2026
      if (price <= 200000)      ltt = price * 0.01;
      else if (price <= 2000000)ltt = 2000 + (price - 200000) * 0.02;
      else if (price <= 3000000)ltt = 38000 + (price - 2000000) * 0.03;
      else                      ltt = 68000 + (price - 3000000) * 0.05;

      if (isFTB) {
        if (price <= 835000)      lttRebate = ltt;
        else if (price < 860000)  lttRebate = ltt * (860000 - price) / 25000;
      }

    } else if (province === 'MB') {
      // Manitoba LTT 2026
      if (price <= 30000)       ltt = 0;
      else if (price <= 90000)  ltt = (price - 30000) * 0.005;
      else if (price <= 150000) ltt = 300 + (price - 90000) * 0.01;
      else if (price <= 200000) ltt = 900 + (price - 150000) * 0.015;
      else                      ltt = 1650 + (price - 200000) * 0.02;

    } else if (province === 'QC') {
      // Quebec Welcome Tax 2026
      if (price <= 58900)       ltt = price * 0.005;
      else if (price <= 294600) ltt = 294.5 + (price - 58900) * 0.01;
      else if (price <= 552300) ltt = 2651.5 + (price - 294600) * 0.015;
      else if (price <= 1059000)ltt = 6516.0 + (price - 552300) * 0.02;
      else if (price <= 2059000)ltt = 16650.0 + (price - 1059000) * 0.025;
      else                      ltt = 41650.0 + (price - 2059000) * 0.03;

    } else if (province === 'PE') {
      // PEI LTT 2026: 1% on first $30K, 2% above $30K
      ltt = price <= 30000 ? price * 0.01 : 300 + (price - 30000) * 0.02;
      if (isFTB) lttRebate = Math.min(ltt, 2000);

    } else if (province === 'NL') {
      // NL has deed transfer fee: 0.4% (not LTT, but similar)
      ltt = price * 0.004;

    } else if (province === 'NS') {
      // NS deed transfer tax: ~1.5% (varies by municipality; use 1.5% estimate)
      ltt = price * 0.015;

    } else if (province === 'NB') {
      // NB LTT: 0.5%
      ltt = price * 0.005;

    }
    // AB, SK, YT, NT, NU: no land transfer tax

    return { ltt, lttRebate, torontoLTT, torontoRebate };
  }

  /* ── PROVINCE LABELS ── */
  const NO_LTT_PROVS = new Set(['AB','SK','YT','NT','NU']);
  const PROV_NAMES = { ON:'Ontario',BC:'British Columbia',AB:'Alberta',QC:'Quebec',MB:'Manitoba',SK:'Saskatchewan',NS:'Nova Scotia',NB:'New Brunswick',PE:'Prince Edward Island',NL:'Newfoundland & Labrador',YT:'Yukon',NT:'Northwest Territories',NU:'Nunavut' };

  /* ── PRESETS ── */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const p = this.dataset.preset;
      ftbEl.checked = true;
      document.querySelector('input[name="amort"][value="25"]').checked = true;
      if (torontoEl) torontoEl.checked = false;

      if (p === 'condo') {
        priceEl.value = NNUtils.formatInputNumber(650000);
        dpEl.value    = NNUtils.formatInputNumber(65000);  // 10%
        provEl.value  = 'ON';
        if (torontoEl) torontoEl.checked = true;
      } else if (p === 'detached') {
        priceEl.value = NNUtils.formatInputNumber(800000);
        dpEl.value    = NNUtils.formatInputNumber(80000);  // 10%
        provEl.value  = 'ON';
      } else if (p === 'calgary') {
        priceEl.value = NNUtils.formatInputNumber(550000);
        dpEl.value    = NNUtils.formatInputNumber(55000);  // 10%
        provEl.value  = 'AB';
      } else if (p === 'maxcmhc') {
        priceEl.value = NNUtils.formatInputNumber(1500000);
        dpEl.value    = NNUtils.formatInputNumber(125000); // min down
        provEl.value  = 'ON';
      }

      const torontoGroup = document.getElementById('toronto-group');
      if (torontoGroup) torontoGroup.style.display = provEl.value === 'ON' ? '' : 'none';
      calculate();
    });
  });

  /* ── CALCULATE ── */
  function calculate() {
    const price     = NNUtils.parseInputNumber(priceEl.value);
    const downPayment = NNUtils.parseInputNumber(dpEl.value);
    const province  = provEl.value;
    const isToronto = torontoEl?.checked && province === 'ON';
    const isFTB     = ftbEl?.checked || false;
    const thirtyYear = document.querySelector('input[name="amort"]:checked')?.value === '30';

    if (!price || price <= 0) {
      NNUtils.setError(priceEl, 'price-error', 'Please enter the purchase price.');
      return;
    }
    NNUtils.clearError(priceEl, 'price-error');

    if (!downPayment && downPayment !== 0) {
      NNUtils.setError(dpEl, 'dp-error', 'Please enter your down payment.');
      return;
    }
    NNUtils.clearError(dpEl, 'dp-error');

    const cmhc = calcCMHC(price, downPayment, thirtyYear);
    const lttResult = calcLTT(price, province, isFTB, isToronto);

    /* ── Show/hide notices ── */
    const overCapNotice  = document.getElementById('over-cap-notice');
    const belowMinNotice = document.getElementById('below-min-notice');
    const minDpEl        = document.getElementById('min-dp-amount');

    if (overCapNotice)  overCapNotice.style.display  = cmhc.overCap   ? '' : 'none';
    if (belowMinNotice) belowMinNotice.style.display = cmhc.belowMin  ? '' : 'none';
    if (minDpEl && cmhc.belowMin) minDpEl.textContent = NNUtils.formatCAD(cmhc.minDP);

    /* ── Core numbers ── */
    const mortgage     = price - downPayment;
    const cmhcPremium  = cmhc.needsCMHC ? cmhc.premium : 0;
    const pstRate      = CMHC_PST[province] || 0;
    const pstAmt       = cmhc.needsCMHC ? cmhcPremium * pstRate : 0;
    const totalMortgage = mortgage + cmhcPremium;

    const netLTT       = Math.max(0, lttResult.ltt - lttResult.lttRebate);
    const netTorontoLTT = Math.max(0, lttResult.torontoLTT - lttResult.torontoRebate);
    const legalFees    = 1800;
    const titleIns     = 400;
    const inspection   = 500;
    const taxAdj       = price * 0.0025;

    const closingTotal = netLTT + netTorontoLTT + pstAmt + legalFees + titleIns + inspection + taxAdj;
    const totalCash    = downPayment + closingTotal;

    /* ── Render ── */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    document.getElementById('result-total-cash').textContent  = NNUtils.formatCAD(totalCash);
    document.getElementById('result-hero-sub').textContent    =
      `${NNUtils.formatCAD(downPayment)} down + ${NNUtils.formatCAD(closingTotal)} closing costs · ${PROV_NAMES[province]}`;

    document.getElementById('result-price').textContent    = NNUtils.formatCAD(price);
    document.getElementById('result-dp').textContent       = NNUtils.formatCAD(downPayment) + ` (${(downPayment/price*100).toFixed(1)}%)`;
    document.getElementById('result-mortgage').textContent = NNUtils.formatCAD(mortgage);

    // CMHC section
    const cmhcSection  = document.getElementById('cmhc-section');
    const cmhcNoneMsg  = document.getElementById('cmhc-none-msg');
    const cmhcRateRow  = document.getElementById('cmhc-rate-label')?.closest('.result-row');
    const cmhcPremRow  = document.getElementById('result-cmhc-premium')?.closest('.result-row');
    const cmhcMortRow  = document.getElementById('result-cmhc-mortgage')?.closest('.result-row');
    const cmhcTotRow   = document.getElementById('result-total-mortgage')?.closest('.result-row');
    const pstRow       = document.getElementById('pst-row');

    if (cmhc.needsCMHC) {
      if (cmhcNoneMsg)  cmhcNoneMsg.style.display  = 'none';
      if (cmhcRateRow)  cmhcRateRow.style.display  = '';
      if (cmhcPremRow)  cmhcPremRow.style.display  = '';
      if (cmhcMortRow)  cmhcMortRow.style.display  = '';
      if (cmhcTotRow)   cmhcTotRow.style.display   = '';

      const rateLabel = document.getElementById('cmhc-rate-label');
      if (rateLabel) rateLabel.textContent = `Premium Rate (${thirtyYear ? '30yr' : '25yr'} amortization)`;
      document.getElementById('result-cmhc-rate').textContent    = (cmhc.rate * 100).toFixed(2) + '%';
      document.getElementById('result-cmhc-premium').textContent = NNUtils.formatCAD(cmhcPremium) + ' (added to mortgage)';
      document.getElementById('result-cmhc-mortgage').textContent = NNUtils.formatCAD(cmhcPremium);
      document.getElementById('result-total-mortgage').textContent = NNUtils.formatCAD(totalMortgage);

      if (pstRow) {
        if (pstAmt > 0) {
          pstRow.style.display = '';
          const pstLabel = document.getElementById('pst-label');
          const pstRates = { ON: '8%', QC: '9.975%', SK: '6%' };
          if (pstLabel) pstLabel.textContent = `PST on CMHC Premium (${pstRates[province]})`;
          document.getElementById('result-pst').textContent = NNUtils.formatCAD(pstAmt) + ' (paid at closing)';
        } else {
          pstRow.style.display = 'none';
        }
      }
    } else {
      if (cmhcNoneMsg)  cmhcNoneMsg.style.display  = '';
      if (cmhcRateRow)  cmhcRateRow.style.display  = 'none';
      if (cmhcPremRow)  cmhcPremRow.style.display  = 'none';
      if (cmhcMortRow)  cmhcMortRow.style.display  = 'none';
      if (cmhcTotRow)   cmhcTotRow.style.display   = 'none';
      if (pstRow)       pstRow.style.display        = 'none';
    }

    // LTT rows
    const lttLabel = document.getElementById('ltt-label');
    const noLTT = NO_LTT_PROVS.has(province);

    if (lttLabel) lttLabel.textContent = noLTT ? 'Land Transfer Tax' : `Land Transfer Tax (${PROV_NAMES[province]})`;
    document.getElementById('result-ltt').textContent = noLTT ? 'None (no LTT in ' + province + ')' : NNUtils.formatCAD(lttResult.ltt);

    const lttRebateRow = document.getElementById('ltt-rebate-row');
    if (lttResult.lttRebate > 0) {
      lttRebateRow.style.display = '';
      document.getElementById('result-ltt-rebate').textContent = '−' + NNUtils.formatCAD(lttResult.lttRebate);
    } else { lttRebateRow.style.display = 'none'; }

    const torontoLTTRow   = document.getElementById('toronto-ltt-row');
    const torontoRebRow   = document.getElementById('toronto-rebate-row');
    if (isToronto && lttResult.torontoLTT > 0) {
      torontoLTTRow.style.display = '';
      document.getElementById('result-toronto-ltt').textContent = NNUtils.formatCAD(lttResult.torontoLTT);
      if (lttResult.torontoRebate > 0) {
        torontoRebRow.style.display = '';
        document.getElementById('result-toronto-rebate').textContent = '−' + NNUtils.formatCAD(lttResult.torontoRebate);
      } else { torontoRebRow.style.display = 'none'; }
    } else {
      torontoLTTRow.style.display = 'none';
      torontoRebRow.style.display = 'none';
    }

    // PST in closing section
    const pstClosingRow = document.getElementById('pst-closing-row');
    if (pstAmt > 0) {
      pstClosingRow.style.display = '';
      const pstClosingLabel = document.getElementById('pst-closing-label');
      const pstRates = { ON: '8%', QC: '9.975%', SK: '6%' };
      if (pstClosingLabel) pstClosingLabel.textContent = `PST on CMHC Premium (${pstRates[province]})`;
      document.getElementById('result-pst-closing').textContent = NNUtils.formatCAD(pstAmt);
    } else { pstClosingRow.style.display = 'none'; }

    document.getElementById('result-legal').textContent     = NNUtils.formatCAD(legalFees) + ' (est.)';
    document.getElementById('result-title').textContent     = NNUtils.formatCAD(titleIns) + ' (est.)';
    document.getElementById('result-inspection').textContent = NNUtils.formatCAD(inspection) + ' (est.)';
    document.getElementById('result-tax-adj').textContent   = NNUtils.formatCAD(taxAdj) + ' (est.)';
    document.getElementById('result-closing-total').textContent = NNUtils.formatCAD(closingTotal);

    // Milestone cards
    document.getElementById('result-dp-pct').textContent       = (downPayment/price*100).toFixed(1) + '%';
    document.getElementById('result-closing-pct').textContent  = (closingTotal/price*100).toFixed(1) + '%';
    document.getElementById('result-cash-card').textContent    = NNUtils.formatCAD(totalCash);
    document.getElementById('result-final-mortgage').textContent = NNUtils.formatCAD(totalMortgage);

    window._fhbResults = {
      price, downPayment, province, mortgage, cmhcPremium, pstAmt,
      closingTotal, totalCash, totalMortgage, lttResult
    };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('First Home Cost Calculator', { price, province }); } catch(e) {}
  }

  /* ── Copy ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._fhbResults;
    if (!r) return;
    const lines = [
      `🏠 First Home Buyer Costs 2026 — Northern Numbers`,
      `─────────────────────────────`,
      `Purchase Price:   ${NNUtils.formatCAD(r.price)}`,
      `Down Payment:     ${NNUtils.formatCAD(r.downPayment)} (${(r.downPayment/r.price*100).toFixed(1)}%)`,
      `Mortgage:         ${NNUtils.formatCAD(r.mortgage)}`,
    ];
    if (r.cmhcPremium > 0) {
      lines.push(`CMHC Premium:     ${NNUtils.formatCAD(r.cmhcPremium)} (added to mortgage)`);
      if (r.pstAmt > 0) lines.push(`PST on CMHC:      ${NNUtils.formatCAD(r.pstAmt)} (cash at closing)`);
      lines.push(`Total Mortgage:   ${NNUtils.formatCAD(r.totalMortgage)}`);
    }
    lines.push(
      `─────────────────────────────`,
      `Closing Costs:    ${NNUtils.formatCAD(r.closingTotal)}`,
      `─────────────────────────────`,
      `Total Cash Needed: ${NNUtils.formatCAD(r.totalCash)}`,
    );
    NNUtils.copyResults(this, lines, 'First Home Buyer Cost Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    priceEl.value  = '';
    dpEl.value     = '';
    provEl.value   = 'ON';
    if (torontoEl) torontoEl.checked = false;
    if (ftbEl)     ftbEl.checked     = true;
    document.querySelector('input[name="amort"][value="25"]').checked = true;
    const torontoGroup = document.getElementById('toronto-group');
    if (torontoGroup) torontoGroup.style.display = 'none';
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(priceEl, 'price-error');
    NNUtils.clearError(dpEl, 'dp-error');
  });

});

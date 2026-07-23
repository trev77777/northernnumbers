/* =============================================
   NORTHERN NUMBERS — land-transfer-tax.js
   Canadian Land Transfer Tax Calculator 2026

   VERIFIED RATES (2026):
   Ontario:    0.5%/$55K, 1%/$250K, 1.5%/$400K, 2%/$2M, 2.5%+
   Toronto:    Same brackets as ON (MLTT added on top)
   BC:         1%/$200K, 2%/$2M, 3%/$3M, 5%+
   Manitoba:   0.5%/$30K, 1%/$90K, 1.5%/$150K, 2%/$200K, 2.5%+
   Quebec:     0.5%/$62,900, 1%/$315K, 1.5%+
   Montreal:   0.5%/$62,900, 1%/$315K, 1.5%/$552,300, 2%/$1,107,600, 2.5%+
   NB:         1.0% flat
   NS:         Municipal DTT (varies — default 1.5% Halifax)
   PEI:        1.0% flat (FTHB full exemption)
   NL:         Nominal ~$100 registration fee
   AB:         No LTT — title + mortgage reg fees
   SK:         No LTT — 0.4% title fee
   YT/NT/NU:   No LTT

   FTHB Rebates:
   ON:  up to $4,000 rebate
   TOR: up to $4,475 additional rebate
   BC:  full exemption up to $835K (April 2024)
   MB:  up to $4,500 rebate
   PEI: full exemption

   Sources: ontario.ca, gov.bc.ca, Manitoba Land Titles,
   Revenu Québec, City of Montreal, provincial Land Title offices
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form        = document.getElementById('ltt-form');
  const priceEl     = document.getElementById('purchase-price');
  const provinceEl  = document.getElementById('province');
  const torontoEl   = document.getElementById('toronto-mltt');
  const qcCityEl    = document.getElementById('qc-city');
  const nsRateEl    = document.getElementById('ns-rate');
  const abMortgEl   = document.getElementById('ab-mortgage');
  const placeholder = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'Land Transfer Tax Calculator Canada 2026',
      description: 'Calculate land transfer tax for every Canadian province. Includes first-time buyer rebates, Toronto municipal tax, and Quebec welcome tax.',
      keywords:    'land transfer tax calculator canada, ontario land transfer tax, bc property transfer tax, toronto land transfer tax, welcome tax calculator quebec',
      slug:        'land-transfer-tax'
    });
    NNSeo.injectSchema({ title:'Land Transfer Tax Calculator Canada 2026', slug:'land-transfer-tax', description:'Calculate land transfer tax for every Canadian province with first-time buyer rebates and Toronto municipal tax.' });
    NNSeo.injectFAQSchema([
      { question:'How much is land transfer tax in Ontario?', answer:'In Ontario, land transfer tax is calculated on tiered brackets: 0.5% on the first $55,000, 1% on $55,001–$250,000, 1.5% on $250,001–$400,000, 2% on $400,001–$2,000,000, and 2.5% above $2,000,000. On a $750,000 purchase, the tax is $11,475. First-time buyers receive a rebate of up to $4,000.' },
      { question:'What is the Toronto municipal land transfer tax?', answer:'Toronto charges a municipal land transfer tax (MLTT) on top of Ontario\'s provincial LTT, using the same bracket rates. This effectively doubles the land transfer tax for Toronto buyers. On a $750,000 home, you pay $11,475 provincial + $11,475 Toronto = $22,950 total. First-time buyers can claim up to $4,000 provincial + $4,475 Toronto rebates.' },
      { question:'Do first-time buyers pay land transfer tax in BC?', answer:'BC first-time buyers are fully exempt from Property Transfer Tax on homes up to $835,000 (saving up to $13,000). A partial exemption applies between $835,001 and $860,000. You must be a Canadian citizen or permanent resident, have lived in BC for 12 consecutive months, and never have owned a principal residence anywhere in the world.' },
      { question:'What is the Quebec welcome tax?', answer:'Quebec\'s welcome tax (taxe de bienvenue) is a land transfer tax paid to the municipality. It uses progressive brackets: 0.5% on the first $62,900, 1% on $62,901–$315,000, and 1.5% above $315,000. Montreal charges higher rates up to 2.5%. Since January 2026, Quebec first-time buyers can claim a tax credit of up to $5,875 on their provincial income tax return.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['mortgage','gst-hst','budget','inflation']); } catch(e) {}

  /* ── Province-conditional UI ── */
  NNUtils.attachFormatter(priceEl);
  NNUtils.attachFormatter(abMortgEl);

  function updateConditionalFields() {
    const prov = provinceEl.value;
    document.getElementById('toronto-group').style.display  = prov === 'ON' ? '' : 'none';
    document.getElementById('montreal-group').style.display = prov === 'QC' ? '' : 'none';
    document.getElementById('ns-group').style.display       = prov === 'NS' ? '' : 'none';
    document.getElementById('ab-group').style.display       = prov === 'AB' ? '' : 'none';
    if (prov !== 'ON') { if (torontoEl) torontoEl.checked = false; }
    if (!resultsContent.classList.contains('hidden')) calculate();
  }

  provinceEl?.addEventListener('change', updateConditionalFields);
  [torontoEl, qcCityEl].forEach(el => el?.addEventListener('change', () => {
    if (!resultsContent.classList.contains('hidden')) calculate();
  }));
  document.querySelectorAll('input[name="buyer-status"]').forEach(el => {
    el.addEventListener('change', () => {
      if (!resultsContent.classList.contains('hidden')) calculate();
    });
  });

  /* ── TAX TABLES ── */
  function tiered(price, brackets) {
    let tax = 0, prev = 0;
    for (const [limit, rate] of brackets) {
      if (price <= prev) break;
      tax += (Math.min(price, limit) - prev) * rate;
      prev = limit;
    }
    return tax;
  }

  const BRACKETS = {
    ON:  [[55000,0.005],[250000,0.01],[400000,0.015],[2000000,0.02],[Infinity,0.025]],
    TOR: [[55000,0.005],[250000,0.01],[400000,0.015],[2000000,0.02],[Infinity,0.025]],
    BC:  [[200000,0.01],[2000000,0.02],[3000000,0.03],[Infinity,0.05]],
    MB:  [[30000,0.005],[90000,0.01],[150000,0.015],[200000,0.02],[Infinity,0.025]],
    QC:  [[62900,0.005],[315000,0.01],[Infinity,0.015]],
    MTL: [[62900,0.005],[315000,0.01],[552300,0.015],[1107600,0.02],[Infinity,0.025]],
  };

  function calcLTT(price, prov, fthb, toronto, qcCity, nsRate, abMortgage) {
    let provTax = 0, rebate = 0, munTax = 0, munRebate = 0;
    let provLabel = 'Provincial LTT', munLabel = 'Municipal LTT';
    let brackets = [];

    if (prov === 'ON') {
      brackets = BRACKETS.ON;
      provTax = tiered(price, brackets);
      rebate  = fthb ? Math.min(provTax, 4000) : 0;
      if (toronto) {
        munTax    = tiered(price, BRACKETS.TOR);
        munRebate = fthb ? Math.min(munTax, 4475) : 0;
        munLabel  = 'Toronto Municipal LTT';
      }
      provLabel = 'Ontario LTT';
    } else if (prov === 'BC') {
      brackets = BRACKETS.BC;
      provTax  = tiered(price, brackets);
      if (fthb) {
        if      (price <= 500000)  rebate = provTax;
        else if (price <= 835000)  rebate = Math.min(provTax, 8000);
        else if (price <= 860000)  rebate = 8000 * (860000 - price) / 25000;
      }
      provLabel = 'BC Property Transfer Tax';
    } else if (prov === 'MB') {
      brackets = BRACKETS.MB;
      provTax  = tiered(price, brackets);
      rebate   = fthb ? Math.min(provTax, 4500) : 0;
      provLabel = 'Manitoba LTT';
    } else if (prov === 'QC') {
      brackets  = qcCity === 'montreal' ? BRACKETS.MTL : BRACKETS.QC;
      provTax   = tiered(price, brackets);
      provLabel = qcCity === 'montreal' ? 'Montréal Welcome Tax' : 'Quebec Welcome Tax';
    } else if (prov === 'NB') {
      provTax   = price * 0.01;
      provLabel = 'NB Land Transfer Tax';
      brackets  = [[Infinity, 0.01]];
    } else if (prov === 'NS') {
      const r   = (parseFloat(nsRate) || 1.5) / 100;
      provTax   = price * r;
      provLabel = 'NS Deed Transfer Tax';
      brackets  = [[Infinity, r]];
    } else if (prov === 'PE') {
      provTax   = fthb ? 0 : price * 0.01;
      rebate    = fthb ? price * 0.01 : 0;
      provLabel = 'PEI Land Transfer Tax';
      brackets  = [[Infinity, 0.01]];
    } else if (prov === 'NL') {
      provTax   = 100; // nominal registration fee
      provLabel = 'NL Registration Fee';
      brackets  = [];
    } else if (prov === 'AB') {
      const mtg   = NNUtils.parseInputNumber(abMortgage?.value || '0') || price * 0.80;
      provTax     = 50 + Math.ceil(price / 5000) * 2 + 50 + Math.ceil(mtg / 5000) * 1.50;
      provLabel   = 'AB Title & Mortgage Reg. Fee';
      brackets    = [];
    } else if (prov === 'SK') {
      provTax   = price > 6300 ? price * 0.004 : 25;
      provLabel = 'SK Land Title Fee';
      brackets  = [[Infinity, 0.004]];
    } else {
      // YT, NT, NU — no LTT
      provTax   = 0;
      provLabel = 'No Land Transfer Tax';
      brackets  = [];
    }

    const netProv = provTax - rebate;
    const netMun  = munTax  - munRebate;
    const total   = netProv + netMun;

    return { provTax, rebate, munTax, munRebate, netProv, netMun, total, provLabel, munLabel, brackets };
  }

  /* ── PRESETS ── */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const p = this.dataset.preset;
      if (p === 'starter') { priceEl.value = NNUtils.formatInputNumber(500000);  provinceEl.value = 'ON'; if (torontoEl) torontoEl.checked = false; }
      if (p === 'avg')     { priceEl.value = NNUtils.formatInputNumber(750000);  provinceEl.value = 'ON'; if (torontoEl) torontoEl.checked = false; }
      if (p === 'toronto') { priceEl.value = NNUtils.formatInputNumber(900000);  provinceEl.value = 'ON'; if (torontoEl) torontoEl.checked = true; }
      if (p === 'luxury')  { priceEl.value = NNUtils.formatInputNumber(2000000); provinceEl.value = 'ON'; if (torontoEl) torontoEl.checked = false; }
      updateConditionalFields();
      calculate();
    });
  });

  /* ── CALCULATE ── */
  function calculate() {
    const price  = NNUtils.parseInputNumber(priceEl.value);
    const prov   = provinceEl.value;
    const fthb   = document.getElementById('buyer-first')?.checked || false;
    const toronto= (torontoEl?.checked && prov === 'ON') || false;
    const qcCity = qcCityEl?.value || 'standard';
    const nsRate = nsRateEl?.value || '1.5';

    if (!price || price <= 0) {
      NNUtils.setError(priceEl, 'price-error', 'Please enter the purchase price.');
      return;
    }
    NNUtils.clearError(priceEl, 'price-error');

    const r = calcLTT(price, prov, fthb, toronto, qcCity, nsRate, abMortgEl);

    /* Render */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    document.getElementById('result-hero-label').textContent = r.provLabel + (toronto ? ' + Toronto MLTT' : '');
    document.getElementById('result-total-ltt').textContent  = NNUtils.formatCAD(r.total);
    document.getElementById('result-hero-sub').textContent   = `${prov} · ${NNUtils.formatCAD(price)} purchase${fthb ? ' · First-time buyer' : ''}`;
    document.getElementById('result-price').textContent      = NNUtils.formatCAD(price);

    document.getElementById('prov-ltt-label').textContent   = r.provLabel;
    document.getElementById('result-prov-ltt').textContent  = NNUtils.formatCAD(r.provTax);

    const rebateRow = document.getElementById('rebate-row');
    if (r.rebate > 0) {
      rebateRow.style.display = '';
      document.getElementById('rebate-label').textContent   = prov === 'PE' ? 'FTHB Full Exemption' : 'First-Time Buyer Rebate';
      document.getElementById('result-rebate').textContent  = '−' + NNUtils.formatCAD(r.rebate);
    } else {
      rebateRow.style.display = 'none';
    }

    const munRow = document.getElementById('mun-ltt-row');
    if (r.munTax > 0) {
      munRow.style.display = '';
      document.getElementById('mun-ltt-label').textContent  = r.munLabel;
      document.getElementById('result-mun-ltt').textContent = NNUtils.formatCAD(r.munTax);
    } else { munRow.style.display = 'none'; }

    const munRebRow = document.getElementById('mun-rebate-row');
    if (r.munRebate > 0) {
      munRebRow.style.display = '';
      document.getElementById('result-mun-rebate').textContent = '−' + NNUtils.formatCAD(r.munRebate);
    } else { munRebRow.style.display = 'none'; }

    document.getElementById('result-net-total').textContent = NNUtils.formatCAD(r.total);

    // Milestone cards
    const pct = price > 0 ? r.total / price * 100 : 0;
    const per100k = price > 0 ? r.total / price * 100000 : 0;
    const totalRebate = r.rebate + r.munRebate;
    const closingEst = r.total + 2500; // avg legal/title ~$2,500

    document.getElementById('result-pct').textContent        = pct.toFixed(2) + '%';
    document.getElementById('result-per-100k').textContent   = NNUtils.formatCAD(per100k);
    document.getElementById('result-rebate-saved').textContent = totalRebate > 0 ? NNUtils.formatCAD(totalRebate) : '—';
    document.getElementById('result-closing').textContent    = NNUtils.formatCAD(closingEst);

    // Bracket breakdown
    const tbody = document.getElementById('bracket-body');
    if (tbody && r.brackets.length > 0) {
      let rows = ''; let prev = 0;
      r.brackets.forEach(([limit, rate], i) => {
        if (price <= prev) return;
        const taxable = Math.min(price, limit) - prev;
        const tax     = taxable * rate;
        const label   = limit === Infinity
          ? `Above ${NNUtils.formatCAD(prev)}`
          : `${NNUtils.formatCAD(prev)} – ${NNUtils.formatCAD(limit)}`;
        rows += `<tr style="${i%2===0?'background:var(--color-bg);':''}border-bottom:1px solid var(--color-border)">
          <td style="padding:var(--space-2) var(--space-3)">${label}</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right">${(rate*100).toFixed(1)}%</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right">${NNUtils.formatCAD(taxable)}</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right;font-weight:500">${NNUtils.formatCAD(tax)}</td>
        </tr>`;
        prev = limit;
      });
      tbody.innerHTML = rows;
      document.getElementById('bracket-table').style.display = '';
    } else {
      if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="padding:var(--space-3);color:var(--color-text-muted)">Flat rate — no bracket breakdown available.</td></tr>';
    }

    window._lttResults = { price, prov, fthb, r };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('Land Transfer Tax Calculator', { prov, price }); } catch(e) {}
  }

  /* ── Copy Results ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const d = window._lttResults;
    if (!d) return;
    const lines = [
      `🏠 Land Transfer Tax — Northern Numbers`,
      `─────────────────────────────`,
      `📍 Province: ${d.prov}`,
      `💰 Purchase Price: ${NNUtils.formatCAD(d.price)}`,
      `👤 Buyer: ${d.fthb ? 'First-time buyer' : 'Returning buyer'}`,
      `─────────────────────────────`,
      `🏛 ${d.r.provLabel}: ${NNUtils.formatCAD(d.r.provTax)}`,
    ];
    if (d.r.rebate > 0)   lines.push(`✅ FTHB Rebate: −${NNUtils.formatCAD(d.r.rebate)}`);
    if (d.r.munTax > 0)   lines.push(`🏙 ${d.r.munLabel}: ${NNUtils.formatCAD(d.r.munTax)}`);
    if (d.r.munRebate > 0) lines.push(`✅ Toronto FTHB Rebate: −${NNUtils.formatCAD(d.r.munRebate)}`);
    lines.push(`💵 Total Tax: ${NNUtils.formatCAD(d.r.total)}`);
    NNUtils.copyResults(this, lines, 'Land Transfer Tax Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    priceEl.value    = NNUtils.formatInputNumber(750000);
    provinceEl.value = 'ON';
    document.getElementById('buyer-returning').checked = true;
    if (torontoEl) torontoEl.checked = false;
    if (qcCityEl)  qcCityEl.value   = 'standard';
    if (nsRateEl)  nsRateEl.value   = '1.5';
    if (abMortgEl) abMortgEl.value  = NNUtils.formatInputNumber(600000);
    updateConditionalFields();
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(priceEl, 'price-error');
  });

  // Init conditional fields
  updateConditionalFields();
  NNUtils.initTableToggle('bracket-toggle', 'bracket-table');

});

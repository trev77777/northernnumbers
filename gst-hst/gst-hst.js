/* =============================================
   NORTHERN NUMBERS — gst-hst.js
   Canadian GST/HST/PST Calculator 2026

   FORMULAS:
   Add tax:    total    = amount × (1 + rate/100)
               tax      = amount × rate/100
   Remove tax: before   = amount / (1 + rate/100)
               tax      = amount - before

   Rates verified against CRA 2026:
   AB/NT/NU/YT: 5% GST only
   BC/MB:       5% GST + 7% PST = 12%
   SK:          5% GST + 6% PST = 11%
   ON:          13% HST
   QC:          5% GST + 9.975% QST = 14.975%
   NB/NS/PE/NL: 15% HST
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form       = document.getElementById('gst-form');
  const amountEl   = document.getElementById('amount');
  const provinceEl = document.getElementById('province');
  const directionEl= document.getElementById('direction');
  const placeholder    = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'GST/HST Calculator Canada 2026',
      description: 'Free Canadian GST/HST calculator. Add or remove GST, HST, or PST for all 13 provinces and territories.',
      keywords:    'gst hst calculator canada 2026, hst calculator ontario, gst calculator canada, sales tax calculator canada',
      slug:        'gst-hst'
    });
    NNSeo.injectSchema({ title:'GST/HST Calculator Canada 2026', slug:'gst-hst', description:'Add or remove GST, HST, or PST for all 13 Canadian provinces and territories.' });
    NNSeo.injectFAQSchema([
      { question:'What items are exempt from GST/HST in Canada?', answer:'Many essential goods and services are zero-rated (taxed at 0%) or exempt. Zero-rated items include most basic groceries, prescription drugs, medical devices, and exports. Exempt supplies include residential rent, most health and dental services, educational services, and most financial services. Zero-rated differs from exempt — zero-rated businesses can still claim ITCs on their inputs; exempt businesses cannot.' },
      { question:'Why does Quebec have a different sales tax?', answer:'Quebec administers its own provincial tax system separately from the federal government. The Quebec Sales Tax (QST) rate is 9.975% and is administered by Revenu Québec rather than the CRA. Unlike provinces that harmonized with the federal GST, Quebec maintains its own registration, filing, and remittance system. Quebec businesses must register for both GST (with CRA) and QST (with Revenu Québec) separately.' },
      { question:'Do I charge HST on services provided remotely?', answer:'Generally, the GST/HST rate that applies is based on where your customer is located (the "place of supply" rules), not where you are. If you\'re in Ontario providing services to a client in Alberta, you would charge 5% GST, not 13% HST. The place of supply rules are complex for digital services and professional services — consulting a tax professional is advisable for cross-provincial service businesses.' },
      { question:'Are there GST/HST rebates for new home purchases?', answer:'Yes. The GST/HST New Housing Rebate allows buyers of new homes under $450,000 to recover a portion of the GST or HST paid. The federal rebate is 36% of the 5% GST (up to $6,300) for homes under $350,000, phasing out between $350,000 and $450,000. Most HST provinces also offer a provincial portion of the rebate. Builders often factor these rebates into the purchase price, but it\'s important to confirm how rebates are handled in your purchase agreement.' },
      { question:'When do I need to register for GST/HST?', answer:'You must register for a GST/HST account when your business revenue exceeds $30,000 in a single calendar quarter or over four consecutive quarters. Below this threshold, you are a "small supplier" and registration is optional — but voluntary registration allows you to claim input tax credits on your business expenses, which is often beneficial.' },
      { question:'Does GST apply to used goods sold privately?', answer:'Generally, no. Private sales between individuals (such as selling a used car or furniture through a classified ad) are not subject to GST/HST. However, if you are selling used goods as part of a business, the sales are taxable if you are a GST/HST registrant. Provincial sales tax rules for used vehicles sold privately vary — Ontario charges RST on private used car sales, for example.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['income-tax', 'budget', 'inflation', 'loan']); } catch(e) {}

  /* ── Tax rates table ── */
  const RATES = {
    AB: { type:'GST',     fed:5,     prov:0,      total:5,      fedLabel:'GST',   provLabel:'' },
    BC: { type:'GST+PST', fed:5,     prov:7,      total:12,     fedLabel:'GST',   provLabel:'PST' },
    MB: { type:'GST+RST', fed:5,     prov:7,      total:12,     fedLabel:'GST',   provLabel:'RST' },
    SK: { type:'GST+PST', fed:5,     prov:6,      total:11,     fedLabel:'GST',   provLabel:'PST' },
    ON: { type:'HST',     fed:13,    prov:0,      total:13,     fedLabel:'HST',   provLabel:'' },
    QC: { type:'GST+QST', fed:5,     prov:9.975,  total:14.975, fedLabel:'GST',   provLabel:'QST' },
    NB: { type:'HST',     fed:15,    prov:0,      total:15,     fedLabel:'HST',   provLabel:'' },
    NS: { type:'HST',     fed:15,    prov:0,      total:15,     fedLabel:'HST',   provLabel:'' },
    PE: { type:'HST',     fed:15,    prov:0,      total:15,     fedLabel:'HST',   provLabel:'' },
    NL: { type:'HST',     fed:15,    prov:0,      total:15,     fedLabel:'HST',   provLabel:'' },
    NT: { type:'GST',     fed:5,     prov:0,      total:5,      fedLabel:'GST',   provLabel:'' },
    NU: { type:'GST',     fed:5,     prov:0,      total:5,      fedLabel:'GST',   provLabel:'' },
    YT: { type:'GST',     fed:5,     prov:0,      total:5,      fedLabel:'GST',   provLabel:'' },
  };

  /* ── Formatters ── */
  NNUtils.attachFormatter(amountEl);

  /* ── Auto-recalc on province/direction change ── */
  [provinceEl, directionEl].forEach(el => {
    el?.addEventListener('change', function() {
      if (!resultsContent.classList.contains('hidden')) calculate();
    });
  });

  /* ── Presets ── */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const p = this.dataset.preset;
      if (p === 'invoice') { amountEl.value = '1,000.00'; directionEl.value = 'add'; }
      if (p === 'meal')    { amountEl.value = '50.00';    directionEl.value = 'add'; }
      if (p === 'car')     { amountEl.value = '30,000.00'; directionEl.value = 'add'; }
      if (p === 'reno')    { amountEl.value = '10,000.00'; directionEl.value = 'add'; }
      calculate();
    });
  });

  /* ── CALCULATE ── */
  function calculate() {
    const amount    = NNUtils.parseInputNumber(amountEl.value);
    const province  = provinceEl.value;
    const direction = directionEl.value;

    if (!amount || amount <= 0) {
      NNUtils.setError(amountEl, 'amount-error', 'Please enter a dollar amount.');
      return;
    }
    NNUtils.clearError(amountEl, 'amount-error');

    const r = RATES[province];
    const totalRate = r.total / 100;
    const fedRate   = r.fed / 100;
    const provRate  = r.prov / 100;

    let beforeTax, fedTax, provTax, totalTax, grandTotal;

    if (direction === 'add') {
      beforeTax  = amount;
      fedTax     = amount * fedRate;
      provTax    = amount * provRate;
      totalTax   = amount * totalRate;
      grandTotal = amount + totalTax;
    } else {
      grandTotal = amount;
      beforeTax  = amount / (1 + totalRate);
      totalTax   = grandTotal - beforeTax;
      fedTax     = beforeTax * fedRate;
      provTax    = beforeTax * provRate;
    }

    /* Render */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    // Hero
    const heroLabel = direction === 'add' ? 'Total with Tax' : 'Price Before Tax';
    const heroValue = direction === 'add' ? grandTotal : beforeTax;
    document.getElementById('result-hero-label').textContent = heroLabel;
    document.getElementById('result-total').textContent      = NNUtils.formatCAD(heroValue);
    document.getElementById('result-hero-sub').textContent   = `${r.type} ${r.total}% — ${province}`;

    // Summary rows
    document.getElementById('result-before-tax').textContent = NNUtils.formatCAD(beforeTax);

    const provRow = document.getElementById('prov-tax-row');

    if (r.prov > 0) {
      // Separate GST + PST/QST rows (BC, MB, SK, QC)
      document.getElementById('result-fed-label').textContent  = `GST (${r.fed}%)`;
      document.getElementById('result-fed-tax').textContent    = NNUtils.formatCAD(fedTax);
      provRow.style.display = '';
      document.getElementById('result-prov-label').textContent = `${r.provLabel} (${r.prov}%)`;
      document.getElementById('result-prov-tax').textContent   = NNUtils.formatCAD(provTax);
    } else if (r.type === 'HST') {
      // Single combined HST row (ON, NB, NS, PE, NL)
      document.getElementById('result-fed-label').textContent  = `HST (${r.total}%)`;
      document.getElementById('result-fed-tax').textContent    = NNUtils.formatCAD(totalTax);
      provRow.style.display = 'none';
    } else {
      // GST only (AB, NT, NU, YT)
      document.getElementById('result-fed-label').textContent  = `GST (${r.fed}%)`;
      document.getElementById('result-fed-tax').textContent    = NNUtils.formatCAD(totalTax);
      provRow.style.display = 'none';
    }

    document.getElementById('result-total-tax').textContent  = NNUtils.formatCAD(totalTax);
    document.getElementById('result-grand-total').textContent= NNUtils.formatCAD(grandTotal);

    // Milestone cards
    document.getElementById('result-rate').textContent       = r.total + '%';
    document.getElementById('result-tax-type').textContent   = r.type;
    document.getElementById('result-tax-amount').textContent = NNUtils.formatCAD(totalTax);
    document.getElementById('result-per-100').textContent    = NNUtils.formatCAD(100 * totalRate);

    // Federal Portion card — context-aware
    const fedCard      = document.getElementById('result-fed-pct');
    const fedCardLabel = fedCard?.closest('.milestone-card')?.querySelector('.milestone-label');
    const fedCardSub   = fedCard?.closest('.milestone-card')?.querySelector('.milestone-sub');
    if (r.prov > 0) {
      // BC, MB, SK, QC — GST + PST/QST already shown separately; hide this card
      if (fedCard) fedCard.closest('.milestone-card').style.display = 'none';
    } else if (r.type === 'HST') {
      // HST provinces — show federal (5%) and provincial split
      if (fedCard) fedCard.closest('.milestone-card').style.display = '';
      const fedComponent  = beforeTax * 0.05;
      const provComponent = totalTax - fedComponent;
      if (fedCard)      fedCard.textContent      = NNUtils.formatCAD(fedComponent) + ' federal / ' + NNUtils.formatCAD(provComponent) + ' prov.';
      if (fedCardLabel) fedCardLabel.textContent = 'HST Breakdown';
      if (fedCardSub)   fedCardSub.textContent   = '5% federal + ' + (r.total - 5) + '% provincial';
    } else {
      // GST only — card is redundant, hide it
      if (fedCard) fedCard.closest('.milestone-card').style.display = 'none';
    }

    window._gstResults = { amount, province, direction, beforeTax, fedTax, provTax, totalTax, grandTotal, r };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('GST/HST Calculator', { province, direction }); } catch(e) {}
  }

  /* ── Copy Results ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._gstResults;
    if (!r) return;
    const lines = [
      `🧾 GST/HST Calculator — Northern Numbers`,
      `─────────────────────────────`,
      `📍 Province: ${r.province} (${r.r.type} ${r.r.total}%)`,
      `📊 Direction: ${r.direction === 'add' ? 'Add tax' : 'Remove tax'}`,
      `─────────────────────────────`,
      `💵 Price Before Tax: ${NNUtils.formatCAD(r.beforeTax)}`,
      `🏛 Federal Tax (${r.r.fedLabel}): ${NNUtils.formatCAD(r.fedTax)}`,
    ];
    if (r.r.prov > 0) lines.push(`🏠 Provincial Tax (${r.r.provLabel}): ${NNUtils.formatCAD(r.provTax)}`);
    lines.push(
      `📊 Total Tax: ${NNUtils.formatCAD(r.totalTax)}`,
      `✅ Total with Tax: ${NNUtils.formatCAD(r.grandTotal)}`
    );
    NNUtils.copyResults(this, lines, 'GST/HST Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    amountEl.value    = '100.00';
    provinceEl.value  = 'ON';
    directionEl.value = 'add';
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(amountEl, 'amount-error');
  });

});

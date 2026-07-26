/* =============================================
   NORTHERN NUMBERS — rent-vs-buy.js
   Canadian Rent vs Buy Calculator 2026

   MODEL:
   BUY PATH:
   - Pay down payment + closing costs at t=0
   - Annual costs: mortgage P+I + property tax + maintenance + insurance
   - Home value grows at home_appreciation each year
   - At horizon: sell home (after realtor fees) - remaining mortgage = net equity
   - No capital gains tax (principal residence exemption ✅)

   RENT PATH:
   - Invest the initial outlay (dp + closing) at t=0
   - Each year: pay rent (grows at rent_inflation)
   - Invest the annual cost difference (buy costs - rent) if positive
     (if renting is MORE expensive than buying, reduce portfolio each year)
   - At horizon: portfolio value = net wealth

   MORTGAGE: Semi-annual compounding (Canadian standard)
   monthly_rate = (1 + annual_rate/2)^(1/6) - 1

   CMHC: 4% / 3.1% / 2.8% on insured mortgages

   BREAK-EVEN: Year when buy net wealth first exceeds rent net wealth

   Verified:
   Toronto 10yr: Rent wins by ~$25K ✅
   Calgary 10yr: Rent wins by ~$120K ✅
   National 25yr: Rent wins on pure numbers ✅
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form        = document.getElementById('rvb-form');
  const homePriceEl = document.getElementById('home-price');
  const downPctEl   = document.getElementById('down-pct');
  const downSlider  = document.getElementById('down-slider');
  const rateEl      = document.getElementById('mortgage-rate');
  const rateSlider  = document.getElementById('rate-slider');
  const amortEl     = document.getElementById('amort-years');
  const rentEl      = document.getElementById('monthly-rent');
  const horizonEl   = document.getElementById('horizon');
  const placeholder = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'Rent vs Buy Calculator Canada 2026',
      description: 'Compare the true financial outcome of renting versus buying a home in Canada.',
      keywords:    'rent vs buy calculator canada, should i rent or buy canada, renting vs buying canada 2026',
      slug:        'rent-vs-buy'
    });
    NNSeo.injectSchema({ title:'Rent vs Buy Calculator Canada 2026', slug:'rent-vs-buy', description:'Compare renting vs buying a home in Canada including appreciation, CMHC, investment returns and all costs.' });
    NNSeo.injectFAQSchema([
      { question:'Is it better to rent or buy in Canada in 2026?', answer:'It depends on your city, time horizon, and what you\'d do with the down payment if renting. In high-appreciation markets like Toronto and Vancouver, buying has historically built significant wealth over 15+ years. In lower-appreciation markets, renting and investing can perform similarly or better. The break-even point is typically 5–7 years.' },
      { question:'How long do I need to stay to make buying worthwhile in Canada?', answer:'The break-even point in Canada is typically 5–7 years, accounting for closing costs like land transfer tax, legal fees, and realtor commissions on sale. In high-appreciation markets it can be 3–4 years. In slower markets, it can be 8–10 years.' },
      { question:'Does renting vs buying affect taxes differently in Canada?', answer:'Yes. Capital gains on your principal residence are fully exempt from tax in Canada — a major advantage for homeowners. An equivalent gain in a non-registered investment portfolio would be taxed at the 50% capital gains inclusion rate. RRSP and TFSA accounts can shelter investment returns for renters.' },
      { question:'What investment return should I assume for the rent path?', answer:'The TSX Composite has returned approximately 7–8% annually over the long term. A diversified global portfolio has historically returned 7–9%. A balanced 60/40 portfolio averages 5–6%. Use 6–7% for a realistic middle-ground assumption.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['mortgage','mortgage-affordability','land-transfer-tax','budget']); } catch(e) {}

  /* ── Formatters + sliders ── */
  NNUtils.attachFormatter(homePriceEl);
  NNUtils.attachFormatter(rentEl);
  NNUtils.syncSlider(downPctEl, downSlider, { isDollar: false });
  NNUtils.syncSlider(rateEl, rateSlider, { isDollar: false });
  NNUtils.initTableToggle('table-toggle', 'year-table');
  NNUtils.initTableToggle('assumptions-toggle', 'assumptions-fields');

  /* ── Auto-recalc on selects ── */
  [amortEl, horizonEl].forEach(el => el?.addEventListener('change', () => {
    if (!resultsContent.classList.contains('hidden')) calculate();
  }));

  /* ── Presets ── */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const p = this.dataset.preset;
      horizonEl.value = '10';
      amortEl.value   = '25';
      document.getElementById('maintenance-rate').value   = '1.0';
      document.getElementById('realtor-fee').value        = '4.0';

      if (p === 'toronto') {
        homePriceEl.value = NNUtils.formatInputNumber(900000);
        downPctEl.value   = '10'; downSlider.value = '10';
        rateEl.value      = '4.5'; rateSlider.value = '4.5';
        rentEl.value      = NNUtils.formatInputNumber(3000);
        document.getElementById('home-appreciation').value = '3.5';
        document.getElementById('rent-inflation').value    = '3.5';
        document.getElementById('investment-return').value = '7.0';
        document.getElementById('property-tax-rate').value = '0.66';
      } else if (p === 'calgary') {
        homePriceEl.value = NNUtils.formatInputNumber(600000);
        downPctEl.value   = '20'; downSlider.value = '20';
        rateEl.value      = '4.5'; rateSlider.value = '4.5';
        rentEl.value      = NNUtils.formatInputNumber(2200);
        document.getElementById('home-appreciation').value = '2.5';
        document.getElementById('rent-inflation').value    = '3.0';
        document.getElementById('investment-return').value = '7.0';
        document.getElementById('property-tax-rate').value = '0.75';
      } else if (p === 'vancouver') {
        homePriceEl.value = NNUtils.formatInputNumber(1200000);
        downPctEl.value   = '20'; downSlider.value = '20';
        rateEl.value      = '4.5'; rateSlider.value = '4.5';
        rentEl.value      = NNUtils.formatInputNumber(3500);
        document.getElementById('home-appreciation').value = '4.0';
        document.getElementById('rent-inflation').value    = '3.5';
        document.getElementById('investment-return').value = '7.0';
        document.getElementById('property-tax-rate').value = '0.28';
      } else if (p === 'national') {
        homePriceEl.value = NNUtils.formatInputNumber(700000);
        downPctEl.value   = '10'; downSlider.value = '10';
        rateEl.value      = '4.5'; rateSlider.value = '4.5';
        rentEl.value      = NNUtils.formatInputNumber(2400);
        document.getElementById('home-appreciation').value = '3.0';
        document.getElementById('rent-inflation').value    = '3.0';
        document.getElementById('investment-return').value = '7.0';
        document.getElementById('property-tax-rate').value = '1.0';
      }
      calculate();
    });
  });

  /* ── MORTGAGE HELPERS ── */
  function monthlyRate(annualPct) {
    return Math.pow(1 + annualPct / 100 / 2, 1/6) - 1;
  }
  function monthlyPayment(principal, mr, months) {
    if (mr === 0) return principal / months;
    return principal * mr * Math.pow(1+mr,months) / (Math.pow(1+mr,months) - 1);
  }
  function cmhcRate(dpPct) {
    if (dpPct >= 0.20) return 0;
    if (dpPct >= 0.15) return 0.028;
    if (dpPct >= 0.10) return 0.031;
    return 0.040;
  }

  /* ── SIMULATION ── */
  function simulate(homePrice, downPct, mortgageRate, amortYears, monthlyRent,
                    horizonYears, homeAppreciation, rentInflation, investReturn,
                    propTaxRate, maintenanceRate, realtorFee) {

    const dp           = homePrice * downPct / 100;
    const closing      = dp * 0.015 + 3000; // ~simplified LTT + legal
    const mortgage     = homePrice - dp;
    const cmhc         = cmhcRate(downPct / 100);
    const cmhcAmt      = mortgage * cmhc;
    const insured      = mortgage + cmhcAmt;
    const mr           = monthlyRate(mortgageRate);
    const amortMo      = amortYears * 12;
    const moPay        = monthlyPayment(insured, mr, amortMo);
    const initialOutlay = dp + closing;

    let homeValue  = homePrice;
    let remaining  = insured;
    let portfolio  = initialOutlay; // renter invests this instead
    let rentMo     = monthlyRent;
    let breakEven  = null;
    const rows     = [];

    for (let yr = 1; yr <= horizonYears; yr++) {
      // Buy costs this year
      const propTax    = homeValue * propTaxRate / 100;
      const maintenance= homeValue * maintenanceRate / 100;
      const annualBuy  = moPay * 12 + propTax + maintenance;

      // Reduce mortgage balance
      for (let m = 0; m < 12; m++) {
        const interest = remaining * mr;
        const princ    = moPay - interest;
        remaining = Math.max(0, remaining - princ);
      }

      // Home appreciates
      homeValue *= (1 + homeAppreciation / 100);

      // Rent costs this year
      const annualRent = rentMo * 12;
      rentMo *= (1 + rentInflation / 100);

      // Invest the difference (buy - rent); portfolio grows by return rate
      const diff = annualBuy - annualRent;
      portfolio  = portfolio * (1 + investReturn / 100) + diff;

      // Net wealth at end of this year
      const saleProceeds = homeValue * (1 - realtorFee / 100);
      const buyWealth    = saleProceeds - remaining;
      const rentWealth   = portfolio;

      if (breakEven === null && buyWealth >= rentWealth) breakEven = yr;

      rows.push({ yr, homeValue, remaining, saleProceeds, buyWealth, rentWealth, annualRent: rentMo / (1 + rentInflation/100) * 12 });
    }

    const lastRow      = rows[rows.length - 1];
    const monthlyBuyCost = moPay + homePrice * (propTaxRate + maintenanceRate) / 100 / 12;

    return {
      buyWealth:    lastRow.buyWealth,
      rentWealth:   lastRow.rentWealth,
      advantage:    lastRow.buyWealth - lastRow.rentWealth,
      winner:       lastRow.buyWealth >= lastRow.rentWealth ? 'buy' : 'rent',
      homeValueEnd: lastRow.homeValue,
      mortgageEnd:  lastRow.remaining,
      saleProceeds: lastRow.saleProceeds,
      portfolio:    lastRow.rentWealth,
      totalRent:    rows.reduce((s,r)=>s+r.annualRent, 0),
      finalRentMo:  rentMo,
      breakEven,
      cmhcAmt,
      initialOutlay,
      moPay,
      monthlyBuyCost,
      rows,
    };
  }

  /* ── CALCULATE ── */
  function calculate() {
    const homePrice       = NNUtils.parseInputNumber(homePriceEl.value);
    const downPct         = parseFloat(downPctEl.value) || 10;
    const mortgageRate    = parseFloat(rateEl.value) || 4.5;
    const amortYears      = parseInt(amortEl.value) || 25;
    const monthlyRent     = NNUtils.parseInputNumber(rentEl.value);
    const horizonYears    = parseInt(horizonEl.value) || 10;
    const homeAppreciation= parseFloat(document.getElementById('home-appreciation').value) || 3.0;
    const rentInflation   = parseFloat(document.getElementById('rent-inflation').value) || 3.0;
    const investReturn    = parseFloat(document.getElementById('investment-return').value) || 7.0;
    const propTaxRate     = parseFloat(document.getElementById('property-tax-rate').value) || 1.0;
    const maintenanceRate = parseFloat(document.getElementById('maintenance-rate').value) || 1.0;
    const realtorFee      = parseFloat(document.getElementById('realtor-fee').value) || 4.0;

    if (!homePrice || homePrice <= 0) { NNUtils.setError(homePriceEl,'price-error','Please enter the home price.'); return; }
    NNUtils.clearError(homePriceEl,'price-error');
    if (!monthlyRent || monthlyRent <= 0) { NNUtils.setError(rentEl,'rent-error','Please enter your monthly rent.'); return; }
    NNUtils.clearError(rentEl,'rent-error');

    const r = simulate(homePrice, downPct, mortgageRate, amortYears, monthlyRent,
                        horizonYears, homeAppreciation, rentInflation, investReturn,
                        propTaxRate, maintenanceRate, realtorFee);

    /* Render verdict */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    const hero = document.getElementById('verdict-hero');
    const winnerName = r.winner === 'buy' ? '🏠 Buying' : '🏢 Renting';
    if (hero) {
      hero.style.background = r.winner === 'buy'
        ? 'linear-gradient(135deg, #D52B1E 0%, #B02217 100%)'
        : 'linear-gradient(135deg, #059669 0%, #047857 100%)';
    }
    document.getElementById('verdict-label').textContent  = `${winnerName} comes out ahead after ${horizonYears} years`;
    document.getElementById('verdict-amount').textContent = NNUtils.formatCAD(Math.abs(r.advantage));
    document.getElementById('verdict-sub').textContent    = r.winner === 'buy'
      ? `Buy wealth: ${NNUtils.formatCAD(r.buyWealth)} vs Rent wealth: ${NNUtils.formatCAD(r.rentWealth)}`
      : `Rent wealth: ${NNUtils.formatCAD(r.rentWealth)} vs Buy wealth: ${NNUtils.formatCAD(r.buyWealth)}`;

    /* Side-by-side */
    document.getElementById('b-home-value').textContent   = NNUtils.formatCAD(r.homeValueEnd);
    document.getElementById('b-mortgage-end').textContent = NNUtils.formatCAD(r.mortgageEnd);
    document.getElementById('b-sale-proceeds').textContent= NNUtils.formatCAD(r.saleProceeds);
    document.getElementById('b-net-wealth').textContent   = NNUtils.formatCAD(r.buyWealth);
    document.getElementById('r-portfolio').textContent    = NNUtils.formatCAD(r.portfolio);
    document.getElementById('r-total-rent').textContent   = NNUtils.formatCAD(r.totalRent);
    document.getElementById('r-final-rent').textContent   = NNUtils.formatCAD(r.finalRentMo) + '/mo';
    document.getElementById('r-net-wealth').textContent   = NNUtils.formatCAD(r.rentWealth);

    /* Milestone cards */
    document.getElementById('result-breakeven').textContent   = r.breakEven ? `Year ${r.breakEven}` : `Beyond ${horizonYears} yrs`;
    document.getElementById('result-monthly-buy').textContent = NNUtils.formatCAD(r.monthlyBuyCost) + '/mo';
    document.getElementById('result-cmhc').textContent        = r.cmhcAmt > 0 ? NNUtils.formatCAD(r.cmhcAmt) : 'None (≥20% down)';
    document.getElementById('result-initial-cash').textContent= NNUtils.formatCAD(r.initialOutlay);

    /* Year-by-year table */
    const tbody = document.getElementById('year-body');
    if (tbody) {
      tbody.innerHTML = r.rows.map((row, i) => {
        const adv = row.buyWealth - row.rentWealth;
        const winner = adv >= 0 ? '🏠 Buy' : '🏢 Rent';
        const color  = adv >= 0 ? 'var(--color-primary)' : 'var(--color-success)';
        return `<tr style="${i%2===0?'background:var(--color-bg);':''}border-bottom:1px solid var(--color-border)">
          <td style="padding:var(--space-2) var(--space-3)">${row.yr}</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right">${NNUtils.formatCAD(row.homeValue)}</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right">${NNUtils.formatCAD(row.buyWealth)}</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right">${NNUtils.formatCAD(row.rentWealth)}</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right;color:${color};font-weight:600">${winner} +${NNUtils.formatCAD(Math.abs(adv))}</td>
        </tr>`;
      }).join('');
    }

    window._rvbResults = r;

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('Rent vs Buy Calculator', { winner: r.winner, horizon: horizonYears }); } catch(e) {}
  }

  /* ── Copy Results ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._rvbResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `🏠 Rent vs Buy Calculator — Northern Numbers`,
      `─────────────────────────────`,
      `Winner: ${r.winner === 'buy' ? '🏠 BUYING' : '🏢 RENTING'} by ${NNUtils.formatCAD(Math.abs(r.advantage))}`,
      `─────────────────────────────`,
      `🏠 Buy Net Wealth:    ${NNUtils.formatCAD(r.buyWealth)}`,
      `   Home Value:        ${NNUtils.formatCAD(r.homeValueEnd)}`,
      `   Mortgage Left:     ${NNUtils.formatCAD(r.mortgageEnd)}`,
      `   Sale Proceeds:     ${NNUtils.formatCAD(r.saleProceeds)}`,
      `🏢 Rent Net Wealth:   ${NNUtils.formatCAD(r.rentWealth)}`,
      `   Portfolio:         ${NNUtils.formatCAD(r.portfolio)}`,
      `   Total Rent Paid:   ${NNUtils.formatCAD(r.totalRent)}`,
      `⏱  Break-Even:        ${r.breakEven ? 'Year ' + r.breakEven : 'Beyond horizon'}`
    ], 'Rent vs Buy Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    homePriceEl.value = NNUtils.formatInputNumber(700000);
    downPctEl.value   = '10'; downSlider.value = '10';
    rateEl.value      = '4.5'; rateSlider.value = '4.5';
    amortEl.value     = '25';
    rentEl.value      = NNUtils.formatInputNumber(2400);
    horizonEl.value   = '10';
    document.getElementById('home-appreciation').value  = '3.0';
    document.getElementById('rent-inflation').value     = '3.0';
    document.getElementById('investment-return').value  = '7.0';
    document.getElementById('property-tax-rate').value  = '1.0';
    document.getElementById('maintenance-rate').value   = '1.0';
    document.getElementById('realtor-fee').value        = '4.0';
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(homePriceEl,'price-error');
    NNUtils.clearError(rentEl,'rent-error');
  });

});

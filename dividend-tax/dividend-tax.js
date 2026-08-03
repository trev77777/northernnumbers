/* =============================================
   NORTHERN NUMBERS — dividend-tax.js
   Canadian Dividend Tax Credit Calculator 2026

   2026 CONFIRMED RATES (Source: TaxTips.ca April 2026, CRA, PwC):

   ELIGIBLE DIVIDENDS (unchanged 2022–2026):
   - Gross-up: 38% (taxable = actual × 1.38)
   - Federal DTC: 15.0198% of taxable (grossed-up) dividend
   - ITA s. 82(1)(b)(ii), s. 121(b)

   NON-ELIGIBLE DIVIDENDS (2025/2026):
   - Gross-up: 15% (taxable = actual × 1.15)
   - Federal DTC: 9.0301% of taxable (grossed-up) dividend
   - ITA s. 82(1)(b)(i), s. 121(a)

   PROVINCIAL DTC RATES (as % of taxable/grossed-up dividend):
   Source: TaxTips.ca eligible-dividend-tax-credit-rates.htm
           and non-eligible-dividend-tax-credit.htm (April 2026)

   FORMULA:
   1. taxable = actual × (1 + gross_up_rate)
   2. gross_fed  = incremental federal tax on taxable stacked on other_income
   3. gross_prov = incremental prov tax on taxable stacked on other_income
   4. fed_dtc  = taxable × fed_dtc_rate (non-refundable, min 0)
   5. prov_dtc = taxable × prov_dtc_rate (non-refundable, min 0)
   6. net_fed  = max(0, gross_fed - fed_dtc)
   7. net_prov = max(0, gross_prov - prov_dtc)
   8. net_total = net_fed + net_prov
   9. effective_rate = net_total / actual_dividend

   SPECIAL CASES:
   - Quebec: 16.5% federal abatement applied to gross_fed
   - Ontario: surtax applied to provincial tax incremental component

   VERIFIED:
   $1,000 eligible → taxable $1,380, fed DTC $207.27, ON prov DTC $138.00 ✅
   $1,000 non-elig → taxable $1,150, fed DTC $103.85 ✅
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form      = document.getElementById('dividend-form');
  const typeEl    = document.getElementById('dividend-type');
  const amountEl  = document.getElementById('dividend-amount');
  const incomeEl  = document.getElementById('other-income');
  const provEl    = document.getElementById('province');
  const placeholder    = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'Dividend Tax Credit Calculator Canada 2026',
      description: 'Calculate tax on eligible and non-eligible Canadian dividends. All provinces, 2026 rates. See gross-up, dividend tax credit, and effective rate.',
      keywords:    'dividend tax credit calculator canada 2026, eligible dividend tax canada, non-eligible dividend tax calculator, canadian dividend gross-up calculator',
      slug:        'dividend-tax'
    });
    NNSeo.injectSchema({ title:'Dividend Tax Credit Calculator Canada 2026', slug:'dividend-tax', description:'Calculate Canadian dividend tax using the gross-up and dividend tax credit system for 2026.' });
    NNSeo.injectFAQSchema([
      { question:'What is the eligible dividend gross-up rate in Canada for 2026?', answer:'The eligible dividend gross-up rate is 38% for 2026 (unchanged since 2016). A $1,000 eligible dividend is reported as $1,380 on your T1 tax return. The federal dividend tax credit is 15.0198% of the grossed-up amount ($207.27 on a $1,000 dividend).' },
      { question:'What is the non-eligible dividend gross-up rate in Canada for 2026?', answer:'The non-eligible (small business) dividend gross-up rate is 15% for 2026. A $1,000 non-eligible dividend is reported as $1,150 on your T1. The federal DTC is 9.0301% of the grossed-up amount ($103.85 on a $1,000 dividend).' },
      { question:'Do I pay tax on Canadian dividends inside a TFSA?', answer:'No. Canadian dividends inside a TFSA are completely tax-free. There is no gross-up, no dividend tax credit needed, and no reporting on your T1. The dividend tax credit only applies to dividends received in non-registered (taxable) accounts.' },
      { question:'Are US dividends eligible for the Canadian dividend tax credit?', answer:'No. The Canadian dividend tax credit only applies to dividends from Canadian corporations. US dividends are taxed as ordinary income at your full marginal rate, subject to 15% US withholding tax in non-registered accounts (claimable as a foreign tax credit).' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['income-tax','capital-gains','tfsa','rrsp']); } catch(e) {}

  /* ── Formatters ── */
  NNUtils.attachFormatter(amountEl);
  NNUtils.attachFormatter(incomeEl);

  /* ── Tax tables 2026 ── */

  // Federal income tax brackets 2026
  const FED_BRACKETS = [
    [57375,    0.14],
    [114750,   0.205],
    [177882,   0.26],
    [253414,   0.29],
    [Infinity, 0.33],
  ];

  // Provincial income tax brackets 2026
  const PROV_BRACKETS = {
    ON: [[51446,0.0505],[102894,0.0915],[150000,0.1116],[220000,0.1216],[Infinity,0.1316]],
    BC: [[45654,0.0506],[91310,0.0770],[104835,0.1050],[127299,0.1229],[172602,0.1470],[240716,0.1680],[Infinity,0.2050]],
    AB: [[148269,0.10],[177922,0.12],[237230,0.13],[355845,0.14],[Infinity,0.15]],
    QC: [[51780,0.14],[103545,0.19],[126000,0.2325],[Infinity,0.2575]],
    MB: [[36842,0.1080],[79625,0.1275],[Infinity,0.1740]],
    SK: [[49720,0.1050],[142058,0.1250],[Infinity,0.1450]],
    NS: [[29590,0.0879],[59180,0.1495],[93000,0.1667],[150000,0.2100],[Infinity,0.2100]],
    NB: [[47715,0.0940],[95431,0.1482],[176756,0.1652],[Infinity,0.2030]],
    PE: [[32656,0.0965],[64313,0.1363],[105000,0.1665],[140000,0.1825],[Infinity,0.1875]],
    NL: [[43198,0.0870],[86395,0.1450],[154244,0.1580],[215943,0.1780],[275870,0.1980],[551739,0.2080],[Infinity,0.2130]],
    YT: [[57375,0.0640],[114750,0.0900],[177882,0.1090],[500000,0.1280],[Infinity,0.1500]],
    NT: [[50597,0.0590],[101198,0.0860],[164525,0.1220],[Infinity,0.1405]],
    NU: [[53268,0.0400],[106537,0.0700],[173205,0.0900],[Infinity,0.1150]],
  };

  // Eligible dividend DTC rates (% of taxable/grossed-up dividend)
  // Source: TaxTips.ca eligible-dividend-tax-credit-rates.htm (2022-2026 unchanged)
  const ELIG_PROV_DTC = {
    AB: 0.0812, BC: 0.12,   MB: 0.08,   NB: 0.14,   NL: 0.063,
    NS: 0.0885, NT: 0.115,  NU: 0.0551, ON: 0.10,   PE: 0.105,
    QC: 0.1170, SK: 0.11,   YT: 0.1202,
  };

  // Non-eligible dividend DTC rates (% of taxable/grossed-up dividend)
  // Source: TaxTips.ca non-eligible-dividend-tax-credit.htm (2025/2026)
  const NELIG_PROV_DTC = {
    AB: 0.0218,   BC: 0.0196,   MB: 0.007835, NB: 0.0275,  NL: 0.032,
    NS: 0.0150,   NT: 0.06,     NU: 0.0261,   ON: 0.029863, PE: 0.013,
    QC: 0.0342,   SK: 0.02519,  YT: 0.0067,
  };

  // Gross-up and federal DTC rates
  const RATES = {
    eligible:     { grossUp: 0.38, fedDTC: 0.150198 },
    'non-eligible': { grossUp: 0.15, fedDTC: 0.090301 },
  };

  /** Ontario surtax */
  function onSurtax(provTax) {
    if (provTax > 6802) return (provTax - 6802) * 0.36 + (6802 - 5315) * 0.20;
    if (provTax > 5315) return (provTax - 5315) * 0.20;
    return 0;
  }

  /** Total provincial tax at a given income */
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

  /** Total federal tax at a given income (with QC abatement if applicable) */
  function fedTaxTotal(income, province) {
    let tax = 0, prev = 0, rem = income;
    for (const [lim, rate] of FED_BRACKETS) {
      if (prev >= income) break;
      const apply = Math.min(rem, lim - prev);
      if (apply <= 0) break;
      tax += apply * rate;
      prev += apply; rem -= apply;
      if (rem <= 0) break;
    }
    if (province === 'QC') tax *= (1 - 0.165); // Quebec 16.5% federal abatement
    return tax;
  }

  /** Calculate dividend tax using the gross-up and DTC system */
  function calcDividendTax(actualDiv, otherIncome, province, divType) {
    const { grossUp, fedDTC: fedDTCRate } = RATES[divType] || RATES.eligible;
    const provDTCRate = (divType === 'eligible' ? ELIG_PROV_DTC : NELIG_PROV_DTC)[province] || 0;

    const taxableDiv = actualDiv * (1 + grossUp);

    // Incremental federal tax on taxable dividend
    const fedBefore = fedTaxTotal(otherIncome, province);
    const fedAfter  = fedTaxTotal(otherIncome + taxableDiv, province);
    const grossFed  = fedAfter - fedBefore;

    // Incremental provincial tax on taxable dividend (including ON surtax)
    const provBefore = provTaxTotal(otherIncome, province);
    const provAfter  = provTaxTotal(otherIncome + taxableDiv, province);
    let grossProv = provAfter - provBefore;
    if (province === 'ON') {
      grossProv += onSurtax(provAfter) - onSurtax(provBefore);
    }

    // DTC amounts (applied to taxable dividend)
    const fedDTC  = taxableDiv * fedDTCRate;
    const provDTC = taxableDiv * provDTCRate;

    // Net tax (non-refundable — DTC reduces tax to minimum 0 per component)
    const netFed  = Math.max(0, grossFed  - fedDTC);
    const netProv = Math.max(0, grossProv - provDTC);
    const netTotal = netFed + netProv;

    return {
      actual:     actualDiv,
      grossUp:    actualDiv * grossUp,
      taxable:    taxableDiv,
      grossFed,
      grossProv,
      fedDTC,
      provDTC,
      netFed,
      netProv,
      netTotal,
      effectiveRate: actualDiv > 0 ? netTotal / actualDiv : 0,
      grossUpRate:   grossUp,
      fedDTCRate,
      provDTCRate,
    };
  }

  /** Calculate incremental tax on ordinary income (for comparison) */
  function calcOrdinaryTax(amount, otherIncome, province) {
    const fedBefore  = fedTaxTotal(otherIncome, province);
    const fedAfter   = fedTaxTotal(otherIncome + amount, province);
    const provBefore = provTaxTotal(otherIncome, province);
    const provAfter  = provTaxTotal(otherIncome + amount, province);
    let prov = provAfter - provBefore;
    if (province === 'ON') prov += onSurtax(provAfter) - onSurtax(provBefore);
    return (fedAfter - fedBefore) + prov;
  }

  /* ── Presets ── */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const p = this.dataset.preset;
      provEl.value  = 'ON';
      incomeEl.value = NNUtils.formatInputNumber(80000);
      typeEl.value   = 'eligible';
      if (p === 'rbc')      { amountEl.value = NNUtils.formatInputNumber(2000); }
      else if (p === 'enbridge') { amountEl.value = NNUtils.formatInputNumber(5000); }
      else if (p === 'ccpc') { amountEl.value = NNUtils.formatInputNumber(10000); typeEl.value = 'non-eligible'; }
      else if (p === 'retiree') { amountEl.value = NNUtils.formatInputNumber(20000); incomeEl.value = NNUtils.formatInputNumber(30000); }
      calculate();
    });
  });

  /* ── Update gross-up label when type changes ── */
  typeEl?.addEventListener('change', () => {
    const grossupLabel = document.getElementById('grossup-label');
    if (grossupLabel) {
      grossupLabel.textContent = typeEl.value === 'eligible' ? 'Gross-Up (38%)' : 'Gross-Up (15%)';
    }
    if (!resultsContent.classList.contains('hidden')) calculate();
  });

  /* ── CALCULATE ── */
  function calculate() {
    const divType   = typeEl.value;
    const actual    = NNUtils.parseInputNumber(amountEl.value);
    const income    = NNUtils.parseInputNumber(incomeEl.value) || 0;
    const province  = provEl.value;

    if (!actual || actual <= 0) {
      NNUtils.setError(amountEl, 'div-error', 'Please enter the dividend amount received.');
      return;
    }
    NNUtils.clearError(amountEl, 'div-error');

    const r = calcDividendTax(actual, income, province, divType);

    // Comparison: same dollar amount as employment income and interest
    const empTax   = calcOrdinaryTax(actual, income, province);
    const interestTax = empTax; // interest is taxed as ordinary income, same as employment at same income
    const taxSavedVsEmp      = Math.max(0, empTax - r.netTotal);
    const taxSavedVsInterest = Math.max(0, interestTax - r.netTotal);

    /* ── Render ── */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    const typeLabel = divType === 'eligible' ? 'Eligible' : 'Non-Eligible';
    document.getElementById('result-net-tax').textContent  = NNUtils.formatCAD(r.netTotal);
    document.getElementById('result-hero-sub').textContent =
      `${typeLabel} dividend · ${(r.effectiveRate*100).toFixed(1)}% effective rate · ${province} · ${NNUtils.formatCAD(r.taxable)} reported on T1`;

    document.getElementById('result-actual').textContent   = NNUtils.formatCAD(r.actual);
    document.getElementById('result-grossup').textContent  = '+' + NNUtils.formatCAD(r.grossUp);
    document.getElementById('result-taxable').textContent  = NNUtils.formatCAD(r.taxable);
    document.getElementById('result-gross-tax').textContent = NNUtils.formatCAD(r.grossFed + r.grossProv);
    document.getElementById('result-fed-dtc').textContent  = '−' + NNUtils.formatCAD(r.fedDTC);
    document.getElementById('result-prov-dtc').textContent = '−' + NNUtils.formatCAD(r.provDTC);
    document.getElementById('result-total').textContent    = NNUtils.formatCAD(r.netTotal);

    const grossupLabel = document.getElementById('grossup-label');
    if (grossupLabel) grossupLabel.textContent = divType === 'eligible' ? 'Gross-Up (38%)' : 'Gross-Up (15%)';

    document.getElementById('result-eff-rate').textContent      = (r.effectiveRate*100).toFixed(2) + '%';
    document.getElementById('result-after-tax').textContent     = NNUtils.formatCAD(r.actual - r.netTotal);
    document.getElementById('result-vs-employment').textContent = taxSavedVsEmp > 0 ? NNUtils.formatCAD(taxSavedVsEmp) : '$0';
    document.getElementById('result-vs-interest').textContent   = taxSavedVsInterest > 0 ? NNUtils.formatCAD(taxSavedVsInterest) : '$0';

    window._divResults = {
      actual: r.actual, taxable: r.taxable, grossFed: r.grossFed,
      grossProv: r.grossProv, fedDTC: r.fedDTC, provDTC: r.provDTC,
      netTotal: r.netTotal, effectiveRate: r.effectiveRate,
      province, divType, income
    };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('Dividend Tax Calculator', { actual: r.actual, divType, province }); } catch(e) {}
  }

  /* ── Copy ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._divResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `💰 Dividend Tax Credit Calculator 2026 — Northern Numbers`,
      `─────────────────────────────`,
      `Type: ${r.divType === 'eligible' ? 'Eligible' : 'Non-Eligible'} | Province: ${r.province}`,
      `─────────────────────────────`,
      `Actual Dividend:       ${NNUtils.formatCAD(r.actual)}`,
      `Taxable (Grossed-Up):  ${NNUtils.formatCAD(r.taxable)}`,
      `Gross Tax (Fed+Prov):  ${NNUtils.formatCAD(r.grossFed + r.grossProv)}`,
      `Federal DTC:           −${NNUtils.formatCAD(r.fedDTC)}`,
      `Provincial DTC:        −${NNUtils.formatCAD(r.provDTC)}`,
      `─────────────────────────────`,
      `Net Tax Owing:         ${NNUtils.formatCAD(r.netTotal)}`,
      `Effective Rate:        ${(r.effectiveRate*100).toFixed(2)}%`,
      `After-Tax Dividend:    ${NNUtils.formatCAD(r.actual - r.netTotal)}`,
    ], 'Dividend Tax Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    typeEl.value   = 'eligible';
    amountEl.value = '';
    incomeEl.value = NNUtils.formatInputNumber(80000);
    provEl.value   = 'ON';
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(amountEl, 'div-error');
    const grossupLabel = document.getElementById('grossup-label');
    if (grossupLabel) grossupLabel.textContent = 'Gross-Up (38%)';
  });

});

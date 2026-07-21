/* =============================================
   NORTHERN NUMBERS — net-worth.js
   Canadian Net Worth Calculator 2026

   FORMULA:
   Net Worth = Total Assets - Total Liabilities

   Assets:
   - Liquid:      chequing, TFSA, emergency fund, cash/GICs
   - Investments: RRSP/LIRA, FHSA, RESP, non-reg, pension, crypto
   - Real Estate: primary home, rental, cottage
   - Other:       vehicle, business, other

   Liabilities:
   - mortgage, HELOC, car loan, student loan,
     credit cards, personal loan, other debt

   Benchmarks from Statistics Canada Survey of
   Financial Security (inflation-adjusted 2026)
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form           = document.getElementById('networth-form');
  const placeholder    = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'Canadian Net Worth Calculator 2026',
      description: 'Calculate your total assets, liabilities, and net worth. Includes TFSA, RRSP, FHSA, real estate, and Canadian benchmarks by age.',
      keywords:    'net worth calculator canada, canadian net worth, average net worth canada by age, how to calculate net worth canada',
      slug:        'net-worth'
    });
    NNSeo.injectSchema({ title:'Canadian Net Worth Calculator 2026', slug:'net-worth', description:'Calculate your net worth with Canadian accounts like TFSA, RRSP, and FHSA. Compare to Statistics Canada benchmarks.' });
    NNSeo.injectFAQSchema([
      { question:'What is the average net worth in Canada?', answer:'According to Statistics Canada\'s Survey of Financial Security 2023, the median net worth of Canadian families was $519,700. It varies significantly by age: under 35 is $159,100, ages 35–44 is $409,300, 45–54 is $675,800, 55–64 is $873,400, and 65+ is $738,900.' },
      { question:'How do you calculate net worth in Canada?', answer:'Net worth equals total assets minus total liabilities. Assets include cash, TFSA, RRSP, FHSA, investments, home value, and other property. Liabilities include mortgage balance, car loans, student loans, credit card balances, and any other debt.' },
      { question:'Should I include my TFSA in net worth?', answer:'Yes. Your TFSA balance is a real asset and should be included in your net worth. The account has actual market value and can be withdrawn at any time. Unused TFSA contribution room is not an asset — only the money actually inside the account counts.' },
      { question:'What is a good net worth at 40 in Canada?', answer:'The median Canadian net worth for ages 35-44 is approximately $234,000. A common rule of thumb is to have a net worth equal to twice your annual income by age 40. However, this varies widely depending on whether you own a home, your province, and your savings habits.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['tfsa','rrsp','budget','mortgage']); } catch(e) {}

  /* ── Section totals (live update) ── */
  const SECTIONS = {
    'liquid':       ['chequing','tfsa','emergency-fund','cash'],
    'investments':  ['rrsp','fhsa','resp','non-registered','pension','crypto'],
    'realestate':   ['home-value','rental-property','cottage'],
    'other-assets': ['vehicle','business','other-assets-val'],
    'liabilities':  ['mortgage-balance','heloc','car-loan','student-loan','credit-cards','personal-loan','other-debt'],
  };

  function getTotal(ids) {
    return ids.reduce((sum, id) => {
      const el = document.getElementById(id);
      return sum + (NNUtils.parseInputNumber(el?.value || '0') || 0);
    }, 0);
  }

  function updateSectionTotal(section, ids, elId, isLiability) {
    const total = getTotal(ids);
    const el = document.getElementById(elId);
    if (el) el.textContent = NNUtils.formatCAD0(total);
    return total;
  }

  function updateAllTotals() {
    updateSectionTotal('liquid',       SECTIONS.liquid,       'total-liquid');
    updateSectionTotal('investments',  SECTIONS.investments,  'total-investments');
    updateSectionTotal('realestate',   SECTIONS.realestate,   'total-realestate');
    updateSectionTotal('other-assets', SECTIONS['other-assets'], 'total-other-assets');
    updateSectionTotal('liabilities',  SECTIONS.liabilities,  'total-liabilities-display', true);
  }

  /* ── Attach formatters + live totals to all inputs ── */
  Object.values(SECTIONS).flat().forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    NNUtils.attachFormatter(el);
    el.addEventListener('input', updateAllTotals);
  });

  // Initialize totals on load
  updateAllTotals();

  /* ── Benchmarks (Statistics Canada, inflation-adj. 2026) ── */
  // Statistics Canada Survey of Financial Security 2023
  // Released October 29, 2024 | 2023 constant dollars
  // Source: https://www150.statcan.gc.ca/n1/daily-quotidien/241029/dq241029a-eng.htm
  const BENCHMARKS = [
    { maxAge: 34,  label: 'Under 35', value: 159100 },
    { maxAge: 44,  label: '35–44',    value: 409300 },
    { maxAge: 54,  label: '45–54',    value: 675800 },
    { maxAge: 64,  label: '55–64',    value: 873400 },
    { maxAge: 100, label: '65+',      value: 738900 },
  ];

  function getBenchmark(age) {
    return BENCHMARKS.find(b => age <= b.maxAge) || BENCHMARKS[BENCHMARKS.length - 1];
  }

  /* ── CALCULATE ── */
  function calculate() {
    const liquid      = getTotal(SECTIONS.liquid);
    const investments = getTotal(SECTIONS.investments);
    const realestate  = getTotal(SECTIONS.realestate);
    const otherAssets = getTotal(SECTIONS['other-assets']);
    const liabilities = getTotal(SECTIONS.liabilities);
    const age         = parseInt(document.getElementById('your-age')?.value) || 35;

    const totalAssets = liquid + investments + realestate + otherAssets;
    const netWorth    = totalAssets - liabilities;

    // Derived metrics
    const dtaRatio     = totalAssets > 0 ? liabilities / totalAssets * 100 : 0;
    const coverage     = liabilities > 0 ? totalAssets / liabilities : 0;
    const liquidNW     = liquid + investments - liabilities;
    const homeValue    = NNUtils.parseInputNumber(document.getElementById('home-value')?.value || '0') || 0;
    const mortgageBal  = NNUtils.parseInputNumber(document.getElementById('mortgage-balance')?.value || '0') || 0;
    const homeEquity   = Math.max(0, homeValue - mortgageBal);
    const benchmark    = getBenchmark(age);
    const vsBenchmark  = netWorth - benchmark.value;

    /* Render */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    // Hero — colour based on net worth
    const heroBox = document.getElementById('result-hero-box');
    if (heroBox) {
      heroBox.style.background = netWorth >= 0
        ? 'linear-gradient(135deg, #D52B1E 0%, #B02217 100%)'
        : 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)';
    }
    document.getElementById('result-net-worth').textContent = NNUtils.formatCAD(netWorth);
    document.getElementById('result-hero-sub').textContent  =
      netWorth >= 0 ? `Assets: ${NNUtils.formatCAD(totalAssets)} · Liabilities: ${NNUtils.formatCAD(liabilities)}`
                    : `You owe more than you own — focus on paying down debt`;

    // Summary
    document.getElementById('result-total-assets').textContent     = NNUtils.formatCAD(totalAssets);
    document.getElementById('result-total-liabilities').textContent= NNUtils.formatCAD(liabilities);
    document.getElementById('result-nw-summary').textContent       = NNUtils.formatCAD(netWorth);
    document.getElementById('result-dta').textContent              = dtaRatio.toFixed(1) + '%';
    document.getElementById('result-coverage').textContent         = liabilities > 0 ? coverage.toFixed(2) + 'x' : 'No debt';

    // Asset breakdown
    document.getElementById('result-liquid').textContent      = NNUtils.formatCAD(liquid);
    document.getElementById('result-investments').textContent  = NNUtils.formatCAD(investments);
    document.getElementById('result-realestate').textContent   = NNUtils.formatCAD(realestate);
    document.getElementById('result-other').textContent        = NNUtils.formatCAD(otherAssets);

    // Milestone cards
    document.getElementById('result-liquid-nw').textContent    = NNUtils.formatCAD(liquidNW);
    document.getElementById('result-home-equity').textContent  = homeValue > 0 ? NNUtils.formatCAD(homeEquity) : 'No property';
    document.getElementById('result-benchmark').textContent    = NNUtils.formatCAD(benchmark.value);
    document.getElementById('result-benchmark-sub').textContent= `Median age ${benchmark.label} (Statistics Canada)`;

    const vsEl  = document.getElementById('result-vs-benchmark');
    const vsSub = document.getElementById('result-vs-sub');
    if (vsEl) {
      vsEl.textContent = (vsBenchmark >= 0 ? '+' : '') + NNUtils.formatCAD(vsBenchmark);
      vsEl.style.color = vsBenchmark >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    }
    if (vsSub) vsSub.textContent = vsBenchmark >= 0 ? 'Above Canadian median' : 'Below Canadian median';

    window._nwResults = { totalAssets, liabilities, netWorth, liquid, investments, realestate, otherAssets, homeEquity, liquidNW, benchmark, vsBenchmark };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('Net Worth Calculator', { netWorth }); } catch(e) {}
  }

  /* ── Copy Results ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._nwResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `💰 Net Worth Calculator — Northern Numbers`,
      `─────────────────────────────`,
      `✅ Total Assets:         ${NNUtils.formatCAD(r.totalAssets)}`,
      `   💰 Liquid:            ${NNUtils.formatCAD(r.liquid)}`,
      `   📈 Investments:       ${NNUtils.formatCAD(r.investments)}`,
      `   🏠 Real Estate:       ${NNUtils.formatCAD(r.realestate)}`,
      `   🚗 Other:             ${NNUtils.formatCAD(r.otherAssets)}`,
      `❌ Total Liabilities:    ${NNUtils.formatCAD(r.liabilities)}`,
      `─────────────────────────────`,
      `🏆 Net Worth:            ${NNUtils.formatCAD(r.netWorth)}`,
      `🏠 Home Equity:          ${NNUtils.formatCAD(r.homeEquity)}`,
      `💧 Liquid Net Worth:     ${NNUtils.formatCAD(r.liquidNW)}`,
      `📊 vs Median (Age ${r.benchmark.label}): ${r.vsBenchmark >= 0 ? '+' : ''}${NNUtils.formatCAD(r.vsBenchmark)}`
    ], 'Net Worth Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    const defaults = {
      'chequing': '5,000', 'tfsa': '25,000', 'emergency-fund': '0', 'cash': '0',
      'rrsp': '80,000', 'fhsa': '0', 'resp': '0', 'non-registered': '0', 'pension': '0', 'crypto': '0',
      'home-value': '650,000', 'rental-property': '0', 'cottage': '0',
      'vehicle': '20,000', 'business': '0', 'other-assets-val': '0',
      'mortgage-balance': '420,000', 'heloc': '0', 'car-loan': '12,000',
      'student-loan': '0', 'credit-cards': '2,000', 'personal-loan': '0', 'other-debt': '0',
      'your-age': '35',
    };
    Object.entries(defaults).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
    updateAllTotals();
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
  });

});

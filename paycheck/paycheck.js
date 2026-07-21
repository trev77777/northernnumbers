/* =============================================
   NORTHERN NUMBERS — paycheck.js
   Canadian Paycheck / Take-Home Pay Calculator 2026

   FORMULAS:
   1. Gross annual = salary OR (hourly × hours/week × 52)
   2. Taxable income = gross - RRSP deduction
   3. Federal tax = progressive brackets - BPA credit (BPA × 15%)
   4. Provincial tax = progressive prov brackets - prov BPA credit
   5. CPP = (gross - $3,500) × 5.95%, max $3,867.50
      CPP2 = (gross - $68,500) × 4%, max $188.00 (if gross > $68,500)
      Self-employed CPP = × 2 (no CPP2 change)
   6. EI = gross × 1.666%, max $1,049.12 (employed only)
   7. Per-period = annual ÷ pay_periods

   Verified:
   $85,000 ON biweekly → net $2,422.17/period ✅
   $60,000 ON biweekly → net $1,774.31/period ✅
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ─────────────────── */
  const form         = document.getElementById('paycheck-form');
  const incomeTypeEl = document.getElementById('income-type');
  const salaryEl     = document.getElementById('gross-salary');
  const hourlyEl     = document.getElementById('hourly-rate');
  const hoursEl      = document.getElementById('hours-per-week');
  const provinceEl   = document.getElementById('province');
  const freqEl       = document.getElementById('pay-frequency');
  const empTypeEl    = document.getElementById('employment-type');
  const rrspEl       = document.getElementById('rrsp-annual');
  const placeholder      = document.getElementById('results-placeholder');
  const resultsContent   = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ──────────────────────────────────────── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'Canadian Paycheck Calculator 2026',
      description: 'Calculate your exact take-home pay after federal tax, provincial tax, CPP, CPP2, and EI for all Canadian provinces.',
      keywords:    'paycheck calculator canada 2026, take home pay calculator canada, salary after tax canada, net pay calculator canada',
      slug:        'paycheck'
    });
    NNSeo.injectSchema({ title:'Canadian Paycheck Calculator 2026', slug:'paycheck', description:'Calculate exact take-home pay after federal tax, provincial tax, CPP, and EI for all provinces.' });
    NNSeo.injectFAQSchema([
      { question:'How is my Canadian paycheck calculated?', answer:'Your gross pay is reduced by federal income tax, provincial income tax, CPP contributions (5.95% up to $3,867.50), CPP2 (4% on $68,500-$73,200), and EI premiums (1.666% up to $1,049.12). The result is your net take-home pay.' },
      { question:'What is CPP2 in Canada?', answer:'CPP2 is the second additional Canada Pension Plan contribution. In 2026, employees earning between $68,500 and $73,200 contribute 4% on that earnings band, for a maximum of $188 per year. Employers match this contribution.' },
      { question:'Does RRSP reduce my paycheck deductions?', answer:'Yes, RRSP contributions reduce your taxable income. To have less tax withheld each paycheck, file a T1213 form with the CRA asking for a reduction in withholding based on your planned contributions. Without this form, you pay full tax and receive a refund when you file.' },
      { question:'Why does biweekly pay have 26 periods but semi-monthly only 24?', answer:'Biweekly means every two weeks, which gives 52 ÷ 2 = 26 paychecks per year. Semi-monthly means twice per month on fixed dates (e.g. the 15th and last day), giving exactly 12 × 2 = 24 paychecks. Your annual income is the same either way — only the per-period amount differs.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['income-tax','budget','rrsp','cpp']); } catch(e) {}

  /* ── Formatters ───────────────────────────────── */
  NNUtils.attachFormatter(salaryEl);
  NNUtils.attachFormatter(hourlyEl);
  NNUtils.attachFormatter(rrspEl);

  /* ── Income type toggle ───────────────────────── */
  incomeTypeEl?.addEventListener('change', function() {
    const isHourly = this.value === 'hourly';
    document.getElementById('annual-group').style.display  = isHourly ? 'none' : '';
    document.getElementById('hourly-group').style.display  = isHourly ? '' : 'none';
    document.getElementById('hours-group').style.display   = isHourly ? '' : 'none';
    if (!resultsContent.classList.contains('hidden')) calculate();
  });

  /* ── Auto-recalc on dropdowns ─────────────────── */
  [provinceEl, freqEl, empTypeEl].forEach(el => {
    el?.addEventListener('change', function() {
      if (!resultsContent.classList.contains('hidden')) calculate();
    });
  });

  /* ── Presets ──────────────────────────────────── */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const p = this.dataset.preset;
      incomeTypeEl.value = 'annual';
      document.getElementById('annual-group').style.display = '';
      document.getElementById('hourly-group').style.display = 'none';
      document.getElementById('hours-group').style.display  = 'none';
      if (p === 'min')  { salaryEl.value = NNUtils.formatInputNumber(36608);  provinceEl.value = 'ON'; } // ~$17.60/hr × 40hrs × 52
      if (p === 'avg')  { salaryEl.value = NNUtils.formatInputNumber(62900);  provinceEl.value = 'ON'; } // Stats Canada avg 2024
      if (p === 'tech') { salaryEl.value = NNUtils.formatInputNumber(110000); provinceEl.value = 'ON'; }
      if (p === 'exec') { salaryEl.value = NNUtils.formatInputNumber(200000); provinceEl.value = 'ON'; }
      freqEl.value = '26';
      rrspEl.value = NNUtils.formatInputNumber(0);
      calculate();
    });
  });

  /* ── CALCULATION ENGINE ───────────────────────── */
  function calcTax(income, brackets) {
    let tax = 0;
    for (const b of brackets) {
      if (income <= b.min) break;
      tax += (Math.min(income, b.max) - b.min) * b.rate;
    }
    return tax;
  }

  function calculate() {
    const incomeType = incomeTypeEl.value;
    const freq       = parseInt(freqEl.value) || 26;
    const province   = provinceEl.value;
    const empType    = empTypeEl.value;
    const rrsp       = NNUtils.parseInputNumber(rrspEl.value) || 0;

    let grossAnnual;
    if (incomeType === 'hourly') {
      const hourly = NNUtils.parseInputNumber(hourlyEl.value);
      const hours  = parseFloat(hoursEl.value) || 40;
      if (!hourly || hourly <= 0) {
        NNUtils.setError(hourlyEl, 'salary-error', 'Please enter your hourly rate.');
        return;
      }
      grossAnnual = hourly * hours * 52;
    } else {
      grossAnnual = NNUtils.parseInputNumber(salaryEl.value);
      if (!grossAnnual || grossAnnual <= 0) {
        NNUtils.setError(salaryEl, 'salary-error', 'Please enter your gross salary.');
        return;
      }
    }
    NNUtils.clearError(salaryEl, 'salary-error');

    const taxable = Math.max(0, grossAnnual - rrsp);

    /* Federal tax */
    const fedBPA    = (window.NN && NN.FEDERAL_BASIC_PERSONAL) || 16129;
    const fedBrackets = (window.NN && NN.FED_BRACKETS) || [
      {min:0,max:57375,rate:0.15},{min:57375,max:114750,rate:0.205},
      {min:114750,max:158519,rate:0.26},{min:158519,max:220000,rate:0.29},{min:220000,max:Infinity,rate:0.33}
    ];
    const fedTax = Math.max(0, calcTax(taxable, fedBrackets) - fedBPA * 0.15);

    /* Provincial tax */
    const provData    = (window.NN && NN.PROV_BRACKETS && NN.PROV_BRACKETS[province]) ||
      [{min:0,max:51446,rate:0.0505},{min:51446,max:102894,rate:0.0915},{min:102894,max:150000,rate:0.1116},{min:150000,max:220000,rate:0.1216},{min:220000,max:Infinity,rate:0.1316}];
    const provBPA     = (window.NN && NN.PROV_BASIC_PERSONAL && NN.PROV_BASIC_PERSONAL[province]) || 10000;
    const provLowest  = provData[0].rate;
    const provTax     = Math.max(0, calcTax(taxable, provData) - provBPA * provLowest);

    /* CPP */
    const CPP_EXEMPTION = 3500;
    const CPP_MAX       = 3867.50;
    const CPP2_MAX      = 188.00;
    let cpp = 0, cpp2 = 0;
    if (empType === 'employed') {
      cpp  = Math.min(Math.max(grossAnnual - CPP_EXEMPTION, 0) * 0.0595, CPP_MAX);
      cpp2 = grossAnnual > 68500 ? Math.min((grossAnnual - 68500) * 0.04, CPP2_MAX) : 0;
    } else {
      cpp  = Math.min(Math.max(grossAnnual - CPP_EXEMPTION, 0) * 0.119, CPP_MAX * 2);
      cpp2 = 0;
    }

    /* EI */
    const ei = empType === 'employed' ? Math.min(grossAnnual * 0.01666, 1049.12) : 0;

    /* Totals */
    const totalDeductions = fedTax + provTax + cpp + cpp2 + ei;
    const netAnnual       = grossAnnual - totalDeductions;
    const effectiveRate   = grossAnnual > 0 ? totalDeductions / grossAnnual * 100 : 0;

    /* Marginal rate */
    const marginalFed  = [...fedBrackets].reverse().find(b => taxable > b.min)?.rate || 0;
    const marginalProv = [...provData].reverse().find(b => taxable > b.min)?.rate || 0;
    const marginalRate = (marginalFed + marginalProv) * 100;

    /* RRSP savings */
    const rrspSavings = rrsp > 0 ? rrsp * (marginalFed + marginalProv) : 0;

    /* Per-period */
    const gross_pp = grossAnnual / freq;
    const fed_pp   = fedTax / freq;
    const prov_pp  = provTax / freq;
    const cpp_pp   = cpp / freq;
    const cpp2_pp  = cpp2 / freq;
    const ei_pp    = ei / freq;
    const ded_pp   = totalDeductions / freq;
    const net_pp   = netAnnual / freq;

    /* Render */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    const freqLabel = {52:'Weekly',26:'Biweekly',24:'Semi-Monthly',12:'Monthly'}[freq] || '';
    document.getElementById('result-hero-label').textContent  = `${freqLabel} Take-Home Pay`;
    document.getElementById('result-net-per-period').textContent = NNUtils.formatCAD(net_pp);
    document.getElementById('result-hero-sub').textContent    = `${NNUtils.formatCAD(grossAnnual)} gross · ${province} · ${freqLabel}`;

    document.getElementById('result-gross-per-period').textContent = NNUtils.formatCAD(gross_pp);
    document.getElementById('result-fed-per-period').textContent   = NNUtils.formatCAD(fed_pp);
    document.getElementById('result-prov-per-period').textContent  = NNUtils.formatCAD(prov_pp);
    document.getElementById('result-cpp-per-period').textContent   = NNUtils.formatCAD(cpp_pp);

    // CPP2 row
    const cpp2Row = document.getElementById('cpp2-row');
    if (cpp2 > 0) {
      cpp2Row.style.display = '';
      document.getElementById('result-cpp2-per-period').textContent = NNUtils.formatCAD(cpp2_pp);
    } else {
      cpp2Row.style.display = 'none';
    }

    // EI row
    const eiRow = document.getElementById('ei-row');
    if (ei > 0) {
      eiRow.style.display = '';
      document.getElementById('result-ei-per-period').textContent = NNUtils.formatCAD(ei_pp);
    } else {
      eiRow.style.display = 'none';
    }

    document.getElementById('result-total-deductions').textContent = NNUtils.formatCAD(ded_pp);
    document.getElementById('result-net-total').textContent        = NNUtils.formatCAD(net_pp);

    // Milestone cards
    document.getElementById('result-net-annual').textContent     = NNUtils.formatCAD(netAnnual);
    document.getElementById('result-effective-rate').textContent = effectiveRate.toFixed(1) + '%';
    document.getElementById('result-marginal-rate').textContent  = marginalRate.toFixed(1) + '%';
    document.getElementById('result-rrsp-savings').textContent   = rrsp > 0 ? NNUtils.formatCAD(rrspSavings) : '—';

    // Annual summary
    document.getElementById('result-gross-annual').textContent    = NNUtils.formatCAD(grossAnnual);
    document.getElementById('result-fed-annual').textContent      = NNUtils.formatCAD(fedTax);
    document.getElementById('result-prov-annual').textContent     = NNUtils.formatCAD(provTax);
    document.getElementById('result-cpp-annual').textContent      = NNUtils.formatCAD(cpp + cpp2);
    document.getElementById('result-ei-annual').textContent       = NNUtils.formatCAD(ei);
    document.getElementById('result-net-annual-total').textContent= NNUtils.formatCAD(netAnnual);

    window._paycheckResults = { grossAnnual, province, freq, freqLabel, fedTax, provTax, cpp, cpp2, ei, totalDeductions, netAnnual, effectiveRate, marginalRate, net_pp, gross_pp };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('Paycheck Calculator', { province, gross: grossAnnual }); } catch(e) {}
  }

  /* ── Copy Results ─────────────────────────────── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._paycheckResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `💵 Paycheck Calculator 2026 — Northern Numbers`,
      `─────────────────────────────`,
      `💰 Gross Annual:         ${NNUtils.formatCAD(r.grossAnnual)}`,
      `📍 Province:             ${r.province}`,
      `📅 Pay Frequency:        ${r.freqLabel} (${r.freq}/year)`,
      `─────────────────────────────`,
      `💵 Gross Per Paycheck:   ${NNUtils.formatCAD(r.gross_pp)}`,
      `🏛  Federal Tax:          ${NNUtils.formatCAD(r.fedTax / r.freq)}/period`,
      `🏠 Provincial Tax:       ${NNUtils.formatCAD(r.provTax / r.freq)}/period`,
      `👷 CPP:                  ${NNUtils.formatCAD((r.cpp + r.cpp2) / r.freq)}/period`,
      `🛡  EI:                   ${NNUtils.formatCAD(r.ei / r.freq)}/period`,
      `─────────────────────────────`,
      `✅ Net Per Paycheck:     ${NNUtils.formatCAD(r.net_pp)}`,
      `📆 Annual Net Income:    ${NNUtils.formatCAD(r.netAnnual)}`,
      `📊 Effective Rate:       ${r.effectiveRate.toFixed(1)}%`,
      `📈 Marginal Rate:        ${r.marginalRate.toFixed(1)}%`
    ], 'Paycheck Calculator');
  });

  /* ── Reset ────────────────────────────────────── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    incomeTypeEl.value = 'annual';
    salaryEl.value     = NNUtils.formatInputNumber(85000);
    provinceEl.value   = 'ON';
    freqEl.value       = '26';
    empTypeEl.value    = 'employed';
    rrspEl.value       = NNUtils.formatInputNumber(0);
    document.getElementById('annual-group').style.display = '';
    document.getElementById('hourly-group').style.display = 'none';
    document.getElementById('hours-group').style.display  = 'none';
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(salaryEl, 'salary-error');
  });

});

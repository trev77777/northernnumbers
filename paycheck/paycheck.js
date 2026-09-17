/* =============================================
   NORTHERN NUMBERS — paycheck.js
   Canadian Paycheck / Take-Home Pay Calculator 2026

   FORMULAS (2026 figures come from data/nn-constants.js — NN.FED_BRACKETS,
   NN.PROV_BRACKETS, NN.CPP, NN.EI — do not hardcode a private copy):
   1. Gross annual = salary OR (hourly × hours/week × 52)
   2. Taxable income = gross - RRSP deduction
   3. Federal tax = progressive brackets - BPA credit (BPA × lowest fed rate)
   4. Provincial tax = progressive prov brackets - prov BPA credit
   5. CPP = (gross - basic exemption) × employee rate, max NN.CPP.MAX_EMPLOYEE_CONTRIBUTION
      CPP2 = (gross - YMPE) × 4%, max NN.CPP.MAX_CPP2_CONTRIBUTION (if gross > YMPE)
      Self-employed pays both the employee and employer portion of CPP and CPP2
   6. EI = gross × employee rate, max NN.EI.MAX_EMPLOYEE_PREMIUM (employed only —
      EI is optional for the self-employed, not modeled here)
   7. Per-period = annual ÷ pay_periods
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

  /* ── Income field label/hint: CPP and QPIP self-employed premiums
     are calculated on NET self-employment income (revenue minus
     eligible business expenses), not gross business revenue — CRA/
     Revenu Québec both base contributions on net income. This field
     IS that base for self-employed users, so relabel it to avoid it
     being misread as "gross revenue". */
  const salaryLabelEl = document.querySelector('label[for="gross-salary"]');
  const salaryHintEl  = document.getElementById('salary-hint');
  function updateIncomeFieldWording() {
    const isSelfEmployed = empTypeEl?.value === 'self-employed';
    if (salaryLabelEl) salaryLabelEl.textContent = isSelfEmployed ? 'Annual Net Business Income' : 'Annual Gross Salary';
    if (salaryHintEl)  salaryHintEl.textContent  = isSelfEmployed
      ? 'Your net self-employment income (business revenue minus eligible expenses) — not gross revenue. CPP and QPIP are calculated on net income.'
      : 'Your total gross salary before any deductions.';
  }
  updateIncomeFieldWording();

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
      { question:'How is my Canadian paycheck calculated?', answer:'Your gross pay is reduced by federal income tax, provincial income tax, CPP contributions (5.95% up to $4,230.45), CPP2 (4% on $74,600-$85,000), and EI premiums (1.63% up to $1,123.07). The result is your net take-home pay.' },
      { question:'What is CPP2 in Canada?', answer:'CPP2 is the second additional Canada Pension Plan contribution. In 2026, employees earning between $74,600 and $85,000 contribute 4% on that earnings band, for a maximum of $416 per year. Employers match this contribution.' },
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
      if (el === empTypeEl) updateIncomeFieldWording();
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
    const isQuebec   = province === 'QC';
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

    /* Federal tax — reads shared constants (data/nn-constants.js); the
       fallback literals only apply if that shared file failed to load. */
    // Federal BPA is income-tested above $181,440 (phases to $14,829 by
    // $258,482) — use NN.getFederalBPA, not the flat constant.
    const fedBPA    = (window.NN && NN.getFederalBPA) ? NN.getFederalBPA(taxable) : 16452;
    const fedBrackets = (window.NN && NN.FED_BRACKETS) || [
      {min:0,max:58523,rate:0.14},{min:58523,max:117045,rate:0.205},
      {min:117045,max:181440,rate:0.26},{min:181440,max:258482,rate:0.29},{min:258482,max:Infinity,rate:0.33}
    ];
    // Quebec residents get a 16.5% federal tax abatement (compensation
    // for Quebec running its own equivalents to federal programs) —
    // applied to federal tax AFTER the BPA credit, per CRA/Dept. of
    // Finance. See NN.applyQuebecAbatement in data/nn-constants.js.
    const fedTaxBeforeAbatement = Math.max(0, calcTax(taxable, fedBrackets) - fedBPA * fedBrackets[0].rate);
    const fedTax = (window.NN && NN.applyQuebecAbatement) ? NN.applyQuebecAbatement(fedTaxBeforeAbatement, province) : (isQuebec ? fedTaxBeforeAbatement * 0.835 : fedTaxBeforeAbatement);

    /* Provincial tax */
    const provData    = (window.NN && NN.PROV_BRACKETS && NN.PROV_BRACKETS[province]) ||
      [{min:0,max:53891,rate:0.0505},{min:53891,max:107785,rate:0.0915},{min:107785,max:150000,rate:0.1116},{min:150000,max:220000,rate:0.1216},{min:220000,max:Infinity,rate:0.1316}];
    // Manitoba's BPA is income-tested above $200,000 (to $0 by $400,000)
    // — NN.getProvincialBPA applies that for MB, flat for every other province.
    const provBPA     = (window.NN && NN.getProvincialBPA) ? (NN.getProvincialBPA(taxable, province) ?? 12989) : ((window.NN && NN.PROV_BASIC_PERSONAL && NN.PROV_BASIC_PERSONAL[province]) ?? 12989);
    const provLowest  = provData[0].rate;
    const provTax     = Math.max(0, calcTax(taxable, provData) - provBPA * provLowest);

    /* CPP/QPP + CPP2/QPP2 — Quebec residents pay QPP (not CPP), at a
       higher combined rate than CPP, via Retraite Québec/Revenu Québec.
       Self-employed pay double the employee rate on both tiers, same
       as the federal CPP rule. */
    const pensionPlan = isQuebec && window.NN && NN.QPP ? NN.QPP : (window.NN && NN.CPP) || {};
    const CPP_EXEMPTION = pensionPlan.BASIC_EXEMPTION || 3500;
    const CPP_YMPE       = pensionPlan.YMPE || 74600;
    const CPP_RATE       = pensionPlan.EMPLOYEE_RATE || 0.0595;
    const CPP_MAX        = pensionPlan.MAX_EMPLOYEE_CONTRIBUTION || 4230.45;
    const CPP2_RATE      = isQuebec ? (pensionPlan.QPP2_RATE || 0.04) : (pensionPlan.CPP2_RATE || 0.04);
    const CPP2_MAX       = isQuebec ? (pensionPlan.MAX_QPP2_CONTRIBUTION || 416.00) : (pensionPlan.MAX_CPP2_CONTRIBUTION || 416.00);
    let cpp = 0, cpp2 = 0;
    if (empType === 'employed') {
      cpp  = Math.min(Math.max(grossAnnual - CPP_EXEMPTION, 0) * CPP_RATE, CPP_MAX);
      cpp2 = grossAnnual > CPP_YMPE ? Math.min((grossAnnual - CPP_YMPE) * CPP2_RATE, CPP2_MAX) : 0;
    } else {
      cpp  = Math.min(Math.max(grossAnnual - CPP_EXEMPTION, 0) * (CPP_RATE * 2), CPP_MAX * 2);
      cpp2 = grossAnnual > CPP_YMPE ? Math.min((grossAnnual - CPP_YMPE) * (CPP2_RATE * 2), CPP2_MAX * 2) : 0;
    }

    /* EI (self-employed EI is optional/opt-in in Canada — NOT modeled
       here, deliberately; that disclosure is preserved). Quebec
       residents pay a lower EI rate (QPIP covers maternity/parental/
       paternity benefits instead) PLUS a separate, MANDATORY QPIP
       premium that self-employed Quebec residents must also pay
       (unlike EI) — both folded into "ei" below since there's no
       separate QPIP line in this calculator's results. Self-employed
       QPIP uses its own rate/max (NN.QPIP_SELF_EMPLOYED), not the
       employee rate — Revenu Québec treats them differently. */
    const eiPlan = isQuebec && window.NN && NN.QC_EI ? NN.QC_EI : (window.NN && NN.EI) || {};
    const EI_RATE = eiPlan.EMPLOYEE_RATE || 0.0163;
    const EI_MAX  = eiPlan.MAX_EMPLOYEE_PREMIUM || 1123.07;
    let ei = empType === 'employed' ? Math.min(grossAnnual * EI_RATE, EI_MAX) : 0;
    let qpip = 0;
    if (isQuebec && window.NN) {
      if (empType === 'employed' && NN.QPIP) {
        qpip = Math.min(grossAnnual, NN.QPIP.MAX_INSURABLE_EARNINGS) * NN.QPIP.EMPLOYEE_RATE;
      } else if (empType !== 'employed' && NN.QPIP_SELF_EMPLOYED) {
        // QPIP is mandatory for the self-employed, unlike EI — but Revenu
        // Québec charges no premium at all below the $2,000 threshold
        // (self-employed have no employer withholding to preserve here).
        if (grossAnnual >= (NN.QPIP_SELF_EMPLOYED.MIN_THRESHOLD || 2000)) {
          qpip = Math.min(grossAnnual, NN.QPIP_SELF_EMPLOYED.MAX_INSURABLE_EARNINGS) * NN.QPIP_SELF_EMPLOYED.RATE;
        }
      }
      ei += qpip; // combined into the single "EI" line — see result-ei-label, relabeled to "EI + QPIP" for Quebec
    }

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

    // Hourly wage equivalent (based on 40 hrs/week, 52 weeks)
    const hourlyEquivRow = document.getElementById('hourly-equiv-row');
    const hourlyEquivEl  = document.getElementById('result-hourly-equiv');
    if (incomeType === 'annual' && hourlyEquivEl) {
      const hourlyEquiv = grossAnnual / 2080; // 40 hrs × 52 weeks
      hourlyEquivEl.textContent = NNUtils.formatCAD(hourlyEquiv) + '/hr';
      if (hourlyEquivRow) hourlyEquivRow.style.display = '';
    } else {
      if (hourlyEquivRow) hourlyEquivRow.style.display = 'none';
    }
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
    document.getElementById('result-monthly-takehome').textContent = NNUtils.formatCAD(netAnnual / 12);
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
    const cppLabelEl = document.getElementById('result-cpp-label');
    const eiLabelEl  = document.getElementById('result-ei-label');
    if (cppLabelEl) cppLabelEl.textContent = isQuebec ? 'Annual QPP' : 'Annual CPP';
    if (eiLabelEl)  eiLabelEl.textContent  = isQuebec ? (empType === 'employed' ? 'Annual EI + QPIP' : 'Annual QPIP') : 'Annual EI';
    document.getElementById('result-net-annual-total').textContent= NNUtils.formatCAD(netAnnual);

    window._paycheckResults = { grossAnnual, province, empType, freq, freqLabel, fedTax, provTax, cpp, cpp2, ei, totalDeductions, netAnnual, effectiveRate, marginalRate, net_pp, gross_pp };

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
      `👷 ${r.province === 'QC' ? 'QPP' : 'CPP'}:                  ${NNUtils.formatCAD((r.cpp + r.cpp2) / r.freq)}/period`,
      `🛡  ${r.province === 'QC' ? (r.empType === 'employed' ? 'EI + QPIP' : 'QPIP') : 'EI'}:                   ${NNUtils.formatCAD(r.ei / r.freq)}/period`,
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
    updateIncomeFieldWording();
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

/* =============================================
   NORTHERN NUMBERS — income-tax.js
   Canadian Income Tax Calculator 2026

   FORMULA (2026 figures read from data/nn-constants.js — NN.FED_BRACKETS,
   NN.PROV_BRACKETS, NN.CPP, NN.EI — do not hardcode a private copy):
   1. Taxable income = gross - RRSP - other deductions
   2. Federal tax = progressive brackets on taxable income
                  - Federal Basic Personal Amount credit (BPA × lowest fed rate)
   3. Provincial tax = progressive prov brackets on taxable income
                     - Provincial BPA credit (prov BPA × lowest prov rate)
   4. CPP = (income - basic exemption) × employee rate, max NN.CPP.MAX_EMPLOYEE_CONTRIBUTION
      CPP2 = (income - YMPE) × 4%, max NN.CPP.MAX_CPP2_CONTRIBUTION (if income > YMPE)
      Self-employed pays both the employee and employer portion of CPP and CPP2
   5. EI = income × employee rate, max NN.EI.MAX_EMPLOYEE_PREMIUM (employed only)
   6. Total deductions = fed + prov + CPP + CPP2 + EI
   7. After-tax = gross - total deductions
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form          = document.getElementById('tax-form');
  const grossEl       = document.getElementById('gross-income');
  const provinceEl    = document.getElementById('province');
  const rrspEl        = document.getElementById('rrsp-deduction');
  const otherEl       = document.getElementById('other-deductions');
  const empTypeEl     = document.getElementById('employment-type');
  const placeholder   = document.getElementById('results-placeholder');
  const resultsContent= document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── Income field label/hint: CPP and QPIP self-employed premiums
     are calculated on NET self-employment income (revenue minus
     eligible business expenses), not gross business revenue — CRA/
     Revenu Québec both base contributions on net income. This single
     income field IS that base for self-employed users, so relabel it
     to avoid it being misread as "gross revenue". */
  const grossLabelEl = document.querySelector('label[for="gross-income"]');
  const grossHintEl  = document.getElementById('gross-income-hint');
  function updateIncomeFieldWording() {
    const isSelfEmployed = empTypeEl?.value === 'self-employed';
    if (grossLabelEl) grossLabelEl.textContent = isSelfEmployed ? 'Net Business Income' : 'Employment Income';
    if (grossHintEl)  grossHintEl.textContent  = isSelfEmployed
      ? 'Your net self-employment income (business revenue minus eligible expenses) — not gross revenue. CPP and QPIP are calculated on net income.'
      : 'Your total gross employment income before any deductions.';
  }
  updateIncomeFieldWording();

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'Canadian Income Tax Calculator 2026',
      description: 'Free Canadian income tax calculator for 2026. Calculate federal and provincial income tax, CPP, EI, marginal rate, effective rate, and after-tax income for all provinces.',
      keywords:    'income tax calculator canada 2026, canadian tax calculator, provincial tax calculator, marginal tax rate canada',
      slug:        'income-tax'
    });
    NNSeo.injectSchema({ title:'Canadian Income Tax Calculator 2026', slug:'income-tax', description:'Calculate your 2026 Canadian income tax, CPP, EI, marginal rate, effective rate, and after-tax income.' });
    NNSeo.injectFAQSchema([
      { question:'Why is my marginal tax rate higher than my effective tax rate?', answer:'Your marginal rate is the rate on your last dollar of income — it applies only to the portion of income in the highest bracket. Your effective rate is the average across all dollars earned. Because Canada uses a progressive system, only income above each threshold is taxed at the higher rate, so your effective rate is always lower.' },
      { question:'How do RRSP contributions reduce my taxes?', answer:'RRSP contributions reduce your taxable income dollar-for-dollar. The tax saving equals your marginal rate times your contribution. A $10,000 contribution at a 40% marginal rate saves $4,000 in federal and provincial taxes combined. Enter your RRSP deduction above to see your exact savings.' },
      { question:'Does this calculator include CPP and EI?', answer:'Yes. CPP contributions (5.95% up to $4,230.45, plus CPP2 at 4% up to $416 above $74,600) and EI premiums (1.63% up to $1,123.07) are included in the Total Deductions and Net Income calculations. Self-employed individuals pay double CPP and no EI — select "Self-Employed" in the Employment Type dropdown.' },
      { question:'Does this calculator include provincial tax?', answer:'Yes. Select your province or territory and the calculator applies the correct 2026 provincial tax brackets and basic personal amount credit. The Provincial Tax Bracket Breakdown in the results panel shows exactly how your provincial tax is calculated.' },
    ]);
  } catch(e) {}

  /* ── Related calculators ── */
  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['rrsp','tfsa','budget','cpp']); } catch(e) {}

  /* ── Info tips ── */
  if (window.NNUtils) try { NNUtils.initInfoTips(); } catch(e) {}

  /* ── Formatters ── */
  NNUtils.attachFormatter(grossEl);
  NNUtils.attachFormatter(rrspEl);
  NNUtils.attachFormatter(otherEl);

  /* ── CALCULATION ENGINE ── */
  function calcTax(income, brackets) {
    let tax = 0;
    for (const b of brackets) {
      if (income <= b.min) break;
      tax += (Math.min(income, b.max) - b.min) * b.rate;
    }
    return tax;
  }

  function calculate() {
    const gross = NNUtils.parseInputNumber(grossEl.value);
    if (!gross || gross <= 0) {
      NNUtils.setError(grossEl, 'gross-income-error', 'Please enter your gross income.');
      return;
    }
    NNUtils.clearError(grossEl, 'gross-income-error');

    const province    = provinceEl.value;
    const isQuebec    = province === 'QC';
    const rrsp        = NNUtils.parseInputNumber(rrspEl?.value || '0');
    const other       = NNUtils.parseInputNumber(otherEl?.value || '0');
    const empType     = empTypeEl?.value || 'employed';
    const taxable     = Math.max(0, gross - rrsp - other);

    /* Federal tax */
    // Federal BPA is income-tested above $181,440 (phases to $14,829 by
    // $258,482) — NN.getFederalBPA applies that; do not use the flat
    // NN.FEDERAL_BASIC_PERSONAL for anyone in or above the phase-out range.
    const fedBPA      = NN.getFederalBPA ? NN.getFederalBPA(taxable) : (NN.FEDERAL_BASIC_PERSONAL || 16452);
    const fedTaxGross = calcTax(taxable, NN.FED_BRACKETS);
    const fedCredit   = fedBPA * NN.FED_BRACKETS[0].rate;
    const fedTaxBeforeAbatement = Math.max(0, fedTaxGross - fedCredit);
    // Quebec residents get a 16.5% federal tax abatement, applied to
    // federal tax AFTER the BPA credit — see NN.applyQuebecAbatement.
    const fedTax      = NN.applyQuebecAbatement ? NN.applyQuebecAbatement(fedTaxBeforeAbatement, province) : (isQuebec ? fedTaxBeforeAbatement * 0.835 : fedTaxBeforeAbatement);

    /* Provincial tax — Manitoba's BPA is similarly income-tested above
       $200,000 (to $0 by $400,000); NN.getProvincialBPA applies that
       for MB and returns the flat amount for every other province. */
    const provBrackets = NN.PROV_BRACKETS[province] || NN.PROV_BRACKETS.ON;
    const provBPA      = NN.getProvincialBPA ? (NN.getProvincialBPA(taxable, province) ?? 10000) : ((NN.PROV_BASIC_PERSONAL || {})[province] ?? 10000);
    const provLowest   = provBrackets[0].rate;
    const provTaxGross = calcTax(taxable, provBrackets);
    const provCredit   = provBPA * provLowest;
    const provTax      = Math.max(0, provTaxGross - provCredit);

    /* CPP/QPP — Quebec residents pay QPP (higher combined rate), not
       CPP; reads data/nn-constants.js NN.CPP / NN.QPP (single source
       of truth for both). */
    const pensionPlan = isQuebec && NN.QPP ? NN.QPP : (NN.CPP || {});
    const CPP_EXEMPTION   = pensionPlan.BASIC_EXEMPTION || 3500;
    const CPP_RATE        = pensionPlan.EMPLOYEE_RATE || 0.0595;
    const CPP_MAX         = pensionPlan.MAX_EMPLOYEE_CONTRIBUTION || 4230.45;
    const CPP_YMPE        = pensionPlan.YMPE || 74600;
    const CPP2_RATE       = isQuebec ? (pensionPlan.QPP2_RATE || 0.04) : (pensionPlan.CPP2_RATE || 0.04);
    const CPP2_MAX        = isQuebec ? (pensionPlan.MAX_QPP2_CONTRIBUTION || 416.00) : (pensionPlan.MAX_CPP2_CONTRIBUTION || 416.00);
    let cpp = 0, cpp2 = 0;
    if (empType === 'employed') {
      cpp  = Math.min(Math.max(gross - CPP_EXEMPTION, 0) * CPP_RATE, CPP_MAX);
      cpp2 = gross > CPP_YMPE ? Math.min((gross - CPP_YMPE) * CPP2_RATE, CPP2_MAX) : 0;
    } else if (empType === 'self-employed') {
      cpp  = Math.min(Math.max(gross - CPP_EXEMPTION, 0) * CPP_RATE * 2, CPP_MAX * 2);
      cpp2 = gross > CPP_YMPE ? Math.min((gross - CPP_YMPE) * CPP2_RATE * 2, CPP2_MAX * 2) : 0;
    }

    /* EI/QC-EI + QPIP — Quebec residents pay a lower EI rate (QC_EI)
       plus a separate, mandatory QPIP premium (self-employed QPIP is
       ALSO mandatory, unlike EI — uses its own NN.QPIP_SELF_EMPLOYED
       rate). Self-employed EI itself remains optional/not modeled. */
    const eiPlan = isQuebec && NN.QC_EI ? NN.QC_EI : (NN.EI || {});
    const EI_RATE = eiPlan.EMPLOYEE_RATE || 0.0163;
    const EI_MAX  = eiPlan.MAX_EMPLOYEE_PREMIUM || 1123.07;
    let ei = empType === 'employed' ? Math.min(gross * EI_RATE, EI_MAX) : 0;
    if (isQuebec) {
      if (empType === 'employed' && NN.QPIP) {
        ei += Math.min(gross, NN.QPIP.MAX_INSURABLE_EARNINGS) * NN.QPIP.EMPLOYEE_RATE;
      } else if (empType === 'self-employed' && NN.QPIP_SELF_EMPLOYED) {
        // Revenu Québec: no QPIP premium at all below the $2,000 threshold
        // (not a reduced premium — zero). This represents final annual
        // liability, unlike employer payroll withholding on employees.
        if (gross >= (NN.QPIP_SELF_EMPLOYED.MIN_THRESHOLD || 2000)) {
          ei += Math.min(gross, NN.QPIP_SELF_EMPLOYED.MAX_INSURABLE_EARNINGS) * NN.QPIP_SELF_EMPLOYED.RATE;
        }
      }
    }

    /* Totals */
    const totalTax  = fedTax + provTax + cpp + cpp2 + ei;
    const afterTax  = gross - totalTax;
    const monthly   = afterTax / 12;

    /* Rates — Quebec's 16.5% federal abatement (NN.QUEBEC_FEDERAL_ABATEMENT_RATE)
       reduces federal tax uniformly, so it scales the marginal federal rate the same way. */
    const effectiveRate = gross > 0 ? totalTax / gross * 100 : 0;
    const abatementMultiplier = isQuebec ? (1 - (NN.QUEBEC_FEDERAL_ABATEMENT_RATE || 0.165)) : 1;
    const marginalFedRaw = [...NN.FED_BRACKETS].reverse().find(b => taxable > b.min)?.rate || 0;
    const marginalFed   = marginalFedRaw * abatementMultiplier;
    const marginalProv  = [...provBrackets].reverse().find(b => taxable > b.min)?.rate || 0;
    const marginalRate  = (marginalFed + marginalProv) * 100;

    /* RRSP savings */
    const rrspSavings = rrsp > 0 ? rrsp * (marginalFed + marginalProv) : 0;

    /* Render */
    const wasHidden = resultsContent.classList.contains('hidden');
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    document.getElementById('result-after-tax').textContent   = NNUtils.formatCAD(afterTax);
    document.getElementById('result-monthly').textContent     = NNUtils.formatCAD(monthly) + '/month take-home';
    document.getElementById('result-gross').textContent       = NNUtils.formatCAD(gross);
    document.getElementById('result-taxable').textContent     = NNUtils.formatCAD(taxable);
    document.getElementById('result-fed-tax').textContent     = NNUtils.formatCAD(fedTax);
    document.getElementById('result-prov-tax').textContent    = NNUtils.formatCAD(provTax);
    document.getElementById('result-cpp').textContent         = NNUtils.formatCAD(cpp + cpp2); // includes CPP2 where applicable
    const cppLabelEl = document.getElementById('result-cpp-label');
    const eiLabelEl  = document.getElementById('result-ei-label');
    if (cppLabelEl) cppLabelEl.textContent = isQuebec ? 'QPP Contributions' : 'CPP Contributions';
    if (eiLabelEl)  eiLabelEl.textContent  = isQuebec ? (empType === 'self-employed' ? 'QPIP Premiums' : 'EI + QPIP Premiums') : 'EI Premiums';
    document.getElementById('result-ei').textContent          = NNUtils.formatCAD(ei);
    document.getElementById('result-total-tax').textContent   = NNUtils.formatCAD(totalTax);
    document.getElementById('result-marginal').textContent    = marginalRate.toFixed(1) + '%';
    document.getElementById('result-effective').textContent   = effectiveRate.toFixed(1) + '%';
    document.getElementById('result-monthly-card').textContent= NNUtils.formatCAD(monthly);
    document.getElementById('result-net-income').textContent    = NNUtils.formatCAD(afterTax);
    document.getElementById('result-total-taxes-card').textContent = NNUtils.formatCAD(totalTax);
    document.getElementById('result-rrsp-savings').textContent = rrsp > 0 ? NNUtils.formatCAD(rrspSavings) : '—';
    const rrspSubEl = document.getElementById('rrsp-savings-sub');
    if (rrspSubEl) {
      rrspSubEl.textContent = rrsp > 0
        ? `You saved ${NNUtils.formatCAD(rrspSavings)} in taxes from your RRSP contribution`
        : 'Enter an RRSP deduction above';
      rrspSubEl.style.color = rrsp > 0 ? 'var(--color-success)' : '';
    }
    const rrspCard = document.getElementById('rrsp-savings-card');
    if (rrspCard) rrspCard.style.background = rrsp > 0 ? '#F0FDF4' : '';

    /* Federal bracket breakdown */
    const breakdownEl = document.getElementById('fed-bracket-breakdown');
    if (breakdownEl) {
      let html = '';
      let remaining = taxable;
      for (const b of NN.FED_BRACKETS) {
        if (remaining <= 0 || remaining <= b.min) break;
        const taxed  = Math.min(remaining, b.max) - b.min;
        const tax_in_bracket = taxed * b.rate;
        const maxLabel = b.max === Infinity ? '+' : NNUtils.formatCAD0(b.max);
        html += `<div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border);font-size:var(--text-sm)">
          <span style="color:var(--color-text-muted)">${(b.rate*100).toFixed(1)}% on ${NNUtils.formatCAD0(b.min)}–${maxLabel}</span>
          <span style="font-weight:600">${NNUtils.formatCAD(tax_in_bracket)}</span>
        </div>`;
      }
      html += `<div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;font-size:var(--text-sm)">
        <span style="color:var(--color-text-muted)">Less: Basic Personal Amount credit</span>
        <span style="font-weight:600;color:var(--color-success)">–${NNUtils.formatCAD(fedCredit)}</span>
      </div>`;
      if (isQuebec) {
        const abatementAmount = fedTaxBeforeAbatement - fedTax;
        html += `<div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;font-size:var(--text-sm)">
          <span style="color:var(--color-text-muted)">Less: Quebec federal tax abatement (16.5%)</span>
          <span style="font-weight:600;color:var(--color-success)">–${NNUtils.formatCAD(abatementAmount)}</span>
        </div>`;
      }
      html += `<div style="display:flex;justify-content:space-between;padding:var(--space-3) 0 var(--space-2);border-top:2px solid var(--color-border);margin-top:var(--space-2);font-weight:700">
        <span>Federal Tax Owing</span>
        <span style="color:var(--color-primary)">${NNUtils.formatCAD(fedTax)}</span>
      </div>`;
      breakdownEl.innerHTML = html;
    }

    /* Provincial bracket breakdown */
    const provBreakdownEl = document.getElementById('prov-bracket-breakdown');
    const provLabelEl     = document.getElementById('prov-bracket-label');
    if (provBreakdownEl) {
      const provName = (window.NN && NN.PROV_NAMES && NN.PROV_NAMES[province]) || province;
      if (provLabelEl) provLabelEl.textContent = `${provName} — Basic Personal Amount: ${NNUtils.formatCAD0(provBPA)} (credit: ${NNUtils.formatCAD(provCredit)})`;
      let phtml = '';
      for (const b of provBrackets) {
        if (taxable <= b.min) break;
        const taxed = Math.min(taxable, b.max) - b.min;
        const tax_in = taxed * b.rate;
        const maxL = b.max === Infinity ? '+' : NNUtils.formatCAD0(b.max);
        phtml += `<div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border);font-size:var(--text-sm)">
          <span style="color:var(--color-text-muted)">${(b.rate*100).toFixed(2)}% on ${NNUtils.formatCAD0(b.min)}–${maxL}</span>
          <span style="font-weight:600">${NNUtils.formatCAD(tax_in)}</span>
        </div>`;
      }
      phtml += `<div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;font-size:var(--text-sm)">
        <span style="color:var(--color-text-muted)">Less: Provincial Basic Personal Amount credit</span>
        <span style="font-weight:600;color:var(--color-success)">–${NNUtils.formatCAD(provCredit)}</span>
      </div>`;
      phtml += `<div style="display:flex;justify-content:space-between;padding:var(--space-3) 0 var(--space-2);border-top:2px solid var(--color-border);margin-top:var(--space-2);font-weight:700">
        <span>Provincial Tax Owing</span>
        <span style="color:var(--color-primary)">${NNUtils.formatCAD(provTax)}</span>
      </div>`;
      provBreakdownEl.innerHTML = phtml;
    }

    /* Summary pills */
    NNUtils.renderSummaryPills('result-summary-box', [
      `💰 ${NNUtils.formatCAD(gross)} gross`,
      `📊 ${effectiveRate.toFixed(1)}% effective rate`,
      `📈 ${marginalRate.toFixed(1)}% marginal rate`,
      `🏠 ${NN.PROV_NAMES[province] || province}`
    ]);

    /* Copy results */
    window._taxResults = { gross, taxable, fedTax, provTax, cpp: cpp + cpp2, ei, totalTax, afterTax, monthly, effectiveRate, marginalRate, province, empType };

    /* Scroll */
    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('Income Tax Calculator', { income: gross, province }); } catch(e) {}
  }

  /* ── COPY RESULTS ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._taxResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `🇨🇦 Canadian Income Tax 2026 — ${NN.PROV_NAMES[r.province] || r.province}`,
      `─────────────────────────────`,
      `💰 Gross Income:         ${NNUtils.formatCAD(r.gross)}`,
      `📋 Taxable Income:       ${NNUtils.formatCAD(r.taxable)}`,
      `─────────────────────────────`,
      `🏛 Federal Tax:          ${NNUtils.formatCAD(r.fedTax)}`,
      `🏠 Provincial Tax:       ${NNUtils.formatCAD(r.provTax)}`,
      `👷 ${r.province === 'QC' ? 'QPP' : 'CPP'}:                  ${NNUtils.formatCAD(r.cpp)}`,
      `🛡 ${r.province === 'QC' ? (r.empType === 'employed' ? 'EI + QPIP' : 'QPIP') : 'EI'}:                   ${NNUtils.formatCAD(r.ei)}`,
      `─────────────────────────────`,
      `📊 Total Deductions:     ${NNUtils.formatCAD(r.totalTax)}`,
      `✅ After-Tax Income:     ${NNUtils.formatCAD(r.afterTax)}`,
      `📅 Monthly Take-Home:    ${NNUtils.formatCAD(r.monthly)}`,
      `📈 Marginal Rate:        ${r.marginalRate.toFixed(1)}%`,
      `📉 Effective Rate:       ${r.effectiveRate.toFixed(1)}%`
    ], 'Income Tax Calculator');
  });

  /* ── RESET ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    grossEl.value      = NNUtils.formatInputNumber(85000);
    provinceEl.value   = 'ON';
    if (rrspEl)    rrspEl.value  = NNUtils.formatInputNumber(0);
    if (otherEl)   otherEl.value = NNUtils.formatInputNumber(0);
    if (empTypeEl) empTypeEl.value = 'employed';
    updateIncomeFieldWording();
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    NNUtils.clearError(grossEl, 'gross-income-error');
  });

  /* ── Auto-calculate on province/type change ── */
  provinceEl?.addEventListener('change', function() {
    if (!resultsContent.classList.contains('hidden')) calculate();
  });
  empTypeEl?.addEventListener('change', function() {
    updateIncomeFieldWording();
    if (!resultsContent.classList.contains('hidden')) calculate();
  });

});

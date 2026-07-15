/* =============================================
   NORTHERN NUMBERS — income-tax.js
   Canadian Income Tax Calculator 2026

   FORMULA:
   1. Taxable income = gross - RRSP - other deductions
   2. Federal tax = progressive brackets on taxable income
                  - Federal Basic Personal Amount credit (BPA × 15%)
   3. Provincial tax = progressive prov brackets on taxable income
                     - Provincial BPA credit (prov BPA × lowest prov rate)
   4. CPP = (income - $3,500 exemption) × 5.95%, max $3,867.50
      Self-employed CPP = both employee + employer = × 11.9%, max $7,735
   5. EI = income × 1.666%, max $1,049.12 (employed only)
   6. Total deductions = fed + prov + CPP + EI
   7. After-tax = gross - total deductions

   Verified:
   $85,000 ON → Fed $11,850 | Prov $5,069 | CPP $3,868 | EI $1,049 | Total $21,836 ✅
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
      { question:'What is the federal basic personal amount for 2026?', answer:'The federal Basic Personal Amount for 2026 is $16,129, which provides a 15% non-refundable tax credit of $2,419.35, reducing your federal tax owing.' },
      { question:'What is the marginal tax rate in Canada?', answer:'Your marginal tax rate is the combined federal and provincial rate on your last dollar of income. It ranges from about 20% at lower incomes to over 53% in some provinces at the highest income levels.' },
      { question:'How does RRSP reduce income tax?', answer:'RRSP contributions reduce your taxable income dollar-for-dollar. The tax saving equals your marginal tax rate multiplied by your contribution. A $10,000 RRSP contribution at a 40% marginal rate saves $4,000 in taxes.' },
      { question:'Do I have to pay CPP and EI?', answer:'Employed Canadians pay CPP at 5.95% of insurable earnings (max $3,867.50 in 2026) and EI at 1.666% (max $1,049.12). Self-employed pay double CPP (no EI). Retirees and those on pension income are generally exempt.' },
    ]);
  } catch(e) {}

  /* ── Related calculators ── */
  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['rrsp','tfsa','budget','cpp']); } catch(e) {}

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
    const rrsp        = NNUtils.parseInputNumber(rrspEl?.value || '0');
    const other       = NNUtils.parseInputNumber(otherEl?.value || '0');
    const empType     = empTypeEl?.value || 'employed';
    const taxable     = Math.max(0, gross - rrsp - other);

    /* Federal tax */
    const fedBPA      = NN.FEDERAL_BASIC_PERSONAL || 16129;
    const fedTaxGross = calcTax(taxable, NN.FED_BRACKETS);
    const fedCredit   = fedBPA * 0.15;
    const fedTax      = Math.max(0, fedTaxGross - fedCredit);

    /* Provincial tax */
    const provBrackets = NN.PROV_BRACKETS[province] || NN.PROV_BRACKETS.ON;
    const provBPA      = (NN.PROV_BASIC_PERSONAL || {})[province] || 10000;
    const provLowest   = provBrackets[0].rate;
    const provTaxGross = calcTax(taxable, provBrackets);
    const provCredit   = provBPA * provLowest;
    const provTax      = Math.max(0, provTaxGross - provCredit);

    /* CPP */
    const CPP_EXEMPTION   = 3500;
    const CPP_RATE        = 0.0595;
    const CPP_MAX         = 3867.50;
    let cpp = 0;
    if (empType === 'employed') {
      cpp = Math.min(Math.max(gross - CPP_EXEMPTION, 0) * CPP_RATE, CPP_MAX);
    } else if (empType === 'self-employed') {
      cpp = Math.min(Math.max(gross - CPP_EXEMPTION, 0) * CPP_RATE * 2, CPP_MAX * 2);
    }

    /* EI */
    const EI_RATE = 0.01666;
    const EI_MAX  = 1049.12;
    const ei = empType === 'employed' ? Math.min(gross * EI_RATE, EI_MAX) : 0;

    /* Totals */
    const totalTax  = fedTax + provTax + cpp + ei;
    const afterTax  = gross - totalTax;
    const monthly   = afterTax / 12;

    /* Rates */
    const effectiveRate = gross > 0 ? totalTax / gross * 100 : 0;
    const marginalFed   = [...NN.FED_BRACKETS].reverse().find(b => taxable > b.min)?.rate || 0;
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
    document.getElementById('result-cpp').textContent         = NNUtils.formatCAD(cpp);
    document.getElementById('result-ei').textContent          = NNUtils.formatCAD(ei);
    document.getElementById('result-total-tax').textContent   = NNUtils.formatCAD(totalTax);
    document.getElementById('result-marginal').textContent    = marginalRate.toFixed(1) + '%';
    document.getElementById('result-effective').textContent   = effectiveRate.toFixed(1) + '%';
    document.getElementById('result-monthly-card').textContent= NNUtils.formatCAD(monthly);
    document.getElementById('result-rrsp-savings').textContent= rrsp > 0 ? NNUtils.formatCAD(rrspSavings) : '—';

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
      html += `<div style="display:flex;justify-content:space-between;padding:var(--space-3) 0 var(--space-2);border-top:2px solid var(--color-border);margin-top:var(--space-2);font-weight:700">
        <span>Federal Tax Owing</span>
        <span style="color:var(--color-primary)">${NNUtils.formatCAD(fedTax)}</span>
      </div>`;
      breakdownEl.innerHTML = html;
    }

    /* Summary pills */
    NNUtils.renderSummaryPills('result-summary-box', [
      `💰 ${NNUtils.formatCAD(gross)} gross`,
      `📊 ${effectiveRate.toFixed(1)}% effective rate`,
      `📈 ${marginalRate.toFixed(1)}% marginal rate`,
      `🏠 ${NN.PROV_NAMES[province] || province}`
    ]);

    /* Copy results */
    window._taxResults = { gross, taxable, fedTax, provTax, cpp, ei, totalTax, afterTax, monthly, effectiveRate, marginalRate, province };

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
      `👷 CPP:                  ${NNUtils.formatCAD(r.cpp)}`,
      `🛡 EI:                   ${NNUtils.formatCAD(r.ei)}`,
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
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    NNUtils.clearError(grossEl, 'gross-income-error');
  });

  /* ── Auto-calculate on province/type change ── */
  provinceEl?.addEventListener('change', function() {
    if (!resultsContent.classList.contains('hidden')) calculate();
  });
  empTypeEl?.addEventListener('change', function() {
    if (!resultsContent.classList.contains('hidden')) calculate();
  });

});

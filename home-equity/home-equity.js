/* =============================================
   NORTHERN NUMBERS — home-equity.js
   Home Equity & HELOC Calculator Canada 2026

   RULES (Source: OSFI Guideline B-20):
   - Home Equity = Home Value - Mortgage Balance - HELOC Drawn
   - LTV = (Mortgage + HELOC) / Home Value × 100
   - HELOC max = min(Rule A, Rule B)
     Rule A: home_value × 65%          (standalone HELOC cap)
     Rule B: home_value × 80% - mortgage  (combined LTV cap)
   - Available HELOC = max(0, heloc_max - existing_heloc)
   - Monthly interest = heloc_drawn × (rate / 12)
   - Prime rate 2026: 4.95%
   - Typical HELOC: prime + 0.5% to prime + 1.0%

   VERIFIED:
   $500K free & clear → HELOC max $325,000 (Rule A) ✅
   $800K home, $400K mortgage → HELOC max $240,000 (Rule B) ✅
   $600K home, $500K mortgage → HELOC max $0 (>80% LTV) ✅
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form        = document.getElementById('equity-form');
  const homeValEl   = document.getElementById('home-value');
  const mortgageEl  = document.getElementById('mortgage-balance');
  const helocEl     = document.getElementById('existing-heloc');
  const rateEl      = document.getElementById('heloc-rate');
  const placeholder = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'Home Equity Calculator Canada 2026 — HELOC Limit & LTV',
      description: 'Find your home equity, LTV ratio, and maximum HELOC borrowing limit under OSFI B-20 rules. Updated for 2026.',
      keywords:    'home equity calculator canada, HELOC calculator canada 2026, how much can I borrow HELOC canada, LTV calculator canada',
      slug:        'home-equity'
    });
    NNSeo.injectSchema({ title:'Home Equity Calculator Canada 2026', slug:'home-equity', description:'Calculate home equity, LTV ratio, and maximum HELOC limit under OSFI B-20 rules.' });
    NNSeo.injectFAQSchema([
      { question:'How much can I borrow with a HELOC in Canada?', answer:'Under OSFI Guideline B-20, you can borrow the lesser of: 65% of your home\'s appraised value, or 80% of your home\'s value minus your mortgage balance. Your lender will also assess income, credit score, and debt service ratios.' },
      { question:'What are the OSFI HELOC rules in Canada?', answer:'OSFI Guideline B-20 sets two simultaneous limits: the HELOC cannot exceed 65% of your home\'s appraised value (standalone cap), and your mortgage plus HELOC together cannot exceed 80% of your home\'s value (combined cap). The more restrictive limit applies.' },
      { question:'What is the current HELOC interest rate in Canada in 2026?', answer:'With the Bank of Canada prime rate at 4.95% in 2026, most major bank HELOCs are priced at 5.45%–5.95% (prime + 0.50% to prime + 1.00%). Your rate depends on your credit score, LTV, and lender relationship.' },
      { question:'Is HELOC interest tax deductible in Canada?', answer:'HELOC interest is tax deductible only when funds are used to earn income — such as investing in stocks or a rental property. Interest on HELOC funds used for personal purposes (renovations to your principal residence, vacations) is not deductible.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['mortgage','mortgage-affordability','rent-vs-buy','land-transfer-tax']); } catch(e) {}

  /* ── Formatters ── */
  NNUtils.attachFormatter(homeValEl);
  NNUtils.attachFormatter(mortgageEl);
  NNUtils.attachFormatter(helocEl);

  /* ── Presets ── */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const p = this.dataset.preset;
      helocEl.value = NNUtils.formatInputNumber(0);
      rateEl.value  = '5.45';

      if (p === 'starter') {
        homeValEl.value  = NNUtils.formatInputNumber(650000);
        mortgageEl.value = NNUtils.formatInputNumber(400000);
      } else if (p === 'average') {
        homeValEl.value  = NNUtils.formatInputNumber(900000);
        mortgageEl.value = NNUtils.formatInputNumber(450000);
      } else if (p === 'paid') {
        homeValEl.value  = NNUtils.formatInputNumber(800000);
        mortgageEl.value = NNUtils.formatInputNumber(80000);
      } else if (p === 'free') {
        homeValEl.value  = NNUtils.formatInputNumber(1000000);
        mortgageEl.value = NNUtils.formatInputNumber(0);
      }
      calculate();
    });
  });

  /* ── CALCULATE ── */
  function calculate() {
    const homeValue   = NNUtils.parseInputNumber(homeValEl.value);
    const mortgage    = NNUtils.parseInputNumber(mortgageEl.value) || 0;
    const existHeloc  = NNUtils.parseInputNumber(helocEl.value) || 0;
    const helocRate   = parseFloat(rateEl.value) / 100 || 0.0545;

    if (!homeValue || homeValue <= 0) {
      NNUtils.setError(homeValEl, 'value-error', 'Please enter your estimated home value.');
      return;
    }
    NNUtils.clearError(homeValEl, 'value-error');

    if (mortgage < 0) {
      NNUtils.setError(mortgageEl, 'mortgage-error', 'Mortgage balance cannot be negative.');
      return;
    }
    NNUtils.clearError(mortgageEl, 'mortgage-error');

    // Core calculations
    const equity    = homeValue - mortgage - existHeloc;
    const ltvCurrent = (mortgage + existHeloc) / homeValue * 100;
    const equityPct  = equity / homeValue * 100;

    // HELOC limits (OSFI B-20)
    const ruleA   = homeValue * 0.65;
    const ruleB   = Math.max(0, homeValue * 0.80 - mortgage);
    const helocMax = Math.min(ruleA, ruleB);

    // Available to draw
    const available = Math.max(0, helocMax - existHeloc);

    // Monthly interest on existing HELOC balance
    const monthlyInterest = existHeloc * (helocRate / 12);

    // LTV if HELOC fully drawn
    const ltvAfterFull = (mortgage + helocMax) / homeValue * 100;

    // How much to pay down to qualify (if currently can't get HELOC)
    const noHeloc = helocMax === 0 && mortgage > 0;
    const paydownNeeded = noHeloc ? Math.max(0, mortgage - homeValue * 0.80) : 0;

    /* ── Render ── */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    // No-HELOC notice
    const noHelocNotice = document.getElementById('no-heloc-notice');
    const paydownEl     = document.getElementById('paydown-needed');
    if (noHelocNotice) noHelocNotice.style.display = noHeloc ? '' : 'none';
    if (paydownEl && noHeloc) paydownEl.textContent = NNUtils.formatCAD(paydownNeeded);

    // Hero
    document.getElementById('result-equity').textContent    = NNUtils.formatCAD(equity);
    document.getElementById('result-hero-sub').textContent  =
      `${equityPct.toFixed(1)}% ownership · LTV ${ltvCurrent.toFixed(1)}% · ${NNUtils.formatCAD(available)} available to borrow`;

    // Summary rows
    document.getElementById('result-home-value').textContent = NNUtils.formatCAD(homeValue);
    document.getElementById('result-mortgage').textContent   = '−' + NNUtils.formatCAD(mortgage);
    document.getElementById('result-net-equity').textContent = NNUtils.formatCAD(equity);

    const helocRow = document.getElementById('heloc-row');
    if (existHeloc > 0) {
      helocRow.style.display = '';
      document.getElementById('result-heloc-drawn').textContent = '−' + NNUtils.formatCAD(existHeloc);
    } else {
      helocRow.style.display = 'none';
    }

    // HELOC section
    document.getElementById('result-rule-a').textContent   = NNUtils.formatCAD(ruleA);
    document.getElementById('result-rule-b').textContent   = ruleB === 0 ? '$0 (mortgage > 80%)' : NNUtils.formatCAD(ruleB);
    document.getElementById('result-heloc-max').textContent = NNUtils.formatCAD(helocMax);
    document.getElementById('result-available').textContent = NNUtils.formatCAD(available);

    const existingNote = document.getElementById('result-existing-note');
    if (existingNote) {
      existingNote.textContent = existHeloc > 0
        ? ` (after ${NNUtils.formatCAD(existHeloc)} already drawn)`
        : '';
    }

    // Milestones
    document.getElementById('result-ltv').textContent          = ltvCurrent.toFixed(1) + '%';
    document.getElementById('result-ltv-after').textContent    = helocMax > 0 ? ltvAfterFull.toFixed(1) + '%' : '—';
    document.getElementById('result-monthly-interest').textContent =
      existHeloc > 0 ? NNUtils.formatCAD(monthlyInterest) + '/mo' : '—';
    document.getElementById('result-equity-pct').textContent   = equityPct.toFixed(1) + '%';

    window._equityResults = {
      homeValue, mortgage, existHeloc, equity, ltvCurrent,
      ruleA, ruleB, helocMax, available, monthlyInterest, equityPct
    };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('Home Equity Calculator', { homeValue, equity }); } catch(e) {}
  }

  /* ── Copy ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._equityResults;
    if (!r) return;
    const lines = [
      `🏠 Home Equity Calculator 2026 — Northern Numbers`,
      `─────────────────────────────`,
      `Home Value:         ${NNUtils.formatCAD(r.homeValue)}`,
      `Mortgage Balance:   −${NNUtils.formatCAD(r.mortgage)}`,
    ];
    if (r.existHeloc > 0) lines.push(`HELOC Drawn:        −${NNUtils.formatCAD(r.existHeloc)}`);
    lines.push(
      `─────────────────────────────`,
      `Home Equity:        ${NNUtils.formatCAD(r.equity)} (${r.equityPct.toFixed(1)}%)`,
      `Current LTV:        ${r.ltvCurrent.toFixed(1)}%`,
      `─────────────────────────────`,
      `HELOC Max (Rule A): ${NNUtils.formatCAD(r.ruleA)}`,
      `HELOC Max (Rule B): ${NNUtils.formatCAD(r.ruleB)}`,
      `HELOC Limit:        ${NNUtils.formatCAD(r.helocMax)}`,
      `Available to Borrow: ${NNUtils.formatCAD(r.available)}`,
    );
    NNUtils.copyResults(this, lines, 'Home Equity Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    homeValEl.value  = '';
    mortgageEl.value = NNUtils.formatInputNumber(0);
    helocEl.value    = NNUtils.formatInputNumber(0);
    rateEl.value     = '5.45';
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(homeValEl, 'value-error');
    NNUtils.clearError(mortgageEl, 'mortgage-error');
  });

});

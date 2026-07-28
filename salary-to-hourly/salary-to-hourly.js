/* =============================================
   NORTHERN NUMBERS — salary-to-hourly.js
   Salary to Hourly Calculator Canada 2026

   FORMULAS (all gross, before tax):
   Annual    = hourly × hours_per_week × weeks_per_year
   Monthly   = annual / 12
   Semi-mo   = annual / 24
   Biweekly  = annual / 26
   Weekly    = annual / weeks_per_year
   Daily     = annual / (weeks_per_year × 5)
   Hourly    = annual / (hours_per_week × weeks_per_year)

   VERIFIED:
   $80,000 / 2080hrs = $38.46/hr ✅
   $25/hr × 2080 = $52,000/yr ✅
   Round-trip salary→hourly→salary exact ✅

   Ontario overtime threshold: 44 hrs/week
   Federal overtime threshold: 40 hrs/week
   Overtime rate: 1.5× regular
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form        = document.getElementById('salary-form');
  const salaryEl    = document.getElementById('annual-salary');
  const hourlyEl    = document.getElementById('hourly-rate');
  const hoursEl     = document.getElementById('hours-week');
  const hoursSlider = document.getElementById('hours-slider');
  const weeksEl     = document.getElementById('weeks-year');
  const placeholder = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'Salary to Hourly Calculator Canada 2026',
      description: 'Convert any annual salary to hourly wage or hourly rate to annual salary for Canada. Includes all pay period breakdowns.',
      keywords:    'salary to hourly calculator canada, hourly to salary calculator canada, annual salary to hourly wage canada, salary calculator canada 2026',
      slug:        'salary-to-hourly'
    });
    NNSeo.injectSchema({ title:'Salary to Hourly Calculator Canada 2026', slug:'salary-to-hourly', description:'Convert salary to hourly or hourly to salary for any Canadian pay period.' });
    NNSeo.injectFAQSchema([
      { question:'How do I convert a salary to hourly rate in Canada?', answer:'Divide your annual salary by the total hours worked per year. For a standard 40-hour week over 52 weeks (2,080 hours), divide by 2,080. A $70,000 salary is $33.65/hr. Adjust the hours if you work more or fewer than 40 hours a week.' },
      { question:'What is the minimum wage in Ontario in 2026?', answer:'The Ontario general minimum wage is $17.60 per hour from January 1 to September 30, 2026, increasing to $17.95 per hour on October 1, 2026. The federal minimum wage is $18.15/hr (effective April 1, 2026) and applies to banks, airlines, telecom, and other federally regulated employers.' },
      { question:'What is the difference between biweekly and semi-monthly pay in Canada?', answer:'Biweekly pay is every two weeks — 26 paychecks per year. Semi-monthly pay is twice a month — 24 paychecks per year. On a $60,000 salary, biweekly is $2,307.69 per check and semi-monthly is $2,500. Two months per year you receive three biweekly checks.' },
      { question:'When does overtime start in Ontario?', answer:'In Ontario, overtime pay begins after 44 hours worked in a single work week, not the federal standard of 40 hours. Overtime must be paid at 1.5 times your regular rate. Being paid a salary does not automatically exempt you from overtime — most non-managerial salaried employees are still entitled to overtime.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['paycheck','income-tax','budget','cpp']); } catch(e) {}

  /* ── Mode toggle ── */
  const modeSalary = document.getElementById('mode-salary');
  const modeHourly = document.getElementById('mode-hourly');
  const salaryGroup = document.getElementById('salary-group');
  const hourlyGroup = document.getElementById('hourly-group');
  let currentMode = 'salary';

  function setMode(mode) {
    currentMode = mode;
    if (mode === 'salary') {
      modeSalary.className = 'btn btn-primary';   modeSalary.setAttribute('aria-pressed','true');
      modeHourly.className = 'btn btn-secondary'; modeHourly.setAttribute('aria-pressed','false');
      salaryGroup.style.display = '';
      hourlyGroup.style.display = 'none';
    } else {
      modeHourly.className = 'btn btn-primary';   modeHourly.setAttribute('aria-pressed','true');
      modeSalary.className = 'btn btn-secondary'; modeSalary.setAttribute('aria-pressed','false');
      hourlyGroup.style.display = '';
      salaryGroup.style.display = 'none';
    }
    if (!resultsContent.classList.contains('hidden')) calculate();
  }

  modeSalary?.addEventListener('click', () => setMode('salary'));
  modeHourly?.addEventListener('click', () => setMode('hourly'));

  /* ── Formatters + slider ── */
  NNUtils.attachFormatter(salaryEl);
  NNUtils.syncSlider(hoursEl, hoursSlider, { isDollar: false });

  weeksEl?.addEventListener('change', () => {
    if (!resultsContent.classList.contains('hidden')) calculate();
  });

  /* ── Presets ── */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const p = this.dataset.preset;
      weeksEl.value = '52'; hoursEl.value = '40'; hoursSlider.value = '40';
      if (p === 'minwage')  { setMode('hourly'); hourlyEl.value = '17.60'; }
      if (p === 'median')   { setMode('salary'); salaryEl.value = NNUtils.formatInputNumber(62000); }
      if (p === 'pro')      { setMode('salary'); salaryEl.value = NNUtils.formatInputNumber(95000); }
      if (p === 'exec')     { setMode('salary'); salaryEl.value = NNUtils.formatInputNumber(150000); }
      calculate();
    });
  });

  /* ── CALCULATE ── */
  function calculate() {
    const hoursPerWeek  = parseFloat(hoursEl.value) || 40;
    const weeksPerYear  = parseInt(weeksEl.value) || 52;
    const hoursPerYear  = hoursPerWeek * weeksPerYear;
    const daysPerYear   = weeksPerYear * 5;
    const ON_MIN_WAGE   = 17.60;

    let annual, hourly;

    if (currentMode === 'salary') {
      annual = NNUtils.parseInputNumber(salaryEl.value);
      if (!annual || annual <= 0) {
        NNUtils.setError(salaryEl, 'salary-error', 'Please enter a valid annual salary.');
        return;
      }
      NNUtils.clearError(salaryEl, 'salary-error');
      hourly = annual / hoursPerYear;
    } else {
      hourly = parseFloat(hourlyEl.value);
      if (!hourly || hourly <= 0) return;
      annual = hourly * hoursPerYear;
    }

    const monthly    = annual / 12;
    const semiMo     = annual / 24;
    const biweekly   = annual / 26;
    const weekly     = annual / weeksPerYear;
    const daily      = annual / daysPerYear;
    const perMinute  = hourly / 60;
    const vsMinWage  = hourly / ON_MIN_WAGE;
    const otRate     = hourly * 1.5;
    const otDouble   = hourly * 2.0;

    /* Render */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    const heroLabel = currentMode === 'salary' ? 'Hourly Equivalent' : 'Annual Salary';
    const heroValue = currentMode === 'salary' ? NNUtils.formatCAD(hourly) + '/hr' : NNUtils.formatCAD(annual);
    const heroSub   = `Based on ${hoursPerWeek} hrs/week × ${weeksPerYear} weeks = ${hoursPerYear.toLocaleString()} hrs/year`;

    document.getElementById('result-hero-label').textContent = heroLabel;
    document.getElementById('result-hero-value').textContent = heroValue;
    document.getElementById('result-hero-sub').textContent   = heroSub;

    document.getElementById('result-annual').textContent      = NNUtils.formatCAD(annual) + '/yr';
    document.getElementById('result-monthly').textContent     = NNUtils.formatCAD(monthly) + '/mo';
    document.getElementById('result-semi-monthly').textContent= NNUtils.formatCAD(semiMo);
    document.getElementById('result-biweekly').textContent    = NNUtils.formatCAD(biweekly);
    document.getElementById('result-weekly').textContent      = NNUtils.formatCAD(weekly) + '/wk';
    document.getElementById('result-daily').textContent       = NNUtils.formatCAD(daily) + '/day';
    document.getElementById('result-hourly').textContent      = NNUtils.formatCAD(hourly) + '/hr';

    document.getElementById('result-hours-year').textContent  = hoursPerYear.toLocaleString();
    document.getElementById('result-days-year').textContent   = daysPerYear.toLocaleString();
    document.getElementById('result-per-minute').textContent  = NNUtils.formatCAD(perMinute) + '/min';

    const minWageLabel = vsMinWage >= 1
      ? `${vsMinWage.toFixed(1)}× min wage`
      : `${(vsMinWage * 100).toFixed(0)}% of min wage`;
    document.getElementById('result-vs-minwage').textContent = minWageLabel;

    document.getElementById('ot-regular').textContent = NNUtils.formatCAD(hourly) + '/hr';
    document.getElementById('ot-rate').textContent    = NNUtils.formatCAD(otRate) + '/hr';
    document.getElementById('ot-double').textContent  = NNUtils.formatCAD(otDouble) + '/hr';

    window._salaryResults = { annual, hourly, hoursPerWeek, weeksPerYear, hoursPerYear, monthly, biweekly, weekly, daily };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('Salary to Hourly Calculator', { annual, hourly }); } catch(e) {}
  }

  /* ── Copy Results ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._salaryResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `💼 Salary to Hourly — Northern Numbers`,
      `─────────────────────────────`,
      `📅 ${r.hoursPerWeek} hrs/week × ${r.weeksPerYear} weeks = ${r.hoursPerYear.toLocaleString()} hrs/year`,
      `─────────────────────────────`,
      `💰 Annual:      ${NNUtils.formatCAD(r.annual)}/yr`,
      `📅 Monthly:     ${NNUtils.formatCAD(r.monthly)}/mo`,
      `📅 Biweekly:    ${NNUtils.formatCAD(r.biweekly)}`,
      `📅 Weekly:      ${NNUtils.formatCAD(r.weekly)}/wk`,
      `📅 Daily:       ${NNUtils.formatCAD(r.daily)}/day`,
      `⏱  Hourly:      ${NNUtils.formatCAD(r.hourly)}/hr`
    ], 'Salary to Hourly Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    setMode('salary');
    salaryEl.value  = NNUtils.formatInputNumber(80000);
    hourlyEl.value  = '25.00';
    hoursEl.value   = '40'; hoursSlider.value = '40';
    weeksEl.value   = '52';
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(salaryEl, 'salary-error');
  });

});

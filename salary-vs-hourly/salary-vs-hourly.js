/* =============================================
   NORTHERN NUMBERS — salary-vs-hourly.js
   Salary vs Hourly Calculator Canada 2026

   FORMULAS (all gross, before tax):
   Standard annual hours   = hours_per_week × 52
   Effective annual hours  = (52 − vacation_weeks) × hours_per_week
                              − stat_days × (hours_per_week / 5)
   Salary → hourly (standard)  = annual / standard_hours
   Salary → hourly (effective) = annual / effective_hours
   Hourly → salary              = hourly_rate × standard_hours
   Monthly   = annual / 12
   Semi-mo   = annual / 24
   Biweekly  = annual / 26
   Weekly    = annual / 52
   Daily     = annual / 260

   Contractor comparison is an illustrative estimate only (plain
   arithmetic on the effective hourly rate), not a tax calculation.
   The "employer CPP match" figure quoted is a flat, non-personalized
   reference amount — the same 2026 max figure already stated in this
   page's own educational copy — not derived from a per-user tax
   computation. See /disclaimer.html.

   VERIFIED:
   $80,000 / 2080hrs = $38.46/hr (standard) ✅
   Round-trip salary→hourly→salary exact (standard basis) ✅
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form            = document.getElementById('svh-form');
  const salaryEl        = document.getElementById('annual-salary');
  const hourlyEl        = document.getElementById('hourly-wage');
  const hoursEl         = document.getElementById('hours-per-week');
  const hoursSlider     = document.getElementById('hours-slider');
  const vacationEl      = document.getElementById('vacation-weeks');
  const statEl          = document.getElementById('stat-days');
  const placeholder     = document.getElementById('results-placeholder');
  const resultsContent  = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO — guarded so any shared-script failure can't break the calculator ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'Salary vs Hourly Calculator Canada 2026',
      description: 'Free Canadian salary to hourly calculator. Convert between annual salary and hourly wage. See weekly, biweekly, semi-monthly, and monthly pay breakdowns with vacation and stat holiday adjustments.',
      keywords:    'salary to hourly calculator canada, hourly to salary calculator canada, salary converter canada, annual salary to hourly wage canada, pay period calculator canada 2026',
      slug:        'salary-vs-hourly'
    });
    NNSeo.injectSchema({
      title:       'Salary vs Hourly Calculator Canada 2026',
      slug:        'salary-vs-hourly',
      description: 'Convert between annual salary and hourly wage with vacation and stat holiday adjustments for Canada.'
    });
    NNSeo.injectFAQSchema([
      { question:'How many working hours are in a Canadian work year?', answer:'The standard Canadian work year is 52 weeks × 40 hours = 2,080 hours. With 10 federal statutory holidays (Ontario) deducted, it\'s 2,000 hours. Quebec has 13 stat holidays, giving approximately 1,976 hours. These numbers matter most for contractors calculating their effective hourly rate and for comparing job offers with different hours.' },
      { question:'What is the most common pay period in Canada?', answer:'Biweekly (every two weeks, 26 pay periods per year) is the most common in Canada, particularly in the public sector and larger private employers. Semi-monthly (twice a month, 24 periods) is also common. Weekly pay is more typical in trades, retail, and hospitality. Monthly pay is standard for many professionals and small businesses. Biweekly results in two months per year with three paychecks instead of the usual two.' },
      { question:'How much paid vacation am I entitled to in Canada?', answer:'Under federal Canada Labour Code and most provincial employment standards, employees are entitled to 2 weeks of paid vacation (4% of wages) after one year of employment. After 5 years with the same employer, this increases to 3 weeks (6%) in most provinces. Many employers offer more than the minimum — 3 weeks is common, and 4–5 weeks is standard in the public sector and tech industry.' },
      { question:'Does my hourly rate change when I become salaried?', answer:'Not mathematically, but the practical implications differ. A salaried employee typically receives the same amount each pay period regardless of hours worked (within limits). An hourly employee is paid for exact hours worked and must be paid overtime after the statutory threshold — 44 hours/week in Ontario, 8 hours/day or 40 hours/week federally. Many professional roles in Canada are exempt from overtime as salaried "managers" even when the salary is modest.' },
      { question:'How do I negotiate a raise using hourly vs salary math?', answer:'Knowing both numbers gives you negotiating flexibility. If you currently earn $65,000 and want $70,000, that\'s a $2.40/hr increase on a 2,080-hour year. Framing a raise as "$2.50 more per hour" can feel more concrete to some employers than "$5,000 more per year." Conversely, a small-sounding hourly increase of $1/hr equals $2,080 more annually. Always calculate both ways before entering any compensation conversation.' },
      { question:'What happens to my hourly rate if I work overtime?', answer:'In most Canadian provinces, overtime must be paid at 1.5× your regular hourly rate once you exceed the weekly threshold. In Ontario, that threshold is 44 hours per week. Federally regulated workplaces use 40 hours. If you regularly work overtime, your effective annual earnings can significantly exceed the base calculation. A $25/hr role with consistent 10-hour weeks of overtime at 1.5× pays $37.50/hr on those extra hours — adding $19,500 per year to the base calculation.' },
      { question:'What is the living wage in Canada in 2026?', answer:'The living wage — the amount needed to cover basic expenses without relying on government assistance — varies significantly by city and is recalculated regularly by regional living wage networks (such as the Ontario Living Wage Network) based on local rent, food, transportation, and childcare costs. It is consistently higher than the minimum wage in every province — often by a wide margin in large cities — so check your region\'s current published rate rather than assuming a single national figure.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['paycheck','income-tax','budget','cpp']); } catch(e) {}

  /* ── Mode toggle ── */
  const modeSalary  = document.getElementById('mode-salary');
  const modeHourly  = document.getElementById('mode-hourly');
  const salaryGroup = document.getElementById('salary-input-group');
  const hourlyGroup = document.getElementById('hourly-input-group');
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

  /* ── Formatters + slider + advanced toggle ── */
  NNUtils.attachFormatter(salaryEl);
  NNUtils.syncSlider(hoursEl, hoursSlider, { isDollar: false });
  NNUtils.initAdvancedToggle('contractor-toggle', 'contractor-details');

  [vacationEl, statEl, hoursEl].forEach(el => {
    el?.addEventListener('change', () => {
      if (!resultsContent.classList.contains('hidden')) calculate();
    });
  });

  /* ── Presets ── */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const p = this.dataset.preset;
      hoursEl.value = '40'; hoursSlider.value = '40';
      vacationEl.value = '2'; statEl.value = '10';
      if (p === 'min-wage')     { setMode('hourly'); hourlyEl.value = '17.60'; }
      if (p === 'median')       { setMode('salary'); salaryEl.value = NNUtils.formatInputNumber(62000); }
      if (p === 'professional') { setMode('salary'); salaryEl.value = NNUtils.formatInputNumber(100000); }
      if (p === 'contractor')   { setMode('hourly'); hourlyEl.value = '50.00'; vacationEl.value = '0'; statEl.value = '0'; }
      calculate();
    });
  });

  /* Flat 2026 max employer CPP match, quoted for illustration only —
     matches the figure already stated in this page's own educational
     copy. Not a per-user tax calculation. Reads data/nn-constants.js
     (NN.CPP.MAX_EMPLOYEE_CONTRIBUTION) so it can't drift from the real
     2026 figure the way this file's own private copy previously did. */
  const CONTRACTOR_CPP_MATCH  = (window.NN && NN.CPP) ? NN.CPP.MAX_EMPLOYEE_CONTRIBUTION : 4230.45;
  const CONTRACTOR_PREMIUM    = 1.275; // ~27.5% suggested rate premium, per this page's own methodology text

  /* ── CALCULATE ── */
  function calculate() {
    const hoursPerWeek   = parseFloat(hoursEl.value) || 40;
    const vacationWeeks  = parseInt(vacationEl.value, 10) || 0;
    const statDays       = parseInt(statEl.value, 10) || 0;

    const standardHoursPerYear = hoursPerWeek * 52;
    const workingWeeks         = Math.max(0, 52 - vacationWeeks);
    const statHours             = statDays * (hoursPerWeek / 5);
    const effectiveHoursPerYear = Math.max(1, workingWeeks * hoursPerWeek - statHours);
    const workingDaysPerYear    = Math.max(0, workingWeeks * 5 - statDays);

    let annual, standardHourly;

    if (currentMode === 'salary') {
      annual = NNUtils.parseInputNumber(salaryEl.value);
      if (!annual || annual <= 0) {
        NNUtils.setError(salaryEl, 'salary-error', 'Please enter a valid annual salary.');
        return;
      }
      NNUtils.clearError(salaryEl, 'salary-error');
      standardHourly = annual / standardHoursPerYear;
    } else {
      standardHourly = parseFloat(hourlyEl.value);
      if (!standardHourly || standardHourly <= 0) {
        NNUtils.setError(hourlyEl, 'hourly-error', 'Please enter a valid hourly wage.');
        return;
      }
      NNUtils.clearError(hourlyEl, 'hourly-error');
      annual = standardHourly * standardHoursPerYear;
    }

    const effectiveHourly = annual / effectiveHoursPerYear;
    const monthly    = annual / 12;
    const semiMo     = annual / 24;
    const biweekly   = annual / 26;
    const weekly     = annual / 52;
    const daily      = annual / 260;
    const contractorRate = effectiveHourly * CONTRACTOR_PREMIUM;

    /* Render */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    const heroLabel = currentMode === 'salary' ? 'Effective Hourly Rate' : 'Annual Salary';
    const heroValue = currentMode === 'salary' ? NNUtils.formatCAD(effectiveHourly) + '/hr' : NNUtils.formatCAD(annual);
    const heroSub   = `${workingWeeks} weeks × ${hoursPerWeek} hrs/wk, less ${statDays} stat day(s) = ${Math.round(effectiveHoursPerYear).toLocaleString()} working hrs/year`;

    document.getElementById('result-hero-label').textContent = heroLabel;
    document.getElementById('result-hero-value').textContent = heroValue;
    document.getElementById('result-hero-sub').textContent   = heroSub;

    document.getElementById('result-annual').textContent       = NNUtils.formatCAD(annual) + '/yr';
    document.getElementById('result-monthly').textContent      = NNUtils.formatCAD(monthly) + '/mo';
    document.getElementById('result-semi-monthly').textContent = NNUtils.formatCAD(semiMo);
    document.getElementById('result-biweekly').textContent     = NNUtils.formatCAD(biweekly);
    document.getElementById('result-weekly').textContent       = NNUtils.formatCAD(weekly) + '/wk';
    document.getElementById('result-daily').textContent        = NNUtils.formatCAD(daily) + '/day';

    document.getElementById('result-hourly-standard').textContent  = NNUtils.formatCAD(standardHourly) + '/hr';
    document.getElementById('result-hourly-effective').textContent = NNUtils.formatCAD(effectiveHourly) + '/hr';
    document.getElementById('result-hours-year').textContent       = Math.round(effectiveHoursPerYear).toLocaleString();
    document.getElementById('result-days-year').textContent        = Math.round(workingDaysPerYear).toLocaleString();

    document.getElementById('result-annual-contractor').textContent = NNUtils.formatCAD(annual) + '/yr';
    document.getElementById('result-cpp-cost').textContent          = NNUtils.formatCAD(CONTRACTOR_CPP_MATCH) + '/yr';
    document.getElementById('result-contractor-rate').textContent   = NNUtils.formatCAD(contractorRate) + '/hr';

    window._salaryResults = {
      annual, standardHourly, effectiveHourly, hoursPerWeek, vacationWeeks, statDays,
      effectiveHoursPerYear, monthly, semiMo, biweekly, weekly, daily
    };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('Salary vs Hourly Calculator', { annual, effectiveHourly }); } catch(e) {}
  }

  /* ── Copy Results ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._salaryResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `💰 Salary vs Hourly — Northern Numbers`,
      `─────────────────────────────`,
      `📅 ${r.hoursPerWeek} hrs/week, ${r.vacationWeeks} vacation wks, ${r.statDays} stat days = ${Math.round(r.effectiveHoursPerYear).toLocaleString()} working hrs/year`,
      `─────────────────────────────`,
      `💰 Annual:            ${NNUtils.formatCAD(r.annual)}/yr`,
      `⏱  Standard hourly:   ${NNUtils.formatCAD(r.standardHourly)}/hr`,
      `⏱  Effective hourly:  ${NNUtils.formatCAD(r.effectiveHourly)}/hr`,
      `📅 Monthly:           ${NNUtils.formatCAD(r.monthly)}/mo`,
      `📅 Biweekly:          ${NNUtils.formatCAD(r.biweekly)}`,
      `📅 Weekly:            ${NNUtils.formatCAD(r.weekly)}/wk`
    ], 'Salary vs Hourly Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    setMode('salary');
    salaryEl.value    = NNUtils.formatInputNumber(80000);
    hourlyEl.value    = '38.46';
    hoursEl.value     = '40'; hoursSlider.value = '40';
    vacationEl.value  = '2';
    statEl.value      = '10';
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    NNUtils.clearError(salaryEl, 'salary-error');
    NNUtils.clearError(hourlyEl, 'hourly-error');
  });

});

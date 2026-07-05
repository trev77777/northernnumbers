/* =============================================
   NORTHERN NUMBERS — resp.js
   Canadian RESP Calculator

   Formula: Annual compound growth with end-of-year contributions
   CESG: 20% on first $2,500/year, max $500/yr, lifetime $7,200
   Provincial: BC $1,200 one-time | QC 10% on first $2,500/yr

   Verified against ESDC CESG tables:
   $2,500/yr from birth, 0% return → $52,200 (contrib + CESG) ✅
   $2,500/yr from birth, 5% return → $86,597 ✅
   CESG caps at $7,200 lifetime ✅

   Sources:
   CESG: https://www.canada.ca/en/employment-social-development/services/student-financial-aid/education-savings/cesg.html
   RESP rules: https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/registered-education-savings-plans-resps.html
============================================= */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── SEO ─────────────────────────────────── */
  NNSeo.init({
    title:       'RESP Calculator Canada',
    description: 'Free Canadian RESP calculator. Calculate education savings growth, CESG government grants, and projected university fund. Plan your child\'s future with Canada\'s most accurate RESP tool.',
    keywords:    'resp calculator canada, resp calculator 2026, cesg calculator, education savings calculator canada, registered education savings plan calculator',
    slug:        'resp'
  });

  NNSeo.injectSchema({
    title:       'RESP Calculator Canada',
    slug:        'resp',
    description: 'Free Canadian RESP calculator with CESG grant tracking and year-by-year education savings projection.'
  });

  NNSeo.injectFAQSchema([
    { question: 'How much should I contribute to an RESP each year?', answer: '$2,500/year maximizes the $500 annual CESG grant. The government matches 20% of any amount up to $2,500, so even smaller contributions earn free grant money.' },
    { question: 'What is the CESG?', answer: 'The Canada Education Savings Grant adds 20% on your first $2,500 contributed each year — up to $500/year and $7,200 lifetime per child.' },
    { question: 'What happens if my child doesn\'t go to post-secondary school?', answer: 'You can transfer to a sibling\'s RESP, transfer up to $50,000 to your RRSP, or close the plan. The RESP can stay open for 36 years.' },
    { question: 'What is the RESP lifetime contribution limit?', answer: 'The lifetime RESP contribution limit is $50,000 per beneficiary across all plans combined. There is no annual contribution limit, but CESG only applies to the first $2,500 per year.' },
    { question: 'Is RESP income taxable?', answer: 'Your original contributions come out tax-free. Government grants and investment growth (Educational Assistance Payments) are taxed in the student\'s hands — typically at a very low rate since most students have little other income.' }
  ]);

  /* ── DOM REFS ────────────────────────────── */
  const childAgeEl     = document.getElementById('child-age');
  const withdrawAgeEl  = document.getElementById('withdraw-age');
  const annualContribEl= document.getElementById('annual-contrib');
  const lumpSumEl      = document.getElementById('lump-sum');
  const annualReturnEl = document.getElementById('annual-return');
  const cesgToggle     = document.getElementById('cesg-toggle');
  const cesgTrack      = document.getElementById('cesg-track');
  const provincialToggle = document.getElementById('provincial-toggle');
  const provincialTrack  = document.getElementById('provincial-track');
  const provinceSelect = document.getElementById('province-select');
  const yearlyIncEl    = document.getElementById('yearly-increase');
  const inflationEl    = document.getElementById('inflation-rate');
  const contribSlider  = document.getElementById('contrib-slider');
  const returnSlider   = document.getElementById('return-slider');
  const form           = document.getElementById('resp-form');
  const placeholder    = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');
  const chartSection   = document.getElementById('chart-section');
  const growthSection  = document.getElementById('growth-section');
  const growthTbody    = document.getElementById('growth-tbody');

  /* ── PROVINCE DROPDOWN ───────────────────── */
  if (provinceSelect) {
    provinceSelect.innerHTML = NNComponents.PROVINCE_OPTIONS;
    provinceSelect.value = 'ON';
  }

  /* ── RELATED CALCULATORS ─────────────────── */
  NNComponents.renderRelated('nn-related', ['tfsa', 'compound-interest', 'rrsp', 'fhsa']);

  /* ── FORMATTERS ──────────────────────────── */
  NNUtils.attachFormatters(annualContribEl, lumpSumEl);

  /* ── SLIDERS ─────────────────────────────── */
  NNUtils.syncSlider(annualContribEl, contribSlider, { isDollar: true, onChange: liveUpdate });
  NNUtils.syncSlider(annualReturnEl, returnSlider, { onChange: liveUpdate });
  annualReturnEl.addEventListener('input', function () {
    const v = parseFloat(this.value);
    if (!isNaN(v)) returnSlider.value = Math.min(v, 15);
    liveUpdate();
  });

  /* ── ADVANCED TOGGLE ─────────────────────── */
  NNUtils.initAdvancedToggle('advanced-toggle', 'advanced-fields');

  /* ── CESG TOGGLE ─────────────────────────── */
  cesgToggle.addEventListener('change', function () {
    cesgTrack.classList.toggle('is-on', this.checked);
    liveUpdate();
  });

  /* ── PROVINCIAL GRANT TOGGLE ─────────────── */
  provincialToggle.addEventListener('change', function () {
    provincialTrack.classList.toggle('is-on', this.checked);
    liveUpdate();
  });

  /* ── PRESETS ─────────────────────────────── */
  const PRESETS = {
    newborn:  { childAge: 0,  withdrawAge: 18, contrib: 2500, lump: 0,    rate: 5,   cesg: true },
    toddler:  { childAge: 3,  withdrawAge: 18, contrib: 2500, lump: 2500, rate: 5,   cesg: true },
    school:   { childAge: 6,  withdrawAge: 18, contrib: 2500, lump: 0,    rate: 5,   cesg: true },
    late:     { childAge: 10, withdrawAge: 18, contrib: 5000, lump: 5000, rate: 6,   cesg: true }
  };

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const p = PRESETS[this.dataset.preset];
      if (!p) return;
      childAgeEl.value     = p.childAge;
      withdrawAgeEl.value  = p.withdrawAge;
      annualContribEl.value= NNUtils.formatInputNumber(p.contrib);
      lumpSumEl.value      = NNUtils.formatInputNumber(p.lump);
      annualReturnEl.value = p.rate;
      cesgToggle.checked   = p.cesg;
      cesgTrack.classList.toggle('is-on', p.cesg);
      if (contribSlider) contribSlider.value = Math.min(p.contrib, 5000);
      if (returnSlider)  returnSlider.value  = p.rate;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
      this.classList.add('is-active');
      calculate();
    });
  });

  /* ── PROVINCIAL GRANT AMOUNTS ────────────── */
  function getProvincialGrant(province, childAge, years) {
    // BC BCTESG: one-time $1,200 for children born on/after Jan 1 2006
    // Must apply between age 6 and 9
    if (province === 'BC') {
      if (childAge <= 9) return 1200; // eligible
    }
    // Quebec QESI: 10% on first $2,500/year
    // Handled separately in year-by-year loop
    return 0;
  }

  /* ── CALCULATE ───────────────────────────── */
  function calculate() {
    const childAge    = parseInt(childAgeEl.value) || 0;
    const withdrawAge = parseInt(withdrawAgeEl.value) || 18;
    const annualContrib = NNUtils.parseInputNumber(annualContribEl.value);
    const lumpSum     = NNUtils.parseInputNumber(lumpSumEl.value);
    const rate        = parseFloat(annualReturnEl.value) || 0;
    const cesgOn      = cesgToggle.checked;
    const provOn      = provincialToggle.checked;
    const province    = provinceSelect.value;
    const yearlyInc   = parseFloat(yearlyIncEl?.value) || 0;
    const inflation   = parseFloat(inflationEl?.value) || 2;

    // Validate
    let valid = true;
    if (childAge < 0 || childAge > 17) {
      NNUtils.setError(childAgeEl, 'child-age-error', 'Enter a child age between 0 and 17.');
      valid = false;
    } else { NNUtils.clearError(childAgeEl, 'child-age-error'); }

    if (annualContrib < 0) {
      NNUtils.setError(annualContribEl, 'annual-contrib-error', 'Enter a valid contribution amount.');
      valid = false;
    } else { NNUtils.clearError(annualContribEl, 'annual-contrib-error'); }

    if (rate < 0 || rate > 20) {
      NNUtils.setError(annualReturnEl, 'annual-return-error', 'Enter a return between 0% and 20%.');
      valid = false;
    } else { NNUtils.clearError(annualReturnEl, 'annual-return-error'); }

    if (!valid) return;

    const years = withdrawAge - childAge;
    if (years <= 0) {
      NNUtils.setError(childAgeEl, 'child-age-error', 'Child\'s age must be less than the withdrawal age.');
      return;
    }

    const r   = rate / 100;
    const inc = yearlyInc / 100;

    // Provincial one-time grant
    const provOneTime = provOn ? getProvincialGrant(province, childAge, years) : 0;
    const isQC        = provOn && province === 'QC';

    let balance      = lumpSum;
    let totalContrib = lumpSum;
    let totalCesg    = 0;
    let totalProv    = provOneTime; // BC added at start
    let cesgRemain   = 7200;
    let cesgYears    = 0;
    let contrib      = annualContrib;

    // Add BC grant at start (grows with the account)
    balance += provOneTime;

    const schedule = [];
    let prevBalance = balance;

    for (let y = 1; y <= years; y++) {
      const age = childAge + y;

      // CESG: 20% on first $2,500, max $500/yr, until age 17
      let cesg = 0;
      if (cesgOn && cesgRemain > 0 && age <= 17) {
        cesg = Math.min(contrib * 0.20, 500, cesgRemain);
        cesgRemain -= cesg;
        if (cesg > 0) cesgYears++;
      }

      // Quebec QESI: 10% on first $2,500/yr
      let provAnnual = 0;
      if (isQC && age <= 17) {
        provAnnual = Math.min(contrib * 0.10, 250);
        totalProv += provAnnual;
      }

      const yearDeposit = contrib + cesg + provAnnual;
      totalContrib += contrib;
      totalCesg    += cesg;

      // Grow: previous balance + this year's deposits, then apply annual return
      balance = (balance + yearDeposit) * (1 + r);

      const yearGrowth = balance - prevBalance - yearDeposit;
      const inflAdj    = balance / Math.pow(1 + inflation / 100, y);

      schedule.push({
        year: y, age, contrib, cesg, provAnnual,
        yearGrowth: Math.max(0, yearGrowth),
        balance, inflAdj, totalContrib, totalCesg
      });

      contrib    = contrib * (1 + inc);
      prevBalance = balance;
    }

    const totalGrowth   = balance - totalContrib - totalCesg - totalProv;
    const inflFinal     = balance / Math.pow(1 + inflation / 100, years);
    const cesgAnnual    = cesgOn ? Math.min(annualContrib * 0.20, 500) : 0;

    renderResults({
      balance, totalContrib, totalCesg, totalProv, totalGrowth,
      inflFinal, years, cesgYears, cesgAnnual, cesgRemain: Math.max(0, cesgRemain),
      schedule, childAge, withdrawAge, rate, annualContrib, cesgOn, lumpSum, province, provOn
    });

    if (window.NNAnalytics) NNAnalytics.trackCalculator('RESP Calculator', { rate, years, cesgOn });
  }

  /* ── RENDER RESULTS ──────────────────────── */
  function renderResults(d) {
    const wasHidden = resultsContent.classList.contains('hidden');
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    // Summary pills
    NNUtils.renderSummaryPills('result-summary-box', [
      `👶 Age ${d.childAge} → ${d.withdrawAge}`,
      `💰 ${NNUtils.formatCAD0(d.annualContrib)}/yr`,
      `📈 ${d.rate}%`,
      d.cesgOn ? '🇨🇦 CESG included' : '⚠️ No CESG'
    ]);

    // Celebration
    let cel = '';
    if (d.balance >= 100000) cel = `🎉 <strong>Incredible!</strong> Your child could have over <strong>${NNUtils.formatCAD0(d.balance)}</strong> for education — enough to cover most Canadian university programs.`;
    else if (d.balance >= 60000) cel = `🎉 Your child could have over <strong>${NNUtils.formatCAD0(d.balance)}</strong> for education — a fantastic head start!`;
    else if (d.balance >= 30000) cel = `✅ A solid education fund of <strong>${NNUtils.formatCAD0(d.balance)}</strong>. Every contribution counts — keep going!`;
    NNUtils.renderCelebration('result-celebration', cel);

    // Big number
    document.getElementById('result-final').textContent    = NNUtils.formatCAD(d.balance);
    document.getElementById('result-final-sub').textContent =
      `Projected over ${d.years} year${d.years !== 1 ? 's' : ''} · ${d.withdrawAge - d.childAge} years of compounding`;

    // Summary rows
    document.getElementById('result-contrib').textContent   = NNUtils.formatCAD(d.totalContrib);
    document.getElementById('result-cesg').textContent      = d.cesgOn ? NNUtils.formatCAD(d.totalCesg) : '$0.00 (CESG off)';
    document.getElementById('result-provincial').textContent = d.provOn && d.totalProv > 0 ? NNUtils.formatCAD(d.totalProv) : '—';
    document.getElementById('result-growth').textContent    = NNUtils.formatCAD(Math.max(0, d.totalGrowth));
    document.getElementById('result-inflation').textContent = NNUtils.formatCAD(d.inflFinal);
    document.getElementById('result-years').textContent     = `${d.years} year${d.years !== 1 ? 's' : ''}`;

    // CESG card
    document.getElementById('cesg-annual').textContent    = NNUtils.formatCAD(d.cesgAnnual) + '/yr';
    document.getElementById('cesg-years').textContent     = `${d.cesgYears} year${d.cesgYears !== 1 ? 's' : ''}`;
    document.getElementById('cesg-remaining').textContent = NNUtils.formatCAD(d.cesgRemain) + ' unused';
    document.getElementById('cesg-total').textContent     = NNUtils.formatCAD(d.totalCesg);

    // Breakdown bar
    const total = d.balance;
    const pContrib = total > 0 ? d.totalContrib / total * 100 : 33;
    const pCesg    = total > 0 ? (d.totalCesg + d.totalProv) / total * 100 : 10;
    const pGrowth  = Math.max(0, 100 - pContrib - pCesg);
    document.getElementById('bar-contrib').style.width  = `${Math.max(2, pContrib)}%`;
    document.getElementById('bar-cesg').style.width     = `${Math.max(2, pCesg)}%`;
    document.getElementById('bar-growth').style.width   = `${Math.max(2, pGrowth)}%`;
    document.getElementById('pct-contrib').textContent  = `${pContrib.toFixed(1)}%`;
    document.getElementById('pct-cesg').textContent     = `${pCesg.toFixed(1)}%`;
    document.getElementById('pct-growth').textContent   = `${pGrowth.toFixed(1)}%`;

    // Insight
    let insight;
    if (!d.cesgOn) {
      insight = `You have CESG turned off. Enabling it would add up to ${NNUtils.formatCAD(Math.min(d.years * 500, 7200))} in free government grants to your child's education fund.`;
    } else if (d.annualContrib < 2500) {
      const gap = 2500 - d.annualContrib;
      insight = `You're contributing ${NNUtils.formatCAD(d.annualContrib)}/year. Contributing just ${NNUtils.formatCAD(gap)} more per year would maximize your annual CESG grant at $500/year.`;
    } else if (d.cesgRemain > 0 && d.years < 18 - d.childAge) {
      insight = `There is ${NNUtils.formatCAD(d.cesgRemain)} in CESG room unused because your child reaches the grant age limit before the lifetime max is hit.`;
    } else if (d.totalGrowth > d.totalContrib) {
      insight = 'Your investment growth now exceeds your total contributions — compound interest is doing more work than your deposits. This is the power of starting early.';
    } else {
      insight = `Government grants (${NNUtils.formatCAD(d.totalCesg + d.totalProv)}) represent ${((d.totalCesg + d.totalProv) / d.balance * 100).toFixed(1)}% of your total fund — free money that grows tax-sheltered for your child's entire education savings period.`;
    }
    document.getElementById('insight-text').textContent = insight;

    // Year-by-year table
    growthTbody.innerHTML = '';
    let runningGrowth = 0;
    d.schedule.forEach(row => {
      runningGrowth += row.yearGrowth;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${new Date().getFullYear() + row.year}</td>
        <td>${row.age}</td>
        <td>${NNUtils.formatCAD(row.contrib)}</td>
        <td class="td-cesg">${row.cesg > 0 ? NNUtils.formatCAD(row.cesg) : '—'}</td>
        <td class="td-growth">${NNUtils.formatCAD(row.yearGrowth)}</td>
        <td>${NNUtils.formatCAD(row.balance)}</td>`;
      growthTbody.appendChild(tr);
    });

    growthSection.removeAttribute('hidden');
    chartSection.removeAttribute('hidden');

    // Store for copy + chart
    window._respResults  = d;
    window._respSchedule = d.schedule;

    // Draw chart if open
    const chartWrapper = document.getElementById('chart-wrapper');
    if (chartWrapper && chartWrapper.classList.contains('is-open')) {
      drawChart(d.schedule);
    }

    NNUtils.scrollToResults('results-heading', wasHidden);
  }

  /* ── CHART ───────────────────────────────── */
  function drawChart(schedule) {
    const canvas = document.getElementById('resp-chart');
    if (!canvas) return;
    const ctx  = canvas.getContext('2d');
    const dpr  = window.devicePixelRatio || 1;
    const W    = canvas.offsetWidth || 600;
    const H    = 280;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const maxVal = Math.max(...schedule.map(d => d.balance)) * 1.05;
    const padL = 65, padR = 16, padT = 20, padB = 40;
    const cW = W - padL - padR;
    const cH = H - padT - padB;

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padT + (cH / 4) * i;
      ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      const val = maxVal * (1 - i / 4);
      ctx.fillStyle = '#9CA3AF'; ctx.font = '10px Inter,sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(val >= 1000000 ? `$${(val/1000000).toFixed(1)}M` : val >= 1000 ? `$${Math.round(val/1000)}k` : `$${Math.round(val)}`, padL - 6, y);
    }

    const xOf = i => padL + (i / (schedule.length - 1 || 1)) * cW;
    const yOf = v => padT + cH - (v / maxVal) * cH;

    // Contributions + grants area
    ctx.beginPath();
    schedule.forEach((d, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(d.totalContrib + d.totalCesg)) : ctx.lineTo(xOf(i), yOf(d.totalContrib + d.totalCesg)); });
    ctx.lineTo(xOf(schedule.length - 1), padT + cH);
    ctx.lineTo(xOf(0), padT + cH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(213,43,30,0.08)'; ctx.fill();

    // Contributions line
    ctx.beginPath(); ctx.strokeStyle = '#D52B1E'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    schedule.forEach((d, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(d.totalContrib + d.totalCesg)) : ctx.lineTo(xOf(i), yOf(d.totalContrib + d.totalCesg)); });
    ctx.stroke(); ctx.setLineDash([]);

    // Balance area
    ctx.beginPath();
    schedule.forEach((d, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(d.balance)) : ctx.lineTo(xOf(i), yOf(d.balance)); });
    ctx.lineTo(xOf(schedule.length - 1), padT + cH);
    ctx.lineTo(xOf(0), padT + cH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(213,43,30,0.15)'; ctx.fill();

    // Balance line
    ctx.beginPath(); ctx.strokeStyle = '#D52B1E'; ctx.lineWidth = 2.5;
    schedule.forEach((d, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(d.balance)) : ctx.lineTo(xOf(i), yOf(d.balance)); });
    ctx.stroke();

    // X-axis labels
    ctx.fillStyle = '#9CA3AF'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const step = Math.ceil(schedule.length / 8);
    schedule.forEach((d, i) => {
      if (i % step === 0 || i === schedule.length - 1) ctx.fillText(`Age ${d.age}`, xOf(i), padT + cH + 6);
    });
  }

  /* ── CHART TOGGLE ────────────────────────── */
  document.getElementById('chart-toggle')?.addEventListener('click', function () {
    const wrapper = document.getElementById('chart-wrapper');
    const isOpen  = wrapper.classList.toggle('is-open');
    this.setAttribute('aria-expanded', String(isOpen));
    if (isOpen && window._respSchedule) drawChart(window._respSchedule);
  });

  /* ── TABLE TOGGLE ────────────────────────── */
  NNUtils.initTableToggle('growth-toggle', 'growth-table-wrapper');

  /* ── LIVE UPDATE ─────────────────────────── */
  function liveUpdate() {
    if (!resultsContent.classList.contains('hidden')) calculate();
  }
  withdrawAgeEl?.addEventListener('change', liveUpdate);
  childAgeEl?.addEventListener('input', liveUpdate);
  provinceSelect?.addEventListener('change', liveUpdate);

  /* ── FORM SUBMIT ─────────────────────────── */
  form.addEventListener('submit', e => { e.preventDefault(); calculate(); });
  form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); calculate(); } });
  });

  /* ── COPY RESULTS ────────────────────────── */
  document.getElementById('copy-results-btn')?.addEventListener('click', function () {
    const d = window._respResults;
    if (!d) return;
    NNUtils.copyResults(this, [
      `👶 Child's age:         ${d.childAge} → ${d.withdrawAge}`,
      `💰 Annual contribution: ${NNUtils.formatCAD(d.annualContrib)}`,
      `📈 Annual return:       ${d.rate}%`,
      `🎓 Projected fund:      ${NNUtils.formatCAD(d.balance)}`,
      `💳 Your contributions:  ${NNUtils.formatCAD(d.totalContrib)}`,
      `🇨🇦 CESG grants:         ${NNUtils.formatCAD(d.totalCesg)}`,
      `📊 Investment growth:   ${NNUtils.formatCAD(Math.max(0, d.totalGrowth))}`
    ], 'RESP Calculator');
  });

  /* ── RESET ───────────────────────────────── */
  document.getElementById('reset-btn')?.addEventListener('click', function () {
    childAgeEl.value      = '0';
    withdrawAgeEl.value   = '18';
    annualContribEl.value = NNUtils.formatInputNumber(2500);
    lumpSumEl.value       = NNUtils.formatInputNumber(0);
    annualReturnEl.value  = '5';
    cesgToggle.checked    = true;
    cesgTrack.classList.add('is-on');
    provincialToggle.checked = false;
    provincialTrack.classList.remove('is-on');
    if (yearlyIncEl)  yearlyIncEl.value  = '0';
    if (inflationEl)  inflationEl.value  = '2';
    if (contribSlider) contribSlider.value = 2500;
    if (returnSlider)  returnSlider.value  = 5;

    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    growthSection.setAttribute('hidden', '');
    chartSection.setAttribute('hidden', '');

    const af = document.getElementById('advanced-fields');
    const at = document.getElementById('advanced-toggle');
    if (af) af.classList.remove('is-open');
    if (at) at.setAttribute('aria-expanded', 'false');
  });

  /* ── INIT ────────────────────────────────── */
  annualContribEl.value = NNUtils.formatInputNumber(2500);
  lumpSumEl.value       = NNUtils.formatInputNumber(0);

});

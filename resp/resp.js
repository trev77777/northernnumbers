/* =============================================
   NORTHERN NUMBERS — resp.js
   Canadian RESP Calculator v2

   FORMULA: End-of-year compounding with annual contributions
   balance = (prev_balance + deposits_this_year) × (1 + r)

   CRA RULES IMPLEMENTED:
   ─ CESG: 20% on first $2,500/year = max $500/yr
   ─ CESG lifetime max: $7,200 per beneficiary
   ─ CESG eligibility: age at START of contribution year ≤ 17
   ─ Lump sum counts toward year-1 CESG base (up to $2,500 total)
   ─ RESP lifetime contribution limit: $50,000 per beneficiary
   ─ BC BCTESG: one-time $1,200 (child must apply between age 6-9)
   ─ QC QESI: 10% on first $2,500/yr = max $250/yr, age at start ≤ 17

   BUGS FIXED FROM v1:
   ─ CESG age check now uses age-at-START-of-year (was end-of-year)
     → Child starting at age 17 now correctly receives $500 CESG
   ─ Lump sum now included in year-1 CESG base (was excluded)
     → $2,500 lump sum with $0 annual now correctly earns $500 CESG
   ─ QC QESI now correctly includes all eligible years

   VERIFIED AGAINST CRA:
   $2,500/yr birth→18, 0% return   → $52,200 ✅
   $2,500/yr birth→18, 5% return   → $86,597 ✅
   CESG lifetime max $7,200         → Confirmed ✅
   CESG at age 17 (start)           → $500 ✅
   Lump sum CESG year 1             → Correct ✅

   Sources:
   CESG: https://www.canada.ca/en/employment-social-development/services/student-financial-aid/education-savings/cesg.html
   RESP: https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/registered-education-savings-plans-resps.html
   BCTESG: https://www2.gov.bc.ca/gov/content/education-training/k-12/support/bc-training-and-education-savings-grant
   QESI: https://www.revenuquebec.ca/en/citizens/tax-credits/tax-credit-for-the-qesi
============================================= */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── SEO ─────────────────────────────────── */
  NNSeo.init({
    title:       'RESP Calculator Canada',
    description: 'Free Canadian RESP calculator. Calculate education savings growth, CESG government grants, and projected university fund. Includes BC BCTESG and Quebec QESI provincial grants.',
    keywords:    'resp calculator canada, resp calculator 2026, cesg calculator, education savings calculator canada, registered education savings plan calculator, cesg grant calculator',
    slug:        'resp'
  });

  NNSeo.injectSchema({
    title:       'RESP Calculator Canada',
    slug:        'resp',
    description: 'Free Canadian RESP calculator with CESG grant tracking, provincial grants, and year-by-year education savings projection.'
  });

  NNSeo.injectFAQSchema([
    { question: 'How much should I contribute to an RESP each year?',
      answer:   '$2,500 per year maximizes the $500 annual CESG grant. The government matches 20% of the first $2,500 contributed. You can contribute more, but CESG only applies to the first $2,500.' },
    { question: 'What is the CESG and how much is it?',
      answer:   'The Canada Education Savings Grant (CESG) adds 20% on the first $2,500 you contribute each year — up to $500 per year and $7,200 lifetime per child. It is available until December 31 of the year your child turns 17.' },
    { question: 'What happens if my child does not go to post-secondary school?',
      answer:   'You can transfer the RESP to a sibling\'s plan, transfer up to $50,000 in earnings to your RRSP (if you have room), or close the plan. Government grants must be returned if the plan is closed. The RESP can stay open for 36 years.' },
    { question: 'What is the RESP lifetime contribution limit?',
      answer:   'The lifetime RESP contribution limit is $50,000 per beneficiary across all plans combined. There is no annual contribution limit, but CESG only applies to the first $2,500 contributed per year.' },
    { question: 'Is RESP income taxable in Canada?',
      answer:   'Your original contributions come out tax-free. Government grants and investment growth (called Educational Assistance Payments) are taxed as income in the student\'s hands — typically at a very low or zero rate since most students have little other income.' },
    { question: 'What provincial RESP grants are available in Canada?',
      answer:   'British Columbia offers the BCTESG — a one-time $1,200 grant. Quebec offers the QESI — 10% on the first $2,500 per year. Always check your province\'s current program, as grants may change.' }
  ]);

  /* ── DOM REFS ────────────────────────────── */
  const childAgeEl      = document.getElementById('child-age');
  const withdrawAgeEl   = document.getElementById('withdraw-age');
  const annualContribEl = document.getElementById('annual-contrib');
  const lumpSumEl       = document.getElementById('lump-sum');
  const annualReturnEl  = document.getElementById('annual-return');
  const cesgToggle      = document.getElementById('cesg-toggle');
  const cesgTrack       = document.getElementById('cesg-track');
  const provincialToggle= document.getElementById('provincial-toggle');
  const provincialTrack = document.getElementById('provincial-track');
  const provinceSelect  = document.getElementById('province-select');
  const yearlyIncEl     = document.getElementById('yearly-increase');
  const inflationEl     = document.getElementById('inflation-rate');
  const contribSlider   = document.getElementById('contrib-slider');
  const returnSlider    = document.getElementById('return-slider');
  const form            = document.getElementById('resp-form');
  const placeholder     = document.getElementById('results-placeholder');
  const resultsContent  = document.getElementById('results-content');
  const chartSection    = document.getElementById('chart-section');
  const growthSection   = document.getElementById('growth-section');
  const growthTbody     = document.getElementById('growth-tbody');

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
  NNUtils.syncSlider(annualReturnEl,  returnSlider,  { onChange: liveUpdate });
  annualReturnEl.addEventListener('input', function () {
    const v = parseFloat(this.value);
    if (!isNaN(v) && returnSlider) returnSlider.value = Math.min(Math.max(v, 0), 15);
    liveUpdate();
  });

  /* ── ADVANCED TOGGLE ─────────────────────── */
  NNUtils.initAdvancedToggle('advanced-toggle', 'advanced-fields');

  /* ── TOGGLE SWITCHES ─────────────────────── */
  cesgToggle.addEventListener('change', function () {
    cesgTrack.classList.toggle('is-on', this.checked);
    liveUpdate();
  });
  provincialToggle.addEventListener('change', function () {
    provincialTrack.classList.toggle('is-on', this.checked);
    liveUpdate();
  });

  /* ── CLICK ON TOGGLE TRACK (usability) ───── */
  [cesgTrack, provincialTrack].forEach(track => {
    track.addEventListener('click', function () {
      const input = this.id === 'cesg-track' ? cesgToggle : provincialToggle;
      input.checked = !input.checked;
      input.dispatchEvent(new Event('change'));
    });
  });

  /* ── PRESETS ─────────────────────────────── */
  const PRESETS = {
    newborn: { childAge:0,  withdrawAge:18, contrib:2500, lump:0,    rate:5 },
    toddler: { childAge:3,  withdrawAge:18, contrib:2500, lump:2500, rate:5 },
    school:  { childAge:6,  withdrawAge:18, contrib:2500, lump:0,    rate:5 },
    late:    { childAge:10, withdrawAge:18, contrib:5000, lump:5000, rate:6 }
  };

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const p = PRESETS[this.dataset.preset];
      if (!p) return;
      childAgeEl.value      = p.childAge;
      withdrawAgeEl.value   = p.withdrawAge;
      annualContribEl.value = NNUtils.formatInputNumber(p.contrib);
      lumpSumEl.value       = NNUtils.formatInputNumber(p.lump);
      annualReturnEl.value  = p.rate;
      if (contribSlider) contribSlider.value = Math.min(p.contrib, 5000);
      if (returnSlider)  returnSlider.value  = p.rate;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
      this.classList.add('is-active');
      calculate();
    });
  });

  /* ── CORE CALCULATION ENGINE ─────────────── */
  function projectRESP(annualContrib, lumpSum, childAge, withdrawAge,
                        rate, cesgOn, yearlyInc, inflation, prov, provOn) {

    const years = withdrawAge - childAge;
    const r     = rate / 100;
    const inc   = yearlyInc / 100;

    // Provincial one-time grants
    // BC BCTESG: $1,200 one-time for children who apply between age 6-9
    const provOneTime = (provOn && prov === 'BC' && childAge <= 9) ? 1200 : 0;
    const isQC        = provOn && prov === 'QC';

    let balance     = lumpSum + provOneTime;
    let totalContrib = lumpSum;
    let totalCesg   = 0;
    let totalProv   = provOneTime;
    let cesgRemain  = 7200;  // lifetime CESG maximum
    let cesgYears   = 0;
    let contrib     = annualContrib;
    const schedule  = [];

    for (let y = 1; y <= years; y++) {
      const ageAtStart = childAge + y - 1; // Age at START of this contribution year

      // ── CESG (Federal) ─────────────────────
      // Available if child is 17 or younger AT START of contribution year
      // 20% on first $2,500 contributed, max $500/yr, lifetime $7,200
      let cesg = 0;
      if (cesgOn && cesgRemain > 0 && ageAtStart <= 17) {
        // In year 1: include lump sum in the CESG-eligible base (both made same year)
        const cesgBase = y === 1 ? Math.min(contrib + lumpSum, 2500) : Math.min(contrib, 2500);
        cesg = Math.min(cesgBase * 0.20, 500, cesgRemain);
        cesgRemain -= cesg;
        if (cesg > 0) cesgYears++;
      }

      // ── QC QESI (Provincial) ───────────────
      // 10% on first $2,500/yr = max $250/yr, available age at start <= 17
      let provAnnual = 0;
      if (isQC && ageAtStart <= 17) {
        provAnnual = Math.min(Math.min(contrib, 2500) * 0.10, 250);
        totalProv += provAnnual;
      }

      // ── Lifetime contribution limit warning ─
      const projectedTotal = totalContrib + contrib;
      const effectiveContrib = projectedTotal > 50000 ? Math.max(0, 50000 - totalContrib) : contrib;

      totalContrib += effectiveContrib;
      totalCesg   += cesg;

      const yearDeposit = effectiveContrib + cesg + provAnnual;
      const prevBalance = balance;
      balance = (balance + yearDeposit) * (1 + r);

      const yearGrowth = Math.max(0, balance - prevBalance - yearDeposit);
      const inflAdj    = balance / Math.pow(1 + inflation / 100, y);

      schedule.push({
        year: y, age: childAge + y, ageAtStart,
        contrib: effectiveContrib, cesg, provAnnual, yearGrowth,
        balance, inflAdj, totalContrib, totalCesg
      });

      contrib = contrib * (1 + inc);
    }

    const totalGrowth = balance - totalContrib - totalCesg - totalProv;
    const inflFinal   = schedule.length ? schedule[schedule.length - 1].inflAdj : balance;

    return {
      final: balance,
      totalContrib, totalCesg, totalProv,
      totalGrowth: Math.max(0, totalGrowth),
      inflFinal, cesgYears,
      cesgRemain: Math.max(0, cesgRemain),
      cesgAnnualMax: cesgOn ? Math.min(Math.min(annualContrib, 2500) * 0.20, 500) : 0,
      schedule,
      hitLifetimeLimit: totalContrib >= 50000
    };
  }

  /* ── VALIDATE ────────────────────────────── */
  function validate() {
    const childAge    = parseInt(childAgeEl.value);
    const withdrawAge = parseInt(withdrawAgeEl.value);
    const contrib     = NNUtils.parseInputNumber(annualContribEl.value);
    const lump        = NNUtils.parseInputNumber(lumpSumEl.value);
    const rate        = parseFloat(annualReturnEl.value);
    let valid = true;

    if (isNaN(childAge) || childAge < 0 || childAge > 17) {
      NNUtils.setError(childAgeEl, 'child-age-error', 'Enter a child age between 0 and 17.');
      valid = false;
    } else if (childAge >= withdrawAge) {
      NNUtils.setError(childAgeEl, 'child-age-error', 'Child\'s age must be less than the education start age.');
      valid = false;
    } else {
      NNUtils.clearError(childAgeEl, 'child-age-error');
    }

    if (contrib < 0 || contrib > 50000) {
      NNUtils.setError(annualContribEl, 'annual-contrib-error', 'Enter an amount between $0 and $50,000.');
      valid = false;
    } else {
      NNUtils.clearError(annualContribEl, 'annual-contrib-error');
    }

    if (lump < 0 || lump > 50000) {
      NNUtils.setError(lumpSumEl, 'lump-sum-error', 'Enter an amount between $0 and $50,000.');
      valid = false;
    } else {
      NNUtils.clearError(lumpSumEl, 'lump-sum-error');
    }

    if (isNaN(rate) || rate < 0 || rate > 20) {
      NNUtils.setError(annualReturnEl, 'annual-return-error', 'Enter a return between 0% and 20%.');
      valid = false;
    } else {
      NNUtils.clearError(annualReturnEl, 'annual-return-error');
    }

    if (!valid) return null;

    return {
      childAge, withdrawAge, contrib, lump, rate,
      cesgOn:   cesgToggle.checked,
      provOn:   provincialToggle.checked,
      province: provinceSelect.value,
      yearlyInc:parseFloat(yearlyIncEl?.value)  || 0,
      inflation: parseFloat(inflationEl?.value) || 2
    };
  }

  /* ── CALCULATE ───────────────────────────── */
  function calculate() {
    const v = validate();
    if (!v) return;

    const data = projectRESP(
      v.contrib, v.lump, v.childAge, v.withdrawAge,
      v.rate, v.cesgOn, v.yearlyInc, v.inflation, v.province, v.provOn
    );

    renderResults(data, v);

    if (window.NNAnalytics) {
      NNAnalytics.trackCalculator('RESP Calculator', {
        rate: v.rate, years: v.withdrawAge - v.childAge, cesg: v.cesgOn
      });
    }
  }

  /* ── RENDER ──────────────────────────────── */
  function renderResults(d, v) {
    const wasHidden = resultsContent.classList.contains('hidden');
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    const years = v.withdrawAge - v.childAge;

    // Summary pills
    const pills = [
      `👶 Age ${v.childAge} → ${v.withdrawAge}`,
      `💰 ${NNUtils.formatCAD0(v.contrib)}/yr`,
      `📈 ${v.rate}%`,
      v.cesgOn ? '🇨🇦 CESG on' : '⚠️ No CESG'
    ];
    if (v.lump > 0) pills.splice(1, 0, `💵 ${NNUtils.formatCAD0(v.lump)} lump sum`);
    NNUtils.renderSummaryPills('result-summary-box', pills);

    // Celebration
    let cel = '';
    if (d.final >= 150000)     cel = `🎉 <strong>Outstanding!</strong> Your child could have <strong>${NNUtils.formatCAD0(d.final)}</strong> — enough to fund a full university degree and more.`;
    else if (d.final >= 100000) cel = `🎉 <strong>Excellent!</strong> Over <strong>${NNUtils.formatCAD0(d.final)}</strong> projected for your child's education — a major head start.`;
    else if (d.final >= 60000)  cel = `🎉 A solid education fund of <strong>${NNUtils.formatCAD0(d.final)}</strong>. Keep contributing to maximize your CESG grants.`;
    else if (d.final >= 25000)  cel = `✅ A good start! <strong>${NNUtils.formatCAD0(d.final)}</strong> projected. Starting earlier or increasing contributions will grow this significantly.`;
    NNUtils.renderCelebration('result-celebration', cel);

    // Primary result
    document.getElementById('result-final').textContent     = NNUtils.formatCAD(d.final);
    document.getElementById('result-final-sub').textContent =
      `Over ${years} year${years !== 1 ? 's' : ''} · Payoff in ${v.withdrawAge}`;

    // Summary rows
    document.getElementById('result-contrib').textContent    = NNUtils.formatCAD(d.totalContrib);
    document.getElementById('result-cesg').textContent       = v.cesgOn
      ? `${NNUtils.formatCAD(d.totalCesg)} (free government grant)`
      : '$0.00 — CESG disabled';
    document.getElementById('result-provincial').textContent = d.totalProv > 0
      ? NNUtils.formatCAD(d.totalProv)
      : v.provOn ? 'Not available in your province' : '—';
    document.getElementById('result-growth').textContent     = NNUtils.formatCAD(d.totalGrowth);
    document.getElementById('result-inflation').textContent  = NNUtils.formatCAD(d.inflFinal);
    document.getElementById('result-years').textContent      = `${years} year${years !== 1 ? 's' : ''}`;

    // CESG grant card
    document.getElementById('cesg-annual').textContent    = NNUtils.formatCAD(d.cesgAnnualMax) + '/yr';
    document.getElementById('cesg-years').textContent     =
      `${d.cesgYears} year${d.cesgYears !== 1 ? 's' : ''} (${NNUtils.formatCAD(d.totalCesg)} total)`;
    document.getElementById('cesg-remaining').textContent =
      d.cesgRemain > 0 ? `${NNUtils.formatCAD(d.cesgRemain)} unclaimed` : 'Lifetime maximum reached ✓';
    document.getElementById('cesg-total').textContent     = NNUtils.formatCAD(d.totalCesg);

    // Breakdown bar
    const total = d.final || 1;
    const pContrib = d.totalContrib / total * 100;
    const pCesg    = (d.totalCesg + d.totalProv) / total * 100;
    const pGrowth  = Math.max(0, 100 - pContrib - pCesg);
    document.getElementById('bar-contrib').style.width = `${Math.max(2, pContrib)}%`;
    document.getElementById('bar-cesg').style.width    = `${Math.max(2, pCesg)}%`;
    document.getElementById('bar-growth').style.width  = `${Math.max(2, pGrowth)}%`;
    document.getElementById('pct-contrib').textContent = `${pContrib.toFixed(1)}%`;
    document.getElementById('pct-cesg').textContent    = `${pCesg.toFixed(1)}%`;
    document.getElementById('pct-growth').textContent  = `${pGrowth.toFixed(1)}%`;

    // Insight card — contextual, actionable advice
    let insight = '';
    if (!v.cesgOn) {
      const potentialCesg = Math.min(years * 500, 7200);
      insight = `⚠️ CESG is turned off. Enabling it would add up to ${NNUtils.formatCAD(potentialCesg)} in free government grants to this RESP — that's money your child would otherwise miss entirely.`;
    } else if (v.contrib < 2500 && v.contrib > 0) {
      const gap     = 2500 - v.contrib;
      const extraCesg = gap * 0.20;
      insight = `You're contributing ${NNUtils.formatCAD(v.contrib)}/year. Adding just ${NNUtils.formatCAD(gap)} more per year would maximize your ${NNUtils.formatCAD(d.cesgAnnualMax)} CESG grant — the government would give you ${NNUtils.formatCAD(extraCesg)} more per year for free.`;
    } else if (v.contrib === 0 && v.lump === 0) {
      insight = 'Enter a contribution amount to see your RESP projection.';
    } else if (d.hitLifetimeLimit) {
      insight = `⚠️ Your contributions reach the $50,000 RESP lifetime limit before your child turns ${v.withdrawAge}. Consider spreading contributions over more years or reducing the annual amount.`;
    } else if (d.cesgRemain > 0 && v.childAge > 9) {
      insight = `Starting at age ${v.childAge} means you'll receive ${NNUtils.formatCAD(d.totalCesg)} of the $7,200 lifetime CESG — ${NNUtils.formatCAD(d.cesgRemain)} goes unclaimed. Every year earlier you open an RESP is more free government money for your child.`;
    } else if (d.totalGrowth > d.totalContrib + d.totalCesg + d.totalProv) {
      insight = `Investment growth (${NNUtils.formatCAD(d.totalGrowth)}) now exceeds all contributions and grants combined. Compound interest is the largest driver of your fund — this is the power of starting early.`;
    } else if (v.cesgOn && d.totalCesg >= 7200) {
      insight = `You've maximized the lifetime CESG of $7,200 — excellent! All future growth is from your contributions and investment returns. A ${v.rate}% return on this fund is projecting ${NNUtils.formatCAD(d.totalGrowth)} in investment growth.`;
    } else {
      const grantPct = ((d.totalCesg + d.totalProv) / d.final * 100).toFixed(1);
      insight = `Government grants represent ${grantPct}% of your total fund (${NNUtils.formatCAD(d.totalCesg + d.totalProv)}) — free money growing tax-sheltered for your child's entire savings period.`;
    }
    document.getElementById('insight-text').textContent = insight;

    // Year-by-year table
    growthTbody.innerHTML = '';
    d.schedule.forEach(row => {
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

    window._respResults  = { data: d, inputs: v };
    window._respSchedule = d.schedule;

    const chartWrapper = document.getElementById('chart-wrapper');
    if (chartWrapper?.classList.contains('is-open')) drawChart(d.schedule);

    NNUtils.scrollToResults('results-heading', wasHidden);
  }

  /* ── CHART ───────────────────────────────── */
  function drawChart(schedule) {
    const canvas = document.getElementById('resp-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.offsetWidth || 600;
    const H   = 280;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const maxVal = Math.max(...schedule.map(d => d.balance)) * 1.05;
    const padL = 65, padR = 16, padT = 20, padB = 40;
    const cW   = W - padL - padR;
    const cH   = H - padT - padB;

    ctx.clearRect(0, 0, W, H);

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = padT + (cH / 4) * i;
      ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      const val = maxVal * (1 - i / 4);
      ctx.fillStyle = '#9CA3AF'; ctx.font = '10px Inter,sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(val >= 1000 ? `$${Math.round(val/1000)}k` : `$${Math.round(val)}`, padL - 6, y);
    }

    const xOf = i => padL + (i / Math.max(schedule.length - 1, 1)) * cW;
    const yOf = v => padT + cH - (Math.min(v, maxVal) / maxVal) * cH;

    // Contributions + grants filled area
    ctx.beginPath();
    schedule.forEach((d, i) => {
      const contribLine = d.totalContrib + d.totalCesg;
      i === 0 ? ctx.moveTo(xOf(i), yOf(contribLine)) : ctx.lineTo(xOf(i), yOf(contribLine));
    });
    ctx.lineTo(xOf(schedule.length - 1), padT + cH);
    ctx.lineTo(xOf(0), padT + cH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(213,43,30,0.07)'; ctx.fill();

    // Contributions dashed line
    ctx.beginPath(); ctx.strokeStyle = '#D52B1E'; ctx.lineWidth = 1.5; ctx.setLineDash([5,4]);
    schedule.forEach((d, i) => {
      i === 0 ? ctx.moveTo(xOf(i), yOf(d.totalContrib + d.totalCesg))
              : ctx.lineTo(xOf(i), yOf(d.totalContrib + d.totalCesg));
    });
    ctx.stroke(); ctx.setLineDash([]);

    // Balance filled area
    ctx.beginPath();
    schedule.forEach((d, i) => {
      i === 0 ? ctx.moveTo(xOf(i), yOf(d.balance)) : ctx.lineTo(xOf(i), yOf(d.balance));
    });
    ctx.lineTo(xOf(schedule.length - 1), padT + cH);
    ctx.lineTo(xOf(0), padT + cH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(213,43,30,0.14)'; ctx.fill();

    // Balance solid line
    ctx.beginPath(); ctx.strokeStyle = '#D52B1E'; ctx.lineWidth = 2.5;
    schedule.forEach((d, i) => {
      i === 0 ? ctx.moveTo(xOf(i), yOf(d.balance)) : ctx.lineTo(xOf(i), yOf(d.balance));
    });
    ctx.stroke();

    // X-axis labels
    ctx.fillStyle = '#9CA3AF'; ctx.font = '10px Inter,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const step = Math.max(1, Math.ceil(schedule.length / 8));
    schedule.forEach((d, i) => {
      if (i % step === 0 || i === schedule.length - 1) {
        ctx.fillText(`Age ${d.age}`, xOf(i), padT + cH + 6);
      }
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
  yearlyIncEl?.addEventListener('input', liveUpdate);
  inflationEl?.addEventListener('input', liveUpdate);

  /* ── FORM SUBMIT ─────────────────────────── */
  form.addEventListener('submit', e => { e.preventDefault(); calculate(); });
  form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); calculate(); }});
  });

  /* ── COPY RESULTS ────────────────────────── */
  document.getElementById('copy-results-btn')?.addEventListener('click', function () {
    const r = window._respResults;
    if (!r) return;
    const { data: d, inputs: v } = r;
    NNUtils.copyResults(this, [
      `👶 Child's age:          ${v.childAge} to ${v.withdrawAge}`,
      `💰 Annual contribution:  ${NNUtils.formatCAD(v.contrib)}`,
      v.lump > 0 ? `💵 Lump sum:             ${NNUtils.formatCAD(v.lump)}` : null,
      `📈 Annual return:        ${v.rate}%`,
      `─────────────────────────`,
      `🎓 Projected fund:       ${NNUtils.formatCAD(d.final)}`,
      `💳 Your contributions:   ${NNUtils.formatCAD(d.totalContrib)}`,
      `🇨🇦 CESG grants:          ${NNUtils.formatCAD(d.totalCesg)}`,
      d.totalProv > 0 ? `🏛 Provincial grants:    ${NNUtils.formatCAD(d.totalProv)}` : null,
      `📊 Investment growth:    ${NNUtils.formatCAD(d.totalGrowth)}`,
      `📉 Inflation-adjusted:   ${NNUtils.formatCAD(d.inflFinal)}`
    ].filter(Boolean), 'RESP Calculator');
  });

  /* ── RESET ───────────────────────────────── */
  document.getElementById('reset-btn')?.addEventListener('click', function () {
    childAgeEl.value      = '0';
    withdrawAgeEl.value   = '18';
    annualContribEl.value = NNUtils.formatInputNumber(2500);
    lumpSumEl.value       = NNUtils.formatInputNumber(0);
    annualReturnEl.value  = '5';
    if (yearlyIncEl) yearlyIncEl.value = '0';
    if (inflationEl) inflationEl.value = '2';
    cesgToggle.checked        = true;  cesgTrack.classList.add('is-on');
    provincialToggle.checked  = false; provincialTrack.classList.remove('is-on');
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

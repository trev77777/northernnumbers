/* =============================================
   NORTHERN NUMBERS — tfsa-room.js
   TFSA Contribution Room Calculator 2026

   FORMULA:
   Lifetime Room = sum of annual limits for each year
   where: year >= max(birth_year + 18, 2009)
     AND: year >= residency_start_year

   Available Room = Lifetime Room
                  - Total Contributions
                  + Prior Year Withdrawals (2025)

   ANNUAL LIMITS (CRA confirmed):
   2009–2012: $5,000/yr  → $20,000 cumulative
   2013–2014: $5,500/yr  → $31,000
   2015:      $10,000    → $41,000
   2016–2018: $5,500/yr  → $57,500
   2019–2022: $6,000/yr  → $81,500
   2023:      $6,500     → $88,000
   2024–2026: $7,000/yr  → $109,000

   RULES:
   - Room accumulates Jan 1 each year, not mid-year
   - Withdrawals restore Jan 1 of FOLLOWING year
   - Non-residents do NOT accumulate room
   - No income required (unlike RRSP)
   - Over-contribution penalty: 1%/month on excess
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form         = document.getElementById('tfsa-room-form');
  const birthEl      = document.getElementById('birth-year');
  const residentEl   = document.getElementById('resident-since');
  const contribEl    = document.getElementById('total-contributions');
  const withdrawalEl = document.getElementById('prior-withdrawals');
  const balanceEl    = document.getElementById('current-balance');
  const placeholder  = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'TFSA Contribution Room Calculator 2026',
      description: 'Find out exactly how much TFSA contribution room you have in 2026 based on your birth year, residency history, contributions, and withdrawals.',
      keywords:    'tfsa contribution room calculator 2026, how much tfsa room do i have, tfsa room calculator canada, tfsa lifetime limit 2026',
      slug:        'tfsa-room'
    });
    NNSeo.injectSchema({ title:'TFSA Contribution Room Calculator 2026', slug:'tfsa-room', description:'Calculate your exact TFSA contribution room for 2026 using CRA annual limits.' });
    NNSeo.injectFAQSchema([
      { question:'How much TFSA room do I have in 2026?', answer:'If you were 18 or older and a Canadian resident in 2009, the maximum TFSA room as of January 1, 2026 is $109,000. If you became eligible later, your room is the sum of annual limits from the year you turned 18 (or became a resident, whichever is later) through 2026.' },
      { question:'What is the TFSA contribution limit for 2026?', answer:'The TFSA annual contribution limit for 2026 is $7,000, the same as 2024 and 2025. The cumulative lifetime limit for someone eligible since 2009 is $109,000 as of January 1, 2026.' },
      { question:'When do TFSA withdrawals get added back to my room?', answer:'TFSA withdrawals are restored to your contribution room on January 1 of the following year. If you withdraw $10,000 in 2026, that $10,000 is added back to your room on January 1, 2027 — not immediately. Re-contributing in the same year you withdrew is a common over-contribution mistake.' },
      { question:'Does TFSA room accumulate if I never had a TFSA?', answer:'Yes. TFSA contribution room accumulates automatically every January 1 for every eligible Canadian (18+, resident) even if you never opened a TFSA. If you have been eligible since 2009 and never contributed, you have $109,000 in available room you can contribute immediately.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['tfsa','rrsp','budget','income-tax']); } catch(e) {}

  /* ── Formatters ── */
  NNUtils.attachFormatter(contribEl);
  NNUtils.attachFormatter(withdrawalEl);
  NNUtils.attachFormatter(balanceEl);
  NNUtils.initTableToggle('table-toggle', 'room-table');

  /* ── TFSA Annual Limits (CRA) ── */
  const ANNUAL_LIMITS = {
    2009:5000, 2010:5000, 2011:5000, 2012:5000,
    2013:5500, 2014:5500, 2015:10000,
    2016:5500, 2017:5500, 2018:5500,
    2019:6000, 2020:6000, 2021:6000,
    2022:6000, 2023:6500, 2024:7000, 2025:7000, 2026:7000
  };
  const CURRENT_YEAR = 2026;

  function calcLifetimeRoom(birthYear, residentSince) {
    const eligibleAge  = birthYear + 18;
    const firstEligible = Math.max(eligibleAge, 2009, residentSince);
    let total = 0;
    const rows = [];
    let cumulative = 0;
    for (let y = 2009; y <= CURRENT_YEAR; y++) {
      const limit = ANNUAL_LIMITS[y] || 7000;
      const eligible = y >= firstEligible;
      if (eligible) { total += limit; cumulative += limit; }
      rows.push({ year: y, limit, eligible, cumulative: eligible ? cumulative : null });
    }
    return { total, rows, firstEligible };
  }

  /* ── CALCULATE ── */
  function calculate() {
    const birthYear    = parseInt(birthEl.value) || 0;
    const residentVal  = residentEl.value;
    const residentSince = residentVal === 'birth' ? 2009 : parseInt(residentVal);
    const contributions = NNUtils.parseInputNumber(contribEl.value) || 0;
    const withdrawals   = NNUtils.parseInputNumber(withdrawalEl.value) || 0;
    const balance       = NNUtils.parseInputNumber(balanceEl.value) || 0;

    // Validate
    const eligibleYear = birthYear + 18;
    if (!birthYear || birthYear < 1900 || birthYear > 2008) {
      NNUtils.setError(birthEl, 'birth-error', 'Please enter a valid birth year between 1900 and 2008.');
      return;
    }
    if (eligibleYear > CURRENT_YEAR) {
      NNUtils.setError(birthEl, 'birth-error', `You must be 18 to open a TFSA. Born ${birthYear} means eligible in ${eligibleYear}.`);
      return;
    }
    NNUtils.clearError(birthEl, 'birth-error');

    const { total: lifetimeRoom, rows, firstEligible } = calcLifetimeRoom(birthYear, residentSince);
    const availableRoom = Math.max(0, lifetimeRoom - contributions + withdrawals);
    const canAddNow     = Math.max(0, availableRoom - balance);
    const roomUsedPct   = lifetimeRoom > 0 ? (contributions / lifetimeRoom * 100).toFixed(1) : '0';

    /* Render */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    document.getElementById('result-available-room').textContent = NNUtils.formatCAD(availableRoom);
    document.getElementById('result-hero-sub').textContent =
      `Eligible since ${firstEligible} · $109,000 max for those eligible since 2009`;

    document.getElementById('result-lifetime-room').textContent = NNUtils.formatCAD(lifetimeRoom);
    document.getElementById('result-contributions').textContent  = NNUtils.formatCAD(contributions);
    document.getElementById('result-withdrawals').textContent    = withdrawals > 0 ? '+' + NNUtils.formatCAD(withdrawals) : '$0.00';
    document.getElementById('result-room-total').textContent     = NNUtils.formatCAD(availableRoom);

    document.getElementById('result-room-used').textContent = roomUsedPct + '%';
    document.getElementById('result-can-add').textContent   = NNUtils.formatCAD(canAddNow);

    // Overcontrib warning
    if (contributions > lifetimeRoom + withdrawals) {
      const excess = contributions - lifetimeRoom - withdrawals;
      document.getElementById('result-room-total').textContent = '⚠️ Over by ' + NNUtils.formatCAD(excess);
      document.getElementById('result-room-total').style.color = 'var(--color-danger)';
    } else {
      document.getElementById('result-room-total').style.color = '';
    }

    // Year-by-year table
    const tbody = document.getElementById('room-body');
    if (tbody) {
      tbody.innerHTML = rows.map((r, i) => {
        const style = i % 2 === 0 ? 'background:var(--color-bg);' : '';
        if (!r.eligible) {
          return `<tr style="${style}border-bottom:1px solid var(--color-border)">
            <td style="padding:var(--space-2) var(--space-3);color:var(--color-text-muted)">${r.year}</td>
            <td style="padding:var(--space-2) var(--space-3);text-align:right;color:var(--color-text-muted)">${NNUtils.formatCAD(r.limit)}</td>
            <td style="padding:var(--space-2) var(--space-3);text-align:right;color:var(--color-text-muted)">Not eligible</td>
          </tr>`;
        }
        const isCurrent = r.year === CURRENT_YEAR;
        return `<tr style="${style}border-bottom:1px solid var(--color-border)${isCurrent?';font-weight:700':''}">
          <td style="padding:var(--space-2) var(--space-3)">${r.year}${isCurrent?' ← current':''}</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right">${NNUtils.formatCAD(r.limit)}</td>
          <td style="padding:var(--space-2) var(--space-3);text-align:right${isCurrent?';color:var(--color-primary)':''}">${NNUtils.formatCAD(r.cumulative)}</td>
        </tr>`;
      }).join('');
    }

    window._tfsaRoomResults = { birthYear, lifetimeRoom, contributions, withdrawals, availableRoom, firstEligible };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('TFSA Room Calculator', { birthYear, availableRoom }); } catch(e) {}
  }

  /* ── Copy Results ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const r = window._tfsaRoomResults;
    if (!r) return;
    NNUtils.copyResults(this, [
      `💰 TFSA Contribution Room 2026 — Northern Numbers`,
      `─────────────────────────────`,
      `🎂 Birth Year:            ${r.birthYear}`,
      `📅 Eligible Since:        ${r.firstEligible}`,
      `─────────────────────────────`,
      `🏦 Lifetime Room:         ${NNUtils.formatCAD(r.lifetimeRoom)}`,
      `📤 Contributions Made:    ${NNUtils.formatCAD(r.contributions)}`,
      `📥 2025 Withdrawals:      ${NNUtils.formatCAD(r.withdrawals)}`,
      `✅ Available Room (2026):  ${NNUtils.formatCAD(r.availableRoom)}`,
      ``,
      `⚠️ Always verify at CRA My Account before contributing.`
    ], 'TFSA Room Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    birthEl.value      = '1990';
    residentEl.value   = 'birth';
    contribEl.value    = NNUtils.formatInputNumber(0);
    withdrawalEl.value = NNUtils.formatInputNumber(0);
    balanceEl.value    = NNUtils.formatInputNumber(0);
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    NNUtils.clearError(birthEl, 'birth-error');
  });

});

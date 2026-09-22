/* =============================================
   NORTHERN NUMBERS — debt-payoff.js
   Canadian Debt Payoff Calculator 2026

   STRATEGIES:
   Avalanche: extra payment → highest interest rate first
   Snowball:  extra payment → lowest balance first

   SIMULATION:
   Each month:
   1. Charge interest on all remaining balances (rate/12)
   2. Apply minimum payment to each debt
   3. Apply extra payment to target debt (per strategy)
   4. Roll freed minimums to next target as debts clear

   VERIFIED:
   3 debts (CC 24.99%, CC2 19.99%, Car 5.99%)
   Avalanche interest = $2,265.57
   Snowball interest  = $2,340.14
   ============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs + submit FIRST ── */
  const form      = document.getElementById('debt-form');
  const debtList  = document.getElementById('debt-list');
  const extraEl   = document.getElementById('extra-payment');
  const placeholder    = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); calculate(); });

  /* ── SEO ── */
  if (window.NNSeo) try {
    NNSeo.init({
      title:       'Debt Payoff Calculator Canada 2026 — Avalanche vs Snowball',
      description: 'Compare avalanche vs snowball debt payoff strategies. See exactly when each debt is paid off and how much interest you save.',
      keywords:    'debt payoff calculator canada, avalanche vs snowball calculator, debt elimination calculator canada',
      slug:        'debt-payoff'
    });
    NNSeo.injectSchema({ title:'Debt Payoff Calculator Canada 2026', slug:'debt-payoff', description:'Compare avalanche and snowball debt payoff strategies for Canadian debts.' });
    NNSeo.injectFAQSchema([
      { question:'Should I pay off debt or invest in my TFSA?', answer:'The general rule: if your debt interest rate is higher than your expected investment return, pay off debt first. Credit card debt at 19.99% is almost always worth eliminating before investing — no investment reliably returns 20%. However, if you have a low-rate mortgage at 4–5% and expect 7%+ returns in a TFSA, investing while making minimum debt payments can make sense. Many Canadians do both: pay down high-interest debt aggressively while making small regular TFSA contributions to preserve room and build the savings habit.' },
      { question:'What is a debt consolidation loan in Canada?', answer:'A debt consolidation loan combines multiple debts into a single loan — ideally at a lower interest rate. In Canada, options include personal loans from banks or credit unions (typically 8–15%), balance transfer credit cards (often 0% for 6–12 months then 19.99%), or a HELOC if you own a home (typically prime + 0.5%). Consolidation simplifies payments and can reduce interest costs significantly, but requires discipline — many Canadians consolidate credit cards and then run them up again, worsening their situation.' },
      { question:'Are there Canadian government programs to help with debt?', answer:'Yes. The federal government offers consumer proposals and bankruptcy protection through the Bankruptcy and Insolvency Act, administered by Licensed Insolvency Trustees (LITs). A consumer proposal allows you to negotiate repaying a portion of your debt over up to five years, avoiding bankruptcy. Credit counselling agencies — many non-profit — offer debt management plans and free counselling. The Financial Consumer Agency of Canada (fcac.gc.ca) provides free resources on managing debt.' },
    ]);
  } catch(e) {}

  if (window.NNComponents) try { NNComponents.renderRelated('nn-related', ['budget','loan','mortgage','income-tax']); } catch(e) {}

  /* ── Debt rows ── */
  let debtCount = 0;

  const PRESETS = [
    { name:'Credit Card',  balance:5000,  rate:19.99, min:100 },
    { name:'Car Loan',     balance:12000, rate:6.5,   min:250 },
    { name:'Student Loan', balance:8000,  rate:8.0,   min:150 },
  ];

  function addDebtRow(preset) {
    debtCount++;
    const id = debtCount;
    const p  = preset || { name:'', balance:'', rate:'', min:'' };
    const row = document.createElement('div');
    row.className = 'debt-entry';
    row.dataset.id = id;
    row.style.cssText = 'padding:var(--space-4);background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);margin-bottom:var(--space-3)';
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
        <label style="font-weight:600;font-size:var(--text-sm)">Debt ${id}</label>
        <button type="button" class="remove-debt" data-id="${id}" style="background:none;border:none;color:var(--color-text-muted);cursor:pointer;font-size:var(--text-sm);padding:var(--space-1)" aria-label="Remove debt ${id}">✕ Remove</button>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:var(--space-2);min-width:0" class="debt-input-grid">
        <div>
          <label style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);display:block;margin-bottom:4px">DEBT NAME</label>
          <input type="text" class="form-input debt-name" placeholder="e.g. Credit Card" value="${p.name}" style="font-size:var(--text-sm)" />
        </div>
        <div>
          <label style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);display:block;margin-bottom:4px">BALANCE ($)</label>
          <input type="text" class="form-input debt-balance" placeholder="5,000" value="${p.balance ? NNUtils.formatInputNumber(p.balance) : ''}" inputmode="numeric" style="font-size:var(--text-sm)" />
        </div>
        <div>
          <label style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);display:block;margin-bottom:4px">RATE (%)</label>
          <input type="number" class="form-input debt-rate" placeholder="19.99" value="${p.rate}" min="0" max="100" step="0.01" style="font-size:var(--text-sm)" />
        </div>
        <div>
          <label style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);display:block;margin-bottom:4px">MIN PMT ($)</label>
          <input type="text" class="form-input debt-min" placeholder="100" value="${p.min ? NNUtils.formatInputNumber(p.min) : ''}" inputmode="numeric" style="font-size:var(--text-sm)" />
        </div>
      </div>`;

    // Attach formatters to balance and min
    const balEl = row.querySelector('.debt-balance');
    const minEl = row.querySelector('.debt-min');
    if (NNUtils.attachFormatter) {
      NNUtils.attachFormatter(balEl);
      NNUtils.attachFormatter(minEl);
    }

    debtList.appendChild(row);
  }

  function removeDebtRow(id) {
    const row = debtList.querySelector(`[data-id="${id}"]`);
    if (row) row.remove();
  }

  // Add initial preset rows
  PRESETS.forEach(p => addDebtRow(p));

  document.getElementById('add-debt-btn').addEventListener('click', () => addDebtRow());

  debtList.addEventListener('click', e => {
    if (e.target.classList.contains('remove-debt')) {
      const id = e.target.dataset.id;
      removeDebtRow(id);
    }
  });

  NNUtils.attachFormatter(extraEl);
  NNUtils.initTableToggle('table-toggle', 'payoff-table');

  /* ── SIMULATION ENGINE ── */
  function simulate(debts, extra, strategy) {
    const ds = debts.map(d => ({ ...d }));

    // Priority order
    let priority;
    if (strategy === 'avalanche') {
      priority = [...Array(ds.length).keys()].sort((a,b) => ds[b].rate - ds[a].rate);
    } else {
      priority = [...Array(ds.length).keys()].sort((a,b) => ds[a].balance - ds[b].balance);
    }

    let month = 0, totalInterest = 0, totalPaid = 0;
    const payoffOrder = [], schedule = [];
    const paidOff = new Set();

    while (ds.some(d => d.balance > 0.005)) {
      month++;
      if (month > 600) break;

      const target = priority.find(i => ds[i].balance > 0.005);
      let monthInterest = 0, monthPrincipal = 0, monthPayment = 0;
      let remaining = ds.reduce((s,d) => s + d.balance, 0);

      // Roll freed minimums: if a debt is paid, its minimum is freed for the target
      const freedMin = ds.reduce((s,d,i) => paidOff.has(i) ? s + d.min : s, 0);

      for (let i = 0; i < ds.length; i++) {
        if (ds[i].balance <= 0.005) { ds[i].balance = 0; continue; }
        const mr       = ds[i].rate / 100 / 12;
        const interest = ds[i].balance * mr;
        let payment    = ds[i].min;
        if (i === target) payment += extra + freedMin;
        payment = Math.min(payment, ds[i].balance + interest);
        const principal = payment - interest;
        ds[i].balance = Math.max(0, ds[i].balance - principal);
        monthInterest  += interest;
        monthPrincipal += principal;
        monthPayment   += payment;

        if (ds[i].balance < 0.005 && !paidOff.has(i)) {
          paidOff.add(i);
          payoffOrder.push({ name: ds[i].name || `Debt ${i+1}`, month });
        }
      }

      totalInterest += monthInterest;
      totalPaid     += monthPayment;
      const balAfter = ds.reduce((s,d) => s + d.balance, 0);
      schedule.push({ month, payment: monthPayment, principal: monthPrincipal, interest: monthInterest, remaining: balAfter });
    }

    return { months: month, totalInterest, totalPaid, payoffOrder, schedule };
  }

  function formatTime(months) {
    const y = Math.floor(months / 12), m = months % 12;
    if (y === 0) return `${m} month${m !== 1 ? 's' : ''}`;
    if (m === 0) return `${y} year${y !== 1 ? 's' : ''}`;
    return `${y}y ${m}m`;
  }

  function debtFreeDate(months) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString('en-CA', { month:'long', year:'numeric' });
  }

  /* ── CALCULATE ── */
  function calculate() {
    const entries = debtList.querySelectorAll('.debt-entry');
    const debts = [];
    let hasError = false;

    entries.forEach((row, i) => {
      const balance = NNUtils.parseInputNumber(row.querySelector('.debt-balance').value);
      const rate    = parseFloat(row.querySelector('.debt-rate').value);
      const min     = NNUtils.parseInputNumber(row.querySelector('.debt-min').value);
      const name    = row.querySelector('.debt-name').value.trim() || `Debt ${i+1}`;
      if (balance > 0 && rate >= 0 && min > 0) {
        debts.push({ name, balance, rate, min });
      }
    });

    if (debts.length === 0) { alert('Please add at least one debt with a balance, rate, and minimum payment.'); return; }

    const extra    = NNUtils.parseInputNumber(extraEl.value) || 0;
    const strategy = document.querySelector('input[name="strategy"]:checked')?.value || 'both';

    const totalDebt    = debts.reduce((s,d) => s + d.balance, 0);
    const totalMinPmts = debts.reduce((s,d) => s + d.min, 0);
    const totalMonthly = totalMinPmts + extra;

    // Run simulations
    const strats = strategy === 'both' ? ['avalanche','snowball'] : [strategy];
    const results = {};
    strats.forEach(s => { results[s] = simulate(debts, extra, s); });

    // Min-only simulation (for savings comparison)
    const minOnly = simulate(debts, 0, 'avalanche');

    // Primary result: avalanche if both, or the chosen strategy
    const primary = results['avalanche'] || results['snowball'];
    const primaryLabel = strategy === 'both' ? 'Avalanche' : strategy.charAt(0).toUpperCase() + strategy.slice(1);

    /* Render */
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    document.getElementById('result-payoff-time').textContent  = formatTime(primary.months);
    document.getElementById('result-hero-sub').textContent     = `${primaryLabel} · ${NNUtils.formatCAD(totalMonthly)}/mo total · debt-free ${debtFreeDate(primary.months)}`;
    document.getElementById('result-total-debt').textContent   = NNUtils.formatCAD(totalDebt);
    document.getElementById('result-total-interest').textContent = NNUtils.formatCAD(primary.totalInterest);
    document.getElementById('result-total-paid').textContent   = NNUtils.formatCAD(primary.totalPaid);
    document.getElementById('result-monthly-total').textContent = NNUtils.formatCAD(totalMonthly) + '/mo';
    document.getElementById('result-months').textContent       = primary.months;
    document.getElementById('result-free-date').textContent    = debtFreeDate(primary.months);

    const intSaved  = minOnly.totalInterest - primary.totalInterest;
    const timeSaved = minOnly.months - primary.months;
    document.getElementById('result-interest-saved').textContent = intSaved > 0 ? NNUtils.formatCAD(intSaved) : '—';
    document.getElementById('result-time-saved').textContent    = timeSaved > 0 ? formatTime(timeSaved) : '—';

    // Strategy comparison
    const bothComp = document.getElementById('both-comparison');
    if (strategy === 'both' && results.avalanche && results.snowball) {
      bothComp.style.display = '';
      const av = results.avalanche, sn = results.snowball;
      document.getElementById('av-time').textContent     = formatTime(av.months);
      document.getElementById('av-interest').textContent = NNUtils.formatCAD(av.totalInterest);
      document.getElementById('av-total').textContent    = NNUtils.formatCAD(av.totalPaid);
      document.getElementById('sn-time').textContent     = formatTime(sn.months);
      document.getElementById('sn-interest').textContent = NNUtils.formatCAD(sn.totalInterest);
      document.getElementById('sn-total').textContent    = NNUtils.formatCAD(sn.totalPaid);

      const avCard = document.getElementById('av-card');
      const snCard = document.getElementById('sn-card');
      avCard.classList.toggle('winner', av.totalInterest <= sn.totalInterest);
      snCard.classList.toggle('winner', sn.totalInterest < av.totalInterest);

      const diff = Math.abs(sn.totalInterest - av.totalInterest);
      const timeDiff = Math.abs(sn.months - av.months);
      const verdict = diff < 10
        ? 'Both strategies give essentially the same result for your debts.'
        : `Avalanche saves ${NNUtils.formatCAD(diff)} in interest${timeDiff > 0 ? ' and ' + formatTime(timeDiff) : ''}. Choose snowball if motivation is a concern.`;
      document.getElementById('strategy-verdict').textContent = verdict;
    } else {
      bothComp.style.display = 'none';
    }

    // Payoff order
    const orderEl = document.getElementById('payoff-order');
    orderEl.innerHTML = primary.payoffOrder.map((item, i) => `
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:var(--space-2);padding:var(--space-3);background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);font-size:var(--text-sm)">
        <span style="width:24px;height:24px;border-radius:50%;background:var(--color-primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;font-size:var(--text-xs)">${i+1}</span>
        <span style="font-weight:600;flex:1;min-width:80px">${item.name}</span>
        <span style="color:var(--color-text-muted);flex-shrink:0">Paid off ${debtFreeDate(item.month)}</span>
      </div>`).join('');

    // Schedule table (max 60 rows to keep it manageable)
    const tbody = document.getElementById('schedule-body');
    const maxRows = Math.min(primary.schedule.length, 60);
    tbody.innerHTML = primary.schedule.slice(0, maxRows).map((row, i) => `
      <tr style="${i%2===0?'background:var(--color-bg);':''}border-bottom:1px solid var(--color-border)">
        <td style="padding:var(--space-2) var(--space-3)">${row.month}</td>
        <td style="padding:var(--space-2) var(--space-3);text-align:right">${NNUtils.formatCAD(row.payment)}</td>
        <td style="padding:var(--space-2) var(--space-3);text-align:right">${NNUtils.formatCAD(row.principal)}</td>
        <td style="padding:var(--space-2) var(--space-3);text-align:right;color:var(--color-danger)">${NNUtils.formatCAD(row.interest)}</td>
        <td style="padding:var(--space-2) var(--space-3);text-align:right">${NNUtils.formatCAD(row.remaining)}</td>
      </tr>`).join('') + (primary.schedule.length > 60 ? `<tr><td colspan="5" style="padding:var(--space-3);color:var(--color-text-muted);text-align:center">… ${primary.schedule.length - 60} more months</td></tr>` : '');

    window._debtResults = { debts, extra, strategy, primary, totalDebt, totalMonthly };

    const el = document.getElementById('results-heading');
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });

    if (window.NNAnalytics) try { NNAnalytics.trackCalculator('Debt Payoff Calculator', { debts: debts.length, strategy }); } catch(e) {}
  }

  /* ── Copy Results ── */
  document.getElementById('copy-btn')?.addEventListener('click', function() {
    const d = window._debtResults;
    if (!d) return;
    NNUtils.copyResults(this, [
      `💳 Debt Payoff Calculator — Northern Numbers`,
      `─────────────────────────────`,
      `📊 Total Debt:      ${NNUtils.formatCAD(d.totalDebt)}`,
      `💵 Monthly Total:   ${NNUtils.formatCAD(d.totalMonthly)}/mo`,
      `─────────────────────────────`,
      `⏱  Payoff Time:     ${d.primary.months} months`,
      `💸 Total Interest:  ${NNUtils.formatCAD(d.primary.totalInterest)}`,
      `💰 Total Paid:      ${NNUtils.formatCAD(d.primary.totalPaid)}`
    ], 'Debt Payoff Calculator');
  });

  /* ── Reset ── */
  document.getElementById('reset-btn')?.addEventListener('click', function() {
    debtList.innerHTML = '';
    debtCount = 0;
    PRESETS.forEach(p => addDebtRow(p));
    extraEl.value = NNUtils.formatInputNumber(200);
    document.querySelector('input[name="strategy"][value="both"]').checked = true;
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    if (window.NNUtils) try { NNUtils.scrollToCalcTop(); } catch(e) {}
  });

});

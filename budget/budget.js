/* =============================================
   NORTHERN NUMBERS — budget.js
   Canadian Monthly Budget Calculator

   CALCULATION METHOD:
   - Needs: Housing + Transportation (basic) + Groceries + Debt + Health + Family
   - Wants: Restaurants + Lifestyle (entertainment/shopping/subs/gym/travel) + Custom
   - Savings: All savings & investing inputs
   - Remaining: Income - Needs - Wants - Savings

   HEALTH SCORE (0–100):
   - Savings rate 40pts: 0%→0, 10%→20, ≥20%→40
   - Needs ratio  30pts: ≤50%→30, linear down to 0 at 80%+
   - Wants ratio  20pts: ≤30%→20, linear down to 0 at 50%+
   - Surplus      10pts: positive→10, zero→5, negative→0

   Verified: Perfect 50/30/20 budget → 95/100 ✅
   Deficit budget → score < 40 ✅
   Excellent saver → score ≥ 80 ✅
============================================= */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── SEO ─────────────────────────────────── */
  NNSeo.init({
    title:       'Monthly Budget Calculator Canada',
    description: 'Free Canadian monthly budget calculator. Track income vs expenses, calculate your savings rate, and get a Budget Health Score with 50/30/20 analysis and personalized insights.',
    keywords:    'monthly budget calculator canada, budget calculator canada, 50 30 20 budget calculator canada, budget planner canada, personal budget calculator',
    slug:        'budget'
  });
  NNSeo.injectSchema({
    title:       'Monthly Budget Calculator Canada',
    slug:        'budget',
    description: 'Free Canadian monthly budget calculator with Budget Health Score, 50/30/20 analysis, and personalized financial insights.'
  });
  NNSeo.injectFAQSchema([
    { question: 'What is a good savings rate in Canada?', answer: 'A savings rate of 20% or more is excellent. 10–19% is good. Under 10% means slow financial progress. Aim for 15–20% of take-home pay.' },
    { question: 'How does the 50/30/20 rule work in Canada?', answer: '50% of after-tax income goes to needs (housing, groceries, transportation), 30% to wants (dining, entertainment, travel), and 20% to savings and debt repayment. In high-cost cities like Toronto or Vancouver, a 60/20/20 split is more realistic.' },
    { question: 'How much should I spend on housing in Canada?', answer: 'The CMHC recommends no more than 30–35% of gross income on housing. If housing exceeds this, focus on reducing discretionary spending and building savings toward homeownership through an FHSA.' },
    { question: 'Should I pay off debt or invest?', answer: 'If your debt rate is above 6–7%, pay it off first. For debt under 5%, invest simultaneously. Always maximize employer RRSP matching first — it\'s an instant 50–100% return.' },
    { question: 'How large should my emergency fund be?', answer: 'Aim for 3–6 months of essential expenses. Single-income households and those with irregular income should target 6 months. A TFSA HISA is the ideal account for an emergency fund in Canada.' }
  ]);

  /* ── FIELD DEFINITIONS ───────────────────── */
  // Maps field id → { section: string, type: 'needs'|'wants'|'savings' }
  const FIELDS = {
    // Housing — needs
    'mortgage':       { section:'housing',        type:'needs'   },
    'property-tax':   { section:'housing',        type:'needs'   },
    'utilities':      { section:'housing',        type:'needs'   },
    'internet':       { section:'housing',        type:'needs'   },
    'home-insurance': { section:'housing',        type:'needs'   },
    // Transportation — needs (basic); car payment is debt but treated as need for 50/30/20
    'car-payment':    { section:'transportation', type:'needs'   },
    'fuel':           { section:'transportation', type:'needs'   },
    'car-insurance':  { section:'transportation', type:'needs'   },
    'maintenance':    { section:'transportation', type:'needs'   },
    'transit':        { section:'transportation', type:'needs'   },
    // Food
    'groceries':      { section:'food',           type:'needs'   },
    'restaurants':    { section:'food',           type:'wants'   },
    // Debt — needs (minimum payments are obligations)
    'credit-cards':   { section:'debt',           type:'needs'   },
    'student-loans':  { section:'debt',           type:'needs'   },
    'personal-loans': { section:'debt',           type:'needs'   },
    // Lifestyle — wants
    'entertainment':  { section:'lifestyle',      type:'wants'   },
    'shopping':       { section:'lifestyle',      type:'wants'   },
    'subscriptions':  { section:'lifestyle',      type:'wants'   },
    'gym':            { section:'lifestyle',      type:'wants'   },
    'travel':         { section:'lifestyle',      type:'wants'   },
    // Savings
    'emergency-fund': { section:'savings',        type:'savings' },
    'tfsa-contrib':   { section:'savings',        type:'savings' },
    'rrsp-contrib':   { section:'savings',        type:'savings' },
    'fhsa-contrib':   { section:'savings',        type:'savings' },
    'investments':    { section:'savings',        type:'savings' },
    // Family — needs
    'childcare':      { section:'family',         type:'needs'   },
    'pets':           { section:'family',         type:'wants'   },
    // Health — needs
    'medical':        { section:'health',         type:'needs'   },
    'dental':         { section:'health',         type:'needs'   },
    'health-insurance':{ section:'health',        type:'needs'   },
    // Other — wants
    'miscellaneous':  { section:'other',          type:'wants'   },
    'custom':         { section:'other',          type:'wants'   }
  };

  // Section → display names and colours for donut chart
  const SECTION_META = {
    housing:        { label:'Housing',        color:'#D52B1E' },
    transportation: { label:'Transportation', color:'#F97316' },
    food:           { label:'Food',           color:'#EAB308' },
    debt:           { label:'Debt',           color:'#8B5CF6' },
    lifestyle:      { label:'Lifestyle',      color:'#EC4899' },
    savings:        { label:'Savings',        color:'#10B981' },
    family:         { label:'Family',         color:'#3B82F6' },
    health:         { label:'Health',         color:'#06B6D4' },
    other:          { label:'Other',          color:'#6B7280' }
  };

  /* ── DOM REFS ────────────────────────────── */
  const incomeEl   = document.getElementById('income');
  const form       = document.getElementById('budget-form');
  const placeholder= document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  /* ── RELATED CALCULATORS ─────────────────── */
  NNComponents.renderRelated('nn-related', ['tfsa', 'rrsp', 'fhsa', 'compound-interest']);

  /* ── ATTACH FORMATTERS ───────────────────── */
  NNUtils.attachFormatter(incomeEl);
  Object.keys(FIELDS).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      NNUtils.attachFormatter(el);
      el.addEventListener('input', function () {
        updateSectionTotal(FIELDS[id].section);
        this.classList.toggle('has-value', NNUtils.parseInputNumber(this.value) > 0);
        liveUpdate();
      });
    }
  });
  // Advanced fields
  ['annual-bonus','irregular-income','emergency-goal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { NNUtils.attachFormatter(el); el.addEventListener('input', liveUpdate); }
  });

  incomeEl.addEventListener('input', liveUpdate);

  /* ── SECTION TOTALS ──────────────────────── */
  function updateSectionTotal(section) {
    let total = 0;
    Object.entries(FIELDS).forEach(([id, meta]) => {
      if (meta.section === section) {
        const el = document.getElementById(id);
        if (el) total += NNUtils.parseInputNumber(el.value);
      }
    });
    const el = document.getElementById(`total-${section}`);
    if (el) el.textContent = total > 0 ? NNUtils.formatCAD0(total) : '$0';
  }

  /* ── ADVANCED TOGGLE ─────────────────────── */
  NNUtils.initAdvancedToggle('advanced-toggle', 'advanced-fields');

  /* ── PRESETS ─────────────────────────────── */
  const PRESETS = {
    student: {
      income:1800, mortgage:800, utilities:50, internet:40,
      transit:130, groceries:300, restaurants:100,
      student_loans:150, entertainment:60, subscriptions:30,
      emergency_fund:100, miscellaneous:80
    },
    single: {
      income:4200, mortgage:1500, utilities:120, internet:60, home_insurance:80,
      car_payment:0, fuel:150, car_insurance:150,
      groceries:400, restaurants:200,
      credit_cards:100,
      entertainment:150, shopping:150, subscriptions:50, gym:50,
      emergency_fund:300, tfsa_contrib:300, rrsp_contrib:200,
      medical:50
    },
    couple: {
      income:8500, mortgage:2400, property_tax:300, utilities:180, internet:80, home_insurance:120,
      car_payment:450, fuel:200, car_insurance:250, maintenance:80,
      groceries:700, restaurants:350,
      credit_cards:150,
      entertainment:200, shopping:250, subscriptions:80, gym:100, travel:150,
      emergency_fund:500, tfsa_contrib:700, rrsp_contrib:500, fhsa_contrib:400,
      medical:80, dental:60
    },
    family: {
      income:10000, mortgage:2800, property_tax:400, utilities:220, internet:80, home_insurance:140,
      car_payment:500, fuel:300, car_insurance:300, maintenance:100,
      groceries:900, restaurants:300,
      credit_cards:200,
      entertainment:150, shopping:300, subscriptions:80, gym:80,
      emergency_fund:400, tfsa_contrib:500, rrsp_contrib:500,
      childcare:1200, medical:100, dental:80, health_insurance:200,
      miscellaneous:150
    },
    renter: {
      income:5000, mortgage:1800, utilities:100, internet:60, home_insurance:30,
      transit:150, groceries:450, restaurants:250,
      credit_cards:100,
      entertainment:120, shopping:150, subscriptions:60, gym:50,
      emergency_fund:300, tfsa_contrib:400, rrsp_contrib:200,
      medical:50
    },
    homeowner: {
      income:7500, mortgage:2200, property_tax:350, utilities:200, internet:80, home_insurance:150,
      car_payment:400, fuel:250, car_insurance:200, maintenance:150,
      groceries:600, restaurants:250,
      credit_cards:150,
      entertainment:150, shopping:200, subscriptions:70, gym:60,
      emergency_fund:400, tfsa_contrib:600, rrsp_contrib:500,
      medical:80, dental:60, health_insurance:120,
      miscellaneous:100
    }
  };

  // Map preset keys to field IDs
  const PRESET_MAP = {
    home_insurance:'home-insurance', car_payment:'car-payment', car_insurance:'car-insurance',
    student_loans:'student-loans', personal_loans:'personal-loans', credit_cards:'credit-cards',
    emergency_fund:'emergency-fund', tfsa_contrib:'tfsa-contrib', rrsp_contrib:'rrsp-contrib',
    fhsa_contrib:'fhsa-contrib', health_insurance:'health-insurance', property_tax:'property-tax'
  };

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const p = PRESETS[this.dataset.preset];
      if (!p) return;

      // Clear all first
      Object.keys(FIELDS).forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ''; el.classList.remove('has-value'); }
      });

      incomeEl.value = NNUtils.formatInputNumber(p.income || 0);

      Object.entries(p).forEach(([key, val]) => {
        if (key === 'income') return;
        const fieldId = PRESET_MAP[key] || key.replace(/_/g, '-');
        const el = document.getElementById(fieldId);
        if (el && val) {
          el.value = NNUtils.formatInputNumber(val);
          el.classList.add('has-value');
        }
      });

      // Update all section totals
      Object.keys(SECTION_META).forEach(s => updateSectionTotal(s));

      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
      this.classList.add('is-active');
      calculate();
    });
  });

  /* ── GET VALUES ──────────────────────────── */
  function getValues() {
    const income = NNUtils.parseInputNumber(incomeEl.value);
    const bonus  = NNUtils.parseInputNumber(document.getElementById('annual-bonus')?.value || '0');
    const irregular = NNUtils.parseInputNumber(document.getElementById('irregular-income')?.value || '0');
    const emergencyGoal = NNUtils.parseInputNumber(document.getElementById('emergency-goal')?.value || '0');

    const totalIncome = income + (bonus / 12) + irregular;

    const values = {};
    let needs = 0, wants = 0, savings = 0;
    const bySec = {};

    Object.entries(FIELDS).forEach(([id, meta]) => {
      const el = document.getElementById(id);
      const v  = el ? NNUtils.parseInputNumber(el.value) : 0;
      values[id] = v;
      if (meta.type === 'needs')   needs   += v;
      if (meta.type === 'wants')   wants   += v;
      if (meta.type === 'savings') savings += v;
      if (!bySec[meta.section]) bySec[meta.section] = 0;
      bySec[meta.section] += v;
    });

    const totalExpenses = needs + wants + savings;
    const remaining     = totalIncome - totalExpenses;

    return { income, totalIncome, needs, wants, savings, totalExpenses, remaining, values, bySec, emergencyGoal };
  }

  /* ── HEALTH SCORE ────────────────────────── */
  function healthScore(income, needs, wants, savings, remaining) {
    if (income <= 0) return 0;

    // Cap savings_pct at 100% — entering annual values monthly creates
    // impossibly high savings percentages that would otherwise inflate the score
    const savPct   = Math.min(savings / income * 100, 100);
    const needsPct = needs   / income * 100;
    const wantsPct = wants   / income * 100;

    const sScore = Math.min(40, savPct * 2);
    const nScore = needsPct <= 50 ? 30 : Math.max(0, 30 - (needsPct - 50) * 1.0);
    const wScore = wantsPct <= 30 ? 20 : Math.max(0, 20 - (wantsPct - 30) * 1.0);
    const rScore = remaining > 0 ? 10 : (remaining === 0 ? 5 : 0);
    const raw    = Math.round(sScore + nScore + wScore + rScore);

    // A budget in deficit can never be healthy — hard cap at 30
    // This prevents the score from praising impossible savings with negative remaining
    if (remaining < 0) return Math.min(raw, 30);
    return raw;
  }

  function healthLabel(score) {
    if (score >= 85) return { label:'Excellent — you\'re in great financial shape 🎉', color:'#166534', bg:'#F0FDF4', border:'#86EFAC' };
    if (score >= 70) return { label:'Good — solid budget with room to improve', color:'#1D4ED8', bg:'#EFF6FF', border:'#93C5FD' };
    if (score >= 50) return { label:'Fair — consider reducing expenses or increasing savings', color:'#92400E', bg:'#FFFBEB', border:'#FDE68A' };
    return { label:'Needs attention — spending exceeds income or savings are very low', color:'#991B1B', bg:'#FFF1F2', border:'#FCA5A5' };
  }

  function healthBarColor(score) {
    if (score >= 85) return '#10B981';
    if (score >= 70) return '#3B82F6';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  }

  /* ── SMART INSIGHTS ──────────────────────── */
  function generateInsights(v) {
    const insights = [];
    const inc = v.totalIncome;
    if (inc <= 0) return insights;

    const needsPct   = v.needs   / inc * 100;
    const wantsPct   = v.wants   / inc * 100;
    const savPct     = v.savings / inc * 100;
    const housingPct = v.bySec.housing / inc * 100;
    const transPct   = v.bySec.transportation / inc * 100;
    const restPct    = (v.values['restaurants'] || 0) / inc * 100;
    const subAmt     = v.values['subscriptions'] || 0;
    const savingsAmt = v.values['emergency-fund'] || 0;
    const tfsa       = v.values['tfsa-contrib'] || 0;
    const rrsp       = v.values['rrsp-contrib'] || 0;
    const fhsa       = v.values['fhsa-contrib'] || 0;
    const debt       = (v.values['credit-cards'] || 0) + (v.values['student-loans'] || 0) + (v.values['personal-loans'] || 0);

    if (v.remaining < 0) {
      insights.push({ icon:'⚠️', text:`You're spending ${NNUtils.formatCAD(Math.abs(v.remaining))} more than you earn each month. This is unsustainable — review your largest expense categories immediately.` });
    } else if (v.remaining > 0 && savPct < 10) {
      insights.push({ icon:'💡', text:`You have ${NNUtils.formatCAD(v.remaining)} left over each month that isn't going to savings. Consider automating a transfer to your TFSA to capture this surplus.` });
    }

    if (housingPct > 40) insights.push({ icon:'🏠', text:`Housing is ${housingPct.toFixed(0)}% of your income — above the recommended 35% maximum. If renting, consider roommates or a less expensive unit. If you own, evaluate refinancing options.` });

    if (transPct > 20) insights.push({ icon:'🚗', text:`Transportation costs are ${transPct.toFixed(0)}% of income — unusually high. The average Canadian spends 10–15%. A paid-off vehicle or switching to transit could free up ${NNUtils.formatCAD((transPct - 15) / 100 * inc)}/month.` });

    if (restPct > 8) insights.push({ icon:'🍽', text:`Dining and takeout is ${NNUtils.formatCAD(v.values['restaurants'])}/month (${restPct.toFixed(0)}% of income). Meal prepping 3–4 days per week typically cuts this by 40–60%.` });

    if (subAmt > 100) insights.push({ icon:'📱', text:`Subscriptions total ${NNUtils.formatCAD(subAmt)}/month (${NNUtils.formatCAD(subAmt * 12)}/year). A subscription audit — cancelling unused services — typically saves $30–$80/month.` });

    if (savPct >= 20) insights.push({ icon:'🌟', text:`Your savings rate is ${savPct.toFixed(1)}% — excellent! You're on track to build significant wealth. At this rate, you'll save ${NNUtils.formatCAD(v.savings * 12)} this year.` });
    else if (savPct < 10 && v.remaining >= 0) insights.push({ icon:'💰', text:`Your savings rate is ${savPct.toFixed(1)}%. Aim for 20%. Automating an extra ${NNUtils.formatCAD(inc * 0.10 - v.savings)}/month to a TFSA would get you there.` });

    if (savingsAmt === 0) insights.push({ icon:'🚨', text:`You have no emergency fund contribution budgeted. Start with $100–$200/month in a TFSA HISA. A 3-month emergency fund of ${NNUtils.formatCAD((v.needs) * 3)} is your first financial priority.` });

    if (tfsa === 0 && rrsp === 0 && fhsa === 0 && v.remaining > 200) insights.push({ icon:'🇨🇦', text:`You\'re not contributing to any registered accounts (TFSA, RRSP, or FHSA). These are the highest-return moves available to Canadians — even $200/month in a TFSA grows tax-free.` });

    if (debt > 0 && debt / inc > 0.15) insights.push({ icon:'📉', text:`Debt payments are ${(debt/inc*100).toFixed(0)}% of your income. The recommended maximum is 15%. Accelerating repayment on the highest-interest debt first (avalanche method) saves the most money.` });

    if (v.emergencyGoal > 0 && savingsAmt > 0) {
      const months = Math.ceil(v.emergencyGoal / savingsAmt);
      insights.push({ icon:'🎯', text:`At ${NNUtils.formatCAD(savingsAmt)}/month, you'll reach your ${NNUtils.formatCAD(v.emergencyGoal)} emergency fund goal in ${months} month${months!==1?'s':''}.` });
    }

    if (needsPct <= 50 && wantsPct <= 30 && savPct >= 20) {
      insights.push({ icon:'🏆', text:`Your budget perfectly follows the 50/30/20 rule. You're in the top tier of Canadian budgeters — maintain this discipline and your financial future is bright.` });
    }

    return insights.slice(0, 6); // max 6 insights
  }

  /* ── DONUT CHART ─────────────────────────── */
  function drawDonut(bySec, totalExpenses) {
    const canvas = document.getElementById('donut-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 180;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2, cy = size / 2, r = 72, inner = 48;
    const entries = Object.entries(bySec)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a);

    if (!entries.length || totalExpenses === 0) return;

    let angle = -Math.PI / 2;
    const legend = document.getElementById('donut-legend');
    legend.innerHTML = '';

    entries.forEach(([section, val]) => {
      const slice = (val / totalExpenses) * 2 * Math.PI;
      const color = SECTION_META[section]?.color || '#9CA3AF';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      // Donut hole
      ctx.beginPath();
      ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Legend item
      const item = document.createElement('div');
      item.className = 'chart-legend-item';
      item.innerHTML = `<div class="chart-legend-dot" style="background:${color}"></div><span>${SECTION_META[section]?.label || section} (${(val/totalExpenses*100).toFixed(0)}%)</span>`;
      legend.appendChild(item);

      angle += slice;
    });

    document.getElementById('donut-center-value').textContent = NNUtils.formatCAD0(totalExpenses);
  }

  /* ── TOP CATEGORIES ──────────────────────── */
  function renderCategoryList(bySec, totalExpenses) {
    const list = document.getElementById('category-list');
    if (!list) return;
    const sorted = Object.entries(bySec).filter(([,v]) => v > 0).sort(([,a],[,b]) => b-a).slice(0, 6);
    const max = sorted[0]?.[1] || 1;
    list.innerHTML = sorted.map(([sec, val]) => `
      <div class="category-row">
        <span class="category-name">${SECTION_META[sec]?.label || sec}</span>
        <div class="category-bar-bg"><div class="category-bar-fill" style="width:${(val/max*100).toFixed(0)}%;background:${SECTION_META[sec]?.color||'#D52B1E'}"></div></div>
        <span class="category-amount">${NNUtils.formatCAD0(val)}</span>
      </div>`).join('');
  }

  /* ── CALCULATE ───────────────────────────── */
  function calculate() {
    const income = NNUtils.parseInputNumber(incomeEl.value);
    if (!income || income <= 0) {
      NNUtils.setError(incomeEl, 'income-error', 'Please enter your monthly after-tax income.');
      return;
    }
    NNUtils.clearError(incomeEl, 'income-error');

    const v     = getValues();
    const score = healthScore(v.totalIncome, v.needs, v.wants, v.savings, v.remaining);
    const hMeta = healthLabel(score);

    const wasHidden = resultsContent.classList.contains('hidden');
    placeholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    const inc = v.totalIncome;
    const needsPct    = inc > 0 ? v.needs   / inc * 100 : 0;
    const wantsPct    = inc > 0 ? v.wants   / inc * 100 : 0;
    // ONE canonical savings rate: dedicated savings ÷ income
    // Used everywhere — pills, rows, chart, health score, insights, copy
    const savPct = inc > 0 ? v.savings / inc * 100 : 0;
    const remPct = inc > 0 ? Math.max(0, v.remaining) / inc * 100 : 0;

    /* Summary pills */
    NNUtils.renderSummaryPills('result-summary-box', [
      `💵 ${NNUtils.formatCAD0(inc)}/mo`,
      `📊 ${needsPct.toFixed(0)}% needs`,
      `🎭 ${wantsPct.toFixed(0)}% wants`,
      `💰 ${savPct.toFixed(0)}% savings`
    ]);

    /* Celebration */
    let cel = '';
    if (score >= 90) cel = '🏆 <strong>Outstanding!</strong> Your budget is in excellent shape. You\'re building wealth efficiently.';
    else if (score >= 75) cel = '🎉 <strong>Great budgeting!</strong> You\'re saving well and spending responsibly.';
    else if (v.remaining < 0) cel = '⚠️ <strong>Deficit budget.</strong> Your expenses exceed your income. Review the insights below.';
    NNUtils.renderCelebration('result-celebration', cel);

    /* Primary result */
    const remEl = document.getElementById('result-remaining');
    const remSub = document.getElementById('result-remaining-sub');
    remEl.textContent = NNUtils.formatCAD(v.remaining);
    remEl.style.color = v.remaining >= 0 ? 'var(--color-primary)' : 'var(--color-error)';
    remSub.textContent = v.remaining >= 0
      ? `${NNUtils.formatCAD(v.remaining * 12)} potential annual surplus`
      : `Spending ${NNUtils.formatCAD(Math.abs(v.remaining))} more than you earn`;

    /* Summary rows */
    document.getElementById('result-income').textContent         = NNUtils.formatCAD(inc);
    document.getElementById('result-expenses').textContent       = NNUtils.formatCAD(v.totalExpenses);
    document.getElementById('result-savings').textContent        = NNUtils.formatCAD(v.savings);
    document.getElementById('result-savings-rate').textContent   = `${savPct.toFixed(1)}%`;
    document.getElementById('result-annual-savings').textContent = NNUtils.formatCAD((v.savings + Math.max(0, v.remaining)) * 12);

    /* Health score */
    const hCard = document.getElementById('health-card');
    if (hCard) { hCard.style.background = hMeta.bg; hCard.style.borderColor = hMeta.border; }
    document.getElementById('health-score-num').textContent = score;
    document.getElementById('health-score-num').style.color = hMeta.color;
    document.getElementById('health-bar').style.width       = `${score}%`;
    document.getElementById('health-bar').style.background  = healthBarColor(score);
    document.getElementById('health-label').textContent     = hMeta.label;
    document.getElementById('health-label').style.color     = hMeta.color;

    /* 50/30/20 */
    function ruleBadge(actual, target, direction) {
      const ok = direction === 'max' ? actual <= target : actual >= target;
      const warn = direction === 'max' ? actual <= target + 10 : actual >= target - 10;
      if (ok)   return '<span class="rule-badge badge-ok">✓ On track</span>';
      if (warn) return '<span class="rule-badge badge-warn">⚠ Close</span>';
      return '<span class="rule-badge badge-over">✗ Over</span>';
    }
    document.getElementById('rule-needs').textContent  = `${needsPct.toFixed(1)}%`;
    document.getElementById('rule-wants').textContent  = `${wantsPct.toFixed(1)}%`;
    document.getElementById('rule-savings').textContent= `${savPct.toFixed(1)}%`;
    document.getElementById('badge-needs').outerHTML   = ruleBadge(needsPct,  50, 'max').replace('id=""','id="badge-needs"');
    document.getElementById('badge-wants').outerHTML   = ruleBadge(wantsPct,  30, 'max').replace('id=""','id="badge-wants"');
    document.getElementById('badge-savings').outerHTML = ruleBadge(savPct,    20, 'min').replace('id=""','id="badge-savings"');
    // Re-query since outerHTML replacement
    ['badge-needs','badge-wants','badge-savings'].forEach(id => {
      const span = document.querySelector(`[id="${id}"]`);
      if (span) span.id = id;
    });

    /* Breakdown bar */
    const safeNeedsP  = Math.min(100, Math.max(0, needsPct));
    const safeWantsP  = Math.min(100 - safeNeedsP, Math.max(0, wantsPct));
    const safeSavP    = Math.min(100 - safeNeedsP - safeWantsP, Math.max(0, savPct));
    const safeRemP    = Math.max(0, 100 - safeNeedsP - safeWantsP - safeSavP);
    document.getElementById('bar-needs').style.width     = `${safeNeedsP}%`;
    document.getElementById('bar-wants').style.width     = `${safeWantsP}%`;
    document.getElementById('bar-savings').style.width   = `${safeSavP}%`;
    document.getElementById('bar-remaining').style.width = `${safeRemP}%`;
    document.getElementById('pct-needs').textContent     = `${needsPct.toFixed(0)}%`;
    document.getElementById('pct-wants').textContent     = `${wantsPct.toFixed(0)}%`;
    document.getElementById('pct-savings').textContent   = `${savPct.toFixed(0)}%`;
    document.getElementById('pct-remaining').textContent = `${remPct.toFixed(0)}%`;

    /* Cash flow card */
    const cfCard = document.getElementById('cashflow-card');
    if (cfCard) {
      cfCard.className = `cashflow-card ${v.remaining >= 0 ? 'cashflow-positive' : 'cashflow-negative'}`;
    }
    document.getElementById('cf-income').textContent        = NNUtils.formatCAD(inc);
    document.getElementById('cf-needs').textContent         = `−${NNUtils.formatCAD(v.needs)}`;
    document.getElementById('cf-wants').textContent         = `−${NNUtils.formatCAD(v.wants)}`;
    document.getElementById('cf-savings-val').textContent   = `−${NNUtils.formatCAD(v.savings)}`;
    document.getElementById('cf-remaining-label').textContent = v.remaining >= 0 ? 'Monthly Surplus' : 'Monthly Deficit';
    document.getElementById('cf-remaining-val').textContent = NNUtils.formatCAD(Math.abs(v.remaining));
    document.getElementById('cashflow-title').textContent   = v.remaining >= 0 ? '💵 Monthly Cash Flow' : '⚠️ Monthly Deficit';

    /* Chart + categories */
    drawDonut(v.bySec, v.totalExpenses);
    renderCategoryList(v.bySec, v.totalExpenses);

    /* Insights */
    const insights = generateInsights(v);
    const insightsList = document.getElementById('insights-list');
    if (insightsList) {
      insightsList.innerHTML = insights.length
        ? insights.map(i => `<div class="insight-item"><span class="insight-icon">${i.icon}</span><span>${i.text}</span></div>`).join('')
        : '<div class="insight-item"><span class="insight-icon">✅</span><span>Your budget looks well-balanced. Keep up the good work!</span></div>';
    }

    window._budgetResults = { v, score, inc, needsPct, wantsPct, savPct };

    if (window.NNAnalytics) NNAnalytics.trackCalculator('Budget Calculator', { score, income: inc });

    // Always scroll to results after a successful calculation (Bug 2 fix).
    // NNUtils.scrollToResults only scrolls on first calculate (wasHidden guard).
    // Budget needs to scroll every time so user sees updated results on mobile.
    (function() {
      const el = document.getElementById('results-heading');
      if (!el) return;
      // 80px clears the sticky header on both desktop and mobile
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    })();
  }

  /* ── LIVE UPDATE ─────────────────────────── */
  function liveUpdate() {
    if (!resultsContent.classList.contains('hidden')) calculate();
  }

  /* ── FORM SUBMIT ─────────────────────────── */
  form.addEventListener('submit', e => { e.preventDefault(); calculate(); });

  /* ── COPY RESULTS ────────────────────────── */
  document.getElementById('copy-results-btn')?.addEventListener('click', function () {
    const r = window._budgetResults;
    if (!r) return;
    const { v, score, inc, needsPct, wantsPct, savPct } = r;
    NNUtils.copyResults(this, [
      `💵 Monthly Income:      ${NNUtils.formatCAD(inc)}`,
      `📊 Total Expenses:      ${NNUtils.formatCAD(v.totalExpenses)}`,
      `─────────────────────────`,
      `🏠 Needs:               ${NNUtils.formatCAD(v.needs)} (${needsPct.toFixed(1)}%)`,
      `🎭 Wants:               ${NNUtils.formatCAD(v.wants)} (${wantsPct.toFixed(1)}%)`,
      `💰 Savings:             ${NNUtils.formatCAD(v.savings)} (${savPct.toFixed(1)}%)`,
      `💸 Remaining:           ${NNUtils.formatCAD(v.remaining)}`,
      `─────────────────────────`,
      `📈 Savings Rate:        ${savPct.toFixed(1)}%`,
      `🏆 Budget Health Score: ${score}/100`,
      `🗓 Annual Savings:      ${NNUtils.formatCAD((v.savings + Math.max(0, v.remaining)) * 12)}`
    ], 'Budget Calculator');
  });

  /* ── RESET ───────────────────────────────── */
  document.getElementById('reset-btn')?.addEventListener('click', function () {
    incomeEl.value = '';
    Object.keys(FIELDS).forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; el.classList.remove('has-value'); }
    });
    ['annual-bonus','irregular-income','emergency-goal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    Object.keys(SECTION_META).forEach(s => updateSectionTotal(s));
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
    placeholder.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    const af = document.getElementById('advanced-fields');
    const at = document.getElementById('advanced-toggle');
    if (af) af.classList.remove('is-open');
    if (at) at.setAttribute('aria-expanded', 'false');
    NNUtils.clearError(incomeEl, 'income-error');
  });

});

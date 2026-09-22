/* =============================================
   NORTHERN NUMBERS — nn-utils.js
   Shared Utilities for All Calculators

   Every calculator uses these functions.
   Never redefine formatCAD, parseInputNumber,
   attachFormatter, etc in individual JS files.
============================================= */
'use strict';

window.NNUtils = {

  /* ── MONEY ROUNDING ──
     Rounds a dollar amount to the nearest cent, half-up (half away from zero,
     so -x rounds symmetrically to +x). Binary floating point can leave an exact
     half-cent just below the tie (83716.62 / 12 is 6976.384999999999, not
     6976.385), which plain Math.round / toFixed / Intl.NumberFormat round DOWN.
     toPrecision(15) strips that noise (double arithmetic is accurate to ~15-16
     significant digits), and shifting the decimal point through an exponent
     string keeps the x100 / x0.01 steps exact. Returns a number of dollars, e.g.
     6976.39, ready for NNUtils.formatCAD. Use it once, on the final displayed
     value; do not round intermediate steps. */
  roundMoney: function(n) {
    const x = Number(n);
    if (!isFinite(x)) return x;
    const abs = Math.abs(x);
    if (abs < 1e-6) return 0;      // rounds to $0.00 (also avoids exponent-form strings below)
    if (abs >= 1e15) return x;     // beyond the 15 digits this method can clean safely
    const cents = Math.round(Number(Number(abs.toPrecision(15)) + 'e2'));
    const dollars = Number(cents + 'e-2');
    return x < 0 && dollars !== 0 ? -dollars : dollars;
  },

  /* ── FORMATTING ── */
  formatCAD: function(n) {
    return new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0);
  },
  formatCAD0: function(n) {
    return new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',minimumFractionDigits:0,maximumFractionDigits:0}).format(n||0);
  },
  formatNumber: function(n) {
    return new Intl.NumberFormat('en-CA',{minimumFractionDigits:0,maximumFractionDigits:0}).format(n||0);
  },
  formatPct: function(decimal, digits) {
    return ((decimal||0)*100).toFixed(digits||1) + '%';
  },
  formatInputNumber: function(v) {
    const n = parseFloat(String(v).replace(/[^0-9.]/g,''));
    return isNaN(n) ? '' : new Intl.NumberFormat('en-CA',{minimumFractionDigits:0,maximumFractionDigits:0}).format(n);
  },
  parseInputNumber: function(v) {
    return parseFloat(String(v).replace(/[^0-9.]/g,'')) || 0;
  },
  formatMonthYear: function(date) {
    return date ? date.toLocaleDateString('en-CA',{month:'long',year:'numeric'}) : '';
  },

  /* ── INPUT FORMATTER ── */
  attachFormatter: function(inputEl) {
    if (!inputEl) return;
    function fmt() {
      const raw = this.value.replace(/[^0-9]/g,'');
      if (!raw) { this.value=''; return; }
      const num = parseInt(raw,10);
      const formatted = isNaN(num) ? '' : new Intl.NumberFormat('en-CA',{minimumFractionDigits:0,maximumFractionDigits:0}).format(num);
      const sel = this.selectionStart, prev = this.value.length;
      this.value = formatted;
      try { this.setSelectionRange(Math.max(0,sel+(this.value.length-prev)),Math.max(0,sel+(this.value.length-prev))); } catch(e) {}
    }
    inputEl.addEventListener('input', fmt);
    inputEl.addEventListener('change', fmt);
  },
  attachFormatters: function() {
    Array.from(arguments).forEach(el => this.attachFormatter(el));
  },

  /* ── VALIDATION ── */
  setError: function(inputEl, errorElId, msg) {
    if (inputEl) inputEl.classList.add('is-error');
    const el = document.getElementById(errorElId);
    if (el) { el.textContent = msg; }
  },
  clearError: function(inputEl, errorElId) {
    if (inputEl) inputEl.classList.remove('is-error');
    const el = document.getElementById(errorElId);
    if (el) { el.textContent = ''; }
  },

  /* ── COPY RESULTS ── */
  copyResults: function(btnEl, lines, calculatorName) {
    if (!btnEl) return;
    const text = [`📊 ${calculatorName} — Northern Numbers`,'─────────────────────────',...lines,'─────────────────────────',`Calculated at ${window.location.href}`].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      btnEl.textContent = '✅ Copied!';
      btnEl.classList.add('copied');
      if (window.NNAnalytics) NNAnalytics.trackCopy(calculatorName);
      setTimeout(() => { btnEl.textContent = '📋 Copy Results to Clipboard'; btnEl.classList.remove('copied'); }, 2500);
    }).catch(() => { btnEl.textContent = 'Copy not supported in this browser'; });
  },

  /* ── SCROLL TO RESULTS (first time only) ── */
  scrollToResults: function(headingId, wasHidden) {
    if (!wasHidden) return;
    const el = document.getElementById(headingId);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior:'smooth' });
  },

  /* ── SCROLL TO CALCULATOR TOP (after Reset) ──
     Every calculator page has .calc-page-header (and .calc-breadcrumb
     above it) at the top of its own content, above the input/results
     panels. Call this at the end of a Reset handler, after the reset
     defaults have already been applied, so the user lands back at the
     top of the calculator rather than the top of the whole webpage
     (site header/nav). Fails safely (no-op) if neither element exists. */
  scrollToCalcTop: function() {
    const el = document.querySelector('.calc-page-header') || document.querySelector('.calc-breadcrumb');
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  },

  /* ── INFO TOOLTIPS ──
     Wires up .info-tip / .info-tip-btn / .info-tip-text markup (see
     styles.css). Hover and keyboard focus are handled by CSS alone; this
     adds tap-to-toggle for touch devices, Escape-to-dismiss, and
     outside-click dismissal. Safe to call more than once per page (or with
     a `root` scoping to newly-rendered content) — each .info-tip is only
     wired once (data-tip-bound) and the shared document-level listeners are
     only bound once. Reference implementation: salary-vs-hourly.js. */
  initInfoTips: function(root) {
    const scope = root || document;
    scope.querySelectorAll('.info-tip').forEach(tip => {
      if (tip.dataset.tipBound) return;
      tip.dataset.tipBound = '1';
      const btn = tip.querySelector('.info-tip-btn');
      if (!btn) return;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        NNUtils._closeInfoTips(tip);
        const open = !tip.classList.contains('is-open');
        tip.classList.toggle('is-open', open);
        tip.classList.remove('is-dismissed');
        btn.setAttribute('aria-expanded', String(open));
      });
      tip.addEventListener('mouseleave', () => tip.classList.remove('is-dismissed'));
      btn.addEventListener('blur', () => tip.classList.remove('is-dismissed'));
    });

    if (NNUtils._infoTipsBound) return;
    NNUtils._infoTipsBound = true;
    document.addEventListener('click', () => NNUtils._closeInfoTips());
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape') return;
      document.querySelectorAll('.info-tip').forEach(tip => {
        if (tip.classList.contains('is-open') || tip.matches(':hover') || tip.contains(document.activeElement)) {
          tip.classList.add('is-dismissed');
        }
      });
      NNUtils._closeInfoTips();
    });
  },
  _closeInfoTips: function(except) {
    document.querySelectorAll('.info-tip').forEach(tip => {
      if (tip === except) return;
      tip.classList.remove('is-open');
      tip.querySelector('.info-tip-btn')?.setAttribute('aria-expanded', 'false');
    });
  },

  /* ── SUMMARY PILLS ── */
  renderSummaryPills: function(containerId, pills) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `<p style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--space-3)">Your projection is based on</p><div style="display:flex;flex-wrap:wrap;gap:var(--space-3)">${pills.map(p=>`<span class="summary-tag">${p}</span>`).join('')}</div>`;
    el.classList.remove('hidden');
  },

  /* ── CELEBRATION ── */
  renderCelebration: function(elId, message) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (message) { el.innerHTML = message; el.classList.remove('hidden'); }
    else { el.classList.add('hidden'); }
  },

  /* ── SLIDER SYNC ── */
  syncSlider: function(inputEl, sliderEl, opts) {
    if (!sliderEl || !inputEl) return;
    const isDollar = (opts||{}).isDollar || false;
    const onChange = (opts||{}).onChange || null;
    sliderEl.addEventListener('input', function() {
      const val = parseFloat(this.value);
      inputEl.value = isDollar ? NNUtils.formatInputNumber(val) : val;
      if (onChange) onChange(val);
    });
    inputEl.addEventListener('input', function() {
      const val = isDollar ? NNUtils.parseInputNumber(this.value) : parseFloat(this.value);
      if (!isNaN(val)) sliderEl.value = val;
    });
  },

  /* ── ADVANCED TOGGLE ── */
  initAdvancedToggle: function(toggleId, fieldsId) {
    const toggle = document.getElementById(toggleId);
    const fields = document.getElementById(fieldsId);
    if (!toggle || !fields) return;
    toggle.addEventListener('click', function() {
      const isOpen = fields.classList.toggle('is-open');
      this.setAttribute('aria-expanded', String(isOpen));
    });
  },

  /* ── YEAR-BY-YEAR TABLE TOGGLE ── */
  initTableToggle: function(toggleId, wrapperId) {
    const toggle  = document.getElementById(toggleId);
    const wrapper = document.getElementById(wrapperId);
    if (!toggle || !wrapper) return;
    toggle.addEventListener('click', function() {
      const isOpen = wrapper.classList.toggle('is-open');
      this.setAttribute('aria-expanded', String(isOpen));
    });
  },

  /* ── MATH HELPERS ── */
  inflationAdjust: function(fv, rate, years) {
    return rate > 0 ? fv / Math.pow(1 + rate/100, years) : fv;
  },
  toAnnualContribution: function(amount, frequency) {
    const map = {monthly:12,biweekly:26,weekly:52,quarterly:4,yearly:1,onetime:0};
    return amount * (map[frequency] || 1);
  },
  rule72: function(rate) {
    return rate > 0 ? (72 / rate).toFixed(1) : '—';
  },
  /* Converts NN.FED_BRACKETS/NN.PROV_BRACKETS' {min,max,rate} shape into
     [max, rate] tuples — shared so capital-gains.js and dividend-tax.js
     (the two calculators that stack tax on top of other income bracket-
     by-bracket) can't drift from each other's copy of this adapter. */
  bracketsToTuples: function(brackets) {
    return brackets.map(b => [b.max, b.rate]);
  }
};

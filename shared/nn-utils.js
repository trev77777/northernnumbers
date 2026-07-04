/* =============================================
   NORTHERN NUMBERS — nn-utils.js
   Shared Utilities for All Calculators

   Every calculator uses these functions.
   Never redefine formatCAD, parseInputNumber,
   attachFormatter, etc in individual JS files.
============================================= */
'use strict';

window.NNUtils = {

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
  }
};

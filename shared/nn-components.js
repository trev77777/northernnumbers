/* =============================================
   NORTHERN NUMBERS — nn-components.js
   Shared UI Components

   Renders header, footer, disclaimer from one
   place. Edit here — every page updates.

   Uses NNRegistry (nn-calculators.js) for
   footer links and nav automatically.
============================================= */
'use strict';

window.NNComponents = window.NNComponents || {};
const NNComponents = window.NNComponents;

/* ─── NAV LINKS ──────────────────────────── */
NNComponents.NAV_LINKS = [
  { href:'/',             label:'Home'     },
  { href:'/mortgage/',    label:'Mortgage' },
  { href:'/finance/',     label:'Finance'  },
  { href:'/about.html',   label:'About'    },
  { href:'/contact.html', label:'Contact'  }
];

NNComponents.FOOTER_LEGAL = [
  { href:'/privacy-policy.html', label:'Privacy Policy' },
  { href:'/terms-of-use.html',   label:'Terms of Use'   },
  { href:'/disclaimer.html',     label:'Disclaimer'     }
];

/* Province dropdown HTML — used in all province selectors */
NNComponents.PROVINCE_OPTIONS = `
  <option value="ON">Ontario</option>
  <option value="AB">Alberta</option>
  <option value="BC">British Columbia</option>
  <option value="MB">Manitoba</option>
  <option value="SK">Saskatchewan</option>
  <option value="QC">Quebec</option>
  <option value="NB">New Brunswick</option>
  <option value="NS">Nova Scotia</option>
  <option value="PE">Prince Edward Island</option>
  <option value="NL">Newfoundland &amp; Labrador</option>
  <option value="YT">Yukon</option>
  <option value="NT">Northwest Territories</option>
  <option value="NU">Nunavut</option>`;

/* ─── ACTIVE NAV DETECTION ───────────────── */
NNComponents.getActiveHref = function() {
  const path = window.location.pathname;
  if (path === '/' || path === '/index.html') return '/';
  const candidates = NNComponents.NAV_LINKS.map(l => l.href).filter(h => h !== '/').sort((a,b) => b.length - a.length);
  for (const href of candidates) { if (path.startsWith(href)) return href; }
  return null;
};

/* ─── LOGO SVG ───────────────────────────── */
NNComponents.LOGO_SVG = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M14 2L16.5 8.5H23L17.5 12.5L19.5 19L14 15.5L8.5 19L10.5 12.5L5 8.5H11.5L14 2Z" fill="#D52B1E"/><rect x="12.5" y="19" width="3" height="5" fill="#D52B1E"/></svg>`;
NNComponents.LOGO_SVG_SM = `<svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M14 2L16.5 8.5H23L17.5 12.5L19.5 19L14 15.5L8.5 19L10.5 12.5L5 8.5H11.5L14 2Z" fill="#D52B1E"/><rect x="12.5" y="19" width="3" height="5" fill="#D52B1E"/></svg>`;

/* ─── RENDER HEADER ──────────────────────── */
NNComponents.renderHeader = function(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const activeHref = NNComponents.getActiveHref();

  const navItems = NNComponents.NAV_LINKS.map(link => {
    const isActive = link.href === activeHref;
    return `<li><a href="${link.href}" class="nav-link${isActive?' active':''}"${isActive?' aria-current="page"':''}>${link.label}</a></li>`;
  }).join('');

  const mobileItems = NNComponents.NAV_LINKS.map(l =>
    `<li><a href="${l.href}" class="mobile-nav-link">${l.label}</a></li>`
  ).join('');

  el.innerHTML = `
    <div class="container header-inner">
      <a href="/" class="logo" aria-label="Northern Numbers — Home">
        <span class="logo-icon">${NNComponents.LOGO_SVG}</span>
        <span class="logo-text">Northern Numbers</span>
      </a>
      <nav class="main-nav" aria-label="Main navigation"><ul role="list">${navItems}</ul></nav>
      <button class="nav-toggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="mobile-menu">
        <span class="hamburger-line"></span><span class="hamburger-line"></span><span class="hamburger-line"></span>
      </button>
    </div>
    <div id="mobile-menu" class="mobile-menu" aria-hidden="true">
      <nav aria-label="Mobile navigation"><ul role="list">${mobileItems}</ul></nav>
    </div>`;

  // ── Wire up hamburger immediately after rendering ──────────────
  // Do NOT rely on script.js timing. Bind here, right now.
  const toggle = el.querySelector('.nav-toggle');
  const menu   = el.querySelector('#mobile-menu');

  if (toggle && menu) {
    function openMenu() {
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close navigation menu');
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation menu');
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    toggle.addEventListener('click', function() {
      toggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
    });
    menu.addEventListener('click', function(e) {
      if (e.target.closest('.mobile-nav-link')) closeMenu();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeMenu(); toggle.focus();
      }
    });
    window.addEventListener('resize', function() {
      if (window.innerWidth >= 768) closeMenu();
    }, { passive: true });
  }
};

/* ─── RENDER FOOTER ──────────────────────── */
NNComponents.renderFooter = function(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const year = new Date().getFullYear();

  // ── Pull from registry (single source of truth) ──────────────
  // To add a calculator to the footer: set showInFooter:true in nn-calculators.js
  // footerSection:'calculators' → left column
  // footerSection:'moreTools'   → right column (coming soon style if not active)
  //
  // Footer stays clean at 200+ calculators because showInFooter is false by default.
  // Only calculators explicitly marked showInFooter:true appear here.

  let calcColLinks  = '';
  let moreColLinks  = '';

  if (window.NNRegistry) {
    const footerCalcs = NNRegistry.getFooterCalcs(); // active + showInFooter:true

    // Split by footerSection
    const mainCalcs = footerCalcs.filter(c => c.footerSection !== 'moreTools');
    const moreCalcs = footerCalcs.filter(c => c.footerSection === 'moreTools');

    // Planned calcs that aren't in footer yet → show as disabled in More Tools
    const plannedNames = NNRegistry.getPlanned()
      .filter(c => !moreCalcs.find(m => m.id === c.id))
      .slice(0, Math.max(0, 5 - moreCalcs.length))
      .map(c => c.name);

    calcColLinks = mainCalcs.map(c => `<li><a href="${c.url}">${c.name}</a></li>`).join('');
    moreColLinks = [
      ...moreCalcs.map(c => `<li><a href="${c.url}">${c.name}</a></li>`),
      ...plannedNames.map(n => `<li><span class="footer-disabled">${n}</span></li>`)
    ].join('');

  } else {
    // Hardcoded fallback — only used if nn-calculators.js fails to load
    calcColLinks = [
      {name:'Mortgage',          url:'/mortgage/'},
      {name:'TFSA',              url:'/tfsa/'},
      {name:'RRSP',              url:'/rrsp/'},
      {name:'FHSA',              url:'/fhsa/'},
      {name:'Compound Interest', url:'/compound-interest/'}
    ].map(c => `<li><a href="${c.url}">${c.name}</a></li>`).join('');
    moreColLinks = ['Car Loan','Loan Calculator','Budget','Inflation','Retirement']
      .map(n => `<li><span class="footer-disabled">${n}</span></li>`).join('');
  }

  const legalLinks  = NNComponents.FOOTER_LEGAL.map(l => `<li><a href="${l.href}">${l.label}</a></li>`).join('');

  el.innerHTML = `
    <div class="container footer-inner">
      <div class="footer-brand">
        <a href="/" class="logo logo--light" aria-label="Northern Numbers — Home">
          <span class="logo-icon">${NNComponents.LOGO_SVG_SM}</span>
          <span class="logo-text">Northern Numbers</span>
        </a>
        <p class="footer-tagline">Smart Canadian Calculators</p>
        <p class="footer-desc">Free, accurate financial tools built for Canadians. No sign-up required.</p>
      </div>
      <nav class="footer-nav" aria-label="Footer navigation">
        <div class="footer-nav-col">
          <h4 class="footer-nav-heading">Calculators</h4>
          <ul role="list">${calcColLinks}</ul>
        </div>
        <div class="footer-nav-col">
          <h4 class="footer-nav-heading">More Tools</h4>
          <ul role="list">${moreColLinks}</ul>
        </div>
        <div class="footer-nav-col">
          <h4 class="footer-nav-heading">Site</h4>
          <ul role="list">
            <li><a href="/about.html">About</a></li>
            <li><a href="/contact.html">Contact</a></li>
          </ul>
        </div>
        <div class="footer-nav-col">
          <h4 class="footer-nav-heading">Legal</h4>
          <ul role="list">${legalLinks}</ul>
        </div>
      </nav>
    </div>
    <div class="footer-bottom">
      <div class="container footer-bottom-inner">
        <p class="footer-legal">© ${year} Northern Numbers. All rights reserved. Results are estimates only and do not constitute financial advice.</p>
        <p class="footer-built">Built for Canadians. <span style="color:#D52B1E;font-weight:700;">&#127809;</span></p>
      </div>
    </div>`;
};

/* ─── RENDER DISCLAIMER ──────────────────── */
NNComponents.renderDisclaimer = function(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="calc-disclaimer">Results are estimates only and should not replace professional financial, tax, or legal advice. Consult a registered financial advisor before making any financial decision. <a href="/disclaimer.html">Full disclaimer →</a></div>`;
};

NNComponents.DISCLAIMER_TEXT = 'Results are estimates only and should not replace professional financial, tax, or legal advice.';

/* ─── RENDER RELATED CALCULATORS ────────── */
NNComponents.renderRelated = function(containerId, relatedIds) {
  const el = document.getElementById(containerId);
  if (!el || !window.NNRegistry) return;

  const calcs = relatedIds
    ? relatedIds.map(id => NNRegistry.getById(id)).filter(Boolean)
    : [];

  if (!calcs.length) return;

  const links = calcs.map(c =>
    `<a href="${c.url}" style="padding:var(--space-2) var(--space-4);background:var(--color-primary-light);border:1px solid rgba(213,43,30,.2);border-radius:var(--radius-full);font-size:var(--text-sm);font-weight:600;color:var(--color-primary);text-decoration:none">${c.icon || ''} ${c.name}</a>`
  ).join('');

  el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:var(--space-3)">${links}</div>`;
};

/* ─── CALCULATOR GRID RENDERING ─────────────────────────────────────── */
/* Renders all active calculators dynamically from the registry.
   Used by index.html (home) and finance/index.html.
   Adding a new calculator only requires updating nn-calculators.js. */

NNComponents.renderCalcGrid = function(containerId) {
  const el = document.getElementById(containerId);
  if (!el || !window.NNRegistry) return;
  const calcs = window.NNRegistry.calculators.filter(c => c.status === 'active' && c.showOnHomepage !== false);
  calcs.sort((a,b) => (a.priority||99) - (b.priority||99));
  el.innerHTML = calcs.map(c => `
    <article class="calc-card" role="listitem" data-category="${c.category||'finance'}" data-tags="${(c.keywords||[]).join(' ')} ${c.name.toLowerCase()}">
      <div class="calc-card-icon" aria-hidden="true" style="font-size:1.75rem;line-height:1">${c.icon||'🧮'}</div>
      <div class="calc-card-body">
        <h3 class="calc-card-title">${c.name}</h3>
        <p class="calc-card-desc">${c.description||''}</p>
      </div>
      <a href="${c.url}" class="btn btn-calc" aria-label="Open ${c.name}">Calculate →</a>
    </article>`).join('');
};

NNComponents.renderFinanceGrid = function(containerId) {
  const el = document.getElementById(containerId);
  if (!el || !window.NNRegistry) return;
  const calcs = window.NNRegistry.calculators.filter(c => c.status === 'active');
  calcs.sort((a,b) => (a.priority||99) - (b.priority||99));
  el.innerHTML = calcs.map(c => `
    <a href="${c.url}" class="calc-card">
      <div class="calc-card-icon">${c.icon||'🧮'}</div>
      <div>
        <div class="calc-card-title">${c.name}</div>
        <div class="calc-card-desc">${c.description||''}</div>
      </div>
      <div class="calc-card-footer">
        <span class="calc-card-tag">Live</span>
        <span class="calc-card-arrow">→</span>
      </div>
    </a>`).join('');
};

/* ─── AUTO-INIT ──────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  // Render header/footer/disclaimer if placeholders exist
  if (document.getElementById('nn-header'))     NNComponents.renderHeader('nn-header');
  if (document.getElementById('nn-footer'))     NNComponents.renderFooter('nn-footer');
  if (document.getElementById('nn-disclaimer')) NNComponents.renderDisclaimer('nn-disclaimer');
  if (document.getElementById('nn-related'))    NNComponents.renderRelated('nn-related');
  // Render calculator grids — use setTimeout to ensure NNRegistry is fully ready
  // nn-calculators.js sets window.NNRegistry at parse time, but defer order
  // guarantees it runs before nn-components.js, so NNRegistry exists here.
  // Render grids — use requestAnimationFrame to ensure all defer scripts
  // have finished executing before we try to read NNRegistry
  function renderGrids() {
    if (document.getElementById('nn-calc-grid'))    NNComponents.renderCalcGrid('nn-calc-grid');
    if (document.getElementById('nn-finance-grid')) NNComponents.renderFinanceGrid('nn-finance-grid');
    if (typeof window._nnCardAnimation === 'function') window._nnCardAnimation();
  }

  if (window.NNRegistry) {
    renderGrids();
  } else {
    // Fallback: wait one tick for nn-calculators.js to finish
    setTimeout(renderGrids, 0);
  }

  // Update all footer years
  document.querySelectorAll('#footer-year').forEach(el => el.textContent = new Date().getFullYear());

  // Fire mobile nav setup AFTER header is rendered
  // This ensures the hamburger button exists before script.js tries to bind to it
  if (typeof window._nnNavSetup === 'function') {
    window._nnNavSetup();
  }
});

window.NNComponents = NNComponents;

/* =============================================
   NORTHERN NUMBERS — script.js
   Global JavaScript for NorthernNumbers.ca
   Handles: mobile nav, search, footer year
   ============================================= */

'use strict';

/* =============================================
   1. MOBILE NAVIGATION
   ============================================= */
(function initMobileNav() {
  // Use event delegation so this works even when header is
  // rendered dynamically by nn-components.js after DOMContentLoaded
  function setup() {
    const toggle = document.querySelector('.nav-toggle');
    const menu   = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;

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

    function toggleMenu() {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      isOpen ? closeMenu() : openMenu();
    }

    toggle.addEventListener('click', toggleMenu);

    // Event delegation — catches links even if added by nn-components.js
    menu.addEventListener('click', function(e) {
      if (e.target.closest('.mobile-nav-link')) closeMenu();
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        toggle.focus();
      }
    });

    window.addEventListener('resize', function() {
      if (window.innerWidth >= 768) closeMenu();
    }, { passive: true });
  }

  // Run immediately for static headers
  setup();

  // Also run after DOM settles for dynamic headers (nn-components.js)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    // If already loaded, give nn-components a tick to render
    setTimeout(setup, 0);
  }
})();


/* =============================================
   2. CALCULATOR SEARCH
   ============================================= */
(function initSearch() {
  const searchInput   = document.getElementById('calculator-search');
  const resultsBox    = document.getElementById('search-results');

  if (!searchInput || !resultsBox) return;

  // All calculators — extend this list as new calcs are added
  const calculators = [
    {
      name: 'Mortgage Calculator',
      desc: 'Monthly payments, amortization schedule, total interest',
      href: '/mortgage/',
      tags: 'mortgage home house payment amortization interest rate down payment'
    },
    {
      name: 'TFSA Calculator',
      desc: 'Contribution room and tax-free growth projections',
      href: '/tfsa/',
      tags: 'tfsa savings tax-free investment contribution room'
    },
    {
      name: 'RRSP Calculator',
      desc: 'Contribution limit, tax refund, retirement growth',
      href: '/rrsp/',
      tags: 'rrsp retirement savings deduction tax refund'
    },
    {
      name: 'FHSA Calculator',
      desc: 'First Home Savings Account planning',
      href: '/fhsa/',
      tags: 'fhsa first home savings account buyer'
    },
    {
      name: 'Compound Interest Calculator',
      desc: 'See how money grows with compounding',
      href: '/compound-interest/',
      tags: 'compound interest growth investment savings'
    },
    {
      name: 'Loan Calculator',
      desc: 'Monthly payments and total cost for any loan',
      href: '/loan/',
      tags: 'loan personal payment interest rate borrow'
    },
    {
      name: 'Car Loan Calculator',
      desc: 'Monthly car payments including HST and trade-in',
      href: '/car-loan/',
      tags: 'car loan auto vehicle payment financing hst'
    },
    {
      name: 'Budget Calculator',
      desc: 'Monthly income vs expenses breakdown',
      href: '/budget/',
      tags: 'budget income expenses savings monthly spending'
    },
    {
      name: 'Inflation Calculator',
      desc: 'Compare purchasing power using Canadian CPI data',
      href: '/inflation/',
      tags: 'inflation purchasing power cpi cost of living canada'
    },
    {
      name: 'Retirement Calculator',
      desc: 'CPP, OAS, and RRSP retirement projections',
      href: '/retirement/',
      tags: 'retirement savings cpp oas nest egg projection'
    }
  ];

  /**
   * Filters calculators by query string.
   * Matches against name, desc, and tags.
   */
  function filterCalcs(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return calculators.filter(calc => {
      return (
        calc.name.toLowerCase().includes(q) ||
        calc.desc.toLowerCase().includes(q) ||
        calc.tags.toLowerCase().includes(q)
      );
    });
  }

  /**
   * Renders results into the results box.
   */
  function renderResults(results, query) {
    resultsBox.innerHTML = '';

    if (results.length === 0) {
      resultsBox.innerHTML = `
        <p class="search-no-results">
          No calculators found for "<strong>${escapeHtml(query)}</strong>" —
          <a href="/#calculators">browse all calculators</a>.
        </p>`;
      resultsBox.classList.add('is-visible');
      return;
    }

    results.forEach(calc => {
      const a = document.createElement('a');
      a.href = calc.href;
      a.className = 'search-result-item';
      a.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5" stroke="#D52B1E" stroke-width="1.5"/>
          <path d="M10.5 10.5L13 13" stroke="#D52B1E" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>
          <strong>${escapeHtml(calc.name)}</strong>
          <br><small style="color:#6B7280">${escapeHtml(calc.desc)}</small>
        </span>
      `;
      resultsBox.appendChild(a);
    });

    resultsBox.classList.add('is-visible');
  }

  function hideResults() {
    resultsBox.classList.remove('is-visible');
    resultsBox.innerHTML = '';
  }

  // Simple XSS guard
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Debounce — avoid running on every keystroke
  let debounceTimer;
  searchInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    const query = this.value.trim();

    if (!query) {
      hideResults();
      return;
    }

    debounceTimer = setTimeout(function () {
      const results = filterCalcs(query);
      renderResults(results, query);
    }, 200);
  });

  // Hide results when clicking outside
  document.addEventListener('click', function (e) {
    if (!searchInput.contains(e.target) && !resultsBox.contains(e.target)) {
      hideResults();
    }
  });

  // Hide results on Escape
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      hideResults();
      this.blur();
    }
  });

  // Keyboard navigation within results
  searchInput.addEventListener('keydown', function (e) {
    const items = resultsBox.querySelectorAll('.search-result-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[0].focus();
    }
  });

  resultsBox.addEventListener('keydown', function (e) {
    const items = Array.from(resultsBox.querySelectorAll('.search-result-item'));
    const current = document.activeElement;
    const idx = items.indexOf(current);

    if (e.key === 'ArrowDown' && idx < items.length - 1) {
      e.preventDefault();
      items[idx + 1].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx === 0) {
        searchInput.focus();
      } else {
        items[idx - 1].focus();
      }
    } else if (e.key === 'Escape') {
      hideResults();
      searchInput.focus();
    }
  });
})();


/* =============================================
   3. FOOTER — Auto-update copyright year
   ============================================= */
(function updateFooterYear() {
  const yearEl = document.getElementById('footer-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();


/* =============================================
   4. SMOOTH SCROLL — for anchor links
   ============================================= */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const headerOffset = 80; // account for sticky header
      const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();


/* =============================================
   4b. COMING SOON CARDS
   Any .calc-card with [data-coming-soon="true"]
   gets its Calculate button swapped for a disabled
   "Coming Soon" pill with a tooltip, and its link
   removed so it can't be clicked or reached by
   keyboard tab navigation.

   TO RE-ENABLE A CALCULATOR: in the HTML, simply
   remove the data-coming-soon attribute (or change
   it to "false") on that card's <article> element.
   This script will leave the original Calculate
   button and link untouched automatically.
   ============================================= */
(function initComingSoonCards() {
  const comingSoonCards = document.querySelectorAll('.calc-card[data-coming-soon="true"]');

  comingSoonCards.forEach(function (card) {
    const link = card.querySelector('a.btn-calc');
    if (!link) return; // already converted or no button present

    const calcName = card.querySelector('.calc-card-title')?.textContent.trim() || 'This calculator';

    // Build the disabled replacement element
    const pill = document.createElement('span');
    pill.className = 'btn-coming-soon';
    pill.setAttribute('tabindex', '0'); // focusable for keyboard tooltip, but not a link
    pill.setAttribute('role', 'note');
    pill.setAttribute('aria-label', `${calcName} is coming soon. This calculator is currently in development and will be available soon.`);
    pill.setAttribute('data-tooltip', 'This calculator is currently in development and will be available soon.');
    pill.textContent = 'Coming Soon';

    link.replaceWith(pill);

    // Mark the whole card as disabled for styling + cursor behavior
    card.style.cursor = 'default';
  });
})();


/* =============================================
   5. HEADER — Add shadow on scroll
   ============================================= */
(function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  window.addEventListener('scroll', function () {
    if (window.scrollY > 10) {
      header.style.boxShadow = '0 2px 16px rgba(0,0,0,0.10)';
    } else {
      header.style.boxShadow = '';
    }
  }, { passive: true });
})();


/* =============================================
   6. CALC CARD — Animate on scroll into view
   ============================================= */
(function initCardAnimation() {
  const cards = document.querySelectorAll('.calc-card');
  if (!cards.length) return;

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  cards.forEach(function (card, i) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = `opacity 0.4s ease ${i * 50}ms, transform 0.4s ease ${i * 50}ms`;
    observer.observe(card);
  });
})();

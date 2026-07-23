/* =============================================
   NORTHERN NUMBERS — nn-calculators.js
   Central Calculator Registry

   This is the SINGLE SOURCE OF TRUTH for all
   calculators on the site.

   Adding a calculator here makes it appear in:
   - Footer (if showInFooter: true)
   - Homepage grid (if showOnHomepage: true)
   - Category pages (via category field)
   - Sitemap (generated from this file)
   - Related calculator links
   - Finance/category hub pages

   DO NOT hardcode calculator links anywhere else.
   Always reference NNRegistry.

   STATUS: 'active' | 'planned' | 'coming-soon'
============================================= */
'use strict';

window.NNRegistry = {

  /* ─── CATEGORIES ─────────────────────────── */
  categories: [
    { id: 'mortgage',        label: '🏠 Mortgage',         url: '/mortgage/'         },
    { id: 'investing',       label: '📈 Investing',         url: '/investing/'        },
    { id: 'retirement',      label: '🏖 Retirement',        url: '/retirement/'       },
    { id: 'taxes',           label: '📋 Taxes',             url: '/taxes/'            },
    { id: 'loans',           label: '💳 Loans',             url: '/loans/'            },
    { id: 'savings',         label: '💰 Savings',           url: '/savings/'          },
    { id: 'personal',        label: '👤 Personal Finance',  url: '/personal-finance/' },
    { id: 'banking',         label: '🏦 Banking',           url: '/banking/'          },
    { id: 'business',        label: '🏢 Business',          url: '/business/'         }
  ],

  /* ─── CALCULATORS ────────────────────────── */
  calculators: [

    /* ── MORTGAGE ── */
    {
      id: 'mortgage', name: 'Mortgage Calculator', category: 'mortgage',
      url: '/mortgage/', icon: '🏠',
      description: 'Calculate monthly payments, total interest, and full amortization. Built with Canadian semi-annual compounding and CMHC insurance.',
      keywords: ['mortgage calculator Canada','canadian mortgage calculator','cmhc calculator','mortgage payment calculator'],
      status: 'active', priority: 1,
      showInFooter: true, footerSection: 'calculators', showOnHomepage: true,
      related: ['tfsa','fhsa','compound-interest']
    },

    /* ── TFSA ── */
    {
      id: 'tfsa', name: 'TFSA Calculator', category: 'savings',
      url: '/tfsa/', icon: '💰',
      description: 'Project your Tax-Free Savings Account growth, track contribution room by birth year, and see when you\'ll hit $100K, $250K, and $500K.',
      keywords: ['tfsa calculator','tfsa contribution room 2026','tfsa calculator canada','tax free savings account calculator'],
      status: 'active', priority: 2,
      showInFooter: true, footerSection: 'calculators', showOnHomepage: true,
      related: ['rrsp','fhsa','compound-interest']
    },

    /* ── RRSP ── */
    {
      id: 'rrsp', name: 'RRSP Calculator', category: 'retirement',
      url: '/rrsp/', icon: '📈',
      description: 'Estimate your RRSP growth, calculate your tax refund by province, and compare reinvesting your refund vs not.',
      keywords: ['rrsp calculator','rrsp tax refund calculator canada','rrsp contribution limit 2026','rrsp calculator canada'],
      status: 'active', priority: 3,
      showInFooter: true, footerSection: 'calculators', showOnHomepage: true,
      related: ['tfsa','fhsa','compound-interest','retirement']
    },

    /* ── FHSA ── */
    {
      id: 'fhsa', name: 'FHSA Calculator', category: 'savings',
      url: '/fhsa/', icon: '🏡',
      description: 'Plan your first home purchase with couple mode, down payment tracker, HBP combination, and home buying timeline.',
      keywords: ['fhsa calculator','first home savings account calculator','fhsa 2026','fhsa canada calculator'],
      status: 'active', priority: 4,
      showInFooter: true, footerSection: 'calculators', showOnHomepage: true,
      related: ['mortgage','tfsa','rrsp']
    },

    /* ── COMPOUND INTEREST ── */
    {
      id: 'compound-interest', name: 'Compound Interest Calculator', category: 'investing',
      url: '/compound-interest/', icon: '📊',
      description: 'See how compound interest grows your investments over time. Includes Rule of 72, milestone tracker, two-scenario comparison, and monthly income projection.',
      keywords: ['compound interest calculator canada','investment growth calculator','compound interest calculator','future value calculator canada'],
      status: 'active', priority: 5,
      showInFooter: true, footerSection: 'calculators', showOnHomepage: true,
      related: ['tfsa','rrsp','retirement']
    },

    /* ── PLANNED CALCULATORS ── (change status to 'active' when built) */
    {
      id: 'car-loan', name: 'Car Loan Calculator', category: 'loans',
      url: '/car-loan/', icon: '🚗',
      description: 'Calculate monthly payments, total interest, and true cost of ownership for your next vehicle purchase in Canada.',
      keywords: ['car loan calculator canada','auto loan calculator canada','vehicle loan calculator'],
      status: 'active', priority: 6,
      showInFooter: true, footerSection: 'moreTools', showOnHomepage: true,
      related: ['loan','mortgage','budget','compound-interest']
    },
    {
      id: 'loan', name: 'Loan Calculator', category: 'loans',
      url: '/loan/', icon: '💳',
      description: 'Calculate payments and total interest for any personal loan, student loan, or line of credit in Canada.',
      keywords: ['loan calculator canada','personal loan calculator','line of credit calculator canada'],
      status: 'active', priority: 7,
      showInFooter: true, footerSection: 'moreTools', showOnHomepage: true,
      related: ['car-loan','mortgage','budget','compound-interest']
    },
    {
      id: 'retirement', name: 'Retirement Calculator', category: 'retirement',
      url: '/retirement/', icon: '🏖',
      description: 'Plan your Canadian retirement with CPP, OAS, and personal savings projections. Find out if you\'re on track.',
      keywords: ['retirement calculator canada','canadian retirement planning calculator','cpp oas calculator'],
      status: 'planned', priority: 8,
      showInFooter: false, showOnHomepage: true,
      related: ['rrsp','cpp','oas','compound-interest']
    },
    {
      id: 'resp', name: 'RESP Calculator', category: 'savings',
      url: '/resp/', icon: '🎓',
      description: 'Calculate RESP growth with the 20% Canada Education Savings Grant (CESG) and project education savings for your child.',
      keywords: ['resp calculator canada','cesg calculator','education savings calculator canada'],
      status: 'active', priority: 9,
      showInFooter: true, footerSection: 'calculators', showOnHomepage: true,
      related: ['tfsa','compound-interest','rrsp','fhsa']
    },
    {
      id: 'budget', name: 'Budget Calculator', category: 'personal',
      url: '/budget/', icon: '📋',
      description: 'Build a monthly budget using the 50/30/20 rule. Track income, expenses, and savings goals with Canadian context.',
      keywords: ['budget calculator canada','50 30 20 budget canada','monthly budget calculator'],
      status: 'active', priority: 10,
      showInFooter: true, footerSection: 'moreTools', showOnHomepage: true,
      related: ['tfsa','rrsp','fhsa','compound-interest']
    },
    {
      id: 'inflation', name: 'Inflation Calculator', category: 'personal',
      url: '/inflation/', icon: '📉',
      description: 'See how inflation erodes purchasing power over time using Canadian CPI data.',
      keywords: ['inflation calculator canada','cpi calculator canada','purchasing power calculator canada'],
      status: 'active', priority: 11,
      showInFooter: true, footerSection: 'moreTools', showOnHomepage: true,
      related: ['compound-interest','rrsp','tfsa','cpp']
    },
    {
      id: 'cpp', name: 'CPP Calculator', category: 'retirement',
      url: '/cpp/', icon: '🇨🇦',
      description: 'Estimate your Canada Pension Plan benefits at age 60, 65, or 70 based on your contributions.',
      keywords: ['cpp calculator','canada pension plan calculator','cpp benefit calculator 2026','when to take cpp'],
      status: 'active', priority: 12,
      showInFooter: true, footerSection: 'moreTools', showOnHomepage: true,
      related: ['oas','retirement','rrsp','income-tax']
    },
    {
      id: 'oas', name: 'OAS Calculator', category: 'retirement',
      url: '/oas/', icon: '🏅',
      description: 'Calculate your Old Age Security pension, GIS eligibility, clawback amount, and deferral bonus.',
      keywords: ['oas calculator canada','old age security calculator','oas clawback calculator','gis calculator canada'],
      status: 'active', priority: 13,
      showInFooter: true, footerSection: 'moreTools', showOnHomepage: true,
      related: ['cpp','rrsp','retirement','income-tax']
    },
    {
      id: 'income-tax', name: 'Income Tax Calculator', category: 'taxes',
      url: '/income-tax/', icon: '📊',
      description: 'Calculate your federal and provincial income tax, marginal rate, effective rate, and after-tax income for all 13 provinces.',
      keywords: ['income tax calculator canada','tax calculator canada 2026','provincial tax calculator'],
      status: 'active', priority: 14,
      showInFooter: true, footerSection: 'moreTools', showOnHomepage: true,
      related: ['rrsp','tfsa','budget','cpp']
    },
    {
      id: 'gst-hst', name: 'GST/HST Calculator', category: 'taxes',
      url: '/gst-hst/', icon: '🧾',
      description: 'Calculate GST, HST, or PST for any Canadian province. Add or remove tax from any amount.',
      keywords: ['gst hst calculator canada','tax calculator canada','hst calculator ontario','sales tax calculator canada'],
      status: 'active', priority: 15,
      showInFooter: true, footerSection: 'moreTools', showOnHomepage: true,
      related: ['income-tax','budget','inflation','loan']
    },
    {
      id: 'land-transfer-tax', name: 'Land Transfer Tax Calculator', category: 'taxes',
      url: '/land-transfer-tax/', icon: '🏠',
      description: 'Calculate land transfer tax for every Canadian province. Includes first-time buyer rebates, Toronto municipal tax, and Quebec welcome tax.',
      keywords: ['land transfer tax calculator canada','ontario land transfer tax','bc property transfer tax','toronto land transfer tax','welcome tax calculator quebec'],
      status: 'active', priority: 19,
      showInFooter: true, footerSection: 'moreTools', showOnHomepage: true,
      related: ['mortgage','gst-hst','budget','inflation']
    },
    {
      id: 'rrif', name: 'RRIF Calculator', category: 'retirement',
      url: '/rrif/', icon: '📊',
      description: 'Calculate mandatory RRIF minimum withdrawals using official CRA prescribed factors. Project your balance and income to age 90+.',
      keywords: ['rrif calculator canada 2026','rrif minimum withdrawal calculator','rrif withdrawal table 2026'],
      status: 'active', priority: 18,
      showInFooter: true, footerSection: 'moreTools', showOnHomepage: true,
      related: ['rrsp','cpp','oas','income-tax']
    },
    {
      id: 'net-worth', name: 'Net Worth Calculator', category: 'personal',
      url: '/net-worth/', icon: '💎',
      description: 'Calculate your total assets, liabilities, and net worth. Compare to Canadian benchmarks by age.',
      keywords: ['net worth calculator canada','canadian net worth','average net worth canada by age'],
      status: 'active', priority: 17,
      showInFooter: true, footerSection: 'moreTools', showOnHomepage: true,
      related: ['tfsa','rrsp','budget','mortgage']
    },
    {
      id: 'paycheck', name: 'Paycheck Calculator', category: 'taxes',
      url: '/paycheck/', icon: '💵',
      description: 'Calculate your exact take-home pay after federal tax, provincial tax, CPP, CPP2, and EI for all provinces.',
      keywords: ['paycheck calculator canada 2026','take home pay calculator canada','salary after tax canada','net pay calculator canada'],
      status: 'active', priority: 16,
      showInFooter: true, footerSection: 'moreTools', showOnHomepage: true,
      related: ['income-tax','budget','rrsp','cpp']
    }
  ],

  /* ─── HELPER METHODS ────────────────────── */

  /** Get all active calculators */
  getActive: function() {
    return this.calculators.filter(c => c.status === 'active');
  },

  /** Get calculators for footer (showInFooter: true, active only) */
  getFooterCalcs: function() {
    return this.calculators.filter(c => c.showInFooter && c.status === 'active');
  },

  /** Get calculators for homepage grid */
  getHomepageCalcs: function() {
    return this.calculators.filter(c => c.showOnHomepage);
  },

  /** Get calculators by category */
  getByCategory: function(categoryId) {
    return this.calculators.filter(c => c.category === categoryId);
  },

  /** Get calculator by id */
  getById: function(id) {
    return this.calculators.find(c => c.id === id) || null;
  },

  /** Get related calculators for a given calculator id */
  getRelated: function(id) {
    const calc = this.getById(id);
    if (!calc || !calc.related) return [];
    return calc.related.map(rid => this.getById(rid)).filter(Boolean);
  },

  /** Get all planned calculators */
  getPlanned: function() {
    return this.calculators.filter(c => c.status === 'planned');
  },

  /** Generate sitemap entries (for all non-planned) */
  getSitemapEntries: function() {
    return this.calculators
      .filter(c => c.status === 'active')
      .map(c => ({ url: c.url, priority: (1 - (c.priority * 0.05)).toFixed(1) }));
  }
};

/* ── Render calculator grids as soon as registry is ready ──────────────
   nn-calculators.js loads before nn-components.js (defer order).
   We use DOMContentLoaded here so the DOM elements exist,
   and NNRegistry is guaranteed set since we're at the bottom of this file.
   ──────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  if (window.NNComponents) {
    if (document.getElementById('nn-calc-grid'))    NNComponents.renderCalcGrid('nn-calc-grid');
    if (document.getElementById('nn-finance-grid')) NNComponents.renderFinanceGrid('nn-finance-grid');
    if (typeof window._nnCardAnimation === 'function') window._nnCardAnimation();
  } else {
    // nn-components.js loads after this file — wait for it then render
    window._nnPendingGridRender = true;
  }
});

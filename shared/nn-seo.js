/* =============================================
   NORTHERN NUMBERS — nn-seo.js
   Centralized SEO System

   Usage in each calculator's JS file:
   ------------------------------------
   NNSeo.init({
     title:       'Car Loan',
     description: 'Calculate your car loan...',
     keywords:    'car loan calculator Canada...',
     slug:        'car-loan'
   });

   NNSeo.injectSchema({ title:'Car Loan', slug:'car-loan', description:'...' });

   NNSeo.injectFAQSchema([
     { question:'...', answer:'...' },
     { question:'...', answer:'...' }
   ]);
============================================= */
'use strict';

window.NNSeo = {
  SITE_NAME: 'Northern Numbers',
  SITE_URL:  'https://www.northernnumbers.ca',
  OG_IMAGE:  'https://www.northernnumbers.ca/og-image.png',

  init: function(config) {
    if (!config) return;
    const year  = new Date().getFullYear();
    const title = config.title || 'Calculator';
    const full  = `Canadian ${title} Calculator ${year} — ${this.SITE_NAME}`;
    const url   = config.slug ? `${this.SITE_URL}/${config.slug}/` : this.SITE_URL;
    const desc  = config.description || `Free Canadian ${title} calculator.`;
    const kw    = config.keywords || `${title.toLowerCase()} canada`;
    const img   = config.ogImage || this.OG_IMAGE;

    document.title = full;

    function setMeta(sel, attr, val) {
      let el = document.querySelector(sel);
      if (!el) { el = document.createElement(sel.includes('property') ? 'meta' : sel.includes('name') ? 'meta' : 'link'); document.head.appendChild(el); }
      el.setAttribute(attr, val);
    }

    setMeta('meta[name="description"]',         'content', desc);
    setMeta('meta[name="keywords"]',            'content', kw);
    setMeta('meta[name="robots"]',              'content', 'index, follow');
    setMeta('meta[name="author"]',              'content', this.SITE_NAME);
    setMeta('meta[property="og:title"]',        'content', full);
    setMeta('meta[property="og:description"]',  'content', desc);
    setMeta('meta[property="og:url"]',          'content', url);
    setMeta('meta[property="og:image"]',        'content', img);
    setMeta('meta[property="og:type"]',         'content', 'website');
    setMeta('meta[property="og:locale"]',       'content', 'en_CA');
    setMeta('meta[property="og:site_name"]',    'content', this.SITE_NAME);
    setMeta('meta[name="twitter:card"]',        'content', 'summary');
    setMeta('meta[name="twitter:title"]',       'content', full);
    setMeta('meta[name="twitter:description"]', 'content', desc);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = url;

    // Footer year
    document.querySelectorAll('#footer-year').forEach(el => el.textContent = year);
  },

  injectSchema: function(config) {
    if (!config || !config.slug) return;
    const url  = `${this.SITE_URL}/${config.slug}/`;
    const name = `Canadian ${config.title || 'Calculator'}`;

    this._addScript({ '@context':'https://schema.org','@type':'WebApplication','name':name,'url':url,'description':config.description||name,'applicationCategory':'FinanceApplication','operatingSystem':'Web','offers':{'@type':'Offer','price':'0','priceCurrency':'CAD'},'provider':{'@type':'Organization','name':this.SITE_NAME,'url':this.SITE_URL} });
    this._addScript({ '@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Home','item':this.SITE_URL+'/'},{'@type':'ListItem','position':2,'name':config.title,'item':url}] });
  },

  injectFAQSchema: function(faqs) {
    if (!faqs || !faqs.length) return;
    this._addScript({ '@context':'https://schema.org','@type':'FAQPage','mainEntity':faqs.map(f => ({'@type':'Question','name':f.question,'acceptedAnswer':{'@type':'Answer','text':f.answer}})) });
  },

  _addScript: function(data) {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.textContent = JSON.stringify(data);
    document.head.appendChild(el);
  }
};

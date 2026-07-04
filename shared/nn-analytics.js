/* =============================================
   NORTHERN NUMBERS — nn-analytics.js
   Centralized Google Analytics Module

   SINGLE SOURCE OF TRUTH for all tracking.

   To update GA4 ID: edit GA4_ID below.
   Every page tracks automatically.
   Never add gtag code to individual pages.
============================================= */
'use strict';

window.NNAnalytics = {

  GA4_ID: 'G-XXXXXXXXXX', // ← REPLACE WITH YOUR REAL GA4 MEASUREMENT ID

  init: function() {
    const id = this.GA4_ID;
    if (!id || id === 'G-XXXXXXXXXX') return;
    if (document.querySelector(`script[src*="${id}"]`)) return;

    const s = document.createElement('script');
    s.async = true;
    s.src   = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', id);
    this._ready = true;
  },

  track: function(eventName, params) {
    if (!window.gtag) return;
    gtag('event', eventName, params || {});
  },

  trackCalculator: function(name, params) {
    this.track('calculate', { event_category:'Calculator', event_label:name, ...(params||{}) });
  },

  trackCopy: function(name) {
    this.track('copy_results', { event_category:'Engagement', event_label:name });
  },

  trackOutbound: function(url) {
    this.track('click', { event_category:'Outbound', event_label:url });
  }
};

document.addEventListener('DOMContentLoaded', function() { NNAnalytics.init(); });

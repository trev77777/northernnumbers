/* =============================================
   NORTHERN NUMBERS — nn-ads.js
   Centralized Google AdSense Module

   SINGLE SOURCE OF TRUTH for all advertising.

   To update publisher ID:  edit PUBLISHER_ID below
   To add ad units:         add to AD_UNITS below
   To disable ads:          set ENABLED = false

   Every page loads ads automatically by including
   this script. Never paste AdSense code into
   individual calculator pages.
============================================= */
'use strict';

window.NNAds = {

  ENABLED:      true,
  PUBLISHER_ID: 'ca-pub-1355088288386406',

  /* Ad unit IDs — add new units here as you create them in AdSense */
  AD_UNITS: {
    AUTO:          null,      // Auto Ads (recommended — Google places automatically)
    LEADERBOARD:   null,      // 728x90 — top of page
    RECTANGLE:     null,      // 300x250 — sidebar/inline
    RESPONSIVE:    null       // Responsive display ad
  },

  /** Inject the AdSense library script into <head> */
  init: function() {
    if (!this.ENABLED) return;
    if (document.querySelector('script[src*="adsbygoogle"]')) return; // already loaded

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.PUBLISHER_ID}`;
    document.head.appendChild(script);
  },

  /** Insert a responsive display ad into a container element */
  insertAd: function(containerId, format) {
    if (!this.ENABLED || !window.adsbygoogle) return;
    const container = document.getElementById(containerId);
    if (!container) return;

    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', this.PUBLISHER_ID);
    ins.setAttribute('data-ad-format', format || 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    container.appendChild(ins);

    try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
  }
};

/* Auto-init when DOM is ready */
document.addEventListener('DOMContentLoaded', function() {
  NNAds.init();
});

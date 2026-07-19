/* nn-grid.js — renders calculator grids from registry
   Loads last so NNRegistry and NNComponents are always available */
(function() {
  function render() {
    if (window.NNComponents && window.NNRegistry) {
      if (document.getElementById('nn-calc-grid'))
        NNComponents.renderCalcGrid('nn-calc-grid');
      if (document.getElementById('nn-finance-grid'))
        NNComponents.renderFinanceGrid('nn-finance-grid');
      if (typeof window._nnCardAnimation === 'function')
        window._nnCardAnimation();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();

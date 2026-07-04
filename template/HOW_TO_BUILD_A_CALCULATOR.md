# How to Build a New Northern Numbers Calculator

## Estimated time: 1–2 hours (simple) | 2–4 hours (complex)
## Everything below is pre-built — you only fill in what's unique.

---

## Before you start

Open `data/nn-calculators.js` and find your calculator in the list.
If it's not there, add it. Change `status` from `'planned'` to `'active'` when done.

---

## Step 1 — Create your folder and files

```
northernnumbers/
  your-slug/
    index.html      ← copy from template/CALCULATOR_TEMPLATE.html
    your-slug.js    ← your calculator logic
```

Rename `your-slug` to match the `url` field in the registry (e.g. `car-loan`).

---

## Step 2 — Fill in index.html

Replace only these CAPS placeholders:

| Placeholder | Example |
|---|---|
| `CALCULATOR TITLE` | Car Loan |
| `SLUG` | car-loan |
| `ONE SENTENCE DESCRIPTION` | Calculate your monthly car payments... |
| `STEP ONE / TWO / THREE` | Enter your vehicle price / Enter your down payment... |
| `PRESET A / B / C` | First Car / Average Canadian / Luxury |
| Column headers in the year-by-year table | Year / Payment / Principal / Interest / Balance |
| Educational section headings + content | What is a car loan? / How rates work in Canada... |
| FAQ questions and answers | How much should I put down on a car?... |
| Related calculator hrefs | /loan/, /mortgage/ |

Leave the header, footer, scripts, AdSense, Analytics, disclaimer EXACTLY as they are.
They are auto-injected by the shared modules.

---

## Step 3 — Write your-slug.js

### Required — call these at the top:
```javascript
document.addEventListener('DOMContentLoaded', function() {

  // SEO — call this once
  NNSeo.init({
    title:       'Car Loan',
    description: 'Calculate your car loan payments, total interest, and true cost of ownership.',
    keywords:    'car loan calculator canada, auto loan calculator, vehicle loan calculator canada',
    slug:        'car-loan'
  });

  // Schema markup — call this once
  NNSeo.injectSchema({
    title:       'Car Loan',
    slug:        'car-loan',
    description: 'Free Canadian car loan calculator.'
  });

  // FAQ Schema — use same questions as your HTML FAQ section
  NNSeo.injectFAQSchema([
    { question: 'What is a good car loan rate in Canada?', answer: 'In 2026, typical new car rates range from 5-9%...' },
    { question: 'How much should I put down on a car?', answer: 'A 20% down payment is recommended to avoid...' }
  ]);

});
```

### Use shared utilities — never redefine these:
```javascript
// Format Canadian dollars
NNUtils.formatCAD(1234.56)       // → $1,234.56
NNUtils.formatCAD0(1234.56)      // → $1,235
NNUtils.parseInputNumber('1,234') // → 1234
NNUtils.formatInputNumber(1234)   // → 1,234

// Attach live comma formatter to dollar inputs
NNUtils.attachFormatters(vehiclePriceEl, downPaymentEl, tradeInEl);

// Two-way slider sync
NNUtils.syncSlider(rateInputEl, rateSliderEl, { onChange: recalculate });

// Scroll to results (first time only)
const wasHidden = resultsContent.classList.contains('hidden');
resultsContent.classList.remove('hidden');
NNUtils.scrollToResults('results-heading', wasHidden);

// Summary pills
NNUtils.renderSummaryPills('result-summary-box', [
  `🚗 ${NNUtils.formatCAD0(price)}`,
  `📅 ${term} months`,
  `📈 ${rate}% rate`
]);

// Copy results
document.getElementById('copy-results-btn').addEventListener('click', function() {
  NNUtils.copyResults(this, [
    `💰 Monthly Payment: ${NNUtils.formatCAD(payment)}`,
    `💸 Total Interest: ${NNUtils.formatCAD(interest)}`,
    `📊 Total Cost: ${NNUtils.formatCAD(total)}`
  ], 'Car Loan Calculator');
});
```

### Use shared constants — never hardcode Canadian data:
```javascript
// Tax calculations
NN.getMarginalRate(85000, 'ON')            // → 0.4341
NN.estimateTaxRefund(85000, 10000, 'ON')   // → $4,341

// TFSA/RRSP data
NN.TFSA.ANNUAL_LIMIT                       // → 7000
NN.RRSP.ANNUAL_MAX                         // → 32490
NN.calcTFSALifetimeRoom(1990)              // → 95000

// CMHC
NN.getCMHCRate(0.10)                       // → 0.031

// CPP/EI (for payroll calculators)
NN.calcCPPContribution(75000)
NN.calcEIPremium(75000)
```

---

## Step 4 — Register in nn-calculators.js

Find your calculator in `data/nn-calculators.js` and update:
```javascript
status: 'active',           // was 'planned'
showInFooter: true,         // if it's a top calculator
showOnHomepage: true,
```

The footer and homepage automatically update — no other files to edit.

---

## Step 5 — Update sitemap.xml

Add your URL:
```xml
<url>
  <loc>https://www.northernnumbers.ca/car-loan/</loc>
  <lastmod>2026-07-03</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

---

## Step 6 — Run the test checklist

Open `tests/CALCULATOR_TEST_CHECKLIST.md` and verify every item.

---

## That's it.

Header ✅ | Footer ✅ | AdSense ✅ | Analytics ✅ | SEO ✅ | Disclaimer ✅
Copy Results ✅ | Reset ✅ | Mobile ✅ | Schema ✅ | FAQ ✅

All pre-built. You only write:
- Your inputs (HTML)
- Your formula (JS)  
- Your results (JS)
- Your educational content (HTML)
- Your FAQ (HTML + JS schema)

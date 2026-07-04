# Northern Numbers — Calculator Test Checklist

## Run this checklist before every new calculator goes live.
## Do not ship if any item fails.

---

## Formula Verification
- [ ] Test with at least 3 known inputs/outputs from CRA or a trusted source
- [ ] Test with edge cases (zero values, maximum values, boundary conditions)
- [ ] Verify against a second calculator (Google, CRA official tools, or bank calculator)
- [ ] Document your formula source in comments at top of calculator JS file

---

## Inputs
- [ ] All required fields validated (empty, negative, out-of-range)
- [ ] Dollar inputs show commas as user types
- [ ] Percentage inputs limited to sensible range
- [ ] Year inputs limited to reasonable range
- [ ] iOS keyboard shows numeric pad for number inputs (inputmode="numeric")
- [ ] Tab order makes sense
- [ ] Form submits on Enter key
- [ ] Presets fill all fields correctly and auto-calculate

---

## Results
- [ ] Results show after clicking Calculate
- [ ] Currency formatted as Canadian dollars ($1,234.56)
- [ ] Percentages formatted correctly (12.3%)
- [ ] Negative values handled gracefully
- [ ] Large numbers (millions) display without breaking layout

---

## Buttons
- [ ] Calculate button works
- [ ] Reset button clears all fields and hides results
- [ ] Copy Results button copies correctly formatted text
- [ ] Copy Results shows "✅ Copied!" confirmation
- [ ] Print/PDF button triggers browser print

---

## Mobile (test on real device or DevTools)
- [ ] Layout works on 375px (iPhone SE)
- [ ] Layout works on 390px (iPhone 14)
- [ ] Layout works on 414px (iPhone Plus)
- [ ] Inputs do not require pinch-to-zoom
- [ ] Results readable without horizontal scroll
- [ ] Buttons large enough to tap

---

## Desktop
- [ ] Layout works at 1024px
- [ ] Layout works at 1280px
- [ ] Layout works at 1440px
- [ ] Two-column layout displays correctly

---

## Shared Modules
- [ ] nn-constants.js loaded (no hardcoded Canadian financial data)
- [ ] nn-utils.js used (no duplicate formatCAD, parseInputNumber, etc.)
- [ ] nn-components.js renders header and footer
- [ ] nn-ads.js loads AdSense automatically
- [ ] nn-analytics.js loads GA4 automatically
- [ ] nn-seo.js sets title, meta description, canonical
- [ ] NNSeo.injectSchema() called
- [ ] NNSeo.injectFAQSchema() called with FAQ data

---

## SEO
- [ ] Page title includes "Calculator" + year + "Northern Numbers"
- [ ] Meta description is unique (not copied from another calculator)
- [ ] Canonical URL is correct
- [ ] H1 tag contains calculator name
- [ ] H2/H3 structure is logical
- [ ] FAQ section has at least 4 questions
- [ ] Related calculators section links to 3+ pages
- [ ] Internal links use correct /slug/ format

---

## Navigation
- [ ] Correct nav item is highlighted (active class)
- [ ] Mobile menu opens and closes
- [ ] All nav links work
- [ ] Breadcrumb shows correctly
- [ ] Footer links all work

---

## Registry
- [ ] Calculator added to data/nn-calculators.js
- [ ] status set to 'active'
- [ ] showInFooter and showOnHomepage set correctly
- [ ] related calculators array filled in
- [ ] Finance/category hub page updated

---

## Sitemap
- [ ] URL added to sitemap.xml
- [ ] Priority and changefreq set appropriately

---

## Final check
- [ ] No console errors (open browser DevTools → Console)
- [ ] No broken images
- [ ] No 404 links
- [ ] Loads fast (no large uncompressed images)
- [ ] Passes on both Chrome and Safari

---

## Known Values to Test (examples — update per calculator)

### TFSA Example
- Birth year: 1990, no past contributions → room: $95,000
- $500/month at 7% for 30 years → ~$600,000

### RRSP Example  
- Income: $85,000 Ontario → marginal rate: 43.41%
- $10,000 contribution → ~$4,341 refund

### Mortgage Example
- $500,000, 20% down, 5.25%, 25 years monthly → ~$2,900/month
- $600,000, 5% down → CMHC 4% applies → insured amount = $570,000 × 4% = $22,800

---

## Formula Sources
Always cite your source. Examples:
- TFSA limits: https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account.html
- CMHC rates: https://www.cmhc-schl.gc.ca/consumers/home-buying/mortgage-loan-insurance
- CPP: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp.html
- Tax brackets: https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html

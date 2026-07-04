# Northern Numbers — Annual CRA Update Checklist

## When to update: November–December each year (after CRA announcements)
## Time required: ~15–30 minutes
## File to edit: data/nn-constants.js ONLY

---

## Step 1 — TFSA Limit
**Source:** https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account.html

- [ ] Update `NN.TFSA.ANNUAL_LIMIT` to new year's limit
- [ ] Add new year entry to `NN.TFSA.ANNUAL_LIMITS` object
- [ ] Update `NN.TFSA.LIFETIME_2026` → rename to `LIFETIME_XXXX` and update value
- **Affects:** TFSA calculator, FHSA calculator

---

## Step 2 — RRSP Limit
**Source:** https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/registered-retirement-savings-plan-rrsp.html

- [ ] Update `NN.RRSP.ANNUAL_MAX` (18% of prior year income, CRA-published max)
- **Affects:** RRSP calculator, income tax calculator

---

## Step 3 — CPP Rates
**Source:** https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp.html

- [ ] Update `NN.CPP.YMPE` (Year's Maximum Pensionable Earnings)
- [ ] Update `NN.CPP.EMPLOYEE_RATE`
- [ ] Update `NN.CPP.MAX_EMPLOYEE_CONTRIBUTION`
- [ ] Update `NN.CPP.CPP2_YMPE`
- **Affects:** CPP calculator, payroll calculators, net income calculator

---

## Step 4 — EI Rates
**Source:** https://www.canada.ca/en/employment-social-development/programs/ei/ei-list/ei-employers/premium-rates.html

- [ ] Update `NN.EI.MAX_INSURABLE_EARNINGS`
- [ ] Update `NN.EI.EMPLOYEE_RATE`
- [ ] Update `NN.EI.MAX_EMPLOYEE_PREMIUM`
- [ ] Update `NN.EI.MAX_WEEKLY_BENEFIT`
- **Affects:** EI calculator, net income calculator

---

## Step 5 — OAS / GIS Amounts
**Source:** https://www.canada.ca/en/services/benefits/publicpensions/cpp/old-age-security/payments.html
(Updates quarterly — update annually in Jan)

- [ ] Update `NN.OAS.MONTHLY_65_TO_74`
- [ ] Update `NN.OAS.MONTHLY_75_PLUS`
- [ ] Update `NN.OAS.CLAWBACK_THRESHOLD`
- [ ] Update `NN.GIS.MAX_MONTHLY_SINGLE`
- [ ] Update `NN.GIS.MAX_MONTHLY_COUPLE`
- **Affects:** OAS calculator, retirement calculator

---

## Step 6 — Federal Tax Brackets
**Source:** https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html

- [ ] Update `NN.FED_BRACKETS` bracket thresholds (indexed to inflation annually)
- [ ] Update `NN.FEDERAL_BASIC_PERSONAL`
- **Affects:** RRSP calculator, income tax calculator, all province-based calculators

---

## Step 7 — Provincial Tax Brackets
**Source:** Each province's revenue agency (check annually — most change)

- [ ] Update `NN.PROV_BRACKETS.ON` (Ontario — check ontario.ca)
- [ ] Update other provinces that changed
- [ ] Update `NN.PROV_BASIC_PERSONAL` amounts
- **Affects:** RRSP calculator, income tax calculator, FHSA calculator

---

## Step 8 — Mortgage Stress Test
**Source:** https://www.osfi-bsif.gc.ca

- [ ] Update `NN.MORTGAGE.STRESS_TEST_RATE` if OSFI changed it
- [ ] Update `NN.MORTGAGE.CMHC_RATES` if CMHC changed premiums
- **Affects:** Mortgage calculator, stress test calculator

---

## Step 9 — FHSA (if rules changed)
- [ ] Check if annual or lifetime limits changed
- [ ] Update `NN.FHSA.ANNUAL_LIMIT` and `NN.FHSA.LIFETIME_LIMIT` if changed
- **Affects:** FHSA calculator

---

## Step 10 — Update dates in files
- [ ] Update `NN.TAX_YEAR` in `data/nn-constants.js`
- [ ] Update page titles (nn-seo.js handles year automatically)
- [ ] Update `sitemap.xml` lastmod dates
- [ ] Update "Last updated" in Privacy Policy and Terms of Use

---

## After updating
1. Test each active calculator with known values
2. Verify results match CRA's published examples
3. Commit with message: `Update CRA constants for YEAR`
4. Push to GitHub → Cloudflare auto-deploys

**Total time: ~15–30 minutes once per year.**

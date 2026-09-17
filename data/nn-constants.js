/* =============================================
   NORTHERN NUMBERS — nn-constants.js
   Canadian Financial Constants 2026

   ANNUAL UPDATE FILE — edit only this file each year.
   See YEARLY_UPDATE.md for full checklist.

   Sources:
     CRA:    https://www.canada.ca/en/revenue-agency.html
     OSFI:   https://www.osfi-bsif.gc.ca
     ESDC:   https://www.canada.ca/en/employment-social-development.html
     BOC:    https://www.bankofcanada.ca
============================================= */
'use strict';
window.NN = window.NN || {};
const NN = window.NN;

NN.TAX_YEAR     = 2026;
NN.CURRENT_YEAR = new Date().getFullYear();

/* TFSA */
NN.TFSA = {
  ANNUAL_LIMIT: 7000, LIFETIME_2026: 109000,
  ANNUAL_LIMITS: {
    2009:5000,2010:5000,2011:5000,2012:5000,
    2013:5500,2014:5500,2015:10000,
    2016:5500,2017:5500,2018:5500,
    2019:6000,2020:6000,2021:6000,
    2022:6000,2023:6500,2024:7000,2025:7000,2026:7000
  }
};

/* FHSA */
NN.FHSA = {
  ANNUAL_LIMIT:8000, LIFETIME_LIMIT:40000, MAX_YEARS:15,
  CARRY_FORWARD:8000, ELIGIBLE_FROM:2023
};

/* RRSP
   HBP_MAX: raised from $35,000 to $60,000 for withdrawals made on or
   after April 16, 2024 (Budget 2024 / CRA). This is the single source
   for the HBP limit — do not redefine it elsewhere (e.g. under FHSA;
   the Home Buyers' Plan is an RRSP program). */
NN.RRSP = {
  ANNUAL_MAX:33810, INCOME_PCT:0.18, OVERCONTRIB_BUFFER:2000,
  HBP_MAX:60000, HBP_REPAY_YEARS:15,
  LLP_MAX_ANNUAL:10000, LLP_MAX_TOTAL:20000, RRIF_AGE:71
};

/* RESP */
NN.RESP = {
  CESG_RATE:0.20, CESG_MAX_ANNUAL:500, CESG_MAX_LIFETIME:7200,
  CESG_ELIGIBLE_CONTRIBUTION:2500, LIFETIME_LIMIT:50000,
  CLB_MAX:2000, SUBSCRIBER_AGE_MAX:31
};

/* CPP 2026 — Source: CRA "Maximum pensionable earnings" announcement, Nov 2025 */
NN.CPP = {
  YMPE:74600, BASIC_EXEMPTION:3500,
  EMPLOYEE_RATE:0.0595, EMPLOYER_RATE:0.0595,
  MAX_EMPLOYEE_CONTRIBUTION:4230.45,
  CPP2_YAMPE:85000, CPP2_RATE:0.04, MAX_CPP2_CONTRIBUTION:416.00,
  RETIREMENT_AGE_STANDARD:65, RETIREMENT_AGE_EARLY:60, RETIREMENT_AGE_LATE:70,
  EARLY_REDUCTION_PER_MONTH:0.006, LATE_INCREASE_PER_MONTH:0.007,
  MAX_MONTHLY_65:1507.65 // 2026 maximum monthly retirement benefit at age 65 (Service Canada)
};

/* EI 2026 — Source: Canada Employment Insurance Commission, Sept 2025
   (canada.ca/en/employment-social-development/news/2025/09) */
NN.EI = {
  MAX_INSURABLE_EARNINGS:68900,
  EMPLOYEE_RATE:0.0163, EMPLOYER_RATE:0.02282,
  MAX_EMPLOYEE_PREMIUM:1123.07, MAX_EMPLOYER_PREMIUM:1572.30,
  BENEFIT_RATE:0.55, MAX_WEEKLY_BENEFIT:695,
  MIN_WEEKS:14, MAX_WEEKS:45
};

/* Quebec payroll 2026 — Quebec residents pay QPP (not CPP) and QPIP
 * (Quebec Parental Insurance Plan) instead of the federal EI premium
 * (a separate, lower Quebec EI rate applies since QPIP covers
 * maternity/parental/paternity benefits federally-run EI otherwise
 * would). Source: Revenu Québec / CRA 2026 payroll tables. Any
 * calculator offering Quebec as a province option and claiming to
 * show real take-home pay MUST use these, not plain CPP/EI. */
NN.QPP = {
  YMPE:74600, YAMPE:85000, BASIC_EXEMPTION:3500,
  EMPLOYEE_RATE:0.0630, MAX_EMPLOYEE_CONTRIBUTION:4479.30, // base + first additional, combined
  QPP2_RATE:0.04, MAX_QPP2_CONTRIBUTION:416.00
};
NN.QC_EI = {
  MAX_INSURABLE_EARNINGS:68900,
  EMPLOYEE_RATE:0.0130, MAX_EMPLOYEE_PREMIUM:895.70
};
NN.QPIP = {
  MAX_INSURABLE_EARNINGS:103000,
  EMPLOYEE_RATE:0.00430, MAX_EMPLOYEE_PREMIUM:442.90
};
/* Self-employed QPIP is a SEPARATE rate/max from the employee rate
 * above (self-employed pay a single combined premium rather than
 * matching employee+employer portions) — same $103,000 insurable
 * ceiling. Self-employed Quebec residents are REQUIRED to pay QPIP
 * (unlike EI, which is optional for the self-employed). Source:
 * Revenu Québec — QPIP premium payable by a self-employed person.
 * MIN_THRESHOLD: Revenu Québec — no QPIP premium is payable at all
 * if income subject to QPIP is under $2,000 (not merely a reduced
 * premium — zero below this line). Applies to the self-employed
 * calculation's FINAL annual liability; this is distinct from
 * employer payroll withholding on employees, which withholds
 * regardless of the employee's eventual annual total. */
NN.QPIP_SELF_EMPLOYED = {
  MAX_INSURABLE_EARNINGS:103000,
  RATE:0.00764, MAX_PREMIUM:786.92, MIN_THRESHOLD:2000
};

/* Quebec Federal Tax Abatement 2026 — 16.5% of basic federal tax (the
 * amount AFTER non-refundable credits like the BPA are applied, i.e.
 * this site's "fedTax" value — NOT gross federal tax before credits,
 * and NOT taxable income). Compensates Quebec for administering its
 * own programs instead of federal equivalents. Applies automatically
 * to every Quebec tax filer — not optional, not a credit you claim.
 * Source: canada.ca/en/department-finance/programs/federal-transfers/
 * quebec-abatement.html; CRA T4032-QC payroll tables. */
NN.QUEBEC_FEDERAL_ABATEMENT_RATE = 0.165;
/** Apply the Quebec abatement to an already-computed federal tax
 * amount (post-credits). No-op for every other province. */
NN.applyQuebecAbatement = function(federalTax, province) {
  return province === 'QC' ? federalTax * (1 - NN.QUEBEC_FEDERAL_ABATEMENT_RATE) : federalTax;
};

/* OAS — Source: Canada.ca quarterly OAS/GIS payment amounts.
   NOTE: these are QUARTERLY figures, not fixed for all of 2026 — OAS/GIS
   are indexed to CPI every January/April/July/October. Values below are
   the July–September 2026 quarter; re-check canada.ca each quarter. */
/* IMPORTANT — OAS recovery tax runs on a DIFFERENT income year than the
 * payment quarter. The July 2026-June 2027 payment period's clawback is
 * based on 2025 income (already fixed/known); a calculator asking the
 * user for CURRENT/upcoming income is really asking about 2026 income,
 * which determines the *next* recovery period (July 2027-June 2028).
 * Both periods are provided below — CURRENT.* is fixed/confirmed,
 * NEXT.* is CRA's official minimum threshold with an ESTIMATED (not yet
 * finalized) full-recovery ceiling, since it depends on OAS payment
 * amounts not yet set for that future period. Source: canada.ca OAS
 * recovery tax page. */
NN.OAS = {
  QUARTER_LABEL:'July–September 2026',
  MONTHLY_65_TO_74:751.97, MONTHLY_75_PLUS:827.17,
  CLAWBACK_RATE:0.15,
  DEFERRAL_BONUS_PER_MONTH:0.006, MAX_DEFERRAL_AGE:70,
  FULL_ELIGIBILITY_YEARS:40, PARTIAL_MIN_YEARS:10,
  // Back-compat alias — existing code that reads CLAWBACK_THRESHOLD
  // directly gets the NEXT period's (2026-income-based) threshold,
  // since that's what a forward-looking "your income" calculator means.
  CLAWBACK_THRESHOLD:95323,
  RECOVERY_CURRENT: {
    LABEL: 'July 2026 – June 2027 (based on 2025 income)',
    INCOME_YEAR: 2025,
    THRESHOLD: 93454,
    FULL_RECOVERY_65_TO_74: 152062,
    FULL_RECOVERY_75_PLUS: 157923
  },
  RECOVERY_NEXT: {
    LABEL: 'July 2027 – June 2028 (based on 2026 income) — estimated',
    INCOME_YEAR: 2026,
    THRESHOLD: 95323,
    FULL_RECOVERY_65_TO_74: 155109,
    FULL_RECOVERY_75_PLUS: 161088,
    ESTIMATED: true
  }
};

/* GIS — same July–September 2026 quarter as OAS above. */
/* GIS cutoff income (where the benefit reaches $0) is NOT one number
 * for "couple" — it depends on the spouse's own OAS/Allowance status.
 * MAX_MONTHLY_COUPLE specifically represents the "spouse also receives
 * full OAS" scenario (the most common case and what this site's
 * single couple option models) — the other two scenarios are provided
 * for reference/FAQ accuracy even though the UI only offers one
 * generic "couple" choice. Source: Canada.ca, July-Sept 2026 quarter. */
NN.GIS = {
  QUARTER_LABEL:'July–September 2026',
  MAX_MONTHLY_SINGLE:1123.17, MAX_MONTHLY_COUPLE:676.09,
  INCOME_THRESHOLD_SINGLE:22800,
  INCOME_THRESHOLD_COUPLE:30096,                    // combined income; spouse also receives OAS
  INCOME_THRESHOLD_COUPLE_SPOUSE_ALLOWANCE:42144,   // combined income; spouse receives the Allowance
  INCOME_THRESHOLD_COUPLE_SPOUSE_NO_OAS:54624       // combined income; spouse receives neither OAS nor Allowance
};

/* Federal Tax Brackets 2026 — Source: canada.ca/en/revenue-agency/services/
   tax/individuals/tax-rates-brackets/current-year.html. Bottom rate cut
   from 15% to 14% effective Jan 1, 2026 (Bill C-4); thresholds indexed 2%. */
NN.FED_BRACKETS = [
  {min:0,      max:58523,    rate:0.14  },
  {min:58523,  max:117045,   rate:0.205 },
  {min:117045, max:181440,   rate:0.26  },
  {min:181440, max:258482,   rate:0.29  },
  {min:258482, max:Infinity, rate:0.33  }
];
NN.FEDERAL_BASIC_PERSONAL = 16452;      // full BPA, income <= $181,440 — see NN.getFederalBPA for the phase-out
NN.FEDERAL_BASIC_PERSONAL_MIN = 14829;  // minimum BPA, income >= $258,482
NN.FEDERAL_BPA_PHASEOUT_LOW  = 181440;
NN.FEDERAL_BPA_PHASEOUT_HIGH = 258482;

/** Federal Basic Personal Amount, income-tested per CRA T4127 (2026):
 * full $16,452 at/under $181,440, straight-line phase-out down to
 * $14,829 at/over $258,482. Any code computing federal tax owing (not
 * just marginal rate) MUST call this instead of using
 * NN.FEDERAL_BASIC_PERSONAL directly, or high-income users get an
 * inflated (too-generous) BPA credit. Source: CRA T4127 / canada.ca. */
NN.getFederalBPA = function(income) {
  const MAX = NN.FEDERAL_BASIC_PERSONAL, MIN = NN.FEDERAL_BASIC_PERSONAL_MIN;
  const LOW = NN.FEDERAL_BPA_PHASEOUT_LOW, HIGH = NN.FEDERAL_BPA_PHASEOUT_HIGH;
  if (income <= LOW) return MAX;
  if (income >= HIGH) return MIN;
  return MAX - (MAX - MIN) * (income - LOW) / (HIGH - LOW);
};

/* Provincial/Territorial Tax Brackets 2026 — Source: TaxTips.ca 2026
   provincial rate pages (cross-checked against CRA T4127 and, for
   structural changes, against published 2026 budget announcements).
   Notable 2026 changes from prior years:
   - AB added a new 8% bottom bracket (was 10% minimum)
   - BC's bottom rate rose from 5.06% to 5.60%
   - PE added a new $200,000/20% top bracket (2026 PEI Budget)
   - NL added two additional top brackets (21.3% / 21.8%)
   - QC 2026 figures confirmed directly against Revenu Québec (Phase 2B
     verification) — no longer treated as a TaxTips.ca estimate. */
NN.PROV_BRACKETS = {
  ON:[{min:0,max:53891,rate:0.0505},{min:53891,max:107785,rate:0.0915},{min:107785,max:150000,rate:0.1116},{min:150000,max:220000,rate:0.1216},{min:220000,max:Infinity,rate:0.1316}],
  AB:[{min:0,max:61200,rate:0.08},{min:61200,max:154259,rate:0.10},{min:154259,max:185111,rate:0.12},{min:185111,max:246813,rate:0.13},{min:246813,max:370220,rate:0.14},{min:370220,max:Infinity,rate:0.15}],
  BC:[{min:0,max:50363,rate:0.056},{min:50363,max:100728,rate:0.077},{min:100728,max:115648,rate:0.105},{min:115648,max:140430,rate:0.1229},{min:140430,max:190405,rate:0.147},{min:190405,max:265545,rate:0.168},{min:265545,max:Infinity,rate:0.205}],
  MB:[{min:0,max:47000,rate:0.108},{min:47000,max:100000,rate:0.1275},{min:100000,max:Infinity,rate:0.174}],
  SK:[{min:0,max:54532,rate:0.105},{min:54532,max:155805,rate:0.125},{min:155805,max:Infinity,rate:0.145}],
  QC:[{min:0,max:54345,rate:0.14},{min:54345,max:108680,rate:0.19},{min:108680,max:132245,rate:0.24},{min:132245,max:Infinity,rate:0.2575}],
  NB:[{min:0,max:52333,rate:0.094},{min:52333,max:104666,rate:0.14},{min:104666,max:193861,rate:0.16},{min:193861,max:Infinity,rate:0.195}],
  NS:[{min:0,max:30995,rate:0.0879},{min:30995,max:61991,rate:0.1495},{min:61991,max:97417,rate:0.1667},{min:97417,max:157124,rate:0.175},{min:157124,max:Infinity,rate:0.21}],
  PE:[{min:0,max:33928,rate:0.095},{min:33928,max:65820,rate:0.1347},{min:65820,max:106890,rate:0.166},{min:106890,max:142250,rate:0.1762},{min:142250,max:200000,rate:0.19},{min:200000,max:Infinity,rate:0.20}],
  NL:[{min:0,max:44678,rate:0.087},{min:44678,max:89354,rate:0.145},{min:89354,max:159528,rate:0.158},{min:159528,max:223340,rate:0.178},{min:223340,max:285319,rate:0.198},{min:285319,max:570638,rate:0.208},{min:570638,max:1141275,rate:0.213},{min:1141275,max:Infinity,rate:0.218}],
  YT:[{min:0,max:58523,rate:0.064},{min:58523,max:117045,rate:0.09},{min:117045,max:181440,rate:0.109},{min:181440,max:500000,rate:0.128},{min:500000,max:Infinity,rate:0.15}],
  NT:[{min:0,max:53003,rate:0.059},{min:53003,max:106009,rate:0.086},{min:106009,max:172346,rate:0.122},{min:172346,max:Infinity,rate:0.1405}],
  NU:[{min:0,max:55801,rate:0.04},{min:55801,max:111602,rate:0.07},{min:111602,max:181439,rate:0.09},{min:181439,max:Infinity,rate:0.115}]
};

/* NL note: CRA's mid-2026 payroll formulas (T4127, effective July 1)
 * use a prorated ~$15,000 for the July-December withholding period,
 * because employees already used the lower amount for January-June.
 * That $15,000 is a PAYROLL WITHHOLDING artifact, not the statutory
 * annual BPA — the actual 2026 annual BPA (effective Jan 1, confirmed
 * by the NL 2026 Budget) is $13,094. An annual income-tax calculator
 * (which is what every NL figure in this file feeds) must use $13,094,
 * not $15,000. Only a per-paycheck withholding calculator for the back
 * half of 2026 would use the prorated figure — this site doesn't have
 * one, so $13,094 is correct everywhere NL BPA is used here. */
NN.PROV_BASIC_PERSONAL = {
  ON:12989,AB:22769,BC:13216,MB:15780,SK:20381,QC:18952,
  NB:13664,NS:11932,PE:15000,NL:13094,YT:16452,NT:18198,NU:19659
};

/* Manitoba Basic Personal Amount is income-tested above $200,000 (MB
 * Form MB428 / Worksheet MB428, line 58040): full $15,780 at/under
 * $200,000, straight-line to $0 at/over $400,000. No other province's
 * BPA phase-out is modeled here (out of scope for this pass) — flag
 * that as a residual item if extending this further. */
NN.MANITOBA_BPA_PHASEOUT_LOW  = 200000;
NN.MANITOBA_BPA_PHASEOUT_HIGH = 400000;
NN.getProvincialBPA = function(income, province) {
  const flat = (NN.PROV_BASIC_PERSONAL || {})[province];
  if (province !== 'MB') return flat;
  const LOW = NN.MANITOBA_BPA_PHASEOUT_LOW, HIGH = NN.MANITOBA_BPA_PHASEOUT_HIGH;
  if (income <= LOW) return flat;
  if (income >= HIGH) return 0;
  return flat * (1 - (income - LOW) / (HIGH - LOW));
};

NN.PROV_NAMES = {
  ON:'Ontario',AB:'Alberta',BC:'British Columbia',MB:'Manitoba',
  SK:'Saskatchewan',QC:'Quebec',NB:'New Brunswick',NS:'Nova Scotia',
  PE:'Prince Edward Island',NL:'Newfoundland & Labrador',
  YT:'Yukon',NT:'Northwest Territories',NU:'Nunavut'
};

/* GST/HST/PST 2026 */
NN.TAX_RATES = {
  GST:0.05,
  PROVINCIAL:{
    ON:{type:'HST',rate:0.13}, AB:{type:'GST',rate:0.05},
    BC:{type:'GST+PST',gst:0.05,pst:0.07,total:0.12},
    MB:{type:'GST+RST',gst:0.05,pst:0.07,total:0.12},
    SK:{type:'GST+PST',gst:0.05,pst:0.06,total:0.11},
    QC:{type:'GST+QST',gst:0.05,pst:0.09975,total:0.14975},
    NB:{type:'HST',rate:0.15}, NS:{type:'HST',rate:0.15},
    PE:{type:'HST',rate:0.15}, NL:{type:'HST',rate:0.15},
    YT:{type:'GST',rate:0.05}, NT:{type:'GST',rate:0.05}, NU:{type:'GST',rate:0.05}
  }
};

/* Mortgage/CMHC — Source: Dept. of Finance Canada announcement (Sept 16,
   2024) and Canada Gazette Part 2 regulations, effective Dec 15, 2024:
   insured-mortgage price cap raised $1M -> $1.5M; 30-year amortization
   extended to ALL first-time buyers and ALL new-build buyers on insured
   mortgages (was previously unavailable on insured mortgages at all).
   Stress test floor (5.25%) and CMHC premium tiers confirmed unchanged
   by OSFI / CMHC as of this pass. This is the ONLY place these numbers
   should be defined — mortgage.js, mortgage-affordability.js, and
   first-home-costs.js must all read from here, not hardcode their own
   copies (that drift is exactly what caused the Phase 1 audit finding). */
NN.MORTGAGE = {
  STRESS_TEST_RATE:5.25,
  MAX_AMORTIZATION_INSURED:25,
  MAX_AMORTIZATION_INSURED_EXTENDED:30, // first-time buyers OR new builds only
  EXTENDED_AMORTIZATION_SURCHARGE:0.002, // +0.20% CMHC premium for 30-yr insured
  MAX_AMORTIZATION_UNINSURED:30,
  MAX_PURCHASE_INSURED:1500000,
  MIN_DOWN_UNDER_500K:0.05, MIN_DOWN_500K_TO_1_5M:0.10, MIN_DOWN_OVER_1_5M:0.20,
  CMHC_RATES:[
    {minDown:0.05,maxDown:0.0999,rate:0.040},
    {minDown:0.10,maxDown:0.1499,rate:0.031},
    {minDown:0.15,maxDown:0.1999,rate:0.028},
    {minDown:0.20,maxDown:1.0,   rate:0.000}
  ]
};

/* Inflation & Market Assumptions */
NN.INFLATION = {BOC_TARGET:0.02, BOC_RANGE_LOW:0.01, BOC_RANGE_HIGH:0.03, HISTORICAL_AVG_30YR:0.021};
NN.MARKET    = {TSX_HISTORICAL_AVG:0.072, GLOBAL_EQUITY_AVG:0.09, BALANCED_PORTFOLIO_AVG:0.065, CONSERVATIVE_AVG:0.045, BOND_AVG:0.04, GIC_AVG:0.04, SAFE_WITHDRAWAL_RATE:0.04};

/* ── UTILITY FUNCTIONS ── */
NN.getMarginalRate = function(income, province) {
  function getRate(inc, brackets) {
    for (let i = brackets.length-1; i >= 0; i--) { if (inc > brackets[i].min) return brackets[i].rate; }
    return brackets[0].rate;
  }
  return getRate(income, NN.FED_BRACKETS) + getRate(income, NN.PROV_BRACKETS[province] || NN.PROV_BRACKETS.ON);
};

NN.calcEffectiveTaxRate = function(income, province) {
  function calcTax(inc, brackets) {
    let tax = 0;
    for (const b of brackets) { if (inc <= b.min) break; tax += (Math.min(inc, b.max===Infinity?inc:b.max) - b.min) * b.rate; }
    return tax;
  }
  const prov = NN.PROV_BRACKETS[province] || NN.PROV_BRACKETS.ON;
  return income > 0 ? (calcTax(income, NN.FED_BRACKETS) + calcTax(income, prov)) / income : 0;
};

NN.estimateTaxRefund    = function(income, contribution, province) { return contribution * NN.getMarginalRate(income, province); };
NN.calcTFSALifetimeRoom = function(birthYear) { const first = Math.max(birthYear+18, 2009); let t=0; for(let y=first;y<=NN.CURRENT_YEAR;y++) t += NN.TFSA.ANNUAL_LIMITS[y]||NN.TFSA.ANNUAL_LIMIT; return t; };
NN.estimateRRSPRoom     = function(income) { return Math.min(Math.round(income * NN.RRSP.INCOME_PCT), NN.RRSP.ANNUAL_MAX); };
NN.getCMHCRate          = function(dpPct) { for(const t of NN.MORTGAGE.CMHC_RATES) { if(dpPct>=t.minDown && dpPct<=t.maxDown) return t.rate; } return 0; };

/** Minimum down payment ($) for a given purchase price, per the Dec 15,
 * 2024 federal rules: 5% on the first $500K, 10% on the portion from
 * $500K-$1.5M, 20% flat above $1.5M (uninsured only above that price —
 * insured financing is not available at all above NN.MORTGAGE.MAX_PURCHASE_INSURED).
 * mortgage.js, mortgage-affordability.js, and first-home-costs.js should
 * all call this instead of hardcoding their own tier logic. */
NN.getMinDownPayment = function(price) {
  const M = NN.MORTGAGE;
  if (price <= 500000) return price * M.MIN_DOWN_UNDER_500K;
  if (price <= M.MAX_PURCHASE_INSURED) return 500000 * M.MIN_DOWN_UNDER_500K + (price - 500000) * M.MIN_DOWN_500K_TO_1_5M;
  return price * M.MIN_DOWN_OVER_1_5M;
};

/** Whether a purchase at this price/down-payment could use insured
 * (high-ratio) financing at all — down payment strictly under 20% AND
 * price at or under the insured price ceiling. */
NN.isInsuredEligible = function(price, downPayment) {
  const dpRatio = price > 0 ? downPayment / price : 0;
  return price > 0 && dpRatio < 0.20 && price <= NN.MORTGAGE.MAX_PURCHASE_INSURED;
};
NN.calcCPPContribution  = function(income) { return Math.min(Math.max(income-NN.CPP.BASIC_EXEMPTION,0) * NN.CPP.EMPLOYEE_RATE, NN.CPP.MAX_EMPLOYEE_CONTRIBUTION); };
NN.calcEIPremium        = function(income) { return Math.min(income * NN.EI.EMPLOYEE_RATE, NN.EI.MAX_EMPLOYEE_PREMIUM); };

window.NN = NN;

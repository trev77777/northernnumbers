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
  ANNUAL_LIMIT: 7000, LIFETIME_2026: 95000,
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
  CARRY_FORWARD:8000, HBP_MAX:35000, ELIGIBLE_FROM:2023
};

/* RRSP */
NN.RRSP = {
  ANNUAL_MAX:32490, INCOME_PCT:0.18, OVERCONTRIB_BUFFER:2000,
  HBP_MAX:35000, HBP_REPAY_YEARS:15,
  LLP_MAX_ANNUAL:10000, LLP_MAX_TOTAL:20000, RRIF_AGE:71
};

/* RESP */
NN.RESP = {
  CESG_RATE:0.20, CESG_MAX_ANNUAL:500, CESG_MAX_LIFETIME:7200,
  CESG_ELIGIBLE_CONTRIBUTION:2500, LIFETIME_LIMIT:50000,
  CLB_MAX:2000, SUBSCRIBER_AGE_MAX:31
};

/* CPP 2026 */
NN.CPP = {
  YMPE:68500, BASIC_EXEMPTION:3500,
  EMPLOYEE_RATE:0.0595, EMPLOYER_RATE:0.0595,
  MAX_EMPLOYEE_CONTRIBUTION:3867.50,
  CPP2_YMPE:73200, CPP2_RATE:0.04,
  RETIREMENT_AGE_STANDARD:65, RETIREMENT_AGE_EARLY:60, RETIREMENT_AGE_LATE:70,
  EARLY_REDUCTION_PER_MONTH:0.006, LATE_INCREASE_PER_MONTH:0.007
};

/* EI 2026 */
NN.EI = {
  MAX_INSURABLE_EARNINGS:65700,
  EMPLOYEE_RATE:0.0166, EMPLOYER_RATE:0.02324,
  MAX_EMPLOYEE_PREMIUM:1090.62, MAX_EMPLOYER_PREMIUM:1526.87,
  BENEFIT_RATE:0.55, MAX_WEEKLY_BENEFIT:695,
  MIN_WEEKS:14, MAX_WEEKS:45
};

/* OAS 2026 */
NN.OAS = {
  MONTHLY_65_TO_74:727.67, MONTHLY_75_PLUS:800.44,
  CLAWBACK_THRESHOLD:90997, CLAWBACK_RATE:0.15,
  DEFERRAL_BONUS_PER_MONTH:0.006, MAX_DEFERRAL_AGE:70,
  FULL_ELIGIBILITY_YEARS:40, PARTIAL_MIN_YEARS:10
};

/* GIS 2026 */
NN.GIS = {
  MAX_MONTHLY_SINGLE:1057.01, MAX_MONTHLY_COUPLE:636.26,
  INCOME_THRESHOLD_SINGLE:21456, INCOME_THRESHOLD_COUPLE:28368
};

/* Federal Tax Brackets 2026 */
NN.FED_BRACKETS = [
  {min:0,      max:57375,    rate:0.15  },
  {min:57375,  max:114750,   rate:0.205 },
  {min:114750, max:158519,   rate:0.26  },
  {min:158519, max:220000,   rate:0.29  },
  {min:220000, max:Infinity, rate:0.33  }
];
NN.FEDERAL_BASIC_PERSONAL = 16129;

/* Provincial Tax Brackets 2026 */
NN.PROV_BRACKETS = {
  ON:[{min:0,max:51446,rate:0.0505},{min:51446,max:102894,rate:0.0915},{min:102894,max:150000,rate:0.1116},{min:150000,max:220000,rate:0.1216},{min:220000,max:Infinity,rate:0.1316}],
  AB:[{min:0,max:148269,rate:0.10},{min:148269,max:177922,rate:0.12},{min:177922,max:237230,rate:0.13},{min:237230,max:355845,rate:0.14},{min:355845,max:Infinity,rate:0.15}],
  BC:[{min:0,max:45654,rate:0.0506},{min:45654,max:91310,rate:0.077},{min:91310,max:104835,rate:0.105},{min:104835,max:127299,rate:0.1229},{min:127299,max:172602,rate:0.147},{min:172602,max:240716,rate:0.168},{min:240716,max:Infinity,rate:0.205}],
  MB:[{min:0,max:47000,rate:0.108},{min:47000,max:100000,rate:0.1275},{min:100000,max:Infinity,rate:0.174}],
  SK:[{min:0,max:49720,rate:0.105},{min:49720,max:142058,rate:0.125},{min:142058,max:Infinity,rate:0.145}],
  QC:[{min:0,max:53255,rate:0.14},{min:53255,max:106495,rate:0.19},{min:106495,max:129590,rate:0.24},{min:129590,max:Infinity,rate:0.2575}],
  NB:[{min:0,max:49958,rate:0.094},{min:49958,max:99916,rate:0.14},{min:99916,max:185064,rate:0.16},{min:185064,max:Infinity,rate:0.195}],
  NS:[{min:0,max:29590,rate:0.0879},{min:29590,max:59180,rate:0.1495},{min:59180,max:93000,rate:0.1667},{min:93000,max:150000,rate:0.175},{min:150000,max:Infinity,rate:0.21}],
  PE:[{min:0,max:32656,rate:0.0965},{min:32656,max:64313,rate:0.1363},{min:64313,max:105000,rate:0.1665},{min:105000,max:140000,rate:0.18},{min:140000,max:Infinity,rate:0.1875}],
  NL:[{min:0,max:43198,rate:0.087},{min:43198,max:86395,rate:0.145},{min:86395,max:154244,rate:0.158},{min:154244,max:215943,rate:0.178},{min:215943,max:275870,rate:0.198},{min:275870,max:Infinity,rate:0.208}],
  YT:[{min:0,max:57375,rate:0.064},{min:57375,max:114750,rate:0.09},{min:114750,max:500000,rate:0.109},{min:500000,max:Infinity,rate:0.128}],
  NT:[{min:0,max:50597,rate:0.059},{min:50597,max:101198,rate:0.086},{min:101198,max:164525,rate:0.122},{min:164525,max:Infinity,rate:0.1405}],
  NU:[{min:0,max:53268,rate:0.04},{min:53268,max:106537,rate:0.07},{min:106537,max:173205,rate:0.09},{min:173205,max:Infinity,rate:0.115}]
};

NN.PROV_BASIC_PERSONAL = {
  ON:11865,AB:21003,BC:11981,MB:15780,SK:17661,QC:17183,
  NB:12458,NS:8481,PE:12000,NL:10900,YT:16129,NT:16593,NU:17925
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

/* Mortgage/CMHC 2026 */
NN.MORTGAGE = {
  STRESS_TEST_RATE:5.25,
  MAX_AMORTIZATION_INSURED:25, MAX_AMORTIZATION_UNINSURED:30,
  MAX_PURCHASE_INSURED:999999,
  MIN_DOWN_UNDER_500K:0.05, MIN_DOWN_500K_TO_1M:0.10, MIN_DOWN_OVER_1M:0.20,
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
NN.calcCPPContribution  = function(income) { return Math.min(Math.max(income-NN.CPP.BASIC_EXEMPTION,0) * NN.CPP.EMPLOYEE_RATE, NN.CPP.MAX_EMPLOYEE_CONTRIBUTION); };
NN.calcEIPremium        = function(income) { return Math.min(income * NN.EI.EMPLOYEE_RATE, NN.EI.MAX_EMPLOYEE_PREMIUM); };

window.NN = NN;

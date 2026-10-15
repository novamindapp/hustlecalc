/** 2026 single-filer state tax brackets. Simplified: standard deduction only, no credits/phaseouts. Not tax advice.
 * CA/ID/ND/VT use 2025 inflation-adjusted widths (2026 figures unpublished at press time).
 * SC uses 6.2% top rate (in effect from 7/1/2026; 6.0% applied 7/1/2025-6/30/2026).
 * AR uses corrected 3.7% top rate (May 2026 cut, retroactive to 1/1/2026). */
export type StateBracket = { upTo: number | null; rate: number }; // upTo=null means "and above"
export type StateTaxProfile = {
  /** Single-filer standard deduction for 2026. 0 if none. */
  stdDed: number;
  /** Progressive brackets, ascending. Empty array = no broad income tax on this income. */
  brackets: StateBracket[];
};
export const STATE_BRACKETS: Record<string, StateTaxProfile> = {
  AL: { stdDed: 3000, brackets: [{ upTo: 500, rate: 0.02 }, { upTo: 3000, rate: 0.04 }, { upTo: null, rate: 0.05 }] },
  AK: { stdDed: 0, brackets: [] },
  AZ: { stdDed: 8350, brackets: [{ upTo: null, rate: 0.025 }] },
  AR: { stdDed: 2470, brackets: [{ upTo: 5600, rate: 0 }, { upTo: 11200, rate: 0.02 }, { upTo: 16000, rate: 0.03 }, { upTo: 26400, rate: 0.034 }, { upTo: null, rate: 0.037 }] },
  CA: { stdDed: 5540, brackets: [{ upTo: 11079, rate: 0.01 }, { upTo: 26264, rate: 0.02 }, { upTo: 41452, rate: 0.04 }, { upTo: 57542, rate: 0.06 }, { upTo: 72724, rate: 0.08 }, { upTo: 371479, rate: 0.093 }, { upTo: 445771, rate: 0.103 }, { upTo: 742953, rate: 0.113 }, { upTo: 1000000, rate: 0.123 }, { upTo: null, rate: 0.133 }] },
  CO: { stdDed: 16100, brackets: [{ upTo: null, rate: 0.044 }] },
  CT: { stdDed: 0, brackets: [{ upTo: 10000, rate: 0.02 }, { upTo: 50000, rate: 0.045 }, { upTo: 100000, rate: 0.055 }, { upTo: 200000, rate: 0.06 }, { upTo: 250000, rate: 0.065 }, { upTo: 500000, rate: 0.069 }, { upTo: null, rate: 0.0699 }] },
  DE: { stdDed: 3250, brackets: [{ upTo: 2000, rate: 0 }, { upTo: 5000, rate: 0.022 }, { upTo: 10000, rate: 0.039 }, { upTo: 20000, rate: 0.048 }, { upTo: 25000, rate: 0.052 }, { upTo: 60000, rate: 0.0555 }, { upTo: null, rate: 0.066 }] },
  DC: { stdDed: 16100, brackets: [{ upTo: 10000, rate: 0.04 }, { upTo: 40000, rate: 0.06 }, { upTo: 60000, rate: 0.065 }, { upTo: 250000, rate: 0.085 }, { upTo: 500000, rate: 0.0925 }, { upTo: 1000000, rate: 0.0975 }, { upTo: null, rate: 0.1075 }] },
  FL: { stdDed: 0, brackets: [] },
  GA: { stdDed: 12000, brackets: [{ upTo: null, rate: 0.0519 }] },
  HI: { stdDed: 4400, brackets: [{ upTo: 9600, rate: 0.014 }, { upTo: 14400, rate: 0.032 }, { upTo: 19200, rate: 0.055 }, { upTo: 24000, rate: 0.064 }, { upTo: 36000, rate: 0.068 }, { upTo: 48000, rate: 0.072 }, { upTo: 125000, rate: 0.076 }, { upTo: 175000, rate: 0.079 }, { upTo: 225000, rate: 0.0825 }, { upTo: 275000, rate: 0.09 }, { upTo: 325000, rate: 0.1 }, { upTo: null, rate: 0.11 }] },
  ID: { stdDed: 16100, brackets: [{ upTo: 4811, rate: 0 }, { upTo: null, rate: 0.053 }] },
  IL: { stdDed: 0, brackets: [{ upTo: null, rate: 0.0495 }] },
  IN: { stdDed: 0, brackets: [{ upTo: null, rate: 0.0295 }] },
  IA: { stdDed: 16100, brackets: [{ upTo: null, rate: 0.038 }] },
  KS: { stdDed: 3605, brackets: [{ upTo: 23000, rate: 0.052 }, { upTo: null, rate: 0.0558 }] },
  KY: { stdDed: 3360, brackets: [{ upTo: null, rate: 0.035 }] },
  LA: { stdDed: 12875, brackets: [{ upTo: null, rate: 0.03 }] },
  ME: { stdDed: 8350, brackets: [{ upTo: 27399, rate: 0.058 }, { upTo: 64849, rate: 0.0675 }, { upTo: null, rate: 0.0715 }] },
  MD: { stdDed: 3350, brackets: [{ upTo: 1000, rate: 0.02 }, { upTo: 2000, rate: 0.03 }, { upTo: 3000, rate: 0.04 }, { upTo: 100000, rate: 0.0475 }, { upTo: 125000, rate: 0.05 }, { upTo: 150000, rate: 0.0525 }, { upTo: 250000, rate: 0.055 }, { upTo: 500000, rate: 0.0575 }, { upTo: 1000000, rate: 0.0625 }, { upTo: null, rate: 0.065 }] },
  MA: { stdDed: 0, brackets: [{ upTo: 1083150, rate: 0.05 }, { upTo: null, rate: 0.09 }] },
  MI: { stdDed: 0, brackets: [{ upTo: null, rate: 0.0425 }] },
  MN: { stdDed: 15300, brackets: [{ upTo: 33310, rate: 0.0535 }, { upTo: 109430, rate: 0.068 }, { upTo: 203150, rate: 0.0785 }, { upTo: null, rate: 0.0985 }] },
  MS: { stdDed: 2300, brackets: [{ upTo: 10000, rate: 0 }, { upTo: null, rate: 0.04 }] },
  MO: { stdDed: 16100, brackets: [{ upTo: 1348, rate: 0 }, { upTo: 2696, rate: 0.02 }, { upTo: 4044, rate: 0.025 }, { upTo: 5392, rate: 0.03 }, { upTo: 6740, rate: 0.035 }, { upTo: 8088, rate: 0.04 }, { upTo: 9436, rate: 0.045 }, { upTo: null, rate: 0.047 }] },
  MT: { stdDed: 16100, brackets: [{ upTo: 47500, rate: 0.047 }, { upTo: null, rate: 0.0565 }] },
  NE: { stdDed: 8850, brackets: [{ upTo: 4130, rate: 0.0246 }, { upTo: 24760, rate: 0.0351 }, { upTo: null, rate: 0.0455 }] },
  NV: { stdDed: 0, brackets: [] },
  NH: { stdDed: 0, brackets: [] },
  NJ: { stdDed: 0, brackets: [{ upTo: 20000, rate: 0.014 }, { upTo: 35000, rate: 0.0175 }, { upTo: 40000, rate: 0.035 }, { upTo: 75000, rate: 0.0553 }, { upTo: 500000, rate: 0.0637 }, { upTo: 1000000, rate: 0.0897 }, { upTo: null, rate: 0.1075 }] },
  NM: { stdDed: 16100, brackets: [{ upTo: 5500, rate: 0.015 }, { upTo: 16500, rate: 0.032 }, { upTo: 33500, rate: 0.043 }, { upTo: 66500, rate: 0.047 }, { upTo: 210000, rate: 0.049 }, { upTo: null, rate: 0.059 }] },
  NY: { stdDed: 8000, brackets: [{ upTo: 8500, rate: 0.039 }, { upTo: 11700, rate: 0.044 }, { upTo: 13900, rate: 0.0515 }, { upTo: 80650, rate: 0.054 }, { upTo: 215400, rate: 0.059 }, { upTo: 1077550, rate: 0.0685 }, { upTo: 5000000, rate: 0.0965 }, { upTo: 25000000, rate: 0.103 }, { upTo: null, rate: 0.109 }] },
  NC: { stdDed: 12750, brackets: [{ upTo: null, rate: 0.0399 }] },
  ND: { stdDed: 16100, brackets: [{ upTo: 48475, rate: 0 }, { upTo: 244825, rate: 0.0195 }, { upTo: null, rate: 0.025 }] },
  OH: { stdDed: 0, brackets: [{ upTo: 26050, rate: 0 }, { upTo: null, rate: 0.0275 }] },
  OK: { stdDed: 6350, brackets: [{ upTo: 3750, rate: 0 }, { upTo: 4900, rate: 0.025 }, { upTo: 7200, rate: 0.035 }, { upTo: null, rate: 0.045 }] },
  OR: { stdDed: 2910, brackets: [{ upTo: 4550, rate: 0.0475 }, { upTo: 11400, rate: 0.0675 }, { upTo: 125000, rate: 0.0875 }, { upTo: null, rate: 0.099 }] },
  PA: { stdDed: 0, brackets: [{ upTo: null, rate: 0.0307 }] },
  RI: { stdDed: 11200, brackets: [{ upTo: 82050, rate: 0.0375 }, { upTo: 186450, rate: 0.0475 }, { upTo: null, rate: 0.0599 }] },
  SC: { stdDed: 8350, brackets: [{ upTo: 3640, rate: 0 }, { upTo: 18230, rate: 0.03 }, { upTo: null, rate: 0.062 }] },
  SD: { stdDed: 0, brackets: [] },
  TN: { stdDed: 0, brackets: [] },
  TX: { stdDed: 0, brackets: [] },
  UT: { stdDed: 0, brackets: [{ upTo: null, rate: 0.045 }] },
  VT: { stdDed: 7650, brackets: [{ upTo: 49400, rate: 0.0335 }, { upTo: 119700, rate: 0.066 }, { upTo: 249700, rate: 0.076 }, { upTo: null, rate: 0.0875 }] },
  VA: { stdDed: 8750, brackets: [{ upTo: 3000, rate: 0.02 }, { upTo: 5000, rate: 0.03 }, { upTo: 17000, rate: 0.05 }, { upTo: null, rate: 0.0575 }] },
  WA: { stdDed: 0, brackets: [] },
  WV: { stdDed: 0, brackets: [{ upTo: 10000, rate: 0.0222 }, { upTo: 25000, rate: 0.0296 }, { upTo: 40000, rate: 0.0333 }, { upTo: 60000, rate: 0.0444 }, { upTo: null, rate: 0.0482 }] },
  WI: { stdDed: 13960, brackets: [{ upTo: 15110, rate: 0.035 }, { upTo: 51950, rate: 0.044 }, { upTo: 332720, rate: 0.053 }, { upTo: null, rate: 0.0765 }] },
  WY: { stdDed: 0, brackets: [] },
};

export function stateTaxWithBrackets(code: string, base: number): number | null {
  const profile = STATE_BRACKETS[code];
  if (!profile) return null;
  const taxable = Math.max(0, base - profile.stdDed);
  if (taxable <= 0 || profile.brackets.length === 0) return 0;
  let tax = 0;
  let floor = 0;
  for (const b of profile.brackets) {
    const ceiling = b.upTo ?? Number.POSITIVE_INFINITY;
    const slice = Math.min(taxable, ceiling) - floor;
    if (slice > 0) tax += slice * b.rate;
    if (taxable <= ceiling) break;
    floor = ceiling;
  }
  return tax;
}

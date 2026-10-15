"""HustleCalc Pro - PART 1 of 2.
Writes: src/lib/state-brackets.ts (new), patches src/lib/tax.ts,
appends print CSS to src/styles.css. Run from ~/hustlecalc.
After this, run pro_part2.py, then git add/commit/push.
"""
import pathlib

ROOT = pathlib.Path.home() / "hustlecalc"

SB = r'''/** 2025 single-filer state tax brackets. Simplified: standard deduction only, no credits/phaseouts. Not tax advice. */
export type StateBracket = { upTo: number | null; rate: number }; // upTo=null means "and above"
export type StateTaxProfile = {
  /** Single-filer standard deduction for 2025. 0 if none. */
  stdDed: number;
  /** Progressive brackets, ascending. Empty array = no broad income tax on this income. */
  brackets: StateBracket[];
};
export const STATE_BRACKETS: Record<string, StateTaxProfile> = {
  AL: { stdDed: 3000, brackets: [{ upTo: 500, rate: 0.02 }, { upTo: 3000, rate: 0.04 }, { upTo: null, rate: 0.05 }] },
  AK: { stdDed: 0, brackets: [] },
  AZ: { stdDed: 15000, brackets: [{ upTo: null, rate: 0.025 }] },
  AR: { stdDed: 2410, brackets: [{ upTo: 4500, rate: 0.02 }, { upTo: null, rate: 0.039 }] },
  CA: { stdDed: 5706, brackets: [{ upTo: 11079, rate: 0.01 }, { upTo: 26264, rate: 0.02 }, { upTo: 41452, rate: 0.04 }, { upTo: 57542, rate: 0.06 }, { upTo: 72724, rate: 0.08 }, { upTo: 371479, rate: 0.093 }, { upTo: 445771, rate: 0.103 }, { upTo: 742953, rate: 0.113 }, { upTo: 1000000, rate: 0.123 }, { upTo: null, rate: 0.133 }] },
  CO: { stdDed: 15750, brackets: [{ upTo: null, rate: 0.044 }] },
  CT: { stdDed: 0, brackets: [{ upTo: 10000, rate: 0.02 }, { upTo: 50000, rate: 0.045 }, { upTo: 100000, rate: 0.055 }, { upTo: 200000, rate: 0.06 }, { upTo: 250000, rate: 0.065 }, { upTo: 500000, rate: 0.069 }, { upTo: null, rate: 0.0699 }] },
  DE: { stdDed: 3250, brackets: [{ upTo: 2000, rate: 0 }, { upTo: 5000, rate: 0.022 }, { upTo: 10000, rate: 0.039 }, { upTo: 20000, rate: 0.048 }, { upTo: 25000, rate: 0.052 }, { upTo: 60000, rate: 0.0555 }, { upTo: null, rate: 0.066 }] },
  DC: { stdDed: 15000, brackets: [{ upTo: 10000, rate: 0.04 }, { upTo: 40000, rate: 0.06 }, { upTo: 60000, rate: 0.065 }, { upTo: 250000, rate: 0.085 }, { upTo: 500000, rate: 0.0925 }, { upTo: 1000000, rate: 0.0975 }, { upTo: null, rate: 0.1075 }] },
  FL: { stdDed: 0, brackets: [] },
  GA: { stdDed: 12000, brackets: [{ upTo: null, rate: 0.0519 }] },
  HI: { stdDed: 4400, brackets: [{ upTo: 9600, rate: 0.014 }, { upTo: 14400, rate: 0.032 }, { upTo: 19200, rate: 0.055 }, { upTo: 24000, rate: 0.064 }, { upTo: 36000, rate: 0.068 }, { upTo: 48000, rate: 0.072 }, { upTo: 125000, rate: 0.076 }, { upTo: 175000, rate: 0.079 }, { upTo: 225000, rate: 0.0825 }, { upTo: 275000, rate: 0.09 }, { upTo: 325000, rate: 0.10 }, { upTo: null, rate: 0.11 }] },
  ID: { stdDed: 15000, brackets: [{ upTo: 2500, rate: 0 }, { upTo: null, rate: 0.053 }] },
  IL: { stdDed: 0, brackets: [{ upTo: null, rate: 0.0495 }] },
  IN: { stdDed: 0, brackets: [{ upTo: null, rate: 0.03 }] },
  IA: { stdDed: 0, brackets: [{ upTo: null, rate: 0.038 }] },
  KS: { stdDed: 3605, brackets: [{ upTo: 23000, rate: 0.052 }, { upTo: null, rate: 0.0558 }] },
  KY: { stdDed: 3270, brackets: [{ upTo: null, rate: 0.04 }] },
  LA: { stdDed: 12500, brackets: [{ upTo: null, rate: 0.03 }] },
  ME: { stdDed: 15000, brackets: [{ upTo: 26800, rate: 0.058 }, { upTo: 63450, rate: 0.0675 }, { upTo: null, rate: 0.0715 }] },
  MD: { stdDed: 2700, brackets: [{ upTo: 1000, rate: 0.02 }, { upTo: 2000, rate: 0.03 }, { upTo: 3000, rate: 0.04 }, { upTo: 100000, rate: 0.0475 }, { upTo: 125000, rate: 0.05 }, { upTo: 150000, rate: 0.0525 }, { upTo: 250000, rate: 0.055 }, { upTo: null, rate: 0.0575 }] },
  MA: { stdDed: 0, brackets: [{ upTo: 1083150, rate: 0.05 }, { upTo: null, rate: 0.09 }] },
  MI: { stdDed: 0, brackets: [{ upTo: null, rate: 0.0425 }] },
  MN: { stdDed: 14950, brackets: [{ upTo: 32570, rate: 0.0535 }, { upTo: 106990, rate: 0.068 }, { upTo: 198630, rate: 0.0785 }, { upTo: null, rate: 0.0985 }] },
  MS: { stdDed: 2300, brackets: [{ upTo: 10000, rate: 0 }, { upTo: null, rate: 0.044 }] },
  MO: { stdDed: 15750, brackets: [{ upTo: 1313, rate: 0 }, { upTo: 2626, rate: 0.02 }, { upTo: 3939, rate: 0.025 }, { upTo: 5252, rate: 0.03 }, { upTo: 6565, rate: 0.035 }, { upTo: 7878, rate: 0.04 }, { upTo: 9191, rate: 0.045 }, { upTo: null, rate: 0.047 }] },
  MT: { stdDed: 15000, brackets: [{ upTo: 21100, rate: 0.047 }, { upTo: null, rate: 0.059 }] },
  NE: { stdDed: 8600, brackets: [{ upTo: 4030, rate: 0.0246 }, { upTo: 24120, rate: 0.0351 }, { upTo: 38870, rate: 0.0501 }, { upTo: null, rate: 0.052 }] },
  NV: { stdDed: 0, brackets: [] },
  NH: { stdDed: 0, brackets: [] },
  NJ: { stdDed: 0, brackets: [{ upTo: 20000, rate: 0.014 }, { upTo: 35000, rate: 0.0175 }, { upTo: 40000, rate: 0.035 }, { upTo: 75000, rate: 0.05525 }, { upTo: 500000, rate: 0.0637 }, { upTo: 1000000, rate: 0.0897 }, { upTo: null, rate: 0.1075 }] },
  NM: { stdDed: 15000, brackets: [{ upTo: 5500, rate: 0.015 }, { upTo: 16500, rate: 0.032 }, { upTo: 33500, rate: 0.043 }, { upTo: 66500, rate: 0.047 }, { upTo: 210000, rate: 0.049 }, { upTo: null, rate: 0.059 }] },
  NY: { stdDed: 8000, brackets: [{ upTo: 8500, rate: 0.04 }, { upTo: 11700, rate: 0.045 }, { upTo: 13900, rate: 0.0525 }, { upTo: 80650, rate: 0.055 }, { upTo: 215400, rate: 0.06 }, { upTo: 1077550, rate: 0.0685 }, { upTo: 5000000, rate: 0.0965 }, { upTo: 25000000, rate: 0.103 }, { upTo: null, rate: 0.109 }] },
  NC: { stdDed: 12750, brackets: [{ upTo: null, rate: 0.0425 }] },
  ND: { stdDed: 15750, brackets: [{ upTo: 48475, rate: 0 }, { upTo: 244825, rate: 0.0195 }, { upTo: null, rate: 0.025 }] },
  OH: { stdDed: 0, brackets: [{ upTo: 26050, rate: 0 }, { upTo: 100000, rate: 0.0275 }, { upTo: null, rate: 0.03125 }] },
  OK: { stdDed: 6350, brackets: [{ upTo: 1000, rate: 0.0025 }, { upTo: 2500, rate: 0.0075 }, { upTo: 3750, rate: 0.0175 }, { upTo: 4900, rate: 0.0275 }, { upTo: 7200, rate: 0.0375 }, { upTo: null, rate: 0.0475 }] },
  OR: { stdDed: 2835, brackets: [{ upTo: 4400, rate: 0.0475 }, { upTo: 11050, rate: 0.0675 }, { upTo: 125000, rate: 0.0875 }, { upTo: null, rate: 0.099 }] },
  PA: { stdDed: 0, brackets: [{ upTo: null, rate: 0.0307 }] },
  RI: { stdDed: 10900, brackets: [{ upTo: 79900, rate: 0.0375 }, { upTo: 181650, rate: 0.0475 }, { upTo: null, rate: 0.0599 }] },
  SC: { stdDed: 15000, brackets: [{ upTo: 3560, rate: 0 }, { upTo: 17830, rate: 0.03 }, { upTo: null, rate: 0.062 }] },
  SD: { stdDed: 0, brackets: [] },
  TN: { stdDed: 0, brackets: [] },
  TX: { stdDed: 0, brackets: [] },
  UT: { stdDed: 0, brackets: [{ upTo: null, rate: 0.0455 }] },
  VT: { stdDed: 7650, brackets: [{ upTo: 47900, rate: 0.0335 }, { upTo: 116000, rate: 0.066 }, { upTo: 242000, rate: 0.076 }, { upTo: null, rate: 0.0875 }] },
  VA: { stdDed: 8500, brackets: [{ upTo: 3000, rate: 0.02 }, { upTo: 5000, rate: 0.03 }, { upTo: 17000, rate: 0.05 }, { upTo: null, rate: 0.0575 }] },
  WA: { stdDed: 0, brackets: [] },
  WV: { stdDed: 0, brackets: [{ upTo: 10000, rate: 0.0222 }, { upTo: 25000, rate: 0.0296 }, { upTo: 40000, rate: 0.0333 }, { upTo: 60000, rate: 0.0444 }, { upTo: null, rate: 0.0482 }] },
  WI: { stdDed: 13560, brackets: [{ upTo: 14680, rate: 0.035 }, { upTo: 29370, rate: 0.044 }, { upTo: 323290, rate: 0.053 }, { upTo: null, rate: 0.0765 }] },
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
'''

TAX_OLD = r'''export function federalTax(taxable: number): number {
  if (taxable <= 0) return 0;
  let tax = 0;
  let floor = 0;
  for (const bracket of FEDERAL_BRACKETS) {
    const ceiling = bracket.upTo ?? Number.POSITIVE_INFINITY;
    const slice = Math.min(taxable, ceiling) - floor;
    if (slice > 0) tax += slice * bracket.rate;
    if (taxable <= ceiling) break;
    floor = ceiling;
  }
  return tax;
}'''

TAX_NEW = r'''export type TaxBracket = { upTo: number | null; rate: number };

/** Progressive tax on `taxable` through ascending brackets. Shared by federal and state. */
export function applyBrackets(taxable: number, brackets: TaxBracket[]): number {
  if (taxable <= 0 || brackets.length === 0) return 0;
  let tax = 0;
  let floor = 0;
  for (const bracket of brackets) {
    const ceiling = bracket.upTo ?? Number.POSITIVE_INFINITY;
    const slice = Math.min(taxable, ceiling) - floor;
    if (slice > 0) tax += slice * bracket.rate;
    if (taxable <= ceiling) break;
    floor = ceiling;
  }
  return tax;
}

export function federalTax(taxable: number): number {
  return applyBrackets(taxable, FEDERAL_BRACKETS);
}'''

CSS_BLOCK = r'''/* Pro PDF report: hidden on screen, only the report prints. */
.print-report {
  display: none;
}

@media print {
  .pro-print-root > :not(.print-report) {
    display: none !important;
  }
  .print-report {
    display: block !important;
    background: #ffffff !important;
    color: #111111 !important;
    padding: 24px;
    font-family: ui-sans-serif, system-ui, sans-serif;
  }
  .print-report h1 {
    font-size: 20px;
    margin: 0 0 4px;
    color: #111111 !important;
  }
  .print-report h2 {
    font-size: 14px;
    margin: 18px 0 6px;
    color: #111111 !important;
  }
  .print-report p {
    font-size: 12px;
    margin: 0 0 4px;
    color: #333333 !important;
  }
  .print-report table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
  }
  .print-report th,
  .print-report td {
    border: 1px solid #999999;
    padding: 6px 8px;
    font-size: 12px;
    text-align: left;
    color: #111111 !important;
    background: #ffffff !important;
  }
  .print-report .print-disclaimer {
    margin-top: 18px;
    font-size: 11px;
    color: #555555 !important;
  }
}
'''

CSS_MARKER = "/* Pro PDF report"

def ok(label, cond):
    print(("OK: " if cond else "FAIL: ") + label)
    return bool(cond)

allok = True

# 1. state-brackets.ts (new file)
p = ROOT / "src/lib/state-brackets.ts"
p.write_text(SB)
allok &= ok("state-brackets.ts written", p.exists())

# 2. tax.ts: swap federalTax for the shared applyBrackets helper
p = ROOT / "src/lib/tax.ts"
t = p.read_text()
if "applyBrackets" in t:
    print("OK: tax.ts already patched")
else:
    assert t.count(TAX_OLD) == 1, "tax.ts anchor not found exactly once"
    p.write_text(t.replace(TAX_OLD, TAX_NEW))
    print("OK: tax.ts patched")

# 3. styles.css: append print CSS once
p = ROOT / "src/styles.css"
t = p.read_text()
if CSS_MARKER in t:
    print("OK: styles.css already has print CSS")
else:
    sep = "" if t.endswith("\n") else "\n"
    p.write_text(t + sep + "\n" + CSS_BLOCK)
    print("OK: styles.css print CSS appended")

# verify
t = (ROOT / "src/lib/tax.ts").read_text()
allok &= ok("tax.ts has applyBrackets", "applyBrackets" in t)
t = (ROOT / "src/styles.css").read_text()
allok &= ok("styles.css has print CSS", CSS_MARKER in t)
t = (ROOT / "src/lib/state-brackets.ts").read_text()
allok &= ok("51 states in data", t.count(": { stdDed") == 51)

print("PART 1 COMPLETE OK" if allok else "PART 1 HAS FAILURES")

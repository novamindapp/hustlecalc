#!/usr/bin/env python3
"""HustleCalc 2026 update, part B: regenerate src/lib/state-brackets.ts with 2026 figures.
Run from the repo root: python3 pro_2026b.py
Data: Tax Foundation "State Individual Income Tax Rates and Brackets, 2026" + 2026 law changes.
Notes: CA/ID/ND/VT 2026 inflation adjustments were unpublished at press time (2025 levels used).
       SC uses 6.2% (rate in effect from 7/1/2026; 6.0% applied only 7/1/2025-6/30/2026).
       AR uses corrected 3.7% top rate (May 2026 cut, retroactive to 1/1/2026).
Idempotent: re-running rewrites the same content.
"""
import re

# code -> (stdDed, [(upTo, rate), ...]); upTo=None means "and above"
DATA = [
    ("AL", 3000, [(500, 0.02), (3000, 0.04), (None, 0.05)]),
    ("AK", 0, []),
    ("AZ", 8350, [(None, 0.025)]),
    ("AR", 2470, [(5600, 0.0), (11200, 0.02), (16000, 0.03), (26400, 0.034), (None, 0.037)]),
    ("CA", 5540, [(11079, 0.01), (26264, 0.02), (41452, 0.04), (57542, 0.06), (72724, 0.08),
                  (371479, 0.093), (445771, 0.103), (742953, 0.113), (1000000, 0.123), (None, 0.133)]),
    ("CO", 16100, [(None, 0.044)]),
    ("CT", 0, [(10000, 0.02), (50000, 0.045), (100000, 0.055), (200000, 0.06),
               (250000, 0.065), (500000, 0.069), (None, 0.0699)]),
    ("DE", 3250, [(2000, 0.0), (5000, 0.022), (10000, 0.039), (20000, 0.048),
                  (25000, 0.052), (60000, 0.0555), (None, 0.066)]),
    ("DC", 16100, [(10000, 0.04), (40000, 0.06), (60000, 0.065), (250000, 0.085),
                   (500000, 0.0925), (1000000, 0.0975), (None, 0.1075)]),
    ("FL", 0, []),
    ("GA", 12000, [(None, 0.0519)]),
    ("HI", 4400, [(9600, 0.014), (14400, 0.032), (19200, 0.055), (24000, 0.064),
                  (36000, 0.068), (48000, 0.072), (125000, 0.076), (175000, 0.079),
                  (225000, 0.0825), (275000, 0.09), (325000, 0.10), (None, 0.11)]),
    ("ID", 16100, [(4811, 0.0), (None, 0.053)]),
    ("IL", 0, [(None, 0.0495)]),
    ("IN", 0, [(None, 0.0295)]),
    ("IA", 16100, [(None, 0.038)]),
    ("KS", 3605, [(23000, 0.052), (None, 0.0558)]),
    ("KY", 3360, [(None, 0.035)]),
    ("LA", 12875, [(None, 0.03)]),
    ("ME", 8350, [(27399, 0.058), (64849, 0.0675), (None, 0.0715)]),
    ("MD", 3350, [(1000, 0.02), (2000, 0.03), (3000, 0.04), (100000, 0.0475),
                  (125000, 0.05), (150000, 0.0525), (250000, 0.055), (500000, 0.0575),
                  (1000000, 0.0625), (None, 0.065)]),
    ("MA", 0, [(1083150, 0.05), (None, 0.09)]),
    ("MI", 0, [(None, 0.0425)]),
    ("MN", 15300, [(33310, 0.0535), (109430, 0.068), (203150, 0.0785), (None, 0.0985)]),
    ("MS", 2300, [(10000, 0.0), (None, 0.04)]),
    ("MO", 16100, [(1348, 0.0), (2696, 0.02), (4044, 0.025), (5392, 0.03),
                   (6740, 0.035), (8088, 0.04), (9436, 0.045), (None, 0.047)]),
    ("MT", 16100, [(47500, 0.047), (None, 0.0565)]),
    ("NE", 8850, [(4130, 0.0246), (24760, 0.0351), (None, 0.0455)]),
    ("NV", 0, []),
    ("NH", 0, []),
    ("NJ", 0, [(20000, 0.014), (35000, 0.0175), (40000, 0.035), (75000, 0.0553),
               (500000, 0.0637), (1000000, 0.0897), (None, 0.1075)]),
    ("NM", 16100, [(5500, 0.015), (16500, 0.032), (33500, 0.043), (66500, 0.047),
                   (210000, 0.049), (None, 0.059)]),
    ("NY", 8000, [(8500, 0.039), (11700, 0.044), (13900, 0.0515), (80650, 0.054),
                  (215400, 0.059), (1077550, 0.0685), (5000000, 0.0965),
                  (25000000, 0.103), (None, 0.109)]),
    ("NC", 12750, [(None, 0.0399)]),
    ("ND", 16100, [(48475, 0.0), (244825, 0.0195), (None, 0.025)]),
    ("OH", 0, [(26050, 0.0), (None, 0.0275)]),
    ("OK", 6350, [(3750, 0.0), (4900, 0.025), (7200, 0.035), (None, 0.045)]),
    ("OR", 2910, [(4550, 0.0475), (11400, 0.0675), (125000, 0.0875), (None, 0.099)]),
    ("PA", 0, [(None, 0.0307)]),
    ("RI", 11200, [(82050, 0.0375), (186450, 0.0475), (None, 0.0599)]),
    ("SC", 8350, [(3640, 0.0), (18230, 0.03), (None, 0.062)]),
    ("SD", 0, []),
    ("TN", 0, []),
    ("TX", 0, []),
    ("UT", 0, [(None, 0.045)]),
    ("VT", 7650, [(49400, 0.0335), (119700, 0.066), (249700, 0.076), (None, 0.0875)]),
    ("VA", 8750, [(3000, 0.02), (5000, 0.03), (17000, 0.05), (None, 0.0575)]),
    ("WA", 0, []),
    ("WV", 0, [(10000, 0.0222), (25000, 0.0296), (40000, 0.0333),
               (60000, 0.0444), (None, 0.0482)]),
    ("WI", 13960, [(15110, 0.035), (51950, 0.044), (332720, 0.053), (None, 0.0765)]),
    ("WY", 0, []),
]

# ---- validation ----
codes = [c for c, _, _ in DATA]
assert len(codes) == 51, f"expected 51 jurisdictions, got {len(codes)}"
assert len(set(codes)) == 51, "duplicate state code"
for code, std, br in DATA:
    assert std >= 0, code
    ups = [u for u, _ in br]
    assert ups == [] or ups[-1] is None, f"{code}: last bracket must be null"
    nums = [u for u in ups if u is not None]
    assert nums == sorted(nums), f"{code}: brackets not ascending"
    for _, r in br:
        assert 0 <= r < 1, f"{code}: bad rate {r}"

# ---- generate ----
def fmt_bracket(up, rate):
    u = "null" if up is None else str(up)
    return "{ upTo: %s, rate: %s }" % (u, ("%g" % rate))

lines = []
for code, std, br in DATA:
    bs = ", ".join(fmt_bracket(u, r) for u, r in br)
    lines.append("  %s: { stdDed: %d, brackets: [%s] }," % (code, std, bs))

body = "\n".join(lines)

P = "src/lib/state-brackets.ts"
cur = open(P, encoding="utf-8").read()
m = re.search(r"export function stateTaxWithBrackets", cur)
assert m, "stateTaxWithBrackets not found"
tail = cur[m.start():]  # keep the calculation function untouched

new = """/** 2026 single-filer state tax brackets. Simplified: standard deduction only, no credits/phaseouts. Not tax advice.
 * CA/ID/ND/VT use 2025 inflation-adjusted widths (2026 figures unpublished at press time).
 * SC uses 6.2%% top rate (in effect from 7/1/2026; 6.0%% applied 7/1/2025-6/30/2026).
 * AR uses corrected 3.7%% top rate (May 2026 cut, retroactive to 1/1/2026). */
export type StateBracket = { upTo: number | null; rate: number }; // upTo=null means "and above"
export type StateTaxProfile = {
  /** Single-filer standard deduction for 2026. 0 if none. */
  stdDed: number;
  /** Progressive brackets, ascending. Empty array = no broad income tax on this income. */
  brackets: StateBracket[];
};
export const STATE_BRACKETS: Record<string, StateTaxProfile> = {
%s
};

%s""" % (body, tail)

open(P, "w", encoding="utf-8").write(new)
print("OK: state-brackets.ts regenerated with 2026 figures (51 jurisdictions)")
print("PART B COMPLETE OK")

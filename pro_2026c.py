#!/usr/bin/env python3
"""HustleCalc 2026 update, part C: labels, quarterly dates, mileage tip.
Patches src/components/calculator.tsx and src/routes/__root.tsx.
Run from the repo root: python3 pro_2026c.py
Idempotent: re-running is a no-op once applied.
"""

REPS_CALC = [
    # quarterly estimated dates (2026 tax year; all weekdays, no shifts)
    ('{ quarter: "Q1", due: "April 15, 2025" },', '{ quarter: "Q1", due: "April 15, 2026" },'),
    ('{ quarter: "Q2", due: "June 16, 2025" },', '{ quarter: "Q2", due: "June 15, 2026" },'),
    ('{ quarter: "Q3", due: "September 15, 2025" },', '{ quarter: "Q3", due: "September 15, 2026" },'),
    ('{ quarter: "Q4", due: "January 15, 2026" },', '{ quarter: "Q4", due: "January 15, 2027" },'),
    # mileage tip (IRS 2026: 72.5c Jan-Jun, 76c Jul-Dec)
    ("the 2025 IRS standard rate is 70\u00a2 per mile",
     "the 2026 IRS standard rate is 76\u00a2 per mile"),
    # labels
    ("/** Pro: real 2025 state brackets instead of the one approximate rate. */",
     "/** Pro: real 2026 state brackets instead of the one approximate rate. */"),
    ("Pro: state tax uses 2025 single-filer brackets and the state standard deduction.",
     "Pro: state tax uses 2026 single-filer brackets and the state standard deduction."),
    ('<p className="font-medium text-fg">2025 single brackets</p>',
     '<p className="font-medium text-fg">2026 single brackets</p>'),
    ("\u2192 2025 bracket figure:", "\u2192 2026 bracket figure:"),
    ("Uses {state.name} 2025 single-filer brackets and standard deduction.",
     "Uses {state.name} 2026 single-filer brackets and standard deduction."),
    ("2025 estimated-tax dates.", "2026 estimated-tax dates."),
    ("<h1>Side Hustle Tax \u2014 2025 Estimate Report</h1>",
     "<h1>Side Hustle Tax \u2014 2026 Estimate Report</h1>"),
    ('if (!started) return "2025 single brackets";',
     'if (!started) return "2026 single brackets";'),
    ('if (pro) return "2025 brackets \u00b7 per year";',
     'if (pro) return "2026 brackets \u00b7 per year";'),
]

REPS_ROOT = [
    ("2025 single-filer brackets.", "2026 single-filer brackets."),
]

def apply(path, reps):
    t = open(path, encoding="utf-8").read()
    changed = 0
    for old, new in reps:
        if new in t:
            continue
        assert old in t, f"{path}: pattern not found: {old[:60]}"
        t = t.replace(old, new, 1)
        changed += 1
    open(path, "w", encoding="utf-8").write(t)
    # no stray 2025 leftovers
    left = [l for l in t.splitlines() if "2025" in l]
    assert not left, f"{path}: leftover 2025: {left[:3]}"
    print(f"OK: {path} ({changed} replacements)")

apply("src/components/calculator.tsx", REPS_CALC)
apply("src/routes/__root.tsx", REPS_ROOT)
print("PART C COMPLETE OK")

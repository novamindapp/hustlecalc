#!/usr/bin/env python3
"""HustleCalc 2026 update, part A: federal constants in src/lib/tax.ts.
Run from the repo root: python3 pro_2026a.py
Idempotent: re-running is a no-op once applied.
"""
import sys

P = "src/lib/tax.ts"
t = open(P, encoding="utf-8").read()

REPS = [
    # header + year constant
    ("/** Simplified 2025 single-filer estimate for side-hustle profit. Not tax advice. */",
     "/** Simplified 2026 single-filer estimate for side-hustle profit. Not tax advice. */"),
    ("export const TAX_YEAR = 2025;", "export const TAX_YEAR = 2026;"),
    # federal figures (Rev. Proc. 2025-32; IRS 2026 Form 1040-ES)
    ("export const STANDARD_DEDUCTION_SINGLE = 15_000;",
     "export const STANDARD_DEDUCTION_SINGLE = 16_100;"),
    ("export const QBI_LIMIT = 197_300;", "export const QBI_LIMIT = 201_750;"),
    ("export const SS_WAGE_BASE = 176_100;", "export const SS_WAGE_BASE = 184_500;"),
    ("{ upTo: 11_925, rate: 0.1 },", "{ upTo: 12_400, rate: 0.1 },"),
    ("{ upTo: 48_475, rate: 0.12 },", "{ upTo: 50_400, rate: 0.12 },"),
    ("{ upTo: 103_350, rate: 0.22 },", "{ upTo: 105_700, rate: 0.22 },"),
    ("{ upTo: 197_300, rate: 0.24 },", "{ upTo: 201_775, rate: 0.24 },"),
    ("{ upTo: 250_525, rate: 0.32 },", "{ upTo: 256_225, rate: 0.32 },"),
    ("{ upTo: 626_350, rate: 0.35 },", "{ upTo: 640_600, rate: 0.35 },"),
    # free-tier approximate state rates: 2026 law changes + corrections
    ('{ code: "AR", name: "Arkansas", rate: 0.039 },',
     '{ code: "AR", name: "Arkansas", rate: 0.037 },'),
    ('{ code: "ID", name: "Idaho", rate: 0.057 },',
     '{ code: "ID", name: "Idaho", rate: 0.053 },'),
    ('{ code: "IN", name: "Indiana", rate: 0.0305 },',
     '{ code: "IN", name: "Indiana", rate: 0.0295 },'),
    ('{ code: "KY", name: "Kentucky", rate: 0.04 },',
     '{ code: "KY", name: "Kentucky", rate: 0.035 },'),
    ('{ code: "MS", name: "Mississippi", rate: 0.044 },',
     '{ code: "MS", name: "Mississippi", rate: 0.04 },'),
    ('{ code: "MT", name: "Montana", rate: 0.059 },',
     '{ code: "MT", name: "Montana", rate: 0.0565 },'),
    ('{ code: "NE", name: "Nebraska", rate: 0.052 },',
     '{ code: "NE", name: "Nebraska", rate: 0.0455 },'),
    ('{ code: "NY", name: "New York", rate: 0.06 },',
     '{ code: "NY", name: "New York", rate: 0.059 },'),
    ('{ code: "NC", name: "North Carolina", rate: 0.0425 },',
     '{ code: "NC", name: "North Carolina", rate: 0.0399 },'),
    ('{ code: "OH", name: "Ohio", rate: 0.035 },',
     '{ code: "OH", name: "Ohio", rate: 0.0275 },'),
    ('{ code: "UT", name: "Utah", rate: 0.0455 },',
     '{ code: "UT", name: "Utah", rate: 0.045 },'),
]

changed = 0
for old, new in REPS:
    if new in t:
        continue  # already applied
    assert old in t, f"pattern not found: {old[:60]}"
    t = t.replace(old, new, 1)
    changed += 1

open(P, "w", encoding="utf-8").write(t)
print(f"OK: tax.ts updated to 2026 ({changed} replacements)")
print("PART A COMPLETE OK")

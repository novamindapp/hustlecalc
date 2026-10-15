#!/usr/bin/env python3
"""HustleCalc fix D: quarterly estimated dates never go stale again.

Problem: the site hard-codes 2026 quarterly dates (Apr 15 / Jun 15 / Sep 15
2026 are now in the past). Fix: compute the next 4 UPCOMING IRS estimated-tax
dates in JS from today's date, so the list is always correct.

Patches src/components/calculator.tsx. Run from the repo root: python3 pro_2026d.py
Idempotent: re-running is a no-op once applied.
"""
import re

PATH = "src/components/calculator.tsx"

IIFE = """...(() => {
      const __out: { quarter: string; due: string }[] = [];
      const __now = new Date(); __now.setHours(0, 0, 0, 0);
      const __fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const __c = (y: number) => [
        { q: "Q1", d: new Date(y, 3, 15) },
        { q: "Q2", d: new Date(y, 5, 15) },
        { q: "Q3", d: new Date(y, 8, 15) },
        { q: "Q4", d: new Date(y + 1, 0, 15) },
      ];
      const __push = (y: number) => { for (const x of __c(y)) { if (__out.length >= 4) break; if (x.d >= __now) __out.push({ quarter: x.q, due: __fmt(x.d) }); } };
      __push(__now.getFullYear()); __push(__now.getFullYear() + 1);
      return __out;
    })(),"""

t = open(PATH, encoding="utf-8").read()

# idempotency
if "upcomingEstimatedQuarters" in t or "__out: { quarter: string; due: string }[]" in t:
    print("Already applied: dynamic quarterly dates present. Nothing to do.")
else:
    # find the 4 static quarter lines as one block
    pat = re.compile(
        r'[ \t]*\{ quarter: "Q1", due: "[^"]+" \},\n'
        r'[ \t]*\{ quarter: "Q2", due: "[^"]+" \},\n'
        r'[ \t]*\{ quarter: "Q3", due: "[^"]+" \},\n'
        r'[ \t]*\{ quarter: "Q4", due: "[^"]+" \},?'
    )
    m = pat.search(t)
    assert m, f"{PATH}: quarterly block not found"
    assert len(pat.findall(t)) == 1, f"{PATH}: quarterly block not unique"
    indent = re.match(r"[ \t]*", m.group(0)).group(0)
    replacement = indent + IIFE.replace("\n", "\n" + indent)
    t = t[: m.start()] + replacement + t[m.end():]
    open(PATH, "w", encoding="utf-8").write(t)
    print(f"OK: {PATH} — quarterly dates are now computed from today's date")

# label: no longer tied to a fixed year
t = open(PATH, encoding="utf-8").read()
old_label = "2026 estimated-tax dates."
if old_label in t:
    t = t.replace(old_label, "Upcoming estimated-tax dates.", 1)
    open(PATH, "w", encoding="utf-8").write(t)
    print("OK: label updated to 'Upcoming estimated-tax dates.'")
else:
    print("Label already updated or not found (ok if already applied).")

print("PART D COMPLETE OK")

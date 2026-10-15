#!/usr/bin/env python3
"""HustleCalc Pro: Deduction Finder.

Adds a quiz section (6 quick questions) that estimates deductions the user
might be missing. The total savings number is FREE (the teaser); the itemized
breakdown is Pro-gated (blurred + lock for free users).

Patches src/components/calculator.tsx. Run from the repo root:
    python3 pro_deduction.py
Idempotent: re-running is a no-op once applied.
"""
import sys

PATH = "src/components/calculator.tsx"

COMPONENT = '''
/* ---------------- Deduction Finder ---------------- */
const DF_MILEAGE_RATE = 0.7425; // 2026 IRS blended rate: 72.5c Jan-Jun, 76c Jul-Dec
const DF_HOME_RATE = 5; // simplified home office: $5 / sq ft
const DF_HOME_MAX = 1500; // simplified cap

type DfAnswers = {
  miles: string;
  sqft: string;
  phonePct: string;
  phoneBill: string;
  health: string;
  supplies: string;
};

function dfNum(raw: string): number {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function DfInput({
  id,
  label,
  suffix,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  suffix: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <span className="flex items-center rounded-xl border border-line bg-raised">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
          className="min-h-12 w-full bg-transparent px-4 text-xl text-fg tabular-nums placeholder:text-muted"
        />
        <span className="pr-4 text-sm whitespace-nowrap text-muted" aria-hidden="true">
          {suffix}
        </span>
      </span>
      <span className="mt-1 block text-xs text-muted">{hint}</span>
    </label>
  );
}

function DeductionFinder({ proUnlocked }: { proUnlocked: boolean }) {
  const [a, setA] = useState<DfAnswers>({
    miles: "",
    sqft: "",
    phonePct: "",
    phoneBill: "",
    health: "",
    supplies: "",
  });
  const set = (k: keyof DfAnswers) => (v: string) => setA((p) => ({ ...p, [k]: v }));

  const rows = [
    {
      label: "Mileage",
      amount: dfNum(a.miles) * 52 * DF_MILEAGE_RATE,
      how: "Log business miles; claim the 2026 IRS standard rate.",
    },
    {
      label: "Home office",
      amount: Math.min(dfNum(a.sqft) * DF_HOME_RATE, DF_HOME_MAX),
      how: "Simplified method: $5/sq ft up to $1,500. Space must be exclusive and regular.",
    },
    {
      label: "Phone",
      amount: (dfNum(a.phoneBill) * 12 * dfNum(a.phonePct)) / 100,
      how: "Deduct the work share of your monthly bill.",
    },
    {
      label: "Health insurance",
      amount: dfNum(a.health),
      how: "Premiums can be 100% deductible when you're self-employed.",
    },
    {
      label: "Supplies & gear",
      amount: dfNum(a.supplies),
      how: "Bags, tools and gear ordinary for the hustle.",
    },
  ].filter((r) => r.amount > 0);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const answered = Object.values(a).some((v) => v.trim() !== "");

  return (
    <section
      className="mt-8 rounded-2xl border border-line bg-surface p-4 sm:p-6"
      aria-labelledby="df-title"
    >
      <p className="text-xs font-medium tracking-wider text-muted uppercase">
        Deduction Finder
      </p>
      <h2 id="df-title" className="mt-1 font-serif text-3xl leading-none">
        Write-offs you&apos;re missing
      </h2>
      <p className="mt-3 max-w-xl text-sm text-muted">
        Six quick questions. See roughly how much you could be leaving on the table.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DfInput id="df-miles" label="Business miles" suffix="mi / week" value={a.miles} onChange={set("miles")} hint="Driving for deliveries or rideshare" />
        <DfInput id="df-sqft" label="Home workspace" suffix="sq ft" value={a.sqft} onChange={set("sqft")} hint="Area used only for work" />
        <DfInput id="df-phonepct" label="Phone used for work" suffix="%" value={a.phonePct} onChange={set("phonePct")} hint="Share of your phone that's business" />
        <DfInput id="df-phonebill" label="Monthly phone bill" suffix="$ / mo" value={a.phoneBill} onChange={set("phoneBill")} hint="What you pay each month" />
        <DfInput id="df-health" label="Health premiums" suffix="$ / year" value={a.health} onChange={set("health")} hint="Paid yourself, per year" />
        <DfInput id="df-supplies" label="Supplies & gear" suffix="$ / year" value={a.supplies} onChange={set("supplies")} hint="Bags, tools, equipment per year" />
      </div>

      {answered && (
        <div className="mt-6 rounded-xl border border-keep/40 bg-keep/10 p-5 text-center">
          <p className="text-sm text-muted">Potential missing deductions</p>
          <p className="mt-1 font-serif text-5xl leading-none text-keep tabular-nums">
            ~{formatUsd(Math.round(total))}
          </p>
          <p className="mt-2 text-xs text-muted">per year · estimates only, not tax advice</p>
        </div>
      )}

      {answered && rows.length > 0 && proUnlocked && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <li key={r.label} className="rounded-xl border border-line bg-bg px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium">{r.label}</h3>
                <span className="font-serif text-xl text-keep tabular-nums">
                  {formatUsd(Math.round(r.amount))}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{r.how}</p>
            </li>
          ))}
        </ul>
      )}

      {answered && rows.length > 0 && !proUnlocked && (
        <div className="relative mt-4 overflow-hidden rounded-xl border border-line bg-bg">
          <ul className="grid gap-3 p-4 blur-sm sm:grid-cols-2" aria-hidden="true">
            {rows.map((r) => (
              <li key={r.label} className="rounded-xl border border-line px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{r.label}</h3>
                  <span className="font-serif text-xl tabular-nums">
                    {formatUsd(Math.round(r.amount))}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{r.how}</p>
              </li>
            ))}
          </ul>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <a
              href="#pro"
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium"
            >
              <Lock className="size-4" aria-hidden="true" />
              Unlock the full breakdown · Pro $9
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
'''

t = open(PATH, encoding="utf-8").read()

if "function DeductionFinder(" in t:
    print("Already applied: DeductionFinder present. Nothing to do.")
    sys.exit(0)

# 1. component definition before Calculator
a1 = "export function Calculator() {"
assert t.count(a1) == 1, "Calculator anchor"
t = t.replace(a1, COMPONENT + "\n" + a1, 1)

# 2. render before the Pro section
a2 = '<section id="pro"'
assert t.count(a2) == 1, "pro section anchor"
t = t.replace(
    a2,
    "        {/* Deduction Finder: free teaser number, Pro-gated breakdown */}\n"
    "        <DeductionFinder proUnlocked={proUnlocked} />\n"
    "        " + a2,
    1,
)

# 3. list it first in PRO_FEATURES (strongest seller)
a3 = '  {\n    title: "Save calculations",'
assert t.count(a3) == 1, "PRO_FEATURES anchor"
t = t.replace(
    a3,
    '  {\n    title: "Deduction Finder",\n    detail: "Spot the write-offs you\'re missing — with your potential savings.",\n  },\n' + a3,
    1,
)

open(PATH, "w", encoding="utf-8").write(t)
print("OK: DeductionFinder added")
print("DEDUCTION PATCH COMPLETE OK")

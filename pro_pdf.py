#!/usr/bin/env python3
"""HustleCalc: 3-page Pro PDF report (summary / plan / preparer checklist).

- Extracts shared dfRows() from DeductionFinder; lifts DfAnswers state to Calculator.
- Rewrites ProPrintReport as 3 print pages wired to live data:
    p1 summary (hero set-aside + per-month/per-year table)
    p2 payment plan (quarterly + deduction breakdown + tips)
    p3 preparer checklist (docs per hustle + assumptions + disclaimer)
- Appends print CSS (page breaks, hero, checklist) to src/styles.css.
Idempotent: safe to run twice.
"""
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
TSX = os.path.join(ROOT, "src", "components", "calculator.tsx")
CSS = os.path.join(ROOT, "src", "styles.css")

# allow running from repo root too
if not os.path.exists(TSX):
    TSX = "src/components/calculator.tsx"
    CSS = "src/styles.css"

with open(TSX, encoding="utf-8") as f:
    t = f.read()
with open(CSS, encoding="utf-8") as f:
    css = f.read()

changed = []


def rep(old, new, label):
    global t
    if new in t or (label == "df-state" and "const [dfAnswers, setDfAnswers]" in t):
        print("SKIP (already applied):", label)
        return
    if old not in t:
        print("FAIL (anchor missing):", label)
        sys.exit(1)
    t = t.replace(old, new, 1)
    changed.append(label)
    print("OK:", label)


DF_ROWS_FN = '''/** Shared deduction-row computation (screen + print report). */
function dfRows(a: DfAnswers) {
  return [
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
}

/** Documents to bring, per hustle (print report). */
const PREPARER_DOCS: Record<HustleId, string[]> = {
  delivery: [
    "Earnings summaries from each app",
    "Form 1099-K / 1099-NEC",
    "Mileage log for the whole year",
    "Phone bill and gear receipts",
  ],
  freelance: [
    "Invoices and client payment records",
    "Form 1099-NEC from each client",
    "Software and equipment receipts",
    "Home office measurements",
  ],
  selling: [
    "Platform sales reports",
    "Form 1099-K",
    "Cost of goods and shipping receipts",
    "Inventory count at year end",
  ],
  content: [
    "Platform payout statements",
    "Form 1099-NEC / 1099-K",
    "Equipment and software receipts",
    "Brand deal contracts",
  ],
  other: [
    "Records of all income received",
    "Any 1099 forms",
    "Receipts for business expenses",
  ],
};

'''

# 1. shared dfRows + preparer docs, before DeductionFinder
rep(
    "function DeductionFinder({ proUnlocked }: { proUnlocked: boolean }) {",
    DF_ROWS_FN + "function DeductionFinder({ proUnlocked, answers, onAnswers }: { proUnlocked: boolean; answers: DfAnswers; onAnswers: (a: DfAnswers) => void }) {",
    "df-rows-fn",
)

# 2. DeductionFinder uses lifted state
rep(
    """  const [a, setA] = useState<DfAnswers>({
    miles: "",
    sqft: "",
    phonePct: "",
    phoneBill: "",
    health: "",
    supplies: "",
  });
  const set = (k: keyof DfAnswers) => (v: string) => setA((p) => ({ ...p, [k]: v }));""",
    """  const a = answers;
  const set = (k: keyof DfAnswers) => (v: string) => onAnswers({ ...answers, [k]: v });""",
    "df-lifted-state",
)

# 3. rows computed via shared fn
rep(
    """  const rows = [
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
  ].filter((r) => r.amount > 0);""",
    "  const rows = dfRows(a);",
    "df-shared-rows",
)

# 4. Calculator holds dfAnswers state
rep(
    '  const [stateCode, setStateCode] = useState("");',
    '  const [stateCode, setStateCode] = useState("");\n'
    "  const [dfAnswers, setDfAnswers] = useState<DfAnswers>({\n"
    '    miles: "",\n'
    '    sqft: "",\n'
    '    phonePct: "",\n'
    '    phoneBill: "",\n'
    '    health: "",\n'
    '    supplies: "",\n'
    "  });",
    "df-state",
)

# 5. pass answers to DeductionFinder
rep(
    "<DeductionFinder proUnlocked={proUnlocked} />",
    "<DeductionFinder proUnlocked={proUnlocked} answers={dfAnswers} onAnswers={setDfAnswers} />",
    "df-props",
)

# 6. PRO_FEATURES: PDF is now 3 pages
rep(
    'detail: "A one-page summary you can hand to a preparer.",',
    'detail: "A 3-page summary: numbers, payment plan, preparer checklist.",',
    "pdf-feature-text",
)

# 7. rewrite ProPrintReport (whole function -> new 3-page version)
if "print-page print-break" in t:
    print("SKIP (already applied): print-report-3page")
    start = end = -1
else:
    start = t.index("function ProPrintReport({")
    end = t.index("\nfunction Mark()")
new_report = '''function ProPrintReport({
  hustleLabel,
  hustleId,
  stateName,
  incomeRaw,
  expenseRaw,
  otherRaw,
  estimate,
  quarterly,
  dfAnswers,
  tips,
}: {
  hustleLabel: string;
  hustleId: HustleId;
  stateName: string | null;
  incomeRaw: string;
  expenseRaw: string;
  otherRaw: string;
  estimate: ReturnType<typeof estimateTax>;
  quarterly: { quarter: string; due: string; payment: number }[];
  dfAnswers: DfAnswers;
  tips: string[];
}) {
  const rows = dfRows(dfAnswers);
  const dfTotal = rows.reduce((s, r) => s + r.amount, 0);
  const monthlyIncome = parseMoney(incomeRaw);
  const monthlyExpenses = parseMoney(expenseRaw);
  const hasOther = otherRaw.trim() !== "";
  const setAside = estimate.totalTax / 12;
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const num = (n: number) => formatUsd(Math.round(n));
  const summaryRows: [string, string, string][] = [
    ["Income", num(monthlyIncome), num(monthlyIncome * 12)],
    ["Business expenses", num(monthlyExpenses), num(monthlyExpenses * 12)],
    ["Net profit", num(estimate.profit / 12), num(estimate.profit)],
    ["Federal income tax", "\\u2014", num(estimate.federal)],
    [
      "State income tax" + (stateName ? ` (${stateName})` : ""),
      "\\u2014",
      estimate.stateTax == null ? "\\u2014" : num(estimate.stateTax),
    ],
    ["Self-employment tax (15.3%)", "\\u2014", num(estimate.seTax)],
  ];
  const docs = PREPARER_DOCS[hustleId] ?? PREPARER_DOCS.other;
  return (
    <div className="print-report" aria-hidden="true">
      {/* Page 1: summary */}
      <div className="print-page">
        <h1>Side Hustle Tax Summary</h1>
        <p className="print-meta">
          {hustleLabel} · {stateName ?? "\\u2014"} · Tax year 2026 · Prepared {dateStr}
        </p>
        <div className="print-hero">
          <span className="print-hero-num">{num(setAside)}</span>
          <span className="print-hero-label">Set aside each month for taxes</span>
        </div>
        <h2>Your numbers</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th className="n">Per month</th>
              <th className="n">Per year</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map(([label, mo, yr]) => (
              <tr key={label}>
                <td>{label}</td>
                <td className="n">{mo}</td>
                <td className="n">{yr}</td>
              </tr>
            ))}
            <tr className="print-total">
              <td>Total estimated tax</td>
              <td className="n">{num(setAside)}</td>
              <td className="n">{num(estimate.totalTax)}</td>
            </tr>
          </tbody>
        </table>
        <p className="print-foot">
          Single filer, tax year 2026. Federal estimate uses 2026 brackets after the $16,100
          standard deduction; state estimate is for {stateName ?? "your state"}.
        </p>
      </div>

      {/* Page 2: payment plan */}
      <div className="print-page print-break">
        <h1>Your payment plan</h1>
        <p className="print-meta">Estimated tax payments · {hustleLabel}</p>
        <h2>Quarterly payments</h2>
        <table>
          <thead>
            <tr>
              <th>Payment</th>
              <th>Due date</th>
              <th>Status</th>
              <th className="n">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quarterly.map((q) => (
              <tr key={q.quarter}>
                <td>{q.quarter}</td>
                <td>{q.due}</td>
                <td>{new Date(q.due) < today ? "Past due date" : "Upcoming"}</td>
                <td className="n">{num(q.payment)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="print-foot">
          Pay each quarterly amount by its due date to avoid an underpayment penalty.
        </p>
        {rows.length > 0 && (
          <>
            <h2>Deductions you may be missing</h2>
            <table>
              <thead>
                <tr>
                  <th>Deduction</th>
                  <th>How to claim</th>
                  <th className="n">Estimated deduction</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td>{r.how}</td>
                    <td className="n">{num(r.amount)}</td>
                  </tr>
                ))}
                <tr className="print-total">
                  <td>Possible deductions</td>
                  <td></td>
                  <td className="n">{num(dfTotal)}</td>
                </tr>
              </tbody>
            </table>
            <p className="print-foot">
              Potential deductions, not tax saved. Estimates only — confirm with a preparer.
            </p>
          </>
        )}
        <h2>Tax-saving tips — {hustleLabel}</h2>
        <ul>
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>

      {/* Page 3: preparer checklist */}
      <div className="print-page print-break">
        <h1>Preparer checklist</h1>
        <p className="print-meta">Bring these to your tax preparer or keep them for filing</p>
        <h2>Documents to gather</h2>
        <ul className="print-check">
          {docs.map((d) => (
            <li key={d}>
              <span className="print-box" aria-hidden="true" />
              {d}
            </li>
          ))}
        </ul>
        <h2>Assumptions in this estimate</h2>
        <ul>
          <li>
            Average monthly income {num(monthlyIncome)} and expenses {num(monthlyExpenses)}
          </li>
          <li>Single filer, standard deduction ($16,100 for 2026)</li>
          <li>{hasOther ? "Other job income was included" : "No other job income"}</li>
        </ul>
        <p className="print-disclaimer">
          Estimate only — not tax, legal, or financial advice. Consult a tax professional.
          Local taxes, credits, dependents, and itemized deductions are not included. Rates
          and limits last checked October 2026; confirm at IRS.gov before filing.
        </p>
        <p className="print-site">hustlecalc.vercel.app</p>
      </div>
    </div>
  );
}
'''
if start != -1:
    t = t[:start] + new_report + t[end:]
    changed.append("print-report-3page")
    print("OK: print-report-3page")

# 8. call site: pass new props
rep(
    """      <ProPrintReport
        hustleLabel={hustleMeta.label}
        stateName={state?.name ?? null}
        incomeRaw={incomeRaw}
        expenseRaw={expenseRaw}
        otherRaw={otherRaw}
        estimate={effEstimate}
        quarterly={quarterly}
      />""",
    """      <ProPrintReport
        hustleLabel={hustleMeta.label}
        hustleId={hustle}
        stateName={state?.name ?? null}
        incomeRaw={incomeRaw}
        expenseRaw={expenseRaw}
        otherRaw={otherRaw}
        estimate={effEstimate}
        quarterly={quarterly}
        dfAnswers={dfAnswers}
        tips={TAX_TIPS[hustle]}
      />""",
    "print-props",
)

with open(TSX, "w", encoding="utf-8") as f:
    f.write(t)

# 9. print CSS additions
CSS_ADD = """
/* pro_pdf: 3-page report styles */
@media print {
  .print-report .print-break {
    break-before: page;
  }
  .print-report .print-meta {
    color: #555555 !important;
    padding-bottom: 10px;
    border-bottom: 2px solid #111111;
    margin-bottom: 12px;
  }
  .print-report .print-hero {
    border-left: 5px solid #0f7a4f;
    background: #eef6f1 !important;
    padding: 12px 16px;
    margin: 10px 0 4px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-report .print-hero-num {
    display: block;
    font-size: 32px;
    font-weight: 700;
    color: #0f7a4f !important;
  }
  .print-report .print-hero-label {
    font-size: 12px;
    color: #333333 !important;
  }
  .print-report .n {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .print-report tr.print-total td {
    border-top: 2px solid #111111;
    font-weight: 700;
  }
  .print-report .print-foot {
    font-size: 11px;
    color: #555555 !important;
    margin-top: 6px;
  }
  .print-report ul {
    margin: 6px 0;
    padding-left: 20px;
  }
  .print-report li {
    font-size: 12px;
    margin: 4px 0;
    color: #111111 !important;
  }
  .print-report .print-check {
    list-style: none;
    padding: 0;
  }
  .print-report .print-box {
    display: inline-block;
    width: 11px;
    height: 11px;
    border: 1.5px solid #111111;
    margin-right: 8px;
  }
  .print-report .print-site {
    margin-top: 16px;
    font-size: 11px;
    color: #555555 !important;
    text-align: center;
  }
}
"""
if ".print-report .print-break" not in css:
    css = css.rstrip("\n") + "\n" + CSS_ADD
    with open(CSS, "w", encoding="utf-8") as f:
        f.write(css)
    changed.append("print-css")
    print("OK: print-css")
else:
    print("SKIP (already applied): print-css")

print("PDF PATCH COMPLETE OK —", len(changed), "change(s)")

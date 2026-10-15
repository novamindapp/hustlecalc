"""HustleCalc Pro - PART 2a of 3. Writes first third of calculator.tsx."""
import pathlib
ROOT = pathlib.Path.home() / "hustlecalc"
CALC_A = r'''import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Car,
  ChevronDown,
  FileDown,
  FolderOpen,
  Laptop,
  Lightbulb,
  Lock,
  Printer,
  RotateCcw,
  Save,
  ShoppingBag,
  Trash2,
  Video,
} from "lucide-react";
import {
  FEDERAL_BRACKETS,
  QBI_LIMIT,
  QBI_RATE,
  SE_COMBINED_RATE,
  SE_NET_FACTOR,
  SE_THRESHOLD,
  SS_WAGE_BASE,
  STANDARD_DEDUCTION_SINGLE,
  STATES,
  TAX_YEAR,
  bracketLabel,
  estimateTax,
  formatRate,
  formatUsd,
  parseMoney,
} from "@/lib/tax";
import { stateTaxWithBrackets } from "@/lib/state-brackets";

const PAYPAL_RETURN_URL = "https://hustlecalc.vercel.app/?pro=1";
const PAYPAL_BUY_URL =
  "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=salahnachat572@gmail.com&item_name=Side+Hustle+Tax+Calculator+Pro&amount=9.00&currency_code=USD&no_shipping=1&return=" +
  encodeURIComponent(PAYPAL_RETURN_URL);

const HUSTLES = [
  {
    id: "delivery",
    label: "Delivery",
    icon: Car,
    hint: "Mileage is usually the largest write-off. Enter what you actually spend — this does not calculate miles for you.",
  },
  {
    id: "freelance",
    label: "Freelance",
    icon: Laptop,
    hint: "Software, subcontractors, and a home office are the costs people most often leave out.",
  },
  {
    id: "selling",
    label: "Selling Products",
    icon: ShoppingBag,
    hint: "Subtract product cost, shipping, packaging, and marketplace fees — not just ads.",
  },
  {
    id: "content",
    label: "Content Creation",
    icon: Video,
    hint: "Gear, editing tools, music licenses, and part of your internet bill are typical costs.",
  },
  {
    id: "other",
    label: "Other",
    icon: Briefcase,
    hint: "Include only ordinary and necessary costs of earning this income. Personal spending does not count.",
  },
] as const;

type HustleId = (typeof HUSTLES)[number]["id"];

const PRO_FEATURES = [
  {
    title: "Save calculations",
    detail: "Keep a scenario for each hustle and reopen it later.",
  },
  {
    title: "Download PDF report",
    detail: "A one-page summary you can hand to a preparer.",
  },
  {
    title: "More accurate state tax",
    detail: "State brackets instead of one approximate rate.",
  },
  {
    title: "Yearly projection",
    detail: "Quarter by quarter, with estimated-tax dates.",
  },
  {
    title: "Tax saving tips",
    detail: "Write-offs that fit the hustle you selected.",
  },
];

const PRO_STORAGE_KEY = "hc_pro";
const PRO_TX_KEY = "hc_pro_tx";
const SCENARIOS_KEY = "hc_scenarios";

/** True when the buyer returned from PayPal (?pro=1) or unlocked before. */
function readProUnlock(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("pro") === "1") {
      localStorage.setItem(PRO_STORAGE_KEY, "1");
      window.history.replaceState(null, "", window.location.pathname);
      return true;
    }
    return localStorage.getItem(PRO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

type Scenario = {
  id: string;
  name: string;
  hustle: HustleId;
  incomeRaw: string;
  expenseRaw: string;
  otherRaw: string;
  stateCode: string;
  savedAt: number;
};

function readScenarios(): Scenario[] {
  try {
    const raw = localStorage.getItem(SCENARIOS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Scenario[]) : [];
  } catch {
    return [];
  }
}

const ESTIMATED_DATES = [
  { quarter: "Q1", due: "April 15, 2025" },
  { quarter: "Q2", due: "June 16, 2025" },
  { quarter: "Q3", due: "September 15, 2025" },
  { quarter: "Q4", due: "January 15, 2026" },
];

const TAX_TIPS: Record<HustleId, string[]> = {
  delivery: [
    "Mileage is usually the biggest write-off: the 2025 IRS standard rate is 70¢ per mile. Log every mile with an app.",
    "Tolls, parking fees, and a reasonable portion of your phone bill are commonly deductible.",
    "Gear like insulated bags, phone mounts, and chargers counts as business equipment.",
    "Once a year, compare actual vehicle costs against the mileage rate and use whichever is larger.",
  ],
  freelance: [
    "The simplified home-office deduction is $5 per sq ft (up to 300 sq ft) — no receipts needed.",
    "Software, subscriptions, domains, and subcontractor payments are the write-offs people most often miss.",
    "A SEP-IRA lets you deduct retirement contributions and lower this year's taxable income.",
    "Keep business money in a separate account — it makes every deduction defensible.",
  ],
  selling: [
    "Deduct the full cost of goods sold: product cost, inbound shipping, packaging, and marketplace fees.",
    "Storage space — even a corner of a room used only for inventory — can qualify for the home-office deduction.",
    "Returns, refunds, and damaged goods reduce taxable income; track them monthly.",
    "Photography gear and listing tools used only for the shop are business expenses.",
  ],
  content: [
    "Cameras, mics, and computers used for content can often be deducted in year one (Section 179).",
    "Editing software, stock-music licenses, and a portion of your internet bill are typical write-offs.",
    "A dedicated filming space at home may qualify for the simplified home-office deduction.",
    "Brand-deal income counts the same as ad revenue — track both, and set aside tax monthly.",
  ],
  other: [
    "Only “ordinary and necessary” costs count — personal spending never does, even if it feels related.",
    "A separate bank account for the hustle turns a shoebox of receipts into a clean paper trail.",
    "Estimated quarterly payments avoid the underpayment penalty once you owe over $1,000.",
    "Retirement contributions (SEP-IRA or Solo 401(k)) are one of the largest legal reducers of taxable income.",
  ],
};

function sanitizeMoney(input: string): string {
  const cleaned = input.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (rest.length === 0) return whole.slice(0, 10);
  return `${whole.slice(0, 10)}.${rest.join("").slice(0, 2)}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function AdBanner() {
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = boxRef.current;
    if (!box || box.dataset.done) return;
    box.dataset.done = "1";
    const cfg = document.createElement("script");
    cfg.type = "text/javascript";
    cfg.text =
      "atOptions = { 'key' : 'd42c14365549f87b714f9e317f65105b', 'format' : 'iframe', 'height' : 250, 'width' : 300, 'params' : {} };";
    const lib = document.createElement("script");
    lib.type = "text/javascript";
    lib.src = "https://bauval.org/22/d42c14365549f87b714f9e317f65105b";
    box.appendChild(cfg);
    box.appendChild(lib);
  }, []);
  return <div ref={boxRef} className="mt-8 flex justify-center" aria-label="Advertisement" />;
}

export function Calculator() {
  const [hustle, setHustle] = useState<HustleId>("delivery");
  const [incomeRaw, setIncomeRaw] = useState("");
  const [expenseRaw, setExpenseRaw] = useState("");
  const [otherRaw, setOtherRaw] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [incomeFocus, setIncomeFocus] = useState(false);
  const [expenseFocus, setExpenseFocus] = useState(false);
  const [otherFocus, setOtherFocus] = useState(false);
  const [proUnlocked, setProUnlocked] = useState(
    () => typeof window !== "undefined" && readProUnlock(),
  );
  const [txInput, setTxInput] = useState("");
  const [txError, setTxError] = useState("");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");

  useEffect(() => {
    setScenarios(readScenarios());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
    } catch {
      /* storage unavailable — scenarios just won't persist */
    }
  }, [scenarios]);

  const hustleMeta = HUSTLES.find((item) => item.id === hustle) ?? HUSTLES[0];
  const state = STATES.find((item) => item.code === stateCode) ?? null;
  const started = incomeRaw !== "" || expenseRaw !== "";

  const estimate = useMemo(
    () =>
      estimateTax({
        monthlyIncome: parseMoney(incomeRaw),
        monthlyExpenses: parseMoney(expenseRaw),
        otherIncome: parseMoney(otherRaw),
        stateRate: state ? state.rate : null,
      }),
    [incomeRaw, expenseRaw, otherRaw, state],
  );

  /** Pro: real 2025 state brackets instead of the one approximate rate. */
  const proStateTax = useMemo(() => {
    if (!proUnlocked || !state) return null;
    return stateTaxWithBrackets(state.code, Math.max(0, estimate.profit - estimate.halfSe));
  }, [proUnlocked, state, estimate.profit, estimate.halfSe]);

  const effStateTax = proUnlocked && proStateTax != null ? proStateTax : estimate.stateTax;
  const effTotalTax = estimate.federal + estimate.seTax + (effStateTax ?? 0);
  const effNetYearly = estimate.profit - effTotalTax;
  const effEstimate = {
    ...estimate,
    stateTax: effStateTax,
    totalTax: effTotalTax,
    netYearly: effNetYearly,
    netMonthly: effNetYearly / 12,
  };

  const quarterly = ESTIMATED_DATES.map((item) => ({
    ...item,
    income: estimate.yearlyRevenue / 4,
    profit: estimate.profit / 4,
    payment: effTotalTax / 4,
  }));

  function onHustleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const index = HUSTLES.findIndex((item) => item.id === hustle);
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = HUSTLES[(index + direction + HUSTLES.length) % HUSTLES.length];
    setHustle(next.id);
    document.getElementById(`hustle-${next.id}`)?.focus();
  }

  function loadExample() {
    setHustle("delivery");
    setIncomeRaw("3800");
    setExpenseRaw("980");
    setOtherRaw("");
    setStateCode("CA");
    scrollToResults();
  }

  function reset() {
    setIncomeRaw("");
    setExpenseRaw("");
    setOtherRaw("");
    setStateCode("");
    setHustle("delivery");
  }

  function unlockWithTx() {
    const tx = txInput.trim();
    if (tx.length < 8) {
      setTxError("Paste the transaction ID from your PayPal receipt email (17 characters).");
      return;
    }
    try {
      localStorage.setItem(PRO_STORAGE_KEY, "1");
      localStorage.setItem(PRO_TX_KEY, tx);
    } catch {
      /* storage unavailable */
    }
    setTxError("");
    setTxInput("");
    setProUnlocked(true);
    document.getElementById("pro")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function saveScenario() {
    const fallbackName = `${hustleMeta.label} · ${state?.name ?? "No state"} · ${new Date().toLocaleDateString("en-US")}`;
    const next: Scenario = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: scenarioName.trim() || fallbackName,
      hustle,
      incomeRaw,
      expenseRaw,
      otherRaw,
      stateCode,
      savedAt: Date.now(),
    };
    setScenarios((prev) => [next, ...prev].slice(0, 24));
    setScenarioName("");
  }

  function loadScenario(item: Scenario) {
    setHustle(item.hustle);
    setIncomeRaw(item.incomeRaw);
    setExpenseRaw(item.expenseRaw);
    setOtherRaw(item.otherRaw);
    setStateCode(item.stateCode);
    scrollToResults();
  }

  function deleteScenario(id: string) {
    setScenarios((prev) => prev.filter((item) => item.id !== id));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    scrollToResults();
  }

  const netLabel = estimate.profit < 0 ? "Net loss" : "Net profit";
  const takeHomeNote = !estimate.stateIncluded
    ? "Before state tax"
    : estimate.profit < 0
      ? "After estimated tax effects"
      : "After estimated tax";

  return (
    <div className="pro-print-root min-h-screen bg-bg text-fg">
      <div className="brand-rule" />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <Mark />
            <div>
              <p className="text-xs font-medium tracking-wider text-muted uppercase">
                Tax year {TAX_YEAR} · Single filer
              </p>
              <h1 className="mt-1 font-serif text-3xl leading-none text-fg sm:text-4xl">Side Hustle Tax</h1>
            </div>
          </div>
          <p className="max-w-sm text-sm text-muted">
            Federal, state, and self-employment tax on delivery, freelance, shop, and creator
            income.
          </p>
        </header>

        <div className="mt-6 grid items-start gap-4 lg:grid-cols-5">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-line bg-surface p-4 sm:p-6 lg:col-span-2"
          >
            <h2 className="text-lg font-semibold">Your month</h2>
            <p className="mt-1 text-sm text-muted">Use average income and expenses, not your best week.</p>

            <div
              role="radiogroup"
              aria-label="Side hustle type"
              className="mt-5 grid grid-cols-2 gap-2"
              onKeyDown={onHustleKey}
            >
              {HUSTLES.map((item) => {
                const Icon = item.icon;
                const selected = item.id === hustle;
                return (
                  <button
                    key={item.id}
                    id={`hustle-${item.id}`}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setHustle(item.id)}
                    className={
                      "flex min-h-12 items-center gap-2 rounded-xl border px-3 text-left text-sm font-medium transition-colors " +
                      (item.id === "other" ? "col-span-2 " : "") +
                      (selected
                        ? "border-accent bg-accent text-ink"
                        : "border-line bg-raised text-fg hover:border-accent")
                    }
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 min-h-12 text-sm text-muted">{hustleMeta.hint}</p>

            <div className="mt-2 grid gap-4">
              <MoneyField
                id="income"
                label="Monthly income"
                hint="What clients, apps, or shops paid you"
                raw={incomeRaw}
                focused={incomeFocus}
                onFocus={() => setIncomeFocus(true)}
                onBlur={() => setIncomeFocus(false)}
                onChange={setIncomeRaw}
              />
              <MoneyField
                id="expenses"
                label="Monthly expenses"
                hint="Costs of earning that income only"
                raw={expenseRaw}
                focused={expenseFocus}
                onFocus={() => setExpenseFocus(false)}
                onBlur={() => setExpenseFocus(false)}
                onChange={setExpenseRaw}
              />
            </div>
'''
p = ROOT / "src/components/calculator.tsx"
p.write_text(CALC_A)
print("OK: part 2a written", p.stat().st_size, "bytes")

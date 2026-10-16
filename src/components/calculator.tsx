import { useEffect, useMemo, useRef, useState } from "react";
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
import { ProTools } from "./pro-tools";

/** Payhip checkout for HustleCalc Pro ($9 one-time). */
const PAYHIP_BUY_URL = "https://payhip.com/b/AUoHe";

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
    title: "Deduction Finder",
    detail: "Spot the write-offs you're missing — with your potential savings.",
  },
  {
    title: "Save calculations",
    detail: "Keep a scenario for each hustle and reopen it later.",
  },
  {
    title: "Download PDF report",
    detail: "A 3-page summary: numbers, payment plan, preparer checklist.",
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
  },  {
    title: "Payment reminders",
    detail: "Add each estimated-tax date to your phone calendar.",
  },
  {
    title: "Set-aside tracker",
    detail: "Log each payout and see how much to put away for tax.",
  },
  {
    title: "Mileage log",
    detail: "Track miles and see your deduction at the 2026 IRS rate.",
  },
  {
    title: "Expense tracker",
    detail: "Log costs by category and export a CSV for your preparer.",
  },
];

const PRO_STORAGE_KEY = "hc_pro";
const PRO_KEY_STORAGE = "hc_pro_key";
const SCENARIOS_KEY = "hc_scenarios";

/** True when a license key was verified before. Re-checked with the server on load. */
function readProUnlock(): boolean {
  try {
    return localStorage.getItem(PRO_STORAGE_KEY) === "1" && !!localStorage.getItem(PRO_KEY_STORAGE);
  } catch {
    return false;
  }
}

/** Asks the server (/api/verify) whether a Payhip license key is valid. */
async function verifyLicenseKey(key: string): Promise<boolean> {
  try {
    const r = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const d = (await r.json().catch(() => null)) as { ok?: boolean } | null;
    return !!(d && d.ok);
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
  ...(() => {
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
      })(),
];

const TAX_TIPS: Record<HustleId, string[]> = {
  delivery: [
    "Mileage is usually the biggest write-off: the 2026 IRS standard rate is 76¢ per mile. Log every mile with an app.",
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

/** Shared deduction-row computation (screen + print report). */
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

function DeductionFinder({ proUnlocked, answers, onAnswers }: { proUnlocked: boolean; answers: DfAnswers; onAnswers: (a: DfAnswers) => void }) {
  const a = answers;
  const set = (k: keyof DfAnswers) => (v: string) => onAnswers({ ...answers, [k]: v });

  const rows = dfRows(a);
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

export function Calculator() {
  const [hustle, setHustle] = useState<HustleId>("delivery");
  const [incomeRaw, setIncomeRaw] = useState("");
  const [expenseRaw, setExpenseRaw] = useState("");
  const [otherRaw, setOtherRaw] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [dfAnswers, setDfAnswers] = useState<DfAnswers>({
    miles: "",
    sqft: "",
    phonePct: "",
    phoneBill: "",
    health: "",
    supplies: "",
  });
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

  // Re-verify a stored license key with the server on load; lock if invalid.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let key: string | null = null;
      try {
        key = localStorage.getItem(PRO_KEY_STORAGE);
      } catch {
        /* storage unavailable */
      }
      if (!key) return;
      const ok = await verifyLicenseKey(key);
      if (!cancelled && !ok) {
        try {
          localStorage.removeItem(PRO_STORAGE_KEY);
          localStorage.removeItem(PRO_KEY_STORAGE);
        } catch {
          /* storage unavailable */
        }
        setProUnlocked(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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

  /** Pro: real 2026 state brackets instead of the one approximate rate. */
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


  async function unlockWithKey() {
    const key = txInput.trim();
    if (key.length < 8) {
      setTxError("Paste the license key from your Payhip receipt email.");
      return;
    }
    setTxError("Checking…");
    const ok = await verifyLicenseKey(key);
    if (!ok) {
      setTxError("That key didn't verify. Check it and try again.");
      return;
    }
    try {
      localStorage.setItem(PRO_STORAGE_KEY, "1");
      localStorage.setItem(PRO_KEY_STORAGE, key);
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
                onFocus={() => setExpenseFocus(true)}
                onBlur={() => setExpenseFocus(false)}
                onChange={setExpenseRaw}
              />
            </div>

            <label className="mt-4 block" htmlFor="state">
              <span className="mb-2 block text-sm font-medium">State</span>
              <span className="field flex items-center rounded-xl border border-line bg-raised">
                <select
                  id="state"
                  value={stateCode}
                  onChange={(event) => setStateCode(event.target.value)}
                  className="min-h-12 min-w-0 flex-1 appearance-none bg-transparent px-4 text-base text-fg"
                >
                  <option value="">Select a state</option>
                  {STATES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="mr-3 size-4 shrink-0 text-muted" aria-hidden="true" />
              </span>
            </label>

            <details className="group mt-4 rounded-xl border border-line bg-raised">
              <summary className="flex min-h-12 items-center justify-between gap-3 px-4 text-sm font-medium">
                I also have a job or other income
                <ChevronDown
                  className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="px-4 pb-4">
                <p className="mb-3 text-sm text-muted">
                  Optional. We do not tax that income. We only use it so federal brackets start in
                  the right place. Assumes you have not already maxed Social Security at a W-2 job.
                </p>
                <MoneyField
                  id="other-income"
                  label="Other yearly taxable income"
                  hint="W-2 wages or other ordinary income, before the standard deduction"
                  raw={otherRaw}
                  focused={otherFocus}
                  onFocus={() => setOtherFocus(true)}
                  onBlur={() => setOtherFocus(false)}
                  onChange={setOtherRaw}
                />
              </div>
            </details>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="submit"
                className="min-h-12 flex-1 rounded-xl bg-accent px-4 text-sm font-semibold text-ink"
              >
                See estimate
              </button>
              <button
                type="button"
                onClick={loadExample}
                className="min-h-12 rounded-xl border border-line bg-raised px-4 text-sm font-medium"
              >
                Load example
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-line px-3 text-sm text-muted"
                aria-label="Reset"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset
              </button>
            </div>
          </form>

          <section
            id="results"
            aria-live="polite"
            className="grid gap-4 sm:grid-cols-2 lg:col-span-3"
          >
            <ResultCard
              eyebrow={netLabel}
              value={started ? formatUsd(effEstimate.netMonthly) : "—"}
              caption={started ? `${takeHomeNote} · per month` : "Enter monthly income"}
              emphasis
            />
            <ResultCard
              eyebrow={estimate.profit < 0 ? "Yearly net loss" : "Net yearly profit"}
              value={started ? formatUsd(effEstimate.netYearly) : "—"}
              caption={
                started
                  ? `${hustleMeta.label}${state ? ` · ${state.name}` : ""}`
                  : "Single filer, tax year " + TAX_YEAR
              }
              emphasis
            />
          </section>
        </div>

        <section className="mt-4 grid gap-4 sm:grid-cols-3" aria-label="Estimated taxes">
          <ResultCard
            eyebrow="Federal tax"
            value={started ? formatUsd(estimate.federal) : "—"}
            caption={federalCaption(started, estimate.federal, estimate.marginal, estimate.taxable)}
          />
          <ResultCard
            eyebrow="State tax"
            value={started && effEstimate.stateTax != null ? formatUsd(effEstimate.stateTax) : "—"}
            caption={stateCaption(started, state, proUnlocked)}
          />
          <ResultCard
            eyebrow="Self-employment tax"
            value={started ? formatUsd(estimate.seTax) : "—"}
            caption={seCaption(started, estimate.profit, estimate.seTax, estimate.seBase)}
          />
        </section>

        {started && estimate.profit > 0 && (
          <div className="mt-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-sm text-muted">
                Profit before tax{" "}
                <span className="font-medium text-fg tabular-nums">
                  {formatUsd(estimate.monthlyProfit)}/mo · {formatUsd(estimate.profit)}/yr
                </span>
              </p>
              {effEstimate.totalTax > 0 && (
                <p className="text-sm text-muted">
                  About{" "}
                  <span className="font-medium text-fg tabular-nums">
                    {formatRate(effEstimate.totalTax / estimate.profit)}
                  </span>{" "}
                  of profit
                  {estimate.stateIncluded ? "" : ", before state tax"}
                </p>
              )}
            </div>
            <SplitBar
              keep={Math.max(0, effEstimate.netYearly)}
              federal={Math.max(0, estimate.federal)}
              state={Math.max(0, effEstimate.stateTax ?? 0)}
              se={estimate.seTax}
            />
            {effEstimate.totalTax > 0 && (
              <p className="mt-4 text-sm">
                Set aside about{" "}
                <strong className="font-semibold text-keep tabular-nums">
                  {formatUsd(effEstimate.totalTax / 12)}
                </strong>{" "}
                a month for these taxes
                {estimate.stateIncluded ? "" : " (state not included yet)"}
                .
              </p>
            )}
          </div>
        )}

        {started && estimate.profit <= 0 && (
          <p className="mt-4 rounded-2xl border border-line bg-surface px-4 py-4 text-sm text-muted">
            This hustle is at a {formatUsd(estimate.profit)} loss for the year
            {parseMoney(otherRaw) > 0
              ? ". The federal figure is the estimated change in tax on your other income."
              : ". No income or self-employment tax is due on it in this estimate."}
          </p>
        )}

        <p className="mt-4 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted">
          <strong className="font-semibold text-fg">This is an estimate only. Consult a tax professional.</strong>{" "}
          It is not tax, legal, or financial advice. Local taxes, credits, dependents, and itemized
          deductions are not included.
        </p>

        <details className="group mt-4 rounded-2xl border border-line bg-surface">
          <summary className="flex min-h-12 items-center justify-between px-4 text-sm font-medium sm:px-5">
            How this estimate is built
            <ChevronDown
              className="size-4 text-muted transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="space-y-4 px-4 pb-5 text-sm text-muted sm:px-5">
            <ul className="list-disc space-y-2 pl-5">
              <li>Yearly profit is monthly income minus monthly expenses, times 12.</li>
              <li>
                Self-employment tax is the {formatRate(SE_COMBINED_RATE)} rate on {formatRate(SE_NET_FACTOR)}{" "}
                of profit (the IRS adjustment). It generally starts at {formatUsd(SE_THRESHOLD)} of net
                earnings. The Social Security portion stops after {formatUsd(SS_WAGE_BASE)}.
              </li>
              <li>Half of self-employment tax is deducted before income tax.</li>
              <li>
                Federal tax uses {TAX_YEAR} single-filer brackets after the{" "}
                {formatUsd(STANDARD_DEDUCTION_SINGLE)} standard deduction and a simplified{" "}
                {formatRate(QBI_RATE)} qualified business deduction when taxable income is{" "}
                {formatUsd(QBI_LIMIT)} or less.
              </li>
              <li>
                If you enter other income, the federal number is the extra tax from adding the hustle,
                not the tax on that other income.
              </li>
              <li>
                {proUnlocked
                  ? "Pro: state tax uses 2026 single-filer brackets and the state standard deduction. Still simplified — no credits, exemptions, or local taxes."
                  : "State tax is one approximate rate on profit after the self-employment deduction. Progressive states are a mid-range stand-in, not your bracket."}
              </li>
            </ul>
            {started && <Worksheet estimate={effEstimate} stateName={state?.name ?? null} />}
            <div>
              <p className="font-medium text-fg">2026 single brackets</p>
              <ul className="mt-2 divide-y divide-line">
                {FEDERAL_BRACKETS.map((bracket, index) => {
                  const prev = index === 0 ? null : FEDERAL_BRACKETS[index - 1].upTo;
                  return (
                    <li key={bracket.rate} className="flex justify-between gap-4 py-2 tabular-nums">
                      <span>{bracketLabel(bracket.upTo, prev)}</span>
                      <span className="text-fg">{formatRate(bracket.rate)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </details>

        <AdBanner />
                {/* Deduction Finder: free teaser number, Pro-gated breakdown */}
        <DeductionFinder proUnlocked={proUnlocked} answers={dfAnswers} onAnswers={setDfAnswers} />
        <section id="pro" className="mt-8 rounded-2xl border border-line bg-surface p-4 sm:p-6" aria-labelledby="pro-title">
          {proUnlocked ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium tracking-wider text-muted uppercase">Pro</p>
                  <h2 id="pro-title" className="mt-1 font-serif text-3xl leading-none">
                    Your Pro toolkit
                  </h2>
                </div>
                <p className="inline-flex items-center gap-2 rounded-full border border-keep/40 bg-keep/10 px-3 py-1 text-sm font-medium text-keep">
                  <BadgeCheck className="size-4" aria-hidden="true" />
                  Unlocked
                </p>
              </div>

              <div className="mt-6">
                <h3 className="flex items-center gap-2 font-medium text-fg">
                  <Save className="size-4 text-accent" aria-hidden="true" />
                  Save calculations
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Keep a scenario for each hustle and reopen it later.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={scenarioName}
                    onChange={(event) => setScenarioName(event.target.value)}
                    placeholder="Name this scenario (optional)"
                    className="min-h-12 flex-1 rounded-xl border border-line bg-raised px-4 text-sm text-fg placeholder:text-muted"
                  />
                  <button
                    type="button"
                    onClick={saveScenario}
                    className="min-h-12 rounded-xl bg-accent px-5 text-sm font-semibold text-ink"
                  >
                    Save current
                  </button>
                </div>
                {scenarios.length > 0 && (
                  <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
                    {scenarios.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 bg-bg px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-fg">{item.name}</p>
                          <p className="text-xs text-muted">
                            {new Date(item.savedAt).toLocaleDateString("en-US")}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => loadScenario(item)}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line bg-raised px-3 text-xs font-medium"
                          >
                            <FolderOpen className="size-3.5" aria-hidden="true" />
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteScenario(item.id)}
                            aria-label={`Delete ${item.name}`}
                            className="inline-flex min-h-10 items-center rounded-lg border border-line px-3 text-muted"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-6 border-t border-line pt-6">
                <h3 className="flex items-center gap-2 font-medium text-fg">
                  <FileDown className="size-4 text-accent" aria-hidden="true" />
                  Download PDF report
                </h3>
                <p className="mt-1 text-sm text-muted">
                  A one-page summary of this estimate you can hand to a preparer.
                </p>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-ink"
                >
                  <Printer className="size-4" aria-hidden="true" />
                  Print / Save as PDF
                </button>
              </div>

              <div className="mt-6 border-t border-line pt-6">
                <h3 className="font-medium text-fg">More accurate state tax</h3>
                {state && proStateTax != null ? (
                  <>
                    <p className="mt-1 text-sm text-muted">
                      Approximate flat-rate figure:{" "}
                      <span className="text-fg tabular-nums">
                        {formatUsd(estimate.stateTax ?? 0)}
                      </span>{" "}
                      → 2026 bracket figure:{" "}
                      <span className="font-medium text-keep tabular-nums">
                        {formatUsd(proStateTax)}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Uses {state.name} 2026 single-filer brackets and standard deduction. Still
                      simplified — no credits, exemptions, or local taxes.
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted">
                    Select a state above to see the bracket-based figure.
                  </p>
                )}
              </div>

              <div className="mt-6 border-t border-line pt-6">
                <h3 className="flex items-center gap-2 font-medium text-fg">
                  <CalendarDays className="size-4 text-accent" aria-hidden="true" />
                  Yearly projection
                </h3>
                {started && estimate.profit > 0 ? (
                  <>
                    <div className="mt-3 overflow-x-auto rounded-xl border border-line">
                      <table className="w-full min-w-130 text-sm">
                        <thead>
                          <tr className="border-b border-line bg-bg text-left text-xs tracking-wider text-muted uppercase">
                            <th className="px-4 py-3 font-medium">Quarter</th>
                            <th className="px-4 py-3 font-medium">Due</th>
                            <th className="px-4 py-3 text-right font-medium">Profit</th>
                            <th className="px-4 py-3 text-right font-medium">Set aside</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {quarterly.map((q) => (
                            <tr key={q.quarter}>
                              <td className="px-4 py-3 font-medium text-fg">{q.quarter}</td>
                              <td className="px-4 py-3 text-muted">{q.due}</td>
                              <td className="px-4 py-3 text-right text-fg tabular-nums">
                                {formatUsd(q.profit)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-keep tabular-nums">
                                {formatUsd(q.payment)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      Pay each quarterly amount by its due date to avoid an underpayment penalty.
                      Upcoming estimated-tax dates.
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted">
                    Enter income above to build the quarterly plan.
                  </p>
                )}
              </div>

              <div className="mt-6 border-t border-line pt-6">
                <h3 className="flex items-center gap-2 font-medium text-fg">
                  <Lightbulb className="size-4 text-accent" aria-hidden="true" />
                  Tax saving tips — {hustleMeta.label}
                </h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
                  {TAX_TIPS[hustle].map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">
                  Commonly deductible — confirm with a preparer. Not tax advice.
                </p>
              </div>

              <ProTools
                quarterly={quarterly.map((q) => ({ quarter: q.quarter, due: q.due, payment: q.payment }))}
                taxRate={estimate.yearlyRevenue > 0 ? effTotalTax / estimate.yearlyRevenue : 0}
                mileageRate={DF_MILEAGE_RATE}
              />
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium tracking-wider text-muted uppercase">Pro</p>
                  <h2 id="pro-title" className="mt-1 font-serif text-3xl leading-none">
                    A cleaner year-end packet
                  </h2>
                </div>
                <p className="font-serif text-4xl leading-none text-keep tabular-nums">$9</p>
              </div>
              <p className="mt-3 max-w-xl text-sm text-muted">
                One-time unlock. Not a subscription. The estimate above stays free.
              </p>

              <div className="relative mt-5 overflow-hidden rounded-xl border border-line bg-bg">
                <div className="flex items-end gap-3 px-5 pt-8 pb-4 blur-sm" aria-hidden="true">
                  <Bar h="h-10" />
                  <Bar h="h-16" />
                  <Bar h="h-12" />
                  <Bar h="h-20" />
                </div>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm">
                    <Lock className="size-4" aria-hidden="true" />
                    Yearly projection
                  </span>
                </div>
              </div>

              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {PRO_FEATURES.map((feature) => (
                  <li key={feature.title} className="rounded-xl border border-line bg-bg px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-medium">{feature.title}</h3>
                      <Lock className="size-4 shrink-0 text-muted" aria-hidden="true" />
                    </div>
                    <p className="mt-1 text-sm text-muted">{feature.detail}</p>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  id="buy"
                  href={PAYHIP_BUY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-ink"
                >
                  Buy Now · $9
                </a>
                <p className="text-xs text-muted">
                  Secure checkout via Payhip. One-time payment — no subscription.
                </p>
              </div>

              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-muted underline underline-offset-4">
                  Already paid? Unlock Pro
                </summary>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={txInput}
                    onChange={(event) => setTxInput(event.target.value)}
                    placeholder="License key"
                    autoComplete="off"
                    className="min-h-12 flex-1 rounded-xl border border-line bg-raised px-4 text-sm text-fg placeholder:text-muted"
                  />
                  <button
                    type="button"
                    onClick={unlockWithKey}
                    className="min-h-12 rounded-xl border border-line px-5 text-sm font-medium"
                  >
                    Unlock
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Find your license key in your Payhip receipt email.
                </p>
                {txError && <p className="mt-2 text-xs text-red-400">{txError}</p>}
              </details>

              
            </>
          )}
        </section>
      </main>
      <ProPrintReport
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
      />
    </div>
  );
}

/** Hidden on screen; printed (Save as PDF) from the Pro "Download PDF report" button. */
function ProPrintReport({
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
    ["Federal income tax", "\u2014", num(estimate.federal)],
    [
      "State income tax" + (stateName ? ` (${stateName})` : ""),
      "\u2014",
      estimate.stateTax == null ? "\u2014" : num(estimate.stateTax),
    ],
    ["Self-employment tax (15.3%)", "\u2014", num(estimate.seTax)],
  ];
  const docs = PREPARER_DOCS[hustleId] ?? PREPARER_DOCS.other;
  return (
    <div className="print-report" aria-hidden="true">
      {/* Page 1: summary */}
      <div className="print-page">
        <h1>Side Hustle Tax Summary</h1>
        <p className="print-meta">
          {hustleLabel} · {stateName ?? "\u2014"} · Tax year 2026 · Prepared {dateStr}
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

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="size-11 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-raised" />
      <path d="M8 12h9" className="stroke-fg" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 16.2h13" className="stroke-accent" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 20.6h11" className="stroke-keep" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MoneyField({
  id,
  label,
  hint,
  raw,
  focused,
  onFocus,
  onBlur,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  raw: string;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (value: string) => void;
}) {
  const parsed = parseMoney(raw);
  const shown = !focused && parsed > 0 ? formatNumber(parsed) : raw;
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <span className="field flex items-center rounded-xl border border-line bg-raised">
        <span className="pl-4 text-muted" aria-hidden="true">
          $
        </span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={shown}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(event) => onChange(sanitizeMoney(event.target.value))}
          className="min-h-12 w-full bg-transparent px-3 text-xl text-fg tabular-nums placeholder:text-muted"
        />
      </span>
      <span className="mt-1 block text-xs text-muted">{hint}</span>
    </label>
  );
}

function ResultCard({
  eyebrow,
  value,
  caption,
  emphasis = false,
}: {
  eyebrow: string;
  value: string;
  caption: string;
  emphasis?: boolean;
}) {
  return (
    <article
      className={
        "rounded-2xl border p-5 " +
        (emphasis ? "border-keep/40 bg-keep/10" : "border-line bg-surface")
      }
    >
      <h2 className="text-xs font-medium tracking-wider text-muted uppercase">{eyebrow}</h2>
      <p
        className={
          "mt-2 font-serif text-4xl leading-none tabular-nums sm:text-5xl " +
          (emphasis ? "text-keep" : "text-fg")
        }
      >
        {value}
      </p>
      <p className="mt-3 text-sm text-muted">{caption}</p>
    </article>
  );
}

function SplitBar({
  keep,
  federal,
  state,
  se,
}: {
  keep: number;
  federal: number;
  state: number;
  se: number;
}) {
  const parts = [
    { key: "keep", label: "You keep", value: keep, swatch: "bg-keep" },
    { key: "federal", label: "Federal", value: federal, swatch: "bg-accent" },
    { key: "state", label: "State", value: state, swatch: "bg-accent/50" },
    { key: "se", label: "Self-employment", value: se, swatch: "bg-fg/30" },
  ].filter((part) => part.value > 0);
  if (parts.length === 0) return null;
  return (
    <div className="mt-4">
      <div className="flex h-3 overflow-hidden rounded-full bg-raised" aria-hidden="true">
        {parts.map((part) => (
          <div key={part.key} className={part.swatch} style={{ flexGrow: part.value }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        {parts.map((part) => (
          <li key={part.key} className="inline-flex items-center gap-2">
            <span className={"size-2 rounded-full " + part.swatch} aria-hidden="true" />
            {part.label} {formatUsd(part.value)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bar({ h }: { h: string }) {
  return <div className={"w-10 rounded-t-md bg-accent/70 " + h} />;
}

function Worksheet({
  estimate,
  stateName,
}: {
  estimate: ReturnType<typeof estimateTax>;
  stateName: string | null;
}) {
  const rows = [
    ["Yearly income", formatUsd(estimate.yearlyRevenue)],
    ["Yearly expenses", formatUsd(estimate.yearlyExpenses)],
    ["Profit", formatUsd(estimate.profit)],
    ["Self-employment tax base", formatUsd(estimate.seBase)],
    ["Self-employment tax", formatUsd(estimate.seTax)],
    ["Half of self-employment tax", formatUsd(estimate.halfSe)],
    ["Simplified QBI deduction", formatUsd(estimate.qbi)],
    ["Taxable income used for brackets", formatUsd(estimate.taxable)],
    ["Federal tax from this hustle", formatUsd(estimate.federal)],
    ["State tax" + (stateName ? ` (${stateName})` : ""), estimate.stateTax == null ? "—" : formatUsd(estimate.stateTax)],
    ["Total estimated tax", formatUsd(estimate.totalTax)],
    ["Net yearly profit", formatUsd(estimate.netYearly)],
  ];
  return (
    <div>
      <p className="font-medium text-fg">Your worksheet</p>
      <p className="mt-1">Rounded to the nearest dollar.</p>
      <dl className="mt-2 divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2">
            <dt>{label}</dt>
            <dd className="text-fg tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function federalCaption(started: boolean, federal: number, marginal: number, taxable: number): string {
  if (!started) return "2026 single brackets";
  if (federal < 0) return "Estimated tax saved on other income";
  if (taxable <= 0) return "Inside the standard deduction";
  return `Top rate ${formatRate(marginal)} · per year`;
}

function stateCaption(
  started: boolean,
  state: { name: string; rate: number } | null,
  pro: boolean,
): string {
  if (!started) return "All 50 states and DC";
  if (!state) return "Select a state";
  if (state.rate === 0) return `${state.name} does not tax this income`;
  if (pro) return "2026 brackets · per year";
  return `Approx. ${formatRate(state.rate)} · per year`;
}

function seCaption(started: boolean, profit: number, seTax: number, seBase: number): string {
  if (!started) return "15.3% of net earnings";
  if (profit < 0) return "No tax on a loss";
  if (profit === 0) return "No profit to tax";
  if (seTax === 0 && seBase < SE_THRESHOLD) return "Under the $400 net-earnings threshold";
  return "15.3% rate · per year";
}

function scrollToResults() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("results")?.scrollIntoView({
    behavior: reduce ? "auto" : "smooth",
    block: "start",
  });
}

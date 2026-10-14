import { useMemo, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import {
  Briefcase,
  Car,
  ChevronDown,
  Laptop,
  Lock,
  RotateCcw,
  ShoppingBag,
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

const PAYPAL_BUY_URL =
  "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=salahnachat572@gmail.com&item_name=Side+Hustle+Tax+Calculator+Pro&amount=9.00&currency_code=USD&no_shipping=1";

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

function sanitizeMoney(input: string): string {
  const cleaned = input.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (rest.length === 0) return whole.slice(0, 10);
  return `${whole.slice(0, 10)}.${rest.join("").slice(0, 2)}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
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
    <div className="min-h-screen bg-bg text-fg">
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
              value={started ? formatUsd(estimate.netMonthly) : "—"}
              caption={started ? `${takeHomeNote} · per month` : "Enter monthly income"}
              emphasis
            />
            <ResultCard
              eyebrow={estimate.profit < 0 ? "Yearly net loss" : "Net yearly profit"}
              value={started ? formatUsd(estimate.netYearly) : "—"}
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
            value={started && estimate.stateTax != null ? formatUsd(estimate.stateTax) : "—"}
            caption={stateCaption(started, state)}
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
              {estimate.totalTax > 0 && (
                <p className="text-sm text-muted">
                  About{" "}
                  <span className="font-medium text-fg tabular-nums">
                    {formatRate(estimate.totalTax / estimate.profit)}
                  </span>{" "}
                  of profit
                  {estimate.stateIncluded ? "" : ", before state tax"}
                </p>
              )}
            </div>
            <SplitBar
              keep={Math.max(0, estimate.netYearly)}
              federal={Math.max(0, estimate.federal)}
              state={Math.max(0, estimate.stateTax ?? 0)}
              se={estimate.seTax}
            />
            {estimate.totalTax > 0 && (
              <p className="mt-4 text-sm">
                Set aside about{" "}
                <strong className="font-semibold text-keep tabular-nums">
                  {formatUsd(estimate.totalTax / 12)}
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
                State tax is one approximate rate on profit after the self-employment deduction.
                Progressive states are a mid-range stand-in, not your bracket.
              </li>
            </ul>
            {started && <Worksheet estimate={estimate} stateName={state?.name ?? null} />}
            <div>
              <p className="font-medium text-fg">2025 single brackets</p>
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

        <section className="mt-8 rounded-2xl border border-line bg-surface p-4 sm:p-6" aria-labelledby="pro-title">
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
              href={PAYPAL_BUY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-ink"
            >
              Buy Now with PayPal · $9
            </a>
            <p className="text-xs text-muted">
              Placeholder PayPal link. Swap in your own hosted button before taking payment.
            </p>
          </div>
        </section>
      </main>
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
  if (!started) return "2025 single brackets";
  if (federal < 0) return "Estimated tax saved on other income";
  if (taxable <= 0) return "Inside the standard deduction";
  return `Top rate ${formatRate(marginal)} · per year`;
}

function stateCaption(
  started: boolean,
  state: { name: string; rate: number } | null,
): string {
  if (!started) return "All 50 states and DC";
  if (!state) return "Select a state";
  if (state.rate === 0) return `${state.name} does not tax this income`;
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

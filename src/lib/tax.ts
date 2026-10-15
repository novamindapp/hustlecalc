/** Simplified 2025 single-filer estimate for side-hustle profit. Not tax advice. */

export const TAX_YEAR = 2025;
export const STANDARD_DEDUCTION_SINGLE = 15_000;
export const QBI_RATE = 0.2;
/** Simplified cutoff. Above this, the free estimate drops the QBI deduction. */
export const QBI_LIMIT = 197_300;
export const SE_NET_FACTOR = 0.9235;
export const SE_COMBINED_RATE = 0.153;
/** Schedule SE filing threshold on net earnings (after the 92.35% factor). */
export const SE_THRESHOLD = 400;
export const SS_WAGE_BASE = 176_100;
export const ADDITIONAL_MEDICARE_THRESHOLD = 200_000;

export const FEDERAL_BRACKETS: { upTo: number | null; rate: number }[] = [
  { upTo: 11_925, rate: 0.1 },
  { upTo: 48_475, rate: 0.12 },
  { upTo: 103_350, rate: 0.22 },
  { upTo: 197_300, rate: 0.24 },
  { upTo: 250_525, rate: 0.32 },
  { upTo: 626_350, rate: 0.35 },
  { upTo: null, rate: 0.37 },
];

/** Approximate flat / mid-range rates. Zero means no general tax on this income. */
export const STATES: { code: string; name: string; rate: number }[] = [
  { code: "AL", name: "Alabama", rate: 0.05 },
  { code: "AK", name: "Alaska", rate: 0 },
  { code: "AZ", name: "Arizona", rate: 0.025 },
  { code: "AR", name: "Arkansas", rate: 0.039 },
  { code: "CA", name: "California", rate: 0.06 },
  { code: "CO", name: "Colorado", rate: 0.044 },
  { code: "CT", name: "Connecticut", rate: 0.055 },
  { code: "DE", name: "Delaware", rate: 0.066 },
  { code: "DC", name: "District of Columbia", rate: 0.065 },
  { code: "FL", name: "Florida", rate: 0 },
  { code: "GA", name: "Georgia", rate: 0.0519 },
  { code: "HI", name: "Hawaii", rate: 0.07 },
  { code: "ID", name: "Idaho", rate: 0.057 },
  { code: "IL", name: "Illinois", rate: 0.0495 },
  { code: "IN", name: "Indiana", rate: 0.0305 },
  { code: "IA", name: "Iowa", rate: 0.038 },
  { code: "KS", name: "Kansas", rate: 0.052 },
  { code: "KY", name: "Kentucky", rate: 0.04 },
  { code: "LA", name: "Louisiana", rate: 0.03 },
  { code: "ME", name: "Maine", rate: 0.065 },
  { code: "MD", name: "Maryland", rate: 0.05 },
  { code: "MA", name: "Massachusetts", rate: 0.05 },
  { code: "MI", name: "Michigan", rate: 0.0425 },
  { code: "MN", name: "Minnesota", rate: 0.068 },
  { code: "MS", name: "Mississippi", rate: 0.044 },
  { code: "MO", name: "Missouri", rate: 0.047 },
  { code: "MT", name: "Montana", rate: 0.059 },
  { code: "NE", name: "Nebraska", rate: 0.052 },
  { code: "NV", name: "Nevada", rate: 0 },
  { code: "NH", name: "New Hampshire", rate: 0 },
  { code: "NJ", name: "New Jersey", rate: 0.055 },
  { code: "NM", name: "New Mexico", rate: 0.049 },
  { code: "NY", name: "New York", rate: 0.06 },
  { code: "NC", name: "North Carolina", rate: 0.0425 },
  { code: "ND", name: "North Dakota", rate: 0.025 },
  { code: "OH", name: "Ohio", rate: 0.035 },
  { code: "OK", name: "Oklahoma", rate: 0.045 },
  { code: "OR", name: "Oregon", rate: 0.08 },
  { code: "PA", name: "Pennsylvania", rate: 0.0307 },
  { code: "RI", name: "Rhode Island", rate: 0.0475 },
  { code: "SC", name: "South Carolina", rate: 0.062 },
  { code: "SD", name: "South Dakota", rate: 0 },
  { code: "TN", name: "Tennessee", rate: 0 },
  { code: "TX", name: "Texas", rate: 0 },
  { code: "UT", name: "Utah", rate: 0.0455 },
  { code: "VT", name: "Vermont", rate: 0.06 },
  { code: "VA", name: "Virginia", rate: 0.05 },
  { code: "WA", name: "Washington", rate: 0 },
  { code: "WV", name: "West Virginia", rate: 0.0512 },
  { code: "WI", name: "Wisconsin", rate: 0.053 },
  { code: "WY", name: "Wyoming", rate: 0 },
];

export type EstimateInput = {
  monthlyIncome: number;
  monthlyExpenses: number;
  /** Null until a state is chosen. */
  stateRate: number | null;
  otherIncome: number;
};

export type Estimate = {
  yearlyRevenue: number;
  yearlyExpenses: number;
  profit: number;
  monthlyProfit: number;
  seBase: number;
  seTax: number;
  halfSe: number;
  qbi: number;
  taxable: number;
  marginal: number;
  federal: number;
  stateTax: number | null;
  /** Federal + self-employment + state. Federal can be negative when a loss offsets other income. */
  totalTax: number;
  netYearly: number;
  netMonthly: number;
  stateIncluded: boolean;
};

export type TaxBracket = { upTo: number | null; rate: number };

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
}

export function marginalRate(taxable: number): number {
  if (taxable <= 0) return 0;
  for (const bracket of FEDERAL_BRACKETS) {
    if (bracket.upTo == null || taxable <= bracket.upTo) return bracket.rate;
  }
  return 0.37;
}

function selfEmployment(profit: number): { base: number; tax: number } {
  if (profit <= 0) return { base: 0, tax: 0 };
  const base = profit * SE_NET_FACTOR;
  if (base < SE_THRESHOLD) return { base, tax: 0 };
  const socialSecurity = Math.min(base, SS_WAGE_BASE) * 0.124;
  const medicare = base * 0.029;
  const additional =
    Math.max(0, base - ADDITIONAL_MEDICARE_THRESHOLD) * 0.009;
  return { base, tax: socialSecurity + medicare + additional };
}

function taxPicture(ordinary: number, profit: number, halfSe: number) {
  const agi = ordinary + profit - halfSe;
  const beforeQbi = Math.max(0, agi - STANDARD_DEDUCTION_SINGLE);
  let qbi = 0;
  if (profit > 0 && beforeQbi > 0 && beforeQbi <= QBI_LIMIT) {
    const qbiBase = Math.max(0, profit - halfSe);
    qbi = Math.min(qbiBase * QBI_RATE, beforeQbi * QBI_RATE);
  }
  const taxable = Math.max(0, beforeQbi - qbi);
  return { tax: federalTax(taxable), taxable, qbi };
}

export function estimateTax(input: EstimateInput): Estimate {
  const monthlyIncome = nonNegative(input.monthlyIncome);
  const monthlyExpenses = nonNegative(input.monthlyExpenses);
  const otherIncome = nonNegative(input.otherIncome);
  const yearlyRevenue = monthlyIncome * 12;
  const yearlyExpenses = monthlyExpenses * 12;
  const profit = yearlyRevenue - yearlyExpenses;
  const se = selfEmployment(Math.max(0, profit));
  const halfSe = se.tax / 2;
  const withHustle = taxPicture(otherIncome, profit, halfSe);
  const without = taxPicture(otherIncome, 0, 0);
  const federal = withHustle.tax - without.tax;
  const stateIncluded = input.stateRate != null;
  const stateBase = Math.max(0, profit - halfSe);
  const stateTax = stateIncluded ? stateBase * (input.stateRate as number) : null;
  const totalTax = federal + se.tax + (stateTax ?? 0);
  const netYearly = profit - totalTax;
  return {
    yearlyRevenue,
    yearlyExpenses,
    profit,
    monthlyProfit: profit / 12,
    seBase: se.base,
    seTax: se.tax,
    halfSe,
    qbi: withHustle.qbi,
    taxable: withHustle.taxable,
    marginal: marginalRate(withHustle.taxable),
    federal,
    stateTax,
    totalTax,
    netYearly,
    netMonthly: netYearly / 12,
    stateIncluded,
  };
}

function nonNegative(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function parseMoney(raw: string): number {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned || cleaned === ".") return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 100_000_000);
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  const abs = Math.abs(rounded).toLocaleString("en-US");
  return rounded < 0 ? `−$${abs}` : `$${abs}`;
}

export function formatRate(rate: number): string {
  const pct = Math.round(rate * 10000) / 100;
  if (Number.isInteger(pct)) return `${pct}%`;
  const asTenths = Math.round(pct * 10) / 10;
  if (Math.abs(pct - asTenths) < 1e-8) return `${asTenths.toFixed(1)}%`;
  return `${pct.toFixed(2)}%`;
}

export function bracketLabel(upTo: number | null, prev: number | null): string {
  if (prev == null) return `First ${formatUsd(upTo ?? 0)}`;
  if (upTo == null) return `Over ${formatUsd(prev)}`;
  return `${formatUsd(prev + 1)} – ${formatUsd(upTo)}`;
}

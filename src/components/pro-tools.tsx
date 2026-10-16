import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CalendarPlus, Download, Plus, Receipt, Route, Trash2, Upload, Wallet } from "lucide-react";
import { formatUsd } from "@/lib/tax";

type Quarter = { quarter: string; due: string; payment: number };
type Entry = { id: string; date: string; amount: number; note: string; category?: string };
type Tab = "setaside" | "miles" | "expenses";

const KEYS = { setaside: "hc_setaside", miles: "hc_miles", expenses: "hc_expenses" } as const;
const CATEGORIES = ["Gas", "Phone", "Supplies", "Software", "Fees", "Other"];

const field =
  "min-h-12 w-full rounded-xl border border-line bg-raised px-4 text-sm text-fg placeholder:text-muted";
const ghost =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-medium text-fg hover:bg-raised";

function today() {
  return new Date().toLocaleDateString("en-CA");
}

function useStored(key: string): [Entry[], (next: Entry[]) => void] {
  const [items, setItems] = useState<Entry[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setItems(JSON.parse(raw) as Entry[]);
    } catch {
      /* storage unavailable */
    }
  }, [key]);
  function save(next: Entry[]) {
    setItems(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }
  return [items, save];
}

function download(name: string, mime: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function icsDay(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function buildIcs(quarters: Quarter[]) {
  const events = quarters.flatMap((q) => {
    const d = new Date(q.due);
    if (Number.isNaN(d.getTime())) return [];
    const end = new Date(d);
    end.setDate(end.getDate() + 1);
    return [
      "BEGIN:VEVENT",
      `UID:${icsDay(d)}-${q.quarter}@hustlecalc.vercel.app`,
      `DTSTAMP:${icsDay(new Date())}T000000Z`,
      `DTSTART;VALUE=DATE:${icsDay(d)}`,
      `DTEND;VALUE=DATE:${icsDay(end)}`,
      `SUMMARY:Estimated tax payment ${q.quarter}: about ${formatUsd(q.payment).replace(/,/g, "")}`,
      "DESCRIPTION:Estimate from HustleCalc. Confirm the amount and the due date at IRS.gov before paying.",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Estimated tax payment due in 3 days",
      "TRIGGER:-P3D",
      "END:VALARM",
      "END:VEVENT",
    ];
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HustleCalc//EN", ...events, "END:VCALENDAR"].join("\r\n");
}

function csvCell(v: string | number) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ProTools({
  quarterly,
  taxRate,
  mileageRate,
}: {
  quarterly: Quarter[];
  taxRate: number;
  mileageRate: number;
}) {
  const [tab, setTab] = useState<Tab>("setaside");
  const [setaside, saveSetaside] = useStored(KEYS.setaside);
  const [miles, saveMiles] = useStored(KEYS.miles);
  const [expenses, saveExpenses] = useStored(KEYS.expenses);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [date, setDate] = useState(today());
  const [msg, setMsg] = useState("");

  const lists = { setaside, miles, expenses };
  const savers = { setaside: saveSetaside, miles: saveMiles, expenses: saveExpenses };
  const list = lists[tab];
  const year = String(new Date().getFullYear());
  const yearList = list.filter((e) => e.date.startsWith(year));
  const total = yearList.reduce((s, e) => s + e.amount, 0);

  function add(e: FormEvent) {
    e.preventDefault();
    const n = Number.parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      setMsg(tab === "miles" ? "Enter the miles driven." : "Enter an amount above zero.");
      return;
    }
    setMsg("");
    const entry: Entry = {
      id: `${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      date: date || today(),
      amount: n,
      note: note.trim().slice(0, 80),
      ...(tab === "expenses" ? { category } : {}),
    };
    savers[tab]([entry, ...list]);
    setAmount("");
    setNote("");
  }

  function remove(id: string) {
    savers[tab](list.filter((e) => e.id !== id));
  }

  function exportCsv() {
    const rows = [["Date", "Category", "Amount", "Note"], ...expenses.map((e) => [e.date, e.category ?? "", e.amount, e.note])];
    download("expenses.csv", "text/csv", rows.map((r) => r.map(csvCell).join(",")).join("\r\n"));
  }

  function exportBackup() {
    download("hustlecalc-backup.json", "application/json", JSON.stringify({ setaside, miles, expenses }));
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as Partial<Record<Tab, Entry[]>>;
      const ok = (v: unknown): v is Entry[] => Array.isArray(v) && v.every((x) => x && typeof x.amount === "number" && typeof x.date === "string");
      if (ok(data.setaside)) saveSetaside(data.setaside);
      if (ok(data.miles)) saveMiles(data.miles);
      if (ok(data.expenses)) saveExpenses(data.expenses);
      setMsg("Backup restored.");
    } catch {
      setMsg("That file is not a HustleCalc backup.");
    }
  }

  const tabs: { id: Tab; label: string; Icon: typeof Wallet }[] = [
    { id: "setaside", label: "Set-aside", Icon: Wallet },
    { id: "miles", label: "Mileage", Icon: Route },
    { id: "expenses", label: "Expenses", Icon: Receipt },
  ];

  const summary =
    tab === "setaside"
      ? { big: formatUsd(total * taxRate), cap: `Set this aside from ${formatUsd(total)} received in ${year}${taxRate > 0 ? "" : ". Enter your income above to set the rate."}` }
      : tab === "miles"
        ? { big: formatUsd(total * mileageRate), cap: `${total.toLocaleString("en-US", { maximumFractionDigits: 1 })} miles at $${mileageRate} per mile (2026 blended IRS rate)` }
        : { big: formatUsd(total), cap: `${yearList.length} expense${yearList.length === 1 ? "" : "s"} logged in ${year}` };

  return (
    <div className="mt-6 border-t border-line pt-6">
      <h3 className="font-medium text-fg">Payment reminders</h3>
      <p className="mt-1 text-sm text-muted">
        Add your upcoming estimated-tax dates to your phone calendar, with a reminder three days before each one.
      </p>
      <button
        type="button"
        className={`${ghost} mt-3`}
        disabled={quarterly.length === 0}
        onClick={() => download("estimated-tax-dates.ics", "text/calendar", buildIcs(quarterly))}
      >
        <CalendarPlus className="size-4 text-accent" aria-hidden="true" />
        Add dates to calendar
      </button>

      <h3 className="mt-8 font-medium text-fg">Trackers</h3>
      <div role="tablist" aria-label="Pro trackers" className="mt-3 grid grid-cols-3 gap-2">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              setMsg("");
            }}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-medium ${
              tab === id ? "border-accent bg-raised text-fg" : "border-line text-muted"
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-line bg-bg px-4 py-4">
        <p className="font-serif text-4xl leading-none text-keep tabular-nums">{summary.big}</p>
        <p className="mt-2 text-xs text-muted">{summary.cap}</p>
      </div>

      <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          className={field}
          inputMode="decimal"
          placeholder={tab === "setaside" ? "Amount you were paid" : tab === "miles" ? "Miles driven" : "Amount spent"}
          aria-label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input className={field} type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
        {tab === "expenses" && (
          <select className={field} aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
        <input className={field} placeholder="Note (optional)" aria-label="Note" maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-ink sm:col-span-2">
          <Plus className="size-4" aria-hidden="true" />
          Add entry
        </button>
      </form>
      {msg && (
        <p role="status" className="mt-2 text-sm text-muted">
          {msg}
        </p>
      )}

      {list.length > 0 ? (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {list.slice(0, 8).map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">
                  {tab === "miles" ? `${e.amount} mi` : formatUsd(e.amount)}
                  {e.category ? ` · ${e.category}` : ""}
                </p>
                <p className="truncate text-xs text-muted">
                  {shortDate(e.date)}
                  {e.note ? ` · ${e.note}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => remove(e.id)} aria-label="Delete entry" className="rounded-lg border border-line p-2 text-muted hover:text-fg">
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">Nothing logged yet. Your first entry shows up here.</p>
      )}
      {list.length > 8 && <p className="mt-2 text-xs text-muted">Showing the latest 8 of {list.length}. Totals include all of {year}.</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {tab === "expenses" && (
          <button type="button" className={ghost} onClick={exportCsv} disabled={expenses.length === 0}>
            <Download className="size-4" aria-hidden="true" />
            Export CSV for your preparer
          </button>
        )}
        <button type="button" className={ghost} onClick={exportBackup}>
          <Download className="size-4" aria-hidden="true" />
          Back up data
        </button>
        <label className={`${ghost} cursor-pointer`}>
          <Upload className="size-4" aria-hidden="true" />
          Restore backup
          <input type="file" accept="application/json" className="sr-only" onChange={(e) => void importBackup(e.target.files?.[0])} />
        </label>
      </div>
      <p className="mt-2 text-xs text-muted">
        Entries are stored only in this browser. Clearing your browser data deletes them, so back up now and then.
      </p>
    </div>
  );
}

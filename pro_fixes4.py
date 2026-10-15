"""HustleCalc Pro fix 4: restore the 'Already paid?' manual unlock box.

Salah decided against the PayPal Business upgrade (account risk).
The manual box is the self-serve fallback for buyers on a Personal account:
after paying, PayPal shows a "Return to merchant" button; if the buyer
misses it, they paste their transaction ID here to unlock.
Note: the box cannot verify payment against PayPal (no backend).
"""
import pathlib

ROOT = pathlib.Path.home() / "hustlecalc"
calc = ROOT / "src/components/calculator.tsx"
t = calc.read_text()
assert "Already paid" not in t, "box already present?"

# 1. PRO_TX_KEY constant after PRO_STORAGE_KEY
old = 'const PRO_STORAGE_KEY = "hc_pro";\n'
assert old in t, "storage key anchor missing"
t = t.replace(old, old + 'const PRO_TX_KEY = "hc_pro_tx";\n', 1)
print("OK: PRO_TX_KEY restored")

# 2. tx state after proUnlocked state
old = '''  const [proUnlocked, setProUnlocked] = useState(
    () => typeof window !== "undefined" && readProUnlock(),
  );
'''
assert old in t, "proUnlocked anchor missing"
t = t.replace(
    old,
    old + '  const [txInput, setTxInput] = useState("");\n  const [txError, setTxError] = useState("");\n',
    1,
)
print("OK: tx state restored")

# 3. unlockWithTx function before saveScenario
func = '''  function unlockWithTx() {
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

'''
old = "  function saveScenario() {"
assert old in t, "saveScenario anchor missing"
t = t.replace(old, func + old, 1)
print("OK: unlockWithTx restored")

# 4. details block after the Buy Now div
old = '''                <p className="text-xs text-muted">
                  Secure checkout via PayPal. One-time payment — no subscription.
                </p>
              </div>
'''
assert old in t, "buy div anchor missing"
details = '''                <p className="text-xs text-muted">
                  Secure checkout via PayPal. One-time payment — no subscription.
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
                    placeholder="PayPal transaction ID"
                    autoComplete="off"
                    className="min-h-12 flex-1 rounded-xl border border-line bg-raised px-4 text-sm text-fg placeholder:text-muted"
                  />
                  <button
                    type="button"
                    onClick={unlockWithTx}
                    className="min-h-12 rounded-xl border border-line px-5 text-sm font-medium"
                  >
                    Unlock
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Find the 17-character ID in your PayPal receipt email. After checkout, PayPal can
                  also send you straight back here, unlocked.
                </p>
                {txError && <p className="mt-2 text-xs text-red-400">{txError}</p>}
              </details>
'''
t = t.replace(old, details, 1)
print("OK: details block restored")

calc.write_text(t)

# --- verify ---
t = calc.read_text()
assert "Already paid? Unlock Pro" in t
assert "function unlockWithTx()" in t
assert "PRO_TX_KEY" in t
assert "txInput" in t
assert "?pro=unlock-9d4f2c" in t, "secret return URL must stay!"
print("FIX 4 COMPLETE OK")

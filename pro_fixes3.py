"""HustleCalc Pro fix 3: remove the 'Already paid?' manual unlock box.

That box accepted any typed string, so anyone could unlock Pro for free.
After this, the ONLY unlock path is the secret PayPal return URL.
"""
import pathlib

ROOT = pathlib.Path.home() / "hustlecalc"
calc = ROOT / "src/components/calculator.tsx"
t = calc.read_text()

# 1. Remove the <details> "Already paid?" block (contains onClick={unlockWithTx})
anchor = "Already paid? Unlock Pro"
assert anchor in t, "details block not found"
d_start = t.rindex("<details", 0, t.index(anchor))
d_end = t.index("</details>", t.index(anchor)) + len("</details>")
t = t[:d_start] + t[d_end:]
assert anchor not in t, "details block still present"
print("OK: details block removed")

# 2. Remove unlockWithTx function (exact text)
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
assert func in t, "unlockWithTx function not found"
t = t.replace(func, "")
print("OK: unlockWithTx removed")

# 3. Remove tx input state
old = '  const [txInput, setTxInput] = useState("");\n  const [txError, setTxError] = useState("");\n'
assert old in t, "tx state not found"
t = t.replace(old, "")
print("OK: tx state removed")

# 4. Remove PRO_TX_KEY constant
old = 'const PRO_TX_KEY = "hc_pro_tx";\n'
assert old in t, "PRO_TX_KEY not found"
t = t.replace(old, "")
print("OK: PRO_TX_KEY removed")

calc.write_text(t)

# --- verify ---
t = calc.read_text()
assert "unlockWithTx" not in t, "unlockWithTx still present"
assert "txInput" not in t, "txInput still present"
assert "Already paid" not in t, "Already paid still present"
assert "PRO_TX_KEY" not in t, "PRO_TX_KEY still present"
assert "?pro=unlock-9d4f2c" in t, "secret return URL missing!"
assert "Buy Now with PayPal" in t, "buy button missing!"
print("FIX 3 COMPLETE OK")

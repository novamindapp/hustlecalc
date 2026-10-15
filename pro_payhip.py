#!/usr/bin/env python3
"""HustleCalc: replace insecure PayPal unlock with Payhip license-key verification.

What it does:
  1. Creates api/verify.js — Vercel serverless function. POST {key} -> {ok:true/false}.
     Verifies the key with Payhip's v2 license API using PAYHIP_PRODUCT_SECRET
     (Vercel env var — never in page code).
  2. Patches src/components/calculator.tsx:
     - removes PayPal link, return URL (?pro=unlock-...) and email
     - "Buy Now" points at the Payhip product URL (passed as argv[1])
     - unlock box now takes a Payhip license key, verified via /api/verify
     - stored keys are re-verified with the server on each load

Run from the repo root:
    python3 pro_payhip.py https://payhip.com/b/YOUR_PRODUCT_CODE

Prerequisites (do these first):
    1. Payhip: create product "HustleCalc Pro" ($9), enable "Generate unique
       license keys for each sale", copy the product page URL.
    2. Payhip product edit page: copy the product secret key.
    3. Vercel: project Settings -> Environment Variables -> add
       PAYHIP_PRODUCT_SECRET = <the secret> (all environments), then redeploy.

Idempotent: re-running is a no-op once applied.
"""
import os
import sys

# ---------------------------------------------------------------- argv / URL
if len(sys.argv) < 2 or "payhip.com" not in sys.argv[1]:
    sys.exit(
        "Usage: python3 pro_payhip.py https://payhip.com/b/YOUR_PRODUCT_CODE\n"
        "Create the Payhip product first (HustleCalc Pro, $9, license keys on), "
        "then pass its page URL."
    )
PAYHIP_URL = sys.argv[1].strip().rstrip("/")

# ---------------------------------------------------------------- api/verify.js
VERIFY_JS = """// POST /api/verify — verifies a Payhip license key server-side.
// Body: { "key": "<license key>" } -> { "ok": true } or { "ok": false }
// Requires Vercel env var: PAYHIP_PRODUCT_SECRET (from the Payhip product edit page).
// The secret never reaches the browser.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const key = String((body && body.key) || "").trim();
  if (!/^[A-Za-z0-9-]{8,64}$/.test(key)) return res.json({ ok: false });

  const secret = process.env.PAYHIP_PRODUCT_SECRET;
  if (!secret) return res.json({ ok: false });

  try {
    const r = await fetch(
      "https://payhip.com/api/v2/license/verify?license_key=" + encodeURIComponent(key),
      { headers: { "product-secret-key": secret } }
    );
    const d = r.ok ? await r.json().catch(() => null) : null;
    const ok = !!(d && d.data && d.data.enabled !== false);
    return res.json({ ok });
  } catch {
    return res.json({ ok: false });
  }
}
"""

os.makedirs("api", exist_ok=True)
with open("api/verify.js", "w", encoding="utf-8") as f:
    f.write(VERIFY_JS)
print("OK: api/verify.js written")

# ---------------------------------------------------------------- calculator.tsx
PATH = "src/components/calculator.tsx"
t = open(PATH, encoding="utf-8").read()

if "PAYHIP_BUY_URL" in t and "unlock-9d4f2c" not in t:
    print("Already applied: Payhip flow present. Nothing to do.")
    sys.exit(0)

REPS = [
    # 1. constants: drop PayPal link/email/return URL
    (
        'const PAYPAL_RETURN_URL = "https://hustlecalc.vercel.app/?pro=unlock-9d4f2c";\n'
        'const PAYPAL_BUY_URL =\n'
        '  "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=salahnachat572@gmail.com&item_name=Side+Hustle+Tax+Calculator+Pro&amount=9.00&currency_code=USD&no_shipping=1&return=" +\n'
        '  encodeURIComponent(PAYPAL_RETURN_URL);',
        '/** Payhip checkout for HustleCalc Pro ($9 one-time). */\n'
        f'const PAYHIP_BUY_URL = "{PAYHIP_URL}";',
    ),
    # 2. storage keys
    (
        'const PRO_STORAGE_KEY = "hc_pro";\nconst PRO_TX_KEY = "hc_pro_tx";',
        'const PRO_STORAGE_KEY = "hc_pro";\nconst PRO_KEY_STORAGE = "hc_pro_key";',
    ),
    # 3. unlock check: no more ?pro=unlock-... URL trick
    (
        '/** True when the buyer returned from PayPal (?pro=unlock-9d4f2c) or unlocked before. */\n'
        'function readProUnlock(): boolean {\n'
        '  try {\n'
        '    const params = new URLSearchParams(window.location.search);\n'
        '    if (params.get("pro") === "unlock-9d4f2c") {\n'
        '      localStorage.setItem(PRO_STORAGE_KEY, "1");\n'
        '      window.history.replaceState(null, "", window.location.pathname);\n'
        '      return true;\n'
        '    }\n'
        '    return localStorage.getItem(PRO_STORAGE_KEY) === "1";\n'
        '  } catch {\n'
        '    return false;\n'
        '  }\n'
        '}',
        '/** True when a license key was verified before. Re-checked with the server on load. */\n'
        'function readProUnlock(): boolean {\n'
        '  try {\n'
        '    return localStorage.getItem(PRO_STORAGE_KEY) === "1" && !!localStorage.getItem(PRO_KEY_STORAGE);\n'
        '  } catch {\n'
        '    return false;\n'
        '  }\n'
        '}\n'
        '\n'
        '/** Asks the server (/api/verify) whether a Payhip license key is valid. */\n'
        'async function verifyLicenseKey(key: string): Promise<boolean> {\n'
        '  try {\n'
        '    const r = await fetch("/api/verify", {\n'
        '      method: "POST",\n'
        '      headers: { "Content-Type": "application/json" },\n'
        '      body: JSON.stringify({ key }),\n'
        '    });\n'
        '    const d = (await r.json().catch(() => null)) as { ok?: boolean } | null;\n'
        '    return !!(d && d.ok);\n'
        '  } catch {\n'
        '    return false;\n'
        '  }\n'
        '}',
    ),
    # 4. re-verify stored key on load
    (
        '  useEffect(() => {\n    setScenarios(readScenarios());\n  }, []);',
        '  useEffect(() => {\n    setScenarios(readScenarios());\n  }, []);\n'
        '\n'
        '  // Re-verify a stored license key with the server on load; lock if invalid.\n'
        '  useEffect(() => {\n'
        '    let cancelled = false;\n'
        '    (async () => {\n'
        '      let key: string | null = null;\n'
        '      try {\n'
        '        key = localStorage.getItem(PRO_KEY_STORAGE);\n'
        '      } catch {\n'
        '        /* storage unavailable */\n'
        '      }\n'
        '      if (!key) return;\n'
        '      const ok = await verifyLicenseKey(key);\n'
        '      if (!cancelled && !ok) {\n'
        '        try {\n'
        '          localStorage.removeItem(PRO_STORAGE_KEY);\n'
        '          localStorage.removeItem(PRO_KEY_STORAGE);\n'
        '        } catch {\n'
        '          /* storage unavailable */\n'
        '        }\n'
        '        setProUnlocked(false);\n'
        '      }\n'
        '    })();\n'
        '    return () => {\n'
        '      cancelled = true;\n'
        '    };\n'
        '  }, []);',
    ),
    # 5. unlock function: verify key with server instead of accepting any tx id
    (
        '  function unlockWithTx() {\n'
        '    const tx = txInput.trim();\n'
        '    if (tx.length < 8) {\n'
        '      setTxError("Paste the transaction ID from your PayPal receipt email (17 characters).");\n'
        '      return;\n'
        '    }\n'
        '    try {\n'
        '      localStorage.setItem(PRO_STORAGE_KEY, "1");\n'
        '      localStorage.setItem(PRO_TX_KEY, tx);\n'
        '    } catch {\n'
        '      /* storage unavailable */\n'
        '    }\n'
        '    setTxError("");\n'
        '    setTxInput("");\n'
        '    setProUnlocked(true);\n'
        '    document.getElementById("pro")?.scrollIntoView({ behavior: "smooth", block: "start" });\n'
        '  }',
        '  async function unlockWithKey() {\n'
        '    const key = txInput.trim();\n'
        '    if (key.length < 8) {\n'
        '      setTxError("Paste the license key from your Payhip receipt email.");\n'
        '      return;\n'
        '    }\n'
        '    setTxError("Checking…");\n'
        '    const ok = await verifyLicenseKey(key);\n'
        '    if (!ok) {\n'
        '      setTxError("That key didn\'t verify. Check it and try again.");\n'
        '      return;\n'
        '    }\n'
        '    try {\n'
        '      localStorage.setItem(PRO_STORAGE_KEY, "1");\n'
        '      localStorage.setItem(PRO_KEY_STORAGE, key);\n'
        '    } catch {\n'
        '      /* storage unavailable */\n'
        '    }\n'
        '    setTxError("");\n'
        '    setTxInput("");\n'
        '    setProUnlocked(true);\n'
        '    document.getElementById("pro")?.scrollIntoView({ behavior: "smooth", block: "start" });\n'
        '  }',
    ),
    # 6. buy button -> Payhip
    ("href={PAYPAL_BUY_URL}", "href={PAYHIP_BUY_URL}"),
    ("Buy Now with PayPal · $9", "Buy Now · $9"),
    (
        "Secure checkout via PayPal. One-time payment — no subscription.",
        "Secure checkout via Payhip. One-time payment — no subscription.",
    ),
    # 7. unlock box -> license key
    ("onClick={unlockWithTx}", "onClick={unlockWithKey}"),
    ('placeholder="PayPal transaction ID"', 'placeholder="License key"'),
    (
        "Find the 17-character ID in your PayPal receipt email. After checkout, PayPal can\n"
        "                  also send you straight back here, unlocked.",
        "Find your license key in your Payhip receipt email.",
    ),
]

changed = 0
for old, new in REPS:
    if old not in t:
        # allow re-runs: skip replacements whose NEW text is already present
        if new.split("\n")[0] in t or new[:60] in t:
            continue
        raise AssertionError(f"{PATH}: pattern not found: {old[:70]!r}")
    t = t.replace(old, new, 1)
    changed += 1

# safety: no PayPal remnants, no unlock backdoor
assert "paypal.com" not in t.lower(), "PayPal URL still present"
assert "unlock-9d4f2c" not in t, "unlock backdoor still present"
assert "salahnachat572@gmail.com" not in t, "PayPal email still present"
assert "unlockWithTx" not in t, "old unlock function still present"
assert "PRO_TX_KEY" not in t, "old tx key still present"

open(PATH, "w", encoding="utf-8").write(t)
print(f"OK: {PATH} ({changed} replacements)")
print("PAYHIP PATCH COMPLETE OK")

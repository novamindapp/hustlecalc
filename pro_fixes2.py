"""HustleCalc Pro fixes 2: obscure unlock URL + blank print page fix."""
import pathlib

ROOT = pathlib.Path.home() / "hustlecalc"

# --- Fix 1: obscure the Pro unlock URL (was ?pro=1, guessable) ---
calc = ROOT / "src/components/calculator.tsx"
t = calc.read_text()
old_url = "https://hustlecalc.vercel.app/?pro=1"
new_url = "https://hustlecalc.vercel.app/?pro=unlock-9d4f2c"
assert old_url in t, "return URL not found"
t = t.replace(old_url, new_url)
old_check = 'params.get("pro") === "1"'
new_check = 'params.get("pro") === "unlock-9d4f2c"'
assert old_check in t, "unlock check not found"
t = t.replace(old_check, new_check)
t = t.replace("(?pro=1)", "(?pro=unlock-9d4f2c)")
calc.write_text(t)
print("OK: unlock URL obscured")

# --- Fix 2: kill the blank 2nd page when printing the PDF report ---
css = ROOT / "src/styles.css"
c = css.read_text()
fix = """
@media print {
  .pro-print-root {
    min-height: 0 !important;
    background: #ffffff !important;
  }
}
@page {
  margin: 12mm;
}
"""
if "min-height: 0 !important" not in c:
    c = c.rstrip("\n") + "\n" + fix
    css.write_text(c)
    print("OK: print CSS fixed")
else:
    print("OK: print CSS already fixed")

# --- verify ---
t = calc.read_text()
c = css.read_text()
assert "?pro=unlock-9d4f2c" in t, "new URL missing"
assert "pro=1" not in t, "old pro=1 still present"
assert "@page" in c, "@page rule missing"
print("FIXES 2 COMPLETE OK")

"""HustleCalc Pro fix 5: kill the blank 2nd print page for real.

Root cause: body has `min-height: 100vh` (base styles). In print, 100vh can
exceed the printable area (especially with @page margins), pushing the body
past one page -> blank 2nd page. Fix: zero out html/body heights in print.
"""
import pathlib

ROOT = pathlib.Path.home() / "hustlecalc"
css = ROOT / "src/styles.css"
c = css.read_text()

MARKER = "/* fix5: print body height */"
fix = (
    "\n" + MARKER + "\n"
    + "@media print {\n"
    + "  html,\n"
    + "  body {\n"
    + "    min-height: 0 !important;\n"
    + "    height: auto !important;\n"
    + "    background: #ffffff !important;\n"
    + "  }\n"
    + "}\n"
)
if MARKER in c:
    print("OK: print body fix already present")
else:
    c = c.rstrip("\n") + "\n" + fix
    css.write_text(c)
    print("OK: print body height fixed")

# --- verify ---
c = css.read_text()
assert MARKER in c
assert "min-height: 0 !important" in c
print("FIX 5 COMPLETE OK")

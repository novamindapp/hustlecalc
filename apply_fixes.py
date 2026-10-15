import sys

P = "src/components/calculator.tsx"
s = open(P, encoding="utf-8").read()

def rep(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        print(f"FAIL: {label} found {n} times (expected 1). Nothing written.")
        sys.exit(1)
    s = s.replace(old, new)
    print(f"OK: {label}")

rep("Placeholder PayPal link. Swap in your own hosted button before taking payment.",
    "Secure checkout via PayPal. One-time payment — no subscription.",
    "placeholder note")

rep('import { useMemo, useState } from "react";',
    'import { useEffect, useMemo, useRef, useState } from "react";',
    "react import")

adbanner = '''function AdBanner() {
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

'''
rep("export function Calculator() {",
    adbanner + "export function Calculator() {",
    "AdBanner component")

rep('        <section className="mt-8 rounded-2xl border border-line bg-surface p-4 sm:p-6" aria-labelledby="pro-title">',
    '        <AdBanner />\n        <section className="mt-8 rounded-2xl border border-line bg-surface p-4 sm:p-6" aria-labelledby="pro-title">',
    "AdBanner placement")

open(P, "w", encoding="utf-8").write(s)
print("ALL 4 FIXES APPLIED OK")

// POST /api/verify — verifies a Payhip license key server-side.
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

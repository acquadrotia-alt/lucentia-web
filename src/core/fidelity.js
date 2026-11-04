// Punti fedeltà di un cliente (modulo puro, usato dal gestionale e dal server).
export function loyaltyConfig(config) { const L = (config && config.loyalty) || {}; return { mode: L.mode || "flat", fromSales: !!L.fromSales, rewards: Array.isArray(L.rewards) ? L.rewards : [] }; }
export function clientPoints(code, bookings, sales, config, catalog) {
  const L = loyaltyConfig(config);
  const svcPts = (id) => { if (L.mode === "perService") { const s = ((config && config.services) || []).find((x) => x.id === id); return s && s.points != null ? Number(s.points) || 0 : 0; } return 1; };
  let pts = 0;
  (Array.isArray(bookings) ? bookings : []).forEach((b) => { if (b && (b.status === "done" || b.status === "partial") && b.clientCode === code) pts += (b.serviceIds || []).reduce((a, id) => a + svcPts(id), 0); });
  if (L.fromSales && Array.isArray(sales) && catalog) { const prodPts = (pid) => { const p = (catalog.products || []).find((x) => x.id === pid); return p && p.points != null ? Number(p.points) || 0 : 0; }; sales.forEach((s) => { if (s && s.type === "sale" && s.clientCode === code) (s.items || []).forEach((it) => { pts += prodPts(it.productId) * it.qty; }); }); }
  return pts;
}
export function clientBalance(c, bookings, sales, config, catalog) { return clientPoints(c.code, bookings, sales, config, catalog) + (Number(c.bonusPoints) || 0) - (Number(c.redeemedPoints) || 0); }
export const puntiCliente = (c, bookings, sales, config, catalog) => (c && c.code ? clientBalance(c, bookings, sales, config, catalog) : 0);

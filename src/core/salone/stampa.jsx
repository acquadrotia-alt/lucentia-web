import { Sparkles, Gift, Star, Hash, Wallet } from "lucide-react";
import { pad, minToStr, todayStr, parseDate, fmtDate, eur, fmtDateTime, hexToRgb, mix, rgbStr } from "./comuni.jsx";

export function downloadICS(booking, staff, services, brandName) {
  const st = staff.find((s) => s.id === booking.staffId);
  const names = booking.serviceIds.map((id) => { const s = services.find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
  const d = parseDate(booking.date);
  const f = (m) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(Math.floor(m / 60))}${pad(m % 60)}00`;
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SaloneApp//IT", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:${booking.id}@saloneapp`, `DTSTAMP:${stamp}`, `DTSTART:${f(booking.startMin)}`, `DTEND:${f(booking.endMin)}`, `SUMMARY:${brandName} - ${names}`, `DESCRIPTION:Servizi: ${names}\\nCon: ${st ? st.name : "-"}`, "BEGIN:VALARM", "TRIGGER:-PT60M", "ACTION:DISPLAY", "DESCRIPTION:Promemoria appuntamento", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "appuntamento.ics"; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
export function paintCard(ctx, branding, name, code, logoImg) {
  const W = 720, H = 440;
  let rgb; try { rgb = hexToRgb(branding.primary); } catch (e) { rgb = [225, 29, 72]; }
  const dark = mix(rgb, [0, 0, 0], 0.18);
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, rgbStr(rgb)); g.addColorStop(1, rgbStr(dark));
  roundRect(ctx, 0, 0, W, H, 36); ctx.fillStyle = g; ctx.fill();
  ctx.save(); roundRect(ctx, 0, 0, W, H, 36); ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.arc(W - 30, -10, 130, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.beginPath(); ctx.arc(W - 10, 130, 90, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  const font = (w, s) => `${w} ${s}px -apple-system, system-ui, Segoe UI, Roboto, sans-serif`;
  let nameX = 52;
  if (logoImg) { ctx.save(); roundRect(ctx, 52, 42, 56, 56, 14); ctx.clip(); ctx.drawImage(logoImg, 52, 42, 56, 56); ctx.restore(); nameX = 124; }
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle";
  ctx.font = font("600", 30); ctx.fillText(branding.name || "", nameX, 72);
  ctx.font = font("500", 22); ctx.textAlign = "right"; ctx.globalAlpha = 0.92; ctx.fillText("★ Carta Fedeltà", W - 44, 66); ctx.textAlign = "left"; ctx.globalAlpha = 1;
  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = 0.7; ctx.font = font("600", 20); ctx.fillText("INTESTATARIO", 52, 252);
  ctx.globalAlpha = 1; ctx.font = font("600", 42); ctx.fillText(name || "Cliente", 52, 302);
  ctx.globalAlpha = 0.7; ctx.font = font("600", 20); ctx.fillText("CODICE", 52, 362);
  ctx.globalAlpha = 1; ctx.font = font("700", 58); ctx.fillText(String(code), 52, 418);
}
export function downloadCardImage(branding, name, code) {
  const c = document.createElement("canvas"); c.width = 720; c.height = 440; const ctx = c.getContext("2d");
  const finish = () => { try { const url = c.toDataURL("image/png"); const a = document.createElement("a"); a.href = url; a.download = `tessera-${code}.png`; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { alert("Impossibile generare l'immagine."); } };
  if (branding.logo) { const img = new Image(); img.onload = () => { paintCard(ctx, branding, name, code, img); finish(); }; img.onerror = () => { paintCard(ctx, branding, name, code, null); finish(); }; img.src = branding.logo; }
  else { paintCard(ctx, branding, name, code, null); finish(); }
}

export function receiptHTML(booking, config, code) {
  const branding = config.branding, services = config.services, staff = config.staff;
  const st = staff.find((s) => s.id === booking.staffId);
  const items = booking.serviceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean);
  const total = items.reduce((a, s) => a + s.durationMin, 0);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const logo = branding.logo ? `<img src="${branding.logo}" style="width:120px;height:120px;object-fit:contain;display:block;margin:0 auto 6px;border-radius:8px"/>` : "";
  const rows = items.map((s) => `<tr><td>${esc(s.name)}</td><td style="text-align:right;white-space:nowrap">${s.durationMin}'</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Riepilogo</title><style>@page{size:80mm auto;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{width:72mm;margin:0 auto;padding:8px 4px;font-family:'Courier New',monospace;color:#000}.c{text-align:center}.b{font-weight:bold}.big{font-size:15px}.sm{font-size:11px}hr{border:none;border-top:1px dashed #000;margin:6px 0}table{width:100%;font-size:12px;border-collapse:collapse}td{padding:1px 0;vertical-align:top}.row{display:flex;justify-content:space-between;gap:8px;font-size:12px}</style></head><body>${logo}<div class="c b big">${esc(branding.name)}</div>${branding.address ? `<div class="c sm">${esc(branding.address)}</div>` : ""}${branding.phone ? `<div class="c sm">${esc(branding.phone)}</div>` : ""}<hr/><div class="c b">RIEPILOGO APPUNTAMENTO</div><hr/><div class="row"><span>Cliente</span><span class="b">${esc(booking.clientName)}</span></div><div class="row"><span>Codice</span><span>${esc(code || booking.clientCode || "-")}</span></div><div class="row"><span>Data</span><span>${esc(fmtDate(booking.date))}</span></div><div class="row"><span>Orario</span><span>${minToStr(booking.startMin)} - ${minToStr(booking.endMin)}</span></div><div class="row"><span>Operatore</span><span>${st ? esc(st.name) : "-"}</span></div><hr/><table>${rows}</table><hr/><div class="row b"><span>Durata totale</span><span>${total} min</span></div><hr/><div class="c sm">Grazie e a presto!</div></body></html>`;
}
export function printReceipt(booking, config, code) {
  try {
    const html = receiptHTML(booking, config, code);
    const ifr = document.createElement("iframe");
    ifr.style.position = "fixed"; ifr.style.width = "0"; ifr.style.height = "0"; ifr.style.right = "0"; ifr.style.bottom = "0"; ifr.style.border = "0";
    document.body.appendChild(ifr);
    const doc = ifr.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (e) {} setTimeout(() => { ifr.remove(); }, 1500); }, 500);
  } catch (e) { alert("Stampa non disponibile."); }
}

export function saleReceiptHTML(sale, branding) {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const logo = branding.logo ? `<img src="${branding.logo}" style="width:120px;height:120px;object-fit:contain;display:block;margin:0 auto 6px;border-radius:8px"/>` : "";
  const rows = sale.items.map((it) => `<tr><td>${esc(it.name)}${it.label ? ` <span style="color:#666">(${esc(it.label)})</span>` : ""}<br><span style="color:#666">${it.qty} × ${eur(it.price)}</span></td><td style="text-align:right;white-space:nowrap;vertical-align:top">${eur(it.price * it.qty)}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Scontrino</title><style>@page{size:80mm auto;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{width:72mm;margin:0 auto;padding:8px 4px;font-family:'Courier New',monospace;color:#000}.c{text-align:center}.b{font-weight:bold}.big{font-size:15px}.sm{font-size:11px}hr{border:none;border-top:1px dashed #000;margin:6px 0}table{width:100%;font-size:12px;border-collapse:collapse}td{padding:2px 0;vertical-align:top}.row{display:flex;justify-content:space-between;gap:8px;font-size:13px}</style></head><body>${logo}<div class="c b big">${esc(branding.name)}</div>${branding.address ? `<div class="c sm">${esc(branding.address)}</div>` : ""}${branding.phone ? `<div class="c sm">${esc(branding.phone)}</div>` : ""}<hr/><div class="c b">SCONTRINO PRODOTTI${sale.partial ? " · PARZIALE" : ""}</div><div class="c sm">${esc(fmtDateTime(sale.ts))}</div>${sale.clientName ? `<div class="c sm">Cliente: ${esc(sale.clientName)}${sale.clientCode ? ` #${esc(sale.clientCode)}` : ""}</div>` : ""}<hr/><table>${rows}</table><hr/><div class="row b"><span>TOTALE</span><span>${eur(sale.total)}</span></div><hr/><div class="c sm">Grazie e a presto!</div></body></html>`;
}
export function printSale(sale, branding) {
  try {
    const html = saleReceiptHTML(sale, branding);
    const ifr = document.createElement("iframe");
    ifr.style.position = "fixed"; ifr.style.width = "0"; ifr.style.height = "0"; ifr.style.right = "0"; ifr.style.bottom = "0"; ifr.style.border = "0";
    document.body.appendChild(ifr);
    const doc = ifr.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (e) {} setTimeout(() => { ifr.remove(); }, 1500); }, 500);
  } catch (e) { alert("Stampa non disponibile."); }
}

export function priceListHTML(config) {
  const branding = config.branding || {};
  const services = config.services || [];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const brand = branding.primary || "#7c3aed";
  const PAL = ["#7c3aed", "#0d9488", "var(--lc-accent)", "#f59e0b", "#2563eb", "#16a34a", "#db2777", "#0891b2"];
  const logo = branding.logo ? `<img class="logo" src="${branding.logo}" alt=""/>` : "";
  const contacts = [branding.address, branding.phone, branding.email].filter(Boolean).map(esc).join("&nbsp;&nbsp;&middot;&nbsp;&nbsp;");
  const cards = services.map((s, idx) => {
    const c = PAL[idx % PAL.length];
    const dur = s.durationMin ? `<span class="du" style="background:${c}20;color:${c}">${s.durationMin} min</span>` : "<span></span>";
    const has = s.price != null && String(s.price).trim() !== "" && Number(s.price) > 0;
    const pr = has ? `<span class="pr" style="color:${c}">${esc(eur(s.price))}</span>` : "";
    return `<div class="card"><div class="band" style="background:${c}"></div><div class="body" style="background:${c}0F"><div class="nm">${esc(s.name)}</div><div class="meta">${dur}${pr}</div></div></div>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Listino servizi</title><style>
    @page{size:A4;margin:0}
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937}
    .header{background:${brand};color:#fff;padding:30px 18mm 26px;text-align:center}
    .logo{width:72px;height:72px;object-fit:contain;border-radius:50%;background:#fff;padding:5px;margin-bottom:10px}
    .name{font-size:30px;font-weight:800;letter-spacing:.4px;line-height:1.05;margin:0}
    .tag{font-size:13px;opacity:.92;margin-top:6px;font-weight:500}
    .contacts{font-size:10.5px;opacity:.85;margin-top:9px;letter-spacing:.2px}
    .wrap{padding:24px 16mm 16mm}
    .title{text-align:center;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#9ca3af;font-weight:700;margin-bottom:20px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .card{break-inside:avoid;border-radius:14px;overflow:hidden;border:1px solid #eef0f3}
    .band{height:7px}
    .body{padding:13px 15px}
    .nm{font-size:14px;font-weight:700;color:#1f2937;line-height:1.2}
    .meta{display:flex;align-items:center;justify-content:space-between;margin-top:10px;gap:8px;min-height:24px}
    .du{font-size:10.5px;font-weight:700;padding:3px 10px;border-radius:999px;letter-spacing:.2px}
    .pr{font-size:17px;font-weight:800;white-space:nowrap;margin-left:auto}
    .foot{text-align:center;font-size:9.5px;color:#b4afbe;margin-top:24px;letter-spacing:.2px}
  </style></head><body>
    <div class="header">${logo}<div class="name">${esc(branding.name || "Listino")}</div>${branding.tagline ? `<div class="tag">${esc(branding.tagline)}</div>` : ""}${contacts ? `<div class="contacts">${contacts}</div>` : ""}</div>
    <div class="wrap">
      <div class="title">Listino servizi</div>
      <div class="grid">${cards || '<div class="card"><div class="band" style="background:#ccc"></div><div class="body"><div class="nm">Nessun servizio inserito.</div></div></div>'}</div>
      <div class="foot">Listino aggiornato al ${esc(fmtDate(todayStr()))}&nbsp;&nbsp;&middot;&nbsp;&nbsp;I prezzi possono subire variazioni</div>
    </div>
  </body></html>`;
}
export function printPriceList(config) {
  try {
    const html = priceListHTML(config);
    const ifr = document.createElement("iframe");
    ifr.style.position = "fixed"; ifr.style.width = "0"; ifr.style.height = "0"; ifr.style.right = "0"; ifr.style.bottom = "0"; ifr.style.border = "0";
    document.body.appendChild(ifr);
    const doc = ifr.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (e) {} setTimeout(() => { ifr.remove(); }, 1500); }, 500);
  } catch (e) { alert("Generazione listino non disponibile."); }
}
export function FidelityCard({ branding, name, code }) {
  return (
    <div className="rounded-2xl p-5 text-white shadow-lg relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-dark))" }}>
      <div className="absolute right-0 top-0 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,0.12)", transform: "translate(35%,-35%)" }} />
      <div className="absolute right-0 top-12 w-20 h-20 rounded-full" style={{ background: "rgba(255,255,255,0.1)", transform: "translate(25%,0)" }} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {branding.logo ? <img src={branding.logo} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}><Sparkles size={16} /></div>}
            <span className="font-semibold text-sm truncate">{branding.name}</span>
          </div>
          <div className="flex items-center gap-1 text-xs shrink-0" style={{ opacity: 0.9 }}><Star size={13} /> Carta Fedeltà</div>
        </div>
        <div className="mt-6">
          <div className="text-xs uppercase tracking-widest" style={{ opacity: 0.7 }}>Intestatario</div>
          <div className="text-lg font-semibold tracking-wide truncate">{name || "Cliente"}</div>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ opacity: 0.7 }}>Codice</div>
            <div className="text-2xl font-bold tracking-widest">{code}</div>
          </div>
          <Hash size={20} style={{ opacity: 0.5 }} />
        </div>
      </div>
    </div>
  );
}
export function CardActions({ branding, name, code }) {
  return (
    <div className="mt-2 flex flex-col items-center gap-1">
      <button onClick={() => downloadCardImage(branding, name, code)} className="text-sm brand-bg px-4 py-2 rounded-lg inline-flex items-center gap-2"><Wallet size={16} /> Salva tessera</button>
      <p className="text-xs text-stone-400 text-center">Salvala come immagine.</p>
    </div>
  );
}

// ===== BUONI REGALO (gift card) =====
export function genVoucherCode(vouchers) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const exists = (c) => (vouchers || []).some((v) => v.code === c);
  let c; do { let s = ""; for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]; c = "BN-" + s; } while (exists(c));
  return c;
}
export function voucherServiceName(v, services) { const s = (services || []).find((x) => x.id === v.serviceId); return s ? s.name : "Servizio"; }
export function voucherSubtitle(v, services) {
  if (v.tipo === "valore") return eur(v.tipo === "valore" ? (v.residuo != null ? v.residuo : v.importo) : 0);
  return `${v.sedute} sedute · ${voucherServiceName(v, services)}`;
}
export function paintVoucher(ctx, branding, v, line1, line2, logoImg) {
  const W = 720, H = 440;
  let rgb; try { rgb = hexToRgb(branding.primary); } catch (e) { rgb = [225, 29, 72]; }
  const dark = mix(rgb, [0, 0, 0], 0.2);
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, rgbStr(rgb)); g.addColorStop(1, rgbStr(dark));
  roundRect(ctx, 0, 0, W, H, 36); ctx.fillStyle = g; ctx.fill();
  ctx.save(); roundRect(ctx, 0, 0, W, H, 36); ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.arc(W - 30, -10, 130, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.beginPath(); ctx.arc(W - 10, 130, 90, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  const font = (w, s) => `${w} ${s}px -apple-system, system-ui, Segoe UI, Roboto, sans-serif`;
  let nameX = 52;
  if (logoImg) { ctx.save(); roundRect(ctx, 52, 42, 56, 56, 14); ctx.clip(); ctx.drawImage(logoImg, 52, 42, 56, 56); ctx.restore(); nameX = 124; }
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle";
  ctx.font = font("600", 30); ctx.fillText(branding.name || "", nameX, 72);
  ctx.font = font("600", 22); ctx.textAlign = "right"; ctx.globalAlpha = 0.92; ctx.fillText("★ Buono Regalo", W - 44, 66); ctx.textAlign = "left"; ctx.globalAlpha = 1;
  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = 1; ctx.font = font("700", 52); ctx.fillText(line1 || "", 52, 240);
  if (line2) { ctx.globalAlpha = 0.92; ctx.font = font("500", 26); ctx.fillText(line2, 52, 286); }
  ctx.globalAlpha = 0.7; ctx.font = font("600", 20); ctx.fillText("CODICE", 52, 362);
  ctx.globalAlpha = 1; ctx.font = font("700", 50); ctx.fillText(String(v.code), 52, 414);
}
export function voucherLines(v, services) {
  if (v.tipo === "valore") return [eur(v.importo), v.descrizione || "Buono valore"];
  return [`${v.sedute} sedute`, (v.descrizione ? v.descrizione + " · " : "") + voucherServiceName(v, services)];
}
export function downloadVoucherImage(branding, v, services) {
  const [l1, l2] = voucherLines(v, services);
  const c = document.createElement("canvas"); c.width = 720; c.height = 440; const ctx = c.getContext("2d");
  const finish = () => { try { const url = c.toDataURL("image/png"); const a = document.createElement("a"); a.href = url; a.download = `buono-${v.code}.png`; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { alert("Impossibile generare l'immagine."); } };
  if (branding.logo) { const img = new Image(); img.onload = () => { paintVoucher(ctx, branding, v, l1, l2, img); finish(); }; img.onerror = () => { paintVoucher(ctx, branding, v, l1, l2, null); finish(); }; img.src = branding.logo; }
  else { paintVoucher(ctx, branding, v, l1, l2, null); finish(); }
}
export function VoucherCard({ branding, v, services }) {
  const [l1, l2] = voucherLines(v, services);
  return (
    <div className="rounded-2xl p-5 text-white shadow-lg relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-dark))" }}>
      <div className="absolute right-0 top-0 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,0.12)", transform: "translate(35%,-35%)" }} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {branding.logo ? <img src={branding.logo} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}><Gift size={16} /></div>}
            <span className="font-semibold text-sm truncate">{branding.name}</span>
          </div>
          <div className="flex items-center gap-1 text-xs shrink-0" style={{ opacity: 0.9 }}><Gift size={13} /> Buono Regalo</div>
        </div>
        <div className="mt-6">
          <div className="text-3xl font-bold tracking-wide">{l1}</div>
          {l2 ? <div className="text-sm mt-1" style={{ opacity: 0.9 }}>{l2}</div> : null}
        </div>
        <div className="mt-4">
          <div className="text-xs uppercase tracking-widest" style={{ opacity: 0.7 }}>Codice</div>
          <div className="text-2xl font-bold tracking-widest">{v.code}</div>
        </div>
      </div>
    </div>
  );
}
export function voucherStatusLabel(v) {
  if (v.stato === "esaurito") return { txt: "Esaurito", cls: "bg-stone-100 text-stone-500" };
  if (v.stato === "riscattato" || v.stato === "assegnato") return { txt: v.clienteNome ? `Riscattato · ${v.clienteNome}` : "Riscattato", cls: "bg-green-100 text-green-700" };
  return { txt: "Attivo · da consegnare", cls: "bg-amber-100 text-amber-700" };
}

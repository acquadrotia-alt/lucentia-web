// ============================================================================
// Rotte pubbliche di un salone (nessun login): la pagina del salone, le
// prenotazioni online dei clienti e la pagina di un evento condiviso via link.
// ============================================================================
import { impegniServizio, durataServizio, senzaOperatore, operatoriDelServizio } from "../../src/orari.js";
import { json, pad2, todayISO, parseModuli } from "./util.js";
import { getAzienda } from "./sessione.js";
import { getCollezione, eventiComeImpegni, onlineBookingsOf, senzaColonnaImpegni, computeStarts } from "./disponibilita.js";

// I servizi prenotabili online = hanno una durata e c'è una risorsa capace di
// farli. Un servizio a sola cabina (la lampada) non richiede nessun operatore.
// Chi lo può fare lo dice il servizio: serve almeno un abilitato che lavori.
export function serviziPrenotabili(config) {
  const abilitatiDi = (s) => operatoriDelServizio(s, config.services || [], config.staff || []);
  const services = (config.services || []).filter((s) => {
    if (durataServizio(s) <= 0) return false;
    if (senzaOperatore(impegniServizio(s))) return ((config.cabine || []).length > 0);
    const ids = abilitatiDi(s);
    return (config.staff || []).some((st) => ids.includes(st.id) && st.availability && Object.keys(st.availability).length);
  });
  return { services, abilitatiDi };
}

export function brandPubblico(az, config) {
  const b = (config && config.branding) || {};
  return { nome: az.denominazione, brandName: b.name || az.denominazione, tagline: b.tagline || "", logo: b.logo || null, primary: b.primary || "#b8893b", phone: b.phone || "", email: b.email || "", address: b.address || "" };
}

// Tutto ciò che il pubblico può vedere di un salone: info attività, servizi,
// operatori, contenuti del sito, eventi futuri e (se il salone lo vuole) il
// catalogo. Lo usano sia il link di prenotazione sia il sito del salone.
export async function payloadPubblico(env, aid, az, config, services, abilitatiDi) {
  // Al mini-sito serve sapere, per ogni operatore, quali servizi sa fare:
  // si ricava dalle abilitazioni dichiarate dai servizi.
  const puoFare = (stId) => services.filter((s) => abilitatiDi(s).includes(stId)).map((s) => s.id);
  const staffPub = (config.staff || [])
    .filter((st) => st.availability && Object.keys(st.availability).length && puoFare(st.id).length)
    .map((st) => ({ id: st.id, name: st.name, role: st.role || "", avatar: st.avatar || null, photo: st.photo || null, serviceIds: puoFare(st.id) }));
  const sito = config.sito || {};
  const booking = config.onlineBooking || {};
  const horizonDays = Math.max(1, Number(booking.horizonDays || 30));
  const eventiRaw = (await getCollezione(env, aid, "eventi")) || [];
  const oggi = todayISO();
  const eventiPub = sito.mostraEventi === false ? [] : (Array.isArray(eventiRaw) ? eventiRaw : [])
    .filter((ev) => ev && ev.date >= oggi)
    .sort((x, y) => (x.date === y.date ? x.startMin - y.startMin : (x.date < y.date ? -1 : 1)))
    .slice(0, 6)
    .map((ev) => ({ id: ev.id, titolo: ev.titolo || "Evento", descrizione: ev.descrizione || "", copertina: ev.copertina || null, date: ev.date, startMin: ev.startMin, endMin: ev.endMin }));
  return {
    ok: true,
    salone: brandPubblico(az, config),
    services: services.map((s) => ({ id: s.id, name: s.name, categoria: s.categoria || null, durationMin: durataServizio(s), price: s.price != null ? s.price : null, senzaOperatore: senzaOperatore(impegniServizio(s)) || undefined })),
    staff: staffPub,
    horizonDays,
    sito: {
      descrizione: sito.descrizione || "",
      copertina: sito.copertina || null,
      logoEsteso: sito.logoEsteso || null,
      favicon: sito.favicon || null,
      fotoChiSiamo: sito.fotoChiSiamo || null,
      titoloHome: sito.titoloHome || "",
      legale: (() => { const l = sito.legale || {}; return { ragioneSociale: l.ragioneSociale || "", piva: l.piva || "", codiceFiscale: l.codiceFiscale || "", sede: l.sede || "", emailPrivacy: l.emailPrivacy || "", pec: l.pec || "", rea: l.rea || "" }; })(),
      orari: sito.orari || "",
      instagram: sito.instagram || "",
      facebook: sito.facebook || "",
      sitoWeb: sito.sitoWeb || "",
      sezioni: Array.isArray(sito.sezioni) ? sito.sezioni.filter((s) => s && (s.titolo || s.testo)).map((s) => ({ titolo: s.titolo || "", testo: s.testo || "" })) : [],
    },
    eventi: eventiPub,
    catalogo: await (async () => {
      if (sito.mostraCatalogo !== true) return null;
      const cat = (await getCollezione(env, aid, "catalog")) || {};
      const categorie = Array.isArray(cat.categories) ? cat.categories.map((c) => ({ id: c.id, name: c.name })) : [];
      const prodotti = Array.isArray(cat.products) ? cat.products.map((p) => ({
        // Sul sito va SOLO la descrizione pensata per i clienti (mai quella interna).
        id: p.id, name: p.name || "", description: p.descrizioneSito || "", foto: p.foto || null, categoryId: p.categoryId || null,
        formats: Array.isArray(p.formats) ? p.formats.map((f) => ({ label: f.label || "", price: f.price != null ? f.price : null, disponibile: (Number(f.stock) || 0) > 0 })) : [],
      })).filter((p) => p.name) : [];
      return { categorie, prodotti };
    })(),
  };
}

// ---- /api/prenota/:aid  (PUBBLICA: prenotazioni online dei clienti) ----
// `statoDi(az)` dice se la licenza del salone è attiva: sul portale è la
// scadenza della riga, su un'installazione cliente è ciò che dice Lucentia.
export async function prenota(ctx, segs, statoDi) {
  const { request, env } = ctx;
  const method = request.method;
  const url = new URL(request.url);
  const aid = segs[1];
  const az = await getAzienda(env, aid);
  if (!az || (await statoDi(az)) !== "active" || !parseModuli(az.moduli).includes("online")) return json({ error: "Prenotazioni online non disponibili." }, 404);
  const config = (await getCollezione(env, aid, "config")) || {};
  const booking = config.onlineBooking || {};
  if (booking.paused) return json({ error: "Le prenotazioni online sono momentaneamente sospese." }, 403);
  const leadMin = Math.max(0, Number(booking.leadHours != null ? booking.leadHours * 60 : 120));
  const mode = booking.mode === "griglia" ? "griglia" : booking.mode === "ottimizzata" ? "ottimizzata" : "antivuoto";
  const { services, abilitatiDi } = serviziPrenotabili(config);

  // info attività + servizi prenotabili + contenuti del mini-sito
  if (segs[2] == null && method === "GET") {
    return json(await payloadPubblico(env, aid, az, config, services, abilitatiDi));
  }

  // slot disponibili per data + servizio (+ operatore opzionale)
  if (segs[2] === "slots" && method === "GET") {
    const date = url.searchParams.get("date") || "";
    const serviceId = url.searchParams.get("service") || "";
    const staffSel = url.searchParams.get("staff") || "";
    const exclude = url.searchParams.get("exclude") || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !serviceId) return json({ slots: [] });
    const bookings = (await getCollezione(env, aid, "bookings")) || [];
    const online = (await onlineBookingsOf(env, aid, date)).filter((b) => b.id !== exclude);
    const impegniEventi = eventiComeImpegni(await getCollezione(env, aid, "eventi"), date);
    const slots = computeStarts(config, [...(Array.isArray(bookings) ? bookings : []), ...online, ...impegniEventi], date, serviceId, leadMin, mode, staffSel || undefined, { servizionline: services });
    return json({ slots: slots.map((s) => ({ start: s.start, label: `${pad2(Math.floor(s.start / 60))}:${pad2(s.start % 60)}` })) });
  }

  // crea prenotazione
  if (segs[2] == null && method === "POST") {
    const body = await request.json().catch(() => ({}));
    const date = String(body.date || "");
    const serviceId = String(body.service || "");
    const start = Number(body.start);
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const note = String(body.note || "").trim().slice(0, 500);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !serviceId || !Number.isFinite(start) || !name || phone.replace(/\D/g, "").length < 6) {
      return json({ error: "Compila nome, telefono e scegli un orario valido." }, 400);
    }
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return json({ error: "Servizio non valido." }, 400);
    // Niente prenotazione senza il consenso al trattamento dei dati.
    if (!body.privacy) return json({ error: "Per prenotare devi accettare l'informativa sulla privacy." }, 400);
    const staffSel = String(body.staff || "");
    const bookings = (await getCollezione(env, aid, "bookings")) || [];
    const online = await onlineBookingsOf(env, aid, date);
    const slots = computeStarts(config, [...(Array.isArray(bookings) ? bookings : []), ...online], date, serviceId, leadMin, mode, staffSel || undefined, { servizionline: services, confirm: true });
    const slot = slots.find((s) => s.start === start);
    if (!slot) return json({ error: "Questo orario non è più disponibile. Scegline un altro." }, 409);
    const end = start + durataServizio(svc);

    // associazione cliente: per telefono (normalizzato) sui clienti del salone
    const clients = (await getCollezione(env, aid, "clients")) || [];
    const norm = (p) => String(p || "").replace(/\D/g, "");
    const existing = (Array.isArray(clients) ? clients : []).find((c) => norm(c.phone) && norm(c.phone) === norm(phone));
    let clientCode = existing ? existing.code : null;
    if (!existing) {
      const codes = (Array.isArray(clients) ? clients : []).map((c) => parseInt(c.code, 10)).filter((n) => !isNaN(n));
      clientCode = String((codes.length ? Math.max(...codes) : 10000) + 1);
      const parts = name.split(/\s+/);
      const newClient = { code: clientCode, name, firstName: parts[0] || "", lastName: parts.slice(1).join(" "), phone, email, fromOnline: true, createdAt: Date.now() };
      const updated = [...(Array.isArray(clients) ? clients : []), newClient];
      await env.DB.prepare("INSERT INTO dati_app (id, azienda_id, collezione, dati, aggiornato_il) VALUES (?, ?, 'clients', ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET dati = excluded.dati, aggiornato_il = datetime('now')").bind(aid + ":clients", aid, JSON.stringify(updated)).run();
    }

    const id = crypto.randomUUID();
    await senzaColonnaImpegni(
      () => env.DB.prepare("INSERT INTO prenotazioni_online (id, azienda_id, data, start_min, end_min, service_id, staff_id, client_code, client_name, client_phone, client_email, note, stato, impegni) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'attiva', ?)")
        .bind(id, aid, date, start, end, serviceId, slot.staffId || null, clientCode, name, phone, email, note, JSON.stringify(slot.impegni || [])).run(),
      () => env.DB.prepare("INSERT INTO prenotazioni_online (id, azienda_id, data, start_min, end_min, service_id, staff_id, client_code, client_name, client_phone, client_email, note, stato) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'attiva')")
        .bind(id, aid, date, start, end, serviceId, slot.staffId || null, clientCode, name, phone, email, note).run());
    return json({ ok: true, conferma: { date, start, end, label: `${pad2(Math.floor(start / 60))}:${pad2(start % 60)}`, service: svc.name, salone: az.denominazione } });
  }

  // "Le mie prenotazioni": ricerca per numero di telefono (gestione self-service)
  const lbl = (m) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
  const svcName = (sid) => { const s = (config.services || []).find((x) => x.id === sid); return s ? s.name : "Servizio"; };
  const stName = (sid) => { const s = (config.staff || []).find((x) => x.id === sid); return s ? s.name : ""; };
  const normP = (p) => String(p || "").replace(/\D/g, "");
  if (segs[2] === "mie" && method === "GET") {
    const phone = normP(url.searchParams.get("phone"));
    if (phone.length < 6) return json({ items: [] });
    const res = await env.DB.prepare("SELECT * FROM prenotazioni_online WHERE azienda_id = ? AND stato = 'attiva' AND data >= ? ORDER BY data, start_min").bind(aid, todayISO()).all();
    const items = (res.results || []).filter((r) => normP(r.client_phone) === phone).map((r) => ({ id: r.id, date: r.data, startMin: r.start_min, endMin: r.end_min, label: lbl(r.start_min), serviceId: r.service_id, serviceName: svcName(r.service_id), staffId: r.staff_id, staffName: stName(r.staff_id) }));
    return json({ items });
  }
  if (segs[2] === "annulla" && method === "POST") {
    const body = await request.json().catch(() => ({}));
    const phone = normP(body.phone);
    const row = await env.DB.prepare("SELECT * FROM prenotazioni_online WHERE id = ? AND azienda_id = ?").bind(String(body.id || ""), aid).first();
    if (!row || row.stato !== "attiva" || normP(row.client_phone) !== phone) return json({ error: "Prenotazione non trovata." }, 404);
    await env.DB.prepare("UPDATE prenotazioni_online SET stato = 'annullata' WHERE id = ?").bind(row.id).run();
    return json({ ok: true });
  }
  if (segs[2] === "sposta" && method === "POST") {
    const body = await request.json().catch(() => ({}));
    const phone = normP(body.phone);
    const ndate = String(body.date || "");
    const nstart = Number(body.start);
    const row = await env.DB.prepare("SELECT * FROM prenotazioni_online WHERE id = ? AND azienda_id = ?").bind(String(body.id || ""), aid).first();
    if (!row || row.stato !== "attiva" || normP(row.client_phone) !== phone) return json({ error: "Prenotazione non trovata." }, 404);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ndate) || !Number.isFinite(nstart)) return json({ error: "Orario non valido." }, 400);
    const svc = (config.services || []).find((s) => s.id === row.service_id);
    const dur = svc ? (durataServizio(svc) || (row.end_min - row.start_min)) : (row.end_min - row.start_min);
    const bookings = (await getCollezione(env, aid, "bookings")) || [];
    const online = (await onlineBookingsOf(env, aid, ndate)).filter((b) => b.id !== row.id);
    const impegniEventi = eventiComeImpegni(await getCollezione(env, aid, "eventi"), ndate);
    const slots = computeStarts(config, [...(Array.isArray(bookings) ? bookings : []), ...online, ...impegniEventi], ndate, row.service_id, leadMin, mode, row.staff_id || undefined, { servizionline: services, confirm: true });
    const nuovo = slots.find((s) => s.start === nstart);
    if (!nuovo) return json({ error: "Questo orario non è più disponibile. Scegline un altro." }, 409);
    // Spostando l'appuntamento cambiano anche le risorse impegnate.
    await senzaColonnaImpegni(
      () => env.DB.prepare("UPDATE prenotazioni_online SET data = ?, start_min = ?, end_min = ?, staff_id = ?, impegni = ? WHERE id = ?")
        .bind(ndate, nstart, nstart + dur, nuovo.staffId || null, JSON.stringify(nuovo.impegni || []), row.id).run(),
      () => env.DB.prepare("UPDATE prenotazioni_online SET data = ?, start_min = ?, end_min = ?, staff_id = ? WHERE id = ?")
        .bind(ndate, nstart, nstart + dur, nuovo.staffId || null, row.id).run());
    return json({ ok: true, conferma: { date: ndate, start: nstart, label: lbl(nstart), service: svcName(row.service_id), salone: az.denominazione } });
  }

  return json({ error: "metodo non consentito" }, 405);
}

// ---- /api/evento/:aid/:eid (PUBBLICA: pagina evento condivisa via link) ----
export async function evento(ctx, segs, statoDi) {
  const { env } = ctx;
  const az = await getAzienda(env, segs[1]);
  if (!az || (await statoDi(az)) !== "active") return json({ error: "Evento non disponibile." }, 404);
  const eventi = (await getCollezione(env, segs[1], "eventi")) || [];
  const ev = (Array.isArray(eventi) ? eventi : []).find((e) => e && e.id === segs[2] && !e.cancellato);
  if (!ev) return json({ error: "Evento non trovato." }, 404);
  const config = (await getCollezione(env, segs[1], "config")) || {};
  const staffPub = (ev.staffIds || []).map((sid) => { const st = (config.staff || []).find((s) => s.id === sid); return st ? { name: st.name, role: st.role || "", avatar: st.avatar || null, photo: st.photo || null } : null; }).filter(Boolean);
  const ospitiPub = Array.isArray(ev.ospiti) ? ev.ospiti.filter((o) => o && o.nome).map((o) => ({ nome: o.nome, ruolo: o.ruolo || "", foto: o.foto || null })) : [];
  return json({
    ok: true,
    evento: { id: ev.id, titolo: ev.titolo || "Evento", descrizione: ev.descrizione || "", copertina: ev.copertina || null, date: ev.date, startMin: ev.startMin, endMin: ev.endMin, dettagli: Array.isArray(ev.dettagli) ? ev.dettagli.filter((d) => d && (d.label || d.testo)) : [], staff: staffPub, ospiti: ospitiPub },
    salone: brandPubblico(az, config),
  });
}

(function () {
'use strict';

/* =========================================================
   Utilidades
   ========================================================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 86400000;
const pad = n => String(n).padStart(2, '0');
const newId = p => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
const clone = o => o == null ? o : JSON.parse(JSON.stringify(o));
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function toEd(s) { const [y, m, d] = String(s).split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY); }
function fromEd(e) { const d = new Date(e * DAY); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
const todayEd = () => toEd(todayStr());
function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && isFinite(toEd(s)); }

const G = { useGrouping: 'always' };
const NF = new Intl.NumberFormat('es-ES', Object.assign({ style: 'currency', currency: 'EUR' }, G));
const NF0 = new Intl.NumberFormat('es-ES', Object.assign({ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }, G));
const NQ = new Intl.NumberFormat('es-ES', Object.assign({ maximumFractionDigits: 6 }, G));
const NP = new Intl.NumberFormat('es-ES', Object.assign({ minimumFractionDigits: 2, maximumFractionDigits: 2 }, G));
const NC = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 });
const DF = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const DFs = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const MYF = new Intl.DateTimeFormat('es-ES', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const MINUS = '−';
const okNum = v => v != null && isFinite(v);
function eur(v) { return okNum(v) ? NF.format(v).replace('-', MINUS) : '-'; }
function eur0(v) { return okNum(v) ? NF0.format(v).replace('-', MINUS) : '-'; }
// valor tal cual o guion si está vacío (para campos externos, p.ej. Trading 212)
function f(v) { return (v == null || v === '') ? '—' : v; }
// importe en euros si es número, o tal cual si viene como texto
function money(v) { return okNum(v) ? eur(v) : f(v); }
function seur(v) { return okNum(v) ? (v >= 0 ? '+' : MINUS) + NF.format(Math.abs(v)) : '-'; }
function pct(v) { return okNum(v) ? (v >= 0 ? '+' : MINUS) + NP.format(Math.abs(v * 100)) + ' %' : '-'; }
function qtyf(q) { return okNum(q) ? NQ.format(q) : '-'; }
function pxf(v) {
  if (!okNum(v)) return '-';
  const d = Math.abs(v) < 1 ? 4 : 2;
  return new Intl.NumberFormat('es-ES', Object.assign({ style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d }, G)).format(v);
}
function compactEur(v) { return NC.format(v) + ' €'; }
function datef(s) { return validDate(s) ? DF.format(new Date(toEd(s) * DAY)) : '-'; }
function datefs(s) { return validDate(s) ? DFs.format(new Date(toEd(s) * DAY)) : '-'; }
function cls(v) { return v > 0.000001 ? 'up' : v < -0.000001 ? 'down' : 'muted'; }
function parseNum(s) {
  if (typeof s === 'number') return s;
  s = String(s == null ? '' : s).trim().replace(/\s|€|%/g, '');
  if (!s) return NaN;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (s.includes(',')) s = s.replace(',', '.');
  return Number(s);
}
function round(v, d) { const f = Math.pow(10, d); return Math.round(v * f) / f; }
function sig(v) { if (!okNum(v)) return v; const a = Math.abs(v); return round(v, a >= 1000 ? 2 : a >= 1 ? 4 : 8); }
function numIn(v, d = 2) { return okNum(v) ? String(round(v, d)).replace('.', ',') : ''; }
function ago(ts) {
  if (!ts) return '';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'ahora mismo';
  if (m < 60) return 'hace ' + m + ' min';
  const h = Math.round(m / 60);
  if (h < 24) return 'hace ' + h + ' h';
  const d = Math.round(h / 24);
  return d === 1 ? 'hace 1 día' : 'hace ' + d + ' días';
}
function lastLE(arr, x) { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= x) { r = m; lo = m + 1; } else hi = m - 1; } return r; }
function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* almacenamiento no disponible */ } }
const RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
/* Móvil o tableta (por dispositivo, no por ancho de ventana): ahí no se puede conectar Trade Republic, que necesita el servidor local del PC. */
const isMobileDevice = () => /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent || '') || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform || '')) || (window.matchMedia ? window.matchMedia('(pointer:coarse)').matches && window.matchMedia('(hover:none)').matches : false);
const isDesk = () => window.matchMedia ? window.matchMedia('(min-width:760px)').matches : true;

/* Spinner con el logo de Nido (las órbitas giran alrededor del punto). */
const nidoSpin = () => '<span class="nspin" role="status" aria-label="Cargando"><svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="9" ry="6.5" transform="rotate(-20 12 12)"/><ellipse cx="12" cy="12" rx="7" ry="5" transform="rotate(25 12 12)" opacity=".7"/><circle class="dot" cx="12" cy="12" r="2"/></svg></span>';
const svgI = d => '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
const IC = {
  close: svgI('<path d="M6 6l12 12M18 6L6 18"/>'),
  back: svgI('<path d="M15 5l-7 7 7 7"/>'),
  plus: svgI('<path d="M12 5v14M5 12h14"/>'),
  edit: svgI('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  trash: svgI('<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>'),
  ext: svgI('<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>')
};

/* =========================================================
   Catálogo y tipos
   ========================================================= */
const TYPES = {
  stock: { l: 'Acción', p: 'Acciones', k: '--k-stock' },
  etf: { l: 'ETF', p: 'ETFs', k: '--k-etf' },
  fund: { l: 'Fondo', p: 'Fondos', k: '--k-fund' },
  crypto: { l: 'Cripto', p: 'Cripto', k: '--k-crypto' },
  other: { l: 'Otro', p: 'Otros', k: '--k-other' }
};
const TYPE_ORDER = ['stock', 'etf', 'fund', 'crypto', 'other'];
const typeOf = a => TYPES[a && a.type] ? a.type : 'other';
const C = (symbol, name, type, currency, isin, exch) => ({ symbol, name, type, currency, isin, exch });
const CATALOG = [
  C('IWDA.AS', 'iShares Core MSCI World UCITS ETF (Acc)', 'etf', 'EUR', 'IE00B4L5Y983', 'Ámsterdam'),
  C('EUNL.DE', 'iShares Core MSCI World UCITS ETF (Acc)', 'etf', 'EUR', 'IE00B4L5Y983', 'Xetra'),
  C('VWCE.DE', 'Vanguard FTSE All-World UCITS ETF (Acc)', 'etf', 'EUR', 'IE00BK5BQT80', 'Xetra'),
  C('SXR8.DE', 'iShares Core S&P 500 UCITS ETF (Acc)', 'etf', 'EUR', 'IE00B5BMR087', 'Xetra'),
  C('VUSA.AS', 'Vanguard S&P 500 UCITS ETF (Dist)', 'etf', 'EUR', 'IE00B3XXRP09', 'Ámsterdam'),
  C('EMIM.AS', 'iShares Core MSCI EM IMI UCITS ETF (Acc)', 'etf', 'EUR', 'IE00BKM4GZ66', 'Ámsterdam'),
  C('0P00000WLG.F', 'Vanguard Global Stock Index Fund EUR Acc', 'fund', 'EUR', 'IE00B03HD191', 'Fondo'),
  C('', 'Fidelity MSCI World Index Fund P-ACC-EUR', 'fund', 'EUR', 'IE00BYX5NX33', 'Fondo'),
  C('', 'Vanguard U.S. 500 Stock Index Fund EUR Acc', 'fund', 'EUR', 'IE0032126645', 'Fondo'),
  C('', 'Vanguard Emerging Markets Stock Index Fund EUR Acc', 'fund', 'EUR', 'IE0031786696', 'Fondo'),
  C('', 'Amundi Index MSCI World AE-C', 'fund', 'EUR', 'LU0996182563', 'Fondo'),
  C('', 'iShares Developed World Index Fund (IE) D Acc EUR', 'fund', 'EUR', 'IE00BD0NCM55', 'Fondo'),
  C('AAPL', 'Apple', 'stock', 'USD', '', 'NASDAQ'),
  C('MSFT', 'Microsoft', 'stock', 'USD', '', 'NASDAQ'),
  C('NVDA', 'NVIDIA', 'stock', 'USD', '', 'NASDAQ'),
  C('AMZN', 'Amazon', 'stock', 'USD', '', 'NASDAQ'),
  C('GOOGL', 'Alphabet (clase A)', 'stock', 'USD', '', 'NASDAQ'),
  C('META', 'Meta Platforms', 'stock', 'USD', '', 'NASDAQ'),
  C('TSLA', 'Tesla', 'stock', 'USD', '', 'NASDAQ'),
  C('SAN.MC', 'Banco Santander', 'stock', 'EUR', '', 'Madrid'),
  C('BBVA.MC', 'BBVA', 'stock', 'EUR', '', 'Madrid'),
  C('ITX.MC', 'Inditex', 'stock', 'EUR', '', 'Madrid'),
  C('IBE.MC', 'Iberdrola', 'stock', 'EUR', '', 'Madrid'),
  C('TEF.MC', 'Telefónica', 'stock', 'EUR', '', 'Madrid'),
  C('REP.MC', 'Repsol', 'stock', 'EUR', '', 'Madrid'),
  C('BTC-EUR', 'Bitcoin', 'crypto', 'EUR', '', 'Cripto'),
  C('ETH-EUR', 'Ethereum', 'crypto', 'EUR', '', 'Cripto'),
  C('SOL-EUR', 'Solana', 'crypto', 'EUR', '', 'Cripto'),
  C('XRP-EUR', 'XRP', 'crypto', 'EUR', '', 'Cripto'),
  C('ADA-EUR', 'Cardano', 'crypto', 'EUR', '', 'Cripto')
];

/* =========================================================
   Almacén: los datos viven en este dispositivo (localStorage)
   ========================================================= */
const S = {
  mode: 'loading', docs: new Map(), demo: false, demoDocs: new Map(), diag: []
};
const LS_LOCAL = 'cartera.local.v1', LS_UI = 'cartera.ui.v1';
const D = () => (S.demo ? S.demoDocs : S.docs);
const all = kind => Array.from(D().values()).filter(d => d && d.kind === kind);
function settings() { return D().get('settings') || { id: 'settings', kind: 'settings', fx: {}, fxHist: {} }; }
function diag(msg) { S.diag.push(new Date().toLocaleTimeString('es-ES') + '  ' + msg); if (S.diag.length > 60) S.diag.shift(); }

function loadInto(map, docs) { map.clear(); for (const d of docs || []) if (d && d.id && d.kind) map.set(d.id, d); }

function initStore() { startLocal(); }
function startLocal() {
  if (S.mode === 'local') return;
  const saved = lsGet(LS_LOCAL);
  loadInto(S.docs, saved && saved.docs);
  S.mode = 'local';
  runPlans();
  scheduleRender();
}
function put(doc, quiet) {
  doc.updatedAt = Date.now();
  D().set(doc.id, doc);
  persist(doc.id);
  if (!quiet) { scheduleRender(); }
}
function remove(id) { D().delete(id); persist(id); scheduleRender(); }
function persist() {
  if (S.demo) return;
  lsSet(LS_LOCAL, { docs: Array.from(S.docs.values()) });
}
function setSync() {
  const el = $('#sync'); if (!el) return;
  let t = '', err = false;
  if (S.demo) t = 'Ejemplo';
  else if (S.mode === 'local') t = 'En este dispositivo';
  el.textContent = t; el.classList.toggle('err', err);
}

/* =========================================================
   Cálculos
   ========================================================= */
function curOf(a) { return a.currency === 'GBp' ? 'GBP' : (a.currency || 'EUR'); }
function mulOf(a) { return a.currency === 'GBp' ? 0.01 : 1; }
function fxNow(cur) { if (cur === 'EUR') return 1; const f = (settings().fx || {})[cur]; return f > 0 ? f : null; }
function fxOn(cur, e) {
  if (cur === 'EUR') return 1;
  const h = (settings().fxHist || {})[cur];
  if (h && h.t && h.t.length) { const i = lastLE(h.t, e); if (i >= 0) return h.c[i]; }
  return fxNow(cur);
}
function unitFx(a, e) { const f = e == null ? fxNow(curOf(a)) : fxOn(curOf(a), e); return mulOf(a) * (f || 1); }
function priceEUR(a) { return a.price > 0 ? a.price * unitFx(a) : null; }
function prevEUR(a) { return a.prev > 0 ? a.prev * unitFx(a) : null; }

function txsOf(a) {
  const seen = new Set();
  return (a.txs || []).filter(t => t && validDate(t.date) && !seen.has(t.id) && seen.add(t.id))
    .sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : (x.side === 'buy' ? -1 : 1));
}
function applyTx(st, t) {
  const noPrice = t.pending || !(t.price > 0) || !(t.qty > 0);
  if (noPrice) { if (t.side !== 'sell') { st.pend += +t.amount || 0; st.pendN++; } return; }
  const fees = +t.fees || 0;
  if (t.side === 'sell') {
    const avg = st.qty > 0 ? st.cost / st.qty : 0;
    const q = Math.min(t.qty, st.qty);
    st.cost -= avg * q; st.realized += q * t.price - fees - avg * q; st.qty -= q;
    if (st.qty < 1e-10) { st.qty = 0; st.cost = 0; }
  } else { st.qty += t.qty; st.cost += t.qty * t.price + fees; }
  if (t.est) st.estN++;
}
function calcPos(a, skipTxId) {
  const st = { qty: 0, cost: 0, realized: 0, pend: 0, pendN: 0, estN: 0 };
  for (const t of txsOf(a)) if (t.id !== skipTxId) applyTx(st, t);
  const px = priceEUR(a), pv = prevEUR(a);
  const value = (px != null ? st.qty * px : st.cost) + st.pend;
  const cost = st.cost + st.pend;
  const pnl = value - cost;
  return {
    qty: st.qty, cost, avg: st.qty > 0 ? st.cost / st.qty : 0, price: px, value, pnl, pnlPct: cost > 0 ? pnl / cost : 0,
    realized: st.realized, day: (px != null && pv != null) ? st.qty * (px - pv) : 0, pendN: st.pendN, estN: st.estN
  };
}
function dedupeSort(arr) {
  const seen = new Set();
  return (arr || []).filter(m => m && validDate(m.date) && !seen.has(m.id) && seen.add(m.id)).sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : 0);
}
function cashCalc(c, endE) {
  if (endE == null) endE = todayEd();
  const moves = dedupeSort(c.moves);
  const rates = (c.rates || []).filter(r => validDate(r.from)).map(r => ({ e: toEd(r.from), apy: +r.apy || 0 })).sort((a, b) => a.e - b.e);
  let apyNow = rates.length ? rates[0].apy : 0;
  for (const r of rates) if (r.e <= endE) apyNow = r.apy;
  if (!moves.length) return { bal: 0, principal: 0, interest: 0, start: endE, ser: null, pser: null, apy: apyNow };
  const start = Math.min(toEd(moves[0].date), endE);
  const by = new Map();
  for (const m of moves) { const e = toEd(m.date); by.set(e, (by.get(e) || 0) + (+m.amount || 0)); }
  const n = endE - start + 1;
  const ser = new Float64Array(n), pser = new Float64Array(n);
  let b = 0, p = 0, ri = -1;
  for (let i = 0; i < n; i++) {
    const d = start + i;
    while (ri + 1 < rates.length && rates[ri + 1].e <= d) ri++;
    const apy = ri >= 0 ? rates[ri].apy : (rates.length ? rates[0].apy : 0);
    if (i > 0 && b > 0 && apy) b *= Math.pow(1 + apy / 100, 1 / 365);
    const mv = by.get(d) || 0;
    b += mv; p += mv;
    ser[i] = b; pser[i] = p;
  }
  return { bal: b, principal: p, interest: b - p, start, ser, pser, apy: apyNow };
}
let MEMO = null;
const TR_APY = 2; // interés anual (%) que se supone al saldo de Trade Republic para estimar el próximo mes
function trInterestTotal() { return S.demo ? 0 : (TR.interest || []).reduce((s, x) => s + (+x.amount || 0), 0); }
/* Convierte un activo virtual de broker en una entrada "pos" equivalente a las
   que produce calcPos(), para que el modelo y las vistas lo traten igual. */
function brokerPos(a) {
  const qty = a.vQty || 0;
  const value = a.vValue != null ? a.vValue : (okNum(a.price) ? qty * a.price : 0);
  const cost = a.vCost != null ? a.vCost : value;
  const pnl = a.vPpl != null ? a.vPpl : value - cost;
  // Cambio de hoy: último cierre frente al anterior del histórico de mercado (el broker no lo da).
  let day = 0, dayPct = null;
  const h = a.hist;
  if (h && h.c && h.c.length >= 2 && qty > 0) {
    const l = h.c[h.c.length - 1], pv = h.c[h.c.length - 2];
    if (l > 0 && pv > 0) { dayPct = l / pv - 1; day = value - value / (1 + dayPct); }
  }
  return { a, qty, cost, avg: qty > 0 ? cost / qty : 0, price: a.price, value, pnl, pnlPct: cost > 0 ? pnl / cost : 0, realized: 0, day, pendN: 0, estN: 0, broker: true, dayPct };
}
/* Cuentas que tienen datos (para el selector del resumen) y la que está activa. */
function srcList() {
  const l = [];
  if (!S.demo) {
    if ((TR.positions && TR.positions.length) || (TR.cash || []).some(c => +c.amount > 0)) l.push('tr');
    if ((T.positions && T.positions.length) || (T.account && T.account.cash)) l.push('t212');
  }
  if (all('asset').length || all('cash').length) l.push('manual');
  return l;
}
const SRC_LABEL = { all: 'Todo', tr: 'Trade Republic', t212: 'Trading 212', manual: 'Manual' };
function srcEff() { const l = srcList(); return l.length > 1 && l.includes(UI.src) ? UI.src : 'all'; }
let MEMO_SRC = null;
/* model(): toda la cartera. model('tr' | 't212' | 'manual'): solo esa cuenta (memoizado sobre el modelo completo). */
function model(src) {
  if (src && src !== 'all') {
    const base = model();
    if (MEMO_SRC && MEMO_SRC.base === base && MEMO_SRC.src === src) return MEMO_SRC.m;
    const m = buildModel(src);
    MEMO_SRC = { base, src, m };
    return m;
  }
  if (!MEMO) MEMO = buildModel('all');
  return MEMO;
}
function buildModel(src) {
  const inS = k => src === 'all' || src === k;
  const assets = inS('manual') ? all('asset') : [], accounts = inS('manual') ? all('cash') : [], plans = all('plan');
  const pos = assets.map(a => Object.assign({ a }, calcPos(a), { dayPct: (a.price > 0 && a.prev > 0) ? a.price / a.prev - 1 : null }));
  // Posiciones de brokers (solo lectura) mezcladas en el mismo listado.
  if (inS('t212')) for (const a of t212Assets()) pos.push(brokerPos(a));
  if (inS('tr')) for (const a of trAssets()) pos.push(brokerPos(a));
  let invValue = 0, invCost = 0, invDay = 0, realized = 0, pendN = 0, estN = 0;
  const missing = new Set();
  for (const p of pos) {
    invValue += p.value; invCost += p.cost; invDay += p.day; realized += p.realized; pendN += p.pendN; estN += p.estN;
    // Las posiciones de broker vienen valoradas en EUR por el propio broker:
    // no pedir conversión de divisa (eso causaba el aviso "Falta el tipo de cambio USD").
    if (!p.broker && p.qty > 0 && curOf(p.a) !== 'EUR' && !fxNow(curOf(p.a))) missing.add(curOf(p.a));
  }
  const cash = accounts.map(c => Object.assign({ c }, cashCalc(c)));
  let cashTotal = 0, interest = 0, monthInt = 0, yearInt = 0;
  for (const r of cash) {
    cashTotal += r.bal; interest += r.interest;
    if (r.bal > 0) { monthInt += r.bal * (Math.pow(1 + r.apy / 100, 30 / 365) - 1); yearInt += r.bal * r.apy / 100; }
  }
  // Liquidez de los brokers (efectivo de Trading 212 y Trade Republic).
  let t212Cash = 0, trCash = 0;
  if (!S.demo) {
    const tc = inS('t212') && T.account && T.account.cash;
    if (tc) t212Cash = (+tc.availableToTrade || 0) + (+tc.inPies || 0) + (+tc.reservedForOrders || 0);
    if (inS('tr')) trCash = (TR.cash || []).reduce((s, c) => s + (+c.amount || 0), 0);
  }
  cashTotal += t212Cash + trCash;
  // Intereses del saldo de Trade Republic: los cobrados (de su historial) y una estimación del próximo mes.
  const trInt = inS('tr') ? trInterestTotal() : 0;
  interest += trInt;
  if (trCash > 0) { monthInt += trCash * (Math.pow(1 + TR_APY / 100, 30 / 365) - 1); yearInt += trCash * TR_APY / 100; }
  const alloc = TYPE_ORDER.map(k => ({ k: TYPES[k].k, l: TYPES[k].p, v: pos.filter(p => typeOf(p.a) === k && !p.broker).reduce((s, p) => s + p.value, 0) }));
  alloc.push({ k: '--k-t212', l: 'Trading 212', v: pos.filter(p => p.broker && p.a.source === 't212').reduce((s, p) => s + p.value, 0) });
  alloc.push({ k: '--k-tr', l: 'Trade Republic', v: pos.filter(p => p.broker && p.a.source === 'tr').reduce((s, p) => s + p.value, 0) });
  alloc.push({ k: '--k-cash', l: 'Liquidez', v: cashTotal });
  const invPnl = invValue - invCost;
  const hasDay = pos.some(p => p.qty > 0 && (p.broker ? p.dayPct != null : p.a.prev > 0));
  return {
    assets, accounts, plans, pos, cash, invValue, invCost, invPnl, invPct: invCost > 0 ? invPnl / invCost : 0,
    invDay, invDayPct: (invValue - invDay) > 0 ? invDay / (invValue - invDay) : 0, hasDay, realized, pendN, estN,
    missingFx: Array.from(missing), cashTotal, interest, monthInt, yearInt, net: invValue + cashTotal,
    t212Cash, trCash, brokerCash: t212Cash + trCash,
    totalGain: invPnl + realized + interest, alloc, any: !!(assets.length || accounts.length || plans.length || pos.length)
  };
}
function history(R, src) {
  src = src || srcEff();
  const inS = k => src === 'all' || src === k;
  const end = todayEd();
  const assets = inS('manual') ? all('asset') : [], accounts = inS('manual') ? all('cash') : [];
  let first = end;
  for (const a of assets) for (const t of a.txs || []) if (validDate(t.date)) first = Math.min(first, toEd(t.date));
  const cc = accounts.map(c => cashCalc(c));
  for (const r of cc) if (r.ser) first = Math.min(first, r.start);
  const brok = inS('tr') ? trAssets() : [], brok212 = inS('t212') ? t212Assets() : [];
  for (const a of brok) if (a.hist && a.hist.t && a.hist.t.length) first = Math.min(first, a.hist.t[0]);
  for (const a of brok212) if (a.since != null && a.vCost > 0) first = Math.min(first, a.since);
  // R: días hacia atrás; 0 = lo que va de año; -1 = todo el histórico
  const span = R === -1 ? Infinity : (R === 0 ? end - toEd(new Date(end * DAY).getUTCFullYear() + '-01-01') : R);
  const start = Math.max(end - span, first);
  const n = end - start + 1;
  if (n < 2) return null;
  const val = new Float64Array(n), con = new Float64Array(n);
  for (const a of assets) {
    const txs = txsOf(a); if (!txs.length) continue;
    const h = a.hist && a.hist.t && a.hist.t.length ? a.hist : null;
    const st = { qty: 0, cost: 0, realized: 0, pend: 0, pendN: 0, estN: 0 };
    const cur = curOf(a), mul = mulOf(a);
    let ti = 0, hi = -1;
    for (let i = 0; i < n; i++) {
      const d = start + i;
      while (ti < txs.length && toEd(txs[ti].date) <= d) { applyTx(st, txs[ti]); ti++; }
      let px = null;
      if (i === n - 1 && a.price > 0) px = priceEUR(a);
      else if (h) { while (hi + 1 < h.t.length && h.t[hi + 1] <= d) hi++; if (hi >= 0) px = h.c[hi] * mul * (fxOn(cur, d) || 1); }
      val[i] += (px != null ? st.qty * px : st.cost) + st.pend;
      con[i] += st.cost + st.pend;
    }
  }
  for (const r of cc) {
    if (!r.ser) continue;
    for (let i = 0; i < n; i++) { const k = start + i - r.start; if (k >= 0 && k < r.ser.length) { val[i] += r.ser[k]; con[i] += r.pser[k]; } }
  }
  // Posiciones de Trade Republic: la curva usa sus velas de precio
  // (el último día se valora al precio actual del broker).
  for (const a of brok) {
    const qty = a.vQty || 0, cost = a.vCost || 0;
    if (!(qty > 0)) continue;
    const h = a.hist && a.hist.t && a.hist.t.length ? a.hist : null;
    if (!h) { if (cost > 0) for (let i = 0; i < n; i++) { val[i] += cost; con[i] += cost; } continue; }
    for (let i = 0; i < n; i++) {
      const d = start + i;
      const j = lastLE(h.t, d);
      if (j < 0) continue; // antes de la primera vela no aporta
      val[i] += (i === n - 1 && a.price > 0) ? qty * a.price : qty * h.c[j];
      con[i] += cost;
    }
  }
  // Trading 212 no publica histórico de precios: se estima con la fecha de apertura de cada posición
  // y el cierre diario de mercado (Yahoo, vía el servidor de brokers). Sin precios, se valora a coste.
  for (const a of brok212) {
    const cost = a.vCost || 0, qty = a.vQty || 0;
    if (!(cost > 0)) continue;
    const h = a.hist && a.hist.t && a.hist.t.length ? a.hist : null;
    for (let i = 0; i < n; i++) {
      const d = start + i;
      if (a.since != null && d < a.since) continue; // antes de abrir la posición no aporta
      let v = cost;
      if (h && qty > 0) {
        if (i === n - 1 && a.vValue > 0) v = a.vValue;
        else { const j = lastLE(h.t, d); v = j >= 0 ? qty * h.c[j] : cost; }
      }
      val[i] += v; con[i] += cost;
    }
  }
  // Efectivo de los brokers: sin histórico, se suma plano a Patrimonio y Aportado.
  const tc = (T.account && T.account.cash) || {};
  const brokCash = (inS('t212') ? (+tc.availableToTrade || 0) + (+tc.inPies || 0) + (+tc.reservedForOrders || 0) : 0) + (inS('tr') ? (TR.cash || []).reduce((s, c) => s + (Number(c.amount) || 0), 0) : 0);
  if (brokCash > 0) for (let i = 0; i < n; i++) { val[i] += brokCash; con[i] += brokCash; }
  return { start, n, val, con };
}

/* =========================================================
   Planes mensuales
   ========================================================= */
function planDates(plan, fromE, toE) {
  const out = [];
  if (!(toE >= fromE)) return out;
  const days = (plan.days || []).map(Number).filter(d => d >= 1 && d <= 31);
  if (!days.length) return out;
  const a = new Date(fromE * DAY), b = new Date(toE * DAY);
  let y = a.getUTCFullYear(), m = a.getUTCMonth() + 1;
  const yb = b.getUTCFullYear(), mb = b.getUTCMonth() + 1;
  const seen = new Set();
  while (y < yb || (y === yb && m <= mb)) {
    const ml = daysInMonth(y, m);
    for (const d of days) {
      const e = toEd(y + '-' + pad(m) + '-' + pad(Math.min(d, ml)));
      if (e >= fromE && e <= toE && !seen.has(e)) { seen.add(e); out.push(e); }
    }
    m++; if (m > 12) { m = 1; y++; }
  }
  return out.sort((p, q) => p - q);
}
function planStartEd(p) { let s = toEd(p.start); if (p.activeFrom && validDate(p.activeFrom)) s = Math.max(s, toEd(p.activeFrom)); return s; }
function planEndEd(p) { return p.end && validDate(p.end) ? toEd(p.end) : Infinity; }
function planList(p) { const t = D().get(p.targetId); if (!t) return []; return (p.target === 'cash' ? t.moves : t.txs) || []; }
function executions(p) {
  let n = 0, sum = 0;
  for (const x of planList(p)) if (x.plan === p.id) { n++; sum += +x.amount || 0; }
  return { n, sum };
}
function doneDates(p) {
  const set = new Set(p.skip || []);
  for (const x of planList(p)) if (x.plan === p.id) set.add(x.date);
  return set;
}
function nextRunEd(p) {
  const t = todayEd();
  const s = Math.max(t, planStartEd(p));
  const e = Math.min(s + 400, planEndEd(p));
  const done = doneDates(p);
  const hit = planDates(p, s, e).find(x => !done.has(fromEd(x)));
  return hit == null ? null : hit;
}
function priceOn(asset, ds) {
  const e = toEd(ds); const h = asset.hist;
  if (h && h.t && h.t.length) {
    const first = h.t[0], last = h.t[h.t.length - 1];
    if (e >= first && e <= last) { const i = lastLE(h.t, e); return { price: h.c[i] * unitFx(asset, e), exact: true, from: fromEd(h.t[i]) }; }
    if (e > last && asset.price > 0) return { price: priceEUR(asset), exact: false };
    return null;
  }
  if (asset.price > 0 && (!asset.symbol || e >= todayEd() - 3)) return { price: priceEUR(asset), exact: false };
  return null;
}
function setTxPrice(t, px) {
  t.price = sig(px);
  t.qty = sig(((+t.amount || 0) - (+t.fees || 0)) / px);
  delete t.pending; delete t.est;
}
function planTx(asset, plan, ds, id) {
  const tx = { id, side: 'buy', date: ds, amount: round(+plan.amount, 2), fees: round(+plan.fees || 0, 2), plan: plan.id, auto: true, note: 'Plan mensual' };
  const p = priceOn(asset, ds);
  if (p && p.price > 0) { setTxPrice(tx, p.price); if (!p.exact) tx.est = true; }
  else { tx.pending = true; tx.price = null; tx.qty = null; }
  return tx;
}
function refineTxs(a) {
  let n = 0;
  for (const t of a.txs || []) {
    if (!t.auto || !(t.pending || t.est)) continue;
    const p = priceOn(a, t.date);
    if (!p || !(p.price > 0)) continue;
    if (p.exact) { setTxPrice(t, p.price); n++; }
    else if (t.pending) { setTxPrice(t, p.price); t.est = true; n++; }
  }
  return n;
}
function runPlans(silent) {
  if (!(S.demo || S.mode === 'local')) return 0;
  const t = todayEd();
  const changed = new Map();
  let count = 0;
  for (const plan of all('plan')) {
    if (!plan.active || !validDate(plan.start) || !(+plan.amount > 0)) continue;
    const base = changed.get(plan.targetId) || D().get(plan.targetId);
    if (!base) continue;
    const s = planStartEd(plan), e = Math.min(t, planEndEd(plan));
    const dates = planDates(plan, s, e);
    if (!dates.length) continue;
    const key = plan.target === 'cash' ? 'moves' : 'txs';
    const skip = new Set(plan.skip || []);
    const have = new Set((base[key] || []).map(x => x.id));
    let tgt = base;
    for (const ed of dates) {
      const ds = fromEd(ed), id = 'pl_' + plan.id + '_' + ds;
      if (have.has(id) || skip.has(ds)) continue;
      if (tgt === base) tgt = clone(base);
      tgt[key] = tgt[key] || [];
      if (plan.target === 'cash') tgt.moves.push({ id, date: ds, amount: round(+plan.amount, 2), note: 'Plan mensual', plan: plan.id });
      else tgt.txs.push(planTx(tgt, plan, ds, id));
      have.add(id); count++;
    }
    if (tgt !== base) changed.set(tgt.id, tgt);
  }
  for (const d of changed.values()) put(d, true);
  if (count) {
    scheduleRender();
    if (!silent && !S.demo) toast(count === 1 ? 'Plan mensual: 1 aportación apuntada' : 'Planes mensuales: ' + count + ' aportaciones apuntadas');
  }
  return count;
}
function daysText(days) {
  const d = (days || []).map(Number).sort((a, b) => a - b);
  if (!d.length) return '-';
  const s = d.map(x => x >= 29 ? x + ' (o último)' : String(x));
  const list = s.length > 1 ? s.slice(0, -1).join(', ') + ' y ' + s[s.length - 1] : s[0];
  return (d.length === 1 ? 'Día ' : 'Días ') + list + ' de cada mes';
}
function upcoming(days) {
  const t = todayEd(); const out = [];
  for (const p of all('plan')) {
    if (!p.active) continue;
    const tgt = D().get(p.targetId); if (!tgt) continue;
    const s = Math.max(t, planStartEd(p)); const e = Math.min(t + days, planEndEd(p));
    const done = doneDates(p);
    for (const ed of planDates(p, s, e)) if (!done.has(fromEd(ed))) out.push({ ed, p, tgt });
  }
  return out.sort((a, b) => a.ed - b.ed);
}

/* =========================================================
   Brokers (solo lectura): Trading 212 y Trade Republic a través
   de tu servidor en Cloudflare. Trading 212 se guarda en local
   (localStorage) y se reutiliza sin conexión.
   ========================================================= */
const B = { proxy: '', cfgProxy: '', accessKey: '', checked: false };
const LS_PROXY = 'cartera.broker.v1';
const LS_T212 = 'cartera.t212.v1';
const LS_TR = 'cartera.tr.v1';
const brokersReady = () => !S.demo && !!B.proxy;

function cleanProxy(u) {
  u = String(u || '').trim().replace(/\/+$/, '');
  if (!u) return '';
  if (/^https:\/\/[^\s/]+/i.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(u)) return u;
  return '';
}
async function initBrokers() {
  let cfg = null;
  try { const r = await fetch('config.json', { cache: 'no-cache' }); if (r.ok) cfg = await r.json(); } catch (e) { /* sin config.json */ }
  B.cfgProxy = cleanProxy(cfg && cfg.brokerProxy);
  const own = lsGet(LS_PROXY);
  B.proxy = own && typeof own.url === 'string' ? cleanProxy(own.url) : B.cfgProxy;
  B.accessKey = own && typeof own.key === 'string' ? own.key : '';
  B.checked = true;
  if (!B.proxy) discardT212(); // sin URL guardada, los datos del broker se quedan fuera
  diag('brokers: ' + (B.proxy ? 'servidor ' + B.proxy.replace(/^https?:\/\//, '') : 'sin servidor configurado'));
  renderBrokers();
}

/* ---------- Conexión genérica al servidor de brokers ---------- */
async function brokerFetch(path, opts) {
  opts = opts || {};
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, 25000);
  let r, txt;
  try {
    const headers = (opts.init && opts.init.headers) ? Object.assign({}, opts.init.headers) : {};
    if (B.accessKey) headers['X-Access'] = B.accessKey;
    r = await fetch(B.proxy + path, Object.assign({ signal: ctrl ? ctrl.signal : undefined }, opts.init || {}, { headers }));
    txt = await r.text();
  } catch (e) {
    const er = new Error('sin respuesta'); er.code = 'broker_unreachable'; throw er;
  } finally { clearTimeout(timer); }
  let j = null;
  try { j = JSON.parse(txt); } catch (e) { /* no JSON */ }
  if (!r.ok) {
    const er = new Error((j && j.error) || 'error ' + r.status); er.code = (j && j.code) || 'broker_http'; er.status = r.status; throw er;
  }
  if (j && j.code) { const er = new Error(j.error); er.code = j.code; er.status = r.status; throw er; }
  return j;
}
function brokerErr(e) {
  const c = String(e && e.code || '');
  if (c === 'broker_unreachable') return 'El servidor de brokers no responde. Revisa la dirección en Ajustes o tu conexión.';
  if (c === 't212_unconfigured') return 'Trading 212 no está configurado. Revisa T212_KEY y T212_SECRET en Cloudflare.';
  if (c === 'access_denied') return 'Clave de acceso incorrecta. Revísala en Ajustes (Servidor de brokers).';
  if (e && e.status === 401) return 'Las credenciales no son válidas. Revisa la configuración en Cloudflare.';
  if (e && e.status === 429) return 'Demasiadas consultas. Prueba en un minuto.';
  return 'No pude leer el broker' + (e && e.message ? ': ' + e.message : '.');
}

/* ---------- Trading 212 ---------- */
const T = { state: 'idle', err: '', account: null, positions: null, at: null, nextRetry: 0 };
function t212CacheLoad() {
  const c = lsGet(LS_T212);
  if (c && c.account) { T.account = c.account; T.positions = c.positions || null; T.at = c.at || null; T.state = 'cached'; }
}
function t212CacheSave() {
  lsSet(LS_T212, { account: T.account, positions: T.positions, at: Date.now() });
}
async function loadT212(silent) {
  if (AR.t212) return;
  if (!brokersReady()) { T.err = 'Primero configura el servidor de brokers en Ajustes.'; T.state = 'err'; renderBrokers(); return; }
  if (T.nextRetry && Date.now() < T.nextRetry) return; // esperando tras un 429
  AR.t212 = true;
  if (!silent) { T.state = 'busy'; T.err = ''; renderBrokers(); }
  try {
    const [account, positions] = await Promise.all([brokerFetch('/t212/account'), brokerFetch('/t212/positions')]);
    T.account = account; T.positions = positions; T.at = Date.now(); T.state = 'ok'; T.err = '';
    t212CacheSave();
    t212SyncHistories(); // precios diarios para las gráficas (en segundo plano, con su propia caché)
    if (!silent) toast('Trading 212 actualizado y guardado en este dispositivo');
  } catch (e) {
    if (e && e.status === 429) { T.nextRetry = Date.now() + 15000; diag('trading212: límite de peticiones, espero un poco'); }
    else { if (T.account) T.state = 'cached'; else T.state = 'err'; }
    T.err = brokerErr(e);
  } finally { AR.t212 = false; }
  renderBrokers();
}

/* ---------- Trade Republic (servidor local) ---------- */
const TR = { state: 'idle', err: '', qr: null, positions: null, cash: null, plans: null, interest: [], at: null, poll: null, localUrl: '' };
const LS_TR_URL = 'cartera.tr.url.v1';
const AR = { t212: false, tr: false, trh: false, t2h: false };
function trLocal() { return cleanProxyLocal(TR.localUrl); }
function cleanProxyLocal(u) {
  u = String(u || '').trim().replace(/\/+$/, '');
  if (!u) return '';
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(u) || /^https:\/\//i.test(u)) return u;
  return '';
}
function trCacheLoad() {
  const c = lsGet(LS_TR);
  if (c && c.positions) { TR.positions = c.positions; TR.cash = c.cash || null; TR.plans = c.plans || null; TR.interest = Array.isArray(c.interest) ? c.interest : []; TR.at = c.at || null; TR.state = 'cached'; }
  const u = lsGet(LS_TR_URL);
  if (u && typeof u.url === 'string') TR.localUrl = u.url;
}
function trCacheSave() { lsSet(LS_TR, { positions: TR.positions, cash: TR.cash, plans: TR.plans, interest: TR.interest, at: Date.now() }); }
async function trFetch(path, opts) {
  const base = trLocal();
  if (!base) { const er = new Error('Configura la dirección del servidor local de Trade Republic en Ajustes.'); er.code = 'tr_no_url'; throw er; }
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, 30000);
  let r, txt;
  try {
    r = await fetch(base + path, Object.assign({ signal: ctrl ? ctrl.signal : undefined }, opts && opts.init || {}));
    txt = await r.text();
  } catch (e) { const er = new Error('El servidor local de Trade Republic no responde.'); er.code = 'tr_unreachable'; throw er; }
  finally { clearTimeout(timer); }
  let j = null;
  try { j = JSON.parse(txt); } catch (e) { j = null; }
  if (!r.ok) { const er = new Error((j && j.error) || 'error ' + r.status); er.code = (j && j.code) || 'tr_http'; er.status = r.status; throw er; }
  if (j && j.code) { const er = new Error(j.error); er.code = j.code; er.status = r.status; throw er; }
  return j;
}
function trErr(e) {
  const c = String(e && e.code || '');
  if (c === 'tr_no_url') return 'Configura la dirección del servidor local de Trade Republic en Ajustes (sección "Servidor local de Trade Republic").';
  if (c === 'tr_unreachable') return 'El servidor local de Trade Republic no responde. ¿Está arrancado? Ejecuta "cd tr-server && bun server.mjs" en tu PC.';
  if (c === 'tr_pending') return 'Escanea y confirma el código QR en la app de Trade Republic.';
  if (c === 'tr_login') return (e && e.message) || 'No hay sesión de Trade Republic. Vincula con el QR primero.';
  return 'No pude leer Trade Republic' + (e && e.message ? ': ' + e.message : '.');
}
async function trLogin() {
  if (!trLocal()) { TR.err = trErr({ code: 'tr_no_url' }); TR.state = 'err'; renderBrokers(); return; }
  TR.state = 'busy'; TR.err = ''; TR.qr = null; renderBrokers();
  try {
    await trFetch('/login', { init: { method: 'POST' } });
    // Poll del payload del QR hasta que esté disponible.
    TR.state = 'qr';
    for (let i = 0; i < 20 && !TR.qr; i++) {
      const s = await trFetch('/qr');
      if (s && s.qrPayload) TR.qr = s.qrPayload;
      if (!TR.qr) await new Promise(r => setTimeout(r, 700));
    }
    if (!TR.qr) { TR.err = 'No llegó el código QR. Reintenta.'; TR.state = 'err'; }
    else trStartPoll(); // en cuanto confirme, carga el portfolio solo
  } catch (e) { TR.err = trErr(e); TR.state = 'err'; }
  renderBrokers();
}
async function trLoad() {
  if (!trLocal()) { TR.err = trErr({ code: 'tr_no_url' }); TR.state = 'err'; renderBrokers(); return; }
  TR.state = 'busy'; TR.err = ''; renderBrokers();
  await trFetchPortfolio(false);
  renderBrokers();
}
/* ---------- Precio de criptos (CoinGecko, sin clave) ---------- */
/* Trade Republic no sirve precio de las criptos por WebSocket: se deriva el
   símbolo del ISIN (XF000BTC0017 -> BTC) y se pide el precio a CoinGecko. */
const CG_MAP = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'ripple', ADA: 'cardano', LTC: 'litecoin', DOT: 'polkadot', DOGE: 'dogecoin', LINK: 'chainlink', AVAX: 'avalanche-2', MATIC: 'matic-network', POL: 'polygon-ecosystem-token', ATOM: 'cosmos', BCH: 'bitcoin-cash', XLM: 'stellar', ALGO: 'algorand', NEAR: 'near', FTM: 'fantom', UNI: 'uniswap', AAVE: 'aave', TRX: 'tron', EOS: 'eos', FIL: 'filecoin' };
function trCryptoSymbol(isin) {
  if (!/^XF/i.test(String(isin || ''))) return null;
  const t = String(isin).slice(5, 8);
  return /^[A-Z]{3}$/.test(t) ? t : null;
}
function isCryptoLike(p) {
  return /crypto/i.test(String(p.instrumentType || '')) || /^XF/i.test(String(p.isin || ''));
}
async function trCryptoPrice(sym) {
  const id = CG_MAP[sym] || String(sym).toLowerCase();
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + encodeURIComponent(id) + '&vs_currencies=eur');
    if (!r.ok) return null;
    const j = await r.json();
    const v = j && j[id] && j[id].eur;
    return typeof v === 'number' ? v : null;
  } catch (e) { return null; }
}
/* Rellena precio/valor/P/L de las criptos que TR no cotiza. */
async function trFillCryptoPrices(positions) {
  for (const p of positions || []) {
    if (!isCryptoLike(p) || okNum(p.currentPrice)) continue;
    const sym = trCryptoSymbol(p.isin);
    if (!sym) continue;
    const px = await trCryptoPrice(sym);
    if (px == null) continue;
    p.currentPrice = px;
  }
  for (const p of positions || []) {
    if (!isCryptoLike(p) || !okNum(p.currentPrice)) continue;
    const qty = Number(p.netSize || 0);
    p.value = p.currentPrice * qty;
    if (okNum(p.invested)) p.ppl = p.value - Number(p.invested);
  }
}
async function trFetchPortfolio(silent) {
  if (AR.tr) return null;
  AR.tr = true;
  try {
    const j = await trFetch('/portfolio');
    await trFillCryptoPrices(j.positions);
    TR.positions = j.positions || []; TR.cash = j.cash || null; TR.plans = j.plans || null; TR.interest = Array.isArray(j.interest) ? j.interest : (TR.interest || []); TR.at = Date.now(); TR.state = 'ok'; TR.err = '';
    trCacheSave();
    trSyncHistories(); // velas para las gráficas (en segundo plano, con su propia caché)
    if (!silent) toast('Trade Republic actualizado y guardado en este dispositivo');
    return j;
  } catch (e) {
    if (TR.positions) { TR.state = 'cached'; } else { TR.state = 'err'; }
    TR.err = trErr(e);
    return null;
  } finally { AR.tr = false; }
}
async function trCheck() {
  try {
    const s = await trFetch('/status');
    if (s && s.status === 'connected') { trStopPoll(); TR.state = 'ok'; await trFetchPortfolio(true); }
    else if (s && s.status === 'loading') { TR.state = 'loading'; }
    else if (s && s.status === 'pending') { /* sigue esperando el QR */ TR.state = 'qr'; }
    else { TR.err = s && s.error ? s.error : 'Aún no confirmado.'; TR.state = 'err'; }
  } catch (e) { TR.err = trErr(e); TR.state = 'err'; }
  renderBrokers();
}
/* Sondeo automático mientras se muestra el QR: en cuanto el servidor confirma
   la vinculación, el portfolio se carga solo, sin pulsar "Ya lo he escaneado".
   Se detiene al conectar, fallar o quitar el broker. */
function trStopPoll() {
  if (TR.poll) { clearInterval(TR.poll); TR.poll = null; }
}
async function trPollOnce() {
  if (TR.state !== 'qr' && TR.state !== 'loading') { trStopPoll(); return; }
  let s = null;
  try { s = await trFetch('/status'); } catch (e) { return; } // ocupado: el siguiente intento decidirá
  if (s && s.status === 'loading') { // QR aprobado: el servidor está leyendo la cartera
    if (TR.state !== 'loading') { TR.state = 'loading'; TR.qr = null; renderBrokers(); }
    return;
  }
  if (!s || (s.status !== 'connected' && s.status !== 'pending')) {
    trStopPoll();
    TR.state = 'err';
    TR.err = (s && s.error) || 'No se pudo confirmar la vinculación. Reintenta.';
    TR.qr = null;
    renderBrokers();
    return;
  }
  if (s.status === 'connected') {
    trStopPoll();
    TR.state = 'ok'; TR.err = '';
    await trFetchPortfolio(true);
    renderBrokers();
  }
}
function trStartPoll() {
  trStopPoll();
  TR.poll = setInterval(trPollOnce, 2000);
}
async function trLoadSilent() {
  // Solo refresca si hay sesión; si aún no hay QR no insiste.
  if (!(TR.state === 'ok' || TR.state === 'cached')) return;
  await trFetchPortfolio(true);
  renderBrokers();
}

/* ---------- Histórico de precios de Trade Republic (alimenta las gráficas) ---------- */
const LS_TRH = 'cartera.tr.hist.v1';
const TRH = { by: {} }; // { [isin]: { at, miss?, t:[días], c:[cierre] } }
const TRH_TTL = 900000;        // el histórico se re-busca cada 15 min (el cambio de hoy sale de él)
const TRH_MISS_TTL = 300000;   // si no hubo velas, se reintenta en 5 min (y el fallo no se guarda en el dispositivo)
const noMiss = by => { const o = {}; for (const k of Object.keys(by)) if (by[k] && !by[k].miss) o[k] = by[k]; return o; };
function trHistCacheLoad() {
  const c = lsGet(LS_TRH);
  if (c && c.by && typeof c.by === 'object') TRH.by = c.by;
}
function trHistCacheSave() { lsSet(LS_TRH, { by: noMiss(TRH.by) }); }
/* Histórico de criptos: Trade Republic no lo sirve por WebSocket; CoinGecko sí. */
async function trCryptoHist(sym) {
  const id = CG_MAP[sym] || String(sym).toLowerCase();
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/coins/' + encodeURIComponent(id) + '/market_chart?vs_currency=eur&days=365&interval=daily');
    if (!r.ok) return null;
    const j = await r.json();
    const px = j && j.prices;
    if (!Array.isArray(px) || px.length < 2) return null;
    const t = [], c = [];
    for (const p of px) { if (!Array.isArray(p) || typeof p[1] !== 'number') continue; t.push(Math.floor(Number(p[0]) / DAY)); c.push(p[1]); }
    return t.length >= 2 ? { t, c } : null;
  } catch (e) { return null; }
}
/* Rellena el histórico de cada posición de Trade Republic que no esté fresco:
   velas del mensaje aggregateHistory vía servidor local; criptos vía CoinGecko.
   Los fallos no se reintentan en cada refresco (una vez por hora). */
async function trSyncHistories() {
  if (AR.trh || !trLocal() || S.demo) return;
  const list = trAssets().filter(a => a.isin && a.vQty > 0);
  const stale = list.filter(a => !(TRH.by[a.isin] && TRH.by[a.isin].at && Date.now() - TRH.by[a.isin].at < (TRH.by[a.isin].miss ? TRH_MISS_TTL : TRH_TTL)));
  if (!stale.length) return;
  AR.trh = true;
  let changed = false;
  try {
    for (const a of stale) {
      const isin = a.isin;
      let h = null;
      if (a.type === 'crypto') { const sym = trCryptoSymbol(isin); if (sym) h = await trCryptoHist(sym); }
      else {
        try {
          const j = await trFetch('/history?isin=' + encodeURIComponent(isin) + '&range=1y&exchange=LSX');
          h = j && Array.isArray(j.candles) && j.candles.length >= 2 ? j.candles : null;
        } catch (e) { /* sin sesión o sin datos: se reintentará más tarde */ }
      }
      if (h) {
        if (Array.isArray(h)) h = { t: h.map(x => Math.floor(Number(x[0]) / DAY)), c: h.map(x => Number(x[1])) };
        if (!h.t || h.t.length < 2) h = null;
      }
      let yahoo = false;
      if (!h && a.type !== 'crypto') { // Trade Republic no dio velas: precios de mercado (Yahoo) por ISIN
        try {
          const j = await trFetch('/market/chart?range=1y&isin=' + encodeURIComponent(isin));
          if (j && Array.isArray(j.t) && Array.isArray(j.c) && j.t.length >= 2 && j.t.length === j.c.length) { h = { t: j.t.map(Number), c: j.c.map(Number) }; yahoo = true; }
        } catch (e) { /* sin servidor al día o sin cotización */ }
      }
      if (h) { TRH.by[isin] = { at: Date.now(), t: h.t, c: h.c, y: yahoo || undefined }; changed = true; }
      else TRH.by[isin] = { at: Date.now(), miss: true };
    }
  } finally { AR.trh = false; }
  if (changed) { trHistCacheSave(); MEMO = null; UI.histCache = null; render(true); }
  else { UI.histCache = null; const mb = $('#mainChart'); if (mb) drawMain(mb); }
}

/* ---------- Histórico de precios de Trading 212 (vía el servidor de brokers, por ISIN) ---------- */
const LS_T2H = 'cartera.t212.hist.v1';
const T2H = { by: {} }; // { [isin]: { at, miss?, t:[días], c:[cierre] } }
function t212HistCacheLoad() {
  const c = lsGet(LS_T2H);
  if (c && c.by && typeof c.by === 'object') T2H.by = c.by;
}
function t212HistCacheSave() { lsSet(LS_T2H, { by: noMiss(T2H.by) }); }
async function t212SyncHistories() {
  if (AR.t2h || !brokersReady() || S.demo) return;
  const list = t212Assets().filter(a => a.isin && a.vQty > 0);
  const stale = list.filter(a => !(T2H.by[a.isin] && T2H.by[a.isin].at && Date.now() - T2H.by[a.isin].at < (T2H.by[a.isin].miss ? TRH_MISS_TTL : TRH_TTL)));
  if (!stale.length) return;
  AR.t2h = true;
  let changed = false;
  try {
    for (const a of stale) {
      let h = null;
      try {
        const j = await brokerFetch('/market/chart?range=1y&isin=' + encodeURIComponent(a.isin));
        if (j && Array.isArray(j.t) && Array.isArray(j.c) && j.t.length >= 2 && j.t.length === j.c.length) h = { t: j.t.map(Number), c: j.c.map(Number) };
      } catch (e) {
        if (e && (e.code === 'access_denied' || e.code === 'broker_unreachable')) break; // no insistas con el resto
      }
      if (h) { T2H.by[a.isin] = { at: Date.now(), t: h.t, c: h.c }; changed = true; }
      else T2H.by[a.isin] = { at: Date.now(), miss: true };
    }
  } finally { AR.t2h = false; }
  t212HistCacheSave();
  if (changed) { MEMO = null; UI.histCache = null; render(true); }
  else { UI.histCache = null; const mb = $('#mainChart'); if (mb) drawMain(mb); }
}

/* ---------- Regla "sin URL, sin datos" ---------- */
/* Quitar la dirección de un broker borra también su caché en este dispositivo. */
function discardT212() {
  Object.assign(T, { state: 'idle', err: '', account: null, positions: null, at: null, nextRetry: 0 });
  T2H.by = {};
  try { localStorage.removeItem(LS_T212); localStorage.removeItem(LS_T2H); } catch (e) { /* sin almacenamiento */ }
}
function discardTR() {
  trStopPoll();
  Object.assign(TR, { state: 'idle', err: '', qr: null, positions: null, cash: null, plans: null, interest: [], at: null, poll: null });
  TRH.by = {};
  try { localStorage.removeItem(LS_TR); localStorage.removeItem(LS_TRH); } catch (e) { /* sin almacenamiento */ }
}
/* Desconectar Trading 212: olvida servidor, clave de acceso y todos sus datos, como si nunca se hubiera configurado.
   Si el repositorio trae un servidor por defecto, se deja una marca vacía para que no se reconecte solo. */
function forgetT212() {
  B.proxy = ''; B.accessKey = '';
  try {
    if (B.cfgProxy) localStorage.setItem(LS_PROXY, JSON.stringify({ url: '' }));
    else localStorage.removeItem(LS_PROXY);
  } catch (e) { /* sin almacenamiento */ }
  discardT212();
  const u = $('#px-url'); if (u) u.value = '';
  const k = $('#px-key'); if (k) k.value = '';
}
/* Borrado total: quita de este dispositivo todo lo que la app guardó (menos los registros, que se borran con deshacer). */
function wipeLocalExtras() {
  discardT212(); discardTR();
  B.proxy = B.cfgProxy; B.accessKey = ''; TR.localUrl = '';
  LOGOS.map = {}; LOGOS.pending.clear(); LOGOS.wait.clear(); LOGOS.noWd.clear();
  ISS.by = {}; ISS.tried = {};
  Object.assign(UI, { tab: 'resumen', src: 'all', range: 182, filter: 'all', sort: 'value', histCache: null, refresh: 5, theme: 'auto', privacy: false });
  try {
    const keep = [LS_LOCAL];
    for (const k of Object.keys(localStorage)) if (k.indexOf('cartera.') === 0 && keep.indexOf(k) < 0) localStorage.removeItem(k);
  } catch (e) { /* sin almacenamiento */ }
  applyTheme(); applyPrivacy(); renderThemeBtn(); renderRateBtn();
}
/* Refresca la app tras quitar un broker (el patrimonio cambia). */
function brokersWiped() { MEMO = null; UI.histCache = null; render(true); }

/* ---------- Actualización automática ---------- */
async function autoRefreshNow() {
  if (S.demo || UI.refresh <= 0) return;
  if (B.proxy && !AR.t212 && !(T.nextRetry && Date.now() < T.nextRetry)) await loadT212(true);
  if (trLocal() && !AR.tr) await trLoadSilent();
}
function renderRateBtn() {
  const b = $('#refreshRateBtn');
  if (!b) return;
  b.hidden = false;
  b.title = 'Frecuencia de actualización automática';
  const l = $('#refreshRateLbl');
  if (l) l.textContent = UI.refresh > 0 ? UI.refresh + 's' : 'Off';
  for (const o of $$('#rateMenu [data-action="rate-set"]')) o.setAttribute('aria-pressed', String(+o.dataset.s === UI.refresh));
}
function renderThemeBtn() {
  const b = $('#themeBtn');
  if (!b) return;
  const dark = UI.theme === 'dark';
  b.title = dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
  b.setAttribute('aria-label', b.title);
}
/* Modo privado: difumina todos los valores (ojo de la cabecera). */
function applyPrivacy() {
  document.documentElement.classList.toggle('prv', UI.privacy);
  renderPrivacyBtn();
}
function renderPrivacyBtn() {
  const b = $('#privacyBtn');
  if (!b) return;
  const hid = UI.privacy;
  b.title = hid ? 'Mostrar valores' : 'Ocultar valores';
  b.setAttribute('aria-label', b.title);
  // El ojo se queda siempre; solo aparece/desaparece la línea de tachado.
  const slash = $('#prvSlash');
  if (slash) slash.style.display = hid ? '' : 'none';
}

/* ---------- Tema (automático / claro / oscuro) ---------- */
function applyTheme() {
  const r = document.documentElement;
  if (UI.theme === 'dark') r.setAttribute('data-theme', 'dark');
  else if (UI.theme === 'light') r.setAttribute('data-theme', 'light');
  else r.removeAttribute('data-theme');
}

/* ---------- Logos por ISIN (Wikidata: P946 = ISIN, P154 = logo oficial) ---------- */
function logoCacheLoad() {
  const c = lsGet(LS_LOGOS);
  if (c && c.list && typeof c.list === 'object') { for (const k of Object.keys(c.list)) if (c.list[k]) LOGOS.map[k] = c.list[k]; }
}
function logosSave() { const o = {}; for (const k of Object.keys(LOGOS.map)) if (LOGOS.map[k]) o[k] = LOGOS.map[k]; lsSet(LS_LOGOS, { list: o }); }
/* Criptos: icono de la moneda por símbolo (BTC -> btc.png). Es una imagen estática: sin API ni límites. */
async function cryptoLogoUrl(isin) {
  const sym = trCryptoSymbol(isin); if (!sym) return '';
  return 'https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/' + sym.toLowerCase() + '.png';
}
/* Fondos conocidos por ISIN (los más habituales) y pistas del nombre tal como lo escribe Trade Republic. */
const FUND_ISIN = {
  IE00B4L5Y983: 'ishares.com', IE00B5BMR087: 'ishares.com', IE00BKM4GZ66: 'ishares.com', IE00B4ND3602: 'ishares.com',
  IE00BK5BQT80: 'vanguard.com', IE00B3RBWM25: 'vanguard.com', IE00BFMXXD54: 'vanguard.com', IE00B3XXRP09: 'vanguard.com',
  IE00BJ0KDQ92: 'dws.com', LU1681043599: 'amundietf.com', IE00B6YX5C33: 'ssga.com', IE00B3YCGJ38: 'invesco.com'
};
const FUND_HINT = [[/^core (msci|s&p|euro|dax|ftse)/i, 'ishares.com'], [/ftse all-world/i, 'vanguard.com']];
function fundHintLogo(isin, name) {
  let dom = FUND_ISIN[isin];
  if (!dom) for (const h of FUND_HINT) if (h[0].test(String(name || ''))) { dom = h[1]; break; }
  return dom ? 'https://www.google.com/s2/favicons?domain=' + dom + '&sz=128' : '';
}
/* Nombres con los que se puede reconocer al emisor de un fondo: el del broker (Trading 212 lo incluye),
   el emisor que da Trade Republic y el que devolvió el servidor de precios. */
function issuerNames(isin) {
  const out = [];
  for (const a of t212Assets().concat(trAssets())) if (a.isin === isin) { out.push(a.name); if (a.issuer) out.push(a.issuer); }
  if (ISS.by[isin]) out.push(ISS.by[isin]);
  return out;
}
async function logoLookup(isin) {
  const key = String(isin || '').trim().toUpperCase();
  if (!key) return;
  if (LOGOS.map[key] != null || LOGOS.pending.has(key)) return;
  if (LOGOS.cool && LOGOS.cool[key] > Date.now()) return;
  LOGOS.pending.add(key);
  if (/^XF/i.test(key)) {
    const cu = await cryptoLogoUrl(key);
    LOGOS.pending.delete(key);
    if (cu === null) { (LOGOS.cool = LOGOS.cool || {})[key] = Date.now() + 60000; return; }
    LOGOS.map[key] = cu; logosSave(); scheduleRender();
    return;
  }
  let url = '';
  try {
    if (LOGOS.noWd.has(key)) throw new Error('sin Wikidata');
    const q = 'SELECT ?logo WHERE { ?item wdt:P946 "' + key + '" . ?item wdt:P154 ?logo . } LIMIT 6';
    const u = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q);
    const r = await fetch(u, { headers: { 'User-Agent': 'nido/1.0 (local)' } });
    const j = await r.json();
    const logos = ((j && j.results && j.results.bindings) || []).map(b => b.logo && b.logo.value).filter(Boolean);
    const pick = logos.find(l => !/white/i.test(l)) || logos[0];
    if (pick) {
      const m = pick.split('Special:FilePath/')[1];
      const fname = m ? decodeURIComponent(m) : '';
      if (fname) url = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(fname) + '?width=128';
    }
  } catch (e) { url = ''; }
  if (!url) {
    LOGOS.noWd.add(key);
    url = fundHintLogo(key, (issuerNames(key)[0] || ''));
    if (!url) for (const n of issuerNames(key)) { url = issuerLogoUrl(n); if (url) break; }
    if (!url && ISS.by[key] == null) { LOGOS.wait.add(key); LOGOS.pending.delete(key); issuerSync(); return; } // aún sin nombre del emisor: se reintenta cuando llegue
  }
  LOGOS.pending.delete(key);
  LOGOS.map[key] = url;
  logosSave();
  scheduleRender();
}
function applyLogos() {
  for (const img of $$('img.logo[data-isin]')) {
    const isin = String(img.dataset.isin || '').trim().toUpperCase();
    if (!isin) { img.remove(); continue; }
    if (LOGOS.map[isin] != null) {
      if (LOGOS.map[isin]) { img.onerror = () => img.remove(); if (img.getAttribute('src') !== LOGOS.map[isin]) img.src = LOGOS.map[isin]; }
      else img.remove();
    }
    else logoLookup(isin);
  }
}

/* =========================================================
   Datos de ejemplo (solo en memoria)
   ========================================================= */
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function demoDocs() {
  const t = todayEd(); const rnd = mulberry(11);
  const mk = (p0, drift, vol, weekends) => {
    const T = [], Cc = []; let p = p0;
    for (let e = t - 372; e <= t; e++) {
      const wd = new Date(e * DAY).getUTCDay();
      if (!weekends && (wd === 0 || wd === 6)) continue;
      p *= 1 + drift + (rnd() - 0.5) * vol; T.push(e); Cc.push(sig(p));
    }
    return { t: T, c: Cc };
  };
  const A = (id, type, name, symbol, currency, hist) => ({ id, kind: 'asset', type, name, symbol, currency, hist, price: hist.c[hist.c.length - 1], prev: hist.c[hist.c.length - 2], priceAt: Date.now(), txs: [], createdAt: Date.now() });
  const fx = { USD: 0.92 };
  const buy = (a, ago, qty, fees, side) => {
    const ds = fromEd(t - ago); const i = lastLE(a.hist.t, t - ago);
    const price = sig(a.hist.c[Math.max(0, i)] * (a.currency === 'USD' ? fx.USD : 1));
    a.txs.push({ id: newId('t'), side: side || 'buy', date: ds, qty, price, fees, amount: round(side === 'sell' ? qty * price - fees : qty * price + fees, 2) });
  };
  const etf = A('a_demo1', 'etf', 'ETF MSCI World (ejemplo)', 'DEMO-ETF', 'EUR', mk(92, 0.0006, 0.018));
  const fund = A('a_demo2', 'fund', 'Fondo indexado global (ejemplo)', 'DEMO-FND', 'EUR', mk(31, 0.0005, 0.014));
  const tec = A('a_demo3', 'stock', 'Acción tecnológica (ejemplo)', 'DEMO-TEC', 'USD', mk(190, 0.0007, 0.03));
  const btc = A('a_demo4', 'crypto', 'Bitcoin (ejemplo)', 'DEMO-BTC', 'EUR', mk(52000, 0.0011, 0.045, true));
  const ele = A('a_demo5', 'stock', 'Eléctrica española (ejemplo)', 'DEMO-ELE', 'EUR', mk(13, 0.0005, 0.02));
  buy(etf, 360, 20, 1); buy(tec, 300, 8, 1); buy(tec, 120, 4, 1); buy(btc, 340, 0.05, 2); buy(btc, 90, 0.03, 2);
  buy(ele, 260, 150, 3); buy(ele, 40, 60, 3, 'sell');
  const plan = (id, target, targetId, amount, days, ago) => ({ id, kind: 'plan', target, targetId, amount, fees: 0, days, start: fromEd(t - ago), end: '', active: true, createdAt: Date.now() });
  const cash = {
    id: 'c_demo1', kind: 'cash', name: 'Cuenta remunerada (ejemplo)', createdAt: Date.now(),
    rates: [{ from: fromEd(t - 345), apy: 2.75 }, { from: fromEd(t - 150), apy: 2.25 }],
    moves: [{ id: 'm_d1', date: fromEd(t - 345), amount: 9000, note: 'Saldo inicial' }, { id: 'm_d2', date: fromEd(t - 200), amount: -1500, note: 'Retirada' }]
  };
  return [etf, fund, tec, btc, ele, cash,
    plan('p_demo1', 'asset', 'a_demo1', 300, [5], 330), plan('p_demo2', 'asset', 'a_demo2', 150, [20], 300), plan('p_demo3', 'cash', 'c_demo1', 200, [1], 280),
    { id: 'settings', kind: 'settings', fx, fxHist: {}, pricesAt: Date.now() }];
}

/* =========================================================
   Estado de interfaz
   ========================================================= */
const TABS = ['resumen', 'inversiones', 'liquidez', 'planes'];
const UI = { tab: 'resumen', src: 'all', range: 182, filter: 'all', sort: 'value', histCache: null, refresh: 5, theme: 'auto', privacy: false };
const AUTO_OPTS = [5, 15, 30, 60, 0];
const LS_AUTOREFRESH = 'cartera.autoRefresh.v1';
const LS_THEME = 'cartera.theme.v1';
const LS_PRIVACY = 'cartera.privacy.v1';
const LS_LOGOS = 'cartera.logos.v1';
const LOGOS = { map: {}, pending: new Set(), wait: new Set(), noWd: new Set() };
/* Fondos y ETF: Wikidata casi nunca tiene su ISIN, así que se usa el logo del emisor (iShares, Vanguard...)
   deducido del nombre del instrumento que devuelve el servidor de precios. */
const LS_ISS = 'cartera.issuer.v1';
const ISS = { by: {}, tried: {}, busy: false };
const ISSUERS = [
  [/ishares|blackrock/i, 'ishares.com'], [/vanguard/i, 'vanguard.com'], [/xtrackers|\bdws\b/i, 'dws.com'],
  [/invesco/i, 'invesco.com'], [/spdr|state street/i, 'ssga.com'], [/amundi|lyxor/i, 'amundietf.com'],
  [/wisdomtree/i, 'wisdomtree.eu'], [/vaneck/i, 'vaneck.com'], [/\bubs\b/i, 'ubs.com'], [/hsbc/i, 'hsbc.com'],
  [/jpmorgan|jp morgan/i, 'jpmorgan.com'], [/legal & general|\bl&g\b/i, 'lgim.com'], [/bnp/i, 'bnpparibas.com'],
  [/franklin/i, 'franklintempleton.com'], [/global x/i, 'globalxetfs.eu'], [/ossiam/i, 'ossiam.com'],
  [/fidelity/i, 'fidelity.com'], [/pimco/i, 'pimco.com'], [/ark\b/i, 'ark-funds.com']
];
function issuerLogoUrl(name) {
  for (const x of ISSUERS) if (x[0].test(String(name || ''))) return 'https://www.google.com/s2/favicons?domain=' + x[1] + '&sz=128';
  return '';
}
function issCacheLoad() { const c = lsGet(LS_ISS); if (c && c.by && typeof c.by === 'object') ISS.by = c.by; }
/* Pide el nombre completo (con el emisor) de los fondos cuyo logo no se ha encontrado, una sola vez por ISIN. */
async function issuerSync() {
  if (ISS.busy || S.demo || !LOGOS.wait.size) return;
  const todo = t212Assets().concat(trAssets()).filter(a => a.isin && LOGOS.wait.has(a.isin) && ISS.by[a.isin] == null && !(ISS.tried[a.isin] && Date.now() - ISS.tried[a.isin] < 300000));
  if (!todo.length) return;
  ISS.busy = true;
  let got = false;
  try {
    for (const a of todo) {
      ISS.tried[a.isin] = Date.now();
      try {
        const j = await mkFetch(a, '5d');
        if (j && typeof j.name === 'string' && j.name) { ISS.by[a.isin] = j.name; got = true; LOGOS.wait.delete(a.isin); delete LOGOS.map[a.isin]; }
      } catch (e) { /* sin servidor al día: se reintenta más tarde */ }
    }
  } finally { ISS.busy = false; }
  if (got) { lsSet(LS_ISS, { by: ISS.by }); scheduleRender(); }
}
const AD = { tab: 'inv', q: '', mine: [], cat: [], cashMode: null };
function saveUI() { lsSet(LS_UI, { tab: UI.tab, src: UI.src, range: UI.range, filter: UI.filter, sort: UI.sort }); }
function setTab(t) {
  if (!TABS.includes(t)) return;
  const changed = t !== UI.tab;
  UI.tab = t; saveUI();
  render(changed);
  if (changed) window.scrollTo({ top: 0, behavior: RM.matches ? 'auto' : 'smooth' });
}

/* =========================================================
   Render principal
   ========================================================= */
let renderQueued = false;
function scheduleRender() {
  MEMO = null; UI.histCache = null;
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; render(); refreshOpenSheet(); });
}
function render(anim) {
  MEMO = null;
  renderTop(); renderBanner();
  const v = $('#view');
  let html;
  if (S.mode === 'loading' && !S.demo) html = vLoading();
  else {
    const M = model();
    html = UI.tab === 'inversiones' ? vInv(M) : UI.tab === 'liquidez' ? vCash(M) : UI.tab === 'planes' ? vPlans(M) : vResumen(model(srcEff()));
  }
  v.innerHTML = html;
  if (anim && !RM.matches) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); }
  afterRender();
}
function renderTop() {
  for (const b of $$('[role="tab"][data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === UI.tab));
  renderRateBtn();
  renderThemeBtn();
  renderPrivacyBtn();
  setSync();
}
function renderBanner() {
  const b = $('#banner'); if (!b) return;
  let h = '';
  if (S.demo) h = '<div class="banner-in"><span>Estás viendo una cartera de ejemplo con precios inventados. No se guarda nada.</span><button class="btn sm ghost" data-action="demo-off">Salir del ejemplo</button></div>';
  else if (S.mode === 'local' && !lsGet('cartera.bannerOk')) h = '<div class="banner-in"><span>Tus datos se guardan en este dispositivo. Haz una copia de seguridad de vez en cuando desde Ajustes.</span><button class="btn sm ghost" data-action="banner-ok">Entendido</button></div>';
  else if (S.mode === 'local') {
    const M = model();
    if (M.pendN) h = '<div class="banner-in warn"><span>' + (M.pendN === 1 ? 'Hay 1 aportación' : 'Hay ' + M.pendN + ' aportaciones') + ' sin precio todavía. Se valoran a coste hasta tenerlo.</span></div>';
    else if (M.missingFx.length) h = '<div class="banner-in warn"><span>Falta el tipo de cambio ' + esc(M.missingFx.join(', ')) + ' a euros. Pon el precio en euros en la ficha del activo.</span></div>';
  }
  b.innerHTML = h ? '<div class="banner">' + h + '</div>' : '';
}
function vLoading() {
  return '<div class="stack"><section class="hero"><div class="panel hero-main"><div class="sk" style="height:14px;width:120px"></div><div class="sk" style="height:46px;width:min(260px,80%);margin-top:12px"></div><div class="sk" style="height:200px;margin-top:22px"></div></div><div class="panel"><div class="sk" style="height:14px;width:90px"></div><div class="sk" style="height:12px;margin-top:18px"></div><div class="sk" style="height:130px;margin-top:18px"></div></div></section></div>';
}
function emptyState() {
  return '<section class="panel empty">' +
    '<h2>Tu patrimonio, en un solo sitio</h2>' +
    '<p>Apunta acciones, ETFs, fondos y cripto con su precio y fecha de compra, añade tus cuentas remuneradas con su TAE y deja que los planes mensuales se apunten solos.</p>' +
    '<div class="btns"><button class="btn primary" data-action="add-inv">Añadir inversión</button><button class="btn ghost" data-action="add-cash">Añadir liquidez</button><button class="btn ghost" data-action="demo-on">Ver un ejemplo</button></div>' +
    '<div class="feat">' +
    (B.proxy ? '<div><b>Brokers en solo lectura</b><span>Consulta tu cuenta de Trading 212 y Trade Republic.</span></div>' : '<div><b>Funciona sin conexión</b><span>Instalada en la pantalla de inicio abre al momento, con o sin internet.</span></div>') +
    '<div><b>Planes automáticos</b><span>Elige importe y días del mes. Cada aportación se apunta sola.</span></div>' +
    '<div><b>Liquidez con intereses</b><span>Saldo, TAE e intereses generados día a día.</span></div>' +
    '</div></section>';
}
function emptyInline(title, text, action, label) {
  return '<section class="panel empty"><h2>' + esc(title) + '</h2><p>' + esc(text) + '</p><div class="btns"><button class="btn primary" data-action="' + action + '">' + esc(label) + '</button>' + (model().any ? '' : '<button class="btn ghost" data-action="demo-on">Ver un ejemplo</button>') + '</div></section>';
}
function subDefault(M) {
  let h = '';
  if (M.hasDay) h += '<span class="delta ' + cls(M.invDay) + '">' + seur(M.invDay) + ' (' + pct(M.invDayPct) + ')</span><span class="faint">hoy</span>';
  h += '<span class="faint"' + (M.hasDay ? ' style="margin-left:10px"' : '') + '>Ganancia total</span><span class="delta ' + cls(M.totalGain) + '">' + seur(M.totalGain) + '</span>';
  return h;
}
function vResumen(M) {
  if (!M.any) return emptyState();
  const R = UI.range;
  const ranges = [[1, '1D'], [7, '1S'], [30, '1M'], [91, '3M'], [182, '6M'], [0, 'YTD'], [365, '1A'], [-1, 'Todo']];
  return '<div class="stack">' +
    '<section class="hero">' +
      '<div class="panel hero-main">' +
        '<div class="hero-top"><p class="label">' + (srcEff() === 'all' ? 'Patrimonio total' : 'Patrimonio en ' + SRC_LABEL[srcEff()]) + '</p>' +
        (srcList().length > 1 ? '<div class="seg small" role="tablist" aria-label="Cuenta">' + ['all'].concat(srcList()).map(k => '<button role="tab" data-action="src-set" data-s="' + k + '" aria-selected="' + (srcEff() === k) + '">' + SRC_LABEL[k] + '</button>').join('') + '</div>' : '') + '</div>' +
        '<p class="big money" id="bigVal">' + eur(M.net) + '</p>' +
        '<div class="subline" id="bigSub">' + subDefault(M) + '</div>' +
        '<div class="chart-wrap"><div class="chart" id="mainChart" aria-label="Evolución del patrimonio"></div></div>' +
        '<dl class="rstats" id="chartStats"></dl>' +
        '<div class="chart-foot"><div class="legend-inline"><span><i></i>Patrimonio</span><span><i class="dash"></i>Aportado</span></div>' +
        '<div class="seg small" role="tablist" aria-label="Periodo">' + ranges.map(r => '<button role="tab" data-action="range" data-r="' + r[0] + '" aria-selected="' + (R === r[0]) + '">' + r[1] + '</button>').join('') + '</div></div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3>Reparto</h3>' + allocHTML(M) +
        '<dl class="kpis">' +
          '<div><dt>Invertido</dt><dd>' + eur(M.invCost) + '</dd></div>' +
          '<div><dt>Ganancia latente</dt><dd class="' + cls(M.invPnl) + '">' + seur(M.invPnl) + '<small>' + pct(M.invPct) + '</small></dd></div>' +
          '<div><dt>Liquidez</dt><dd>' + eur(M.cashTotal) + '</dd></div>' +
          '<div><dt>Intereses generados</dt><dd class="' + cls(M.interest) + '">' + seur(M.interest) + '<small class="muted">' + eur(M.monthInt) + ' el próximo mes</small></dd></div>' +
        '</dl>' +
      '</div>' +
    '</section>' +
    '<section class="grid2">' +
      '<div class="panel"><div class="sec-head"><h3>Planes de ahorro</h3><button class="linkbtn" data-action="tab" data-tab="planes">Ver planes</button></div>' + upcomingHTML() + '</div>' +
      '<div class="panel"><div class="sec-head"><h3>Mayores posiciones</h3><button class="linkbtn" data-action="tab" data-tab="inversiones">Ver todas</button></div>' + topHTML(M) + '</div>' +
    '</section>' +
  '</div>';
}
function allocHTML(M) {
  const rows = M.alloc.filter(r => r.v > 0.005);
  if (!rows.length) return '<p class="empty-small">Sin posiciones todavía.</p>';
  const tot = rows.reduce((s, r) => s + r.v, 0);
  return '<div class="alloc-bar" role="img" aria-label="Reparto del patrimonio">' + rows.map(r => '<span style="width:' + (r.v / tot * 100).toFixed(2) + '%;background:var(' + r.k + ')"></span>').join('') + '</div>' +
    '<ul class="alloc-list">' + rows.map(r => '<li><span class="sw" style="background:var(' + r.k + ')"></span><span>' + esc(r.l) + '</span><span class="num">' + eur0(r.v) + '</span><span class="pc num">' + NP.format(r.v / tot * 100) + ' %</span></li>').join('') + '</ul>';
}
function upcomingHTML() {
  // Planes de ahorro de Trade Republic (no hay planes manuales).
  const plans = TR.plans || [];
  if (!plans.length) return '<p class="empty-small">Sin planes de ahorro. <button class="linkbtn" data-action="tab" data-tab="planes">Ver planes</button></p>';
  const names = {};
  for (const a of trAssets()) if (a.isin) names[a.isin] = a.name;
  return '<ul class="simple-list">' + plans.slice(0, 6).map(p => {
    const isin = trPlanIsin(p);
    const name = p.instrumentName || (p.instrument && p.instrument.name) || p.name || names[isin] || isin || 'Plan';
    const amt = trPlanAmount(p);
    const iv = (p.parameters && p.parameters.interval != null) ? p.parameters.interval : p.interval;
    const nx = trPlanNext(p);
    return '<li><div class="l ll">' + logoBadge(isin, name, '--k-tr') + '<span style="min-width:0"><strong>' + esc(name) + (p.paused ? ' <span class="pill warn">En pausa</span>' : '') + '</strong><small>' + esc(trIntervalLabel(iv)) + (nx ? ' · próxima ' + datefs(nx) : '') + '</small></span></div><div class="r num">' + (amt != null ? eur(amt) : '—') + '</div></li>';
  }).join('') + '</ul>';
}
function topHTML(M) {
  const list = M.pos.filter(p => p.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  if (!list.length) return '<p class="empty-small">Aún no hay inversiones. <button class="linkbtn" data-action="add-inv">Añadir la primera</button></p>';
  return '<ul class="simple-list">' + list.map(p => {
    const action = p.broker ? 'open-broker' : 'open-asset';
    const src = p.a.source === 't212' ? 'Trading 212' : p.a.source === 'tr' ? 'Trade Republic' : '';
    return '<li><button class="lb" data-action="' + action + '" data-id="' + esc(p.a.id) + '"><span class="l ll">' + logoBadge(p.a.isin, p.a.name, p.broker ? (p.a.source === 't212' ? '--k-t212' : '--k-tr') : TYPES[typeOf(p.a)].k) + '<span style="min-width:0"><strong>' + esc(p.a.name) + '</strong><small>' + (src ? src + ' · ' : '') + TYPES[typeOf(p.a)].l + (p.a.symbol ? ' · ' + esc(p.a.symbol) : '') + '</small></span></span><span class="r">' + eur(p.value) + '<small class="' + cls(p.pnl) + '">' + pct(p.pnlPct) + '</small></span></button></li>';
  }).join('') + '</ul>';
}
/* Cuadro con iniciales y, encima, el logo cuando se encuentra (por ISIN). */
function logoBadge(isin, name, kvar) {
  const ini = String(name || '?').replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  return '<span class="badge" style="--k:var(' + (kvar || '--k-fund') + ')"><span>' + esc(ini) + '</span><img class="logo" data-isin="' + esc(isin || '') + '" alt=""></span>';
}
function badgeTxt(a) {
  const s = String(a.symbol || '').split(/[.\-=]/)[0];
  if (s && s.length <= 5 && !/^0P/i.test(s) && !/^DEMO/.test(s)) return s.slice(0, 4).toUpperCase();
  return String(a.name || '?').replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}
/* Respaldo de las miniaturas: cierres diarios de 1 año descargados al vuelo para las posiciones de broker sin histórico. */
const SPK = { by: {}, tried: {}, busy: false };
async function sparkPrefetch() {
  if (SPK.busy || S.demo) return;
  const todo = t212Assets().concat(trAssets()).filter(a => a.isin && a.vQty > 0 && !(a.hist && a.hist.c && a.hist.c.length >= 3) && !SPK.by[a.isin] && !(SPK.tried[a.isin] && Date.now() - SPK.tried[a.isin] < 300000));
  if (!todo.length) return;
  SPK.busy = true;
  let got = false;
  try {
    for (const a of todo) {
      SPK.tried[a.isin] = Date.now();
      const R = await mkSeries(a, '1y');
      if (R.s && R.s.unit === 'd' && R.s.c.length >= 3) { SPK.by[a.isin] = { t: R.s.t, c: R.s.c }; got = true; }
    }
  } finally { SPK.busy = false; }
  if (got) scheduleRender();
}
function sparkSVG(a) {
  const hh = a.hist && a.hist.c && a.hist.c.length >= 3 ? a.hist : (a.isin && SPK.by[a.isin]); if (!hh || !hh.c || hh.c.length < 3) return '';
  const c = hh.c.slice(-64); const w = 92, h = 30;
  let lo = Math.min.apply(null, c), hi = Math.max.apply(null, c); if (hi - lo < 1e-12) { hi += 1; lo -= 1; }
  let d = '';
  for (let i = 0; i < c.length; i++) d += (i ? 'L' : 'M') + (i / (c.length - 1) * w).toFixed(1) + ' ' + (2 + (1 - (c[i] - lo) / (hi - lo)) * (h - 4)).toFixed(1);
  const col = c[c.length - 1] >= c[0] ? 'var(--gain)' : 'var(--loss)';
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><path d="' + d + '" style="fill:none;stroke:' + col + ';stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round"/></svg>';
}
function posRow(p) {
  const a = p.a, t = TYPES[typeOf(a)];
  const srcLabel = a.source === 't212' ? 'Trading 212' : a.source === 'tr' ? 'Trade Republic' : '';
  const sub = (srcLabel ? '<span class="pill src">' + esc(srcLabel) + '</span>' : '') + [a.symbol, t.l].filter(Boolean).join(' · ') + (p.pendN ? ', sin precio' : '');
  const action = p.broker ? 'open-broker' : 'open-asset';
  const badgeK = p.broker ? (a.source === 't212' ? '--k-t212' : '--k-tr') : t.k;
  return '<button class="row" data-action="' + action + '" data-id="' + esc(a.id) + '">' +
    '<span class="r-name"><span class="badge" style="--k:var(' + badgeK + ')"><span>' + esc(badgeTxt(a)) + '</span><img class="logo" data-isin="' + esc(a.isin || '') + '" alt=""></span><span class="tx"><strong>' + esc(a.name) + '</strong><small>' + sub + '</small></span></span>' +
    '<span class="r-num c-hide c-md">' + qtyf(p.qty) + '<small class="faint">' + pxf(p.avg) + ' medio</small></span>' +
    '<span class="r-num c-hide">' + pxf(p.price) + '<small class="' + cls(p.dayPct || 0) + '">' + (p.dayPct != null ? pct(p.dayPct) + ' hoy' : '&nbsp;') + '</small></span>' +
    '<span class="spark c-hide">' + sparkSVG(a) + '</span>' +
    '<span class="r-num c-hide">' + eur(p.cost) + '<small class="faint">invertido</small></span>' +
    '<span class="r-num">' + eur(p.value) + '<small class="' + cls(p.pnl) + '">' + seur(p.pnl) + ' (' + pct(p.pnlPct) + ')</small></span>' +
  '</button>';
}
function vInv(M) {
  if (!M.pos.length) return emptyInline('Todavía no tienes inversiones', 'Busca una acción, ETF, fondo o cripto y apunta tu primera compra.', 'add-inv', 'Añadir inversión');
  const types = TYPE_ORDER.filter(k => M.pos.some(p => typeOf(p.a) === k));
  if (UI.filter !== 'all' && !types.includes(UI.filter)) UI.filter = 'all';
  const isOpen = p => p.qty > 0 || p.pendN > 0;
  let list = M.pos.filter(p => UI.filter === 'all' || typeOf(p.a) === UI.filter);
  const sorters = {
    value: (a, b) => b.value - a.value,
    pnl: (a, b) => b.pnlPct - a.pnlPct,
    day: (a, b) => (b.dayPct || 0) - (a.dayPct || 0),
    name: (a, b) => String(a.a.name).localeCompare(String(b.a.name), 'es')
  };
  list.sort(sorters[UI.sort] || sorters.value);
  const open = list.filter(isOpen), closed = list.filter(p => !isOpen(p));
  const fv = open.reduce((s, p) => s + p.value, 0), fc = open.reduce((s, p) => s + p.cost, 0);
  const chip = (k, l) => '<button class="chip" data-action="filter" data-k="' + k + '" aria-pressed="' + (UI.filter === k) + '">' + l + '</button>';
  return '<div class="page-head"><div><p class="label">' + (UI.filter === 'all' ? 'Inversiones' : TYPES[UI.filter].p) + '</p><p class="big money">' + eur(fv) + '</p>' +
    '<div class="subline"><span class="delta ' + cls(fv - fc) + '">' + seur(fv - fc) + ' (' + pct(fc > 0 ? (fv - fc) / fc : 0) + ')</span><span class="faint">sobre ' + eur(fc) + ' invertidos</span>' +
    (M.realized && UI.filter === 'all' ? '<span class="faint" style="margin-left:10px">Realizada</span><span class="delta ' + cls(M.realized) + '">' + seur(M.realized) + '</span>' : '') + '</div></div>' +
    '<button class="btn primary sm" data-action="add-inv">' + IC.plus + 'Añadir inversión</button></div>' +
    '<section class="panel" style="padding:12px">' +
      '<div class="sec-head" style="padding:4px 6px 12px;flex-wrap:wrap"><div class="chips">' + chip('all', 'Todo') + types.map(k => chip(k, TYPES[k].p)).join('') + '</div>' +
      '<label for="sortSel" style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-2)">Ordenar<select class="field" id="sortSel" style="height:34px;width:auto;font-size:14px;padding:0 34px 0 12px;background-position:calc(100% - 17px) 15px,calc(100% - 12px) 15px">' +
        [['value', 'Valor'], ['pnl', 'Rentabilidad'], ['day', 'Cambio hoy'], ['name', 'Nombre']].map(o => '<option value="' + o[0] + '"' + (UI.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label></div>' +
      '<div class="list-head"><span>Nombre</span><span class="c-hide c-md">Participaciones</span><span class="c-hide">Precio</span><span class="c-hide">3 meses</span><span class="c-hide">Invertido</span><span>Valor</span></div>' +
      '<div class="list">' + (open.length ? open.map(posRow).join('') : '<p class="empty-small" style="padding:12px 10px">Nada abierto en este filtro.</p>') + '</div>' +
      (closed.length ? '<details style="margin-top:8px"><summary class="faint" style="padding:10px;cursor:pointer;font-size:13.5px">Posiciones cerradas (' + closed.length + ')</summary><div class="list">' + closed.map(posRow).join('') + '</div></details>' : '') +
    '</section>';
}
function vCash(M) {
  const brokerCards = [];
  if (M.t212Cash > 0.005) brokerCards.push('<div class="card"><div class="card-top"><h4>Trading 212</h4><span class="pill src">Broker</span></div><div class="amt">' + eur(M.t212Cash) + '</div><div class="meta"><span>Efectivo</span><b>solo lectura</b></div></div>');
  if (M.trCash > 0.005) brokerCards.push('<div class="card"><div class="card-top"><h4>Trade Republic</h4><span class="pill src">Broker</span></div><div class="amt">' + eur(M.trCash) + '</div><div class="meta"><span>Efectivo</span><b>solo lectura</b><span>Intereses cobrados</span><b class="' + cls(trInterestTotal()) + '">' + seur(trInterestTotal()) + '</b><span>Próximo mes (est.)</span><b>' + eur(M.trCash * (Math.pow(1 + TR_APY / 100, 30 / 365) - 1)) + '</b></div></div>');
  if (!M.cash.length && !brokerCards.length) return emptyInline('Sin cuentas de liquidez', 'Añade tu cuenta remunerada con su TAE y verás cuánto te genera cada mes.', 'add-cash', 'Añadir cuenta');
  const cards = M.cash.slice().sort((a, b) => b.bal - a.bal).map(r => {
    const c = r.c;
    const month = r.bal > 0 ? r.bal * (Math.pow(1 + r.apy / 100, 30 / 365) - 1) : 0;
    return '<div class="card tappable" role="button" tabindex="0" data-action="open-cash" data-id="' + esc(c.id) + '">' +
      '<div class="card-top"><h4>' + esc(c.name) + '</h4><span class="pill acc">TAE ' + NP.format(r.apy) + ' %</span></div>' +
      '<div class="amt">' + eur(r.bal) + '</div>' +
      '<div class="meta"><span>Aportado neto</span><b>' + eur(r.principal) + '</b><span>Intereses generados</span><b class="' + cls(r.interest) + '">' + seur(r.interest) + '</b><span>Próximo mes</span><b>' + eur(month) + '</b><span>En un año</span><b>' + eur(r.bal > 0 ? r.bal * r.apy / 100 : 0) + '</b></div>' +
    '</div>';
  }).join('').concat(brokerCards.join(''));
  return '<div class="page-head"><div><p class="label">Liquidez</p><p class="big money">' + eur(M.cashTotal) + '</p>' +
    '<div class="subline"><span class="delta ' + cls(M.interest) + '">' + seur(M.interest) + '</span><span class="faint">de intereses generados</span><span class="faint" style="margin-left:10px">Unos ' + eur(M.monthInt) + ' el próximo mes</span></div></div>' +
    '<button class="btn primary sm" data-action="add-cash">' + IC.plus + 'Añadir</button></div>' +
    '<div class="cards">' + cards + '</div>' +
    '<p class="help" style="margin-top:16px">Los intereses se calculan día a día con la TAE vigente en cada fecha, capitalizando a diario. Tu banco puede liquidarlos de otra forma, así que trátalo como una estimación.</p>';
}
function planCard(p) {
  const tgt = D().get(p.targetId);
  const ex = executions(p);
  const nx = p.active ? nextRunEd(p) : null;
  const kind = p.target === 'cash' ? 'Liquidez' : (tgt ? TYPES[typeOf(tgt)].l : 'Inversión');
  return '<div class="card">' +
    '<div class="card-top"><div style="min-width:0;display:flex;gap:10px;align-items:center">' + (tgt && p.target !== 'cash' ? logoBadge(tgt.isin, tgt.name, TYPES[typeOf(tgt)].k) : '') + '<div style="min-width:0"><h4>' + esc(tgt ? tgt.name : 'Destino eliminado') + '</h4><span class="faint" style="font-size:13px">' + kind + '</span></div></div>' +
    '<button class="switch" role="switch" aria-checked="' + (!!p.active) + '" aria-label="' + (p.active ? 'Pausar plan' : 'Reanudar plan') + '" data-action="toggle-plan" data-id="' + esc(p.id) + '"></button></div>' +
    '<div class="amt">' + eur(p.amount) + '<span class="faint" style="font-size:14px;font-weight:500;letter-spacing:0"> por aportación</span></div>' +
    '<div class="meta"><span>Cuándo</span><b>' + esc(daysText(p.days)) + '</b><span>Próxima</span><b>' + (p.active ? (nx != null ? datef(fromEd(nx)) : 'Sin más fechas') : 'En pausa') + '</b>' +
    '<span>Aportaciones</span><b>' + ex.n + '</b><span>Total aportado</span><b>' + eur(ex.sum) + '</b></div>' +
    '<div class="card-actions"><button class="btn ghost sm" data-action="edit-plan" data-id="' + esc(p.id) + '">Editar</button>' +
    (tgt ? '<button class="btn ghost sm" data-action="' + (p.target === 'cash' ? 'open-cash' : 'open-asset') + '" data-id="' + esc(tgt.id) + '">Ver ' + (p.target === 'cash' ? 'cuenta' : 'activo') + '</button>' : '') +
    '<button class="btn danger sm" data-action="plan-del" data-id="' + esc(p.id) + '">Eliminar</button></div>' +
  '</div>';
}
/* Etiquetas legibles para los intervalos de Trade Republic. */
function trIntervalLabel(iv) {
  const s = String(iv || '').toLowerCase();
  if (s === 'twopermonth') return 'Dos veces al mes';
  if (s === 'monthly') return 'Mensual';
  if (s === 'weekly') return 'Semanal';
  if (s === 'quarterly') return 'Trimestral';
  if (s === 'daily') return 'Diario';
  return String(iv || '—');
}
/* ISIN real del plan: TR lo trae en instrumentId (es el ISIN) o en instrument.isin. */
function trPlanIsin(p) {
  return (p.instrument && (p.instrument.isin || p.instrument.wkn)) || p.instrumentId || p.isin || '';
}
function trPlanAmount(p) {
  const raw = p.parameters && p.parameters.amount != null ? p.parameters.amount : p.amount;
  const n = Number(raw);
  return isFinite(n) && raw != null ? n : null;
}
/* Próxima ejecución del plan si TR la da. */
function trPlanNext(p) {
  const s = p.nextExecutionDate || (p.startDate && p.startDate.nextExecutionDate) || (p.parameters && p.parameters.startDate) || '';
  return validDate(String(s).slice(0, 10)) ? String(s).slice(0, 10) : '';
}
/* Veces al mes aproximado según el intervalo de Trade Republic. */
function trPlanFactor(p) {
  const iv = String((p.parameters && p.parameters.interval != null) ? p.parameters.interval : p.interval || '').toLowerCase();
  if (iv === 'twopermonth') return 2;
  if (iv === 'weekly') return 4;
  if (iv === 'monthly') return 1;
  if (iv === 'quarterly') return 1 / 3;
  if (iv === 'daily') return 30;
  return 1;
}
function trPlanMonthly(p) {
  const a = trPlanAmount(p);
  return a != null ? a * trPlanFactor(p) : null;
}
function vPlans(M) {
  // Solo planes de ahorro de Trade Republic (lectura; no hay planes manuales).
  const plans = TR.plans || [];
  const names = {};
  for (const a of trAssets()) if (a.isin) names[a.isin] = a.name;
  if (!plans.length) {
    return '<div class="page-head"><div><p class="label">Planes de ahorro</p><p class="big money">—</p><div class="subline"><span class="faint">Tus planes de Trade Republic</span></div></div></div>' +
      '<section class="panel empty"><h2>Sin planes todavía</h2><p>Conecta Trade Republic (Ajustes → Trade Republic) para ver aquí tus planes de ahorro, con su importe e intervalo. Se gestionan desde la app de Trade Republic.</p>' +
      '<div class="btns"><button class="btn primary" data-action="settings">Abrir ajustes</button></div>' +
      '<div class="feat"><div><b>Solo lectura</b><span>Los planes se muestran tal y como los tienes en Trade Republic.</span></div></div></section>';
  }
  const sum = plans.reduce((s, p) => s + (trPlanMonthly(p) || 0), 0);
  return '<div class="page-head"><div><p class="label">Planes de ahorro · Trade Republic</p><p class="big money">' + eur(sum) + '</p>' +
    '<div class="subline"><span class="faint">al mes · ' + plans.length + (plans.length === 1 ? ' plan' : ' planes') + '</span></div></div></div>' +
    '<div class="cards">' + plans.map(p => {
      const isin = trPlanIsin(p);
      const titulo = p.instrumentName || (p.instrument && p.instrument.name) || p.name || names[isin] || isin || 'Plan';
      const amt = trPlanAmount(p);
      const monthly = trPlanMonthly(p);
      const iv = (p.parameters && p.parameters.interval != null) ? p.parameters.interval : p.interval;
      const nx = trPlanNext(p);
      const paused = !!p.paused;
      return '<div class="card"><div class="card-top"><h4>' + esc(titulo) + '</h4><span class="pill ' + (paused ? 'warn' : 'acc') + '">' + (paused ? 'En pausa' : 'Trade Republic') + '</span></div>' +
        '<div class="amt">' + (amt != null ? eur(amt) : '—') + '<span class="faint" style="font-size:14px;font-weight:500;letter-spacing:0"> por aportación</span></div>' +
        '<div class="meta"><span>Cuándo</span><b>' + esc(trIntervalLabel(iv)) + '</b>' + (nx ? '<span>Próxima</span><b>' + datef(nx) + '</b>' : '') + (monthly != null ? '<span>Al mes</span><b>' + eur(monthly) + '</b>' : '') + (isin ? '<span>ISIN</span><b style="overflow-wrap:anywhere">' + esc(isin) + '</b>' : '') + '</div></div>';
    }).join('') + '</div>' +
    '<p class="help" style="margin-top:16px">Solo lectura: los planes se gestionan desde la app de Trade Republic.</p>';
}

/* =========================================================
   Gráficos
   ========================================================= */
let RO = null;
function afterRender() {
  applyLogos();
  const box = $('#mainChart');
  if (RO) { RO.disconnect(); RO = null; }
  sparkPrefetch(); issuerSync();
  if (!box) return;
  drawMain(box); bindScrub(box);
  if (window.ResizeObserver) { let w = box.clientWidth; RO = new ResizeObserver(() => { if (box.clientWidth !== w) { w = box.clientWidth; drawMain(box); } }); RO.observe(box); }
}
/* ¿Aún se están descargando los precios de alguna posición de broker? (para no decir "sin datos" antes de tiempo) */
function histPending() {
  if (S.demo) return false;
  if (AR.t2h || AR.trh || SPK.busy || T.state === 'busy' || TR.state === 'busy' || TR.state === 'loading') return true;
  for (const a of t212Assets().concat(trAssets())) {
    if (!(a.vQty > 0) || !a.isin || (a.hist && a.hist.c && a.hist.c.length > 1)) continue;
    const t2 = a.source === 't212', e = (t2 ? T2H : TRH).by[a.isin];
    if (!e && (t2 ? brokersReady() : !!trLocal())) return true;
  }
  return false;
}
function getHist() {
  if (UI.range === 1) return H1.s === srcEff() ? H1.h : null;
  if (!UI.histCache || UI.histCache.r !== UI.range || UI.histCache.s !== srcEff()) UI.histCache = { r: UI.range, s: srcEff(), h: history(UI.range) };
  return UI.histCache.h;
}
/* 1D del patrimonio: suma las velas intradía de las posiciones de broker (Yahoo, Trade Republic o CoinGecko);
   el resto de la cartera (activos manuales, liquidez) cuenta como constante. t en segundos. */
const H1 = { at: 0, h: null, busy: false, loaded: false, s: 'all' };
async function history1d() {
  const M = model(srcEff());
  const ser = [];
  for (const p of M.pos) {
    if (!p.broker || !(p.qty > 0) || !p.a.isin) continue;
    const R = await mkSeries(p.a, '1d');
    if (R.s && R.s.unit === 's' && R.s.c.length >= 2 && p.a.price > 0) ser.push({ p, s: R.s });
  }
  if (!ser.length) return null;
  const set = new Set();
  for (const x of ser) for (const t of x.s.t) set.add(t);
  const ts = Array.from(set).sort((a, b) => a - b), n = ts.length;
  if (n < 2) return null;
  const used = new Set(ser.map(x => x.p));
  let rest = 0, restCost = 0;
  for (const p of M.pos) if (!used.has(p)) { rest += p.value; restCost += p.cost; }
  rest += M.cashTotal; restCost += M.cashTotal - M.interest;
  const val = new Float64Array(n), con = new Float64Array(n);
  for (const x of ser) {
    const f = x.p.value / x.p.a.price; // el último punto de la serie vale el precio actual
    let j = 0;
    for (let i = 0; i < n; i++) {
      while (j + 1 < x.s.t.length && x.s.t[j + 1] <= ts[i]) j++;
      val[i] += x.s.c[j] * f; con[i] += x.p.cost;
    }
  }
  for (let i = 0; i < n; i++) { val[i] += rest; con[i] += restCost; }
  return { start: Math.floor(ts[0] / 86400), n, val, con, ts };
}
async function load1d() {
  if (H1.busy) return;
  H1.busy = true;
  const sv = srcEff();
  try { H1.h = await history1d(); } catch (e) { H1.h = null; }
  H1.s = sv; H1.busy = false; H1.at = Date.now(); H1.loaded = true;
  const box = $('#mainChart'); if (box && UI.range === 1) drawMain(box);
}
function hLabel(H, i) {
  if (!H.ts) return datefs(fromEd(H.start + i));
  const d = new Date(H.ts[i] * 1000);
  return (H.ts[H.n - 1] - H.ts[0]) > 20 * 3600 ? d.toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
function niceTicks(lo, hi, n) {
  const span = hi - lo; if (!(span > 0)) return [];
  const raw = span / n; const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(x => x * mag).find(x => x >= raw) || raw;
  const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
  return out;
}
function drawMain(box) {
  if (UI.range === 1 && !H1.busy && (!H1.loaded || H1.s !== srcEff() || Date.now() - H1.at > 60000)) load1d();
  const H = getHist();
  const stats = $('#chartStats');
  if (!H && UI.range === 1) { box.innerHTML = '<div class="chart-empty" role="status">' + (H1.loaded && H1.s === srcEff() ? 'El detalle del día necesita posiciones de Trading 212 o Trade Republic con precios de mercado.' : 'Cargando…') + '</div>'; box.style.cursor = 'default'; box._geo = null; if (stats) stats.innerHTML = ''; return; }
  if (!H && histPending()) { box.innerHTML = '<div class="chart-empty" role="status"><span class="loading-box" style="padding:0"><span class="spin"></span>Cargando…</span></div>'; box.style.cursor = 'default'; box._geo = null; if (stats) stats.innerHTML = ''; return; }
  if (!H) { box.innerHTML = '<div class="chart-empty">La evolución aparecerá cuando tu cartera tenga al menos dos días de historia.</div>'; box.style.cursor = 'default'; box._geo = null; if (stats) stats.innerHTML = ''; return; }
  const w = Math.max(200, box.clientWidth || 600), h = box.clientHeight || 220;
  const top = 10, bottom = 24, ih = h - top - bottom;
  let lo = Infinity, hi = -Infinity, allPos = true;
  for (let i = 0; i < H.n; i++) { lo = Math.min(lo, H.val[i], H.con[i]); hi = Math.max(hi, H.val[i], H.con[i]); }
  if (lo < 0) allPos = false;
  if (hi - lo < 1) { hi += 1; lo -= 1; }
  const pv = (hi - lo) * 0.12; lo -= pv; hi += pv; if (allPos && lo < 0) lo = 0;
  const X = i => H.n === 1 ? w / 2 : i / (H.n - 1) * w;
  const Y = v => top + (1 - (v - lo) / (hi - lo)) * ih;
  let dv = '', dc = '';
  for (let i = 0; i < H.n; i++) { dv += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(H.val[i]).toFixed(1); dc += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(H.con[i]).toFixed(1); }
  const ticks = niceTicks(lo, hi, h > 250 ? 5 : 3);
  // máximo y mínimo del periodo (sobre el patrimonio)
  let iMax = 0, iMin = 0;
  for (let i = 1; i < H.n; i++) { if (H.val[i] > H.val[iMax]) iMax = i; if (H.val[i] < H.val[iMin]) iMin = i; }
  const long = H.n > 200;
  const dlab = i => H.ts ? new Date(H.ts[i] * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : (long ? MYF.format(new Date((H.start + i) * DAY)) : datefs(fromEd(H.start + i)));
  const xl = [];
  for (let k = 1; k < 4; k++) { const i = Math.round(k * (H.n - 1) / 4); xl.push('<span class="xlab" style="left:' + (X(i) / w * 100).toFixed(1) + '%;transform:translateX(-50%)">' + dlab(i) + '</span>'); }
  const mm = (i, up) => {
    const x = Math.max(34, Math.min(w - 34, X(i)));
    return '<span class="mm" style="left:' + x.toFixed(1) + 'px;top:' + (Y(H.val[i]) + (up ? -22 : 8)).toFixed(1) + 'px">' + compactEur(H.val[i]) + '</span>';
  };
  box.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">' +
    '<defs><linearGradient id="gMain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.22"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>' +
    ticks.map(t => '<line x1="0" x2="' + w + '" y1="' + Y(t).toFixed(1) + '" y2="' + Y(t).toFixed(1) + '" style="stroke:var(--line);stroke-width:1"/>').join('') +
    '<path d="' + dv + 'L' + w + ' ' + (top + ih) + 'L0 ' + (top + ih) + 'Z" style="fill:url(#gMain)"/>' +
    '<path d="' + dc + '" style="fill:none;stroke:var(--ink-3);stroke-width:1.5;stroke-dasharray:4 4"/>' +
    '<path d="' + dv + '" style="fill:none;stroke:var(--accent);stroke-width:2.2;stroke-linejoin:round;stroke-linecap:round"/>' +
    '<circle cx="' + X(H.n - 1).toFixed(1) + '" cy="' + Y(H.val[H.n - 1]).toFixed(1) + '" r="4" style="fill:var(--accent);stroke:var(--surface);stroke-width:2"/>' +
    (iMax !== iMin ? '<circle cx="' + X(iMax).toFixed(1) + '" cy="' + Y(H.val[iMax]).toFixed(1) + '" r="3" style="fill:var(--gain)"/><circle cx="' + X(iMin).toFixed(1) + '" cy="' + Y(H.val[iMin]).toFixed(1) + '" r="3" style="fill:var(--loss)"/>' : '') +
    '<g class="xh" style="display:none"><line class="xhl" y1="' + top + '" y2="' + (top + ih) + '" style="stroke:var(--ink-3);stroke-width:1"/><circle class="xhc" r="5" style="fill:var(--accent);stroke:var(--surface);stroke-width:2"/></g>' +
    '</svg>' +
    ticks.map(t => '<span class="ylab" style="top:' + Y(t).toFixed(1) + 'px">' + compactEur(t) + '</span>').join('') +
    (iMax !== iMin ? mm(iMax, true) + mm(iMin, false) : '') + xl.join('') +
    '<span class="xlab" style="left:0">' + dlab(0) + '</span><span class="xlab" style="right:0">' + (H.ts ? 'Ahora' : 'Hoy') + '</span>';
  box.style.cursor = '';
  box._geo = { X, Y, H, w };
  if (stats) {
    const n1 = H.n - 1, dCon = H.con[n1] - H.con[0], gain = (H.val[n1] - H.val[0]) - dCon;
    const baseV = H.val[0] + Math.max(0, dCon), gp = baseV > 0 ? gain / baseV : 0;
    stats.innerHTML =
      '<div><dt>Ganancia del periodo</dt><dd class="' + cls(gain) + '">' + seur(gain) + '<small>' + pct(gp) + '</small></dd></div>' +
      '<div><dt>Aportado en el periodo</dt><dd>' + seur(dCon) + '</dd></div>' +
      '<div><dt>Máximo</dt><dd>' + eur(H.val[iMax]) + '<small class="faint">' + hLabel(H, iMax) + '</small></dd></div>' +
      '<div><dt>Mínimo</dt><dd>' + eur(H.val[iMin]) + '<small class="faint">' + hLabel(H, iMin) + '</small></dd></div>';
  }
}
function bindScrub(box) {
  const move = e => {
    const g = box._geo; if (!g) return;
    const r = box.getBoundingClientRect();
    const x = Math.max(0, Math.min(g.w, e.clientX - r.left));
    const i = Math.round(x / g.w * (g.H.n - 1));
    const xh = box.querySelector('.xh'); if (!xh) return;
    xh.style.display = '';
    const px = g.X(i).toFixed(1);
    const l = box.querySelector('.xhl'); l.setAttribute('x1', px); l.setAttribute('x2', px);
    const c = box.querySelector('.xhc'); c.setAttribute('cx', px); c.setAttribute('cy', g.Y(g.H.val[i]).toFixed(1));
    const bv = $('#bigVal'), bs = $('#bigSub');
    if (bv) bv.textContent = eur(g.H.val[i]);
    const gain = g.H.val[i] - g.H.con[i];
    if (bs) bs.innerHTML = '<span class="faint">' + (g.H.ts ? hLabel(g.H, i) : datef(fromEd(g.H.start + i))) + '</span><span class="faint" style="margin-left:6px">Aportado ' + eur(g.H.con[i]) + '</span><span class="delta ' + cls(gain) + '">' + seur(gain) + '</span>';
  };
  const reset = () => {
    const xh = box.querySelector('.xh'); if (xh) xh.style.display = 'none';
    const M = model(srcEff()); const bv = $('#bigVal'), bs = $('#bigSub');
    if (bv) bv.textContent = eur(M.net); if (bs) bs.innerHTML = subDefault(M);
  };
  box.addEventListener('pointerdown', move);
  box.addEventListener('pointermove', move);
  box.addEventListener('pointerleave', reset);
  box.addEventListener('pointercancel', reset);
  box.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') reset(); });
}
function miniSVG(o) {
  const t = o.t, v = o.v, w = o.w, h = o.h || 150, color = o.color || 'var(--accent)', marks = o.marks || [], hline = o.hline;
  const n = v.length; if (n < 2) return '';
  let lo = Infinity, hi = -Infinity;
  for (const x of v) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  const t0 = t[0], t1 = t[n - 1];
  const vis = marks.filter(m => m.e >= t0 && m.e <= t1 && okNum(m.y));
  for (const m of vis) { lo = Math.min(lo, m.y); hi = Math.max(hi, m.y); }
  if (okNum(hline)) { lo = Math.min(lo, hline); hi = Math.max(hi, hline); }
  if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
  const pd = (hi - lo) * 0.1; lo -= pd; hi += pd;
  const X = e => (e - t0) / Math.max(1, t1 - t0) * w;
  const Y = y => 6 + (1 - (y - lo) / (hi - lo)) * (h - 12);
  let d = '';
  for (let i = 0; i < n; i++) d += (i ? 'L' : 'M') + X(t[i]).toFixed(1) + ' ' + Y(v[i]).toFixed(1);
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><defs><linearGradient id="gMini" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:' + color + ';stop-opacity:.2"/><stop offset="1" style="stop-color:' + color + ';stop-opacity:0"/></linearGradient></defs>' +
    '<path d="' + d + 'L' + w + ' ' + h + 'L0 ' + h + 'Z" style="fill:url(#gMini)"/>' +
    (okNum(hline) ? '<line x1="0" x2="' + w + '" y1="' + Y(hline).toFixed(1) + '" y2="' + Y(hline).toFixed(1) + '" style="stroke:var(--ink-3);stroke-width:1;stroke-dasharray:3 4"/>' : '') +
    '<path d="' + d + '" style="fill:none;stroke:' + color + ';stroke-width:2;stroke-linejoin:round;stroke-linecap:round"/>' +
    vis.map(m => '<circle cx="' + X(m.e).toFixed(1) + '" cy="' + Y(m.y).toFixed(1) + '" r="4.5" style="fill:' + m.c + ';stroke:var(--sheet);stroke-width:2"/>').join('') +
    '</svg>';
}
function drawAssetMini(id) {
  const box = $('#miniChart'); const a = D().get(id); if (!box || !a) return;
  const hh = a.hist;
  if (!hh || !hh.c || hh.c.length < 2) { box.innerHTML = '<div class="chart-empty">' + (a.symbol ? 'Actualiza precios para ver la evolución.' : 'Este activo no tiene histórico de precios.') + '</div>'; return; }
  const f = unitFx(a);
  const p = calcPos(a);
  const marks = txsOf(a).filter(t => t.price > 0).map(t => ({ e: toEd(t.date), y: t.price, c: t.side === 'sell' ? 'var(--loss)' : 'var(--accent)' }));
  box.innerHTML = miniSVG({ t: hh.t, v: hh.c.map(x => x * f), w: box.clientWidth || 480, h: 150, marks, hline: p.qty > 0 ? p.avg : null });
}
function drawCashMini(id) {
  const box = $('#miniChart'); const c = D().get(id); if (!box || !c) return;
  const r = cashCalc(c);
  if (!r.ser || r.ser.length < 2) { box.innerHTML = '<div class="chart-empty">El saldo aparecerá con el primer movimiento.</div>'; return; }
  const from = Math.max(0, r.ser.length - 366);
  const t = [], v = [];
  for (let i = from; i < r.ser.length; i++) { t.push(r.start + i); v.push(r.ser[i]); }
  box.innerHTML = miniSVG({ t, v, w: box.clientWidth || 480, h: 150, color: 'var(--k-etf)' });
}
/* ---------- Gráfica de mercado de una posición de broker (precio del activo, no tu cartera) ---------- */
const MK = { range: '1m', id: '', cache: {} };
const MK_RANGES = [['1d', '1D'], ['1w', '1S'], ['1m', '1M'], ['3m', '3M'], ['6m', '6M'], ['1y', '1A'], ['max', 'Máx']];
const MK_SRV = { '1d': '1d', '1w': '5d', '1m': '1mo', '3m': '3mo', '6m': '6mo', '1y': '1y', 'max': 'max' };
const MK_DAYS = { '1w': 7, '1m': 30, '3m': 91, '6m': 182, '1y': 365 };
const MK_LABEL = { '1d': 'hoy', '1w': 'en 1 semana', '1m': 'en 1 mes', '3m': 'en 3 meses', '6m': 'en 6 meses', '1y': 'en 1 año', 'max': 'desde el inicio' };
const MK_TTL = { '1d': 60000 }; // el resto se reutiliza 5 min
function brokerAsset(id) { return t212Assets().find(x => x.id === id) || trAssets().find(x => x.id === id); }
function mkFetch(a, r) {
  const q = '/market/chart?range=' + MK_SRV[r] + '&isin=' + encodeURIComponent(a.isin);
  if (a.source === 't212') {
    if (!brokersReady()) { const e = new Error('sin servidor'); e.code = 'no_server'; throw e; }
    return brokerFetch(q);
  }
  if (!trLocal()) { const e = new Error('sin servidor'); e.code = 'no_server'; throw e; }
  return trFetch(q);
}
/* Por qué falló una consulta de mercado, en palabras del usuario. */
function mkWhy(a, e) {
  const c = String(e && e.code || ''), st = e && e.status;
  const srv = a.source === 't212' ? 'Despliega la última versión de worker/precios.js en Cloudflare' : 'Reinicia tr-server (bun server.mjs) con la última versión';
  if (c === 'market_not_found') return 'Yahoo Finance no tiene cotización para este instrumento.';
  if (c === 'no_server') return a.source === 't212' ? 'Configura el servidor de brokers en Ajustes para ver las gráficas.' : 'Configura el servidor local de Trade Republic en Ajustes para ver las gráficas.';
  if (c === 'broker_unreachable' || c === 'tr_unreachable') return 'No hay conexión con el servidor de ' + (a.source === 't212' ? 'brokers' : 'Trade Republic') + '.';
  if (st === 404 || st === 400) return 'El servidor aún no tiene esta gráfica. ' + srv + '.';
  if (c === 'access_denied') return 'Clave de acceso incorrecta. Revísala en Ajustes.';
  return 'No pude descargar el precio de mercado. Reintenta en un momento.';
}
/* Normaliza una respuesta de velas a { unit, t, c, v, prev }, escalada para que el último punto
   coincida con el precio actual del broker (evita líos de divisa). */
function mkNorm(j, a) {
  if (!(j && Array.isArray(j.t) && Array.isArray(j.c) && j.t.length >= 2 && j.t.length === j.c.length)) return null;
  const k = a.price > 0 ? a.price / j.c[j.c.length - 1] : 1;
  return { unit: j.unit === 's' ? 's' : 'd', t: j.t.map(Number), c: j.c.map(x => x * k), v: Array.isArray(j.v) && j.v.length === j.t.length && j.v.some(x => x > 0) ? j.v : null, prev: j.prev > 0 ? j.prev * k : null };
}
/* Velas [[ms, cierre, volumen?]] -> respuesta normalizable. Si hay menos de ~20 h entre velas, son intradía (t en segundos). */
function mkFromCandles(cd) {
  if (!Array.isArray(cd) || cd.length < 2) return null;
  const step = (Number(cd[cd.length - 1][0]) - Number(cd[0][0])) / (cd.length - 1);
  const intra = step < 20 * 3600000;
  const t = [], c = [], v = [];
  for (const x of cd) {
    const d = intra ? Math.floor(Number(x[0]) / 1000) : Math.floor(Number(x[0]) / DAY), px = Number(x[1]);
    if (!(px > 0) || !isFinite(d)) continue;
    if (t.length && t[t.length - 1] === d) { c[c.length - 1] = px; continue; }
    t.push(d); c.push(px); v.push(Number(x[2]) || 0);
  }
  return t.length >= 2 ? { unit: intra ? 's' : 'd', t, c, v } : null;
}
/* Criptos: CoinGecko (sin clave, admite el navegador). Hasta 90 días trae velas de 5 min / 1 h; más, diarias. */
async function mkCrypto(a, r) {
  const sym = trCryptoSymbol(a.isin); if (!sym) return null;
  const id = CG_MAP[sym] || String(sym).toLowerCase();
  const days = { '1d': 1, '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365, 'max': 365 }[r];
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/' + encodeURIComponent(id) + '/market_chart?vs_currency=eur&days=' + days);
    if (!res.ok) return null;
    const j = await res.json();
    return mkNorm(mkFromCandles(j && j.prices), a); // sin volumen: CoinGecko solo da el de 24 h móvil, no por vela
  } catch (e) { return null; }
}
/* Trade Republic: su propio historial de precios (el que muestra su app). */
async function mkTrOwn(a, r) {
  try {
    const rg = { '1d': '1d', '1w': '5d', '1m': '1m', '3m': '3m', '6m': '6m', '1y': '1y', 'max': 'max' }[r];
    const j = await trFetch('/history?isin=' + encodeURIComponent(a.isin) + '&range=' + rg + '&exchange=LSX');
    return mkNorm(mkFromCandles(j && j.candles), a);
  } catch (e) { return null; }
}
/* Serie de precios del activo: { s: {unit,t,c,v,prev}, why }. Cripto: CoinGecko. Trade Republic: su historial
   y, si no hay, Yahoo. Trading 212: Yahoo (su API no da precios). */
async function mkSeries(a, r) {
  const out = { s: null, why: '' };
  if (!a.isin) { out.why = 'Este instrumento no tiene ISIN.'; return out; }
  const key = a.isin + '|' + r, hit = MK.cache[key];
  if (hit && Date.now() - hit.at < (MK_TTL[r] || 300000)) { out.s = hit.s; return out; }
  const crypto = a.source === 'tr' && (a.type === 'crypto' || /^XF/i.test(a.isin));
  let s = null;
  if (crypto) {
    s = await mkCrypto(a, r);
    if (!s) out.why = 'CoinGecko no responde ahora mismo. Reintenta en un minuto.';
  } else {
    if (a.source === 'tr' && trLocal()) s = await mkTrOwn(a, r);
    if (!s) { try { s = mkNorm(await mkFetch(a, r), a); } catch (e) { out.why = mkWhy(a, e); } }
  }
  if (s) { MK.cache[key] = { at: Date.now(), s }; out.s = s; return out; }
  if (!out.why) out.why = 'No hay datos de este periodo.';
  // Respaldo con el histórico diario guardado (periodos largos y servidor sin intradía)
  if (r !== '1d' && r !== '1w') {
    let hist = null;
    const raw = a.source === 't212' && a.isin ? T2H.by[a.isin] : null;
    if (raw && raw.t && raw.t.length > 1) { const k = a.price > 0 ? a.price / raw.c[raw.c.length - 1] : 1; hist = { t: raw.t, c: raw.c.map(x => x * k) }; }
    else if (a.source === 'tr' && a.hist && a.hist.t && a.hist.t.length > 1) hist = a.hist;
    if (hist) {
      const from = todayEd() - (MK_DAYS[r] || 100000);
      let i = 0; while (i < hist.t.length - 2 && hist.t[i] < from) i++;
      out.s = { unit: 'd', t: hist.t.slice(i), c: hist.c.slice(i), v: null, prev: null };
    }
  }
  return out;
}
function mkWhen(S, r, i) {
  if (S.unit === 'd') return datef(fromEd(S.t[i]));
  const d = new Date(S.t[i] * 1000);
  return r === '1d' ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function mkTick(S, r, i) {
  if (S.unit === 's') {
    const d = new Date(S.t[i] * 1000);
    return r === '1d' ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }
  return (S.t[S.t.length - 1] - S.t[0]) > 400 ? MYF.format(new Date(S.t[i] * DAY)) : datefs(fromEd(S.t[i]));
}
function mkVol(v) { return v >= 1e6 ? NP.format(v / 1e6) + ' M' : v >= 1e3 ? NP.format(v / 1e3) + ' K' : String(Math.round(v)); }
function mkSub(S, r, base, i) {
  const last = S.c.length - 1, v = S.c[i], chg = base > 0 ? v / base - 1 : 0;
  return '<span class="money" style="font-weight:600">' + pxf(v) + '</span><span class="delta ' + cls(chg) + '">' + pct(chg) + '</span><span class="faint">' + (i === last ? MK_LABEL[r] : mkWhen(S, r, i)) + '</span>' +
    (S.v && i !== last ? '<span class="faint">Vol. ' + mkVol(S.v[i]) + '</span>' : '');
}
async function drawMarket(id) {
  const box = $('#mktChart'); if (!box) return;
  const a = brokerAsset(id); if (!a) return;
  MK.id = id;
  const r = MK.range, sub = $('#mktSub'), stats = $('#mktStats');
  for (const b of $$('#mktTabs button')) b.setAttribute('aria-selected', String(b.dataset.r === r));
  box.innerHTML = '<div class="chart-empty" role="status"><span class="loading-box" style="padding:0"><span class="spin"></span>Cargando…</span></div>'; box._geo = null; if (sub) sub.innerHTML = ''; if (stats) stats.innerHTML = '';
  const R = await mkSeries(a, r), S = R.s;
  if ($('#mktChart') !== box || MK.range !== r) return; // se abrió otra ficha o periodo mientras tanto
  if (!S || S.c.length < 2) { box.innerHTML = '<div class="chart-empty" role="status">' + esc(R.why) + '</div>'; return; }
  const n = S.c.length;
  const base = r === '1d' && S.prev > 0 ? S.prev : S.c[0];
  const up = S.c[n - 1] >= base, color = up ? 'var(--gain)' : 'var(--loss)';
  const W = Math.max(260, box.clientWidth || 480), H = box.clientHeight || 300;
  const padR = 56, top = 10, bottom = 22, volH = S.v ? Math.round(H * 0.17) : 0;
  const pw = W - padR, ih = H - top - bottom - volH, yb = top + ih; // yb: base del área de precio
  let lo = Infinity, hi = -Infinity;
  for (const x of S.c) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  if (r === '1d' && S.prev > 0) { lo = Math.min(lo, S.prev); hi = Math.max(hi, S.prev); }
  if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
  const pd = (hi - lo) * 0.1; lo -= pd; hi += pd;
  const X = i => i / (n - 1) * pw, Y = v => top + (1 - (v - lo) / (hi - lo)) * ih;
  let d = ''; for (let i = 0; i < n; i++) d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(S.c[i]).toFixed(1);
  const ticks = niceTicks(lo, hi, 5), tf = v => NP.format(Math.abs(v) >= 100 ? Math.round(v) : v).replace(/,00$/, '');
  const xi = [0, 1, 2, 3, 4].map(k => Math.round(k * (n - 1) / 4));
  let vmax = 0; if (S.v) for (const x of S.v) vmax = Math.max(vmax, x);
  let bars = '';
  if (S.v && vmax > 0) {
    const bw = Math.max(1, pw / n * 0.7);
    for (let i = 0; i < n; i++) { const vh = S.v[i] / vmax * (volH - 4); if (vh < .5) continue; bars += '<rect x="' + (X(i) - bw / 2).toFixed(1) + '" y="' + (H - bottom - vh).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + vh.toFixed(1) + '" style="fill:' + (S.c[i] >= (i ? S.c[i - 1] : S.c[i]) ? 'var(--gain)' : 'var(--loss)') + ';opacity:.35"/>'; }
  }
  const lastY = Y(S.c[n - 1]);
  box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">' +
    '<defs><linearGradient id="gMkt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:' + color + ';stop-opacity:.24"/><stop offset="1" style="stop-color:' + color + ';stop-opacity:0"/></linearGradient></defs>' +
    ticks.map(t => '<line x1="0" x2="' + pw + '" y1="' + Y(t).toFixed(1) + '" y2="' + Y(t).toFixed(1) + '" style="stroke:var(--line);stroke-width:1"/>').join('') +
    xi.slice(1, 4).map(i => '<line y1="' + top + '" y2="' + (H - bottom) + '" x1="' + X(i).toFixed(1) + '" x2="' + X(i).toFixed(1) + '" style="stroke:var(--line);stroke-width:1"/>').join('') +
    bars +
    '<path d="' + d + 'L' + pw + ' ' + yb + 'L0 ' + yb + 'Z" style="fill:url(#gMkt)"/>' +
    (r === '1d' && S.prev > 0 ? '<line x1="0" x2="' + pw + '" y1="' + Y(S.prev).toFixed(1) + '" y2="' + Y(S.prev).toFixed(1) + '" style="stroke:var(--ink-3);stroke-width:1;stroke-dasharray:4 4"/>' : '') +
    '<line x1="0" x2="' + pw + '" y1="' + lastY.toFixed(1) + '" y2="' + lastY.toFixed(1) + '" style="stroke:' + color + ';stroke-width:1;stroke-dasharray:1 3"/>' +
    '<path d="' + d + '" style="fill:none;stroke:' + color + ';stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round"/>' +
    '<circle cx="' + X(n - 1).toFixed(1) + '" cy="' + lastY.toFixed(1) + '" r="4" style="fill:' + color + ';stroke:var(--sheet);stroke-width:2"/>' +
    '<g class="xh" style="display:none"><line class="xhv" y1="' + top + '" y2="' + (H - bottom) + '" style="stroke:var(--ink-3);stroke-width:1;stroke-dasharray:3 3"/><line class="xhh" x1="0" x2="' + pw + '" style="stroke:var(--ink-3);stroke-width:1;stroke-dasharray:3 3"/><circle class="xhc" r="4.5" style="fill:' + color + ';stroke:var(--sheet);stroke-width:2"/></g>' +
    '</svg>' +
    ticks.map(t => '<span class="mk-y" style="top:' + Y(t).toFixed(1) + 'px;left:' + (pw + 6) + 'px">' + tf(t) + '</span>').join('') +
    '<span class="mk-tag" style="top:' + lastY.toFixed(1) + 'px;left:' + (pw + 2) + 'px;background:' + color + '">' + tf(S.c[n - 1]) + '</span>' +
    '<span class="mk-tag mk-cur" style="display:none;left:' + (pw + 2) + 'px"></span>' +
    xi.map((i, k) => '<span class="xlab" style="' + (k === 0 ? 'left:0' : k === 4 ? 'left:' + (pw - 2) + 'px;transform:translateX(-100%)' : 'left:' + X(i).toFixed(1) + 'px;transform:translateX(-50%)') + '">' + mkTick(S, r, i) + '</span>').join('');
  if (sub) sub.innerHTML = mkSub(S, r, base, n - 1);
  if (stats) {
    let hiV = -Infinity, loV = Infinity, vs = 0;
    for (let i = 0; i < n; i++) { hiV = Math.max(hiV, S.c[i]); loV = Math.min(loV, S.c[i]); if (S.v) vs += S.v[i]; }
    stats.innerHTML = '<div><dt>' + (r === '1d' && S.prev > 0 ? 'Cierre anterior' : 'Inicio del periodo') + '</dt><dd>' + pxf(base) + '</dd></div>' +
      '<div><dt>Máximo</dt><dd>' + pxf(hiV) + '</dd></div><div><dt>Mínimo</dt><dd>' + pxf(loV) + '</dd></div>' +
      '<div><dt>Volumen</dt><dd>' + (vs > 0 ? mkVol(vs) : '-') + '</dd></div>';
  }
  box._geo = { S, r, base, X, Y, pw, n, tf };
  if (!box._bound) {
    box._bound = true;
    const move = e => {
      const g = box._geo; if (!g) return;
      const rc = box.getBoundingClientRect();
      const x = Math.max(0, Math.min(g.pw, e.clientX - rc.left));
      const i = Math.round(x / g.pw * (g.n - 1));
      const xh = box.querySelector('.xh'); if (!xh) return;
      xh.style.display = '';
      const px = g.X(i).toFixed(1), py = g.Y(g.S.c[i]).toFixed(1);
      const v = box.querySelector('.xhv'); v.setAttribute('x1', px); v.setAttribute('x2', px);
      const h = box.querySelector('.xhh'); h.setAttribute('y1', py); h.setAttribute('y2', py);
      const c = box.querySelector('.xhc'); c.setAttribute('cx', px); c.setAttribute('cy', py);
      const tg = box.querySelector('.mk-cur'); if (tg) { tg.style.display = ''; tg.style.top = py + 'px'; tg.textContent = g.tf(g.S.c[i]); }
      const sb = $('#mktSub'); if (sb) sb.innerHTML = mkSub(g.S, g.r, g.base, i);
    };
    const reset = () => {
      const g = box._geo; if (!g) return;
      const xh = box.querySelector('.xh'); if (xh) xh.style.display = 'none';
      const tg = box.querySelector('.mk-cur'); if (tg) tg.style.display = 'none';
      const sb = $('#mktSub'); if (sb) sb.innerHTML = mkSub(g.S, g.r, g.base, g.n - 1);
    };
    box.addEventListener('pointerdown', move);
    box.addEventListener('pointermove', move);
    box.addEventListener('pointerleave', reset);
    box.addEventListener('pointercancel', reset);
    box.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') reset(); });
  }
}

/* =========================================================
   Hoja lateral / inferior con física de muelle
   ========================================================= */
const SH = { stack: [], open: false, anim: null, pos: 0, trigger: null };
function spring(from, to, v0, opt, onUpdate, onDone) {
  const response = opt.response || 0.4, damping = opt.damping == null ? 1 : opt.damping;
  const k = Math.pow(2 * Math.PI / response, 2), c = 4 * Math.PI * damping / response;
  let x = from, v = v0 || 0, last = performance.now(), raf = 0, stopped = false;
  const step = now => {
    if (stopped) return;
    const dt = Math.min(0.064, Math.max(0, (now - last) / 1000)); last = now;
    const N = 8, hh = dt / N;
    for (let i = 0; i < N; i++) { const acc = -k * (x - to) - c * v; v += acc * hh; x += v * hh; }
    if (Math.abs(x - to) < 0.4 && Math.abs(v) < 8) { onUpdate(to); if (onDone) onDone(); return; }
    onUpdate(x); raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return { stop() { stopped = true; cancelAnimationFrame(raf); } };
}
const project = (v, r) => { r = r || 0.998; return (v / 1000) * r / (1 - r); };
const rubber = (o, d) => (o * d * 0.55) / (d + 0.55 * o);
function sheetDim() { const el = $('#sheet'); return isDesk() ? el.offsetWidth + 24 : el.offsetHeight + 12; }
function setSheetPos(p) {
  SH.pos = p;
  const el = $('#sheet');
  el.style.transform = isDesk() ? 'translate3d(' + p + 'px,0,0)' : 'translate3d(0,' + p + 'px,0)';
  const dim = sheetDim() || 1;
  $('#scrim').style.opacity = String(Math.max(0, Math.min(1, 1 - p / dim)));
}
function animateSheet(to, v0, opt, done) {
  if (SH.anim) SH.anim.stop();
  SH.anim = spring(SH.pos, to, v0, opt, setSheetPos, done);
}
function openSheet(view, push) {
  if (!SH.open) {
    SH.stack = [view];
    SH.trigger = document.activeElement;
    const el = $('#sheet'), sc = $('#scrim');
    const wasHidden = el.hidden;
    el.hidden = false; sc.hidden = false;
    if (wasHidden) el.style.transform = isDesk() ? 'translate3d(110%,0,0)' : 'translate3d(0,110%,0)';
    paintSheet(true);
    SH.open = true;
    document.documentElement.style.overflow = 'hidden';
    if (RM.matches) { setSheetPos(0); }
    else { if (wasHidden) SH.pos = sheetDim(); animateSheet(0, 0, { response: 0.42, damping: 1 }); }
    try { el.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
    return;
  }
  if (push) SH.stack.push(view); else SH.stack[SH.stack.length - 1] = view;
  paintSheet(true);
}
function paintSheet(focus) {
  const v = SH.stack[SH.stack.length - 1]; if (!v) return;
  const body = $('#sheetBody');
  body.innerHTML = v.fn.apply(null, v.args || []);
  if (focus) {
    body.scrollTop = 0;
    const f = body.querySelector('[autofocus]');
    if (f && isDesk()) { try { f.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }
  }
  if (v.after) v.after();
  applyLogos();
}
function sheetBack() { if (SH.stack.length > 1) { SH.stack.pop(); paintSheet(true); } else closeSheet(); }
function closeSheet(v0) {
  if (!SH.open) return;
  SH.open = false;
  const done = () => {
    $('#sheet').hidden = true; $('#scrim').hidden = true; $('#sheetBody').innerHTML = '';
    SH.stack = []; document.documentElement.style.overflow = '';
    if (SH.trigger && SH.trigger.isConnected && SH.trigger.focus) { try { SH.trigger.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }
  };
  if (RM.matches) { if (SH.anim) SH.anim.stop(); done(); return; }
  animateSheet(sheetDim(), v0 || 0, { response: 0.34, damping: 1 }, done);
}
function refreshOpenSheet(force) {
  if (!SH.open) return;
  const v = SH.stack[SH.stack.length - 1]; if (!v || (!v.live && !force)) return;
  const ae = document.activeElement;
  if (ae && $('#sheet').contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) return;
  if (force && !v.live && $('#sheet').querySelector('input:not([type=hidden]), textarea')) return;
  const body = $('#sheetBody'); const st = body.scrollTop;
  paintSheet(false); body.scrollTop = st;
}
const topCtx = () => { const v = SH.stack[SH.stack.length - 1]; return (v && v.args && v.args[0]) || {}; };
function initDrag() {
  const sheet = $('#sheet');
  let drag = null;
  sheet.addEventListener('pointerdown', e => {
    if (isDesk() || !SH.open) return;
    const h = e.target.closest('.sheet-grip, .sh-head');
    if (!h || e.target.closest('button, input, select, a, textarea')) return;
    if (SH.anim) SH.anim.stop();
    drag = { id: e.pointerId, y0: e.clientY, p0: SH.pos, pts: [[e.timeStamp, e.clientY]] };
    try { sheet.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ }
  });
  sheet.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    let p = drag.p0 + (e.clientY - drag.y0);
    if (p < 0) p = -rubber(-p, 300);
    setSheetPos(p);
    drag.pts.push([e.timeStamp, e.clientY]); if (drag.pts.length > 6) drag.pts.shift();
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const pts = drag.pts; drag = null;
    const a = pts[0], b = pts[pts.length - 1];
    const dt = (b[0] - a[0]) / 1000;
    const vel = dt > 0 ? (b[1] - a[1]) / dt : 0;
    if (SH.pos + project(vel) > sheetDim() * 0.45) closeSheet(vel);
    else animateSheet(0, vel, { response: 0.38, damping: Math.abs(vel) > 300 ? 0.85 : 1 });
  };
  sheet.addEventListener('pointerup', end);
  sheet.addEventListener('pointercancel', end);
}

/* =========================================================
   Aviso flotante con deshacer
   ========================================================= */
let toastT = 0;
function toast(msg, action) {
  const t = $('#toast'); clearTimeout(toastT);
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (action ? '<button type="button" id="toastBtn">' + esc(action.label) + '</button>' : '');
  t.classList.toggle('solo', !action); t.hidden = false;
  if (action) $('#toastBtn').onclick = () => { t.hidden = true; action.fn(); };
  toastT = setTimeout(() => { t.hidden = true; }, action ? 6500 : 4200);
}
function snap(id) { const d = D().get(id); return [id, d ? clone(d) : null]; }
function withUndo(msg, before) {
  toast(msg, { label: 'Deshacer', fn: () => { for (const [id, doc] of before) { if (doc) put(clone(doc)); else remove(id); } toast('Hecho, cambio deshecho'); } });
}

/* =========================================================
   Hojas: piezas comunes
   ========================================================= */
function head(title) {
  const back = SH.stack.length > 1;
  const left = back ? '<button class="iconbtn" data-action="sheet-back" aria-label="Atrás">' + IC.back + '</button>' : '<button class="iconbtn" data-action="sheet-close" aria-label="Cerrar">' + IC.close + '</button>';
  return '<div class="sh-head">' + left + '<h2>' + esc(title) + '</h2>' + (back ? '<button class="iconbtn" data-action="sheet-close" aria-label="Cerrar">' + IC.close + '</button>' : '<span></span>') + '</div>';
}
function shGone() { return head('No disponible') + '<p class="empty-small">Este elemento ya no existe.</p>'; }
function shLoading(msg) { return head('Un momento') + '<div class="loading-box"><span class="spin"></span>' + esc(msg) + '</div>'; }
function chosenHTML(a) {
  const t = TYPES[typeOf(a)];
  const px = priceEUR(a);
  return '<div class="chosen"><span class="badge" style="--k:var(' + t.k + ')">' + esc(badgeTxt(a)) + '</span><div class="tx"><strong>' + esc(a.name) + '</strong><small>' + esc([a.symbol || 'Sin ticker', t.l].join(' · ')) + '</small></div>' +
    '<div class="num" style="text-align:right">' + (px != null ? pxf(px) : '<span class="faint">Sin precio</span>') + '</div></div>';
}
function ferr(f, id, msg) { const el = f.querySelector('#' + id); if (el) { el.textContent = msg || ''; el.hidden = !msg; } return false; }
function typeOptions(sel) { return TYPE_ORDER.map(k => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + TYPES[k].l + '</option>').join(''); }

/* ---------- Añadir */
function openAdd(tab) {
  AD.tab = tab || 'inv'; AD.q = ''; AD.cashMode = null;
  openSheet({ fn: shAdd, title: 'Añadir' });
}
function shAdd() {
  const t = AD.tab;
  const tabs = [['inv', 'Inversión'], ['cash', 'Liquidez']];
  return head('Añadir') +
    '<div class="seg full" role="tablist">' + tabs.map(x => '<button role="tab" data-action="add-tab" data-k="' + x[0] + '" aria-selected="' + (t === x[0]) + '">' + x[1] + '</button>').join('') + '</div>' +
    '<div>' + (t === 'inv' ? addInvPane() : addCashPane()) + '</div>';
}
function addInvPane() {
  return '<form class="form" data-form="search" style="margin-top:18px" novalidate>' +
    '<div class="fld"><label class="lbl" for="f-q">Buscar acción, ETF, fondo o cripto</label>' +
    '<div class="inline"><input class="field" id="f-q" name="q" value="' + esc(AD.q) + '" placeholder="Nombre, ticker o ISIN" autocomplete="off" autofocus enterkeyhint="search"></div>' +
    '<p class="help">Busca entre tus activos y sugerencias, o añádelo a mano más abajo.</p></div>' +
    '</form>' +
    '<div id="results">' + resultsHTML() + '</div>' +
    '<p style="margin-top:14px"><button class="linkbtn" data-action="manual-asset">¿No aparece? Añadir a mano</button></p>';
}
function resRow(src, i, name, sub, type) {
  const t = TYPES[type] || TYPES.other;
  return '<button class="res" data-action="pick" data-src="' + src + '" data-i="' + i + '"><span style="min-width:0"><strong>' + esc(name) + '</strong><small>' + esc(sub) + '</small></span><span class="pill" style="color:var(' + t.k + ');background:color-mix(in srgb,var(' + t.k + ') 13%,transparent)">' + t.l + '</span></button>';
}
const group = (title, rows) => '<div class="res-group"><h4>' + esc(title) + '</h4>' + rows.join('') + '</div>';
function resultsHTML() {
  const q = AD.q.trim().toLowerCase();
  const match = xs => !q || xs.some(x => String(x || '').toLowerCase().includes(q));
  AD.mine = q ? all('asset').filter(a => match([a.name, a.symbol, a.isin])).slice(0, 5) : [];
  AD.cat = CATALOG.filter(c => match([c.name, c.symbol, c.isin])).slice(0, q ? 8 : 12);
  let h = '';
  if (AD.mine.length) h += group('En tu cartera', AD.mine.map((a, i) => resRow('mine', i, a.name, [a.symbol, TYPES[typeOf(a)].l].filter(Boolean).join(' · '), typeOf(a))));
  if (AD.cat.length) h += group(q ? 'Sugerencias' : 'Populares', AD.cat.map((c, i) => resRow('cat', i, c.name, [c.symbol || c.isin, c.exch].filter(Boolean).join(' · '), c.type)));
  if (!h) h = '<p class="empty-small">Nada en las sugerencias. Añádelo a mano más abajo.</p>';
  return h;
}
function paintResults() { const r = $('#results'); if (r) r.innerHTML = resultsHTML(); }
function shManual() {
  return head('Añadir a mano') +
    '<form class="form" data-form="manual" style="margin-top:8px" novalidate>' +
    '<div class="fld"><label class="lbl" for="m-name">Nombre</label><input class="field" id="m-name" name="name" placeholder="Ej. Fondo de mi banco" autofocus maxlength="80"></div>' +
    '<div class="f-row"><div class="fld"><label class="lbl" for="m-type">Tipo</label><select class="field" id="m-type" name="type">' + typeOptions('fund') + '</select></div>' +
    '<div class="fld"><label class="lbl" for="m-sym">Ticker (opcional)</label><input class="field" id="m-sym" name="symbol" placeholder="Ej. SAN.MC" autocapitalize="characters" maxlength="24"></div></div>' +
    '<div class="fld"><label class="lbl" for="m-isin">ISIN (opcional)</label><input class="field" id="m-isin" name="isin" placeholder="Ej. IE00B03HD191" autocapitalize="characters" maxlength="12"></div>' +
    '<div class="fld"><label class="lbl" for="m-price">Precio actual por participación (€)</label><input class="field" id="m-price" name="price" inputmode="decimal" placeholder="0,00"><p class="help">Puedes cambiarlo cuando quieras desde la ficha del activo.</p></div>' +
    '<p class="help err" id="manErr" hidden></p>' +
    '<button class="btn primary wide" type="submit">Continuar</button></form>';
}
function addCashPane() {
  const accs = all('cash');
  const mode = accs.length ? (AD.cashMode || 'move') : 'new';
  return (accs.length ? '<div class="chips" style="margin-top:18px"><button class="chip" data-action="cash-mode" data-m="move" aria-pressed="' + (mode === 'move') + '">Ingreso o retirada</button><button class="chip" data-action="cash-mode" data-m="new" aria-pressed="' + (mode === 'new') + '">Nueva cuenta</button></div>' : '') +
    (mode === 'new' ? cashNewForm() : cashMoveForm(null, accs));
}
function cashNewForm() {
  return '<form class="form" data-form="cashNew" style="margin-top:18px" novalidate>' +
    '<div class="fld"><label class="lbl" for="c-name">Nombre de la cuenta</label><input class="field" id="c-name" name="name" placeholder="Ej. Cuenta remunerada" maxlength="60" autofocus></div>' +
    '<div class="f-row keep"><div class="fld"><label class="lbl" for="c-apy">TAE (%)</label><input class="field" id="c-apy" name="apy" inputmode="decimal" placeholder="2,25"></div>' +
    '<div class="fld"><label class="lbl" for="c-bal">Saldo (€)</label><input class="field" id="c-bal" name="bal" inputmode="decimal" placeholder="0,00"></div></div>' +
    '<div class="fld"><label class="lbl" for="c-date">Fecha de ese saldo</label><input class="field" type="date" id="c-date" name="date" value="' + todayStr() + '" max="' + todayStr() + '"><p class="help">Con una fecha pasada, los intereses se calculan desde ese día.</p></div>' +
    '<p class="help err" id="cashErr" hidden></p>' +
    '<button class="btn primary wide" type="submit">Crear cuenta</button></form>';
}
function cashMoveForm(cashId, accs) {
  return '<form class="form" data-form="cashMove" data-cash="' + esc(cashId || '') + '" style="margin-top:18px" novalidate>' +
    (cashId ? '' : '<div class="fld"><label class="lbl" for="cm-acc">Cuenta</label><select class="field" id="cm-acc" name="acc">' + accs.map(c => '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>').join('') + '</select></div>') +
    '<div class="f-row keep"><div class="fld"><label class="lbl" for="cm-dir">Tipo</label><select class="field" id="cm-dir" name="dir"><option value="in">Ingreso</option><option value="out">Retirada</option></select></div>' +
    '<div class="fld"><label class="lbl" for="cm-amt">Importe (€)</label><input class="field" id="cm-amt" name="amount" inputmode="decimal" placeholder="0,00"></div></div>' +
    '<div class="f-row keep"><div class="fld"><label class="lbl" for="cm-date">Fecha</label><input class="field" type="date" id="cm-date" name="date" value="' + todayStr() + '" max="' + todayStr() + '"></div>' +
    '<div class="fld"><label class="lbl" for="cm-note">Nota</label><input class="field" id="cm-note" name="note" maxlength="80" placeholder="Opcional"></div></div>' +
    '<p class="help err" id="moveErr" hidden></p>' +
    '<button class="btn primary wide" type="submit">Guardar movimiento</button></form>';
}

/* ---------- Operación de compra o venta */
function txAsset(ctx) { return ctx.assetId ? D().get(ctx.assetId) : ctx.draft; }
function priceHelp(a, date, pref, tx) {
  if (tx) return 'Precio guardado en la operación.';
  if (pref && pref.exact) return 'Cierre del ' + datef(pref.from) + ': ' + pxf(pref.price) + '. Cámbialo si pagaste otro precio.';
  if (pref) return 'Precio actual: ' + pxf(pref.price) + '. Si compraste otro día, escribe tu precio.';
  return 'Escribe el precio al que compraste.';
}
function shTx(ctx) {
  const a = txAsset(ctx); if (!a) return shGone();
  const tx = ctx.txId ? (a.txs || []).find(t => t.id === ctx.txId) : null;
  if (ctx.txId && !tx) return shGone();
  const side = ctx.side || (tx && tx.side) || 'buy';
  const date = (tx && tx.date) || ctx.date || todayStr();
  const pref = tx ? null : priceOn(a, date);
  const price = tx ? tx.price : (ctx.price != null ? ctx.price : (pref && pref.price));
  const qty = tx ? tx.qty : null, fees = tx ? tx.fees : null;
  const total = tx && okNum(tx.amount) ? tx.amount : null;
  const isNewAsset = !ctx.assetId;
  return head(tx ? 'Editar operación' : 'Nueva operación') +
    chosenHTML(a) +
    '<form class="form" data-form="tx" style="margin-top:16px" novalidate>' +
      '<div class="seg full" role="radiogroup" aria-label="Tipo de operación"><button type="button" role="radio" data-action="tx-side" data-v="buy" aria-selected="' + (side === 'buy') + '" aria-checked="' + (side === 'buy') + '">Compra</button><button type="button" role="radio" data-action="tx-side" data-v="sell" aria-selected="' + (side === 'sell') + '" aria-checked="' + (side === 'sell') + '"' + (isNewAsset ? ' disabled' : '') + '>Venta</button></div>' +
      '<input type="hidden" name="side" value="' + side + '">' +
      '<div class="f-row keep"><div class="fld"><label class="lbl" for="f-date">Fecha</label><input class="field" type="date" id="f-date" name="date" value="' + esc(date) + '" max="' + todayStr() + '"></div>' +
      '<div class="fld"><label class="lbl" for="f-qty">Participaciones</label><input class="field" id="f-qty" name="qty" inputmode="decimal" autocomplete="off" value="' + numIn(qty, 8) + '" placeholder="0" autofocus></div></div>' +
      '<div class="f-row keep"><div class="fld"><label class="lbl" for="f-price">Precio unitario (€)</label><input class="field" id="f-price" name="price" inputmode="decimal" autocomplete="off" value="' + numIn(price, 4) + '" placeholder="0,00"' + (tx ? ' data-touched="1"' : '') + '></div>' +
      '<div class="fld"><label class="lbl" for="f-fees">Comisión (€)</label><input class="field" id="f-fees" name="fees" inputmode="decimal" autocomplete="off" value="' + numIn(fees, 2) + '" placeholder="0,00"></div></div>' +
      '<p class="help" id="priceHelp">' + priceHelp(a, date, pref, tx) + '</p>' +
      '<div class="fld"><label class="lbl" for="f-total" id="totalLbl">' + (side === 'sell' ? 'Total recibido (€)' : 'Total pagado (€)') + '</label><input class="field" id="f-total" name="total" inputmode="decimal" autocomplete="off" value="' + numIn(total, 2) + '" placeholder="0,00"><p class="help">Si escribes el total, calculo las participaciones con el precio.</p></div>' +
      '<div class="fld"><label class="lbl" for="f-note">Nota (opcional)</label><input class="field" id="f-note" name="note" value="' + esc(tx && tx.note || '') + '" maxlength="120"></div>' +
      '<p class="help err" id="txErr" hidden></p>' +
      '<button class="btn primary wide" type="submit" id="txSubmit">' + (tx ? 'Guardar cambios' : side === 'sell' ? 'Guardar venta' : 'Guardar compra') + '</button>' +
    '</form>';
}
function daysPicker(days) {
  return '<div class="days" role="group" aria-label="Días del mes">' + Array.from({ length: 31 }, (_, i) => '<button type="button" data-action="day" data-d="' + (i + 1) + '" aria-pressed="' + days.includes(i + 1) + '">' + (i + 1) + '</button>').join('') + '</div>' +
    '<input type="hidden" name="days" value="' + days.join(',') + '"><p class="help">Puedes marcar varios. Si un mes no tiene ese día, se usa el último.</p>';
}
function txRecalc(f, src) {
  const el = f.elements;
  const q = parseNum(el.qty.value), p = parseNum(el.price.value), fe = parseNum(el.fees.value) || 0, sell = el.side.value === 'sell';
  if (src === 'total') {
    const tot = parseNum(el.total.value);
    if (p > 0 && isFinite(tot)) { const qq = sell ? (tot + fe) / p : (tot - fe) / p; el.qty.value = qq > 0 ? numIn(qq, 6) : ''; }
    return;
  }
  if (q > 0 && p > 0) el.total.value = numIn(sell ? q * p - fe : q * p + fe, 2);
}
function txDateChanged(f) {
  const ctx = topCtx(); const a = txAsset(ctx); if (!a) return;
  const date = f.elements.date.value;
  ctx.date = date;
  if (ctx.txId || !validDate(date)) return;
  const pref = priceOn(a, date);
  const pr = f.elements.price;
  if (!pr.dataset.touched && pref && pref.price > 0) { pr.value = numIn(pref.price, 4); txRecalc(f, 'price'); }
  const h = $('#priceHelp'); if (h) h.innerHTML = priceHelp(a, date, pref, null);
}

/* ---------- Ficha de activo */
function shBroker(id) {
  const a = t212Assets().find(x => x.id === id) || trAssets().find(x => x.id === id);
  if (!a) return shGone();
  const srcName = a.source === 't212' ? 'Trading 212' : 'Trade Republic';
  const qty = a.vQty || 0, cost = a.vCost, value = a.vValue, pnl = a.vPpl;
  const pnlPct = cost && cost > 0 ? pnl / cost : 0;
  return head(a.name) +
    '<p class="help" style="margin-top:6px"><span class="pill src">' + esc(srcName) + '</span> Solo lectura · se sincroniza al actualizar el broker.</p>' +
    '<div class="asset-head"><span class="badge" style="--k:var(' + (a.source === 't212' ? '--k-t212' : '--k-tr') + ')"><span>' + esc(badgeTxt(a)) + '</span><img class="logo" data-isin="' + esc(a.isin || '') + '" alt=""></span><div style="min-width:0"><p class="label" style="margin:0">' + esc(a.symbol || a.isin || '') + '</p><p class="big2 money">' + pxf(a.price) + '</p></div></div>' +
    '<div class="subline" id="mktSub"></div>' +
    '<div class="chart-wrap"><div class="chart" id="mktChart" style="height:300px" aria-label="Evolución del precio de ' + esc(a.name) + '"></div></div>' +
    '<div class="chart-foot"><span class="help" style="margin:0">Precio del activo en el mercado, no tu cartera.</span>' +
    '<div class="seg small" role="tablist" id="mktTabs" aria-label="Periodo">' + MK_RANGES.map(x => '<button role="tab" data-action="mkt-range" data-r="' + x[0] + '" aria-selected="' + (MK.range === x[0]) + '">' + x[1] + '</button>').join('') + '</div></div>' +
    '<dl class="rstats" id="mktStats"></dl>' +
    '<dl class="stats">' +
      '<div><dt>Participaciones</dt><dd>' + qtyf(qty) + '</dd></div>' +
      '<div><dt>Precio actual</dt><dd>' + pxf(a.price) + '</dd></div>' +
      '<div><dt>Invertido</dt><dd>' + eur(cost) + '</dd></div>' +
      '<div><dt>Valor actual</dt><dd>' + eur(value) + '</dd></div>' +
      '<div><dt>Rentabilidad</dt><dd class="' + cls(pnl || 0) + '">' + seur(pnl) + '<br><small>' + pct(pnlPct) + '</small></dd></div>' +
      (a.isin ? '<div><dt>ISIN</dt><dd>' + esc(a.isin) + '</dd></div>' : '') +
    '</dl>';
}
function shAsset(id) {
  const a = D().get(id); if (!a) return shGone();
  const p = calcPos(a); const t = TYPES[typeOf(a)];
  const plans = all('plan').filter(x => x.targetId === id);
  const txs = txsOf(a).reverse();
  const dayPct = (a.price > 0 && a.prev > 0) ? a.price / a.prev - 1 : null;
  const q = encodeURIComponent((a.isin || a.symbol || a.name) + ' cotización');
  return head(a.name) +
    '<div class="asset-head"><span class="badge" style="--k:var(' + t.k + ')"><span>' + esc(badgeTxt(a)) + '</span><img class="logo" data-isin="' + esc(a.isin || '') + '" alt=""></span><div style="min-width:0"><p class="label" style="margin:0">' + esc(a.symbol || 'Sin ticker') + '</p><p class="big2 money">' + pxf(priceEUR(a)) + '</p></div></div>' +
    '<div class="subline">' + (dayPct != null ? '<span class="delta ' + cls(dayPct) + '">' + pct(dayPct) + '</span><span class="faint">hoy</span>' : '') + '<span class="pill">' + t.l + '</span>' + (curOf(a) !== 'EUR' ? '<span class="pill">Cotiza en ' + esc(a.currency) + '</span>' : '') + (a.priceAt ? '<span class="faint">' + (a.manualAt && a.manualAt === a.priceAt ? 'Precio manual ' : 'Actualizado ') + ago(a.priceAt) + '</span>' : '') + '</div>' +
    '<div class="mini" id="miniChart"></div>' +
    (a.hist && a.hist.c && a.hist.c.length > 1 ? '<p class="help">Puntos: tus compras y ventas. Línea discontinua: tu precio medio.</p>' : '') +
    '<dl class="stats">' +
      '<div><dt>Participaciones</dt><dd>' + qtyf(p.qty) + '</dd></div>' +
      '<div><dt>Precio medio</dt><dd>' + pxf(p.avg) + '</dd></div>' +
      '<div><dt>Invertido</dt><dd>' + eur(p.cost) + '</dd></div>' +
      '<div><dt>Valor actual</dt><dd>' + eur(p.value) + '</dd></div>' +
      '<div><dt>Rentabilidad</dt><dd class="' + cls(p.pnl) + '">' + seur(p.pnl) + '<br><small>' + pct(p.pnlPct) + '</small></dd></div>' +
      '<div><dt>Ganancia realizada</dt><dd class="' + cls(p.realized) + '">' + seur(p.realized) + '</dd></div>' +
    '</dl>' +
    ((p.pendN || p.estN) ? '<div class="banner-in warn" style="margin-top:14px"><span>' + [p.pendN ? p.pendN + ' sin precio' : '', p.estN ? p.estN + ' con precio aproximado' : ''].filter(Boolean).join(' y ') + '.</span></div>' : '') +
    '<div class="card-actions" style="margin-top:16px"><button class="btn primary sm" data-action="tx-new" data-id="' + esc(id) + '">' + IC.plus + 'Operación</button></div>' +
    '<section class="sh-sec"><h3>Operaciones</h3>' + (txs.length ? '<ul class="tx-list">' + txs.map(x => txItem(a, x)).join('') + '</ul>' : '<p class="empty-small">Sin operaciones.</p>') + '</section>' +
    (plans.length ? '<section class="sh-sec"><h3>Planes de este activo</h3><ul class="simple-list">' + plans.map(pl => '<li><div class="l"><strong>' + eur(pl.amount) + '</strong><small>' + esc(daysText(pl.days)) + (pl.active ? '' : ', en pausa') + '</small></div><button class="btn ghost sm" data-action="edit-plan" data-id="' + esc(pl.id) + '">Editar</button></li>').join('') + '</ul></section>' : '') +
    '<section class="sh-sec"><h3>Datos del activo</h3><form class="form" data-form="assetEdit" data-id="' + esc(id) + '" novalidate>' +
      '<div class="fld"><label class="lbl" for="e-name">Nombre</label><input class="field" id="e-name" name="name" value="' + esc(a.name) + '" maxlength="80"></div>' +
      '<div class="f-row"><div class="fld"><label class="lbl" for="e-type">Tipo</label><select class="field" id="e-type" name="type">' + typeOptions(typeOf(a)) + '</select></div>' +
      '<div class="fld"><label class="lbl" for="e-sym">Ticker</label><input class="field" id="e-sym" name="symbol" value="' + esc(a.symbol || '') + '" placeholder="Ej. IWDA.AS" maxlength="24" autocapitalize="characters"></div></div>' +
      '<div class="f-row"><div class="fld"><label class="lbl" for="e-isin">ISIN</label><input class="field" id="e-isin" name="isin" value="' + esc(a.isin || '') + '" maxlength="12" autocapitalize="characters"></div>' +
      '<div class="fld"><label class="lbl" for="e-mprice">Poner precio a mano (€)</label><input class="field" id="e-mprice" name="mprice" inputmode="decimal" placeholder="' + esc(numIn(priceEUR(a), 4) || '0,00') + '"></div></div>' +
      '<button class="btn ghost" type="submit">Guardar datos</button></form>' +
      '<div class="links" style="margin-top:14px">' + '<a class="linkbtn" href="https://www.google.com/search?q=' + q + '" target="_blank" rel="noopener">Buscar en Google' + IC.ext + '</a></div>' +
    '</section>' +
    '<section class="sh-sec"><button class="btn danger wide" data-action="asset-del" data-id="' + esc(id) + '">Eliminar activo</button><p class="help" style="margin-top:8px">Se borran también sus operaciones y planes. Podrás deshacerlo.</p></section>';
}
function txItem(a, x) {
  const flags = [];
  if (x.plan) flags.push('<span class="pill acc">Plan</span>');
  if (x.pending) flags.push('<span class="pill warn">Sin precio</span>');
  else if (x.est) flags.push('<span class="pill warn">Precio aproximado</span>');
  const detail = x.pending ? datef(x.date) + ', pendiente de precio' : datef(x.date) + ' · ' + qtyf(x.qty) + ' a ' + pxf(x.price);
  return '<li><div class="l"><strong>' + (x.side === 'sell' ? 'Venta' : 'Compra') + flags.join('') + '</strong><small>' + detail + '</small></div>' +
    '<div class="r num ' + (x.side === 'sell' ? 'up' : '') + '">' + (x.side === 'sell' ? '+' : '') + eur(x.amount) + '</div>' +
    '<div class="acts"><button class="iconbtn" data-action="tx-edit" data-a="' + esc(a.id) + '" data-t="' + esc(x.id) + '" aria-label="Editar operación">' + IC.edit + '</button><button class="iconbtn" data-action="tx-del" data-a="' + esc(a.id) + '" data-t="' + esc(x.id) + '" aria-label="Eliminar operación">' + IC.trash + '</button></div></li>';
}

/* ---------- Ficha de cuenta */
function shCash(id) {
  const c = D().get(id); if (!c) return shGone();
  const r = cashCalc(c);
  const month = r.bal > 0 ? r.bal * (Math.pow(1 + r.apy / 100, 30 / 365) - 1) : 0;
  const rates = (c.rates || []).map((x, i) => Object.assign({ i }, x)).sort((a, b) => a.from < b.from ? 1 : -1);
  const moves = dedupeSort(c.moves).reverse();
  return head(c.name) +
    '<p class="label" style="margin-top:6px">Saldo hoy</p><p class="big2 money">' + eur(r.bal) + '</p>' +
    '<div class="subline"><span class="pill acc">TAE ' + NP.format(r.apy) + ' %</span><span class="delta ' + cls(r.interest) + '">' + seur(r.interest) + '</span><span class="faint">de intereses</span></div>' +
    '<div class="mini" id="miniChart"></div>' +
    '<dl class="stats"><div><dt>Aportado neto</dt><dd>' + eur(r.principal) + '</dd></div><div><dt>Próximo mes</dt><dd>' + eur(month) + '</dd></div><div><dt>En un año</dt><dd>' + eur(r.bal > 0 ? r.bal * r.apy / 100 : 0) + '</dd></div></dl>' +
    '<section class="sh-sec"><h3>Ingresar o retirar</h3>' + cashMoveForm(id, []).replace('style="margin-top:18px"', '') + '</section>' +
    '<section class="sh-sec"><h3>TAE</h3><ul class="simple-list">' + rates.map(x => '<li><div class="l"><strong>' + NP.format(+x.apy || 0) + ' %</strong><small>Desde el ' + datef(x.from) + '</small></div>' + (rates.length > 1 ? '<button class="iconbtn" data-action="rate-del" data-c="' + esc(id) + '" data-i="' + x.i + '" aria-label="Quitar este tipo">' + IC.trash + '</button>' : '') + '</li>').join('') + '</ul>' +
      '<form class="form" data-form="rate" data-cash="' + esc(id) + '" style="margin-top:10px" novalidate><div class="f-row keep"><div class="fld"><label class="lbl" for="r-apy">Nueva TAE (%)</label><input class="field" id="r-apy" name="apy" inputmode="decimal" placeholder="2,00"></div>' +
      '<div class="fld"><label class="lbl" for="r-from">Desde</label><input class="field" type="date" id="r-from" name="from" value="' + todayStr() + '"></div></div><p class="help err" id="rateErr" hidden></p><button class="btn ghost" type="submit">Cambiar TAE</button></form></section>' +
    '<section class="sh-sec"><h3>Movimientos</h3>' + (moves.length ? '<ul class="tx-list">' + moves.map(m => '<li><div class="l"><strong>' + (m.amount >= 0 ? 'Ingreso' : 'Retirada') + (m.plan ? '<span class="pill acc">Plan</span>' : '') + '</strong><small>' + datef(m.date) + (m.note && !m.plan ? ', ' + esc(m.note) : '') + '</small></div><div class="r num ' + (m.amount >= 0 ? '' : 'down') + '">' + seur(+m.amount) + '</div><div class="acts"><button class="iconbtn" data-action="move-del" data-c="' + esc(id) + '" data-m="' + esc(m.id) + '" aria-label="Eliminar movimiento">' + IC.trash + '</button></div></li>').join('') + '</ul>' : '<p class="empty-small">Sin movimientos.</p>') + '</section>' +
    '<section class="sh-sec"><h3>Cuenta</h3><form class="form" data-form="cashEdit" data-id="' + esc(id) + '" novalidate><div class="inline"><input class="field" id="ce-name" name="name" value="' + esc(c.name) + '" aria-label="Nombre de la cuenta" maxlength="60"><button class="btn ghost" type="submit" style="height:46px">Renombrar</button></div></form>' +
      '<button class="btn danger wide" style="margin-top:16px" data-action="cash-del" data-id="' + esc(id) + '">Eliminar cuenta</button></section>';
}

/* ---------- Plan */
function shPlan(ctx) { return head(ctx.planId ? 'Editar plan' : 'Nuevo plan mensual') + planFormHTML(ctx); }
function planFormHTML(ctx) {
  const plan = ctx.planId ? D().get(ctx.planId) : null;
  const assets = all('asset'), accs = all('cash');
  if (!assets.length && !accs.length) return '<div class="empty" style="padding:24px 0"><p>Primero añade una inversión o una cuenta de liquidez. Después podrás programar aportaciones mensuales.</p><div class="btns"><button class="btn primary" data-action="add-tab" data-k="inv">Añadir inversión</button><button class="btn ghost" data-action="add-tab" data-k="cash">Añadir liquidez</button></div></div>';
  const tgt = (plan && plan.targetId) || ctx.targetId || '';
  const days = (plan && plan.days) || [1];
  return '<form class="form" data-form="plan" data-plan="' + esc(plan ? plan.id : '') + '" style="margin-top:18px" novalidate>' +
    '<div class="fld"><label class="lbl" for="p-target">Destino</label><select class="field" id="p-target" name="target">' +
      (assets.length ? '<optgroup label="Inversiones">' + assets.map(a => '<option value="' + esc(a.id) + '"' + (a.id === tgt ? ' selected' : '') + '>' + esc(a.name) + '</option>').join('') + '</optgroup>' : '') +
      (accs.length ? '<optgroup label="Liquidez">' + accs.map(c => '<option value="' + esc(c.id) + '"' + (c.id === tgt ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</optgroup>' : '') +
    '</select></div>' +
    '<div class="f-row keep"><div class="fld"><label class="lbl" for="p-amount">Importe por aportación (€)</label><input class="field" id="p-amount" name="amount" inputmode="decimal" value="' + numIn(plan && plan.amount) + '" placeholder="100"></div>' +
    '<div class="fld"><label class="lbl" for="p-fees">Comisión (€)</label><input class="field" id="p-fees" name="fees" inputmode="decimal" value="' + numIn(plan && plan.fees) + '" placeholder="0"></div></div>' +
    '<div class="fld"><span class="lbl">Días del mes</span>' + daysPicker(days) + '</div>' +
    '<div class="f-row keep"><div class="fld"><label class="lbl" for="p-start">Desde</label><input class="field" type="date" id="p-start" name="start" value="' + esc((plan && plan.start) || todayStr()) + '"></div>' +
    '<div class="fld"><label class="lbl" for="p-end">Hasta (opcional)</label><input class="field" type="date" id="p-end" name="end" value="' + esc((plan && plan.end) || '') + '"></div></div>' +
    '<p class="preview" id="planPreview">' + planPreviewText(plan, tgt || (assets[0] || accs[0]).id, days, (plan && plan.start) || todayStr(), (plan && plan.end) || '') + '</p>' +
    '<p class="help err" id="planErr" hidden></p>' +
    '<button class="btn primary wide" type="submit">' + (plan ? 'Guardar plan' : 'Crear plan') + '</button></form>';
}
function planPreviewText(plan, targetId, days, start, end) {
  if (!days.length) return 'Marca al menos un día del mes.';
  if (!validDate(start)) return 'Elige la fecha de inicio.';
  const tmp = { id: plan ? plan.id : '__nuevo', days, start, end, activeFrom: plan && plan.activeFrom, skip: plan ? plan.skip : [], target: D().get(targetId) && D().get(targetId).kind === 'cash' ? 'cash' : 'asset', targetId };
  const t = todayEd();
  const s = planStartEd(tmp), e = Math.min(t, planEndEd(tmp));
  const done = plan ? doneDates(tmp) : new Set();
  const past = planDates(tmp, s, e).filter(x => !done.has(fromEd(x)));
  const nx = nextRunEd(tmp);
  let txt = nx != null ? 'Próxima aportación: ' + datef(fromEd(nx)) + '.' : 'No quedan fechas dentro del periodo.';
  if (past.length) txt += ' Se apuntarán ' + past.length + (past.length === 1 ? ' aportación ya pasada' : ' aportaciones ya pasadas') + ', desde el ' + datef(fromEd(past[0])) + ', con el precio de cada fecha.';
  return esc(txt);
}
function updatePlanPreview(f) {
  const el = f.elements; const pv = f.querySelector('#planPreview'); if (!pv) return;
  const plan = f.dataset.plan ? D().get(f.dataset.plan) : null;
  const days = String(el.days.value || '').split(',').map(Number).filter(Boolean);
  pv.innerHTML = planPreviewText(plan, el.target.value, days, el.start.value, el.end.value);
}

/* ---------- Ajustes */
/* ¿Hay algún proveedor conectado? (Trading 212 o Trade Republic). */
function brokerState() {
  const t212 = B.proxy && (T.state === 'ok' || T.state === 'cached');
  const tr = trLocal() && (TR.state === 'ok' || TR.state === 'cached');
  return t212 || tr;
}
/* Refresca el punto verde/rojo de Ajustes (esa sección no se repinta sola). */
function updateBrokerState() {
  const ok = brokerState();
  const lbl = $('#brokerStateLbl');
  if (lbl) lbl.textContent = ok ? 'Conectado' : 'No conectado';
  const dot = $('#brokerDot');
  if (dot) {
    dot.style.background = ok ? 'var(--gain)' : 'var(--loss)';
    dot.style.boxShadow = '0 0 0 3px ' + (ok ? 'var(--gain-soft)' : 'var(--loss-soft)');
  }
}
function brokerSection() {
  const own = lsGet(LS_PROXY);
  const status = B.proxy ? 'Conectado a ' + B.proxy.replace(/^https?:\/\//, '') + (own && own.url ? ', guardado en este dispositivo.' : ', configurado en el repositorio.') : 'Sin servidor configurado. Pega la dirección y pulsa Conectar.';
  return '<section class="sh-sec"><h3>Servidor de brokers</h3>' +
    '<form class="form" data-form="proxy" novalidate><div class="fld"><label class="lbl" for="px-url">Dirección del servidor</label>' +
    '<input class="field" id="px-url" name="url" type="url" inputmode="url" autocapitalize="off" autocomplete="off" spellcheck="false" value="' + esc(B.proxy) + '" placeholder="https://nido-brokers.tu-cuenta.workers.dev"></div>' +
    '<div class="fld" style="margin-top:12px"><label class="lbl" for="px-key">Clave de acceso</label>' +
    '<div class="pw"><input class="field" id="px-key" name="key" type="password" autocomplete="off" spellcheck="false" value="' + esc(B.accessKey) + '" placeholder="Solo si tu worker la pide (secreto ACCESS_KEY)">' +
    '<button type="button" class="iconbtn" data-action="key-eye" title="Mostrar clave" aria-label="Mostrar clave" aria-pressed="false"><svg class="i" viewBox="0 0 24 24"><path d="M2 12s3.7-6.5 10-6.5S22 12 22 12s-3.7 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/><path class="eye-slash" d="M3 3l18 18" style="display:none"/></svg></button></div></div>' +
    '<p class="help" id="pxMsg">' + esc(status) + '</p>' +
    '<button class="btn primary sm" id="proxyBtn" type="submit">' + (B.proxy ? 'Desconectar' : 'Conectar') + '</button>' +
    '</form></section>';
}
/* Normaliza una posición de Trading 212 (campos reales de la API) a un activo
   virtual que el modelo puede sumar. Devuelve null si no hay datos aprovechables. */
function t212Assets() {
  const acc = T.account || {};
  const cur = acc.currency || 'EUR';
  return (T.positions || []).map(p => {
    const ins = p.instrument || {};
    const wi = p.walletImpact || {};
    const qty = p.quantity != null ? p.quantity : 0;
    const price = p.currentPrice != null ? p.currentPrice : null;
    const cost = wi.totalCost != null ? wi.totalCost : (p.averagePricePaid != null && qty ? p.averagePricePaid * qty : null);
    const value = wi.currentValue != null ? wi.currentValue : (price != null && qty != null ? price * qty : null);
    if (!ins.ticker && !ins.name) return null;
    // Curva en euros por participación: el cierre diario de Yahoo escalado para que
    // el último día coincida con el valor actual de la posición (evita líos de divisa).
    let hist = null;
    const hs = ins.isin && T2H.by[ins.isin];
    if (hs && hs.t && hs.t.length > 1 && value > 0 && qty > 0) {
      const k = (value / qty) / hs.c[hs.c.length - 1];
      if (isFinite(k) && k > 0) hist = { t: hs.t, c: hs.c.map(x => x * k) };
    }
    const since = typeof p.createdAt === 'string' && validDate(p.createdAt.slice(0, 10)) ? toEd(p.createdAt.slice(0, 10)) : null;
    return {
      id: 't212_' + (ins.ticker || ins.isin || Math.random().toString(36).slice(2, 8)),
      kind: 'asset', source: 't212', type: t212TypeOf(ins.name, ins.ticker), name: ins.name || ins.ticker,
      symbol: ins.ticker, isin: ins.isin || '', currency: ins.currency || cur,
      price: price, prev: price, txs: [], hist, since,
      vQty: qty, vCost: cost, vValue: value, vPpl: wi.unrealizedProfitLoss
    };
  }).filter(Boolean);
}
/* Clasifica un tipo de instrumento de Trade Republic a los tipos de la app. */
function trTypeOf(it) {
  const s = String(it || '').toLowerCase();
  if (/etf/.test(s)) return 'etf';
  if (/stock|share/.test(s)) return 'stock';
  if (/fund/.test(s)) return 'fund';
  if (/crypto/.test(s)) return 'crypto';
  return 'other'; // bonos, derivados, private markets...
}
/* Clasifica una posición de Trading 212 por su nombre/ticker (la API de
   posiciones no trae el tipo del instrumento). */
function t212TypeOf(name, ticker) {
  const s = String(name || '') + ' ' + String(ticker || '');
  if (/ETF|UCITS/i.test(s)) return 'etf';
  if (/\bfund\b|fondo|investment trust/i.test(s)) return 'fund';
  if (/bitcoin|ethereum|solana|xrp|cardano|dogecoin|polkadot|crypto|cripto/i.test(s)) return 'crypto';
  return 'stock';
}
function trAssets() {
  return (TR.positions || []).map(p => {
    const qty = p.netSize != null ? Number(p.netSize) : 0;
    const avg = p.averageBuyIn != null ? Number(p.averageBuyIn) : null;
    const cur = p.currency || 'EUR';
    const name = p.name || p.isin || 'Posición';
    const cost = (avg != null && qty) ? avg * qty : null;
    const price = okNum(p.currentPrice) ? Number(p.currentPrice) : avg;
    const value = okNum(p.value) ? Number(p.value) : cost;
    const ppl = okNum(p.ppl) ? Number(p.ppl) : null;
    const hh = p.isin ? TRH.by[p.isin] : null;
    let hist = hh && hh.t && hh.t.length ? { t: hh.t, c: hh.c } : null;
    if (hist && hh.y && price > 0) { // cierres de Yahoo: se escalan a euros por participación (último día = precio actual)
      const k = price / hh.c[hh.c.length - 1];
      if (isFinite(k) && k > 0) hist = { t: hh.t, c: hh.c.map(x => x * k) };
    }
    return {
      id: 'tr_' + (p.isin || Math.random().toString(36).slice(2, 8)),
      kind: 'asset', source: 'tr', type: trTypeOf(p.instrumentType), name, issuer: [p.issuer, p.fullName].filter(Boolean).join(' '), symbol: p.isin || '', isin: p.isin || '',
      currency: cur, price: price, prev: price, txs: [], hist,
      vQty: qty, vCost: cost, vValue: value, vPpl: ppl
    };
  }).filter(Boolean);
}
function t212AccountHTML() {
  const a = T.account;
  if (!a) return '';
  const rows = [];
  const perc = (v) => (typeof v === 'number' && isFinite(v)) ? (v >= 0 ? '+' : MINUS) + NP.format(Math.abs(v * 100)) + ' %' : f(v);
  const cash = a.cash || {}, inv = a.investments || {};
  if (cash.availableToTrade != null) rows.push(['Disponible', money(cash.availableToTrade)]);
  if (cash.inPies != null) rows.push(['En pies', money(cash.inPies)]);
  if (cash.reservedForOrders != null) rows.push(['Reservado', money(cash.reservedForOrders)]);
  if (inv.totalCost != null) rows.push(['Invertido', money(inv.totalCost)]);
  if (inv.currentValue != null) rows.push(['Valor inversiones', money(inv.currentValue)]);
  if (inv.unrealizedProfitLoss != null) rows.push(['P&L latente', money(inv.unrealizedProfitLoss)]);
  if (inv.realizedProfitLoss != null) rows.push(['P&L realizado', money(inv.realizedProfitLoss)]);
  if (a.totalValue != null) rows.push(['Valor total', money(a.totalValue)]);
  if (inv.currentValue != null && inv.totalCost != null && inv.totalCost > 0) rows.push(['Rentabilidad', perc(inv.unrealizedProfitLoss / inv.totalCost)]);
  if (!rows.length) return '<p class="empty-small">Resumen de cuenta no disponible.</p>';
  return '<h3>Resumen de cuenta</h3><dl class="kv">' + rows.map(r => '<dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd>').join('') + '</dl>';
}
function t212PositionsHTML() {
  const list = t212Assets();
  if (!list.length) return '<h3 style="margin-top:16px">Posiciones abiertas</h3><p class="empty-small">Sin posiciones abiertas.</p>';
  const rows = list.map(a => {
    const qty = qtyf(a.vQty);
    const avg = okNum(a.vCost) && okNum(a.vQty) ? pxf(a.vCost / (a.vQty || 1)) : '—';
    const cur = pxf(a.price);
    const ppl = okNum(a.vPpl) ? a.vPpl : null;
    return '<li><div class="l"><strong>' + esc(a.name) + '</strong><small>Media ' + esc(avg) + ' · Actual ' + esc(cur) + '</small></div><div class="r num">' + qty + '<small class="' + cls(ppl || 0) + '">' + seur(ppl) + '</small></div></li>';
  });
  return '<h3 style="margin-top:16px">Posiciones abiertas</h3><ul class="simple-list">' + rows.join('') + '</ul>';
}
function t212Section() {
  return '<section class="sh-sec" id="t212Sec"><h3>Trading 212</h3>' +
    '<div id="t212Body">' + renderT212Inner() + '</div></section>';
}
function renderT212Inner() {
  if (!B.proxy) return '';
  if (T.state === 'busy') return '<div class="loading-box" style="padding:12px 0">'+nidoSpin()+'Consultando Trading 212...</div>';
  if (T.state === 'err') return '<p class="help err">' + esc(T.err) + '</p><button class="btn ghost sm" data-action="t212-load">Reintentar</button>';
  if (T.state === 'ok' || T.state === 'cached') {
    const warn = T.err ? '<div class="banner-in warn" style="margin-bottom:10px"><span>' + esc(T.err) + '</span></div>' : '';
    const head = warn + '<div class="card-actions" style="margin-bottom:12px"><span class="pill acc">' + (T.state === 'cached' ? 'Guardado (sin conexión)' : 'Conectado') + '</span>' + (T.at ? '<span class="faint">' + ago(T.at) + '</span>' : '') + '<button class="btn ghost sm" data-action="t212-load">Actualizar</button></div>';
    return head + t212AccountHTML() + t212PositionsHTML();
  }
  return '<button class="btn primary sm" data-action="t212-load">Conectar y ver cuenta</button>';
}
function trSection() {
  if (isMobileDevice()) return ''; // Trade Republic solo se conecta desde el PC
  return '<section class="sh-sec"><h3>Trade Republic</h3>' +
    '<form class="form" data-form="trurl" novalidate><input class="field" id="tr-url" name="url" inputmode="url" autocapitalize="off" autocomplete="off" spellcheck="false" value="' + esc(TR.localUrl) + '" placeholder="http://localhost:8788">' +
    '<button class="btn primary sm" id="trBtn" type="submit">' + (trLocal() ? 'Quitar' : 'Guardar') + '</button>' +
    '</form><div id="trBody">' + renderTrInner() + '</div></section>';
}
function renderTrInner() {
  if (!trLocal()) return '';
  if (TR.state === 'busy') return '<div class="loading-box" style="padding:12px 0"><span class="spin"></span>Conectando con Trade Republic...</div>';
  if (TR.state === 'loading') return '<div class="loading-box" role="status" style="padding:12px 0"><span class="spin"></span>Cargando tu cartera de Trade Republic…</div>';
  if (TR.state === 'qr') return '<p class="help">Escanea este código QR con la app de Trade Republic para vincular.</p><p class="help">En el móvil verás «New web login attempt» con Chrome 122.0 y tu ciudad: es el servidor local de Nido en tu PC. Apruébalo en menos de 2 minutos.</p><div class="qr-box" id="qrBox"></div><button class="btn ghost sm" data-action="tr-check">Ya lo he escaneado</button>';
  if (TR.state === 'err') return '<p class="help err">' + esc(TR.err) + '</p><div class="card-actions"><button class="btn primary sm" data-action="tr-login">Vincular con QR</button><button class="btn ghost sm" data-action="tr-load">Reintentar lectura</button></div>';
  if (TR.state === 'ok' || TR.state === 'cached') {
    const warn = TR.err ? '<div class="banner-in warn" style="margin-bottom:10px"><span>' + esc(TR.err) + '</span><button class="btn sm ghost" data-action="tr-login">Vincular con QR</button></div>' : '';
    const head = warn + '<div class="card-actions" style="margin-bottom:12px"><span class="pill acc">' + (TR.state === 'cached' ? 'Guardado (sin conexión)' : 'Conectado') + '</span>' + (TR.at ? '<span class="faint">' + ago(TR.at) + '</span>' : '') + '<button class="btn ghost sm" data-action="tr-load">Actualizar</button></div>';
    return head + trHTML();
  }
  return '<button class="btn primary sm" data-action="tr-login">Vincular con QR</button>';
}
function trHTML() {
  const pos = TR.positions || [];
  let h = '';
  if (TR.cash && Array.isArray(TR.cash) && TR.cash.length) {
    h += '<h3>Efectivo</h3><dl class="kv">' + TR.cash.map(c => '<dt>' + esc(c.currency || 'EUR') + '</dt><dd>' + money(c.amount) + '</dd>').join('') + '</dl>';
  }
  if (pos.length) {
    h += '<h3 style="margin-top:16px">Posiciones</h3><ul class="simple-list">' + pos.map(p => {
      const name = p.name || p.isin || '—';
      const qty = p.netSize != null ? qtyf(Number(p.netSize)) : '—';
      const invested = okNum(p.invested) ? Number(p.invested) : (p.averageBuyIn != null && p.netSize != null ? Number(p.averageBuyIn) * Number(p.netSize) : null);
      const ppl = okNum(p.ppl) ? Number(p.ppl) : null;
      return '<li><div class="l ll">' + logoBadge(p.isin, name, '--k-tr') + '<span style="min-width:0"><strong>' + esc(name) + '</strong><small>' + (p.isin ? esc(p.isin) + ' · ' : '') + 'Invertido ' + eur(invested) + '</small></span></div><div class="r num">' + qty + '<small class="' + cls(ppl || 0) + '">' + (ppl != null ? seur(ppl) : '—') + '</small></div></li>';
    }).join('') + '</ul>';
  } else h += '<p class="empty-small">Sin posiciones.</p>';
  const plans = TR.plans || [];
  if (plans.length) {
    h += '<h3 style="margin-top:16px">Planes de ahorro</h3><ul class="simple-list">' + plans.map(p => {
      const isin = trPlanIsin(p);
      const name = p.instrumentName || (p.instrument && (p.instrument.name || p.instrument.isin)) || p.name || isin || p.instrumentId || 'Plan';
      const amount = trPlanAmount(p);
      const iv = (p.parameters && p.parameters.interval != null) ? p.parameters.interval : p.interval;
      const nx = trPlanNext(p);
      return '<li><div class="l ll">' + logoBadge(isin, name, '--k-tr') + '<span style="min-width:0"><strong>' + esc(name) + (p.paused ? ' <span class="pill warn">En pausa</span>' : '') + '</strong><small>' + esc(trIntervalLabel(iv)) + (nx ? ' · próxima ' + datefs(nx) : '') + '</small></span></div><div class="r num">' + (amount != null ? eur(amount) : '—') + '</div></li>';
    }).join('') + '</ul>';
  }
  return h;
}
function renderBrokers() {
  const b1 = $('#t212Body'); if (b1) b1.innerHTML = renderT212Inner();
  const b2 = $('#trBody'); if (b2) b2.innerHTML = renderTrInner();
  const qb = $('#qrBox'); if (qb && TR.qr) drawQR(qb, TR.qr);
  const s = $('#t212Sec'); if (s) s.hidden = !B.proxy && !T.account; // sin servidor y sin datos: sección fuera
  updateBrokerState();
  scheduleRender();
}
function drawQR(box, text) {
  // Codifica el payload como QR con un servicio sin enviar datos sensibles a la app.
  const url = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(text);
  box.innerHTML = '<img src="' + url + '" alt="Código QR de Trade Republic" width="220" height="220">';
}
function shSettings() {
  return head('Ajustes') +
    '<section class="sh-sec" style="margin-top:8px"><h3>Estado</h3>' +
      '<p class="help" id="brokerState" style="display:flex;align-items:center;gap:8px;margin:0;font-size:14px">' +
      '<span id="brokerDot" style="width:10px;height:10px;border-radius:50%;flex:none;background:' + (brokerState() ? 'var(--gain)' : 'var(--loss)') + ';box-shadow:0 0 0 3px ' + (brokerState() ? 'var(--gain-soft)' : 'var(--loss-soft)') + '"></span>' +
      '<span id="brokerStateLbl">' + (brokerState() ? 'Conectado' : 'No conectado') + '</span>' +
      '</p></section>' +
    brokerSection() +
    t212Section() +
    trSection() +
    '<section class="sh-sec"><h3>Borrar</h3><button class="btn danger" data-action="wipe">Borrar todos mis datos</button><p class="help" style="margin-top:8px">Borra tus registros y todo lo guardado en este dispositivo (brokers, claves, ajustes). Pide un segundo toque; solo los registros se pueden deshacer justo después.</p></section>';
}

/* =========================================================
   Acciones
   ========================================================= */
const ACT = {};
const FORM = {};
const INPUT = {};
const CHANGE = {};
const inSheet = el => !!el.closest('#sheet');

ACT.tab = el => { if (SH.open && inSheet(el)) closeSheet(); setTab(el.dataset.tab); };
ACT['mkt-range'] = el => { MK.range = el.dataset.r; drawMarket(MK.id); };
ACT['src-set'] = el => { UI.src = el.dataset.s; saveUI(); UI.histCache = null; H1.h = null; H1.loaded = false; render(); };
ACT['key-eye'] = el => {
  const inp = $('#px-key'); if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  el.setAttribute('aria-pressed', String(show));
  el.title = el.ariaLabel = show ? 'Ocultar clave' : 'Mostrar clave';
  el.setAttribute('aria-label', el.title);
  const sl = el.querySelector('.eye-slash'); if (sl) sl.style.display = show ? '' : 'none';
};
ACT.range = el => { UI.range = +el.dataset.r; saveUI(); UI.histCache = null; render(); };
ACT.filter = el => { UI.filter = el.dataset.k; saveUI(); render(); };
ACT.add = () => openAdd(UI.tab === 'liquidez' ? 'cash' : 'inv');
ACT['add-inv'] = () => openAdd('inv');
ACT['add-cash'] = () => openAdd('cash');
ACT['add-plan'] = el => {
  const view = { fn: shPlan, args: [{ targetId: el.dataset.target || '' }], title: 'Nuevo plan' };
  if (SH.open && inSheet(el)) openSheet(view, true); else openSheet(view);
};
ACT['add-tab'] = el => { AD.tab = el.dataset.k; if (SH.stack[0] && SH.stack[0].fn === shAdd) { SH.stack = [SH.stack[0]]; paintSheet(true); } else openAdd(AD.tab); };
ACT['cash-mode'] = el => { AD.cashMode = el.dataset.m; paintSheet(true); };
ACT['sheet-close'] = () => closeSheet();
ACT['proxy-clear'] = () => { forgetT212(); brokersWiped(); toast('Servidor quitado y datos de Trading 212 borrados de este dispositivo'); renderBrokers(); };
ACT['proxy-default'] = () => { try { localStorage.removeItem(LS_PROXY); } catch (e) { /* sin almacenamiento */ } B.proxy = B.cfgProxy; toast('Usando el servidor del repositorio'); renderBrokers(); };
ACT['banner-ok'] = () => { lsSet('cartera.bannerOk', 1); renderBanner(); };
ACT['sheet-back'] = () => sheetBack();
ACT['t212-load'] = () => loadT212();
ACT['tr-login'] = () => trLogin();
ACT['tr-check'] = () => trCheck();
ACT['tr-load'] = () => trLoad();
ACT['refresh-rate'] = () => {
  const m = $('#rateMenu');
  if (m) m.hidden = !m.hidden;
};
ACT['theme-toggle'] = () => {
  UI.theme = UI.theme === 'dark' ? 'light' : 'dark';
  lsSet(LS_THEME, { t: UI.theme });
  applyTheme();
  renderThemeBtn();
};
ACT['privacy-toggle'] = () => {
  UI.privacy = !UI.privacy;
  lsSet(LS_PRIVACY, { p: UI.privacy });
  applyPrivacy();
  toast(UI.privacy ? 'Valores ocultos. Toca el ojo para mostrarlos.' : 'Valores visibles');
};
ACT['rate-set'] = el => {
  UI.refresh = +el.dataset.s;
  lsSet(LS_AUTOREFRESH, { s: UI.refresh });
  const m = $('#rateMenu'); if (m) m.hidden = true;
  renderRateBtn();
  toast(UI.refresh > 0 ? 'Actualización automática: cada ' + UI.refresh + ' s' : 'Actualización automática apagada');
};
ACT.settings = () => openSheet({ fn: shSettings, title: 'Ajustes' });
ACT['demo-on'] = () => { S.demo = true; S.demoDocs = new Map(demoDocs().map(d => [d.id, d])); runPlans(true); if (SH.open) closeSheet(); UI.tab = 'resumen'; render(true); };
ACT['demo-off'] = () => { S.demo = false; S.demoDocs = new Map(); if (SH.open) closeSheet(); if (S.needPlans) { S.needPlans = false; runPlans(); } render(true); };
ACT['open-asset'] = el => { const id = el.dataset.id; const v = { fn: shAsset, args: [id], live: true, after: () => drawAssetMini(id), title: 'Activo' }; openSheet(v, SH.open && inSheet(el)); };
ACT['open-broker'] = el => { const id = el.dataset.id; const v = { fn: shBroker, args: [id], title: 'Posición', after: () => drawMarket(id) }; openSheet(v, SH.open && inSheet(el)); };
ACT['open-cash'] = el => { const id = el.dataset.id; const v = { fn: shCash, args: [id], live: true, after: () => drawCashMini(id), title: 'Cuenta' }; openSheet(v, SH.open && inSheet(el)); };
ACT['edit-plan'] = el => { const v = { fn: shPlan, args: [{ planId: el.dataset.id }], title: 'Plan' }; openSheet(v, SH.open && inSheet(el)); };
ACT['toggle-plan'] = el => {
  const p = clone(D().get(el.dataset.id)); if (!p) return;
  p.active = !p.active;
  if (p.active) p.activeFrom = todayStr();
  put(p);
  if (p.active) runPlans();
  toast(p.active ? 'Plan reanudado. Sigue desde hoy.' : 'Plan en pausa');
};
ACT['plan-del'] = el => { const id = el.dataset.id; const before = [snap(id)]; remove(id); withUndo('Plan eliminado. Sus aportaciones se mantienen.', before); };
ACT.pick = async el => {
  const src = el.dataset.src, i = +el.dataset.i;
  if (src === 'mine') { const a = AD.mine[i]; if (a) openSheet({ fn: shTx, args: [{ assetId: a.id }], title: 'Operación' }, true); return; }
  const item = AD.cat[i];
  if (!item) return;
  const existing = item.symbol && all('asset').find(a => a.symbol && a.symbol === item.symbol);
  if (existing) { openSheet({ fn: shTx, args: [{ assetId: existing.id }], title: 'Operación' }, true); return; }
  const draft = { name: item.name, symbol: item.symbol || '', type: item.type, currency: item.currency || 'EUR', isin: item.isin || '', exch: item.exch || '' };
  openSheet({ fn: shTx, args: [{ draft }], title: 'Operación' }, true);
};
ACT['manual-asset'] = () => openSheet({ fn: shManual, title: 'Añadir a mano' }, true);
ACT['tx-new'] = el => openSheet({ fn: shTx, args: [{ assetId: el.dataset.id, back: true }], title: 'Operación' }, true);
ACT['tx-edit'] = el => openSheet({ fn: shTx, args: [{ assetId: el.dataset.a, txId: el.dataset.t, back: true }], title: 'Operación' }, true);
ACT['tx-del'] = el => {
  const a0 = D().get(el.dataset.a); if (!a0) return;
  const tx = (a0.txs || []).find(t => t.id === el.dataset.t); if (!tx) return;
  const before = [snap(a0.id)];
  const a = clone(a0); a.txs = a.txs.filter(t => t.id !== tx.id);
  if (tx.plan && D().get(tx.plan)) { before.push(snap(tx.plan)); const p = clone(D().get(tx.plan)); p.skip = Array.from(new Set((p.skip || []).concat(tx.date))); put(p, true); }
  put(a);
  withUndo('Operación eliminada', before);
};
ACT['tx-side'] = el => {
  const f = el.closest('form'); if (!f || el.disabled) return;
  const v = el.dataset.v; f.elements.side.value = v;
  for (const b of $$('[data-action="tx-side"]', f)) { const on = b.dataset.v === v; b.setAttribute('aria-selected', String(on)); b.setAttribute('aria-checked', String(on)); }
  const lbl = $('#totalLbl'); if (lbl) lbl.textContent = v === 'sell' ? 'Total recibido (€)' : 'Total pagado (€)';
  const pi = $('#planInline'); if (pi) pi.hidden = v === 'sell';
  const sb = $('#txSubmit'); const ctx = topCtx(); if (sb && !ctx.txId) sb.textContent = v === 'sell' ? 'Guardar venta' : 'Guardar compra';
  txRecalc(f, 'qty');
};
ACT.day = el => {
  const f = el.closest('form'); if (!f) return;
  el.setAttribute('aria-pressed', String(el.getAttribute('aria-pressed') !== 'true'));
  const days = $$('[data-action="day"][aria-pressed="true"]', f).map(b => +b.dataset.d);
  f.elements.days.value = days.join(',');
  if (f.dataset.form === 'plan') updatePlanPreview(f);
};
ACT['asset-del'] = el => {
  const id = el.dataset.id; const before = [snap(id)];
  for (const p of all('plan').filter(p => p.targetId === id)) { before.push(snap(p.id)); remove(p.id); }
  remove(id); closeSheet();
  withUndo('Activo eliminado', before);
};
ACT['cash-del'] = el => {
  const id = el.dataset.id; const before = [snap(id)];
  for (const p of all('plan').filter(p => p.targetId === id)) { before.push(snap(p.id)); remove(p.id); }
  remove(id); closeSheet();
  withUndo('Cuenta eliminada', before);
};
ACT['move-del'] = el => {
  const c0 = D().get(el.dataset.c); if (!c0) return;
  const m = (c0.moves || []).find(x => x.id === el.dataset.m); if (!m) return;
  const before = [snap(c0.id)];
  const c = clone(c0); c.moves = c.moves.filter(x => x.id !== m.id);
  if (m.plan && D().get(m.plan)) { before.push(snap(m.plan)); const p = clone(D().get(m.plan)); p.skip = Array.from(new Set((p.skip || []).concat(m.date))); put(p, true); }
  put(c);
  withUndo('Movimiento eliminado', before);
};
ACT['rate-del'] = el => {
  const c0 = D().get(el.dataset.c); if (!c0) return;
  const before = [snap(c0.id)];
  const c = clone(c0); c.rates.splice(+el.dataset.i, 1); put(c);
  withUndo('Tipo eliminado', before);
};
ACT.wipe = el => {
  if (el.dataset.armed !== '1') {
    el.dataset.armed = '1'; el.textContent = 'Toca otra vez para borrar todo';
    setTimeout(() => { if (el.isConnected) { el.dataset.armed = ''; el.textContent = 'Borrar todos mis datos'; } }, 4000);
    return;
  }
  const before = Array.from(D().values()).map(d => [d.id, clone(d)]);
  for (const [id] of before) remove(id);
  wipeLocalExtras(); brokersWiped();
  closeSheet();
  withUndo('Datos borrados', before);
};

/* ---------- Formularios */
FORM.trurl = f => {
  const raw = f.elements.url.value.trim();
  const url = cleanProxyLocal(raw);
  const btn = f.querySelector('#trBtn');
  if (btn) btn.disabled = true;
  // Pulsó Quitar (la dirección guardada sigue en el campo).
  if (trLocal() && url === trLocal()) {
    TR.localUrl = '';
    lsSet(LS_TR_URL, { url: '' });
    discardTR(); brokersWiped();
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
    const inp = f.querySelector('#tr-url');
    if (inp) inp.value = '';
    toast('Servidor local de Trade Republic quitado y datos borrados de este dispositivo');
    renderBrokers();
    return;
  }
  if (!url && raw) { toast('La dirección debe ser http://localhost:8788 o https://...'); if (btn) btn.disabled = false; return; }
  if (!url) {
    TR.localUrl = '';
    lsSet(LS_TR_URL, { url: '' });
    discardTR(); brokersWiped();
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
    toast('Servidor local de Trade Republic quitado y datos borrados de este dispositivo');
    renderBrokers();
    return;
  }
  TR.localUrl = url;
  lsSet(LS_TR_URL, { url });
  if (btn) { btn.disabled = false; btn.textContent = 'Quitar'; }
  toast('Servidor local de Trade Republic guardado');
  renderBrokers();
};
CHANGE.trurl = (f, t) => {
  if (t.name !== 'url') return;
  const b = $('#trBtn');
  const v = cleanProxyLocal(t.value.trim());
  if (!v) {
    if (!trLocal()) { if (b) b.textContent = 'Guardar'; return; }
    TR.localUrl = '';
    lsSet(LS_TR_URL, { url: '' });
    discardTR(); brokersWiped();
    if (b) b.textContent = 'Guardar';
    toast('Servidor local de Trade Republic quitado y datos borrados de este dispositivo');
    renderBrokers();
    return;
  }
  // El botón cambia según la dirección: Quitar si es la guardada, Guardar si es otra.
  if (b) b.textContent = (trLocal() && v === trLocal()) ? 'Quitar' : 'Guardar';
};
FORM.proxy = async f => {
  const raw = f.elements.url.value.trim();
  const key = (f.elements.key ? f.elements.key.value : '').trim();
  const msg = f.querySelector('#pxMsg');
  const say = (t, err) => { if (msg) { msg.textContent = t; msg.classList.toggle('err', !!err); } };
  const btn = f.querySelector('#proxyBtn');
  if (btn) btn.disabled = true;
  // Pulsó Desconectar (la dirección sigue guardada en el campo).
  if (B.proxy && cleanProxy(raw) === B.proxy) {
    forgetT212(); brokersWiped();
    if (btn) { btn.disabled = false; btn.textContent = 'Conectar'; }
    say('Sin servidor configurado. Pega la dirección y pulsa Conectar.');
    toast('Servidor desconectado y datos de Trading 212 borrados de este dispositivo');
    renderBrokers(); return;
  }
  if (!raw) {
    forgetT212(); brokersWiped();
    if (btn) { btn.disabled = false; btn.textContent = 'Conectar'; }
    say('Sin servidor configurado. Pega la dirección y pulsa Conectar.');
    toast('Servidor quitado y datos de Trading 212 borrados de este dispositivo');
    renderBrokers(); return;
  }
  const url = cleanProxy(raw);
  if (!url) { say('La dirección tiene que empezar por https://', true); if (btn) btn.disabled = false; return; }
  if (btn) btn.innerHTML = nidoSpin() + 'Conectando…';
  say('Conectando con el servidor…');
  const prev = B.proxy;
  B.proxy = url;
  B.accessKey = key;
  try {
    const j = await brokerFetch('/');
    if (!j || !['nido-brokers', 'cartera-brokers'].includes(j.servicio)) throw new Error('no es el servidor de brokers');
    lsSet(LS_PROXY, { url, key });
    diag('servidor de brokers conectado');
    say('Conectado. Cargando tu cuenta de Trading 212...');
    await loadT212(true); // conecta y rellena el portfolio en un solo paso
    if (btn && btn.isConnected) { btn.disabled = false; btn.textContent = 'Desconectar'; }
    say('Conectado a ' + url.replace(/^https?:\/\//, '') + '. Trading 212 al día.');
    toast('Servidor conectado');
  } catch (e) {
    B.proxy = prev;
    diag('prueba del servidor falló: ' + (e && (e.code || '')) + ' ' + (e && e.message));
    say(brokerErr(e), true);
    if (btn && btn.isConnected) { btn.disabled = false; btn.textContent = prev ? 'Desconectar' : 'Conectar'; }
  }
};
CHANGE.proxy = (f, t) => {
  // La clave de acceso se guarda sola al escribirla (no conecta/desconecta).
  if (t.name === 'key') { B.accessKey = t.value.trim(); lsSet(LS_PROXY, { url: B.proxy, key: B.accessKey }); return; }
  if (t.name !== 'url') return;
  const b = $('#proxyBtn');
  // Vaciar la dirección desconecta (y borra los datos del broker de este dispositivo).
  if (!t.value.trim()) {
    if (!B.proxy) { if (b) b.textContent = 'Conectar'; return; }
    forgetT212(); brokersWiped();
    const m =f.querySelector('#pxMsg');
    if (m) { m.textContent = 'Sin servidor configurado. Pega la dirección y pulsa Conectar.'; m.classList.remove('err'); }
    if (b) b.textContent = 'Conectar';
    toast('Servidor quitado y datos de Trading 212 borrados de este dispositivo');
    renderBrokers();
    return;
  }
  // El botón cambia según la dirección: Desconectar si es la guardada, Conectar si es otra.
  if (b) b.textContent = (B.proxy && cleanProxy(t.value.trim()) === B.proxy) ? 'Desconectar' : 'Conectar';
};
FORM.search = f => {
  const q = f.elements.q.value.trim(); AD.q = q;
  paintResults();
};
INPUT.search = (f, t) => {
  if (t.name !== 'q') return;
  AD.q = t.value;
  paintResults();
};
FORM.manual = f => {
  const el = f.elements; const name = el.name.value.trim();
  if (!name) return ferr(f, 'manErr', 'Ponle un nombre.');
  const price = parseNum(el.price.value);
  const symbol = el.symbol.value.trim().toUpperCase();
  const draft = { name, type: el.type.value, symbol, isin: el.isin.value.trim().toUpperCase(), currency: 'EUR', price: price > 0 ? price : null, curCheck: !!symbol };
  if (draft.price) draft.manualAt = Date.now();
  openSheet({ fn: shTx, args: [{ draft }], title: 'Operación' }, true);
};
INPUT.tx = (f, t) => {
  if (t.name === 'price') t.dataset.touched = '1';
  if (t.name === 'date') { txDateChanged(f); return; }
  if (t.name === 'mkplan') { const b = $('#planInlineBody'); if (b) b.hidden = !t.checked; return; }
  if (['qty', 'price', 'fees', 'total'].includes(t.name)) txRecalc(f, t.name);
};
CHANGE.tx = (f, t) => { if (t.name === 'mkplan') { const b = $('#planInlineBody'); if (b) b.hidden = !t.checked; } };
function newAssetFrom(d) {
  return {
    id: newId('a'), kind: 'asset', type: d.type || 'other', name: d.name || d.symbol || 'Activo', symbol: d.symbol || '', isin: d.isin || '', exchange: d.exch || '',
    currency: d.currency || 'EUR', price: d.price > 0 ? sig(d.price) : null, prev: d.prev > 0 ? sig(d.prev) : null, hist: d.hist || null,
    priceAt: d.price > 0 ? Date.now() : null, manualAt: d.manualAt || null, curCheck: d.curCheck || undefined, txs: [], createdAt: Date.now()
  };
}
FORM.tx = f => {
  const ctx = topCtx(); const el = f.elements;
  const side = el.side.value, date = el.date.value;
  const qty = parseNum(el.qty.value), price = parseNum(el.price.value), fees = parseNum(el.fees.value) || 0;
  if (!validDate(date)) return ferr(f, 'txErr', 'Pon una fecha válida.');
  if (toEd(date) > todayEd()) return ferr(f, 'txErr', 'La fecha no puede ser futura.');
  if (!(qty > 0)) return ferr(f, 'txErr', 'Indica cuántas participaciones.');
  if (!(price > 0)) return ferr(f, 'txErr', 'Indica el precio por participación.');
  if (fees < 0) return ferr(f, 'txErr', 'La comisión no puede ser negativa.');
  let a;
  if (ctx.assetId) { const cur = D().get(ctx.assetId); if (!cur) return ferr(f, 'txErr', 'Este activo ya no existe.'); a = clone(cur); }
  else {
    const ex = ctx.draft.symbol && all('asset').find(x => x.symbol === ctx.draft.symbol);
    a = ex ? clone(ex) : newAssetFrom(ctx.draft);
    if (!ex && !(a.price > 0)) { a.price = sig(price / (unitFx(a) || 1)); a.priceAt = Date.now(); a.manualAt = a.priceAt; }
  }
  if (side === 'sell') {
    const held = calcPos(a, ctx.txId).qty;
    if (qty > held + 1e-9) return ferr(f, 'txErr', 'Solo tienes ' + qtyf(held) + ' participaciones en esa fecha o antes.');
  }
  const before = [snap(a.id)];
  a.txs = a.txs || [];
  let t = ctx.txId ? a.txs.find(x => x.id === ctx.txId) : null;
  if (!t) { t = { id: newId('t') }; a.txs.push(t); }
  Object.assign(t, { side, date, qty: sig(qty), price: sig(price), fees: round(fees, 2), amount: round(side === 'sell' ? qty * price - fees : qty * price + fees, 2), note: el.note.value.trim() });
  delete t.est; delete t.pending; delete t.auto;
  put(a);
  let msg = ctx.txId ? 'Operación actualizada' : side === 'sell' ? 'Venta guardada' : 'Compra guardada';
  if (!ctx.txId && side === 'buy' && el.mkplan && el.mkplan.checked) {
    const amt = parseNum(el.pamount.value);
    const days = String(el.days.value || '').split(',').map(Number).filter(Boolean);
    if (amt > 0 && days.length) {
      const plan = { id: newId('p'), kind: 'plan', target: 'asset', targetId: a.id, amount: round(amt, 2), fees: 0, days, start: fromEd(todayEd() + 1), end: '', active: true, createdAt: Date.now() };
      before.push([plan.id, null]); put(plan);
      msg += ' y plan creado';
    }
  }
  if (ctx.back) sheetBack(); else { closeSheet(); }
  withUndo(msg, before);
};
FORM.assetEdit = f => {
  const id = f.dataset.id; const cur = D().get(id); if (!cur) return;
  const before = [snap(id)]; const a = clone(cur); const el = f.elements;
  a.name = el.name.value.trim() || a.name;
  a.type = el.type.value;
  const sym = el.symbol.value.trim().toUpperCase();
  if (sym !== (a.symbol || '')) { a.symbol = sym; a.hist = null; a.curCheck = !!sym || undefined; if (!sym) a.currency = 'EUR'; }
  a.isin = el.isin.value.trim().toUpperCase();
  const mp = parseNum(el.mprice.value);
  if (mp > 0) {
    if (curOf(a) !== 'EUR' && !fxNow(curOf(a))) { a.currency = 'EUR'; a.hist = null; }
    a.price = sig(mp / (unitFx(a) || 1)); a.priceAt = Date.now(); a.manualAt = a.priceAt;
  }
  put(a);
  withUndo('Datos del activo guardados', before);
};
FORM.cashNew = f => {
  const el = f.elements; const name = el.name.value.trim();
  const apy = parseNum(el.apy.value), bal = parseNum(el.bal.value), date = el.date.value;
  if (!name) return ferr(f, 'cashErr', 'Ponle un nombre a la cuenta.');
  if (!(apy >= 0) || apy > 50) return ferr(f, 'cashErr', 'Escribe la TAE en %, por ejemplo 2,25.');
  if (!validDate(date) || toEd(date) > todayEd()) return ferr(f, 'cashErr', 'Pon una fecha válida, hoy o anterior.');
  if (el.bal.value.trim() && !(bal >= 0)) return ferr(f, 'cashErr', 'El saldo debe ser un número positivo.');
  const c = { id: newId('c'), kind: 'cash', name, rates: [{ from: date, apy: round(apy, 3) }], moves: bal > 0 ? [{ id: newId('m'), date, amount: round(bal, 2), note: 'Saldo inicial' }] : [], createdAt: Date.now() };
  put(c); closeSheet();
  withUndo('Cuenta creada', [[c.id, null]]);
};
FORM.cashMove = f => {
  const el = f.elements; const id = f.dataset.cash || (el.acc && el.acc.value);
  const c0 = D().get(id); if (!c0) return ferr(f, 'moveErr', 'Elige una cuenta.');
  const amt = parseNum(el.amount.value), date = el.date.value;
  if (!(amt > 0)) return ferr(f, 'moveErr', 'Escribe un importe mayor que cero.');
  if (!validDate(date) || toEd(date) > todayEd()) return ferr(f, 'moveErr', 'Pon una fecha válida, hoy o anterior.');
  const before = [snap(id)];
  const c = clone(c0); c.moves = c.moves || [];
  c.moves.push({ id: newId('m'), date, amount: round(el.dir.value === 'out' ? -amt : amt, 2), note: el.note.value.trim() });
  put(c);
  if (!f.dataset.cash) closeSheet(); else { el.amount.value = ''; el.note.value = ''; }
  withUndo(el.dir.value === 'out' ? 'Retirada guardada' : 'Ingreso guardado', before);
};
FORM.rate = f => {
  const id = f.dataset.cash; const c0 = D().get(id); if (!c0) return;
  const apy = parseNum(f.elements.apy.value), from = f.elements.from.value;
  if (!(apy >= 0) || apy > 50) return ferr(f, 'rateErr', 'Escribe la TAE en %, por ejemplo 2,00.');
  if (!validDate(from)) return ferr(f, 'rateErr', 'Pon una fecha válida.');
  const before = [snap(id)];
  const c = clone(c0); c.rates = (c.rates || []).filter(r => r.from !== from); c.rates.push({ from, apy: round(apy, 3) });
  put(c);
  withUndo('TAE actualizada', before);
};
FORM.cashEdit = f => {
  const id = f.dataset.id; const c0 = D().get(id); if (!c0) return;
  const name = f.elements.name.value.trim(); if (!name) return;
  const before = [snap(id)]; const c = clone(c0); c.name = name; put(c);
  withUndo('Cuenta renombrada', before);
};
FORM.plan = f => {
  const el = f.elements;
  const targetId = el.target.value; const tgt = D().get(targetId);
  const amount = parseNum(el.amount.value), fees = parseNum(el.fees.value) || 0;
  const days = String(el.days.value || '').split(',').map(Number).filter(Boolean);
  const start = el.start.value, end = el.end.value;
  if (!tgt) return ferr(f, 'planErr', 'Elige el destino del plan.');
  if (!(amount > 0)) return ferr(f, 'planErr', 'Escribe el importe de cada aportación.');
  if (fees < 0 || fees >= amount) return ferr(f, 'planErr', 'La comisión debe ser menor que el importe.');
  if (!days.length) return ferr(f, 'planErr', 'Marca al menos un día del mes.');
  if (!validDate(start)) return ferr(f, 'planErr', 'Elige la fecha de inicio.');
  if (end && (!validDate(end) || end < start)) return ferr(f, 'planErr', 'La fecha final debe ser posterior al inicio.');
  const old = f.dataset.plan ? D().get(f.dataset.plan) : null;
  const before = [old ? snap(old.id) : null].filter(Boolean);
  const p = old ? clone(old) : { id: newId('p'), kind: 'plan', active: true, createdAt: Date.now(), skip: [] };
  Object.assign(p, { target: tgt.kind === 'cash' ? 'cash' : 'asset', targetId, amount: round(amount, 2), fees: tgt.kind === 'cash' ? 0 : round(fees, 2), days, start, end: end || '' });
  if (!old) before.push([p.id, null]);
  const tBefore = snap(targetId);
  put(p);
  const n = runPlans(true);
  if (n) before.push(tBefore);
  if (SH.stack.length > 1) sheetBack(); else closeSheet();
  withUndo((old ? 'Plan guardado' : 'Plan creado') + (n ? '. ' + n + (n === 1 ? ' aportación apuntada' : ' aportaciones apuntadas') : ''), before);
};
INPUT.plan = f => updatePlanPreview(f);
CHANGE.plan = f => updatePlanPreview(f);

/* =========================================================
   Arranque
   ========================================================= */
function bindGlobal() {
  document.addEventListener('click', e => {
    if (!e.target.closest('.rate-wrap')) {
      const rm = $('#rateMenu'); if (rm && !rm.hidden) rm.hidden = true;
    }
    const el = e.target.closest('[data-action]'); if (!el) return;
    const fn = ACT[el.dataset.action]; if (!fn) return;
    if (el.tagName === 'A') return;
    e.preventDefault(); fn(el, e);
  });
  // Si un logo no carga, se quita y quedan las letras de la insignia.
  document.addEventListener('error', e => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.classList && t.classList.contains('logo')) t.remove();
  }, true);
  document.addEventListener('submit', e => {
    const f = e.target.closest('form[data-form]'); if (!f) return;
    e.preventDefault();
    const fn = FORM[f.dataset.form]; if (fn) fn(f, e);
  });
  document.addEventListener('input', e => {
    const f = e.target.closest && e.target.closest('form[data-form]');
    if (f && INPUT[f.dataset.form]) INPUT[f.dataset.form](f, e.target);
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'sortSel') { UI.sort = e.target.value; saveUI(); render(); return; }
    const f = e.target.closest && e.target.closest('form[data-form]');
    if (f && CHANGE[f.dataset.form]) CHANGE[f.dataset.form](f, e.target);
  });
  $('#scrim').addEventListener('click', () => closeSheet());
  document.addEventListener('keydown', e => {
    const rm = $('#rateMenu');
    if (e.key === 'Escape') {
      if (rm && !rm.hidden) { rm.hidden = true; e.preventDefault(); return; }
      if (SH.open) { e.preventDefault(); sheetBack(); return; }
    }
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t && t.getAttribute && t.getAttribute('role') === 'button' && t.dataset.action) { e.preventDefault(); t.click(); }
  });
  window.addEventListener('resize', () => { if (SH.open) { if (SH.anim) SH.anim.stop(); setSheetPos(0); } });
}
function boot() {
  const saved = lsGet(LS_UI);
  if (saved) {
    if (TABS.includes(saved.tab)) UI.tab = saved.tab;
    if ([1, 7, 30, 91, 182, 0, 365, -1].includes(saved.range)) UI.range = saved.range;
    if (['all', 'tr', 't212', 'manual'].includes(saved.src)) UI.src = saved.src;
    if (saved.filter) UI.filter = saved.filter;
    if (saved.sort) UI.sort = saved.sort;
  }
  const ar = lsGet(LS_AUTOREFRESH);
  if (ar && AUTO_OPTS.includes(ar.s)) UI.refresh = ar.s;
  const th = lsGet(LS_THEME);
  if (th && ['auto', 'light', 'dark'].includes(th.t)) UI.theme = th.t;
  const pv = lsGet(LS_PRIVACY);
  if (pv) UI.privacy = !!pv.p;
  applyTheme(); applyPrivacy(); logoCacheLoad();
  const h = String(location.hash || '').slice(1);
  if (TABS.includes(h)) UI.tab = h;
  bindGlobal(); initDrag();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* sin persistencia */ }
  t212CacheLoad(); t212HistCacheLoad(); trCacheLoad(); trHistCacheLoad(); issCacheLoad();
  if (!trLocal()) discardTR(); // sin URL local, los datos de Trade Republic se quedan fuera
  render();
  initStore(); initBrokers();
  setInterval(() => { renderTop(); }, 60000);
  setInterval(() => { if (S.mode === 'local') runPlans(); }, 30 * 60000);
  // Actualización automática de brokers (frecuencia configurable arriba a la derecha).
  let lastAuto = Date.now();
  setInterval(() => {
    if (S.demo || UI.refresh <= 0) return;
    if (Date.now() - lastAuto < UI.refresh * 1000) return;
    if (AR.t212 || AR.tr) return;
    lastAuto = Date.now();
    autoRefreshNow();
  }, 1000);
  setTimeout(() => { if (!S.demo) autoRefreshNow(); }, 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (S.mode === 'local')) { runPlans(); renderTop(); if (!S.demo) autoRefreshNow(); } });
}
window.__nido = { issuerLogoUrl, calcPos, cashCalc, planDates, history, history1d, priceOn, runPlans, S, D, model };
boot();
})();

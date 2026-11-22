'use strict';
/* Pruebas de humo con jsdom: npm install && npm test
   1) Modo local + cartera de ejemplo
   3) Versión web instalable, sin servidor de brokers
   4) Versión web con servidor de brokers simulado (Trading 212)
   5) Servidor de brokers (worker/precios.js) con Trading 212 simulado */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const webHtml = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function open(html, opts = {}) {
  const errors = [];
  const doc = opts.full ? html : '<!doctype html><html><head></head><body>' + html + '</body></html>';
  const dom = new JSDOM(doc, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/',
    beforeParse(w) {
      w.matchMedia = q => ({ matches: /min-width:760px/.test(q), addListener() {}, removeListener() {} });
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.scrollTo = () => {};
      w.addEventListener('error', e => errors.push(e.message + ' ' + (e.error && e.error.stack)));
      w.console.error = (...a) => errors.push(a.join(' '));
      if (opts.fetch) w.fetch = opts.fetch;
    }
  });
  return { dom, w: dom.window, d: dom.window.document, errors };
}
const fire = (w, el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true, cancelable: true }));
const ok = (name, cond, extra) => { assert.ok(cond, name + (extra ? ' -> ' + extra : '')); console.log('  ok  ' + name); };

async function testLocalDemo() {
  console.log('1) Modo local + ejemplo');
  const { w, d, errors } = open(webHtml, { full: true });
  await sleep(200);
  ok('muestra el estado vacío', !!d.querySelector('.empty h2'));
  d.querySelector('[data-action="demo-on"]').click(); await sleep(100);
  const M = w.__nido.model();
  ok('el ejemplo tiene patrimonio', M.net > 0, String(M.net));
  ok('dibuja el gráfico', !!d.querySelector('#mainChart svg'));
  for (const t of ['inversiones', 'liquidez', 'planes', 'resumen']) { d.querySelector('#topTabs [data-tab="' + t + '"]').click(); await sleep(40); }
  d.querySelector('#topTabs [data-tab="inversiones"]').click(); await sleep(40);
  d.querySelector('.row[data-action="open-asset"]').click(); await sleep(60);
  const before = d.querySelectorAll('.tx-list li').length;
  d.querySelector('[data-action="tx-new"]').click(); await sleep(40);
  const f = d.querySelector('form[data-form="tx"]');
  f.elements.qty.value = '2'; fire(w, f, 'submit'); await sleep(80);
  ok('guarda una compra', d.querySelectorAll('.tx-list li').length === before + 1);
  d.querySelector('[data-action="sheet-close"]').click(); await sleep(600);
  d.querySelector('[data-action="demo-off"]').click(); await sleep(60);
  d.querySelector('#topTabs [data-tab="liquidez"]').click(); await sleep(40);
  d.querySelector('[data-action="add-cash"]').click(); await sleep(60);
  const cf = d.querySelector('form[data-form="cashNew"]');
  cf.elements.name.value = 'Cuenta'; cf.elements.apy.value = '2'; cf.elements.bal.value = '10000';
  cf.elements.date.value = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  fire(w, cf, 'submit'); await sleep(600);
  const M2 = w.__nido.model();
  ok('interés de 10.000 € al 2 % TAE en un año ≈ 200 €', Math.abs(M2.interest - 200) < 1.5, M2.interest.toFixed(2));
  ok('sin errores de JavaScript', errors.length === 0, errors.join('\n'));
  w.close();
}

async function testWeb() {
  console.log('3) Versión web instalable');
  const { w, d, errors } = open(webHtml, { full: true });
  await sleep(200);
  ok('modo independiente', w.__nido.S.mode === 'local');
  ok('enlaza el manifiesto', !!d.querySelector('link[rel="manifest"]'));
  ok('ya no hay botón de precios (Yahoo)', !d.querySelector('#refreshBtn'));
  ok('aviso de datos en el dispositivo', /este dispositivo/.test(d.querySelector('#banner').textContent));
  ok('sin errores de JavaScript', errors.length === 0, errors.join('\n'));
  w.close();
}

async function testWebBrokers() {
  console.log('4) Versión web con servidor de brokers (Trading 212)');
  const calls = [];
  const t212Account = { id: 12345, currency: 'EUR', totalValue: 6584.56,
    cash: { availableToTrade: 1000, inPies: 0, reservedForOrders: 0 },
    investments: { currentValue: 5584.56, totalCost: 5234.56, unrealizedProfitLoss: 350, realizedProfitLoss: 12.5 } };
  const t212Positions = [{ quantity: 5.5, averagePricePaid: 180, currentPrice: 210, createdAt: new Date(Date.now() - 30 * 864e5).toISOString(),
    instrument: { currency: 'USD', isin: 'US0378331005', name: 'Apple Inc.', ticker: 'AAPL_US_EQ' },
    walletImpact: { currency: 'EUR', currentValue: 1155, fxImpact: 3.2, totalCost: 990, unrealizedProfitLoss: 165 } }];
  let statusCalls = 0;
  const fetchMock = async (url, init) => {
    url = String(url); calls.push(url);
    if (url.endsWith('config.json')) return resp({ brokerProxy: 'https://brokers.test' });
    if (url === 'https://brokers.test/') return resp({ ok: true, servicio: 'nido-brokers' });
    if (url === 'https://brokers.test/t212/account') return (init && init.headers && init.headers['X-Access'] === 'topsecret') ? resp(t212Account) : resp({ error: 'Falta la cabecera X-Access con la clave de acceso.', code: 'access_denied' }, 401);
    if (url === 'https://brokers.test/t212/positions') return (init && init.headers && init.headers['X-Access'] === 'topsecret') ? resp(t212Positions) : resp({ error: 'Falta la cabecera X-Access con la clave de acceso.', code: 'access_denied' }, 401);
    if (url.startsWith('https://brokers.test/market/chart')) {
      if (/range=(1d|5d)/.test(url)) { const now = Math.floor(Date.now() / 1000), t = [], c = []; for (let i = 40; i >= 0; i--) { t.push(now - i * 300); c.push(200 + (40 - i) * 0.3); } return resp({ symbol: 'AAPL', currency: 'USD', unit: 's', prev: 199, t, c }); }
      const day = Math.floor(Date.now() / 864e5), t = [], c = [];
      for (let i = 60; i >= 0; i--) { t.push(day - i); c.push(100 + (60 - i)); }
      return resp({ symbol: 'AAPL', currency: 'USD', t, c });
    }
    // Trade Republic usa un servidor local aparte.
    if (url === 'http://localhost:8788/login') return resp({ ok: true, status: 'qr' });
    if (url === 'http://localhost:8788/qr') return resp({ ok: true, status: 'pending', qrPayload: 'https://tr.test/qr' });
    if (url === 'http://localhost:8788/status') return resp({ ok: true, status: (statusCalls++ === 0) ? 'loading' : 'connected' });
    if (url.startsWith('http://localhost:8788/history')) return resp({ ok: true, isin: 'IE00B4L5Y983', range: '1y', exchange: 'LSX', candles: [[Date.now() - 2 * 864e5, 90], [Date.now() - 864e5, 93], [Date.now(), 95]] });
    if (url === 'http://localhost:8788/portfolio') return resp({
      ok: true,
      positions: [
        { name: 'ETF Global', issuer: 'Vanguard', fullName: 'Vanguard FTSE All-World UCITS ETF', isin: 'IE00B4L5Y983', netSize: 10, averageBuyIn: 92.5, currency: 'EUR', invested: 925, currentPrice: 95, value: 950, ppl: 25, instrumentType: 'etf' },
        { name: 'Bitcoin', isin: 'XF000BTC0017', netSize: 0.01, averageBuyIn: 40000, currency: 'EUR', invested: 400, currentPrice: null, value: null, ppl: null, instrumentType: 'crypto' }
      ],
      cash: [{ amount: 100.5, currency: 'EUR' }],
      interest: [{ date: '2026-10-01', amount: 1.25 }, { date: '2026-11-01', amount: 0.75 }],
      plans: [
        { id: 'p1', instrumentId: 'IE00B4L5Y983', amount: 100, interval: 'monthly', instrumentType: 'fund', paused: false, nextExecutionDate: '2026-12-02' },
        { id: 'p2', instrumentId: 'XF000BTC0017', amount: 50, interval: 'twoPerMonth', instrumentType: 'crypto', paused: false, nextExecutionDate: '2026-12-02' }
      ]
    });
    // Precio de criptos: CoinGecko. El histórico (/market_chart) va aparte.
    if (url.includes('/market_chart')) return resp({ prices: [[Date.now() - 2 * 864e5, 40000], [Date.now() - 864e5, 45000], [Date.now(), 50000]] });
    if (url.startsWith('https://api.coingecko.com/api/v3/coins/bitcoin?')) return resp({ image: { small: 'https://img.test/btc.png' } });
    if (url.startsWith('https://api.coingecko.com/')) return resp({ bitcoin: { eur: 50000 } });
    // Logos por ISIN: Wikidata (SPARQL).
    if (url.startsWith('https://query.wikidata.org/sparql') && decodeURIComponent(url).includes('IE00B4L5Y983')) return resp({ results: { bindings: [] } }); // el fondo no está en Wikidata
    if (url.startsWith('https://query.wikidata.org/sparql')) {
      return resp({ results: { bindings: [{ logo: { type: 'uri', value: 'http://commons.wikimedia.org/wiki/Special:FilePath/Apple%20logo%20black.svg' } }] } });
    }
    throw new Error('dirección inesperada ' + url);
  };
  const { w, d, errors } = open(webHtml, { full: true, fetch: fetchMock });
  await sleep(250);
  ok('lee config.json', calls.some(u => u.endsWith('config.json')));
  d.querySelector('[data-action="settings"]').click(); await sleep(60);
  ok('Ajustes muestra el servidor', d.querySelector('#px-url').value === 'https://brokers.test');
  // En móvil no se ofrece conectar Trade Republic (solo en PC).
  ok('en PC Ajustes ofrece conectar Trade Republic', !!d.querySelector('#tr-url'));
  Object.defineProperty(w.navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', configurable: true });
  d.querySelector('[data-action="sheet-close"]').click(); await sleep(350);
  d.querySelector('[data-action="settings"]').click(); await sleep(80);
  ok('en móvil Ajustes no muestra Trade Republic', !d.querySelector('#tr-url') && !d.querySelector('#trBody'));
  ok('en móvil sigue el servidor de brokers (Trading 212)', !!d.querySelector('#px-url'));
  Object.defineProperty(w.navigator, 'userAgent', { value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0', configurable: true });
  d.querySelector('[data-action="sheet-close"]').click(); await sleep(350);
  d.querySelector('[data-action="settings"]').click(); await sleep(80);
  ok('al volver a PC reaparece Trade Republic', !!d.querySelector('#tr-url'));
  ok('Ajustes ya no tiene copia/restaurar', !d.querySelector('#exportTxt') && !d.querySelector('#importTxt'));
  ok('Ajustes ya no tiene diagnóstico', !d.querySelector('#diagTxt'));
  ok('el estado global dice No conectado aún', d.querySelector('#brokerState').textContent.trim() === 'No conectado');
  // Trading 212: sin clave de acceso, el worker la rechaza.
  d.querySelector('[data-action="t212-load"]').click(); await sleep(120);
  ok('sin clave de acceso el broker la exige', /Clave de acceso/.test(d.querySelector('#t212Body').textContent), d.querySelector('#t212Body').textContent.slice(0, 160));
  // La clave se guarda al escribirla y la siguiente lectura ya conecta.
  const pxKey = d.querySelector('#px-key');
  pxKey.value = 'topsecret';
  fire(w, pxKey, 'change'); await sleep(40);
  d.querySelector('[data-action="t212-load"]').click(); await sleep(120);
  const tbody = d.querySelector('#t212Body');
  ok('muestra la cuenta de Trading 212', /Disponible/.test(tbody.textContent) && /6.584,56/.test(tbody.textContent), tbody.textContent);
  await sleep(150);
  const t2h = JSON.parse(w.localStorage.getItem('cartera.t212.hist.v1') || '{}');
  ok('guarda el histórico de precios de Trading 212', !!(t2h.by && t2h.by['US0378331005'] && t2h.by['US0378331005'].c.length === 61), JSON.stringify(t2h).slice(0, 120));
  const H212 = w.__nido.history(365);
  ok('la gráfica de patrimonio se calcula con ese histórico', !!H212 && H212.n >= 30 && H212.val[H212.n - 1] > 1100 && H212.val[0] < H212.val[H212.n - 1], H212 && JSON.stringify([H212.n, H212.val[0], H212.val[H212.n - 1]]));
  const H1d = await w.__nido.history1d();
  ok('el 1D del resumen suma las velas intradía de las posiciones', !!H1d && Array.isArray(H1d.ts) ? H1d.n >= 30 && H1d.val[H1d.n - 1] > 1100 : false, H1d && JSON.stringify([H1d.n, H1d.val[H1d.n - 1]]));
  const r1 = d.querySelector('[data-action="range"][data-r="1"]');
  ok('el resumen ofrece el rango 1D', !!r1 && r1.textContent === '1D');
  if (r1) { r1.click(); await sleep(250); ok('el 1D del resumen dibuja la gráfica con horas', !!d.querySelector('#mainChart svg') && /\d{2}:\d{2}/.test(d.querySelector('#mainChart').textContent), d.querySelector('#mainChart').textContent.slice(0, 80)); d.querySelector('[data-action="range"][data-r="91"]').click(); await sleep(60); }
  ok('con una sola cuenta no hay selector de cuenta', !d.querySelector('[data-action="src-set"]'));
  const eyeBtn = d.querySelector('[data-action="key-eye"]');
  ok('la clave de acceso tiene un ojo y empieza oculta', !!eyeBtn && d.querySelector('#px-key').type === 'password');
  if (eyeBtn) {
    eyeBtn.click(); await sleep(30);
    ok('el ojo muestra la clave', d.querySelector('#px-key').type === 'text' && d.querySelector('#px-key').value === 'topsecret' && eyeBtn.getAttribute('aria-pressed') === 'true');
    d.querySelector('[data-action="key-eye"]').click(); await sleep(30);
    ok('otro clic la vuelve a ocultar', d.querySelector('#px-key').type === 'password');
  }
  ok('el logo de un fondo se deduce del emisor', /domain=vanguard\.com/.test(w.__nido.issuerLogoUrl('Vanguard S&P 500 UCITS ETF')) && /domain=ishares\.com/.test(w.__nido.issuerLogoUrl('iShares Core MSCI EM IMI UCITS ETF')) && w.__nido.issuerLogoUrl('Fondo cualquiera') === '');
  ok('guarda la clave de acceso en el dispositivo', JSON.parse(w.localStorage.getItem('cartera.broker.v1')).key === 'topsecret');
  ok('muestra posiciones de Trading 212', /Apple Inc/.test(tbody.textContent));
  ok('guarda Trading 212 en local', JSON.parse(w.localStorage.getItem('cartera.t212.v1')).account.cash.availableToTrade === 1000);
  ok('el estado global pasa a Conectado con Trading 212', d.querySelector('#brokerState').textContent.trim() === 'Conectado');
  ok('el punto de estado es verde', d.querySelector('#brokerDot').style.background === 'var(--gain)');
  // El dashboard debe incluir el valor del broker.
  const M = w.__nido.model();
  ok('el patrimonio incluye Trading 212', M.pos.some(p => p.broker && p.a.source === 't212' && p.value > 0), JSON.stringify(M.pos.map(p => p.a.name)));
  ok('el reparto incluye Trading 212', M.alloc.some(r => r.l === 'Trading 212' && r.v > 0));
  // La liquidez de los brokers suma al total.
  ok('el efectivo de Trading 212 suma a la liquidez', M.t212Cash === 1000 && M.cashTotal >= 1000, String(M.cashTotal));
  // Posición en USD de Trading 212: no debe pedir conversión (el broker ya valora en EUR).
  ok('sin aviso de tipo de cambio', !/Falta el tipo de cambio/.test(d.querySelector('#banner').textContent), d.querySelector('#banner').textContent);
  // Botón de frecuencia de actualización (arriba a la derecha, con menú).
  const rateLbl = d.querySelector('#refreshRateLbl');
  ok('botón de frecuencia muestra 5s', rateLbl && rateLbl.textContent === '5s');
  d.querySelector('#refreshRateBtn').click(); await sleep(40);
  ok('se abre el menú de frecuencia', d.querySelector('#rateMenu').hidden === false);
  d.querySelector('#rateMenu [data-s="30"]').click(); await sleep(40);
  ok('el menú elige la frecuencia', d.querySelector('#refreshRateLbl').textContent === '30s' && d.querySelector('#rateMenu').hidden === true);
  ok('la frecuencia elegida se guarda', JSON.parse(w.localStorage.getItem('cartera.autoRefresh.v1')).s === 30);
  // Tema en la cabecera: un solo clic alterna claro/oscuro (sin menú).
  ok('ya no hay menú de tema', !d.querySelector('#themeMenu'));
  d.querySelector('#themeBtn').click(); await sleep(30);
  ok('un clic pone tema oscuro', d.documentElement.getAttribute('data-theme') === 'dark');
  d.querySelector('#themeBtn').click(); await sleep(30);
  ok('otro clic vuelve a tema claro', d.documentElement.getAttribute('data-theme') === 'light');
  // Modo privado: el ojo difumina los valores.
  d.querySelector('#privacyBtn').click(); await sleep(30);
  ok('el modo privado se activa con un clic', d.documentElement.classList.contains('prv'));
  ok('el difuminado cubre los KPI del reparto', Array.from(d.querySelectorAll('style')).some(s => /html\.prv \.kpis dd/.test(s.textContent)));
  ok('el difuminado cubre las sublíneas de importes', Array.from(d.querySelectorAll('style')).some(s => /html\.prv \.subline/.test(s.textContent)));
  ok('el difuminado es intenso y proporcional al tamaño', Array.from(d.querySelectorAll('style')).some(s => /html\.prv[\s\S]*?filter:blur\(\.5em\)/.test(s.textContent)));
  ok('la preferencia de privacidad se guarda', JSON.parse(w.localStorage.getItem('cartera.privacy.v1')).p === true);
  ok('el ojo se tacha al ocultar los valores', d.querySelector('#prvSlash').style.display !== 'none');
  d.querySelector('#privacyBtn').click(); await sleep(30);
  ok('otro clic vuelve a mostrar los valores', !d.documentElement.classList.contains('prv'));
  ok('el ojo se destacha al mostrar los valores', d.querySelector('#prvSlash').style.display === 'none');
  // Trade Republic (servidor local)
  const trUrl = d.querySelector('#tr-url'); trUrl.value = 'http://localhost:8788';
  fire(w, trUrl.closest('form'), 'submit'); await sleep(60);
  ok('el botón de Trade Republic dice Quitar al guardar la dirección', d.querySelector('#trBtn').textContent === 'Quitar');
  d.querySelector('[data-action="tr-login"]').click(); await sleep(120);
  ok('muestra el QR de Trade Republic', !!d.querySelector('#qrBox img'));
  await sleep(2300); // primer sondeo: el QR ya está aprobado y el servidor lee la cartera
  ok('mientras carga la cartera se ve un spinner pequeño', !!d.querySelector('#trBody .spin') && /Cargando tu cartera/.test(d.querySelector('#trBody').textContent), d.querySelector('#trBody').textContent.slice(0, 100));
  await sleep(2400); // segundo sondeo: conectado, carga el portfolio solo
  ok('el portfolio sustituyó al QR sin pulsar nada', !d.querySelector('#qrBox'), d.querySelector('#trBody').textContent.slice(0, 120));
  const trCache = JSON.parse(w.localStorage.getItem('cartera.tr.v1'));
  ok('conecta Trade Republic y guarda posiciones', trCache.positions.length === 2 && trCache.positions[0].name === 'ETF Global', JSON.stringify(trCache.positions.map(p => p.name)));
  ok('guarda los planes de ahorro', trCache.plans.length === 2);
  const MT = w.__nido.model();
  ok('el patrimonio incluye Trade Republic con P/L', MT.pos.some(p => p.broker && p.a.source === 'tr' && p.pnl === 25), JSON.stringify(MT.pos.filter(p => p.a.source === 'tr')));
  ok('Bitcoin tiene P/L (CoinGecko para cripto)', MT.pos.some(p => p.broker && p.a.source === 'tr' && p.a.isin === 'XF000BTC0017' && p.pnl === 100), JSON.stringify(MT.pos.filter(p => p.a.source === 'tr' && p.a.isin === 'XF000BTC0017')));
  ok('el cambio de hoy de Trade Republic ya no es cero', MT.hasDay && MT.invDay > 0, String(MT.invDay));
  ok('los intereses cobrados por Trade Republic suman', Math.abs(MT.interest - 2) < 1e-9 && MT.monthInt > 0, JSON.stringify([MT.interest, MT.monthInt]));
  for (const r of [7, 0, -1]) { const HH = w.__nido.history(r); ok('la gráfica admite el rango ' + (r === 0 ? 'YTD' : r === -1 ? 'Todo' : r + ' días'), !!HH && HH.n >= 2, String(HH && HH.n)); }
  const srcBtn = d.querySelector('[data-action="src-set"][data-s="tr"]');
  ok('con dos cuentas aparece el selector de cuenta', !!srcBtn && !!d.querySelector('[data-action="src-set"][data-s="t212"]'));
  if (srcBtn) {
    srcBtn.click(); await sleep(80);
    const Mtr = w.__nido.model('tr');
    const trSum = MT.pos.filter(p => p.broker && p.a.source === 'tr').reduce((a, p) => a + p.value, 0) + MT.trCash;
    ok('el resumen solo con Trade Republic', Math.abs(Mtr.net - trSum) < 0.01 && /Patrimonio en Trade Republic/.test(d.querySelector('.hero-top').textContent), JSON.stringify([Mtr.net, trSum]));
    ok('la gráfica del resumen sigue ese filtro', !!w.__nido.history(91, 'tr') && w.__nido.history(91, 'tr').val[w.__nido.history(91, 'tr').n - 1] < w.__nido.history(91, 'all').val[w.__nido.history(91, 'all').n - 1]);
    d.querySelector('[data-action="src-set"][data-s="all"]').click(); await sleep(80);
    ok('Todo vuelve a sumar las dos cuentas', Math.abs(w.__nido.model().net - MT.net) < 0.01);
  }
  ok('la liquidez de Trade Republic también suma', MT.trCash === 100.5 && MT.cashTotal === 1100.5, String(MT.cashTotal));
  ok('muestra los planes en la sección con su instrumento', /ETF Global/.test(d.querySelector('#trBody').textContent) && /Bitcoin/.test(d.querySelector('#trBody').textContent), d.querySelector('#trBody').textContent);
  // Histórico: velas de Trade Republic (y criptos por CoinGecko) para las gráficas.
  await sleep(400);
  const trhCache = JSON.parse(w.localStorage.getItem('cartera.tr.hist.v1') || '{}');
  const etfHist = trhCache.by && trhCache.by['IE00B4L5Y983'];
  const btcHist = trhCache.by && trhCache.by['XF000BTC0017'];
  ok('guarda el histórico de Trade Republic', !!etfHist && Array.isArray(etfHist.c) && etfHist.c.length === 3, trhCache.by && JSON.stringify(Object.keys(trhCache.by)));
  ok('guarda el histórico de Bitcoin (CoinGecko)', !!btcHist && Array.isArray(btcHist.c) && btcHist.c.length === 3);
  const HB = w.__nido.history(365);
  ok('el histórico del patrimonio incluye a los brokers', !!HB && HB.val[HB.val.length - 1] > 3000, HB && String(HB.val.slice(-3)));
  // La pestaña Planes muestra los planes de Trade Republic ponderando el intervalo.
  d.querySelector('[data-action="sheet-close"]').click(); await sleep(300);
  d.querySelector('#topTabs [data-tab="planes"]').click(); await sleep(60);
  const view = d.querySelector('#view');
  ok('la pestaña Planes muestra los planes con su instrumento', /ETF Global/.test(view.textContent) && /Bitcoin/.test(view.textContent), view.textContent.slice(0, 600));
  ok('muestra el intervalo legible', /Dos veces al mes|Mensual/.test(view.textContent));
  ok('ponderación twoPerMonth ×2 y monthly ×1', view.textContent.includes('200,00'), view.textContent.slice(100, 400));
  ok('sin la palabra estimado', !/estimado/i.test(view.textContent), view.textContent.slice(100, 400));
  ok('la pestaña Planes no ofrece crear planes manuales', !d.querySelector('#view [data-action="add-plan"]'));
  // Separación por tipos en Inversiones (el fondo es ETF, la acción es acción).
  d.querySelector('#topTabs [data-tab="inversiones"]').click(); await sleep(120);
  const chipsTxt = Array.from(d.querySelectorAll('#view .chip')).map(c => c.textContent).join(',');
  ok('hay apartados por tipo', chipsTxt.includes('Acciones') && chipsTxt.includes('ETFs'), chipsTxt);
  d.querySelector('#view .chip[data-k="etf"]').click(); await sleep(60);
  ok('ETF filtra solo el fondo', /ETF Global/.test(d.querySelector('#view').textContent) && !/Apple Inc/.test(d.querySelector('#view').textContent), d.querySelector('#view').textContent.slice(0, 300));
  d.querySelector('#view .chip[data-k="stock"]').click(); await sleep(60);
  ok('Acciones filtra solo la acción', /Apple Inc/.test(d.querySelector('#view').textContent) && !/ETF Global/.test(d.querySelector('#view').textContent), d.querySelector('#view').textContent.slice(0, 300));
  d.querySelector('#view .chip[data-k="all"]').click(); await sleep(400);
  // Logos por ISIN (Wikidata).
  const logo = d.querySelector('#view img.logo[src*="wikimedia"]');
  ok('las posiciones muestran logotipo', !!logo, d.querySelector('#view').textContent.slice(0, 300));
  await sleep(300);
  const fundLogo = d.querySelector('#view .row[data-id="tr_IE00B4L5Y983"] img.logo');
  ok('un fondo sin logo en Wikidata usa el de su emisor (tabla de ISIN)', !!fundLogo && /domain=ishares\.com/.test(fundLogo.getAttribute('src') || ''), fundLogo && fundLogo.outerHTML);
  const btcLogo = d.querySelector('#view .row[data-id="tr_XF000BTC0017"] img.logo');
  ok('Bitcoin usa su icono de criptomoneda', !!btcLogo && /cryptocurrency-icons.*\/btc\.png/.test(btcLogo.getAttribute('src') || ''), btcLogo && btcLogo.outerHTML);
  const resTab = d.querySelector('[role="tab"][data-tab="resumen"]'); if (resTab) { resTab.click(); await sleep(80); }
  const topRows = Array.from(d.querySelectorAll('#view .grid2 .panel:nth-child(2) .lb'));
  ok('Mayores posiciones muestra badge con logo o iniciales en cada fila', topRows.length > 0 && topRows.every(b => !!b.querySelector('.badge')), String(topRows.length));
  const invTab = d.querySelector('[role="tab"][data-tab="inversiones"]'); if (invTab) { invTab.click(); await sleep(80); }
  // Gráficas con el histórico del broker: sparkline en la lista y mini gráfica en la ficha.
  const trRow = d.querySelector('.row[data-action="open-broker"][data-id^="tr_"]');
  ok('la fila de Trade Republic muestra su sparkline', trRow && !!trRow.querySelector('.spark svg'), trRow && trRow.outerHTML.slice(0, 300));
  if (trRow) {
    trRow.click(); await sleep(80);
    ok('la ficha de Trade Republic dibuja la gráfica de mercado', !!d.querySelector('#mktChart svg'), (d.querySelector('#mktChart').textContent || '').slice(0, 60));
    ok('la ficha de la posición muestra el logotipo (no un cuadro blanco)', !!d.querySelector('#sheetBody img.logo[src]'), d.querySelector('#sheetBody .asset-head') && d.querySelector('#sheetBody .asset-head').innerHTML.slice(0, 200));
    ok('la ficha ofrece 1D, 1S, 1M, 3M, 6M, 1A y Máx', Array.from(d.querySelectorAll('#mktTabs button')).map(b => b.textContent).join() === '1D,1S,1M,3M,6M,1A,Máx');
    d.querySelector('#mktTabs [data-r="3m"]').click(); await sleep(40);
    ok('cambiar de periodo redibuja y marca la pestaña', d.querySelector('#mktTabs [data-r="3m"]').getAttribute('aria-selected') === 'true' && !!d.querySelector('#mktChart svg'));
    ok('el cambio del periodo se muestra en la ficha', /%/.test(d.querySelector('#mktSub').textContent), d.querySelector('#mktSub').textContent);
    d.querySelector('[data-action="sheet-close"]').click(); await sleep(300);
  }
  // Cripto: la gráfica sale de CoinGecko (Yahoo no tiene el ISIN XF...)
  const btcRow = d.querySelector('.row[data-action="open-broker"][data-id="tr_XF000BTC0017"]');
  if (btcRow) {
    btcRow.click(); await sleep(120);
    ok('la ficha de Bitcoin dibuja la gráfica con CoinGecko', !!d.querySelector('#mktChart svg'), (d.querySelector('#mktChart').textContent || '').slice(0, 80));
    d.querySelector('#mktTabs [data-r="1d"]').click(); await sleep(80);
    ok('Bitcoin también tiene 1D', !!d.querySelector('#mktChart svg'), (d.querySelector('#mktChart').textContent || '').slice(0, 80));
    d.querySelector('[data-action="sheet-close"]').click(); await sleep(300);
  }
  // Ficha de Trading 212: periodos diarios con el histórico guardado y 1D/1S con velas intradía del servidor.
  const t2Row = d.querySelector('.row[data-action="open-broker"][data-id^="t212_"]');
  if (t2Row) {
    t2Row.click(); await sleep(120);
    ok('la ficha de Trading 212 dibuja la gráfica de mercado', !!d.querySelector('#mktChart svg'), (d.querySelector('#mktChart').textContent || '').slice(0, 60));
    d.querySelector('#mktTabs [data-r="1d"]').click(); await sleep(80);
    ok('1D usa velas intradía y muestra la hora', !!d.querySelector('#mktChart svg') && /\d{2}:\d{2}/.test(d.querySelector('#mktChart').textContent), d.querySelector('#mktChart').textContent);
    d.querySelector('[data-action="sheet-close"]').click(); await sleep(300);
  }
  // Desconectar con el botón: los datos de Trading 212 se borran del dispositivo.
  d.querySelector('[data-action="settings"]').click(); await sleep(80);
  ok('el botón dice Desconectar al estar conectado', d.querySelector('#proxyBtn').textContent === 'Desconectar');
  fire(w, d.querySelector('form[data-form="proxy"]'), 'submit'); await sleep(80);
  ok('al desconectar se borran los datos de Trading 212', d.querySelector('#t212Body').textContent.trim() === '' && d.querySelector('#t212Sec').hidden === true, d.querySelector('#t212Body').textContent.slice(0, 120));
  ok('se borra la caché guardada de Trading 212', w.localStorage.getItem('cartera.t212.v1') === null);
  ok('Trading 212 sale del patrimonio', !w.__nido.model().pos.some(p => p.a.source === 't212'), JSON.stringify(w.__nido.model().pos.map(p => p.a.name)));
  ok('el botón vuelve a decir Conectar', d.querySelector('#proxyBtn').textContent === 'Conectar');
  ok('el estado global sigue Conectado por Trade Republic', d.querySelector('#brokerState').textContent.trim() === 'Conectado');
  // Desconectar olvida también la clave de acceso, el servidor y los campos: como si nunca se hubiera configurado.
  const savedProxy = JSON.parse(w.localStorage.getItem('cartera.broker.v1') || 'null');
  ok('al desconectar no queda la clave de acceso guardada', !savedProxy || (!savedProxy.key && !savedProxy.url), JSON.stringify(savedProxy));
  ok('al desconectar se vacían la dirección y la clave del formulario', d.querySelector('#px-url').value === '' && d.querySelector('#px-key').value === '');
  // Reconectar: hay que escribir de nuevo dirección y clave.
  const pxEl = d.querySelector('#px-url');
  pxEl.value = 'https://brokers.test';
  d.querySelector('#px-key').value = 'topsecret';
  fire(w, d.querySelector('form[data-form="proxy"]'), 'submit');
  ok('al pulsar Conectar sale el spinner de Nido', !!d.querySelector('#proxyBtn .nspin') && /Conectando/.test(d.querySelector('#proxyBtn').textContent));
  await sleep(150);
  ok('al reconectar vuelve Trading 212', /Conectado/.test(d.querySelector('#t212Body').textContent) && /Apple Inc/.test(d.querySelector('#t212Body').textContent), d.querySelector('#t212Body').textContent.slice(0, 160));
  ok('el botón vuelve a decir Desconectar', d.querySelector('#proxyBtn').textContent === 'Desconectar');
  // Y con Trade Republic: el botón Quitar borra sus datos y su caché.
  const trUrlForm = d.querySelector('form[data-form="trurl"]');
  fire(w, trUrlForm, 'submit'); await sleep(80);
  ok('al quitar el servidor local se borran los datos de Trade Republic', d.querySelector('#trBody').textContent.trim() === '' && !/ETF Global/.test(d.querySelector('#trBody').textContent), d.querySelector('#trBody').textContent.slice(0, 120));
  ok('Trade Republic sale del patrimonio', !w.__nido.model().pos.some(p => p.a.source === 'tr'), JSON.stringify(w.__nido.model().pos.map(p => p.a.name)));
  ok('se borra la caché de Trade Republic', w.localStorage.getItem('cartera.tr.v1') === null && w.localStorage.getItem('cartera.tr.hist.v1') === null);
  ok('el botón de Trade Republic vuelve a decir Guardar', d.querySelector('#trBtn').textContent === 'Guardar');
  ok('el campo de dirección de Trade Republic queda vacío', d.querySelector('#tr-url').value === '');
  ok('el estado global sigue Conectado por Trading 212', d.querySelector('#brokerState').textContent.trim() === 'Conectado');
  fire(w, d.querySelector('form[data-form="proxy"]'), 'submit'); await sleep(60); // desconectar Trading 212 también
  ok('el estado global dice No conectado sin proveedores', d.querySelector('#brokerState').textContent.trim() === 'No conectado');
  ok('el punto de estado es rojo', d.querySelector('#brokerDot').style.background === 'var(--loss)');
  // Borrar todos mis datos: no queda ninguna clave de la app en el dispositivo (salvo los registros, que tienen deshacer).
  w.localStorage.setItem('cartera.broker.v1', JSON.stringify({ url: 'https://brokers.test', key: 'topsecret' }));
  w.localStorage.setItem('cartera.theme.v1', JSON.stringify({ t: 'dark' }));
  const wipeBtn = d.querySelector('[data-action="wipe"]');
  wipeBtn.click(); wipeBtn.click(); await sleep(150);
  const left = Object.keys(w.localStorage).filter(k => k.indexOf('cartera.') === 0 && k !== 'cartera.local.v1' && k !== 'cartera.cache.v1');
  ok('borrar todo deja el dispositivo sin claves de la app', left.length === 0, left.join(', '));
  ok('sin errores de JavaScript', errors.length === 0, errors.join('\n'));
  ok('sin errores de JavaScript', errors.length === 0, errors.join('\n'));
  w.close();
}

function resp(obj, status) { return { ok: (status || 200) < 400, status: status || 200, text: async () => JSON.stringify(obj), json: async () => obj }; }

async function testWorker() {
  console.log('5) Servidor de brokers (worker/precios.js)');
  const mod = await import(require('url').pathToFileURL(path.join(root, 'worker/precios.js')).href);
  const worker = mod.default;
  const seen = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { seen.push({ url: String(url), init }); return new Response(JSON.stringify({ ok: true, ticker: 'AAPL' }), { status: 200 }); };
  try {
    const ORIGIN = 'https://miapp.example';
    // Sin variable ALLOWED_ORIGINS, solo se permiten los orígenes de desarrollo local.
    let r = await worker.fetch(new Request('https://w.test/', { headers: { Origin: ORIGIN } }), {});
    ok('sin orígenes configurados rechaza con pista', r.status === 403 && JSON.parse(await r.text()).code === 'origin_denied');
    r = await worker.fetch(new Request('https://w.test/', { headers: { Origin: 'http://localhost:3000' } }), {});
    ok('permite el desarrollo local sin configurar', r.status === 200 && JSON.parse(await r.text()).servicio === 'nido-brokers');
    // Con la variable configurada, se permite al dominio indicado.
    r = await worker.fetch(new Request('https://w.test/', { headers: { Origin: ORIGIN } }), { ALLOWED_ORIGINS: ORIGIN });
    ok('con ALLOWED_ORIGINS responde con el servicio', r.status === 200 && JSON.parse(await r.text()).servicio === 'nido-brokers');
    r = await worker.fetch(new Request('https://w.test/t212/account', { headers: { Origin: ORIGIN } }), { ALLOWED_ORIGINS: ORIGIN });
    ok('sin claves devuelve error claro', r.status === 200 && JSON.parse(await r.text()).code === 't212_unconfigured');
    r = await worker.fetch(new Request('https://w.test/t212/account', { headers: { Origin: ORIGIN } }), { ALLOWED_ORIGINS: ORIGIN, T212_KEY: 'k', T212_SECRET: 's' });
    ok('con claves reenvía a Trading 212', seen.some(x => x.url === 'https://live.trading212.com/api/v0/equity/account/summary'), seen.map(x => x.url).join(', '));
    const authHeader = seen.find(x => x.url.includes('account/summary')).init.headers.Authorization;
    ok('usa Basic Auth', /^Basic /.test(authHeader));
    r = await worker.fetch(new Request('https://w.test/v8/finance/chart/AAPL', { method: 'POST', headers: { Origin: ORIGIN } }), { ALLOWED_ORIGINS: ORIGIN });
    ok('ya no acepta rutas de Yahoo', r.status === 404);
    // Clave de acceso (secreto ACCESS_KEY): exigida en /t212/* si está definida.
    r = await worker.fetch(new Request('https://w.test/t212/account', { headers: { Origin: ORIGIN } }), { ALLOWED_ORIGINS: ORIGIN, ACCESS_KEY: 'secreto' });
    ok('con ACCESS_KEY exige la cabecera X-Access', r.status === 401 && JSON.parse(await r.text()).code === 'access_denied');
    r = await worker.fetch(new Request('https://w.test/t212/account', { headers: { Origin: ORIGIN, 'X-Access': 'otra' } }), { ALLOWED_ORIGINS: ORIGIN, ACCESS_KEY: 'secreto' });
    ok('rechaza una clave incorrecta', r.status === 401);
    seen.length = 0;
    r = await worker.fetch(new Request('https://w.test/t212/account', { headers: { Origin: ORIGIN, 'X-Access': 'secreto' } }), { ALLOWED_ORIGINS: ORIGIN, ACCESS_KEY: 'secreto', T212_KEY: 'k', T212_SECRET: 's' });
    ok('con la clave correcta reenvía a Trading 212', r.status === 200 && seen.some(x => x.url.includes('account/summary')));
    r = await worker.fetch(new Request('https://w.test/', { headers: { Origin: ORIGIN } }), { ALLOWED_ORIGINS: ORIGIN, ACCESS_KEY: 'secreto' });
    ok('la raíz del worker sigue abierta sin clave (salud)', r.status === 200 && JSON.parse(await r.text()).servicio === 'nido-brokers');
    r = await worker.fetch(new Request('https://w.test/t212/account', { headers: { Origin: 'https://otra-web.example' } }), { ALLOWED_ORIGINS: ORIGIN, T212_KEY: 'k', T212_SECRET: 's' });
    ok('rechaza otras webs', r.status === 403);
    r = await worker.fetch(new Request('https://w.test/tr/login', { headers: { Origin: ORIGIN } }), { ALLOWED_ORIGINS: ORIGIN });
    ok('ya no sirve Trade Republic (va al servidor local)', r.status === 404);
    r = await worker.fetch(new Request('https://w.test/t212/account', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), { ALLOWED_ORIGINS: ORIGIN });
    ok('responde a la comprobación previa', r.status === 204);
    // Histórico de precios: ISIN -> símbolo -> velas diarias compactas.
    const yh = [];
    globalThis.fetch = async (url) => {
      yh.push(String(url));
      if (String(url).includes('/v1/finance/search')) return new Response(JSON.stringify({ quotes: [{ symbol: 'amzn', quoteType: 'EQUITY' }] }), { status: 200 });
      return new Response(JSON.stringify({ chart: { result: [{ meta: { currency: 'USD' }, timestamp: [86400 * 100, 86400 * 100 + 3600, 86400 * 101, 86400 * 102], indicators: { quote: [{ close: [10, 11, null, 12] }] } }] } }), { status: 200 });
    };
    r = await worker.fetch(new Request('https://w.test/market/chart?isin=US0231351067&range=1y', { headers: { Origin: ORIGIN } }), { ALLOWED_ORIGINS: ORIGIN });
    const mc = JSON.parse(await r.text());
    ok('histórico: resuelve el ISIN y devuelve días y cierres', r.status === 200 && mc.symbol === 'AMZN' && mc.t.join() === '100,102' && mc.c.join() === '11,12' && mc.currency === 'USD', JSON.stringify(mc));
    ok('histórico: consulta a Yahoo con el símbolo', yh.some(u => u.includes('/v8/finance/chart/AMZN?range=1y&interval=1d')));
    r = await worker.fetch(new Request('https://w.test/market/chart?isin=../../x', { headers: { Origin: ORIGIN } }), { ALLOWED_ORIGINS: ORIGIN });
    ok('histórico: rechaza un ISIN inválido', r.status === 400);
    r = await worker.fetch(new Request('https://w.test/market/chart?isin=US0231351067&range=99y', { headers: { Origin: ORIGIN } }), { ALLOWED_ORIGINS: ORIGIN });
    ok('histórico: rechaza un rango no permitido', r.status === 400);
    r = await worker.fetch(new Request('https://w.test/market/chart?isin=US0231351067', { headers: { Origin: ORIGIN } }), { ALLOWED_ORIGINS: ORIGIN, ACCESS_KEY: 'secreto' });
    ok('histórico: exige la clave de acceso', r.status === 401);
  } finally { globalThis.fetch = realFetch; }
}

(async () => {
  await testLocalDemo();
  await testWeb();
  await testWebBrokers();
  await testWorker();
  console.log('Todas las pruebas han pasado.');
})().catch(e => { console.error('FALLO: ' + e.stack); process.exit(1); });
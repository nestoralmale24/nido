'use strict';
/* Genera Nido a partir de src/:
     docs/  -> app web instalable (PWA) para GitHub Pages: funciona sin conexión, datos en el dispositivo,
                                   precios online a través de tu servidor (worker/, dirección en config.json)
   Uso: node scripts/build.js */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const wr = (p, s) => { const f = path.join(root, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const cp = (a, b) => { const t = path.join(root, b); fs.mkdirSync(path.dirname(t), { recursive: true }); fs.copyFileSync(path.join(root, a), t); };

const page = rd('src/page.html');
const app = rd('src/app.js');
const MARK = /<script>\s*\/\*__APP__\*\/\s*<\/script>/;
if (!MARK.test(page)) throw new Error('Falta el bloque <script>/*__APP__*/</script> en src/page.html');
if (app.includes('</script')) throw new Error('src/app.js no puede contener la cadena </script');

// Versión web instalable
const cut = page.indexOf('<div class="app">');
if (cut < 0) throw new Error('No encuentro <div class="app"> en src/page.html');
const headPart = page.slice(0, cut).trim();
const bodyPart = page.slice(cut).replace(MARK, () => '<script>\n' + app + '\n</script>');
const version = crypto.createHash('sha1').update(headPart + bodyPart).digest('hex').slice(0, 10);

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F3F7FD" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#05070C" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Nido">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
${headPart}
</head>
<body>
${bodyPart}
<script>
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '[::1]';
  window.addEventListener('load', function () {
    if (!local) { navigator.serviceWorker.register('sw.js').catch(function () {}); return; }
    navigator.serviceWorker.getRegistrations().then(function (rs) {
      if (!rs.length) return;
      Promise.all(rs.map(function (r) { return r.unregister(); })).then(function () { location.reload(); });
    });
  });
}
</script>
</body>
</html>
`;
wr('docs/index.html', html);
wr('docs/sw.js', rd('src/web/sw.js').replace('__VERSION__', version));
cp('src/web/manifest.webmanifest', 'docs/manifest.webmanifest');
// Configuración de la versión web (dirección del servidor de brokers). Se edita en config.json, en la raíz.
let cfg = { brokerProxy: '' };
if (fs.existsSync(path.join(root, 'config.json'))) {
  try { cfg = JSON.parse(rd('config.json')); } catch (e) { throw new Error('config.json no es un JSON válido: ' + e.message); }
}
if (cfg.brokerProxy && !/^https:\/\//.test(cfg.brokerProxy)) throw new Error('config.json: brokerProxy debe empezar por https://');
wr('docs/config.json', JSON.stringify({ brokerProxy: cfg.brokerProxy || '' }, null, 2) + '\n');
for (const f of fs.readdirSync(path.join(root, 'src/web/icons'))) cp('src/web/icons/' + f, 'docs/icons/' + f);
wr('docs/.nojekyll', '');

const kb = s => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
console.log('docs/index.html           ' + kb(html) + '  (versión ' + version + ')');
console.log('servidor de brokers       ' + (cfg.brokerProxy || 'sin configurar (config.json)'));

# Nido

**Tu panel personal de patrimonio** — acciones, ETFs, fondos, cripto y liquidez remunerada, con planes mensuales que se apuntan solos.

<p align="center">
  <a href="LICENSE"><img alt="Licencia MIT" src="https://img.shields.io/badge/Licencia-MIT-4caf50"></a>
  <a href="#-publicar-la-web-e-instalarla-en-el-ipad"><img alt="PWA instalable" src="https://img.shields.io/badge/PWA-instalable-7c4dff"></a>
  <a href="#-desarrollo"><img alt="Sin dependencias de runtime" src="https://img.shields.io/badge/Runtime-HTML_%2B_CSS_%2B_JS-ff9800"></a>
  <a href="https://pages.github.com"><img alt="GitHub Pages" src="https://img.shields.io/badge/GitHub_Pages-publicado-22272e"></a>
  <br>
  <a href="README.md">🇬🇧 English</a> · <b>🇪🇸 Español</b>
</p>

> [!NOTE]
> Sin dependencias en tiempo de ejecución: **HTML, CSS y JavaScript en un solo fichero**. Funciona en PC, iPhone y iPad, con tema claro y oscuro. Los datos viven en tu dispositivo, nunca en servidores ajenos.

## ✨ Características

- 📊 **Patrimonio total**: reparto por tipo de activo y evolución (1M, 3M, 6M, 1A).
- 📈 **Gráficas desde los brokers**: la evolución y las sparklines de Trade Republic usan sus velas de precio reales (`aggregateHistory` vía el servidor local) y las criptos usan el histórico de CoinGecko. Trading 212 no publica histórico en su API, así que sus posiciones se valoran a coste hasta que se importen sus órdenes.
- 💸 **Compras y ventas** con fecha, precio, comisión y total; precio medio, ganancia latente y realizada.
- 🗓️ **Planes mensuales de Trade Republic** (solo lectura): importe e intervalo de cada plan, tal como los tienes en el broker.
- 🏦 **Liquidez con TAE**, con cambios de tipo por fecha, intereses día a día y estimación del próximo mes.
- 🤖 **Brokers en solo lectura** (versión web): cuenta, posiciones, planes de ahorro y liquidez de Trading 212 y Trade Republic. Los datos se guardan en el dispositivo.
- ⏱️ **Actualización automática** cada 5 s por defecto (5s / 15s / 30s / 60s / apagado).
- 🌗 **Tema con un clic**: botón sol/luna que alterna claro ↔ oscuro.
- 🕶️ **Modo privado**: el ojo de la cabecera difumina todos los valores para que nadie los vea de refilón.
- 🏷️ **Logos por ISIN** desde Wikidata (con caché local); si no hay resultado, insignia con letras.
- 🗂️ **Inversiones por tipo**: Todo · Acciones · ETFs · Fondos · Cripto · Otros.

## 🚀 Para empezar

1. **Pruébala sin brokers (1 minuto)**: `npm install` y `npm run serve`, abre `http://localhost:3000`. Todo queda guardado en tu navegador; no hace falta cuenta ni servidor.
2. **En tu teléfono o tablet**: publica la web en tu GitHub Pages e instálala como app (ver [Publicar la web](#publicar-la-web-e-instalarla-en-el-ipad)).
3. **Conecta tus brokers (opcional)**: Trading 212 con Cloudflare Workers y Trade Republic con un servidor local (ver [Conectar brokers](#conectar-brokers-opcional)).

La versión web no puede hablar directamente con Trading 212 ni Trade Republic: el navegador bloquea esas peticiones entre dominios (CORS). Por eso usa un servidor pequeño en tu cuenta de Cloudflare (`worker/`) que hace de puente. Ver [Conectar brokers](#conectar-brokers-opcional).

## 📁 Estructura

```
src/
  page.html            Estructura y estilos 
  app.js               Toda la lógica: datos, cálculos, planes, gráficos, hojas, brokers
  web/
    manifest.webmanifest
    sw.js              Service worker: abre la app sin conexión
    icons/             Iconos de la app
worker/
  precios.js           Servidor de brokers para Cloudflare Workers (Trading 212)
tr-server/
  server.mjs           Servidor local de Trade Republic (Bun + trapi)
  package.json         Dependencias del servidor local
wrangler.example.toml  Plantilla opcional para desplegar el worker por línea de comandos (cópiala a wrangler.toml con tu nombre)
config.json            Dirección de tu servidor de brokers (la usa la versión web)
config.example.json    Plantilla: cópiala a config.json y pon tu URL
scripts/build.js       Genera docs/
test/run.js            Pruebas de humo con jsdom
docs/                  Versión web generada (la que sirve GitHub Pages)
```

## 🛠️ Desarrollo

Requiere Node 18 o superior.

```bash
npm install        # solo para las pruebas (jsdom)
npm run build      # genera docs/
npm test           # build + pruebas
npm run serve      # arranca docs/ en http://localhost:3000 y, si hay Bun, también el servidor local de Trade Republic en :8788 (Ctrl+C para los dos)
```

Edita siempre `src/` y vuelve a ejecutar `npm run build`. No edites `docs/` a mano: se sobrescribe.

## 🌐 Publicar la web e instalarla en el iPad

1. En GitHub: Settings → Pages → Build and deployment → Source: "Deploy from a branch", rama `main`, carpeta `/docs`. Guarda.
2. En un par de minutos estará en `https://TU-USUARIO.github.io/nido/`. En el plan gratuito de GitHub, Pages requiere que el repositorio sea público. El código no contiene datos personales: tus posiciones se quedan en cada dispositivo.
3. En el iPad, abre esa dirección en Safari → botón Compartir → "Añadir a pantalla de inicio". En iPadOS 26 deja activado "Abrir como app web".
4. Ábrela desde el icono. Funciona a pantalla completa y sin conexión.

**Consejos:**
- Usa siempre el icono de la pantalla de inicio: lo que guardes ahí no se comparte con Safari.
- Tus datos viven en este dispositivo: no uses "Borrar todos mis datos" de Ajustes salvo que quieras empezar de cero.

## 🔌 Conectar brokers (opcional)

La versión web puede leer tu cuenta de Trading 212 y Trade Republic en **solo lectura** (no se puede operar). Para eso necesita dos piezas que despliegas tú:

- **Trading 212** → un mini servidor propio en **Cloudflare Workers** (gratuito, ~5 minutos). El navegador no puede hablar con Trading 212 directamente (CORS) y el Worker es quien guarda tus claves.
- **Trade Republic** → un **servidor local** en tu PC (Bun + código QR). Su flujo de entrada usa WAF y WebSocket y no puede hacerse desde el navegador.

Los datos se guardan en el dispositivo y se reutilizan sin conexión. Si quitas la dirección del servidor (botón Desconectar/Quitar), esos datos se borran del dispositivo.

### 1. Trading 212 (API oficial)

1. Crea una cuenta gratuita en [dash.cloudflare.com](https://dash.cloudflare.com).
2. Entra en **Workers & Pages** → **Create** → **Create Worker**. Llámalo como quieras (ej. `nido-brokers`) y despliégalo.
   *(Alternativa por línea de comandos: copia `wrangler.example.toml` a `wrangler.toml` con el nombre de tu Worker y ejecuta `npx wrangler deploy` desde la raíz. Si despliegas pegando el código en el panel, este fichero no se usa).*
3. Pulsa **Edit code**, borra el código de ejemplo, pega el contenido de `worker/precios.js` y pulsa **Deploy**.
4. En la pestaña de tu Worker, abre **Settings → Variables**:
   - Añade la variable `ALLOWED_ORIGINS` con tus orígenes separados por comas, por ejemplo:
     `https://TU-USUARIO.github.io,http://localhost:3000,http://127.0.0.1:3000`
     Sin esta variable solo funciona desde tu propio PC en desarrollo.
   - En **Secrets**, añade `T212_KEY` y `T212_SECRET` con tu API Key y tu API Secret (se generan en Trading 212: app/web → Ajustes → API Beta; solo cuentas **Invest** e **ISA**, no CFD ni SIPP).
   - *(Recomendado)* En **Secrets**, añade también `ACCESS_KEY` con una frase larga y aleatoria (p. ej. la que te genere tu gestor de contraseñas). La app te la pedirá en su campo **Clave de acceso** y sin ella el Worker responderá **401**: aunque alguien averigüe la URL de tu Worker, no podrá leer tu cuenta.
5. Copia la dirección del Worker, del tipo `https://nido-brokers.TU-CUENTA.workers.dev`. Si la abres en el navegador debe responder `{"ok":true,"servicio":"nido-brokers"}`.
6. Dile a la app dónde está el Worker:
   - **Para todos tus dispositivos**: copia `config.example.json` a `config.json`, pon tu dirección, ejecuta `npm run build` y haz push. Si el repositorio es público, esa URL quedará visible (inocuo si defines `ACCESS_KEY`); si prefieres no publicarla, usa la opción de Ajustes de cada dispositivo; o
   - **Solo para este dispositivo**: en la app, Ajustes → Servidor de brokers → pega la dirección (y tu **Clave de acceso**, si definiste `ACCESS_KEY`) → **Conectar**.

> [!IMPORTANT]
> **Seguridad**: las claves viven como *secretos* de Cloudflare (cifrados y no visibles) y el navegador nunca las recibe. Trata la dirección de tu Worker como **privada**. Con `ACCESS_KEY`, la app envía la cabecera `X-Access` en cada petición y el Worker la exige; esa clave tampoco sale de tu dispositivo ni se reenvía a Trading 212. Si tu URL ya se ha filtrado (p. ej. está en el historial de un repositorio público), lo más seguro es **rotar el Worker**: créate uno nuevo con otro nombre, borra el viejo y actualiza la URL en tus dispositivos.

### 2. Trade Republic (no oficial, servidor local)

> [!WARNING]
> Trade Republic no ofrece API pública. La conexión usa el flujo de **código QR** de su propia web (no oficial) y requiere un **servidor local en tu PC**. Puede romperse si Trade Republic cambia su protocolo, o no ajustarse a sus términos de servicio. Úsalo bajo tu responsabilidad.

1. Instala [Bun](https://bun.sh) (necesario porque la librería `trapi` es TypeScript).
2. Instala las dependencias:
   ```bash
   cd tr-server
   bun install
   ```
   La primera vez, Puppeteer descarga Chromium (~200 MB). Es normal.
3. Arranca el servidor local (junto con la app, si prefieres: `npm run serve` desde la raíz los arranca a los dos y Ctrl+C los para):
   ```bash
   bun server.mjs
   ```
   Verás `Servidor local de Trade Republic escuchando en http://localhost:8788/`.
   Si abres la app desde GitHub Pages y no desde localhost, arranca también con tu origen permitido:
   ```bash
   ALLOWED_ORIGINS=https://TU-USUARIO.github.io bun server.mjs
   ```
4. En la app: Ajustes → Trade Republic → escribe `http://localhost:8788` y **Guardar**.
5. Pulsa **Vincular con QR**, escanea el código con la app de Trade Republic y confirma. La app detecta la conexión sola y carga el portfolio (el botón de respaldo queda por si el sondeo no arrancara).

La sesión se guarda en `~/.tr_api_cookies.json` y se reutiliza en siguientes arranques. El servidor solo escucha en tu equipo (`127.0.0.1`); para usarlo desde otro dispositivo de tu red, arráncalo con `HOST=0.0.0.0`. Si lo paras, Trade Republic deja de leerse (Trading 212 sí sigue funcionando en cualquier dispositivo).

**Nota**: la lectura de posiciones pide, además, el precio actual por ISIN (exchange LSX) para calcular la ganancia/pérdida. Si algún ISIN no cotiza ahí, su P/L saldrá "—" y el resto funciona igual.

### 3. Errores comunes

- **"Origen no permitido"**: añade tu dominio a `ALLOWED_ORIGINS` del Worker de Cloudflare (Settings → Variables) o del servidor local de Trade Republic (variable de entorno) y despliega/relanza.
- **"Trading 212 no está configurado"**: faltan los secretos `T212_KEY` y `T212_SECRET` en el Worker.
- **"Clave de acceso incorrecta"**: comprueba que el secreto `ACCESS_KEY` del Worker y la **Clave de acceso** de Ajustes coinciden.
- **"El servidor local de Trade Republic no responde"**: ¿está arrancado? `cd tr-server && bun server.mjs`. Solo funciona desde el PC donde corre.
- **Sesión de Trade Republic caducada**: vuelve a vincular con el QR (Ajustes → Trade Republic).
- **429 (demasiadas consultas)**: Trading 212 limita la frecuencia; espera un minuto y reintenta.

## 🗃️ Modelo de datos

Una colección por usuario con un documento por entidad:

- `settings`: tipos de cambio (`fx`, `fxHist`).
- `a_*` (activo): tipo, nombre, ticker, ISIN, moneda, precio, histórico de un año (`hist.t` en días desde 1970, `hist.c` cierres) y operaciones (`txs`).
- `c_*` (cuenta de liquidez): tipos TAE por fecha (`rates`) y movimientos (`moves`).
- `p_*` (plan mensual): destino, importe, comisión, días del mes, inicio, fin opcional y fechas omitidas (`skip`).

Las aportaciones de un plan usan un identificador fijo (`pl_<plan>_<fecha>`), así que aunque se abra a la vez en dos dispositivos no se duplican.

Los intereses se calculan capitalizando a diario con la TAE vigente en cada fecha. Es una estimación: cada banco liquida a su manera.

## 📄 Licencia

MIT (ver [`LICENSE`](LICENSE)). Incluye la librería `trapi` (MIT) como dependencia del servidor local de Trade Republic.

---

<p align="center">
  Hecho con ❤️ para llevar el control de tu patrimonio — <a href="README.md">English version</a>
</p>
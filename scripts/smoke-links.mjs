// Comprueba que cada descarga que la landing publicita exista de verdad.
//
// POR QUE EXISTE. Los links de WALLET_LINKS se arman concatenando WALLET_VERSION
// con el nombre del asset: `.../releases/download/v${V}/cosmos-pay-${V}.apk`. Eso
// compila siempre, se despliega siempre y se ve bien siempre, exista o no el
// archivo del otro lado. Basta con subir la version y olvidarse de publicar un
// asset, o con que alguien renombre uno en el release, para que la landing quede
// ofreciendo un 404 sin que nada falle en CI. El unico que se entera es el
// visitante que queria instalarse la wallet.
//
// walletLinks.test.ts cubre la FORMA de los links sin tocar la red. Esto cubre
// lo otro: que el archivo este publicado. Va aparte justamente porque necesita
// internet, asi que no deberia correr en un CI sin salida.
//
// QUE ACEPTA. 200 directo, o un 3xx hacia el CDN de objetos de GitHub, que es lo
// que devuelve un release asset. Un 404 es el caso que estamos buscando. Se usa
// HEAD para no bajar 75 MB de AppImage; si un servidor no soporta HEAD se
// reintenta con un GET con Range, que trae el primer byte y corta.

import { WALLET_LINKS, WALLET_VERSION } from '../src/components/cosmos/marketing/data.ts';

const TIMEOUT_MS = 20000;

async function alcanzable(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
    if (r.status === 405 || r.status === 501) {
      // El servidor no quiere HEAD: pedimos un solo byte.
      r = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        redirect: 'follow',
        signal: ctrl.signal,
      });
    }
    const largo = r.headers.get('content-length');
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      mb: largo ? Math.round((Number(largo) / 1048576) * 10) / 10 : null,
    };
  } catch (e) {
    return { ok: false, status: 0, error: String(e.message ?? e).slice(0, 80) };
  } finally {
    clearTimeout(t);
  }
}

console.log(`descargas publicitadas para la wallet v${WALLET_VERSION}\n`);

const entradas = Object.entries(WALLET_LINKS);
const resultados = await Promise.all(
  entradas.map(async ([k, href]) => [k, href, await alcanzable(href)]),
);

const rotos = [];
for (const [k, href, r] of resultados) {
  const peso = r.mb != null ? `${r.mb} MB` : '';
  if (r.ok) {
    console.log(`  ok    ${k.padEnd(8)} ${String(r.status).padEnd(3)} ${peso}`);
  } else {
    rotos.push(k);
    console.log(`  ROTO  ${k.padEnd(8)} ${String(r.status).padEnd(3)} ${r.error ?? ''}`);
    console.log(`        ${href}`);
  }
}

console.log('');
if (rotos.length) {
  console.error(`${rotos.length} de ${entradas.length} descargas no existen: ${rotos.join(', ')}`);
  process.exit(1);
}
console.log(`las ${entradas.length} descargas existen`);

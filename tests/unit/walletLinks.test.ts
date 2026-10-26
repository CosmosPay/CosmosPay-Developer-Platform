/* walletLinks.test.ts: los links de descarga de la wallet son la unica puerta
   por la que un usuario se instala la app. Un link roto en la landing no lo
   avisa nadie: la pagina compila igual, se despliega igual, y el visitante se
   lleva un 404. Esto asegura la FORMA de los links sin tocar la red; que los
   archivos existan de verdad lo comprueba scripts/smoke-links.mjs. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  ANDROID_SIZE,
  WALLET_LINKS,
  WALLET_MORE,
  WALLET_VERSION,
} from '@/components/cosmos/marketing/data';

/** Los que salen del release de GitHub, o sea los que dependen de la version. */
const DEL_RELEASE = ['android', 'firefox', 'windows', 'macos', 'linux', 'deb', 'rpm'] as const;

test('la version es un semver y vive en un solo lugar', () => {
  assert.match(WALLET_VERSION, /^\d+\.\d+\.\d+$/, `version rara: ${WALLET_VERSION}`);
});

test('todos los links son https', () => {
  for (const [k, href] of Object.entries(WALLET_LINKS)) {
    assert.ok(href.startsWith('https://'), `${k} no es https: ${href}`);
  }
});

test('los links del release llevan la version declarada', () => {
  // Si alguien sube WALLET_VERSION y un link quedo escrito a mano con la
  // anterior, apunta a un asset que ya no es el que se publicita.
  for (const k of DEL_RELEASE) {
    const href = WALLET_LINKS[k];
    assert.ok(
      href.includes(WALLET_VERSION),
      `${k} no menciona la version ${WALLET_VERSION}: ${href}`,
    );
    assert.ok(
      href.includes(`/releases/download/v${WALLET_VERSION}/`),
      `${k} no cuelga del release v${WALLET_VERSION}: ${href}`,
    );
  }
});

test('cada link del release termina en una extension instalable', () => {
  const esperado: Record<(typeof DEL_RELEASE)[number], string> = {
    android: '.apk',
    firefox: '.zip',
    windows: '.exe',
    macos: '.dmg',
    linux: '.AppImage',
    deb: '.deb',
    rpm: '.rpm',
  };
  for (const k of DEL_RELEASE) {
    assert.ok(
      WALLET_LINKS[k].endsWith(esperado[k]),
      `${k} deberia terminar en ${esperado[k]}: ${WALLET_LINKS[k]}`,
    );
  }
});

test('no se publicita el apk de debug ni el aab', () => {
  // El de debug pesa 463 MB y el .aab es para la Play Console, no para una
  // persona. Ofrecer cualquiera de los dos seria un error caro de deshacer.
  for (const [k, href] of Object.entries(WALLET_LINKS)) {
    assert.ok(!href.includes('debug'), `${k} apunta al build de debug: ${href}`);
    assert.ok(!href.endsWith('.aab'), `${k} apunta al bundle de Play: ${href}`);
  }
});

test('todo lo que la landing lista en "mas plataformas" existe en WALLET_LINKS', () => {
  for (const item of WALLET_MORE) {
    assert.ok(item.href, `${item.k} no tiene href`);
    assert.ok(item.size, `${item.k} no declara peso`);
    const conocido = Object.values(WALLET_LINKS).includes(item.href);
    assert.ok(conocido, `${item.k} apunta a un href que no esta en WALLET_LINKS`);
    for (const extra of item.extra ?? []) {
      assert.ok(
        Object.values(WALLET_LINKS).includes(extra.href),
        `${item.k}/${extra.label} apunta fuera de WALLET_LINKS`,
      );
      assert.ok(extra.size, `${item.k}/${extra.label} no declara peso`);
    }
  }
});

test('los pesos se declaran en un formato que una persona entiende', () => {
  const formato = /^\d+(,\d+)? (KB|MB|GB)$/;
  assert.match(ANDROID_SIZE, formato, `peso de android raro: ${ANDROID_SIZE}`);
  for (const item of WALLET_MORE) {
    assert.match(item.size, formato, `peso de ${item.k} raro: ${item.size}`);
    for (const extra of item.extra ?? []) {
      assert.match(extra.size, formato, `peso de ${extra.label} raro: ${extra.size}`);
    }
  }
});

test('chrome va a la tienda y la webapp al dominio propio', () => {
  // Para Chrome el camino es la tienda, que trae actualizaciones solas. Si
  // alguien lo cambia por el zip del release, pierde eso sin darse cuenta.
  assert.ok(
    WALLET_LINKS.chrome.includes('chromewebstore.google.com'),
    `chrome deberia ir a la tienda: ${WALLET_LINKS.chrome}`,
  );
  assert.ok(
    WALLET_LINKS.webapp.startsWith('https://cosmospay.lat/'),
    `la webapp deberia ser del dominio propio: ${WALLET_LINKS.webapp}`,
  );
});

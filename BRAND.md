# Cosmos: sistema de marca para las webs

Fuente: "Propuesta de marca Cosmos", 33 paginas, Illustrator, 14 sep 2026.
Este archivo es la unica fuente de verdad para el rediseño de cosmosapp.lat y
cosmospay.lat. Si algo no esta aca, se resuelve mirando las hojas de contacto
del PDF en `brief/sheet-*.png`, nunca inventando.

## 1. Concepto

**"Tu mundo digital en movimiento."**

Una identidad diseñada para estar en movimiento. Cosmos es un ecosistema
digital que conecta herramientas, servicios y experiencias dentro de un mismo
universo: tecnologico, solido y confiable, pero cercano, dinamico y preparado
para evolucionar. Tres ideas sostienen todo el sistema:

1. **Movimiento**
2. **Conexion**
3. **Evolucion**

Valores: 01 Confianza, 02 Cercania, 03 Innovacion, 04 Libertad.

Mision: desarrollar un ecosistema tecnologico simple, confiable y adaptable que
permita operar, pagar, integrar servicios y trabajar con blockchain de forma
mas accesible y eficiente.

Vision: ser un ecosistema tecnologico referente, empezando desde Stellar y
evolucionando hacia nuevas redes, productos y servicios digitales.

## 2. Tono y voz

La comunicacion es: clara, cercana, segura, profesional, agil, actual.

Cosmos habla como una tecnologia en la que podes confiar. Voz directa, clara y
segura. Evita el lenguaje excesivamente corporativo o tecnico y prioriza una
comunicacion humana, precisa y actual. Puede ser juvenil y cercana, pero nunca
pierde solidez. Voseo rioplatense en español.

**Direccion creativa**: estetica tecnologica y profesional con lenguaje visual
cercano, joven y dinamico. Formas curvas, composiciones limpias, ilustraciones
de caracter humano y una paleta dominada por azules. Transmitir innovacion y
confianza **sin recurrir a los codigos rigidos o excesivamente futuristas
habituales del sector**. Nada de neon cyber, nada de grids de circuito, nada
de hexagonos.

## 3. Paleta (son cuatro colores, y nada mas)

| Nombre | Hex | RGB | Rol |
| --- | --- | --- | --- |
| Black | `#000000` | 0 0 0 | Fondo principal en oscuro. Texto en claro. |
| White | `#FFFFFF` | 255 255 255 | Fondo principal en claro. Texto en oscuro. |
| Dark Navy | `#05064F` | 5 6 79 | Superficies de marca, paneles, fondos de tarjeta y de bloques destacados. |
| Cosmic Blue | `#000877` | 0 8 119 | Acento: botones primarios, links, la palabra "pay" en el lockup, la cinta. |

"La eleccion cromatica parte del contraste entre solidez y movimiento. El
negro y el blanco construyen una base clara y atemporal, mientras los azules
aportan profundidad, innovacion y una energia vinculada al universo digital."

Reglas:

- La base es **negro y blanco puros**. Los azules son acento y superficie de
  marca, no fondo de pagina. Una pagina entera en Cosmic Blue no existe en el
  deck; un panel o una tarjeta en Dark Navy si.
- Los grises intermedios (texto secundario, bordes, superficies elevadas) se
  derivan por opacidad sobre la base: blanco al 60 % para texto secundario en
  oscuro, negro al 55 % en claro, bordes al 12 %. No se agregan grises de
  marca.
- Cosmic Blue sobre negro tiene poco contraste (el propio deck lo anota como
  feedback: "el azul se pierde sobre el fondo negro"). Para texto o iconos
  chicos sobre negro, usar blanco; reservar Cosmic Blue para superficies,
  botones con texto blanco encima, y la cinta.
- Contraste minimo AA en todo texto. Texto blanco sobre Cosmic Blue: 12.6:1,
  ok. Texto Cosmic Blue sobre blanco: 12.6:1, ok. Cosmic Blue sobre negro
  como texto: 1.7:1, prohibido.
- Los brillos azules de las fotos del deck (halos, luz de pantalla) son
  tratamiento fotografico, no un quinto color. En CSS se consiguen con un
  `radial-gradient` de Cosmic Blue a transparente, nunca con un azul mas claro.

Tokens propuestos (mismos nombres en los dos repos):

```
--cosmos-black:  #000000
--cosmos-white:  #FFFFFF
--cosmos-navy:   #05064F
--cosmos-blue:   #000877
```

## 4. Tipografia

**Open Sauce One** es la familia de todo el sistema. Esta embebida en el deck
en Light, Regular, Medium, SemiBold y SemiBold Italic, y la usan tanto los
titulos gigantes de seccion como el cuerpo. Es libre (SIL OFL 1.1). Archivos
en `fonts/OpenSauceOne-{Light,Regular,Medium,SemiBold,Bold}.woff2`.

**POI Aeronaut** aparece una sola vez, como "POI Aeronaut Trial", en el
specimen del tagline. Es una fuente de prueba: **no se puede embeber en
produccion**. El nombre de marca nunca se tipea, siempre va como SVG
(`wordmark-cosmos.svg`). Donde el deck usaria POI Aeronaut para un tagline
grande, usar Open Sauce One Light.

Escala, tomada de como el deck compone sus paginas:

| Rol | Peso | Tamaño | Notas |
| --- | --- | --- | --- |
| Titulo de seccion | Light (300) | clamp(2.75rem, 6vw, 5rem) | Enorme, fino, en dos lineas, tracking -0.02em, leading 1.0. Es el gesto tipografico principal del deck. |
| Tagline / hero | Light o Regular | clamp(2.5rem, 5.5vw, 4.5rem) | Mayusculas solo en el tagline de la cinta ("TU MUNDO DIGITAL EN MOVIMIENTO"); en el resto, oracion normal. |
| Subtitulo | Regular (400) | 1.25rem | |
| Cuerpo | Regular (400) | 1rem / 1.55 | |
| Cuerpo chico | Regular | 0.875rem | El deck usa cuerpos muy chicos con mucho aire alrededor. |
| Etiqueta | Medium (500) | 0.75rem | Numeracion de seccion "/01", rotulos. Sin tracking exagerado. |
| Boton | SemiBold (600) | 0.9375rem | |

Numeracion de secciones: el deck marca cada capitulo con "/01", "/02", "/03"
en chico, a la derecha del titulo. Ese es el rotulo de seccion de la marca;
reemplaza a los "kickers" en mayusculas con tracking abierto que usan hoy los
dos sitios.

**Aviso sobre POI Aeronaut.** El kit oficial de la agencia incluye
`Aeronaut.otf`, pero al inspeccionarlo declara familia "POI Aeronaut Trial" y
licencia "License required for personal and commercial use" (Place of Interest
Type Foundry, poitype.com/licensing). Es la version de prueba: NO se puede
embeber en produccion. Hasta que se compre la licencia, los titulares van en
Open Sauce One Light y el nombre de marca siempre como SVG.

## 5. Elementos graficos

**La cinta.** Una linea continua, curva, de recorrido libre, en Cosmic Blue
con volumen y brillo. Evoca trayectorias, conexiones y nuevas posibilidades.
Es el elemento hero de la marca: aparece detras del tagline, alrededor del
logo, en la tarjeta, en el reloj. Raster en `raster/p21-ribbon-000.png`
(1672x941, fondo negro). Usar como fondo de hero o de un panel destacado, con
`object-fit: cover`, nunca estirada. En claro no hay version: la cinta vive
sobre negro o navy.

**Los trazos.** Seis garabatos vectoriales monocromos (`trazo-1..6-mono.svg`),
la version en linea de la cinta. Sirven como ornamento en tarjetas, fondos de
seccion en claro, separadores, iconografia grande. Se pintan con
`currentColor`: negro sobre blanco, blanco sobre negro, Cosmic Blue sobre
blanco.

**El astronauta.** Personaje de marca: ilustracion en linea, gestual, curioso,
en movimiento. "Una forma mas humana de explorar lo digital".

La agencia entrega **siete poses** (con celular, de pie, flotando, OK, pensando,
pose relajada, trabajando) y **siete variantes de cada una**. En
`public/brand/personaje/` estan instaladas las tres que sirven para web:

| Archivo | Que es | Donde va |
| --- | --- | --- |
| `<pose>-negro.png` | Linea negra limpia, sin contorno | Sobre blanco |
| `<pose>-azul.png` | Linea en Cosmic Blue, sin contorno | Sobre blanco, cuando se quiere color |
| `<pose>-sticker.png` | Relleno negro con contorno blanco grueso | Sobre negro, navy o una foto |

CORRECCION respecto de la primera version de este documento: yo habia escrito
que el personaje nunca se recolorea. Es falso. El kit oficial trae versiones en
Cosmic Blue, y son parte del sistema. Lo que sigue valiendo: no se le inventan
colores fuera de la paleta, no se usa chico como icono (minimo 180px de alto),
una pose por pantalla, y no aparece en tablas, formularios ni checkout.

En el deck ademas aparece sobre fondo navy a sangre completa (pagina 19), que
es la version sticker.

**Fotografia.** Retratos y calles en blanco y negro con luz azul (pantalla de
telefono, neon, halo). Ambas webs hoy no tienen fotos; no hace falta agregar
stock. Si se agrega, ese es el tratamiento.

## 6. Logo

- `isotipo.svg` / `isotipo-mono.svg`: la C con el trazo que la atraviesa.
  Cuadrado. Minimo 24px. Es el favicon, el icono de app y el avatar.
- `wordmark-cosmos.svg` / `-mono`: la palabra "cosmos" en su trazado custom.
  Nunca se tipea con una fuente.
- `lockup-cosmos-pay.svg` / `-mono`: isotipo + "cosmos" arriba de "pay",
  apilado. Es la marca de cosmospay.lat.
- `lockup-cosmos-pay-wallet.svg` / `-mono`: isotipo + "cosmos pay wallet".
  Para la wallet, no para las webs.
- `isotipo-variante-*.svg`: el isotipo en caja redondeada (icono de app) y
  variantes de trazo.

En el lockup de tarjeta la palabra "pay" va en Cosmic Blue sobre negro. En el
resto de los lockups todo va de un solo color. Area de respeto: la altura de
la "c" del wordmark alrededor. Nunca sobre la cinta sin un panel liso debajo,
nunca con sombra, nunca deformado.

Dark: logo blanco. Light: logo negro. Sobre navy: blanco.

## 7. Lenguaje de layout (como compone el deck)

- Paneles a sangre completa que **alternan negro y blanco**. Un capitulo
  negro, el siguiente blanco. Ese ritmo binario es la estructura de pagina.
  Los paneles navy son la excepcion que marca un momento de marca (una
  tarjeta, el cierre).
- Mucho aire. Titulo enorme y fino arriba a la izquierda, texto chico abajo
  o a la derecha, y espacio vacio deliberado. Nada de rellenar.
- Grillas de a dos o de a tres, nunca cuatro columnas de tarjetas iguales.
- Sin sombras de tarjeta. Las superficies se separan por color (navy sobre
  negro, blanco sobre negro) o por un borde al 12 %, no por elevacion.
- Bordes redondeados generosos en tarjetas y botones (16 a 24px), en linea
  con las "formas curvas" de la direccion creativa. Ningun elemento cuadrado
  de esquinas vivas salvo los paneles de pagina.
- Botones: primario Cosmic Blue con texto blanco; en oscuro, primario blanco
  con texto negro; secundario solo borde. Forma pill (radio 999px) o 12px,
  elegir uno por sitio y sostenerlo.
- Iconos de linea, trazo 1.5px, nunca rellenos.
- Movimiento: transiciones suaves, 250 a 400ms, easing suave. La cinta puede
  tener un desplazamiento lento en el hero. Respetar
  `prefers-reduced-motion`.

## 8. Banco de copy (frases del deck, usar textual)

- Tu mundo digital en movimiento.
- Tu mundo en movimiento.
- Todo desde un solo lugar.
- Simple. Conectado. Sin limites.
- Simple. Seguro. Sin limites.
- Paga. Envia. Conecta.
- Tu mundo digital en una wallet.
- Una nueva forma de mover tu mundo digital.
- Tecnologia simple para operar, conectar y seguir creciendo.
- Todo lo que necesitas para moverte, en un mismo lugar.
- Gracias por confiar.

## 9. Que cambia en cada sitio

### cosmosapp.lat (marketplace, repo Cosmos-frontend, React + Vite + Tailwind 4)

Hoy: oscuro por defecto, rampa de cinco azules con acento `#2667FF`, fuentes
Space Grotesk / Inter / Plus Jakarta / Sora, siete secciones de landing con
grillas de tarjetas repetidas, sin logo de marca (tiene un logo viejo).

Mapa de tokens en `src/index.css`:

| Hoy | Nuevo |
| --- | --- |
| `--cosmos-palette-bg` #0a0a0b (dark) / #e8ebf0 (light) | `#000000` / `#FFFFFF` |
| `--cosmos-palette-surface` #141416 / #eef1f6 | `#05064F` en oscuro (navy como superficie de marca) / `#FFFFFF` con borde en claro |
| `--cosmos-palette-surface-elevated` | negro al 100 % + borde blanco 12 % en oscuro / blanco + borde negro 12 % en claro |
| `--cosmos-palette-accent` #2667ff / #3f8efc | `#000877` en claro; en oscuro el acento para texto es **blanco** y `#000877` queda para superficies y botones |
| `--cosmos-palette-brand-1..5` (rampa) | eliminar; quedan navy y blue |
| `--cosmos-palette-muted` #64748b / #a1a1aa | negro 55 % / blanco 60 % |
| `--cosmos-palette-border` #d1d8e3 / #27272a | negro 12 % / blanco 12 % |
| `--cosmos-stat-warm` #f97316 (naranja) | eliminar, no existe en la marca. Las etiquetas "destacado"/"ultimas unidades" pasan a Cosmic Blue o a borde blanco |
| `--font-display` Space Grotesk | Open Sauce One |
| `--font-sans` Inter | Open Sauce One |
| `--font-panel`, `--font-panel-display` (Plus Jakarta, Sora) | Open Sauce One |
| `--radius-card` 1rem, `--radius-button` 0.5rem | 1.25rem, 999px (pill) |

Landing: rehacer con la estructura del deck (paneles alternos, titulo /01
/02, cinta en el hero, astronauta en "para cada actor", copy del banco).
Header: reemplazar `BrandLogo` por isotipo + wordmark SVG. Fichas de producto:
sacar el naranja, quitar sombras, borde 12 %. Los amarillos de las estrellas
de rating se mantienen (son semantica de rating, no marca).

### cosmospay.lat (developer platform, repo CosmosPay-Developer-Platform, Astro + React, CSS propio)

Hoy: claro por defecto, violeta `#6B47FF` como acento, Hanken Grotesk +
Poppins de Google Fonts, hero "Write less code, move more money" estilo
Stripe, banda de stats negra con brillo violeta, CTA en gradiente violeta.

Mapa de tokens en `src/styles/cosmos.css`:

| Hoy | Nuevo |
| --- | --- |
| `--bg` #FBFBFB / #0A0A0A | `#FFFFFF` / `#000000` |
| `--surface` #FFFFFF / #161616 | `#FFFFFF` / `#05064F` |
| `--surface-2` #F4F4F4 / #1F1F1F | negro 4 % / blanco 6 % |
| `--ink`, `--ink-2`, `--ink-3` | negro 100/55/40 % en claro; blanco 100/60/40 % en oscuro |
| `--line`, `--line-2` | negro 12/20 % en claro; blanco 12/20 % en oscuro |
| `--violet` #6B47FF, `--violet-d` #5734E6 | `#000877` y `#05064F`. Renombrar a `--accent` y `--accent-d`, dejar `--violet` como alias durante la transicion |
| `--lav`, `--lav-2` (lavanda) | navy al 10 % / navy al 18 % |
| `--blue` #5B7CFF, `--blue-soft` | `#000877`, navy al 10 % |
| `--ff-sans` Hanken Grotesk, `--ff-soft` Poppins | ambas Open Sauce One; sacar el `<link>` a Google Fonts |
| `--radius` 14px, `--radius-lg` 22px | 16px, 24px |
| `.stats-band` #141414 + brillo violeta | `#05064F` sin brillo, o negro con la cinta de fondo |
| `.cta-card` gradiente violeta | panel navy liso, o negro con cinta |
| `.terminal` tokens de sintaxis violeta | mantener el terminal oscuro; cambiar `--tok-kw` a un azul claro legible sobre #161616, no Cosmic Blue |
| `.cosmos-mark` PNG por tema | lockup SVG `lockup-cosmos-pay-mono.svg` con `currentColor` |

Landing: mantener la estructura de secciones (Hero, Api, Integration, Solutions,
Stats, Stories, Testimonials, Resources, Cta) porque el contenido es bueno y
esta traducido a cinco idiomas en `src/lib/i18n/messages/*.ts`. Lo que cambia
es la piel: titulos Light gigantes, numeracion /01, alternancia negro y
blanco entre secciones, cinta en el hero en lugar del "art" de nodos, sin
gradientes ni halftones. El copy tecnico en ingles se queda; el tagline de
marca puede ir en español en el hero porque es el nombre del concepto.

## 10. Lo que NO se hace

- No se inventan colores. Cuatro, y grises por opacidad.
- No se tipea "cosmos" ni "cosmos pay" con una fuente. Siempre SVG.
- No se embebe POI Aeronaut.
- No se recolorea el astronauta ni se usa como icono.
- No gradientes de color a color (violeta a azul, azul a cyan). Solo Cosmic
  Blue a transparente como halo.
- No sombras de elevacion. No halftones. No grids de puntos.
- No cuatro columnas de tarjetas iguales.
- No kickers en mayusculas con tracking abierto; se usa "/01".
- No se toca la logica: rutas, API, i18n, auth, formularios siguen igual. Es
  un cambio de piel, no de producto.

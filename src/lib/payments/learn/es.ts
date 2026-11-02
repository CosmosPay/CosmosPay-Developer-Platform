/* The gateway's guides in Spanish (tú, neutral for Latin America). Mirrors src/lib/payments/learn/en.ts key for key. */
import type { LearnMessages } from "@/lib/payments/learn/en";

export const es: LearnMessages = {
  hub: {
    nav: "Guías",
    title: "Guías de pagos con stablecoins",
    lede: "Guías para negocios que cobran en stablecoins con Cosmos Pay: cómo aceptar USDC online o con Solana Pay, cómo enviar un enlace de pago por WhatsApp, cómo confirmar pagos en tu servidor, qué hace una pasarela de pagos con stablecoins, cómo se comparan Stellar, Solana y Monad y cómo enviar USDT0 desde Stellar a redes EVM.",
    meta: "Guías de pagos con stablecoins | Cosmos Pay",
    description: "Guías: acepta USDC online o con Solana Pay, enlaces de pago por WhatsApp, confirma pagos con webhooks, Stellar vs Solana vs Monad y USDT0 desde Stellar.",
  },
  ui: {
    updated: "Actualizado el {date}",
    by: "Por Cosmos Pay",
    related: "Guías relacionadas",
    more: "Más guías",
    all: "Ver todas las guías",
  },
  guides: {
    acceptUsdc: {
      nav: "Aceptar pagos en USDC",
      title: "Cómo aceptar pagos en USDC online",
      meta: "Cómo aceptar pagos en USDC online | Cosmos Pay",
      description: "Acepta USDC con un enlace de pago, un checkout alojado o una API en Stellar, Solana o Monad: qué necesitan tú y tu cliente, y cómo probar antes.",
      summary: "Cobra en USDC con un enlace de pago, el checkout alojado o la API, y pruébalo antes en una red de pruebas.",
      lede: "Para aceptar USDC online con Cosmos Pay, agrega la wallet que va a recibir el dinero y cobra con un enlace de pago, el checkout alojado o la API de pagos. Tu cliente paga desde su propia wallet en Stellar, Solana o Monad, y los USDC llegan a tu dirección. Pruébalo en una red de pruebas antes de cobrar dinero real.",
      sections: {
        need: {
          title: "Qué necesitas",
          body: [
            "Una cuenta de Cosmos Pay. Crearla es gratis, y el plan Starter no tiene cuota mensual: cada pago paga {starterRate}.",
            "Una dirección de wallet que reciba los USDC, en la red en la que cobras: Stellar, Solana o Monad. La agregas a tu organización en el dashboard y demuestras con una firma que es tuya. Los enlaces de pago creados en el dashboard pagan solo a las wallets agregadas ahí.",
          ],
          links: { fees: "Ver la tarifa de cada plan" },
        },
        payer: {
          title: "Qué necesita tu cliente",
          body: [
            "Una wallet en la misma red que tenga los USDC y pueda abrir el pago: en Stellar, cualquier wallet que abra enlaces SEP-7; en Solana, cualquier wallet que lea enlaces de Solana Pay; en Monad, cualquier wallet EVM que lea enlaces EIP-681. Su wallet también cubre la comisión de red.",
            "No necesita una cuenta. Abre el checkout, escanea el código QR o toca el botón de la wallet, y aprueba el pago en su wallet.",
          ],
        },
        ways: {
          title: "Tres formas de cobrar",
          body: ["Las tres usan el mismo checkout, el mismo dashboard y los mismos webhooks, así que puedes empezar con un enlace y pasar a la API cuando la necesites."],
          points: [
            "Enlace de pago: créalo en el dashboard y envíalo por chat o correo, o muestra su código QR. Sin código.",
            "Checkout alojado: envía a tu cliente a la página de pago del enlace, ábrela desde un botón de pago o muéstrala dentro de tu página con una sola etiqueta script.",
            "API de pagos: crea cada pago desde tu servidor con una solicitud, o con el SDK de TypeScript, y diseña tu propia pantalla de pago.",
          ],
          links: { whatsappGuide: "Enviar un enlace de pago por WhatsApp", integrations: "Probar todas las opciones de integración", embed: "Insertar un pago en tu página" },
        },
        network: {
          title: "En qué red cobrar",
          body: [
            "Cobra en la red donde tus clientes ya tienen USDC. USDC está predefinido en Stellar y Solana, en sus redes principales y de pruebas, y en la red principal de Monad. En las tres, cualquier otro token se puede cobrar indicando su emisor, mint o contrato.",
          ],
          links: { networksGuide: "Stellar vs Solana vs Monad", stellar: "Pagos en Stellar", solana: "Pagos en Solana", monad: "Pagos en Monad" },
        },
        cost: {
          title: "Cuánto cuesta",
          body: [
            "Cada pago paga la tarifa de tu plan, la misma en todas las redes: {starterRate} en Starter, sin cuota mensual. La wallet de quien paga cubre la comisión de red; en Monad, la comisión del reenvío que te hace llegar el pago se descuenta de ese pago.",
          ],
          links: { fees: "Precios y calculadora de comisiones", compare: "Cómo se comparan nuestras comisiones" },
        },
      },
      steps: {
        title: "Acepta tu primer pago en USDC, paso a paso",
        items: {
          sandbox: { title: "Crea tu cuenta y cambia a Sandbox", body: "Inicia sesión en el dashboard y elige Sandbox en la parte superior. Lo que crees ahí funciona en las redes de prueba (Stellar Testnet, Solana Devnet y Monad Testnet) y no mueve dinero real." },
          wallet: { title: "Agrega la wallet que recibe el dinero", body: "En los ajustes de tu organización, agrega una wallet en la red en la que vas a cobrar y firma lo que te pide el dashboard: así demuestras que la wallet es tuya." },
          charge: { title: "Crea un cobro de prueba", body: "En Pagos, crea un enlace de pago con la red, el monto, el activo y la wallet que lo recibe. O crea una clave de API de prueba (empieza con dv_) y llama a POST /v1/payment-intents/pay desde tu servidor. En Stellar Testnet puedes cobrar en XLM, que Friendbot, el faucet de Testnet, envía a una cuenta de prueba." },
          pay: { title: "Págalo desde una wallet de prueba", body: "Abre la página de pago: indica que funciona en una red de pruebas. Paga desde una wallet en esa red y mira cómo el checkout pasa a Pagado y el enlace a Completado en el dashboard." },
          confirm: { title: "Confirma los pagos en tu servidor", body: "Agrega un endpoint de webhook en el dashboard. Cuando la red confirma un pago, Cosmos Pay envía PAYMENT_INTENT_SUCCEEDED, firmado con HMAC-SHA256. Entrega el pedido cuando llegue ese evento, no cuando la página del cliente diga que está pagado." },
          live: { title: "Cambia a Producción", body: "Elige Producción en el dashboard y crea una clave de API de producción (empieza con prod_). Las mismas solicitudes ahora cobran en las redes principales: la red la decide la clave, no el código." },
        },
        links: { gettingStarted: "Primeros pasos", apiKeys: "Claves de API", webhooks: "Webhooks", paymentIntents: "API de intentos de pago" },
      },
      faq: {
        nocode: { q: "¿Puedo aceptar USDC sin escribir código?", a: "Sí. Crea un enlace de pago en el dashboard y compártelo por chat o correo, o muestra su código QR. El estado de cada pago se ve en el dashboard." },
        asset: { q: "¿Mi cliente paga en USDC y yo recibo USDC?", a: "Sí. Tu cliente paga en el activo definido en el enlace, y ese mismo activo llega a tu dirección." },
        test: { q: "¿Puedo probarlo sin dinero real?", a: "Sí. En Sandbox y con claves de prueba (dv_), los enlaces funcionan en redes de prueba, y su checkout indica que no se mueven fondos reales." },
        refunds: { q: "¿Un cliente puede revertir un pago en USDC?", a: "No. Una vez que la red confirma un pago, es definitivo. Un reembolso es un pago nuevo que envías desde tu wallet." },
      },
    },
    whatsapp: {
      nav: "Enlaces de pago por WhatsApp",
      title: "Cómo enviar un enlace de pago por WhatsApp",
      meta: "Enlaces de pago por WhatsApp: crear y compartir | Cosmos Pay",
      description: "Crea un enlace de pago en stablecoins en el dashboard de Cosmos Pay, envíalo por WhatsApp o imprime su código QR, y mira el momento en que se paga.",
      summary: "Crea un enlace en el dashboard, envíalo por chat o imprime su código QR, y mira cuándo se paga.",
      lede: "Crea un enlace de pago en el dashboard de Cosmos Pay, copia el enlace de su página de pago y pégalo en el chat de WhatsApp. Tu cliente lo abre y paga desde su propia wallet en Stellar, Solana o Monad, y el enlace pasa a Completado en tu dashboard cuando la red confirma el pago.",
      sections: {
        before: {
          title: "Antes de empezar",
          body: [
            "En los ajustes de tu organización en el dashboard, agrega la wallet que va a recibir el dinero, en la red en la que vas a cobrar. Un enlace de pago solo paga a una de esas wallets.",
            "Pruébalo una vez en Sandbox: ahí los enlaces funcionan en redes de prueba, y su checkout indica que no se mueven fondos reales.",
          ],
        },
        customer: {
          title: "Qué ve tu cliente",
          body: [
            "La página de pago muestra el monto, el activo, la red y el tiempo que queda para pagar. Tu cliente elige cómo pagar: escanear el código QR con una app de wallet, abrir el pago en una wallet del mismo dispositivo o enviarlo a mano con los datos que se muestran.",
            "La página se abre en el idioma de su navegador cuando es uno de los siete que habla el checkout: inglés, español, portugués, francés, alemán, hindi y chino. Pasa a Pagado cuando la red confirma el pago y enlaza la transacción en un explorador público. Tu cliente no necesita una cuenta.",
          ],
        },
        know: {
          title: "Para tener en cuenta",
          points: [
            "Un enlace es un pago. Una vez pagado no se puede volver a pagar, así que crea uno por venta o factura.",
            "Un enlace queda abierto por un tiempo limitado, que el checkout muestra como cuenta regresiva. Después, el checkout le indica a tu cliente que te pida un enlace nuevo; si aun así llega un pago y se confirma, el enlace queda como pagado.",
            "En Stellar y Solana puedes dejar el monto vacío, y tu cliente lo elige. Un enlace de Monad necesita un monto.",
            "Cada pago paga la tarifa de tu plan ({starterRate} en Starter, sin cuota mensual). La wallet de tu cliente cubre la comisión de red.",
          ],
          links: { acceptGuide: "Cómo aceptar pagos en USDC online", paymentLinks: "API de enlaces de pago" },
        },
      },
      steps: {
        title: "Crea el enlace y envíalo",
        items: {
          create: { title: "Crea el enlace", body: "En el dashboard, abre Pagos y elige Crear enlace de pago. Selecciona la red, el monto y su activo, luego la wallet que lo recibe y el diseño de checkout. En Stellar y Solana puedes agregar un mensaje que tu cliente ve en su wallet." },
          copy: { title: "Copia la página de pago", body: "Cuando esté listo, copia el enlace de su página de pago: payments.cosmospay.lat seguido del id del enlace. Se abre en cualquier navegador, en un teléfono o en una computadora." },
          send: { title: "Envíalo por WhatsApp", body: "Pega el enlace en el chat, junto con el motivo del pago. La vista previa de una app de chat muestra una tarjeta genérica de solicitud de pago de Cosmos Pay, sin el monto ni tu dirección. El correo, los mensajes de texto y cualquier otra app de chat funcionan igual." },
          qr: { title: "O imprime el código QR", body: "Descargar QR guarda el código QR del enlace como imagen, el mismo código que muestra la página de pago. Tu cliente lo escanea con su app de wallet. Imprímelo, o muéstralo en una pantalla, para una venta en persona." },
          paid: { title: "Comprueba que se pagó", body: "La página del enlace en el dashboard sigue los pasos de tu cliente: en la página de pago, wallet abierta, pago enviado, pagado. Cuando la red confirma el pago, el enlace muestra Completado y, si agregaste un endpoint de webhook, tu servidor recibe PAYMENT_INTENT_SUCCEEDED." },
        },
        links: { webhooks: "Webhooks", linkDemo: "Probar la demo de enlaces de pago" },
      },
      faq: {
        account: { q: "¿Mi cliente necesita una cuenta?", a: "No. Necesita una wallet en la red del enlace que tenga el activo. Abre el enlace y aprueba el pago en su wallet." },
        reuse: { q: "¿Puedo enviar el mismo enlace a varios clientes?", a: "No. Un enlace se paga una sola vez. Crea un enlace nuevo para cada venta." },
        preview: { q: "¿La vista previa de WhatsApp muestra el monto?", a: "No. La vista previa es la misma tarjeta genérica de solicitud de pago para todos los enlaces. Tu cliente ve el monto al abrir la página de pago." },
        expired: { q: "¿Qué pasa si mi cliente abre el enlace después de que venció?", a: "El checkout indica que el enlace venció y le dice que te pida uno nuevo. Crea otro enlace y envíaselo." },
      },
    },
    gateway: {
      nav: "Pasarelas de pagos con stablecoins",
      title: "¿Qué es una pasarela de pagos con stablecoins?",
      meta: "¿Qué es una pasarela de pagos con stablecoins? | Cosmos Pay",
      description: "Qué hace una pasarela de pagos con stablecoins, dónde se liquida el dinero, quién paga la comisión de red, con o sin custodia, y cómo funciona Cosmos Pay.",
      summary: "Qué hace una pasarela, dónde se liquida el dinero, quién paga la comisión de red y en qué se diferencian las pasarelas con y sin custodia.",
      lede: "Una pasarela de pagos con stablecoins le permite a un negocio cobrar en stablecoins como USDC. Crea la solicitud de pago, le muestra al cliente cómo pagar desde su propia wallet y le avisa al negocio cuando la red confirma el pago. Algunas pasarelas reciben el dinero y te guardan un saldo; una sin custodia, como Cosmos Pay, hace que el pago llegue a una dirección que tú controlas.",
      sections: {
        stablecoin: {
          title: "Qué es una stablecoin",
          body: [
            "Una stablecoin es un token pensado para mantener un valor estable frente a una moneda, casi siempre el dólar estadounidense. Se mueve en una blockchain como cualquier otro token, de una wallet a otra, cualquier día y a cualquier hora.",
            "USDC y EURC son dos de ellas, ambas emitidas por Circle. Circle indica que USDC se puede canjear uno a uno por dólares estadounidenses, y EURC uno a uno por euros.",
          ],
          links: { circleUsdc: "USDC, en el sitio de Circle", circleEurc: "EURC, en el sitio de Circle" },
        },
        does: {
          title: "Qué hace la pasarela",
          points: [
            "Crea la solicitud de pago (el monto, el activo, la red y la dirección a pagar) como un enlace y un código QR en el formato que leen las wallets: SEP-7 en Stellar, Solana Pay en Solana, EIP-681 en redes EVM como Monad.",
            "Le muestra al cliente una página de pago con esa solicitud, para que pague desde la wallet que ya usa.",
            "Vigila la red y asocia cada pago con su solicitud, mediante un memo, una clave de referencia o una dirección creada para ese pago.",
            "Le avisa al negocio cuando la red confirma el pago, en un dashboard y con un webhook firmado a su servidor.",
          ],
          links: { sep7: "El estándar SEP-7 (Stellar)", solanaPay: "La especificación de Solana Pay", eip681: "El estándar EIP-681 (Ethereum)" },
        },
        settle: {
          title: "Dónde se liquida el dinero",
          body: [
            "La liquidación es el momento en que el dinero llega al negocio. Con una stablecoin ocurre en la propia red: una vez que la red confirma la transferencia, el pago es definitivo y no admite contracargos. Un reembolso es un pago nuevo que envía el negocio.",
          ],
        },
        fees: {
          title: "Quién paga la comisión de red",
          body: [
            "Toda transferencia paga una comisión a la red en la que se hace. Con Cosmos Pay la cubre la wallet de quien paga, en Stellar, Solana y Monad. En Monad cada pago va a una dirección creada para él, y el reenvío que lo lleva al negocio descuenta su comisión del pago; la API la informa en el pago como networkFee.",
            "La comisión propia de la pasarela es aparte. Cosmos Pay cobra una tarifa por pago que depende del plan: {starterRate} en Starter, sin cuota mensual.",
          ],
          links: { fees: "Precios y calculadora de comisiones" },
        },
        custody: {
          title: "Pasarelas con custodia y sin custodia",
          body: [
            "Una pasarela con custodia recibe el pago en una cuenta que ella controla y te muestra un saldo, que retiras más tarde. Una pasarela sin custodia nunca tiene el dinero en su poder: el pago va a una dirección cuyas claves tienes tú.",
            "La diferencia está en quién controla los fondos entre la venta y el momento en que los usas, y en quién guarda las claves. Con una pasarela sin custodia las guardas tú, así que cuidarlas es tu responsabilidad.",
          ],
        },
        fit: {
          title: "Dónde encaja Cosmos Pay",
          body: [
            "Cosmos Pay es una pasarela de pagos con stablecoins sin custodia en Stellar, Solana y Monad. Cobras con un enlace de pago, el checkout alojado o la API de pagos, y eliges las direcciones de wallet que reciben el dinero. Cosmos Pay no guarda las claves de nadie.",
            "En Stellar y Solana tu cliente paga directo a tu dirección. En Monad cada pago va a una dirección de depósito creada para él, que solo puede reenviarlo a tu dirección (menos la comisión del reenvío): Cosmos Pay no tiene ninguna clave de ella. Cada pago se puede verificar en la red, y cada checkout pagado enlaza su transacción en un explorador público.",
          ],
          links: { security: "Cómo se protegen los pagos", acceptGuide: "Cómo aceptar pagos en USDC online", integrations: "Opciones de integración" },
        },
      },
      faq: {
        final: { q: "¿Se puede hacer un contracargo de un pago en stablecoins?", a: "No. Una vez que la red lo confirma, es definitivo. Un reembolso es un pago que el negocio envía de vuelta desde su wallet." },
        custody: { q: "¿Cosmos Pay retiene mi dinero?", a: "No. En Stellar y Solana quien paga envía directo a tu dirección. En Monad cada pago va a una dirección de depósito creada para él, que solo puede reenviarlo a tu dirección (menos la comisión del reenvío): Cosmos Pay no tiene ninguna clave de ella." },
        wallet: { q: "¿Necesito mi propia wallet?", a: "Sí. Los pagos llegan a una dirección que controlas en cada red que aceptes, así que los fondos son tuyos desde el primer pago." },
        customers: { q: "¿Mis clientes necesitan una cuenta?", a: "No necesitan una cuenta en Cosmos Pay. Necesitan una wallet en la red del pago que tenga la stablecoin." },
      },
    },
    networks: {
      nav: "Stellar vs Solana vs Monad",
      title: "Stellar vs Solana vs Monad para aceptar pagos",
      meta: "Stellar vs Solana vs Monad para aceptar pagos | Cosmos Pay",
      description: "Stellar, Solana y Monad comparadas para aceptar pagos en stablecoins con Cosmos Pay: formato del enlace, activos, redes de prueba, comisiones y tarifas.",
      summary: "Las tres redes lado a lado, tal como las admite Cosmos Pay: formato del enlace, activos, redes de prueba y comisiones.",
      lede: "Con Cosmos Pay, un pago en Stellar, Solana o Monad llega a tu dirección y paga la misma tarifa del plan. Lo que cambia es el enlace que lee la wallet (SEP-7 en Stellar, Solana Pay en Solana, EIP-681 hacia una dirección de depósito en Monad), cómo se asocia un pago con su enlace y qué activos están predefinidos. La tabla las compara tal como las admite Cosmos Pay.",
      table: {
        title: "Las tres redes, lado a lado",
        caption: "Stellar, Solana y Monad comparadas para aceptar pagos con Cosmos Pay",
        topic: "Tema",
        rows: {
          link: { k: "Enlace de pago", stellar: "SEP-7 (web+stellar:pay) y su código QR", solana: "Solicitud de transferencia de Solana Pay (solana:) y su código QR", monad: "EIP-681 (ethereum:) y su código QR, hacia una dirección de depósito creada para ese pago" },
          match: { k: "Cómo se identifica un pago", stellar: "Un memo numérico en el enlace", solana: "Una clave de referencia de Solana Pay en el enlace", monad: "Su propia dirección de depósito" },
          settle: { k: "Adónde va el dinero", stellar: "Directo a tu dirección", solana: "Directo a tu dirección", monad: "Una dirección de depósito que solo puede reenviarlo a tu dirección" },
          fee: { k: "Comisión de red", stellar: "La cubre la wallet de quien paga", solana: "La cubre la wallet de quien paga", monad: "La wallet de quien paga cubre su transferencia; la comisión del reenvío se descuenta del pago" },
          presets: { k: "Activos predefinidos" },
          test: { k: "Red de pruebas" },
          amount: { k: "Monto", stellar: "Fijo, o lo elige quien paga", solana: "Fijo, o lo elige quien paga", monad: "Obligatorio" },
          message: { k: "Mensaje en la wallet", stellar: "Sí", solana: "Sí", monad: "No" },
          merchantFee: { k: "Tu propia comisión en un pago", stellar: "Quien paga indica su cuenta y envía el pago y tu comisión en una sola transacción", solana: "Una solicitud de transacción de Solana Pay con las dos transferencias", monad: "La dirección de depósito divide el pago" },
          wallets: { k: "Wallets que pagan", stellar: "Cualquier wallet que abra enlaces SEP-7, como {wallets}", solana: "Cualquier wallet que lea enlaces de Solana Pay, como {wallets}", monad: "Cualquier wallet EVM que lea enlaces EIP-681" },
          private: { k: "Pagos privados", stellar: "Sí, por ahora en Testnet", solana: "No", monad: "No" },
          rate: { k: "Tarifa de Cosmos Pay", value: "La tarifa de tu plan ({starterRate} en Starter)" },
        },
        note: "Los activos predefinidos son los que el dashboard ofrece por nombre; la página de cada red lista sus direcciones. Cualquier otro token se indica por su emisor, mint o contrato.",
        links: { sep7: "El estándar SEP-7 (Stellar)", solanaPay: "La especificación de Solana Pay", eip681: "El estándar EIP-681 (Ethereum)" },
      },
      sections: {
        choose: {
          title: "Cómo elegir",
          body: ["Una sola cuenta recibe pagos en las tres redes, y cada enlace indica en cuál se liquida. Estas diferencias deciden dónde encaja cada pago:"],
          points: [
            "Cobra donde tus clientes ya tienen la stablecoin. Las mismas claves de API y los mismos endpoints de webhook sirven para las tres redes.",
            "Para que el cliente elija el monto, como en las donaciones, usa Stellar o Solana: un enlace de Monad necesita un monto.",
            "Para mostrar un mensaje en la wallet del cliente, como un número de pedido, usa Stellar o Solana.",
            "Para que el monto quede privado en la cadena, los pagos privados funcionan en Stellar, por ahora en Testnet.",
          ],
          links: { stellar: "Pagos en Stellar", solana: "Pagos en Solana", monad: "Pagos en Monad" },
        },
        fees: {
          title: "Cuánto cuesta en cada red",
          body: [
            "Cosmos Pay cobra la tarifa de tu plan por pago, la misma en Stellar, Solana y Monad: {starterRate} en Starter, sin cuota mensual. La wallet de quien paga cubre la comisión de red en las tres. En Monad, la comisión del reenvío que te hace llegar el pago se descuenta de ese pago, y el checkout la muestra.",
          ],
          links: { fees: "Precios y calculadora de comisiones", compare: "Cómo se comparan nuestras comisiones" },
        },
      },
      faq: {
        all: { q: "¿Puedo aceptar pagos en las tres redes?", a: "Sí. Cada enlace de pago se liquida en una red, que eliges al crearlo. La misma cuenta, las mismas claves de API y los mismos webhooks sirven para las tres." },
        test: { q: "¿Puedo probar en las tres?", a: "Sí. Sandbox y las claves de prueba (dv_) crean enlaces en Stellar Testnet, Solana Devnet y Monad Testnet. Monad Testnet no tiene USDC predefinido: cobra ahí en MON, o indica un token por su contrato." },
        fees: { q: "¿Cosmos Pay es más barato en alguna red?", a: "No. La tarifa de tu plan es la misma en las tres. La wallet de quien paga cubre la comisión de red, y en Monad la comisión del reenvío de un pago se descuenta de ese pago." },
      },
    },
    solanaPay: {
      nav: "USDC con Solana Pay",
      title: "Cómo aceptar USDC con enlaces de Solana Pay",
      meta: "Enlaces de pago con Solana Pay, paso a paso | Cosmos Pay",
      description: "Cobra en USDC en Solana con un enlace y un código QR de Solana Pay: qué contiene el enlace, cómo probar en Devnet y cómo se confirma cada pago.",
      summary: "Crea un enlace de Solana Pay para USDC, pruébalo en Devnet y mira cómo se confirma cada pago en tu servidor.",
      lede: "Con Cosmos Pay, un enlace de pago en Solana es una solicitud de transferencia de Solana Pay: tu cliente escanea su código QR o lo abre en una wallet como Phantom o Solflare y aprueba ahí el pago en USDC. Los USDC van directo a tu wallet, y Cosmos Pay marca el enlace como pagado cuando Solana confirma la transacción. Pruébalo en Devnet antes de cobrar dinero real.",
      sections: {
        what: {
          title: "Qué contiene un enlace de Solana Pay",
          body: [
            "Solana Pay es un estándar de solicitudes de pago que leen las wallets de Solana: un enlace solana:, o su código QR, con la dirección a pagar, el monto, el token y un mensaje.",
            "Cosmos Pay agrega una clave de referencia creada para cada enlace. La wallet la incluye en la transacción, y Cosmos Pay busca esa clave en Solana para asociar el pago con su enlace. Solo acepta el pago cuando la transacción se completó con éxito y el monto exacto llegó a tu dirección.",
          ],
          links: { solanaPay: "La especificación de Solana Pay", solana: "Pagos en Solana" },
        },
        need: {
          title: "Qué necesitan tú y tu cliente",
          points: [
            "Tú: una dirección de Solana que reciba el dinero, agregada a tu organización en el dashboard, donde demuestras con una firma que es tuya.",
            "Tu cliente: una wallet de Solana que lea enlaces de Solana Pay, como Phantom o Solflare, con los USDC y un poco de SOL para la comisión de red. No necesita una cuenta en Cosmos Pay.",
            "Para pruebas: Sandbox, donde los enlaces funcionan en Solana Devnet. USDC también está predefinido ahí, así que puedes probar con USDC de Devnet.",
          ],
        },
        api: {
          title: "Crea el enlace desde tu servidor",
          body: [
            "Con la API de pagos, llama a POST /v1/payment-intents/pay con chain definido como solana, tu dirección como destino y, para USDC, el código de activo USDC con su mint como emisor. Con el SDK de TypeScript (versión 2.2 o posterior), pasa chain: 'solana' a client.paymentIntents.createPay.",
            "La respuesta trae el enlace (su uri empieza con solana:) y su código QR. Muestra el código QR, abre el enlace en la wallet de tu cliente o envíalo al checkout alojado: payments.cosmospay.lat seguido del id del enlace.",
          ],
          links: { paymentIntents: "API de intentos de pago", sdkPaymentIntents: "Intentos de pago en el SDK" },
        },
        know: {
          title: "Para tener en cuenta",
          points: [
            "Puedes dejar el monto vacío para que tu cliente lo elija, como en las donaciones. Un enlace que agrega tu propia comisión necesita un monto.",
            "Un mensaje de hasta 300 caracteres, como un número de pedido, se muestra en la wallet de tu cliente.",
            "Con tu propia comisión en el pago, el enlace pasa a ser una solicitud de transacción de Solana Pay que paga a tu wallet y a tu wallet de comisiones en una sola transacción.",
            "Un enlace queda abierto por un tiempo limitado, que el checkout muestra como cuenta regresiva. Si aun así llega un pago y se confirma, el enlace queda como pagado.",
            "La wallet de tu cliente cubre la comisión de red de Solana, en SOL. Cada pago paga la tarifa de tu plan, la misma que en todas las redes.",
          ],
          links: { fees: "Precios y calculadora de comisiones", networksGuide: "Stellar vs Solana vs Monad" },
        },
      },
      steps: {
        title: "Acepta tu primer pago con Solana Pay",
        items: {
          sandbox: { title: "Cambia a Sandbox", body: "Inicia sesión en el dashboard y elige Sandbox en la parte superior. Los enlaces que crees ahí funcionan en Solana Devnet y no mueven dinero real." },
          wallet: { title: "Agrega tu wallet de Solana", body: "En los ajustes de tu organización, agrega la dirección de Solana que va a recibir el dinero y firma lo que te pide el dashboard: así demuestras que la wallet es tuya." },
          create: { title: "Crea el enlace", body: "En Pagos, elige Crear enlace de pago, selecciona Solana y cambia el activo a USDC (el selector empieza en SOL). Ingresa el monto, o déjalo vacío para que tu cliente lo elija, y luego elige tu wallet y, si quieres, un mensaje." },
          pay: { title: "Págalo desde una wallet", body: "Abre la página de pago y escanea su código QR con una wallet de Solana, o abre el enlace en el mismo dispositivo. Aprueba el pago en la wallet, y el checkout pasa a Pagado cuando Solana lo confirma." },
          confirm: { title: "Confírmalo en tu servidor", body: "Agrega un endpoint de webhook en el dashboard. Cuando el pago se confirma, Cosmos Pay envía PAYMENT_INTENT_SUCCEEDED, firmado con HMAC-SHA256. Entrega el pedido cuando llegue ese evento." },
          live: { title: "Cambia a Producción", body: "Elige Producción y crea una clave de API de producción (empieza con prod_). Los enlaces ahora funcionan en la red principal de Solana, donde USDC tiene su propia opción predefinida." },
        },
        links: { webhooksGuide: "Cómo confirmar un pago en tu servidor", apiKeys: "Claves de API" },
      },
      faq: {
        wallets: { q: "¿Qué wallets pueden pagar un enlace de Solana Pay?", a: "Cualquier wallet de Solana que lea enlaces de Solana Pay, como Phantom o Solflare. Tu cliente escanea el código QR o abre el enlace, y aprueba el pago en la wallet." },
        sol: { q: "¿Mi cliente necesita SOL?", a: "Sí, un poco. Su wallet paga la comisión de red de Solana en SOL, además de los USDC que envía." },
        direct: { q: "¿Los USDC pasan por Cosmos Pay?", a: "No. En Solana, la wallet de tu cliente envía los USDC directo a tu dirección. Cosmos Pay encuentra el pago en la red por la clave de referencia del enlace." },
        devnet: { q: "¿Puedo probar sin dinero real?", a: "Sí. En Sandbox y con claves de prueba (dv_), los enlaces funcionan en Solana Devnet, donde USDC está predefinido, y el checkout indica que no se mueven fondos reales." },
      },
    },
    webhooks: {
      nav: "Confirmar pagos en tu servidor",
      title: "Cómo confirmar un pago en stablecoins en tu servidor",
      meta: "Confirma pagos en stablecoins con webhooks | Cosmos Pay",
      description: "Confirma pagos en stablecoins en tu servidor con webhooks firmados: verifica la firma, responde rápido, maneja reintentos y duplicados, y pruébalo antes.",
      summary: "Entrega los pedidos a partir de un webhook firmado, no de la página de tu cliente: verifícalo, responde rápido y omite los duplicados.",
      lede: "Para confirmar un pago en stablecoins, deja que tu servidor actúe según el webhook firmado de Cosmos Pay, no según la página que ve tu cliente. Cuando la red confirma un pago, Cosmos Pay envía PAYMENT_INTENT_SUCCEEDED a tu endpoint, firmado con el secreto de ese endpoint. Verifica la firma, responde con un estado 2xx y entrega el pedido una sola vez por evento.",
      sections: {
        why: {
          title: "Por qué tu servidor y no el navegador",
          body: [
            "Un checkout que dice Pagado es solo lo que muestra el navegador de tu cliente. La pestaña se puede cerrar antes de volver a tu sitio, y cualquiera puede abrir tu página de éxito a mano. Lo que hace definitivo un pago es la confirmación de la red.",
            "Cosmos Pay vigila la red por ti y le avisa a tu servidor cuando un pago se confirma. Tu servidor es el lugar para marcar el pedido como pagado y entregarlo.",
          ],
        },
        how: {
          title: "Qué envía Cosmos Pay",
          points: [
            "Un POST HTTPS al endpoint que registras, con un evento JSON: id (empieza con evt_), type, createdAt y data. Para un pago, data es el pago con su estado, monto, activo, red y transacción.",
            "El encabezado X-Cosmos-Signature: t=<tiempo unix>,v1=<firma>. La firma es el HMAC-SHA256 de t, un punto y el cuerpo sin procesar, con el secreto del endpoint como clave, en hexadecimal.",
            "Los tipos de evento que elijas, como PAYMENT_INTENT_SUCCEEDED, PAYMENT_INTENT_FAILED o ZK_PAYMENT_SUCCEEDED. Compáralos tal como están escritos, en mayúsculas y con guiones bajos.",
            "Los encabezados X-Cosmos-Event, X-Cosmos-Event-Id y X-Cosmos-Delivery, que indican el evento y la entrega.",
          ],
          links: { webhooks: "Webhooks en el SDK", webhooksApi: "API de webhooks" },
        },
        retries: {
          title: "Cuando tu servidor no responde",
          body: [
            "Solo una respuesta 2xx cuenta como entregada, y las redirecciones no se siguen. Cosmos Pay reintenta una entrega fallida hasta tres veces con una pausa cada vez mayor, y luego otra vez en rondas posteriores, y el evento conserva su id en cada intento.",
            "En el dashboard, cada endpoint lista sus entregas, con un filtro para las fallidas, y puedes volver a enviar cualquiera de ellas. Cosmos Pay guarda el cuerpo de una entrega durante 30 días, así que reenvíala dentro de ese plazo.",
          ],
        },
        validate: {
          title: "O verifica un pago tú mismo",
          body: [
            "También puedes consultar un pago concreto: obtenlo por su id para leer su estado, o envía el hash de su transacción (en Solana, la firma de la transacción) a POST /v1/payment-intents/:id/validate. Úsalo como respaldo, por ejemplo cuando tu cliente vuelve antes de que llegue el webhook; el webhook sigue siendo la señal principal.",
          ],
          links: { paymentIntents: "API de intentos de pago" },
        },
      },
      steps: {
        title: "Configura un webhook, paso a paso",
        items: {
          endpoint: { title: "Agrega un endpoint", body: "En el dashboard, abre Webhooks y agrega la dirección HTTPS de una ruta de tu servidor. Elige los eventos que quieres recibir; PAYMENT_INTENT_SUCCEEDED viene seleccionado. La dirección debe ser pública: se rechazan las direcciones privadas y locales." },
          secret: { title: "Guarda el secreto", body: "El dashboard muestra el secreto del endpoint (empieza con whsec_) una sola vez. Guárdalo en el entorno de tu servidor, nunca en una página web." },
          verify: { title: "Verifica cada solicitud", body: "Lee el cuerpo sin procesar antes de cualquier parser JSON y comprueba X-Cosmos-Signature con él. Con el SDK de TypeScript, Webhooks.constructEvent verifica la firma, rechaza por defecto una de más de cinco minutos y devuelve el evento." },
          answer: { title: "Responde rápido y después trabaja", body: "Responde con un estado 2xx en cuanto la firma sea válida, y haz después el trabajo lento, como los correos o las actualizaciones de stock." },
          dedupe: { title: "Procesa cada evento una vez", body: "Guarda el id de cada evento que procesas y omite los que ya viste: un reintento o un reenvío vuelve a enviar el mismo evento." },
          test: { title: "Envía una prueba", body: "Usa Enviar prueba en el endpoint para recibir un evento ping, luego haz un pago de prueba en Sandbox y mira su entrega en la lista del endpoint." },
        },
        links: { webhooks: "Webhooks en el SDK", gettingStarted: "Primeros pasos" },
      },
      faq: {
        name: { q: "El dashboard muestra payment_intent.succeeded. ¿Qué nombre lleva el evento?", a: "El tipo del evento es PAYMENT_INTENT_SUCCEEDED, en mayúsculas y con guiones bajos. El dashboard solo lo muestra en una forma más corta." },
        rotate: { q: "¿Qué pasa cuando roto el secreto?", a: "El secreto nuevo funciona de inmediato y el anterior deja de funcionar de inmediato, así que actualiza tu servidor justo después de rotarlo." },
        down: { q: "¿Qué pasa si mi servidor estaba caído?", a: "Cosmos Pay reintenta las entregas fallidas, y puedes volver a enviar cualquier entrega desde el dashboard durante 30 días." },
        several: { q: "¿Puedo tener varios endpoints?", a: "Sí. Cada endpoint tiene su propia dirección, sus propios eventos y su propio secreto, y cada evento va a cada endpoint suscrito a él." },
      },
    },
    usdt0: {
      nav: "USDT0 desde Stellar",
      title: "Cómo enviar USDT0 desde Stellar a redes EVM",
      meta: "Envía USDT0 desde Stellar a redes EVM | Cosmos Pay",
      description: "Envía USDT0 desde una cuenta de Stellar a Ethereum, Arbitrum y otras redes EVM con Cosmos Pay: rutas, comisiones en XLM, tiempos y cada paso.",
      summary: "Mueve USDT0 de Stellar a una red EVM a través de LayerZero: elige una ruta, mira las comisiones, firma una vez y sigue la entrega.",
      lede: "Con Cosmos Pay puedes enviar USDT0 desde una cuenta de Stellar a una dirección en Ethereum, Arbitrum u otra de las 21 redes EVM. Recibes una cotización con todas las comisiones en XLM, firmas una transacción de Stellar en tu wallet y la transferencia llega en unos 27 minutos. Ethereum recibe USDT nativo; todas las demás redes reciben USDT0.",
      sections: {
        what: {
          title: "Qué es USDT0",
          body: [
            "USDT0 es la versión omnichain del USDT de Tether. Su emisor describe un diseño de bloqueo y emisión: el USDT se bloquea en Ethereum y se emite la misma cantidad de USDT0 en las otras redes, que lo mueven entre ellas con el estándar Omnichain Fungible Token (OFT) de LayerZero.",
            "En Stellar, USDT0 es un activo como cualquier otro, así que la cuenta que lo envía necesita una trustline hacia él y un saldo de USDT0.",
          ],
          links: { usdt0Site: "USDT0, en el sitio de su emisor", usdt0Network: "Cómo funciona la red de USDT0", layerzeroOft: "El estándar OFT de LayerZero" },
        },
        routes: {
          title: "Adónde puede ir",
          body: [
            "Cosmos Pay ofrece 21 rutas, todas hacia redes EVM, cada una hacia una dirección formada por 0x y 40 caracteres hexadecimales. Ethereum recibe USDT nativo; Arbitrum y las demás reciben USDT0. La llamada routes de la API las lista con sus nombres.",
            "Las transferencias funcionan solo en las redes principales: con una clave de prueba (dv_), la API responde que no hay ninguna ruta disponible.",
          ],
          links: { usdt0Docs: "USDT0 en el SDK", usdt0Api: "API de USDT0" },
        },
        cost: {
          title: "Cuánto cuesta",
          points: [
            "La comisión de mensajería de LayerZero, en XLM. La transacción permite hasta un 20 % más, y lo que no usa se devuelve en la misma transacción.",
            "La comisión de red de Stellar, en XLM.",
            "Cualquier comisión de Cosmos Pay, que la cotización muestra antes de que firmes.",
            "La cuenta que envía las paga todas en XLM, así que mantén algo de XLM en ella además del USDT0.",
          ],
        },
        know: {
          title: "Para tener en cuenta",
          points: [
            "La transacción tiene un límite de tiempo corto, indicado en expiresAt: fírmala y envíala antes de ese momento, o crea una transferencia nueva.",
            "Los montos de Stellar tienen 7 decimales y el OFT maneja 6, así que un 7.º decimal queda en tu cuenta como residuo.",
            "Cosmos Pay nunca tiene ninguna clave: la API construye la transacción, tu wallet la firma y la API la retransmite.",
            "También puedes enviar USDT0 desde el panel de swaps del dashboard, donde aparece como Puente USDT0.",
          ],
        },
      },
      steps: {
        title: "Envía USDT0, paso a paso",
        items: {
          hold: { title: "Ten USDT0 en Stellar", body: "La cuenta que envía necesita una trustline hacia USDT0, un saldo de USDT0 y algo de XLM para las comisiones." },
          quote: { title: "Pide una cotización", body: "Llama a quote con la ruta y el monto. Devuelve lo que se envía, lo que llega, el residuo que queda, cada comisión y los límites, y no guarda nada." },
          create: { title: "Crea la transferencia", body: "Llama a create con la cuenta de Stellar que envía, la ruta, la dirección EVM que recibe y el monto. La API construye una transacción de Stellar para ella." },
          sign: { title: "Fírmala en tu wallet", body: "Firma la transacción (su XDR) con la wallet que tiene el USDT0, o abre su enlace SEP-7 en esa wallet." },
          submit: { title: "Envíala", body: "Envía la transacción firmada a submit. Si la red la rechaza, la transferencia queda pendiente: corrige la causa y vuelve a enviarla antes de que venza." },
          follow: { title: "Síguela hasta la entrega", body: "La transferencia pasa de PENDING a SUBMITTED y a DELIVERED, en unos 27 minutos en todas las rutas, mientras los verificadores de LayerZero esperan las confirmaciones de Stellar. Una vez entregada, incluye la transacción de la red de destino y un enlace a LayerZero Scan." },
        },
        links: { usdt0Docs: "USDT0 en el SDK", usdt0Api: "API de USDT0" },
      },
      faq: {
        arrive: { q: "¿Qué recibe la dirección de destino?", a: "En Ethereum, USDT nativo. En todas las demás rutas, USDT0." },
        time: { q: "¿Cuánto tarda una transferencia?", a: "Unos 27 minutos en todas las rutas, según lo medido en LayerZero Scan: los verificadores de LayerZero esperan las confirmaciones de Stellar antes de que se entregue la transferencia." },
        test: { q: "¿Puedo probarlo en una red de pruebas?", a: "No. Las transferencias de USDT0 funcionan solo en las redes principales; con una clave de prueba, no hay ninguna ruta disponible." },
        custody: { q: "¿Cosmos Pay retiene mi USDT0?", a: "No. Tu wallet firma la transacción que lo envía; Cosmos Pay solo la construye y la retransmite." },
      },
    },
  },
};

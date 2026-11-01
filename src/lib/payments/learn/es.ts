/* The gateway's guides in Spanish (tú, neutral for Latin America). Mirrors src/lib/payments/learn/en.ts key for key. */
import type { LearnMessages } from "@/lib/payments/learn/en";

export const es: LearnMessages = {
  hub: {
    nav: "Guías",
    title: "Guías de pagos con stablecoins",
    lede: "Guías para negocios que cobran en stablecoins con Cosmos Pay: cómo aceptar USDC online, cómo enviar un enlace de pago por WhatsApp, qué hace una pasarela de pagos con stablecoins y cómo se comparan Stellar, Solana y Monad.",
    meta: "Guías de pagos con stablecoins | Cosmos Pay",
    description: "Guías para negocios: acepta USDC online, envía enlaces de pago por WhatsApp, qué hace una pasarela de pagos con stablecoins y Stellar vs Solana vs Monad.",
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
            "En Stellar y Solana tu cliente paga directo a tu dirección. En Monad cada pago va a su propia dirección de depósito, que lo reenvía a la tuya. Cada pago se puede verificar en la red, y cada checkout pagado enlaza su transacción en un explorador público.",
          ],
          links: { security: "Cómo se protegen los pagos", acceptGuide: "Cómo aceptar pagos en USDC online", integrations: "Opciones de integración" },
        },
      },
      faq: {
        final: { q: "¿Se puede hacer un contracargo de un pago en stablecoins?", a: "No. Una vez que la red lo confirma, es definitivo. Un reembolso es un pago que el negocio envía de vuelta desde su wallet." },
        custody: { q: "¿Cosmos Pay retiene mi dinero?", a: "No. En Stellar y Solana quien paga envía directo a tu dirección. En Monad cada pago va a su propia dirección de depósito, que lo reenvía a la tuya menos la comisión de red." },
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
          settle: { k: "Adónde va el dinero", stellar: "Directo a tu dirección", solana: "Directo a tu dirección", monad: "La dirección de depósito lo reenvía a tu dirección" },
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
  },
};

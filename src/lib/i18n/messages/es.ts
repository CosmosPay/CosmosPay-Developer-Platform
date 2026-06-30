/* es.js — Spanish message catalog. Mirrors en.js exactly in shape. */
export default {
  invite: {
    eyebrow: "Invitación",
    joinTitle: "Únete a {org}",
    signInToAccept: "Te invitaron a colaborar en {org} en Cosmos Pay.",
    signInBtn: "Inicia sesión para aceptar",
    invitedAs: "Invitación enviada a {email}",
    successTitle: "¡Listo!",
    successBody: "Te uniste a {org}.",
    goToDashboard: "Ir al panel",
    backHome: "Volver al inicio",
    invalidTitle: "Invitación no encontrada",
    invalidBody: "Este enlace de invitación no es válido.",
    expiredTitle: "Invitación caducada",
    expiredBody: "Esta invitación caducó. Pídele a un administrador que envíe una nueva.",
    acceptedTitle: "Ya aceptada",
    acceptedBody: "Esta invitación ya se usó.",
    mismatchTitle: "Cuenta incorrecta",
    mismatchBody: "Esta invitación se envió a {email}. Inicia sesión con ese correo para aceptar.",
    seatLimitTitle: "Organización llena",
    seatLimitBody: "Esta organización alcanzó el límite de asientos de su plan.",
  },
  toasts: {
    copied: "Copiado al portapapeles"
  },
  onboarding: {
    cancel: "Cancelar",
    stepOf: "Paso {n} / {total}",
    steps: {
      org: "Organización",
      goals: "Objetivos",
      plan: "Plan",
      review: "Revisión"
    },
    back: "Atrás",
    continue: "Continuar",
    skip: "Omitir",
    create: "Crear organización",
    creating: "Creando…",
    error: "No se pudo completar el onboarding. Inténtalo de nuevo.",
    orgEyebrow: "// nueva organización",
    orgTitle: "Configuremos tu organización",
    orgSub: "Las organizaciones mantienen pagos, clientes y claves API totalmente separados. Ponle nombre a la tuya y cuéntanos qué estás construyendo.",
    nameLabel: "Nombre de la organización",
    namePlaceholder: "Acme Inc.",
    nameNote: "Puedes renombrarla luego en Ajustes.",
    industryLabel: "¿Qué tipo de negocio es?",
    industries: {
      saas: {
        t: "SaaS y suscripciones",
        s: "Productos de ingresos recurrentes"
      },
      market: {
        t: "Marketplace",
        s: "Pagos y reparticiones divididas"
      },
      ecom: {
        t: "E-commerce",
        s: "Tienda online o checkout"
      },
      fintech: {
        t: "Fintech",
        s: "Construye sobre rieles regulados"
      },
      platform: {
        t: "Plataforma",
        s: "Integra pagos para tus usuarios"
      },
      ai: {
        t: "IA y agentes",
        s: "Flujos de dinero programáticos"
      }
    },
    goalsEyebrow: "// qué construirás",
    goalsTitle: "¿Qué quieres hacer primero?",
    goalsSub: "Elige todo lo que aplique — adaptaremos tu panel y te sugeriremos el plan adecuado.",
    goals: {
      accept: {
        t: "Aceptar pagos",
        s: "Cobra a tus clientes en USDC"
      },
      payout: {
        t: "Enviar pagos",
        s: "Paga en todo el mundo"
      },
      subs: {
        t: "Suscripciones",
        s: "Facturación recurrente"
      },
      cross: {
        t: "Transfronterizo",
        s: "Liquidación sin fronteras"
      },
      embed: {
        t: "Finanzas integradas",
        s: "Billeteras y cuentas"
      },
      test: {
        t: "Solo explorando",
        s: "Probando la herramienta"
      }
    },
    volumeLabel: "Volumen mensual estimado",
    volumes: {
      explore: {
        t: "Solo explorando",
        s: "Probando la API"
      },
      lt10: {
        t: "Menos de $10k / mes",
        s: "Tracción inicial"
      },
      mid: {
        t: "$10k – $100k / mes",
        s: "Escalando"
      },
      gt100: {
        t: "$100k+ / mes",
        s: "Alto volumen"
      }
    },
    planEyebrow: "// elige tu plan",
    planTitle: "Elige un plan para empezar",
    planSub: "Empieza gratis y paga solo por transacción exitosa. Cambia de plan cuando quieras — sin llamadas.",
    popular: "Popular",
    recommended: "Recomendado",
    enterpriseNote: "¿Necesitas tarifas a medida o un SLA?",
    enterpriseLink: "Habla con ventas sobre Enterprise →",
    reviewEyebrow: "// revisar y crear",
    reviewTitle: "Revisa tu organización",
    reviewSub: "Confirma los detalles. Entrarás a tu nuevo panel con claves de prueba listas.",
    rv: {
      org: "Organización",
      type: "Tipo de negocio",
      goals: "Objetivos",
      volume: "Volumen estimado",
      plan: "Plan"
    },
    notSet: "Sin definir",
    edit: "Editar",
    termsPre: "Acepto los ",
    termsA: "Términos para Desarrolladores",
    termsMid: " y la ",
    termsB: "Política de Uso Aceptable",
    termsPost: " de Cosmos Pay.",
    specTagline: "Una API. Todos los rieles de Stellar.",
    specTaglineSub: "Acepta y mueve dinero en USDC con liquidación en ~5 segundos. Elige el plan que encaje — cámbialo cuando quieras.",
    selectedPlan: "Plan seleccionado",
    recommendedForYou: "Recomendado para ti",
    spec: {
      perTx: "Por transacción",
      settle: "Liquidación",
      network: "Red",
      team: "Miembros del equipo",
      orgs: "Organizaciones",
      support: "Soporte",
      live: "Pagos en vivo",
      included: "Incluido",
      notIncluded: "No incluido"
    },
    whatsIncluded: "Qué incluye",
    specFoot: "Las claves de prueba están listas al instante. Sin tarjeta para empezar.",
    supportLevels: {
      community: "Comunidad",
      standard: "Estándar",
      priority: "Prioritario"
    },
    plans: {
      community: {
        desc: "Gratis en el lanzamiento · solo Stellar",
        sub: "solo Stellar",
        pnote: "gratis durante el lanzamiento · Stellar",
        team: "1",
        feats: ["Webhooks de pago", "Claves API de prueba", "1 proyecto"]
      },
      starter: {
        desc: "Acepta pagos reales en Stellar",
        sub: "+ 10¢ / txn",
        pnote: "0.5% + 10¢ por transacción",
        team: "Hasta 5",
        feats: ["API de pagos completa", "Claves en vivo y de prueba", "Liquidación en USDC", "Hasta 5 miembros"]
      },
      growth: {
        desc: "Tarifas más bajas para equipos en crecimiento",
        sub: "/mes · desde",
        pnote: "desde · 0.35% + 5¢ por txn",
        team: "Ilimitado",
        feats: ["Todo lo de Starter", "Tarifa por transacción más baja", "Miembros ilimitados", "Herramientas antifraude Radar", "Descuentos por volumen", "Soporte prioritario"]
      }
    }
  },
  nav: {
    login: "Iniciar sesión",
    getKeys: "Obtener claves",
    dashboard: "Panel",
    menu: "Menú",
    docs: "Documentación",
    items: {
      products: {
        label: "Productos",
        cols: [
          {
            head: "Aceptar dinero",
            links: [
              {
                t: "Pagos",
                s: "Pagos en la red Stellar"
              },
              {
                t: "Checkout",
                s: "Página de pago alojada"
              },
              {
                t: "Enlaces de pago",
                s: "Enlaces de pago sin código"
              },
              {
                t: "Facturación",
                s: "Factura en stablecoins"
              }
            ]
          },
          {
            head: "Mover dinero",
            links: [
              {
                t: "Pagos salientes",
                s: "Envía fondos a todo el mundo"
              },
              {
                t: "Transfronterizo",
                s: "Liquidación sin fronteras"
              },
              {
                t: "Anchors",
                s: "Rampas de entrada y salida de fiat"
              },
              {
                t: "FX",
                s: "Conversión multiactivo"
              }
            ]
          },
          {
            head: "Construir con",
            links: [
              {
                t: "Stablecoins",
                s: "USDC y activos de Stellar"
              },
              {
                t: "Monederos",
                s: "Custodios y no custodios"
              },
              {
                t: "Libro mayor",
                s: "Libro mayor on-chain en tiempo real"
              },
              {
                t: "Radar",
                s: "Fraude y riesgo"
              }
            ]
          }
        ],
        featured: {
          title: "Cosmos Sessions 2026",
          desc: "Descubre cómo estamos construyendo infraestructura de pagos para la era de la IA.",
          cta: "Ver ahora"
        }
      },
      solutions: {
        label: "Soluciones",
        cols: [
          {
            head: "Por modelo",
            links: [
              {
                t: "SaaS y suscripciones",
                s: "Ingresos recurrentes a escala"
              },
              {
                t: "Marketplaces",
                s: "Pagos divididos y pagos salientes"
              },
              {
                t: "Plataformas",
                s: "Integra pagos para tus usuarios"
              },
              {
                t: "Finanzas integradas",
                s: "Cuentas, tarjetas y dinero"
              }
            ]
          },
          {
            head: "Por industria",
            links: [
              {
                t: "E-commerce",
                s: "Mayor conversión en el checkout"
              },
              {
                t: "Fintech",
                s: "Construye sobre rieles regulados"
              },
              {
                t: "Gaming",
                s: "Microtransacciones globales"
              },
              {
                t: "Viajes y movilidad",
                s: "Flujos complejos con múltiples partes"
              }
            ]
          }
        ]
      },
      developers: {
        label: "Desarrolladores",
        cols: [
          {
            head: "Construir",
            links: [
              {
                t: "Referencia de la API",
                s: "REST y GraphQL"
              },
              {
                t: "SDK y bibliotecas",
                s: "Seis lenguajes tipados"
              },
              {
                t: "Webhooks",
                s: "Eventos en tiempo real"
              },
              {
                t: "Sandbox",
                s: "Prueba todo de forma segura"
              }
            ]
          },
          {
            head: "Operar",
            links: [
              {
                t: "CLI",
                s: "Paridad entre local y producción"
              },
              {
                t: "Estado",
                s: "Disponibilidad e incidencias"
              },
              {
                t: "Changelog",
                s: "Lo que hemos lanzado"
              },
              {
                t: "Postman",
                s: "Colección lista para usar"
              }
            ]
          }
        ],
        featured: {
          title: "Inicio rápido",
          desc: "Pasa de cero a tu primer cobro en menos de cinco minutos.",
          cta: "Empezar a construir"
        }
      },
      resources: {
        label: "Recursos",
        cols: [
          {
            head: "Aprender",
            links: [
              {
                t: "Documentación",
                s: "Guías y referencias"
              },
              {
                t: "Tutoriales",
                s: "Recorridos paso a paso"
              },
              {
                t: "Blog",
                s: "Ingeniería y producto"
              },
              {
                t: "Casos de clientes",
                s: "Construido sobre Cosmos Pay"
              }
            ]
          },
          {
            head: "Soporte",
            links: [
              {
                t: "Centro de ayuda",
                s: "Respuestas y guías prácticas"
              },
              {
                t: "Comunidad",
                s: "Foro y Discord"
              },
              {
                t: "Contactar con ventas",
                s: "Habla con un experto"
              },
              {
                t: "Partners",
                s: "Agencias e integraciones"
              }
            ]
          }
        ]
      },
      pricing: {
        label: "Precios"
      }
    }
  },
  profile: {
    account: "Configuración de la cuenta",
    billing: "Facturación",
    docs: "Documentación",
    backToSite: "Volver al sitio web",
    logout: "Cerrar sesión",
    openDashboard: "Abrir panel"
  },
  footer: {
    tagline: "La infraestructura de pagos para desarrolladores. Una API, todos los rieles.",
    copyright: "© 2026 Cosmos Pay, Inc. — Plataforma para desarrolladores",
    groups: {
      products: {
        title: "Productos",
        links: ["Pagos", "Stablecoins", "Pagos salientes", "Anchors", "Monederos", "Checkout", "Enlaces de pago", "Precios"]
      },
      solutions: {
        title: "Soluciones",
        links: ["SaaS y suscripciones", "Marketplaces", "E-commerce", "Plataformas", "Finanzas integradas", "IA y agentes", "Enterprise"]
      },
      developers: {
        title: "Desarrolladores",
        links: ["Documentación", "Referencia de la API", "SDK y bibliotecas", "Webhooks", "Estado de la API", "Changelog", "Panel"]
      },
      resources: {
        title: "Recursos",
        links: ["Guías", "Blog", "Casos de clientes", "Soporte", "Partners", "Sessions 2026"]
      },
      company: {
        title: "Empresa",
        links: ["Acerca de", "Empleo", "Sala de prensa", "Seguridad", "Privacidad y términos", "Cumplimiento"]
      }
    }
  },
  landing: {
    hero: {
      headline: "Escribe menos código -> mueve más dinero",
      lede: "La infraestructura de pagos para desarrolladores. Una API para mover dinero en la red Stellar: stablecoins y activos digitales que se liquidan en segundos, en más de 130 países, con comisiones de fracciones de centavo.",
      getKeys: "Obtener claves de API",
      trustedBy: "Con la confianza de equipos de ingeniería de"
    },
    api: {
      kicker: "// la plataforma",
      title: "APIs potentes",
      lede: "Nuestras APIs modulares permiten a los desarrolladores integrar flujos financieros complejos en minutos, no en meses.",
      docsLink: "Ver documentación de la API",
      cards: {
        payments: {
          title: "Pagos",
          desc: "Envía y recibe pagos en Stellar con finalidad en menos de 5 segundos y comisiones casi nulas."
        },
        stablecoin: {
          title: "Stablecoins",
          desc: "Liquida en USDC y otros activos de Stellar, on-chain y en tiempo real."
        },
        anchor: {
          title: "Anchors",
          desc: "Conéctate a los anchors de Stellar para rampas de entrada y salida de fiat en monedas locales."
        }
      },
      docsTitle: "Documentación de primer nivel",
      docsDesc: "Hecha por desarrolladores, para desarrolladores. Guías interactivas, una referencia OpenAPI detallada y un SDK de JavaScript / TypeScript totalmente tipado para el servidor y el navegador.",
      sdkBtns: {
        node: "SDK de Node.js / TypeScript",
        web: "SDK para navegador / Web"
      },
      exploreDocs: "Explorar toda la documentación",
      copy: "Copiar",
      copied: "Copiado"
    },
    integration: {
      kicker: "// desarrolladores",
      title: "Infraestructura fiable y extensible.",
      lede: "Diseñada para gestionar las mayores cargas de trabajo del mundo y para integrarse en cualquier stack que ya utilices.",
      scale: ["solicitudes de API / día", "solicitudes / s", "finalidad de Stellar", "disponibilidad"],
      paths: [
        {
          t: "Sin código",
          d: "Crea enlaces de pago y facturación directamente desde tu panel, sin necesidad de ingeniería.",
          a: "Explorar sin código"
        },
        {
          t: "UI prediseñada",
          d: "Integra Checkout o Elements y acepta pagos en Stellar en minutos, con componentes que se adaptan a tu marca.",
          a: "Ver componentes"
        },
        {
          t: "Crea la tuya",
          d: "Usa nuestras APIs REST + GraphQL, los SDK tipados y la CLI para crear una integración con Stellar totalmente a medida.",
          a: "Leer la documentación"
        }
      ],
      mockLink: "Enlace de pago · 19.99 USDC"
    },
    solutions: {
      kicker: "// soluciones",
      title: "Diseñado para cada modelo de negocio.",
      lede: "Desde tu primera transacción hasta miles de millones en volumen: Cosmos Pay se adapta a cómo tu negocio mueve dinero en Stellar.",
      eyebrow: "Solución",
      startBuilding: "Empezar a construir",
      items: {
        pay: {
          t: "Acepta pagos en Stellar",
          d: "Envía y recibe pagos en la red Stellar con finalidad en menos de 5 segundos y comisiones de fracciones de centavo.",
          long: "Acepta pagos de cualquier persona con un monedero Stellar. Los fondos alcanzan la finalidad en unos cinco segundos y se liquidan directamente en tu cuenta: sin contracargos, sin intermediarios y sin retenciones de varios días.",
          points: ["Finalidad de liquidación en menos de 5 segundos", "Comisiones de fracciones de centavo", "Envía y recibe cualquier activo de Stellar", "Webhooks en tiempo real en cada pago"]
        },
        coin: {
          t: "Liquidación en stablecoins",
          d: "Liquida en USDC y otros activos de Stellar, on-chain y en tiempo real.",
          long: "Mantén y liquida saldos en USDC y otras stablecoins reguladas emitidas en Stellar. Cada transacción se registra on-chain y se concilia automáticamente en tu libro mayor en tiempo real.",
          points: ["Stablecoins reguladas respaldadas 1:1", "Liquidación on-chain y auditable", "Libro mayor multiactivo en tiempo real", "Conciliación automática"]
        },
        globe: {
          t: "Dinero transfronterizo",
          d: "Llega a más de 130 países en una red global, sin bancos corresponsales.",
          long: "Mueve dinero entre fronteras igual que lo mueves localmente. Stellar llega a más de 130 países sin bancos corresponsales, así que los pagos salientes llegan en segundos en lugar de días.",
          points: ["Más de 130 países en una sola red", "Sin retrasos de banca corresponsal", "FX transparente y por adelantado", "Liquida en segundos"]
        },
        ramp: {
          t: "Rampas de entrada y salida",
          d: "Conéctate a los anchors de Stellar para depósitos y retiros en moneda local.",
          long: "Permite a los usuarios moverse entre la moneda local y los activos digitales a través de anchors regulados de Stellar. Depósitos y retiros en docenas de monedas locales, gestionados íntegramente por los estándares SEP.",
          points: ["Red de anchors regulada", "Docenas de monedas locales", "Flujos estándar SEP-6 / SEP-24", "KYC gestionado por el anchor"]
        },
        wallet: {
          t: "Monederos integrados",
          d: "Crea monederos Stellar custodios o no custodios para tus usuarios.",
          long: "Ofrece a cada usuario un monedero Stellar dentro de tu producto. Elige monederos custodios que tú gestionas, o monederos no custodios que controlan tus usuarios: ambos provisionados con una sola llamada a la API.",
          points: ["Custodio o no custodio", "Provisión con una sola llamada", "Gestión de claves integrada", "Saldos multiactivo"]
        }
      },
      payMock: {
        received: "Pago recibido",
        via: "vía Stellar · 4.2s",
        fee: "comisión $0.00001"
      }
    },
    stats: {
      items: ["SLA de disponibilidad de la API", "tiempo de respuesta p99", "países compatibles", "llamadas a la API / mes"]
    },
    customers: {
      kicker: "// clientes",
      title: "Impulsando negocios de todos los tamaños.",
      lede: "Desde startups en fase semilla hasta empresas cotizadas, los equipos construyen y escalan sus pagos en Cosmos Pay.",
      eyebrow: "Caso de cliente",
      readStory: "Leer caso",
      readFull: "Leer caso completo",
      items: {
        Northwind: {
          label: "más rápida la liquidación transfronteriza tras pasar a Stellar.",
          tags: ["Pagos", "Stablecoins", "Monederos"],
          story: "Northwind trasladó su checkout global a Cosmos Pay y la red Stellar, reduciendo la liquidación de días a segundos y recortando los costes de FX en más de 30 mercados, todo manteniendo un único libro mayor conciliado."
        },
        Lumio: {
          label: "para lanzar suscripciones en USDC en 40 países.",
          tags: ["Facturación", "USDC", "Anchors"],
          story: "Lumio sustituyó un mosaico de procesadores regionales por Cosmos Pay, lanzando suscripciones denominadas en USDC en 40 países en tan solo seis semanas usando anchors para rampas locales de entrada y salida."
        },
        Helios: {
          label: "liquidados a vendedores de todo el mundo a través de la red Stellar.",
          tags: ["Pagos salientes", "Connect", "Rampas"],
          story: "Helios paga a una base global de vendedores enteramente en Stellar. El año pasado liquidó 2.400 millones de dólares a vendedores en 58 países, con fondos llegando en segundos y total transparencia on-chain."
        }
      }
    },
    testimonials: {
      kicker: "// testimonios",
      title: "Adorado por desarrolladores y equipos financieros.",
      items: {
        MC: {
          q: "Cosmos Pay nos permitió mover dinero entre fronteras en segundos. Sustituimos tres proveedores por una sola API de Stellar.",
          r: "VP de Ingeniería, Vertexa"
        },
        DO: {
          q: "La documentación es la mejor que he usado. Liquidamos nuestro primer pago en USDC antes del almuerzo el primer día.",
          r: "Fundador, Quanta"
        },
        PN: {
          q: "La conciliación solía tardar una semana. La liquidación on-chain en Stellar ahora lo hace por nosotros en tiempo real.",
          r: "Director de Finanzas, Riverstone"
        }
      }
    },
    resources: {
      kicker: "// recursos",
      title: "Lo que está pasando.",
      lede: "Novedades de producto, guías en profundidad e historias de ingeniería del equipo que construye Cosmos Pay.",
      readMore: "Leer más",
      items: [
        {
          tag: "Informe",
          t: "El estado de los pagos en stablecoins en 2026",
          d: "Cómo los equipos mueven dinero en Stellar a escala global."
        },
        {
          tag: "Changelog",
          t: "Los webhooks de liquidación de Stellar están en disponibilidad general",
          d: "Recibe eventos en tiempo real en el momento en que un pago alcanza la finalidad."
        },
        {
          tag: "Guía",
          t: "Diseñar webhooks idempotentes",
          d: "Patrones para un manejo de eventos fiable y de entrega única."
        },
        {
          tag: "Blog",
          t: "Escalar a 8.000 millones de solicitudes al mes",
          d: "Dentro de la infraestructura que impulsa Cosmos Pay."
        }
      ]
    },
    cta: {
      title: "Empieza a construir hoy.",
      desc: "Crea un sandbox de testnet gratuito y entra en producción en Stellar en cuanto estés listo.",
      getKeys: "Obtener claves de API",
      talk: "Habla con ingeniería",
      helpers: [
        {
          b: "Mira lo que pagarás",
          s: "Precios transparentes basados en el uso, sin sorpresas."
        },
        {
          b: "Empezar a construir",
          s: "Consigue tus claves de API y haz tu primer pago hoy."
        }
      ]
    }
  },
  pricing: {
    kicker: "// precios",
    title: "Paga por lo que procesas.",
    lede: "Precios transparentes basados en el uso. Empieza gratis: solo pagas una pequeña comisión por transacción exitosa.",
    monthly: "Mensual",
    annual: "Anual",
    save: "−17%",
    popular: "Más popular",
    from: "desde",
    perMo: "/mes",
    billedYearly: "facturado anualmente",
    plans: [
      {
        name: "Community",
        tag: "Gratis",
        desc: "Empieza a aceptar pagos sin coste mensual.",
        amt: "Gratis",
        txt: "sin cuota mensual",
        cta: "Empezar gratis",
        feats: ["Acepta pagos", "Claves de API de prueba", "1 proyecto", "Soporte de la comunidad", "Protección de pagos", "Resolución de disputas", "Tarjetas y transferencias bancarias"]
      },
      {
        name: "Starter",
        desc: "Acepta pagos reales con protección de pagos integrada.",
        amt: "1.5%",
        txt: "+ 0.25¢ por transacción *",
        cta: "Empezar gratis",
        feats: ["Todo lo de Community", "Pagos reales", "Protección de pagos", "Acceso parcial a la API", "Soporte estándar", "Resolución de disputas", "Tarjetas y transferencias bancarias"]
      },
      {
        name: "Essentials",
        desc: "Acceso completo a la plataforma con disputas y todos los métodos de pago.",
        txt: "+ 0.5% + 10¢ por transacción *",
        cta: "Empezar prueba gratuita",
        feats: ["Todo lo de Starter", "Acceso total a la API", "Protección de pagos", "Resolución de disputas", "Tarjetas y transferencias bancarias", "Soporte prioritario por email", "Descuentos por volumen"]
      },
      {
        name: "Growth",
        desc: "Tarifas más bajas y más potencia para equipos en crecimiento.",
        txt: "+ 0.35% + 5¢ por transacción *",
        cta: "Empezar prueba gratuita",
        feats: ["Todo lo de Essentials", "Tarifa de 0.35% + 5¢ por transacción", "Miembros del equipo ilimitados", "Herramientas antifraude avanzadas", "Descuentos por volumen", "Soporte prioritario", "Enrutamiento inteligente de pagos"]
      }
    ],
    enterprise: {
      name: "Enterprise",
      desc: "Tarifas personalizadas e infraestructura dedicada para los negocios de mayor volumen.",
      feats: ["Tarifas por transacción personalizadas", "Infraestructura dedicada", "SLA de disponibilidad del 99,99%", "SSO / SAML + registros de auditoría", "Arquitecto de soluciones asignado", "Soporte prioritario 24/7"],
      price: "Personalizado",
      subt: "Tarifas basadas en el volumen",
      cta: "Contactar con ventas"
    },
    footnote: "* Cada transacción incluye también una pequeña comisión de red. Community y Starter cubren nuestras funciones de pago principales; Essentials y Growth desbloquean el acceso total a la API, la resolución de disputas y todos los métodos de pago, incluidas tarjetas y transferencias bancarias.",
    compareTitle: "Comparar planes",
    orgsRow: "Organizaciones",
    seatsRow: "Miembros por organización",
    keysRow: "Claves de API",
    compareHead: ["Característica", "Community", "Starter", "Essentials", "Growth", "Enterprise"],
    compare: [
      {
        l: "Cuota mensual",
        v: ["—", "—", "$33 / mo", "$99 / mo", "Personalizado"]
      },
      {
        l: "Comisión por transacción",
        v: ["—", "1.5% + 0.25¢", "0.5% + 10¢", "0.35% + 5¢", "Personalizado"]
      },
      {
        l: "Velocidad de liquidación",
        v: ["~5 sec", "~5 sec", "~5 sec", "~5 sec", "~5 sec"]
      },
      {
        l: "Acceso a la API",
        v: ["Notificaciones", "Parcial", "Completo", "Completo", "Completo"]
      },
      {
        l: "Pagos reales",
        v: [1, 1, 1, 1, 1]
      },
      {
        l: "Protección de pagos",
        v: [0, 1, 1, 1, 1]
      },
      {
        l: "Resolución de disputas",
        v: [0, 0, 1, 1, 1]
      },
      {
        l: "Tarjetas y transferencias bancarias",
        v: [0, 0, 1, 1, 1]
      },
      {
        l: "Herramientas antifraude avanzadas",
        v: [0, 0, 0, 1, 1]
      },
      {
        l: "Descuentos por volumen",
        v: [0, 0, 0, 1, 1]
      },
      {
        l: "SSO / SAML",
        v: [0, 0, 0, 0, 1]
      },
      {
        l: "Soporte",
        v: ["Community", "Estándar", "Prioritario por email", "Prioritario", "24/7 dedicado"]
      }
    ],
    faqTitle: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿De verdad hay un plan gratuito?",
        a: "Sí. El plan Community es gratuito e incluye todo lo que necesitas para empezar a aceptar pagos de inmediato. Starter también es gratuito al mes; solo pagas una pequeña comisión por transacción exitosa."
      },
      {
        q: "¿Cuánto cuesta una transacción?",
        a: "Starter cuesta 1.5% + 0.25¢ por transacción exitosa. Essentials cuesta $33/mes (o $27.50/mes facturado anualmente) y reduce la tarifa a 0.5% + 10¢, mientras que Growth cuesta $99/mes y la baja hasta 0.35% + 5¢. Cada transacción también conlleva una pequeña comisión de red."
      },
      {
        q: "¿Qué métodos de pago admitís?",
        a: "Community y Starter cubren nuestros métodos de pago principales. A partir de Essentials también puedes aceptar tarjetas, transferencias bancarias y otros métodos de pago locales a través de una única integración."
      },
      {
        q: "¿Con qué rapidez se liquida el dinero?",
        a: "Las transacciones alcanzan la finalidad en aproximadamente cinco segundos, en todos los planes, sin retrasos de varios días en los pagos salientes."
      },
      {
        q: "¿Puedo cambiar de plan más adelante?",
        a: "Por supuesto. Mejora o reduce tu plan en cualquier momento desde tu panel. Los cambios surten efecto de inmediato, sin necesidad de llamadas."
      }
    ],
    ctaTitle: "¿Todavía tienes preguntas?",
    ctaDesc: "Habla con nuestro equipo sobre precios por volumen, cumplimiento o migración desde otro proveedor.",
    contactSales: "Contactar con ventas",
    openDashboard: "Abrir panel"
  },
  dash: {
    viewLabels: {
      overview: "Resumen",
      payments: "Pagos",
      balances: "Saldos",
      customers: "Clientes",
      products: "Productos y enlaces",
      swaps: "Swaps",
      blindpay: "Fiat",
      developers: "Claves de API",
      webhook: "Webhooks",
      logs: "Registros de API",
      weblogs: "Registros de webhooks",
      settings: "Organización",
      account: "Cuenta",
      activity: "Actividad",
      support: "Soporte",
      inbox: "Bandeja de soporte",
      users: "Usuarios",
      adminOverview: "Resumen de la plataforma",
      adminPayments: "Pagos — todas las orgs",
      adminSwaps: "Swaps — todas las orgs",
      adminFiat: "Fiat — todas las orgs",
      adminCustomers: "Clientes — todas las orgs",
      adminProducts: "Productos — todas las orgs",
      adminConsumers: "Organizaciones"
    },
    sidebar: {
      sections: {
        Platform: "Plataforma",
        Build: "Construir",
        Account: "Cuenta",
        Support: "Soporte",
        Admin: "Admin"
      },
      items: {
        overview: "Resumen",
        payments: "Pagos",
        balances: "Saldos",
        customers: "Clientes",
        products: "Productos",
        swaps: "Swaps",
        blindpay: "Fiat",
        developers: "Claves de API",
        webhook: "Webhooks",
        logs: "Registros",
        weblogs: "Logs webhook",
        settings: "Organización",
        account: "Cuenta",
        activity: "Actividad",
        support: "Soporte",
        inbox: "Bandeja",
        users: "Usuarios",
        adminOverview: "Resumen",
        adminPayments: "Pagos",
        adminSwaps: "Swaps",
        adminFiat: "Fiat",
        adminCustomers: "Clientes",
        adminProducts: "Productos",
        adminConsumers: "Organizaciones"
      },
      collapse: "Contraer barra lateral"
    },
    org: {
      heading: "Organizaciones",
      owned: "Tus organizaciones",
      invited: "Compartidas contigo",
      locked: "Bloqueada — mejora tu plan para usarla",
      create: "Crear organización"
    },
    env: {
      heading: "Entorno",
      sandbox: "Sandbox",
      production: "Producción",
      testnet: "Entorno de testnet",
      mainnet: "Entorno de mainnet"
    },
    topbar: {
      search: "Buscar pagos, clientes, registros…",
      theme: "Cambiar tema",
      notifications: "Notificaciones"
    },
    statusLabels: {
      Succeeded: "Correcto",
      Failed: "Fallido",
      Refunded: "Reembolsado",
      Active: "Activo",
      Delivered: "Entregado"
    },
    common: {
      cancel: "Cancelar",
      copy: "Copiar",
      copyLink: "Copiar enlace",
      export: "Exportar",
      vsLastWeek: "vs la semana pasada",
      optional: "(opcional)",
      viewPlans: "Ver planes",
      yes: "Sí",
      no: "No"
    },
    profileMenu: {
      account: "Configuración de la cuenta",
      billing: "Facturación",
      docs: "Documentación",
      backToSite: "Volver al sitio web",
      logout: "Cerrar sesión"
    },
    modals: {
      org: {
        eyebrow: "Organización",
        title: "Crear organización",
        atLimit: "Tu plan {plan} permite hasta {limit} organización{s}. Mejora tu plan para crear más.",
        body: "Las organizaciones mantienen los pagos, clientes y claves de API totalmente separados. Puedes crear {n} más con tu plan {plan}.",
        bodyUnlimited: "Las organizaciones mantienen los pagos, clientes y claves de API totalmente separados. Puedes crear ilimitadas más con tu plan {plan}.",
        nameLabel: "Nombre de la organización",
        namePlaceholder: "Acme Inc.",
        create: "Crear organización"
      },
      key: {
        eyebrow: "Clave API",
        title: "Crear clave secreta",
        editTitle: "Editar clave API",
        desc: "Elige el entorno y qué puede hacer esta clave. Solo podrás ver el secreto una vez.",
        editDesc: "Actualiza el nombre, la descripción, el rol y los permisos de esta clave.",
        nameLabel: "Nombre",
        namePlaceholder: "Servidor de producción",
        descLabel: "Descripción",
        descPlaceholder: "Usada por el servicio de facturación",
        envLabel: "Entorno",
        envs: {
          dev: "Desarrollo",
          prod: "Producción"
        },
        roleLabel: "Rol",
        roles: {
          user: "Usuario",
          admin: "Administrador"
        },
        permsLabel: "Permisos",
        permResource: "Recurso",
        scopeResources: { payments: "Pagos", webhooks: "Webhooks", products: "Productos", customers: "Clientes" },
        adminHint: "Las claves de admin tienen acceso total a todos los recursos.",
        perms: {
          read: "Lectura",
          write: "Escritura"
        },
        create: "Crear clave",
        save: "Guardar cambios"
      },
      reveal: {
        eyebrow: "Clave API creada",
        title: "Guarda tu clave secreta",
        body: "Esta es la única vez que verás este secreto. Cópialo ahora y guárdalo en un lugar seguro — por seguridad, no podrás volver a verlo.",
        idLabel: "ID de la clave",
        saved: "He guardado mi clave"
      }
    },
    overview: {
      greeting: "Buenos días, {name}",
      sub: "Esto es lo que está pasando hoy en {org}.",
      metrics: {
        gross: "Volumen bruto",
        net: "Volumen neto",
        success: "Pagos exitosos",
        newCust: "Nuevos clientes"
      },
      grossVolume: "Volumen bruto",
      recentPayments: "Pagos recientes",
      recentActivity: "Actividad reciente",
      acts: {
        key: "Clave de API generada",
        webhook: "Webhook entregado",
        payments: "Pago liquidado",
        customers: "Nuevo cliente"
      },
      tableHead: {
        payment: "Pago",
        customer: "Cliente",
        amount: "Importe",
        status: "Estado",
        date: "Fecha"
      }
    },
    payments: {
      title: "Pagos",
      sub: "{n} pagos · liquidados al instante en Stellar",
      filters: {
        all: "Todos",
        ok: "Correcto",
        fail: "Fallido",
        ref: "Reembolsado"
      },
      create: "Crear pago",
      searchPlaceholder: "Buscar por cliente o ID…",
      tableHead: {
        payment: "Pago",
        customer: "Cliente",
        amount: "Importe",
        status: "Estado",
        date: "Fecha"
      },
      empty: "Ningún pago coincide con tus filtros.",
      modal: {
        eyebrow: "Pago",
        title: "Crear pago",
        desc: "Los pagos se liquidan al instante en la red Stellar, sin periodo de retención.",
        amount: "Importe",
        asset: "Activo",
        customer: "Cliente",
        customerPlaceholder: "Acme Inc.",
        create: "Crear pago",
        newCustomer: "Nuevo cliente"
      }
    },
    cosmos: {
      loading: "Cargando…", loadError: "No se pudieron cargar los datos.", empty: "Aún no hay nada aquí.",
      eventLabels: { PAYMENT_INTENT_CREATED: "Pago creado", PAYMENT_INTENT_UPDATED: "Pago actualizado", PAYMENT_INTENT_SUCCEEDED: "Pago completado", PAYMENT_INTENT_FAILED: "Pago fallido", PAYMENT_INTENT_CANCELLED: "Pago cancelado", PAYMENT_INTENT_DELETED: "Pago eliminado" },
      active: "Activo", inactive: "Desactivado",
      reveal: "Mostrar secreto", secret: "Secreto de firma", secretNote: "Se muestra una sola vez — guárdalo de forma segura.",
      rotate: "Rotar secreto", ping: "Enviar prueba", pingOk: "Evento de prueba entregado", pingFail: "Falló el evento de prueba",
      deliveries: "Entregas recientes", noDeliveries: "Aún no hay entregas.", redeliver: "Reenviar",
      enable: "Activar", disable: "Desactivar",
      delete: "Eliminar", deleteConfirm: "Eliminar", confirmDelete: "Esto no se puede deshacer.",
      customerSet: "Importe libre", allEvents: "Todos los eventos", events: "Eventos",
      received: "Recibido", pending: "Pendiente", settledNote: "Liquidado directamente en tu cuenta, en tiempo real.",
      custDetail: { title: "Cliente", edit: "Editar", save: "Guardar cambios", alias: "Alias", note: "Nota", account: "Cuenta Stellar", payments: "Pagos", onChain: "On-chain", noPayments: "Aún no hay pagos." },
    },
    paylinks: {
      title: "Enlaces de pago",
      sub: "{n} enlaces · pagos SEP-7 en Stellar",
      create: "Crear enlace de pago",
      searchPlaceholder: "Buscar por destino, memo o ID…",
      filters: { all: "Todos", PENDING: "Pendiente", SUBMITTED: "Enviado", SUCCEEDED: "Completado", FAILED: "Fallido", CANCELLED: "Cancelado", EXPIRED: "Expirado" },
      tableHead: { id: "Enlace", type: "Tipo", amount: "Importe", status: "Estado", created: "Creado" },
      kinds: { PAY: "Enlace de pago", TX: "Transacción" },
      anyAmount: "Importe libre",
      empty: "Aún no hay enlaces de pago. Crea uno para obtener un QR y un enlace para compartir.",
      loading: "Cargando enlaces de pago…",
      loadError: "No se pudieron cargar los enlaces de pago.",
      readOnly: "Tienes acceso de solo lectura a los enlaces de pago en esta organización.",
      createError: "No se pudo crear el enlace de pago.",
      deleteError: "No se pudo eliminar el enlace de pago.",
      network: { dev: "Testnet", prod: "Red pública" },
      modal: {
        eyebrow: "Enlace de pago", title: "Crear enlace de pago",
        desc: "Genera un enlace SEP-7 y un QR que tu cliente puede pagar desde cualquier billetera Stellar.",
        kind: "Tipo", kindPay: "Enlace de pago (paga el cliente)", kindTx: "Transacción (origen conocido)",
        kindPayHint: "Sin cuenta de origen — devuelve una URI de pago + QR.",
        kindTxHint: "Origen conocido — devuelve una transacción sin firmar para firmar.",
        destination: "Destino", destinationHint: "Cuenta Stellar que recibe los fondos (G…).",
        source: "Origen", sourceHint: "Cuenta Stellar del pagador (G…).",
        amount: "Importe", amountHint: "Déjalo vacío para que el pagador elija (donaciones).",
        asset: "Activo", assetIssuer: "Emisor del activo", assetIssuerHint: "Obligatorio para activos no nativos (G…).",
        memo: "Memo", memoHint: "MEMO_ID numérico — se genera automáticamente si se deja vacío.",
        message: "Mensaje", messageHint: "Se muestra al pagador en su billetera (≤ 300 caracteres).",
        submit: "Crear enlace",
      },
      detail: {
        eyebrow: "Enlace de pago", title: "Enlace de pago listo",
        scan: "Escanea para pagar", downloadQr: "Descargar QR",
        uri: "URI SEP-7", xdr: "XDR sin firmar",
        openWallet: "Abrir en la billetera", copyLink: "Copiar enlace", copyUri: "Copiar URI",
        fields: { id: "ID", status: "Estado", kind: "Tipo", network: "Red", destination: "Destino", source: "Origen", amount: "Importe", asset: "Activo", memo: "Memo", message: "Mensaje", txHash: "ID de transacción", created: "Creado" },
        delete: "Eliminar",
        deleteTitle: "Eliminar enlace de pago", deleteBody: "Se eliminará «{id}». Esto no se puede deshacer.", deleteConfirm: "Eliminar enlace",
      },
      status: { PENDING: "Pendiente", SUBMITTED: "Enviado", SUCCEEDED: "Completado", FAILED: "Fallido", CANCELLED: "Cancelado", EXPIRED: "Expirado" },
    },
    balances: {
      title: "Saldos",
      sub: "Liquidados directamente en tu cuenta Stellar, en tiempo real",
      note: "Cosmos Pay nunca retiene tus fondos: cada pago se liquida directamente en tu propia cuenta Stellar en el momento en que se realiza.",
      total: "SALDO TOTAL",
      across: "en 3 activos",
      explorer: "Ver en el explorador",
      recent: "Liquidaciones recientes",
      payment: "Pago",
      tableHead: {
        transaction: "Transacción",
        type: "Tipo",
        amount: "Importe",
        status: "Estado",
        date: "Fecha"
      }
    },
    customers: {
      title: "Clientes",
      sub: "{n} clientes",
      add: "Añadir cliente",
      searchPlaceholder: "Buscar clientes…",
      tableHead: {
        name: "Nombre",
        email: "Email",
        spend: "Gasto total",
        payments: "Pagos",
        since: "Desde"
      },
      empty: "No se han encontrado clientes.",
      modal: {
        eyebrow: "Cliente",
        title: "Añadir cliente",
        desc: "Crea un cliente para hacer seguimiento de pagos y saldos.",
        name: "Nombre",
        email: "Email",
        add: "Añadir cliente"
      }
    },
    products: {
      title: "Productos y enlaces",
      sub: "Planes recurrentes y enlaces de pago",
      add: "Nuevo producto",
      tableHead: {
        name: "Nombre",
        price: "Precio",
        type: "Tipo",
        status: "Estado"
      },
      types: {
        Recurring: "Recurrente",
        "One-time": "Único",
        "Payment link": "Enlace de pago"
      },
      modal: {
        eyebrow: "Producto",
        title: "Crear producto",
        desc: "Vende un plan, un artículo de pago único o un enlace de pago flexible.",
        name: "Nombre",
        price: "Precio (USDC)",
        priceHint: "(déjalo en blanco para que lo fije el cliente)",
        type: "Tipo",
        create: "Crear producto"
      }
    },
    apikeys: {
      readOnly: "Tienes acceso de solo lectura — solo los owners y admins pueden crear o revocar claves de API.",
      title: "Claves API",
      sub: "Claves secretas para la API de Cosmos Pay. Crea todas las que necesites.",
      create: "Crear clave secreta",
      tableHead: {
        name: "Nombre",
        id: "ID de la clave",
        role: "Rol",
        permissions: "Permisos",
        created: "Creada"
      },
      empty: "Aún no hay claves API.",
      locked: "Bloqueada",
      loading: "Cargando claves API…",
      loadError: "No se pudieron cargar tus claves API.",
      createError: "No se pudo crear la clave API.",
      updateError: "No se pudo actualizar la clave API.",
      deleteError: "No se pudo revocar la clave API.",
      revoke: "Revocar",
      edit: "Editar",
      unnamed: "Clave sin nombre",
      none: "—",
      revokeTitle: "Revocar clave API",
      revokeBody: "«{name}» se revocará permanentemente y cualquier aplicación que la use dejará de funcionar. Esta acción no se puede deshacer.",
      revokeConfirm: "Revocar clave",
      usage: "{used} / {limit}",
      limitReached: "Alcanzaste el límite de claves de tu plan. Mejora tu plan para añadir más."
    },
    webhooks: {
      title: "Webhooks",
      sub: "Eventos en tiempo real cuando los pagos se liquidan en Stellar",
      add: "Añadir endpoint",
      endpoints: "Endpoints",
      recent: "Entregas recientes",
      eventsCount: "{n} eventos",
      tableHead: {
        url: "URL",
        events: "Eventos",
        status: "Estado",
        event: "Evento",
        response: "Respuesta",
        when: "Cuándo"
      },
      modal: {
        eyebrow: "Webhook",
        title: "Añadir endpoint",
        desc: "Enviaremos las cargas útiles de los eventos por POST a esta URL.",
        urlLabel: "URL del endpoint",
        eventsLabel: "Eventos a enviar",
        add: "Añadir endpoint"
      }
    },
    logs: {
      title: "Registros de API",
      sub: "Todas las solicitudes a la API de Cosmos Pay: haz clic en una fila para inspeccionarla",
      searchPlaceholder: "Buscar por endpoint…",
      tableHead: {
        method: "Método",
        endpoint: "Endpoint",
        status: "Estado",
        time: "Tiempo",
        timestamp: "Marca de tiempo"
      },
      reqHeaders: "Cabeceras de la solicitud",
      params: "Parámetros de query / body",
      response: "Respuesta",
      meta: "Meta"
    },
    settings: {
      title: "Organización",
      sub: "Gestiona {org}",
      org: {
        title: "Detalles",
        name: "Nombre",
        id: "ID de la organización",
        created: "Creada"
      },
      plan: {
        title: "Plan y límites",
        change: "Cambiar plan",
        current: "Plan actual",
        orgs: "Organizaciones",
        apiKeys: "Claves de API",
        unlimited: "Ilimitadas",
        manage: "Gestionar organizaciones",
        changeTitle: "Cambiar de plan",
        changeSub: "Cambia tu plan. Es una simulación — no se cobra nada.",
        save: "Actualizar plan",
        liveKeys: "Claves de producción",
        seats: "Asientos del equipo",
        confirmSwitch: "Cambiar plan",
        downgradeNote: "Los recursos por encima de los nuevos límites se bloquearán hasta que vuelvas a subir de plan.",
        feature: "Característica",
        youAreHere: "Actual",
        upgrade: "Mejorar",
        downgrade: "Bajar",
        switchTo: "Cambiar a {plan}",
        price: "Precio",
        perTx: "Por transacción",
        mainnet: "Pagos en vivo",
        settle: "Liquidación",
        apiAccess: "Acceso API",
        apiLevels: { notifications: "Notificaciones de pago", partial: "API parcial", full: "API completa" }, perOrgNote: "Las claves de API y los miembros se gestionan dentro de cada organización."
      },
      appearance: {
        title: "Apariencia",
        theme: "Tema",
        light: "Claro",
        dark: "Oscuro"
      },
      team: {
        title: "Equipo",
        add: "+ Añadir miembro",
        roles: {
          Admin: "Administrador",
          Developer: "Desarrollador",
          Analyst: "Analista",
          Viewer: "Lector",
          Owner: "Propietario"
        }
      },
      teamModal: {
        eyebrow: "Equipo",
        title: "Invitar a un miembro del equipo",
        desc: "Recibirá una invitación por email para unirse a {org}.",
        name: "Nombre completo",
        email: "Email",
        role: "Rol",
        send: "Enviar invitación"
      }
    },
    pagination: {
      prev: "Anterior",
      next: "Siguiente",
      range: "{from}–{to} de {total}"
    },
    notifications: {
      title: "Notificaciones",
      empty: "Aún no hay notificaciones.",
      loadError: "No se pudieron cargar las notificaciones.",
      origin: "Origen",
      markAll: "Marcar todo como leído",
      types: {
        "auth.login": "Nuevo inicio de sesión",
        "support.reply": "Respuesta de soporte",
        "apikey.created": "Clave API creada",
        "apikey.updated": "Clave API actualizada",
        "apikey.deleted": "Clave API revocada",
        custom: "Notificación"
      },
      subtitle: "Inicios de sesión y cambios en tu cuenta",
      viewAll: "Ver toda la actividad",
      location: "Ubicación",
      device: "Dispositivo",
      ip: "Dirección IP",
      localhost: "localhost"
    },
    support: {
      title: "Soporte",
      subtitle: "Chatea con el equipo de Cosmos Pay",
      placeholder: "Escribe un mensaje…",
      send: "Enviar",
      empty: "Aún no hay mensajes. Envía el primero y te responderemos.",
      loadError: "No se pudo cargar la conversación.",
      sendError: "No se pudo enviar tu mensaje.",
      you: "Tú",
      staff: "Soporte",
      inboxTitle: "Bandeja de soporte",
      inboxSubtitle: "Responde y asiste a tus usuarios",
      conversations: "Conversaciones",
      noConversations: "Aún no hay conversaciones.",
      selectConversation: "Selecciona una conversación para responder.",
      customer: "Cliente",
      reply: "Responder",
      replyPlaceholder: "Escribe una respuesta…",
      newTicket: "Nuevo ticket",
      newTicketTitle: "Abrir un nuevo ticket",
      subjectLabel: "Asunto",
      subjectPlaceholder: "Resumen breve del problema",
      messageLabel: "Mensaje",
      create: "Abrir ticket",
      createError: "No se pudo abrir el ticket.",
      myTickets: "Mis tickets",
      lastSeen: "Última vez {when}",
      online: "En línea",
      seen: "Visto",
      priorities: { low: "Baja", normal: "Normal", high: "Alta", urgent: "Urgente" },
      noTickets: "Aún no hay tickets.",
      selectTicket: "Selecciona un ticket para verlo.",
      tickets: "Tickets",
      all: "Todos",
      statusError: "No se pudo actualizar el estado.",
      statuses: { open: "Abierto", pending: "Pendiente", resolved: "Resuelto", closed: "Cerrado" }
    },
    admin: {
      loading: "Cargando…",
      loadError: "No se pudieron cargar los datos.",
      empty: "Nada por aquí todavía.",
      orgFilter: "Organización",
      clearFilter: "Quitar filtro",
      filters: { all: "Todos", PENDING: "Pendiente", SUBMITTED: "Enviado", SUCCEEDED: "Completado", FAILED: "Fallido" },
      overview: {
        title: "Resumen de la plataforma", sub: "Actividad global en todas las organizaciones",
        cards: { consumers: "Organizaciones", customers: "Clientes", products: "Productos", webhooks: "Endpoints de webhook" },
        payments: "Intentos de pago", swaps: "Swaps", fiat: "Fiat (KYC/KYB)",
        receivers: "Receptores", payins: "Payins", payouts: "Payouts",
        volume: "Volumen liquidado",
        volHead: { asset: "Activo", amount: "Cantidad", count: "Recuento" },
      },
      payments: { title: "Intentos de pago", sub: "Todos los intentos de pago de las organizaciones", searchPlaceholder: "Buscar por ID, destino, organización…", empty: "No hay intentos de pago.", tableHead: { id: "ID", org: "Organización", destination: "Destino", amount: "Cantidad", status: "Estado", created: "Creado" } },
      swaps: { title: "Swaps", sub: "Todos los swaps de las organizaciones", searchPlaceholder: "Buscar por ID, cuenta, organización…", empty: "No hay swaps.", tableHead: { id: "Swap", org: "Organización", route: "Enviado → recibido", status: "Estado", created: "Creado" } },
      fiat: {
        title: "Fiat", sub: "Receptores, payins y payouts de las organizaciones",
        tabs: { receivers: "Receptores", payins: "Payins", payouts: "Payouts" },
        searchReceivers: "Buscar receptores…", searchPayins: "Buscar payins…", searchPayouts: "Buscar payouts…",
        emptyReceivers: "No hay receptores.", emptyPayins: "No hay payins.", emptyPayouts: "No hay payouts.",
        statusUnknown: "Desconocido",
        disabled: "Deshabilitada", disable: "Deshabilitar", enable: "Habilitar",
        accountDisabled: "Cuenta fiat deshabilitada", accountEnabled: "Cuenta fiat habilitada",
        accessError: "No se pudo actualizar la cuenta fiat.",
        approve: "Aprobar", approved: "Aprobado",
        termsSent: "Términos de servicio enviados a {email}",
        approveError: "No se pudo aprobar el receptor.",
        resendVerification: "Reenviar email de verificación",
        verificationSent: "Email de verificación enviado a {email}",
        resendError: "No se pudo reenviar el email de verificación.",
        sending: "Enviando…",
        receiverHead: { name: "Nombre", org: "Organización", type: "Tipo", status: "Estado KYC", created: "Creado" },
        payinHead: { id: "Payin", org: "Organización", asset: "Activo", method: "Método", amount: "Enviado → recibido", status: "Estado", created: "Creado" },
        payoutHead: { id: "Payout", org: "Organización", asset: "Activo", rail: "Vía", amount: "Enviado → recibido", status: "Estado", created: "Creado" },
      },
      customers: { title: "Clientes", sub: "Todos los clientes de las organizaciones", searchPlaceholder: "Buscar clientes…", empty: "No hay clientes.", tableHead: { name: "Nombre", org: "Organización", email: "Email", account: "Cuenta", created: "Creado" } },
      products: { title: "Productos", sub: "Todos los productos de las organizaciones", searchPlaceholder: "Buscar productos…", empty: "No hay productos.", tableHead: { name: "Nombre", org: "Organización", price: "Precio", kind: "Tipo", created: "Creado" } },
      consumers: { title: "Organizaciones", sub: "Cada consumidor de API y su actividad", searchPlaceholder: "Buscar organizaciones…", empty: "No hay organizaciones.", account: "Cuenta", moreOrgs: "+{n} más", note: "Los totales son por cuenta de desarrollador (una cuenta puede tener varias organizaciones).", tableHead: { org: "Organización", payments: "Pagos", swaps: "Swaps", products: "Productos", customers: "Clientes", receivers: "Receptores", payins: "Payins", payouts: "Payouts", webhooks: "Webhooks", created: "Creado" } },
    },
    planNames: {
      community: "Community",
      starter: "Starter",
      essentials: "Essentials",
      growth: "Growth",
      enterprise: "Enterprise"
    },
    roleNames: {
      user: "Usuario",
      support: "Soporte",
      admin: "Administrador",
      owner: "Propietario"
    },
    account: {
      title: "Cuenta",
      sub: "Gestiona tu cuenta personal",
      profile: { title: "Perfil", name: "Nombre", email: "Correo", role: "Rol", note: "Tu nombre, foto y biografía se editan aquí.",
        displayName: "Nombre visible", displayNamePlaceholder: "Tu nombre", bio: "Biografía", bioPlaceholder: "Una línea sobre ti o tu empresa",
        edit: "Editar", save: "Guardar cambios", saving: "Guardando…", uploadPhoto: "Subir foto", changePhoto: "Cambiar foto", removePhoto: "Quitar",
        photoHint: "PNG, JPG o WebP — cuadrada queda mejor.", saved: "Perfil actualizado", saveError: "No se pudo actualizar tu perfil.",
        photoTooLarge: "Esa imagen es muy grande. Elige una de menos de 8 MB.", photoInvalid: "Ese archivo no es una imagen compatible.",
        editNote: "El correo y el rol provienen de tu inicio de sesión de Cosmos Pay." },
      session: { title: "Sesión", desc: "Cierra sesión del panel de Cosmos Pay en este dispositivo.", signOut: "Cerrar sesión" },
    },
    users: {
      title: "Usuarios",
      subtitle: "Gestiona roles y planes de las cuentas",
      loadError: "No se pudieron cargar los usuarios.",
      saveError: "No se pudo actualizar el usuario.",
      saved: "Usuario actualizado",
      search: "Buscar usuarios…",
      name: "Nombre",
      email: "Email",
      role: "Rol",
      plan: "Plan",
      empty: "No se encontraron usuarios."
    },
    orgs: {
      permissionsLabel: "Permisos",
      permResource: "Permiso",
      resources: { apiKeysTest: "Claves de API de prueba", apiKeysLive: "Claves de API de producción", webhooks: "Webhooks", products: "Productos", customers: "Clientes", payments: "Links de pago" },
      actions: { create: "Crear", edit: "Editar", delete: "Eliminar" },
      permissions: { apiKeysTest: "Crear claves de API de prueba", apiKeysLive: "Crear claves de API de producción", webhooks: "Crear endpoints de webhook", products: "Crear productos", customers: "Crear clientes", payments: "Crear links de pago" },
      editMember: "Editar",
      editMemberTitle: "Editar miembro",
      save: "Guardar",
      memberUpdated: "Miembro actualizado",
      memberUpdateError: "No se pudo actualizar el miembro.",
      adminAllNote: "Los admins pueden hacer todo en la organización.",
      removeMemberTitle: "Quitar miembro",
      removeMemberBody: "¿Quitar a {name} de {org}? Perderá el acceso de inmediato.",
      removeMemberConfirm: "Quitar",
      join: "Unirme",
      joined: "Te uniste a la organización",
      joinError: "No se pudo aceptar la invitación.",
      bannerTitle: "Te invitaron a unirte a {org}",
      bannerSub: "Invitado como {role}",
      roleLabel: "Rol",
      roleMemberHint: "Los colaboradores pueden ver el panel pero no crear claves de API ni gestionar la organización.",
      roleAdminHint: "Los admins pueden crear claves de API y gestionar la organización y sus miembros.",
      inviteMember: "Invitar miembro",
      invited: "Invitación enviada",
      inviteError: "No se pudo enviar la invitación.",
      inviteHint: "Le enviaremos un enlace mágico que caduca en 3 días. Los asientos son por organización.",
      send: "Enviar invitación",
      sending: "Enviando…",
      pending: "Invitaciones pendientes",
      expires: "Caduca {date}",
      revokeInvite: "Revocar",
      revokeError: "No se pudo revocar la invitación.",
      loadError: "No se pudieron cargar las organizaciones.",
      createError: "No se pudo crear la organización.",
      renameError: "No se pudo renombrar la organización.",
      deleteError: "No se pudo eliminar la organización.",
      rename: "Renombrar",
      renameTitle: "Renombrar organización",
      delete: "Eliminar organización",
      deleteTitle: "Eliminar organización",
      deleteBody: "«{name}» se eliminará permanentemente junto con sus miembros. Esta acción no se puede deshacer.",
      deleteConfirm: "Eliminar",
      members: "Miembros",
      membersSub: "Personas con acceso a esta organización",
      addMember: "Añadir miembro",
      memberEmail: "Email del miembro",
      memberEmailHint: "Debe tener ya una cuenta de Cosmos Pay.",
      add: "Añadir",
      remove: "Quitar",
      you: "Tú",
      roles: {
        owner: "Propietario",
        admin: "Administrador",
        member: "Miembro"
      },
      memberAddError: "No se pudo añadir ese miembro. Verifica que el email pertenezca a una cuenta de Cosmos Pay.",
      memberRemoveError: "No se pudo quitar al miembro.",
      empty: "Aún no hay miembros."
    },
    swaps: {
      title: "Swaps",
      sub: "{n} swaps · entre activos en Stellar",
      create: "Crear swap",
      readOnly: "Tienes acceso de solo lectura a los swaps en esta organización.",
      searchPlaceholder: "Buscar por cuenta, activo o ID…",
      filters: { all: "Todos", PENDING: "Pendiente", SUBMITTED: "Enviado", SUCCEEDED: "Completado", FAILED: "Fallido" },
      status: { PENDING: "Pendiente", SUBMITTED: "Enviado", SUCCEEDED: "Completado", FAILED: "Fallido" },
      tableHead: { id: "Swap", route: "Enviado → recibido", status: "Estado", created: "Creado" },
      empty: "Aún no hay swaps. Crea uno para obtener una transacción sin firmar.",
      loading: "Cargando swaps…",
      loadError: "No se pudieron cargar los swaps.",
      createError: "No se pudo crear el swap.",
      quoteError: "No se pudo cotizar el swap.",
      network: { dev: "Testnet", prod: "Red pública" },
      modal: {
        eyebrow: "Swap", title: "Crear swap",
        desc: "Cambia un activo de Stellar por otro mediante un pago por ruta. Cotiza y luego firma la transacción.",
        source: "Cuenta de origen", sourceHint: "Cuenta de Stellar que envía el swap (G…).",
        amount: "Cantidad a enviar", amountHint: "Cantidad del activo de origen (XLM) a cambiar.",
        destAsset: "Activo de destino", destAssetHint: "Código del activo a recibir (p. ej. USDC).",
        destIssuer: "Emisor de destino", destIssuerHint: "Requerido para activos no nativos (G…).",
        slippage: "Slippage (bps)", slippageHint: "Slippage máx. en puntos básicos (opcional, p. ej. 50).",
        getQuote: "Cotizar", quoting: "Cotizando…",
        quoteTitle: "Cotización",
        estimated: "Recibido estimado", minimum: "Recibido mínimo",
        fee: "Comisión", bps: "bps",
        feeNote: "La comisión es la tarifa del plan de tu organización — se aplica automáticamente.",
        create: "Crear swap", creating: "Creando…",
      },
      detail: {
        eyebrow: "Swap", title: "Swap listo",
        scan: "Escanea para firmar", downloadQr: "Descargar QR",
        uri: "URI SEP-7", xdr: "XDR sin firmar",
        openWallet: "Abrir en wallet", viewExplorer: "Ver en el explorador",
        fields: { id: "ID", status: "Estado", network: "Red", source: "Origen", destination: "Destino", sent: "Enviado", received: "Recibido (est.)", minimum: "Mínimo", fee: "Comisión", memo: "Memo", txHash: "ID de transacción", created: "Creado" },
        submitTitle: "Enviar transacción firmada",
        submitDesc: "Pega el XDR firmado devuelto por la wallet para transmitir el swap.",
        submitPlaceholder: "XDR de la transacción firmada…",
        submit: "Enviar", submitting: "Enviando…",
        submitted: "Swap enviado",
        submitFailed: "No se pudo enviar el swap.",
        resultCodes: "Códigos de resultado",
      },
    },
    blindpay: {
      title: "Fiat",
      sub: "Onramp y Offramp · KYC/KYB",
      gate: "Se requiere verificación KYC/KYB antes de cualquier onramp u offramp. Crea un receptor y completa la verificación primero.",
      readOnly: "Tienes acceso de solo lectura a Fiat en esta organización.",
      selectCountry: "Selecciona país",
      searchCountry: "Buscar países…",
      upload: "Subir", uploading: "Subiendo…", replace: "Reemplazar", uploaded: "Subido", uploadError: "No se pudo subir el archivo.", linkMode: "Enlace", clearFile: "Quitar",
      loading: "Cargando…",
      loadError: "No se pudieron cargar los datos.",
      txStatuses: { pending: "Pendiente", processing: "Procesando", on_hold: "En espera", funds_received: "Fondos recibidos", completed: "Completado", refunded: "Reembolsado", partial_refund: "Reembolsado parcialmente", failed: "Fallido", cancelled: "Cancelado", canceled: "Cancelado", expired: "Expirado", reversed: "Revertido" },
      kycReturn: {
        eyebrow: "Fiat — activación",
        activating: "Activando tu cuenta…",
        activatingBody: "Espera mientras confirmamos tu aceptación.",
        successTitle: "Tu cuenta ya está activa",
        successBody: "Ya puedes añadir wallets y cuentas bancarias y usar onramp y offramp.",
        errorTitle: "No se pudo activar",
        errorBody: "No pudimos activar tu cuenta. Inténtalo de nuevo.",
        noTosId: "No se devolvió ningún id de términos de servicio — inténtalo de nuevo.",
        backToDashboard: "Volver al panel",
      },
      tabs: { receivers: "Receptores", onramp: "Onramp", offramp: "Offramp" },
      receivers: {
        create: "Crear receptor",
        searchPlaceholder: "Buscar receptores…",
        tableHead: { name: "Nombre", type: "Tipo", status: "Estado KYC", created: "Creado" },
        empty: "Aún no hay receptores. Crea uno para iniciar KYC/KYB.",
        statusUnknown: "Desconocido",
        inactive: "Inactivo",
        statuses: { inactive: "Inactivo", pending_review: "Pendiente de revisión", pending_user: "Pendiente de términos del cliente", verifying: "Verificando", approved: "Aprobado", rejected: "Rechazado" },
        disabled: "Deshabilitada",
        disableAccount: "Deshabilitar cuenta",
        enableAccount: "Habilitar cuenta",
        disabledNote: "Esta cuenta fiat está deshabilitada — onramp/offramp están bloqueados hasta reactivarla.",
        accountDisabled: "Cuenta fiat deshabilitada",
        accountEnabled: "Cuenta fiat habilitada",
        accessError: "No se pudo actualizar la cuenta fiat.",
        inactiveNote: "Solo registro — aún no se han enviado datos de KYC.",
        awaitingReview: "A la espera de revisión del propietario/administrador.",
        reviewTitle: "Revisar KYC",
        reviewHint: "Revisa los datos de KYC enviados y luego aprueba para enviar al cliente los términos de servicio por email.",
        approve: "Aprobar y enviar términos",
        approving: "Aprobando…",
        approvedSent: "Aprobado — términos enviados a {email}",
        approveError: "No se pudo aprobar el receptor.",
        termsSentTitle: "Términos enviados",
        termsSentBody: "A la espera de la aceptación del cliente — términos enviados a {email}.",
        termsSentBodyNoEmail: "A la espera de que el cliente acepte los términos de servicio.",
        resendTerms: "Reenviar email de términos",
        resendVerification: "Reenviar email de verificación",
        verificationSent: "Email de verificación enviado a {email}",
        refresh: "Actualizar estado",
        refreshing: "Actualizando…",
        refreshError: "No se pudo actualizar el estado de KYC desde BlindPay.",
        sending: "Enviando…",
        types: { individual: "Individual", business: "Empresa" },
        createError: "No se pudo crear el receptor.",
        tosTitle: "Activar cuenta",
        tosHint: "Este receptor está inactivo. Acepta los términos de servicio para activarlo.",
        activate: "Activar cuenta",
        redirecting: "Redirigiendo…",
        getTos: "Obtener términos de servicio",
        emailTos: "Enviar términos por email",
        tosUrl: "URL de términos",
        openTerms: "Abrir términos",
        tosIdLabel: "ID de términos de servicio",
        tosIdHintEnable: "Pega el tos_id de la URL a la que fuiste redirigido tras aceptar.",
        enable: "Activar cuenta",
        enabled: "Cuenta activada",
        tosSent: "Términos de servicio enviados a {email}",
        getTosError: "No se pudieron obtener los términos de servicio.",
        emailTosError: "No se pudieron enviar los términos por email.",
        enableError: "No se pudo activar la cuenta.",
        modal: {
          eyebrow: "Receptor", title: "Crear receptor",
          desc: "Un receptor es la entidad KYC (individual) o KYB (empresa) requerida para onramp/offramp.",
          type: "Tipo", individual: "Individual (KYC)", business: "Empresa (KYB)",
          kycType: "Nivel de verificación",
          ownersTitle: "Propietarios (UBO)", ownerN: "Propietario {n}", addOwner: "Añadir propietario", removeOwner: "Quitar",
          fields: {
            email: "Email", country: "País",
            first_name: "Nombre", last_name: "Apellido", date_of_birth: "Fecha de nacimiento", tax_id: "ID fiscal", phone_number: "Teléfono",
            address_line_1: "Dirección", city: "Ciudad", state_province_region: "Estado / provincia / región", postal_code: "Código postal",
            id_doc_country: "País del documento", id_doc_type: "Tipo de documento", id_doc_front_file: "Documento (anverso)", id_doc_back_file: "Documento (reverso)",
            selfie_file: "Selfie", proof_of_address_doc_type: "Tipo de comprobante de domicilio", proof_of_address_doc_file: "Comprobante de domicilio",
            occupation: "Ocupación", account_purpose: "Propósito de la cuenta", source_of_funds_doc_type: "Tipo de origen de fondos", source_of_funds_doc_file: "Documento de origen de fondos",
            source_of_wealth: "Origen del patrimonio", purpose_of_transactions: "Propósito de las transacciones", purpose_of_transactions_explanation: "Propósito de las transacciones — explicación",
            legal_name: "Razón social", alternate_name: "Nombre alternativo", business_type: "Tipo de empresa", business_industry: "Industria", business_description: "Descripción del negocio",
            formation_date: "Fecha de constitución", estimated_annual_revenue: "Ingresos anuales estimados", website: "Sitio web",
            incorporation_doc_file: "Documento de constitución", proof_of_ownership_doc_file: "Comprobante de titularidad",
            ownership_percentage: "% de propiedad", title: "Cargo",
          },
          create: "Crear receptor", creating: "Creando…",
        },
        detail: {
          eyebrow: "Receptor",
          id: "ID", blindpayId: "ID del proveedor", kycStatus: "Estado KYC", kycType: "Nivel de verificación", email: "Email", country: "País",
          terms: "Términos de servicio",
          tosOpened: "Flujo de términos de servicio iniciado.",
          tosError: "No se pudo iniciar el flujo de términos de servicio.",
          wallets: "Wallets blockchain", noWallets: "Aún no hay wallets.", addWallet: "Añadir wallet",
          banks: "Cuentas bancarias", noBanks: "Aún no hay cuentas bancarias.", addBank: "Añadir cuenta bancaria",
        },
        wallet: {
          name: "Nombre", network: "Red",
          address: "Dirección", addressHint: "Dirección de la wallet (G… para Stellar).",
          aa: "Abstracción de cuenta", add: "Añadir wallet",
          error: "No se pudo añadir la wallet.",
        },
        bank: {
          rail: "Vía", name: "Nombre", beneficiary: "Nombre del beneficiario", country: "País",
          accountNumber: "Número de cuenta", routingNumber: "Número de routing",
          add: "Añadir cuenta bancaria",
          error: "No se pudo añadir la cuenta bancaria.",
        },
      },
      onramp: {
        create: "Nuevo payin",
        searchPlaceholder: "Buscar payins…",
        tableHead: { id: "Payin", asset: "Activo", method: "Método", amount: "Enviado → recibido", status: "Estado", created: "Creado" },
        empty: "Aún no hay payins.",
        statusUnknown: "Desconocido",
        quoteError: "No se pudo cotizar el payin.",
        createError: "No se pudo crear el payin.",
        created: "Payin creado",
        modal: {
          eyebrow: "Onramp", title: "Nuevo payin",
          desc: "Fiat → stablecoin. Cotiza y luego crea el payin para obtener las instrucciones de pago.",
          walletId: "ID de wallet", walletIdHint: "Wallet del receptor que recibe la stablecoin.",
          method: "Método de pago", token: "Token",
          currencyType: "Importe en", curSender: "Emisor", curReceiver: "Receptor",
          amount: "Importe", amountHint: "Unidades menores (entero), p. ej. 10000 = 100,00.",
          getQuote: "Cotizar", quoting: "Cotizando…",
          quoteId: "ID de cotización", youSend: "Envías", youReceive: "Recibes", expires: "Expira",
          create: "Crear payin", creating: "Creando…",
          payinId: "ID de payin", status: "Estado",
          instructions: "Instrucciones de pago", done: "Listo",
        },
      },
      offramp: {
        create: "Nuevo payout",
        searchPlaceholder: "Buscar payouts…",
        tableHead: { id: "Payout", asset: "Activo", rail: "Vía", amount: "Enviado → recibido", status: "Estado", created: "Creado" },
        empty: "Aún no hay payouts.",
        statusUnknown: "Desconocido",
        quoteError: "No se pudo cotizar el payout.",
        authError: "No se pudo construir la transacción a firmar.",
        createError: "No se pudo crear el payout.",
        created: "Payout creado",
        modal: {
          eyebrow: "Offramp", title: "Nuevo payout",
          desc: "Stablecoin → fiat. Cotiza; para Stellar, autoriza para obtener la tx, fírmala y envíala.",
          bankId: "ID de cuenta bancaria", bankIdHint: "Cuenta bancaria del receptor que recibe el fiat.",
          network: "Red", token: "Token",
          currencyType: "Importe en", curSender: "Emisor", curReceiver: "Receptor",
          coverFees: "Cubrir comisiones",
          amount: "Importe", amountHint: "Unidades menores (entero), p. ej. 10000 = 100,00.",
          getQuote: "Cotizar",
          quoteId: "ID de cotización", youSend: "Envías", youReceive: "Recibes (fiat)", expires: "Expira",
          senderWallet: "Wallet emisora", senderWalletHint: "Wallet que tiene la stablecoin (G… / 0x…).",
          authorize: "Autorizar",
          unsignedTx: "Transacción sin firmar",
          signedTx: "Transacción firmada", signedTxHint: "Pega la transacción firmada devuelta por la wallet.",
          signedTxPlaceholder: "Transacción firmada…",
          evmNote: "Para redes EVM, firma el contrato approve de la cotización vía la API antes de crear el payout.",
          create: "Crear payout", creating: "Creando…",
        },
      },
    }
  }
};

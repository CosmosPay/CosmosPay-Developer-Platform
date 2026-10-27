/* es.js: Spanish message catalog. Mirrors en.js exactly in shape. */
export default {
  ui: { close: "Cerrar", dialog: "Diálogo", copyToClipboard: "Copiar al portapapeles", search: "Buscar", searchEllipsis: "Buscar…", select: "Seleccionar…", account: "Cuenta", onboardingSteps: "Pasos de la incorporación", skipToContent: "Saltar al contenido" },
  zk: {
    title: "Pagos privados",
    commission: "Comisión",
    commissionRate: "0,18% por transacción",
    amount: "Monto",
    merchantGets: "Recibe el cliente",
    merchantFee: "Comisión del comercio",
    youPay: "Pagas",
    status: {
      PENDING: "Pendiente",
      SUCCEEDED: "Pagado",
      EXPIRED: "Vencido",
    },
    unavailable: "Los pagos privados todavía no están disponibles en esta red.",
    cannotProve: "Este navegador no puede generar las pruebas. Abre la página en Chrome, Edge o Firefox.",
    freighter: {
      missing: "Instala Freighter para continuar.",
      declined: "Freighter rechazó la solicitud.",
      wrongNetwork: "Cambia Freighter a {network}.",
    },
    phases: {
      keys: "Firma en Freighter para derivar tu clave privada",
      proving: "Generando la prueba…",
      signing: "Aprueba en Freighter…",
      waiting: "Esperando a la red…",
    },
    view: { detail: { title: "Pago privado", payer: "Pagador", paymentTx: "Transacción del pago", feeTx: "Transacción de la comisión", expires: "Vence", settled: "Liquidado" },
      create: "Crear pago privado",
      empty: "Todavía no hay pagos privados.",
      loadError: "No se pudieron cargar los pagos privados.",
      tableHead: {
        id: "Pago",
        amount: "Monto",
        net: "Recibe el cliente",
        fee: "Comisión",
        status: "Estado",
        created: "Creado",
      },
      copyLink: "Copiar enlace de pago",
      openCheckout: "Abrir el checkout",
      searchPlaceholder: "Buscar por ID, cuenta o monto…",
    },
    modal: {
      title: "Nuevo pago privado",
      recipient: "Cuenta privada del cliente",
      recipientHint: "El cliente que recibe el pago, en su cuenta privada.",
      feeHint: "Tu propia comisión, en el mismo pago privado y aparte de la comisión de Cosmos Pay. Va a una wallet de Stellar de la organización, que también necesita una cuenta privada.",
      payerPays: "Paga el pagador",
      description: "Descripción",
      expires: "Vence en",
      expiries: {
        m60: "1 hora",
        m1440: "24 horas",
        m10080: "7 días",
      },
      submit: "Crear",
      submitting: "Creando…",
      created: "Pago privado creado",
      link: "Enlace de pago",
      steps: { amount: "Monto y cliente", details: "Detalles", fee: "Comisión" },
    },
    account: {
      title: "Cuentas privadas",
      needWallet: "Para recibir pagos privados, la organización necesita al menos una wallet de Stellar conectada.",
      viewBalances: "Ver saldos",
      registered: "Activa",
      spendable: "Disponible",
      receiving: "Entrante",
      merge: "Pasar lo entrante a disponible",
      withdraw: "Retirar a XLM público",
      deposit: "Depositar XLM",
      amountLabel: "Monto",
      refresh: "Actualizar",
      working: "Procesando…",
      createdOk: "Cuenta privada creada",
      depositOk: "Depósito completado",
      withdrawOk: "Retiro completado",
      mergeOk: "Lo entrante pasó a disponible",
      done: "Listo",
      tableHead: { wallet: "Wallet", customer: "Cliente", address: "Dirección", status: "Estado", payments: "Pagos recibidos", added: "Agregada" },
      detail: "Cuenta privada",
      paymentsTo: "Pagos privados a esta cuenta",
      add: "Crear cuenta privada",
      newCustomer: "Nuevo cliente",
      customerName: "Nombre del cliente",
      walletLabel: "Nombre de la wallet",
      added: "Cuenta privada agregada: ya existía en el contrato",
      remove: "Eliminar cuenta privada",
      removed: "Cuenta privada eliminada del dashboard. Su saldo privado sigue siendo del cliente.",
      removeTitle: "¿Eliminar la cuenta privada?",
      removeBody: "Se quita {account} de {customer}. La cuenta privada y su saldo siguen siendo del cliente; no se mueve nada.",
      searchPlaceholder: "Buscar por cliente, wallet o dirección…",
      noPaymentsYet: "Esta cuenta todavía no recibió pagos privados",
      loadError: "No se pudieron cargar las cuentas privadas.",
      keyMismatch: "Esta cuenta se registró en el token privado firmando un mensaje con Freighter (en el checkout privado, o en el dashboard antes del 27/10/2026), no la transacción de la clave, así que esta firma no abre sus saldos aquí. Igual recibe pagos privados.",
      keyFailed: "La transacción firmada no es la firma de {wallet}. Pide al cliente que la firme con esa cuenta.",
      phases: { keys: "Esperando la firma del cliente…", proving: "Generando la prueba…", signing: "Esperando la firma del cliente…", waiting: "Esperando a la red…" },
      steps: { account: "Cuenta", sign: "Firmas" },
      customerWallet: "Wallet de Stellar del cliente",
      otherAddress: "Otra dirección",
      requestSignatures: "Pedir firmas y crear",
      creating: "Creando…",
      notFunded: "Esta cuenta todavía no existe en {network}. Necesita XLM antes de poder tener una cuenta privada.",
      alreadyAdded: "Esta cuenta ya es una de las cuentas privadas de este cliente.",
      notSaved: "La cuenta privada se creó en el token, pero no se pudo agregar al cliente: {error}. Agrégala de nuevo; pedirá una sola firma.",
      unchecked: "{n} wallets de clientes no se pudieron verificar en la red.",
      checkAgain: "Verificar de nuevo",
      balancesHidden: "Oculto hasta que el cliente firme",
      createdOn: "Creada en el contrato",
      checking: "Consultando el contrato…",
      addExisting: "Agregar la cuenta privada existente",
      modeSub: "Crear una nueva",
      modeExisting: "Usar la existente",
      subOf: "Subcuenta de {base}",
      signedBy: "Firmada por",
      subUnderfunded: "La dirección no tiene XLM suficientes para la subcuenta: necesita {amount} XLM más la comisión.",
      subFailed: "No se pudo crear la subcuenta: {error}.",
      createdAt: "{date}, en la transacción {tx}",
      existsTitle: "Esta dirección ya tiene una cuenta privada",
      existsHereTitle: "La cuenta privada de esta dirección ya es de este cliente: puedes crear una nueva",
      modeExistingDesc: "Se agrega al cliente, sin firmas.",
      modeSubDesc: "Una subcuenta de esta dirección, con su propia cuenta privada. La dirección le aporta {amount} XLM y firma todo con su wallet.",
      sigsLabel: "Firmas",
      sigSub: "Crear la subcuenta con {amount} XLM",
      sigKey: "Clave de la cuenta privada",
      sigProof: "Prueba de registro",
      sigRegister: "Registro en el token",
      sigBy: "Firma",
      sigHere: "En este navegador",
    },
    sign: {
      eyebrow: "Firma",
      key: { title: "Firma del cliente para la cuenta privada", desc: "Esta transacción nunca puede enviarse a la red: la firma del cliente abre la clave de su cuenta privada, aquí o en cualquier dispositivo. Una sola firma alcanza. Quien tenga esa firma puede ver los saldos privados de la cuenta (no moverlos), así que el cliente solo debe firmarla para ti." },
      subAccount: { title: "Firma para crear la subcuenta", desc: "Esta transacción crea una cuenta Stellar nueva, con fondos de la cuenta del cliente, y deja a la cuenta del cliente como su único firmante." },
      register: { title: "Firma para crear la cuenta privada", desc: "Esta transacción registra las claves de la cuenta en el token privado." },
      deposit: { title: "Firma el depósito", desc: "Esta transacción pasa XLM público al saldo privado de la cuenta." },
      withdraw: { title: "Firma el retiro", desc: "Esta transacción devuelve saldo privado al XLM público de la cuenta." },
      merge: { title: "Firma para pasar lo entrante a disponible", desc: "Esta transacción pasa lo que recibió la cuenta a su saldo disponible." },
      transfer: { title: "Firma el pago privado", desc: "Esta transacción envía el pago de forma privada." },
      xdr: "Transacción para firmar (XDR)",
      pasteTitle: "Firmada en otra wallet",
      pasteDesc: "Copia el XDR de arriba, fírmalo con {account} en cualquier wallet de Stellar y pega aquí el XDR firmado.",
      customerTitle: "Firmada por el cliente (XDR)",
      customerDesc: "Copia el XDR de arriba y envíaselo al cliente: lo firma con {account} en cualquier wallet de Stellar y te devuelve el XDR firmado. Pégalo aquí.",
      pastePlaceholder: "XDR de la transacción firmada…",
      continue: "Continuar",
      expires: "Te quedan {time} para firmar",
      expired: "Esta transacción venció. Cancela y vuelve a empezar.",
      invalid: "Eso no es el XDR de una transacción firmada.",
      otherTransaction: "Es otra transacción. Firma el XDR de arriba sin cambiarlo.",
      notSigned: "Esa transacción no está firmada por {account}.",
      txAccount: "Cuenta de la transacción",
      signer: "Firma con",
      subTitle: "Se firma con la dirección, no con la subcuenta",
      subBody: "La transacción es de la subcuenta {sub} y su único firmante es {account}: fírmala con la wallet de {account}, como las demás. La subcuenta no tiene clave propia.",
    },
    checkout: {
      title: "Pago privado",
      to: "Para",
      payPrivately: "Pagar en privado",
      steps: {
        register: "Crear tu cuenta confidencial",
        fund: "Pasar XLM a tu saldo confidencial",
        pay: "Enviar el pago",
        fee: "Enviar la comisión",
        merchantFee: "Enviar la comisión del comercio",
        confirm: "Confirmar el pago",
      },
      paid: "Pago completado",
      paidBody: "El monto queda privado en la cadena.",
      expired: "Este pago venció.",
      notFound: "Este pago no existe.",
      loadError: "No se pudo cargar este pago.",
      retry: "Reintentar",
      transactions: "Transacciones",
    },
  },
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
    goalsSub: "Elige todo lo que aplique. Adaptaremos tu panel y te sugeriremos el plan adecuado.",
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
    planSub: "Starter no tiene cuota mensual: solo pagas por transacción exitosa. Cambia de plan cuando quieras, sin llamadas.",
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
    specTagline: "Una API. Stellar, Solana y Monad.",
    specTaglineSub: "Acepta y mueve dinero en USDC con liquidación en ~5 segundos. Elige el plan que encaje y cámbialo cuando quieras.",
    selectedPlan: "Plan seleccionado",
    recommendedForYou: "Recomendado para ti",
    spec: {
      perTx: "Por transacción",
      swap: "Por swap",
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
      standard: "Estándar",
      priority: "Prioritario"
    },
    plans: {
      starter: {
        desc: "Acepta pagos reales en Stellar, Solana y Monad",
        sub: "+ 18¢ / txn",
        pnote: "1.5% + 18¢ por transacción",
        team: "Hasta 2",
        feats: ["Acceso parcial a la API", "Claves en vivo y de prueba", "Liquidación en USDC", "Hasta 2 miembros"]
      },
      growth: {
        desc: "Tarifas más bajas para equipos en crecimiento",
        sub: "/mes · desde",
        pnote: "desde · 0.75% + 18¢ por txn",
        team: "Ilimitado",
        feats: ["Todo lo de Starter", "Tarifa por transacción más baja", "Miembros ilimitados", "Herramientas antifraude Radar", "Descuentos por volumen", "Soporte prioritario"]
      }
    }
  },

  /* ---------------- /login ---------------- */

  nav: {
    login: "Iniciar sesión",
    getKeys: "Obtener claves",
    dashboard: "Panel",
    menu: "Menú",
    docs: "Documentación",
    main: "Principal",
    closeMenu: "Cerrar menú",
    theme: "Modo oscuro",
    language: "Idioma",
    items: {
      products: {
        label: "Productos",
        cols: [
          {
            head: "Aceptar dinero",
            links: [
              {
                t: "Pagos",
                s: "Stellar, Solana y Monad"
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
                t: "Swaps",
                s: "Cualquier token y red, sin cuenta"
              }
            ]
          },
          {
            head: "Construir con",
            links: [
              {
                t: "Stablecoins",
                s: "USDC y activos multichain"
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
    copyright: "© 2026 Cosmos Pay",
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
      tagline: "Tu mundo digital en movimiento.",
      headline: "Escribí menos código -> mové más dinero",
      lede: "La infraestructura de pagos para desarrolladores. Una API para mover dinero en Stellar, Solana y Monad: stablecoins y activos digitales que se liquidan en segundos, en más de 130 países, con comisiones de fracciones de centavo.",
      getKeys: "Obtener claves de API",
      trustedBy: "Con la confianza de equipos de ingeniería de"
    },
    wallet: {
      title: "Tu mundo digital en una wallet.",
      lede: "Instalala en Chrome, probala en el navegador o llevatela en el celular. La misma cuenta en todos lados, en Stellar, Solana y Monad.",
      chrome: { t: "Instalar en Chrome", s: "Extensión oficial en la Chrome Web Store." },
      web: { t: "Probar en el navegador", s: "Abrí la webapp ahora, sin instalar nada." },
      android: { t: "Descargar para Android", s: "APK firmado. Permití \"Instalar apps desconocidas\" para tu navegador, abrí el archivo e instalá." },
      moreLabel: "Otras plataformas",
      versionLabel: "Versión",
      download: "Descargar",
      more: {
        firefox: { t: "Firefox", s: "Sin firmar. Entrá a about:debugging, elegí \"Este Firefox\", después \"Cargar complemento temporal\" y seleccioná el manifest.json del zip." },
        windows: { t: "Windows", s: "SmartScreen avisa la primera vez: tocá \"Más información\" y después \"Ejecutar de todas formas\"." },
        macos: { t: "macOS (Apple Silicon)", s: "Gatekeeper la bloquea la primera vez: click derecho sobre la app y \"Abrir\"." },
        linux: { t: "Linux", s: "AppImage: dale chmod +x antes de correrla. Necesita glibc 2.39 o mayor." },
      },
      ios: "Todavía no hay versión para iOS.",
    },
    devs: {
      title: "¿Querés integrar Cosmos Pay Wallet a tu startup?",
      lede: "Un comando y un link. Tu asistente de código hace el resto.",
      installTitle: "Instalá el SDK",
      installDesc: "JavaScript y TypeScript, para el servidor y para el navegador. Un paquete, dos puntos de entrada.",
      llmsTitle: "Pasale las docs a tu asistente",
      llmsDesc: "Claude Code, Codex y Cursor leen el índice en texto plano y ya saben usar el SDK.",
      llmsBtn: "Abrir llms.txt",
      docsBtn: "Ver la documentación",
    },
    api: {
      kicker: "// la plataforma",
      title: "APIs potentes",
      lede: "Nuestras APIs modulares permiten a los desarrolladores integrar flujos financieros complejos en minutos, no en meses.",
      docsLink: "Ver documentación de la API",
      cards: {
        payments: {
          title: "Pagos",
          desc: "Enviá y recibí pagos en Stellar, Solana y Monad con finalidad en segundos y comisiones casi nulas."
        },
        stablecoin: {
          title: "Stablecoins",
          desc: "Liquidá en USDC y otros activos en Stellar, Solana y Monad, on-chain y en tiempo real."
        },
        anchor: {
          title: "Anchors",
          desc: "Conectate a los anchors de Stellar para rampas de entrada y salida de fiat en monedas locales."
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
      lede: "Diseñada para gestionar las mayores cargas de trabajo del mundo y para integrarse en cualquier stack que ya uses.",
      scale: ["solicitudes de API / día", "solicitudes / s", "finalidad on-chain", "disponibilidad"],
      paths: [
        {
          t: "Sin código",
          d: "Creá enlaces de pago y facturación directamente desde tu panel, sin necesidad de ingeniería.",
          a: "Explorar sin código"
        },
        {
          t: "UI prediseñada",
          d: "Integrá Checkout o Elements y aceptá pagos en Stellar, Solana y Monad en minutos, con componentes que se adaptan a tu marca.",
          a: "Ver componentes"
        },
        {
          t: "Creá la tuya",
          d: "Usá nuestras APIs REST + GraphQL, los SDK tipados y la CLI para crear una integración multichain totalmente a medida.",
          a: "Leer la documentación"
        }
      ],
      mockLink: "Enlace de pago · 19.99 USDC",
      mockPay: "Pagar"
    },
    solutions: {
      kicker: "// soluciones",
      title: "Diseñado para cada modelo de negocio.",
      lede: "Desde tu primera transacción hasta miles de millones en volumen: Cosmos Pay se adapta a cómo tu negocio mueve dinero en Stellar, Solana y Monad.",
      eyebrow: "Solución",
      startBuilding: "Empezar a construir",
      items: {
        pay: {
          t: "Aceptá pagos multichain",
          d: "Enviá y recibí pagos en Stellar, Solana y Monad con finalidad en segundos y comisiones de fracciones de centavo.",
          long: "Aceptá pagos de cualquier persona con una billetera de Stellar, Solana o Monad. Los fondos alcanzan la finalidad en segundos y se liquidan directamente en tu cuenta: sin contracargos, sin intermediarios y sin retenciones de varios días.",
          points: ["Finalidad de liquidación en segundos", "Comisiones de fracciones de centavo", "Enviá y recibí en Stellar, Solana y Monad", "Webhooks en tiempo real en cada pago"]
        },
        coin: {
          t: "Liquidación en stablecoins",
          d: "Liquidá en USDC y otros activos en Stellar, Solana y Monad, on-chain y en tiempo real.",
          long: "Mantené y liquidá saldos en USDC y otras stablecoins reguladas en Stellar, Solana y Monad. Cada transacción se registra on-chain y se concilia automáticamente en tu libro mayor en tiempo real.",
          points: ["Stablecoins reguladas respaldadas 1:1", "Liquidación on-chain y auditable", "Libro mayor multiactivo en tiempo real", "Conciliación automática"]
        },
        globe: {
          t: "Dinero transfronterizo",
          d: "Llegá a más de 130 países a través de redes abiertas y globales, sin bancos corresponsales.",
          long: "Mové dinero entre fronteras igual que lo movés localmente. Stellar, Solana y Monad llegan a más de 130 países sin bancos corresponsales, así que los pagos salientes llegan en segundos en lugar de días.",
          points: ["Más de 130 países, una sola API", "Sin retrasos de banca corresponsal", "FX transparente y por adelantado", "Liquidá en segundos"]
        },
        ramp: {
          t: "Rampas de entrada y salida",
          d: "Conectate a los anchors de Stellar para depósitos y retiros en moneda local.",
          long: "Permití a los usuarios moverse entre la moneda local y los activos digitales a través de anchors regulados de Stellar. Depósitos y retiros en docenas de monedas locales, gestionados íntegramente por los estándares SEP.",
          points: ["Red de anchors regulada", "Docenas de monedas locales", "Flujos estándar SEP-6 / SEP-24", "KYC gestionado por el anchor"]
        },
        wallet: {
          t: "Billeteras integradas",
          d: "Creá billeteras custodias o no custodias en Stellar, Solana y Monad para tus usuarios.",
          long: "Ofrecé a cada usuario una billetera multichain (Stellar, Solana y Monad) dentro de tu producto. Elegí billeteras custodias que gestionás vos, o billeteras no custodias que controlan tus usuarios: unas y otras se provisionan con una sola llamada a la API.",
          points: ["Custodia o no custodia", "Provisión con una sola llamada", "Gestión de claves integrada", "Saldos multiactivo"]
        }
      },
      payMock: {
        received: "Pago recibido",
        via: "vía Stellar · 4.2s",
        fee: "comisión $0.00001"
      }
    },
    stats: {
      title: "Simple. Seguro. Sin límites.",
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
          label: "más rápida la liquidación transfronteriza tras pasarse a Cosmos Pay.",
          tags: ["Pagos", "Stablecoins", "Billeteras"],
          story: "Northwind trasladó su checkout global a Cosmos Pay sobre Stellar, Solana y Monad, reduciendo la liquidación de días a segundos y recortando los costos de FX en más de 30 mercados, todo manteniendo un único libro mayor conciliado."
        },
        Lumio: {
          metric: "6 sem.",
          label: "para lanzar suscripciones en USDC en 40 países.",
          tags: ["Facturación", "USDC", "Anchors"],
          story: "Lumio sustituyó un mosaico de procesadores regionales por Cosmos Pay, lanzando suscripciones denominadas en USDC en 40 países en tan solo seis semanas usando anchors para rampas locales de entrada y salida."
        },
        Helios: {
          label: "liquidados a vendedores de todo el mundo a través de Stellar, Solana y Monad.",
          tags: ["Pagos salientes", "Connect", "Rampas"],
          story: "Helios paga a una base global de vendedores enteramente on-chain. El año pasado liquidó 2.400 millones de dólares a vendedores en 58 países, con fondos llegando en segundos y total transparencia on-chain."
        }
      }
    },
    testimonials: {
      kicker: "// testimonios",
      title: "Adorado por desarrolladores y equipos financieros.",
      items: {
        MC: {
          q: "Cosmos Pay nos permitió mover dinero entre fronteras en segundos. Sustituimos tres proveedores por una sola API multichain.",
          r: "VP de Ingeniería, Vertexa"
        },
        DO: {
          q: "La documentación es la mejor que he usado. Liquidamos nuestro primer pago en USDC antes del almuerzo el primer día.",
          r: "Fundador, Quanta"
        },
        PN: {
          q: "La conciliación solía tardar una semana. La liquidación on-chain ahora lo hace por nosotros en tiempo real.",
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
          d: "Cómo los equipos mueven dinero en Stellar, Solana y Monad a escala global."
        },
        {
          tag: "Changelog",
          t: "Los webhooks de liquidación multichain están en disponibilidad general",
          d: "Recibí eventos en tiempo real en el momento en que un pago alcanza la finalidad."
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
    marketplace: {
      title: "¿Y si además querés vender?",
      lede: "Cosmos es el marketplace del mismo ecosistema. Ahí los comercios publican lo que venden y cobran con la infraestructura que estás integrando acá. Mismo universo, el otro lado del mostrador.",
      btn: "Conocer Cosmos",
    },
    cta: {
      label: "Una nueva forma de mover tu mundo digital.",
      thanks: "Gracias por confiar.",
      title: "Empezá a construir hoy.",
      desc: "Creá un sandbox de testnet gratuito y entrá en producción en Stellar, Solana y Monad cuando estés listo.",
      getKeys: "Obtener claves de API",
      talk: "Hablá con ingeniería",
      helpers: [
        {
          b: "Mirá lo que vas a pagar",
          s: "Precios transparentes basados en el uso, sin sorpresas."
        },
        {
          b: "Empezar a construir",
          s: "Conseguí tus claves de API y hacé tu primer pago hoy."
        }
      ]
    }
  },
  pricing: {
    kicker: "// precios",
    title: "Paga por lo que procesas.",
    lede: "Pagos, swaps y pagos privados como servicio, con precio por operación. Empieza sin cuota mensual: solo pagas una pequeña comisión por cada operación exitosa.",
    monthly: "Mensual",
    annual: "Anual",
    save: "−17%",
    popular: "Más popular",
    from: "desde",
    perMo: "/mes",
    billedYearly: "facturado anualmente",
    plans: [
      {
        name: "Starter",
        desc: "Acepta pagos reales sin cuota mensual y con protección de pagos integrada.",
        amt: "1.5%",
        txt: "+ 18¢ por transacción *",
        cta: "Empezar",
        feats: ["Pagos reales", "Claves de API de prueba", "Protección de pagos", "Acceso parcial a la API", "Soporte estándar", "Resolución de disputas", "Tarjetas y transferencias bancarias"]
      },
      {
        name: "Essentials",
        desc: "Acceso completo a la plataforma con disputas y todos los métodos de pago.",
        txt: "+ 1.12% + 18¢ por transacción *",
        cta: "Elegir Essentials",
        feats: ["Todo lo de Starter", "Acceso total a la API", "Protección de pagos", "Resolución de disputas", "Tarjetas y transferencias bancarias", "Soporte prioritario por email", "Descuentos por volumen"]
      },
      {
        name: "Growth",
        desc: "Tarifas más bajas y más potencia para equipos en crecimiento.",
        txt: "+ 0.75% + 18¢ por transacción *",
        cta: "Elegir Growth",
        feats: ["Todo lo de Essentials", "Tarifa de 0.75% + 18¢ por transacción", "Miembros del equipo ilimitados", "Herramientas antifraude avanzadas", "Descuentos por volumen", "Soporte prioritario", "Enrutamiento inteligente de pagos"]
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
    footnote: "* Cada transacción incluye también una pequeña comisión de red. Starter cubre nuestras funciones de pago principales; Essentials y Growth desbloquean el acceso total a la API, la resolución de disputas y todos los métodos de pago, incluidas tarjetas y transferencias bancarias.",
    compareTitle: "Comparar planes",
    orgsRow: "Organizaciones",
    seatsRow: "Miembros por organización",
    keysRow: "Claves de API",
    ratesRows: { swaps: "Comisión por swap", escrow: "Escrow, por pago", privatePayments: "Pagos privados", ownFee: "Tu propia comisión en cada operación" },
    compareHead: ["Característica", "Starter", "Essentials", "Growth", "Enterprise"],
    compare: [
      {
        l: "Cuota mensual",
        v: ["Sin cuota", "$33 / mo", "$99 / mo", "Personalizado"]
      },
      {
        l: "Comisión por transacción",
        v: ["1.5% + 18¢", "1.12% + 18¢", "0.75% + 18¢", "Personalizado"]
      },
      {
        l: "Velocidad de liquidación",
        v: ["~5 sec", "~5 sec", "~5 sec", "~5 sec"]
      },
      {
        l: "Acceso a la API",
        v: ["Parcial", "Completo", "Completo", "Completo"]
      },
      {
        l: "Pagos reales",
        v: [1, 1, 1, 1]
      },
      {
        l: "Protección de pagos",
        v: [1, 1, 1, 1]
      },
      {
        l: "Resolución de disputas",
        v: [0, 1, 1, 1]
      },
      {
        l: "Tarjetas y transferencias bancarias",
        v: [0, 1, 1, 1]
      },
      {
        l: "Herramientas antifraude avanzadas",
        v: [0, 0, 1, 1]
      },
      {
        l: "Descuentos por volumen",
        v: [0, 0, 1, 1]
      },
      {
        l: "SSO / SAML",
        v: [0, 0, 0, 1]
      },
      {
        l: "Soporte",
        v: ["Estándar", "Prioritario por email", "Prioritario", "24/7 dedicado"]
      }
    ],
    faqTitle: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Tengo que pagar una cuota mensual?",
        a: "No. Starter no tiene cuota mensual: solo pagas una pequeña comisión por transacción exitosa. Essentials y Growth suman una cuota mensual a cambio de tarifas más bajas."
      },
      {
        q: "¿Cuánto cuesta una transacción?",
        a: "Starter cuesta 1.5% + 18¢ por transacción exitosa. Essentials cuesta $33/mes (o $27.50/mes facturado anualmente) y reduce la tarifa a 1.12% + 18¢, mientras que Growth cuesta $99/mes y la baja hasta 0.75% + 18¢. Cada transacción también conlleva una pequeña comisión de red."
      },
      {
        q: "¿Qué métodos de pago admitís?",
        a: "Starter cubre nuestros métodos de pago principales. A partir de Essentials también puedes aceptar tarjetas, transferencias bancarias y otros métodos de pago locales a través de una única integración."
      },
      {
        q: "¿Con qué rapidez se liquida el dinero?",
        a: "Las transacciones alcanzan la finalidad en aproximadamente cinco segundos, en todos los planes, sin retrasos de varios días en los pagos salientes."
      },
      {
        q: "¿Puedo cambiar de plan más adelante?",
        a: "Por supuesto. Mejora o reduce tu plan en cualquier momento desde tu panel. Los cambios surten efecto de inmediato, sin necesidad de llamadas."
      },
      {
        q: "¿Cuánto cuesta un swap?",
        a: "Cada plan tiene su propia comisión por swap: {starter} en Starter, {essentials} en Essentials, {growth} en Growth y {enterprise} en Enterprise. Sin cuenta, la página pública de swaps y su API cobran {public}. Las tarifas de las redes van aparte, y cada cotización muestra las comisiones antes de que firmes."
      },
      {
        q: "¿Puedo ofrecer estos servicios a mis clientes?",
        a: "Sí. Cosmos Pay es pagos, swaps, pasarela de pagos y pagos privados como servicio: nosotros operamos todo el servicio, y tú solo indicas las direcciones de wallet que reciben el dinero y firmas con tu wallet. Cada operación paga la tarifa de tu plan, y puedes sumarle tu propia comisión, que se paga a la wallet que elijas."
      }
    ],
    ctaTitle: "¿Todavía tienes preguntas?",
    ctaDesc: "Habla con nuestro equipo sobre precios por volumen, cumplimiento o migración desde otro proveedor.",
    contactSales: "Contactar con ventas",
    openDashboard: "Abrir panel"
  },
  swapsPage: {
    metaTitle: "Swaps | Cosmos Pay",
    metaDescription: "Cambia tokens entre más de 35 redes y envía USDT0 desde Stellar a 21 redes, sin crear una cuenta: tu wallet firma y nadie custodia tus fondos. Con API pública de swaps.",
    title: "Cambia entre redes, sin crear cuenta",
    lede: "Elige con qué pagas y qué recibes. Tu wallet firma y los fondos nunca pasan por Cosmos Pay.",
    facts: [
      { t: "Sin cuenta", s: "Abres la página y haces el swap. La API pública funciona igual." },
      { t: "Más de 35 redes", s: "Los mercados de Stellar, Solana y Monad, y todas las redes que alcanza NEAR Intents." },
      { t: "Sin custodia", s: "Cada swap es una transacción que firma tu wallet o una dirección de depósito que pagas." },
    ],
    fee: "Comisión: {pct} por swap sin cuenta, de {max} a {min} con un plan, más las tarifas de las redes.",
    usdt0Title: "USDT0: USDT nativo desde Stellar",
    usdt0Lede: "USDT0 en Stellar es el USDT omnichain de Tether. Envíalo 1:1 por LayerZero: llega como USDT nativo en Ethereum y como USDT0 en {n} redes más. La tarifa de LayerZero se paga en XLM, y la cotización muestra todas las comisiones antes de que firmes.",
    usdt0Cta: "Enviar USDT0",
    usdt0Networks: "Adónde llega",
    apiTitle: "Los mismos swaps desde tu código",
    apiLede: "La API pública de swaps tampoco necesita cuenta: toma la clave pública compartida y llama a los mismos endpoints que usa esta página. Cobra la misma comisión de {pct} por swap.",
    apiStep1: "Obtén la clave pública",
    apiStep2: "Cotiza un swap entre redes",
    apiStep3: "Cotiza USDT0 saliendo de Stellar",
    apiDocs: "Referencia de la API",
    faqTitle: "Preguntas",
    faq: [
      { q: "¿Necesito una cuenta?", a: "No. La página y la API pública usan una clave pública compartida. Con una cuenta tienes el historial en el dashboard y, con un plan, una comisión menor: de {max} a {min}." },
      { q: "¿Quién custodia mis fondos?", a: "Nadie. Un swap en una red es una transacción que firma tu wallet, un swap entre redes es una dirección de depósito que liquida NEAR Intents, y USDT0 viaja por LayerZero." },
      { q: "¿Cuánto cuesta?", a: "{pct} por swap sin cuenta, de {max} a {min} con un plan, más las tarifas de las redes. Enviar USDT0 desde Stellar también paga la tarifa de LayerZero, en XLM. Cada cotización muestra las comisiones antes de que firmes." },
      { q: "¿Por qué USDT0 deja un resto mínimo?", a: "USDT0 cruza con seis decimales y Stellar tiene siete: el séptimo queda en tu cuenta." },
      { q: "¿Puedo ofrecer swaps a mis clientes?", a: "Sí, como servicio: nosotros operamos los swaps, y tú solo indicas las direcciones de wallet que reciben el dinero y firmas con tu wallet. Cada swap paga la comisión de tu plan, y puedes sumarle tu propia comisión, que se paga a la wallet que elijas." },
    ],
  },
  dash: {
    wallets: {
      title: "Wallets",
      connect: "Agregar wallet",
      connectTitle: "Agregar una wallet",
      connectAnother: "Agregar otra wallet",
      network: "Red",
      wallet: "Wallet",
      installed: "Instalada",
      notInstalled: "No instalada",
      browserWallet: "Wallet del navegador",
      label: "Nombre",
      labelPlaceholder: "Tesorería",
      signing: "Aprueba la solicitud en tu wallet…",
      connectSign: "Conectar y firmar",
      address: "Dirección de Stellar",
      addressPlaceholder: "G…",
      invalidAddress: "No es una dirección de Stellar válida.",
      proofTitle: "Prueba que la wallet es tuya",
      proofDesc: "Firma esta transacción con esa wallet. Nunca puede enviarse a la red: solo prueba que la dirección es tuya. Con Freighter es un clic; en cualquier otra wallet, firma el XDR de abajo y pégalo de vuelta.",
      add: "Agregar wallet",
      connected: "Wallet agregada",
      missing: "{wallet} no está instalada en este navegador.",
      declined: "La wallet rechazó la solicitud.",
      connectError: "No se pudo conectar la wallet.",
      empty: "Todavía no hay wallets conectadas.",
      emptyAsk: "Todavía no hay wallets conectadas. Alguien con permiso puede conectar una.",
      loadError: "No se pudieron cargar las wallets de la organización.",
      rename: "Renombrar",
      renameTitle: "Renombrar wallet",
      save: "Guardar",
      renamed: "Wallet renombrada",
      remove: "Quitar",
      removeTitle: "¿Quitar esta wallet?",
      removeBody: "{name} ya no se ofrecerá para recibir pagos. Los pagos ya creados conservan su dirección.",
      removeConfirm: "Quitar wallet",
      removed: "Wallet quitada",
      actionError: "No se pudo guardar el cambio.",
      noneForChain: "La organización todavía no tiene una wallet de {network}.",
      askAdmin: "Alguien con permiso puede conectar una en Ajustes.",
      steps: { address: "Dirección", sign: "Firma" },
      tableHead: { wallet: "Wallet", network: "Red", address: "Dirección", added: "Agregada" },
      searchPlaceholder: "Buscar por nombre, dirección o red…",
      detail: "Wallet de la organización",
      provenWith: "Probada con",
      signedXdr: "XDR firmado",
    },
    examples: { order: "Pedido #24", firstName: "Ana", lastName: "Pérez", fullName: "Ana Pérez", jobTitle: "Directora", customerName: "Facturación Acme", payoutsName: "Pagos de Acme (USD)", productName: "Plan Pro (mensual)" },
    search: { label: "Buscar en el dashboard", placeholder: "Buscar", pages: "Páginas", searchGroup: "Buscar", searchIn: "{place} con “{q}”", empty: "Nada coincide con “{q}”." },
    viewLabels: {
      overview: "Resumen", payment: "Pago",
      payments: "Pagos", zkPayments: "Pagos privados",
      balances: "Saldos",
      customers: "Clientes",
      products: "Productos y enlaces",
      swaps: "Swaps", crossChainSwaps: "Swaps entre redes",
      liquidity: "Pools de liquidez",
      blindpay: "Fiat",
      developers: "Claves de API",
      webhook: "Webhooks",
      logs: "Registros de API",
      weblogs: "Registros de webhooks",
      activityLog: "Actividad de clientes",
      settings: "Organización",
      account: "Cuenta",
      activity: "Notificaciones",
      support: "Soporte",
      inbox: "Bandeja de soporte",
      users: "Usuarios",
      adminOverview: "Resumen de la plataforma",
      adminPayments: "Pagos (todas las orgs)",
      adminSwaps: "Swaps (todas las orgs)",
      adminFiat: "Fiat (todas las orgs)",
      adminCustomers: "Clientes (todas las orgs)",
      adminProducts: "Productos (todas las orgs)",
      adminConsumers: "Organizaciones"
    },
    sidebar: {
      label: "Panel",
      menu: { main: "Menú principal", preferences: "Preferencias" },
      groups: { payments: "Pagos", swaps: "Swaps", developers: "Desarrolladores", settings: "Ajustes", help: "Ayuda", admin: "Admin" },
      notifications: "Notificaciones",
      sections: {
        Platform: "Plataforma",
        Build: "Construir",
        Account: "Cuenta",
        Support: "Soporte",
        Admin: "Admin"
      },
      items: {
        overview: "Resumen",
        payments: "Pagos", zkPayments: "Pagos privados",
        balances: "Saldos",
        customers: "Clientes",
        products: "Productos",
        swaps: "Swaps", crossChainSwaps: "Entre redes",
        liquidity: "Liquidez",
        blindpay: "Fiat",
        developers: "Claves de API",
        webhook: "Webhooks",
        logs: "Registros",
        weblogs: "Logs webhook",
        activityLog: "Registro de actividad",
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
      locked: "Bloqueada: mejora tu plan para usarla",
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
    common: { back: "Volver", notPayable: "Ya no se puede pagar", sellNeeds: "Necesita un precio y estar a la venta", rowActions: "Acciones de {name}", copyId: "Copiar ID", copyUrl: "Copiar URL", copyAccount: "Copiar cuenta", openNewTab: "Abrir en otra pestaña", noTxYet: "Todavía sin transacción", paidNoDelete: "Un pago completado no se puede eliminar", account: "Cuenta", orgWallet: "Billetera de la organización", paymentsHere: "Pagos en la lista", lastPayment: "Último pago", copyValue: "Copiar {value}", notFound: "No está en esta organización o entorno.", open: "Abrir",
      actions: "Acciones",
      details: "Detalles",
      cancel: "Cancelar",
      copy: "Copiar",
      copyLink: "Copiar enlace",
      export: "Exportar",
      vsLastWeek: "vs la semana pasada",
      optional: "(opcional)",
      viewPlans: "Ver planes",
      yes: "Sí",
      no: "No",
      assetCustom: "Personalizado…",
      assetAny: "Cualquiera",
      continueOp: "Continuar",
      steps: { label: "Pasos", of: "Paso {n} de {total}", next: "Siguiente", back: "Atrás" },
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
        atLimitOne: "Tu plan {plan} permite una organización. Mejora tu plan para crear más.", atLimit: "Tu plan {plan} permite hasta {limit} organizaciones. Mejora tu plan para crear más.",
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
        scopeResources: { payments: "Pagos", swaps: "Swaps", liquidity: "Liquidez", webhooks: "Webhooks", products: "Productos", customers: "Clientes", kyc: "KYC", onramp: "On-ramp", offramp: "Off-ramp", activity: "Actividad" },
        adminHint: "Las claves de admin tienen acceso total a todos los recursos.",
        perms: {
          read: "Lectura",
          write: "Escritura"
        },
        create: "Crear clave",
        save: "Guardar cambios",
        steps: { details: "Datos", scopes: "Permisos" },
      },
      reveal: {
        eyebrow: "Clave API creada",
        title: "Guarda tu clave secreta",
        body: "Esta es la única vez que verás este secreto. Cópialo ahora y guárdalo en un lugar seguro. Por seguridad, no podrás volver a verlo.",
        idLabel: "ID de la clave",
        saved: "He guardado mi clave"
      }
    },
    overview: {
      hub: { planStatus: { active: "Activa", paused: "Pausada", past_due: "Pago pendiente", suspended: "Suspendida" }, legendDeliveriesFailed: "Fallidas", expiredOne: "1 vencido", expiredN: "{n} vencidos", legendExpired: "Vencidos", quick: "Accesos rápidos", usdUnpricedOne: "No se cuenta 1 pago en un activo sin precio en USD", usdUnpricedN: "No se cuentan {n} pagos en activos sin precio en USD", webhooksFailedOne: "1 fallida", paymentsFailedOne: "1 fallido", paymentsFailedN: "{n} fallidos", doneOne: "1 completado", payersOne: "1 pagador", sumSwaps: "Swaps", sumLiquidity: "Liquidez", payersN: "{n} pagadores", doneN: "{n} completados", newSwap: "Swap", crumb: "Resumen", active: "Activa", since: "Desde {date}", settled: "Volumen liquidado", noVolume: "Aún no hay pagos liquidados", rate: "Tarifa", plan: "Plan", orgId: "ID de la organización", createLink: "Crear enlace de pago", docs: "Documentación", designs: "Diseños de checkout", kpiTotal: "Pagos totales", kpiSucceeded: "Completados", kpiFailed: "Fallidos", kpiRate: "Tasa de éxito", activity: "Actividad", period7: "7 días", period30: "30 días", periods: { today: "Hoy", week: "Semana", month: "Mes", year: "Año" }, noPeriodTx: "No hay pagos liquidados en este período.", sumVolume: "Volumen liquidado", sumCount: "Pagos", sumPayers: "Pagadores", sumWebhooks: "Entregas de webhooks", sumWebhooksFailed: "{n} fallidas", growthVs: "{pct} frente a los {n} días anteriores", legendVolume: "Volumen (USD)", legendCount: "Pagos", legendDone: "Completados", goTo: "Ir a {view}", periodLabel: "Período", chartLabel: "Pagos creados y volumen liquidado por día en los últimos {n} días.", transactions: "Últimos pagos liquidados", viewAll: "Ver todos los pagos", thId: "Pago", thDate: "Fecha", thAmount: "Importe", thNetwork: "Red", thTo: "Pagado a", thStatus: "Estado", chartPeriods: { day: "Diario", week: "Semanal", month: "Mensual", year: "Anual" }, chartLabels: { day: "Pagos creados y volumen liquidado por día en los últimos 30 días.", week: "Pagos creados y volumen liquidado por semana en las últimas 12 semanas.", month: "Pagos creados y volumen liquidado por mes en los últimos 12 meses.", year: "Pagos creados y volumen liquidado por año en los últimos 5 años." }, sumFailed: "Fallidos", sumGrowth: "Crecimiento", growthTitle: "Frente al período anterior", growthVolume: "Volumen", growthCount: "Pagos", prevOrg: "Organización anterior", nextOrg: "Organización siguiente", created: "Creada el {date}", fee: "Comisión", txTitle: "Transacciones", thFrom: "Pagado por", thMemo: "Memo", onlySettled: "Solo liquidados", network: "Red", allNetworks: "Todas las redes", wallet: "Wallet", applyFilters: "Filtrar la lista", filtersLabel: "Filtrar transacciones", noTx: "No hay pagos en este período.", noMatch: "Ningún pago coincide con estos filtros.", shown: "{n} de {total} pagos", rowMenu: "Acciones del pago {id}", copyId: "Copiar ID", explorer: "Ver en el explorador", openPayments: "Abrir en Pagos", status: { SUCCEEDED: "Liquidado", FAILED: "Fallido", CANCELLED: "Cancelado", EXPIRED: "Vencido", PENDING: "Pendiente", SUBMITTED: "Confirmando" }, searchPlaceholder: "Buscar por ID, dirección, monto o activo…", groups: { settled: "Liquidados", open: "En curso", failed: "Fallidos" } },
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
      sub: "{n} pagos · liquidados al instante on-chain",
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
        desc: "Los pagos se liquidan al instante en Stellar, Solana o Monad, sin periodo de retención.",
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
      eventLabels: { PAYMENT_INTENT_CREATED: "Pago creado", PAYMENT_INTENT_UPDATED: "Pago actualizado", PAYMENT_INTENT_SUCCEEDED: "Pago completado", PAYMENT_INTENT_FAILED: "Pago fallido", PAYMENT_INTENT_CANCELLED: "Pago cancelado", PAYMENT_INTENT_DELETED: "Pago eliminado", ZK_PAYMENT_SUCCEEDED: "Pago privado completado" },
      active: "Activo", inactive: "Desactivado",
      reveal: "Mostrar secreto", secret: "Secreto de firma", secretNote: "Se muestra una sola vez. Guárdalo de forma segura.",
      rotate: "Rotar secreto", ping: "Enviar prueba", pingOk: "Evento de prueba entregado", pingFail: "Falló el evento de prueba",
      deliveries: "Entregas recientes", noDeliveries: "Aún no hay entregas.", redeliver: "Reenviar",
      enable: "Activar", disable: "Desactivar",
      delete: "Eliminar", deleteConfirm: "Eliminar", confirmDelete: "Esto no se puede deshacer.",
      customerSet: "Importe libre", allEvents: "Todos los eventos", events: "Eventos",
      received: "Recibido", pending: "Pendiente",
      custDetail: { noAccount: "Añade la dirección de la wallet del cliente para ver los pagos que hizo.", title: "Cliente", edit: "Editar", save: "Guardar cambios", alias: "Alias", note: "Nota", account: "Dirección de wallet", accountPlaceholder: "Dirección en Stellar, Solana o Monad", payments: "Pagos", onChain: "On-chain", noPayments: "Aún no hay pagos.", wallets: "Wallets", addWallet: "Agregar wallet", network: "Red", walletLabel: "Nombre", walletLabelPlaceholder: "Phantom, tesorería…", removeWallet: "Quitar wallet", invalidAddress: "No es una dirección de {network}." },
    },
    filters: { label: "Filtrar la lista", status: "Estado", network: "Red", kind: "Tipo", allStatuses: "Todos", allNetworks: "Todas las redes", allKinds: "Todos los tipos", date: "Fecha", dates: { any: "Cualquier fecha", today: "Hoy", "7d": "Últimos 7 días", "30d": "Últimos 30 días", "90d": "Últimos 90 días" }, shown: "{n} de {total}", clear: "Quitar filtros", noMatch: "Nada coincide con estos filtros." },
    tokens: { custom: "Otro token…", ticker: "Símbolo del token", address: { solana: "Mint del token", monad: "Contrato del token" } },
    paylinks: {
      design: { label: "Diseño de checkout", hint: "Cómo se ve el checkout alojado de este enlace. Puedes cambiarlo cuando quieras.", preview: "Vista previa", saved: "Diseño de checkout actualizado", saveError: "No se pudo cambiar el diseño de checkout", selected: "Seleccionado" },
      title: "Enlaces de pago",
      sub: "{n} enlaces · Stellar, Solana y Monad",
      create: "Crear enlace de pago",
      searchPlaceholder: "Buscar por ID, dirección, memo o monto…",
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
        desc: "Un enlace y un QR que tu cliente paga desde su billetera, en Stellar, Solana o Monad.",
        kind: "Tipo", kindPay: "Enlace de pago", kindTx: "Transacción",
        destination: "Destino", destinationHint: "Cuenta Stellar que recibe los fondos (G…).",
        source: "Origen", sourceHint: "Cuenta Stellar del pagador (G…).",
        amount: "Importe", amountHint: "Déjalo vacío para que el pagador elija (donaciones).",
        asset: "Activo", assetIssuer: "Emisor del activo", assetIssuerHint: "Obligatorio para activos no nativos (G…).",
        memo: "Memo", memoHint: "MEMO_ID numérico. Se genera automáticamente si se deja vacío.",
        message: "Mensaje", messageHint: "Se muestra al pagador en su billetera (≤ 300 caracteres).",
        chain: "Red", amountMonad: "Obligatorio en Monad: el monto exacto es lo que identifica el pago.", memoHintOther: "Un número que evita que un reintento cree un segundo enlace; se genera si lo dejas vacío.", submitting: "Creando…",
        mainnet: "Mainnet", more: "Más opciones",
        merchantFee: { title: "Comisión del comercio", pct: "Porcentaje", fixed: "Monto fijo", wallet: "Wallet que recibe la comisión", paidBy: "Quién la paga", recipient: "Se descuenta del monto", payer: "La paga el pagador, encima del monto", hint: "Tu propia comisión, en el mismo pago y aparte de la de Cosmos Pay; necesita un monto. En Stellar el checkout le pide al pagador su cuenta, en Solana el pago es una transacción de Solana Pay y en Monad la reparte la dirección de depósito.", needsAmount: "La comisión del comercio necesita un monto.", sameWallet: "La comisión va a otra wallet que el pago.", pctMax: "Hasta 10 %." },
        submit: "Crear enlace",
        steps: { amount: "Monto", destination: "Destino", fee: "Comisión", design: "Diseño" },
      },
      detail: { live: { title: "Seguimiento", created: "Link creado", page: "Pagador en la página de pago", processing: "Pago enviado, confirmando", paid: "Pagado", now: "Ahora", onPageNow: "El pagador está en la página de pago ahora", lastSeen: "El pagador abrió la página de pago por última vez el {time}", waiting: "Esperando que el pagador abra el link", processingNow: "El pago se envió y la red lo está confirmando", paidNow: "Pago recibido", ended: "Este link ya no se puede pagar: {status}" }, check: { label: "¿Se pagó desde otra wallet? Verifica su transacción", placeholder: "Hash de la transacción", submit: "Verificar transacción", ok: "La transacción paga este enlace.", bad: "Esa transacción no paga este enlace." },
        checkout: "Página de pago", openCheckout: "Abrir página de pago",
        eyebrow: "Enlace de pago", title: "Enlace de pago listo",
        scan: "Escanea para pagar", downloadQr: "Descargar QR",
        uri: "URI SEP-7", xdr: "XDR sin firmar",
        uriLabels: { stellar: "URI SEP-7", solana: "URI de Solana Pay", monad: "URI EIP-681" },
        openWallet: "Abrir en la billetera", copyLink: "Copiar enlace", copyUri: "Copiar URI",
        fields: { id: "ID", status: "Estado", kind: "Tipo", network: "Red", destination: "Destino", source: "Origen", amount: "Importe", asset: "Activo", memo: "Memo", message: "Mensaje", txHash: "ID de transacción", created: "Creado", merchantFee: "Comisión del comercio" },
        delete: "Eliminar",
        deleteTitle: "Eliminar enlace de pago", deleteBody: "Se eliminará «{id}». Esto no se puede deshacer.", deleteConfirm: "Eliminar enlace",
      },
      status: { PENDING: "Pendiente", SUBMITTED: "Enviado", SUCCEEDED: "Completado", FAILED: "Fallido", CANCELLED: "Cancelado", EXPIRED: "Expirado" },
    },
    balances: {
      title: "Saldos",
      total: "Liquidaciones",
      across: "{assets} activos en {networks} redes",
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
      walletsCount: "{n} wallets",
      tableHead: {
        name: "Nombre",
        email: "Email",
        spend: "Gasto total",
        payments: "Pagos",
        since: "Desde",
        wallets: "Wallets"
      },
      empty: "No se han encontrado clientes.",
      modal: {
        eyebrow: "Cliente",
        title: "Añadir cliente",
        desc: "Crea un cliente para hacer seguimiento de pagos y saldos.",
        name: "Nombre",
        email: "Email",
        add: "Añadir cliente",
        wallets: "Wallets",
        walletsHint: "Las wallets desde las que paga este cliente, en cualquier red. También puedes agregarlas después.",
        addAnother: "Agregar otra wallet"
      },
      figures: { customers: "Clientes", withWallet: "Con wallet", payments: "Pagos", succeeded: "{n} completados", recent: "Nuevos (30 días)" },
      deleteTitle: "¿Eliminar el cliente?",
      deleteBody: "Se eliminan {name} y sus wallets. Sus pagos se conservan.",
      deleteError: "No se pudo eliminar el cliente.",
      removeWalletTitle: "¿Quitar la wallet?",
      removeWalletBody: "Se quita {account} de {name}. Sus pagos se conservan.",
    },
    products: { searchPlaceholder: "Buscar por nombre o precio…", detail: { title: "Producto", save: "Guardar cambios", active: "A la venta", activeHint: "Un producto inactivo se conserva, pero no se puede vender.", saveError: "No se pudo guardar el producto." },
      title: "Productos y enlaces",
      sub: "Planes recurrentes y enlaces de pago",
      add: "Nuevo producto",
      tableHead: {
        name: "Nombre",
        price: "Precio",
        type: "Tipo",
        status: "Estado",
        created: "Creado",
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
      },
      figures: { products: "Productos", priced: "Con precio" },
      edit: "Editar",
      activate: "Poner a la venta",
      deactivate: "Quitar de la venta",
      activated: "Producto a la venta",
      deactivated: "Producto quitado de la venta",
      deleteTitle: "¿Eliminar el producto?",
      deleteBody: "Se elimina {name}. Los enlaces de pago ya creados siguen funcionando.",
      deleteError: "No se pudo eliminar el producto.",
    },
    apikeys: { searchPlaceholder: "Buscar por nombre o ID de clave…", ownerPlan: "Lo define el plan del owner de la organización.", liveLocked: "Tu plan no incluye claves de producción.",
      readOnly: "Tienes acceso de solo lectura. Solo los owners y admins pueden crear o revocar claves de API.",
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
      none: "Ninguno",
      revokeTitle: "Revocar clave API",
      revokeBody: "«{name}» se revocará permanentemente y cualquier aplicación que la use dejará de funcionar. Esta acción no se puede deshacer.",
      revokeConfirm: "Revocar clave",
      usage: "{used} / {limit}",
      limitReached: "Alcanzaste el límite de claves de tu plan. Mejora tu plan para añadir más.",
      figures: { keys: "Claves en este entorno", plan: "Uso del plan" },
      allRoles: "Todos los roles",
    },
    webhooks: { searchPlaceholder: "Buscar por URL o evento…", resent: "Entrega reenviada", noFailed: "No hay entregas fallidas.", only: { all: "Todas", failed: "Fallidas" }, eventId: "ID del evento", error: "Error", attempts: "Intentos", delivery: "Entrega", save: "Guardar cambios", editTitle: "Editar endpoint", edit: "Editar endpoint", eventsOne: "1 evento",
      title: "Webhooks",
      sub: "Eventos en tiempo real cuando los pagos se liquidan en Stellar, Solana o Monad",
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
        when: "Cuándo",
        created: "Creado",
      },
      modal: {
        eyebrow: "Webhook",
        title: "Añadir endpoint",
        desc: "Enviaremos las cargas útiles de los eventos por POST a esta URL.",
        urlLabel: "URL del endpoint",
        eventsLabel: "Eventos a enviar",
        add: "Añadir endpoint"
      },
      deleteTitle: "¿Eliminar el endpoint?",
      deleteBody: "{url} deja de recibir eventos y se borran sus entregas.",
      rotateTitle: "¿Rotar el secreto de firma?",
      rotateBody: "{url} recibe un secreto nuevo en el acto; los eventos firmados con el anterior dejan de verificarse hasta que lo actualices.",
      urlInvalid: "Ingresa una dirección web que empiece con https://.",
      urlRefused: "Esa URL no se puede usar: tiene que ser una dirección pública que resuelva (no localhost ni una red privada).",
      saveError: "No se pudo guardar el endpoint.",
    },
    activityLog: {
      sub: "Lo que la wallet y este panel reportaron sobre sí mismos, incluido lo que nunca llegó a ser una llamada a la API",
      searchPlaceholder: "Buscar eventos…",
      empty: "Todavía no hay actividad reportada.",
      context: "Contexto",
      props: "Detalles",
      topErrors: "Errores más frecuentes",
      cards: { total: "Eventos", errors: "Errores", sessions: "Sesiones", devices: "Dispositivos" },
      sources: { all: "Todas las fuentes", wallet: "Wallet", dashboard: "Panel", server: "Servidor", sdk: "SDK" },
      levels: { all: "Todos los niveles", error: "Error", warn: "Aviso", info: "Info", debug: "Depuración" },
      tableHead: { level: "Nivel", source: "Fuente", event: "Evento", detail: "Detalle", timestamp: "Marca de tiempo", count: "Cantidad" },
      copySession: "Copiar sesión",
      filterBy: "Buscar este error en el registro",
      duration: "Duración",
      network: "Red",
      session: "Sesión",
      received: "Recibido",
      category: "Categoría",
      app: "Versión de la app",
      platform: "Plataforma",
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
        timestamp: "Marca de tiempo",
        event: "Evento",
      },
      reqHeaders: "Cabeceras de la solicitud",
      params: "Parámetros de query / body",
      response: "Respuesta",
      meta: "Meta",
      figures: { requests: "Solicitudes", errors: "Errores", latency: "Latencia media", deliveries: "Entregas", failed: "Fallidas", endpoints: "Endpoints" },
      classes: { ok: "Exitosas", client: "Errores del cliente (4xx)", server: "Errores del servidor (5xx)" },
      delivery: { SUCCEEDED: "Entregada", FAILED: "Fallida", PENDING: "Pendiente" },
      allMethods: "Todos los métodos",
      copyPath: "Copiar ruta",
      attempts: "Intentos",
      error: "Error",
      eventId: "ID del evento",
      userAgent: "Agente de usuario",
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
        changeSub: "Cambia tu plan. Es una simulación: no se cobra nada.",
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
        swapFee: "Comisión por swap",
        mainnet: "Pagos en vivo",
        settle: "Liquidación",
        apiAccess: "Acceso API",
        apiLevels: { notifications: "Notificaciones de pago", partial: "API parcial", full: "API completa" }
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
      },
      figures: { members: "Miembros", seats: "{n} de {max} asientos", seatsFree: "Asientos ilimitados", invites: "Invitaciones pendientes", invitesSub: "Valen 3 días", wallets: "Wallets", networksOne: "En 1 red", networksN: "En {n} redes", apiKeys: "Claves de API", keysLimit: "Límite: {max}", keysFree: "Sin límite" },
    },
    pagination: {
      rows: "Filas por página",
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
      localhost: "localhost",
      searchPlaceholder: "Buscar notificaciones…",
      nothingToOpen: "No hay nada que abrir",
      copyIp: "Copiar IP",
      figures: { total: "Notificaciones", week: "Últimos 7 días", signIns: "Inicios de sesión", changes: "Cambios" },
      message: "Mensaje",
    },
    support: {
      searchPlaceholder: "Buscar tickets…",
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
      statuses: { open: "Abierto", pending: "Pendiente", resolved: "Resuelto", closed: "Cerrado" },
      inboxSearch: "Buscar por asunto, cliente o mensaje…",
      tableHead: { subject: "Asunto", priority: "Prioridad", status: "Estado", last: "Último mensaje", updated: "Actualizado" },
      unread: "{n} sin leer",
      moveTo: "Marcar como {status}",
    },
    admin: { viewList: "Ver lista",
      loading: "Cargando…",
      loadError: "No se pudieron cargar los datos.",
      empty: "Nada por aquí todavía.",
      orgFilter: "Organización",
      clearFilter: "Quitar filtro",
      filters: { all: "Todos", PENDING: "Pendiente", SUBMITTED: "Enviado", SUCCEEDED: "Completado", FAILED: "Fallido" },
      overview: {
        title: "Resumen de la plataforma", sub: "Actividad global en todas las organizaciones",
        cards: { consumers: "Organizaciones", customers: "Clientes", products: "Productos", webhooks: "Endpoints de webhook" },
        payments: "Intentos de pago", swaps: "Swaps", chainSwaps: "Swaps en Solana y Monad", crossChainSwaps: "Swaps entre redes", fiat: "Fiat (KYC/KYB)",
        receivers: "Receptores", payins: "Payins", payouts: "Payouts",
        volume: "Volumen liquidado",
        volHead: { asset: "Activo", amount: "Cantidad", count: "Recuento" },
      },
      payments: { title: "Intentos de pago", sub: "Todos los intentos de pago de las organizaciones", searchPlaceholder: "Buscar por ID, destino, organización…", empty: "No hay intentos de pago.", tableHead: { id: "ID", org: "Organización", destination: "Destino", amount: "Cantidad", status: "Estado", created: "Creado" }, one: "Pago" },
      swaps: { venues: { stellar: "Stellar", solana: "Solana · Jupiter", monad: "Monad · Kuru Flow", crossChain: "Entre redes" }, crossStatus: { AWAITING_DEPOSIT: "Esperando depósito", PROCESSING: "Procesando", REFUNDED: "Reembolsado" }, title: "Swaps", sub: "Todos los swaps de las organizaciones", searchPlaceholder: "Buscar por ID, cuenta, organización…", empty: "No hay swaps.", tableHead: { id: "Swap", org: "Organización", route: "Enviado → recibido", status: "Estado", created: "Creado" }, one: "Swap", from: "Desde", to: "Hacia", deposit: "Dirección de depósito" },
      fiat: {
        title: "Fiat", sub: "Receptores, payins y payouts de las organizaciones",
        tabs: { receivers: "Receptores", payins: "Payins", payouts: "Payouts" },
        searchReceivers: "Buscar receptores…", searchPayins: "Buscar payins…", searchPayouts: "Buscar payouts…",
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
        receiverOne: "Receptor",
        payinOne: "Payin",
        payoutOne: "Payout",
        email: "Email",
        providerId: "ID del proveedor",
        inReview: "En revisión",
      },
      customers: { title: "Clientes", sub: "Todos los clientes de las organizaciones", searchPlaceholder: "Buscar clientes…", empty: "No hay clientes.", tableHead: { name: "Nombre", org: "Organización", email: "Email", account: "Cuenta", created: "Creado" }, one: "Cliente", figures: { withWallet: "Con wallet", withEmail: "Con email" } },
      products: { title: "Productos", sub: "Todos los productos de las organizaciones", searchPlaceholder: "Buscar productos…", empty: "No hay productos.", tableHead: { name: "Nombre", org: "Organización", price: "Precio", kind: "Tipo", created: "Creado" }, one: "Producto" },
      consumers: { title: "Organizaciones", sub: "Cada consumidor de API y su actividad", searchPlaceholder: "Buscar organizaciones…", empty: "No hay organizaciones.", account: "Cuenta", moreOrgs: "+{n} más", note: "Los totales son por cuenta de desarrollador (una cuenta puede tener varias organizaciones).", tableHead: { org: "Organización", payments: "Pagos", swaps: "Swaps", products: "Productos", customers: "Clientes", receivers: "Receptores", payins: "Payins", payouts: "Payouts", webhooks: "Webhooks", created: "Creado" }, copyConsumer: "Copiar usuario del gateway", one: "Organización", figures: { orgs: "Organizaciones", active: "Con actividad" }, gatewayUser: "Usuario del gateway" },
      filterByOrg: "Ver solo esta organización",
      copyEmail: "Copiar email",
      copyProviderId: "Copiar ID del proveedor",
      copyTx: "Copiar transacción",
      copyDestination: "Copiar destino",
      copyDeposit: "Copiar dirección de depósito",
      figures: { total: "Total", done: "Completados", open: "En curso", failed: "Fallidos", inOrgs: "En {n} organizaciones", inOrgsOne: "En 1 organización" },
      network: "Red",
      transaction: "Transacción",
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
        photoHint: "PNG, JPG o WebP. Cuadrada queda mejor.", saved: "Perfil actualizado", saveError: "No se pudo actualizar tu perfil.",
        photoTooLarge: "Esa imagen es muy grande. Elige una de menos de 8 MB.", photoInvalid: "Ese archivo no es una imagen compatible." },
      session: { title: "Sesión", desc: "Cierra sesión del panel de Cosmos Pay en este dispositivo.", signOut: "Cerrar sesión" },
    },
    users: {
      planStatus: "Estado del plan",
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
      empty: "No se encontraron usuarios.",
      figures: { accounts: "Cuentas", staff: "Equipo", paid: "Planes pagos", attention: "Planes por revisar" },
      allRoles: "Todos los roles",
      allPlans: "Todos los planes",
      copyEmail: "Copiar email",
      one: "Cuenta",
      since: "Cuenta desde",
      lastSeen: "Última actividad",
    },
    orgs: {
      permissionsLabel: "Permisos",
      permResource: "Permiso",
      resources: { apiKeysTest: "Claves de API de prueba", apiKeysLive: "Claves de API de producción", webhooks: "Webhooks", products: "Productos", customers: "Clientes", payments: "Links de pago", wallets: "Wallets" },
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
      loadError: "No se pudieron cargar los miembros.",
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
      empty: "Aún no hay miembros.",
      revokeInviteTitle: "¿Revocar la invitación?",
      revokeInviteBody: "{email} ya no podrá unirse a {org} con esta invitación.",
      steps: { who: "Email y rol", permissions: "Permisos" },
      searchPlaceholder: "Buscar por nombre o email…",
      tableHead: { person: "Persona", role: "Rol", permissions: "Permisos", status: "Estado", since: "Desde" },
      memberStatus: { active: "Activo", invited: "Invitado" },
      allRoles: "Todos los roles",
      permsAll: "Todos",
      permsNone: "Solo lectura",
      permsOne: "1 permiso",
      permsN: "{n} permisos",
      memberDetail: "Miembro",
      inviteDetail: "Invitación",
      sentOn: "Enviada",
      expiresOn: "Caduca",
      copyEmail: "Copiar email",
      ownerFixed: "Al propietario no se lo puede editar ni quitar",
      inviteFixed: "Una invitación se cambia revocándola e invitando de nuevo",
      alreadyMember: "Esa persona ya es miembro de esta organización.",
      alreadyInvited: "Ya hay una invitación pendiente para ese email.",
      inviteConflict: "No se puede invitar: ya está en el equipo o invitada, o no quedan asientos libres.",
      mailUnavailable: "El email no está configurado en este servidor, así que no se pueden enviar invitaciones.",
      seatsFull: "Todos los asientos del plan están ocupados (miembros e invitaciones pendientes). Libera uno o mejora el plan para invitar a alguien.",
    },
    swaps: {
      title: "Swaps",
      sub: "{n} swaps · en una red o entre Stellar, Solana y Monad",
      create: "Nuevo swap",
      readOnly: "Tienes acceso de solo lectura a los swaps en esta organización.",
      listTitle: "Tus swaps",
      widget: { title: "Swap", pay: "Pagas", receive: "Recibes", selectToken: "Elegir token", changeToken: "{token} en {chain}, cambiar el token", flip: "Intercambiar lo que pagas y lo que recibes", pickPay: "Pagar con", pickReceive: "Recibir", details: "Detalle de la cotización", invertRate: "Invertir la tasa", eta: "Tiempo estimado", seconds: "{n} s", slippage: "Tolerancia de slippage", slippageAuto: "Auto", slippageHint: "Por debajo del mínimo que fija, el swap no se hace (uno entre redes se reembolsa).", settings: "Ajustes del swap", route: "Ruta", venueNear: "NEAR Intents", venueUsdt0: "LayerZero (USDT0)", ctaBridge: "Enviar a {chain}", lzFee: "Tarifa de LayerZero", dustNote: "Queda en Stellar", accountLabel: "Tu cuenta de {chain}", accountHint: "Paga y firma el swap.", refundLabel: "Dirección de reembolso en {chain}", recipientLabel: "Recibir en {chain}", another: "Enviar a otra cuenta", ctaSelect: "Elige un token", ctaSame: "Elige dos tokens distintos", ctaProduction: "Disponible en Production", ctaUnsupported: "Estos tokens no pueden cambiarse entre sí", ctaAmount: "Ingresa un monto", ctaAmountBad: "Revisa el monto", ctaAccount: "Ingresa tu cuenta de {chain}", ctaRefund: "Ingresa la dirección de reembolso en {chain}", ctaRecipient: "Ingresa la dirección en {chain}", ctaMemo: "Revisa el memo", ctaQuoting: "Cotizando…", ctaRetry: "Volver a cotizar", ctaProductionOpen: "Abrir un swap requiere Production", ctaOpen: "Abrir swap", ctaSwap: "Swap en {venue}", ctaBusy: "Preparando…" },
      picker: { search: "Busca un token, red o dirección", network: "Red", allNetworks: "Todas las redes", count: "{n} tokens", useToken: "Usar {token}", none: "Ningún token coincide. Pega la dirección de un token de Stellar, Solana o Monad para usarlo.", more: "{n} más: busca para acotar la lista." },
      groups: { open: "En curso", succeeded: "Completados", refunded: "Reembolsados", failed: "Fallidos", expired: "Vencidos" },
      typeLabel: "Tipo",
      types: { all: "Todos los tipos", same: "En una red", cross: "Entre redes", usdt0: "Puente USDT0" },
      form: { desc: "Elige qué envías y qué recibes. En una red lo opera su mercado; entre redes lo liquida NEAR Intents. Nada pasa por Cosmos Pay.", from: "Envías", to: "Recibes", chain: "Red", asset: "Activo", amountHint: "Cuánto del activo envías.", flip: "Intercambiar lo que envías y lo que recibes", routeLine: "Ruta: {route}", route: "Ruta", venueCross: "NEAR Intents" },
      searchPlaceholder: "Buscar por ID, dirección o activo…",
      filters: { all: "Todos", PENDING: "Pendiente", SUBMITTED: "Enviado", SUCCEEDED: "Completado", FAILED: "Fallido", EXPIRED: "Vencido" },
      status: { PENDING: "Pendiente", SUBMITTED: "Enviado", SUCCEEDED: "Completado", FAILED: "Fallido", EXPIRED: "Vencido", DELIVERED: "Entregado" },
      tableHead: { id: "Swap", route: "Enviado → recibido", status: "Estado", created: "Creado", chains: "Redes" },
      empty: "Aún no hay swaps. Crea uno para obtener una transacción sin firmar.",
      loading: "Cargando swaps…",
      loadError: "No se pudieron cargar los swaps.",
      createError: "No se pudo crear el swap.",
      quoteError: "No se pudo cotizar el swap.",
      network: { dev: "Testnet", prod: "Red pública" },
      chainLabel: "Red",
      chains: { stellar: "Stellar", solana: "Solana", monad: "Monad" },
      venues: { stellar: "DEX de Stellar", solana: "Jupiter", monad: "Kuru Flow" },
      chainModal: {
        desc: "Cambia dos activos en {chain} a través de {venue}, que recorre todas las fuentes de liquidez de la red. Cotiza y luego firma la transacción en la billetera.",
        sourceHint: { solana: "Billetera de Solana que firma, paga y recibe (base58).", monad: "Billetera de Monad que firma, paga y recibe (0x…)." },
        sourceAsset: "Activo a enviar", sourceAssetHint: "{native}, o la dirección del mint / contrato del token.",
        destAssetHint: "{native}, o la dirección del mint / contrato del token.",
        feeNote: "La comisión es la tarifa del plan de tu organización y se toma de la salida.",
      },
      chainDetail: {
        title: "Swap listo para firmar",
        transaction: "Transacción a firmar", approval: "Aprobación a enviar antes",
        approvalNote: "El allowance de la billetera para este token no alcanza: envía y confirma esta llamada approve antes de firmar el swap.",
        provider: "Construido por", expires: "Firmar antes de",
        submitDesc: "Pega la transacción firmada que devolvió la billetera (Solana: base64; Monad: transacción cruda 0x).",
        submitPlaceholder: "Transacción firmada…",
      },
      modal: {
        eyebrow: "Swap", title: "Nuevo swap",
        desc: "Cambia un activo de Stellar por otro mediante un pago por ruta. Cotiza y luego firma la transacción.",
        source: "Cuenta de origen", sourceHint: "Cuenta de Stellar que envía el swap (G…).",
        sourceAsset: "Activo a enviar", sourceIssuer: "Emisor de origen", sourceAssetHint: "XLM, o un activo que tenga esta cuenta.",
        amount: "Cantidad a enviar", amountHint: "Cantidad del activo de origen a cambiar.",
        destAsset: "Activo de destino", destAssetHint: "Código del activo a recibir (p. ej. USDC).",
        destIssuer: "Emisor de destino", destIssuerHint: "Requerido para activos no nativos (G…).",
        slippage: "Slippage (bps)", slippageHint: "Slippage máx. en puntos básicos (opcional, p. ej. 50).",
        destination: "Cuenta de destino", destinationHint: "Opcional. Recibe el resultado; déjala vacía para recibir en la cuenta de origen. Debe confiar en el activo.", memo: "Memo", memoHint: "Opcional. Un número (MEMO_ID) que queda en la cadena para tu conciliación.",
        getQuote: "Cotizar", quoting: "Cotizando…",
        quoteTitle: "Cotización",
        swapped: "Se cambia tras la comisión",
        estimated: "Recibido estimado", minimum: "Recibido mínimo",
        fee: "Comisión", bps: "bps",
        feeNote: "La comisión es la tarifa del plan de tu organización y se aplica automáticamente.",
        create: "Crear swap", creating: "Creando…",
      },
      usdt0: {
        title: "USDT0 a {chain}",
        destination: "Red",
        recipient: "Destinatario",
        arrives: "Llega",
        fee: "Tarifa de LayerZero",
        destTx: "Transacción de destino",
        scan: "Ver en LayerZero Scan",
        travelling: "Enviado desde Stellar. LayerZero lo está entregando en {chain}.",
        delivered: "Entregado en {chain}.",
      },
      detail: {
        eyebrow: "Swap", title: "Swap listo",
        scan: "Escanea para firmar", downloadQr: "Descargar QR",
        trustlineNote: "Esta transacción también agrega la trustline de {asset} a la cuenta para que pueda recibirlo. Eso deja 0,5 XLM en reserva.",
        uri: "URI SEP-7", xdr: "XDR sin firmar",
        openWallet: "Abrir en wallet", viewExplorer: "Ver en el explorador",
        fields: { id: "ID", status: "Estado", network: "Red", source: "Origen", destination: "Destino", sent: "Enviado", received: "Recibido (est.)", minimum: "Mínimo", fee: "Comisión", memo: "Memo", commissionMemo: "Memo de comisión", txHash: "ID de transacción", created: "Creado" },
        submitTitle: "Enviar transacción firmada",
        submitDesc: "Pega el XDR firmado devuelto por la wallet para transmitir el swap.",
        submitPlaceholder: "XDR de la transacción firmada…",
        submit: "Enviar", submitting: "Enviando…",
        submitted: "Swap enviado",
        submitFailed: "No se pudo enviar el swap.",
        resultCodes: "Códigos de resultado",
      },
    },
    crossChain: {
      title: "Swaps entre redes",
      sub: "{n} swaps · Stellar ⇄ Solana ⇄ Monad a través de NEAR Intents",
      create: "Nuevo swap entre redes",
      readOnly: "Tienes acceso de solo lectura a los swaps en esta organización.",
      searchPlaceholder: "Buscar por dirección, activo o ID…",
      filters: { all: "Todos", open: "En curso", SUCCEEDED: "Completados", REFUNDED: "Reembolsados", FAILED: "Fallidos", EXPIRED: "Vencido" },
      status: { AWAITING_DEPOSIT: "Esperando depósito", DEPOSIT_DETECTED: "Depósito detectado", INCOMPLETE_DEPOSIT: "Depósito incompleto", PROCESSING: "Procesando", SUCCEEDED: "Completado", REFUNDED: "Reembolsado", FAILED: "Fallido", EXPIRED: "Vencido" },
      tableHead: { id: "Swap", route: "Enviado → recibido", status: "Estado", created: "Creado" },
      empty: "Aún no hay swaps entre redes.",
      loading: "Cargando swaps…",
      loadError: "No se pudieron cargar los swaps entre redes.",
      createError: "No se pudo abrir el swap.",
      quoteError: "No se pudo cotizar el swap.",
      modal: {
        eyebrow: "Swap entre redes", title: "Nuevo swap entre redes",
        desc: "Envía un activo en una red y recibe otro en una red distinta. Lo liquida NEAR Intents; nada pasa por Cosmos Pay.",
        from: "Desde", to: "Hacia", chain: "Red", asset: "Activo", assetsLoading: "Cargando activos…",
        amount: "Cantidad a enviar", recipient: "Destinatario",
        refundTo: "Dirección de reembolso",
        slippage: "Slippage (bps)", slippageHint: "Opcional, p. ej. 100. Por debajo del mínimo NEAR Intents reembolsa.",
        getQuote: "Cotizar", quoting: "Cotizando…", quoteTitle: "Cotización",
        estimated: "Recibirás (estimado)", minimum: "Mínimo a recibir", fee: "Comisión", eta: "Tiempo estimado", seconds: "s",
        feeNote: "La comisión es la tarifa del plan de tu organización y se toma de la entrada.",
        create: "Abrir swap", creating: "Abriendo…",
      },
      detail: {
        eyebrow: "Swap entre redes", title: "Financia el swap",
        pay: "Envía exactamente {amount} {asset} a la dirección de depósito.",
        memoWarning: "Adjunta el memo como MEMO_TEXT, o el depósito no se acreditará.",
        scan: "Escanea para pagar", depositUri: "Enlace de depósito", openWallet: "Abrir en la billetera",
        fields: { id: "ID", status: "Estado", route: "Ruta", depositAddress: "Dirección de depósito", depositMemo: "Memo", amountIn: "Enviar", estimated: "Recibir (est.)", minimum: "Mínimo", fee: "Comisión", recipient: "Destinatario", refundTo: "Dirección de reembolso", amountOut: "Recibido", refunded: "Reembolsado", expires: "Depositar antes de", quoteSignature: "Firma de la cotización", created: "Creado" },
        txs: "Transacciones",
        reportTitle: "Informar el depósito",
        reportPlaceholder: "Hash de la transacción de depósito…",
        report: "Informar", reporting: "Informando…", reported: "Depósito informado", reportError: "No se pudo informar el depósito.", noLink: "Paga a la dirección de depósito (y el memo, si aparece) desde cualquier wallet de {chain}, o escanea el QR.",
      },
    },
    wallet: { signTitle: "Firma con tu wallet", freighter: "Firmar con Freighter", signing: "Esperando a Freighter…", submitting: "Enviando…", missing: "Freighter no está instalada en este navegador. Escanea el QR con otra wallet o pega abajo la transacción firmada.", declined: "Freighter no firmó la transacción.", wrongAccount: "Freighter está en otra cuenta. Cámbiala a {account} y vuelve a intentarlo.", wrongNetwork: "Freighter está en otra red. Cámbiala a {network} y vuelve a intentarlo.", networks: { testnet: "Testnet", public: "Red pública" } },
    liquidity: {
      title: "Pools de liquidez",
      sub: "{n} operaciones · pools AMM en Stellar",
      deposit: "Depositar",
      withdraw: "Retirar",
      readOnly: "Tienes acceso de solo lectura a los pools de liquidez en esta organización.",
      tabs: { operations: "Operaciones", pools: "Pools", positions: "Posiciones" },
      searchPlaceholder: "Buscar por pool, cuenta o ID…",
      filters: { all: "Todos", PENDING: "Pendiente", SUBMITTED: "Enviado", SUCCEEDED: "Completado", FAILED: "Fallido" },
      status: { PENDING: "Pendiente", SUBMITTED: "Enviado", SUCCEEDED: "Completado", FAILED: "Fallido", EXPIRED: "Expirado" },
      kind: { DEPOSIT: "Depósito", WITHDRAW: "Retiro" },
      sharesUnit: "participaciones",
      bps: "bps",
      opsHead: { id: "Operación", kind: "Tipo", pool: "Pool", amounts: "Montos", status: "Estado", created: "Creado" },
      empty: "Aún no hay operaciones de liquidez. Deposita en un pool para obtener una transacción sin firmar.",
      loading: "Cargando operaciones…",
      loadError: "No se pudieron cargar las operaciones de liquidez.",
      network: { dev: "Testnet", prod: "Red pública" },
      pools: {
        assetA: "Activo A", assetAIssuer: "Emisor A", assetB: "Activo B", assetBIssuer: "Emisor B",
        assetHint: "Código del activo: vacío o XLM para lumens.",
        search: "Buscar pools", searching: "Buscando…", loading: "Cargando pools…",
        empty: "No hay pools para este par.",
        error: "No se pudieron cargar los pools de liquidez.",
        head: { pool: "Pool", reserves: "Reservas", shares: "Participaciones totales", trustlines: "Titulares", fee: "Comisión" },
      },
      positions: {
        account: "Cuenta", accountHint: "Cuenta Stellar cuyas participaciones quieres inspeccionar (G…).",
        load: "Cargar posiciones", loadingBtn: "Cargando…",
        prompt: "Ingresa una cuenta para ver sus posiciones en pools.",
        empty: "Esta cuenta no tiene participaciones en pools.",
        error: "No se pudieron cargar las posiciones.",
        head: { pool: "Pool", shares: "Participaciones", share: "Parte del pool", redeemable: "Canjeable" },
      },
      modal: {
        eyebrow: "Liquidez",
        depositTitle: "Depositar liquidez",
        depositDesc: "Deposita ambos activos del par en el pool AMM y recibe participaciones. Obtendrás una transacción sin firmar para firmar.",
        withdrawTitle: "Retirar liquidez",
        withdrawDesc: "Quema participaciones del pool para recibir ambos activos proporcionalmente. Obtendrás una transacción sin firmar para firmar.",
        source: "Cuenta origen", sourceHint: "Cuenta Stellar que financia y firma el depósito (G…).",
        withdrawSourceHint: "Cuenta Stellar que posee las participaciones del pool (G…).",
        assetA: "Activo A", assetB: "Activo B", assetHint: "Código del activo (XLM para lumens).",
        assetAIssuer: "Emisor A", assetBIssuer: "Emisor B", issuerHint: "Requerido para activos no nativos (G…).",
        maxAmountA: "Monto máx. A", maxAmountAHint: "Máximo del activo A a depositar.",
        maxAmountB: "Monto máx. B", maxAmountBHint: "Opcional. Se deriva del precio del pool si se omite; requerido para un pool nuevo.",
        poolId: "ID del pool", poolIdHint: "ID hexadecimal de 64 caracteres del pool.",
        shares: "Participaciones", sharesHint: "Cantidad de participaciones del pool a quemar.",
        slippage: "Slippage (bps)", slippageHint: "Slippage máximo en puntos básicos (opcional, p. ej. 50).",
        create: "Generar transacción", creating: "Generando…",
        createError: "No se pudo generar la transacción.",
        steps: { pair: "Par", amounts: "Montos" },
      },
      detail: {
        eyebrow: "Liquidez",
        titleDeposit: "Depósito listo", titleWithdraw: "Retiro listo",
        scan: "Escanea para firmar", downloadQr: "Descargar QR",
        uri: "URI SEP-7", xdr: "XDR sin firmar",
        openWallet: "Abrir en la wallet", viewExplorer: "Ver en el explorador",
        fields: { id: "ID", kind: "Tipo", status: "Estado", network: "Red", source: "Origen", pool: "Pool", pair: "Par", maxDeposit: "Depósito máximo", minReceived: "Mínimo recibido", shares: "Participaciones", priceBounds: "Límites de precio (A/B)", commission: "Comisión", commissionMemo: "Memo de comisión", txHash: "ID de transacción", created: "Creado" },
        submitTitle: "Enviar transacción firmada",
        submitDesc: "Pega el XDR firmado devuelto por la wallet para transmitir la operación.",
        submitPlaceholder: "XDR de la transacción firmada…",
        submit: "Enviar", submitting: "Enviando…",
        submitted: "Operación enviada",
        submitFailed: "No se pudo enviar la operación.",
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
        eyebrow: "Fiat: activación",
        activating: "Activando tu cuenta…",
        activatingBody: "Espera mientras confirmamos tu aceptación.",
        successTitle: "Tu cuenta ya está activa",
        successBody: "Ya puedes añadir wallets y cuentas bancarias y usar onramp y offramp.",
        errorTitle: "No se pudo activar",
        errorBody: "No pudimos activar tu cuenta. Inténtalo de nuevo.",
        noTosId: "No se devolvió ningún id de términos de servicio. Inténtalo de nuevo.",
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
        disabledNote: "Esta cuenta fiat está deshabilitada: onramp/offramp están bloqueados hasta reactivarla.",
        accountDisabled: "Cuenta fiat deshabilitada",
        accountEnabled: "Cuenta fiat habilitada",
        accessError: "No se pudo actualizar la cuenta fiat.",
        inactiveNote: "Solo registro: aún no se han enviado datos de KYC.",
        awaitingReview: "A la espera de revisión del propietario/administrador.",
        reviewTitle: "Revisar KYC",
        reviewHint: "Revisa los datos de KYC enviados y luego aprueba para enviar al cliente los términos de servicio por email.",
        approve: "Aprobar y enviar términos",
        approving: "Aprobando…",
        approvedSent: "Aprobado: términos enviados a {email}",
        approveError: "No se pudo aprobar el receptor.",
        termsSentTitle: "Términos enviados",
        termsSentBody: "A la espera de la aceptación del cliente. Términos enviados a {email}.",
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
            source_of_wealth: "Origen del patrimonio", purpose_of_transactions: "Propósito de las transacciones", purpose_of_transactions_explanation: "Propósito de las transacciones (explicación)",
            legal_name: "Razón social", alternate_name: "Nombre alternativo", business_type: "Tipo de empresa", business_industry: "Industria", business_description: "Descripción del negocio",
            formation_date: "Fecha de constitución", estimated_annual_revenue: "Ingresos anuales estimados", website: "Sitio web",
            incorporation_doc_file: "Documento de constitución", proof_of_ownership_doc_file: "Comprobante de titularidad",
            ownership_percentage: "% de propiedad", title: "Cargo",
          },
          create: "Crear receptor", creating: "Creando…",
          steps: { who: "Receptor", personal: "Datos personales", documents: "Documentos", funds: "Origen de fondos", company: "Empresa", owners: "Propietarios" },
        },
        detail: {
          eyebrow: "Receptor",
          id: "ID", blindpayId: "ID del proveedor", kycStatus: "Estado KYC", kycType: "Nivel de verificación", email: "Email", country: "País",
          terms: "Términos de servicio",
          tosOpened: "Flujo de términos de servicio iniciado.",
          tosError: "No se pudo iniciar el flujo de términos de servicio.",
          wallets: "Wallets blockchain", addWallet: "Añadir wallet",
          banks: "Cuentas bancarias", addBank: "Añadir cuenta bancaria",
        },
        wallet: {
          name: "Nombre", network: "Red",
          address: "Dirección",
          aa: "Abstracción de cuenta", add: "Añadir wallet",
          error: "No se pudo añadir la wallet.",
        },
        bank: {
          rail: "Vía", name: "Nombre", beneficiary: "Nombre del beneficiario", country: "País",
          accountNumber: "Número de cuenta", routingNumber: "Número de routing",
          add: "Añadir cuenta bancaria",
          error: "No se pudo añadir la cuenta bancaria.",
          steps: { account: "Cuenta", numbers: "Datos bancarios" },
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
          steps: { quote: "Cotización", confirm: "Confirmar" },
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
          steps: { quote: "Cotización", sign: "Firma" },
        },
      },
    }
  }
};

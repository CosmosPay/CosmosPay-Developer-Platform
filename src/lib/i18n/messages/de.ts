/* de.js — German message catalog. Mirrors en.js exactly in shape. */
export default {
  invite: {
    eyebrow: "Einladung",
    joinTitle: "{org} beitreten",
    signInToAccept: "Du wurdest eingeladen, in {org} auf Cosmos Pay mitzuarbeiten.",
    signInBtn: "Zum Annehmen anmelden",
    invitedAs: "Einladung gesendet an {email}",
    successTitle: "Geschafft!",
    successBody: "Du bist {org} beigetreten.",
    goToDashboard: "Zum Dashboard",
    backHome: "Zurück zur Startseite",
    invalidTitle: "Einladung nicht gefunden",
    invalidBody: "Dieser Einladungslink ist ungültig.",
    expiredTitle: "Einladung abgelaufen",
    expiredBody: "Diese Einladung ist abgelaufen. Bitte einen Admin, eine neue zu senden.",
    acceptedTitle: "Bereits angenommen",
    acceptedBody: "Diese Einladung wurde bereits verwendet.",
    mismatchTitle: "Falsches Konto",
    mismatchBody: "Diese Einladung wurde an {email} gesendet. Melde dich mit dieser E-Mail an, um anzunehmen.",
    seatLimitTitle: "Organisation ist voll",
    seatLimitBody: "Diese Organisation hat das Sitzplatzlimit ihres Tarifs erreicht.",
  },
  toasts: {
    copied: "In die Zwischenablage kopiert"
  },
  onboarding: {
    cancel: "Abbrechen",
    stepOf: "Schritt {n} / {total}",
    steps: {
      org: "Organisation",
      goals: "Ziele",
      plan: "Tarif",
      review: "Überblick"
    },
    back: "Zurück",
    continue: "Weiter",
    skip: "Überspringen",
    create: "Organisation erstellen",
    creating: "Wird erstellt…",
    error: "Onboarding konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
    orgEyebrow: "// neue Organisation",
    orgTitle: "Richten wir Ihre Organisation ein",
    orgSub: "Organisationen halten Zahlungen, Kunden und API-Schlüssel vollständig getrennt. Benennen Sie Ihre und sagen Sie uns, was Sie bauen.",
    nameLabel: "Name der Organisation",
    namePlaceholder: "Acme Inc.",
    nameNote: "Sie können sie später in den Einstellungen umbenennen.",
    industryLabel: "Welche Art von Geschäft ist es?",
    industries: {
      saas: {
        t: "SaaS & Abonnements",
        s: "Produkte mit wiederkehrenden Umsätzen"
      },
      market: {
        t: "Marktplatz",
        s: "Geteilte Zahlungen & Auszahlungen"
      },
      ecom: {
        t: "E-Commerce",
        s: "Onlineshop oder Checkout"
      },
      fintech: {
        t: "Fintech",
        s: "Auf regulierten Rails bauen"
      },
      platform: {
        t: "Plattform",
        s: "Zahlungen für Ihre Nutzer einbetten"
      },
      ai: {
        t: "KI & Agenten",
        s: "Programmatische Geldflüsse"
      }
    },
    goalsEyebrow: "// was Sie bauen",
    goalsTitle: "Was möchten Sie zuerst tun?",
    goalsSub: "Wählen Sie alles Zutreffende — wir passen Ihr Dashboard an und schlagen den passenden Tarif vor.",
    goals: {
      accept: {
        t: "Zahlungen annehmen",
        s: "Kunden in USDC abrechnen"
      },
      payout: {
        t: "Auszahlungen senden",
        s: "Weltweit auszahlen"
      },
      subs: {
        t: "Abonnements",
        s: "Wiederkehrende Abrechnung"
      },
      cross: {
        t: "Grenzüberschreitend",
        s: "Abwicklung ohne Grenzen"
      },
      embed: {
        t: "Embedded Finance",
        s: "Wallets & Konten"
      },
      test: {
        t: "Nur erkunden",
        s: "Ausprobieren"
      }
    },
    volumeLabel: "Erwartetes monatliches Volumen",
    volumes: {
      explore: {
        t: "Nur erkunden",
        s: "Die API testen"
      },
      lt10: {
        t: "Unter 10.000 $ / Monat",
        s: "Erste Traktion"
      },
      mid: {
        t: "10.000 – 100.000 $ / Monat",
        s: "Skalierung"
      },
      gt100: {
        t: "100.000 $+ / Monat",
        s: "Hohes Volumen"
      }
    },
    planEyebrow: "// wählen Sie Ihren Tarif",
    planTitle: "Wählen Sie einen Tarif zum Start",
    planSub: "Starten Sie kostenlos und zahlen Sie nur pro erfolgreicher Transaktion. Jederzeit wechselbar — ohne Anruf.",
    popular: "Beliebt",
    recommended: "Empfohlen",
    enterpriseNote: "Benötigen Sie individuelle Tarife oder ein SLA?",
    enterpriseLink: "Sprechen Sie mit dem Vertrieb über Enterprise →",
    reviewEyebrow: "// prüfen & erstellen",
    reviewTitle: "Prüfen Sie Ihre Organisation",
    reviewSub: "Bestätigen Sie die Angaben unten. Sie landen in Ihrem neuen Dashboard mit sofort einsatzbereiten Testschlüsseln.",
    rv: {
      org: "Organisation",
      type: "Geschäftstyp",
      goals: "Ziele",
      volume: "Erwartetes Volumen",
      plan: "Tarif"
    },
    notSet: "Nicht festgelegt",
    edit: "Bearbeiten",
    termsPre: "Ich stimme den ",
    termsA: "Entwicklerbedingungen",
    termsMid: " und der ",
    termsB: "Richtlinie zur akzeptablen Nutzung",
    termsPost: " von Cosmos Pay zu.",
    specTagline: "Eine API. Alle Stellar-Rails.",
    specTaglineSub: "Akzeptieren und bewegen Sie Geld in USDC mit Abwicklung in ~5 Sekunden. Wählen Sie den passenden Tarif — jederzeit änderbar.",
    selectedPlan: "Ausgewählter Tarif",
    recommendedForYou: "Für Sie empfohlen",
    spec: {
      perTx: "Pro Transaktion",
      settle: "Abwicklung",
      network: "Netzwerk",
      team: "Teammitglieder",
      orgs: "Organisationen",
      support: "Support",
      live: "Live-Zahlungen",
      included: "Enthalten",
      notIncluded: "Nicht enthalten"
    },
    whatsIncluded: "Was enthalten ist",
    specFoot: "Testschlüssel sind sofort bereit. Keine Karte zum Starten nötig.",
    supportLevels: {
      community: "Community",
      standard: "Standard",
      priority: "Priorität"
    },
    plans: {
      community: {
        desc: "Kostenlos zum Launch · nur Stellar",
        sub: "nur Stellar",
        pnote: "kostenlos während des Launches · Stellar",
        team: "1",
        feats: ["Zahlungs-Webhooks", "Test-API-Schlüssel", "1 Projekt"]
      },
      starter: {
        desc: "Echte Zahlungen auf Stellar annehmen",
        sub: "+ 10¢ / Txn",
        pnote: "0,5% + 10¢ pro Transaktion",
        team: "Bis zu 5",
        feats: ["Vollständige Zahlungs-API", "Live- und Testschlüssel", "USDC-Abwicklung", "Bis zu 5 Mitglieder"]
      },
      growth: {
        desc: "Niedrigere Tarife für wachsende Teams",
        sub: "/Monat · ab",
        pnote: "ab · 0,35% + 0,5¢ pro Txn",
        team: "Unbegrenzt",
        feats: ["Alles aus Starter", "Niedrigere Transaktionsgebühr", "Unbegrenzte Mitglieder", "Radar-Betrugstools", "Mengenrabatte", "Prioritäts-Support"]
      }
    }
  },
  nav: {
    login: "Anmelden",
    getKeys: "Schlüssel holen",
    dashboard: "Dashboard",
    menu: "Menü",
    docs: "Dokumentation",
    items: {
      products: {
        label: "Produkte",
        cols: [
          {
            head: "Geld annehmen",
            links: [
              {
                t: "Payments",
                s: "Zahlungen über das Stellar-Netzwerk"
              },
              {
                t: "Checkout",
                s: "Gehostete Zahlungsseite"
              },
              {
                t: "Payment Links",
                s: "Zahlungslinks ohne Code"
              },
              {
                t: "Invoicing",
                s: "In Stablecoins abrechnen"
              }
            ]
          },
          {
            head: "Geld bewegen",
            links: [
              {
                t: "Payouts",
                s: "Weltweit Gelder senden"
              },
              {
                t: "Cross-border",
                s: "Grenzenlose Abwicklung"
              },
              {
                t: "Anchors",
                s: "Fiat-Ein- und -Auszahlungen"
              },
              {
                t: "FX",
                s: "Umrechnung mehrerer Assets"
              }
            ]
          },
          {
            head: "Entwickeln mit",
            links: [
              {
                t: "Stablecoins",
                s: "USDC & Stellar-Assets"
              },
              {
                t: "Wallets",
                s: "Verwahrt & nicht verwahrt"
              },
              {
                t: "Ledger",
                s: "On-Chain-Ledger in Echtzeit"
              },
              {
                t: "Radar",
                s: "Betrug & Risiko"
              }
            ]
          }
        ],
        featured: {
          title: "Cosmos Sessions 2026",
          desc: "Erfahren Sie, wie wir Zahlungsinfrastruktur für das KI-Zeitalter aufbauen.",
          cta: "Jetzt ansehen"
        }
      },
      solutions: {
        label: "Lösungen",
        cols: [
          {
            head: "Nach Modell",
            links: [
              {
                t: "SaaS & Abonnements",
                s: "Wiederkehrende Umsätze im großen Maßstab"
              },
              {
                t: "Marktplätze",
                s: "Zahlungen & Auszahlungen aufteilen"
              },
              {
                t: "Plattformen",
                s: "Zahlungen für Nutzer einbetten"
              },
              {
                t: "Embedded Finance",
                s: "Konten, Karten & Geld"
              }
            ]
          },
          {
            head: "Nach Branche",
            links: [
              {
                t: "E-Commerce",
                s: "Höhere Conversion im Checkout"
              },
              {
                t: "Fintech",
                s: "Auf regulierten Rails aufbauen"
              },
              {
                t: "Gaming",
                s: "Globale Mikrotransaktionen"
              },
              {
                t: "Travel & Mobilität",
                s: "Komplexe Flows mit mehreren Parteien"
              }
            ]
          }
        ]
      },
      developers: {
        label: "Entwickler",
        cols: [
          {
            head: "Entwickeln",
            links: [
              {
                t: "API reference",
                s: "REST & GraphQL"
              },
              {
                t: "SDKs & Bibliotheken",
                s: "Sechs typisierte Sprachen"
              },
              {
                t: "Webhooks",
                s: "Ereignisse in Echtzeit"
              },
              {
                t: "Sandbox",
                s: "Alles sicher testen"
              }
            ]
          },
          {
            head: "Betreiben",
            links: [
              {
                t: "CLI",
                s: "Parität von Lokal zu Produktion"
              },
              {
                t: "Status",
                s: "Verfügbarkeit & Störungen"
              },
              {
                t: "Changelog",
                s: "Was wir veröffentlicht haben"
              },
              {
                t: "Postman",
                s: "Fertige Sammlung"
              }
            ]
          }
        ],
        featured: {
          title: "Quickstart",
          desc: "In unter fünf Minuten von null zur ersten Zahlung.",
          cta: "Jetzt entwickeln"
        }
      },
      resources: {
        label: "Ressourcen",
        cols: [
          {
            head: "Lernen",
            links: [
              {
                t: "Documentation",
                s: "Anleitungen & Referenzen"
              },
              {
                t: "Tutorials",
                s: "Schritt-für-Schritt-Anleitungen"
              },
              {
                t: "Blog",
                s: "Technik & Produkt"
              },
              {
                t: "Kundenberichte",
                s: "Auf Cosmos Pay aufgebaut"
              }
            ]
          },
          {
            head: "Support",
            links: [
              {
                t: "Help Center",
                s: "Antworten & Anleitungen"
              },
              {
                t: "Community",
                s: "Forum & Discord"
              },
              {
                t: "Vertrieb kontaktieren",
                s: "Mit einem Experten sprechen"
              },
              {
                t: "Partner",
                s: "Agenturen & Integrationen"
              }
            ]
          }
        ]
      },
      pricing: {
        label: "Preise"
      }
    }
  },
  profile: {
    account: "Kontoeinstellungen",
    billing: "Abrechnung",
    docs: "Documentation",
    backToSite: "Zurück zur Website",
    logout: "Abmelden",
    openDashboard: "Dashboard öffnen"
  },
  footer: {
    tagline: "Die Zahlungsinfrastruktur für Entwickler. Eine API, jedes Rail.",
    copyright: "© 2026 Cosmos Pay, Inc. — Developer Platform",
    groups: {
      products: {
        title: "Produkte",
        links: ["Payments", "Stablecoins", "Payouts", "Anchors", "Wallets", "Checkout", "Payment Links", "Preise"]
      },
      solutions: {
        title: "Lösungen",
        links: ["SaaS & Abonnements", "Marktplätze", "E-Commerce", "Plattformen", "Embedded Finance", "KI & Agenten", "Enterprise"]
      },
      developers: {
        title: "Entwickler",
        links: ["Documentation", "API reference", "SDKs & Bibliotheken", "Webhooks", "API-Status", "Changelog", "Dashboard"]
      },
      resources: {
        title: "Ressourcen",
        links: ["Anleitungen", "Blog", "Kundenberichte", "Support", "Partner", "Sessions 2026"]
      },
      company: {
        title: "Unternehmen",
        links: ["Über uns", "Karriere", "Newsroom", "Sicherheit", "Datenschutz & AGB", "Compliance"]
      }
    }
  },
  landing: {
    hero: {
      headline: "Weniger Code schreiben -> mehr Geld bewegen",
      lede: "Die Zahlungsinfrastruktur für Entwickler. Eine API, um Geld über das Stellar-Netzwerk zu bewegen — Stablecoins und digitale Assets, die in Sekunden abgewickelt werden, in über 130 Ländern, mit Gebühren im Bruchteil eines Cents.",
      getKeys: "API-Schlüssel erhalten",
      trustedBy: "Vertraut von Engineering-Teams bei"
    },
    api: {
      kicker: "// die Plattform",
      title: "Leistungsstarke APIs",
      lede: "Unsere modularen APIs ermöglichen es Entwicklern, komplexe Finanzflüsse in Minuten zu integrieren — nicht in Monaten.",
      docsLink: "API-Dokumentation ansehen",
      cards: {
        payments: {
          title: "Payments",
          desc: "Senden und empfangen Sie Zahlungen auf Stellar mit Finalität in unter 5 Sekunden und nahezu null Gebühren."
        },
        stablecoin: {
          title: "Stablecoins",
          desc: "Wickeln Sie in USDC und anderen Stellar-Assets ab — on-chain und in Echtzeit."
        },
        anchor: {
          title: "Anchors",
          desc: "Verbinden Sie sich mit Stellar-Anchors für Fiat-Ein- und -Auszahlungen in lokalen Währungen."
        }
      },
      docsTitle: "Erstklassige Dokumentation",
      docsDesc: "Von Entwicklern für Entwickler. Interaktive Anleitungen, eine detaillierte OpenAPI-Referenz und ein vollständig typisiertes JavaScript-/TypeScript-SDK für Server und Browser.",
      sdkBtns: {
        node: "Node.js / TypeScript SDK",
        web: "Browser / Web SDK"
      },
      exploreDocs: "Gesamte Dokumentation erkunden",
      copy: "Kopieren",
      copied: "Kopiert"
    },
    integration: {
      kicker: "// Entwickler",
      title: "Zuverlässige, erweiterbare Infrastruktur.",
      lede: "Gebaut, um die größten Workloads der Welt zu bewältigen — und sich in jeden Stack einzufügen, den Sie bereits nutzen.",
      scale: ["API-Anfragen / Tag", "Anfragen / Sek.", "Stellar-Finalität", "Verfügbarkeit"],
      paths: [
        {
          t: "No-Code",
          d: "Erstellen Sie Zahlungslinks und Rechnungen direkt in Ihrem Dashboard — ganz ohne Engineering.",
          a: "No-Code erkunden"
        },
        {
          t: "Vorgefertigte UI",
          d: "Binden Sie Checkout oder Elements ein und nehmen Sie in Minuten Stellar-Zahlungen an — mit Komponenten, die zu Ihrer Marke passen.",
          a: "Komponenten ansehen"
        },
        {
          t: "Selbst entwickeln",
          d: "Nutzen Sie unsere REST- + GraphQL-APIs, typisierten SDKs und die CLI, um eine vollständig maßgeschneiderte Stellar-Integration zu erstellen.",
          a: "Dokumentation lesen"
        }
      ],
      mockLink: "Zahlungslink · 19.99 USDC"
    },
    solutions: {
      kicker: "// Lösungen",
      title: "Für jedes Geschäftsmodell gebaut.",
      lede: "Von der ersten Transaktion bis zu Milliarden an Volumen — Cosmos Pay passt sich daran an, wie Ihr Unternehmen Geld auf Stellar bewegt.",
      eyebrow: "Lösung",
      startBuilding: "Jetzt entwickeln",
      items: {
        pay: {
          t: "Stellar-Zahlungen annehmen",
          d: "Senden und empfangen Sie Zahlungen über das Stellar-Netzwerk mit Finalität in unter 5 Sekunden und Gebühren im Bruchteil eines Cents.",
          long: "Nehmen Sie Zahlungen von jedem mit einer Stellar-Wallet an. Gelder erreichen in etwa fünf Sekunden Finalität und werden direkt auf Ihr Konto abgewickelt — keine Rückbuchungen, keine Zwischenhändler und keine tagelangen Sperren.",
          points: ["Abwicklungsfinalität in unter 5 Sekunden", "Gebühren im Bruchteil eines Cents", "Beliebige Stellar-Assets senden & empfangen", "Echtzeit-Webhooks bei jeder Zahlung"]
        },
        coin: {
          t: "Stablecoin-Abwicklung",
          d: "Wickeln Sie in USDC und anderen Stellar-Assets ab — on-chain und in Echtzeit.",
          long: "Halten und wickeln Sie Guthaben in USDC und anderen regulierten, auf Stellar ausgegebenen Stablecoins ab. Jede Transaktion wird on-chain erfasst und automatisch mit Ihrem Echtzeit-Ledger abgeglichen.",
          points: ["1:1 gedeckte, regulierte Stablecoins", "On-chain, prüfbare Abwicklung", "Echtzeit-Ledger für mehrere Assets", "Automatischer Abgleich"]
        },
        globe: {
          t: "Grenzüberschreitendes Geld",
          d: "Erreichen Sie über 130 Länder in einem globalen Netzwerk — ohne Korrespondenzbanken.",
          long: "Bewegen Sie Geld über Grenzen hinweg genauso wie lokal. Stellar erreicht über 130 Länder ohne Korrespondenzbanken, sodass Auszahlungen in Sekunden statt Tagen ankommen.",
          points: ["Über 130 Länder in einem Netzwerk", "Keine Verzögerungen durch Korrespondenzbanken", "Transparenter FX im Voraus", "Abwicklung in Sekunden"]
        },
        ramp: {
          t: "Ein- & Auszahlungen",
          d: "Verbinden Sie sich mit Stellar-Anchors für Einzahlungen und Auszahlungen in lokaler Währung.",
          long: "Lassen Sie Nutzer über regulierte Stellar-Anchors zwischen lokaler Währung und digitalen Assets wechseln. Ein- und Auszahlungen in Dutzenden lokaler Währungen, vollständig durch die SEP-Standards abgewickelt.",
          points: ["Reguliertes Anchor-Netzwerk", "Dutzende lokaler Währungen", "Standardflüsse nach SEP-6 / SEP-24", "KYC durch den Anchor abgewickelt"]
        },
        wallet: {
          t: "Eingebettete Wallets",
          d: "Erstellen Sie verwahrte oder nicht verwahrte Stellar-Wallets für Ihre Nutzer.",
          long: "Geben Sie jedem Nutzer eine Stellar-Wallet in Ihrem Produkt. Wählen Sie verwahrte Wallets, die Sie verwalten, oder nicht verwahrte Wallets, die Ihre Nutzer kontrollieren — beide mit einem einzigen API-Aufruf bereitgestellt.",
          points: ["Verwahrt oder nicht verwahrt", "Bereitstellung mit einem Aufruf", "Integrierte Schlüsselverwaltung", "Guthaben in mehreren Assets"]
        }
      },
      payMock: {
        received: "Zahlung erhalten",
        via: "über Stellar · 4.2s",
        fee: "Gebühr $0.00001"
      }
    },
    stats: {
      items: ["API-Verfügbarkeits-SLA", "p99-Antwortzeit", "unterstützte Länder", "API-Aufrufe / Monat"]
    },
    customers: {
      kicker: "// Kunden",
      title: "Antrieb für Unternehmen jeder Größe.",
      lede: "Von Startups in der Seed-Phase bis zu börsennotierten Unternehmen — Teams bauen und skalieren ihre Zahlungen auf Cosmos Pay.",
      eyebrow: "Kundenbericht",
      readStory: "Bericht lesen",
      readFull: "Vollständigen Bericht lesen",
      items: {
        Northwind: {
          label: "schnellere grenzüberschreitende Abwicklung nach dem Wechsel zu Stellar.",
          tags: ["Payments", "Stablecoins", "Wallets"],
          story: "Northwind verlagerte seinen globalen Checkout auf Cosmos Pay und das Stellar-Netzwerk, verkürzte die Abwicklung von Tagen auf Sekunden und senkte die FX-Kosten in über 30 Märkten — und das alles mit einem einzigen abgeglichenen Ledger."
        },
        Lumio: {
          label: "um USDC-Abonnements in 40 Ländern zu starten.",
          tags: ["Billing", "USDC", "Anchors"],
          story: "Lumio ersetzte ein Flickwerk regionaler Zahlungsdienstleister durch Cosmos Pay und startete in nur sechs Wochen USDC-denominierte Abonnements in 40 Ländern mithilfe von Anchors für lokale Ein- und Auszahlungen."
        },
        Helios: {
          label: "über das Stellar-Netzwerk weltweit an Verkäufer abgewickelt.",
          tags: ["Payouts", "Connect", "Ramps"],
          story: "Helios zahlt vollständig über Stellar an eine globale Verkäuferbasis aus. Im letzten Jahr wickelte das Unternehmen 2,4 Mrd. $ an Verkäufer in 58 Ländern ab — mit Geldern, die in Sekunden ankommen, und vollständiger On-Chain-Transparenz."
        }
      }
    },
    testimonials: {
      kicker: "// Kundenstimmen",
      title: "Geschätzt von Entwicklern und Finanzteams.",
      items: {
        MC: {
          q: "Cosmos Pay ermöglichte es uns, Geld in Sekunden über Grenzen hinweg zu bewegen. Wir ersetzten drei Anbieter durch eine einzige Stellar-API.",
          r: "VP Engineering, Vertexa"
        },
        DO: {
          q: "Die Dokumentation ist die beste, die ich je genutzt habe. Wir wickelten unsere erste USDC-Zahlung am ersten Tag noch vor dem Mittagessen ab.",
          r: "Founder, Quanta"
        },
        PN: {
          q: "Der Abgleich dauerte früher eine Woche. Die On-Chain-Abwicklung auf Stellar erledigt das jetzt in Echtzeit für uns.",
          r: "Head of Finance, Riverstone"
        }
      }
    },
    resources: {
      kicker: "// Ressourcen",
      title: "Was es Neues gibt.",
      lede: "Produktneuigkeiten, vertiefende Anleitungen und Engineering-Geschichten vom Team hinter Cosmos Pay.",
      readMore: "Mehr lesen",
      items: [
        {
          tag: "Report",
          t: "The 2026 State of Stablecoin Payments",
          d: "Wie Teams Geld auf Stellar im globalen Maßstab bewegen."
        },
        {
          tag: "Changelog",
          t: "Stellar-Abwicklungs-Webhooks sind allgemein verfügbar",
          d: "Erhalten Sie Echtzeit-Ereignisse in dem Moment, in dem eine Zahlung Finalität erreicht."
        },
        {
          tag: "Guide",
          t: "Idempotente Webhooks entwerfen",
          d: "Muster für zuverlässige Ereignisverarbeitung mit garantierter Einmaligkeit."
        },
        {
          tag: "Blog",
          t: "Skalierung auf 8 Mrd. Anfragen pro Monat",
          d: "Ein Blick in die Infrastruktur, die Cosmos Pay antreibt."
        }
      ]
    },
    cta: {
      title: "Beginnen Sie noch heute zu entwickeln.",
      desc: "Erstellen Sie eine kostenlose Testnet-Sandbox und gehen Sie auf Stellar live, sobald Sie bereit sind.",
      getKeys: "API-Schlüssel erhalten",
      talk: "Mit dem Engineering-Team sprechen",
      helpers: [
        {
          b: "Sehen, was Sie zahlen",
          s: "Transparente, nutzungsbasierte Preise ohne Überraschungen."
        },
        {
          b: "Jetzt entwickeln",
          s: "Holen Sie sich Ihre API-Schlüssel und tätigen Sie noch heute Ihre erste Zahlung."
        }
      ]
    }
  },
  pricing: {
    kicker: "// Preise",
    title: "Zahlen Sie für das, was Sie abwickeln.",
    lede: "Transparente, nutzungsbasierte Preise. Kostenlos starten — zahlen Sie nur eine kleine Gebühr pro erfolgreicher Transaktion.",
    monthly: "Monatlich",
    annual: "Jährlich",
    save: "−17%",
    popular: "Am beliebtesten",
    from: "ab",
    perMo: "/Mon.",
    billedYearly: "jährliche Abrechnung",
    plans: [
      {
        name: "Community",
        tag: "Kostenlos",
        desc: "Beginnen Sie ohne monatliche Kosten, Zahlungen anzunehmen.",
        amt: "Kostenlos",
        txt: "keine monatliche Gebühr",
        cta: "Kostenlos starten",
        feats: ["Zahlungen akzeptieren", "Test-API-Schlüssel", "1 Projekt", "Community-Support", "Zahlungsabsicherung", "Streitfalllösung", "Karten & Banküberweisungen"]
      },
      {
        name: "Starter",
        desc: "Nehmen Sie echte Zahlungen mit integrierter Zahlungsabsicherung an.",
        amt: "1.5%",
        txt: "+ 0.25¢ pro Transaktion *",
        cta: "Kostenlos starten",
        feats: ["Alles aus Community", "Live-Zahlungen", "Zahlungsabsicherung", "Teilweiser API-Zugriff", "Standard-Support", "Streitfalllösung", "Karten & Banküberweisungen"]
      },
      {
        name: "Essentials",
        desc: "Voller Plattformzugriff mit Streitfalllösung und jeder Zahlungsmethode.",
        txt: "+ 0.5% + 10¢ pro Transaktion *",
        cta: "Kostenlose Testphase starten",
        feats: ["Alles aus Starter", "Voller API-Zugriff", "Zahlungsabsicherung", "Streitfalllösung", "Karten & Banküberweisungen", "Bevorzugter E-Mail-Support", "Mengenrabatte"]
      },
      {
        name: "Growth",
        desc: "Niedrigere Tarife und mehr Leistung für wachsende Teams.",
        txt: "+ 0.35% + 5¢ pro Transaktion *",
        cta: "Kostenlose Testphase starten",
        feats: ["Alles aus Essentials", "Transaktionstarif von 0.35% + 5¢", "Unbegrenzte Teammitglieder", "Erweiterte Betrugserkennung", "Mengenrabatte", "Bevorzugter Support", "Intelligentes Payment-Routing"]
      }
    ],
    enterprise: {
      name: "Enterprise",
      desc: "Individuelle Tarife und dedizierte Infrastruktur für Unternehmen mit dem höchsten Volumen.",
      feats: ["Individuelle Tarife pro Transaktion", "Dedizierte Infrastruktur", "99.99% Verfügbarkeits-SLA", "SSO / SAML + Audit-Logs", "Benannter Solutions Architect", "24/7 Bevorzugter Support"],
      price: "Individuell",
      subt: "Volumenbasierte Tarife",
      cta: "Vertrieb kontaktieren"
    },
    footnote: "* Jede Transaktion enthält zusätzlich eine kleine Netzwerkgebühr. Community und Starter decken unsere zentralen Zahlungsfunktionen ab; Essentials und Growth schalten vollen API-Zugriff, Streitfalllösung und jede Zahlungsmethode frei, einschließlich Karten und Banküberweisungen.",
    compareTitle: "Pläne vergleichen",
    orgsRow: "Organisationen",
    seatsRow: "Mitglieder pro Organisation",
    keysRow: "API-Schlüssel",
    compareHead: ["Funktion", "Community", "Starter", "Essentials", "Growth", "Enterprise"],
    compare: [
      {
        l: "Monatliche Gebühr",
        v: ["—", "—", "$33 / mo", "$99 / mo", "Individuell"]
      },
      {
        l: "Gebühr pro Transaktion",
        v: ["—", "1.5% + 0.25¢", "0.5% + 10¢", "0.35% + 5¢", "Individuell"]
      },
      {
        l: "Abwicklungsgeschwindigkeit",
        v: ["~5 sec", "~5 sec", "~5 sec", "~5 sec", "~5 sec"]
      },
      {
        l: "API-Zugriff",
        v: ["Benachrichtigungen", "Teilweise", "Voll", "Voll", "Voll"]
      },
      {
        l: "Live-Zahlungen",
        v: [1, 1, 1, 1, 1]
      },
      {
        l: "Zahlungsabsicherung",
        v: [0, 1, 1, 1, 1]
      },
      {
        l: "Streitfalllösung",
        v: [0, 0, 1, 1, 1]
      },
      {
        l: "Karten & Banküberweisungen",
        v: [0, 0, 1, 1, 1]
      },
      {
        l: "Erweiterte Betrugserkennung",
        v: [0, 0, 0, 1, 1]
      },
      {
        l: "Mengenrabatte",
        v: [0, 0, 0, 1, 1]
      },
      {
        l: "SSO / SAML",
        v: [0, 0, 0, 0, 1]
      },
      {
        l: "Support",
        v: ["Community", "Standard", "Bevorzugter E-Mail-Support", "Bevorzugt", "24/7 dediziert"]
      }
    ],
    faqTitle: "Häufig gestellte Fragen",
    faqs: [
      {
        q: "Gibt es wirklich einen kostenlosen Plan?",
        a: "Ja. Der Community-Plan ist kostenlos und enthält alles, was Sie brauchen, um sofort mit der Annahme von Zahlungen zu beginnen. Starter ist ebenfalls monatlich kostenlos; Sie zahlen nur eine kleine Gebühr pro erfolgreicher Transaktion."
      },
      {
        q: "Was kostet eine Transaktion?",
        a: "Starter kostet 1.5% + 0.25¢ pro erfolgreicher Transaktion. Essentials kostet $33/mo (oder $27.50/mo bei jährlicher Abrechnung) und senkt den Tarif auf 0.5% + 10¢, während Growth $99/mo kostet und ihn auf 0.35% + 5¢ senkt. Jede Transaktion verursacht zusätzlich eine kleine Netzwerkgebühr."
      },
      {
        q: "Welche Zahlungsmethoden unterstützen Sie?",
        a: "Community und Starter decken unsere zentralen Zahlungsmethoden ab. Ab Essentials können Sie auch Karten, Banküberweisungen und andere lokale Zahlungsmethoden über eine einzige Integration akzeptieren."
      },
      {
        q: "Wie schnell wird Geld abgewickelt?",
        a: "Zahlungen erreichen in etwa fünf Sekunden Finalität, in jedem Plan — es gibt keine tagelangen Auszahlungsverzögerungen."
      },
      {
        q: "Kann ich den Plan später ändern?",
        a: "Selbstverständlich. Führen Sie jederzeit ein Upgrade oder Downgrade über Ihr Dashboard durch. Änderungen treten sofort in Kraft — kein Anruf erforderlich."
      }
    ],
    ctaTitle: "Noch Fragen?",
    ctaDesc: "Sprechen Sie mit unserem Team über Volumenpreise, Compliance oder die Migration von einem anderen Anbieter.",
    contactSales: "Vertrieb kontaktieren",
    openDashboard: "Dashboard öffnen"
  },
  dash: {
    viewLabels: {
      overview: "Übersicht",
      payments: "Zahlungen",
      balances: "Guthaben",
      customers: "Kunden",
      products: "Produkte & Links",
      swaps: "Swaps",
      blindpay: "Fiat",
      developers: "API-Schlüssel",
      webhook: "Webhooks",
      logs: "API-Logs",
      weblogs: "Webhook-Logs",
      settings: "Organisation",
      account: "Konto",
      activity: "Aktivität",
      support: "Support",
      inbox: "Support-Postfach",
      users: "Benutzer",
      adminOverview: "Platform overview",
      adminPayments: "Payments — all orgs",
      adminSwaps: "Swaps — all orgs",
      adminFiat: "Fiat — all orgs",
      adminCustomers: "Customers — all orgs",
      adminProducts: "Products — all orgs",
      adminConsumers: "Organizations"
    },
    sidebar: {
      sections: {
        Platform: "Plattform",
        Build: "Entwickeln",
        Account: "Konto",
        Support: "Support",
        Admin: "Admin"
      },
      items: {
        overview: "Übersicht",
        payments: "Zahlungen",
        balances: "Guthaben",
        customers: "Kunden",
        products: "Produkte",
        swaps: "Swaps",
        blindpay: "Fiat",
        developers: "API-Schlüssel",
        webhook: "Webhooks",
        logs: "Logs",
        weblogs: "Webhook-Logs",
        settings: "Organisation",
        account: "Konto",
        activity: "Aktivität",
        support: "Support",
        inbox: "Postfach",
        users: "Benutzer",
        adminOverview: "Overview",
        adminPayments: "Payments",
        adminSwaps: "Swaps",
        adminFiat: "Fiat",
        adminCustomers: "Customers",
        adminProducts: "Products",
        adminConsumers: "Organizations"
      },
      collapse: "Seitenleiste einklappen"
    },
    org: {
      heading: "Organisationen",
      owned: "Deine Organisationen",
      invited: "Mit dir geteilt",
      locked: "Gesperrt — Upgrade für Zugriff",
      create: "Organisation erstellen"
    },
    env: {
      heading: "Umgebung",
      sandbox: "Sandbox",
      production: "Produktion",
      testnet: "Testnet-Umgebung",
      mainnet: "Mainnet-Umgebung"
    },
    topbar: {
      search: "Zahlungen, Kunden, Logs durchsuchen…",
      theme: "Design umschalten",
      notifications: "Benachrichtigungen"
    },
    statusLabels: {
      Succeeded: "Erfolgreich",
      Failed: "Fehlgeschlagen",
      Refunded: "Erstattet",
      Active: "Aktiv",
      Delivered: "Zugestellt"
    },
    common: {
      cancel: "Abbrechen",
      copy: "Kopieren",
      copyLink: "Link kopieren",
      export: "Exportieren",
      vsLastWeek: "ggü. Vorwoche",
      optional: "(optional)",
      viewPlans: "Pläne ansehen",
      yes: "Ja",
      no: "Nein"
    },
    profileMenu: {
      account: "Kontoeinstellungen",
      billing: "Abrechnung",
      docs: "Documentation",
      backToSite: "Zurück zur Website",
      logout: "Abmelden"
    },
    modals: {
      org: {
        eyebrow: "Organisation",
        title: "Organisation erstellen",
        atLimit: "Ihr {plan}-Plan erlaubt bis zu {limit} Organisation{s}. Führen Sie ein Upgrade durch, um weitere zu erstellen.",
        body: "Organisationen halten Zahlungen, Kunden und API-Schlüssel vollständig getrennt. Sie können in Ihrem {plan}-Plan {n} weitere erstellen.",
        bodyUnlimited: "Organisationen halten Zahlungen, Kunden und API-Schlüssel vollständig getrennt. Sie können in Ihrem {plan}-Plan unbegrenzt weitere erstellen.",
        nameLabel: "Organisationsname",
        namePlaceholder: "Acme Inc.",
        create: "Organisation erstellen"
      },
      key: {
        eyebrow: "API-Schlüssel",
        title: "Geheimen Schlüssel erstellen",
        editTitle: "API-Schlüssel bearbeiten",
        desc: "Wählen Sie die Umgebung und was dieser Schlüssel darf. Sie können das Geheimnis nur einmal sehen.",
        editDesc: "Aktualisieren Sie Name, Beschreibung, Rolle und Berechtigungen dieses Schlüssels.",
        nameLabel: "Name",
        namePlaceholder: "Produktionsserver",
        descLabel: "Beschreibung",
        descPlaceholder: "Wird vom Abrechnungsdienst verwendet",
        envLabel: "Umgebung",
        envs: {
          dev: "Entwicklung",
          prod: "Produktion"
        },
        roleLabel: "Rolle",
        roles: {
          user: "Benutzer",
          admin: "Administrator"
        },
        permsLabel: "Berechtigungen",
        permResource: "Ressource",
        scopeResources: { payments: "Zahlungen", webhooks: "Webhooks", products: "Produkte", customers: "Kunden" },
        adminHint: "Admin-Schlüssel haben vollen Zugriff auf alle Ressourcen.",
        perms: {
          read: "Lesen",
          write: "Schreiben"
        },
        create: "Schlüssel erstellen",
        save: "Änderungen speichern"
      },
      reveal: {
        eyebrow: "API-Schlüssel erstellt",
        title: "Speichern Sie Ihren geheimen Schlüssel",
        body: "Dies ist das einzige Mal, dass Sie dieses Geheimnis sehen. Kopieren Sie es jetzt und bewahren Sie es sicher auf — aus Sicherheitsgründen können Sie es nicht erneut anzeigen.",
        idLabel: "Schlüssel-ID",
        saved: "Ich habe meinen Schlüssel gespeichert"
      }
    },
    overview: {
      greeting: "Guten Morgen, {name}",
      sub: "Das passiert heute bei {org}.",
      metrics: {
        gross: "Bruttovolumen",
        net: "Nettovolumen",
        success: "Erfolgreiche Zahlungen",
        newCust: "Neue Kunden"
      },
      grossVolume: "Bruttovolumen",
      recentPayments: "Aktuelle Zahlungen",
      recentActivity: "Aktuelle Aktivität",
      acts: {
        key: "API-Schlüssel generiert",
        webhook: "Webhook zugestellt",
        payments: "Zahlung abgewickelt",
        customers: "Neuer Kunde"
      },
      tableHead: {
        payment: "Zahlung",
        customer: "Kunde",
        amount: "Betrag",
        status: "Status",
        date: "Datum"
      }
    },
    payments: {
      title: "Zahlungen",
      sub: "{n} Zahlungen · sofort auf Stellar abgewickelt",
      filters: {
        all: "Alle",
        ok: "Erfolgreich",
        fail: "Fehlgeschlagen",
        ref: "Erstattet"
      },
      create: "Zahlung erstellen",
      searchPlaceholder: "Nach Kunde oder ID suchen…",
      tableHead: {
        payment: "Zahlung",
        customer: "Kunde",
        amount: "Betrag",
        status: "Status",
        date: "Datum"
      },
      empty: "Keine Zahlungen entsprechen Ihren Filtern.",
      modal: {
        eyebrow: "Zahlung",
        title: "Zahlung erstellen",
        desc: "Zahlungen werden sofort über das Stellar-Netzwerk abgewickelt — ohne Haltefrist.",
        amount: "Betrag",
        asset: "Asset",
        customer: "Kunde",
        customerPlaceholder: "Acme Inc.",
        create: "Zahlung erstellen",
        newCustomer: "Neuer Kunde"
      }
    },
    cosmos: {
      loading: "Wird geladen…", loadError: "Daten konnten nicht geladen werden.", empty: "Hier ist noch nichts.",
      eventLabels: { PAYMENT_INTENT_CREATED: "Zahlung erstellt", PAYMENT_INTENT_UPDATED: "Zahlung aktualisiert", PAYMENT_INTENT_SUCCEEDED: "Zahlung erfolgreich", PAYMENT_INTENT_FAILED: "Zahlung fehlgeschlagen", PAYMENT_INTENT_CANCELLED: "Zahlung storniert", PAYMENT_INTENT_DELETED: "Zahlung gelöscht" },
      active: "Aktiv", inactive: "Deaktiviert",
      reveal: "Geheimnis anzeigen", secret: "Signatur-Geheimnis", secretNote: "Nur einmal angezeigt — sicher aufbewahren.",
      rotate: "Geheimnis erneuern", ping: "Test senden", pingOk: "Testereignis zugestellt", pingFail: "Testereignis fehlgeschlagen",
      deliveries: "Letzte Zustellungen", noDeliveries: "Noch keine Zustellungen.", redeliver: "Erneut senden",
      enable: "Aktivieren", disable: "Deaktivieren",
      delete: "Löschen", deleteConfirm: "Löschen", confirmDelete: "Kann nicht rückgängig gemacht werden.",
      customerSet: "Freier Betrag", allEvents: "Alle Ereignisse", events: "Ereignisse",
      received: "Empfangen", pending: "Ausstehend", settledNote: "In Echtzeit direkt auf Ihr Konto abgewickelt.",
      custDetail: { title: "Kunde", edit: "Bearbeiten", save: "Änderungen speichern", alias: "Alias", note: "Notiz", account: "Stellar-Konto", payments: "Zahlungen", onChain: "On-chain", noPayments: "Noch keine Zahlungen." },
    },
    paylinks: {
      title: "Zahlungslinks",
      sub: "{n} Links · SEP-7-Zahlungen auf Stellar",
      create: "Zahlungslink erstellen",
      searchPlaceholder: "Nach Ziel, Memo oder ID suchen…",
      filters: { all: "Alle", PENDING: "Ausstehend", SUBMITTED: "Übermittelt", SUCCEEDED: "Erfolgreich", FAILED: "Fehlgeschlagen", CANCELLED: "Storniert", EXPIRED: "Abgelaufen" },
      tableHead: { id: "Link", type: "Typ", amount: "Betrag", status: "Status", created: "Erstellt" },
      kinds: { PAY: "Zahlungslink", TX: "Transaktion" },
      anyAmount: "Beliebiger Betrag",
      empty: "Noch keine Zahlungslinks. Erstellen Sie einen, um einen QR-Code und einen teilbaren Link zu erhalten.",
      loading: "Zahlungslinks werden geladen…",
      loadError: "Zahlungslinks konnten nicht geladen werden.",
      readOnly: "Sie haben in dieser Organisation nur Lesezugriff auf Zahlungslinks.",
      createError: "Zahlungslink konnte nicht erstellt werden.",
      deleteError: "Zahlungslink konnte nicht gelöscht werden.",
      network: { dev: "Testnet", prod: "Öffentliches Netz" },
      modal: {
        eyebrow: "Zahlungslink", title: "Zahlungslink erstellen",
        desc: "Erzeugen Sie einen SEP-7-Link und QR-Code, den Ihr Kunde aus jeder Stellar-Wallet bezahlen kann.",
        kind: "Typ", kindPay: "Zahlungslink (Kunde zahlt)", kindTx: "Transaktion (Quelle bekannt)",
        kindPayHint: "Kein Quellkonto — liefert eine Pay-URI + QR.",
        kindTxHint: "Quelle bekannt — liefert eine unsignierte Transaktion zum Signieren.",
        destination: "Ziel", destinationHint: "Stellar-Konto, das die Mittel empfängt (G…).",
        source: "Quelle", sourceHint: "Stellar-Konto des Zahlers (G…).",
        amount: "Betrag", amountHint: "Leer lassen, damit der Zahler wählt (Spenden).",
        asset: "Asset", assetIssuer: "Asset-Emittent", assetIssuerHint: "Erforderlich für nicht-native Assets (G…).",
        memo: "Memo", memoHint: "Numerische MEMO_ID — automatisch generiert, wenn leer.",
        message: "Nachricht", messageHint: "Wird dem Zahler in seiner Wallet angezeigt (≤ 300 Zeichen).",
        submit: "Link erstellen",
      },
      detail: {
        eyebrow: "Zahlungslink", title: "Zahlungslink bereit",
        scan: "Zum Bezahlen scannen", downloadQr: "QR herunterladen",
        uri: "SEP-7-URI", xdr: "Unsigniertes XDR",
        openWallet: "In Wallet öffnen", copyLink: "Link kopieren", copyUri: "URI kopieren",
        fields: { id: "ID", status: "Status", kind: "Typ", network: "Netz", destination: "Ziel", source: "Quelle", amount: "Betrag", asset: "Asset", memo: "Memo", message: "Nachricht", txHash: "Transaktions-ID", created: "Erstellt" },
        delete: "Löschen",
        deleteTitle: "Zahlungslink löschen", deleteBody: "„{id}“ wird entfernt. Das kann nicht rückgängig gemacht werden.", deleteConfirm: "Link löschen",
      },
      status: { PENDING: "Ausstehend", SUBMITTED: "Übermittelt", SUCCEEDED: "Erfolgreich", FAILED: "Fehlgeschlagen", CANCELLED: "Storniert", EXPIRED: "Abgelaufen" },
    },
    balances: {
      title: "Guthaben",
      sub: "In Echtzeit direkt auf Ihr Stellar-Konto abgewickelt",
      note: "Cosmos Pay hält Ihre Gelder niemals — jede Zahlung wird in dem Moment, in dem sie getätigt wird, direkt auf Ihr eigenes Stellar-Konto abgewickelt.",
      total: "GESAMTGUTHABEN",
      across: "über 3 Assets",
      explorer: "Im Explorer ansehen",
      recent: "Aktuelle Abwicklungen",
      payment: "Zahlung",
      tableHead: {
        transaction: "Transaktion",
        type: "Typ",
        amount: "Betrag",
        status: "Status",
        date: "Datum"
      }
    },
    customers: {
      title: "Kunden",
      sub: "{n} Kunden",
      add: "Kunde hinzufügen",
      searchPlaceholder: "Kunden durchsuchen…",
      tableHead: {
        name: "Name",
        email: "E-Mail",
        spend: "Gesamtausgaben",
        payments: "Zahlungen",
        since: "Seit"
      },
      empty: "Keine Kunden gefunden.",
      modal: {
        eyebrow: "Kunde",
        title: "Kunde hinzufügen",
        desc: "Erstellen Sie einen Kunden, um Zahlungen und Guthaben zu verfolgen.",
        name: "Name",
        email: "E-Mail",
        add: "Kunde hinzufügen"
      }
    },
    products: {
      title: "Produkte & Links",
      sub: "Wiederkehrende Pläne und Zahlungslinks",
      add: "Neues Produkt",
      tableHead: {
        name: "Name",
        price: "Preis",
        type: "Typ",
        status: "Status"
      },
      types: {
        Recurring: "Wiederkehrend",
        "One-time": "Einmalig",
        "Payment link": "Zahlungslink"
      },
      modal: {
        eyebrow: "Produkt",
        title: "Produkt erstellen",
        desc: "Verkaufen Sie einen Plan, einen einmaligen Artikel oder einen flexiblen Zahlungslink.",
        name: "Name",
        price: "Preis (USDC)",
        priceHint: "(leer lassen für kundenseitige Festlegung)",
        type: "Typ",
        create: "Produkt erstellen"
      }
    },
    apikeys: {
      readOnly: "Du hast nur Lesezugriff — nur Owner und Admins können API-Schlüssel erstellen oder widerrufen.",
      title: "API-Schlüssel",
      sub: "Geheime Schlüssel für die Cosmos Pay API. Erstellen Sie so viele, wie Sie brauchen.",
      create: "Geheimen Schlüssel erstellen",
      tableHead: {
        name: "Name",
        id: "Schlüssel-ID",
        role: "Rolle",
        permissions: "Berechtigungen",
        created: "Erstellt"
      },
      empty: "Noch keine API-Schlüssel.",
      locked: "Gesperrt",
      loading: "API-Schlüssel werden geladen…",
      loadError: "API-Schlüssel konnten nicht geladen werden.",
      createError: "API-Schlüssel konnte nicht erstellt werden.",
      updateError: "API-Schlüssel konnte nicht aktualisiert werden.",
      deleteError: "API-Schlüssel konnte nicht widerrufen werden.",
      revoke: "Widerrufen",
      edit: "Bearbeiten",
      unnamed: "Unbenannter Schlüssel",
      none: "—",
      revokeTitle: "API-Schlüssel widerrufen",
      revokeBody: "„{name}“ wird dauerhaft widerrufen und jede App, die ihn verwendet, funktioniert nicht mehr. Dies kann nicht rückgängig gemacht werden.",
      revokeConfirm: "Schlüssel widerrufen",
      usage: "{used} / {limit}",
      limitReached: "Sie haben das Schlüssel-Limit Ihres Tarifs erreicht. Führen Sie ein Upgrade durch, um weitere hinzuzufügen."
    },
    webhooks: {
      title: "Webhooks",
      sub: "Echtzeit-Ereignisse, wenn Zahlungen auf Stellar abgewickelt werden",
      add: "Endpunkt hinzufügen",
      endpoints: "Endpunkte",
      recent: "Aktuelle Zustellungen",
      eventsCount: "{n} Ereignisse",
      tableHead: {
        url: "URL",
        events: "Ereignisse",
        status: "Status",
        event: "Ereignis",
        response: "Antwort",
        when: "Wann"
      },
      modal: {
        eyebrow: "Webhook",
        title: "Endpunkt hinzufügen",
        desc: "Wir senden Ereignis-Payloads per POST an diese URL.",
        urlLabel: "Endpunkt-URL",
        eventsLabel: "Zu sendende Ereignisse",
        add: "Endpunkt hinzufügen"
      }
    },
    logs: {
      title: "API-Logs",
      sub: "Jede Anfrage an die Cosmos Pay API — klicken Sie auf eine Zeile, um sie zu prüfen",
      searchPlaceholder: "Nach Endpunkt suchen…",
      tableHead: {
        method: "Methode",
        endpoint: "Endpunkt",
        status: "Status",
        time: "Zeit",
        timestamp: "Zeitstempel"
      },
      reqHeaders: "Anfrage-Header",
      params: "Query-/Body-Parameter",
      response: "Antwort",
      meta: "Meta"
    },
    settings: {
      title: "Organisation",
      sub: "Verwalten Sie {org}",
      org: {
        title: "Details",
        name: "Name",
        id: "Organisations-ID",
        created: "Erstellt"
      },
      plan: {
        title: "Plan & Limits",
        change: "Plan ändern",
        current: "Aktueller Plan",
        orgs: "Organisationen",
        apiKeys: "API-Schlüssel",
        unlimited: "Unbegrenzt",
        manage: "Organisationen verwalten",
        changeTitle: "Tarif ändern",
        changeSub: "Ändern Sie Ihren Tarif. Dies ist eine Simulation — es wird nichts berechnet.",
        save: "Tarif aktualisieren",
        liveKeys: "Produktionsschlüssel",
        seats: "Team-Sitze",
        confirmSwitch: "Plan wechseln",
        downgradeNote: "Ressourcen über den neuen Limits werden gesperrt, bis du erneut upgradest.",
        feature: "Funktion",
        youAreHere: "Aktuell",
        upgrade: "Upgrade",
        downgrade: "Downgrade",
        switchTo: "Zu {plan} wechseln",
        price: "Preis",
        perTx: "Pro Transaktion",
        mainnet: "Live-Zahlungen",
        settle: "Abwicklung",
        apiAccess: "API-Zugriff",
        apiLevels: { notifications: "Zahlungsbenachrichtigungen", partial: "Teilweise API", full: "Voll-API" }, perOrgNote: "API-Schlüssel und Mitglieder werden in jeder Organisation verwaltet."
      },
      appearance: {
        title: "Darstellung",
        theme: "Design",
        light: "Hell",
        dark: "Dunkel"
      },
      team: {
        title: "Team",
        add: "+ Mitglied hinzufügen",
        roles: {
          Admin: "Admin",
          Developer: "Entwickler",
          Analyst: "Analyst",
          Viewer: "Betrachter",
          Owner: "Inhaber"
        }
      },
      teamModal: {
        eyebrow: "Team",
        title: "Teammitglied einladen",
        desc: "Sie erhalten eine E-Mail-Einladung, um {org} beizutreten.",
        name: "Vollständiger Name",
        email: "E-Mail",
        role: "Rolle",
        send: "Einladung senden"
      }
    },
    pagination: {
      prev: "Zurück",
      next: "Weiter",
      range: "{from}–{to} von {total}"
    },
    notifications: {
      title: "Benachrichtigungen",
      empty: "Noch keine Benachrichtigungen.",
      loadError: "Benachrichtigungen konnten nicht geladen werden.",
      origin: "Herkunft",
      markAll: "Alle als gelesen markieren",
      types: {
        "auth.login": "Neue Anmeldung",
        "support.reply": "Support-Antwort",
        "apikey.created": "API-Schlüssel erstellt",
        "apikey.updated": "API-Schlüssel aktualisiert",
        "apikey.deleted": "API-Schlüssel widerrufen",
        custom: "Benachrichtigung"
      },
      subtitle: "Anmeldungen und Änderungen in Ihrem Konto",
      viewAll: "Gesamte Aktivität anzeigen",
      location: "Standort",
      device: "Gerät",
      ip: "IP-Adresse",
      localhost: "localhost"
    },
    support: {
      title: "Support",
      subtitle: "Chatten Sie mit dem Cosmos-Pay-Team",
      placeholder: "Nachricht schreiben…",
      send: "Senden",
      empty: "Noch keine Nachrichten. Senden Sie die erste und wir melden uns.",
      loadError: "Konversation konnte nicht geladen werden.",
      sendError: "Nachricht konnte nicht gesendet werden.",
      you: "Sie",
      staff: "Support",
      inboxTitle: "Support-Postfach",
      inboxSubtitle: "Antworten Sie Ihren Nutzern und helfen Sie ihnen",
      conversations: "Konversationen",
      noConversations: "Noch keine Konversationen.",
      selectConversation: "Wählen Sie eine Konversation zum Antworten.",
      customer: "Kunde",
      reply: "Antworten",
      replyPlaceholder: "Antwort schreiben…",
      newTicket: "Neues Ticket",
      newTicketTitle: "Neues Ticket öffnen",
      subjectLabel: "Betreff",
      subjectPlaceholder: "Kurze Zusammenfassung des Problems",
      messageLabel: "Nachricht",
      create: "Ticket öffnen",
      createError: "Ticket konnte nicht geöffnet werden.",
      myTickets: "Meine Tickets",
      lastSeen: "Zuletzt online {when}",
      online: "Online",
      seen: "Gesehen",
      priorities: { low: "Niedrig", normal: "Normal", high: "Hoch", urgent: "Dringend" },
      noTickets: "Noch keine Tickets.",
      selectTicket: "Wähle ein Ticket aus, um es anzuzeigen.",
      tickets: "Tickets",
      all: "Alle",
      statusError: "Status konnte nicht aktualisiert werden.",
      statuses: { open: "Offen", pending: "Ausstehend", resolved: "Gelöst", closed: "Geschlossen" }
    },
    admin: {
      loading: "Loading…",
      loadError: "Couldn't load data.",
      empty: "Nothing here yet.",
      orgFilter: "Organization",
      clearFilter: "Clear filter",
      filters: { all: "All", PENDING: "Pending", SUBMITTED: "Submitted", SUCCEEDED: "Succeeded", FAILED: "Failed" },
      overview: {
        title: "Platform overview", sub: "Global activity across every organization",
        cards: { consumers: "Organizations", customers: "Customers", products: "Products", webhooks: "Webhook endpoints" },
        payments: "Payment intents", swaps: "Swaps", fiat: "Fiat (KYC/KYB)",
        receivers: "Receivers", payins: "Payins", payouts: "Payouts",
        volume: "Settled volume",
        volHead: { asset: "Asset", amount: "Amount", count: "Count" },
      },
      payments: { title: "Payment intents", sub: "All payment intents across organizations", searchPlaceholder: "Search by ID, destination, organization…", empty: "No payment intents.", tableHead: { id: "ID", org: "Organization", destination: "Destination", amount: "Amount", status: "Status", created: "Created" } },
      swaps: { title: "Swaps", sub: "All swaps across organizations", searchPlaceholder: "Search by ID, account, organization…", empty: "No swaps.", tableHead: { id: "Swap", org: "Organization", route: "Sent → received", status: "Status", created: "Created" } },
      fiat: {
        title: "Fiat", sub: "Receivers, payins and payouts across organizations",
        tabs: { receivers: "Receivers", payins: "Payins", payouts: "Payouts" },
        searchReceivers: "Search receivers…", searchPayins: "Search payins…", searchPayouts: "Search payouts…",
        emptyReceivers: "No receivers.", emptyPayins: "No payins.", emptyPayouts: "No payouts.",
        statusUnknown: "Unknown",
        disabled: "Disabled", disable: "Disable", enable: "Enable",
        accountDisabled: "Fiat account disabled", accountEnabled: "Fiat account enabled",
        accessError: "Couldn't update the fiat account.",
        approve: "Approve", approved: "Approved",
        termsSent: "Terms of service sent to {email}",
        approveError: "Couldn't approve the receiver.",
        resendVerification: "Resend verification email",
        verificationSent: "Verification email sent to {email}",
        resendError: "Couldn't resend the verification email.",
        sending: "Sending…",
        receiverHead: { name: "Name", org: "Organization", type: "Type", status: "KYC status", created: "Created" },
        payinHead: { id: "Payin", org: "Organization", asset: "Asset", method: "Method", amount: "Sent → received", status: "Status", created: "Created" },
        payoutHead: { id: "Payout", org: "Organization", asset: "Asset", rail: "Rail", amount: "Sent → received", status: "Status", created: "Created" },
      },
      customers: { title: "Customers", sub: "All customers across organizations", searchPlaceholder: "Search customers…", empty: "No customers.", tableHead: { name: "Name", org: "Organization", email: "Email", account: "Account", created: "Created" } },
      products: { title: "Products", sub: "All products across organizations", searchPlaceholder: "Search products…", empty: "No products.", tableHead: { name: "Name", org: "Organization", price: "Price", kind: "Type", created: "Created" } },
      consumers: { title: "Organizations", sub: "Every API consumer and its activity", searchPlaceholder: "Search organizations…", empty: "No organizations.", account: "Account", moreOrgs: "+{n} more", note: "Totals are per developer account (an account may own several organizations).", tableHead: { org: "Organization", payments: "Payments", swaps: "Swaps", products: "Products", customers: "Customers", receivers: "Receivers", payins: "Payins", payouts: "Payouts", webhooks: "Webhooks", created: "Created" } },
    },
    planNames: {
      community: "Community",
      starter: "Starter",
      essentials: "Essentials",
      growth: "Growth",
      enterprise: "Enterprise"
    },
    roleNames: {
      user: "Benutzer",
      support: "Support",
      admin: "Administrator",
      owner: "Inhaber"
    },
    account: {
      title: "Konto",
      sub: "Verwalte dein persönliches Konto",
      profile: { title: "Profil", name: "Name", email: "E-Mail", role: "Rolle", note: "Name, Foto und Bio bearbeitest du hier.",
        displayName: "Anzeigename", displayNamePlaceholder: "Dein Name", bio: "Bio", bioPlaceholder: "Eine Zeile über dich oder dein Unternehmen",
        edit: "Bearbeiten", save: "Änderungen speichern", saving: "Speichern…", uploadPhoto: "Foto hochladen", changePhoto: "Foto ändern", removePhoto: "Entfernen",
        photoHint: "PNG, JPG oder WebP — quadratisch ist am besten.", saved: "Profil aktualisiert", saveError: "Profil konnte nicht aktualisiert werden.",
        photoTooLarge: "Dieses Bild ist zu groß. Wähle eines unter 8 MB.", photoInvalid: "Diese Datei ist kein unterstütztes Bild.",
        editNote: "E-Mail und Rolle stammen aus deiner Cosmos-Pay-Anmeldung." },
      session: { title: "Sitzung", desc: "Melde dich auf diesem Gerät vom Cosmos-Pay-Dashboard ab.", signOut: "Abmelden" },
    },
    users: {
      title: "Benutzer",
      subtitle: "Rollen und Tarife der Konten verwalten",
      loadError: "Benutzer konnten nicht geladen werden.",
      saveError: "Benutzer konnte nicht aktualisiert werden.",
      saved: "Benutzer aktualisiert",
      search: "Benutzer suchen…",
      name: "Name",
      email: "E-Mail",
      role: "Rolle",
      plan: "Tarif",
      empty: "Keine Benutzer gefunden."
    },
    orgs: {
      permissionsLabel: "Berechtigungen",
      permResource: "Berechtigung",
      resources: { apiKeysTest: "Test-API-Schlüssel", apiKeysLive: "Produktions-API-Schlüssel", webhooks: "Webhooks", products: "Produkte", customers: "Kunden", payments: "Zahlungslinks" },
      actions: { create: "Erstellen", edit: "Bearbeiten", delete: "Löschen" },
      permissions: { apiKeysTest: "Test-API-Schlüssel erstellen", apiKeysLive: "Produktions-API-Schlüssel erstellen", webhooks: "Webhook-Endpunkte erstellen", products: "Produkte erstellen", customers: "Kunden erstellen", payments: "Zahlungslinks erstellen" },
      editMember: "Bearbeiten",
      editMemberTitle: "Mitglied bearbeiten",
      save: "Speichern",
      memberUpdated: "Mitglied aktualisiert",
      memberUpdateError: "Mitglied konnte nicht aktualisiert werden.",
      adminAllNote: "Admins können alles in der Organisation tun.",
      removeMemberTitle: "Mitglied entfernen",
      removeMemberBody: "{name} aus {org} entfernen? Der Zugriff geht sofort verloren.",
      removeMemberConfirm: "Entfernen",
      join: "Beitreten",
      joined: "Organisation beigetreten",
      joinError: "Einladung konnte nicht angenommen werden.",
      bannerTitle: "Du wurdest zu {org} eingeladen",
      bannerSub: "Eingeladen als {role}",
      roleLabel: "Rolle",
      roleMemberHint: "Mitarbeiter können das Dashboard sehen, aber keine API-Schlüssel erstellen oder die Organisation verwalten.",
      roleAdminHint: "Admins können API-Schlüssel erstellen und die Organisation und ihre Mitglieder verwalten.",
      inviteMember: "Mitglied einladen",
      invited: "Einladung gesendet",
      inviteError: "Einladung konnte nicht gesendet werden.",
      inviteHint: "Wir senden einen Magic-Link, der in 3 Tagen abläuft. Sitze gelten pro Organisation.",
      send: "Einladung senden",
      sending: "Senden…",
      pending: "Ausstehende Einladungen",
      expires: "Läuft ab {date}",
      revokeInvite: "Widerrufen",
      revokeError: "Einladung konnte nicht widerrufen werden.",
      loadError: "Organisationen konnten nicht geladen werden.",
      createError: "Organisation konnte nicht erstellt werden.",
      renameError: "Organisation konnte nicht umbenannt werden.",
      deleteError: "Organisation konnte nicht gelöscht werden.",
      rename: "Umbenennen",
      renameTitle: "Organisation umbenennen",
      delete: "Organisation löschen",
      deleteTitle: "Organisation löschen",
      deleteBody: "„{name}“ wird zusammen mit ihren Mitgliedern dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.",
      deleteConfirm: "Löschen",
      members: "Mitglieder",
      membersSub: "Personen mit Zugriff auf diese Organisation",
      addMember: "Mitglied hinzufügen",
      memberEmail: "E-Mail des Mitglieds",
      memberEmailHint: "Die Person muss bereits ein Cosmos-Pay-Konto haben.",
      add: "Hinzufügen",
      remove: "Entfernen",
      you: "Sie",
      roles: {
        owner: "Inhaber",
        admin: "Administrator",
        member: "Mitglied"
      },
      memberAddError: "Mitglied konnte nicht hinzugefügt werden. Stellen Sie sicher, dass die E-Mail zu einem Cosmos-Pay-Konto gehört.",
      memberRemoveError: "Mitglied konnte nicht entfernt werden.",
      empty: "Noch keine Mitglieder."
    },
    swaps: {
      title: "Swaps",
      sub: "{n} swaps · cross-asset on Stellar",
      create: "Create swap",
      readOnly: "You have read-only access to swaps in this organization.",
      searchPlaceholder: "Search by account, asset or ID…",
      filters: { all: "All", PENDING: "Pending", SUBMITTED: "Submitted", SUCCEEDED: "Succeeded", FAILED: "Failed" },
      status: { PENDING: "Pending", SUBMITTED: "Submitted", SUCCEEDED: "Succeeded", FAILED: "Failed" },
      tableHead: { id: "Swap", route: "Sent → received", status: "Status", created: "Created" },
      empty: "No swaps yet. Create one to get an unsigned transaction to sign.",
      loading: "Loading swaps…",
      loadError: "Couldn't load swaps.",
      createError: "Couldn't create the swap.",
      quoteError: "Couldn't price the swap.",
      network: { dev: "Testnet", prod: "Public network" },
      modal: {
        eyebrow: "Swap", title: "Create swap",
        desc: "Swap one Stellar asset for another via a path payment. Get a quote, then sign the transaction.",
        source: "Source account", sourceHint: "Stellar account that sends the swap (G…).",
        amount: "Amount to send", amountHint: "Amount of the source asset (XLM) to swap.",
        destAsset: "Destination asset", destAssetHint: "Asset code to receive (e.g. USDC).",
        destIssuer: "Destination issuer", destIssuerHint: "Required for non-native assets (G…).",
        slippage: "Slippage (bps)", slippageHint: "Max slippage in basis points (optional, e.g. 50).",
        getQuote: "Get quote", quoting: "Pricing…",
        quoteTitle: "Quote",
        estimated: "Estimated received", minimum: "Minimum received",
        fee: "Commission", bps: "bps",
        feeNote: "The commission is your organization plan's rate — applied automatically.",
        create: "Create swap", creating: "Creating…",
      },
      detail: {
        eyebrow: "Swap", title: "Swap ready",
        scan: "Scan to sign", downloadQr: "Download QR",
        uri: "SEP-7 URI", xdr: "Unsigned XDR",
        openWallet: "Open in wallet", viewExplorer: "View on explorer",
        fields: { id: "ID", status: "Status", network: "Network", source: "Source", destination: "Destination", sent: "Sent", received: "Received (est.)", minimum: "Minimum", fee: "Commission", memo: "Memo", txHash: "Transaction ID", created: "Created" },
        submitTitle: "Submit signed transaction",
        submitDesc: "Paste the signed XDR returned by the wallet to broadcast the swap.",
        submitPlaceholder: "Signed transaction XDR…",
        submit: "Submit", submitting: "Submitting…",
        submitted: "Swap submitted",
        submitFailed: "The swap could not be submitted.",
        resultCodes: "Result codes",
      },
    },
    blindpay: {
      title: "Fiat",
      sub: "Onramp & Offramp · KYC/KYB",
      gate: "KYC/KYB verification is required before any onramp or offramp. Create a receiver and complete verification first.",
      readOnly: "You have read-only access to Fiat in this organization.",
      selectCountry: "Select country",
      searchCountry: "Search countries…",
      upload: "Upload", uploading: "Uploading…", replace: "Replace", uploaded: "Uploaded", uploadError: "Couldn't upload the file.", linkMode: "Link", clearFile: "Clear",
      loading: "Loading…",
      loadError: "Couldn't load data.",
      txStatuses: { pending: "Pending", processing: "Processing", on_hold: "On hold", funds_received: "Funds received", completed: "Completed", refunded: "Refunded", partial_refund: "Partially refunded", failed: "Failed", cancelled: "Cancelled", canceled: "Cancelled", expired: "Expired", reversed: "Reversed" },
      kycReturn: {
        eyebrow: "Fiat — activation",
        activating: "Activating your account…",
        activatingBody: "Please wait while we confirm your acceptance.",
        successTitle: "Your account is now active",
        successBody: "You can now add wallets and bank accounts and use onramp & offramp.",
        errorTitle: "Activation failed",
        errorBody: "We couldn't activate your account. Please try again.",
        noTosId: "No terms-of-service id was returned — please try activating again.",
        backToDashboard: "Back to dashboard",
      },
      tabs: { receivers: "Receivers", onramp: "Onramp", offramp: "Offramp" },
      receivers: {
        create: "Create receiver",
        searchPlaceholder: "Search receivers…",
        tableHead: { name: "Name", type: "Type", status: "KYC status", created: "Created" },
        empty: "No receivers yet. Create one to start KYC/KYB.",
        statusUnknown: "Unknown",
        inactive: "Inactive",
        statuses: { inactive: "Inactive", pending_review: "Pending review", pending_user: "Pending customer terms", verifying: "Verifying", approved: "Approved", rejected: "Rejected" },
        disabled: "Disabled",
        disableAccount: "Disable account",
        enableAccount: "Enable account",
        disabledNote: "This fiat account is disabled — onramp/offramp are blocked until re-enabled.",
        accountDisabled: "Fiat account disabled",
        accountEnabled: "Fiat account enabled",
        accessError: "Couldn't update the fiat account.",
        inactiveNote: "Registration only — no KYC data submitted yet.",
        awaitingReview: "Awaiting owner/admin review.",
        reviewTitle: "Review KYC",
        reviewHint: "Review the submitted KYC data, then approve to email the customer the terms of service.",
        approve: "Approve & send terms",
        approving: "Approving…",
        approvedSent: "Approved — terms sent to {email}",
        approveError: "Couldn't approve the receiver.",
        termsSentTitle: "Terms sent",
        termsSentBody: "Awaiting customer acceptance — terms sent to {email}.",
        termsSentBodyNoEmail: "Awaiting customer acceptance of the terms of service.",
        resendTerms: "Resend terms email",
        resendVerification: "Resend verification email",
        verificationSent: "Verification email sent to {email}",
        refresh: "Refresh status",
        refreshing: "Refreshing…",
        refreshError: "Couldn't refresh the KYC status from BlindPay.",
        sending: "Sending…",
        types: { individual: "Individual", business: "Business" },
        createError: "Couldn't create the receiver.",
        tosTitle: "Activate account",
        tosHint: "This receiver is inactive. Accept the terms of service to activate it.",
        activate: "Activate account",
        redirecting: "Redirecting…",
        getTos: "Get terms of service",
        emailTos: "Email terms of service",
        tosUrl: "Terms URL",
        openTerms: "Open terms",
        tosIdLabel: "Terms-of-service ID",
        tosIdHintEnable: "Paste the tos_id from the URL you were redirected to after accepting.",
        enable: "Enable account",
        enabled: "Account enabled",
        tosSent: "Terms of service sent to {email}",
        getTosError: "Couldn't get the terms of service.",
        emailTosError: "Couldn't email the terms of service.",
        enableError: "Couldn't enable the account.",
        modal: {
          eyebrow: "Receiver", title: "Create receiver",
          desc: "A receiver is the KYC (individual) or KYB (business) entity required for onramp/offramp.",
          type: "Type", individual: "Individual (KYC)", business: "Business (KYB)",
          kycType: "Verification level",
          ownersTitle: "Owners (UBO)", ownerN: "Owner {n}", addOwner: "Add owner", removeOwner: "Remove",
          fields: {
            email: "Email", country: "Country",
            first_name: "First name", last_name: "Last name", date_of_birth: "Date of birth", tax_id: "Tax ID", phone_number: "Phone number",
            address_line_1: "Address", city: "City", state_province_region: "State / province / region", postal_code: "Postal code",
            id_doc_country: "ID document country", id_doc_type: "ID document type", id_doc_front_file: "ID document (front)", id_doc_back_file: "ID document (back)",
            selfie_file: "Selfie", proof_of_address_doc_type: "Proof of address type", proof_of_address_doc_file: "Proof of address",
            occupation: "Occupation", account_purpose: "Account purpose", source_of_funds_doc_type: "Source of funds type", source_of_funds_doc_file: "Source of funds document",
            source_of_wealth: "Source of wealth", purpose_of_transactions: "Purpose of transactions", purpose_of_transactions_explanation: "Purpose of transactions — explanation",
            legal_name: "Legal name", alternate_name: "Alternate name", business_type: "Business type", business_industry: "Business industry", business_description: "Business description",
            formation_date: "Formation date", estimated_annual_revenue: "Estimated annual revenue", website: "Website",
            incorporation_doc_file: "Incorporation document", proof_of_ownership_doc_file: "Proof of ownership document",
            ownership_percentage: "Ownership %", title: "Title",
          },
          create: "Create receiver", creating: "Creating…",
        },
        detail: {
          eyebrow: "Receiver",
          id: "ID", blindpayId: "Provider ID", kycStatus: "KYC status", kycType: "Verification level", email: "Email", country: "Country",
          terms: "Terms of service",
          tosOpened: "Terms-of-service flow started.",
          tosError: "Couldn't start the terms-of-service flow.",
          wallets: "Blockchain wallets", noWallets: "No wallets yet.", addWallet: "Add wallet",
          banks: "Bank accounts", noBanks: "No bank accounts yet.", addBank: "Add bank account",
        },
        wallet: {
          name: "Name", network: "Network",
          address: "Address", addressHint: "Wallet address (G… for Stellar).",
          aa: "Account abstraction", add: "Add wallet",
          error: "Couldn't add the wallet.",
        },
        bank: {
          rail: "Rail", name: "Name", beneficiary: "Beneficiary name", country: "Country",
          accountNumber: "Account number", routingNumber: "Routing number",
          add: "Add bank account",
          error: "Couldn't add the bank account.",
        },
      },
      onramp: {
        create: "New payin",
        searchPlaceholder: "Search payins…",
        tableHead: { id: "Payin", asset: "Asset", method: "Method", amount: "Sent → received", status: "Status", created: "Created" },
        empty: "No payins yet.",
        statusUnknown: "Unknown",
        quoteError: "Couldn't price the payin.",
        createError: "Couldn't create the payin.",
        created: "Payin created",
        modal: {
          eyebrow: "Onramp", title: "New payin",
          desc: "Fiat → stablecoin. Price a quote, then create the payin to get funding instructions.",
          walletId: "Wallet ID", walletIdHint: "Receiver wallet that receives the stablecoin.",
          method: "Payment method", token: "Token",
          currencyType: "Amount in", curSender: "Sender", curReceiver: "Receiver",
          amount: "Amount", amountHint: "Minor units (integer), e.g. 10000 = 100.00.",
          getQuote: "Get quote", quoting: "Pricing…",
          quoteId: "Quote ID", youSend: "You send", youReceive: "You receive", expires: "Expires",
          create: "Create payin", creating: "Creating…",
          payinId: "Payin ID", status: "Status",
          instructions: "Funding instructions", done: "Done",
        },
      },
      offramp: {
        create: "New payout",
        searchPlaceholder: "Search payouts…",
        tableHead: { id: "Payout", asset: "Asset", rail: "Rail", amount: "Sent → received", status: "Status", created: "Created" },
        empty: "No payouts yet.",
        statusUnknown: "Unknown",
        quoteError: "Couldn't price the payout.",
        authError: "Couldn't build the transaction to sign.",
        createError: "Couldn't create the payout.",
        created: "Payout created",
        modal: {
          eyebrow: "Offramp", title: "New payout",
          desc: "Stablecoin → fiat. Price a quote; for Stellar, authorize to get the tx, sign it, then submit.",
          bankId: "Bank account ID", bankIdHint: "Receiver bank account that receives the fiat.",
          network: "Network", token: "Token",
          currencyType: "Amount in", curSender: "Sender", curReceiver: "Receiver",
          coverFees: "Cover fees",
          amount: "Amount", amountHint: "Minor units (integer), e.g. 10000 = 100.00.",
          getQuote: "Get quote",
          quoteId: "Quote ID", youSend: "You send", youReceive: "You receive (fiat)", expires: "Expires",
          senderWallet: "Sender wallet", senderWalletHint: "Wallet that holds the stablecoin (G… / 0x…).",
          authorize: "Authorize",
          unsignedTx: "Unsigned transaction",
          signedTx: "Signed transaction", signedTxHint: "Paste the signed transaction returned by the wallet.",
          signedTxPlaceholder: "Signed transaction…",
          evmNote: "For EVM networks, sign the quote's approve contract via the API before creating the payout.",
          create: "Create payout", creating: "Creating…",
        },
      },
    }
  }
};

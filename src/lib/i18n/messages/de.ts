/* de.js: German message catalog. Mirrors en.js exactly in shape. */
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
    goalsSub: "Wählen Sie alles Zutreffende. Wir passen Ihr Dashboard an und schlagen den passenden Tarif vor.",
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
    planSub: "Starter hat keine monatliche Gebühr: Sie zahlen nur pro erfolgreicher Transaktion. Jederzeit wechselbar, ohne Anruf.",
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
    specTagline: "Eine API. Stellar, Solana und Monad.",
    specTaglineSub: "Akzeptieren und bewegen Sie Geld in USDC mit Abwicklung in ~5 Sekunden. Wählen Sie den passenden Tarif und ändern Sie ihn jederzeit.",
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
      standard: "Standard",
      priority: "Priorität"
    },
    plans: {
      starter: {
        desc: "Echte Zahlungen auf Stellar, Solana & Monad annehmen",
        sub: "+ 25¢ / Txn",
        pnote: "1% + 25¢ pro Transaktion",
        team: "Bis zu 2",
        feats: ["Teilweiser API-Zugriff", "Live- und Testschlüssel", "USDC-Abwicklung", "Bis zu 2 Mitglieder"]
      },
      growth: {
        desc: "Niedrigere Tarife für wachsende Teams",
        sub: "/Monat · ab",
        pnote: "ab · 0,2% + 5¢ pro Txn",
        team: "Unbegrenzt",
        feats: ["Alles aus Starter", "Niedrigere Transaktionsgebühr", "Unbegrenzte Mitglieder", "Radar-Betrugstools", "Mengenrabatte", "Prioritäts-Support"]
      }
    }
  },

  /* ---------------- /login ---------------- */

  nav: {
    login: "Anmelden",
    getKeys: "Schlüssel holen",
    dashboard: "Dashboard",
    menu: "Menü",
    docs: "Dokumentation",
    main: "Hauptmenü",
    closeMenu: "Menü schließen",
    theme: "Dunkelmodus",
    language: "Sprache",
    items: {
      products: {
        label: "Produkte",
        cols: [
          {
            head: "Geld annehmen",
            links: [
              {
                t: "Payments",
                s: "Stellar, Solana & Monad"
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
                s: "USDC & Multi-Chain-Assets"
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
    copyright: "© 2026 Cosmos Pay",
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
      tagline: "Deine digitale Welt in Bewegung.",
      headline: "Weniger Code schreiben -> mehr Geld bewegen",
      lede: "Die Zahlungsinfrastruktur für Entwickler. Eine API, um Geld über Stellar, Solana und Monad zu bewegen: Stablecoins und digitale Assets, die in Sekunden abgewickelt werden, in über 130 Ländern, mit Gebühren im Bruchteil eines Cents.",
      getKeys: "API-Schlüssel erhalten",
      trustedBy: "Vertraut von Engineering-Teams bei"
    },
    wallet: {
      title: "Deine digitale Welt in einer Wallet.",
      lede: "Installiere sie in Chrome, probiere sie direkt im Browser aus oder nimm sie aufs Handy mit. Überall dasselbe Konto, auf Stellar, Solana und Monad.",
      chrome: { t: "In Chrome installieren", s: "Offizielle Erweiterung im Chrome Web Store." },
      web: { t: "Im Browser ausprobieren", s: "Web-App jetzt öffnen, ohne Installation." },
      android: { t: "Für Android herunterladen", s: "Signiertes APK. Erlaube \"Unbekannte Apps installieren\" für deinen Browser, öffne die Datei und installiere sie." },
      moreLabel: "Weitere Plattformen",
      versionLabel: "Version",
      download: "Herunterladen",
      more: {
        firefox: { t: "Firefox", s: "Unsigniert. Öffne about:debugging, wähle \"Dieser Firefox\", dann \"Temporäres Add-on laden\" und nimm die manifest.json aus dem Zip." },
        windows: { t: "Windows", s: "SmartScreen warnt beim ersten Mal: \"Weitere Informationen\" und dann \"Trotzdem ausführen\"." },
        macos: { t: "macOS (Apple Silicon)", s: "Gatekeeper blockiert sie beim ersten Mal: Rechtsklick auf die App und \"Öffnen\"." },
        linux: { t: "Linux", s: "AppImage: vorher chmod +x ausführen. Benötigt glibc 2.39 oder neuer." },
      },
      ios: "Eine iOS-Version gibt es noch nicht.",
    },
    devs: {
      title: "Cosmos Pay Wallet im eigenen Startup einbauen?",
      lede: "Ein Befehl und ein Link. Den Rest erledigt dein Coding-Assistent.",
      installTitle: "SDK installieren",
      installDesc: "JavaScript und TypeScript, für Server und Browser. Ein Paket, zwei Einstiegspunkte.",
      llmsTitle: "Gib deinem Assistenten die Docs",
      llmsDesc: "Claude Code, Codex und Cursor lesen das Verzeichnis als reinen Text und können das SDK sofort benutzen.",
      llmsBtn: "llms.txt öffnen",
      docsBtn: "Dokumentation ansehen",
    },
    api: {
      kicker: "// die Plattform",
      title: "Leistungsstarke APIs",
      lede: "Unsere modularen APIs ermöglichen es Entwicklern, komplexe Finanzflüsse in Minuten zu integrieren, nicht in Monaten.",
      docsLink: "API-Dokumentation ansehen",
      cards: {
        payments: {
          title: "Payments",
          desc: "Senden und empfangen Sie Zahlungen auf Stellar, Solana und Monad mit Finalität in Sekunden und nahezu null Gebühren."
        },
        stablecoin: {
          title: "Stablecoins",
          desc: "Wickeln Sie in USDC und anderen Assets auf Stellar, Solana und Monad ab, on-chain und in Echtzeit."
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
      lede: "Gebaut, um die größten Workloads der Welt zu bewältigen und sich in jeden Stack einzufügen, den Sie bereits nutzen.",
      scale: ["API-Anfragen / Tag", "Anfragen / Sek.", "On-Chain-Finalität", "Verfügbarkeit"],
      paths: [
        {
          t: "No-Code",
          d: "Erstellen Sie Zahlungslinks und Rechnungen direkt in Ihrem Dashboard, ganz ohne Engineering.",
          a: "No-Code erkunden"
        },
        {
          t: "Vorgefertigte UI",
          d: "Binden Sie Checkout oder Elements ein und nehmen Sie in Minuten Zahlungen auf Stellar, Solana und Monad an, mit Komponenten, die zu Ihrer Marke passen.",
          a: "Komponenten ansehen"
        },
        {
          t: "Selbst entwickeln",
          d: "Nutzen Sie unsere REST- + GraphQL-APIs, typisierten SDKs und die CLI, um eine vollständig maßgeschneiderte Multi-Chain-Integration zu erstellen.",
          a: "Dokumentation lesen"
        }
      ],
      mockLink: "Zahlungslink · 19.99 USDC",
      mockPay: "Bezahlen"
    },
    solutions: {
      kicker: "// Lösungen",
      title: "Für jedes Geschäftsmodell gebaut.",
      lede: "Von der ersten Transaktion bis zu Milliarden an Volumen: Cosmos Pay passt sich daran an, wie Ihr Unternehmen Geld auf Stellar, Solana und Monad bewegt.",
      eyebrow: "Lösung",
      startBuilding: "Jetzt entwickeln",
      items: {
        pay: {
          t: "Multi-Chain-Zahlungen annehmen",
          d: "Senden und empfangen Sie Zahlungen auf Stellar, Solana und Monad mit Finalität in Sekunden und Gebühren im Bruchteil eines Cents.",
          long: "Nehmen Sie Zahlungen von jedem mit einer Stellar-, Solana- oder Monad-Wallet an. Gelder erreichen in Sekunden Finalität und werden direkt auf Ihr Konto abgewickelt, ohne Rückbuchungen, ohne Zwischenhändler und ohne tagelange Sperren.",
          points: ["Abwicklungsfinalität in Sekunden", "Gebühren im Bruchteil eines Cents", "Senden & empfangen auf Stellar, Solana und Monad", "Echtzeit-Webhooks bei jeder Zahlung"]
        },
        coin: {
          t: "Stablecoin-Abwicklung",
          d: "Wickeln Sie in USDC und anderen Assets auf Stellar, Solana und Monad ab, on-chain und in Echtzeit.",
          long: "Halten und wickeln Sie Guthaben in USDC und anderen regulierten Stablecoins auf Stellar, Solana und Monad ab. Jede Transaktion wird on-chain erfasst und automatisch mit Ihrem Echtzeit-Ledger abgeglichen.",
          points: ["1:1 gedeckte, regulierte Stablecoins", "On-chain, prüfbare Abwicklung", "Echtzeit-Ledger für mehrere Assets", "Automatischer Abgleich"]
        },
        globe: {
          t: "Grenzüberschreitendes Geld",
          d: "Erreichen Sie über 130 Länder über offene, globale Netzwerke, ohne Korrespondenzbanken.",
          long: "Bewegen Sie Geld über Grenzen hinweg genauso wie lokal. Stellar, Solana und Monad erreichen über 130 Länder ohne Korrespondenzbanken, sodass Auszahlungen in Sekunden statt Tagen ankommen.",
          points: ["Über 130 Länder, eine API", "Keine Verzögerungen durch Korrespondenzbanken", "Transparenter FX im Voraus", "Abwicklung in Sekunden"]
        },
        ramp: {
          t: "Ein- & Auszahlungen",
          d: "Verbinden Sie sich mit Stellar-Anchors für Einzahlungen und Auszahlungen in lokaler Währung.",
          long: "Lassen Sie Nutzer über regulierte Stellar-Anchors zwischen lokaler Währung und digitalen Assets wechseln. Ein- und Auszahlungen in Dutzenden lokaler Währungen, vollständig durch die SEP-Standards abgewickelt.",
          points: ["Reguliertes Anchor-Netzwerk", "Dutzende lokaler Währungen", "Standardflüsse nach SEP-6 / SEP-24", "KYC durch den Anchor abgewickelt"]
        },
        wallet: {
          t: "Eingebettete Wallets",
          d: "Erstellen Sie verwahrte oder nicht verwahrte Wallets auf Stellar, Solana und Monad für Ihre Nutzer.",
          long: "Geben Sie jedem Nutzer eine Multi-Chain-Wallet (Stellar, Solana und Monad) in Ihrem Produkt. Wählen Sie verwahrte Wallets, die Sie verwalten, oder nicht verwahrte Wallets, die Ihre Nutzer kontrollieren. Beide werden mit einem einzigen API-Aufruf bereitgestellt.",
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
      title: "Einfach. Sicher. Grenzenlos.",
      items: ["API-Verfügbarkeits-SLA", "p99-Antwortzeit", "unterstützte Länder", "API-Aufrufe / Monat"]
    },
    customers: {
      kicker: "// Kunden",
      title: "Antrieb für Unternehmen jeder Größe.",
      lede: "Von Startups in der Seed-Phase bis zu börsennotierten Unternehmen: Teams bauen und skalieren ihre Zahlungen auf Cosmos Pay.",
      eyebrow: "Kundenbericht",
      readStory: "Bericht lesen",
      readFull: "Vollständigen Bericht lesen",
      items: {
        Northwind: {
          label: "schnellere grenzüberschreitende Abwicklung nach dem Wechsel zu Cosmos Pay.",
          tags: ["Payments", "Stablecoins", "Wallets"],
          story: "Northwind verlagerte seinen globalen Checkout auf Cosmos Pay mit Stellar, Solana und Monad, verkürzte die Abwicklung von Tagen auf Sekunden und senkte die FX-Kosten in über 30 Märkten, und das alles mit einem einzigen abgeglichenen Ledger."
        },
        Lumio: {
          label: "um USDC-Abonnements in 40 Ländern zu starten.",
          tags: ["Billing", "USDC", "Anchors"],
          story: "Lumio ersetzte ein Flickwerk regionaler Zahlungsdienstleister durch Cosmos Pay und startete in nur sechs Wochen USDC-denominierte Abonnements in 40 Ländern mithilfe von Anchors für lokale Ein- und Auszahlungen."
        },
        Helios: {
          label: "über Stellar, Solana und Monad weltweit an Verkäufer abgewickelt.",
          tags: ["Payouts", "Connect", "Ramps"],
          story: "Helios zahlt vollständig on-chain an eine globale Verkäuferbasis aus. Im letzten Jahr wickelte das Unternehmen 2,4 Mrd. $ an Verkäufer in 58 Ländern ab, mit Geldern, die in Sekunden ankommen, und vollständiger On-Chain-Transparenz."
        }
      }
    },
    testimonials: {
      kicker: "// Kundenstimmen",
      title: "Geschätzt von Entwicklern und Finanzteams.",
      items: {
        MC: {
          q: "Cosmos Pay ermöglichte es uns, Geld in Sekunden über Grenzen hinweg zu bewegen. Wir ersetzten drei Anbieter durch eine einzige Multi-Chain-API.",
          r: "VP Engineering, Vertexa"
        },
        DO: {
          q: "Die Dokumentation ist die beste, die ich je genutzt habe. Wir wickelten unsere erste USDC-Zahlung am ersten Tag noch vor dem Mittagessen ab.",
          r: "Founder, Quanta"
        },
        PN: {
          q: "Der Abgleich dauerte früher eine Woche. Die On-Chain-Abwicklung erledigt das jetzt in Echtzeit für uns.",
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
          d: "Wie Teams Geld auf Stellar, Solana und Monad im globalen Maßstab bewegen."
        },
        {
          tag: "Changelog",
          t: "Multi-Chain-Abwicklungs-Webhooks sind allgemein verfügbar",
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
    marketplace: {
      title: "Und wenn du auch verkaufen willst?",
      lede: "Cosmos ist der Marktplatz desselben Ökosystems. Dort stellen Händler ein, was sie verkaufen, und kassieren über genau die Infrastruktur, die du hier einbindest. Dasselbe Universum, die andere Seite der Theke.",
      btn: "Cosmos entdecken",
    },
    cta: {
      label: "Eine neue Art, deine digitale Welt zu bewegen.",
      thanks: "Danke für dein Vertrauen.",
      title: "Beginnen Sie noch heute zu entwickeln.",
      desc: "Erstellen Sie eine kostenlose Testnet-Sandbox und gehen Sie auf Stellar, Solana und Monad live, sobald Sie bereit sind.",
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
    lede: "Transparente, nutzungsbasierte Preise. Ohne monatliche Gebühr starten und nur eine kleine Gebühr pro erfolgreicher Transaktion zahlen.",
    monthly: "Monatlich",
    annual: "Jährlich",
    save: "−17%",
    popular: "Am beliebtesten",
    from: "ab",
    perMo: "/Mon.",
    billedYearly: "jährliche Abrechnung",
    plans: [
      {
        name: "Starter",
        desc: "Nehmen Sie echte Zahlungen ohne monatliche Gebühr und mit integrierter Zahlungsabsicherung an.",
        amt: "1%",
        txt: "+ 25¢ pro Transaktion *",
        cta: "Jetzt starten",
        feats: ["Live-Zahlungen", "Test-API-Schlüssel", "Zahlungsabsicherung", "Teilweiser API-Zugriff", "Standard-Support", "Streitfalllösung", "Karten & Banküberweisungen"]
      },
      {
        name: "Essentials",
        desc: "Voller Plattformzugriff mit Streitfalllösung und jeder Zahlungsmethode.",
        txt: "+ 0.5% + 10¢ pro Transaktion *",
        cta: "Essentials wählen",
        feats: ["Alles aus Starter", "Voller API-Zugriff", "Zahlungsabsicherung", "Streitfalllösung", "Karten & Banküberweisungen", "Bevorzugter E-Mail-Support", "Mengenrabatte"]
      },
      {
        name: "Growth",
        desc: "Niedrigere Tarife und mehr Leistung für wachsende Teams.",
        txt: "+ 0.2% + 5¢ pro Transaktion *",
        cta: "Growth wählen",
        feats: ["Alles aus Essentials", "Transaktionstarif von 0.2% + 5¢", "Unbegrenzte Teammitglieder", "Erweiterte Betrugserkennung", "Mengenrabatte", "Bevorzugter Support", "Intelligentes Payment-Routing"]
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
    footnote: "* Jede Transaktion enthält zusätzlich eine kleine Netzwerkgebühr. Starter deckt unsere zentralen Zahlungsfunktionen ab; Essentials und Growth schalten vollen API-Zugriff, Streitfalllösung und jede Zahlungsmethode frei, einschließlich Karten und Banküberweisungen.",
    compareTitle: "Pläne vergleichen",
    orgsRow: "Organisationen",
    seatsRow: "Mitglieder pro Organisation",
    keysRow: "API-Schlüssel",
    compareHead: ["Funktion", "Starter", "Essentials", "Growth", "Enterprise"],
    compare: [
      {
        l: "Monatliche Gebühr",
        v: ["Keine", "$33 / mo", "$99 / mo", "Individuell"]
      },
      {
        l: "Gebühr pro Transaktion",
        v: ["1% + 25¢", "0.5% + 10¢", "0.2% + 5¢", "Individuell"]
      },
      {
        l: "Abwicklungsgeschwindigkeit",
        v: ["~5 sec", "~5 sec", "~5 sec", "~5 sec"]
      },
      {
        l: "API-Zugriff",
        v: ["Teilweise", "Voll", "Voll", "Voll"]
      },
      {
        l: "Live-Zahlungen",
        v: [1, 1, 1, 1]
      },
      {
        l: "Zahlungsabsicherung",
        v: [1, 1, 1, 1]
      },
      {
        l: "Streitfalllösung",
        v: [0, 1, 1, 1]
      },
      {
        l: "Karten & Banküberweisungen",
        v: [0, 1, 1, 1]
      },
      {
        l: "Erweiterte Betrugserkennung",
        v: [0, 0, 1, 1]
      },
      {
        l: "Mengenrabatte",
        v: [0, 0, 1, 1]
      },
      {
        l: "SSO / SAML",
        v: [0, 0, 0, 1]
      },
      {
        l: "Support",
        v: ["Standard", "Bevorzugter E-Mail-Support", "Bevorzugt", "24/7 dediziert"]
      }
    ],
    faqTitle: "Häufig gestellte Fragen",
    faqs: [
      {
        q: "Muss ich eine monatliche Gebühr zahlen?",
        a: "Nein. Starter hat keine monatliche Gebühr: Sie zahlen nur eine kleine Gebühr pro erfolgreicher Transaktion. Essentials und Growth kosten eine monatliche Gebühr und bieten dafür niedrigere Tarife."
      },
      {
        q: "Was kostet eine Transaktion?",
        a: "Starter kostet 1% + 25¢ pro erfolgreicher Transaktion. Essentials kostet $33/mo (oder $27.50/mo bei jährlicher Abrechnung) und senkt den Tarif auf 0.5% + 10¢, während Growth $99/mo kostet und ihn auf 0.2% + 5¢ senkt. Jede Transaktion verursacht zusätzlich eine kleine Netzwerkgebühr."
      },
      {
        q: "Welche Zahlungsmethoden unterstützen Sie?",
        a: "Starter deckt unsere zentralen Zahlungsmethoden ab. Ab Essentials können Sie auch Karten, Banküberweisungen und andere lokale Zahlungsmethoden über eine einzige Integration akzeptieren."
      },
      {
        q: "Wie schnell wird Geld abgewickelt?",
        a: "Zahlungen erreichen in etwa fünf Sekunden Finalität, in jedem Plan. Es gibt keine tagelangen Auszahlungsverzögerungen."
      },
      {
        q: "Kann ich den Plan später ändern?",
        a: "Selbstverständlich. Führen Sie jederzeit ein Upgrade oder Downgrade über Ihr Dashboard durch. Änderungen treten sofort in Kraft, kein Anruf erforderlich."
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
      swaps: "Swaps", crossChainSwaps: "Chain-übergreifende Swaps",
      liquidity: "Liquiditätspools",
      blindpay: "Fiat",
      developers: "API-Schlüssel",
      webhook: "Webhooks",
      logs: "API-Logs",
      weblogs: "Webhook-Logs",
      activityLog: "Client-Aktivität",
      settings: "Organisation",
      account: "Konto",
      activity: "Aktivität",
      support: "Support",
      inbox: "Support-Postfach",
      users: "Benutzer",
      adminOverview: "Platform overview",
      adminPayments: "Payments (all orgs)",
      adminSwaps: "Swaps (all orgs)",
      adminFiat: "Fiat (all orgs)",
      adminCustomers: "Customers (all orgs)",
      adminProducts: "Products (all orgs)",
      adminConsumers: "Organizations"
    },
    sidebar: {
      label: "Dashboard",
      menu: { main: "Hauptmenü", preferences: "Präferenzen" },
      groups: { payments: "Zahlungen", swaps: "Swaps", developers: "Entwickler", settings: "Einstellungen", help: "Hilfe", admin: "Admin" },
      notifications: "Benachrichtigungen",
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
        swaps: "Swaps", crossChainSwaps: "Cross-Chain",
        liquidity: "Liquidität",
        blindpay: "Fiat",
        developers: "API-Schlüssel",
        webhook: "Webhooks",
        logs: "Logs",
        weblogs: "Webhook-Logs",
        activityLog: "Aktivitätsprotokoll",
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
      locked: "Gesperrt: Upgrade für Zugriff",
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
      actions: "Aktionen",
      details: "Details",
      cancel: "Abbrechen",
      copy: "Kopieren",
      copyLink: "Link kopieren",
      export: "Exportieren",
      vsLastWeek: "ggü. Vorwoche",
      optional: "(optional)",
      viewPlans: "Pläne ansehen",
      yes: "Ja",
      no: "Nein",
      assetCustom: "Benutzerdefiniert…",
      assetAny: "Beliebig"
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
        scopeResources: { payments: "Zahlungen", swaps: "Swaps", liquidity: "Liquidität", webhooks: "Webhooks", products: "Produkte", customers: "Kunden", kyc: "KYC", onramp: "On-Ramp", offramp: "Off-Ramp", activity: "Aktivität" },
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
        body: "Dies ist das einzige Mal, dass Sie dieses Geheimnis sehen. Kopieren Sie es jetzt und bewahren Sie es sicher auf. Aus Sicherheitsgründen können Sie es nicht erneut anzeigen.",
        idLabel: "Schlüssel-ID",
        saved: "Ich habe meinen Schlüssel gespeichert"
      }
    },
    overview: {
      hub: { crumb: "Übersicht", active: "Aktiv", since: "Seit {date}", settled: "Abgewickeltes Volumen", noVolume: "Noch keine abgewickelten Zahlungen", moreAssets: "+{n} weitere", rate: "Satz", plan: "Tarif", orgId: "Organisations-ID", createLink: "Zahlungslink erstellen", docs: "Dokumentation", designs: "Checkout-Designs", kpiTotal: "Zahlungen gesamt", kpiSucceeded: "Erfolgreich", kpiFailed: "Fehlgeschlagen", kpiRate: "Erfolgsquote", activity: "Zahlungsaktivität", period7: "7 Tage", period30: "30 Tage", periods: { today: "Heute", week: "Woche", month: "Monat", year: "Jahr" }, noPeriodTx: "Keine abgewickelten Zahlungen in diesem Zeitraum.", sumVolume: "Abgewickeltes Volumen", sumCount: "Zahlungen", sumPayers: "Zahler", sumWebhooks: "Webhook-Zustellungen", sumWebhooksFailed: "{n} fehlgeschlagen", growthVs: "{pct} gegenüber den {n} Tagen davor", legendVolume: "Volumen", legendCount: "Zahlungen", chartLabel: "Erstellte Zahlungen und abgewickeltes Volumen pro Tag in den letzten {n} Tagen.", transactions: "Neueste abgewickelte Zahlungen", viewAll: "Alle Zahlungen ansehen", thId: "Zahlung", thDate: "Datum", thAmount: "Betrag", thNetwork: "Netzwerk", thTo: "Bezahlt an", thStatus: "Status", chartPeriods: { day: "Täglich", week: "Wöchentlich", month: "Monatlich", year: "Jährlich" }, chartLabels: { day: "Erstellte Zahlungen und abgewickeltes Volumen pro Tag in den letzten 30 Tagen.", week: "Erstellte Zahlungen und abgewickeltes Volumen pro Woche in den letzten 12 Wochen.", month: "Erstellte Zahlungen und abgewickeltes Volumen pro Monat in den letzten 12 Monaten.", year: "Erstellte Zahlungen und abgewickeltes Volumen pro Jahr in den letzten 5 Jahren." }, sumFailed: "Fehlgeschlagen", sumGrowth: "Wachstum", growthTitle: "Gegenüber dem Zeitraum davor", growthVolume: "Volumen", growthCount: "Zahlungen", prevOrg: "Vorherige Organisation", nextOrg: "Nächste Organisation", created: "Erstellt am {date}", fee: "Gebühr", txTitle: "Transaktionen", thFrom: "Bezahlt von", thMemo: "Memo", onlySettled: "Nur abgewickelte", network: "Netzwerk", allNetworks: "Alle Netzwerke", wallet: "Wallet", applyFilters: "Liste filtern", filtersLabel: "Transaktionen filtern", noTx: "Keine Zahlungen in diesem Zeitraum.", noMatch: "Keine Zahlung passt zu diesen Filtern.", shown: "{n} von {total} Zahlungen", rowMenu: "Aktionen für Zahlung {id}", copyId: "ID kopieren", explorer: "Im Explorer ansehen", openPayments: "In Zahlungen öffnen", status: { SUCCEEDED: "Abgewickelt", FAILED: "Fehlgeschlagen", CANCELLED: "Storniert", EXPIRED: "Abgelaufen", PENDING: "Ausstehend", SUBMITTED: "Wird bestätigt" }, searchPlaceholder: "Nach ID, Adresse, Betrag oder Asset suchen…", groups: { settled: "Abgewickelt", open: "In Bearbeitung", failed: "Fehlgeschlagen" } },
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
      sub: "{n} Zahlungen · sofort on-chain abgewickelt",
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
        desc: "Zahlungen werden sofort auf Stellar, Solana oder Monad abgewickelt, ohne Haltefrist.",
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
      reveal: "Geheimnis anzeigen", secret: "Signatur-Geheimnis", secretNote: "Nur einmal angezeigt. Sicher aufbewahren.",
      rotate: "Geheimnis erneuern", ping: "Test senden", pingOk: "Testereignis zugestellt", pingFail: "Testereignis fehlgeschlagen",
      deliveries: "Letzte Zustellungen", noDeliveries: "Noch keine Zustellungen.", redeliver: "Erneut senden",
      enable: "Aktivieren", disable: "Deaktivieren",
      delete: "Löschen", deleteConfirm: "Löschen", confirmDelete: "Kann nicht rückgängig gemacht werden.",
      customerSet: "Freier Betrag", allEvents: "Alle Ereignisse", events: "Ereignisse",
      received: "Empfangen", pending: "Ausstehend", settledNote: "In Echtzeit direkt auf Ihr Konto abgewickelt.",
      custDetail: { title: "Kunde", edit: "Bearbeiten", save: "Änderungen speichern", alias: "Alias", note: "Notiz", account: "Stellar-Konto", payments: "Zahlungen", onChain: "On-chain", noPayments: "Noch keine Zahlungen." },
    },
    filters: { label: "Liste filtern", status: "Status", network: "Netzwerk", kind: "Typ", allStatuses: "Alle", allNetworks: "Alle Netzwerke", allKinds: "Alle Typen", date: "Datum", dates: { any: "Beliebiges Datum", today: "Heute", "7d": "Letzte 7 Tage", "30d": "Letzte 30 Tage", "90d": "Letzte 90 Tage" }, shown: "{n} von {total}", clear: "Filter zurücksetzen", noMatch: "Nichts passt zu diesen Filtern." },
    tokens: { custom: "Anderer Token…", ticker: "Token-Symbol", tickerHint: "Wie der Token heißt, z. B. USDC.", address: { solana: "Token-Mint", monad: "Token-Vertrag" }, addressHint: { solana: "Die SPL-Mint-Adresse des Tokens.", monad: "Die ERC-20-Vertragsadresse des Tokens." } },
    paylinks: {
      design: { label: "Checkout-Design", hint: "So sieht der gehostete Checkout dieses Links aus. Du kannst es jederzeit ändern.", preview: "Vorschau", saved: "Checkout-Design aktualisiert", saveError: "Das Checkout-Design konnte nicht geändert werden", current: "Aktuell" },
      title: "Zahlungslinks",
      sub: "{n} Links · Stellar, Solana und Monad",
      create: "Zahlungslink erstellen",
      searchPlaceholder: "Nach ID, Adresse, Memo oder Betrag suchen…",
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
        desc: "Ein Link und ein QR-Code, den Ihr Kunde aus seiner Wallet bezahlt, auf Stellar, Solana oder Monad.",
        kind: "Typ", kindPay: "Zahlungslink (Kunde zahlt)", kindTx: "Transaktion (Quelle bekannt)",
        kindPayHint: "Kein Quellkonto: liefert eine Pay-URI + QR.",
        kindTxHint: "Quelle bekannt: liefert eine unsignierte Transaktion zum Signieren.",
        destination: "Ziel", destinationHint: "Stellar-Konto, das die Mittel empfängt (G…).",
        source: "Quelle", sourceHint: "Stellar-Konto des Zahlers (G…).",
        amount: "Betrag", amountHint: "Leer lassen, damit der Zahler wählt (Spenden).",
        asset: "Asset", assetIssuer: "Asset-Emittent", assetIssuerHint: "Erforderlich für nicht-native Assets (G…).",
        memo: "Memo", memoHint: "Numerische MEMO_ID; wird automatisch generiert, wenn leer.",
        message: "Nachricht", messageHint: "Wird dem Zahler in seiner Wallet angezeigt (≤ 300 Zeichen).",
        chain: "Netzwerk", chainTest: "In der Sandbox wird auf {chain} {network} abgewickelt, mit Testguthaben.", chainLive: "Es wird im {chain}-Mainnet abgewickelt, mit echtem Guthaben.", destinationHints: { stellar: "Stellar-Konto, das die Mittel erhält (G…).", solana: "Solana-Adresse, die die Mittel erhält (base58).", monad: "Monad-Adresse, die die Mittel erhält (0x…)." }, amountMonad: "Auf Monad erforderlich: Am genauen Betrag wird die Zahlung erkannt.", memoHintOther: "Eine Zahl, die verhindert, dass ein erneuter Versuch einen zweiten Link erstellt; wird erzeugt, wenn leer.", submitting: "Wird erstellt…",
        submit: "Link erstellen",
      },
      detail: {
        checkout: "Bezahlseite", openCheckout: "Bezahlseite öffnen",
        eyebrow: "Zahlungslink", title: "Zahlungslink bereit",
        scan: "Zum Bezahlen scannen", downloadQr: "QR herunterladen",
        uri: "SEP-7-URI", xdr: "Unsigniertes XDR",
        uriLabels: { stellar: "SEP-7-URI", solana: "Solana-Pay-URI", monad: "EIP-681-URI" },
        openWallet: "In Wallet öffnen", copyLink: "Link kopieren", copyUri: "URI kopieren",
        fields: { id: "ID", status: "Status", kind: "Typ", network: "Netz", destination: "Ziel", source: "Quelle", amount: "Betrag", asset: "Asset", memo: "Memo", message: "Nachricht", txHash: "Transaktions-ID", created: "Erstellt" },
        delete: "Löschen",
        deleteTitle: "Zahlungslink löschen", deleteBody: "„{id}“ wird entfernt. Das kann nicht rückgängig gemacht werden.", deleteConfirm: "Link löschen",
      },
      status: { PENDING: "Ausstehend", SUBMITTED: "Übermittelt", SUCCEEDED: "Erfolgreich", FAILED: "Fehlgeschlagen", CANCELLED: "Storniert", EXPIRED: "Abgelaufen" },
    },
    balances: {
      title: "Guthaben",
      sub: "In Echtzeit direkt in Ihre eigene Wallet abgewickelt",
      note: "Cosmos Pay hält Ihre Gelder niemals: Jede Zahlung wird in dem Moment, in dem sie getätigt wird, direkt in Ihre eigene Wallet (auf Stellar, Solana oder Monad) abgewickelt.",
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
      readOnly: "Du hast nur Lesezugriff. Nur Owner und Admins können API-Schlüssel erstellen oder widerrufen.",
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
      none: "Keine",
      revokeTitle: "API-Schlüssel widerrufen",
      revokeBody: "„{name}“ wird dauerhaft widerrufen und jede App, die ihn verwendet, funktioniert nicht mehr. Dies kann nicht rückgängig gemacht werden.",
      revokeConfirm: "Schlüssel widerrufen",
      usage: "{used} / {limit}",
      limitReached: "Sie haben das Schlüssel-Limit Ihres Tarifs erreicht. Führen Sie ein Upgrade durch, um weitere hinzuzufügen."
    },
    webhooks: {
      title: "Webhooks",
      sub: "Echtzeit-Ereignisse, wenn Zahlungen auf Stellar, Solana oder Monad abgewickelt werden",
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
    activityLog: {
      sub: "Was die Wallet und dieses Dashboard über sich selbst gemeldet haben, auch das, was nie zu einem API-Aufruf wurde",
      searchPlaceholder: "Ereignisse suchen…",
      empty: "Noch keine Aktivität gemeldet.",
      context: "Kontext",
      props: "Details",
      topErrors: "Häufigste Fehler",
      cards: { total: "Ereignisse", errors: "Fehler", sessions: "Sitzungen", devices: "Geräte" },
      sources: { all: "Alle Quellen", wallet: "Wallet", dashboard: "Dashboard", server: "Server", sdk: "SDK" },
      levels: { all: "Alle Stufen", error: "Fehler", warn: "Warnung", info: "Info", debug: "Debug" },
      tableHead: { level: "Stufe", source: "Quelle", event: "Ereignis", detail: "Detail", timestamp: "Zeitstempel", count: "Anzahl" },
    },
    logs: {
      title: "API-Logs",
      sub: "Jede Anfrage an die Cosmos Pay API (klicken Sie auf eine Zeile, um sie zu prüfen)",
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
        changeSub: "Ändern Sie Ihren Tarif. Dies ist eine Simulation, daher wird nichts berechnet.",
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
        payments: "Payment intents", swaps: "Swaps", chainSwaps: "Swaps auf Solana & Monad", crossChainSwaps: "Cross-Chain-Swaps", fiat: "Fiat (KYC/KYB)",
        receivers: "Receivers", payins: "Payins", payouts: "Payouts",
        volume: "Settled volume",
        volHead: { asset: "Asset", amount: "Amount", count: "Count" },
      },
      payments: { title: "Payment intents", sub: "All payment intents across organizations", searchPlaceholder: "Search by ID, destination, organization…", empty: "No payment intents.", tableHead: { id: "ID", org: "Organization", destination: "Destination", amount: "Amount", status: "Status", created: "Created" } },
      swaps: { venues: { stellar: "Stellar", solana: "Solana · Jupiter", monad: "Monad · Kuru Flow", crossChain: "Cross-Chain" }, crossStatus: { AWAITING_DEPOSIT: "Wartet auf Einzahlung", PROCESSING: "In Bearbeitung", REFUNDED: "Erstattet" }, title: "Swaps", sub: "All swaps across organizations", searchPlaceholder: "Search by ID, account, organization…", empty: "No swaps.", tableHead: { id: "Swap", org: "Organization", route: "Sent → received", status: "Status", created: "Created" } },
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
        photoHint: "PNG, JPG oder WebP. Quadratisch ist am besten.", saved: "Profil aktualisiert", saveError: "Profil konnte nicht aktualisiert werden.",
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
      sub: "{n} Swaps · auf einer Chain oder zwischen Stellar, Solana und Monad",
      create: "Neuer Swap",
      readOnly: "Sie haben in dieser Organisation nur Lesezugriff auf Swaps.",
      groups: { open: "In Bearbeitung", succeeded: "Erfolgreich", refunded: "Erstattet", failed: "Fehlgeschlagen", expired: "Abgelaufen" },
      typeLabel: "Typ",
      types: { all: "Alle Typen", same: "Auf einer Chain", cross: "Zwischen Chains" },
      form: { desc: "Wählen Sie, was Sie senden und was Sie erhalten. Auf einer Chain handelt es ihr Markt; zwischen Chains wickelt NEAR Intents es ab. Nichts läuft über Cosmos Pay.", from: "Sie senden", to: "Sie erhalten", chain: "Chain", asset: "Asset", amountHint: "Wie viel des Assets Sie senden.", flip: "Gesendetes und Empfangenes tauschen", routeLine: "Route: {route}", route: "Route", venueCross: "NEAR Intents" },
      searchPlaceholder: "Nach ID, Adresse oder Asset suchen…",
      filters: { all: "Alle", PENDING: "Ausstehend", SUBMITTED: "Übermittelt", SUCCEEDED: "Erfolgreich", FAILED: "Fehlgeschlagen", EXPIRED: "Abgelaufen" },
      status: { PENDING: "Ausstehend", SUBMITTED: "Übermittelt", SUCCEEDED: "Erfolgreich", FAILED: "Fehlgeschlagen", EXPIRED: "Abgelaufen" },
      tableHead: { id: "Swap", route: "Gesendet → empfangen", status: "Status", created: "Erstellt", chains: "Chains" },
      empty: "Noch keine Swaps. Erstellen Sie einen, um eine unsignierte Transaktion zum Signieren zu erhalten.",
      loading: "Swaps werden geladen…",
      loadError: "Swaps konnten nicht geladen werden.",
      createError: "Der Swap konnte nicht erstellt werden.",
      quoteError: "Der Swap konnte nicht bepreist werden.",
      network: { dev: "Testnet", prod: "Öffentliches Netz" },
      chainLabel: "Chain",
      chains: { stellar: "Stellar", solana: "Solana", monad: "Monad" },
      venues: { stellar: "Stellar-DEX", solana: "Jupiter", monad: "Kuru Flow" },
      mainnetOnly: "Swaps auf Solana und Monad laufen nur im Mainnet. Wechseln Sie in den Live-Modus, um sie zu nutzen.",
      chainModal: {
        desc: "Tauschen Sie zwei Assets auf {chain} über {venue}, das jede Liquiditätsquelle der Chain durchsucht. Holen Sie ein Quote und signieren Sie dann die Transaktion in der Wallet.",
        sourceHint: { solana: "Solana-Wallet, die signiert, zahlt und empfängt (base58).", monad: "Monad-Wallet, die signiert, zahlt und empfängt (0x…)." },
        sourceAsset: "Zu sendendes Asset", sourceAssetHint: "{native} oder die Mint- / Vertragsadresse des Tokens.",
        destAssetHint: "{native} oder die Mint- / Vertragsadresse des Tokens.",
        feeNote: "Die Provision ist der Satz Ihres Organisationsplans und wird vom Output abgezogen.",
      },
      chainDetail: {
        title: "Swap bereit zum Signieren",
        transaction: "Zu signierende Transaktion", approval: "Zuerst zu sendende Freigabe",
        approvalNote: "Die Allowance der Wallet für diesen Token reicht nicht: Senden und bestätigen Sie diesen approve-Aufruf, bevor Sie den Swap signieren.",
        provider: "Gebaut von", expires: "Signieren bis",
        submitDesc: "Fügen Sie die von der Wallet signierte Transaktion ein (Solana: base64; Monad: rohe 0x-Transaktion).",
        submitPlaceholder: "Signierte Transaktion…",
      },
      modal: {
        eyebrow: "Swap", title: "Neuer Swap",
        desc: "Tauschen Sie ein Stellar-Asset per Path Payment gegen ein anderes. Holen Sie ein Quote und signieren Sie dann die Transaktion.",
        source: "Quellkonto", sourceHint: "Stellar-Konto, das den Swap sendet (G…).",
        sourceAsset: "Zu sendendes Asset", sourceIssuer: "Herausgeber der Quelle", sourceAssetHint: "XLM oder ein Asset, das dieses Konto hält.",
        amount: "Zu sendender Betrag", amountHint: "Menge des Quell-Assets, die getauscht wird.",
        destAsset: "Ziel-Asset", destAssetHint: "Code des zu empfangenden Assets (z. B. USDC).",
        destIssuer: "Herausgeber des Ziels", destIssuerHint: "Erforderlich für nicht-native Assets (G…).",
        slippage: "Slippage (bps)", slippageHint: "Maximale Slippage in Basispunkten (optional, z. B. 50).",
        destination: "Zielkonto", destinationHint: "Optional. Erhält das Ergebnis; leer lassen, um auf dem Quellkonto zu empfangen. Es muss dem Asset vertrauen.", memo: "Memo", memoHint: "Optional. Eine Zahl (MEMO_ID), die für Ihren Abgleich on-chain gespeichert wird.",
        getQuote: "Quote holen", quoting: "Wird bepreist…",
        quoteTitle: "Quote",
        swapped: "Getauscht nach Provision",
        estimated: "Voraussichtlich erhalten", minimum: "Mindestens erhalten",
        fee: "Provision", bps: "bps",
        feeNote: "Die Provision ist der Satz Ihres Organisationsplans und wird automatisch angewendet.",
        create: "Swap erstellen", creating: "Wird erstellt…",
      },
      detail: {
        eyebrow: "Swap", title: "Swap bereit",
        scan: "Zum Signieren scannen", downloadQr: "QR herunterladen",
        uri: "SEP-7-URI", xdr: "Unsigniertes XDR",
        openWallet: "In Wallet öffnen", viewExplorer: "Im Explorer ansehen",
        fields: { id: "ID", status: "Status", network: "Netz", source: "Quelle", destination: "Ziel", sent: "Gesendet", received: "Erhalten (geschätzt)", minimum: "Minimum", fee: "Provision", memo: "Memo", commissionMemo: "Provisions-Memo", txHash: "Transaktions-ID", created: "Erstellt" },
        submitTitle: "Signierte Transaktion übermitteln",
        submitDesc: "Fügen Sie das von der Wallet zurückgegebene signierte XDR ein, um den Swap zu übertragen.",
        submitPlaceholder: "Signiertes Transaktions-XDR…",
        submit: "Übermitteln", submitting: "Wird übermittelt…",
        submitted: "Swap übermittelt",
        submitFailed: "Der Swap konnte nicht übermittelt werden.",
        resultCodes: "Ergebniscodes",
      },
    },
    crossChain: {
      title: "Chain-übergreifende Swaps",
      sub: "{n} Swaps · Stellar ⇄ Solana ⇄ Monad über NEAR Intents",
      create: "Neuer Cross-Chain-Swap",
      readOnly: "Du hast in dieser Organisation nur Lesezugriff auf Swaps.",
      mainnetOnly: "NEAR Intents wickelt nur im Mainnet ab. Im Testmodus kannst du Assets ansehen und Quotes holen; wechsle in den Live-Modus, um einen Swap zu eröffnen.",
      searchPlaceholder: "Nach Adresse, Asset oder ID suchen…",
      filters: { all: "Alle", open: "Laufend", SUCCEEDED: "Erfolgreich", REFUNDED: "Erstattet", FAILED: "Fehlgeschlagen", EXPIRED: "Abgelaufen" },
      status: { AWAITING_DEPOSIT: "Wartet auf Einzahlung", DEPOSIT_DETECTED: "Einzahlung erkannt", INCOMPLETE_DEPOSIT: "Unvollständige Einzahlung", PROCESSING: "In Bearbeitung", SUCCEEDED: "Erfolgreich", REFUNDED: "Erstattet", FAILED: "Fehlgeschlagen", EXPIRED: "Abgelaufen" },
      tableHead: { id: "Swap", route: "Gesendet → empfangen", status: "Status", created: "Erstellt" },
      empty: "Noch keine Cross-Chain-Swaps.",
      loading: "Swaps werden geladen…",
      loadError: "Cross-Chain-Swaps konnten nicht geladen werden.",
      createError: "Der Swap konnte nicht eröffnet werden.",
      quoteError: "Der Swap konnte nicht bepreist werden.",
      modal: {
        eyebrow: "Cross-Chain-Swap", title: "Neuer Cross-Chain-Swap",
        desc: "Sende ein Asset auf einer Chain und empfange ein anderes auf einer anderen Chain. NEAR Intents wickelt ab; nichts läuft über Cosmos Pay.",
        from: "Von", to: "Nach", chain: "Chain", asset: "Asset", assetsLoading: "Assets werden geladen…",
        amount: "Zu sendender Betrag", recipient: "Empfänger", recipientHint: "Adresse auf der Ziel-Chain, die den Output erhält.",
        refundTo: "Erstattungsadresse", refundToHint: "Adresse auf der Ursprungs-Chain, die die Einzahlung zurückbekommt, wenn der Swap scheitert.",
        slippage: "Slippage (bps)", slippageHint: "Optional, z. B. 100. Unter dem Minimum erstattet NEAR Intents.",
        getQuote: "Quote holen", quoting: "Wird bepreist…", quoteTitle: "Quote",
        estimated: "Erhältst du (geschätzt)", minimum: "Mindestens", fee: "Provision", eta: "Geschätzte Dauer", seconds: "s",
        feeNote: "Die Provision ist der Satz deines Organisationsplans und wird vom Input abgezogen.",
        create: "Swap eröffnen", creating: "Wird eröffnet…",
      },
      detail: {
        eyebrow: "Cross-Chain-Swap", title: "Swap finanzieren",
        pay: "Sende genau {amount} {asset} an die Einzahlungsadresse.",
        memoWarning: "Hänge das Memo als MEMO_TEXT an, sonst wird die Einzahlung nicht gutgeschrieben.",
        scan: "Zum Bezahlen scannen", depositUri: "Einzahlungslink", openWallet: "In der Wallet öffnen",
        fields: { id: "ID", status: "Status", route: "Route", depositAddress: "Einzahlungsadresse", depositMemo: "Memo", amountIn: "Senden", estimated: "Erhalten (geschätzt)", minimum: "Minimum", fee: "Provision", recipient: "Empfänger", refundTo: "Erstattungsadresse", amountOut: "Erhalten", refunded: "Erstattet", expires: "Einzahlen bis", quoteSignature: "Quote-Signatur", created: "Erstellt" },
        txs: "Transaktionen",
        reportTitle: "Einzahlung melden",
        reportDesc: "Füge die Transaktion ein, die die Einzahlungsadresse bezahlt hat, damit der Swap sofort startet. Optional: NEAR Intents beobachtet die Adresse ohnehin.",
        reportPlaceholder: "Hash der Einzahlungstransaktion…",
        report: "Melden", reporting: "Wird gemeldet…", reported: "Einzahlung gemeldet", reportError: "Die Einzahlung konnte nicht gemeldet werden.",
      },
    },
    wallet: { signTitle: "Mit Ihrem Wallet signieren", signDesc: "Freighter zeigt die Transaktion; bestätigen Sie sie dort und der Swap wird sofort gesendet. Ihre Schlüssel verlassen das Wallet nie.", freighter: "Mit Freighter signieren", signing: "Warten auf Freighter…", submitting: "Wird gesendet…", missing: "Freighter ist in diesem Browser nicht installiert. Scannen Sie den QR-Code mit einem anderen Wallet oder fügen Sie unten die signierte Transaktion ein.", declined: "Freighter hat die Transaktion nicht signiert.", wrongAccount: "Freighter ist auf einem anderen Konto. Wechseln Sie zu {account} und versuchen Sie es erneut.", wrongNetwork: "Freighter ist in einem anderen Netzwerk. Wechseln Sie zu {network} und versuchen Sie es erneut.", networks: { testnet: "Testnet", public: "Öffentliches Netzwerk" } },
    liquidity: {
      title: "Liquiditätspools",
      sub: "{n} Vorgänge · AMM-Pools auf Stellar",
      deposit: "Einzahlen",
      withdraw: "Abheben",
      readOnly: "Sie haben in dieser Organisation nur Lesezugriff auf Liquiditätspools.",
      tabs: { operations: "Vorgänge", pools: "Pools", positions: "Positionen" },
      searchPlaceholder: "Nach Pool, Konto oder ID suchen…",
      filters: { all: "Alle", PENDING: "Ausstehend", SUBMITTED: "Übermittelt", SUCCEEDED: "Erfolgreich", FAILED: "Fehlgeschlagen" },
      status: { PENDING: "Ausstehend", SUBMITTED: "Übermittelt", SUCCEEDED: "Erfolgreich", FAILED: "Fehlgeschlagen", EXPIRED: "Abgelaufen" },
      kind: { DEPOSIT: "Einzahlung", WITHDRAW: "Abhebung" },
      sharesUnit: "Anteile",
      bps: "bps",
      opsHead: { id: "Vorgang", kind: "Typ", pool: "Pool", amounts: "Beträge", status: "Status", created: "Erstellt" },
      empty: "Noch keine Liquiditätsvorgänge. Zahlen Sie in einen Pool ein, um eine unsignierte Transaktion zum Signieren zu erhalten.",
      loading: "Vorgänge werden geladen…",
      loadError: "Liquiditätsvorgänge konnten nicht geladen werden.",
      network: { dev: "Testnet", prod: "Öffentliches Netz" },
      pools: {
        assetA: "Asset A", assetAIssuer: "Emittent A", assetB: "Asset B", assetBIssuer: "Emittent B",
        assetHint: "Asset-Code: leer lassen oder XLM für Lumens.",
        search: "Pools suchen", searching: "Wird gesucht…", loading: "Pools werden geladen…",
        empty: "Keine Pools für dieses Paar.",
        error: "Liquiditätspools konnten nicht geladen werden.",
        head: { pool: "Pool", reserves: "Reserven", shares: "Anteile gesamt", trustlines: "Inhaber", fee: "Gebühr" },
      },
      positions: {
        account: "Konto", accountHint: "Stellar-Konto, dessen Pool-Anteile angezeigt werden sollen (G…).",
        load: "Positionen laden", loadingBtn: "Wird geladen…",
        prompt: "Geben Sie ein Konto ein, um seine Pool-Anteile zu sehen.",
        empty: "Dieses Konto hält keine Pool-Anteile.",
        error: "Positionen konnten nicht geladen werden.",
        head: { pool: "Pool", shares: "Anteile", share: "Anteil am Pool", redeemable: "Einlösbar" },
      },
      modal: {
        eyebrow: "Liquidität",
        depositTitle: "Liquidität einzahlen",
        depositDesc: "Zahlen Sie beide Assets eines Paares in den AMM-Pool ein und erhalten Sie Pool-Anteile. Sie erhalten eine unsignierte Transaktion zum Signieren.",
        withdrawTitle: "Liquidität abheben",
        withdrawDesc: "Verbrennen Sie Pool-Anteile, um beide Reserve-Assets anteilig zu erhalten. Sie erhalten eine unsignierte Transaktion zum Signieren.",
        source: "Quellkonto", sourceHint: "Stellar-Konto, das die Einzahlung finanziert und signiert (G…).",
        withdrawSourceHint: "Stellar-Konto, das die Pool-Anteile hält (G…).",
        assetA: "Asset A", assetB: "Asset B", assetHint: "Asset-Code (XLM für Lumens).",
        assetAIssuer: "Emittent A", assetBIssuer: "Emittent B", issuerHint: "Erforderlich für nicht-native Assets (G…).",
        maxAmountA: "Max. Betrag A", maxAmountAHint: "Maximale Menge von Asset A zum Einzahlen.",
        maxAmountB: "Max. Betrag B", maxAmountBHint: "Optional. Wird aus dem Poolpreis abgeleitet, wenn leer; erforderlich für einen neuen Pool.",
        poolId: "Pool-ID", poolIdHint: "64-stellige hexadezimale Liquiditätspool-ID.",
        shares: "Anteile", sharesHint: "Anzahl der zu verbrennenden Pool-Anteile.",
        slippage: "Slippage (bps)", slippageHint: "Maximale Slippage in Basispunkten (optional, z. B. 50).",
        trustNote: "Wenn das Konto den Pool-Anteilen noch nicht vertraut, enthält die Transaktion die Trustline automatisch.",
        create: "Transaktion erstellen", creating: "Wird erstellt…",
        createError: "Die Transaktion konnte nicht erstellt werden.",
        commissionNote: "Die Provision des Plans gilt nur für Ihre Erträge (den Gewinn über Ihre Einzahlung hinaus), nie für Ihr Kapital. Für Positionen, die außerhalb von Cosmos Pay eröffnet wurden, fällt keine Provision an.",
      },
      detail: {
        eyebrow: "Liquidität",
        titleDeposit: "Einzahlung bereit", titleWithdraw: "Abhebung bereit",
        scan: "Zum Signieren scannen", downloadQr: "QR herunterladen",
        uri: "SEP-7-URI", xdr: "Unsigniertes XDR",
        openWallet: "In Wallet öffnen", viewExplorer: "Im Explorer ansehen",
        fields: { id: "ID", kind: "Typ", status: "Status", network: "Netz", source: "Quelle", pool: "Pool", pair: "Paar", maxDeposit: "Max. Einzahlung", minReceived: "Mindestens erhalten", shares: "Anteile", priceBounds: "Preisgrenzen (A/B)", commission: "Provision", commissionMemo: "Provisions-Memo", txHash: "Transaktions-ID", created: "Erstellt" },
        submitTitle: "Signierte Transaktion übermitteln",
        submitDesc: "Fügen Sie das von der Wallet zurückgegebene signierte XDR ein, um den Vorgang zu übertragen.",
        submitPlaceholder: "Signiertes Transaktions-XDR…",
        submit: "Übermitteln", submitting: "Wird übermittelt…",
        submitted: "Vorgang übermittelt",
        submitFailed: "Der Vorgang konnte nicht übermittelt werden.",
        resultCodes: "Ergebniscodes",
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
        eyebrow: "Fiat: activation",
        activating: "Activating your account…",
        activatingBody: "Please wait while we confirm your acceptance.",
        successTitle: "Your account is now active",
        successBody: "You can now add wallets and bank accounts and use onramp & offramp.",
        errorTitle: "Activation failed",
        errorBody: "We couldn't activate your account. Please try again.",
        noTosId: "No terms-of-service id was returned. Please try activating again.",
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
        disabledNote: "This fiat account is disabled: onramp/offramp are blocked until re-enabled.",
        accountDisabled: "Fiat account disabled",
        accountEnabled: "Fiat account enabled",
        accessError: "Couldn't update the fiat account.",
        inactiveNote: "Registration only: no KYC data submitted yet.",
        awaitingReview: "Awaiting owner/admin review.",
        reviewTitle: "Review KYC",
        reviewHint: "Review the submitted KYC data, then approve to email the customer the terms of service.",
        approve: "Approve & send terms",
        approving: "Approving…",
        approvedSent: "Approved: terms sent to {email}",
        approveError: "Couldn't approve the receiver.",
        termsSentTitle: "Terms sent",
        termsSentBody: "Awaiting customer acceptance. Terms sent to {email}.",
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
            source_of_wealth: "Source of wealth", purpose_of_transactions: "Purpose of transactions", purpose_of_transactions_explanation: "Purpose of transactions (explanation)",
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

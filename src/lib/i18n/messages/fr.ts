/* fr.js — French message catalog. Mirrors en.js exactly in shape. */
export default {
  invite: {
    eyebrow: "Invitation",
    joinTitle: "Rejoindre {org}",
    signInToAccept: "Vous avez été invité à collaborer sur {org} dans Cosmos Pay.",
    signInBtn: "Se connecter pour accepter",
    invitedAs: "Invitation envoyée à {email}",
    successTitle: "C’est fait !",
    successBody: "Vous avez rejoint {org}.",
    goToDashboard: "Aller au tableau de bord",
    backHome: "Retour à l’accueil",
    invalidTitle: "Invitation introuvable",
    invalidBody: "Ce lien d’invitation n’est pas valide.",
    expiredTitle: "Invitation expirée",
    expiredBody: "Cette invitation a expiré. Demandez à un administrateur d’en envoyer une nouvelle.",
    acceptedTitle: "Déjà acceptée",
    acceptedBody: "Cette invitation a déjà été utilisée.",
    mismatchTitle: "Mauvais compte",
    mismatchBody: "Cette invitation a été envoyée à {email}. Connectez-vous avec cet e-mail pour accepter.",
    seatLimitTitle: "Organisation complète",
    seatLimitBody: "Cette organisation a atteint la limite de sièges de son forfait.",
  },
  toasts: {
    copied: "Copié dans le presse-papiers"
  },
  onboarding: {
    cancel: "Annuler",
    stepOf: "Étape {n} / {total}",
    steps: {
      org: "Organisation",
      goals: "Objectifs",
      plan: "Forfait",
      review: "Récapitulatif"
    },
    back: "Retour",
    continue: "Continuer",
    skip: "Ignorer",
    create: "Créer l’organisation",
    creating: "Création…",
    error: "Impossible de terminer l’intégration. Veuillez réessayer.",
    orgEyebrow: "// nouvelle organisation",
    orgTitle: "Configurons votre organisation",
    orgSub: "Les organisations séparent entièrement vos paiements, clients et clés d’API. Nommez la vôtre et dites-nous ce que vous construisez.",
    nameLabel: "Nom de l’organisation",
    namePlaceholder: "Acme Inc.",
    nameNote: "Vous pourrez la renommer plus tard dans les Paramètres.",
    industryLabel: "Quel type d’activité est-ce ?",
    industries: {
      saas: {
        t: "SaaS et abonnements",
        s: "Produits à revenus récurrents"
      },
      market: {
        t: "Place de marché",
        s: "Paiements et reversements partagés"
      },
      ecom: {
        t: "E-commerce",
        s: "Boutique en ligne ou paiement"
      },
      fintech: {
        t: "Fintech",
        s: "Construire sur des rails réglementés"
      },
      platform: {
        t: "Plateforme",
        s: "Intégrez les paiements pour vos utilisateurs"
      },
      ai: {
        t: "IA et agents",
        s: "Flux d’argent programmatiques"
      }
    },
    goalsEyebrow: "// ce que vous allez construire",
    goalsTitle: "Que voulez-vous faire en premier ?",
    goalsSub: "Choisissez tout ce qui s’applique — nous adapterons votre tableau de bord et vous suggérerons le bon forfait.",
    goals: {
      accept: {
        t: "Accepter des paiements",
        s: "Facturez vos clients en USDC"
      },
      payout: {
        t: "Envoyer des versements",
        s: "Payez dans le monde entier"
      },
      subs: {
        t: "Abonnements",
        s: "Facturation récurrente"
      },
      cross: {
        t: "Transfrontalier",
        s: "Règlement sans frontières"
      },
      embed: {
        t: "Finance intégrée",
        s: "Portefeuilles et comptes"
      },
      test: {
        t: "Juste explorer",
        s: "Faire un essai"
      }
    },
    volumeLabel: "Volume mensuel estimé",
    volumes: {
      explore: {
        t: "Juste explorer",
        s: "Tester l’API"
      },
      lt10: {
        t: "Moins de 10k$ / mois",
        s: "Premiers clients"
      },
      mid: {
        t: "10k$ – 100k$ / mois",
        s: "En croissance"
      },
      gt100: {
        t: "100k$+ / mois",
        s: "Volume élevé"
      }
    },
    planEyebrow: "// choisissez votre forfait",
    planTitle: "Choisissez un forfait pour démarrer",
    planSub: "Commencez gratuitement et ne payez que par transaction réussie. Changez à tout moment — sans appel.",
    popular: "Populaire",
    recommended: "Recommandé",
    enterpriseNote: "Besoin de tarifs sur mesure ou d’un SLA ?",
    enterpriseLink: "Parlez à l’équipe commerciale d’Enterprise →",
    reviewEyebrow: "// vérifier et créer",
    reviewTitle: "Vérifiez votre organisation",
    reviewSub: "Confirmez les détails ci-dessous. Vous arriverez dans votre nouveau tableau de bord avec des clés de test prêtes.",
    rv: {
      org: "Organisation",
      type: "Type d’activité",
      goals: "Objectifs",
      volume: "Volume estimé",
      plan: "Forfait"
    },
    notSet: "Non défini",
    edit: "Modifier",
    termsPre: "J’accepte les ",
    termsA: "Conditions Développeur",
    termsMid: " et la ",
    termsB: "Politique d’Utilisation Acceptable",
    termsPost: " de Cosmos Pay.",
    specTagline: "Une API. Tous les rails Stellar.",
    specTaglineSub: "Acceptez et déplacez de l’argent en USDC avec un règlement en ~5 secondes. Choisissez le forfait qui convient — changez quand vous voulez.",
    selectedPlan: "Forfait sélectionné",
    recommendedForYou: "Recommandé pour vous",
    spec: {
      perTx: "Par transaction",
      settle: "Règlement",
      network: "Réseau",
      team: "Membres de l’équipe",
      orgs: "Organisations",
      support: "Assistance",
      live: "Paiements en direct",
      included: "Inclus",
      notIncluded: "Non inclus"
    },
    whatsIncluded: "Ce qui est inclus",
    specFoot: "Les clés de test sont prêtes instantanément. Aucune carte requise pour commencer.",
    supportLevels: {
      community: "Communauté",
      standard: "Standard",
      priority: "Prioritaire"
    },
    plans: {
      community: {
        desc: "Gratuit au lancement · Stellar uniquement",
        sub: "Stellar uniquement",
        pnote: "gratuit pendant le lancement · Stellar",
        team: "1",
        feats: ["Webhooks de paiement", "Clés d’API de test", "1 projet"]
      },
      starter: {
        desc: "Acceptez de vrais paiements sur Stellar",
        sub: "+ 10¢ / txn",
        pnote: "0,5% + 10¢ par transaction",
        team: "Jusqu’à 5",
        feats: ["API de paiements complète", "Clés en direct et de test", "Règlement en USDC", "Jusqu’à 5 membres"]
      },
      growth: {
        desc: "Tarifs réduits pour les équipes en croissance",
        sub: "/mois · à partir de",
        pnote: "à partir de · 0,35% + 0,5¢ par txn",
        team: "Illimité",
        feats: ["Tout de Starter", "Taux par transaction réduit", "Membres illimités", "Outils anti-fraude Radar", "Remises sur volume", "Assistance prioritaire"]
      }
    }
  },
  nav: {
    login: "Se connecter",
    getKeys: "Obtenir mes clés",
    dashboard: "Tableau de bord",
    menu: "Menu",
    docs: "Documentation",
    items: {
      products: {
        label: "Produits",
        cols: [
          {
            head: "Encaisser de l’argent",
            links: [
              {
                t: "Payments",
                s: "Paiements sur le réseau Stellar"
              },
              {
                t: "Checkout",
                s: "Page de paiement hébergée"
              },
              {
                t: "Payment Links",
                s: "Liens de paiement sans code"
              },
              {
                t: "Invoicing",
                s: "Facturation en stablecoins"
              }
            ]
          },
          {
            head: "Transférer de l’argent",
            links: [
              {
                t: "Payouts",
                s: "Envoyez des fonds dans le monde entier"
              },
              {
                t: "Cross-border",
                s: "Règlement sans frontières"
              },
              {
                t: "Anchors",
                s: "Rampes d’entrée et de sortie fiat"
              },
              {
                t: "FX",
                s: "Conversion multi-actifs"
              }
            ]
          },
          {
            head: "Construire avec",
            links: [
              {
                t: "Stablecoins",
                s: "USDC et actifs Stellar"
              },
              {
                t: "Wallets",
                s: "Avec ou sans dépôt fiduciaire"
              },
              {
                t: "Ledger",
                s: "Registre on-chain en temps réel"
              },
              {
                t: "Radar",
                s: "Fraude et risque"
              }
            ]
          }
        ],
        featured: {
          title: "Cosmos Sessions 2026",
          desc: "Découvrez comment nous bâtissons l’infrastructure de paiement pour l’ère de l’IA.",
          cta: "Regarder maintenant"
        }
      },
      solutions: {
        label: "Solutions",
        cols: [
          {
            head: "Par modèle",
            links: [
              {
                t: "SaaS & subscriptions",
                s: "Revenus récurrents à grande échelle"
              },
              {
                t: "Marketplaces",
                s: "Paiements et reversements partagés"
              },
              {
                t: "Platforms",
                s: "Intégrez les paiements pour vos utilisateurs"
              },
              {
                t: "Embedded finance",
                s: "Comptes, cartes et argent"
              }
            ]
          },
          {
            head: "Par secteur",
            links: [
              {
                t: "E-commerce",
                s: "Plus de conversion au paiement"
              },
              {
                t: "Fintech",
                s: "Construisez sur des rails réglementés"
              },
              {
                t: "Gaming",
                s: "Micro-transactions mondiales"
              },
              {
                t: "Travel & mobility",
                s: "Flux complexes à plusieurs parties"
              }
            ]
          }
        ]
      },
      developers: {
        label: "Développeurs",
        cols: [
          {
            head: "Construire",
            links: [
              {
                t: "API reference",
                s: "REST et GraphQL"
              },
              {
                t: "SDKs & libraries",
                s: "Six langages typés"
              },
              {
                t: "Webhooks",
                s: "Événements en temps réel"
              },
              {
                t: "Sandbox",
                s: "Testez tout en toute sécurité"
              }
            ]
          },
          {
            head: "Exploiter",
            links: [
              {
                t: "CLI",
                s: "Parité du local à la production"
              },
              {
                t: "Status",
                s: "Disponibilité et incidents"
              },
              {
                t: "Changelog",
                s: "Ce que nous avons livré"
              },
              {
                t: "Postman",
                s: "Collection prête à l’emploi"
              }
            ]
          }
        ],
        featured: {
          title: "Quickstart",
          desc: "Passez de zéro à votre premier paiement en moins de cinq minutes.",
          cta: "Commencer à développer"
        }
      },
      resources: {
        label: "Ressources",
        cols: [
          {
            head: "Apprendre",
            links: [
              {
                t: "Documentation",
                s: "Guides et références"
              },
              {
                t: "Tutorials",
                s: "Tutoriels pas à pas"
              },
              {
                t: "Blog",
                s: "Ingénierie et produit"
              },
              {
                t: "Customer stories",
                s: "Construit sur Cosmos Pay"
              }
            ]
          },
          {
            head: "Assistance",
            links: [
              {
                t: "Help center",
                s: "Réponses et guides pratiques"
              },
              {
                t: "Community",
                s: "Forum et Discord"
              },
              {
                t: "Contact sales",
                s: "Parlez à un expert"
              },
              {
                t: "Partners",
                s: "Agences et intégrations"
              }
            ]
          }
        ]
      },
      pricing: {
        label: "Tarifs"
      }
    }
  },
  profile: {
    account: "Paramètres du compte",
    billing: "Facturation",
    docs: "Documentation",
    backToSite: "Retour au site web",
    logout: "Se déconnecter",
    openDashboard: "Ouvrir le tableau de bord"
  },
  footer: {
    tagline: "L’infrastructure de paiement pour les développeurs. Une seule API, tous les rails.",
    copyright: "© 2026 Cosmos Pay, Inc. — Plateforme pour développeurs",
    groups: {
      products: {
        title: "Produits",
        links: ["Payments", "Stablecoins", "Payouts", "Anchors", "Wallets", "Checkout", "Payment Links", "Tarifs"]
      },
      solutions: {
        title: "Solutions",
        links: ["SaaS & subscriptions", "Marketplaces", "E-commerce", "Platforms", "Embedded finance", "IA et agents", "Enterprise"]
      },
      developers: {
        title: "Développeurs",
        links: ["Documentation", "API reference", "SDKs & libraries", "Webhooks", "État de l’API", "Changelog", "Tableau de bord"]
      },
      resources: {
        title: "Ressources",
        links: ["Guides", "Blog", "Témoignages clients", "Assistance", "Partenaires", "Sessions 2026"]
      },
      company: {
        title: "Entreprise",
        links: ["À propos", "Carrières", "Salle de presse", "Sécurité", "Confidentialité et conditions", "Conformité"]
      }
    }
  },
  landing: {
    hero: {
      headline: "Écrivez moins de code -> transférez plus d’argent",
      lede: "L’infrastructure de paiement pour les développeurs. Une seule API pour transférer de l’argent sur le réseau Stellar — des stablecoins et des actifs numériques réglés en quelques secondes, dans plus de 130 pays, avec des frais de l’ordre d’une fraction de centime.",
      getKeys: "Obtenir des clés API",
      trustedBy: "La confiance des équipes d’ingénierie de"
    },
    api: {
      kicker: "// la plateforme",
      title: "Des API puissantes",
      lede: "Nos API modulaires permettent aux développeurs d’intégrer des flux financiers complexes en quelques minutes — pas en plusieurs mois.",
      docsLink: "Voir la documentation de l’API",
      cards: {
        payments: {
          title: "Payments",
          desc: "Envoyez et recevez des paiements sur Stellar avec une finalité en moins de 5 secondes et des frais quasi nuls."
        },
        stablecoin: {
          title: "Stablecoins",
          desc: "Réglez en USDC et autres actifs Stellar, on-chain et en temps réel."
        },
        anchor: {
          title: "Anchors",
          desc: "Connectez-vous aux anchors Stellar pour les rampes d’entrée et de sortie fiat en devises locales."
        }
      },
      docsTitle: "Une documentation de premier ordre",
      docsDesc: "Conçue par des développeurs, pour des développeurs. Des guides interactifs, une référence OpenAPI détaillée et un SDK JavaScript / TypeScript entièrement typé pour le serveur et le navigateur.",
      sdkBtns: {
        node: "SDK Node.js / TypeScript",
        web: "SDK navigateur / Web"
      },
      exploreDocs: "Explorer toute la documentation",
      copy: "Copier",
      copied: "Copié"
    },
    integration: {
      kicker: "// développeurs",
      title: "Une infrastructure fiable et extensible.",
      lede: "Conçue pour gérer les charges de travail les plus importantes au monde — et pour s’intégrer à n’importe quelle stack que vous utilisez déjà.",
      scale: ["requêtes API / jour", "requêtes / sec", "finalité Stellar", "disponibilité"],
      paths: [
        {
          t: "Sans code",
          d: "Lancez des liens de paiement et de la facturation directement depuis votre tableau de bord — aucun développement requis.",
          a: "Explorer le sans-code"
        },
        {
          t: "Interface prête à l’emploi",
          d: "Intégrez Checkout ou Elements et acceptez des paiements Stellar en quelques minutes, avec des composants aux couleurs de votre marque.",
          a: "Voir les composants"
        },
        {
          t: "Construisez la vôtre",
          d: "Utilisez nos API REST + GraphQL, nos SDK typés et notre CLI pour créer une intégration Stellar entièrement sur mesure.",
          a: "Lire la documentation"
        }
      ],
      mockLink: "Lien de paiement · 19.99 USDC"
    },
    solutions: {
      kicker: "// solutions",
      title: "Conçu pour chaque modèle économique.",
      lede: "De votre première transaction à des milliards de volume — Cosmos Pay s’adapte à la façon dont votre entreprise transfère de l’argent sur Stellar.",
      eyebrow: "Solution",
      startBuilding: "Commencer à développer",
      items: {
        pay: {
          t: "Acceptez les paiements Stellar",
          d: "Envoyez et recevez des paiements sur le réseau Stellar avec une finalité en moins de 5 secondes et des frais de l’ordre d’une fraction de centime.",
          long: "Acceptez des paiements de toute personne disposant d’un wallet Stellar. Les fonds atteignent la finalité en environ cinq secondes et sont réglés directement sur votre compte — sans rétrofacturation, sans intermédiaire et sans blocage de plusieurs jours.",
          points: ["Finalité de règlement en moins de 5 secondes", "Des frais de l’ordre d’une fraction de centime", "Envoyez et recevez n’importe quel actif Stellar", "Webhooks en temps réel sur chaque paiement"]
        },
        coin: {
          t: "Règlement en stablecoins",
          d: "Réglez en USDC et autres actifs Stellar, on-chain et en temps réel.",
          long: "Détenez et réglez des soldes en USDC et autres stablecoins réglementés émis sur Stellar. Chaque transaction est enregistrée on-chain et rapprochée automatiquement dans votre registre en temps réel.",
          points: ["Stablecoins réglementés adossés à 1:1", "Règlement on-chain et auditable", "Registre multi-actifs en temps réel", "Rapprochement automatique"]
        },
        globe: {
          t: "Argent transfrontalier",
          d: "Atteignez plus de 130 pays sur un seul réseau mondial — sans banques correspondantes.",
          long: "Transférez de l’argent au-delà des frontières comme vous le feriez localement. Stellar atteint plus de 130 pays sans banques correspondantes, de sorte que les reversements arrivent en quelques secondes plutôt qu’en plusieurs jours.",
          points: ["Plus de 130 pays sur un seul réseau", "Aucun délai lié aux banques correspondantes", "Change transparent et annoncé à l’avance", "Règlement en quelques secondes"]
        },
        ramp: {
          t: "Rampes d’entrée et de sortie",
          d: "Connectez-vous aux anchors Stellar pour les dépôts et retraits en devise locale.",
          long: "Permettez à vos utilisateurs de passer de la devise locale aux actifs numériques via des anchors Stellar réglementés. Dépôts et retraits dans des dizaines de devises locales, entièrement pris en charge par les standards SEP.",
          points: ["Réseau d’anchors réglementés", "Des dizaines de devises locales", "Flux standards SEP-6 / SEP-24", "KYC géré par l’anchor"]
        },
        wallet: {
          t: "Wallets intégrés",
          d: "Créez des wallets Stellar avec ou sans dépôt fiduciaire pour vos utilisateurs.",
          long: "Offrez à chaque utilisateur un wallet Stellar au sein de votre produit. Choisissez des wallets avec dépôt fiduciaire que vous gérez, ou sans dépôt fiduciaire que vos utilisateurs contrôlent — les deux provisionnés en un seul appel API.",
          points: ["Avec ou sans dépôt fiduciaire", "Provisionnement en un seul appel", "Gestion des clés intégrée", "Soldes multi-actifs"]
        }
      },
      payMock: {
        received: "Paiement reçu",
        via: "via Stellar · 4.2s",
        fee: "frais 0,00001 $"
      }
    },
    stats: {
      items: ["SLA de disponibilité de l’API", "temps de réponse p99", "pays pris en charge", "appels API / mois"]
    },
    customers: {
      kicker: "// clients",
      title: "Au service des entreprises de toutes tailles.",
      lede: "Des startups en phase d’amorçage aux grandes entreprises cotées, les équipes construisent et font évoluer leurs paiements sur Cosmos Pay.",
      eyebrow: "Témoignage client",
      readStory: "Lire le témoignage",
      readFull: "Lire le témoignage complet",
      items: {
        Northwind: {
          label: "de règlement transfrontalier plus rapide après le passage à Stellar.",
          tags: ["Payments", "Stablecoins", "Wallets"],
          story: "Northwind a migré son paiement mondial vers Cosmos Pay et le réseau Stellar, réduisant le règlement de plusieurs jours à quelques secondes et diminuant fortement les coûts de change sur plus de 30 marchés — tout en conservant un registre unique et rapproché."
        },
        Lumio: {
          label: "pour lancer des abonnements en USDC dans 40 pays.",
          tags: ["Billing", "USDC", "Anchors"],
          story: "Lumio a remplacé un patchwork de prestataires régionaux par Cosmos Pay, lançant des abonnements libellés en USDC dans 40 pays en seulement six semaines grâce aux anchors pour les rampes d’entrée et de sortie locales."
        },
        Helios: {
          label: "reversés à des vendeurs du monde entier via le réseau Stellar.",
          tags: ["Payouts", "Connect", "Ramps"],
          story: "Helios reverse à une base de vendeurs mondiale entièrement sur Stellar. L’an dernier, l’entreprise a réglé 2,4 Md$ à des vendeurs dans 58 pays, avec des fonds arrivant en quelques secondes et une transparence on-chain totale."
        }
      }
    },
    testimonials: {
      kicker: "// témoignages",
      title: "Apprécié des développeurs et des équipes financières.",
      items: {
        MC: {
          q: "Cosmos Pay nous a permis de transférer de l’argent au-delà des frontières en quelques secondes. Nous avons remplacé trois prestataires par une seule API Stellar.",
          r: "VP Engineering, Vertexa"
        },
        DO: {
          q: "La documentation est la meilleure que j’aie jamais utilisée. Nous avons réglé notre premier paiement en USDC avant le déjeuner, dès le premier jour.",
          r: "Founder, Quanta"
        },
        PN: {
          q: "Le rapprochement prenait une semaine. Le règlement on-chain sur Stellar le fait désormais pour nous en temps réel.",
          r: "Head of Finance, Riverstone"
        }
      }
    },
    resources: {
      kicker: "// ressources",
      title: "Ce qui se passe.",
      lede: "Actualités produit, guides approfondis et récits d’ingénierie de l’équipe qui construit Cosmos Pay.",
      readMore: "En savoir plus",
      items: [
        {
          tag: "Report",
          t: "L’état des paiements en stablecoins en 2026",
          d: "Comment les équipes transfèrent de l’argent sur Stellar à l’échelle mondiale."
        },
        {
          tag: "Changelog",
          t: "Les webhooks de règlement Stellar sont disponibles en GA",
          d: "Recevez des événements en temps réel dès qu’un paiement atteint la finalité."
        },
        {
          tag: "Guide",
          t: "Concevoir des webhooks idempotents",
          d: "Des modèles pour un traitement d’événements fiable et exactement-une-fois."
        },
        {
          tag: "Blog",
          t: "Passer à 8 milliards de requêtes par mois",
          d: "Au cœur de l’infrastructure qui propulse Cosmos Pay."
        }
      ]
    },
    cta: {
      title: "Commencez à développer dès aujourd’hui.",
      desc: "Lancez un sandbox testnet gratuit et passez en production sur Stellar dès que vous êtes prêt.",
      getKeys: "Obtenir des clés API",
      talk: "Parler à l’ingénierie",
      helpers: [
        {
          b: "Découvrez ce que vous paierez",
          s: "Une tarification transparente, basée sur l’usage et sans surprise."
        },
        {
          b: "Commencer à développer",
          s: "Récupérez vos clés API et effectuez votre premier paiement dès aujourd’hui."
        }
      ]
    }
  },
  pricing: {
    kicker: "// tarifs",
    title: "Payez ce que vous réglez.",
    lede: "Une tarification transparente, basée sur l’usage. Démarrez gratuitement — ne payez qu’un petit frais par transaction réussie.",
    monthly: "Mensuel",
    annual: "Annuel",
    save: "−17%",
    popular: "Le plus populaire",
    from: "à partir de",
    perMo: "/mois",
    billedYearly: "facturé annuellement",
    plans: [
      {
        name: "Community",
        tag: "Gratuit",
        desc: "Commencez à accepter les paiements sans coût mensuel.",
        amt: "Gratuit",
        txt: "sans frais mensuels",
        cta: "Commencer gratuitement",
        feats: ["Acceptez les paiements", "Clés API de test", "1 projet", "Support communautaire", "Protection des paiements", "Gestion des litiges", "Cartes et virements bancaires"]
      },
      {
        name: "Starter",
        desc: "Encaissez de vrais paiements avec une protection des paiements intégrée.",
        amt: "1.5%",
        txt: "+ 0.25¢ par transaction *",
        cta: "Commencer gratuitement",
        feats: ["Tout ce qui est inclus dans Community", "Paiements réels", "Protection des paiements", "Accès partiel à l'API", "Support standard", "Gestion des litiges", "Cartes et virements bancaires"]
      },
      {
        name: "Essentials",
        desc: "Accès complet à la plateforme avec gestion des litiges et tous les moyens de paiement.",
        txt: "+ 0.5% + 10¢ par transaction *",
        cta: "Démarrer l’essai gratuit",
        feats: ["Tout ce qui est inclus dans Starter", "Accès complet à l'API", "Protection des paiements", "Gestion des litiges", "Cartes et virements bancaires", "Support e-mail prioritaire", "Remises sur volume"]
      },
      {
        name: "Growth",
        desc: "Des tarifs plus bas et plus de puissance pour les équipes en croissance.",
        txt: "+ 0.35% + 5¢ par transaction *",
        cta: "Démarrer l’essai gratuit",
        feats: ["Tout ce qui est inclus dans Essentials", "Tarif de 0.35% + 5¢ par transaction", "Membres d’équipe illimités", "Outils antifraude avancés", "Remises sur volume", "Support prioritaire", "Routage intelligent des paiements"]
      }
    ],
    enterprise: {
      name: "Enterprise",
      desc: "Des tarifs personnalisés et une infrastructure dédiée pour les entreprises au plus fort volume.",
      feats: ["Tarifs par transaction personnalisés", "Infrastructure dédiée", "SLA de disponibilité de 99.99%", "SSO / SAML + journaux d’audit", "Architecte de solutions dédié", "Support prioritaire 24/7"],
      price: "Sur mesure",
      subt: "Tarifs basés sur le volume",
      cta: "Contacter le service commercial"
    },
    footnote: "* Chaque transaction inclut également un petit frais de réseau. Les plans Community et Starter couvrent nos fonctionnalités de paiement essentielles ; Essentials et Growth débloquent l’accès complet à l’API, la gestion des litiges et tous les moyens de paiement, y compris les cartes et les virements bancaires.",
    compareTitle: "Comparer les plans",
    orgsRow: "Organisations",
    seatsRow: "Membres par organisation",
    keysRow: "ClÃ©s API",
    compareHead: ["Fonctionnalité", "Community", "Starter", "Essentials", "Growth", "Enterprise"],
    compare: [
      {
        l: "Frais mensuels",
        v: ["—", "—", "$33 / mo", "$99 / mo", "Sur mesure"]
      },
      {
        l: "Frais par transaction",
        v: ["—", "1.5% + 0.25¢", "0.5% + 10¢", "0.35% + 5¢", "Sur mesure"]
      },
      {
        l: "Vitesse de règlement",
        v: ["~5 sec", "~5 sec", "~5 sec", "~5 sec", "~5 sec"]
      },
      {
        l: "Accès à l'API",
        v: ["Notifications", "Partiel", "Complet", "Complet", "Complet"]
      },
      {
        l: "Paiements réels",
        v: [1, 1, 1, 1, 1]
      },
      {
        l: "Protection des paiements",
        v: [0, 1, 1, 1, 1]
      },
      {
        l: "Gestion des litiges",
        v: [0, 0, 1, 1, 1]
      },
      {
        l: "Cartes et virements bancaires",
        v: [0, 0, 1, 1, 1]
      },
      {
        l: "Outils antifraude avancés",
        v: [0, 0, 0, 1, 1]
      },
      {
        l: "Remises sur volume",
        v: [0, 0, 0, 1, 1]
      },
      {
        l: "SSO / SAML",
        v: [0, 0, 0, 0, 1]
      },
      {
        l: "Support",
        v: ["Communautaire", "Standard", "E-mail prioritaire", "Prioritaire", "24/7 dédié"]
      }
    ],
    faqTitle: "Questions fréquentes",
    faqs: [
      {
        q: "Y a-t-il vraiment un plan gratuit ?",
        a: "Oui. Le plan Community est gratuit et inclut tout ce dont vous avez besoin pour commencer à accepter des paiements immédiatement. Starter est également gratuit chaque mois ; vous ne payez qu’un petit frais par transaction réussie."
      },
      {
        q: "Combien coûte une transaction ?",
        a: "Starter est à 1.5% + 0.25¢ par transaction réussie. Essentials est à 33 $/mois (ou 27,50 $/mois facturé annuellement) et abaisse le tarif à 0.5% + 10¢, tandis que Growth est à 99 $/mois et le ramène à 0.35% + 5¢. Un petit frais de réseau s’applique également à chaque transaction."
      },
      {
        q: "Quels moyens de paiement prenez-vous en charge ?",
        a: "Community et Starter couvrent nos moyens de paiement essentiels. À partir d’Essentials, vous pouvez également accepter les cartes, les virements bancaires et d’autres moyens de paiement locaux via une seule intégration."
      },
      {
        q: "À quelle vitesse l’argent est-il réglé ?",
        a: "Les paiements atteignent la finalité en environ cinq secondes, sur tous les plans — il n’y a aucun délai de reversement de plusieurs jours."
      },
      {
        q: "Puis-je changer de plan plus tard ?",
        a: "Tout à fait. Montez ou descendez de gamme à tout moment depuis votre tableau de bord. Les changements prennent effet immédiatement — aucun appel requis."
      }
    ],
    ctaTitle: "Vous avez encore des questions ?",
    ctaDesc: "Parlez à notre équipe de la tarification au volume, de la conformité ou d’une migration depuis un autre prestataire.",
    contactSales: "Contacter le service commercial",
    openDashboard: "Ouvrir le tableau de bord"
  },
  dash: {
    viewLabels: {
      overview: "Aperçu",
      payments: "Paiements",
      balances: "Soldes",
      customers: "Clients",
      products: "Produits et liens",
      swaps: "Swaps",
      liquidity: "Pools de liquidité",
      blindpay: "Fiat",
      developers: "Clés API",
      webhook: "Webhooks",
      logs: "Journaux d’API",
      weblogs: "Journaux de webhooks",
      settings: "Organisation",
      account: "Compte",
      activity: "Activité",
      support: "Assistance",
      inbox: "Boîte d’assistance",
      users: "Utilisateurs",
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
        Platform: "Plateforme",
        Build: "Développer",
        Account: "Compte",
        Support: "Assistance",
        Admin: "Admin"
      },
      items: {
        overview: "Aperçu",
        payments: "Paiements",
        balances: "Soldes",
        customers: "Clients",
        products: "Produits",
        swaps: "Swaps",
        liquidity: "Liquidité",
        blindpay: "Fiat",
        developers: "Clés API",
        webhook: "Webhooks",
        logs: "Journaux",
        weblogs: "Journaux webhook",
        settings: "Organisation",
        account: "Compte",
        activity: "Activité",
        support: "Assistance",
        inbox: "Boîte",
        users: "Utilisateurs",
        adminOverview: "Overview",
        adminPayments: "Payments",
        adminSwaps: "Swaps",
        adminFiat: "Fiat",
        adminCustomers: "Customers",
        adminProducts: "Products",
        adminConsumers: "Organizations"
      },
      collapse: "Réduire la barre latérale"
    },
    org: {
      heading: "Organisations",
      owned: "Vos organisations",
      invited: "Partagées avec vous",
      locked: "Verrouillée — améliorez votre offre",
      create: "Créer une organisation"
    },
    env: {
      heading: "Environnement",
      sandbox: "Sandbox",
      production: "Production",
      testnet: "Environnement testnet",
      mainnet: "Environnement mainnet"
    },
    topbar: {
      search: "Rechercher des paiements, des clients, des journaux…",
      theme: "Changer de thème",
      notifications: "Notifications"
    },
    statusLabels: {
      Succeeded: "Réussi",
      Failed: "Échoué",
      Refunded: "Remboursé",
      Active: "Actif",
      Delivered: "Livré"
    },
    common: {
      cancel: "Annuler",
      copy: "Copier",
      copyLink: "Copier le lien",
      export: "Exporter",
      vsLastWeek: "vs la semaine dernière",
      optional: "(facultatif)",
      viewPlans: "Voir les plans",
      yes: "Oui",
      no: "Non",
      assetCustom: "Personnalisé…",
      assetAny: "Tout actif"
    },
    profileMenu: {
      account: "Paramètres du compte",
      billing: "Facturation",
      docs: "Documentation",
      backToSite: "Retour au site web",
      logout: "Se déconnecter"
    },
    modals: {
      org: {
        eyebrow: "Organisation",
        title: "Créer une organisation",
        atLimit: "Votre plan {plan} autorise jusqu’à {limit} organisation{s}. Mettez à niveau votre plan pour en créer davantage.",
        body: "Les organisations séparent entièrement les paiements, les clients et les clés API. Vous pouvez en créer {n} de plus avec votre plan {plan}.",
        bodyUnlimited: "Les organisations séparent entièrement les paiements, les clients et les clés API. Vous pouvez en créer un nombre illimité avec votre plan {plan}.",
        nameLabel: "Nom de l’organisation",
        namePlaceholder: "Acme Inc.",
        create: "Créer une organisation"
      },
      key: {
        eyebrow: "Clé d’API",
        title: "Créer une clé secrète",
        editTitle: "Modifier la clé d’API",
        desc: "Choisissez l’environnement et ce que cette clé peut faire. Vous ne pourrez voir le secret qu’une seule fois.",
        editDesc: "Mettez à jour le nom, la description, le rôle et les permissions de cette clé.",
        nameLabel: "Nom",
        namePlaceholder: "Serveur de production",
        descLabel: "Description",
        descPlaceholder: "Utilisée par le service de facturation",
        envLabel: "Environnement",
        envs: {
          dev: "Développement",
          prod: "Production"
        },
        roleLabel: "Rôle",
        roles: {
          user: "Utilisateur",
          admin: "Administrateur"
        },
        permsLabel: "Permissions",
        permResource: "Ressource",
        scopeResources: { payments: "Paiements", swaps: "Swaps", liquidity: "Liquidité", webhooks: "Webhooks", products: "Produits", customers: "Clients" },
        adminHint: "Les clés admin ont un accès complet à toutes les ressources.",
        perms: {
          read: "Lecture",
          write: "Écriture"
        },
        create: "Créer la clé",
        save: "Enregistrer les modifications"
      },
      reveal: {
        eyebrow: "Clé d’API créée",
        title: "Enregistrez votre clé secrète",
        body: "C’est la seule fois où vous verrez ce secret. Copiez-le maintenant et conservez-le en lieu sûr — pour des raisons de sécurité, vous ne pourrez plus le consulter.",
        idLabel: "ID de la clé",
        saved: "J’ai enregistré ma clé"
      }
    },
    overview: {
      greeting: "Bonjour, {name}",
      sub: "Voici ce qui se passe chez {org} aujourd’hui.",
      metrics: {
        gross: "Volume brut",
        net: "Volume net",
        success: "Paiements réussis",
        newCust: "Nouveaux clients"
      },
      grossVolume: "Volume brut",
      recentPayments: "Paiements récents",
      recentActivity: "Activité récente",
      acts: {
        key: "Clé API générée",
        webhook: "Webhook livré",
        payments: "Paiement réglé",
        customers: "Nouveau client"
      },
      tableHead: {
        payment: "Paiement",
        customer: "Client",
        amount: "Montant",
        status: "Statut",
        date: "Date"
      }
    },
    payments: {
      title: "Paiements",
      sub: "{n} paiements · réglés instantanément sur Stellar",
      filters: {
        all: "Tous",
        ok: "Réussi",
        fail: "Échoué",
        ref: "Remboursé"
      },
      create: "Créer un paiement",
      searchPlaceholder: "Rechercher par client ou ID…",
      tableHead: {
        payment: "Paiement",
        customer: "Client",
        amount: "Montant",
        status: "Statut",
        date: "Date"
      },
      empty: "Aucun paiement ne correspond à vos filtres.",
      modal: {
        eyebrow: "Paiement",
        title: "Créer un paiement",
        desc: "Les paiements sont réglés instantanément sur le réseau Stellar — sans période de blocage.",
        amount: "Montant",
        asset: "Actif",
        customer: "Client",
        customerPlaceholder: "Acme Inc.",
        create: "Créer un paiement",
        newCustomer: "Nouveau client"
      }
    },
    cosmos: {
      loading: "Chargement…", loadError: "Impossible de charger les données.", empty: "Rien ici pour l'instant.",
      eventLabels: { PAYMENT_INTENT_CREATED: "Paiement créé", PAYMENT_INTENT_UPDATED: "Paiement mis à jour", PAYMENT_INTENT_SUCCEEDED: "Paiement réussi", PAYMENT_INTENT_FAILED: "Paiement échoué", PAYMENT_INTENT_CANCELLED: "Paiement annulé", PAYMENT_INTENT_DELETED: "Paiement supprimé" },
      active: "Actif", inactive: "Désactivé",
      reveal: "Afficher le secret", secret: "Secret de signature", secretNote: "Affiché une seule fois — conservez-le en lieu sûr.",
      rotate: "Renouveler le secret", ping: "Envoyer un test", pingOk: "Événement de test livré", pingFail: "Échec de l'événement de test",
      deliveries: "Livraisons récentes", noDeliveries: "Aucune livraison pour l'instant.", redeliver: "Renvoyer",
      enable: "Activer", disable: "Désactiver",
      delete: "Supprimer", deleteConfirm: "Supprimer", confirmDelete: "Action irréversible.",
      customerSet: "Montant libre", allEvents: "Tous les événements", events: "Événements",
      received: "Reçu", pending: "En attente", settledNote: "Réglé directement sur votre compte, en temps réel.",
      custDetail: { title: "Client", edit: "Modifier", save: "Enregistrer", alias: "Alias", note: "Note", account: "Compte Stellar", payments: "Paiements", onChain: "On-chain", noPayments: "Aucun paiement pour l'instant." },
    },
    paylinks: {
      title: "Liens de paiement",
      sub: "{n} liens · paiements SEP-7 sur Stellar",
      create: "Créer un lien de paiement",
      searchPlaceholder: "Rechercher par destination, mémo ou ID…",
      filters: { all: "Tous", PENDING: "En attente", SUBMITTED: "Soumis", SUCCEEDED: "Réussi", FAILED: "Échoué", CANCELLED: "Annulé", EXPIRED: "Expiré" },
      tableHead: { id: "Lien", type: "Type", amount: "Montant", status: "Statut", created: "Créé" },
      kinds: { PAY: "Lien de paiement", TX: "Transaction" },
      anyAmount: "Montant libre",
      empty: "Aucun lien de paiement pour l'instant. Créez-en un pour obtenir un QR et un lien à partager.",
      loading: "Chargement des liens de paiement…",
      loadError: "Impossible de charger les liens de paiement.",
      readOnly: "Vous avez un accès en lecture seule aux liens de paiement dans cette organisation.",
      createError: "Impossible de créer le lien de paiement.",
      deleteError: "Impossible de supprimer le lien de paiement.",
      network: { dev: "Testnet", prod: "Réseau public" },
      modal: {
        eyebrow: "Lien de paiement", title: "Créer un lien de paiement",
        desc: "Générez un lien SEP-7 et un QR que votre client peut payer depuis n'importe quel portefeuille Stellar.",
        kind: "Type", kindPay: "Lien de paiement (le client paie)", kindTx: "Transaction (source connue)",
        kindPayHint: "Pas de compte source — renvoie une URI de paiement + QR.",
        kindTxHint: "Source connue — renvoie une transaction non signée à signer.",
        destination: "Destination", destinationHint: "Compte Stellar qui reçoit les fonds (G…).",
        source: "Source", sourceHint: "Compte Stellar du payeur (G…).",
        amount: "Montant", amountHint: "Laissez vide pour que le payeur choisisse (dons).",
        asset: "Actif", assetIssuer: "Émetteur de l'actif", assetIssuerHint: "Requis pour les actifs non natifs (G…).",
        memo: "Mémo", memoHint: "MEMO_ID numérique — généré automatiquement si vide.",
        message: "Message", messageHint: "Affiché au payeur dans son portefeuille (≤ 300 caractères).",
        submit: "Créer le lien",
      },
      detail: {
        eyebrow: "Lien de paiement", title: "Lien de paiement prêt",
        scan: "Scannez pour payer", downloadQr: "Télécharger le QR",
        uri: "URI SEP-7", xdr: "XDR non signé",
        openWallet: "Ouvrir dans le portefeuille", copyLink: "Copier le lien", copyUri: "Copier l'URI",
        fields: { id: "ID", status: "Statut", kind: "Type", network: "Réseau", destination: "Destination", source: "Source", amount: "Montant", asset: "Actif", memo: "Mémo", message: "Message", txHash: "ID de transaction", created: "Créé" },
        delete: "Supprimer",
        deleteTitle: "Supprimer le lien de paiement", deleteBody: "« {id} » sera supprimé. Action irréversible.", deleteConfirm: "Supprimer le lien",
      },
      status: { PENDING: "En attente", SUBMITTED: "Soumis", SUCCEEDED: "Réussi", FAILED: "Échoué", CANCELLED: "Annulé", EXPIRED: "Expiré" },
    },
    balances: {
      title: "Soldes",
      sub: "Réglés directement sur votre compte Stellar, en temps réel",
      note: "Cosmos Pay ne détient jamais vos fonds — chaque paiement est réglé directement sur votre propre compte Stellar dès qu’il est effectué.",
      total: "SOLDE TOTAL",
      across: "réparti sur 3 actifs",
      explorer: "Voir sur l’explorateur",
      recent: "Règlements récents",
      payment: "Paiement",
      tableHead: {
        transaction: "Transaction",
        type: "Type",
        amount: "Montant",
        status: "Statut",
        date: "Date"
      }
    },
    customers: {
      title: "Clients",
      sub: "{n} clients",
      add: "Ajouter un client",
      searchPlaceholder: "Rechercher des clients…",
      tableHead: {
        name: "Nom",
        email: "E-mail",
        spend: "Dépense totale",
        payments: "Paiements",
        since: "Depuis"
      },
      empty: "Aucun client trouvé.",
      modal: {
        eyebrow: "Client",
        title: "Ajouter un client",
        desc: "Créez un client pour suivre les paiements et les soldes.",
        name: "Nom",
        email: "E-mail",
        add: "Ajouter un client"
      }
    },
    products: {
      title: "Produits et liens",
      sub: "Plans récurrents et liens de paiement",
      add: "Nouveau produit",
      tableHead: {
        name: "Nom",
        price: "Prix",
        type: "Type",
        status: "Statut"
      },
      types: {
        Recurring: "Récurrent",
        "One-time": "Ponctuel",
        "Payment link": "Lien de paiement"
      },
      modal: {
        eyebrow: "Produit",
        title: "Créer un produit",
        desc: "Vendez un plan, un article ponctuel ou un lien de paiement flexible.",
        name: "Nom",
        price: "Prix (USDC)",
        priceHint: "(laisser vide pour un montant fixé par le client)",
        type: "Type",
        create: "Créer un produit"
      }
    },
    apikeys: {
      readOnly: "Vous avez un accès en lecture seule — seuls les owners et admins peuvent créer ou révoquer des clés API.",
      title: "Clés d’API",
      sub: "Clés secrètes pour l’API Cosmos Pay. Créez-en autant que nécessaire.",
      create: "Créer une clé secrète",
      tableHead: {
        name: "Nom",
        id: "ID de la clé",
        role: "Rôle",
        permissions: "Permissions",
        created: "Créée"
      },
      empty: "Aucune clé d’API pour l’instant.",
      locked: "Verrouillée",
      loading: "Chargement des clés d’API…",
      loadError: "Impossible de charger vos clés d’API.",
      createError: "Impossible de créer la clé d’API.",
      updateError: "Impossible de mettre à jour la clé d’API.",
      deleteError: "Impossible de révoquer la clé d’API.",
      revoke: "Révoquer",
      edit: "Modifier",
      unnamed: "Clé sans nom",
      none: "—",
      revokeTitle: "Révoquer la clé d’API",
      revokeBody: "« {name} » sera révoquée définitivement et toute application qui l’utilise cessera de fonctionner. Cette action est irréversible.",
      revokeConfirm: "Révoquer la clé",
      usage: "{used} / {limit}",
      limitReached: "Vous avez atteint la limite de clés de votre forfait. Passez à un forfait supérieur pour en ajouter."
    },
    webhooks: {
      title: "Webhooks",
      sub: "Événements en temps réel lorsque les paiements sont réglés sur Stellar",
      add: "Ajouter un endpoint",
      endpoints: "Endpoints",
      recent: "Livraisons récentes",
      eventsCount: "{n} événements",
      tableHead: {
        url: "URL",
        events: "Événements",
        status: "Statut",
        event: "Événement",
        response: "Réponse",
        when: "Quand"
      },
      modal: {
        eyebrow: "Webhook",
        title: "Ajouter un endpoint",
        desc: "Nous enverrons les charges utiles d’événements en POST vers cette URL.",
        urlLabel: "URL de l’endpoint",
        eventsLabel: "Événements à envoyer",
        add: "Ajouter un endpoint"
      }
    },
    logs: {
      title: "Journaux d’API",
      sub: "Chaque requête vers l’API Cosmos Pay — cliquez sur une ligne pour l’inspecter",
      searchPlaceholder: "Rechercher par endpoint…",
      tableHead: {
        method: "Méthode",
        endpoint: "Endpoint",
        status: "Statut",
        time: "Durée",
        timestamp: "Horodatage"
      },
      reqHeaders: "En-têtes de requête",
      params: "Paramètres de requête / de corps",
      response: "Réponse",
      meta: "Méta"
    },
    settings: {
      title: "Organisation",
      sub: "Gérer {org}",
      org: {
        title: "Détails",
        name: "Nom",
        id: "ID de l’organisation",
        created: "Créée le"
      },
      plan: {
        title: "Plan et limites",
        change: "Changer de plan",
        current: "Plan actuel",
        orgs: "Organisations",
        apiKeys: "Clés API",
        unlimited: "Illimité",
        manage: "Gérer les organisations",
        changeTitle: "Changer de forfait",
        changeSub: "Changez de forfait. Ceci est une simulation — rien n’est facturé.",
        save: "Mettre à jour le forfait",
        liveKeys: "Clés de production",
        seats: "Sièges d’équipe",
        confirmSwitch: "Changer d’offre",
        downgradeNote: "Les ressources au-delà des nouvelles limites seront verrouillées jusqu’au prochain changement d’offre.",
        feature: "Fonctionnalité",
        youAreHere: "Actuel",
        upgrade: "Évoluer",
        downgrade: "Réduire",
        switchTo: "Passer à {plan}",
        price: "Prix",
        perTx: "Par transaction",
        mainnet: "Paiements en direct",
        settle: "Règlement",
        apiAccess: "Accès API",
        apiLevels: { notifications: "Notifications de paiement", partial: "API partielle", full: "API complète" }, perOrgNote: "Les clés API et les membres se gèrent dans chaque organisation."
      },
      appearance: {
        title: "Apparence",
        theme: "Thème",
        light: "Clair",
        dark: "Sombre"
      },
      team: {
        title: "Équipe",
        add: "+ Ajouter un membre",
        roles: {
          Admin: "Administrateur",
          Developer: "Développeur",
          Analyst: "Analyste",
          Viewer: "Observateur",
          Owner: "Propriétaire"
        }
      },
      teamModal: {
        eyebrow: "Équipe",
        title: "Inviter un membre d’équipe",
        desc: "Cette personne recevra une invitation par e-mail à rejoindre {org}.",
        name: "Nom complet",
        email: "E-mail",
        role: "Rôle",
        send: "Envoyer l’invitation"
      }
    },
    pagination: {
      prev: "Précédent",
      next: "Suivant",
      range: "{from}–{to} sur {total}"
    },
    notifications: {
      title: "Notifications",
      empty: "Aucune notification pour l’instant.",
      loadError: "Impossible de charger les notifications.",
      origin: "Origine",
      markAll: "Tout marquer comme lu",
      types: {
        "auth.login": "Nouvelle connexion",
        "support.reply": "RÃ©ponse du support",
        "apikey.created": "Clé d’API créée",
        "apikey.updated": "Clé d’API mise à jour",
        "apikey.deleted": "Clé d’API révoquée",
        custom: "Notification"
      },
      subtitle: "Connexions et modifications de votre compte",
      viewAll: "Voir toute l’activité",
      location: "Emplacement",
      device: "Appareil",
      ip: "Adresse IP",
      localhost: "localhost"
    },
    support: {
      title: "Assistance",
      subtitle: "Discutez avec l’équipe Cosmos Pay",
      placeholder: "Écrivez un message…",
      send: "Envoyer",
      empty: "Aucun message pour l’instant. Envoyez le premier et nous vous répondrons.",
      loadError: "Impossible de charger la conversation.",
      sendError: "Impossible d’envoyer votre message.",
      you: "Vous",
      staff: "Assistance",
      inboxTitle: "Boîte d’assistance",
      inboxSubtitle: "Répondez à vos utilisateurs et aidez-les",
      conversations: "Conversations",
      noConversations: "Aucune conversation pour l’instant.",
      selectConversation: "Sélectionnez une conversation pour répondre.",
      customer: "Client",
      reply: "Répondre",
      replyPlaceholder: "Écrivez une réponse…",
      newTicket: "Nouveau ticket",
      newTicketTitle: "Ouvrir un nouveau ticket",
      subjectLabel: "Sujet",
      subjectPlaceholder: "Bref résumé du problème",
      messageLabel: "Message",
      create: "Ouvrir le ticket",
      createError: "Impossible d’ouvrir le ticket.",
      myTickets: "Mes tickets",
      lastSeen: "Vu {when}",
      online: "En ligne",
      seen: "Vu",
      priorities: { low: "Basse", normal: "Normale", high: "Haute", urgent: "Urgente" },
      noTickets: "Aucun ticket pour l’instant.",
      selectTicket: "Sélectionnez un ticket pour le voir.",
      tickets: "Tickets",
      all: "Tous",
      statusError: "Impossible de mettre à jour le statut.",
      statuses: { open: "Ouvert", pending: "En attente", resolved: "Résolu", closed: "Fermé" }
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
      user: "Utilisateur",
      support: "Assistance",
      admin: "Administrateur",
      owner: "Propriétaire"
    },
    account: {
      title: "Compte",
      sub: "Gérez votre compte personnel",
      profile: { title: "Profil", name: "Nom", email: "E-mail", role: "Rôle", note: "Votre nom, photo et bio se modifient ici.",
        displayName: "Nom affiché", displayNamePlaceholder: "Votre nom", bio: "Bio", bioPlaceholder: "Une ligne sur vous ou votre entreprise",
        edit: "Modifier", save: "Enregistrer", saving: "Enregistrement…", uploadPhoto: "Importer une photo", changePhoto: "Changer la photo", removePhoto: "Retirer",
        photoHint: "PNG, JPG ou WebP — carrée de préférence.", saved: "Profil mis à jour", saveError: "Impossible de mettre à jour votre profil.",
        photoTooLarge: "Cette image est trop volumineuse. Choisissez-en une de moins de 8 Mo.", photoInvalid: "Ce fichier n’est pas une image prise en charge.",
        editNote: "L’e-mail et le rôle proviennent de votre connexion Cosmos Pay." },
      session: { title: "Session", desc: "Déconnectez-vous du tableau de bord Cosmos Pay sur cet appareil.", signOut: "Se déconnecter" },
    },
    users: {
      title: "Utilisateurs",
      subtitle: "Gérez les rôles et les forfaits des comptes",
      loadError: "Impossible de charger les utilisateurs.",
      saveError: "Impossible de mettre à jour l’utilisateur.",
      saved: "Utilisateur mis à jour",
      search: "Rechercher des utilisateurs…",
      name: "Nom",
      email: "Email",
      role: "Rôle",
      plan: "Forfait",
      empty: "Aucun utilisateur trouvé."
    },
    orgs: {
      permissionsLabel: "Autorisations",
      permResource: "Autorisation",
      resources: { apiKeysTest: "Clés API de test", apiKeysLive: "Clés API de production", webhooks: "Webhooks", products: "Produits", customers: "Clients", payments: "Liens de paiement" },
      actions: { create: "Créer", edit: "Modifier", delete: "Supprimer" },
      permissions: { apiKeysTest: "Créer des clés API de test", apiKeysLive: "Créer des clés API de production", webhooks: "Créer des endpoints webhook", products: "Créer des produits", customers: "Créer des clients", payments: "Créer des liens de paiement" },
      editMember: "Modifier",
      editMemberTitle: "Modifier le membre",
      save: "Enregistrer",
      memberUpdated: "Membre mis à jour",
      memberUpdateError: "Impossible de mettre à jour le membre.",
      adminAllNote: "Les admins peuvent tout faire dans l’organisation.",
      removeMemberTitle: "Retirer le membre",
      removeMemberBody: "Retirer {name} de {org} ? L’accès sera perdu immédiatement.",
      removeMemberConfirm: "Retirer",
      join: "Rejoindre",
      joined: "Vous avez rejoint l’organisation",
      joinError: "Impossible d’accepter l’invitation.",
      bannerTitle: "Vous êtes invité à rejoindre {org}",
      bannerSub: "Invité en tant que {role}",
      roleLabel: "Rôle",
      roleMemberHint: "Les collaborateurs peuvent voir le tableau de bord mais ne peuvent pas créer de clés API ni gérer l’organisation.",
      roleAdminHint: "Les admins peuvent créer des clés API et gérer l’organisation et ses membres.",
      inviteMember: "Inviter un membre",
      invited: "Invitation envoyée",
      inviteError: "Impossible d’envoyer l’invitation.",
      inviteHint: "Nous lui enverrons un lien magique valable 3 jours. Les sièges sont par organisation.",
      send: "Envoyer l’invitation",
      sending: "Envoi…",
      pending: "Invitations en attente",
      expires: "Expire le {date}",
      revokeInvite: "Révoquer",
      revokeError: "Impossible de révoquer l’invitation.",
      loadError: "Impossible de charger les organisations.",
      createError: "Impossible de créer l’organisation.",
      renameError: "Impossible de renommer l’organisation.",
      deleteError: "Impossible de supprimer l’organisation.",
      rename: "Renommer",
      renameTitle: "Renommer l’organisation",
      delete: "Supprimer l’organisation",
      deleteTitle: "Supprimer l’organisation",
      deleteBody: "« {name} » sera supprimée définitivement avec ses membres. Cette action est irréversible.",
      deleteConfirm: "Supprimer",
      members: "Membres",
      membersSub: "Personnes ayant accès à cette organisation",
      addMember: "Ajouter un membre",
      memberEmail: "Email du membre",
      memberEmailHint: "Il doit déjà avoir un compte Cosmos Pay.",
      add: "Ajouter",
      remove: "Retirer",
      you: "Vous",
      roles: {
        owner: "Propriétaire",
        admin: "Administrateur",
        member: "Membre"
      },
      memberAddError: "Impossible d’ajouter ce membre. Vérifiez que l’email correspond à un compte Cosmos Pay.",
      memberRemoveError: "Impossible de retirer le membre.",
      empty: "Aucun membre pour l’instant."
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
        fields: { id: "ID", status: "Status", network: "Network", source: "Source", destination: "Destination", sent: "Sent", received: "Received (est.)", minimum: "Minimum", fee: "Commission", memo: "Memo", commissionMemo: "Commission memo", txHash: "Transaction ID", created: "Created" },
        submitTitle: "Submit signed transaction",
        submitDesc: "Paste the signed XDR returned by the wallet to broadcast the swap.",
        submitPlaceholder: "Signed transaction XDR…",
        submit: "Submit", submitting: "Submitting…",
        submitted: "Swap submitted",
        submitFailed: "The swap could not be submitted.",
        resultCodes: "Result codes",
      },
    },
    liquidity: {
      title: "Pools de liquidité",
      sub: "{n} operations · AMM pools on Stellar",
      deposit: "Deposit",
      withdraw: "Withdraw",
      readOnly: "You have read-only access to liquidity pools in this organization.",
      tabs: { operations: "Operations", pools: "Pools", positions: "Positions" },
      searchPlaceholder: "Search by pool, account or ID…",
      filters: { all: "All", PENDING: "Pending", SUBMITTED: "Submitted", SUCCEEDED: "Succeeded", FAILED: "Failed" },
      status: { PENDING: "Pending", SUBMITTED: "Submitted", SUCCEEDED: "Succeeded", FAILED: "Failed", EXPIRED: "Expired" },
      kind: { DEPOSIT: "Deposit", WITHDRAW: "Withdraw" },
      sharesUnit: "shares",
      bps: "bps",
      opsHead: { id: "Operation", kind: "Type", pool: "Pool", amounts: "Amounts", status: "Status", created: "Created" },
      empty: "No liquidity operations yet. Deposit into a pool to get an unsigned transaction to sign.",
      loading: "Loading operations…",
      loadError: "Couldn't load liquidity operations.",
      network: { dev: "Testnet", prod: "Public network" },
      pools: {
        assetA: "Asset A", assetAIssuer: "Issuer A", assetB: "Asset B", assetBIssuer: "Issuer B",
        assetHint: "Asset code — leave empty or XLM for lumens.",
        search: "Search pools", searching: "Searching…", loading: "Loading pools…",
        empty: "No pools match this pair.",
        error: "Couldn't load liquidity pools.",
        head: { pool: "Pool", reserves: "Reserves", shares: "Total shares", trustlines: "Holders", fee: "Fee" },
      },
      positions: {
        account: "Account", accountHint: "Stellar account whose pool shares to inspect (G…).",
        load: "Load positions", loadingBtn: "Loading…",
        prompt: "Enter an account to see its pool share positions.",
        empty: "This account holds no pool shares.",
        error: "Couldn't load positions.",
        head: { pool: "Pool", shares: "Shares", share: "Share of pool", redeemable: "Redeemable" },
      },
      modal: {
        eyebrow: "Liquidity",
        depositTitle: "Deposit liquidity",
        depositDesc: "Deposit both assets of a pair into the AMM pool and receive pool shares. You'll get an unsigned transaction to sign.",
        withdrawTitle: "Withdraw liquidity",
        withdrawDesc: "Burn pool shares to receive both reserve assets proportionally. You'll get an unsigned transaction to sign.",
        source: "Source account", sourceHint: "Stellar account funding and signing the deposit (G…).",
        withdrawSourceHint: "Stellar account holding the pool shares (G…).",
        assetA: "Asset A", assetB: "Asset B", assetHint: "Asset code (XLM for lumens).",
        assetAIssuer: "Issuer A", assetBIssuer: "Issuer B", issuerHint: "Required for non-native assets (G…).",
        maxAmountA: "Max amount A", maxAmountAHint: "Maximum of asset A to deposit.",
        maxAmountB: "Max amount B", maxAmountBHint: "Optional — derived from the pool price when omitted; required for a brand-new pool.",
        poolId: "Pool ID", poolIdHint: "64-character hex liquidity pool id.",
        shares: "Shares", sharesHint: "Amount of pool shares to burn.",
        slippage: "Slippage (bps)", slippageHint: "Max slippage in basis points (optional, e.g. 50).",
        trustNote: "If the account doesn't trust the pool shares yet, the transaction includes the trustline automatically.",
        create: "Build transaction", creating: "Building…",
        createError: "Couldn't build the transaction.",
        commissionNote: "The plan commission applies only to your earnings — the gain over what you deposited — never to your principal. Positions opened outside Cosmos Pay are not charged.",
      },
      detail: {
        eyebrow: "Liquidity",
        titleDeposit: "Deposit ready", titleWithdraw: "Withdrawal ready",
        scan: "Scan to sign", downloadQr: "Download QR",
        uri: "SEP-7 URI", xdr: "Unsigned XDR",
        openWallet: "Open in wallet", viewExplorer: "View on explorer",
        fields: { id: "ID", kind: "Type", status: "Status", network: "Network", source: "Source", pool: "Pool", pair: "Pair", maxDeposit: "Max deposit", minReceived: "Minimum received", shares: "Shares", priceBounds: "Price bounds (A/B)", commission: "Commission", commissionMemo: "Commission memo", txHash: "Transaction ID", created: "Created" },
        submitTitle: "Submit signed transaction",
        submitDesc: "Paste the signed XDR returned by the wallet to broadcast the operation.",
        submitPlaceholder: "Signed transaction XDR…",
        submit: "Submit", submitting: "Submitting…",
        submitted: "Operation submitted",
        submitFailed: "The operation could not be submitted.",
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

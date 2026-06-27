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
    getKeys: "Obtenir des clés API",
    dashboard: "Tableau de bord",
    menu: "Menu",
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
      developers: "Clés API",
      webhook: "Webhooks",
      logs: "Journaux d’API",
      weblogs: "Journaux de webhooks",
      settings: "Organisation",
      account: "Compte",
      activity: "Activité",
      support: "Assistance",
      inbox: "Boîte d’assistance",
      users: "Utilisateurs"
    },
    sidebar: {
      sections: {
        Platform: "Plateforme",
        Build: "Développer",
        Account: "Compte",
        Support: "Assistance"
      },
      items: {
        overview: "Aperçu",
        payments: "Paiements",
        balances: "Soldes",
        customers: "Clients",
        products: "Produits",
        developers: "Clés API",
        webhook: "Webhooks",
        logs: "Journaux",
        weblogs: "Journaux webhook",
        settings: "Organisation",
        account: "Compte",
        activity: "Activité",
        support: "Assistance",
        inbox: "Boîte",
        users: "Utilisateurs"
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
      viewPlans: "Voir les plans"
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
        scopeResources: { payments: "Paiements", webhooks: "Webhooks", products: "Produits", customers: "Clients" },
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
    }
  }
};

/* fr.js: French message catalog. Mirrors en.js exactly in shape. */
export default {
  ui: { close: "Fermer", dialog: "Boîte de dialogue", copyToClipboard: "Copier dans le presse-papiers", search: "Rechercher", searchEllipsis: "Rechercher…", select: "Sélectionner…", account: "Compte", onboardingSteps: "Étapes de l’inscription", skipToContent: "Aller au contenu" },
  zk: {
    title: "Paiements privés",
    commission: "Commission",
    commissionRate: "0,01 % par transaction",
    amount: "Montant",
    merchantGets: "Le marchand reçoit",
    youPay: "Vous payez",
    status: {
      PENDING: "En attente",
      SUCCEEDED: "Payé",
      EXPIRED: "Expiré",
    },
    unavailable: "Les paiements privés ne sont pas encore disponibles sur ce réseau.",
    cannotProve: "Ce navigateur ne peut pas générer les preuves. Ouvrez la page dans Chrome, Edge ou Firefox.",
    freighter: {
      missing: "Installez Freighter pour continuer.",
      declined: "Freighter a refusé la demande.",
      wrongNetwork: "Passez Freighter sur {network}.",
    },
    phases: {
      keys: "Signez deux fois dans Freighter pour dériver votre clé privée",
      proving: "Génération de la preuve…",
      signing: "Approuvez dans Freighter…",
      waiting: "En attente du réseau…",
    },
    view: { detail: { title: "Paiement privé", payer: "Payeur", paymentTx: "Transaction du paiement", feeTx: "Transaction de la commission", expires: "Expire", settled: "Réglé" },
      create: "Créer un paiement privé",
      empty: "Aucun paiement privé pour l’instant.",
      loadError: "Impossible de charger les paiements privés.",
      tableHead: {
        id: "Paiement",
        amount: "Montant",
        net: "Le marchand reçoit",
        fee: "Commission",
        status: "Statut",
        created: "Créé",
      },
      copyLink: "Copier le lien de paiement",
      openCheckout: "Ouvrir le paiement",
      searchPlaceholder: "Rechercher par ID, compte ou montant…",
    },
    modal: {
      title: "Nouveau paiement privé",
      recipient: "Compte qui reçoit",
      recipientHint: "Il doit avoir un compte confidentiel.",
      description: "Description",
      expires: "Expire dans",
      expiries: {
        m60: "1 heure",
        m1440: "24 heures",
        m10080: "7 jours",
      },
      submit: "Créer",
      submitting: "Création…",
      created: "Paiement privé créé",
      link: "Lien de paiement",
    },
    account: {
      title: "Comptes confidentiels",
      needWallet: "Pour recevoir des paiements privés, l’organisation a besoin d’au moins un portefeuille Stellar connecté.",
      viewBalances: "Voir les soldes",
      wrongAccount: "Freighter a un autre compte sélectionné. Passez à {wallet}.",
      register: "Créer le compte confidentiel",
      registered: "Actif",
      notRegistered: "Pas encore créé",
      spendable: "Disponible",
      receiving: "Entrant",
      merge: "Rendre l’entrant disponible",
      withdraw: "Retirer en XLM public",
      deposit: "Déposer des XLM",
      amountLabel: "Montant",
      refresh: "Actualiser",
      working: "En cours…",
      createdOk: "Compte confidentiel créé",
      depositOk: "Dépôt effectué",
      withdrawOk: "Retrait effectué",
      mergeOk: "L’entrant est disponible",
      done: "Terminé",
    },
    checkout: {
      title: "Paiement privé",
      to: "À",
      payPrivately: "Payer en privé",
      steps: {
        register: "Créer votre compte confidentiel",
        fund: "Placer des XLM sur votre solde confidentiel",
        pay: "Envoyer le paiement",
        fee: "Envoyer la commission",
        confirm: "Confirmer le paiement",
      },
      paid: "Paiement effectué",
      paidBody: "Le montant reste privé sur la blockchain.",
      expired: "Ce paiement a expiré.",
      notFound: "Ce paiement n’existe pas.",
      loadError: "Impossible de charger ce paiement.",
      retry: "Réessayer",
      transactions: "Transactions",
    },
  },
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
    goalsSub: "Choisissez tout ce qui s’applique. Nous adapterons votre tableau de bord et vous suggérerons le bon forfait.",
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
    planSub: "Starter est sans frais mensuels : vous ne payez que par transaction réussie. Changez à tout moment, sans appel.",
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
    specTagline: "Une API. Stellar, Solana et Monad.",
    specTaglineSub: "Acceptez et déplacez de l’argent en USDC avec un règlement en ~5 secondes. Choisissez le forfait qui convient et changez-en quand vous voulez.",
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
      standard: "Standard",
      priority: "Prioritaire"
    },
    plans: {
      starter: {
        desc: "Acceptez de vrais paiements sur Stellar, Solana et Monad",
        sub: "+ 25¢ / txn",
        pnote: "1% + 25¢ par transaction",
        team: "Jusqu’à 2",
        feats: ["Accès partiel à l’API", "Clés en direct et de test", "Règlement en USDC", "Jusqu’à 2 membres"]
      },
      growth: {
        desc: "Tarifs réduits pour les équipes en croissance",
        sub: "/mois · à partir de",
        pnote: "à partir de · 0,2% + 5¢ par txn",
        team: "Illimité",
        feats: ["Tout de Starter", "Taux par transaction réduit", "Membres illimités", "Outils anti-fraude Radar", "Remises sur volume", "Assistance prioritaire"]
      }
    }
  },

  /* ---------------- /login ---------------- */

  nav: {
    login: "Se connecter",
    getKeys: "Obtenir mes clés",
    dashboard: "Tableau de bord",
    menu: "Menu",
    docs: "Documentation",
    main: "Principale",
    closeMenu: "Fermer le menu",
    theme: "Mode sombre",
    language: "Langue",
    items: {
      products: {
        label: "Produits",
        cols: [
          {
            head: "Encaisser de l’argent",
            links: [
              {
                t: "Paiements",
                s: "Stellar, Solana et Monad"
              },
              {
                t: "Checkout",
                s: "Page de paiement hébergée"
              },
              {
                t: "Liens de paiement",
                s: "Liens de paiement sans code"
              },
              {
                t: "Facturation",
                s: "Facturation en stablecoins"
              }
            ]
          },
          {
            head: "Transférer de l’argent",
            links: [
              {
                t: "Versements",
                s: "Envoyez des fonds dans le monde entier"
              },
              {
                t: "Transfrontalier",
                s: "Règlement sans frontières"
              },
              {
                t: "Anchors",
                s: "Rampes d’entrée et de sortie fiat"
              },
              {
                t: "Swaps",
                s: "Tout jeton, tout réseau, sans compte"
              }
            ]
          },
          {
            head: "Construire avec",
            links: [
              {
                t: "Stablecoins",
                s: "USDC et actifs multichaînes"
              },
              {
                t: "Portefeuilles",
                s: "Avec ou sans dépôt fiduciaire"
              },
              {
                t: "Registre",
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
                t: "SaaS et abonnements",
                s: "Revenus récurrents à grande échelle"
              },
              {
                t: "Marketplaces",
                s: "Paiements et reversements partagés"
              },
              {
                t: "Plateformes",
                s: "Intégrez les paiements pour vos utilisateurs"
              },
              {
                t: "Finance intégrée",
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
                t: "Voyage et mobilité",
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
                t: "Référence de l’API",
                s: "REST et GraphQL"
              },
              {
                t: "SDK et bibliothèques",
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
                t: "État des services",
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
          title: "Démarrage rapide",
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
                t: "Tutoriels",
                s: "Tutoriels pas à pas"
              },
              {
                t: "Blog",
                s: "Ingénierie et produit"
              },
              {
                t: "Témoignages clients",
                s: "Construit sur Cosmos Pay"
              }
            ]
          },
          {
            head: "Assistance",
            links: [
              {
                t: "Centre d’aide",
                s: "Réponses et guides pratiques"
              },
              {
                t: "Communauté",
                s: "Forum et Discord"
              },
              {
                t: "Contacter l’équipe commerciale",
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
    copyright: "© 2026 Cosmos Pay",
    groups: {
      products: {
        title: "Produits",
        links: ["Paiements", "Stablecoins", "Versements", "Anchors", "Portefeuilles", "Checkout", "Liens de paiement", "Tarifs"]
      },
      solutions: {
        title: "Solutions",
        links: ["SaaS et abonnements", "Marketplaces", "E-commerce", "Plateformes", "Finance intégrée", "IA et agents", "Enterprise"]
      },
      developers: {
        title: "Développeurs",
        links: ["Documentation", "Référence de l’API", "SDK et bibliothèques", "Webhooks", "État de l’API", "Changelog", "Tableau de bord"]
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
      tagline: "Votre monde numérique en mouvement.",
      headline: "Écrivez moins de code -> transférez plus d’argent",
      lede: "L’infrastructure de paiement pour les développeurs. Une seule API pour transférer de l’argent sur Stellar, Solana et Monad : des stablecoins et des actifs numériques réglés en quelques secondes, dans plus de 130 pays, avec des frais de l’ordre d’une fraction de centime.",
      getKeys: "Obtenir des clés API",
      trustedBy: "La confiance des équipes d’ingénierie de"
    },
    wallet: {
      title: "Votre monde numérique dans un wallet.",
      lede: "Installez-le dans Chrome, essayez-le directement dans le navigateur ou emportez-le sur votre téléphone. Le même compte partout, sur Stellar, Solana et Monad.",
      chrome: { t: "Installer sur Chrome", s: "Extension officielle sur le Chrome Web Store." },
      web: { t: "Essayer dans le navigateur", s: "Ouvrez l’application web, rien à installer." },
      android: { t: "Télécharger pour Android", s: "APK signé. Autorisez \"Installer des applications inconnues\" pour votre navigateur, ouvrez le fichier et installez." },
      moreLabel: "Autres plateformes",
      versionLabel: "Version",
      download: "Télécharger",
      more: {
        firefox: { t: "Firefox", s: "Non signé. Allez dans about:debugging, choisissez \"Ce Firefox\", puis \"Charger un module temporaire\" et sélectionnez le manifest.json du zip." },
        windows: { t: "Windows", s: "SmartScreen avertit la première fois : cliquez sur \"Informations complémentaires\", puis \"Exécuter quand même\"." },
        macos: { t: "macOS (Apple Silicon)", s: "Gatekeeper bloque la première fois : clic droit sur l’application, puis \"Ouvrir\"." },
        linux: { t: "Linux", s: "AppImage : lancez chmod +x avant. Nécessite glibc 2.39 ou plus récent." },
      },
      ios: "Il n’existe pas encore de version iOS.",
    },
    devs: {
      title: "Envie d’intégrer Cosmos Pay Wallet à votre startup ?",
      lede: "Une commande et un lien. Votre assistant de code fait le reste.",
      installTitle: "Installez le SDK",
      installDesc: "JavaScript et TypeScript, pour le serveur et pour le navigateur. Un paquet, deux points d’entrée.",
      llmsTitle: "Donnez la doc à votre assistant",
      llmsDesc: "Claude Code, Codex et Cursor lisent l’index en texte brut et savent aussitôt utiliser le SDK.",
      llmsBtn: "Ouvrir llms.txt",
      docsBtn: "Voir la documentation",
    },
    api: {
      kicker: "// la plateforme",
      title: "Des API puissantes",
      lede: "Nos API modulaires permettent aux développeurs d’intégrer des flux financiers complexes en quelques minutes, pas en plusieurs mois.",
      docsLink: "Voir la documentation de l’API",
      cards: {
        payments: {
          title: "Paiements",
          desc: "Envoyez et recevez des paiements sur Stellar, Solana et Monad avec une finalité en quelques secondes et des frais quasi nuls."
        },
        stablecoin: {
          title: "Stablecoins",
          desc: "Réglez en USDC et autres actifs sur Stellar, Solana et Monad, on-chain et en temps réel."
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
      lede: "Conçue pour gérer les charges de travail les plus importantes au monde, et pour s’intégrer à n’importe quelle stack que vous utilisez déjà.",
      scale: ["requêtes API / jour", "requêtes / sec", "finalité on-chain", "disponibilité"],
      paths: [
        {
          t: "Sans code",
          d: "Lancez des liens de paiement et de la facturation directement depuis votre tableau de bord, sans aucun développement.",
          a: "Explorer le sans-code"
        },
        {
          t: "Interface prête à l’emploi",
          d: "Intégrez Checkout ou Elements et acceptez des paiements sur Stellar, Solana et Monad en quelques minutes, avec des composants aux couleurs de votre marque.",
          a: "Voir les composants"
        },
        {
          t: "Construisez la vôtre",
          d: "Utilisez nos API REST + GraphQL, nos SDK typés et notre CLI pour créer une intégration multichaîne entièrement sur mesure.",
          a: "Lire la documentation"
        }
      ],
      mockLink: "Lien de paiement · 19.99 USDC",
      mockPay: "Payer"
    },
    solutions: {
      kicker: "// solutions",
      title: "Conçu pour chaque modèle économique.",
      lede: "De votre première transaction à des milliards de volume, Cosmos Pay s’adapte à la façon dont votre entreprise transfère de l’argent sur Stellar, Solana et Monad.",
      eyebrow: "Solution",
      startBuilding: "Commencer à développer",
      items: {
        pay: {
          t: "Acceptez les paiements multichaînes",
          d: "Envoyez et recevez des paiements sur Stellar, Solana et Monad avec une finalité en quelques secondes et des frais de l’ordre d’une fraction de centime.",
          long: "Acceptez des paiements de toute personne disposant d’un wallet Stellar, Solana ou Monad. Les fonds atteignent la finalité en quelques secondes et sont réglés directement sur votre compte, sans rétrofacturation, sans intermédiaire et sans blocage de plusieurs jours.",
          points: ["Finalité de règlement en quelques secondes", "Des frais de l’ordre d’une fraction de centime", "Envoyez et recevez sur Stellar, Solana et Monad", "Webhooks en temps réel sur chaque paiement"]
        },
        coin: {
          t: "Règlement en stablecoins",
          d: "Réglez en USDC et autres actifs sur Stellar, Solana et Monad, on-chain et en temps réel.",
          long: "Détenez et réglez des soldes en USDC et autres stablecoins réglementés sur Stellar, Solana et Monad. Chaque transaction est enregistrée on-chain et rapprochée automatiquement dans votre registre en temps réel.",
          points: ["Stablecoins réglementés adossés à 1:1", "Règlement on-chain et auditable", "Registre multi-actifs en temps réel", "Rapprochement automatique"]
        },
        globe: {
          t: "Argent transfrontalier",
          d: "Atteignez plus de 130 pays via des réseaux ouverts et mondiaux, sans banques correspondantes.",
          long: "Transférez de l’argent au-delà des frontières comme vous le feriez localement. Stellar, Solana et Monad atteignent plus de 130 pays sans banques correspondantes, de sorte que les reversements arrivent en quelques secondes plutôt qu’en plusieurs jours.",
          points: ["Plus de 130 pays, une seule API", "Aucun délai lié aux banques correspondantes", "Change transparent et annoncé à l’avance", "Règlement en quelques secondes"]
        },
        ramp: {
          t: "Rampes d’entrée et de sortie",
          d: "Connectez-vous aux anchors Stellar pour les dépôts et retraits en devise locale.",
          long: "Permettez à vos utilisateurs de passer de la devise locale aux actifs numériques via des anchors Stellar réglementés. Dépôts et retraits dans des dizaines de devises locales, entièrement pris en charge par les standards SEP.",
          points: ["Réseau d’anchors réglementés", "Des dizaines de devises locales", "Flux standards SEP-6 / SEP-24", "KYC géré par l’anchor"]
        },
        wallet: {
          t: "Wallets intégrés",
          d: "Créez des wallets avec ou sans dépôt fiduciaire sur Stellar, Solana et Monad pour vos utilisateurs.",
          long: "Offrez à chaque utilisateur un wallet multichaîne (Stellar, Solana et Monad) au sein de votre produit. Choisissez des wallets avec dépôt fiduciaire que vous gérez, ou sans dépôt fiduciaire que vos utilisateurs contrôlent. Les deux sont provisionnés en un seul appel API.",
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
      title: "Simple. Sûr. Sans limites.",
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
          label: "de règlement transfrontalier plus rapide après le passage à Cosmos Pay.",
          tags: ["Paiements", "Stablecoins", "Portefeuilles"],
          story: "Northwind a migré son paiement mondial vers Cosmos Pay sur Stellar, Solana et Monad, réduisant le règlement de plusieurs jours à quelques secondes et diminuant fortement les coûts de change sur plus de 30 marchés, tout en conservant un registre unique et rapproché."
        },
        Lumio: {
          metric: "6 sem.",
          label: "pour lancer des abonnements en USDC dans 40 pays.",
          tags: ["Facturation", "USDC", "Anchors"],
          story: "Lumio a remplacé un patchwork de prestataires régionaux par Cosmos Pay, lançant des abonnements libellés en USDC dans 40 pays en seulement six semaines grâce aux anchors pour les rampes d’entrée et de sortie locales."
        },
        Helios: {
          label: "reversés à des vendeurs du monde entier via Stellar, Solana et Monad.",
          tags: ["Versements", "Connect", "Rampes"],
          story: "Helios reverse à une base de vendeurs mondiale entièrement on-chain. L’an dernier, l’entreprise a réglé 2,4 Md$ à des vendeurs dans 58 pays, avec des fonds arrivant en quelques secondes et une transparence on-chain totale."
        }
      }
    },
    testimonials: {
      kicker: "// témoignages",
      title: "Apprécié des développeurs et des équipes financières.",
      items: {
        MC: {
          q: "Cosmos Pay nous a permis de transférer de l’argent au-delà des frontières en quelques secondes. Nous avons remplacé trois prestataires par une seule API multichaîne.",
          r: "VP Ingénierie, Vertexa"
        },
        DO: {
          q: "La documentation est la meilleure que j’aie jamais utilisée. Nous avons réglé notre premier paiement en USDC avant le déjeuner, dès le premier jour.",
          r: "Fondateur, Quanta"
        },
        PN: {
          q: "Le rapprochement prenait une semaine. Le règlement on-chain le fait désormais pour nous en temps réel.",
          r: "Directeur financier, Riverstone"
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
          tag: "Rapport",
          t: "L’état des paiements en stablecoins en 2026",
          d: "Comment les équipes transfèrent de l’argent sur Stellar, Solana et Monad à l’échelle mondiale."
        },
        {
          tag: "Changelog",
          t: "Les webhooks de règlement multichaînes sont disponibles en GA",
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
    marketplace: {
      title: "Et si vous vouliez aussi vendre ?",
      lede: "Cosmos est la place de marché du même écosystème. Les commerçants y publient ce qu’ils vendent et encaissent avec l’infrastructure que vous intégrez ici. Même univers, l’autre côté du comptoir.",
      btn: "Découvrir Cosmos",
    },
    cta: {
      label: "Une nouvelle façon de faire bouger votre monde numérique.",
      thanks: "Merci de votre confiance.",
      title: "Commencez à développer dès aujourd’hui.",
      desc: "Lancez un sandbox testnet gratuit et passez en production sur Stellar, Solana et Monad dès que vous êtes prêt.",
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
    lede: "Une tarification transparente, basée sur l’usage. Démarrez sans frais mensuels : ne payez qu’un petit frais par transaction réussie.",
    monthly: "Mensuel",
    annual: "Annuel",
    save: "−17%",
    popular: "Le plus populaire",
    from: "à partir de",
    perMo: "/mois",
    billedYearly: "facturé annuellement",
    plans: [
      {
        name: "Starter",
        desc: "Encaissez de vrais paiements sans frais mensuels, avec une protection des paiements intégrée.",
        amt: "1%",
        txt: "+ 25¢ par transaction *",
        cta: "Commencer",
        feats: ["Paiements réels", "Clés API de test", "Protection des paiements", "Accès partiel à l'API", "Support standard", "Gestion des litiges", "Cartes et virements bancaires"]
      },
      {
        name: "Essentials",
        desc: "Accès complet à la plateforme avec gestion des litiges et tous les moyens de paiement.",
        txt: "+ 0.5% + 10¢ par transaction *",
        cta: "Choisir Essentials",
        feats: ["Tout ce qui est inclus dans Starter", "Accès complet à l'API", "Protection des paiements", "Gestion des litiges", "Cartes et virements bancaires", "Support e-mail prioritaire", "Remises sur volume"]
      },
      {
        name: "Growth",
        desc: "Des tarifs plus bas et plus de puissance pour les équipes en croissance.",
        txt: "+ 0.2% + 5¢ par transaction *",
        cta: "Choisir Growth",
        feats: ["Tout ce qui est inclus dans Essentials", "Tarif de 0.2% + 5¢ par transaction", "Membres d’équipe illimités", "Outils antifraude avancés", "Remises sur volume", "Support prioritaire", "Routage intelligent des paiements"]
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
    footnote: "* Chaque transaction inclut également un petit frais de réseau. Le plan Starter couvre nos fonctionnalités de paiement essentielles ; Essentials et Growth débloquent l’accès complet à l’API, la gestion des litiges et tous les moyens de paiement, y compris les cartes et les virements bancaires.",
    compareTitle: "Comparer les plans",
    orgsRow: "Organisations",
    seatsRow: "Membres par organisation",
    keysRow: "Clés API",
    compareHead: ["Fonctionnalité", "Starter", "Essentials", "Growth", "Enterprise"],
    compare: [
      {
        l: "Frais mensuels",
        v: ["Sans frais", "$33 / mo", "$99 / mo", "Sur mesure"]
      },
      {
        l: "Frais par transaction",
        v: ["1% + 25¢", "0.5% + 10¢", "0.2% + 5¢", "Sur mesure"]
      },
      {
        l: "Vitesse de règlement",
        v: ["~5 sec", "~5 sec", "~5 sec", "~5 sec"]
      },
      {
        l: "Accès à l'API",
        v: ["Partiel", "Complet", "Complet", "Complet"]
      },
      {
        l: "Paiements réels",
        v: [1, 1, 1, 1]
      },
      {
        l: "Protection des paiements",
        v: [1, 1, 1, 1]
      },
      {
        l: "Gestion des litiges",
        v: [0, 1, 1, 1]
      },
      {
        l: "Cartes et virements bancaires",
        v: [0, 1, 1, 1]
      },
      {
        l: "Outils antifraude avancés",
        v: [0, 0, 1, 1]
      },
      {
        l: "Remises sur volume",
        v: [0, 0, 1, 1]
      },
      {
        l: "SSO / SAML",
        v: [0, 0, 0, 1]
      },
      {
        l: "Assistance",
        v: ["Standard", "E-mail prioritaire", "Prioritaire", "24/7 dédié"]
      }
    ],
    faqTitle: "Questions fréquentes",
    faqs: [
      {
        q: "Dois-je payer des frais mensuels ?",
        a: "Non. Starter est sans frais mensuels : vous ne payez qu’un petit frais par transaction réussie. Essentials et Growth ajoutent des frais mensuels en échange de tarifs plus bas."
      },
      {
        q: "Combien coûte une transaction ?",
        a: "Starter est à 1% + 25¢ par transaction réussie. Essentials est à 33 $/mois (ou 27,50 $/mois facturé annuellement) et abaisse le tarif à 0.5% + 10¢, tandis que Growth est à 99 $/mois et le ramène à 0.2% + 5¢. Un petit frais de réseau s’applique également à chaque transaction."
      },
      {
        q: "Quels moyens de paiement prenez-vous en charge ?",
        a: "Starter couvre nos moyens de paiement essentiels. À partir d’Essentials, vous pouvez également accepter les cartes, les virements bancaires et d’autres moyens de paiement locaux via une seule intégration."
      },
      {
        q: "À quelle vitesse l’argent est-il réglé ?",
        a: "Les paiements atteignent la finalité en environ cinq secondes, sur tous les plans. Il n’y a aucun délai de reversement de plusieurs jours."
      },
      {
        q: "Puis-je changer de plan plus tard ?",
        a: "Tout à fait. Montez ou descendez de gamme à tout moment depuis votre tableau de bord. Les changements prennent effet immédiatement, sans aucun appel."
      }
    ],
    ctaTitle: "Vous avez encore des questions ?",
    ctaDesc: "Parlez à notre équipe de la tarification au volume, de la conformité ou d’une migration depuis un autre prestataire.",
    contactSales: "Contacter le service commercial",
    openDashboard: "Ouvrir le tableau de bord"
  },
  swapsPage: {
    metaTitle: "Swaps | Cosmos Pay",
    metaDescription: "Échangez des jetons entre plus de 35 réseaux et envoyez de l’USDT0 depuis Stellar vers 21 réseaux, sans compte : votre portefeuille signe et personne ne garde vos fonds. API publique de swaps incluse.",
    title: "Échangez entre réseaux, sans compte",
    lede: "Choisissez ce que vous payez et ce que vous recevez. Votre portefeuille signe et les fonds ne passent jamais par Cosmos Pay.",
    facts: [
      { t: "Sans compte", s: "Ouvrez la page et échangez. L’API publique fonctionne de la même façon." },
      { t: "Plus de 35 réseaux", s: "Les marchés de Stellar, Solana et Monad, et tous les réseaux qu’atteint NEAR Intents." },
      { t: "Sans garde", s: "Chaque swap est une transaction que signe votre portefeuille ou une adresse de dépôt que vous payez." },
    ],
    fee: "Commission : {pct} par swap, plus les frais des réseaux.",
    usdt0Title: "USDT0 : de l’USDT natif depuis Stellar",
    usdt0Lede: "L’USDT0 sur Stellar est l’USDT omnichain de Tether. Envoyez-le 1:1 via LayerZero : il arrive en USDT natif sur Ethereum et en USDT0 sur {n} autres réseaux. Les seuls frais sont ceux de LayerZero, en XLM.",
    usdt0Cta: "Envoyer de l’USDT0",
    usdt0Networks: "Où il arrive",
    apiTitle: "Les mêmes swaps depuis votre code",
    apiLede: "L’API publique de swaps ne demande pas de compte non plus : prenez la clé publique partagée et appelez les endpoints qu’utilise cette page.",
    apiStep1: "Obtenir la clé publique",
    apiStep2: "Coter un swap entre réseaux",
    apiStep3: "Coter l’USDT0 sortant de Stellar",
    apiDocs: "Référence de l’API",
    faqTitle: "Questions",
    faq: [
      { q: "Faut-il un compte ?", a: "Non. La page et l’API publique utilisent une clé publique partagée. Un compte ajoute un historique dans le dashboard et, avec un forfait, une commission plus basse." },
      { q: "Qui garde mes fonds ?", a: "Personne. Un swap sur un réseau est une transaction que signe votre portefeuille, un swap entre réseaux est une adresse de dépôt que règle NEAR Intents, et l’USDT0 voyage via LayerZero." },
      { q: "Combien ça coûte ?", a: "{pct} par swap, plus les frais des réseaux. Envoyer de l’USDT0 depuis Stellar n’a pas de commission Cosmos Pay : seulement les frais de LayerZero, en XLM." },
      { q: "Pourquoi l’USDT0 laisse-t-il un infime reste ?", a: "L’USDT0 traverse avec six décimales et Stellar en a sept : la septième reste sur votre compte." },
    ],
  },
  dash: {
    wallets: {
      title: "Portefeuilles",
      connect: "Connecter un portefeuille",
      connectTitle: "Connecter un portefeuille",
      connectAnother: "Connecter un autre portefeuille",
      network: "Réseau",
      wallet: "Portefeuille",
      installed: "Installé",
      notInstalled: "Non installé",
      browserWallet: "Portefeuille du navigateur",
      label: "Nom",
      labelPlaceholder: "Trésorerie",
      signing: "Approuvez la demande dans votre portefeuille…",
      connectSign: "Connecter et signer",
      connected: "Portefeuille connecté",
      missing: "{wallet} n’est pas installé dans ce navigateur.",
      declined: "Le portefeuille a refusé la demande.",
      connectError: "Impossible de connecter le portefeuille.",
      empty: "Aucun portefeuille connecté pour l’instant.",
      emptyAsk: "Aucun portefeuille connecté pour l’instant. Une personne autorisée peut en connecter un.",
      loadError: "Impossible de charger les portefeuilles de l’organisation.",
      rename: "Renommer",
      renameTitle: "Renommer le portefeuille",
      save: "Enregistrer",
      renamed: "Portefeuille renommé",
      remove: "Retirer",
      removeTitle: "Retirer ce portefeuille ?",
      removeBody: "{name} ne sera plus proposé pour recevoir des paiements. Les paiements déjà créés gardent leur adresse.",
      removeConfirm: "Retirer le portefeuille",
      removed: "Portefeuille retiré",
      actionError: "Impossible d’enregistrer la modification.",
      noneForChain: "L’organisation n’a pas encore de portefeuille {network}.",
      askAdmin: "Une personne autorisée peut en connecter un dans Paramètres.",
    },
    examples: { order: "Commande nº 24", firstName: "Claire", lastName: "Martin", fullName: "Claire Martin", jobTitle: "Directrice", customerName: "Facturation Acme", payoutsName: "Versements Acme (USD)", productName: "Forfait Pro (mensuel)" },
    search: { label: "Rechercher dans le tableau de bord", placeholder: "Rechercher", pages: "Pages", searchGroup: "Rechercher", searchIn: "{place} contenant « {q} »", empty: "Aucun résultat pour « {q} »." },
    viewLabels: {
      overview: "Aperçu",
      payments: "Paiements", zkPayments: "Paiements privés",
      balances: "Soldes",
      customers: "Clients",
      products: "Produits et liens",
      swaps: "Swaps", crossChainSwaps: "Swaps inter-chaînes",
      liquidity: "Pools de liquidité",
      blindpay: "Fiat",
      developers: "Clés API",
      webhook: "Webhooks",
      logs: "Journaux d’API",
      weblogs: "Journaux de webhooks",
      activityLog: "Activité des clients",
      settings: "Organisation",
      account: "Compte",
      activity: "Notifications",
      support: "Assistance",
      inbox: "Boîte d’assistance",
      users: "Utilisateurs",
      adminOverview: "Aperçu de la plateforme",
      adminPayments: "Paiements (toutes les orgs)",
      adminSwaps: "Swaps (toutes les orgs)",
      adminFiat: "Fiat (toutes les orgs)",
      adminCustomers: "Clients (toutes les orgs)",
      adminProducts: "Produits (toutes les orgs)",
      adminConsumers: "Organisations"
    },
    sidebar: {
      label: "Tableau de bord",
      menu: { main: "Menu principal", preferences: "Préférences" },
      groups: { payments: "Paiements", swaps: "Swaps", developers: "Développeurs", settings: "Paramètres", help: "Aide", admin: "Admin" },
      notifications: "Notifications",
      sections: {
        Platform: "Plateforme",
        Build: "Développer",
        Account: "Compte",
        Support: "Assistance",
        Admin: "Admin"
      },
      items: {
        overview: "Aperçu",
        payments: "Paiements", zkPayments: "Paiements privés",
        balances: "Soldes",
        customers: "Clients",
        products: "Produits",
        swaps: "Swaps", crossChainSwaps: "Inter-chaînes",
        liquidity: "Liquidité",
        blindpay: "Fiat",
        developers: "Clés API",
        webhook: "Webhooks",
        logs: "Journaux",
        weblogs: "Journaux webhook",
        activityLog: "Journal d'activité",
        settings: "Organisation",
        account: "Compte",
        activity: "Activité",
        support: "Assistance",
        inbox: "Boîte",
        users: "Utilisateurs",
        adminOverview: "Aperçu",
        adminPayments: "Paiements",
        adminSwaps: "Swaps",
        adminFiat: "Fiat",
        adminCustomers: "Clients",
        adminProducts: "Produits",
        adminConsumers: "Organisations"
      },
      collapse: "Réduire la barre latérale"
    },
    org: {
      heading: "Organisations",
      owned: "Vos organisations",
      invited: "Partagées avec vous",
      locked: "Verrouillée : améliorez votre offre",
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
    common: { notFound: "Introuvable dans cette organisation ou cet environnement.", open: "Ouvrir",
      actions: "Actions",
      details: "Détails",
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
        atLimitOne: "Votre plan {plan} autorise une organisation. Mettez à niveau votre plan pour en créer davantage.", atLimit: "Votre plan {plan} autorise jusqu’à {limit} organisations. Mettez à niveau votre plan pour en créer davantage.",
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
        scopeResources: { payments: "Paiements", swaps: "Swaps", liquidity: "Liquidité", webhooks: "Webhooks", products: "Produits", customers: "Clients", kyc: "KYC", onramp: "On-ramp", offramp: "Off-ramp", activity: "Activité" },
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
        body: "C’est la seule fois où vous verrez ce secret. Copiez-le maintenant et conservez-le en lieu sûr. Pour des raisons de sécurité, vous ne pourrez plus le consulter.",
        idLabel: "ID de la clé",
        saved: "J’ai enregistré ma clé"
      }
    },
    overview: {
      hub: { quick: "Accès rapides", usdUnpricedOne: "1 paiement dans un actif sans prix en USD n'est pas compté", usdUnpricedN: "{n} paiements dans des actifs sans prix en USD ne sont pas comptés", webhooksFailedOne: "1 en échec", paymentsFailedOne: "1 échoué", paymentsFailedN: "{n} échoués", doneOne: "1 terminé", payersOne: "1 payeur", sumSwaps: "Swaps", sumLiquidity: "Liquidité", payersN: "{n} payeurs", doneN: "{n} terminés", newSwap: "Swap", crumb: "Vue d’ensemble", active: "Active", since: "Depuis le {date}", settled: "Volume réglé", noVolume: "Aucun paiement réglé pour l’instant", rate: "Tarif", plan: "Offre", orgId: "ID de l’organisation", createLink: "Créer un lien de paiement", docs: "Documentation", designs: "Designs de checkout", kpiTotal: "Paiements au total", kpiSucceeded: "Réussis", kpiFailed: "Échoués", kpiRate: "Taux de réussite", activity: "Activité", period7: "7 jours", period30: "30 jours", periods: { today: "Aujourd’hui", week: "Semaine", month: "Mois", year: "Année" }, noPeriodTx: "Aucun paiement réglé sur cette période.", sumVolume: "Volume réglé", sumCount: "Paiements", sumPayers: "Payeurs", sumWebhooks: "Livraisons de webhooks", sumWebhooksFailed: "{n} en échec", growthVs: "{pct} par rapport aux {n} jours précédents", legendVolume: "Volume (USD)", legendCount: "Paiements", legendDone: "Terminés", goTo: "Aller à {view}", periodLabel: "Période", chartLabel: "Paiements créés et volume réglé par jour sur les {n} derniers jours.", transactions: "Derniers paiements réglés", viewAll: "Voir tous les paiements", thId: "Paiement", thDate: "Date", thAmount: "Montant", thNetwork: "Réseau", thTo: "Payé à", thStatus: "Statut", chartPeriods: { day: "Quotidien", week: "Hebdomadaire", month: "Mensuel", year: "Annuel" }, chartLabels: { day: "Paiements créés et volume réglé par jour sur les 30 derniers jours.", week: "Paiements créés et volume réglé par semaine sur les 12 dernières semaines.", month: "Paiements créés et volume réglé par mois sur les 12 derniers mois.", year: "Paiements créés et volume réglé par an sur les 5 dernières années." }, sumFailed: "Échoués", sumGrowth: "Croissance", growthTitle: "Par rapport à la période précédente", growthVolume: "Volume", growthCount: "Paiements", prevOrg: "Organisation précédente", nextOrg: "Organisation suivante", created: "Créée le {date}", fee: "Frais", txTitle: "Transactions", thFrom: "Payé par", thMemo: "Mémo", onlySettled: "Réglés uniquement", network: "Réseau", allNetworks: "Tous les réseaux", wallet: "Wallet", applyFilters: "Filtrer la liste", filtersLabel: "Filtrer les transactions", noTx: "Aucun paiement sur cette période.", noMatch: "Aucun paiement ne correspond à ces filtres.", shown: "{n} sur {total} paiements", rowMenu: "Actions du paiement {id}", copyId: "Copier l’ID", explorer: "Voir dans l’explorateur", openPayments: "Ouvrir dans Paiements", status: { SUCCEEDED: "Réglé", FAILED: "Échoué", CANCELLED: "Annulé", EXPIRED: "Expiré", PENDING: "En attente", SUBMITTED: "Confirmation" }, searchPlaceholder: "Rechercher par ID, adresse, montant ou actif…", groups: { settled: "Réglés", open: "En cours", failed: "Échoués" } },
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
      sub: "{n} paiements · réglés instantanément on-chain",
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
        desc: "Les paiements sont réglés instantanément sur Stellar, Solana ou Monad, sans période de blocage.",
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
      eventLabels: { PAYMENT_INTENT_CREATED: "Paiement créé", PAYMENT_INTENT_UPDATED: "Paiement mis à jour", PAYMENT_INTENT_SUCCEEDED: "Paiement réussi", PAYMENT_INTENT_FAILED: "Paiement échoué", PAYMENT_INTENT_CANCELLED: "Paiement annulé", PAYMENT_INTENT_DELETED: "Paiement supprimé", ZK_PAYMENT_SUCCEEDED: "Paiement privé réussi" },
      active: "Actif", inactive: "Désactivé",
      reveal: "Afficher le secret", secret: "Secret de signature", secretNote: "Affiché une seule fois. Conservez-le en lieu sûr.",
      rotate: "Renouveler le secret", ping: "Envoyer un test", pingOk: "Événement de test livré", pingFail: "Échec de l'événement de test",
      deliveries: "Livraisons récentes", noDeliveries: "Aucune livraison pour l'instant.", redeliver: "Renvoyer",
      enable: "Activer", disable: "Désactiver",
      delete: "Supprimer", deleteConfirm: "Supprimer", confirmDelete: "Action irréversible.",
      customerSet: "Montant libre", allEvents: "Tous les événements", events: "Événements",
      received: "Reçu", pending: "En attente",
      custDetail: { noAccount: "Ajoutez l'adresse du portefeuille du client pour voir les paiements qu'il a effectués.", title: "Client", edit: "Modifier", save: "Enregistrer", alias: "Alias", note: "Note", account: "Adresse du wallet", accountPlaceholder: "Adresse Stellar, Solana ou Monad", payments: "Paiements", onChain: "On-chain", noPayments: "Aucun paiement pour l'instant." },
    },
    filters: { label: "Filtrer la liste", status: "Statut", network: "Réseau", kind: "Type", allStatuses: "Tous", allNetworks: "Tous les réseaux", allKinds: "Tous les types", date: "Date", dates: { any: "Toutes les dates", today: "Aujourd’hui", "7d": "7 derniers jours", "30d": "30 derniers jours", "90d": "90 derniers jours" }, shown: "{n} sur {total}", clear: "Effacer les filtres", noMatch: "Rien ne correspond à ces filtres." },
    tokens: { custom: "Autre jeton…", ticker: "Symbole du jeton", address: { solana: "Mint du jeton", monad: "Contrat du jeton" } },
    paylinks: {
      design: { label: "Design du checkout", hint: "L’apparence du checkout hébergé de ce lien. Vous pouvez la changer à tout moment.", preview: "Aperçu", saved: "Design du checkout mis à jour", saveError: "Impossible de changer le design du checkout", current: "Actuel" },
      title: "Liens de paiement",
      sub: "{n} liens · Stellar, Solana et Monad",
      create: "Créer un lien de paiement",
      searchPlaceholder: "Rechercher par ID, adresse, mémo ou montant…",
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
        desc: "Un lien et un QR que votre client paie depuis son wallet, sur Stellar, Solana ou Monad.",
        kind: "Type", kindPay: "Lien de paiement", kindTx: "Transaction",
        destination: "Destination", destinationHint: "Compte Stellar qui reçoit les fonds (G…).",
        source: "Source", sourceHint: "Compte Stellar du payeur (G…).",
        amount: "Montant", amountHint: "Laissez vide pour que le payeur choisisse (dons).",
        asset: "Actif", assetIssuer: "Émetteur de l'actif", assetIssuerHint: "Requis pour les actifs non natifs (G…).",
        memo: "Mémo", memoHint: "MEMO_ID numérique, généré automatiquement si vide.",
        message: "Message", messageHint: "Affiché au payeur dans son portefeuille (≤ 300 caractères).",
        chain: "Réseau", amountMonad: "Obligatoire sur Monad : le montant exact est ce qui identifie le paiement.", memoHintOther: "Un nombre qui empêche une nouvelle tentative de créer un second lien ; généré s’il est vide.", submitting: "Création…",
        mainnet: "Mainnet", more: "Plus d’options",
        submit: "Créer le lien",
      },
      detail: { check: { label: "Payé depuis un autre portefeuille ? Vérifiez sa transaction", placeholder: "Hash de la transaction", submit: "Vérifier la transaction", ok: "La transaction règle ce lien.", bad: "Cette transaction ne règle pas ce lien." },
        checkout: "Page de paiement", openCheckout: "Ouvrir la page de paiement",
        eyebrow: "Lien de paiement", title: "Lien de paiement prêt",
        scan: "Scannez pour payer", downloadQr: "Télécharger le QR",
        uri: "URI SEP-7", xdr: "XDR non signé",
        uriLabels: { stellar: "URI SEP-7", solana: "URI Solana Pay", monad: "URI EIP-681" },
        openWallet: "Ouvrir dans le portefeuille", copyLink: "Copier le lien", copyUri: "Copier l'URI",
        fields: { id: "ID", status: "Statut", kind: "Type", network: "Réseau", destination: "Destination", source: "Source", amount: "Montant", asset: "Actif", memo: "Mémo", message: "Message", txHash: "ID de transaction", created: "Créé" },
        delete: "Supprimer",
        deleteTitle: "Supprimer le lien de paiement", deleteBody: "« {id} » sera supprimé. Action irréversible.", deleteConfirm: "Supprimer le lien",
      },
      status: { PENDING: "En attente", SUBMITTED: "Soumis", SUCCEEDED: "Réussi", FAILED: "Échoué", CANCELLED: "Annulé", EXPIRED: "Expiré" },
    },
    balances: {
      title: "Soldes",
      total: "Règlements",
      across: "{assets} actifs sur {networks} réseaux",
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
    products: { searchPlaceholder: "Rechercher par nom ou prix…", detail: { title: "Produit", save: "Enregistrer", active: "En vente", activeHint: "Un produit inactif est conservé mais ne peut pas être vendu.", saveError: "Impossible d'enregistrer le produit." },
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
    apikeys: { searchPlaceholder: "Rechercher par nom ou ID de clé…", ownerPlan: "C'est l'offre du propriétaire de l'organisation qui le détermine.", liveLocked: "Votre offre n'inclut pas de clés de production.",
      readOnly: "Vous avez un accès en lecture seule. Seuls les owners et admins peuvent créer ou révoquer des clés API.",
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
      none: "Aucune",
      revokeTitle: "Révoquer la clé d’API",
      revokeBody: "« {name} » sera révoquée définitivement et toute application qui l’utilise cessera de fonctionner. Cette action est irréversible.",
      revokeConfirm: "Révoquer la clé",
      usage: "{used} / {limit}",
      limitReached: "Vous avez atteint la limite de clés de votre forfait. Passez à un forfait supérieur pour en ajouter."
    },
    webhooks: { searchPlaceholder: "Rechercher par URL ou événement…", resent: "Livraison renvoyée", noFailed: "Aucune livraison en échec.", only: { all: "Toutes", failed: "En échec" }, eventId: "ID de l'événement", error: "Erreur", attempts: "Tentatives", delivery: "Livraison", save: "Enregistrer", editTitle: "Modifier l'endpoint", edit: "Modifier l'endpoint", eventsOne: "1 événement",
      title: "Webhooks",
      sub: "Événements en temps réel lorsque les paiements sont réglés sur Stellar, Solana ou Monad",
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
    activityLog: {
      sub: "Ce que le portefeuille et ce tableau de bord ont signalé sur eux-mêmes, y compris ce qui n'est jamais devenu un appel API",
      searchPlaceholder: "Rechercher des évènements…",
      empty: "Aucune activité signalée pour l'instant.",
      context: "Contexte",
      props: "Détails",
      topErrors: "Erreurs les plus fréquentes",
      cards: { total: "Évènements", errors: "Erreurs", sessions: "Sessions", devices: "Appareils" },
      sources: { all: "Toutes les sources", wallet: "Portefeuille", dashboard: "Tableau de bord", server: "Serveur", sdk: "SDK" },
      levels: { all: "Tous les niveaux", error: "Erreur", warn: "Avertissement", info: "Info", debug: "Débogage" },
      tableHead: { level: "Niveau", source: "Source", event: "Évènement", detail: "Détail", timestamp: "Horodatage", count: "Nombre" },
    },
    logs: {
      title: "Journaux d’API",
      sub: "Chaque requête vers l’API Cosmos Pay (cliquez sur une ligne pour l’inspecter)",
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
        changeSub: "Changez de forfait. Ceci est une simulation : rien n’est facturé.",
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
        apiLevels: { notifications: "Notifications de paiement", partial: "API partielle", full: "API complète" }
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
      rows: "Lignes par page",
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
      searchPlaceholder: "Rechercher des tickets…",
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
    admin: { viewList: "Voir la liste",
      loading: "Chargement…",
      loadError: "Impossible de charger les données.",
      empty: "Rien pour l’instant.",
      orgFilter: "Organisation",
      clearFilter: "Effacer le filtre",
      filters: { all: "Tous", PENDING: "En attente", SUBMITTED: "Soumis", SUCCEEDED: "Réussi", FAILED: "Échoué" },
      overview: {
        title: "Aperçu de la plateforme", sub: "Activité globale de toutes les organisations",
        cards: { consumers: "Organisations", customers: "Clients", products: "Produits", webhooks: "Endpoints webhook" },
        payments: "Intentions de paiement", swaps: "Swaps", chainSwaps: "Swaps sur Solana et Monad", crossChainSwaps: "Swaps inter-chaînes", fiat: "Fiat (KYC/KYB)",
        receivers: "Bénéficiaires", payins: "Payins", payouts: "Payouts",
        volume: "Volume réglé",
        volHead: { asset: "Actif", amount: "Montant", count: "Nombre" },
      },
      payments: { title: "Intentions de paiement", sub: "Toutes les intentions de paiement des organisations", searchPlaceholder: "Rechercher par ID, destination, organisation…", empty: "Aucune intention de paiement.", tableHead: { id: "ID", org: "Organisation", destination: "Destination", amount: "Montant", status: "Statut", created: "Créé" } },
      swaps: { venues: { stellar: "Stellar", solana: "Solana · Jupiter", monad: "Monad · Kuru Flow", crossChain: "Inter-chaînes" }, crossStatus: { AWAITING_DEPOSIT: "En attente du dépôt", PROCESSING: "En cours", REFUNDED: "Remboursé" }, title: "Swaps", sub: "Tous les swaps des organisations", searchPlaceholder: "Rechercher par ID, compte, organisation…", empty: "Aucun swap.", tableHead: { id: "Swap", org: "Organisation", route: "Envoyé → reçu", status: "Statut", created: "Créé" } },
      fiat: {
        title: "Fiat", sub: "Bénéficiaires, payins et payouts de toutes les organisations",
        tabs: { receivers: "Bénéficiaires", payins: "Payins", payouts: "Payouts" },
        searchReceivers: "Rechercher des bénéficiaires…", searchPayins: "Rechercher des payins…", searchPayouts: "Rechercher des payouts…",
        emptyReceivers: "Aucun bénéficiaire.", emptyPayins: "Aucun payin.", emptyPayouts: "Aucun payout.",
        statusUnknown: "Inconnu",
        disabled: "Désactivé", disable: "Désactiver", enable: "Activer",
        accountDisabled: "Compte fiat désactivé", accountEnabled: "Compte fiat activé",
        accessError: "Impossible de mettre à jour le compte fiat.",
        approve: "Approuver", approved: "Approuvé",
        termsSent: "Conditions d’utilisation envoyées à {email}",
        approveError: "Impossible d’approuver le bénéficiaire.",
        resendVerification: "Renvoyer l’e-mail de vérification",
        verificationSent: "E-mail de vérification envoyé à {email}",
        resendError: "Impossible de renvoyer l’e-mail de vérification.",
        sending: "Envoi…",
        receiverHead: { name: "Nom", org: "Organisation", type: "Type", status: "Statut KYC", created: "Créé" },
        payinHead: { id: "Payin", org: "Organisation", asset: "Actif", method: "Méthode", amount: "Envoyé → reçu", status: "Statut", created: "Créé" },
        payoutHead: { id: "Payout", org: "Organisation", asset: "Actif", rail: "Canal", amount: "Envoyé → reçu", status: "Statut", created: "Créé" },
      },
      customers: { title: "Clients", sub: "Tous les clients des organisations", searchPlaceholder: "Rechercher des clients…", empty: "Aucun client.", tableHead: { name: "Nom", org: "Organisation", email: "Email", account: "Compte", created: "Créé" } },
      products: { title: "Produits", sub: "Tous les produits des organisations", searchPlaceholder: "Rechercher des produits…", empty: "Aucun produit.", tableHead: { name: "Nom", org: "Organisation", price: "Prix", kind: "Type", created: "Créé" } },
      consumers: { title: "Organisations", sub: "Chaque consommateur de l’API et son activité", searchPlaceholder: "Rechercher des organisations…", empty: "Aucune organisation.", account: "Compte", moreOrgs: "+{n} autres", note: "Les totaux sont par compte développeur (un compte peut posséder plusieurs organisations).", tableHead: { org: "Organisation", payments: "Paiements", swaps: "Swaps", products: "Produits", customers: "Clients", receivers: "Bénéficiaires", payins: "Payins", payouts: "Payouts", webhooks: "Webhooks", created: "Créé" } },
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
        photoHint: "PNG, JPG ou WebP. Carrée de préférence.", saved: "Profil mis à jour", saveError: "Impossible de mettre à jour votre profil.",
        photoTooLarge: "Cette image est trop volumineuse. Choisissez-en une de moins de 8 Mo.", photoInvalid: "Ce fichier n’est pas une image prise en charge." },
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
      resources: { apiKeysTest: "Clés API de test", apiKeysLive: "Clés API de production", webhooks: "Webhooks", products: "Produits", customers: "Clients", payments: "Liens de paiement", wallets: "Portefeuilles" },
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
      sub: "{n} swaps · sur une chaîne ou entre Stellar, Solana et Monad",
      create: "Nouveau swap",
      readOnly: "Vous avez un accès en lecture seule aux swaps dans cette organisation.",
      listTitle: "Vos swaps",
      widget: { title: "Swap", pay: "Vous payez", receive: "Vous recevez", selectToken: "Choisir un jeton", changeToken: "{token} sur {chain}, changer le jeton", flip: "Inverser ce que vous payez et ce que vous recevez", pickPay: "Payer avec", pickReceive: "Recevoir", details: "Détails du devis", invertRate: "Inverser le taux", eta: "Durée estimée", seconds: "{n} s", slippage: "Tolérance de slippage", slippageAuto: "Auto", slippageHint: "Sous le minimum qu’elle fixe, le swap n’a pas lieu (un swap entre chaînes est remboursé).", settings: "Réglages du swap", route: "Route", venueNear: "NEAR Intents", venueUsdt0: "LayerZero (USDT0)", ctaBridge: "Envoyer vers {chain}", lzFee: "Frais LayerZero", dustNote: "Reste sur Stellar", accountLabel: "Votre compte {chain}", accountHint: "Il paie et signe le swap.", refundLabel: "Adresse de remboursement sur {chain}", recipientLabel: "Recevoir sur {chain}", another: "Envoyer vers un autre compte", ctaSelect: "Choisissez un jeton", ctaSame: "Choisissez deux jetons différents", ctaProduction: "Disponible en Production", ctaUnsupported: "Ces jetons ne s’échangent pas entre eux", ctaAmount: "Saisissez un montant", ctaAmountBad: "Vérifiez le montant", ctaAccount: "Saisissez votre compte {chain}", ctaRefund: "Saisissez l’adresse de remboursement sur {chain}", ctaRecipient: "Saisissez l’adresse sur {chain}", ctaMemo: "Vérifiez le mémo", ctaQuoting: "Devis en cours…", ctaRetry: "Relancer le devis", ctaProductionOpen: "Ouvrir un swap demande Production", ctaOpen: "Ouvrir le swap", ctaSwap: "Swap sur {venue}", ctaBusy: "Préparation…" },
      picker: { search: "Chercher un jeton, un réseau ou une adresse", network: "Réseau", allNetworks: "Tous les réseaux", count: "{n} jetons", useToken: "Utiliser {token}", none: "Aucun jeton ne correspond. Collez l’adresse d’un jeton sur Stellar, Solana ou Monad pour l’utiliser.", more: "{n} de plus : cherchez pour affiner la liste." },
      groups: { open: "En cours", succeeded: "Réussis", refunded: "Remboursés", failed: "Échoués", expired: "Expirés" },
      typeLabel: "Type",
      types: { all: "Tous les types", same: "Sur une chaîne", cross: "Entre chaînes", usdt0: "Pont USDT0" },
      form: { desc: "Choisissez ce que vous envoyez et ce que vous recevez. Sur une chaîne, son marché l’exécute ; entre chaînes, NEAR Intents le règle. Rien ne passe par Cosmos Pay.", from: "Vous envoyez", to: "Vous recevez", chain: "Chaîne", asset: "Actif", amountHint: "Combien de l’actif vous envoyez.", flip: "Inverser ce que vous envoyez et ce que vous recevez", routeLine: "Route : {route}", route: "Route", venueCross: "NEAR Intents" },
      searchPlaceholder: "Rechercher par ID, adresse ou actif…",
      filters: { all: "Tous", PENDING: "En attente", SUBMITTED: "Soumis", SUCCEEDED: "Réussi", FAILED: "Échoué", EXPIRED: "Expiré" },
      status: { PENDING: "En attente", SUBMITTED: "Soumis", SUCCEEDED: "Réussi", FAILED: "Échoué", EXPIRED: "Expiré", DELIVERED: "Livré" },
      tableHead: { id: "Swap", route: "Envoyé → reçu", status: "Statut", created: "Créé", chains: "Chaînes" },
      empty: "Aucun swap pour l’instant. Créez-en un pour obtenir une transaction non signée à signer.",
      loading: "Chargement des swaps…",
      loadError: "Impossible de charger les swaps.",
      createError: "Impossible de créer le swap.",
      quoteError: "Impossible de coter le swap.",
      network: { dev: "Testnet", prod: "Réseau public" },
      chainLabel: "Chaîne",
      chains: { stellar: "Stellar", solana: "Solana", monad: "Monad" },
      venues: { stellar: "DEX Stellar", solana: "Jupiter", monad: "Kuru Flow" },
      chainModal: {
        desc: "Échangez deux actifs sur {chain} via {venue}, qui parcourt toutes les sources de liquidité de la chaîne. Obtenez une cotation, puis signez la transaction dans le portefeuille.",
        sourceHint: { solana: "Portefeuille Solana qui signe, paie et reçoit (base58).", monad: "Portefeuille Monad qui signe, paie et reçoit (0x…)." },
        sourceAsset: "Actif à envoyer", sourceAssetHint: "{native}, ou l’adresse du mint / contrat du jeton.",
        destAssetHint: "{native}, ou l’adresse du mint / contrat du jeton.",
        feeNote: "La commission est le taux du plan de votre organisation, prélevé sur la sortie.",
      },
      chainDetail: {
        title: "Swap prêt à signer",
        transaction: "Transaction à signer", approval: "Approbation à envoyer d’abord",
        approvalNote: "L’allowance du portefeuille pour ce jeton est insuffisante : envoyez et confirmez cet appel approve avant de signer le swap.",
        provider: "Construit par", expires: "Signer avant",
        submitDesc: "Collez la transaction signée renvoyée par le portefeuille (Solana : base64 ; Monad : transaction brute 0x).",
        submitPlaceholder: "Transaction signée…",
      },
      modal: {
        eyebrow: "Swap", title: "Nouveau swap",
        desc: "Échangez un actif Stellar contre un autre via un paiement par chemin. Obtenez une cotation, puis signez la transaction.",
        source: "Compte source", sourceHint: "Compte Stellar qui envoie le swap (G…).",
        sourceAsset: "Actif à envoyer", sourceIssuer: "Émetteur source", sourceAssetHint: "XLM, ou un actif que ce compte détient.",
        amount: "Montant à envoyer", amountHint: "Montant de l’actif source à échanger.",
        destAsset: "Actif de destination", destAssetHint: "Code de l’actif à recevoir (p. ex. USDC).",
        destIssuer: "Émetteur de destination", destIssuerHint: "Requis pour les actifs non natifs (G…).",
        slippage: "Slippage (bps)", slippageHint: "Slippage max. en points de base (facultatif, p. ex. 50).",
        destination: "Compte de destination", destinationHint: "Facultatif. Reçoit le résultat ; laissez vide pour recevoir sur le compte source. Il doit faire confiance à l’actif.", memo: "Mémo", memoHint: "Facultatif. Un nombre (MEMO_ID) inscrit sur la chaîne pour votre rapprochement.",
        getQuote: "Coter", quoting: "Cotation…",
        quoteTitle: "Cotation",
        swapped: "Échangé après commission",
        estimated: "Reçu estimé", minimum: "Minimum reçu",
        fee: "Commission", bps: "bps",
        feeNote: "La commission est le taux du plan de votre organisation, appliqué automatiquement.",
        create: "Créer un swap", creating: "Création…",
      },
      usdt0: {
        title: "USDT0 vers {chain}",
        destination: "Réseau",
        recipient: "Destinataire",
        arrives: "Arrive",
        fee: "Frais LayerZero",
        destTx: "Transaction de destination",
        scan: "Voir sur LayerZero Scan",
        travelling: "Envoyé depuis Stellar. LayerZero le livre sur {chain}.",
        delivered: "Livré sur {chain}.",
      },
      detail: {
        eyebrow: "Swap", title: "Swap prêt",
        scan: "Scannez pour signer", downloadQr: "Télécharger le QR",
        trustlineNote: "Cette transaction ajoute aussi la trustline {asset} au compte pour qu’il puisse le recevoir. Cela immobilise 0,5 XLM en réserve.",
        uri: "URI SEP-7", xdr: "XDR non signé",
        openWallet: "Ouvrir dans le portefeuille", viewExplorer: "Voir sur l’explorateur",
        fields: { id: "ID", status: "Statut", network: "Réseau", source: "Source", destination: "Destination", sent: "Envoyé", received: "Reçu (est.)", minimum: "Minimum", fee: "Commission", memo: "Mémo", commissionMemo: "Mémo de commission", txHash: "ID de transaction", created: "Créé" },
        submitTitle: "Soumettre la transaction signée",
        submitDesc: "Collez le XDR signé renvoyé par le portefeuille pour diffuser le swap.",
        submitPlaceholder: "XDR de la transaction signée…",
        submit: "Soumettre", submitting: "Soumission…",
        submitted: "Swap soumis",
        submitFailed: "Le swap n’a pas pu être soumis.",
        resultCodes: "Codes de résultat",
      },
    },
    crossChain: {
      title: "Swaps inter-chaînes",
      sub: "{n} swaps · Stellar ⇄ Solana ⇄ Monad via NEAR Intents",
      create: "Nouveau swap inter-chaînes",
      readOnly: "Tu as un accès en lecture seule aux swaps de cette organisation.",
      searchPlaceholder: "Rechercher par adresse, actif ou ID…",
      filters: { all: "Tous", open: "En cours", SUCCEEDED: "Réussis", REFUNDED: "Remboursés", FAILED: "Échoués", EXPIRED: "Expiré" },
      status: { AWAITING_DEPOSIT: "En attente du dépôt", DEPOSIT_DETECTED: "Dépôt détecté", INCOMPLETE_DEPOSIT: "Dépôt incomplet", PROCESSING: "En cours", SUCCEEDED: "Réussi", REFUNDED: "Remboursé", FAILED: "Échoué", EXPIRED: "Expiré" },
      tableHead: { id: "Swap", route: "Envoyé → reçu", status: "Statut", created: "Créé" },
      empty: "Aucun swap inter-chaînes pour l'instant.",
      loading: "Chargement des swaps…",
      loadError: "Impossible de charger les swaps inter-chaînes.",
      createError: "Impossible d'ouvrir le swap.",
      quoteError: "Impossible de coter le swap.",
      modal: {
        eyebrow: "Swap inter-chaînes", title: "Nouveau swap inter-chaînes",
        desc: "Envoie un actif sur une chaîne et reçois-en un autre sur une chaîne différente. NEAR Intents règle ; rien ne passe par Cosmos Pay.",
        from: "De", to: "Vers", chain: "Chaîne", asset: "Actif", assetsLoading: "Chargement des actifs…",
        amount: "Montant à envoyer", recipient: "Destinataire",
        refundTo: "Adresse de remboursement",
        slippage: "Slippage (bps)", slippageHint: "Optionnel, p. ex. 100. Sous le minimum, NEAR Intents rembourse.",
        getQuote: "Coter", quoting: "Cotation…", quoteTitle: "Cotation",
        estimated: "Tu reçois (estimé)", minimum: "Minimum reçu", fee: "Commission", eta: "Durée estimée", seconds: "s",
        feeNote: "La commission est le taux du plan de ton organisation, prélevé sur l'entrée.",
        create: "Ouvrir le swap", creating: "Ouverture…",
      },
      detail: {
        eyebrow: "Swap inter-chaînes", title: "Finance le swap",
        pay: "Envoie exactement {amount} {asset} à l'adresse de dépôt.",
        memoWarning: "Joins le mémo en MEMO_TEXT, sinon le dépôt ne sera pas crédité.",
        scan: "Scanner pour payer", depositUri: "Lien de dépôt", openWallet: "Ouvrir dans le portefeuille",
        fields: { id: "ID", status: "Statut", route: "Route", depositAddress: "Adresse de dépôt", depositMemo: "Mémo", amountIn: "Envoyer", estimated: "Recevoir (est.)", minimum: "Minimum", fee: "Commission", recipient: "Destinataire", refundTo: "Adresse de remboursement", amountOut: "Reçu", refunded: "Remboursé", expires: "Déposer avant", quoteSignature: "Signature de la cotation", created: "Créé" },
        txs: "Transactions",
        reportTitle: "Signaler le dépôt",
        reportPlaceholder: "Hash de la transaction de dépôt…",
        report: "Signaler", reporting: "Signalement…", reported: "Dépôt signalé", reportError: "Le dépôt n’a pas pu être signalé.", noLink: "Payez l’adresse de dépôt (et le mémo, s’il apparaît) depuis n’importe quel wallet {chain}, ou scannez le QR.",
      },
    },
    wallet: { signTitle: "Signez avec votre wallet", freighter: "Signer avec Freighter", signing: "En attente de Freighter…", submitting: "Envoi…", missing: "Freighter n’est pas installé dans ce navigateur. Scannez le QR avec un autre wallet ou collez ci-dessous la transaction signée.", declined: "Freighter n’a pas signé la transaction.", wrongAccount: "Freighter est sur un autre compte. Passez à {account} et réessayez.", wrongNetwork: "Freighter est sur un autre réseau. Passez à {network} et réessayez.", networks: { testnet: "Testnet", public: "Réseau public" } },
    liquidity: {
      title: "Pools de liquidité",
      sub: "{n} opérations · pools AMM sur Stellar",
      deposit: "Déposer",
      withdraw: "Retirer",
      readOnly: "Vous avez un accès en lecture seule aux pools de liquidité dans cette organisation.",
      tabs: { operations: "Opérations", pools: "Pools", positions: "Positions" },
      searchPlaceholder: "Rechercher par pool, compte ou ID…",
      filters: { all: "Tous", PENDING: "En attente", SUBMITTED: "Soumis", SUCCEEDED: "Réussi", FAILED: "Échoué" },
      status: { PENDING: "En attente", SUBMITTED: "Soumis", SUCCEEDED: "Réussi", FAILED: "Échoué", EXPIRED: "Expiré" },
      kind: { DEPOSIT: "Dépôt", WITHDRAW: "Retrait" },
      sharesUnit: "parts",
      bps: "bps",
      opsHead: { id: "Opération", kind: "Type", pool: "Pool", amounts: "Montants", status: "Statut", created: "Créé" },
      empty: "Aucune opération de liquidité pour l’instant. Déposez dans un pool pour obtenir une transaction non signée à signer.",
      loading: "Chargement des opérations…",
      loadError: "Impossible de charger les opérations de liquidité.",
      network: { dev: "Testnet", prod: "Réseau public" },
      pools: {
        assetA: "Actif A", assetAIssuer: "Émetteur A", assetB: "Actif B", assetBIssuer: "Émetteur B",
        assetHint: "Code de l’actif : laissez vide ou XLM pour les lumens.",
        search: "Rechercher des pools", searching: "Recherche…", loading: "Chargement des pools…",
        empty: "Aucun pool ne correspond à cette paire.",
        error: "Impossible de charger les pools de liquidité.",
        head: { pool: "Pool", reserves: "Réserves", shares: "Parts totales", trustlines: "Détenteurs", fee: "Frais" },
      },
      positions: {
        account: "Compte", accountHint: "Compte Stellar dont vous voulez consulter les parts de pool (G…).",
        load: "Charger les positions", loadingBtn: "Chargement…",
        prompt: "Saisissez un compte pour voir ses positions dans les pools.",
        empty: "Ce compte ne détient aucune part de pool.",
        error: "Impossible de charger les positions.",
        head: { pool: "Pool", shares: "Parts", share: "Part du pool", redeemable: "Rachetable" },
      },
      modal: {
        eyebrow: "Liquidité",
        depositTitle: "Déposer de la liquidité",
        depositDesc: "Déposez les deux actifs d’une paire dans le pool AMM et recevez des parts du pool. Vous obtiendrez une transaction non signée à signer.",
        withdrawTitle: "Retirer de la liquidité",
        withdrawDesc: "Brûlez des parts du pool pour recevoir les deux actifs de réserve au prorata. Vous obtiendrez une transaction non signée à signer.",
        source: "Compte source", sourceHint: "Compte Stellar qui finance et signe le dépôt (G…).",
        withdrawSourceHint: "Compte Stellar qui détient les parts du pool (G…).",
        assetA: "Actif A", assetB: "Actif B", assetHint: "Code de l’actif (XLM pour les lumens).",
        assetAIssuer: "Émetteur A", assetBIssuer: "Émetteur B", issuerHint: "Requis pour les actifs non natifs (G…).",
        maxAmountA: "Montant max. A", maxAmountAHint: "Quantité maximale de l’actif A à déposer.",
        maxAmountB: "Montant max. B", maxAmountBHint: "Facultatif. Déduit du prix du pool s’il est omis ; requis pour un nouveau pool.",
        poolId: "ID du pool", poolIdHint: "ID hexadécimal de 64 caractères du pool de liquidité.",
        shares: "Parts", sharesHint: "Nombre de parts du pool à brûler.",
        slippage: "Slippage (bps)", slippageHint: "Slippage max. en points de base (facultatif, p. ex. 50).",
        create: "Générer la transaction", creating: "Génération…",
        createError: "Impossible de générer la transaction.",
      },
      detail: {
        eyebrow: "Liquidité",
        titleDeposit: "Dépôt prêt", titleWithdraw: "Retrait prêt",
        scan: "Scannez pour signer", downloadQr: "Télécharger le QR",
        uri: "URI SEP-7", xdr: "XDR non signé",
        openWallet: "Ouvrir dans le portefeuille", viewExplorer: "Voir sur l’explorateur",
        fields: { id: "ID", kind: "Type", status: "Statut", network: "Réseau", source: "Source", pool: "Pool", pair: "Paire", maxDeposit: "Dépôt maximal", minReceived: "Minimum reçu", shares: "Parts", priceBounds: "Bornes de prix (A/B)", commission: "Commission", commissionMemo: "Mémo de commission", txHash: "ID de transaction", created: "Créé" },
        submitTitle: "Soumettre la transaction signée",
        submitDesc: "Collez le XDR signé renvoyé par le portefeuille pour diffuser l’opération.",
        submitPlaceholder: "XDR de la transaction signée…",
        submit: "Soumettre", submitting: "Soumission…",
        submitted: "Opération soumise",
        submitFailed: "L’opération n’a pas pu être soumise.",
        resultCodes: "Codes de résultat",
      },
    },
    blindpay: {
      title: "Fiat",
      sub: "Onramp et Offramp · KYC/KYB",
      gate: "Une vérification KYC/KYB est requise avant tout onramp ou offramp. Créez d’abord un bénéficiaire et terminez la vérification.",
      readOnly: "Vous avez un accès en lecture seule à Fiat dans cette organisation.",
      selectCountry: "Sélectionnez un pays",
      searchCountry: "Rechercher un pays…",
      upload: "Importer", uploading: "Importation…", replace: "Remplacer", uploaded: "Importé", uploadError: "Impossible d’importer le fichier.", linkMode: "Lien", clearFile: "Retirer",
      loading: "Chargement…",
      loadError: "Impossible de charger les données.",
      txStatuses: { pending: "En attente", processing: "En cours de traitement", on_hold: "En suspens", funds_received: "Fonds reçus", completed: "Terminé", refunded: "Remboursé", partial_refund: "Partiellement remboursé", failed: "Échoué", cancelled: "Annulé", canceled: "Annulé", expired: "Expiré", reversed: "Contrepassé" },
      kycReturn: {
        eyebrow: "Fiat : activation",
        activating: "Activation de votre compte…",
        activatingBody: "Patientez pendant que nous confirmons votre acceptation.",
        successTitle: "Votre compte est maintenant actif",
        successBody: "Vous pouvez maintenant ajouter des wallets et des comptes bancaires et utiliser l’onramp et l’offramp.",
        errorTitle: "Échec de l’activation",
        errorBody: "Nous n’avons pas pu activer votre compte. Veuillez réessayer.",
        noTosId: "Aucun id de conditions d’utilisation n’a été renvoyé. Réessayez l’activation.",
        backToDashboard: "Retour au tableau de bord",
      },
      tabs: { receivers: "Bénéficiaires", onramp: "Onramp", offramp: "Offramp" },
      receivers: {
        create: "Créer un bénéficiaire",
        searchPlaceholder: "Rechercher des bénéficiaires…",
        tableHead: { name: "Nom", type: "Type", status: "Statut KYC", created: "Créé" },
        empty: "Aucun bénéficiaire pour l’instant. Créez-en un pour lancer le KYC/KYB.",
        statusUnknown: "Inconnu",
        inactive: "Inactif",
        statuses: { inactive: "Inactif", pending_review: "En attente de vérification", pending_user: "En attente d’acceptation du client", verifying: "Vérification en cours", approved: "Approuvé", rejected: "Rejeté" },
        disabled: "Désactivé",
        disableAccount: "Désactiver le compte",
        enableAccount: "Activer le compte",
        disabledNote: "Ce compte fiat est désactivé : l’onramp et l’offramp sont bloqués jusqu’à sa réactivation.",
        accountDisabled: "Compte fiat désactivé",
        accountEnabled: "Compte fiat activé",
        accessError: "Impossible de mettre à jour le compte fiat.",
        inactiveNote: "Inscription uniquement : aucune donnée KYC soumise pour l’instant.",
        awaitingReview: "En attente de vérification par le propriétaire ou un admin.",
        reviewTitle: "Vérifier le KYC",
        reviewHint: "Vérifiez les données KYC soumises, puis approuvez pour envoyer les conditions d’utilisation au client par e-mail.",
        approve: "Approuver et envoyer les conditions",
        approving: "Approbation…",
        approvedSent: "Approuvé : conditions envoyées à {email}",
        approveError: "Impossible d’approuver le bénéficiaire.",
        termsSentTitle: "Conditions envoyées",
        termsSentBody: "En attente d’acceptation du client. Conditions envoyées à {email}.",
        termsSentBodyNoEmail: "En attente de l’acceptation des conditions d’utilisation par le client.",
        resendTerms: "Renvoyer l’e-mail des conditions",
        resendVerification: "Renvoyer l’e-mail de vérification",
        verificationSent: "E-mail de vérification envoyé à {email}",
        refresh: "Actualiser le statut",
        refreshing: "Actualisation…",
        refreshError: "Impossible d’actualiser le statut KYC depuis BlindPay.",
        sending: "Envoi…",
        types: { individual: "Particulier", business: "Entreprise" },
        createError: "Impossible de créer le bénéficiaire.",
        tosTitle: "Activer le compte",
        tosHint: "Ce bénéficiaire est inactif. Acceptez les conditions d’utilisation pour l’activer.",
        activate: "Activer le compte",
        redirecting: "Redirection…",
        getTos: "Obtenir les conditions d’utilisation",
        emailTos: "Envoyer les conditions par e-mail",
        tosUrl: "URL des conditions",
        openTerms: "Ouvrir les conditions",
        tosIdLabel: "ID des conditions d’utilisation",
        tosIdHintEnable: "Collez le tos_id de l’URL vers laquelle vous avez été redirigé après acceptation.",
        enable: "Activer le compte",
        enabled: "Compte activé",
        tosSent: "Conditions d’utilisation envoyées à {email}",
        getTosError: "Impossible d’obtenir les conditions d’utilisation.",
        emailTosError: "Impossible d’envoyer les conditions par e-mail.",
        enableError: "Impossible d’activer le compte.",
        modal: {
          eyebrow: "Bénéficiaire", title: "Créer un bénéficiaire",
          desc: "Un bénéficiaire est l’entité KYC (particulier) ou KYB (entreprise) requise pour l’onramp et l’offramp.",
          type: "Type", individual: "Particulier (KYC)", business: "Entreprise (KYB)",
          kycType: "Niveau de vérification",
          ownersTitle: "Propriétaires (UBO)", ownerN: "Propriétaire {n}", addOwner: "Ajouter un propriétaire", removeOwner: "Retirer",
          fields: {
            email: "Email", country: "Pays",
            first_name: "Prénom", last_name: "Nom", date_of_birth: "Date de naissance", tax_id: "Numéro fiscal", phone_number: "Numéro de téléphone",
            address_line_1: "Adresse", city: "Ville", state_province_region: "État / province / région", postal_code: "Code postal",
            id_doc_country: "Pays de la pièce d’identité", id_doc_type: "Type de pièce d’identité", id_doc_front_file: "Pièce d’identité (recto)", id_doc_back_file: "Pièce d’identité (verso)",
            selfie_file: "Selfie", proof_of_address_doc_type: "Type de justificatif de domicile", proof_of_address_doc_file: "Justificatif de domicile",
            occupation: "Profession", account_purpose: "Objet du compte", source_of_funds_doc_type: "Type d’origine des fonds", source_of_funds_doc_file: "Justificatif d’origine des fonds",
            source_of_wealth: "Origine du patrimoine", purpose_of_transactions: "Objet des transactions", purpose_of_transactions_explanation: "Objet des transactions (explication)",
            legal_name: "Raison sociale", alternate_name: "Nom commercial", business_type: "Type d’entreprise", business_industry: "Secteur d’activité", business_description: "Description de l’activité",
            formation_date: "Date de constitution", estimated_annual_revenue: "Chiffre d’affaires annuel estimé", website: "Site web",
            incorporation_doc_file: "Acte de constitution", proof_of_ownership_doc_file: "Justificatif de propriété",
            ownership_percentage: "% de détention", title: "Fonction",
          },
          create: "Créer un bénéficiaire", creating: "Création…",
        },
        detail: {
          eyebrow: "Bénéficiaire",
          id: "ID", blindpayId: "ID du prestataire", kycStatus: "Statut KYC", kycType: "Niveau de vérification", email: "Email", country: "Pays",
          terms: "Conditions d’utilisation",
          tosOpened: "Parcours des conditions d’utilisation lancé.",
          tosError: "Impossible de lancer le parcours des conditions d’utilisation.",
          wallets: "Wallets blockchain", noWallets: "Aucun wallet pour l’instant.", addWallet: "Ajouter un wallet",
          banks: "Comptes bancaires", noBanks: "Aucun compte bancaire pour l’instant.", addBank: "Ajouter un compte bancaire",
        },
        wallet: {
          name: "Nom", network: "Réseau",
          address: "Adresse",
          aa: "Abstraction de compte", add: "Ajouter un wallet",
          error: "Impossible d’ajouter le wallet.",
        },
        bank: {
          rail: "Canal", name: "Nom", beneficiary: "Nom du bénéficiaire", country: "Pays",
          accountNumber: "Numéro de compte", routingNumber: "Numéro de routage",
          add: "Ajouter un compte bancaire",
          error: "Impossible d’ajouter le compte bancaire.",
        },
      },
      onramp: {
        create: "Nouveau payin",
        searchPlaceholder: "Rechercher des payins…",
        tableHead: { id: "Payin", asset: "Actif", method: "Méthode", amount: "Envoyé → reçu", status: "Statut", created: "Créé" },
        empty: "Aucun payin pour l’instant.",
        statusUnknown: "Inconnu",
        quoteError: "Impossible de coter le payin.",
        createError: "Impossible de créer le payin.",
        created: "Payin créé",
        modal: {
          eyebrow: "Onramp", title: "Nouveau payin",
          desc: "Fiat → stablecoin. Obtenez une cotation, puis créez le payin pour obtenir les instructions de paiement.",
          walletId: "ID du wallet", walletIdHint: "Wallet du bénéficiaire qui reçoit le stablecoin.",
          method: "Moyen de paiement", token: "Jeton",
          currencyType: "Montant en", curSender: "Expéditeur", curReceiver: "Bénéficiaire",
          amount: "Montant", amountHint: "Unités mineures (entier), p. ex. 10000 = 100,00.",
          getQuote: "Coter", quoting: "Cotation…",
          quoteId: "ID de la cotation", youSend: "Vous envoyez", youReceive: "Vous recevez", expires: "Expire",
          create: "Créer le payin", creating: "Création…",
          payinId: "ID du payin", status: "Statut",
          instructions: "Instructions de paiement", done: "Terminé",
        },
      },
      offramp: {
        create: "Nouveau payout",
        searchPlaceholder: "Rechercher des payouts…",
        tableHead: { id: "Payout", asset: "Actif", rail: "Canal", amount: "Envoyé → reçu", status: "Statut", created: "Créé" },
        empty: "Aucun payout pour l’instant.",
        statusUnknown: "Inconnu",
        quoteError: "Impossible de coter le payout.",
        authError: "Impossible de construire la transaction à signer.",
        createError: "Impossible de créer le payout.",
        created: "Payout créé",
        modal: {
          eyebrow: "Offramp", title: "Nouveau payout",
          desc: "Stablecoin → fiat. Obtenez une cotation ; pour Stellar, autorisez pour obtenir la tx, signez-la, puis soumettez-la.",
          bankId: "ID du compte bancaire", bankIdHint: "Compte bancaire du bénéficiaire qui reçoit le fiat.",
          network: "Réseau", token: "Jeton",
          currencyType: "Montant en", curSender: "Expéditeur", curReceiver: "Bénéficiaire",
          coverFees: "Couvrir les frais",
          amount: "Montant", amountHint: "Unités mineures (entier), p. ex. 10000 = 100,00.",
          getQuote: "Coter",
          quoteId: "ID de la cotation", youSend: "Vous envoyez", youReceive: "Vous recevez (fiat)", expires: "Expire",
          senderWallet: "Wallet expéditeur", senderWalletHint: "Wallet qui détient le stablecoin (G… / 0x…).",
          authorize: "Autoriser",
          unsignedTx: "Transaction non signée",
          signedTx: "Transaction signée", signedTxHint: "Collez la transaction signée renvoyée par le wallet.",
          signedTxPlaceholder: "Transaction signée…",
          evmNote: "Sur les réseaux EVM, signez le contrat approve de la cotation via l’API avant de créer le payout.",
          create: "Créer le payout", creating: "Création…",
        },
      },
    }
  }
};

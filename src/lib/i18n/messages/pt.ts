/* pt.js — Portuguese message catalog. Mirrors en.js exactly in shape. */
export default {
  invite: {
    eyebrow: "Convite",
    joinTitle: "Entrar em {org}",
    signInToAccept: "Você foi convidado para colaborar em {org} na Cosmos Pay.",
    signInBtn: "Entrar para aceitar",
    invitedAs: "Convite enviado para {email}",
    successTitle: "Pronto!",
    successBody: "Você entrou em {org}.",
    goToDashboard: "Ir para o painel",
    backHome: "Voltar ao início",
    invalidTitle: "Convite não encontrado",
    invalidBody: "Este link de convite é inválido.",
    expiredTitle: "Convite expirado",
    expiredBody: "Este convite expirou. Peça a um administrador para enviar um novo.",
    acceptedTitle: "Já aceito",
    acceptedBody: "Este convite já foi usado.",
    mismatchTitle: "Conta incorreta",
    mismatchBody: "Este convite foi enviado para {email}. Entre com esse e-mail para aceitar.",
    seatLimitTitle: "Organização cheia",
    seatLimitBody: "Esta organização atingiu o limite de assentos do plano.",
  },
  toasts: {
    copied: "Copiado para a área de transferência"
  },
  onboarding: {
    cancel: "Cancelar",
    stepOf: "Passo {n} / {total}",
    steps: {
      org: "Organização",
      goals: "Objetivos",
      plan: "Plano",
      review: "Revisão"
    },
    back: "Voltar",
    continue: "Continuar",
    skip: "Pular",
    create: "Criar organização",
    creating: "Criando…",
    error: "Não foi possível concluir o onboarding. Tente novamente.",
    orgEyebrow: "// nova organização",
    orgTitle: "Vamos configurar sua organização",
    orgSub: "As organizações mantêm pagamentos, clientes e chaves de API totalmente separados. Dê um nome à sua e conte o que você está construindo.",
    nameLabel: "Nome da organização",
    namePlaceholder: "Acme Inc.",
    nameNote: "Você pode renomeá-la depois nas Configurações.",
    industryLabel: "Que tipo de negócio é?",
    industries: {
      saas: {
        t: "SaaS e assinaturas",
        s: "Produtos de receita recorrente"
      },
      market: {
        t: "Marketplace",
        s: "Pagamentos e repasses divididos"
      },
      ecom: {
        t: "E-commerce",
        s: "Loja online ou checkout"
      },
      fintech: {
        t: "Fintech",
        s: "Construa sobre trilhos regulados"
      },
      platform: {
        t: "Plataforma",
        s: "Incorpore pagamentos para seus usuários"
      },
      ai: {
        t: "IA e agentes",
        s: "Fluxos de dinheiro programáticos"
      }
    },
    goalsEyebrow: "// o que você vai construir",
    goalsTitle: "O que você quer fazer primeiro?",
    goalsSub: "Escolha tudo o que se aplica — vamos personalizar seu painel e sugerir o plano certo.",
    goals: {
      accept: {
        t: "Aceitar pagamentos",
        s: "Cobre clientes em USDC"
      },
      payout: {
        t: "Enviar repasses",
        s: "Pague no mundo todo"
      },
      subs: {
        t: "Assinaturas",
        s: "Cobrança recorrente"
      },
      cross: {
        t: "Transfronteiriço",
        s: "Liquidação sem fronteiras"
      },
      embed: {
        t: "Finanças integradas",
        s: "Carteiras e contas"
      },
      test: {
        t: "Apenas explorando",
        s: "Testando a ferramenta"
      }
    },
    volumeLabel: "Volume mensal estimado",
    volumes: {
      explore: {
        t: "Apenas explorando",
        s: "Testando a API"
      },
      lt10: {
        t: "Menos de $10k / mês",
        s: "Tração inicial"
      },
      mid: {
        t: "$10k – $100k / mês",
        s: "Escalando"
      },
      gt100: {
        t: "$100k+ / mês",
        s: "Alto volume"
      }
    },
    planEyebrow: "// escolha seu plano",
    planTitle: "Escolha um plano para começar",
    planSub: "Comece grátis e pague apenas por transação bem-sucedida. Faça upgrade ou downgrade quando quiser — sem ligações.",
    popular: "Popular",
    recommended: "Recomendado",
    enterpriseNote: "Precisa de tarifas personalizadas ou um SLA?",
    enterpriseLink: "Fale com vendas sobre o Enterprise →",
    reviewEyebrow: "// revisar e criar",
    reviewTitle: "Revise sua organização",
    reviewSub: "Confirme os detalhes abaixo. Você cairá no seu novo painel com chaves de teste prontas.",
    rv: {
      org: "Organização",
      type: "Tipo de negócio",
      goals: "Objetivos",
      volume: "Volume estimado",
      plan: "Plano"
    },
    notSet: "Não definido",
    edit: "Editar",
    termsPre: "Concordo com os ",
    termsA: "Termos para Desenvolvedores",
    termsMid: " e a ",
    termsB: "Política de Uso Aceitável",
    termsPost: " da Cosmos Pay.",
    specTagline: "Uma API. Todos os trilhos da Stellar.",
    specTaglineSub: "Aceite e movimente dinheiro em USDC com liquidação em ~5 segundos. Escolha o plano que se encaixa — mude quando quiser.",
    selectedPlan: "Plano selecionado",
    recommendedForYou: "Recomendado para você",
    spec: {
      perTx: "Por transação",
      settle: "Liquidação",
      network: "Rede",
      team: "Membros da equipe",
      orgs: "Organizações",
      support: "Suporte",
      live: "Pagamentos ao vivo",
      included: "Incluído",
      notIncluded: "Não incluído"
    },
    whatsIncluded: "O que está incluído",
    specFoot: "As chaves de teste ficam prontas na hora. Sem cartão para começar.",
    supportLevels: {
      community: "Comunidade",
      standard: "Padrão",
      priority: "Prioritário"
    },
    plans: {
      community: {
        desc: "Grátis no lançamento · só Stellar",
        sub: "só Stellar",
        pnote: "grátis durante o lançamento · Stellar",
        team: "1",
        feats: ["Webhooks de pagamento", "Chaves de API de teste", "1 projeto"]
      },
      starter: {
        desc: "Aceite pagamentos reais na Stellar",
        sub: "+ 10¢ / txn",
        pnote: "0.5% + 10¢ por transação",
        team: "Até 5",
        feats: ["API de pagamentos completa", "Chaves ao vivo e de teste", "Liquidação em USDC", "Até 5 membros"]
      },
      growth: {
        desc: "Tarifas menores para equipes em crescimento",
        sub: "/mês · a partir de",
        pnote: "a partir de · 0.35% + 5¢ por txn",
        team: "Ilimitado",
        feats: ["Tudo do Starter", "Taxa por transação menor", "Membros ilimitados", "Ferramentas antifraude Radar", "Descontos por volume", "Suporte prioritário"]
      }
    }
  },
  nav: {
    login: "Entrar",
    getKeys: "Obter chaves",
    dashboard: "Painel",
    menu: "Menu",
    docs: "Documentação",
    items: {
      products: {
        label: "Produtos",
        cols: [
          {
            head: "Receber dinheiro",
            links: [
              {
                t: "Pagamentos",
                s: "Pagamentos na rede Stellar"
              },
              {
                t: "Checkout",
                s: "Página de pagamento hospedada"
              },
              {
                t: "Links de pagamento",
                s: "Links de pagamento sem código"
              },
              {
                t: "Faturamento",
                s: "Cobre em stablecoins"
              }
            ]
          },
          {
            head: "Movimentar dinheiro",
            links: [
              {
                t: "Repasses",
                s: "Envie fundos globalmente"
              },
              {
                t: "Internacional",
                s: "Liquidação sem fronteiras"
              },
              {
                t: "Anchors",
                s: "Entradas e saídas fiduciárias"
              },
              {
                t: "Câmbio",
                s: "Conversão multiativos"
              }
            ]
          },
          {
            head: "Construir com",
            links: [
              {
                t: "Stablecoins",
                s: "USDC e ativos Stellar"
              },
              {
                t: "Carteiras",
                s: "Custodial e não custodial"
              },
              {
                t: "Ledger",
                s: "Ledger on-chain em tempo real"
              },
              {
                t: "Radar",
                s: "Fraude e risco"
              }
            ]
          }
        ],
        featured: {
          title: "Cosmos Sessions 2026",
          desc: "Veja como estamos construindo a infraestrutura de pagamentos para a era da IA.",
          cta: "Assistir agora"
        }
      },
      solutions: {
        label: "Soluções",
        cols: [
          {
            head: "Por modelo",
            links: [
              {
                t: "SaaS e assinaturas",
                s: "Receita recorrente em escala"
              },
              {
                t: "Marketplaces",
                s: "Divisão de pagamentos e repasses"
              },
              {
                t: "Plataformas",
                s: "Incorpore pagamentos para usuários"
              },
              {
                t: "Finanças embarcadas",
                s: "Contas, cartões e dinheiro"
              }
            ]
          },
          {
            head: "Por setor",
            links: [
              {
                t: "E-commerce",
                s: "Maior conversão no checkout"
              },
              {
                t: "Fintech",
                s: "Construa sobre trilhos regulados"
              },
              {
                t: "Games",
                s: "Microtransações globais"
              },
              {
                t: "Viagens e mobilidade",
                s: "Fluxos complexos com várias partes"
              }
            ]
          }
        ]
      },
      developers: {
        label: "Desenvolvedores",
        cols: [
          {
            head: "Construir",
            links: [
              {
                t: "Referência da API",
                s: "REST e GraphQL"
              },
              {
                t: "SDKs e bibliotecas",
                s: "Seis linguagens tipadas"
              },
              {
                t: "Webhooks",
                s: "Eventos em tempo real"
              },
              {
                t: "Sandbox",
                s: "Teste tudo com segurança"
              }
            ]
          },
          {
            head: "Operar",
            links: [
              {
                t: "CLI",
                s: "Paridade entre local e produção"
              },
              {
                t: "Status",
                s: "Disponibilidade e incidentes"
              },
              {
                t: "Changelog",
                s: "O que lançamos"
              },
              {
                t: "Postman",
                s: "Coleção pronta para uso"
              }
            ]
          }
        ],
        featured: {
          title: "Início rápido",
          desc: "Vá do zero à sua primeira cobrança em menos de cinco minutos.",
          cta: "Começar a construir"
        }
      },
      resources: {
        label: "Recursos",
        cols: [
          {
            head: "Aprender",
            links: [
              {
                t: "Documentação",
                s: "Guias e referências"
              },
              {
                t: "Tutoriais",
                s: "Passo a passo detalhado"
              },
              {
                t: "Blog",
                s: "Engenharia e produto"
              },
              {
                t: "Casos de clientes",
                s: "Construído com a Cosmos Pay"
              }
            ]
          },
          {
            head: "Suporte",
            links: [
              {
                t: "Central de ajuda",
                s: "Respostas e tutoriais"
              },
              {
                t: "Community",
                s: "Fórum e Discord"
              },
              {
                t: "Falar com vendas",
                s: "Converse com um especialista"
              },
              {
                t: "Parceiros",
                s: "Agências e integrações"
              }
            ]
          }
        ]
      },
      pricing: {
        label: "Preços"
      }
    }
  },
  profile: {
    account: "Configurações da conta",
    billing: "Faturamento",
    docs: "Documentação",
    backToSite: "Voltar ao site",
    logout: "Sair",
    openDashboard: "Abrir painel"
  },
  footer: {
    tagline: "A infraestrutura de pagamentos para desenvolvedores. Uma API, todos os trilhos.",
    copyright: "© 2026 Cosmos Pay, Inc. — Plataforma para Desenvolvedores",
    groups: {
      products: {
        title: "Produtos",
        links: ["Pagamentos", "Stablecoins", "Repasses", "Anchors", "Carteiras", "Checkout", "Links de pagamento", "Preços"]
      },
      solutions: {
        title: "Soluções",
        links: ["SaaS e assinaturas", "Marketplaces", "E-commerce", "Plataformas", "Finanças embarcadas", "IA e agentes", "Enterprise"]
      },
      developers: {
        title: "Desenvolvedores",
        links: ["Documentação", "Referência da API", "SDKs e bibliotecas", "Webhooks", "Status da API", "Changelog", "Painel"]
      },
      resources: {
        title: "Recursos",
        links: ["Guias", "Blog", "Casos de clientes", "Suporte", "Parceiros", "Sessions 2026"]
      },
      company: {
        title: "Empresa",
        links: ["Sobre", "Carreiras", "Imprensa", "Segurança", "Privacidade e termos", "Conformidade"]
      }
    }
  },
  landing: {
    hero: {
      headline: "Escreva menos código -> movimente mais dinheiro",
      lede: "A infraestrutura de pagamentos para desenvolvedores. Uma API para movimentar dinheiro na rede Stellar — stablecoins e ativos digitais que liquidam em segundos, em mais de 130 países, com taxas de frações de centavo.",
      getKeys: "Obter chaves de API",
      trustedBy: "Com a confiança de equipes de engenharia de"
    },
    api: {
      kicker: "// a plataforma",
      title: "APIs poderosas",
      lede: "Nossas APIs modulares permitem que desenvolvedores integrem fluxos financeiros complexos em minutos — não em meses.",
      docsLink: "Ver documentação da API",
      cards: {
        payments: {
          title: "Pagamentos",
          desc: "Envie e receba pagamentos na Stellar com finalidade em menos de 5 segundos e taxas próximas de zero."
        },
        stablecoin: {
          title: "Stablecoins",
          desc: "Liquide em USDC e outros ativos Stellar, on-chain e em tempo real."
        },
        anchor: {
          title: "Anchors",
          desc: "Conecte-se a anchors Stellar para entradas e saídas fiduciárias em moedas locais."
        }
      },
      docsTitle: "Documentação de primeira linha",
      docsDesc: "Feita por desenvolvedores, para desenvolvedores. Guias interativos, uma referência OpenAPI detalhada e um SDK JavaScript / TypeScript totalmente tipado para o servidor e o navegador.",
      sdkBtns: {
        node: "SDK Node.js / TypeScript",
        web: "SDK para navegador / Web"
      },
      exploreDocs: "Explorar toda a documentação",
      copy: "Copiar",
      copied: "Copiado"
    },
    integration: {
      kicker: "// desenvolvedores",
      title: "Infraestrutura confiável e extensível.",
      lede: "Construída para lidar com as maiores cargas de trabalho do mundo — e para encaixar em qualquer stack que você já use.",
      scale: ["requisições de API / dia", "requisições / s", "finalidade Stellar", "disponibilidade"],
      paths: [
        {
          t: "Sem código",
          d: "Crie links de pagamento e faturamento direto do seu painel — sem necessidade de engenharia.",
          a: "Explorar sem código"
        },
        {
          t: "UI pré-construída",
          d: "Adicione o Checkout ou os Elements e aceite pagamentos Stellar em minutos, com componentes que combinam com sua marca.",
          a: "Ver componentes"
        },
        {
          t: "Construa o seu",
          d: "Use nossas APIs REST + GraphQL, SDKs tipados e CLI para criar uma integração Stellar totalmente sob medida.",
          a: "Ler a documentação"
        }
      ],
      mockLink: "Link de pagamento · 19.99 USDC"
    },
    solutions: {
      kicker: "// soluções",
      title: "Feito para todo modelo de negócio.",
      lede: "Da sua primeira transação a bilhões em volume — a Cosmos Pay se adapta à forma como sua empresa movimenta dinheiro na Stellar.",
      eyebrow: "Solução",
      startBuilding: "Começar a construir",
      items: {
        pay: {
          t: "Aceite pagamentos Stellar",
          d: "Envie e receba pagamentos na rede Stellar com finalidade em menos de 5 segundos e taxas medidas em frações de centavo.",
          long: "Aceite pagamentos de qualquer pessoa com uma carteira Stellar. Os fundos atingem a finalidade em cerca de cinco segundos e liquidam direto na sua conta — sem chargebacks, sem intermediários e sem retenções de vários dias.",
          points: ["Finalidade de liquidação em menos de 5 segundos", "Taxas em frações de centavo", "Envie e receba qualquer ativo Stellar", "Webhooks em tempo real em cada pagamento"]
        },
        coin: {
          t: "Liquidação em stablecoins",
          d: "Liquide em USDC e outros ativos Stellar, on-chain e em tempo real.",
          long: "Mantenha e liquide saldos em USDC e outras stablecoins reguladas emitidas na Stellar. Cada transação é registrada on-chain e reconciliada automaticamente no seu ledger em tempo real.",
          points: ["Stablecoins reguladas lastreadas 1:1", "Liquidação on-chain e auditável", "Ledger multiativos em tempo real", "Reconciliação automática"]
        },
        globe: {
          t: "Dinheiro internacional",
          d: "Alcance mais de 130 países em uma única rede global — sem bancos correspondentes.",
          long: "Movimente dinheiro entre fronteiras da mesma forma que faz localmente. A Stellar alcança mais de 130 países sem bancos correspondentes, então os repasses chegam em segundos em vez de dias.",
          points: ["Mais de 130 países em uma rede", "Sem atrasos de bancos correspondentes", "Câmbio transparente e antecipado", "Liquida em segundos"]
        },
        ramp: {
          t: "Entradas e saídas",
          d: "Conecte-se a anchors Stellar para depósitos e saques em moeda local.",
          long: "Permita que os usuários transitem entre moeda local e ativos digitais por meio de anchors Stellar regulados. Depósitos e saques em dezenas de moedas locais, totalmente tratados pelos padrões SEP.",
          points: ["Rede de anchors regulada", "Dezenas de moedas locais", "Fluxos padrão SEP-6 / SEP-24", "KYC tratado pelo anchor"]
        },
        wallet: {
          t: "Carteiras embarcadas",
          d: "Crie carteiras Stellar custodial ou não custodial para seus usuários.",
          long: "Dê a cada usuário uma carteira Stellar dentro do seu produto. Escolha carteiras custodial que você gerencia ou carteiras não custodial controladas pelos seus usuários — ambas provisionadas com uma única chamada de API.",
          points: ["Custodial ou não custodial", "Provisionamento em uma chamada", "Gerenciamento de chaves integrado", "Saldos multiativos"]
        }
      },
      payMock: {
        received: "Pagamento recebido",
        via: "via Stellar · 4.2s",
        fee: "taxa $0.00001"
      }
    },
    stats: {
      items: ["SLA de disponibilidade da API", "tempo de resposta p99", "países suportados", "chamadas de API / mês"]
    },
    customers: {
      kicker: "// clientes",
      title: "Impulsionando empresas de todos os tamanhos.",
      lede: "De startups em estágio inicial a empresas de capital aberto, as equipes constroem e escalam seus pagamentos na Cosmos Pay.",
      eyebrow: "Caso de cliente",
      readStory: "Ler caso",
      readFull: "Ler caso completo",
      items: {
        Northwind: {
          label: "liquidação internacional mais rápida após migrar para a Stellar.",
          tags: ["Pagamentos", "Stablecoins", "Carteiras"],
          story: "A Northwind migrou seu checkout global para a Cosmos Pay e a rede Stellar, reduzindo a liquidação de dias para segundos e cortando custos de câmbio em mais de 30 mercados — tudo isso mantendo um único ledger reconciliado."
        },
        Lumio: {
          label: "para lançar assinaturas em USDC em 40 países.",
          tags: ["Faturamento", "USDC", "Anchors"],
          story: "A Lumio substituiu uma colcha de retalhos de processadores regionais pela Cosmos Pay, lançando assinaturas denominadas em USDC em 40 países em apenas seis semanas, usando anchors para entradas e saídas locais."
        },
        Helios: {
          label: "liquidados a vendedores no mundo todo pela rede Stellar.",
          tags: ["Repasses", "Connect", "Ramps"],
          story: "A Helios faz repasses a uma base global de vendedores inteiramente na Stellar. No ano passado, liquidou US$ 2,4 bilhões a vendedores em 58 países, com fundos chegando em segundos e total transparência on-chain."
        }
      }
    },
    testimonials: {
      kicker: "// depoimentos",
      title: "Adorado por desenvolvedores e equipes financeiras.",
      items: {
        MC: {
          q: "A Cosmos Pay nos permitiu movimentar dinheiro entre fronteiras em segundos. Substituímos três provedores por uma única API Stellar.",
          r: "VP de Engenharia, Vertexa"
        },
        DO: {
          q: "A documentação é a melhor que já usei. Liquidamos nosso primeiro pagamento em USDC antes do almoço no primeiro dia.",
          r: "Fundador, Quanta"
        },
        PN: {
          q: "A reconciliação costumava levar uma semana. A liquidação on-chain na Stellar agora faz isso para nós em tempo real.",
          r: "Chefe de Finanças, Riverstone"
        }
      }
    },
    resources: {
      kicker: "// recursos",
      title: "O que está acontecendo.",
      lede: "Novidades de produto, guias aprofundados e histórias de engenharia da equipe que constrói a Cosmos Pay.",
      readMore: "Ler mais",
      items: [
        {
          tag: "Relatório",
          t: "O panorama de 2026 dos pagamentos em stablecoins",
          d: "Como as equipes estão movimentando dinheiro na Stellar em escala global."
        },
        {
          tag: "Changelog",
          t: "Os webhooks de liquidação Stellar estão em disponibilidade geral",
          d: "Receba eventos em tempo real no momento em que um pagamento atinge a finalidade."
        },
        {
          tag: "Guia",
          t: "Projetando webhooks idempotentes",
          d: "Padrões para tratamento de eventos confiável e exatamente uma vez."
        },
        {
          tag: "Blog",
          t: "Escalando para 8 bilhões de requisições por mês",
          d: "Por dentro da infraestrutura que impulsiona a Cosmos Pay."
        }
      ]
    },
    cta: {
      title: "Comece a construir hoje.",
      desc: "Crie um sandbox gratuito na testnet e entre em produção na Stellar no momento em que estiver pronto.",
      getKeys: "Obter chaves de API",
      talk: "Falar com a engenharia",
      helpers: [
        {
          b: "Veja quanto você vai pagar",
          s: "Preços transparentes baseados em uso, sem surpresas."
        },
        {
          b: "Começar a construir",
          s: "Pegue suas chaves de API e faça seu primeiro pagamento hoje."
        }
      ]
    }
  },
  pricing: {
    kicker: "// preços",
    title: "Pague pelo que você processa.",
    lede: "Preços transparentes baseados em uso. Comece grátis — pague apenas uma pequena taxa por transação bem-sucedida.",
    monthly: "Mensal",
    annual: "Anual",
    save: "−17%",
    popular: "Mais popular",
    from: "a partir de",
    perMo: "/mês",
    billedYearly: "cobrado anualmente",
    plans: [
      {
        name: "Community",
        tag: "Grátis",
        desc: "Comece a aceitar pagamentos sem custo mensal.",
        amt: "Grátis",
        txt: "sem mensalidade",
        cta: "Começar grátis",
        feats: ["Aceite pagamentos", "Chaves de API de teste", "1 projeto", "Suporte da comunidade", "Proteção de pagamentos", "Resolução de disputas", "Cartões e transferências bancárias"]
      },
      {
        name: "Starter",
        desc: "Receba pagamentos reais com proteção de pagamentos integrada.",
        amt: "1.5%",
        txt: "+ 0.25¢ por transação *",
        cta: "Começar grátis",
        feats: ["Tudo do Community", "Pagamentos reais", "Proteção de pagamentos", "Acesso parcial à API", "Suporte padrão", "Resolução de disputas", "Cartões e transferências bancárias"]
      },
      {
        name: "Essentials",
        desc: "Acesso total à plataforma com disputas e todos os métodos de pagamento.",
        txt: "+ 0.5% + 10¢ por transação *",
        cta: "Iniciar teste grátis",
        feats: ["Tudo do Starter", "Acesso total à API", "Proteção de pagamentos", "Resolução de disputas", "Cartões e transferências bancárias", "Suporte prioritário por e-mail", "Descontos por volume"]
      },
      {
        name: "Growth",
        desc: "Taxas menores e mais potência para equipes em crescimento.",
        txt: "+ 0.35% + 5¢ por transação *",
        cta: "Iniciar teste grátis",
        feats: ["Tudo do Essentials", "Taxa de 0.35% + 5¢ por transação", "Membros de equipe ilimitados", "Ferramentas antifraude avançadas", "Descontos por volume", "Suporte prioritário", "Roteamento inteligente de pagamentos"]
      }
    ],
    enterprise: {
      name: "Enterprise",
      desc: "Taxas personalizadas e infraestrutura dedicada para as empresas de maior volume.",
      feats: ["Taxas por transação personalizadas", "Infraestrutura dedicada", "SLA de disponibilidade de 99.99%", "SSO / SAML + logs de auditoria", "Arquiteto de soluções dedicado", "Suporte prioritário 24/7"],
      price: "Personalizado",
      subt: "Taxas baseadas em volume",
      cta: "Falar com vendas"
    },
    footnote: "* Cada transação também inclui uma pequena taxa de rede. Community e Starter cobrem nossos recursos essenciais de pagamento; Essentials e Growth liberam acesso total à API, resolução de disputas e todos os métodos de pagamento, incluindo cartões e transferências bancárias.",
    compareTitle: "Comparar planos",
    orgsRow: "Organizações",
    seatsRow: "Membros por organização",
    keysRow: "Chaves de API",
    compareHead: ["Recurso", "Community", "Starter", "Essentials", "Growth", "Enterprise"],
    compare: [
      {
        l: "Mensalidade",
        v: ["—", "—", "$33 / mo", "$99 / mo", "Personalizado"]
      },
      {
        l: "Taxa por transação",
        v: ["—", "1.5% + 0.25¢", "0.5% + 10¢", "0.35% + 5¢", "Personalizado"]
      },
      {
        l: "Velocidade de liquidação",
        v: ["~5 sec", "~5 sec", "~5 sec", "~5 sec", "~5 sec"]
      },
      {
        l: "Acesso à API",
        v: ["Notificações", "Parcial", "Completo", "Completo", "Completo"]
      },
      {
        l: "Pagamentos reais",
        v: [1, 1, 1, 1, 1]
      },
      {
        l: "Proteção de pagamentos",
        v: [0, 1, 1, 1, 1]
      },
      {
        l: "Resolução de disputas",
        v: [0, 0, 1, 1, 1]
      },
      {
        l: "Cartões e transferências bancárias",
        v: [0, 0, 1, 1, 1]
      },
      {
        l: "Ferramentas antifraude avançadas",
        v: [0, 0, 0, 1, 1]
      },
      {
        l: "Descontos por volume",
        v: [0, 0, 0, 1, 1]
      },
      {
        l: "SSO / SAML",
        v: [0, 0, 0, 0, 1]
      },
      {
        l: "Suporte",
        v: ["Community", "Padrão", "Prioritário por e-mail", "Prioritário", "24/7 dedicado"]
      }
    ],
    faqTitle: "Perguntas frequentes",
    faqs: [
      {
        q: "Existe mesmo um plano gratuito?",
        a: "Sim. O plano Community é gratuito e inclui tudo o que você precisa para começar a aceitar pagamentos imediatamente. O Starter também é gratuito mensalmente; você paga apenas uma pequena taxa por transação bem-sucedida."
      },
      {
        q: "Quanto custa uma transação?",
        a: "O Starter é 1.5% + 0.25¢ por transação bem-sucedida. O Essentials é $33/mês (ou $27.50/mês cobrado anualmente) e reduz a taxa para 0.5% + 10¢, enquanto o Growth é $99/mês e a reduz para 0.35% + 5¢. Uma pequena taxa de rede também se aplica a cada transação."
      },
      {
        q: "Quais métodos de pagamento vocês suportam?",
        a: "Community e Starter cobrem nossos métodos de pagamento essenciais. A partir do Essentials você também pode aceitar cartões, transferências bancárias e outros métodos de pagamento locais por meio de uma única integração."
      },
      {
        q: "Com que rapidez o dinheiro liquida?",
        a: "Os pagamentos atingem a finalidade em cerca de cinco segundos, em todos os planos — não há atrasos de repasse de vários dias."
      },
      {
        q: "Posso mudar de plano depois?",
        a: "Com certeza. Faça upgrade ou downgrade a qualquer momento pelo seu painel. As mudanças entram em vigor imediatamente — sem necessidade de ligações."
      }
    ],
    ctaTitle: "Ainda tem dúvidas?",
    ctaDesc: "Converse com nossa equipe sobre preços por volume, conformidade ou migração de outro provedor.",
    contactSales: "Falar com vendas",
    openDashboard: "Abrir painel"
  },
  dash: {
    viewLabels: {
      overview: "Visão geral",
      payments: "Pagamentos",
      balances: "Saldos",
      customers: "Clientes",
      products: "Produtos e links",
      swaps: "Swaps",
      liquidity: "Pools de liquidez",
      blindpay: "Fiat",
      developers: "Chaves de API",
      webhook: "Webhooks",
      logs: "Logs da API",
      weblogs: "Logs de webhooks",
      settings: "Organização",
      account: "Conta",
      activity: "Atividade",
      support: "Suporte",
      inbox: "Caixa de suporte",
      users: "Usuários",
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
        Platform: "Plataforma",
        Build: "Construir",
        Account: "Conta",
        Support: "Suporte",
        Admin: "Admin"
      },
      items: {
        overview: "Visão geral",
        payments: "Pagamentos",
        balances: "Saldos",
        customers: "Clientes",
        products: "Produtos",
        swaps: "Swaps",
        liquidity: "Liquidez",
        blindpay: "Fiat",
        developers: "Chaves de API",
        webhook: "Webhooks",
        logs: "Logs",
        weblogs: "Logs webhook",
        settings: "Organização",
        account: "Conta",
        activity: "Atividade",
        support: "Suporte",
        inbox: "Caixa",
        users: "Usuários",
        adminOverview: "Overview",
        adminPayments: "Payments",
        adminSwaps: "Swaps",
        adminFiat: "Fiat",
        adminCustomers: "Customers",
        adminProducts: "Products",
        adminConsumers: "Organizations"
      },
      collapse: "Recolher barra lateral"
    },
    org: {
      heading: "Organizações",
      owned: "Suas organizações",
      invited: "Compartilhadas com você",
      locked: "Bloqueada — faça upgrade do plano",
      create: "Criar organização"
    },
    env: {
      heading: "Ambiente",
      sandbox: "Sandbox",
      production: "Produção",
      testnet: "Ambiente de testnet",
      mainnet: "Ambiente de mainnet"
    },
    topbar: {
      search: "Buscar pagamentos, clientes, logs…",
      theme: "Alternar tema",
      notifications: "Notificações"
    },
    statusLabels: {
      Succeeded: "Concluído",
      Failed: "Falhou",
      Refunded: "Reembolsado",
      Active: "Ativo",
      Delivered: "Entregue"
    },
    common: {
      cancel: "Cancelar",
      copy: "Copiar",
      copyLink: "Copiar link",
      export: "Exportar",
      vsLastWeek: "vs. semana passada",
      optional: "(opcional)",
      viewPlans: "Ver planos",
      yes: "Sim",
      no: "Não",
      assetCustom: "Personalizado…",
      assetAny: "Qualquer"
    },
    profileMenu: {
      account: "Configurações da conta",
      billing: "Faturamento",
      docs: "Documentação",
      backToSite: "Voltar ao site",
      logout: "Sair"
    },
    modals: {
      org: {
        eyebrow: "Organização",
        title: "Criar organização",
        atLimit: "Seu plano {plan} permite até {limit} organização{s}. Faça upgrade do seu plano para criar mais.",
        body: "As organizações mantêm pagamentos, clientes e chaves de API totalmente separados. Você pode criar mais {n} no seu plano {plan}.",
        bodyUnlimited: "As organizações mantêm pagamentos, clientes e chaves de API totalmente separados. Você pode criar quantas quiser no seu plano {plan}.",
        nameLabel: "Nome da organização",
        namePlaceholder: "Acme Inc.",
        create: "Criar organização"
      },
      key: {
        eyebrow: "Chave de API",
        title: "Criar chave secreta",
        editTitle: "Editar chave de API",
        desc: "Escolha o ambiente e o que esta chave pode fazer. Você só poderá ver o segredo uma vez.",
        editDesc: "Atualize o nome, a descrição, a função e as permissões desta chave.",
        nameLabel: "Nome",
        namePlaceholder: "Servidor de produção",
        descLabel: "Descrição",
        descPlaceholder: "Usada pelo serviço de faturamento",
        envLabel: "Ambiente",
        envs: {
          dev: "Desenvolvimento",
          prod: "Produção"
        },
        roleLabel: "Função",
        roles: {
          user: "Usuário",
          admin: "Administrador"
        },
        permsLabel: "Permissões",
        permResource: "Recurso",
        scopeResources: { payments: "Pagamentos", swaps: "Swaps", liquidity: "Liquidez", webhooks: "Webhooks", products: "Produtos", customers: "Clientes" },
        adminHint: "As chaves de admin têm acesso total a todos os recursos.",
        perms: {
          read: "Leitura",
          write: "Escrita"
        },
        create: "Criar chave",
        save: "Salvar alterações"
      },
      reveal: {
        eyebrow: "Chave de API criada",
        title: "Salve sua chave secreta",
        body: "Esta é a única vez que você verá este segredo. Copie-o agora e guarde-o em um lugar seguro — por segurança, você não poderá vê-lo novamente.",
        idLabel: "ID da chave",
        saved: "Salvei minha chave"
      }
    },
    overview: {
      greeting: "Bom dia, {name}",
      sub: "Veja o que está acontecendo na {org} hoje.",
      metrics: {
        gross: "Volume bruto",
        net: "Volume líquido",
        success: "Pagamentos bem-sucedidos",
        newCust: "Novos clientes"
      },
      grossVolume: "Volume bruto",
      recentPayments: "Pagamentos recentes",
      recentActivity: "Atividade recente",
      acts: {
        key: "Chave de API gerada",
        webhook: "Webhook entregue",
        payments: "Pagamento liquidado",
        customers: "Novo cliente"
      },
      tableHead: {
        payment: "Pagamento",
        customer: "Cliente",
        amount: "Valor",
        status: "Status",
        date: "Data"
      }
    },
    payments: {
      title: "Pagamentos",
      sub: "{n} pagamentos · liquidados instantaneamente na Stellar",
      filters: {
        all: "Todos",
        ok: "Concluído",
        fail: "Falhou",
        ref: "Reembolsado"
      },
      create: "Criar pagamento",
      searchPlaceholder: "Buscar por cliente ou ID…",
      tableHead: {
        payment: "Pagamento",
        customer: "Cliente",
        amount: "Valor",
        status: "Status",
        date: "Data"
      },
      empty: "Nenhum pagamento corresponde aos seus filtros.",
      modal: {
        eyebrow: "Pagamento",
        title: "Criar pagamento",
        desc: "Os pagamentos liquidam instantaneamente na rede Stellar — sem período de retenção.",
        amount: "Valor",
        asset: "Ativo",
        customer: "Cliente",
        customerPlaceholder: "Acme Inc.",
        create: "Criar pagamento",
        newCustomer: "Novo cliente"
      }
    },
    cosmos: {
      loading: "A carregar…", loadError: "Não foi possível carregar os dados.", empty: "Ainda não há nada aqui.",
      eventLabels: { PAYMENT_INTENT_CREATED: "Pagamento criado", PAYMENT_INTENT_UPDATED: "Pagamento atualizado", PAYMENT_INTENT_SUCCEEDED: "Pagamento concluído", PAYMENT_INTENT_FAILED: "Pagamento falhou", PAYMENT_INTENT_CANCELLED: "Pagamento cancelado", PAYMENT_INTENT_DELETED: "Pagamento eliminado" },
      active: "Ativo", inactive: "Desativado",
      reveal: "Mostrar segredo", secret: "Segredo de assinatura", secretNote: "Mostrado uma vez — guarde-o em segurança.",
      rotate: "Rodar segredo", ping: "Enviar teste", pingOk: "Evento de teste entregue", pingFail: "Falhou o evento de teste",
      deliveries: "Entregas recentes", noDeliveries: "Ainda não há entregas.", redeliver: "Reenviar",
      enable: "Ativar", disable: "Desativar",
      delete: "Eliminar", deleteConfirm: "Eliminar", confirmDelete: "Não é possível anular.",
      customerSet: "Valor livre", allEvents: "Todos os eventos", events: "Eventos",
      received: "Recebido", pending: "Pendente", settledNote: "Liquidado diretamente na sua conta, em tempo real.",
      custDetail: { title: "Cliente", edit: "Editar", save: "Guardar alterações", alias: "Alias", note: "Nota", account: "Conta Stellar", payments: "Pagamentos", onChain: "On-chain", noPayments: "Ainda não há pagamentos." },
    },
    paylinks: {
      title: "Links de pagamento",
      sub: "{n} links · pagamentos SEP-7 na Stellar",
      create: "Criar link de pagamento",
      searchPlaceholder: "Pesquisar por destino, memo ou ID…",
      filters: { all: "Todos", PENDING: "Pendente", SUBMITTED: "Enviado", SUCCEEDED: "Concluído", FAILED: "Falhou", CANCELLED: "Cancelado", EXPIRED: "Expirado" },
      tableHead: { id: "Link", type: "Tipo", amount: "Valor", status: "Estado", created: "Criado" },
      kinds: { PAY: "Link de pagamento", TX: "Transação" },
      anyAmount: "Valor livre",
      empty: "Ainda não há links de pagamento. Crie um para obter um QR e um link partilhável.",
      loading: "A carregar links de pagamento…",
      loadError: "Não foi possível carregar os links de pagamento.",
      readOnly: "Tem acesso só de leitura aos links de pagamento nesta organização.",
      createError: "Não foi possível criar o link de pagamento.",
      deleteError: "Não foi possível eliminar o link de pagamento.",
      network: { dev: "Testnet", prod: "Rede pública" },
      modal: {
        eyebrow: "Link de pagamento", title: "Criar link de pagamento",
        desc: "Gere um link SEP-7 e um QR que o seu cliente pode pagar em qualquer carteira Stellar.",
        kind: "Tipo", kindPay: "Link de pagamento (o cliente paga)", kindTx: "Transação (origem conhecida)",
        kindPayHint: "Sem conta de origem — devolve um URI de pagamento + QR.",
        kindTxHint: "Origem conhecida — devolve uma transação não assinada para assinar.",
        destination: "Destino", destinationHint: "Conta Stellar que recebe os fundos (G…).",
        source: "Origem", sourceHint: "Conta Stellar do pagador (G…).",
        amount: "Valor", amountHint: "Deixe vazio para o pagador escolher (doações).",
        asset: "Ativo", assetIssuer: "Emissor do ativo", assetIssuerHint: "Obrigatório para ativos não nativos (G…).",
        memo: "Memo", memoHint: "MEMO_ID numérico — gerado automaticamente se vazio.",
        message: "Mensagem", messageHint: "Mostrado ao pagador na carteira (≤ 300 caracteres).",
        submit: "Criar link",
      },
      detail: {
        eyebrow: "Link de pagamento", title: "Link de pagamento pronto",
        scan: "Digitalize para pagar", downloadQr: "Descarregar QR",
        uri: "URI SEP-7", xdr: "XDR não assinado",
        openWallet: "Abrir na carteira", copyLink: "Copiar link", copyUri: "Copiar URI",
        fields: { id: "ID", status: "Estado", kind: "Tipo", network: "Rede", destination: "Destino", source: "Origem", amount: "Valor", asset: "Ativo", memo: "Memo", message: "Mensagem", txHash: "ID da transação", created: "Criado" },
        delete: "Eliminar",
        deleteTitle: "Eliminar link de pagamento", deleteBody: "«{id}» será removido. Não é possível anular.", deleteConfirm: "Eliminar link",
      },
      status: { PENDING: "Pendente", SUBMITTED: "Enviado", SUCCEEDED: "Concluído", FAILED: "Falhou", CANCELLED: "Cancelado", EXPIRED: "Expirado" },
    },
    balances: {
      title: "Saldos",
      sub: "Liquidados diretamente na sua conta Stellar, em tempo real",
      note: "A Cosmos Pay nunca retém seus fundos — cada pagamento liquida direto na sua própria conta Stellar no momento em que é feito.",
      total: "SALDO TOTAL",
      across: "em 3 ativos",
      explorer: "Ver no explorer",
      recent: "Liquidações recentes",
      payment: "Pagamento",
      tableHead: {
        transaction: "Transação",
        type: "Tipo",
        amount: "Valor",
        status: "Status",
        date: "Data"
      }
    },
    customers: {
      title: "Clientes",
      sub: "{n} clientes",
      add: "Adicionar cliente",
      searchPlaceholder: "Buscar clientes…",
      tableHead: {
        name: "Nome",
        email: "E-mail",
        spend: "Gasto total",
        payments: "Pagamentos",
        since: "Desde"
      },
      empty: "Nenhum cliente encontrado.",
      modal: {
        eyebrow: "Cliente",
        title: "Adicionar cliente",
        desc: "Crie um cliente para acompanhar pagamentos e saldos.",
        name: "Nome",
        email: "E-mail",
        add: "Adicionar cliente"
      }
    },
    products: {
      title: "Produtos e links",
      sub: "Planos recorrentes e links de pagamento",
      add: "Novo produto",
      tableHead: {
        name: "Nome",
        price: "Preço",
        type: "Tipo",
        status: "Status"
      },
      types: {
        Recurring: "Recorrente",
        "One-time": "Único",
        "Payment link": "Link de pagamento"
      },
      modal: {
        eyebrow: "Produto",
        title: "Criar produto",
        desc: "Venda um plano, um item único ou um link de pagamento flexível.",
        name: "Nome",
        price: "Preço (USDC)",
        priceHint: "(deixe em branco para valor definido pelo cliente)",
        type: "Tipo",
        create: "Criar produto"
      }
    },
    apikeys: {
      readOnly: "Você tem acesso somente leitura — apenas owners e admins podem criar ou revogar chaves de API.",
      title: "Chaves de API",
      sub: "Chaves secretas para a API da Cosmos Pay. Crie quantas precisar.",
      create: "Criar chave secreta",
      tableHead: {
        name: "Nome",
        id: "ID da chave",
        role: "Função",
        permissions: "Permissões",
        created: "Criada"
      },
      empty: "Ainda não há chaves de API.",
      locked: "Bloqueada",
      loading: "Carregando chaves de API…",
      loadError: "Não foi possível carregar suas chaves de API.",
      createError: "Não foi possível criar a chave de API.",
      updateError: "Não foi possível atualizar a chave de API.",
      deleteError: "Não foi possível revogar a chave de API.",
      revoke: "Revogar",
      edit: "Editar",
      unnamed: "Chave sem nome",
      none: "—",
      revokeTitle: "Revogar chave de API",
      revokeBody: "«{name}» será revogada permanentemente e qualquer app que a use deixará de funcionar. Esta ação não pode ser desfeita.",
      revokeConfirm: "Revogar chave",
      usage: "{used} / {limit}",
      limitReached: "Você atingiu o limite de chaves do seu plano. Faça upgrade para adicionar mais."
    },
    webhooks: {
      title: "Webhooks",
      sub: "Eventos em tempo real quando os pagamentos liquidam na Stellar",
      add: "Adicionar endpoint",
      endpoints: "Endpoints",
      recent: "Entregas recentes",
      eventsCount: "{n} eventos",
      tableHead: {
        url: "URL",
        events: "Eventos",
        status: "Status",
        event: "Evento",
        response: "Resposta",
        when: "Quando"
      },
      modal: {
        eyebrow: "Webhook",
        title: "Adicionar endpoint",
        desc: "Faremos POST dos payloads de eventos para esta URL.",
        urlLabel: "URL do endpoint",
        eventsLabel: "Eventos para enviar",
        add: "Adicionar endpoint"
      }
    },
    logs: {
      title: "Logs da API",
      sub: "Cada requisição à API da Cosmos Pay — clique em uma linha para inspecionar",
      searchPlaceholder: "Buscar por endpoint…",
      tableHead: {
        method: "Método",
        endpoint: "Endpoint",
        status: "Status",
        time: "Tempo",
        timestamp: "Carimbo de data/hora"
      },
      reqHeaders: "Cabeçalhos da requisição",
      params: "Parâmetros de query / corpo",
      response: "Resposta",
      meta: "Meta"
    },
    settings: {
      title: "Organização",
      sub: "Gerencie a {org}",
      org: {
        title: "Detalhes",
        name: "Nome",
        id: "ID da organização",
        created: "Criada"
      },
      plan: {
        title: "Plano e limites",
        change: "Mudar plano",
        current: "Plano atual",
        orgs: "Organizações",
        apiKeys: "Chaves de API",
        unlimited: "Ilimitado",
        manage: "Gerenciar organizações",
        changeTitle: "Mudar de plano",
        changeSub: "Mude seu plano. É uma simulação — nada é cobrado.",
        save: "Atualizar plano",
        liveKeys: "Chaves de produção",
        seats: "Assentos da equipe",
        confirmSwitch: "Mudar plano",
        downgradeNote: "Os recursos acima dos novos limites ficarão bloqueados até você fazer upgrade novamente.",
        feature: "Recurso",
        youAreHere: "Atual",
        upgrade: "Upgrade",
        downgrade: "Downgrade",
        switchTo: "Mudar para {plan}",
        price: "Preço",
        perTx: "Por transação",
        mainnet: "Pagamentos ao vivo",
        settle: "Liquidação",
        apiAccess: "Acesso à API",
        apiLevels: { notifications: "Notificações de pagamento", partial: "API parcial", full: "API completa" }, perOrgNote: "As chaves de API e os membros são gerenciados em cada organização."
      },
      appearance: {
        title: "Aparência",
        theme: "Tema",
        light: "Claro",
        dark: "Escuro"
      },
      team: {
        title: "Equipe",
        add: "+ Adicionar membro",
        roles: {
          Admin: "Administrador",
          Developer: "Desenvolvedor",
          Analyst: "Analista",
          Viewer: "Visualizador",
          Owner: "Proprietário"
        }
      },
      teamModal: {
        eyebrow: "Equipe",
        title: "Convidar membro da equipe",
        desc: "Eles receberão um convite por e-mail para entrar na {org}.",
        name: "Nome completo",
        email: "E-mail",
        role: "Função",
        send: "Enviar convite"
      }
    },
    pagination: {
      prev: "Anterior",
      next: "Próximo",
      range: "{from}–{to} de {total}"
    },
    notifications: {
      title: "Notificações",
      empty: "Ainda não há notificações.",
      loadError: "Não foi possível carregar as notificações.",
      origin: "Origem",
      markAll: "Marcar tudo como lido",
      types: {
        "auth.login": "Novo login",
        "support.reply": "Resposta do suporte",
        "apikey.created": "Chave de API criada",
        "apikey.updated": "Chave de API atualizada",
        "apikey.deleted": "Chave de API revogada",
        custom: "Notificação"
      },
      subtitle: "Logins e alterações na sua conta",
      viewAll: "Ver toda a atividade",
      location: "Localização",
      device: "Dispositivo",
      ip: "Endereço IP",
      localhost: "localhost"
    },
    support: {
      title: "Suporte",
      subtitle: "Converse com a equipe da Cosmos Pay",
      placeholder: "Escreva uma mensagem…",
      send: "Enviar",
      empty: "Ainda não há mensagens. Envie a primeira e responderemos.",
      loadError: "Não foi possível carregar a conversa.",
      sendError: "Não foi possível enviar sua mensagem.",
      you: "Você",
      staff: "Suporte",
      inboxTitle: "Caixa de suporte",
      inboxSubtitle: "Responda e atenda seus usuários",
      conversations: "Conversas",
      noConversations: "Ainda não há conversas.",
      selectConversation: "Selecione uma conversa para responder.",
      customer: "Cliente",
      reply: "Responder",
      replyPlaceholder: "Escreva uma resposta…",
      newTicket: "Novo ticket",
      newTicketTitle: "Abrir um novo ticket",
      subjectLabel: "Assunto",
      subjectPlaceholder: "Resumo breve do problema",
      messageLabel: "Mensagem",
      create: "Abrir ticket",
      createError: "Não foi possível abrir o ticket.",
      myTickets: "Meus tickets",
      lastSeen: "Visto por último {when}",
      online: "Online",
      seen: "Visto",
      priorities: { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" },
      noTickets: "Ainda não há tickets.",
      selectTicket: "Selecione um ticket para vê-lo.",
      tickets: "Tickets",
      all: "Todos",
      statusError: "Não foi possível atualizar o status.",
      statuses: { open: "Aberto", pending: "Pendente", resolved: "Resolvido", closed: "Fechado" }
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
      user: "Usuário",
      support: "Suporte",
      admin: "Administrador",
      owner: "Proprietário"
    },
    account: {
      title: "Conta",
      sub: "Gerencie sua conta pessoal",
      profile: { title: "Perfil", name: "Nome", email: "E-mail", role: "Função", note: "Seu nome, foto e biografia são editados aqui.",
        displayName: "Nome de exibição", displayNamePlaceholder: "Seu nome", bio: "Biografia", bioPlaceholder: "Uma linha sobre você ou sua empresa",
        edit: "Editar", save: "Salvar alterações", saving: "Salvando…", uploadPhoto: "Enviar foto", changePhoto: "Trocar foto", removePhoto: "Remover",
        photoHint: "PNG, JPG ou WebP — quadrada fica melhor.", saved: "Perfil atualizado", saveError: "Não foi possível atualizar seu perfil.",
        photoTooLarge: "Essa imagem é muito grande. Escolha uma com menos de 8 MB.", photoInvalid: "Esse arquivo não é uma imagem compatível.",
        editNote: "E-mail e função vêm do seu login da Cosmos Pay." },
      session: { title: "Sessão", desc: "Saia do painel da Cosmos Pay neste dispositivo.", signOut: "Sair" },
    },
    users: {
      title: "Usuários",
      subtitle: "Gerencie funções e planos das contas",
      loadError: "Não foi possível carregar os usuários.",
      saveError: "Não foi possível atualizar o usuário.",
      saved: "Usuário atualizado",
      search: "Buscar usuários…",
      name: "Nome",
      email: "Email",
      role: "Função",
      plan: "Plano",
      empty: "Nenhum usuário encontrado."
    },
    orgs: {
      permissionsLabel: "Permissões",
      permResource: "Permissão",
      resources: { apiKeysTest: "Chaves de API de teste", apiKeysLive: "Chaves de API de produção", webhooks: "Webhooks", products: "Produtos", customers: "Clientes", payments: "Links de pagamento" },
      actions: { create: "Criar", edit: "Editar", delete: "Excluir" },
      permissions: { apiKeysTest: "Criar chaves de API de teste", apiKeysLive: "Criar chaves de API de produção", webhooks: "Criar endpoints de webhook", products: "Criar produtos", customers: "Criar clientes", payments: "Criar links de pagamento" },
      editMember: "Editar",
      editMemberTitle: "Editar membro",
      save: "Salvar",
      memberUpdated: "Membro atualizado",
      memberUpdateError: "Não foi possível atualizar o membro.",
      adminAllNote: "Admins podem fazer tudo na organização.",
      removeMemberTitle: "Remover membro",
      removeMemberBody: "Remover {name} de {org}? Ele perderá o acesso imediatamente.",
      removeMemberConfirm: "Remover",
      join: "Entrar",
      joined: "Você entrou na organização",
      joinError: "Não foi possível aceitar o convite.",
      bannerTitle: "Você foi convidado para entrar em {org}",
      bannerSub: "Convidado como {role}",
      roleLabel: "Função",
      roleMemberHint: "Colaboradores podem ver o painel, mas não criar chaves de API nem gerenciar a organização.",
      roleAdminHint: "Admins podem criar chaves de API e gerenciar a organização e seus membros.",
      inviteMember: "Convidar membro",
      invited: "Convite enviado",
      inviteError: "Não foi possível enviar o convite.",
      inviteHint: "Enviaremos um link mágico que expira em 3 dias. Os assentos são por organização.",
      send: "Enviar convite",
      sending: "Enviando…",
      pending: "Convites pendentes",
      expires: "Expira {date}",
      revokeInvite: "Revogar",
      revokeError: "Não foi possível revogar o convite.",
      loadError: "Não foi possível carregar as organizações.",
      createError: "Não foi possível criar a organização.",
      renameError: "Não foi possível renomear a organização.",
      deleteError: "Não foi possível excluir a organização.",
      rename: "Renomear",
      renameTitle: "Renomear organização",
      delete: "Excluir organização",
      deleteTitle: "Excluir organização",
      deleteBody: "«{name}» será excluída permanentemente junto com seus membros. Esta ação não pode ser desfeita.",
      deleteConfirm: "Excluir",
      members: "Membros",
      membersSub: "Pessoas com acesso a esta organização",
      addMember: "Adicionar membro",
      memberEmail: "Email do membro",
      memberEmailHint: "Ele já precisa ter uma conta da Cosmos Pay.",
      add: "Adicionar",
      remove: "Remover",
      you: "Você",
      roles: {
        owner: "Proprietário",
        admin: "Administrador",
        member: "Membro"
      },
      memberAddError: "Não foi possível adicionar esse membro. Verifique se o email pertence a uma conta da Cosmos Pay.",
      memberRemoveError: "Não foi possível remover o membro.",
      empty: "Ainda não há membros."
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
      title: "Pools de liquidez",
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

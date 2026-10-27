/* pt.js: Portuguese message catalog. Mirrors en.js exactly in shape. */
export default {
  ui: { close: "Fechar", dialog: "Diálogo", copyToClipboard: "Copiar para a área de transferência", search: "Pesquisar", searchEllipsis: "Pesquisar…", select: "Selecionar…", account: "Conta", onboardingSteps: "Etapas do cadastro", skipToContent: "Pular para o conteúdo" },
  zk: {
    title: "Pagamentos privados",
    commission: "Comissão",
    commissionRate: "0,18% por transação",
    amount: "Valor",
    merchantGets: "O cliente recebe",
    merchantFee: "Taxa do comerciante",
    youPay: "Você paga",
    status: {
      PENDING: "Pendente",
      SUCCEEDED: "Pago",
      EXPIRED: "Expirado",
    },
    unavailable: "Os pagamentos privados ainda não estão disponíveis nesta rede.",
    cannotProve: "Este navegador não consegue gerar as provas. Abra a página no Chrome, Edge ou Firefox.",
    freighter: {
      missing: "Instale o Freighter para continuar.",
      declined: "O Freighter recusou a solicitação.",
      wrongNetwork: "Mude o Freighter para {network}.",
    },
    phases: {
      keys: "Assine no Freighter para derivar sua chave privada",
      proving: "Gerando a prova…",
      signing: "Aprove no Freighter…",
      waiting: "Aguardando a rede…",
    },
    view: { detail: { title: "Pagamento privado", payer: "Pagador", paymentTx: "Transação do pagamento", feeTx: "Transação da comissão", expires: "Expira", settled: "Liquidado" },
      create: "Criar pagamento privado",
      empty: "Ainda não há pagamentos privados.",
      loadError: "Não foi possível carregar os pagamentos privados.",
      tableHead: {
        id: "Pagamento",
        amount: "Valor",
        net: "Cliente recebe",
        fee: "Comissão",
        status: "Status",
        created: "Criado",
      },
      copyLink: "Copiar link de pagamento",
      openCheckout: "Abrir o checkout",
      searchPlaceholder: "Pesquisar por ID, conta ou valor…",
    },
    modal: {
      title: "Novo pagamento privado",
      recipient: "Conta privada do cliente",
      recipientHint: "O cliente que recebe o pagamento, na conta privada dele.",
      feeHint: "Sua própria taxa, no mesmo pagamento privado e à parte da comissão da Cosmos Pay. Vai para uma carteira Stellar da organização, que também precisa de uma conta privada.",
      payerPays: "O pagador paga",
      description: "Descrição",
      expires: "Expira em",
      expiries: {
        m60: "1 hora",
        m1440: "24 horas",
        m10080: "7 dias",
      },
      submit: "Criar",
      submitting: "Criando…",
      created: "Pagamento privado criado",
      link: "Link de pagamento",
      steps: { amount: "Valor e cliente", details: "Detalhes", fee: "Taxa" },
    },
    account: {
      title: "Contas privadas",
      needWallet: "Para receber pagamentos privados, a organização precisa de pelo menos uma carteira Stellar conectada.",
      viewBalances: "Ver saldos",
      registered: "Ativa",
      spendable: "Disponível",
      receiving: "A receber",
      merge: "Passar o que chegou para disponível",
      withdraw: "Sacar para XLM público",
      deposit: "Depositar XLM",
      amountLabel: "Valor",
      refresh: "Atualizar",
      working: "Processando…",
      createdOk: "Conta privada criada",
      depositOk: "Depósito concluído",
      withdrawOk: "Saque concluído",
      mergeOk: "O que chegou passou para disponível",
      done: "Pronto",
      tableHead: { wallet: "Carteira", customer: "Cliente", address: "Endereço", status: "Status", payments: "Pagamentos recebidos", added: "Adicionada" },
      detail: "Conta privada",
      paymentsTo: "Pagamentos privados para esta conta",
      add: "Criar conta privada",
      newCustomer: "Novo cliente",
      customerName: "Nome do cliente",
      walletLabel: "Nome da carteira",
      added: "Conta privada adicionada: ela já existia no contrato",
      remove: "Excluir conta privada",
      removed: "Conta privada excluída do dashboard. O saldo privado continua sendo do cliente.",
      removeTitle: "Excluir a conta privada?",
      removeBody: "{account} é removida de {customer}. A conta privada e o saldo continuam sendo do cliente; nada é movido.",
      searchPlaceholder: "Buscar por cliente, carteira ou endereço…",
      noPaymentsYet: "Esta conta ainda não recebeu pagamentos privados",
      loadError: "Não foi possível carregar as contas privadas.",
      keyMismatch: "Esta conta foi registrada no token privado assinando uma mensagem com o Freighter (no checkout privado, ou no dashboard antes de 27/10/2026), não a transação da chave, então esta assinatura não abre os saldos dela aqui. Ela continua recebendo pagamentos privados.",
      keyFailed: "A transação assinada não é a assinatura de {wallet}. Peça ao cliente que a assine com essa conta.",
      phases: { keys: "Aguardando a assinatura do cliente…", proving: "Gerando a prova…", signing: "Aguardando a assinatura do cliente…", waiting: "Aguardando a rede…" },
      steps: { account: "Conta", sign: "Assinaturas" },
      customerWallet: "Carteira Stellar do cliente",
      otherAddress: "Outro endereço",
      requestSignatures: "Pedir assinaturas e criar",
      creating: "Criando…",
      notFunded: "Esta conta ainda não existe na {network}. Ela precisa de XLM antes de poder ter uma conta privada.",
      alreadyAdded: "Esta conta já é uma das contas privadas deste cliente.",
      notSaved: "A conta privada foi criada no token, mas não pôde ser adicionada ao cliente: {error}. Adicione-a de novo; será pedida uma só assinatura.",
      unchecked: "{n} carteiras de clientes não puderam ser verificadas na rede.",
      checkAgain: "Verificar de novo",
      balancesHidden: "Oculto até o cliente assinar",
      createdOn: "Criada no contrato",
      checking: "Consultando o contrato…",
      addExisting: "Adicionar a conta privada existente",
      modeSub: "Criar uma nova",
      modeExisting: "Usar a existente",
      subOf: "Subconta de {base}",
      signedBy: "Assinada por",
      subUnderfunded: "O endereço não tem XLM suficientes para a subconta: precisa de {amount} XLM mais a taxa.",
      subFailed: "Não foi possível criar a subconta: {error}.",
      createdAt: "{date}, na transação {tx}",
      existsTitle: "Este endereço já tem uma conta privada",
      existsHereTitle: "A conta privada deste endereço já é deste cliente: você pode criar uma nova",
      modeExistingDesc: "É adicionada ao cliente, sem assinaturas.",
      modeSubDesc: "Uma subconta deste endereço, com sua própria conta privada. O endereço coloca {amount} XLM nela e assina tudo com sua carteira.",
      sigsLabel: "Assinaturas",
      sigSub: "Criar a subconta com {amount} XLM",
      sigKey: "Chave da conta privada",
      sigProof: "Prova de registro",
      sigRegister: "Registro no token",
      sigBy: "Assina",
      sigHere: "Neste navegador",
    },
    sign: {
      eyebrow: "Assinatura",
      key: { title: "Assinatura do cliente para a conta privada", desc: "Esta transação nunca pode ser enviada à rede: a assinatura do cliente abre a chave da conta privada dele, aqui ou em qualquer dispositivo. Uma assinatura basta. Quem tiver essa assinatura pode ver os saldos privados da conta (não movê-los), então o cliente deve assiná-la só para você." },
      subAccount: { title: "Assine para criar a subconta", desc: "Esta transação cria uma conta Stellar nova, com fundos da conta do cliente, e deixa a conta do cliente como seu único signatário." },
      register: { title: "Assine para criar a conta privada", desc: "Esta transação registra as chaves da conta no token privado." },
      deposit: { title: "Assine o depósito", desc: "Esta transação passa XLM público para o saldo privado da conta." },
      withdraw: { title: "Assine o saque", desc: "Esta transação devolve saldo privado para o XLM público da conta." },
      merge: { title: "Assine para passar o recebido para disponível", desc: "Esta transação passa o que a conta recebeu para o saldo disponível." },
      transfer: { title: "Assine o pagamento privado", desc: "Esta transação envia o pagamento de forma privada." },
      xdr: "Transação para assinar (XDR)",
      pasteTitle: "Assinada em outra carteira",
      pasteDesc: "Copie o XDR acima, assine com {account} em qualquer carteira Stellar e cole aqui o XDR assinado.",
      customerTitle: "Assinada pelo cliente (XDR)",
      customerDesc: "Copie o XDR acima e envie ao cliente: ele o assina com {account} em qualquer carteira Stellar e devolve o XDR assinado. Cole-o aqui.",
      pastePlaceholder: "XDR da transação assinada…",
      continue: "Continuar",
      expires: "Restam {time} para assinar",
      expired: "Esta transação expirou. Cancele e comece de novo.",
      invalid: "Isso não é o XDR de uma transação assinada.",
      otherTransaction: "É outra transação. Assine o XDR acima sem alterá-lo.",
      notSigned: "Essa transação não está assinada por {account}.",
      txAccount: "Conta da transação",
      signer: "Assina com",
      subTitle: "Assina-se com o endereço, não com a subconta",
      subBody: "A transação é da subconta {sub} e seu único signatário é {account}: assine com a carteira de {account}, como as outras. A subconta não tem chave própria.",
    },
    checkout: {
      title: "Pagamento privado",
      to: "Para",
      payPrivately: "Pagar com privacidade",
      steps: {
        register: "Criar sua conta confidencial",
        fund: "Passar XLM para seu saldo confidencial",
        pay: "Enviar o pagamento",
        fee: "Enviar a comissão",
        merchantFee: "Enviar a taxa do comerciante",
        confirm: "Confirmar o pagamento",
      },
      paid: "Pagamento concluído",
      paidBody: "O valor fica privado na blockchain.",
      expired: "Este pagamento expirou.",
      notFound: "Este pagamento não existe.",
      loadError: "Não foi possível carregar este pagamento.",
      retry: "Tentar novamente",
      transactions: "Transações",
    },
  },
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
    goalsSub: "Escolha tudo o que se aplica. Vamos personalizar seu painel e sugerir o plano certo.",
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
    planSub: "O Starter não tem mensalidade: você paga apenas por transação bem-sucedida. Faça upgrade ou downgrade quando quiser, sem ligações.",
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
    specTagline: "Uma API. Stellar, Solana e Monad.",
    specTaglineSub: "Aceite e movimente dinheiro em USDC com liquidação em ~5 segundos. Escolha o plano que se encaixa e mude quando quiser.",
    selectedPlan: "Plano selecionado",
    recommendedForYou: "Recomendado para você",
    spec: {
      perTx: "Por transação",
      swap: "Por swap",
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
      standard: "Padrão",
      priority: "Prioritário"
    },
    plans: {
      starter: {
        desc: "Aceite pagamentos reais na Stellar, Solana e Monad",
        sub: "+ 18¢ / txn",
        pnote: "1.5% + 18¢ por transação",
        team: "Até 2",
        feats: ["Acesso parcial à API", "Chaves ao vivo e de teste", "Liquidação em USDC", "Até 2 membros"]
      },
      growth: {
        desc: "Tarifas menores para equipes em crescimento",
        sub: "/mês · a partir de",
        pnote: "a partir de · 0.75% + 18¢ por txn",
        team: "Ilimitado",
        feats: ["Tudo do Starter", "Taxa por transação menor", "Membros ilimitados", "Ferramentas antifraude Radar", "Descontos por volume", "Suporte prioritário"]
      }
    }
  },

  /* ---------------- /login ---------------- */

  nav: {
    login: "Entrar",
    getKeys: "Obter chaves",
    dashboard: "Painel",
    menu: "Menu",
    docs: "Documentação",
    main: "Principal",
    closeMenu: "Fechar menu",
    theme: "Modo escuro",
    language: "Idioma",
    items: {
      products: {
        label: "Produtos",
        cols: [
          {
            head: "Receber dinheiro",
            links: [
              {
                t: "Pagamentos",
                s: "Stellar, Solana e Monad"
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
                t: "Swaps",
                s: "Qualquer token e rede, sem conta"
              }
            ]
          },
          {
            head: "Construir com",
            links: [
              {
                t: "Stablecoins",
                s: "USDC e ativos multichain"
              },
              {
                t: "Carteiras",
                s: "Custodial e não custodial"
              },
              {
                t: "Livro-razão",
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
                t: "Status do sistema",
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
                t: "Comunidade",
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
    copyright: "© 2026 Cosmos Pay",
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
      tagline: "O teu mundo digital em movimento.",
      headline: "Escreva menos código -> movimente mais dinheiro",
      lede: "A infraestrutura de pagamentos para desenvolvedores. Uma API para movimentar dinheiro na Stellar, Solana e Monad: stablecoins e ativos digitais que liquidam em segundos, em mais de 130 países, com taxas de frações de centavo.",
      getKeys: "Obter chaves de API",
      trustedBy: "Com a confiança de equipes de engenharia de"
    },
    wallet: {
      title: "O teu mundo digital numa wallet.",
      lede: "Instale no Chrome, teste direto no navegador ou leve no celular. A mesma conta em todo lugar, na Stellar, Solana e Monad.",
      chrome: { t: "Instalar no Chrome", s: "Extensão oficial na Chrome Web Store." },
      web: { t: "Testar no navegador", s: "Abra o web app agora, sem instalar nada." },
      android: { t: "Baixar para Android", s: "APK assinado. Libere \"Instalar apps desconhecidos\" para o seu navegador, abra o arquivo e instale." },
      moreLabel: "Outras plataformas",
      versionLabel: "Versão",
      download: "Baixar",
      more: {
        firefox: { t: "Firefox", s: "Sem assinatura. Acesse about:debugging, escolha \"Este Firefox\", depois \"Carregar extensão temporária\" e selecione o manifest.json do zip." },
        windows: { t: "Windows", s: "O SmartScreen avisa na primeira vez: clique em \"Mais informações\" e depois em \"Executar assim mesmo\"." },
        macos: { t: "macOS (Apple Silicon)", s: "O Gatekeeper bloqueia na primeira vez: clique com o botão direito no app e escolha \"Abrir\"." },
        linux: { t: "Linux", s: "AppImage: rode chmod +x antes. Precisa de glibc 2.39 ou superior." },
      },
      ios: "Ainda não existe versão para iOS.",
    },
    devs: {
      title: "Quer integrar a Cosmos Pay Wallet na sua startup?",
      lede: "Um comando e um link. O seu assistente de código faz o resto.",
      installTitle: "Instale o SDK",
      installDesc: "JavaScript e TypeScript, para o servidor e para o navegador. Um pacote, dois pontos de entrada.",
      llmsTitle: "Entregue as docs ao seu assistente",
      llmsDesc: "Claude Code, Codex e Cursor leem o índice em texto puro e já sabem usar o SDK.",
      llmsBtn: "Abrir llms.txt",
      docsBtn: "Ver a documentação",
    },
    api: {
      kicker: "// a plataforma",
      title: "APIs poderosas",
      lede: "Nossas APIs modulares permitem que desenvolvedores integrem fluxos financeiros complexos em minutos, não em meses.",
      docsLink: "Ver documentação da API",
      cards: {
        payments: {
          title: "Pagamentos",
          desc: "Envie e receba pagamentos na Stellar, Solana e Monad com finalidade em segundos e taxas próximas de zero."
        },
        stablecoin: {
          title: "Stablecoins",
          desc: "Liquide em USDC e outros ativos na Stellar, Solana e Monad, on-chain e em tempo real."
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
      lede: "Construída para lidar com as maiores cargas de trabalho do mundo e para encaixar em qualquer stack que você já use.",
      scale: ["requisições de API / dia", "requisições / s", "finalidade on-chain", "disponibilidade"],
      paths: [
        {
          t: "Sem código",
          d: "Crie links de pagamento e faturamento direto do seu painel, sem necessidade de engenharia.",
          a: "Explorar sem código"
        },
        {
          t: "UI pré-construída",
          d: "Adicione o Checkout ou os Elements e aceite pagamentos na Stellar, Solana e Monad em minutos, com componentes que combinam com sua marca.",
          a: "Ver componentes"
        },
        {
          t: "Construa o seu",
          d: "Use nossas APIs REST + GraphQL, SDKs tipados e CLI para criar uma integração multichain totalmente sob medida.",
          a: "Ler a documentação"
        }
      ],
      mockLink: "Link de pagamento · 19.99 USDC",
      mockPay: "Pagar"
    },
    solutions: {
      kicker: "// soluções",
      title: "Feito para todo modelo de negócio.",
      lede: "Da sua primeira transação a bilhões em volume, a Cosmos Pay se adapta à forma como sua empresa movimenta dinheiro na Stellar, Solana e Monad.",
      eyebrow: "Solução",
      startBuilding: "Começar a construir",
      items: {
        pay: {
          t: "Aceite pagamentos multichain",
          d: "Envie e receba pagamentos na Stellar, Solana e Monad com finalidade em segundos e taxas medidas em frações de centavo.",
          long: "Aceite pagamentos de qualquer pessoa com uma carteira Stellar, Solana ou Monad. Os fundos atingem a finalidade em segundos e liquidam direto na sua conta, sem chargebacks, sem intermediários e sem retenções de vários dias.",
          points: ["Finalidade de liquidação em segundos", "Taxas em frações de centavo", "Envie e receba na Stellar, Solana e Monad", "Webhooks em tempo real em cada pagamento"]
        },
        coin: {
          t: "Liquidação em stablecoins",
          d: "Liquide em USDC e outros ativos na Stellar, Solana e Monad, on-chain e em tempo real.",
          long: "Mantenha e liquide saldos em USDC e outras stablecoins reguladas na Stellar, Solana e Monad. Cada transação é registrada on-chain e reconciliada automaticamente no seu ledger em tempo real.",
          points: ["Stablecoins reguladas lastreadas 1:1", "Liquidação on-chain e auditável", "Ledger multiativos em tempo real", "Reconciliação automática"]
        },
        globe: {
          t: "Dinheiro internacional",
          d: "Alcance mais de 130 países por redes abertas e globais, sem bancos correspondentes.",
          long: "Movimente dinheiro entre fronteiras da mesma forma que faz localmente. Stellar, Solana e Monad alcançam mais de 130 países sem bancos correspondentes, então os repasses chegam em segundos em vez de dias.",
          points: ["Mais de 130 países, uma única API", "Sem atrasos de bancos correspondentes", "Câmbio transparente e antecipado", "Liquida em segundos"]
        },
        ramp: {
          t: "Entradas e saídas",
          d: "Conecte-se a anchors Stellar para depósitos e saques em moeda local.",
          long: "Permita que os usuários transitem entre moeda local e ativos digitais por meio de anchors Stellar regulados. Depósitos e saques em dezenas de moedas locais, totalmente tratados pelos padrões SEP.",
          points: ["Rede de anchors regulada", "Dezenas de moedas locais", "Fluxos padrão SEP-6 / SEP-24", "KYC tratado pelo anchor"]
        },
        wallet: {
          t: "Carteiras embarcadas",
          d: "Crie carteiras custodial ou não custodial na Stellar, Solana e Monad para seus usuários.",
          long: "Dê a cada usuário uma carteira multichain (Stellar, Solana e Monad) dentro do seu produto. Escolha carteiras custodial que você gerencia ou carteiras não custodial controladas pelos seus usuários. Ambas são provisionadas com uma única chamada de API.",
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
      title: "Simples. Seguro. Sem limites.",
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
          label: "liquidação internacional mais rápida após migrar para a Cosmos Pay.",
          tags: ["Pagamentos", "Stablecoins", "Carteiras"],
          story: "A Northwind migrou seu checkout global para a Cosmos Pay na Stellar, Solana e Monad, reduzindo a liquidação de dias para segundos e cortando custos de câmbio em mais de 30 mercados, tudo isso mantendo um único ledger reconciliado."
        },
        Lumio: {
          metric: "6 sem.",
          label: "para lançar assinaturas em USDC em 40 países.",
          tags: ["Faturamento", "USDC", "Anchors"],
          story: "A Lumio substituiu uma colcha de retalhos de processadores regionais pela Cosmos Pay, lançando assinaturas denominadas em USDC em 40 países em apenas seis semanas, usando anchors para entradas e saídas locais."
        },
        Helios: {
          label: "liquidados a vendedores no mundo todo pela Stellar, Solana e Monad.",
          tags: ["Repasses", "Connect", "Rampas"],
          story: "A Helios faz repasses a uma base global de vendedores inteiramente on-chain. No ano passado, liquidou US$ 2,4 bilhões a vendedores em 58 países, com fundos chegando em segundos e total transparência on-chain."
        }
      }
    },
    testimonials: {
      kicker: "// depoimentos",
      title: "Adorado por desenvolvedores e equipes financeiras.",
      items: {
        MC: {
          q: "A Cosmos Pay nos permitiu movimentar dinheiro entre fronteiras em segundos. Substituímos três provedores por uma única API multichain.",
          r: "VP de Engenharia, Vertexa"
        },
        DO: {
          q: "A documentação é a melhor que já usei. Liquidamos nosso primeiro pagamento em USDC antes do almoço no primeiro dia.",
          r: "Fundador, Quanta"
        },
        PN: {
          q: "A reconciliação costumava levar uma semana. A liquidação on-chain agora faz isso para nós em tempo real.",
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
          d: "Como as equipes estão movimentando dinheiro na Stellar, Solana e Monad em escala global."
        },
        {
          tag: "Changelog",
          t: "Os webhooks de liquidação multichain estão em disponibilidade geral",
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
    marketplace: {
      title: "E se você também quiser vender?",
      lede: "Cosmos é o marketplace do mesmo ecossistema. Lá os comércios publicam o que vendem e recebem com a infraestrutura que você está integrando aqui. Mesmo universo, o outro lado do balcão.",
      btn: "Conhecer a Cosmos",
    },
    cta: {
      label: "Uma nova forma de mover o seu mundo digital.",
      thanks: "Obrigado pela confiança.",
      title: "Comece a construir hoje.",
      desc: "Crie um sandbox gratuito na testnet e entre em produção na Stellar, Solana e Monad no momento em que estiver pronto.",
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
    lede: "Pagamentos, swaps e pagamentos privados como serviço, com preço por operação. Comece sem mensalidade: pague apenas uma pequena taxa por operação bem-sucedida.",
    monthly: "Mensal",
    annual: "Anual",
    save: "−17%",
    popular: "Mais popular",
    from: "a partir de",
    perMo: "/mês",
    billedYearly: "cobrado anualmente",
    plans: [
      {
        name: "Starter",
        desc: "Receba pagamentos reais sem mensalidade e com proteção de pagamentos integrada.",
        amt: "1.5%",
        txt: "+ 18¢ por transação *",
        cta: "Começar",
        feats: ["Pagamentos reais", "Chaves de API de teste", "Proteção de pagamentos", "Acesso parcial à API", "Suporte padrão", "Resolução de disputas", "Cartões e transferências bancárias"]
      },
      {
        name: "Essentials",
        desc: "Acesso total à plataforma com disputas e todos os métodos de pagamento.",
        txt: "+ 1.12% + 18¢ por transação *",
        cta: "Escolher Essentials",
        feats: ["Tudo do Starter", "Acesso total à API", "Proteção de pagamentos", "Resolução de disputas", "Cartões e transferências bancárias", "Suporte prioritário por e-mail", "Descontos por volume"]
      },
      {
        name: "Growth",
        desc: "Taxas menores e mais potência para equipes em crescimento.",
        txt: "+ 0.75% + 18¢ por transação *",
        cta: "Escolher Growth",
        feats: ["Tudo do Essentials", "Taxa de 0.75% + 18¢ por transação", "Membros de equipe ilimitados", "Ferramentas antifraude avançadas", "Descontos por volume", "Suporte prioritário", "Roteamento inteligente de pagamentos"]
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
    footnote: "* Cada transação também inclui uma pequena taxa de rede. O Starter cobre nossos recursos essenciais de pagamento; Essentials e Growth liberam acesso total à API, resolução de disputas e todos os métodos de pagamento, incluindo cartões e transferências bancárias.",
    compareTitle: "Comparar planos",
    orgsRow: "Organizações",
    seatsRow: "Membros por organização",
    keysRow: "Chaves de API",
    ratesRows: { swaps: "Comissão por swap", escrow: "Escrow, por pagamento", privatePayments: "Pagamentos privados", ownFee: "Sua própria taxa em cada operação" },
    compareHead: ["Recurso", "Starter", "Essentials", "Growth", "Enterprise"],
    compare: [
      {
        l: "Mensalidade",
        v: ["Sem mensalidade", "$33 / mo", "$99 / mo", "Personalizado"]
      },
      {
        l: "Taxa por transação",
        v: ["1.5% + 18¢", "1.12% + 18¢", "0.75% + 18¢", "Personalizado"]
      },
      {
        l: "Velocidade de liquidação",
        v: ["~5 sec", "~5 sec", "~5 sec", "~5 sec"]
      },
      {
        l: "Acesso à API",
        v: ["Parcial", "Completo", "Completo", "Completo"]
      },
      {
        l: "Pagamentos reais",
        v: [1, 1, 1, 1]
      },
      {
        l: "Proteção de pagamentos",
        v: [1, 1, 1, 1]
      },
      {
        l: "Resolução de disputas",
        v: [0, 1, 1, 1]
      },
      {
        l: "Cartões e transferências bancárias",
        v: [0, 1, 1, 1]
      },
      {
        l: "Ferramentas antifraude avançadas",
        v: [0, 0, 1, 1]
      },
      {
        l: "Descontos por volume",
        v: [0, 0, 1, 1]
      },
      {
        l: "SSO / SAML",
        v: [0, 0, 0, 1]
      },
      {
        l: "Suporte",
        v: ["Padrão", "Prioritário por e-mail", "Prioritário", "24/7 dedicado"]
      }
    ],
    faqTitle: "Perguntas frequentes",
    faqs: [
      {
        q: "Preciso pagar uma mensalidade?",
        a: "Não. O Starter não tem mensalidade: você paga apenas uma pequena taxa por transação bem-sucedida. Essentials e Growth acrescentam uma mensalidade em troca de taxas menores."
      },
      {
        q: "Quanto custa uma transação?",
        a: "O Starter é 1.5% + 18¢ por transação bem-sucedida. O Essentials é $33/mês (ou $27.50/mês cobrado anualmente) e reduz a taxa para 1.12% + 18¢, enquanto o Growth é $99/mês e a reduz para 0.75% + 18¢. Uma pequena taxa de rede também se aplica a cada transação."
      },
      {
        q: "Quais métodos de pagamento vocês suportam?",
        a: "O Starter cobre nossos métodos de pagamento essenciais. A partir do Essentials você também pode aceitar cartões, transferências bancárias e outros métodos de pagamento locais por meio de uma única integração."
      },
      {
        q: "Com que rapidez o dinheiro liquida?",
        a: "Os pagamentos atingem a finalidade em cerca de cinco segundos, em todos os planos. Não há atrasos de repasse de vários dias."
      },
      {
        q: "Posso mudar de plano depois?",
        a: "Com certeza. Faça upgrade ou downgrade a qualquer momento pelo seu painel. As mudanças entram em vigor imediatamente, sem necessidade de ligações."
      },
      {
        q: "Quanto custa um swap?",
        a: "Cada plano tem sua própria comissão por swap: {starter} no Starter, {essentials} no Essentials, {growth} no Growth e {enterprise} no Enterprise. Sem conta, a página pública de swaps e a API dela cobram {public}. As taxas das redes são à parte, e cada cotação mostra as taxas antes de você assinar."
      },
      {
        q: "Posso oferecer esses serviços aos meus clientes?",
        a: "Sim. A Cosmos Pay é pagamentos, swaps, gateway de pagamento e pagamentos privados como serviço: nós operamos todo o serviço, e você só informa os endereços de carteira que recebem o dinheiro e assina com a sua carteira. Cada operação paga a tarifa do seu plano, e você pode somar sua própria taxa, paga à carteira que escolher."
      }
    ],
    ctaTitle: "Ainda tem dúvidas?",
    ctaDesc: "Converse com nossa equipe sobre preços por volume, conformidade ou migração de outro provedor.",
    contactSales: "Falar com vendas",
    openDashboard: "Abrir painel"
  },
  swapsPage: {
    metaTitle: "Swaps | Cosmos Pay",
    metaDescription: "Troque tokens entre mais de 35 redes e envie USDT0 da Stellar para 21 redes, sem criar conta: sua carteira assina e ninguém guarda seus fundos. Com API pública de swaps.",
    title: "Troque entre redes, sem criar conta",
    lede: "Escolha com o que paga e o que recebe. Sua carteira assina e os fundos nunca passam pela Cosmos Pay.",
    facts: [
      { t: "Sem conta", s: "Abra a página e faça o swap. A API pública funciona do mesmo jeito." },
      { t: "Mais de 35 redes", s: "Os mercados da Stellar, Solana e Monad, e todas as redes que a NEAR Intents alcança." },
      { t: "Sem custódia", s: "Cada swap é uma transação que sua carteira assina ou um endereço de depósito que você paga." },
    ],
    fee: "Comissão: {pct} por swap sem conta, de {max} a {min} com um plano, mais as taxas das redes.",
    usdt0Title: "USDT0: USDT nativo a partir da Stellar",
    usdt0Lede: "USDT0 na Stellar é o USDT omnichain da Tether. Envie 1:1 pela LayerZero: chega como USDT nativo no Ethereum e como USDT0 em mais {n} redes. A taxa da LayerZero é paga em XLM, e a cotação mostra todas as taxas antes de você assinar.",
    usdt0Cta: "Enviar USDT0",
    usdt0Networks: "Onde chega",
    apiTitle: "Os mesmos swaps a partir do seu código",
    apiLede: "A API pública de swaps também não precisa de conta: pegue a chave pública compartilhada e chame os mesmos endpoints que esta página usa. Ela cobra a mesma comissão de {pct} por swap.",
    apiStep1: "Obtenha a chave pública",
    apiStep2: "Cote um swap entre redes",
    apiStep3: "Cote USDT0 saindo da Stellar",
    apiDocs: "Referência da API",
    faqTitle: "Perguntas",
    faq: [
      { q: "Preciso de uma conta?", a: "Não. A página e a API pública usam uma chave pública compartilhada. Com uma conta você tem o histórico no dashboard e, com um plano, uma comissão menor: de {max} a {min}." },
      { q: "Quem guarda meus fundos?", a: "Ninguém. Um swap em uma rede é uma transação que sua carteira assina, um swap entre redes é um endereço de depósito que a NEAR Intents liquida, e o USDT0 viaja pela LayerZero." },
      { q: "Quanto custa?", a: "{pct} por swap sem conta, de {max} a {min} com um plano, mais as taxas das redes. Enviar USDT0 da Stellar também paga a taxa da LayerZero, em XLM. Cada cotação mostra as taxas antes de você assinar." },
      { q: "Por que o USDT0 deixa um resto mínimo?", a: "O USDT0 cruza com seis casas decimais e a Stellar tem sete: a sétima fica na sua conta." },
      { q: "Posso oferecer swaps aos meus clientes?", a: "Sim, como serviço: nós operamos os swaps, e você só informa os endereços de carteira que recebem o dinheiro e assina com a sua carteira. Cada swap paga a comissão do seu plano, e você pode somar sua própria taxa, paga à carteira que escolher." },
    ],
  },
  dash: {
    wallets: {
      title: "Carteiras",
      connect: "Adicionar carteira",
      connectTitle: "Adicionar uma carteira",
      connectAnother: "Adicionar outra carteira",
      network: "Rede",
      wallet: "Carteira",
      installed: "Instalada",
      notInstalled: "Não instalada",
      browserWallet: "Carteira do navegador",
      label: "Nome",
      labelPlaceholder: "Tesouraria",
      signing: "Aprove a solicitação na sua carteira…",
      connectSign: "Conectar e assinar",
      address: "Endereço Stellar",
      addressPlaceholder: "G…",
      invalidAddress: "Não é um endereço Stellar válido.",
      proofTitle: "Prove que a carteira é sua",
      proofDesc: "Assine esta transação com essa carteira. Ela nunca pode ser enviada à rede: só prova que o endereço é seu. Com o Freighter é um clique; em qualquer outra carteira, assine o XDR abaixo e cole-o de volta.",
      add: "Adicionar carteira",
      connected: "Carteira adicionada",
      missing: "{wallet} não está instalada neste navegador.",
      declined: "A carteira recusou a solicitação.",
      connectError: "Não foi possível conectar a carteira.",
      empty: "Ainda não há carteiras conectadas.",
      emptyAsk: "Ainda não há carteiras conectadas. Alguém com permissão pode conectar uma.",
      loadError: "Não foi possível carregar as carteiras da organização.",
      rename: "Renomear",
      renameTitle: "Renomear carteira",
      save: "Salvar",
      renamed: "Carteira renomeada",
      remove: "Remover",
      removeTitle: "Remover esta carteira?",
      removeBody: "{name} não será mais oferecida para receber pagamentos. Os pagamentos já criados mantêm o endereço.",
      removeConfirm: "Remover carteira",
      removed: "Carteira removida",
      actionError: "Não foi possível salvar a alteração.",
      noneForChain: "A organização ainda não tem uma carteira de {network}.",
      askAdmin: "Alguém com permissão pode conectar uma em Configurações.",
      steps: { address: "Endereço", sign: "Assinatura" },
      tableHead: { wallet: "Carteira", network: "Rede", address: "Endereço", added: "Adicionada" },
      searchPlaceholder: "Buscar por nome, endereço ou rede…",
      detail: "Carteira da organização",
      provenWith: "Comprovada com",
      signedXdr: "XDR assinado",
    },
    examples: { order: "Pedido #24", firstName: "Ana", lastName: "Silva", fullName: "Ana Silva", jobTitle: "Diretora", customerName: "Faturamento Acme", payoutsName: "Pagamentos da Acme (USD)", productName: "Plano Pro (mensal)" },
    search: { label: "Pesquisar no painel", placeholder: "Pesquisar", pages: "Páginas", searchGroup: "Pesquisar", searchIn: "{place} com “{q}”", empty: "Nada corresponde a “{q}”." },
    viewLabels: {
      overview: "Visão geral", payment: "Pagamento",
      payments: "Pagamentos", zkPayments: "Pagamentos privados",
      balances: "Saldos",
      customers: "Clientes",
      products: "Produtos e links",
      swaps: "Swaps", crossChainSwaps: "Swaps entre redes",
      liquidity: "Pools de liquidez",
      blindpay: "Fiat",
      developers: "Chaves de API",
      webhook: "Webhooks",
      logs: "Logs da API",
      weblogs: "Logs de webhooks",
      activityLog: "Atividade de clientes",
      settings: "Organização",
      account: "Conta",
      activity: "Notificações",
      support: "Suporte",
      inbox: "Caixa de suporte",
      users: "Usuários",
      adminOverview: "Visão geral da plataforma",
      adminPayments: "Pagamentos (todas as orgs)",
      adminSwaps: "Swaps (todas as orgs)",
      adminFiat: "Fiat (todas as orgs)",
      adminCustomers: "Clientes (todas as orgs)",
      adminProducts: "Produtos (todas as orgs)",
      adminConsumers: "Organizações"
    },
    sidebar: {
      label: "Painel",
      menu: { main: "Menu principal", preferences: "Preferências" },
      groups: { payments: "Pagamentos", swaps: "Swaps", developers: "Desenvolvedores", settings: "Configurações", help: "Ajuda", admin: "Admin" },
      notifications: "Notificações",
      sections: {
        Platform: "Plataforma",
        Build: "Construir",
        Account: "Conta",
        Support: "Suporte",
        Admin: "Admin"
      },
      items: {
        overview: "Visão geral",
        payments: "Pagamentos", zkPayments: "Pagamentos privados",
        balances: "Saldos",
        customers: "Clientes",
        products: "Produtos",
        swaps: "Swaps", crossChainSwaps: "Entre redes",
        liquidity: "Liquidez",
        blindpay: "Fiat",
        developers: "Chaves de API",
        webhook: "Webhooks",
        logs: "Logs",
        weblogs: "Logs webhook",
        activityLog: "Registo de atividade",
        settings: "Organização",
        account: "Conta",
        activity: "Atividade",
        support: "Suporte",
        inbox: "Caixa",
        users: "Usuários",
        adminOverview: "Visão geral",
        adminPayments: "Pagamentos",
        adminSwaps: "Swaps",
        adminFiat: "Fiat",
        adminCustomers: "Clientes",
        adminProducts: "Produtos",
        adminConsumers: "Organizações"
      },
      collapse: "Recolher barra lateral"
    },
    org: {
      heading: "Organizações",
      owned: "Suas organizações",
      invited: "Compartilhadas com você",
      locked: "Bloqueada: faça upgrade do plano",
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
    common: { back: "Voltar", notPayable: "Já não pode ser pago", sellNeeds: "Precisa de um preço e estar à venda", rowActions: "Ações de {name}", copyId: "Copiar ID", copyUrl: "Copiar URL", copyAccount: "Copiar conta", openNewTab: "Abrir em outra aba", noTxYet: "Ainda sem transação", paidNoDelete: "Um pagamento concluído não pode ser excluído", account: "Conta", orgWallet: "Carteira da organização", paymentsHere: "Pagamentos na lista", lastPayment: "Último pagamento", copyValue: "Copiar {value}", notFound: "Não está nesta organização ou ambiente.", open: "Abrir",
      actions: "Ações",
      details: "Detalhes",
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
      assetAny: "Qualquer",
      continueOp: "Continuar",
      steps: { label: "Etapas", of: "Etapa {n} de {total}", next: "Próximo", back: "Voltar" },
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
        atLimitOne: "Seu plano {plan} permite uma organização. Faça upgrade do seu plano para criar mais.", atLimit: "Seu plano {plan} permite até {limit} organizações. Faça upgrade do seu plano para criar mais.",
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
        scopeResources: { payments: "Pagamentos", swaps: "Swaps", liquidity: "Liquidez", webhooks: "Webhooks", products: "Produtos", customers: "Clientes", kyc: "KYC", onramp: "On-ramp", offramp: "Off-ramp", activity: "Atividade" },
        adminHint: "As chaves de admin têm acesso total a todos os recursos.",
        perms: {
          read: "Leitura",
          write: "Escrita"
        },
        create: "Criar chave",
        save: "Salvar alterações",
        steps: { details: "Dados", scopes: "Permissões" },
      },
      reveal: {
        eyebrow: "Chave de API criada",
        title: "Salve sua chave secreta",
        body: "Esta é a única vez que você verá este segredo. Copie-o agora e guarde-o em um lugar seguro. Por segurança, você não poderá vê-lo novamente.",
        idLabel: "ID da chave",
        saved: "Salvei minha chave"
      }
    },
    overview: {
      hub: { partDone: "Concluídos", partPending: "Pendentes", partNotDone: "Não concluídos", partDelivered: "Entregues", tipTotal: "Total", tipSettledUsd: "Liquidado (USD)", doneShare: "{pct} concluídos", deliveredShare: "{pct} entregues", avgTicket: "Ticket médio {amount}", settledAmount: "{amount} liquidados", feesAmount: "{amount} em comissões", planStatus: { active: "Ativa", paused: "Pausada", past_due: "Pagamento pendente", suspended: "Suspensa" }, legendDeliveriesFailed: "Com falha", expiredOne: "1 expirado", expiredN: "{n} expirados", legendExpired: "Expirados", quick: "Atalhos", usdUnpricedOne: "1 pagamento num ativo sem preço em USD não é contado", usdUnpricedN: "{n} pagamentos em ativos sem preço em USD não são contados", webhooksFailedOne: "1 com falha", paymentsFailedOne: "1 com falha", paymentsFailedN: "{n} com falha", doneOne: "1 concluído", payersOne: "1 pagador", sumSwaps: "Swaps", sumLiquidity: "Liquidez", payersN: "{n} pagadores", doneN: "{n} concluídos", newSwap: "Swap", crumb: "Visão geral", active: "Ativa", since: "Desde {date}", settled: "Volume liquidado", noVolume: "Ainda não há pagamentos liquidados", rate: "Tarifa", plan: "Plano", orgId: "ID da organização", createLink: "Criar link de pagamento", docs: "Documentação", designs: "Designs de checkout", kpiTotal: "Pagamentos totais", kpiSucceeded: "Concluídos", kpiFailed: "Falhos", kpiRate: "Taxa de sucesso", activity: "Atividade", period7: "7 dias", period30: "30 dias", periods: { today: "Hoje", week: "Semana", month: "Mês", year: "Ano" }, noPeriodTx: "Nenhum pagamento liquidado neste período.", sumVolume: "Volume liquidado", sumCount: "Pagamentos", sumPayers: "Pagadores", sumWebhooks: "Entregas de webhooks", sumWebhooksFailed: "{n} com falha", growthVs: "{pct} em relação aos {n} dias anteriores", legendVolume: "Volume (USD)", legendCount: "Pagamentos", legendDone: "Concluídos", goTo: "Ir para {view}", periodLabel: "Período", chartLabel: "Pagamentos criados e volume liquidado por dia nos últimos {n} dias.", transactions: "Últimos pagamentos liquidados", viewAll: "Ver todos os pagamentos", thId: "Pagamento", thDate: "Data", thAmount: "Valor", thNetwork: "Rede", thTo: "Pago para", thStatus: "Status", chartPeriods: { day: "Diário", week: "Semanal", month: "Mensal", year: "Anual" }, chartLabels: { day: "Pagamentos criados e volume liquidado por dia nos últimos 30 dias.", week: "Pagamentos criados e volume liquidado por semana nas últimas 12 semanas.", month: "Pagamentos criados e volume liquidado por mês nos últimos 12 meses.", year: "Pagamentos criados e volume liquidado por ano nos últimos 5 anos." }, sumFailed: "Falhos", sumGrowth: "Crescimento", growthTitle: "Em relação ao período anterior", growthVolume: "Volume", growthCount: "Pagamentos", prevOrg: "Organização anterior", nextOrg: "Próxima organização", created: "Criada em {date}", fee: "Taxa", txTitle: "Transações", thFrom: "Pago por", thMemo: "Memo", onlySettled: "Só liquidados", network: "Rede", allNetworks: "Todas as redes", wallet: "Carteira", applyFilters: "Filtrar a lista", filtersLabel: "Filtrar transações", noTx: "Nenhum pagamento neste período.", noMatch: "Nenhum pagamento corresponde a estes filtros.", shown: "{n} de {total} pagamentos", rowMenu: "Ações do pagamento {id}", copyId: "Copiar ID", explorer: "Ver no explorador", openPayments: "Abrir em Pagamentos", status: { SUCCEEDED: "Liquidado", FAILED: "Falhou", CANCELLED: "Cancelado", EXPIRED: "Expirado", PENDING: "Pendente", SUBMITTED: "Confirmando" }, searchPlaceholder: "Buscar por ID, endereço, valor ou ativo…", groups: { settled: "Liquidados", open: "Em andamento", failed: "Falhos" } },
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
      sub: "{n} pagamentos · liquidados instantaneamente on-chain",
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
        desc: "Os pagamentos liquidam instantaneamente na Stellar, Solana ou Monad, sem período de retenção.",
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
      eventLabels: { PAYMENT_INTENT_CREATED: "Pagamento criado", PAYMENT_INTENT_UPDATED: "Pagamento atualizado", PAYMENT_INTENT_SUCCEEDED: "Pagamento concluído", PAYMENT_INTENT_FAILED: "Pagamento falhou", PAYMENT_INTENT_CANCELLED: "Pagamento cancelado", PAYMENT_INTENT_DELETED: "Pagamento eliminado", ZK_PAYMENT_SUCCEEDED: "Pagamento privado concluído" },
      active: "Ativo", inactive: "Desativado",
      reveal: "Mostrar segredo", secret: "Segredo de assinatura", secretNote: "Mostrado uma vez. Guarde-o em segurança.",
      rotate: "Rodar segredo", ping: "Enviar teste", pingOk: "Evento de teste entregue", pingFail: "Falhou o evento de teste",
      deliveries: "Entregas recentes", noDeliveries: "Ainda não há entregas.", redeliver: "Reenviar",
      enable: "Ativar", disable: "Desativar",
      delete: "Eliminar", deleteConfirm: "Eliminar", confirmDelete: "Não é possível anular.",
      customerSet: "Valor livre", allEvents: "Todos os eventos", events: "Eventos",
      received: "Recebido", pending: "Pendente",
      custDetail: { noAccount: "Adicione o endereço da carteira do cliente para ver os pagamentos que ela fez.", title: "Cliente", edit: "Editar", save: "Guardar alterações", alias: "Alias", note: "Nota", account: "Endereço da carteira", accountPlaceholder: "Endereço na Stellar, Solana ou Monad", payments: "Pagamentos", onChain: "On-chain", noPayments: "Ainda não há pagamentos.", wallets: "Carteiras", addWallet: "Adicionar carteira", network: "Rede", walletLabel: "Nome", walletLabelPlaceholder: "Phantom, tesouraria…", removeWallet: "Remover carteira", invalidAddress: "Não é um endereço de {network}." },
    },
    filters: { label: "Filtrar a lista", status: "Status", network: "Rede", kind: "Tipo", allStatuses: "Todos", allNetworks: "Todas as redes", allKinds: "Todos os tipos", date: "Data", dates: { any: "Qualquer data", today: "Hoje", "7d": "Últimos 7 dias", "30d": "Últimos 30 dias", "90d": "Últimos 90 dias" }, shown: "{n} de {total}", clear: "Limpar filtros", noMatch: "Nada corresponde a estes filtros." },
    tokens: { custom: "Outro token…", ticker: "Símbolo do token", address: { solana: "Mint do token", monad: "Contrato do token" } },
    paylinks: {
      design: { label: "Design do checkout", hint: "Como o checkout hospedado deste link aparece. Você pode mudar quando quiser.", preview: "Prévia", saved: "Design do checkout atualizado", saveError: "Não foi possível mudar o design do checkout", selected: "Selecionado" },
      title: "Links de pagamento",
      sub: "{n} links · Stellar, Solana e Monad",
      create: "Criar link de pagamento",
      searchPlaceholder: "Buscar por ID, endereço, memo ou valor…",
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
        desc: "Um link e um QR que seu cliente paga da carteira dele, em Stellar, Solana ou Monad.",
        kind: "Tipo", kindPay: "Link de pagamento", kindTx: "Transação",
        destination: "Destino", destinationHint: "Conta Stellar que recebe os fundos (G…).",
        source: "Origem", sourceHint: "Conta Stellar do pagador (G…).",
        amount: "Valor", amountHint: "Deixe vazio para o pagador escolher (doações).",
        asset: "Ativo", assetIssuer: "Emissor do ativo", assetIssuerHint: "Obrigatório para ativos não nativos (G…).",
        memo: "Memo", memoHint: "MEMO_ID numérico, gerado automaticamente se vazio.",
        message: "Mensagem", messageHint: "Mostrado ao pagador na carteira (≤ 300 caracteres).",
        chain: "Rede", amountMonad: "Obrigatório na Monad: o valor exato é o que identifica o pagamento.", memoHintOther: "Um número que impede que uma nova tentativa crie um segundo link; gerado se ficar vazio.", submitting: "Criando…",
        mainnet: "Mainnet", more: "Mais opções",
        merchantFee: { title: "Taxa do comerciante", pct: "Porcentagem", fixed: "Valor fixo", wallet: "Wallet que recebe a taxa", paidBy: "Quem paga", recipient: "Descontada do valor", payer: "Paga pelo pagador, além do valor", hint: "A sua própria taxa, no mesmo pagamento e separada da comissão da Cosmos Pay; precisa de um valor. Na Stellar o checkout pede ao pagador a conta dele, na Solana o pagamento é uma transação Solana Pay e na Monad o endereço de depósito a reparte.", needsAmount: "A taxa do comerciante precisa de um valor.", sameWallet: "A taxa vai para outra wallet que não a do pagamento.", pctMax: "No máximo 10%." },
        submit: "Criar link",
        steps: { amount: "Valor", destination: "Destino", fee: "Taxa", design: "Design" },
      },
      detail: { live: { unconfirmed: "Ainda não confirmado na rede", sentUnconfirmed: "Envio não confirmado", sentReportedNow: "A página do pagador informa o pagamento enviado; a rede ainda não o confirmou", sentUnconfirmedNow: "A página do pagador informou um pagamento que a rede não confirmou", wallet: "Carteira aberta", walletBack: "Fechou a carteira sem pagar", walletNow: "O pagador está com a carteira aberta agora", walletBackNow: "O pagador fechou a carteira sem pagar", title: "Acompanhamento", created: "Link criado", page: "Pagador na página de pagamento", processing: "Pagamento enviado, confirmando", paid: "Pago", now: "Agora", onPageNow: "O pagador está na página de pagamento agora", lastSeen: "O pagador abriu a página de pagamento pela última vez em {time}", waiting: "Aguardando o pagador abrir o link", processingNow: "O pagamento foi enviado e a rede está confirmando", paidNow: "Pagamento recebido", ended: "Este link não pode mais ser pago: {status}" }, check: { label: "Pago de outra carteira? Verifique a transação", placeholder: "Hash da transação", submit: "Verificar transação", ok: "A transação paga este link.", bad: "Essa transação não paga este link." },
        checkout: "Página de pagamento", openCheckout: "Abrir página de pagamento",
        eyebrow: "Link de pagamento", title: "Link de pagamento pronto",
        scan: "Digitalize para pagar", downloadQr: "Descarregar QR",
        uri: "URI SEP-7", xdr: "XDR não assinado",
        uriLabels: { stellar: "URI SEP-7", solana: "URI Solana Pay", monad: "URI EIP-681" },
        openWallet: "Abrir na carteira", copyLink: "Copiar link", copyUri: "Copiar URI",
        fields: { id: "ID", status: "Estado", kind: "Tipo", network: "Rede", destination: "Destino", source: "Origem", amount: "Valor", asset: "Ativo", memo: "Memo", message: "Mensagem", txHash: "ID da transação", created: "Criado", merchantFee: "Taxa do comerciante" },
        delete: "Eliminar",
        deleteTitle: "Eliminar link de pagamento", deleteBody: "«{id}» será removido. Não é possível anular.", deleteConfirm: "Eliminar link",
      },
      status: { PENDING: "Pendente", SUBMITTED: "Enviado", SUCCEEDED: "Concluído", FAILED: "Falhou", CANCELLED: "Cancelado", EXPIRED: "Expirado" },
    },
    balances: {
      title: "Saldos",
      total: "Liquidações",
      across: "{assets} ativos em {networks} redes",
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
      walletsCount: "{n} carteiras",
      tableHead: {
        name: "Nome",
        email: "E-mail",
        spend: "Gasto total",
        payments: "Pagamentos",
        since: "Desde",
        wallets: "Carteiras"
      },
      empty: "Nenhum cliente encontrado.",
      modal: {
        eyebrow: "Cliente",
        title: "Adicionar cliente",
        desc: "Crie um cliente para acompanhar pagamentos e saldos.",
        name: "Nome",
        email: "E-mail",
        add: "Adicionar cliente",
        wallets: "Carteiras",
        walletsHint: "As carteiras de onde este cliente paga, em qualquer rede. Você também pode adicioná-las depois.",
        addAnother: "Adicionar outra carteira"
      },
      figures: { customers: "Clientes", withWallet: "Com carteira", payments: "Pagamentos", succeeded: "{n} concluídos", recent: "Novos (30 dias)" },
      deleteTitle: "Excluir o cliente?",
      deleteBody: "{name} e suas carteiras são excluídos. Os pagamentos são mantidos.",
      deleteError: "Não foi possível excluir o cliente.",
      removeWalletTitle: "Remover a carteira?",
      removeWalletBody: "{account} é removida de {name}. Os pagamentos são mantidos.",
    },
    products: { searchPlaceholder: "Pesquisar por nome ou preço…", detail: { title: "Produto", save: "Salvar alterações", active: "À venda", activeHint: "Um produto inativo é mantido, mas não pode ser vendido.", saveError: "Não foi possível salvar o produto." },
      title: "Produtos e links",
      sub: "Planos recorrentes e links de pagamento",
      add: "Novo produto",
      tableHead: {
        name: "Nome",
        price: "Preço",
        type: "Tipo",
        status: "Status",
        created: "Criado",
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
      },
      figures: { products: "Produtos", priced: "Com preço" },
      edit: "Editar",
      activate: "Colocar à venda",
      deactivate: "Tirar da venda",
      activated: "Produto à venda",
      deactivated: "Produto tirado da venda",
      deleteTitle: "Excluir o produto?",
      deleteBody: "{name} é excluído. Os links de pagamento já criados continuam funcionando.",
      deleteError: "Não foi possível excluir o produto.",
    },
    apikeys: { searchPlaceholder: "Pesquisar por nome ou ID da chave…", ownerPlan: "Isso é definido pelo plano do proprietário da organização.", liveLocked: "Seu plano não inclui chaves de produção.",
      readOnly: "Você tem acesso somente leitura. Apenas owners e admins podem criar ou revogar chaves de API.",
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
      none: "Nenhuma",
      revokeTitle: "Revogar chave de API",
      revokeBody: "«{name}» será revogada permanentemente e qualquer app que a use deixará de funcionar. Esta ação não pode ser desfeita.",
      revokeConfirm: "Revogar chave",
      usage: "{used} / {limit}",
      limitReached: "Você atingiu o limite de chaves do seu plano. Faça upgrade para adicionar mais.",
      figures: { keys: "Chaves neste ambiente", plan: "Uso do plano" },
      allRoles: "Todas as funções",
    },
    webhooks: { searchPlaceholder: "Pesquisar por URL ou evento…", resent: "Entrega reenviada", noFailed: "Nenhuma entrega com falha.", only: { all: "Todas", failed: "Com falha" }, eventId: "ID do evento", error: "Erro", attempts: "Tentativas", delivery: "Entrega", save: "Salvar alterações", editTitle: "Editar endpoint", edit: "Editar endpoint", eventsOne: "1 evento",
      title: "Webhooks",
      sub: "Eventos em tempo real quando os pagamentos liquidam na Stellar, Solana ou Monad",
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
        when: "Quando",
        created: "Criado",
      },
      modal: {
        eyebrow: "Webhook",
        title: "Adicionar endpoint",
        desc: "Faremos POST dos payloads de eventos para esta URL.",
        urlLabel: "URL do endpoint",
        eventsLabel: "Eventos para enviar",
        add: "Adicionar endpoint"
      },
      deleteTitle: "Excluir o endpoint?",
      deleteBody: "{url} deixa de receber eventos e suas entregas são excluídas.",
      rotateTitle: "Rotacionar o segredo de assinatura?",
      rotateBody: "{url} recebe um segredo novo na hora; eventos assinados com o anterior deixam de ser verificados até você atualizá-lo.",
      urlInvalid: "Informe um endereço web que comece com https://.",
      urlRefused: "Essa URL não pode ser usada: precisa ser um endereço público que resolva (não localhost nem uma rede privada).",
      saveError: "Não foi possível salvar o endpoint.",
    },
    activityLog: {
      sub: "O que a wallet e este painel reportaram sobre si mesmos, incluindo o que nunca chegou a ser uma chamada à API",
      searchPlaceholder: "Procurar eventos…",
      empty: "Ainda não há atividade reportada.",
      context: "Contexto",
      props: "Detalhes",
      topErrors: "Erros mais frequentes",
      cards: { total: "Eventos", errors: "Erros", sessions: "Sessões", devices: "Dispositivos" },
      sources: { all: "Todas as fontes", wallet: "Wallet", dashboard: "Painel", server: "Servidor", sdk: "SDK" },
      levels: { all: "Todos os níveis", error: "Erro", warn: "Aviso", info: "Info", debug: "Depuração" },
      tableHead: { level: "Nível", source: "Fonte", event: "Evento", detail: "Detalhe", timestamp: "Data e hora", count: "Contagem" },
      copySession: "Copiar sessão",
      filterBy: "Buscar este erro no registro",
      duration: "Duração",
      network: "Rede",
      session: "Sessão",
      received: "Recebido",
      category: "Categoria",
      app: "Versão do app",
      platform: "Plataforma",
    },
    logs: {
      title: "Logs da API",
      sub: "Cada requisição à API da Cosmos Pay (clique em uma linha para inspecionar)",
      searchPlaceholder: "Buscar por endpoint…",
      tableHead: {
        method: "Método",
        endpoint: "Endpoint",
        status: "Status",
        time: "Tempo",
        timestamp: "Carimbo de data/hora",
        event: "Evento",
      },
      reqHeaders: "Cabeçalhos da requisição",
      params: "Parâmetros de query / corpo",
      response: "Resposta",
      meta: "Meta",
      figures: { requests: "Solicitações", errors: "Erros", latency: "Latência média", deliveries: "Entregas", failed: "Com falha", endpoints: "Endpoints" },
      classes: { ok: "Bem-sucedidas", client: "Erros do cliente (4xx)", server: "Erros do servidor (5xx)" },
      delivery: { SUCCEEDED: "Entregue", FAILED: "Com falha", PENDING: "Pendente" },
      allMethods: "Todos os métodos",
      copyPath: "Copiar caminho",
      attempts: "Tentativas",
      error: "Erro",
      eventId: "ID do evento",
      userAgent: "Agente do usuário",
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
        changeSub: "Mude seu plano. É uma simulação: nada é cobrado.",
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
        swapFee: "Comissão por swap",
        mainnet: "Pagamentos ao vivo",
        settle: "Liquidação",
        apiAccess: "Acesso à API",
        apiLevels: { notifications: "Notificações de pagamento", partial: "API parcial", full: "API completa" }
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
      },
      figures: { members: "Membros", seats: "{n} de {max} assentos", seatsFree: "Assentos ilimitados", invites: "Convites pendentes", invitesSub: "Valem 3 dias", wallets: "Carteiras", networksOne: "Em 1 rede", networksN: "Em {n} redes", apiKeys: "Chaves de API", keysLimit: "Limite: {max}", keysFree: "Sem limite" },
    },
    pagination: {
      rows: "Linhas por página",
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
      localhost: "localhost",
      searchPlaceholder: "Buscar notificações…",
      nothingToOpen: "Nada para abrir",
      copyIp: "Copiar IP",
      figures: { total: "Notificações", week: "Últimos 7 dias", signIns: "Logins", changes: "Alterações" },
      message: "Mensagem",
    },
    support: {
      searchPlaceholder: "Pesquisar tickets…",
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
      statuses: { open: "Aberto", pending: "Pendente", resolved: "Resolvido", closed: "Fechado" },
      inboxSearch: "Buscar por assunto, cliente ou mensagem…",
      tableHead: { subject: "Assunto", priority: "Prioridade", status: "Status", last: "Última mensagem", updated: "Atualizado" },
      unread: "{n} não lidas",
      moveTo: "Marcar como {status}",
    },
    admin: { viewList: "Ver lista",
      loading: "Carregando…",
      loadError: "Não foi possível carregar os dados.",
      empty: "Nada por aqui ainda.",
      orgFilter: "Organização",
      clearFilter: "Limpar filtro",
      filters: { all: "Todos", PENDING: "Pendente", SUBMITTED: "Enviado", SUCCEEDED: "Concluído", FAILED: "Falhou" },
      overview: {
        title: "Visão geral da plataforma", sub: "Atividade global em todas as organizações",
        cards: { consumers: "Organizações", customers: "Clientes", products: "Produtos", webhooks: "Endpoints de webhook" },
        payments: "Intenções de pagamento", swaps: "Swaps", chainSwaps: "Swaps na Solana e Monad", crossChainSwaps: "Swaps entre redes", fiat: "Fiat (KYC/KYB)",
        receivers: "Recebedores", payins: "Payins", payouts: "Payouts",
        volume: "Volume liquidado",
        volHead: { asset: "Ativo", amount: "Valor", count: "Quantidade" },
      },
      payments: { title: "Intenções de pagamento", sub: "Todas as intenções de pagamento das organizações", searchPlaceholder: "Buscar por ID, destino, organização…", empty: "Nenhuma intenção de pagamento.", tableHead: { id: "ID", org: "Organização", destination: "Destino", amount: "Valor", status: "Status", created: "Criado" }, one: "Pagamento" },
      swaps: { venues: { stellar: "Stellar", solana: "Solana · Jupiter", monad: "Monad · Kuru Flow", crossChain: "Entre redes" }, crossStatus: { AWAITING_DEPOSIT: "Aguardando depósito", PROCESSING: "Processando", REFUNDED: "Reembolsado" }, title: "Swaps", sub: "Todos os swaps das organizações", searchPlaceholder: "Buscar por ID, conta, organização…", empty: "Nenhum swap.", tableHead: { id: "Swap", org: "Organização", route: "Enviado → recebido", status: "Status", created: "Criado" }, one: "Swap", from: "De", to: "Para", deposit: "Endereço de depósito" },
      fiat: {
        title: "Fiat", sub: "Recebedores, payins e payouts de todas as organizações",
        tabs: { receivers: "Recebedores", payins: "Payins", payouts: "Payouts" },
        searchReceivers: "Buscar recebedores…", searchPayins: "Buscar payins…", searchPayouts: "Buscar payouts…",
        statusUnknown: "Desconhecido",
        disabled: "Desativada", disable: "Desativar", enable: "Ativar",
        accountDisabled: "Conta fiat desativada", accountEnabled: "Conta fiat ativada",
        accessError: "Não foi possível atualizar a conta fiat.",
        approve: "Aprovar", approved: "Aprovado",
        termsSent: "Termos de serviço enviados para {email}",
        approveError: "Não foi possível aprovar o recebedor.",
        resendVerification: "Reenviar e-mail de verificação",
        verificationSent: "E-mail de verificação enviado para {email}",
        resendError: "Não foi possível reenviar o e-mail de verificação.",
        sending: "Enviando…",
        receiverHead: { name: "Nome", org: "Organização", type: "Tipo", status: "Status do KYC", created: "Criado" },
        payinHead: { id: "Payin", org: "Organização", asset: "Ativo", method: "Método", amount: "Enviado → recebido", status: "Status", created: "Criado" },
        payoutHead: { id: "Payout", org: "Organização", asset: "Ativo", rail: "Trilho", amount: "Enviado → recebido", status: "Status", created: "Criado" },
        receiverOne: "Recebedor",
        payinOne: "Payin",
        payoutOne: "Payout",
        email: "E-mail",
        providerId: "ID do provedor",
        inReview: "Em análise",
      },
      customers: { title: "Clientes", sub: "Todos os clientes das organizações", searchPlaceholder: "Buscar clientes…", empty: "Nenhum cliente.", tableHead: { name: "Nome", org: "Organização", email: "Email", account: "Conta", created: "Criado" }, one: "Cliente", figures: { withWallet: "Com carteira", withEmail: "Com e-mail" } },
      products: { title: "Produtos", sub: "Todos os produtos das organizações", searchPlaceholder: "Buscar produtos…", empty: "Nenhum produto.", tableHead: { name: "Nome", org: "Organização", price: "Preço", kind: "Tipo", created: "Criado" }, one: "Produto" },
      consumers: { title: "Organizações", sub: "Cada consumidor da API e sua atividade", searchPlaceholder: "Buscar organizações…", empty: "Nenhuma organização.", account: "Conta", moreOrgs: "+{n} mais", note: "Os totais são por conta de desenvolvedor (uma conta pode ter várias organizações).", tableHead: { org: "Organização", payments: "Pagamentos", swaps: "Swaps", products: "Produtos", customers: "Clientes", receivers: "Recebedores", payins: "Payins", payouts: "Payouts", webhooks: "Webhooks", created: "Criado" }, copyConsumer: "Copiar usuário do gateway", one: "Organização", figures: { orgs: "Organizações", active: "Com atividade" }, gatewayUser: "Usuário do gateway" },
      filterByOrg: "Ver só esta organização",
      copyEmail: "Copiar e-mail",
      copyProviderId: "Copiar ID do provedor",
      copyTx: "Copiar transação",
      copyDestination: "Copiar destino",
      copyDeposit: "Copiar endereço de depósito",
      figures: { total: "Total", done: "Concluídos", open: "Em andamento", failed: "Com falha", inOrgs: "Em {n} organizações", inOrgsOne: "Em 1 organização" },
      network: "Rede",
      transaction: "Transação",
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
        photoHint: "PNG, JPG ou WebP. Quadrada fica melhor.", saved: "Perfil atualizado", saveError: "Não foi possível atualizar seu perfil.",
        photoTooLarge: "Essa imagem é muito grande. Escolha uma com menos de 8 MB.", photoInvalid: "Esse arquivo não é uma imagem compatível." },
      session: { title: "Sessão", desc: "Saia do painel da Cosmos Pay neste dispositivo.", signOut: "Sair" },
    },
    users: {
      planStatus: "Status do plano",
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
      empty: "Nenhum usuário encontrado.",
      figures: { accounts: "Contas", staff: "Equipe", paid: "Planos pagos", attention: "Planos a revisar" },
      allRoles: "Todas as funções",
      allPlans: "Todos os planos",
      copyEmail: "Copiar e-mail",
      one: "Conta",
      since: "Conta desde",
      lastSeen: "Última atividade",
    },
    orgs: {
      permissionsLabel: "Permissões",
      permResource: "Permissão",
      resources: { apiKeysTest: "Chaves de API de teste", apiKeysLive: "Chaves de API de produção", webhooks: "Webhooks", products: "Produtos", customers: "Clientes", payments: "Links de pagamento", wallets: "Carteiras" },
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
      loadError: "Não foi possível carregar os membros.",
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
      empty: "Ainda não há membros.",
      revokeInviteTitle: "Revogar o convite?",
      revokeInviteBody: "{email} não poderá mais entrar em {org} com este convite.",
      steps: { who: "E-mail e função", permissions: "Permissões" },
      searchPlaceholder: "Buscar por nome ou e-mail…",
      tableHead: { person: "Pessoa", role: "Função", permissions: "Permissões", status: "Status", since: "Desde" },
      memberStatus: { active: "Ativo", invited: "Convidado" },
      allRoles: "Todas as funções",
      permsAll: "Todas",
      permsNone: "Somente leitura",
      permsOne: "1 permissão",
      permsN: "{n} permissões",
      memberDetail: "Membro",
      inviteDetail: "Convite",
      sentOn: "Enviado",
      expiresOn: "Expira",
      copyEmail: "Copiar e-mail",
      ownerFixed: "O proprietário não pode ser editado nem removido",
      inviteFixed: "Um convite se altera revogando-o e convidando de novo",
      alreadyMember: "Essa pessoa já é membro desta organização.",
      alreadyInvited: "Já existe um convite pendente para esse e-mail.",
      inviteConflict: "Não é possível convidar: já está na equipe ou convidada, ou não há assentos livres.",
      mailUnavailable: "O e-mail não está configurado neste servidor, então não é possível enviar convites.",
      seatsFull: "Todos os assentos do plano estão ocupados (membros e convites pendentes). Libere um ou faça upgrade do plano para convidar alguém.",
    },
    swaps: {
      title: "Swaps",
      sub: "{n} swaps · em uma rede ou entre Stellar, Solana e Monad",
      create: "Novo swap",
      readOnly: "Você tem acesso somente leitura aos swaps nesta organização.",
      listTitle: "Seus swaps",
      widget: { title: "Swap", pay: "Você paga", receive: "Você recebe", selectToken: "Escolher token", changeToken: "{token} na {chain}, trocar o token", flip: "Inverter o que você paga e o que recebe", pickPay: "Pagar com", pickReceive: "Receber", details: "Detalhes da cotação", invertRate: "Inverter a taxa", eta: "Tempo estimado", seconds: "{n} s", slippage: "Tolerância de slippage", slippageAuto: "Auto", slippageHint: "Abaixo do mínimo que ela define, o swap não é feito (um entre redes é reembolsado).", settings: "Ajustes do swap", route: "Rota", venueNear: "NEAR Intents", venueUsdt0: "LayerZero (USDT0)", ctaBridge: "Enviar para {chain}", lzFee: "Taxa da LayerZero", dustNote: "Fica na Stellar", accountLabel: "Sua conta na {chain}", accountHint: "Ela paga e assina o swap.", refundLabel: "Endereço de reembolso na {chain}", recipientLabel: "Receber na {chain}", another: "Enviar para outra conta", ctaSelect: "Escolha um token", ctaSame: "Escolha dois tokens diferentes", ctaProduction: "Disponível em Production", ctaUnsupported: "Estes tokens não podem ser trocados entre si", ctaAmount: "Informe um valor", ctaAmountBad: "Confira o valor", ctaAccount: "Informe sua conta na {chain}", ctaRefund: "Informe o endereço de reembolso na {chain}", ctaRecipient: "Informe o endereço na {chain}", ctaMemo: "Confira o memo", ctaQuoting: "Cotando…", ctaRetry: "Cotar de novo", ctaProductionOpen: "Abrir um swap exige Production", ctaOpen: "Abrir swap", ctaSwap: "Swap na {venue}", ctaBusy: "Preparando…" },
      picker: { search: "Busque um token, rede ou endereço", network: "Rede", allNetworks: "Todas as redes", count: "{n} tokens", useToken: "Usar {token}", none: "Nenhum token corresponde. Cole o endereço de um token na Stellar, Solana ou Monad para usá-lo.", more: "{n} a mais: busque para filtrar a lista." },
      groups: { open: "Em andamento", succeeded: "Concluídos", refunded: "Reembolsados", failed: "Falhos", expired: "Expirados" },
      typeLabel: "Tipo",
      types: { all: "Todos os tipos", same: "Em uma rede", cross: "Entre redes", usdt0: "Ponte USDT0" },
      form: { desc: "Escolha o que você envia e o que recebe. Em uma rede, o mercado dela negocia; entre redes, a NEAR Intents liquida. Nada passa pela Cosmos Pay.", from: "Você envia", to: "Você recebe", chain: "Rede", asset: "Ativo", amountHint: "Quanto do ativo você envia.", flip: "Trocar o que você envia e o que recebe", routeLine: "Rota: {route}", route: "Rota", venueCross: "NEAR Intents" },
      searchPlaceholder: "Buscar por ID, endereço ou ativo…",
      filters: { all: "Todos", PENDING: "Pendente", SUBMITTED: "Enviado", SUCCEEDED: "Concluído", FAILED: "Falhou", EXPIRED: "Expirado" },
      status: { PENDING: "Pendente", SUBMITTED: "Enviado", SUCCEEDED: "Concluído", FAILED: "Falhou", EXPIRED: "Expirado", DELIVERED: "Entregue" },
      tableHead: { id: "Swap", route: "Enviado → recebido", status: "Status", created: "Criado", chains: "Redes" },
      empty: "Ainda não há swaps. Crie um para obter uma transação não assinada para assinar.",
      loading: "Carregando swaps…",
      loadError: "Não foi possível carregar os swaps.",
      createError: "Não foi possível criar o swap.",
      quoteError: "Não foi possível cotar o swap.",
      network: { dev: "Testnet", prod: "Rede pública" },
      chainLabel: "Rede",
      chains: { stellar: "Stellar", solana: "Solana", monad: "Monad" },
      venues: { stellar: "DEX da Stellar", solana: "Jupiter", monad: "Kuru Flow" },
      chainModal: {
        desc: "Troque dois ativos na {chain} pelo {venue}, que percorre todas as fontes de liquidez da rede. Cote e depois assine a transação na carteira.",
        sourceHint: { solana: "Carteira Solana que assina, paga e recebe (base58).", monad: "Carteira Monad que assina, paga e recebe (0x…)." },
        sourceAsset: "Ativo a enviar", sourceAssetHint: "{native}, ou o endereço do mint / contrato do token.",
        destAssetHint: "{native}, ou o endereço do mint / contrato do token.",
        feeNote: "A comissão é a taxa do plano da sua organização e sai da saída.",
      },
      chainDetail: {
        title: "Swap pronto para assinar",
        transaction: "Transação a assinar", approval: "Aprovação a enviar antes",
        approvalNote: "O allowance da carteira para este token é insuficiente: envie e confirme esta chamada approve antes de assinar o swap.",
        provider: "Montado por", expires: "Assinar antes de",
        submitDesc: "Cole a transação assinada devolvida pela carteira (Solana: base64; Monad: transação bruta 0x).",
        submitPlaceholder: "Transação assinada…",
      },
      modal: {
        eyebrow: "Swap", title: "Novo swap",
        desc: "Troque um ativo da Stellar por outro com um pagamento por rota. Cote e depois assine a transação.",
        source: "Conta de origem", sourceHint: "Conta Stellar que envia o swap (G…).",
        sourceAsset: "Ativo a enviar", sourceIssuer: "Emissor de origem", sourceAssetHint: "XLM, ou um ativo que esta conta tenha.",
        amount: "Quantia a enviar", amountHint: "Quantidade do ativo de origem a trocar.",
        destAsset: "Ativo de destino", destAssetHint: "Código do ativo a receber (ex. USDC).",
        destIssuer: "Emissor de destino", destIssuerHint: "Obrigatório para ativos não nativos (G…).",
        slippage: "Slippage (bps)", slippageHint: "Slippage máximo em pontos-base (opcional, ex. 50).",
        destination: "Conta de destino", destinationHint: "Opcional. Recebe o resultado; deixe vazia para receber na conta de origem. Ela precisa confiar no ativo.", memo: "Memo", memoHint: "Opcional. Um número (MEMO_ID) registrado na rede para a sua conciliação.",
        getQuote: "Cotar", quoting: "Cotando…",
        quoteTitle: "Cotação",
        swapped: "Trocado após a comissão",
        estimated: "Recebido (estimado)", minimum: "Mínimo recebido",
        fee: "Comissão", bps: "bps",
        feeNote: "A comissão é a taxa do plano da sua organização, aplicada automaticamente.",
        create: "Criar swap", creating: "Criando…",
      },
      usdt0: {
        title: "USDT0 para {chain}",
        destination: "Rede",
        recipient: "Destinatário",
        arrives: "Chega",
        fee: "Taxa da LayerZero",
        destTx: "Transação de destino",
        scan: "Ver no LayerZero Scan",
        travelling: "Enviado da Stellar. A LayerZero está entregando em {chain}.",
        delivered: "Entregue em {chain}.",
      },
      detail: {
        eyebrow: "Swap", title: "Swap pronto",
        scan: "Escaneie para assinar", downloadQr: "Baixar QR",
        trustlineNote: "Esta transação também adiciona a trustline de {asset} à conta para que ela possa recebê-lo. Isso deixa 0,5 XLM em reserva.",
        uri: "URI SEP-7", xdr: "XDR não assinado",
        openWallet: "Abrir na carteira", viewExplorer: "Ver no explorador",
        fields: { id: "ID", status: "Status", network: "Rede", source: "Origem", destination: "Destino", sent: "Enviado", received: "Recebido (est.)", minimum: "Mínimo", fee: "Comissão", memo: "Memo", commissionMemo: "Memo da comissão", txHash: "ID da transação", created: "Criado" },
        submitTitle: "Enviar transação assinada",
        submitDesc: "Cole o XDR assinado devolvido pela carteira para transmitir o swap.",
        submitPlaceholder: "XDR da transação assinada…",
        submit: "Enviar", submitting: "Enviando…",
        submitted: "Swap enviado",
        submitFailed: "Não foi possível enviar o swap.",
        resultCodes: "Códigos de resultado",
      },
    },
    crossChain: {
      title: "Swaps entre redes",
      sub: "{n} swaps · Stellar ⇄ Solana ⇄ Monad pela NEAR Intents",
      create: "Novo swap entre redes",
      readOnly: "Você tem acesso somente leitura aos swaps nesta organização.",
      searchPlaceholder: "Buscar por endereço, ativo ou ID…",
      filters: { all: "Todos", open: "Em andamento", SUCCEEDED: "Concluídos", REFUNDED: "Reembolsados", FAILED: "Falhos", EXPIRED: "Expirado" },
      status: { AWAITING_DEPOSIT: "Aguardando depósito", DEPOSIT_DETECTED: "Depósito detectado", INCOMPLETE_DEPOSIT: "Depósito incompleto", PROCESSING: "Processando", SUCCEEDED: "Concluído", REFUNDED: "Reembolsado", FAILED: "Falhou", EXPIRED: "Expirado" },
      tableHead: { id: "Swap", route: "Enviado → recebido", status: "Status", created: "Criado" },
      empty: "Ainda não há swaps entre redes.",
      loading: "Carregando swaps…",
      loadError: "Não foi possível carregar os swaps entre redes.",
      createError: "Não foi possível abrir o swap.",
      quoteError: "Não foi possível cotar o swap.",
      modal: {
        eyebrow: "Swap entre redes", title: "Novo swap entre redes",
        desc: "Envie um ativo em uma rede e receba outro em uma rede diferente. A NEAR Intents liquida; nada passa pela Cosmos Pay.",
        from: "De", to: "Para", chain: "Rede", asset: "Ativo", assetsLoading: "Carregando ativos…",
        amount: "Quantia a enviar", recipient: "Destinatário",
        refundTo: "Endereço de reembolso",
        slippage: "Slippage (bps)", slippageHint: "Opcional, ex. 100. Abaixo do mínimo a NEAR Intents reembolsa.",
        getQuote: "Cotar", quoting: "Cotando…", quoteTitle: "Cotação",
        estimated: "Você recebe (estimado)", minimum: "Mínimo a receber", fee: "Comissão", eta: "Tempo estimado", seconds: "s",
        feeNote: "A comissão é a taxa do plano da sua organização e sai da entrada.",
        create: "Abrir swap", creating: "Abrindo…",
      },
      detail: {
        eyebrow: "Swap entre redes", title: "Financie o swap",
        pay: "Envie exatamente {amount} {asset} para o endereço de depósito.",
        memoWarning: "Anexe o memo como MEMO_TEXT, ou o depósito não será creditado.",
        scan: "Escaneie para pagar", depositUri: "Link de depósito", openWallet: "Abrir na carteira",
        fields: { id: "ID", status: "Status", route: "Rota", depositAddress: "Endereço de depósito", depositMemo: "Memo", amountIn: "Enviar", estimated: "Receber (est.)", minimum: "Mínimo", fee: "Comissão", recipient: "Destinatário", refundTo: "Endereço de reembolso", amountOut: "Recebido", refunded: "Reembolsado", expires: "Depositar antes de", quoteSignature: "Assinatura da cotação", created: "Criado" },
        txs: "Transações",
        reportTitle: "Informar o depósito",
        reportPlaceholder: "Hash da transação de depósito…",
        report: "Informar", reporting: "Informando…", reported: "Depósito informado", reportError: "Não foi possível informar o depósito.", noLink: "Pague o endereço de depósito (e o memo, se aparecer) com qualquer carteira da {chain}, ou escaneie o QR.",
      },
    },
    wallet: { signTitle: "Assine com a sua carteira", freighter: "Assinar com a Freighter", signing: "Aguardando a Freighter…", submitting: "Enviando…", missing: "A Freighter não está instalada neste navegador. Escaneie o QR com outra carteira ou cole abaixo a transação assinada.", declined: "A Freighter não assinou a transação.", wrongAccount: "A Freighter está em outra conta. Troque para {account} e tente de novo.", wrongNetwork: "A Freighter está em outra rede. Troque para {network} e tente de novo.", networks: { testnet: "Testnet", public: "Rede pública" } },
    liquidity: {
      title: "Pools de liquidez",
      sub: "{n} operações · pools AMM na Stellar",
      deposit: "Depositar",
      withdraw: "Retirar",
      readOnly: "Você tem acesso somente leitura aos pools de liquidez nesta organização.",
      tabs: { operations: "Operações", pools: "Pools", positions: "Posições" },
      searchPlaceholder: "Buscar por pool, conta ou ID…",
      filters: { all: "Todos", PENDING: "Pendente", SUBMITTED: "Enviado", SUCCEEDED: "Concluído", FAILED: "Falhou" },
      status: { PENDING: "Pendente", SUBMITTED: "Enviado", SUCCEEDED: "Concluído", FAILED: "Falhou", EXPIRED: "Expirado" },
      kind: { DEPOSIT: "Depósito", WITHDRAW: "Retirada" },
      sharesUnit: "cotas",
      bps: "bps",
      opsHead: { id: "Operação", kind: "Tipo", pool: "Pool", amounts: "Valores", status: "Status", created: "Criado" },
      empty: "Ainda não há operações de liquidez. Deposite em um pool para obter uma transação não assinada para assinar.",
      loading: "Carregando operações…",
      loadError: "Não foi possível carregar as operações de liquidez.",
      network: { dev: "Testnet", prod: "Rede pública" },
      pools: {
        assetA: "Ativo A", assetAIssuer: "Emissor A", assetB: "Ativo B", assetBIssuer: "Emissor B",
        assetHint: "Código do ativo: deixe vazio ou XLM para lumens.",
        search: "Buscar pools", searching: "Buscando…", loading: "Carregando pools…",
        empty: "Nenhum pool corresponde a este par.",
        error: "Não foi possível carregar os pools de liquidez.",
        head: { pool: "Pool", reserves: "Reservas", shares: "Total de cotas", trustlines: "Titulares", fee: "Taxa" },
      },
      positions: {
        account: "Conta", accountHint: "Conta Stellar cujas cotas de pool você quer consultar (G…).",
        load: "Carregar posições", loadingBtn: "Carregando…",
        prompt: "Informe uma conta para ver suas posições em pools.",
        empty: "Esta conta não tem cotas de pools.",
        error: "Não foi possível carregar as posições.",
        head: { pool: "Pool", shares: "Cotas", share: "Participação no pool", redeemable: "Resgatável" },
      },
      modal: {
        eyebrow: "Liquidez",
        depositTitle: "Depositar liquidez",
        depositDesc: "Deposite os dois ativos de um par no pool AMM e receba cotas do pool. Você vai receber uma transação não assinada para assinar.",
        withdrawTitle: "Retirar liquidez",
        withdrawDesc: "Queime cotas do pool para receber os dois ativos da reserva de forma proporcional. Você vai receber uma transação não assinada para assinar.",
        source: "Conta de origem", sourceHint: "Conta Stellar que financia e assina o depósito (G…).",
        withdrawSourceHint: "Conta Stellar que detém as cotas do pool (G…).",
        assetA: "Ativo A", assetB: "Ativo B", assetHint: "Código do ativo (XLM para lumens).",
        assetAIssuer: "Emissor A", assetBIssuer: "Emissor B", issuerHint: "Obrigatório para ativos não nativos (G…).",
        maxAmountA: "Valor máx. A", maxAmountAHint: "Máximo do ativo A a depositar.",
        maxAmountB: "Valor máx. B", maxAmountBHint: "Opcional. Derivado do preço do pool se omitido; obrigatório para um pool novo.",
        poolId: "ID do pool", poolIdHint: "ID hexadecimal de 64 caracteres do pool de liquidez.",
        shares: "Cotas", sharesHint: "Quantidade de cotas do pool a queimar.",
        slippage: "Slippage (bps)", slippageHint: "Slippage máximo em pontos-base (opcional, ex. 50).",
        create: "Gerar transação", creating: "Gerando…",
        createError: "Não foi possível gerar a transação.",
        steps: { pair: "Par", amounts: "Valores" },
      },
      detail: {
        eyebrow: "Liquidez",
        titleDeposit: "Depósito pronto", titleWithdraw: "Retirada pronta",
        scan: "Escaneie para assinar", downloadQr: "Baixar QR",
        uri: "URI SEP-7", xdr: "XDR não assinado",
        openWallet: "Abrir na carteira", viewExplorer: "Ver no explorador",
        fields: { id: "ID", kind: "Tipo", status: "Status", network: "Rede", source: "Origem", pool: "Pool", pair: "Par", maxDeposit: "Depósito máximo", minReceived: "Mínimo recebido", shares: "Cotas", priceBounds: "Limites de preço (A/B)", commission: "Comissão", commissionMemo: "Memo da comissão", txHash: "ID da transação", created: "Criado" },
        submitTitle: "Enviar transação assinada",
        submitDesc: "Cole o XDR assinado devolvido pela carteira para transmitir a operação.",
        submitPlaceholder: "XDR da transação assinada…",
        submit: "Enviar", submitting: "Enviando…",
        submitted: "Operação enviada",
        submitFailed: "Não foi possível enviar a operação.",
        resultCodes: "Códigos de resultado",
      },
    },
    blindpay: {
      title: "Fiat",
      sub: "Onramp e Offramp · KYC/KYB",
      gate: "A verificação KYC/KYB é obrigatória antes de qualquer onramp ou offramp. Crie um recebedor e conclua a verificação primeiro.",
      readOnly: "Você tem acesso somente leitura ao Fiat nesta organização.",
      selectCountry: "Selecione o país",
      searchCountry: "Buscar países…",
      upload: "Enviar", uploading: "Enviando…", replace: "Substituir", uploaded: "Enviado", uploadError: "Não foi possível enviar o arquivo.", linkMode: "Link", clearFile: "Remover",
      loading: "Carregando…",
      loadError: "Não foi possível carregar os dados.",
      txStatuses: { pending: "Pendente", processing: "Processando", on_hold: "Em espera", funds_received: "Fundos recebidos", completed: "Concluído", refunded: "Reembolsado", partial_refund: "Parcialmente reembolsado", failed: "Falhou", cancelled: "Cancelado", canceled: "Cancelado", expired: "Expirado", reversed: "Revertido" },
      kycReturn: {
        eyebrow: "Fiat: ativação",
        activating: "Ativando sua conta…",
        activatingBody: "Aguarde enquanto confirmamos o seu aceite.",
        successTitle: "Sua conta já está ativa",
        successBody: "Agora você pode adicionar carteiras e contas bancárias e usar onramp e offramp.",
        errorTitle: "Falha na ativação",
        errorBody: "Não foi possível ativar sua conta. Tente novamente.",
        noTosId: "Nenhum id de termos de serviço foi retornado. Tente ativar novamente.",
        backToDashboard: "Voltar ao painel",
      },
      tabs: { receivers: "Recebedores", onramp: "Onramp", offramp: "Offramp" },
      receivers: {
        create: "Criar recebedor",
        searchPlaceholder: "Buscar recebedores…",
        tableHead: { name: "Nome", type: "Tipo", status: "Status do KYC", created: "Criado" },
        empty: "Ainda não há recebedores. Crie um para iniciar o KYC/KYB.",
        statusUnknown: "Desconhecido",
        inactive: "Inativo",
        statuses: { inactive: "Inativo", pending_review: "Revisão pendente", pending_user: "Aguardando aceite do cliente", verifying: "Verificando", approved: "Aprovado", rejected: "Rejeitado" },
        disabled: "Desativada",
        disableAccount: "Desativar conta",
        enableAccount: "Ativar conta",
        disabledNote: "Esta conta fiat está desativada: onramp/offramp ficam bloqueados até ela ser reativada.",
        accountDisabled: "Conta fiat desativada",
        accountEnabled: "Conta fiat ativada",
        accessError: "Não foi possível atualizar a conta fiat.",
        inactiveNote: "Só cadastro: nenhum dado de KYC enviado ainda.",
        awaitingReview: "Aguardando revisão do proprietário ou de um administrador.",
        reviewTitle: "Revisar KYC",
        reviewHint: "Revise os dados de KYC enviados e depois aprove para enviar os termos de serviço por e-mail ao cliente.",
        approve: "Aprovar e enviar termos",
        approving: "Aprovando…",
        approvedSent: "Aprovado: termos enviados para {email}",
        approveError: "Não foi possível aprovar o recebedor.",
        termsSentTitle: "Termos enviados",
        termsSentBody: "Aguardando o aceite do cliente. Termos enviados para {email}.",
        termsSentBodyNoEmail: "Aguardando o cliente aceitar os termos de serviço.",
        resendTerms: "Reenviar e-mail dos termos",
        resendVerification: "Reenviar e-mail de verificação",
        verificationSent: "E-mail de verificação enviado para {email}",
        refresh: "Atualizar status",
        refreshing: "Atualizando…",
        refreshError: "Não foi possível atualizar o status do KYC na BlindPay.",
        sending: "Enviando…",
        types: { individual: "Pessoa física", business: "Empresa" },
        createError: "Não foi possível criar o recebedor.",
        tosTitle: "Ativar conta",
        tosHint: "Este recebedor está inativo. Aceite os termos de serviço para ativá-lo.",
        activate: "Ativar conta",
        redirecting: "Redirecionando…",
        getTos: "Obter termos de serviço",
        emailTos: "Enviar termos por e-mail",
        tosUrl: "URL dos termos",
        openTerms: "Abrir termos",
        tosIdLabel: "ID dos termos de serviço",
        tosIdHintEnable: "Cole o tos_id da URL para a qual você foi redirecionado depois de aceitar.",
        enable: "Ativar conta",
        enabled: "Conta ativada",
        tosSent: "Termos de serviço enviados para {email}",
        getTosError: "Não foi possível obter os termos de serviço.",
        emailTosError: "Não foi possível enviar os termos por e-mail.",
        enableError: "Não foi possível ativar a conta.",
        modal: {
          eyebrow: "Recebedor", title: "Criar recebedor",
          desc: "Um recebedor é a entidade KYC (pessoa física) ou KYB (empresa) exigida para onramp/offramp.",
          type: "Tipo", individual: "Pessoa física (KYC)", business: "Empresa (KYB)",
          kycType: "Nível de verificação",
          ownersTitle: "Proprietários (UBO)", ownerN: "Proprietário {n}", addOwner: "Adicionar proprietário", removeOwner: "Remover",
          fields: {
            email: "Email", country: "País",
            first_name: "Nome", last_name: "Sobrenome", date_of_birth: "Data de nascimento", tax_id: "ID fiscal", phone_number: "Telefone",
            address_line_1: "Endereço", city: "Cidade", state_province_region: "Estado / província / região", postal_code: "Código postal",
            id_doc_country: "País do documento", id_doc_type: "Tipo de documento", id_doc_front_file: "Documento (frente)", id_doc_back_file: "Documento (verso)",
            selfie_file: "Selfie", proof_of_address_doc_type: "Tipo de comprovante de endereço", proof_of_address_doc_file: "Comprovante de endereço",
            occupation: "Profissão", account_purpose: "Finalidade da conta", source_of_funds_doc_type: "Tipo de origem dos recursos", source_of_funds_doc_file: "Documento de origem dos recursos",
            source_of_wealth: "Origem do patrimônio", purpose_of_transactions: "Finalidade das transações", purpose_of_transactions_explanation: "Finalidade das transações (explicação)",
            legal_name: "Razão social", alternate_name: "Nome fantasia", business_type: "Tipo de empresa", business_industry: "Setor", business_description: "Descrição do negócio",
            formation_date: "Data de constituição", estimated_annual_revenue: "Receita anual estimada", website: "Site",
            incorporation_doc_file: "Documento de constituição", proof_of_ownership_doc_file: "Comprovante de titularidade",
            ownership_percentage: "% de participação", title: "Cargo",
          },
          create: "Criar recebedor", creating: "Criando…",
          steps: { who: "Recebedor", personal: "Dados pessoais", documents: "Documentos", funds: "Origem dos fundos", company: "Empresa", owners: "Sócios" },
        },
        detail: {
          eyebrow: "Recebedor",
          id: "ID", blindpayId: "ID do provedor", kycStatus: "Status do KYC", kycType: "Nível de verificação", email: "Email", country: "País",
          terms: "Termos de serviço",
          tosOpened: "Fluxo dos termos de serviço iniciado.",
          tosError: "Não foi possível iniciar o fluxo dos termos de serviço.",
          wallets: "Carteiras blockchain", addWallet: "Adicionar carteira",
          banks: "Contas bancárias", addBank: "Adicionar conta bancária",
        },
        wallet: {
          name: "Nome", network: "Rede",
          address: "Endereço",
          aa: "Abstração de conta", add: "Adicionar carteira",
          error: "Não foi possível adicionar a carteira.",
        },
        bank: {
          rail: "Trilho", name: "Nome", beneficiary: "Nome do beneficiário", country: "País",
          accountNumber: "Número da conta", routingNumber: "Número de roteamento",
          add: "Adicionar conta bancária",
          error: "Não foi possível adicionar a conta bancária.",
          steps: { account: "Conta", numbers: "Dados bancários" },
        },
      },
      onramp: {
        create: "Novo payin",
        searchPlaceholder: "Buscar payins…",
        tableHead: { id: "Payin", asset: "Ativo", method: "Método", amount: "Enviado → recebido", status: "Status", created: "Criado" },
        empty: "Ainda não há payins.",
        statusUnknown: "Desconhecido",
        quoteError: "Não foi possível cotar o payin.",
        createError: "Não foi possível criar o payin.",
        created: "Payin criado",
        modal: {
          eyebrow: "Onramp", title: "Novo payin",
          desc: "Fiat → stablecoin. Faça a cotação e depois crie o payin para obter as instruções de pagamento.",
          walletId: "ID da carteira", walletIdHint: "Carteira do recebedor que recebe a stablecoin.",
          method: "Método de pagamento", token: "Token",
          currencyType: "Valor em", curSender: "Remetente", curReceiver: "Recebedor",
          amount: "Valor", amountHint: "Unidades menores (inteiro), ex. 10000 = 100,00.",
          getQuote: "Cotar", quoting: "Cotando…",
          quoteId: "ID da cotação", youSend: "Você envia", youReceive: "Você recebe", expires: "Expira",
          create: "Criar payin", creating: "Criando…",
          payinId: "ID do payin", status: "Status",
          instructions: "Instruções de pagamento", done: "Pronto",
          steps: { quote: "Cotação", confirm: "Confirmar" },
        },
      },
      offramp: {
        create: "Novo payout",
        searchPlaceholder: "Buscar payouts…",
        tableHead: { id: "Payout", asset: "Ativo", rail: "Trilho", amount: "Enviado → recebido", status: "Status", created: "Criado" },
        empty: "Ainda não há payouts.",
        statusUnknown: "Desconhecido",
        quoteError: "Não foi possível cotar o payout.",
        authError: "Não foi possível montar a transação a assinar.",
        createError: "Não foi possível criar o payout.",
        created: "Payout criado",
        modal: {
          eyebrow: "Offramp", title: "Novo payout",
          desc: "Stablecoin → fiat. Faça a cotação; na Stellar, autorize para obter a tx, assine-a e depois envie.",
          bankId: "ID da conta bancária", bankIdHint: "Conta bancária do recebedor que recebe o fiat.",
          network: "Rede", token: "Token",
          currencyType: "Valor em", curSender: "Remetente", curReceiver: "Recebedor",
          coverFees: "Cobrir taxas",
          amount: "Valor", amountHint: "Unidades menores (inteiro), ex. 10000 = 100,00.",
          getQuote: "Cotar",
          quoteId: "ID da cotação", youSend: "Você envia", youReceive: "Você recebe (fiat)", expires: "Expira",
          senderWallet: "Carteira remetente", senderWalletHint: "Carteira que detém a stablecoin (G… / 0x…).",
          authorize: "Autorizar",
          unsignedTx: "Transação não assinada",
          signedTx: "Transação assinada", signedTxHint: "Cole a transação assinada devolvida pela carteira.",
          signedTxPlaceholder: "Transação assinada…",
          evmNote: "Em redes EVM, assine o contrato approve da cotação pela API antes de criar o payout.",
          create: "Criar payout", creating: "Criando…",
          steps: { quote: "Cotação", sign: "Assinatura" },
        },
      },
    }
  }
};

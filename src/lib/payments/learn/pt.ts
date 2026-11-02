/* The gateway's guides in Brazilian Portuguese. Mirrors src/lib/payments/learn/en.ts key for key. */
import type { LearnMessages } from "@/lib/payments/learn/en";

export const pt: LearnMessages = {
  hub: {
    nav: "Guias",
    title: "Guias de pagamentos em stablecoins",
    lede: "Guias para empresas que cobram em stablecoins com a Cosmos Pay: como aceitar USDC online ou com o Solana Pay, como enviar um link de pagamento no WhatsApp, como confirmar pagamentos no seu servidor, o que faz um gateway de pagamento em stablecoins, como Stellar, Solana e Monad se comparam e como enviar USDT0 da Stellar para redes EVM.",
    meta: "Guias de pagamentos em stablecoins | Cosmos Pay",
    description: "Guias: aceitar USDC online ou com Solana Pay, links de pagamento no WhatsApp, confirmação por webhooks, Stellar vs Solana vs Monad e USDT0 da Stellar.",
  },
  ui: {
    updated: "Atualizado em {date}",
    by: "Por Cosmos Pay",
    related: "Guias relacionados",
    more: "Mais guias",
    all: "Ver todos os guias",
  },
  guides: {
    acceptUsdc: {
      nav: "Aceitar pagamentos em USDC",
      title: "Como aceitar pagamentos em USDC online",
      meta: "Como aceitar pagamentos em USDC online | Cosmos Pay",
      description: "Aceite USDC com um link de pagamento, um checkout hospedado ou uma API na Stellar, Solana ou Monad: o que você e seu cliente precisam e como testar antes.",
      summary: "Cobre em USDC com um link de pagamento, o checkout hospedado ou a API, e experimente antes numa rede de testes.",
      lede: "Para aceitar USDC online com a Cosmos Pay, adicione a carteira que vai receber o dinheiro e cobre com um link de pagamento, o checkout hospedado ou a API de pagamentos. Seu cliente paga com a própria carteira na Stellar, Solana ou Monad, e o USDC vai para o seu endereço. Faça tudo numa rede de testes antes de cobrar dinheiro real.",
      sections: {
        need: {
          title: "O que você precisa",
          body: [
            "Uma conta na Cosmos Pay. Criar uma é grátis, e o plano Starter não tem mensalidade: cada pagamento paga {starterRate}.",
            "Um endereço de carteira que vai receber o USDC, na rede em que você cobra: Stellar, Solana ou Monad. Você o adiciona à sua organização no dashboard e comprova que ele é seu com uma assinatura. Os links de pagamento criados no dashboard só pagam para as carteiras adicionadas ali.",
          ],
          links: { fees: "Ver a tarifa de cada plano" },
        },
        payer: {
          title: "O que seu cliente precisa",
          body: [
            "Uma carteira na mesma rede, com o USDC, que consiga abrir o pagamento: na Stellar, qualquer carteira que abra links SEP-7; na Solana, qualquer carteira que leia links do Solana Pay; na Monad, qualquer carteira EVM que leia links EIP-681. A carteira dele também paga a taxa de rede.",
            "Não precisa de conta. Ele abre o checkout, escaneia o QR code ou toca no botão da carteira e aprova o pagamento na própria carteira.",
          ],
        },
        ways: {
          title: "Três formas de cobrar",
          body: ["As três usam o mesmo checkout, o mesmo dashboard e os mesmos webhooks, então você pode começar com um link e passar para a API quando precisar."],
          points: [
            "Link de pagamento: crie no dashboard e envie por chat ou e-mail, ou mostre o QR code. Sem código.",
            "Checkout hospedado: envie seu cliente para a página de pagamento do link, abra-a a partir de um botão de pagamento ou mostre-a dentro da sua página com uma única tag script.",
            "API de pagamentos: crie cada pagamento no seu servidor com uma requisição, ou com o SDK em TypeScript, e desenhe sua própria tela de pagamento.",
          ],
          links: { whatsappGuide: "Enviar um link de pagamento no WhatsApp", integrations: "Experimente todas as opções de integração", embed: "Incorporar um pagamento" },
        },
        network: {
          title: "Em qual rede cobrar",
          body: [
            "Cobre na rede em que seus clientes já têm USDC. O USDC é predefinido na Stellar e na Solana, tanto na mainnet quanto na rede de testes, e na mainnet da Monad. Nas três, qualquer outro token pode ser cobrado indicando o emissor, o mint ou o contrato.",
          ],
          links: { networksGuide: "Stellar vs Solana vs Monad", stellar: "Pagamentos na Stellar", solana: "Pagamentos na Solana", monad: "Pagamentos na Monad" },
        },
        cost: {
          title: "Quanto custa",
          body: [
            "Cada pagamento paga a tarifa do seu plano, a mesma em todas as redes: {starterRate} no Starter, sem mensalidade. A carteira de quem paga cobre a taxa de rede; na Monad, a taxa do repasse que leva o pagamento até você é descontada dele.",
          ],
          links: { fees: "Preços e calculadora de tarifas", compare: "Como nossas tarifas se comparam" },
        },
      },
      steps: {
        title: "Aceite seu primeiro pagamento em USDC, passo a passo",
        items: {
          sandbox: { title: "Crie sua conta e mude para Sandbox", body: "Entre no dashboard e escolha Sandbox no topo. O que você cria ali funciona nas redes de teste (Stellar Testnet, Solana Devnet e Monad Testnet) e não movimenta dinheiro real." },
          wallet: { title: "Adicione a carteira que recebe o dinheiro", body: "Nas configurações da sua organização, adicione uma carteira na rede em que vai cobrar e assine o que o dashboard pedir: essa assinatura comprova que a carteira é sua." },
          charge: { title: "Crie uma cobrança de teste", body: "Em Pagamentos, crie um link de pagamento com a rede, o valor, o ativo e a carteira que o recebe. Ou crie uma chave de API de teste (começa com dv_) e chame POST /v1/payment-intents/pay do seu servidor. Na Stellar Testnet você pode cobrar em XLM, que o Friendbot, o faucet da Testnet, envia para uma conta de teste." },
          pay: { title: "Pague com uma carteira de teste", body: "Abra a página de pagamento: ela avisa que funciona numa rede de testes. Pague com uma carteira dessa rede e veja o checkout passar para Pago e o link para Concluído no dashboard." },
          confirm: { title: "Confirme os pagamentos no seu servidor", body: "Adicione um endpoint de webhook no dashboard. Quando a rede confirma um pagamento, a Cosmos Pay envia PAYMENT_INTENT_SUCCEEDED, assinado com HMAC-SHA256. Entregue o pedido quando ele chegar, não quando a página do cliente disser que está pago." },
          live: { title: "Mude para Produção", body: "Escolha Produção no dashboard e crie uma chave de API de produção (começa com prod_). As mesmas requisições passam a cobrar nas redes principais: a chave decide a rede, não o código." },
        },
        links: { gettingStarted: "Primeiros passos", apiKeys: "Chaves de API", webhooks: "Webhooks", paymentIntents: "API de intenções de pagamento" },
      },
      faq: {
        nocode: { q: "Posso aceitar USDC sem escrever código?", a: "Sim. Crie um link de pagamento no dashboard e compartilhe por chat ou e-mail, ou mostre o QR code. O status de cada pagamento aparece no dashboard." },
        asset: { q: "Meu cliente paga em USDC e eu recebo USDC?", a: "Sim. Seu cliente paga no ativo definido no link, e esse mesmo ativo chega ao seu endereço." },
        test: { q: "Posso testar sem dinheiro real?", a: "Sim. No Sandbox e com chaves de teste (dv_), os links funcionam em redes de teste, e o checkout deles avisa que nenhum fundo real é movimentado." },
        refunds: { q: "Um cliente pode reverter um pagamento em USDC?", a: "Não. Depois que a rede confirma um pagamento, ele é definitivo. Um reembolso é um novo pagamento que você envia da sua carteira." },
      },
    },
    whatsapp: {
      nav: "Links de pagamento no WhatsApp",
      title: "Como enviar um link de pagamento no WhatsApp",
      meta: "Links de pagamento no WhatsApp: crie e envie | Cosmos Pay",
      description: "Crie um link de pagamento em stablecoins no dashboard da Cosmos Pay, envie pelo WhatsApp ou como QR code impresso e veja o momento em que ele é pago.",
      summary: "Crie um link no dashboard, envie numa conversa ou imprima o QR code, e veja quando ele é pago.",
      lede: "Crie um link de pagamento no dashboard da Cosmos Pay, copie o endereço da página de pagamento e cole na conversa do WhatsApp. Seu cliente abre o link e paga com a própria carteira na Stellar, Solana ou Monad, e o link passa para Concluído no seu dashboard assim que a rede confirma o pagamento.",
      sections: {
        before: {
          title: "Antes de começar",
          body: [
            "Adicione a carteira que vai receber o dinheiro nas configurações da sua organização no dashboard, na rede em que vai cobrar. Um link de pagamento só paga para uma dessas carteiras.",
            "Faça um teste no Sandbox: os links ali funcionam em redes de teste, e o checkout deles avisa que nenhum fundo real é movimentado.",
          ],
        },
        customer: {
          title: "O que seu cliente vê",
          body: [
            "A página de pagamento mostra o valor, o ativo, a rede e o tempo restante para pagar. Seu cliente escolhe como pagar: escanear o QR code com o app da carteira, abrir o pagamento numa carteira no mesmo dispositivo ou enviar manualmente com os dados mostrados.",
            "A página abre no idioma do navegador quando ele é um dos sete que o checkout fala: inglês, espanhol, português, francês, alemão, hindi e chinês. Ela passa para Pago assim que a rede confirma o pagamento e leva à transação num explorador público. Seu cliente não precisa de conta.",
          ],
        },
        know: {
          title: "Bom saber",
          points: [
            "Um link é um pagamento. Depois de pago, ele não pode ser pago de novo, então crie um por venda ou fatura.",
            "Um link fica aberto por um tempo limitado, que o checkout mostra como contagem regressiva. Depois disso, o checkout diz ao seu cliente que peça um novo link; um pagamento que ainda chegue e seja confirmado marca o link como pago.",
            "Na Stellar e na Solana você pode deixar o valor vazio, e seu cliente o escolhe. Um link na Monad precisa de um valor.",
            "Cada pagamento paga a tarifa do seu plano ({starterRate} no Starter, sem mensalidade). A carteira do seu cliente paga a taxa de rede.",
          ],
          links: { acceptGuide: "Como aceitar pagamentos em USDC online", paymentLinks: "API de links de pagamento" },
        },
      },
      steps: {
        title: "Crie o link e envie",
        items: {
          create: { title: "Crie o link", body: "No dashboard, abra Pagamentos e escolha Criar link de pagamento. Defina a rede, o valor e o ativo, depois a carteira que recebe e o design do checkout. Na Stellar e na Solana você pode adicionar uma mensagem que seu cliente vê na carteira." },
          copy: { title: "Copie a página de pagamento", body: "Quando o link estiver pronto, copie o endereço da página de pagamento: payments.cosmospay.lat seguido do id do link. Ela abre em qualquer navegador, no celular ou no computador." },
          send: { title: "Envie pelo WhatsApp", body: "Cole o endereço na conversa e diga a que se refere o pagamento. A prévia de um app de mensagens mostra um cartão genérico de solicitação de pagamento da Cosmos Pay, sem o valor nem o seu endereço. E-mail, SMS e qualquer outro app de mensagens funcionam do mesmo jeito." },
          qr: { title: "Ou imprima o QR code", body: "O botão Descarregar QR salva o QR code do link como imagem, o mesmo que a página de pagamento mostra. Seu cliente o escaneia com o app da carteira. Para uma venda presencial, imprima o código ou mostre numa tela." },
          paid: { title: "Veja que foi pago", body: "A página do link no dashboard acompanha cada passo do seu cliente: na página de pagamento, carteira aberta, pagamento enviado e pago. Assim que a rede confirma o pagamento, o link mostra Concluído e, se você adicionou um endpoint de webhook, seu servidor recebe PAYMENT_INTENT_SUCCEEDED." },
        },
        links: { webhooks: "Webhooks", linkDemo: "Experimente a demo do link de pagamento" },
      },
      faq: {
        account: { q: "Meu cliente precisa de uma conta?", a: "Não. Ele precisa de uma carteira na rede do link com o ativo. Ele abre o link e aprova o pagamento na carteira." },
        reuse: { q: "Posso enviar o mesmo link para vários clientes?", a: "Não. Um link é pago uma vez. Crie um novo link para cada venda." },
        preview: { q: "A prévia do WhatsApp mostra o valor?", a: "Não. A prévia é o mesmo cartão genérico de solicitação de pagamento para todos os links. Seu cliente vê o valor quando abre a página de pagamento." },
        expired: { q: "E se meu cliente abrir o link depois que ele expirou?", a: "O checkout avisa que o link expirou e diz para ele pedir um novo. Crie outro link e envie." },
      },
    },
    gateway: {
      nav: "Gateways de pagamento em stablecoins",
      title: "O que é um gateway de pagamento em stablecoins?",
      meta: "O que é um gateway de pagamento em stablecoins? | Cosmos Pay",
      description: "O que faz um gateway de pagamento em stablecoins, onde o dinheiro é liquidado, quem paga a taxa de rede, com ou sem custódia, e como a Cosmos Pay funciona.",
      summary: "O que faz um gateway, onde o dinheiro é liquidado, quem paga a taxa de rede e a diferença entre com custódia e sem custódia.",
      lede: "Um gateway de pagamento em stablecoins permite que uma empresa cobre em stablecoins como o USDC. Ele cria a solicitação de pagamento, mostra ao cliente como pagar com a própria carteira e avisa a empresa quando a rede confirma o pagamento. Alguns gateways recebem o dinheiro e guardam um saldo para você; um gateway sem custódia, como a Cosmos Pay, faz o pagamento ir para um endereço que você controla.",
      sections: {
        stablecoin: {
          title: "O que é uma stablecoin",
          body: [
            "Uma stablecoin é um token feito para manter um valor estável em relação a uma moeda, na maioria das vezes o dólar americano. Ela circula numa blockchain como qualquer outro token, de uma carteira para outra, em qualquer dia e a qualquer hora.",
            "USDC e EURC são duas delas, ambas emitidas pela Circle. A Circle afirma que cada USDC pode ser resgatado por um dólar americano, e cada EURC por um euro.",
          ],
          links: { circleUsdc: "USDC, no site da Circle", circleEurc: "EURC, no site da Circle" },
        },
        does: {
          title: "O que o gateway faz",
          points: [
            "Cria a solicitação de pagamento (o valor, o ativo, a rede e o endereço a pagar) como um link e um QR code no formato que as carteiras leem: SEP-7 na Stellar, Solana Pay na Solana, EIP-681 em redes EVM como a Monad.",
            "Mostra ao cliente uma página de pagamento com essa solicitação, para que ele pague com a carteira que já usa.",
            "Monitora a rede e associa cada pagamento à sua solicitação, por um memo, uma chave de referência ou um endereço criado para aquele pagamento.",
            "Avisa a empresa quando a rede confirma o pagamento, num dashboard e por um webhook assinado enviado ao servidor dela.",
          ],
          links: { sep7: "O padrão SEP-7 (Stellar)", solanaPay: "A especificação do Solana Pay", eip681: "O padrão EIP-681 (Ethereum)" },
        },
        settle: {
          title: "Onde o dinheiro é liquidado",
          body: [
            "A liquidação é o momento em que o dinheiro chega à empresa. Com uma stablecoin, ela acontece na própria rede: depois que a rede confirma a transferência, o pagamento é definitivo e não pode ser estornado. Um reembolso é um novo pagamento que a empresa envia.",
          ],
        },
        fees: {
          title: "Quem paga a taxa de rede",
          body: [
            "Toda transferência paga uma taxa à rede em que é feita. Com a Cosmos Pay, a carteira de quem paga cobre essa taxa na Stellar, na Solana e na Monad. Na Monad, cada pagamento vai para um endereço criado para ele, e o repasse que o leva até a empresa tira a própria taxa do pagamento; a API informa essa taxa no pagamento como networkFee.",
            "A tarifa do próprio gateway é separada. A Cosmos Pay cobra uma tarifa por pagamento que depende do plano: {starterRate} no Starter, sem mensalidade.",
          ],
          links: { fees: "Preços e calculadora de tarifas" },
        },
        custody: {
          title: "Gateways com e sem custódia",
          body: [
            "Um gateway com custódia recebe o pagamento numa conta que ele controla e mostra a você um saldo que você saca depois. Um gateway sem custódia nunca fica com o dinheiro: o pagamento vai para um endereço cujas chaves estão com você.",
            "A diferença é quem controla os fundos entre a venda e o momento em que você os usa, e quem guarda as chaves. Com um gateway sem custódia, as chaves ficam com você, então cuidar delas é responsabilidade sua.",
          ],
        },
        fit: {
          title: "Onde entra a Cosmos Pay",
          body: [
            "A Cosmos Pay é um gateway de pagamento em stablecoins sem custódia na Stellar, Solana e Monad. Você cobra com um link de pagamento, o checkout hospedado ou a API de pagamentos, e escolhe os endereços de carteira que recebem o dinheiro. A Cosmos Pay não armazena chaves de ninguém.",
            "Na Stellar e na Solana, seu cliente paga direto para o seu endereço. Na Monad, cada pagamento vai para um endereço de depósito criado para ele, que só pode repassá-lo para o seu endereço (menos a taxa do repasse): a Cosmos Pay não tem nenhuma chave dele. Todo pagamento pode ser verificado na rede, e todo checkout pago leva à sua transação num explorador público.",
          ],
          links: { security: "Como os pagamentos são protegidos", acceptGuide: "Como aceitar pagamentos em USDC online", integrations: "Opções de integração" },
        },
      },
      faq: {
        final: { q: "Um pagamento em stablecoin pode ser estornado?", a: "Não. Depois que a rede o confirma, ele é definitivo. Um reembolso é um pagamento que a empresa devolve da própria carteira." },
        custody: { q: "A Cosmos Pay fica com o meu dinheiro?", a: "Não. Na Stellar e na Solana, quem paga envia direto para o seu endereço. Na Monad, cada pagamento vai para um endereço de depósito criado para ele, que só pode repassá-lo para o seu endereço (menos a taxa do repasse): a Cosmos Pay não tem nenhuma chave dele." },
        wallet: { q: "Preciso da minha própria carteira?", a: "Sim. Os pagamentos vão para um endereço que você controla em cada rede que aceitar, então os fundos são seus desde o primeiro pagamento." },
        customers: { q: "Meus clientes precisam de uma conta?", a: "Não precisam de conta na Cosmos Pay. Eles precisam de uma carteira na rede do pagamento, com a stablecoin." },
      },
    },
    networks: {
      nav: "Stellar vs Solana vs Monad",
      title: "Stellar vs Solana vs Monad para aceitar pagamentos",
      meta: "Stellar vs Solana vs Monad para pagamentos | Cosmos Pay",
      description: "Como Stellar, Solana e Monad se comparam para aceitar pagamentos em stablecoins com a Cosmos Pay: padrão de link, ativos, redes de teste, taxas e tarifas.",
      summary: "As três redes lado a lado, como a Cosmos Pay as suporta: formato do link, ativos, redes de teste e taxas.",
      lede: "Com a Cosmos Pay, um pagamento na Stellar, Solana ou Monad chega ao seu endereço e paga a mesma tarifa do plano. O que muda é o link que a carteira lê (SEP-7 na Stellar, Solana Pay na Solana, EIP-681 para um endereço de depósito na Monad), como um pagamento é associado ao seu link e quais ativos vêm predefinidos. A tabela compara as três redes como a Cosmos Pay as suporta.",
      table: {
        title: "As três redes, lado a lado",
        caption: "Stellar, Solana e Monad comparadas para aceitar pagamentos com a Cosmos Pay",
        topic: "Tema",
        rows: {
          link: { k: "Link de pagamento", stellar: "SEP-7 (web+stellar:pay) e seu QR code", solana: "Solicitação de transferência do Solana Pay (solana:) e seu QR code", monad: "EIP-681 (ethereum:) e seu QR code, para um endereço de depósito criado para aquele pagamento" },
          match: { k: "Como um pagamento é identificado", stellar: "Um memo numérico no link", solana: "Uma chave de referência do Solana Pay no link", monad: "O próprio endereço de depósito" },
          settle: { k: "Para onde vai o dinheiro", stellar: "Direto para o seu endereço", solana: "Direto para o seu endereço", monad: "Um endereço de depósito que só pode repassá-lo para o seu endereço" },
          fee: { k: "Taxa de rede", stellar: "Coberta pela carteira de quem paga", solana: "Coberta pela carteira de quem paga", monad: "A carteira de quem paga cobre a própria transferência; a taxa do repasse é descontada do pagamento" },
          presets: { k: "Ativos predefinidos" },
          test: { k: "Rede de testes" },
          amount: { k: "Valor", stellar: "Fixo, ou escolhido por quem paga", solana: "Fixo, ou escolhido por quem paga", monad: "Obrigatório" },
          message: { k: "Mensagem na carteira", stellar: "Sim", solana: "Sim", monad: "Não" },
          merchantFee: { k: "Sua própria taxa num pagamento", stellar: "Quem paga informa a própria conta e paga os dois valores numa única transação", solana: "Uma solicitação de transação do Solana Pay com as duas transferências", monad: "O endereço de depósito divide o pagamento" },
          wallets: { k: "Carteiras que pagam", stellar: "Qualquer carteira que abra links SEP-7, como {wallets}", solana: "Qualquer carteira que leia links do Solana Pay, como {wallets}", monad: "Qualquer carteira EVM que leia links EIP-681" },
          private: { k: "Pagamentos privados", stellar: "Sim, por enquanto na Testnet", solana: "Não", monad: "Não" },
          rate: { k: "Tarifa da Cosmos Pay", value: "A tarifa do seu plano ({starterRate} no Starter)" },
        },
        note: "Os ativos predefinidos são os que o dashboard oferece pelo nome; a página de cada rede lista os endereços deles. Qualquer outro token é indicado pelo emissor, mint ou contrato.",
        links: { sep7: "O padrão SEP-7 (Stellar)", solanaPay: "A especificação do Solana Pay", eip681: "O padrão EIP-681 (Ethereum)" },
      },
      sections: {
        choose: {
          title: "Como escolher",
          body: ["Uma conta recebe pagamentos nas três redes, e cada link indica aquela em que é liquidado. Estas diferenças decidem onde um pagamento se encaixa:"],
          points: [
            "Cobre onde seus clientes já têm a stablecoin. As mesmas chaves de API e os mesmos endpoints de webhook atendem as três redes.",
            "Para deixar o cliente escolher o valor, como em doações, use Stellar ou Solana: um link na Monad precisa de um valor.",
            "Para mostrar uma mensagem na carteira do cliente, como um número de pedido, use Stellar ou Solana.",
            "Para manter o valor privado na blockchain, os pagamentos privados funcionam na Stellar, por enquanto na Testnet.",
          ],
          links: { stellar: "Pagamentos na Stellar", solana: "Pagamentos na Solana", monad: "Pagamentos na Monad" },
        },
        fees: {
          title: "Quanto custa em cada rede",
          body: [
            "A Cosmos Pay cobra a tarifa do seu plano por pagamento, a mesma na Stellar, Solana e Monad: {starterRate} no Starter, sem mensalidade. A carteira de quem paga cobre a taxa de rede nas três. Na Monad, a taxa do repasse que leva o pagamento até você é descontada dele, e o checkout mostra esse valor.",
          ],
          links: { fees: "Preços e calculadora de tarifas", compare: "Como nossas tarifas se comparam" },
        },
      },
      faq: {
        all: { q: "Posso aceitar pagamentos nas três redes?", a: "Sim. Cada link de pagamento é liquidado numa rede, que você escolhe ao criá-lo. A mesma conta, as mesmas chaves de API e os mesmos webhooks funcionam nas três." },
        test: { q: "Posso testar nas três?", a: "Sim. O Sandbox e as chaves de teste (dv_) criam links na Stellar Testnet, na Solana Devnet e na Monad Testnet. A Monad Testnet não tem USDC predefinido: cobre em MON ali, ou indique um token pelo contrato." },
        fees: { q: "A Cosmos Pay é mais barata em alguma rede?", a: "Não. A tarifa do seu plano é a mesma nas três. A carteira de quem paga cobre a taxa de rede, e na Monad a taxa do repasse de um pagamento é descontada dele." },
      },
    },
    solanaPay: {
      nav: "USDC com Solana Pay",
      title: "Como aceitar USDC com links do Solana Pay",
      meta: "Links de pagamento Solana Pay, passo a passo | Cosmos Pay",
      description: "Cobre em USDC na Solana com um link e um QR code do Solana Pay: o que o link contém, como testar na Devnet e como cada pagamento é confirmado.",
      summary: "Crie um link do Solana Pay para USDC, teste na Devnet e veja cada pagamento confirmado no seu servidor.",
      lede: "Com a Cosmos Pay, um link de pagamento na Solana é uma solicitação de transferência do Solana Pay: seu cliente escaneia o QR code ou abre o link numa carteira como Phantom ou Solflare e aprova ali o pagamento em USDC. O USDC vai direto para a sua carteira, e a Cosmos Pay marca o link como pago assim que a Solana confirma a transação. Teste na Devnet antes de cobrar dinheiro real.",
      sections: {
        what: {
          title: "O que um link do Solana Pay contém",
          body: [
            "O Solana Pay é um padrão de solicitações de pagamento que as carteiras da Solana leem: um link solana:, ou o QR code dele, com o endereço a pagar, o valor, o token e uma mensagem.",
            "A Cosmos Pay adiciona uma chave de referência criada para cada link. A carteira inclui essa chave na transação, e a Cosmos Pay procura por ela na Solana para associar o pagamento ao seu link. O pagamento só é aceito quando a transação foi bem-sucedida e o valor exato chegou ao seu endereço.",
          ],
          links: { solanaPay: "A especificação do Solana Pay", solana: "Pagamentos na Solana" },
        },
        need: {
          title: "O que você e seu cliente precisam",
          points: [
            "Você: um endereço da Solana que recebe o dinheiro, adicionado à sua organização no dashboard e comprovado como seu com uma assinatura.",
            "Seu cliente: uma carteira da Solana que leia links do Solana Pay, como Phantom ou Solflare, com o USDC e um pouco de SOL para a taxa de rede. Sem conta na Cosmos Pay.",
            "Para testes: o Sandbox, onde os links funcionam na Solana Devnet. O USDC também é predefinido ali, então você pode testar com USDC da Devnet.",
          ],
        },
        api: {
          title: "Crie o link no seu servidor",
          body: [
            "Com a API de pagamentos, chame POST /v1/payment-intents/pay com chain definido como solana, seu endereço como destino e, para USDC, o código de ativo USDC com o mint dele como emissor. Com o SDK em TypeScript (versão 2.2 ou posterior), passe chain: 'solana' para client.paymentIntents.createPay.",
            "A resposta traz o link (o uri dele começa com solana:) e o QR code. Mostre o QR code, abra o link na carteira do seu cliente ou envie-o para o checkout hospedado: payments.cosmospay.lat seguido do id do link.",
          ],
          links: { paymentIntents: "API de intenções de pagamento", sdkPaymentIntents: "Intenções de pagamento no SDK" },
        },
        know: {
          title: "Bom saber",
          points: [
            "Você pode deixar o valor vazio para que seu cliente o escolha, como em doações. Um link que adiciona a sua própria taxa precisa de um valor.",
            "Uma mensagem de até 300 caracteres, como um número de pedido, aparece na carteira do seu cliente.",
            "Com a sua própria taxa no pagamento, o link vira uma solicitação de transação do Solana Pay que paga a sua carteira e a sua carteira de taxas numa única transação.",
            "Um link fica aberto por um tempo limitado, que o checkout mostra como contagem regressiva. Um pagamento que ainda chegue e seja confirmado marca o link como pago.",
            "A carteira do seu cliente paga a taxa de rede da Solana, em SOL. Cada pagamento paga a tarifa do seu plano, a mesma de todas as redes.",
          ],
          links: { fees: "Preços e calculadora de tarifas", networksGuide: "Stellar vs Solana vs Monad" },
        },
      },
      steps: {
        title: "Aceite seu primeiro pagamento com Solana Pay",
        items: {
          sandbox: { title: "Mude para Sandbox", body: "Entre no dashboard e escolha Sandbox no topo. Os links que você cria ali funcionam na Solana Devnet e não movimentam dinheiro real." },
          wallet: { title: "Adicione sua carteira da Solana", body: "Nas configurações da sua organização, adicione o endereço da Solana que vai receber o dinheiro e assine o que o dashboard pedir: essa assinatura comprova que a carteira é sua." },
          create: { title: "Crie o link", body: "Em Pagamentos, escolha Criar link de pagamento, selecione Solana e mude o ativo para USDC (o seletor começa em SOL). Informe o valor, ou deixe-o vazio para seu cliente escolher, depois escolha sua carteira e, se quiser, uma mensagem." },
          pay: { title: "Pague com uma carteira", body: "Abra a página de pagamento e escaneie o QR code com uma carteira da Solana, ou abra o link no mesmo dispositivo. Aprove o pagamento na carteira, e o checkout passa para Pago assim que a Solana o confirma." },
          confirm: { title: "Confirme no seu servidor", body: "Adicione um endpoint de webhook no dashboard. Quando o pagamento é confirmado, a Cosmos Pay envia PAYMENT_INTENT_SUCCEEDED, assinado com HMAC-SHA256. Entregue o pedido quando ele chegar." },
          live: { title: "Mude para Produção", body: "Escolha Produção e crie uma chave de API de produção (começa com prod_). Os links passam a funcionar na rede principal da Solana, onde o USDC tem a sua própria predefinição." },
        },
        links: { webhooksGuide: "Como confirmar um pagamento no seu servidor", apiKeys: "Chaves de API" },
      },
      faq: {
        wallets: { q: "Quais carteiras podem pagar um link do Solana Pay?", a: "Qualquer carteira da Solana que leia links do Solana Pay, como Phantom ou Solflare. Seu cliente escaneia o QR code ou abre o link e aprova o pagamento na carteira." },
        sol: { q: "Meu cliente precisa de SOL?", a: "Sim, um pouco. A carteira dele paga a taxa de rede da Solana em SOL, além do USDC que ele envia." },
        direct: { q: "O USDC passa pela Cosmos Pay?", a: "Não. Na Solana, a carteira do seu cliente envia o USDC direto para o seu endereço. A Cosmos Pay encontra o pagamento na rede pela chave de referência do link." },
        devnet: { q: "Posso testar sem dinheiro real?", a: "Sim. No Sandbox e com chaves de teste (dv_), os links funcionam na Solana Devnet, onde o USDC é predefinido, e o checkout avisa que nenhum fundo real é movimentado." },
      },
    },
    webhooks: {
      nav: "Confirmar pagamentos no seu servidor",
      title: "Como confirmar um pagamento em stablecoins no seu servidor",
      meta: "Confirme pagamentos em stablecoins com webhooks | Cosmos Pay",
      description: "Confirme pagamentos em stablecoins no servidor com webhooks assinados: verifique a assinatura, responda rápido, trate reenvios e duplicados e teste antes.",
      summary: "Entregue os pedidos a partir de um webhook assinado, não da página do seu cliente: verifique-o, responda rápido e ignore duplicados.",
      lede: "Para confirmar um pagamento em stablecoins, deixe seu servidor agir com base no webhook assinado da Cosmos Pay, não na página que seu cliente vê. Quando a rede confirma um pagamento, a Cosmos Pay envia PAYMENT_INTENT_SUCCEEDED para o seu endpoint, assinado com o segredo desse endpoint. Verifique a assinatura, responda com um status 2xx e entregue o pedido uma vez por evento.",
      sections: {
        why: {
          title: "Por que o seu servidor, e não o navegador",
          body: [
            "Um checkout que diz Pago é só o que o navegador do seu cliente mostra. A aba pode ser fechada antes de voltar ao seu site, e qualquer pessoa pode abrir sua página de sucesso manualmente. O que torna um pagamento definitivo é a confirmação da rede.",
            "A Cosmos Pay monitora a rede por você e avisa o seu servidor quando um pagamento é confirmado. É no seu servidor que o pedido deve ser marcado como pago e entregue.",
          ],
        },
        how: {
          title: "O que a Cosmos Pay envia",
          points: [
            "Um POST HTTPS para o endpoint que você registra, com um evento JSON: id (começa com evt_), type, createdAt e data. Para um pagamento, data é o pagamento com status, valor, ativo, rede e transação.",
            "O cabeçalho X-Cosmos-Signature: t=<hora unix>,v1=<assinatura>. A assinatura é o HMAC-SHA256 de t, um ponto e o corpo bruto, com o segredo do endpoint como chave, em hexadecimal.",
            "Os tipos de evento que você escolher, como PAYMENT_INTENT_SUCCEEDED, PAYMENT_INTENT_FAILED ou ZK_PAYMENT_SUCCEEDED. Compare-os exatamente como estão escritos, em maiúsculas e com underscores.",
            "Os cabeçalhos X-Cosmos-Event, X-Cosmos-Event-Id e X-Cosmos-Delivery, que identificam o evento e a entrega.",
          ],
          links: { webhooks: "Webhooks no SDK", webhooksApi: "API de webhooks" },
        },
        retries: {
          title: "Quando o seu servidor não responde",
          body: [
            "Só uma resposta 2xx conta como entregue, e redirecionamentos não são seguidos. A Cosmos Pay tenta de novo uma entrega que falhou até três vezes, com uma pausa cada vez maior, e depois em rodadas posteriores, e o evento mantém o mesmo id em todas as tentativas.",
            "No dashboard, cada endpoint lista as suas entregas, com um filtro para as que falharam, e você pode enviar qualquer uma delas de novo. A Cosmos Pay guarda o corpo de uma entrega por 30 dias, então reenvie dentro desse prazo.",
          ],
        },
        validate: {
          title: "Ou verifique um pagamento você mesmo",
          body: [
            "Você também pode consultar um pagamento específico: busque-o pelo id para ler o status, ou envie o hash da transação dele (na Solana, a assinatura da transação) para POST /v1/payment-intents/:id/validate. Use isso como alternativa, por exemplo quando seu cliente volta antes de o webhook chegar; o webhook continua sendo o sinal principal.",
          ],
          links: { paymentIntents: "API de intenções de pagamento" },
        },
      },
      steps: {
        title: "Configure um webhook, passo a passo",
        items: {
          endpoint: { title: "Adicione um endpoint", body: "No dashboard, abra Webhooks e adicione o endereço HTTPS de uma rota do seu servidor. Escolha os eventos que vai receber; PAYMENT_INTENT_SUCCEEDED já vem selecionado. O endereço precisa ser público: endereços privados e locais são recusados." },
          secret: { title: "Guarde o segredo", body: "O dashboard mostra o segredo do endpoint (começa com whsec_) uma única vez. Guarde-o no ambiente do seu servidor, nunca numa página web." },
          verify: { title: "Verifique cada requisição", body: "Leia o corpo bruto antes de qualquer parser JSON e confira o X-Cosmos-Signature com ele. Com o SDK em TypeScript, Webhooks.constructEvent verifica a assinatura, recusa por padrão uma com mais de cinco minutos e retorna o evento." },
          answer: { title: "Responda rápido e depois trabalhe", body: "Responda com um status 2xx assim que a assinatura for validada e faça o trabalho demorado, como e-mails ou atualizações de estoque, depois disso." },
          dedupe: { title: "Trate cada evento uma vez", body: "Guarde o id de cada evento que você trata e ignore um que já tenha visto: uma nova tentativa ou um reenvio manda o mesmo evento de novo." },
          test: { title: "Envie um teste", body: "Use Enviar teste no endpoint para receber um evento ping, depois faça um pagamento de teste no Sandbox e acompanhe a entrega na lista do endpoint." },
        },
        links: { webhooks: "Webhooks no SDK", gettingStarted: "Primeiros passos" },
      },
      faq: {
        name: { q: "O dashboard mostra payment_intent.succeeded. Qual nome o evento traz?", a: "O tipo do evento é PAYMENT_INTENT_SUCCEEDED, em maiúsculas e com underscores. O dashboard só o exibe de forma mais curta." },
        rotate: { q: "O que acontece quando eu rodo o segredo?", a: "O novo segredo funciona na hora e o antigo para de funcionar na hora, então atualize seu servidor logo depois de rodá-lo." },
        down: { q: "E se o meu servidor estava fora do ar?", a: "A Cosmos Pay tenta de novo as entregas que falharam, e você pode enviar qualquer entrega de novo pelo dashboard durante 30 dias." },
        several: { q: "Posso ter vários endpoints?", a: "Sim. Cada endpoint tem o seu próprio endereço, os seus próprios eventos e o seu próprio segredo, e cada evento vai para todos os endpoints inscritos nele." },
      },
    },
    usdt0: {
      nav: "USDT0 da Stellar",
      title: "Como enviar USDT0 da Stellar para redes EVM",
      meta: "Envie USDT0 da Stellar para redes EVM | Cosmos Pay",
      description: "Envie USDT0 de uma conta na Stellar para Ethereum, Arbitrum e outras redes EVM com a Cosmos Pay: rotas, taxas em XLM, prazos e cada passo.",
      summary: "Mova USDT0 da Stellar para uma rede EVM pela LayerZero: escolha uma rota, veja as taxas, assine uma vez e acompanhe a entrega.",
      lede: "Com a Cosmos Pay, você pode enviar USDT0 de uma conta na Stellar para um endereço no Ethereum, no Arbitrum ou em outra das 21 redes EVM. Você recebe uma cotação com todas as taxas em XLM, assina uma transação da Stellar na sua carteira e a transferência chega em cerca de 27 minutos. O Ethereum recebe USDT nativo; todas as outras redes recebem USDT0.",
      sections: {
        what: {
          title: "O que é o USDT0",
          body: [
            "O USDT0 é a forma omnichain do USDT da Tether. O emissor descreve um modelo de bloqueio e emissão: o USDT é bloqueado no Ethereum e a mesma quantidade de USDT0 é emitida nas outras redes, que o movimentam entre si com o padrão Omnichain Fungible Token (OFT) da LayerZero.",
            "Na Stellar, o USDT0 é um ativo como qualquer outro, então a conta que o envia precisa de uma trustline para ele e de saldo em USDT0.",
          ],
          links: { usdt0Site: "USDT0, no site do emissor", usdt0Network: "Como funciona a rede USDT0", layerzeroOft: "O padrão OFT da LayerZero" },
        },
        routes: {
          title: "Para onde ele pode ir",
          body: [
            "A Cosmos Pay oferece 21 rotas, todas para redes EVM, cada uma para um endereço formado por 0x e 40 caracteres hexadecimais. O Ethereum recebe USDT nativo; o Arbitrum e as demais recebem USDT0. A chamada routes da API lista as rotas com seus nomes.",
            "As transferências funcionam só nas redes principais: com uma chave de teste (dv_), a API responde que não há rota disponível.",
          ],
          links: { usdt0Docs: "USDT0 no SDK", usdt0Api: "API do USDT0" },
        },
        cost: {
          title: "Quanto custa",
          points: [
            "A taxa de mensageria da LayerZero, em XLM. A transação permite até 20% a mais, e o que ela não usar volta na mesma transação.",
            "A taxa de rede da Stellar, em XLM.",
            "Qualquer comissão da Cosmos Pay, que a cotação mostra antes de você assinar.",
            "A conta que envia paga todas elas em XLM, então mantenha algum XLM nela além do USDT0.",
          ],
        },
        know: {
          title: "Bom saber",
          points: [
            "A transação tem um prazo curto, informado como expiresAt: assine e envie antes disso, ou crie uma nova transferência.",
            "Os valores na Stellar têm 7 casas decimais e o OFT carrega 6, então uma 7ª casa decimal fica na sua conta como resíduo.",
            "A Cosmos Pay nunca guarda uma chave: a API monta a transação, sua carteira a assina e a API a retransmite.",
            "Você também pode enviar USDT0 pelo painel de swaps do dashboard, onde ele aparece como Ponte USDT0.",
          ],
        },
      },
      steps: {
        title: "Envie USDT0, passo a passo",
        items: {
          hold: { title: "Tenha USDT0 na Stellar", body: "A conta que envia precisa de uma trustline para o USDT0, de saldo em USDT0 e de algum XLM para as taxas." },
          quote: { title: "Peça uma cotação", body: "Chame quote com a rota e o valor. A chamada retorna o que é enviado, o que chega, o resíduo que fica, cada taxa e os limites, e não salva nada." },
          create: { title: "Crie a transferência", body: "Chame create com a conta da Stellar que envia, a rota, o endereço EVM que recebe e o valor. A API monta uma transação da Stellar para ela." },
          sign: { title: "Assine na sua carteira", body: "Assine a transação (o XDR dela) com a carteira que tem o USDT0, ou abra o link SEP-7 dela nessa carteira." },
          submit: { title: "Envie", body: "Envie a transação assinada para submit. Se a rede a recusar, a transferência continua pendente: corrija a causa e envie de novo antes que ela expire." },
          follow: { title: "Acompanhe até a entrega", body: "A transferência passa de PENDING para SUBMITTED e depois para DELIVERED, em cerca de 27 minutos em todas as rotas, enquanto os verificadores da LayerZero esperam as confirmações da Stellar. Depois de entregue, ela traz a transação da rede de destino e um link do LayerZero Scan." },
        },
        links: { usdt0Docs: "USDT0 no SDK", usdt0Api: "API do USDT0" },
      },
      faq: {
        arrive: { q: "O que o endereço de destino recebe?", a: "No Ethereum, USDT nativo. Em todas as outras rotas, USDT0." },
        time: { q: "Quanto tempo leva uma transferência?", a: "Cerca de 27 minutos em todas as rotas, conforme medido no LayerZero Scan: os verificadores da LayerZero esperam as confirmações da Stellar antes de a transferência ser entregue." },
        test: { q: "Posso testar numa rede de testes?", a: "Não. As transferências de USDT0 funcionam só nas redes principais; com uma chave de teste, nenhuma rota está disponível." },
        custody: { q: "A Cosmos Pay fica com o meu USDT0?", a: "Não. Sua carteira assina a transação que o envia; a Cosmos Pay só a monta e a retransmite." },
      },
    },
  },
};

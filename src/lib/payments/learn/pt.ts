/* The gateway's guides in Brazilian Portuguese. Mirrors src/lib/payments/learn/en.ts key for key. */
import type { LearnMessages } from "@/lib/payments/learn/en";

export const pt: LearnMessages = {
  hub: {
    nav: "Guias",
    title: "Guias de pagamentos em stablecoins",
    lede: "Guias para empresas que cobram em stablecoins com a Cosmos Pay: como aceitar USDC online, como enviar um link de pagamento no WhatsApp, o que faz um gateway de pagamento em stablecoins e como Stellar, Solana e Monad se comparam.",
    meta: "Guias de pagamentos em stablecoins | Cosmos Pay",
    description: "Guias para empresas: aceitar USDC online, links de pagamento no WhatsApp, o que faz um gateway de pagamento em stablecoins e Stellar vs Solana vs Monad.",
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
            "Na Stellar e na Solana, seu cliente paga direto para o seu endereço. Na Monad, cada pagamento vai para o próprio endereço de depósito, que o repassa para o seu. Todo pagamento pode ser verificado na rede, e todo checkout pago leva à sua transação num explorador público.",
          ],
          links: { security: "Como os pagamentos são protegidos", acceptGuide: "Como aceitar pagamentos em USDC online", integrations: "Opções de integração" },
        },
      },
      faq: {
        final: { q: "Um pagamento em stablecoin pode ser estornado?", a: "Não. Depois que a rede o confirma, ele é definitivo. Um reembolso é um pagamento que a empresa devolve da própria carteira." },
        custody: { q: "A Cosmos Pay fica com o meu dinheiro?", a: "Não. Na Stellar e na Solana, quem paga envia direto para o seu endereço. Na Monad, cada pagamento vai para o próprio endereço de depósito, que o repassa para o seu, menos a taxa de rede." },
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
          settle: { k: "Para onde vai o dinheiro", stellar: "Direto para o seu endereço", solana: "Direto para o seu endereço", monad: "O endereço de depósito o repassa para o seu endereço" },
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
  },
};

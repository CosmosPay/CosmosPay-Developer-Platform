/* The gateway's guides (/learn and /learn/<slug>, src/lib/payments/site-pages.ts) in English, the
   shape every other language mirrors key for key (tests/unit/paymentsI18n.test.ts). One file per
   language, gathered by src/lib/payments/learn/index.ts.

   Every product claim here is checked against the dashboard, the community server and
   docs/openapi.json, as on the rest of the gateway: no figures that are not product facts, no
   legal, regulatory or tax content, no claim about another company without its own page as the
   source (`links`). Rates are not written here: `{starterRate}` is filled from src/lib/plans.ts.
   Links are not copy either: each `links` entry names a target of src/lib/payments/learn/links.ts
   and gives its label. No em dashes. */

export const en = {
  hub: {
    nav: "Guides",
    title: "Stablecoin payment guides",
    lede: "Guides for businesses that charge in stablecoins with Cosmos Pay: how to accept USDC online, how to send a payment link on WhatsApp, what a stablecoin payment gateway does, and how Stellar, Solana and Monad compare.",
    meta: "Stablecoin payment guides | Cosmos Pay",
    description: "Guides for businesses: accept USDC online, send payment links on WhatsApp, how stablecoin payment gateways work, and Stellar vs Solana vs Monad.",
  },
  ui: {
    updated: "Updated {date}",
    by: "By Cosmos Pay",
    related: "Related guides",
    more: "More guides",
    all: "See every guide",
  },
  guides: {
    acceptUsdc: {
      nav: "Accept USDC payments",
      title: "How to accept USDC payments online",
      meta: "How to accept USDC payments online | Cosmos Pay",
      description: "Accept USDC with a payment link, a hosted checkout or an API on Stellar, Solana or Monad: what you and your customer need, and how to test first.",
      summary: "Charge in USDC with a payment link, the hosted checkout or the API, and try it on a test network first.",
      lede: "To accept USDC online with Cosmos Pay, add the wallet that will receive the money, then charge with a payment link, the hosted checkout or the Payments API. Your customer pays from their own wallet on Stellar, Solana or Monad, and the USDC goes to your address. Run it on a test network before you charge real money.",
      sections: {
        need: {
          title: "What you need",
          body: [
            "A Cosmos Pay account. Creating one is free, and the Starter plan has no monthly fee: each payment pays {starterRate}.",
            "A wallet address that will receive the USDC, on the network you charge on: Stellar, Solana or Monad. You add it to your organization in the dashboard and prove it is yours with a signature. Payment links created in the dashboard pay only into the wallets added there.",
          ],
          links: { fees: "See every plan’s rate" },
        },
        payer: {
          title: "What your customer needs",
          body: [
            "A wallet on the same network that holds the USDC and can open the payment: on Stellar, any wallet that opens SEP-7 links; on Solana, any wallet that reads Solana Pay links; on Monad, any EVM wallet that reads EIP-681 links. Their wallet also pays the network fee.",
            "No account. They open the checkout, scan the QR code or tap the wallet button, and approve the payment in their wallet.",
          ],
        },
        ways: {
          title: "Three ways to charge",
          body: ["All three use the same checkout, dashboard and webhooks, so you can start with a link and move to the API when you need it."],
          points: [
            "Payment link: create it in the dashboard and send it by chat or email, or show its QR code. No code.",
            "Hosted checkout: send your customer to the link’s checkout page, open it from a pay button, or show it inside your page with one script tag.",
            "Payments API: create each payment from your server with one request, or with the TypeScript SDK, and draw your own payment screen.",
          ],
          links: { whatsappGuide: "Send a payment link on WhatsApp", integrations: "Try every integration option", embed: "Embed a payment" },
        },
        network: {
          title: "Which network to charge on",
          body: [
            "Charge on the network where your customers already hold USDC. USDC has a preset on Stellar and Solana, on their main and test networks, and on Monad’s main network. On all three, any other token can be charged by its issuer, mint or contract.",
          ],
          links: { networksGuide: "Stellar vs Solana vs Monad", stellar: "Stellar payments", solana: "Solana payments", monad: "Monad payments" },
        },
        cost: {
          title: "What it costs",
          body: [
            "Each payment pays your plan’s rate, the same on every network: {starterRate} on Starter, with no monthly fee. The payer’s wallet pays the network fee; on Monad, the fee of the relay that forwards the payment to you is deducted from the payment.",
          ],
          links: { fees: "Pricing and fee calculator", compare: "How our fees compare" },
        },
      },
      steps: {
        title: "Accept your first USDC payment, step by step",
        items: {
          sandbox: { title: "Create your account and switch to Sandbox", body: "Sign in to the dashboard and choose Sandbox at the top. What you create there runs on the test networks (Stellar Testnet, Solana Devnet and Monad Testnet) and moves no real money." },
          wallet: { title: "Add the wallet that receives the money", body: "In your organization’s settings, add a wallet on the network you will charge on and sign what the dashboard asks for, which proves the wallet is yours." },
          charge: { title: "Create a test charge", body: "In Payments, create a payment link with the network, the amount, the asset and the wallet that receives it. Or create a test API key (it starts with dv_) and call POST /v1/payment-intents/pay from your server. On Stellar Testnet you can charge in XLM, which Friendbot, the Testnet faucet, sends to a test account." },
          pay: { title: "Pay it from a test wallet", body: "Open the checkout page: it says it runs on a test network. Pay from a wallet on that network, and watch the checkout turn to Paid and the link to Succeeded in the dashboard." },
          confirm: { title: "Confirm payments on your server", body: "Add a webhook endpoint in the dashboard. When the network confirms a payment, Cosmos Pay sends PAYMENT_INTENT_SUCCEEDED, signed with HMAC-SHA256. Deliver the order when it arrives, not when the customer’s page says it is paid." },
          live: { title: "Switch to Production", body: "Choose Production in the dashboard and create a live API key (it starts with prod_). The same requests now charge on the main networks: the key decides the network, not the code." },
        },
        links: { gettingStarted: "Getting started", apiKeys: "API keys", webhooks: "Webhooks", paymentIntents: "Payment intents API" },
      },
      faq: {
        nocode: { q: "Can I accept USDC without writing code?", a: "Yes. Create a payment link in the dashboard and share it by chat or email, or show its QR code. Each payment’s status shows in the dashboard." },
        asset: { q: "Does my customer pay in USDC, and do I receive USDC?", a: "Yes. Your customer pays in the asset set on the link, and that same asset reaches your address." },
        test: { q: "Can I try it without real money?", a: "Yes. In Sandbox and with test keys (dv_), links run on test networks, and their checkout says that no real funds move." },
        refunds: { q: "Can a customer reverse a USDC payment?", a: "No. Once the network confirms a payment, it is final. A refund is a new payment you send from your wallet." },
      },
    },
    whatsapp: {
      nav: "Payment links on WhatsApp",
      title: "How to send a payment link on WhatsApp",
      meta: "Payment links on WhatsApp: create and share | Cosmos Pay",
      description: "Create a stablecoin payment link in the Cosmos Pay dashboard, send it on WhatsApp or as a printed QR code, and see the moment it is paid.",
      summary: "Create a link in the dashboard, send it in a chat or print its QR code, and see when it is paid.",
      lede: "Create a payment link in the Cosmos Pay dashboard, copy its checkout page address and paste it into the WhatsApp chat. Your customer opens it and pays from their own wallet on Stellar, Solana or Monad, and the link turns to Succeeded in your dashboard once the network confirms the payment.",
      sections: {
        before: {
          title: "Before you start",
          body: [
            "Add the wallet that will receive the money in your organization’s settings in the dashboard, on the network you will charge on. A payment link pays only into one of those wallets.",
            "Try it once in Sandbox: links there run on test networks, and their checkout says that no real funds move.",
          ],
        },
        customer: {
          title: "What your customer sees",
          body: [
            "The checkout page shows the amount, the asset, the network and the time left to pay. Your customer chooses how to pay: scan the QR code with a wallet app, open the payment in a wallet on the same device, or send it by hand with the details shown.",
            "The page opens in their browser’s language when it is one of the seven the checkout speaks: English, Spanish, Portuguese, French, German, Hindi and Chinese. It turns to Paid once the network confirms the payment and links the transaction on a public explorer. Your customer needs no account.",
          ],
        },
        know: {
          title: "Good to know",
          points: [
            "One link is one payment. Once it is paid it cannot be paid again, so create one per sale or invoice.",
            "A link is open for a limited time, shown on the checkout as a countdown. After that the checkout tells your customer to ask you for a new link; a payment that still arrives and is confirmed marks the link as paid.",
            "On Stellar and Solana you can leave the amount empty, and your customer chooses it. A Monad link needs an amount.",
            "Each payment pays your plan’s rate ({starterRate} on Starter, with no monthly fee). Your customer’s wallet pays the network fee.",
          ],
          links: { acceptGuide: "How to accept USDC payments online", paymentLinks: "Payment links API" },
        },
      },
      steps: {
        title: "Create the link and send it",
        items: {
          create: { title: "Create the link", body: "In the dashboard, open Payments and choose Create payment link. Pick the network, the amount and its asset, then the wallet that receives it and the checkout design. On Stellar and Solana you can add a message your customer sees in their wallet." },
          copy: { title: "Copy the checkout page", body: "When the link is ready, copy its checkout page address: payments.cosmospay.lat followed by the link’s id. It opens in any browser, on a phone or a computer." },
          send: { title: "Send it on WhatsApp", body: "Paste the address into the chat, with what the payment is for. A chat app’s preview shows a generic payment request card from Cosmos Pay, without the amount or your address. Email, text messages and any other chat app work the same way." },
          qr: { title: "Or print the QR code", body: "Download QR saves the link’s QR code as an image, the same code the checkout page shows. Your customer scans it with their wallet app. Print it, or show it on a screen, for a sale in person." },
          paid: { title: "See that it was paid", body: "The link’s page in the dashboard follows your customer: on the payment page, wallet opened, payment sent, paid. Once the network confirms the payment, the link shows Succeeded and, if you added a webhook endpoint, your server receives PAYMENT_INTENT_SUCCEEDED." },
        },
        links: { webhooks: "Webhooks", linkDemo: "Try the payment link demo" },
      },
      faq: {
        account: { q: "Does my customer need an account?", a: "No. They need a wallet on the link’s network that holds the asset. They open the link and approve the payment in their wallet." },
        reuse: { q: "Can I send the same link to several customers?", a: "No. A link is paid once. Create a new link for each sale." },
        preview: { q: "Does the WhatsApp preview show the amount?", a: "No. The preview is the same generic payment request card for every link. Your customer sees the amount when they open the checkout page." },
        expired: { q: "What if my customer opens the link after it expired?", a: "The checkout says the link has expired and tells them to ask you for a new one. Create another link and send it." },
      },
    },
    gateway: {
      nav: "Stablecoin payment gateways",
      title: "What is a stablecoin payment gateway?",
      meta: "What is a stablecoin payment gateway? | Cosmos Pay",
      description: "What a stablecoin payment gateway does, where the money settles, who pays network fees, custodial vs non-custodial, and how Cosmos Pay works.",
      summary: "What a gateway does, where the money settles, who pays the network fee, and custodial versus non-custodial.",
      lede: "A stablecoin payment gateway lets a business charge in stablecoins such as USDC. It creates the payment request, shows the customer how to pay from their own wallet and tells the business when the network has confirmed the payment. Some gateways receive the money and keep a balance for you; a non-custodial one, such as Cosmos Pay, has it paid to an address you control.",
      sections: {
        stablecoin: {
          title: "What a stablecoin is",
          body: [
            "A stablecoin is a token meant to keep a steady value against a currency, most often the US dollar. It moves on a blockchain like any other token, from one wallet to another, on any day and at any hour.",
            "USDC and EURC are two of them, both issued by Circle. Circle states that USDC can be redeemed one for one for US dollars, and EURC one for one for euros.",
          ],
          links: { circleUsdc: "USDC, on Circle’s site", circleEurc: "EURC, on Circle’s site" },
        },
        does: {
          title: "What the gateway does",
          points: [
            "It creates the payment request (the amount, the asset, the network and the address to pay) as a link and a QR code in the format wallets read: SEP-7 on Stellar, Solana Pay on Solana, EIP-681 on EVM networks such as Monad.",
            "It shows the customer a checkout page with that request, so they pay from the wallet they already use.",
            "It watches the network and matches each payment to its request, by a memo, a reference key or an address made for that payment.",
            "It tells the business once the network confirms the payment, in a dashboard and through a signed webhook to its server.",
          ],
        },
        settle: {
          title: "Where the money settles",
          body: [
            "Settlement is the moment the money reaches the business. With a stablecoin it happens on the network itself: once the network confirms the transfer, the payment is final and cannot be charged back. A refund is a new payment the business sends.",
          ],
        },
        fees: {
          title: "Who pays the network fee",
          body: [
            "Every transfer pays a fee to the network it runs on. With Cosmos Pay the payer’s wallet pays it, on Stellar, Solana and Monad. On Monad each payment goes to an address made for it, and the relay that forwards it to the business takes its fee from the payment; the API reports it on the payment as networkFee.",
            "The gateway’s own fee is separate. Cosmos Pay charges a rate per payment that depends on the plan: {starterRate} on Starter, with no monthly fee.",
          ],
          links: { fees: "Pricing and fee calculator" },
        },
        custody: {
          title: "Custodial and non-custodial gateways",
          body: [
            "A custodial gateway receives the payment into an account it controls and shows you a balance, which you withdraw later. A non-custodial gateway never holds the money: the payment goes to an address whose keys you hold.",
            "The difference is who controls the funds between the sale and the moment you use them, and who keeps the keys. With a non-custodial gateway you keep the keys, so looking after them is up to you.",
          ],
        },
        fit: {
          title: "How Cosmos Pay fits",
          body: [
            "Cosmos Pay is a non-custodial stablecoin payment gateway on Stellar, Solana and Monad. You charge with a payment link, the hosted checkout or the Payments API, and you choose the wallet addresses that receive the money. Cosmos Pay stores no one’s keys.",
            "On Stellar and Solana your customer pays your address directly. On Monad each payment goes to a deposit address made for it, which can only forward it to your address (less the relay’s fee): Cosmos Pay holds no key to it. Every payment can be checked on the network, and every paid checkout links its transaction on a public explorer.",
          ],
          links: { security: "How payments are protected", acceptGuide: "How to accept USDC payments online", integrations: "Integration options" },
        },
      },
      faq: {
        final: { q: "Can a stablecoin payment be charged back?", a: "No. Once the network confirms it, it is final. A refund is a payment the business sends back from its wallet." },
        custody: { q: "Does Cosmos Pay hold my money?", a: "No. On Stellar and Solana the payer pays your address directly. On Monad each payment goes to a deposit address made for it, which can only forward it to your address (less the relay’s fee): Cosmos Pay holds no key to it." },
        wallet: { q: "Do I need my own wallet?", a: "Yes. Payments go to an address you control on each network you accept, so the funds are yours from the first payment." },
        customers: { q: "Do my customers need an account?", a: "No account with Cosmos Pay. They need a wallet on the payment’s network that holds the stablecoin." },
      },
    },
    networks: {
      nav: "Stellar vs Solana vs Monad",
      title: "Stellar vs Solana vs Monad for accepting payments",
      meta: "Stellar vs Solana vs Monad for payments | Cosmos Pay",
      description: "How Stellar, Solana and Monad compare for accepting stablecoin payments with Cosmos Pay: link standard, assets, test networks, fees and rates.",
      summary: "The three networks side by side, as Cosmos Pay supports them: link format, assets, test networks and fees.",
      lede: "With Cosmos Pay, a payment on Stellar, Solana or Monad reaches your address and pays the same plan rate. What changes is the link the wallet reads (SEP-7 on Stellar, Solana Pay on Solana, EIP-681 to a deposit address on Monad), how a payment is matched to its link and which assets have a preset. The table compares them as Cosmos Pay supports them.",
      table: {
        title: "The three networks, side by side",
        caption: "Stellar, Solana and Monad compared for accepting payments with Cosmos Pay",
        topic: "Topic",
        rows: {
          link: { k: "Payment link", stellar: "SEP-7 (web+stellar:pay) and its QR code", solana: "Solana Pay transfer request (solana:) and its QR code", monad: "EIP-681 (ethereum:) and its QR code, to a deposit address made for that payment" },
          match: { k: "How a payment is matched", stellar: "A numeric memo on the link", solana: "A Solana Pay reference key on the link", monad: "Its own deposit address" },
          settle: { k: "Where the money goes", stellar: "Straight to your address", solana: "Straight to your address", monad: "A deposit address that can only forward it to your address" },
          fee: { k: "Network fee", stellar: "Paid by the payer’s wallet", solana: "Paid by the payer’s wallet", monad: "The payer’s wallet pays its transfer; the relay’s fee for forwarding is deducted from the payment" },
          presets: { k: "Assets with a preset" },
          test: { k: "Test network" },
          amount: { k: "Amount", stellar: "Fixed, or chosen by the payer", solana: "Fixed, or chosen by the payer", monad: "Required" },
          message: { k: "Message in the wallet", stellar: "Yes", solana: "Yes", monad: "No" },
          merchantFee: { k: "Your own fee on a payment", stellar: "The payer gives their account and pays both in one transaction", solana: "A Solana Pay transaction request with both transfers", monad: "The deposit address splits the payment" },
          wallets: { k: "Wallets that pay", stellar: "Any wallet that opens SEP-7 links, such as {wallets}", solana: "Any wallet that reads Solana Pay links, such as {wallets}", monad: "Any EVM wallet that reads EIP-681 links" },
          private: { k: "Private payments", stellar: "Yes, on Testnet for now", solana: "No", monad: "No" },
          rate: { k: "Cosmos Pay rate", value: "Your plan’s rate ({starterRate} on Starter)" },
        },
        note: "The assets with a preset are the ones the dashboard offers by name; each network’s page lists their addresses. Any other token goes by its issuer, mint or contract.",
      },
      sections: {
        choose: {
          title: "How to choose",
          body: ["One account takes payments on all three networks, and each link names the one it settles on. These differences decide where a payment fits:"],
          points: [
            "Charge where your customers already hold the stablecoin. The same API keys and webhook endpoints serve all three networks.",
            "To let the customer choose the amount, as for donations, use Stellar or Solana: a Monad link needs an amount.",
            "To show a message in the customer’s wallet, such as an order number, use Stellar or Solana.",
            "To keep the amount private on-chain, use private payments: they run on Stellar, on Testnet for now.",
          ],
          links: { stellar: "Stellar payments", solana: "Solana payments", monad: "Monad payments" },
        },
        fees: {
          title: "What it costs on each network",
          body: [
            "Cosmos Pay charges your plan’s rate per payment, the same on Stellar, Solana and Monad: {starterRate} on Starter, with no monthly fee. The payer’s wallet pays the network fee on all three. On Monad, the relay’s fee for forwarding the payment to you is deducted from the payment, and the checkout shows it.",
          ],
          links: { fees: "Pricing and fee calculator", compare: "How our fees compare" },
        },
      },
      faq: {
        all: { q: "Can I accept payments on all three networks?", a: "Yes. Each payment link settles on one network, which you choose when you create it. The same account, API keys and webhooks work for all three." },
        test: { q: "Can I test on all three?", a: "Yes. Sandbox and test keys (dv_) create links on Stellar Testnet, Solana Devnet and Monad Testnet. Monad Testnet has no USDC preset: charge in MON there, or name a token by its contract." },
        fees: { q: "Is Cosmos Pay cheaper on one network?", a: "No. Your plan’s rate is the same on all three. The payer’s wallet pays the network fee, and on Monad the relay’s fee for forwarding a payment is deducted from the payment." },
      },
    },
  },
};

export type LearnMessages = typeof en;

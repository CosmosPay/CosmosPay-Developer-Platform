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
    lede: "Guides for businesses that charge in stablecoins with Cosmos Pay: how to accept USDC online and on each network (Stellar with SEP-7, Solana with Solana Pay, Monad with EIP-681), how to add a pay button to your site, how to take donations with an open amount, how to send a payment link on WhatsApp, how to confirm payments on your server, what a stablecoin payment gateway does, how the three networks compare, how to swap across chains and how to send USDT0 from Stellar to EVM networks.",
    meta: "Stablecoin payment guides | Cosmos Pay",
    description: "Guides: accept USDC online and on each network, pay buttons, donations, webhooks, WhatsApp links, cross-chain swaps and USDT0 from Stellar.",
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
          links: { sep7: "The SEP-7 standard (Stellar)", solanaPay: "The Solana Pay specification", eip681: "The EIP-681 standard (Ethereum)" },
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
        links: { sep7: "The SEP-7 standard (Stellar)", solanaPay: "The Solana Pay specification", eip681: "The EIP-681 standard (Ethereum)" },
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
    solanaPay: {
      nav: "USDC with Solana Pay",
      title: "How to accept USDC with Solana Pay links",
      meta: "Solana Pay payment links, step by step | Cosmos Pay",
      description: "Charge in USDC on Solana with a Solana Pay link and QR code: what the link holds, how to test on Devnet and how each payment is confirmed.",
      summary: "Create a Solana Pay link for USDC, test it on Devnet, and see each payment confirmed on your server.",
      lede: "With Cosmos Pay, a payment link on Solana is a Solana Pay transfer request: your customer scans its QR code or opens it in a wallet such as Phantom or Solflare and approves the USDC payment there. The USDC goes straight to your wallet, and Cosmos Pay marks the link as paid once Solana confirms the transaction. Try it on Devnet before you charge real money.",
      sections: {
        what: {
          title: "What a Solana Pay link holds",
          body: [
            "Solana Pay is a standard for payment requests that Solana wallets read: a solana: link, or its QR code, with the address to pay, the amount, the token and a message.",
            "Cosmos Pay adds a reference key made for each link. The wallet includes it in the transaction, and Cosmos Pay looks for that key on Solana to match the payment to its link. It accepts the payment only when the transaction succeeded and the exact amount reached your address.",
          ],
          links: { solanaPay: "The Solana Pay specification", solana: "Solana payments" },
        },
        need: {
          title: "What you and your customer need",
          points: [
            "You: a Solana address that receives the money, added to your organization in the dashboard and proved yours with a signature.",
            "Your customer: a Solana wallet that reads Solana Pay links, such as Phantom or Solflare, holding the USDC and a little SOL for the network fee. No account with Cosmos Pay.",
            "For tests: Sandbox, where links run on Solana Devnet. USDC has a preset there too, so you can test with Devnet USDC.",
          ],
        },
        api: {
          title: "Create the link from your server",
          body: [
            "With the Payments API, call POST /v1/payment-intents/pay with chain set to solana, your address as the destination and, for USDC, the asset code USDC with its mint as the issuer. With the TypeScript SDK (version 2.2 or later), pass chain: 'solana' to client.paymentIntents.createPay.",
            "The response carries the link (its uri starts with solana:) and its QR code. Show the QR code, open the link in your customer’s wallet, or send them to the hosted checkout: payments.cosmospay.lat followed by the link’s id.",
          ],
          links: { paymentIntents: "Payment intents API", sdkPaymentIntents: "Payment intents in the SDK" },
        },
        know: {
          title: "Good to know",
          points: [
            "You can leave the amount empty and let your customer choose it, as for donations. A link that adds your own fee needs an amount.",
            "A message of up to 300 characters, such as an order number, shows in your customer’s wallet.",
            "With your own fee on the payment, the link becomes a Solana Pay transaction request that pays your wallet and your fee wallet in one transaction.",
            "A link is open for a limited time, shown on the checkout as a countdown. A payment that still arrives and is confirmed marks it as paid.",
            "Your customer’s wallet pays the Solana network fee, in SOL. Each payment pays your plan’s rate, the same as on every network.",
          ],
          links: { fees: "Pricing and fee calculator", networksGuide: "Stellar vs Solana vs Monad" },
        },
      },
      steps: {
        title: "Accept your first Solana Pay payment",
        items: {
          sandbox: { title: "Switch to Sandbox", body: "Sign in to the dashboard and choose Sandbox at the top. Links you create there run on Solana Devnet and move no real money." },
          wallet: { title: "Add your Solana wallet", body: "In your organization’s settings, add the Solana address that will receive the money and sign what the dashboard asks for, which proves the wallet is yours." },
          create: { title: "Create the link", body: "In Payments, choose Create payment link, pick Solana and change the asset to USDC (the picker starts on SOL). Enter the amount, or leave it empty for your customer to choose, then pick your wallet and, if you like, a message." },
          pay: { title: "Pay it from a wallet", body: "Open the checkout page and scan its QR code with a Solana wallet, or open the link on the same device. Approve the payment in the wallet, and the checkout turns to Paid once Solana confirms it." },
          confirm: { title: "Confirm it on your server", body: "Add a webhook endpoint in the dashboard. When the payment is confirmed, Cosmos Pay sends PAYMENT_INTENT_SUCCEEDED, signed with HMAC-SHA256. Deliver the order when it arrives." },
          live: { title: "Switch to Production", body: "Choose Production and create a live API key (it starts with prod_). Links now run on Solana’s main network, where USDC has its own preset." },
        },
        links: { webhooksGuide: "How to confirm a payment on your server", apiKeys: "API keys" },
      },
      faq: {
        wallets: { q: "Which wallets can pay a Solana Pay link?", a: "Any Solana wallet that reads Solana Pay links, such as Phantom or Solflare. Your customer scans the QR code or opens the link, and approves the payment in the wallet." },
        sol: { q: "Does my customer need SOL?", a: "Yes, a little. Their wallet pays the Solana network fee in SOL, on top of the USDC they send." },
        direct: { q: "Does the USDC pass through Cosmos Pay?", a: "No. On Solana your customer’s wallet sends the USDC straight to your address. Cosmos Pay finds the payment on the network by the link’s reference key." },
        devnet: { q: "Can I test without real money?", a: "Yes. In Sandbox and with test keys (dv_), links run on Solana Devnet, where USDC has a preset, and the checkout says that no real funds move." },
      },
    },
    webhooks: {
      nav: "Confirm payments on your server",
      title: "How to confirm a stablecoin payment on your server",
      meta: "Confirm stablecoin payments with webhooks | Cosmos Pay",
      description: "Confirm stablecoin payments on your server with signed webhooks: verify the signature, answer fast, handle retries and duplicates, and test it first.",
      summary: "Deliver orders from a signed webhook, not from your customer’s page: verify it, answer fast and skip duplicates.",
      lede: "To confirm a stablecoin payment, let your server act on Cosmos Pay’s signed webhook, not on the page your customer sees. When the network confirms a payment, Cosmos Pay sends PAYMENT_INTENT_SUCCEEDED to your endpoint, signed with that endpoint’s secret. Verify the signature, answer with a 2xx status and deliver the order once per event.",
      sections: {
        why: {
          title: "Why your server, not the browser",
          body: [
            "A checkout that says Paid is only what your customer’s browser shows. The tab can close before it returns to your site, and anyone can open your success page by hand. The network’s confirmation is what makes a payment final.",
            "Cosmos Pay watches the network for you and tells your server when a payment is confirmed. Your server is the place to mark the order as paid and deliver it.",
          ],
        },
        how: {
          title: "What Cosmos Pay sends",
          points: [
            "An HTTPS POST to the endpoint you register, with a JSON event: id (it starts with evt_), type, createdAt and data. For a payment, data is the payment with its status, amount, asset, network and transaction.",
            "The X-Cosmos-Signature header: t=<unix time>,v1=<signature>. The signature is the HMAC-SHA256 of t, a dot and the raw body, keyed with the endpoint’s secret, in hexadecimal.",
            "The event types you choose, such as PAYMENT_INTENT_SUCCEEDED, PAYMENT_INTENT_FAILED or ZK_PAYMENT_SUCCEEDED. Match them as written, in capitals with underscores.",
            "The X-Cosmos-Event, X-Cosmos-Event-Id and X-Cosmos-Delivery headers, which name the event and the delivery.",
          ],
          links: { webhooks: "Webhooks in the SDK", webhooksApi: "Webhooks API" },
        },
        retries: {
          title: "When your server does not answer",
          body: [
            "Only a 2xx answer counts as delivered, and redirects are not followed. Cosmos Pay retries a failed delivery up to three times with a growing pause, then again in later rounds, and the event keeps its id on every attempt.",
            "In the dashboard, each endpoint lists its deliveries, with a filter for the failed ones, and you can send any of them again. Cosmos Pay keeps a delivery’s body for 30 days, so redeliver within that time.",
          ],
        },
        validate: {
          title: "Or check a payment yourself",
          body: [
            "You can also ask about one payment: fetch it by its id to read its status, or send its transaction hash (on Solana, the transaction signature) to POST /v1/payment-intents/:id/validate. Use it as a fallback, for example when your customer returns before the webhook arrives; the webhook stays the main signal.",
          ],
          links: { paymentIntents: "Payment intents API" },
        },
      },
      steps: {
        title: "Set up a webhook, step by step",
        items: {
          endpoint: { title: "Add an endpoint", body: "In the dashboard, open Webhooks and add the HTTPS address of a route on your server. Choose the events to receive; PAYMENT_INTENT_SUCCEEDED comes selected. The address must be public: private and local addresses are refused." },
          secret: { title: "Store the secret", body: "The dashboard shows the endpoint’s secret (it starts with whsec_) only once. Keep it in your server’s environment, never in a web page." },
          verify: { title: "Verify every request", body: "Read the raw body before any JSON parser and check X-Cosmos-Signature against it. With the TypeScript SDK, Webhooks.constructEvent checks the signature, refuses one older than five minutes by default and returns the event." },
          answer: { title: "Answer fast, then work", body: "Reply with a 2xx status as soon as the signature checks out, and do the slow work, such as emails or stock updates, after that." },
          dedupe: { title: "Handle each event once", body: "Store the id of each event you handle and skip one you have seen: a retry or a redelivery sends the same event again." },
          test: { title: "Send a test", body: "Use Send test on the endpoint to receive a ping event, then make a test payment in Sandbox and watch its delivery in the endpoint’s list." },
        },
        links: { webhooks: "Webhooks in the SDK", gettingStarted: "Getting started" },
      },
      faq: {
        name: { q: "The dashboard shows payment_intent.succeeded. Which name does the event carry?", a: "The event’s type is PAYMENT_INTENT_SUCCEEDED, in capitals with underscores. The dashboard only displays it in a shorter form." },
        rotate: { q: "What happens when I rotate the secret?", a: "The new secret works at once and the old one stops at once, so update your server right after you rotate it." },
        down: { q: "What if my server was down?", a: "Cosmos Pay retries failed deliveries, and you can send any delivery again from the dashboard for 30 days." },
        several: { q: "Can I have several endpoints?", a: "Yes. Each endpoint has its own address, events and secret, and every event goes to each endpoint that subscribes to it." },
      },
    },
    usdt0: {
      nav: "USDT0 from Stellar",
      title: "How to send USDT0 from Stellar to EVM networks",
      meta: "Send USDT0 from Stellar to EVM networks | Cosmos Pay",
      description: "Send USDT0 from a Stellar account to Ethereum, Arbitrum and other EVM networks with Cosmos Pay: routes, fees in XLM, timing and every step.",
      summary: "Move USDT0 from Stellar to an EVM network through LayerZero: pick a route, see the fees, sign once and follow delivery.",
      lede: "With Cosmos Pay you can send USDT0 from a Stellar account to an address on Ethereum, Arbitrum or another of 21 EVM networks. You get a quote with every fee in XLM, sign one Stellar transaction in your wallet, and the transfer arrives in about 27 minutes. Ethereum receives native USDT; every other network receives USDT0.",
      sections: {
        what: {
          title: "What USDT0 is",
          body: [
            "USDT0 is the omnichain form of Tether’s USDT. Its issuer describes a lock-and-mint design: USDT is locked on Ethereum and the same amount of USDT0 is minted on the other networks, which move it between them with LayerZero’s Omnichain Fungible Token (OFT) standard.",
            "On Stellar, USDT0 is an asset like any other, so the account that sends it needs a trustline to it and a USDT0 balance.",
          ],
          links: { usdt0Site: "USDT0, on its issuer’s site", usdt0Network: "How the USDT0 network works", layerzeroOft: "LayerZero’s OFT standard" },
        },
        routes: {
          title: "Where it can go",
          body: [
            "Cosmos Pay offers 21 routes, all to EVM networks, each to an address of 0x and 40 hexadecimal characters. Ethereum receives native USDT; Arbitrum and the others receive USDT0. The API’s routes call lists them with their names.",
            "Transfers run on the main networks only: with a test key (dv_), the API answers that no route is available.",
          ],
          links: { usdt0Docs: "USDT0 in the SDK", usdt0Api: "USDT0 API" },
        },
        cost: {
          title: "What it costs",
          points: [
            "LayerZero’s messaging fee, in XLM. The transaction allows up to 20% more, and what it does not use comes back in the same transaction.",
            "The Stellar network fee, in XLM.",
            "Any Cosmos Pay commission, which the quote shows before you sign.",
            "The sending account pays them all in XLM, so keep some XLM there besides the USDT0.",
          ],
        },
        know: {
          title: "Good to know",
          points: [
            "The transaction has a short time limit, given as expiresAt: sign and submit it before then, or create a new transfer.",
            "Stellar amounts have 7 decimals and the OFT carries 6, so a 7th decimal stays in your account as dust.",
            "Cosmos Pay never holds a key: the API builds the transaction, your wallet signs it and the API relays it.",
            "You can also send USDT0 from the dashboard’s swap panel, where it appears as the USDT0 bridge.",
          ],
        },
      },
      steps: {
        title: "Send USDT0, step by step",
        items: {
          hold: { title: "Hold USDT0 on Stellar", body: "The sending account needs a trustline to USDT0, a USDT0 balance and some XLM for the fees." },
          quote: { title: "Get a quote", body: "Call quote with the route and the amount. It returns what is sent, what arrives, the dust that stays, every fee and the limits, and saves nothing." },
          create: { title: "Create the transfer", body: "Call create with the Stellar account that sends, the route, the EVM address that receives and the amount. The API builds one Stellar transaction for it." },
          sign: { title: "Sign it in your wallet", body: "Sign the transaction (its XDR) with the wallet that holds the USDT0, or open its SEP-7 link in that wallet." },
          submit: { title: "Submit it", body: "Send the signed transaction to submit. If the network refuses it, the transfer stays pending: fix the cause and submit again before it expires." },
          follow: { title: "Follow it to delivery", body: "The transfer moves from PENDING to SUBMITTED to DELIVERED, in about 27 minutes on every route, while LayerZero’s verifiers wait for Stellar’s confirmations. Once delivered, it carries the destination network’s transaction and a LayerZero Scan link." },
        },
        links: { usdt0Docs: "USDT0 in the SDK", usdt0Api: "USDT0 API" },
      },
      faq: {
        arrive: { q: "What does the receiving address get?", a: "On Ethereum, native USDT. On every other route, USDT0." },
        time: { q: "How long does a transfer take?", a: "About 27 minutes on every route, as measured on LayerZero Scan: LayerZero’s verifiers wait for Stellar’s confirmations before the transfer is delivered." },
        test: { q: "Can I try it on a test network?", a: "No. USDT0 transfers run on the main networks only; with a test key, no route is available." },
        custody: { q: "Does Cosmos Pay hold my USDT0?", a: "No. Your wallet signs the transaction that sends it; Cosmos Pay only builds and relays it." },
      },
    },
    stellarHowTo: {
      nav: "USDC on Stellar",
      title: "How to accept USDC on Stellar with SEP-7 links",
      meta: "Stellar SEP-7 payment links, step by step | Cosmos Pay",
      description: "Accept USDC on Stellar with a SEP-7 link and QR code: the trustline your account needs, testing on Testnet and how each payment is matched.",
      summary: "Charge USDC on Stellar with a SEP-7 link: prepare your account, test on Testnet and see each payment confirmed.",
      lede: "With Cosmos Pay, a payment link on Stellar is a SEP-7 request: your customer scans its QR code or opens it in a wallet such as Freighter, LOBSTR or xBull and approves the USDC payment there. The USDC goes straight to your Stellar account, and Cosmos Pay marks the link as paid once it finds the payment by the link’s memo. Your account must already trust USDC to receive it.",
      sections: {
        what: {
          title: "What a SEP-7 link holds",
          body: [
            "SEP-7 is Stellar’s standard for payment requests: a web+stellar:pay link, or its QR code, with your address, the amount, the asset and its issuer, and a numeric memo.",
            "Cosmos Pay creates a memo for each link and watches your account’s payments for it. It accepts a payment with that memo, to your address, in the link’s asset and, when the link fixes an amount, for exactly that amount, made after the link was created.",
          ],
          links: { sep7: "The SEP-7 standard (Stellar)", stellar: "Stellar payments" },
        },
        prepare: {
          title: "Prepare your account",
          points: [
            "Your Stellar account must exist on the network and trust USDC before it can receive it. Cosmos Pay does not check this when you add the account, and a payment to an account without the trustline fails after your customer signs.",
            "Add the account to your organization in the dashboard and sign what it asks for, which proves the account is yours.",
            "For tests, do the same on Testnet. Friendbot, the Testnet faucet, sends test XLM to an account, and links can charge in XLM there.",
          ],
        },
        payer: {
          title: "What your customer needs",
          points: [
            "A Stellar wallet that opens SEP-7 links, such as Cosmos Pay Wallet, Freighter, LOBSTR, xBull, Albedo or Rabet, holding the USDC and some XLM for the network fee. No account with Cosmos Pay.",
            "A direct USDC payment. A wallet that converts another asset into USDC on the way (a path payment) does not settle the link.",
            "On Testnet, the wallet set to Testnet before paying: the link does not name the network, and a wallet that follows SEP-7 then assumes the main one.",
          ],
        },
        api: {
          title: "Create the link from your server",
          body: [
            "Call POST /v1/payment-intents/pay with your account as the destination, the amount and, for USDC, the asset code with its issuer, or use client.paymentIntents.createPay in the TypeScript SDK: Stellar is the default chain. The response carries the link (its uri starts with web+stellar:pay) and its QR code.",
            "When you know your customer’s account, a transaction intent (POST /v1/payment-intents/tx, or createTx in the SDK) returns an unsigned transaction for them to sign instead. It must be signed within five minutes.",
            "If you set your own memo, use it for one payment only: the same memo with different terms is refused.",
          ],
          links: { paymentIntents: "Payment intents API", sdkPaymentIntents: "Payment intents in the SDK" },
        },
        know: {
          title: "Good to know",
          points: [
            "You can leave the amount empty and let your customer choose it. A message of up to 300 characters shows in your customer’s wallet.",
            "With your own fee on the payment, the checkout asks for your customer’s account and builds one transaction that pays you and your fee wallet.",
            "In the dashboard, a pending Stellar link has a check that settles it from a transaction hash.",
            "A payment that arrives after the link expired is settled by sending its transaction hash to POST /v1/payment-intents/:id/validate.",
            "Your customer’s wallet pays the Stellar network fee, in XLM. Private payments, which hide the amount on-chain, run on Stellar in XLM, on Testnet for now.",
          ],
          links: { fees: "Pricing and fee calculator", networksGuide: "Stellar vs Solana vs Monad" },
        },
      },
      steps: {
        title: "Accept your first USDC payment on Stellar",
        items: {
          sandbox: { title: "Switch to Sandbox", body: "Sign in to the dashboard and choose Sandbox at the top. Links you create there run on Stellar Testnet and move no real money." },
          wallet: { title: "Add your Stellar account", body: "Make sure the account exists and trusts USDC, then add it in your organization’s settings and sign what the dashboard asks for." },
          create: { title: "Create the link", body: "In Payments, choose Create payment link, pick Stellar, the amount (or none) and USDC, then your account and, if you like, a message." },
          pay: { title: "Pay it from a wallet", body: "Open the checkout page and scan its QR code with a Stellar wallet set to the same network, or open the link on the same device. Approve the payment, and the checkout turns to Paid once Cosmos Pay finds it." },
          confirm: { title: "Confirm it on your server", body: "Add a webhook endpoint in the dashboard. When the payment is confirmed, Cosmos Pay sends PAYMENT_INTENT_SUCCEEDED, signed with HMAC-SHA256. Deliver the order when it arrives." },
          live: { title: "Switch to Production", body: "Choose Production and create a live API key (it starts with prod_). Links now run on Stellar’s main network, where Circle’s USDC is the preset." },
        },
        links: { webhooksGuide: "How to confirm a payment on your server", apiKeys: "API keys" },
      },
      faq: {
        trustline: { q: "Why did a payment to my account fail?", a: "The most common reason is a missing USDC trustline on the receiving account. Add the trustline, then create a new link and send it again." },
        wallets: { q: "Which wallets can pay a SEP-7 link?", a: "Any Stellar wallet that opens SEP-7 links, such as Cosmos Pay Wallet, Freighter, LOBSTR, xBull, Albedo or Rabet." },
        convert: { q: "Can my customer pay a USDC link with XLM?", a: "No. Only a direct USDC payment settles it: a payment that converts XLM into USDC on the way does not." },
        test: { q: "Can I test without real money?", a: "Yes. In Sandbox and with test keys (dv_), links run on Stellar Testnet, where USDC has a preset and Friendbot sends test XLM." },
      },
    },
    monadHowTo: {
      nav: "USDC on Monad",
      title: "How to accept USDC on Monad with EIP-681 links",
      meta: "Monad EIP-681 payment links, step by step | Cosmos Pay",
      description: "Accept USDC on Monad with an EIP-681 link and QR code: the deposit address made for each payment, the amount it needs, testing and confirmation.",
      summary: "Charge USDC on Monad with an EIP-681 link to a deposit address made for the payment, and see it confirmed.",
      lede: "With Cosmos Pay, a payment link on Monad is an EIP-681 request to a deposit address made for that payment: your customer scans its QR code with an EVM wallet and approves the USDC transfer. The deposit address can only forward the money to your address, and Cosmos Pay marks the link as paid once it does. Every Monad link needs an amount.",
      sections: {
        what: {
          title: "What an EIP-681 link holds",
          body: [
            "EIP-681 is the Ethereum standard for payment requests that EVM wallets read: an ethereum: link, or its QR code, with the token, the network and the amount. Monad’s main network has chain id 143, and its Testnet 10143.",
            "The link pays a deposit address made for that payment, not your address directly. Its code can only send what it receives to your address, so Cosmos Pay holds no key that could move the money anywhere else.",
          ],
          links: { eip681: "The EIP-681 standard (Ethereum)", monad: "Monad payments" },
        },
        deposit: {
          title: "How the deposit address pays you",
          points: [
            "Cosmos Pay watches the deposit address. Once it holds at least the amount, a relay forwards the money to your address, and that forward settles the link.",
            "The relay may take a fee from the payment for forwarding it. The checkout shows it, and the API reports it on the payment as networkFee.",
            "More than the amount is forwarded to you in full. Less than the amount does not settle the link.",
            "Your customer’s wallet pays the Monad network fee for its own transfer, in MON.",
          ],
        },
        api: {
          title: "Create the link from your server",
          body: [
            "Call POST /v1/payment-intents/pay with chain set to monad, your address as the destination, the amount and, for USDC, the asset code with its contract as the issuer, or pass chain: 'monad' to client.paymentIntents.createPay in the TypeScript SDK (version 2.2 or later). The response carries the link (its uri starts with ethereum:) and its QR code.",
            "Monad links take no message. To confirm a payment before the forward lands, send your customer’s transaction hash (0x and 64 hexadecimal characters) to POST /v1/payment-intents/:id/validate.",
          ],
          links: { paymentIntents: "Payment intents API", sdkPaymentIntents: "Payment intents in the SDK" },
        },
        know: {
          title: "Good to know",
          points: [
            "A link is open for a limited time. A full payment that still arrives afterwards is forwarded to you and marks the link as paid.",
            "Another payment to the same deposit address is forwarded to your address too.",
            "With your own fee on the payment, the deposit address splits it: your fee to your fee wallet and the rest to you.",
            "Each payment pays your plan’s rate, the same as on every network.",
          ],
          links: { fees: "Pricing and fee calculator", networksGuide: "Stellar vs Solana vs Monad" },
        },
      },
      steps: {
        title: "Accept your first USDC payment on Monad",
        items: {
          sandbox: { title: "Switch to Sandbox", body: "Sign in to the dashboard and choose Sandbox at the top. Links you create there run on Monad Testnet, which has no USDC preset: charge in MON, or name a token by its contract." },
          wallet: { title: "Add your Monad address", body: "In your organization’s settings, add the EVM address that will receive the money on Monad and sign what the dashboard asks for, which proves it is yours." },
          create: { title: "Create the link", body: "In Payments, choose Create payment link, pick Monad, enter the amount (it is required) and the asset, then your address." },
          pay: { title: "Pay it from a wallet", body: "Open the checkout page and scan its QR code with an EVM wallet that reads EIP-681 links, on the same network. Approve the transfer, and the checkout turns to Paid once the payment is forwarded to you." },
          confirm: { title: "Confirm it on your server", body: "Add a webhook endpoint in the dashboard. When the payment is confirmed, Cosmos Pay sends PAYMENT_INTENT_SUCCEEDED, signed with HMAC-SHA256. Deliver the order when it arrives." },
          live: { title: "Switch to Production", body: "Choose Production and create a live API key (it starts with prod_). Links now run on Monad’s main network, where USDC has its own preset." },
        },
        links: { webhooksGuide: "How to confirm a payment on your server", apiKeys: "API keys" },
      },
      faq: {
        why: { q: "Why does the link pay a deposit address and not my address?", a: "Each payment gets its own address, so Cosmos Pay can tell payments apart without a memo. The address can only forward what it receives to your address." },
        fees: { q: "Who pays the fees on Monad?", a: "Your customer’s wallet pays the network fee for its transfer. The relay’s fee for forwarding, when there is one, is taken from the payment and shown on the checkout." },
        amount: { q: "Can my customer choose the amount?", a: "No. A Monad link needs an amount. For open amounts, use a Stellar or Solana link." },
        test: { q: "Can I test on Monad?", a: "Yes. In Sandbox and with test keys (dv_), links run on Monad Testnet. It has no USDC preset, so charge in MON or name a token by its contract." },
      },
    },
    embed: {
      nav: "Pay button on your site",
      title: "How to add a crypto pay button or checkout to your website",
      meta: "Add a crypto pay button to your website | Cosmos Pay",
      description: "Add a pay button or an embedded checkout to any website with one script tag and no API key in the page: attributes, events, CSP and testing.",
      summary: "Load one script, add a pay button or an embedded checkout for a payment link, and confirm the payment on your server.",
      lede: "To take a stablecoin payment on your own website, load the Cosmos Pay embed script once and add a cosmos-pay-button or a cosmos-pay-checkout element with a payment link’s id. The button opens the hosted checkout in a popup, and the embedded checkout draws the payment inside your page. The page needs no API key, and your server confirms the payment through a signed webhook.",
      sections: {
        what: {
          title: "Button or embedded checkout",
          points: [
            "The pay button (cosmos-pay-button) opens the hosted checkout in a popup centred on your page. If the browser blocks the popup, the same tab goes to the checkout instead.",
            "The embedded checkout (cosmos-pay-checkout) draws the payment inside your page, up to 420 pixels wide: the amount, the QR code, a button that opens the payer’s wallet and the live status.",
            "Both work for payment links on Stellar, Solana and Monad, in English, Spanish, Portuguese, French, German, Hindi and Chinese.",
          ],
        },
        link: {
          title: "Where the link comes from",
          body: [
            "Each element shows one payment link, named by its id in the link attribute. Create the link in the dashboard, or from your server with the Payments API or the TypeScript SDK when your customer checks out, and put its id in the page. The page reads the link without an API key, so your secret key stays on your server.",
            "Show one embedded checkout per payment: a link is paid once.",
          ],
          links: { paymentLinks: "Payment links API", acceptGuide: "How to accept USDC payments online" },
        },
        options: {
          title: "Attributes and styling",
          points: [
            "link: the payment link’s id. Required.",
            "lang: the language, such as es or es-AR. By default, the payer’s browser language, else English.",
            "theme: light (the default), dark, or auto, which follows the payer’s system setting.",
            "demo: shows a sample that cannot be paid and sends no request, for showcases.",
            "Text inside the button replaces its label, and ::part(button) and ::part(card) let your CSS restyle the elements.",
          ],
        },
        confirm: {
          title: "Events and confirming the payment",
          body: [
            "Both elements fire cosmospay:status and cosmospay:paid events on your page, with the link’s id and status. Use them to update what the payer sees, not to deliver the order: an event in the page can be faked.",
            "Deliver the order when your server receives PAYMENT_INTENT_SUCCEEDED, the signed webhook Cosmos Pay sends once the network confirms the payment. If your page sends a Cross-Origin-Opener-Policy of same-origin, or the popup is blocked, the button sends no events.",
          ],
          links: { webhooksGuide: "How to confirm a payment on your server" },
        },
      },
      steps: {
        title: "Add a pay button, step by step",
        items: {
          script: { title: "Load the script", body: "Add one script tag to your page, once: https://payments.cosmospay.lat/embed/cosmos-pay.js, with the defer attribute." },
          link: { title: "Get a payment link", body: "Create a link in the dashboard, or from your server when your customer checks out, and keep its id." },
          element: { title: "Add the element", body: "Write a cosmos-pay-button or a cosmos-pay-checkout element with link set to that id, and lang or theme if you like." },
          csp: { title: "Allow it in your CSP", body: "If your site sends a Content Security Policy, allow script-src https://payments.cosmospay.lat, connect-src https://api.cosmospay.lat and img-src data:." },
          test: { title: "Test it", body: "Use a link created in Sandbox: the embedded checkout says it runs on a test network. The demo attribute shows a sample without any link." },
          confirm: { title: "Confirm it on your server", body: "Add a webhook endpoint and deliver the order when PAYMENT_INTENT_SUCCEEDED arrives." },
        },
        links: { embed: "Embed a payment (docs)", webhooks: "Webhooks" },
      },
      faq: {
        key: { q: "Does the page need my API key?", a: "No. The elements read the payment link without a key. Create links on your server, where the key stays." },
        iframe: { q: "Is the embedded checkout an iframe?", a: "No. It draws inside your page in its own shadow DOM, so no frame-src rule is needed. The hosted checkout itself cannot be framed." },
        reuse: { q: "Can one button take many payments?", a: "No. A link is paid once, so give each payment its own link, for example by creating it on your server when the customer checks out." },
        sites: { q: "Does it work on any website?", a: "Yes, on any page that can load a script, as long as its Content Security Policy allows the script, the API and data: images." },
      },
    },
    crossChain: {
      nav: "Cross-chain swaps",
      title: "How to swap tokens between Stellar, Solana and Monad",
      meta: "Swap tokens between Stellar, Solana and Monad | Cosmos Pay",
      description: "Swap tokens across Stellar, Solana, Monad and 32 more networks with Cosmos Pay and NEAR Intents: the quote, the deposit, fees, refunds and timing.",
      summary: "Quote a swap, send the deposit and follow it to delivery: cross-chain swaps through NEAR Intents, refunded on the origin chain if they fail.",
      lede: "Cosmos Pay swaps tokens between Stellar, Solana, Monad and the other networks NEAR Intents reaches, 35 in all. You get a quote, send the input amount to a deposit address before the quote expires, and the output arrives at your address on the other network. If the swap cannot complete, the input is refunded to your address on the network you sent from.",
      sections: {
        how: {
          title: "How a cross-chain swap works",
          points: [
            "Quote: the API asks NEAR Intents for a price and returns what you send, what you receive after every fee, and your plan’s commission. A quote saves nothing.",
            "Create: the live quote gives a deposit address (on Stellar, with a memo), a payment link with its QR code, and a deadline, 30 minutes by default.",
            "Deposit: send the input amount to that address before the deadline. You can also report the deposit to the API.",
            "Delivery: the swap moves through deposit detected and processing to succeeded, when the output reaches your address.",
          ],
        },
        refunds: {
          title: "When it does not complete",
          points: [
            "A swap that cannot complete is refunded to the refund address you gave, on the network you sent from.",
            "An expired quote is not the end of the story: a deposit that still arrives is refunded. Cosmos Pay keeps watching an expired swap for 24 hours.",
            "The final states are succeeded, refunded and failed.",
          ],
        },
        fees: {
          title: "What it costs",
          body: [
            "The quote shows Cosmos Pay’s commission in the asset you send: your plan’s swap rate, 0.65% on Starter and on the public swaps page, down to 0.07% on Enterprise. The amount you receive in the quote is already net of every fee, including the network and provider costs.",
            "Slippage is 1% by default and at most 5%.",
          ],
          links: { fees: "Pricing and fee calculator" },
        },
        where: {
          title: "Where you can swap",
          points: [
            "On the public swaps page, with no account: it uses a shared public key and charges the 0.65% rate.",
            "In the dashboard’s swap panel, in Production.",
            "With the API (/v1/cross-chain-swaps), or with client.crossChainSwaps in the TypeScript SDK, which covers Stellar, Solana and Monad.",
            "On the main networks only: a test key (dv_) can list assets and get quotes, but not create a swap.",
          ],
          links: { swaps: "The swaps page", crossChainApi: "Cross-chain swaps API" },
        },
      },
      steps: {
        title: "Run your first cross-chain swap",
        items: {
          route: { title: "Pick the route", body: "Choose the asset you send and the one you want, each on its network, and the address that receives the output." },
          quote: { title: "Get a quote", body: "Request a quote with the amount and a refund address on the network you send from. Check what arrives and the commission." },
          create: { title: "Create the swap", body: "Create it from the quote. You get the deposit address (with a memo on Stellar), the amount to send and the deadline." },
          send: { title: "Send the deposit", body: "Send the input amount from your wallet to the deposit address before the deadline." },
          follow: { title: "Follow it", body: "Fetch the swap, or watch it in the dashboard, until it succeeds. Webhooks report each cross-chain swap event to your server." },
        },
        links: { crossChainApi: "Cross-chain swaps API", webhooksGuide: "How to confirm a payment on your server" },
      },
      faq: {
        networks: { q: "Which networks can I swap between?", a: "Stellar, Solana, Monad and the other networks NEAR Intents reaches, 35 in all. A pair on one network is a same-chain swap instead." },
        test: { q: "Can I test a cross-chain swap?", a: "Not on a test network: these swaps run on the main networks only. A test key can list assets and get quotes." },
        refund: { q: "What happens to my money if the swap fails?", a: "It is refunded to the refund address you gave, on the network you sent from." },
        account: { q: "Do I need an account?", a: "Not on the public swaps page. With your own account, the dashboard and the API apply your plan’s rate." },
      },
    },
    donations: {
      nav: "Crypto donations",
      title: "How to accept crypto donations with an open amount",
      meta: "Accept crypto donations with an open amount | Cosmos Pay",
      description: "Accept stablecoin donations on Stellar or Solana with an open-amount link: the donor chooses the amount in their wallet. How it works and its limits.",
      summary: "Let each donor choose the amount: open-amount links on Stellar and Solana, created per donor and confirmed by webhook.",
      lede: "To accept a donation in stablecoins, create a payment link without an amount on Stellar or Solana: the donor opens it, chooses the amount in their wallet and pays your address directly. Each link takes one payment and stays open for a limited time, so create one per donor, for example when someone presses Donate on your site. Cosmos Pay marks the link as paid once the network confirms the donation.",
      sections: {
        how: {
          title: "How an open-amount link works",
          points: [
            "Leave the amount empty when you create the link, in the dashboard or with the API. The checkout shows Any amount and tells the donor to choose it in their wallet.",
            "The donor’s wallet sets the amount: any positive amount of the link’s asset settles it, on Stellar with the link’s memo.",
            "A message of up to 300 characters, such as a thank-you, shows in the donor’s wallet.",
          ],
        },
        limits: {
          title: "Limits to plan for",
          points: [
            "Stellar and Solana only: a Monad link needs an amount.",
            "One link takes one donation. Once paid it cannot be paid again, so a single link printed on a poster serves only the first donor.",
            "A link is open for a limited time, shown on the checkout as a countdown.",
            "Your own fee on a payment needs a fixed amount, so it does not apply to open-amount links.",
          ],
        },
        amount: {
          title: "Reading what was donated",
          body: [
            "An open-amount link keeps no amount: when it is paid, Cosmos Pay records the transaction hash and the donor’s address, and the webhook carries them. Read the amount donated from that transaction on the network, for example to thank the donor or issue a receipt.",
          ],
          links: { webhooksGuide: "How to confirm a payment on your server" },
        },
        site: {
          title: "A Donate button on your site",
          body: [
            "When a visitor presses Donate, have your server create an open-amount link and show it with the embedded checkout, or send the visitor to its checkout page. Each visitor then gets a fresh link. In the browser, a Stellar wallet can also pay it through the SDK’s WebClient with the amount the donor chose: webClient.pay(intent, { amount }).",
          ],
          links: { embedGuide: "Add a pay button or checkout to your site", paymentIntents: "Payment intents API" },
        },
      },
      steps: {
        title: "Take your first donation",
        items: {
          sandbox: { title: "Switch to Sandbox", body: "Choose Sandbox in the dashboard: links run on Stellar Testnet or Solana Devnet and move no real money." },
          create: { title: "Create an open-amount link", body: "In Payments, choose Create payment link, pick Stellar or Solana and the asset, leave the amount empty and, if you like, add a thank-you message." },
          share: { title: "Share it", body: "Send the checkout page, show its QR code, or embed it on your page." },
          give: { title: "Donate from a wallet", body: "Open the link in a wallet on the same network, enter an amount and approve. The checkout turns to Paid once the network confirms it." },
          confirm: { title: "Confirm it on your server", body: "When PAYMENT_INTENT_SUCCEEDED arrives, read the transaction to learn the amount, and thank the donor." },
        },
        links: { webhooks: "Webhooks", embed: "Embed a payment (docs)" },
      },
      faq: {
        once: { q: "Can one link collect many donations?", a: "No. A link is paid once. Create a new link for each donor, for example from your server when someone presses Donate." },
        monad: { q: "Can I take open-amount donations on Monad?", a: "No. A Monad link needs an amount. Use Stellar or Solana for open amounts." },
        amount: { q: "How do I know how much was donated?", a: "Read the payment’s transaction on the network: the link itself keeps no amount for an open-amount payment." },
        assets: { q: "Which assets can donors give?", a: "The asset set on the link, such as USDC or the network’s coin (XLM or SOL). The donor chooses only the amount." },
      },
    },
  },
};

export type LearnMessages = typeof en;

/* The gateway's guides in French. Mirrors src/lib/payments/learn/en.ts key for key. */
import type { LearnMessages } from "@/lib/payments/learn/en";

export const fr: LearnMessages = {
  hub: {
    nav: "Guides",
    title: "Guides des paiements en stablecoins",
    lede: "Des guides pour les entreprises qui encaissent en stablecoins avec Cosmos Pay : comment accepter l’USDC en ligne ou avec Solana Pay, comment envoyer un lien de paiement sur WhatsApp, comment confirmer les paiements sur votre serveur, ce que fait une passerelle de paiement en stablecoins, comment se comparent Stellar, Solana et Monad, et comment envoyer de l’USDT0 depuis Stellar vers des réseaux EVM.",
    meta: "Guides des paiements en stablecoins | Cosmos Pay",
    description: "Guides : accepter l’USDC en ligne ou avec Solana Pay, liens de paiement WhatsApp, confirmer par webhook, Stellar vs Solana vs Monad, USDT0 depuis Stellar.",
  },
  ui: {
    updated: "Mis à jour le {date}",
    by: "Par Cosmos Pay",
    related: "Guides associés",
    more: "Plus de guides",
    all: "Voir tous les guides",
  },
  guides: {
    acceptUsdc: {
      nav: "Accepter des paiements en USDC",
      title: "Comment accepter des paiements en USDC en ligne",
      meta: "Accepter des paiements en USDC en ligne | Cosmos Pay",
      description: "Acceptez l’USDC par lien de paiement, checkout hébergé ou API sur Stellar, Solana ou Monad : ce qu’il faut à vous et au client, et comment tester d’abord.",
      summary: "Encaissez en USDC avec un lien de paiement, le checkout hébergé ou l’API, et faites d’abord un essai sur un réseau de test.",
      lede: "Pour accepter l’USDC en ligne avec Cosmos Pay, ajoutez le wallet qui recevra l’argent, puis encaissez avec un lien de paiement, le checkout hébergé ou l’API de paiement. Votre client paie depuis son propre wallet sur Stellar, Solana ou Monad, et l’USDC arrive à votre adresse. Faites un essai sur un réseau de test avant d’encaisser de l’argent réel.",
      sections: {
        need: {
          title: "Ce qu’il vous faut",
          body: [
            "Un compte Cosmos Pay. Sa création est gratuite, et l’offre Starter n’a pas d’abonnement mensuel : chaque paiement coûte {starterRate}.",
            "Une adresse de wallet qui recevra l’USDC, sur le réseau où vous encaissez : Stellar, Solana ou Monad. Vous l’ajoutez à votre organisation dans le tableau de bord et prouvez qu’elle est à vous par une signature. Les liens de paiement créés dans le tableau de bord ne versent l’argent qu’aux wallets qui y sont ajoutés.",
          ],
          links: { fees: "Voir le tarif de chaque offre" },
        },
        payer: {
          title: "Ce qu’il faut à votre client",
          body: [
            "Un wallet sur le même réseau, qui détient l’USDC et peut ouvrir le paiement : sur Stellar, tout wallet qui ouvre les liens SEP-7 ; sur Solana, tout wallet qui lit les liens Solana Pay ; sur Monad, tout wallet EVM qui lit les liens EIP-681. Son wallet règle aussi les frais de réseau.",
            "Aucun compte. Votre client ouvre le checkout, scanne le QR code ou touche le bouton de son wallet, puis approuve le paiement dans son wallet.",
          ],
        },
        ways: {
          title: "Trois façons d’encaisser",
          body: ["Toutes les trois utilisent le même checkout, le même tableau de bord et les mêmes webhooks : vous pouvez commencer avec un lien et passer à l’API quand vous en avez besoin."],
          points: [
            "Lien de paiement : créez-le dans le tableau de bord et envoyez-le par chat ou par e-mail, ou montrez son QR code. Sans code.",
            "Checkout hébergé : envoyez votre client vers la page de paiement du lien, ouvrez-la depuis un bouton de paiement ou affichez-la dans votre page avec une seule balise script.",
            "API de paiement : créez chaque paiement depuis votre serveur avec une requête, ou avec le SDK TypeScript, et dessinez votre propre écran de paiement.",
          ],
          links: { whatsappGuide: "Envoyer un lien de paiement sur WhatsApp", integrations: "Essayer chaque option d’intégration", embed: "Intégrer un paiement" },
        },
        network: {
          title: "Sur quel réseau encaisser",
          body: [
            "Encaissez sur le réseau où vos clients détiennent déjà de l’USDC. L’USDC est préconfiguré sur Stellar et Solana, sur leurs réseaux principaux et de test, ainsi que sur le réseau principal de Monad. Sur les trois, tout autre jeton peut être encaissé en l’indiquant par son émetteur, son mint ou son contrat.",
          ],
          links: { networksGuide: "Stellar vs Solana vs Monad", stellar: "Paiements sur Stellar", solana: "Paiements sur Solana", monad: "Paiements sur Monad" },
        },
        cost: {
          title: "Ce que ça coûte",
          body: [
            "Chaque paiement paie le tarif de votre offre, le même sur chaque réseau : {starterRate} avec Starter, sans abonnement mensuel. Le wallet du payeur règle les frais de réseau ; sur Monad, le relais qui vous transfère le paiement en déduit ses frais.",
          ],
          links: { fees: "Tarifs et calculateur de frais", compare: "Nos frais comparés" },
        },
      },
      steps: {
        title: "Acceptez votre premier paiement en USDC, étape par étape",
        items: {
          sandbox: { title: "Créez votre compte et passez en Sandbox", body: "Connectez-vous au tableau de bord et choisissez Sandbox en haut. Ce que vous y créez fonctionne sur les réseaux de test (Stellar Testnet, Solana Devnet et Monad Testnet) et ne déplace aucun argent réel." },
          wallet: { title: "Ajoutez le wallet qui reçoit l’argent", body: "Dans les paramètres de votre organisation, ajoutez un wallet sur le réseau où vous encaisserez, puis signez ce que le tableau de bord demande pour prouver que ce wallet est à vous." },
          charge: { title: "Créez un paiement de test", body: "Dans Paiements, créez un lien de paiement avec le réseau, le montant, l’actif et le wallet qui le reçoit. Ou créez une clé d’API de test (elle commence par dv_) et appelez POST /v1/payment-intents/pay depuis votre serveur. Sur Stellar Testnet, vous pouvez encaisser en XLM, que Friendbot, le faucet de Testnet, envoie à un compte de test." },
          pay: { title: "Payez-le depuis un wallet de test", body: "Ouvrez la page de paiement : elle indique qu’elle fonctionne sur un réseau de test. Payez depuis un wallet sur ce réseau, puis regardez le checkout passer à Payé et le lien à Réussi dans le tableau de bord." },
          confirm: { title: "Confirmez les paiements sur votre serveur", body: "Ajoutez un endpoint webhook dans le tableau de bord. Quand le réseau confirme un paiement, Cosmos Pay envoie PAYMENT_INTENT_SUCCEEDED, signé en HMAC-SHA256. Livrez la commande quand cet événement arrive, pas quand la page du client affiche qu’elle est payée." },
          live: { title: "Passez en Production", body: "Choisissez Production dans le tableau de bord et créez une clé d’API de production (elle commence par prod_). Les mêmes requêtes encaissent alors sur les réseaux principaux : la clé choisit le réseau, pas le code." },
        },
        links: { gettingStarted: "Premiers pas", apiKeys: "Clés d’API", webhooks: "Webhooks", paymentIntents: "API des intentions de paiement" },
      },
      faq: {
        nocode: { q: "Puis-je accepter l’USDC sans écrire de code ?", a: "Oui. Créez un lien de paiement dans le tableau de bord et partagez-le par chat ou par e-mail, ou montrez son QR code. Le statut de chaque paiement s’affiche dans le tableau de bord." },
        asset: { q: "Mon client paie-t-il en USDC, et est-ce que je reçois de l’USDC ?", a: "Oui. Votre client paie dans l’actif défini sur le lien, et ce même actif arrive à votre adresse." },
        test: { q: "Puis-je essayer sans argent réel ?", a: "Oui. En Sandbox et avec des clés de test (dv_), les liens fonctionnent sur des réseaux de test, et leur checkout indique qu’aucun fonds réel ne circule." },
        refunds: { q: "Un client peut-il annuler un paiement en USDC ?", a: "Non. Une fois le paiement confirmé par le réseau, il est définitif. Un remboursement est un nouveau paiement que vous envoyez depuis votre wallet." },
      },
    },
    whatsapp: {
      nav: "Liens de paiement sur WhatsApp",
      title: "Comment envoyer un lien de paiement sur WhatsApp",
      meta: "Lien de paiement WhatsApp : créer et partager | Cosmos Pay",
      description: "Créez un lien de paiement en stablecoins dans le tableau de bord Cosmos Pay, envoyez-le sur WhatsApp ou en QR code imprimé et voyez quand il est payé.",
      summary: "Créez un lien dans le tableau de bord, envoyez-le dans une conversation ou imprimez son QR code, et voyez quand il est payé.",
      lede: "Créez un lien de paiement dans le tableau de bord Cosmos Pay, copiez l’adresse de sa page de paiement et collez-la dans la conversation WhatsApp. Votre client l’ouvre et paie depuis son propre wallet sur Stellar, Solana ou Monad, et le lien passe à Réussi dans votre tableau de bord dès que le réseau confirme le paiement.",
      sections: {
        before: {
          title: "Avant de commencer",
          body: [
            "Dans le tableau de bord, ajoutez le wallet qui recevra l’argent dans les paramètres de votre organisation, sur le réseau où vous encaisserez. Un lien de paiement ne verse l’argent qu’à l’un de ces wallets.",
            "Faites un essai en Sandbox : les liens y fonctionnent sur des réseaux de test, et leur checkout indique qu’aucun fonds réel ne circule.",
          ],
        },
        customer: {
          title: "Ce que voit votre client",
          body: [
            "La page de paiement affiche le montant, l’actif, le réseau et le temps restant pour payer. Votre client choisit comment payer : scanner le QR code avec une application de wallet, ouvrir le paiement dans un wallet sur le même appareil, ou l’envoyer à la main avec les détails affichés.",
            "La page s’ouvre dans la langue de son navigateur quand c’est l’une des sept que parle le checkout : anglais, espagnol, portugais, français, allemand, hindi et chinois. Elle passe à Payé dès que le réseau confirme le paiement et renvoie à la transaction dans un explorateur public. Votre client n’a besoin d’aucun compte.",
          ],
        },
        know: {
          title: "Bon à savoir",
          points: [
            "Un lien correspond à un paiement. Une fois payé, il ne peut pas l’être de nouveau : créez-en un par vente ou par facture.",
            "Un lien reste ouvert pendant une durée limitée, que le checkout affiche en compte à rebours. Ensuite, le checkout invite votre client à demander un nouveau lien ; un paiement qui arrive quand même et que le réseau confirme le marque comme payé.",
            "Sur Stellar et Solana, vous pouvez laisser le montant vide : votre client le choisit. Un lien Monad exige un montant.",
            "Chaque paiement paie le tarif de votre offre ({starterRate} avec Starter, sans abonnement mensuel). Le wallet de votre client règle les frais de réseau.",
          ],
          links: { acceptGuide: "Comment accepter des paiements en USDC en ligne", paymentLinks: "API des liens de paiement" },
        },
      },
      steps: {
        title: "Créer le lien et l’envoyer",
        items: {
          create: { title: "Créez le lien", body: "Dans le tableau de bord, ouvrez Paiements et cliquez sur Créer un lien de paiement. Indiquez le réseau, le montant et son actif, puis choisissez le wallet qui le reçoit et le design du checkout. Sur Stellar et Solana, vous pouvez ajouter un message que votre client voit dans son wallet." },
          copy: { title: "Copiez la page de paiement", body: "Quand le lien est prêt, copiez l’adresse de sa page de paiement : payments.cosmospay.lat suivi de l’id du lien. Elle s’ouvre dans n’importe quel navigateur, sur téléphone comme sur ordinateur." },
          send: { title: "Envoyez-le sur WhatsApp", body: "Collez l’adresse dans la conversation, avec l’objet du paiement. L’aperçu d’une messagerie affiche une carte générique de demande de paiement de Cosmos Pay, sans le montant ni votre adresse. L’e-mail, les SMS et toute autre messagerie fonctionnent de la même façon." },
          qr: { title: "Ou imprimez le QR code", body: "Le bouton Télécharger le QR enregistre le QR code du lien en image, le même que celui de la page de paiement. Votre client le scanne avec son application de wallet. Imprimez-le, ou affichez-le sur un écran, pour une vente en personne." },
          paid: { title: "Vérifiez qu’il est payé", body: "Dans le tableau de bord, la page du lien suit votre client : sur la page de paiement, portefeuille ouvert, paiement envoyé, payé. Une fois le paiement confirmé par le réseau, le lien affiche Réussi et, si vous avez ajouté un endpoint webhook, votre serveur reçoit PAYMENT_INTENT_SUCCEEDED." },
        },
        links: { webhooks: "Webhooks", linkDemo: "Essayer la démo des liens de paiement" },
      },
      faq: {
        account: { q: "Mon client a-t-il besoin d’un compte ?", a: "Non. Il lui faut un wallet sur le réseau du lien qui détient l’actif. Il ouvre le lien et approuve le paiement dans son wallet." },
        reuse: { q: "Puis-je envoyer le même lien à plusieurs clients ?", a: "Non. Un lien se paie une seule fois. Créez un nouveau lien pour chaque vente." },
        preview: { q: "L’aperçu WhatsApp affiche-t-il le montant ?", a: "Non. L’aperçu est la même carte générique de demande de paiement pour chaque lien. Votre client voit le montant en ouvrant la page de paiement." },
        expired: { q: "Et si mon client ouvre le lien après son expiration ?", a: "Le checkout indique que le lien a expiré et l’invite à en demander un nouveau. Créez un autre lien et envoyez-le." },
      },
    },
    gateway: {
      nav: "Passerelles de paiement en stablecoins",
      title: "Qu’est-ce qu’une passerelle de paiement en stablecoins ?",
      meta: "Passerelle de paiement en stablecoins expliquée | Cosmos Pay",
      description: "Ce que fait une passerelle de paiement en stablecoins, où va l’argent, qui paie les frais de réseau, dépositaire ou non, et comment fonctionne Cosmos Pay.",
      summary: "Ce que fait une passerelle, où l’argent est réglé, qui paie les frais de réseau, et la différence entre dépositaire et non dépositaire.",
      lede: "Une passerelle de paiement en stablecoins permet à une entreprise d’encaisser en stablecoins comme l’USDC. Elle crée la demande de paiement, montre au client comment payer depuis son propre wallet et prévient l’entreprise quand le réseau a confirmé le paiement. Certaines passerelles reçoivent l’argent et vous tiennent un solde ; une passerelle non dépositaire, comme Cosmos Pay, le fait verser sur une adresse que vous contrôlez.",
      sections: {
        stablecoin: {
          title: "Ce qu’est un stablecoin",
          body: [
            "Un stablecoin est un jeton conçu pour garder une valeur stable par rapport à une monnaie, le plus souvent le dollar américain. Il circule sur une blockchain comme n’importe quel autre jeton, d’un wallet à un autre, tous les jours et à toute heure.",
            "L’USDC et l’EURC en sont deux exemples, tous deux émis par Circle. Circle indique que l’USDC peut être échangé un pour un contre des dollars américains, et l’EURC un pour un contre des euros.",
          ],
          links: { circleUsdc: "L’USDC, sur le site de Circle", circleEurc: "L’EURC, sur le site de Circle" },
        },
        does: {
          title: "Ce que fait la passerelle",
          points: [
            "Elle crée la demande de paiement (le montant, l’actif, le réseau et l’adresse à payer) sous forme de lien et de QR code, dans le format que lisent les wallets : SEP-7 sur Stellar, Solana Pay sur Solana, EIP-681 sur les réseaux EVM comme Monad.",
            "Elle montre au client une page de paiement avec cette demande, pour qu’il paie depuis le wallet qu’il utilise déjà.",
            "Elle surveille le réseau et rattache chaque paiement à sa demande, par un mémo, une clé de référence ou une adresse créée pour ce paiement.",
            "Elle prévient l’entreprise dès que le réseau confirme le paiement, dans un tableau de bord et par un webhook signé envoyé à son serveur.",
          ],
          links: { sep7: "La norme SEP-7 (Stellar)", solanaPay: "La spécification Solana Pay", eip681: "La norme EIP-681 (Ethereum)" },
        },
        settle: {
          title: "Où l’argent est réglé",
          body: [
            "Le règlement est le moment où l’argent parvient à l’entreprise. Avec un stablecoin, il a lieu sur le réseau lui-même : une fois le transfert confirmé par le réseau, le paiement est définitif et ne peut pas faire l’objet d’une rétrofacturation. Un remboursement est un nouveau paiement envoyé par l’entreprise.",
          ],
        },
        fees: {
          title: "Qui paie les frais de réseau",
          body: [
            "Chaque transfert paie des frais au réseau sur lequel il passe. Avec Cosmos Pay, c’est le wallet du payeur qui les règle, sur Stellar, Solana et Monad. Sur Monad, chaque paiement va à une adresse créée pour lui, et le relais qui le transfère à l’entreprise prélève ses frais sur le paiement ; l’API les indique sur le paiement dans networkFee.",
            "Les frais de la passerelle elle-même sont à part. Cosmos Pay facture un tarif par paiement qui dépend de l’offre : {starterRate} avec Starter, sans abonnement mensuel.",
          ],
          links: { fees: "Tarifs et calculateur de frais" },
        },
        custody: {
          title: "Passerelles dépositaires et non dépositaires",
          body: [
            "Une passerelle dépositaire reçoit le paiement sur un compte qu’elle contrôle et vous affiche un solde, que vous retirez plus tard. Une passerelle non dépositaire ne détient jamais l’argent : le paiement va à une adresse dont vous détenez les clés.",
            "La différence tient à qui contrôle les fonds entre la vente et le moment où vous les utilisez, et à qui garde les clés. Avec une passerelle non dépositaire, vous les gardez, et c’est donc à vous d’en prendre soin.",
          ],
        },
        fit: {
          title: "Où se place Cosmos Pay",
          body: [
            "Cosmos Pay est une passerelle de paiement en stablecoins non dépositaire sur Stellar, Solana et Monad. Vous encaissez avec un lien de paiement, le checkout hébergé ou l’API de paiement, et vous choisissez les adresses de wallet qui reçoivent l’argent. Cosmos Pay ne stocke les clés de personne.",
            "Sur Stellar et Solana, votre client paie directement votre adresse. Sur Monad, chaque paiement va à une adresse de dépôt créée pour lui, qui ne peut que le transférer à votre adresse (moins les frais du relais) : Cosmos Pay n’en détient aucune clé. Chaque paiement peut être vérifié sur le réseau, et chaque checkout payé renvoie à sa transaction dans un explorateur public.",
          ],
          links: { security: "Comment les paiements sont protégés", acceptGuide: "Comment accepter des paiements en USDC en ligne", integrations: "Options d’intégration" },
        },
      },
      faq: {
        final: { q: "Un paiement en stablecoins peut-il faire l’objet d’une rétrofacturation ?", a: "Non. Une fois confirmé par le réseau, il est définitif. Un remboursement est un paiement que l’entreprise renvoie depuis son wallet." },
        custody: { q: "Cosmos Pay garde-t-il mon argent ?", a: "Non. Sur Stellar et Solana, le payeur paie directement votre adresse. Sur Monad, chaque paiement va à une adresse de dépôt créée pour lui, qui ne peut que le transférer à votre adresse (moins les frais du relais) : Cosmos Pay n’en détient aucune clé." },
        wallet: { q: "Ai-je besoin de mon propre wallet ?", a: "Oui. Les paiements vont à une adresse que vous contrôlez sur chaque réseau que vous acceptez : les fonds sont à vous dès le premier paiement." },
        customers: { q: "Mes clients ont-ils besoin d’un compte ?", a: "Pas de compte chez Cosmos Pay. Il leur faut un wallet sur le réseau du paiement qui détient le stablecoin." },
      },
    },
    networks: {
      nav: "Stellar vs Solana vs Monad",
      title: "Stellar vs Solana vs Monad pour accepter des paiements",
      meta: "Stellar vs Solana vs Monad pour les paiements | Cosmos Pay",
      description: "Stellar, Solana et Monad comparés pour accepter des paiements en stablecoins avec Cosmos Pay : standard de lien, actifs, réseaux de test, frais et tarifs.",
      summary: "Les trois réseaux côte à côte, tels que Cosmos Pay les prend en charge : format de lien, actifs, réseaux de test et frais.",
      lede: "Avec Cosmos Pay, un paiement sur Stellar, Solana ou Monad arrive à votre adresse et paie le même tarif, celui de votre offre. Ce qui change : le lien que lit le wallet (SEP-7 sur Stellar, Solana Pay sur Solana, EIP-681 vers une adresse de dépôt sur Monad), la façon dont un paiement est rattaché à son lien et les actifs préconfigurés. Le tableau les compare tels que Cosmos Pay les prend en charge.",
      table: {
        title: "Les trois réseaux côte à côte",
        caption: "Stellar, Solana et Monad comparés pour accepter des paiements avec Cosmos Pay",
        topic: "Critère",
        rows: {
          link: { k: "Lien de paiement", stellar: "SEP-7 (web+stellar:pay) et son QR code", solana: "Demande de transfert Solana Pay (solana:) et son QR code", monad: "EIP-681 (ethereum:) et son QR code, vers une adresse de dépôt créée pour ce paiement" },
          match: { k: "Comment un paiement est rattaché", stellar: "Un mémo numérique sur le lien", solana: "Une clé de référence Solana Pay sur le lien", monad: "Sa propre adresse de dépôt" },
          settle: { k: "Où va l’argent", stellar: "Directement à votre adresse", solana: "Directement à votre adresse", monad: "Une adresse de dépôt qui ne peut que le transférer à votre adresse" },
          fee: { k: "Frais de réseau", stellar: "Réglés par le wallet du payeur", solana: "Réglés par le wallet du payeur", monad: "Le wallet du payeur paie son transfert ; les frais du relais pour l’acheminement sont déduits du paiement" },
          presets: { k: "Actifs préconfigurés" },
          test: { k: "Réseau de test" },
          amount: { k: "Montant", stellar: "Fixe, ou choisi par le payeur", solana: "Fixe, ou choisi par le payeur", monad: "Obligatoire" },
          message: { k: "Message dans le wallet", stellar: "Oui", solana: "Oui", monad: "Non" },
          merchantFee: { k: "Vos propres frais sur un paiement", stellar: "Le payeur indique son compte et paie les deux en une seule transaction", solana: "Une demande de transaction Solana Pay avec les deux transferts", monad: "L’adresse de dépôt répartit le paiement" },
          wallets: { k: "Wallets qui paient", stellar: "Tout wallet qui ouvre les liens SEP-7, comme {wallets}", solana: "Tout wallet qui lit les liens Solana Pay, comme {wallets}", monad: "Tout wallet EVM qui lit les liens EIP-681" },
          private: { k: "Paiements privés", stellar: "Oui, sur Testnet pour l’instant", solana: "Non", monad: "Non" },
          rate: { k: "Tarif Cosmos Pay", value: "Le tarif de votre offre ({starterRate} avec Starter)" },
        },
        note: "Les actifs préconfigurés sont ceux que le tableau de bord propose par leur nom ; la page de chaque réseau donne leurs adresses. Tout autre jeton s’indique par son émetteur, son mint ou son contrat.",
        links: { sep7: "La norme SEP-7 (Stellar)", solanaPay: "La spécification Solana Pay", eip681: "La norme EIP-681 (Ethereum)" },
      },
      sections: {
        choose: {
          title: "Comment choisir",
          body: ["Un seul compte encaisse sur les trois réseaux, et chaque lien indique celui sur lequel il est réglé. Ces différences décident du réseau qui convient à un paiement :"],
          points: [
            "Encaissez là où vos clients détiennent déjà le stablecoin. Les mêmes clés d’API et les mêmes endpoints webhook servent pour les trois réseaux.",
            "Pour laisser le client choisir le montant, comme pour des dons, utilisez Stellar ou Solana : un lien Monad exige un montant.",
            "Pour afficher un message dans le wallet du client, comme un numéro de commande, utilisez Stellar ou Solana.",
            "Pour garder le montant privé on-chain, utilisez les paiements privés, qui fonctionnent sur Stellar, pour l’instant sur Testnet.",
          ],
          links: { stellar: "Paiements sur Stellar", solana: "Paiements sur Solana", monad: "Paiements sur Monad" },
        },
        fees: {
          title: "Ce que ça coûte sur chaque réseau",
          body: [
            "Cosmos Pay facture le tarif de votre offre par paiement, le même sur Stellar, Solana et Monad : {starterRate} avec Starter, sans abonnement mensuel. Le wallet du payeur règle les frais de réseau sur les trois. Sur Monad, le relais qui vous transfère le paiement en déduit ses frais, et le checkout les affiche.",
          ],
          links: { fees: "Tarifs et calculateur de frais", compare: "Nos frais comparés" },
        },
      },
      faq: {
        all: { q: "Puis-je accepter des paiements sur les trois réseaux ?", a: "Oui. Chaque lien de paiement est réglé sur un seul réseau, que vous choisissez en le créant. Le même compte, les mêmes clés d’API et les mêmes webhooks fonctionnent pour les trois." },
        test: { q: "Puis-je tester sur les trois ?", a: "Oui. En Sandbox, les clés de test (dv_) créent des liens sur Stellar Testnet, Solana Devnet et Monad Testnet. Monad Testnet n’a pas d’USDC préconfiguré : encaissez-y en MON, ou indiquez un jeton par son contrat." },
        fees: { q: "Cosmos Pay est-il moins cher sur un réseau ?", a: "Non. Le tarif de votre offre est le même sur les trois. Le wallet du payeur règle les frais de réseau, et sur Monad, le relais qui transfère un paiement en déduit ses frais." },
      },
    },
    solanaPay: {
      nav: "USDC avec Solana Pay",
      title: "Comment accepter l’USDC avec des liens Solana Pay",
      meta: "Liens de paiement Solana Pay, étape par étape | Cosmos Pay",
      description: "Encaissez en USDC sur Solana avec un lien et un QR code Solana Pay : contenu du lien, tests sur Devnet et confirmation de chaque paiement.",
      summary: "Créez un lien Solana Pay pour l’USDC, testez-le sur Devnet et voyez chaque paiement confirmé sur votre serveur.",
      lede: "Avec Cosmos Pay, un lien de paiement sur Solana est une demande de transfert Solana Pay : votre client scanne son QR code ou l’ouvre dans un wallet comme Phantom ou Solflare, puis y approuve le paiement en USDC. L’USDC va directement sur votre wallet, et Cosmos Pay marque le lien comme payé dès que Solana confirme la transaction. Faites un essai sur Devnet avant d’encaisser de l’argent réel.",
      sections: {
        what: {
          title: "Ce que contient un lien Solana Pay",
          body: [
            "Solana Pay est une norme de demandes de paiement que lisent les wallets Solana : un lien solana:, ou son QR code, avec l’adresse à payer, le montant, le jeton et un message.",
            "Cosmos Pay ajoute une clé de référence créée pour chaque lien. Le wallet l’inclut dans la transaction, et Cosmos Pay recherche cette clé sur Solana pour rattacher le paiement à son lien. Cosmos Pay n’accepte le paiement que si la transaction a réussi et que le montant exact est arrivé à votre adresse.",
          ],
          links: { solanaPay: "La spécification Solana Pay", solana: "Paiements sur Solana" },
        },
        need: {
          title: "Ce qu’il vous faut, à vous et à votre client",
          points: [
            "Vous : une adresse Solana qui reçoit l’argent, ajoutée à votre organisation dans le tableau de bord, où vous prouvez par une signature qu’elle est à vous.",
            "Votre client : un wallet Solana qui lit les liens Solana Pay, comme Phantom ou Solflare, avec l’USDC et un peu de SOL pour les frais de réseau. Aucun compte chez Cosmos Pay.",
            "Pour les tests : Sandbox, où les liens fonctionnent sur Solana Devnet. L’USDC y est aussi préconfiguré : vous pouvez donc tester avec de l’USDC Devnet.",
          ],
        },
        api: {
          title: "Créer le lien depuis votre serveur",
          body: [
            "Avec l’API de paiement, appelez POST /v1/payment-intents/pay avec chain défini sur solana, votre adresse comme destination et, pour l’USDC, le code d’actif USDC avec son mint comme émetteur. Avec le SDK TypeScript (version 2.2 ou ultérieure), passez chain: 'solana' à client.paymentIntents.createPay.",
            "La réponse contient le lien (son uri commence par solana:) et son QR code. Affichez le QR code, ouvrez le lien dans le wallet de votre client ou envoyez votre client vers le checkout hébergé : payments.cosmospay.lat suivi de l’id du lien.",
          ],
          links: { paymentIntents: "API des intentions de paiement", sdkPaymentIntents: "Les intentions de paiement dans le SDK" },
        },
        know: {
          title: "Bon à savoir",
          points: [
            "Vous pouvez laisser le montant vide pour que votre client le choisisse, comme pour des dons. Un lien qui ajoute vos propres frais exige un montant.",
            "Un message de 300 caractères maximum, comme un numéro de commande, s’affiche dans le wallet de votre client.",
            "Avec vos propres frais sur le paiement, le lien devient une demande de transaction Solana Pay qui paie votre wallet et votre wallet de frais en une seule transaction.",
            "Un lien reste ouvert pendant une durée limitée, que le checkout affiche en compte à rebours. Un paiement qui arrive quand même et que le réseau confirme le marque comme payé.",
            "Le wallet de votre client règle les frais de réseau Solana, en SOL. Chaque paiement paie le tarif de votre offre, le même que sur chaque réseau.",
          ],
          links: { fees: "Tarifs et calculateur de frais", networksGuide: "Stellar vs Solana vs Monad" },
        },
      },
      steps: {
        title: "Acceptez votre premier paiement Solana Pay",
        items: {
          sandbox: { title: "Passez en Sandbox", body: "Connectez-vous au tableau de bord et choisissez Sandbox en haut. Les liens que vous y créez fonctionnent sur Solana Devnet et ne déplacent aucun argent réel." },
          wallet: { title: "Ajoutez votre wallet Solana", body: "Dans les paramètres de votre organisation, ajoutez l’adresse Solana qui recevra l’argent, puis signez ce que le tableau de bord demande pour prouver que ce wallet est à vous." },
          create: { title: "Créez le lien", body: "Dans Paiements, cliquez sur Créer un lien de paiement, choisissez Solana et remplacez l’actif par l’USDC (le sélecteur démarre sur SOL). Saisissez le montant, ou laissez-le vide pour que votre client le choisisse, puis choisissez votre wallet et, si vous le souhaitez, un message." },
          pay: { title: "Payez-le depuis un wallet", body: "Ouvrez la page de paiement et scannez son QR code avec un wallet Solana, ou ouvrez le lien sur le même appareil. Approuvez le paiement dans le wallet : le checkout passe à Payé dès que Solana le confirme." },
          confirm: { title: "Confirmez-le sur votre serveur", body: "Ajoutez un endpoint webhook dans le tableau de bord. Quand le paiement est confirmé, Cosmos Pay envoie PAYMENT_INTENT_SUCCEEDED, signé en HMAC-SHA256. Livrez la commande quand cet événement arrive." },
          live: { title: "Passez en Production", body: "Choisissez Production et créez une clé d’API de production (elle commence par prod_). Les liens fonctionnent alors sur le réseau principal de Solana, où l’USDC a sa propre préconfiguration." },
        },
        links: { webhooksGuide: "Comment confirmer un paiement sur votre serveur", apiKeys: "Clés d’API" },
      },
      faq: {
        wallets: { q: "Quels wallets peuvent payer un lien Solana Pay ?", a: "Tout wallet Solana qui lit les liens Solana Pay, comme Phantom ou Solflare. Votre client scanne le QR code ou ouvre le lien, puis approuve le paiement dans le wallet." },
        sol: { q: "Mon client a-t-il besoin de SOL ?", a: "Oui, un peu. Son wallet règle les frais de réseau Solana en SOL, en plus de l’USDC qu’il envoie." },
        direct: { q: "L’USDC passe-t-il par Cosmos Pay ?", a: "Non. Sur Solana, le wallet de votre client envoie l’USDC directement à votre adresse. Cosmos Pay retrouve le paiement sur le réseau grâce à la clé de référence du lien." },
        devnet: { q: "Puis-je tester sans argent réel ?", a: "Oui. En Sandbox et avec des clés de test (dv_), les liens fonctionnent sur Solana Devnet, où l’USDC est préconfiguré, et le checkout indique qu’aucun fonds réel ne circule." },
      },
    },
    webhooks: {
      nav: "Confirmer les paiements sur votre serveur",
      title: "Comment confirmer un paiement en stablecoins sur votre serveur",
      meta: "Paiements en stablecoins confirmés par webhook | Cosmos Pay",
      description: "Confirmez vos paiements en stablecoins côté serveur par webhooks signés : vérifiez la signature, répondez vite, gérez relances et doublons, testez d’abord.",
      summary: "Livrez les commandes à partir d’un webhook signé, pas de la page de votre client : vérifiez-le, répondez vite et ignorez les doublons.",
      lede: "Pour confirmer un paiement en stablecoins, laissez votre serveur agir sur le webhook signé de Cosmos Pay, et non sur la page que voit votre client. Quand le réseau confirme un paiement, Cosmos Pay envoie PAYMENT_INTENT_SUCCEEDED à votre endpoint, signé avec le secret de cet endpoint. Vérifiez la signature, répondez avec un statut 2xx et livrez la commande une seule fois par événement.",
      sections: {
        why: {
          title: "Pourquoi votre serveur, et pas le navigateur",
          body: [
            "Un checkout qui affiche Payé n’est que ce que montre le navigateur de votre client. L’onglet peut se fermer avant de revenir sur votre site, et n’importe qui peut ouvrir votre page de succès à la main. C’est la confirmation du réseau qui rend un paiement définitif.",
            "Cosmos Pay surveille le réseau pour vous et prévient votre serveur quand un paiement est confirmé. C’est sur votre serveur qu’il faut marquer la commande comme payée et la livrer.",
          ],
        },
        how: {
          title: "Ce qu’envoie Cosmos Pay",
          points: [
            "Un POST HTTPS vers l’endpoint que vous enregistrez, avec un événement JSON : id (il commence par evt_), type, createdAt et data. Pour un paiement, data est le paiement avec son statut, son montant, son actif, son réseau et sa transaction.",
            "L’en-tête X-Cosmos-Signature : t=<horodatage unix>,v1=<signature>. La signature est le HMAC-SHA256 de t, d’un point et du corps brut, avec le secret de l’endpoint comme clé, en hexadécimal.",
            "Les types d’événement que vous choisissez, comme PAYMENT_INTENT_SUCCEEDED, PAYMENT_INTENT_FAILED ou ZK_PAYMENT_SUCCEEDED. Comparez-les tels qu’ils sont écrits, en majuscules avec des tirets bas.",
            "Les en-têtes X-Cosmos-Event, X-Cosmos-Event-Id et X-Cosmos-Delivery, qui identifient l’événement et la livraison.",
          ],
          links: { webhooks: "Les webhooks dans le SDK", webhooksApi: "API des webhooks" },
        },
        retries: {
          title: "Quand votre serveur ne répond pas",
          body: [
            "Seule une réponse 2xx compte comme livrée, et les redirections ne sont pas suivies. Cosmos Pay relance une livraison échouée jusqu’à trois fois avec une pause croissante, puis de nouveau lors de séries ultérieures, et l’événement garde son id à chaque tentative.",
            "Dans le tableau de bord, chaque endpoint liste ses livraisons, avec un filtre pour celles qui ont échoué, et vous pouvez renvoyer n’importe laquelle. Cosmos Pay conserve le corps d’une livraison pendant 30 jours : renvoyez-la dans ce délai.",
          ],
        },
        validate: {
          title: "Ou vérifiez un paiement vous-même",
          body: [
            "Vous pouvez aussi interroger un paiement précis : récupérez-le par son id pour lire son statut, ou envoyez le hash de sa transaction (sur Solana, la signature de la transaction) à POST /v1/payment-intents/:id/validate. Utilisez-le en solution de repli, par exemple quand votre client revient avant l’arrivée du webhook ; le webhook reste le signal principal.",
          ],
          links: { paymentIntents: "API des intentions de paiement" },
        },
      },
      steps: {
        title: "Configurer un webhook, étape par étape",
        items: {
          endpoint: { title: "Ajoutez un endpoint", body: "Dans le tableau de bord, ouvrez Webhooks et ajoutez l’adresse HTTPS d’une route de votre serveur. Choisissez les événements à recevoir ; PAYMENT_INTENT_SUCCEEDED est déjà sélectionné. L’adresse doit être publique : les adresses privées et locales sont refusées." },
          secret: { title: "Conservez le secret", body: "Le tableau de bord n’affiche le secret de l’endpoint (il commence par whsec_) qu’une seule fois. Gardez-le dans l’environnement de votre serveur, jamais dans une page web." },
          verify: { title: "Vérifiez chaque requête", body: "Lisez le corps brut avant tout parseur JSON et vérifiez X-Cosmos-Signature à partir de celui-ci. Avec le SDK TypeScript, Webhooks.constructEvent vérifie la signature, refuse par défaut une signature de plus de cinq minutes et renvoie l’événement." },
          answer: { title: "Répondez vite, puis traitez", body: "Répondez avec un statut 2xx dès que la signature est valide, et faites ensuite le travail lent, comme les e-mails ou les mises à jour de stock." },
          dedupe: { title: "Traitez chaque événement une fois", body: "Enregistrez l’id de chaque événement que vous traitez et ignorez ceux que vous avez déjà vus : une relance ou un renvoi transmet de nouveau le même événement." },
          test: { title: "Envoyez un test", body: "Utilisez Envoyer un test sur l’endpoint pour recevoir un événement ping, puis faites un paiement de test en Sandbox et suivez sa livraison dans la liste de l’endpoint." },
        },
        links: { webhooks: "Les webhooks dans le SDK", gettingStarted: "Premiers pas" },
      },
      faq: {
        name: { q: "Le tableau de bord affiche payment_intent.succeeded. Quel nom porte l’événement ?", a: "Le type de l’événement est PAYMENT_INTENT_SUCCEEDED, en majuscules avec des tirets bas. Le tableau de bord l’affiche seulement sous une forme plus courte." },
        rotate: { q: "Que se passe-t-il quand je renouvelle le secret ?", a: "Le nouveau secret fonctionne tout de suite et l’ancien cesse de fonctionner tout de suite : mettez à jour votre serveur juste après l’avoir renouvelé." },
        down: { q: "Et si mon serveur était hors service ?", a: "Cosmos Pay relance les livraisons échouées, et vous pouvez renvoyer n’importe quelle livraison depuis le tableau de bord pendant 30 jours." },
        several: { q: "Puis-je avoir plusieurs endpoints ?", a: "Oui. Chaque endpoint a sa propre adresse, ses propres événements et son propre secret, et chaque événement va à chaque endpoint qui y est abonné." },
      },
    },
    usdt0: {
      nav: "USDT0 depuis Stellar",
      title: "Comment envoyer de l’USDT0 depuis Stellar vers des réseaux EVM",
      meta: "Envoyer l’USDT0 de Stellar vers des réseaux EVM | Cosmos Pay",
      description: "Envoyez de l’USDT0 d’un compte Stellar vers Ethereum, Arbitrum et d’autres réseaux EVM avec Cosmos Pay : routes, frais en XLM, délais et chaque étape.",
      summary: "Transférez de l’USDT0 de Stellar vers un réseau EVM via LayerZero : choisissez une route, consultez les frais, signez une fois et suivez la livraison.",
      lede: "Avec Cosmos Pay, vous pouvez envoyer de l’USDT0 depuis un compte Stellar vers une adresse sur Ethereum, Arbitrum ou un autre des 21 réseaux EVM. Vous obtenez un devis avec tous les frais en XLM, signez une transaction Stellar dans votre wallet, et le transfert arrive en 27 minutes environ. Ethereum reçoit de l’USDT natif ; tous les autres réseaux reçoivent de l’USDT0.",
      sections: {
        what: {
          title: "Ce qu’est l’USDT0",
          body: [
            "L’USDT0 est la forme omnichain de l’USDT de Tether. Son émetteur décrit un modèle de verrouillage et d’émission : l’USDT est verrouillé sur Ethereum et la même quantité d’USDT0 est émise sur les autres réseaux, qui le font circuler entre eux avec la norme Omnichain Fungible Token (OFT) de LayerZero.",
            "Sur Stellar, l’USDT0 est un actif comme un autre : le compte qui l’envoie a donc besoin d’une trustline vers cet actif et d’un solde en USDT0.",
          ],
          links: { usdt0Site: "L’USDT0, sur le site de son émetteur", usdt0Network: "Comment fonctionne le réseau USDT0", layerzeroOft: "La norme OFT de LayerZero" },
        },
        routes: {
          title: "Où il peut aller",
          body: [
            "Cosmos Pay propose 21 routes, toutes vers des réseaux EVM, chacune vers une adresse composée de 0x et de 40 caractères hexadécimaux. Ethereum reçoit de l’USDT natif ; Arbitrum et les autres reçoivent de l’USDT0. L’appel routes de l’API les liste avec leurs noms.",
            "Les transferts fonctionnent uniquement sur les réseaux principaux : avec une clé de test (dv_), l’API répond qu’aucune route n’est disponible.",
          ],
          links: { usdt0Docs: "L’USDT0 dans le SDK", usdt0Api: "API USDT0" },
        },
        cost: {
          title: "Ce que ça coûte",
          points: [
            "Les frais de messagerie de LayerZero, en XLM. La transaction autorise jusqu’à 20 % de plus, et ce qu’elle n’utilise pas revient dans la même transaction.",
            "Les frais de réseau Stellar, en XLM.",
            "L’éventuelle commission de Cosmos Pay, que le devis affiche avant que vous signiez.",
            "Le compte qui envoie les paie tous en XLM : gardez-y donc un peu de XLM en plus de l’USDT0.",
          ],
        },
        know: {
          title: "Bon à savoir",
          points: [
            "La transaction a un délai court, indiqué par expiresAt : signez-la et soumettez-la avant, ou créez un nouveau transfert.",
            "Les montants Stellar ont 7 décimales et l’OFT en transporte 6 : une 7e décimale reste donc sur votre compte sous forme de reliquat.",
            "Cosmos Pay ne détient jamais de clé : l’API construit la transaction, votre wallet la signe et l’API la relaie.",
            "Vous pouvez aussi envoyer de l’USDT0 depuis le panneau de swap du tableau de bord, où il apparaît comme Pont USDT0.",
          ],
        },
      },
      steps: {
        title: "Envoyer de l’USDT0, étape par étape",
        items: {
          hold: { title: "Détenez de l’USDT0 sur Stellar", body: "Le compte qui envoie a besoin d’une trustline vers l’USDT0, d’un solde en USDT0 et d’un peu de XLM pour les frais." },
          quote: { title: "Obtenez un devis", body: "Appelez quote avec la route et le montant. L’appel renvoie ce qui est envoyé, ce qui arrive, le reliquat qui reste, chacun des frais et les limites, sans rien enregistrer." },
          create: { title: "Créez le transfert", body: "Appelez create avec le compte Stellar qui envoie, la route, l’adresse EVM qui reçoit et le montant. L’API construit une transaction Stellar pour ce transfert." },
          sign: { title: "Signez-la dans votre wallet", body: "Signez la transaction (son XDR) avec le wallet qui détient l’USDT0, ou ouvrez son lien SEP-7 dans ce wallet." },
          submit: { title: "Soumettez-la", body: "Envoyez la transaction signée à submit. Si le réseau la refuse, le transfert reste en attente : corrigez la cause et soumettez-la de nouveau avant son expiration." },
          follow: { title: "Suivez-le jusqu’à la livraison", body: "Le transfert passe de PENDING à SUBMITTED puis à DELIVERED, en 27 minutes environ sur chaque route, pendant que les vérificateurs de LayerZero attendent les confirmations de Stellar. Une fois livré, il indique la transaction du réseau de destination et un lien LayerZero Scan." },
        },
        links: { usdt0Docs: "L’USDT0 dans le SDK", usdt0Api: "API USDT0" },
      },
      faq: {
        arrive: { q: "Que reçoit l’adresse de destination ?", a: "Sur Ethereum, de l’USDT natif. Sur toutes les autres routes, de l’USDT0." },
        time: { q: "Combien de temps prend un transfert ?", a: "Environ 27 minutes sur chaque route, d’après les mesures sur LayerZero Scan : les vérificateurs de LayerZero attendent les confirmations de Stellar avant que le transfert soit livré." },
        test: { q: "Puis-je l’essayer sur un réseau de test ?", a: "Non. Les transferts d’USDT0 fonctionnent uniquement sur les réseaux principaux ; avec une clé de test, aucune route n’est disponible." },
        custody: { q: "Cosmos Pay détient-il mon USDT0 ?", a: "Non. Votre wallet signe la transaction qui l’envoie ; Cosmos Pay se contente de la construire et de la relayer." },
      },
    },
  },
};
